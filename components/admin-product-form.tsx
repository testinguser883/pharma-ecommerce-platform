'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Plus, Upload, Link as LinkIcon, Loader2, ImageOff, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

type PackageOption = {
  pillCount: string
  originalPrice: string
  price: string
  benefits: string
  expiryDate: string
}

type DosagePricing = {
  dosage: string
  packages: PackageOption[]
}

export type ProductFormData = {
  name: string
  genericName: string
  category: string
  description: string
  fullDescription: string
  unit: string
  pricingMatrix: DosagePricing[]
  image: string
  imageAlt: string
  inStock: boolean
  slug: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}

type Props = {
  initial?: Doc<'products'>
  onSubmit: (data: ProductFormData) => Promise<void>
  onClose: () => void
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  genericName: '',
  category: '',
  description: '',
  fullDescription: '',
  unit: 'pill',
  pricingMatrix: [],
  image: '',
  imageAlt: '',
  inStock: true,
  slug: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function matrixFromDoc(doc: Doc<'products'>): DosagePricing[] {
  if (doc.pricingMatrix && doc.pricingMatrix.length > 0) {
    return doc.pricingMatrix.map((d) => ({
      dosage: d.dosage,
      packages: d.packages.map((p) => ({
        pillCount: String(p.pillCount),
        originalPrice: String(p.originalPrice),
        price: String(p.price),
        benefits: (p.benefits ?? []).join(', '),
        expiryDate: p.expiryDate ?? '',
      })),
    }))
  }
  // Fall back to dosageOptions (products seeded without pricingMatrix)
  if (doc.dosageOptions && doc.dosageOptions.length > 0) {
    return doc.dosageOptions.map((dosage) => ({ dosage, packages: [] }))
  }
  return []
}

export function AdminProductForm({ initial, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<ProductFormData>(
    initial
      ? {
          name: initial.name,
          genericName: initial.genericName,
          category: initial.category,
          description: initial.description,
          fullDescription: initial.fullDescription ?? '',
          unit: initial.unit,
          pricingMatrix: matrixFromDoc(initial),
          image: initial.image,
          imageAlt: initial.imageAlt ?? '',
          inStock: initial.inStock,
          slug: initial.slug ?? slugify(`${initial.name} ${initial.genericName}`),
          seoTitle: initial.seoTitle ?? '',
          seoDescription: initial.seoDescription ?? '',
          seoKeywords: initial.seoKeywords ?? '',
        }
      : EMPTY_FORM,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageMode, setImageMode] = useState<'upload' | 'url'>(initial?.image ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(initial?.image ?? '')
  const [previewLoadError, setPreviewLoadError] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(true)
  const [newDosageForMatrix, setNewDosageForMatrix] = useState('')
  const [selectedDosage, setSelectedDosage] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [showNewUnit, setShowNewUnit] = useState(false)
  const [newUnitInput, setNewUnitInput] = useState('')
  const [creatingUnit, setCreatingUnit] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initial?.slug)

  const nameRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)
  const getUploadedImageUrl = useMutation(api.admin.getUploadedImageUrl)
  const createCategory = useMutation(api.admin.createCategory)
  const dbCategories = useQuery(api.admin.listAdminCategories)
  const createUnitType = useMutation(api.admin.createUnitType)
  const dbUnitTypes = useQuery(api.admin.listUnitTypes)

  // Set default category once DB categories load (only for new products)
  useEffect(() => {
    if (!initial && dbCategories && dbCategories.length > 0 && !form.category) {
      set('category', dbCategories[0].name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbCategories])

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    if (form.pricingMatrix.length === 0) {
      setSelectedDosage('')
      return
    }

    if (!form.pricingMatrix.some((entry) => entry.dosage === selectedDosage)) {
      setSelectedDosage(form.pricingMatrix[0].dosage)
    }
  }, [form.pricingMatrix, selectedDosage])

  useEffect(() => {
    const currentDosageEntry = form.pricingMatrix.find((entry) => entry.dosage === selectedDosage)
    if (!currentDosageEntry || currentDosageEntry.packages.length === 0) {
      setSelectedPackage('')
      return
    }

    if (!currentDosageEntry.packages.some((_, index) => String(index) === selectedPackage)) {
      setSelectedPackage('0')
    }
  }, [form.pricingMatrix, selectedDosage, selectedPackage])

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Pricing matrix helpers
  const addDosagePricing = (dosage: string) => {
    const d = dosage.trim()
    if (!d || form.pricingMatrix.some((m) => m.dosage === d)) return
    set('pricingMatrix', [...form.pricingMatrix, { dosage: d, packages: [] }])
    setSelectedDosage(d)
    setSelectedPackage('')
    setNewDosageForMatrix('')
  }

  const removeDosagePricing = (dosage: string) => {
    set(
      'pricingMatrix',
      form.pricingMatrix.filter((m) => m.dosage !== dosage),
    )
  }

  const addPackageToDosage = (dosageIdx: number) => {
    const nextPackageIdx = form.pricingMatrix[dosageIdx]?.packages.length ?? 0
    const updated = form.pricingMatrix.map((d, i) =>
      i === dosageIdx
        ? {
            ...d,
            packages: [...d.packages, { pillCount: '', originalPrice: '', price: '', benefits: '', expiryDate: '' }],
          }
        : d,
    )
    set('pricingMatrix', updated)
    if (form.pricingMatrix[dosageIdx]) {
      setSelectedDosage(form.pricingMatrix[dosageIdx].dosage)
      setSelectedPackage(String(nextPackageIdx))
    }
  }

  const removePackage = (dosageIdx: number, pkgIdx: number) => {
    const updated = form.pricingMatrix.map((d, i) =>
      i === dosageIdx ? { ...d, packages: d.packages.filter((_, j) => j !== pkgIdx) } : d,
    )
    set('pricingMatrix', updated)
  }

  const updatePackage = (dosageIdx: number, pkgIdx: number, field: keyof PackageOption, value: string) => {
    const updated = form.pricingMatrix.map((d, i) =>
      i === dosageIdx
        ? {
            ...d,
            packages: d.packages.map((p, j) => (j === pkgIdx ? { ...p, [field]: value } : p)),
          }
        : d,
    )
    set('pricingMatrix', updated)
  }

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP, etc.)')
      return
    }
    setUploadError('')
    setUploading(true)
    setPreviewLoadError(false)
    const blobUrl = URL.createObjectURL(file)
    setPreviewSrc(blobUrl)
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('Upload failed')
      const { storageId } = (await response.json()) as { storageId: string }
      const cdnUrl = await getUploadedImageUrl({ storageId })
      if (!cdnUrl) throw new Error('Could not resolve image URL')
      set('image', cdnUrl)
      setPreviewSrc(cdnUrl)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Try again.')
      setPreviewSrc('')
      set('image', '')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void uploadFile(file)
  }

  const handleUrlChange = (url: string) => {
    setPreviewLoadError(false)
    set('image', url)
    setPreviewSrc(url)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) return setError('Brand name is required.')
    if (!form.genericName.trim()) return setError('Generic name is required.')
    if (!form.category) return setError('Category is required.')
    for (const dosagePricing of form.pricingMatrix) {
      if (!dosagePricing.dosage.trim()) return setError('Each pricing section needs a dosage.')
      if (dosagePricing.packages.length === 0) {
        return setError(`Add at least one package price for ${dosagePricing.dosage.trim() || 'each dosage'}.`)
      }
      for (const pkg of dosagePricing.packages) {
        if (Number(pkg.price) <= 0) return setError('Package price must be greater than 0.')
      }
    }
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const handleCreateCategory = async () => {
    const name = newCategoryInput.trim()
    if (!name) return
    setCreatingCategory(true)
    try {
      await createCategory({ name })
      set('category', name)
      setNewCategoryInput('')
      setShowNewCategory(false)
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleCreateUnit = async () => {
    const name = newUnitInput.trim()
    if (!name) return
    setCreatingUnit(true)
    try {
      await createUnitType({ name })
      set('unit', name)
      setNewUnitInput('')
      setShowNewUnit(false)
    } finally {
      setCreatingUnit(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-400 focus:ring-2 bg-white'
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'
  const selectedDosageIdx = form.pricingMatrix.findIndex((entry) => entry.dosage === selectedDosage)
  const activeDosageIdx = selectedDosageIdx >= 0 ? selectedDosageIdx : 0
  const activeDosageEntry = form.pricingMatrix[activeDosageIdx]
  const selectedPackageIdx =
    selectedPackage !== '' && Number.isInteger(Number(selectedPackage)) ? Number(selectedPackage) : -1
  const activePackageIdx =
    activeDosageEntry && selectedPackageIdx >= 0 && selectedPackageIdx < activeDosageEntry.packages.length
      ? selectedPackageIdx
      : 0
  const activePackage = activeDosageEntry?.packages[activePackageIdx]

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-2 backdrop-blur-sm sm:p-4">
      <div className="relative flex h-full max-h-[96vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{initial ? 'Edit Medicine' : 'Add New Medicine'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {/* Brand name */}
            <div>
              <label className={labelClass}>Brand Name *</label>
              <input
                ref={nameRef}
                type="text"
                className={inputClass}
                placeholder="e.g. Glucophage"
                value={form.name}
                onChange={(e) => {
                  set('name', e.target.value)
                  if (!slugManuallyEdited) set('slug', slugify(`${e.target.value} ${form.genericName}`))
                }}
              />
            </div>

            {/* Generic name */}
            <div>
              <label className={labelClass}>Generic Name *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Metformin"
                value={form.genericName}
                onChange={(e) => {
                  set('genericName', e.target.value)
                  if (!slugManuallyEdited) set('slug', slugify(`${form.name} ${e.target.value}`))
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>Category *</label>
              <div className="flex gap-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  disabled={dbCategories === undefined}
                >
                  {!form.category && <option value="">Select a category...</option>}
                  {(dbCategories ?? []).map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {/* Show current value if it's not in the DB (legacy data) */}
                  {form.category && dbCategories && !dbCategories.some((c) => c.name === form.category) && (
                    <option value={form.category}>{form.category} (not in DB — save to sync)</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory((v) => !v)}
                  title="Add new category"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              </div>
              {showNewCategory && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className={`${inputClass} flex-1`}
                    placeholder="New category name"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleCreateCategory()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateCategory()}
                    disabled={creatingCategory || !newCategoryInput.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false)
                      setNewCategoryInput('')
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Unit */}
            <div>
              <label className={labelClass}>Unit</label>
              <div className="flex gap-2">
                <select
                  className={`${inputClass} flex-1`}
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                >
                  {dbUnitTypes && dbUnitTypes.length > 0
                    ? dbUnitTypes.map((u) => (
                        <option key={u._id} value={u.name}>
                          {u.name}
                        </option>
                      ))
                    : ['Pill', 'Sachet', 'Bottle', 'Cap', 'Tablet'].map((u) => (
                        <option key={u} value={u.toLowerCase()}>
                          {u}
                        </option>
                      ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewUnit((v) => !v)}
                  title="Add new unit type"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  New
                </button>
              </div>
              {showNewUnit && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    className={`${inputClass} flex-1`}
                    placeholder="New unit type (e.g. Vial)"
                    value={newUnitInput}
                    onChange={(e) => setNewUnitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void handleCreateUnit()
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateUnit()}
                    disabled={creatingUnit || !newUnitInput.trim()}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {creatingUnit ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewUnit(false)
                      setNewUnitInput('')
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Brief Description */}
            <div className="sm:col-span-2 xl:col-span-3">
              <label className={labelClass}>Brief Description</label>
              <p className="mb-1.5 text-xs text-slate-400">Shown on the product detail page header (2–3 sentences).</p>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Brief description of the medicine and its uses..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* Full Product Description */}
            <div className="sm:col-span-2 xl:col-span-3">
              <label className={labelClass}>Full Product Description</label>
              <p className="mb-1.5 text-xs text-slate-400">
                Shown in the collapsible tab at the bottom of the product page. Supports safe markdown: headings (`#` to
                `######`), paragraphs, lists, bold, italics, inline code, and links. Raw HTML is not rendered.
              </p>
              <textarea
                className={`${inputClass} resize-y`}
                rows={12}
                placeholder="# Common Use&#10;The main component of Viagra is **Sildenafil Citrate**.&#10;&#10;## Dosage and Direction&#10;Usually the recommended dose is *50 mg* before sexual activity.&#10;&#10;### Key Benefits&#10;- Fast acting&#10;- Physician-guided use&#10;- Trusted formulation&#10;&#10;Read more at [Product Guide](https://example.com)"
                value={form.fullDescription}
                onChange={(e) => set('fullDescription', e.target.value)}
              />
            </div>

            {/* Pricing Matrix */}
            <div className="sm:col-span-2 xl:col-span-3">
              <button
                type="button"
                onClick={() => setMatrixOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span>Detailed Pricing Matrix</span>
                <div className="flex items-center gap-2">
                  {form.pricingMatrix.length > 0 && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      {form.pricingMatrix.length} dosage{form.pricingMatrix.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {matrixOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {matrixOpen && (
                <div className="mt-3 space-y-4 rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">
                    Add per-dosage, per-package pricing shown on the product detail page. Each dosage gets its own list
                    of packages (10 pills, 30 pills, etc.) with original and discounted prices.
                  </p>

                  {/* Add new dosage to matrix */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`${inputClass} flex-1`}
                      placeholder="Dosage (e.g. 25mg)"
                      value={newDosageForMatrix}
                      onChange={(e) => setNewDosageForMatrix(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addDosagePricing(newDosageForMatrix)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addDosagePricing(newDosageForMatrix)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Dosage
                    </button>
                  </div>

                  {form.pricingMatrix.length > 0 && activeDosageEntry && (
                    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Selected Dosage</label>
                          <select
                            className={inputClass}
                            value={activeDosageEntry.dosage}
                            onChange={(e) => setSelectedDosage(e.target.value)}
                          >
                            {form.pricingMatrix.map((entry) => (
                              <option key={entry.dosage} value={entry.dosage}>
                                {entry.dosage}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Selected Package</label>
                          <select
                            className={inputClass}
                            value={activeDosageEntry.packages.length > 0 ? String(activePackageIdx) : ''}
                            onChange={(e) => setSelectedPackage(e.target.value)}
                            disabled={activeDosageEntry.packages.length === 0}
                          >
                            {activeDosageEntry.packages.length === 0 ? (
                              <option value="">No packages yet</option>
                            ) : (
                              activeDosageEntry.packages.map((pkg, pkgIdx) => (
                                <option key={`${activeDosageEntry.dosage}-${pkgIdx}`} value={String(pkgIdx)}>
                                  {pkg.pillCount
                                    ? `${pkg.pillCount} ${form.unit}${pkg.pillCount === '1' ? '' : 's'}`
                                    : `Package ${pkgIdx + 1}`}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-800">{activeDosageEntry.dosage}</p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => addPackageToDosage(activeDosageIdx)}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            <Plus className="h-3 w-3" />
                            Add Package
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDosagePricing(activeDosageEntry.dosage)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {!activePackage ? (
                        <p className="text-xs text-slate-400">No packages yet. Click "Add Package" to add one.</p>
                      ) : (
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Qty ({form.unit}s)</label>
                            <input
                              type="number"
                              min={1}
                              className={inputClass}
                              placeholder="e.g. 30"
                              value={activePackage.pillCount}
                              onChange={(e) =>
                                updatePackage(activeDosageIdx, activePackageIdx, 'pillCount', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Original $</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inputClass}
                              placeholder="34.57"
                              value={activePackage.originalPrice}
                              onChange={(e) =>
                                updatePackage(activeDosageIdx, activePackageIdx, 'originalPrice', e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Sale $</label>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className={inputClass}
                              placeholder="18.99"
                              value={activePackage.price}
                              onChange={(e) =>
                                updatePackage(activeDosageIdx, activePackageIdx, 'price', e.target.value)
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removePackage(activeDosageIdx, activePackageIdx)}
                            className="mt-5 text-slate-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">Expiration Date</label>
                            <input
                              type="date"
                              className={inputClass}
                              value={activePackage.expiryDate}
                              onChange={(e) =>
                                updatePackage(activeDosageIdx, activePackageIdx, 'expiryDate', e.target.value)
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="mb-1 block text-xs text-slate-400">
                              Benefits (comma-separated, e.g. "4 free ED pills, Package delivery insurance")
                            </label>
                            <input
                              type="text"
                              className={inputClass}
                              placeholder="4 free ED pills, Package delivery insurance, Next orders 10% discount"
                              value={activePackage.benefits}
                              onChange={(e) =>
                                updatePackage(activeDosageIdx, activePackageIdx, 'benefits', e.target.value)
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image */}
            <div className="sm:col-span-2 xl:col-span-3">
              <label className={labelClass}>Product Image</label>

              <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-colors ${imageMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload from device
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-colors ${imageMode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LinkIcon className="h-4 w-4" />
                  Use image URL
                </button>
              </div>

              {imageMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50'}`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                      <p className="text-sm font-medium text-slate-600">Uploading image...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Click to select or drag &amp; drop</p>
                        <p className="text-xs text-slate-400">JPG, PNG, WebP, GIF up to any size</p>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {imageMode === 'url' && (
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://example.com/image.jpg"
                  value={form.image}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
              )}

              {uploadError && <p className="mt-1.5 text-xs font-medium text-red-600">{uploadError}</p>}

              {/* Alt text */}
              <div className="mt-3">
                <label className={labelClass}>Image Alt Text</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="e.g. Glucophage 500mg pill bottle"
                  value={form.imageAlt}
                  onChange={(e) => set('imageAlt', e.target.value)}
                />
              </div>

              {/* Live card preview */}
              {(previewSrc || uploading) && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Preview — how it looks on the shop
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="inline-block w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="relative p-4">
                        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                          {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                            </div>
                          )}
                          <img
                            src={previewSrc}
                            alt={form.imageAlt || 'Preview'}
                            className={previewLoadError ? 'hidden' : 'h-24 w-24 object-contain'}
                            onLoad={() => setPreviewLoadError(false)}
                            onError={() => setPreviewLoadError(true)}
                          />
                          <div
                            className={`flex-col items-center gap-1 text-slate-300 ${previewLoadError ? 'flex' : 'hidden'}`}
                          >
                            <ImageOff className="h-8 w-8" />
                            <span className="text-xs">Bad URL</span>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-sm font-bold text-slate-900">{form.name || 'Brand Name'}</p>
                        <p className="text-center text-xs text-slate-500">{form.genericName || 'Generic Name'}</p>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-xs font-semibold text-white">
                        Buy Now
                      </div>
                    </div>
                    {!uploading && previewSrc && imageMode === 'upload' && (
                      <div className="flex flex-col gap-2 pt-2">
                        <p className="text-xs text-slate-500">Happy with it? Or pick a different one.</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Upload className="h-3 w-3" />
                          Change image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* In Stock toggle */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:col-span-2 xl:col-span-3">
              <button
                type="button"
                onClick={() => set('inStock', !form.inStock)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.inStock ? 'bg-teal-500' : 'bg-slate-200'}`}
                role="switch"
                aria-checked={form.inStock}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.inStock ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-800">In Stock</p>
                <p className="text-xs text-slate-500">Customers can purchase this item</p>
              </div>
            </div>

            {/* SEO section */}
            <div className="sm:col-span-2 xl:col-span-3">
              <div className="mb-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800">URL &amp; SEO</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure the product URL endpoint and search engine metadata.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>URL Endpoint (Slug)</label>
                  <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-slate-200 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-200">
                    <span className="select-none whitespace-nowrap bg-slate-50 px-3 py-2 text-sm text-slate-400">
                      /
                    </span>
                    <input
                      type="text"
                      className="flex-1 bg-white px-2 py-2 text-sm text-slate-800 outline-none"
                      placeholder="auto-generated-from-name"
                      value={form.slug}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        set('slug', val)
                        setSlugManuallyEdited(val !== '')
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Auto-generated from the brand name. Customize to set a friendly URL.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>SEO Title</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Generic Viagra (Sildenafil Citrate) - YourPharmacy.com"
                    value={form.seoTitle}
                    onChange={(e) => set('seoTitle', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Used in the browser tab and search results. Recommended: 50–60 characters.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>SEO Description</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="e.g. Viagra is used to treat erectile dysfunction. Sildenafil relaxes muscles and blood vessels..."
                    value={form.seoDescription}
                    onChange={(e) => set('seoDescription', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Shown in search engine results. Recommended: 150–160 characters.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>SEO Keywords</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. sildenafil, viagra, erectile dysfunction, 50mg, 100mg"
                    value={form.seoKeywords}
                    onChange={(e) => set('seoKeywords', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated keywords for the meta keywords tag.</p>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploading}
            className="rounded-full bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </div>
    </div>
  )
}
