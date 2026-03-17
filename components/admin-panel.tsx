'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import {
  ArrowLeft,
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  ShieldOff,
  Loader2,
  Eye,
  EyeOff,
  Tag,
  Check,
  X,
  ClipboardList,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  PackageCheck,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Calendar,
  User,
  Users,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { AdminProductForm, type ProductFormData } from './admin-product-form'
import { formatPrice } from '@/lib/utils'

type Tab = 'products' | 'orders' | 'slider' | 'categories' | 'users'

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pending', label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  { value: 'paid', label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-orange-100 text-orange-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' },
] as const

function getStatusDisplay(status: string) {
  return ORDER_STATUSES.find((s) => s.value === status) ?? { label: status, color: 'bg-slate-100 text-slate-700' }
}

function normalizeTrackingWebsite(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function AdminPanel() {
  const isAdmin = useQuery(api.admin.isAdmin)
  const isSuperAdmin = useQuery(api.admin.isSuperAdmin)
  const [tab, setTab] = useState<Tab>('products')

  if (isAdmin === undefined || isSuperAdmin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <ShieldOff className="h-12 w-12 text-red-400" />
        <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
        <p className="max-w-sm text-slate-500">
          You don&apos;t have admin access. Contact your system administrator or set the{' '}
          <code className="rounded bg-slate-100 px-1 text-sm">ADMIN_EMAIL</code> environment variable in the Convex
          dashboard.
        </p>
        <Link
          href="/"
          className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Back to Shop
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'products', icon: Package, label: 'Medicines' },
    { id: 'orders', icon: ClipboardList, label: 'Orders' },
    { id: 'slider', icon: ImageIcon, label: 'Slider' },
    { id: 'categories', icon: Tag, label: 'Categories' },
    ...(isSuperAdmin ? ([{ id: 'users', icon: Users, label: 'Users' }] as const) : []),
  ] as const

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Shop
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Admin Panel</h1>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {tab === 'products' && <ProductsTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'slider' && <SliderTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'users' && isSuperAdmin && <UsersTab />}
      </div>
    </div>
  )
}

// ── Products tab ──────────────────────────────────────────────────────────────

