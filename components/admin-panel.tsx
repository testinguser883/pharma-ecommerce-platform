'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import {
  ArrowLeft,
  Package,
  PackageCheck,
  Star,
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
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { AdminProductForm, type ProductFormData } from './admin-product-form'

type Tab = 'products' | 'categories'

export function AdminPanel() {
  const isAdmin = useQuery(api.admin.isAdmin)
  const [tab, setTab] = useState<Tab>('products')

  if (isAdmin === undefined) {
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
        <Link href="/" className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          Back to Shop
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
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

          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTab('products')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Package className="h-4 w-4" />
              Medicines
            </button>
            <button
              type="button"
              onClick={() => setTab('categories')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${tab === 'categories' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Tag className="h-4 w-4" />
              Categories
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        {tab === 'products' ? <ProductsTab /> : <CategoriesTab />}
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
  const createProduct = useMutation(api.admin.createProduct)
  const updateProduct = useMutation(api.admin.updateProduct)
  const deleteProduct = useMutation(api.admin.deleteProduct)
  const toggleStock = useMutation(api.admin.toggleStock)
  const toggleBestseller = useMutation(api.admin.toggleBestseller)
  const toggleVisibility = useMutation(api.admin.toggleVisibility)

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
  const bestsellerCount = products?.filter((p) => p.isBestseller).length ?? 0
  const hiddenCount = products?.filter((p) => p.isVisible === false).length ?? 0

  const handleCreate = async (data: ProductFormData) => {
    await createProduct(data)
    setFormOpen(false)
  }

  const handleUpdate = async (data: ProductFormData) => {
    if (!editProduct) return
    await updateProduct({ id: editProduct._id, ...data })
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
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Package className="h-7 w-7 text-sky-500" />} value={totalProducts} label="Total" />
        <StatCard icon={<PackageCheck className="h-7 w-7 text-teal-500" />} value={inStockCount} label="In Stock" />
        <StatCard icon={<Star className="h-7 w-7 text-amber-400" />} value={bestsellerCount} label="Bestsellers" />
        <StatCard icon={<EyeOff className="h-7 w-7 text-slate-400" />} value={hiddenCount} label="Hidden" />
      </div>

      {/* Search + Add */}
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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {products === undefined ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
          </div>
        ) : products.length === 0 ? (
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
                  <th className="px-4 py-3 text-center">Bestseller</th>
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
                    onToggleBestseller={() => void toggleBestseller({ id: p._id, isBestseller: !p.isBestseller })}
                    onToggleVisibility={() => void toggleVisibility({ id: p._id, isVisible: p.isVisible === false })}
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
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be permanently removed. This
              cannot be undone.
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
  onToggleBestseller: () => void
  onToggleVisibility: () => void
}

function ProductRow({ product, onEdit, onDelete, onToggleStock, onToggleBestseller, onToggleVisibility }: RowProps) {
  const visible = product.isVisible !== false
  const discountedPrice = product.price * (1 - product.discount / 100)

  return (
    <tr className={`group transition-colors hover:bg-slate-50 ${!visible ? 'opacity-50' : ''}`}>
      <td className="max-w-[220px] px-4 py-3">
        <div className="flex items-center gap-3">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
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

      {/* Visible toggle — eye icon */}
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

      {/* In Stock toggle */}
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onToggleStock}
          title={product.inStock ? 'Mark as out of stock' : 'Mark as in stock'}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${product.inStock ? 'bg-teal-500' : 'bg-slate-200'}`}
          role="switch"
          aria-checked={product.inStock}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${product.inStock ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </td>

      {/* Bestseller toggle */}
      <td className="px-4 py-3 text-center">
        <button
          type="button"
          onClick={onToggleBestseller}
          title={product.isBestseller ? 'Remove from bestsellers' : 'Mark as bestseller'}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${product.isBestseller ? 'bg-amber-400' : 'bg-slate-200'}`}
          role="switch"
          aria-checked={product.isBestseller}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${product.isBestseller ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </td>

      {/* Actions */}
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

// ── Categories tab ────────────────────────────────────────────────────────────

function CategoriesTab() {
  const categories = useQuery(api.admin.listAdminCategories)
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
    try {
      await deleteCategory({ id: deleteTarget._id })
      setDeleteTarget(null)
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
          onClick={() => { setAdding(true); setNewName('') }}
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Add new row */}
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

              {categories.length === 0 && !adding && (
                <tr>
                  <td colSpan={2} className="py-16 text-center text-slate-400">
                    No categories yet. Add your first one!
                  </td>
                </tr>
              )}

              {categories.map((cat) => (
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
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-slate-900">Delete Category?</h3>
            <p className="mb-6 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{deleteTarget.name}</span> will be removed from the sidebar.
              Existing medicines in this category are not affected.
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