function ProductsTab() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Doc<'products'> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Doc<'products'> | null>(null)
  const [deleting, setDeleting] = useState(false)

  const products = useQuery(api.admin.listAllProducts, { search: debouncedSearch || undefined })
  const backfillSlugs = useMutation(api.admin.backfillSlugs)
  const backfillSearchText = useMutation(api.admin.backfillSearchText)
  const createProduct = useMutation(api.admin.createProduct)
  const updateProduct = useMutation(api.admin.updateProduct)
  const deleteProduct = useMutation(api.admin.deleteProduct)
  const toggleStock = useMutation(api.admin.toggleStock)
  const toggleVisibility = useMutation(api.admin.toggleVisibility)
  const toggleRecommended = useMutation(api.admin.toggleRecommended)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void backfillSlugs()
    void backfillSearchText()
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    clearTimeout((handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(value),
      300,
    )
  }

  const totalProducts = products?.length ?? 0
  const inStockCount = products?.filter((p) => p.inStock).length ?? 0
  const hiddenCount = products?.filter((p) => p.isVisible === false).length ?? 0

  const normalizeFormData = (data: ProductFormData) => {
    const pricingMatrix = data.pricingMatrix
      .filter((d) => d.dosage.trim() && d.packages.length > 0)
      .map((d) => ({
        dosage: d.dosage,
        packages: d.packages
          .filter((p) => p.pillCount && p.price)
          .map((p) => ({
            pillCount: parseFloat(p.pillCount) || 0,
            originalPrice: parseFloat(p.originalPrice) || 0,
            price: parseFloat(p.price) || 0,
            benefits: p.benefits
              ? p.benefits
                  .split(',')
                  .map((b) => b.trim())
                  .filter(Boolean)
              : [],
            expiryDate: p.expiryDate.trim() || undefined,
          })),
      }))
      .filter((d) => d.packages.length > 0)
    return {
      ...data,
      dosageOptions: pricingMatrix.map((d) => d.dosage),
      pricingMatrix: pricingMatrix.length > 0 ? pricingMatrix : undefined,
      fullDescription: data.fullDescription || undefined,
      slug: data.slug.trim() || undefined,
    }
  }

  const handleCreate = async (data: ProductFormData) => {
    await createProduct(normalizeFormData(data))
    setFormOpen(false)
  }

  const handleUpdate = async (data: ProductFormData) => {
    if (!editProduct) return
    await updateProduct({ id: editProduct._id, ...normalizeFormData(data) })
    setEditProduct(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProduct({ id: deleteTarget._id })
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard icon={<Package className="h-7 w-7 text-sky-500" />} value={totalProducts} label="Total" />
        <StatCard icon={<PackageCheck className="h-7 w-7 text-teal-500" />} value={inStockCount} label="In Stock" />
        <StatCard icon={<EyeOff className="h-7 w-7 text-slate-400" />} value={hiddenCount} label="Hidden" />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            placeholder="Find a medicine..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-300 focus:ring-2"
          />
        </div>
        {products === undefined && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Medicine
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {products === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : !products || products.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            {debouncedSearch ? `No medicines found for "${debouncedSearch}"` : 'No medicines yet. Add your first one!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3 text-center">Visible</th>
                  <th className="px-4 py-3 text-center">In Stock</th>
                  <th className="px-4 py-3 text-center">Recommended</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <ProductRow
                    key={p._id}
                    product={p}
                    onEdit={() => setEditProduct(p)}
                    onDelete={() => setDeleteTarget(p)}
                    onToggleStock={() => void toggleStock({ id: p._id, inStock: !p.inStock })}
                    onToggleVisibility={() => void toggleVisibility({ id: p._id, isVisible: p.isVisible === false })}
                    onToggleRecommended={() => void toggleRecommended({ id: p._id, isRecommended: !p.isRecommended })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && <AdminProductForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
      {editProduct && (
        <AdminProductForm initial={editProduct} onSubmit={handleUpdate} onClose={() => setEditProduct(null)} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-slate-900">Delete Medicine?</h3>
            <p className="mb-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be permanently removed.
            </p>
            <p className="mb-6 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Tip: use the <strong>Visible</strong> toggle to hide a medicine without deleting it.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

type RowProps = {
  product: Doc<'products'>
  onEdit: () => void
  onDelete: () => void
  onToggleStock: () => void
  onToggleVisibility: () => void
  onToggleRecommended: () => void
}

function ProductRow({ product, onEdit, onDelete, onToggleStock, onToggleVisibility, onToggleRecommended }: RowProps) {
  const visible = product.isVisible !== false
  const discountedPrice = product.price * (1 - product.discount / 100)

  return (
    <tr className={`group transition-colors hover:bg-slate-50 ${!visible ? 'opacity-50' : ''}`}>
      <td className="max-w-[220px] px-4 py-3">
        <div className="flex items-center gap-3">
          {product.image ? (
            <img
              src={product.image}
              alt={product.imageAlt ?? product.name}
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-100 object-cover"
            />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100" />
          )}
          <div className="min-w-0">
            <p className={`truncate font-semibold ${visible ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
              {product.name}
            </p>
            <p className="truncate text-xs text-slate-500">{product.genericName}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
          {product.category}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <span className="font-semibold">₹{discountedPrice.toFixed(2)}</span>
        {product.discount > 0 && (
          <span className="ml-1 text-xs text-slate-400 line-through">₹{product.price.toFixed(2)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onToggleVisibility}
          title={visible ? 'Hide from shop' : 'Show on shop'}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${visible ? 'text-teal-600 hover:bg-teal-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
        >
          {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onToggleStock}
          title={product.inStock ? 'Mark as out of stock' : 'Mark as in stock'}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${product.inStock ? 'bg-teal-500' : 'bg-slate-200'}`}
          role="switch"
          aria-checked={product.inStock}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${product.inStock ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onToggleRecommended}
          title={product.isRecommended ? 'Remove from home page' : 'Show on home page'}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${product.isRecommended ? 'bg-amber-400' : 'bg-slate-200'}`}
          role="switch"
          aria-checked={!!product.isRecommended}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${product.isRecommended ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-sky-50 hover:text-sky-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete permanently"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Orders tab ────────────────────────────────────────────────────────────────

function OrdersTab() {
  const orders = useQuery(api.admin.listAllOrders)
  const updateStatus = useMutation(api.admin.updateOrderStatus)
  const updateTracking = useMutation(api.admin.updateOrderTracking)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [savingTrackingId, setSavingTrackingId] = useState<string | null>(null)
  const [viewingOrder, setViewingOrder] = useState<Doc<'orders'> | null>(null)

  const handleStatusChange = async (id: Doc<'orders'>['_id'], status: Doc<'orders'>['status']) => {
    setUpdatingId(id)
    try {
      await updateStatus({ id, status })
      // keep modal in sync if it's open for this order
      if (viewingOrder?._id === id) {
        setViewingOrder((prev) => (prev ? { ...prev, status } : null))
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const handleTrackingSave = async (id: Doc<'orders'>['_id'], trackingWebsite: string, trackingNumber: string) => {
    setSavingTrackingId(id)
    const normalizedTrackingWebsite = trackingWebsite.trim()
    const normalizedTrackingNumber = trackingNumber.trim()

    try {
      await updateTracking({
        id,
        trackingWebsite: normalizedTrackingWebsite || undefined,
        trackingNumber: normalizedTrackingNumber || undefined,
      })
      if (viewingOrder?._id === id) {
        setViewingOrder((prev) =>
          prev
            ? {
                ...prev,
                trackingWebsite: normalizedTrackingWebsite || undefined,
                trackingNumber: normalizedTrackingNumber || undefined,
              }
            : null,
        )
      }
    } finally {
      setSavingTrackingId(null)
    }
  }

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">All Orders</h2>
        <p className="text-sm text-slate-500">View and manage customer orders. Click an order to see full details.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {orders === undefined || orders === null ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center text-slate-400">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const sd = getStatusDisplay(order.status)
                  return (
                    <tr key={order._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                        <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {order.billingAddress ? (
                          <div>
                            <p className="font-medium">
                              {order.billingAddress.firstName} {order.billingAddress.lastName}
                            </p>
                            <p className="text-slate-500">{order.billingAddress.email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {order.items.slice(0, 2).map((item) => (
                          <div key={item.productId}>
                            {item.name} ×{item.quantity}
                          </div>
                        ))}
                        {order.items.length > 2 && <div className="text-slate-400">+{order.items.length - 2} more</div>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        {order.paymentMethod === 'crypto' ? (
                          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                            Crypto
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sd.color}`}>
                            {sd.label}
                          </span>
                          <div className="relative">
                            <select
                              value={order.status}
                              onChange={(e) =>
                                void handleStatusChange(order._id, e.target.value as Doc<'orders'>['status'])
                              }
                              disabled={updatingId === order._id}
                              className="appearance-none rounded-lg border border-slate-200 bg-white py-1 pl-2 pr-6 text-xs text-slate-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 h-3 w-3 text-slate-400" />
                          </div>
                          {updatingId === order._id && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(order)}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onStatusChange={(status) => void handleStatusChange(viewingOrder._id, status)}
          onTrackingSave={(trackingWebsite, trackingNumber) =>
            void handleTrackingSave(viewingOrder._id, trackingWebsite, trackingNumber)
          }
          updating={updatingId === viewingOrder._id}
          trackingSaving={savingTrackingId === viewingOrder._id}
        />
      )}
    </>
  )
}

// ── Order Detail Modal ────────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onStatusChange,
  onTrackingSave,
  updating,
  trackingSaving,
}: {
  order: Doc<'orders'>
  onClose: () => void
  onStatusChange: (status: Doc<'orders'>['status']) => void
  onTrackingSave: (trackingWebsite: string, trackingNumber: string) => void
  updating: boolean
  trackingSaving: boolean
}) {
  const sd = getStatusDisplay(order.status)
  const billing = order.billingAddress
  const [trackingWebsite, setTrackingWebsite] = useState(order.trackingWebsite ?? '')
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '')

  const shippingAddr = (() => {
    if (!order.shippingAddress) return null
    if ('sameAsBilling' in order.shippingAddress && order.shippingAddress.sameAsBilling) return null
    return order.shippingAddress as {
      sameAsBilling: false
      firstName: string
      lastName: string
      streetAddress: string
      city: string
      country: string
      state: string
      zipCode: string
    }
  })()

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' }).format(ts)
  }

  useEffect(() => {
    setTrackingWebsite(order.trackingWebsite ?? '')
    setTrackingNumber(order.trackingNumber ?? '')
  }, [order._id, order.trackingNumber, order.trackingWebsite])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Order #{order._id.slice(-8).toUpperCase()}</h2>
            <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + payment */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${sd.color}`}>{sd.label}</span>
            {order.paymentMethod === 'crypto' ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">
                Crypto Payment
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                Standard Payment
              </span>
            )}
            {order.nowPaymentsId && (
              <span className="text-xs text-slate-400">NOWPayments ID: {order.nowPaymentsId}</span>
            )}
          </div>

          {/* Update status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Update Status</p>
            <div className="flex flex-wrap items-center gap-2">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={updating}
                  onClick={() => onStatusChange(s.value as Doc<'orders'>['status'])}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${
                    order.status === s.value
                      ? `${s.color} ring-2 ring-offset-1 ring-current`
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              {updating && <Loader2 className="h-4 w-4 animate-spin text-teal-500" />}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking Details</p>
              {(order.trackingWebsite || order.trackingNumber) && (
                <span className="text-xs text-slate-400">Visible to the customer on their orders page</span>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onTrackingSave(trackingWebsite, trackingNumber)
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Website</span>
                  <input
                    type="text"
                    value={trackingWebsite}
                    onChange={(e) => setTrackingWebsite(e.target.value)}
                    placeholder="e.g. https://carrier.example/track"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Tracking Number</span>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={trackingSaving}
                  className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {trackingSaving ? 'Saving...' : 'Save Tracking'}
                </button>
                {order.trackingWebsite && (
                  <a
                    href={normalizeTrackingWebsite(order.trackingWebsite)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-sky-700 underline underline-offset-2"
                  >
                    Open tracking website
                  </a>
                )}
              </div>
            </form>
          </div>

          {/* Billing address */}
          {billing && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <User className="h-3.5 w-3.5" />
                Billing Information
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-2">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <span className="text-xs text-slate-400">Name</span>
                    <p className="font-medium text-slate-800">
                      {billing.firstName} {billing.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">New Customer</span>
                    <p className="font-medium text-slate-800">{billing.isNewCustomer ? 'Yes' : 'No'}</p>
                  </div>
                  {billing.dateOfBirth && (
                    <div>
                      <span className="text-xs text-slate-400">Date of Birth</span>
                      <p className="font-medium text-slate-800">{billing.dateOfBirth}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-700">{billing.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-slate-700">{billing.mobilePhone}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 border-t border-slate-100 pt-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <p className="text-slate-700">
                    {billing.streetAddress}, {billing.city}, {billing.state} {billing.zipCode}, {billing.country}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Shipping address */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Shipping Address
            </p>
            {shippingAddr ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-medium text-slate-800">
                  {shippingAddr.firstName} {shippingAddr.lastName}
                </p>
                <p className="mt-1 text-slate-700">
                  {shippingAddr.streetAddress}, {shippingAddr.city}, {shippingAddr.state} {shippingAddr.zipCode},{' '}
                  {shippingAddr.country}
                </p>
              </div>
            ) : billing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Same as billing address —{' '}
                <span className="text-slate-700">
                  {billing.streetAddress}, {billing.city}, {billing.state} {billing.zipCode}, {billing.country}
                </span>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No shipping address provided.</p>
            )}
          </div>

          {/* Order items */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Package className="h-3.5 w-3.5" />
              Items ({order.items.length})
            </p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-8 w-8 shrink-0 rounded-md border border-slate-100 object-cover"
                            />
                          )}
                          <div>
                            <p className="font-medium text-slate-800">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.genericName}
                              {item.dosage ? ` · ${item.dosage}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatPrice(item.unitPrice)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                        {formatPrice(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-slate-700">
                      Order Total
                    </td>
                    <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Order metadata */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Order Metadata
            </p>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
              <div>
                <dt className="text-slate-400">Order ID</dt>
                <dd className="font-mono text-slate-700">{order._id}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Placed at</dt>
                <dd className="text-slate-700">{formatDate(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Payment method</dt>
                <dd className="capitalize text-slate-700">{order.paymentMethod ?? '—'}</dd>
              </div>
              {order.nowPaymentsId && (
                <div>
                  <dt className="text-slate-400">NOWPayments ID</dt>
                  <dd className="font-mono text-slate-700">{order.nowPaymentsId}</dd>
                </div>
              )}
              {order.payAmount != null && order.payCurrency && (
                <>
                  <div>
                    <dt className="text-slate-400">Expected</dt>
                    <dd className="font-semibold text-slate-700">{order.payAmount} {order.payCurrency.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Received</dt>
                    <dd className={`font-semibold ${(order.amountPaid ?? 0) < order.payAmount ? 'text-red-600' : 'text-green-600'}`}>
                      {order.amountPaid ?? 0} {order.payCurrency.toUpperCase()}
                      {(order.amountPaid ?? 0) < order.payAmount && (
                        <span className="ml-1 text-red-400">(short by {(order.payAmount - (order.amountPaid ?? 0)).toFixed(8)})</span>
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Slider tab ────────────────────────────────────────────────────────────────

function SliderTab() {
  const images = useQuery(api.admin.listSliderImages)
  const sliderImages = images ?? []
  const addSliderImage = useMutation(api.admin.addSliderImage)
  const updateSliderImage = useMutation(api.admin.updateSliderImage)
  const deleteSliderImage = useMutation(api.admin.deleteSliderImage)
  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)
  const getUploadedImageUrl = useMutation(api.admin.getUploadedImageUrl)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [altInput, setAltInput] = useState('')
  const [titleInput, setTitleInput] = useState('')
  const [addMode, setAddMode] = useState<'upload' | 'url'>('upload')

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    setUploadError('')
    setUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { storageId } = (await res.json()) as { storageId: string }
      const cdnUrl = await getUploadedImageUrl({ storageId })
      if (!cdnUrl) throw new Error('Could not resolve image URL')
      await addSliderImage({
        url: cdnUrl,
        altText: altInput.trim() || undefined,
        titleText: titleInput.trim() || undefined,
      })
      setAltInput('')
      setTitleInput('')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return
    try {
      await addSliderImage({
        url: urlInput.trim(),
        altText: altInput.trim() || undefined,
        titleText: titleInput.trim() || undefined,
      })
      setUrlInput('')
      setAltInput('')
      setTitleInput('')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to add image')
    }
  }

  const count = images?.length ?? 0

  return (
    <>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Home Page Slider</h2>
        <p className="text-sm text-slate-500">
          Upload up to 5 images for the home page banner slider. ({count}/5 used)
        </p>
      </div>

      {count < 5 && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Add New Slide</h3>
          <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit">
            <button
              type="button"
              onClick={() => setAddMode('upload')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${addMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Upload className="h-4 w-4" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setAddMode('url')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${addMode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ImageIcon className="h-4 w-4" />
              URL
            </button>
          </div>
          <div className="space-y-3">
            {addMode === 'upload' ? (
              <label
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${uploading ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50'}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
                    <p className="text-sm text-slate-600">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-7 w-7 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">Click to select image</p>
                    <p className="text-xs text-slate-400">JPG, PNG, WebP</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleFileUpload(f)
                  }}
                />
              </label>
            ) : (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                />
                <button
                  type="button"
                  onClick={() => void handleAddUrl()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Alt tag"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
            <input
              type="text"
              placeholder="Alt title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
            />
          </div>
          {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
        </div>
      )}

      <div className="space-y-3">
        {images === undefined ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : sliderImages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-400">
            No slider images yet. Add your first one above.
          </div>
        ) : (
          sliderImages.map((img, i) => (
            <SliderImageRow
              key={img._id}
              img={img}
              index={i + 1}
              onToggleActive={() =>
                void updateSliderImage({
                  id: img._id,
                  isActive: !img.isActive,
                  altText: img.altText,
                  titleText: img.titleText,
                })
              }
              onUpdateMeta={(alt, title) =>
                void updateSliderImage({
                  id: img._id,
                  isActive: img.isActive,
                  altText: alt || undefined,
                  titleText: title || undefined,
                })
              }
              onDelete={() => void deleteSliderImage({ id: img._id })}
            />
          ))
        )}
      </div>
    </>
  )
}

function SliderImageRow({
  img,
  index,
  onToggleActive,
  onUpdateMeta,
  onDelete,
}: {
  img: Doc<'sliderImages'>
  index: number
  onToggleActive: () => void
  onUpdateMeta: (alt: string, title: string) => void
  onDelete: () => void
}) {
  const [editAlt, setEditAlt] = useState(img.altText ?? '')
  const [editTitle, setEditTitle] = useState(img.titleText ?? '')
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
        {index}
      </span>
      <img
        src={img.url}
        alt={img.altText ?? `Slide ${index}`}
        title={img.titleText ?? img.altText ?? `Slide ${index}`}
        className="h-14 w-24 shrink-0 rounded-lg object-cover border border-slate-100"
      />
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <input
                autoFocus
                type="text"
                value={editAlt}
                onChange={(e) => setEditAlt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateMeta(editAlt, editTitle)
                    setEditing(false)
                  }
                  if (e.key === 'Escape') {
                    setEditAlt(img.altText ?? '')
                    setEditTitle(img.titleText ?? '')
                    setEditing(false)
                  }
                }}
                placeholder="Alt tag"
                className="w-full rounded-lg border border-sky-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              />
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateMeta(editAlt, editTitle)
                    setEditing(false)
                  }
                  if (e.key === 'Escape') {
                    setEditAlt(img.altText ?? '')
                    setEditTitle(img.titleText ?? '')
                    setEditing(false)
                  }
                }}
                placeholder="Alt title"
                className="w-full rounded-lg border border-sky-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateMeta(editAlt, editTitle)
                  setEditing(false)
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white hover:bg-sky-700"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditAlt(img.altText ?? '')
                  setEditTitle(img.titleText ?? '')
                  setEditing(false)
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700">
                {img.altText ? img.altText : <span className="italic text-slate-400">No alt tag</span>}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {img.titleText ? img.titleText : <span className="italic text-slate-400">No alt title</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        <p className="mt-0.5 truncate text-xs text-slate-400">{img.url}</p>
      </div>
      <button
        type="button"
        onClick={onToggleActive}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${img.isActive ? 'bg-teal-500' : 'bg-slate-200'}`}
        role="switch"
        aria-checked={img.isActive}
        title={img.isActive ? 'Deactivate' : 'Activate'}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${img.isActive ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Categories tab ────────────────────────────────────────────────────────────

function CategoryProductsModal({ category, onClose }: { category: string; onClose: () => void }) {
  const products = useQuery(api.admin.productsByCategory, { category })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">
            Products in <span className="text-teal-700">{category}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {products === undefined || products === null ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
            </div>
          ) : products.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">No products in this category.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Generic Name</th>
                  <th className="px-5 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(products ?? []).map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 text-slate-500">{p.genericName}</td>
                    <td className="px-5 py-3 text-right text-slate-700">${p.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoriesTab() {
  const categories = useQuery(api.admin.listAdminCategories)
  const counts = useQuery(api.admin.categoryProductCounts)
  const createCategory = useMutation(api.admin.createCategory)
  const updateCategory = useMutation(api.admin.updateCategory)
  const deleteCategory = useMutation(api.admin.deleteCategory)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Doc<'categories'> | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [productModalCategory, setProductModalCategory] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await createCategory({ name: newName.trim() })
      setNewName('')
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (cat: Doc<'categories'>) => {
    setEditingId(cat._id)
    setEditName(cat.name)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return
    setSaving(true)
    try {
      await updateCategory({ id: editingId as Doc<'categories'>['_id'], name: editName.trim() })
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteCategory({ id: deleteTarget._id })
      setDeleteTarget(null)
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      // Convex wraps the thrown message — extract after "Uncaught Error:" if present
      const extracted = raw.match(/Uncaught Error:\s*(.+?)(?:\n|$)/)?.[1] ?? raw.match(/Cannot delete:[^\n]+/)?.[0]
      setDeleteError(extracted ?? 'Failed to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">Manage the categories shown in the shop sidebar.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding(true)
            setNewName('')
          }}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {categories === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3 text-center">Products</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adding && (
                <tr className="bg-teal-50/50">
                  <td className="px-4 py-3">
                    <input
                      autoFocus
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAdd()
                        if (e.key === 'Escape') setAdding(false)
                      }}
                      placeholder="e.g. Pain Relief"
                      className="w-full rounded-lg border border-teal-300 px-3 py-1.5 text-sm outline-none ring-teal-200 focus:ring-2"
                    />
                  </td>
                  <td className="px-4 py-3 text-center" />
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void handleAdd()}
                        disabled={saving || !newName.trim()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        title="Save"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdding(false)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {(categories ?? []).length === 0 && !adding && (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-slate-400">
                    No categories yet. Add your first one!
                  </td>
                </tr>
              )}
              {(categories ?? []).map((cat) => (
                <tr key={cat._id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editingId === cat._id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveEdit()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="w-full rounded-lg border border-sky-300 px-3 py-1.5 text-sm outline-none ring-sky-200 focus:ring-2"
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{cat.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {counts !== undefined && counts !== null ? (
                      <button
                        type="button"
                        onClick={() => setProductModalCategory(cat.name)}
                        className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                      >
                        {counts[cat.name] ?? 0}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === cat._id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit()}
                          disabled={saving}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                          title="Save"
                        >
                          {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(cat)}
                          title="Edit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cat)}
                          title="Delete"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-slate-900">Delete Category?</h3>
            <p className="mb-4 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be removed from the
              sidebar.
            </p>
            {deleteError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError('')
                }}
                className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className="flex-1 rounded-full bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {productModalCategory && (
        <CategoryProductsModal category={productModalCategory} onClose={() => setProductModalCategory(null)} />
      )}
    </>
  )
}

function UsersTab() {
  type UserAccessRecord = {
    id: string
    name: string | null
    email: string
    emailVerified: boolean
    createdAt: number
    updatedAt: number
    role: 'user' | 'admin' | 'super_admin'
    isSuperAdmin: boolean
  }

  const users = useQuery(api.admin.listUsers) as Array<UserAccessRecord> | null | undefined
  const updateStatus = useMutation(api.admin.updateOrderStatus)
  const updateTracking = useMutation(api.admin.updateOrderTracking)
  const setUserRole = useMutation(api.admin.setUserRole)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [viewingUser, setViewingUser] = useState<UserAccessRecord | null>(null)
  const userOrders = useQuery(api.admin.listOrdersForUser, viewingUser ? { userId: viewingUser.id } : 'skip')
  const [viewingOrder, setViewingOrder] = useState<Doc<'orders'> | null>(null)

  const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
    setUpdatingUserId(userId)
    setErrorMessage('')
    try {
      await setUserRole({ userId, role })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user role.'
      setErrorMessage(message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleOrderStatusChange = async (id: Doc<'orders'>['_id'], status: Doc<'orders'>['status']) => {
    setUpdatingOrderId(id)
    try {
      await updateStatus({ id, status })
      if (viewingOrder?._id === id) {
        setViewingOrder((prev) => (prev ? { ...prev, status } : null))
      }
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleTrackingSave = async (id: Doc<'orders'>['_id'], trackingWebsite: string, trackingNumber: string) => {
    setTrackingOrderId(id)
    const normalizedTrackingWebsite = trackingWebsite.trim()
    const normalizedTrackingNumber = trackingNumber.trim()
    try {
      await updateTracking({
        id,
        trackingWebsite: normalizedTrackingWebsite || undefined,
        trackingNumber: normalizedTrackingNumber || undefined,
      })
      if (viewingOrder?._id === id) {
        setViewingOrder((prev) =>
          prev
            ? {
                ...prev,
                trackingWebsite: normalizedTrackingWebsite || undefined,
                trackingNumber: normalizedTrackingNumber || undefined,
              }
            : null,
        )
      }
    } finally {
      setTrackingOrderId(null)
    }
  }

  const totalUsers = users?.length ?? 0
  const adminUsers = users?.filter((user) => user.role !== 'user').length ?? 0

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="h-7 w-7 text-sky-500" />} value={totalUsers} label="Users" />
        <StatCard icon={<User className="h-7 w-7 text-teal-500" />} value={adminUsers} label="Admins" />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Access</h2>
          <p className="text-sm text-slate-500">Primary admin only. Promote or revoke delegated admin access.</p>
        </div>
      </div>

      {errorMessage ? <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {users === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : users === null ? (
          <div className="py-16 text-center text-sm text-slate-400">Only the primary admin can manage user roles.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Verified</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isUpdating = updatingUserId === user.id
                  const isDelegatedAdmin = user.role === 'admin'
                  const isPrimaryAdmin = user.role === 'super_admin'

                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{user.name || 'Unnamed user'}</div>
                        <div className="text-xs text-slate-400">{user.id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-center">
                        {user.emailVerified ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isPrimaryAdmin
                              ? 'bg-amber-50 text-amber-700'
                              : isDelegatedAdmin
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPrimaryAdmin ? 'Primary Admin' : isDelegatedAdmin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingUser(user)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Orders
                          </button>
                          {isPrimaryAdmin ? (
                            <span className="text-xs font-medium text-slate-400">Managed via `ADMIN_EMAIL`</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void handleRoleChange(user.id, isDelegatedAdmin ? 'user' : 'admin')}
                              disabled={isUpdating}
                              className={`inline-flex min-w-28 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                                isDelegatedAdmin
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-teal-600 text-white hover:bg-teal-700'
                              }`}
                            >
                              {isUpdating ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isDelegatedAdmin ? (
                                'Set as User'
                              ) : (
                                'Make Admin'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {viewingUser && (
        <UserOrdersModal
          user={viewingUser}
          orders={userOrders}
          onClose={() => {
            setViewingUser(null)
            setViewingOrder(null)
          }}
          onViewOrder={(order) => setViewingOrder(order)}
        />
      )}

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onStatusChange={(status) => void handleOrderStatusChange(viewingOrder._id, status)}
          onTrackingSave={(trackingWebsite, trackingNumber) =>
            void handleTrackingSave(viewingOrder._id, trackingWebsite, trackingNumber)
          }
          updating={updatingOrderId === viewingOrder._id}
          trackingSaving={trackingOrderId === viewingOrder._id}
        />
      )}
    </>
  )
}

function UserOrdersModal({
  user,
  orders,
  onClose,
  onViewOrder,
}: {
  user: {
    id: string
    name: string | null
    email: string
    emailVerified: boolean
    createdAt: number
    updatedAt: number
    role: 'user' | 'admin' | 'super_admin'
    isSuperAdmin: boolean
  }
  orders: Array<Doc<'orders'>> | null | undefined
  onClose: () => void
  onViewOrder: (order: Doc<'orders'>) => void
}) {
  const totalSpent = orders?.reduce((sum, order) => sum + order.total, 0) ?? 0

  function formatDate(ts: number) {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(ts)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user.name || user.email}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-6 py-4 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User ID</p>
            <p className="mt-1 break-all text-sm font-medium text-slate-800">{user.id}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {user.role === 'super_admin' ? 'Primary Admin' : user.role === 'admin' ? 'Admin' : 'User'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Joined</p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {user.createdAt ? formatDate(user.createdAt) : '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Order Value</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{formatPrice(totalSpent)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Orders</h3>
            <p className="text-sm text-slate-500">Full order history with payment details and current status.</p>
          </div>

          {orders === undefined ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : orders === null ? (
            <div className="py-16 text-center text-sm text-slate-400">You do not have access to this user.</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">This user has no orders yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Order</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Ref</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const status = getStatusDisplay(order.status)
                    return (
                      <tr key={order._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {order.items.slice(0, 2).map((item) => (
                            <div key={`${order._id}-${item.productId}`}>
                              {item.name} ×{item.quantity}
                            </div>
                          ))}
                          {order.items.length > 2 ? (
                            <div className="text-slate-400">+{order.items.length - 2} more</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatPrice(order.total)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              order.paymentMethod === 'crypto'
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {order.paymentMethod === 'crypto' ? 'Crypto' : 'Standard'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{order.nowPaymentsId ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => onViewOrder(order)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
    </div>
  )
}
