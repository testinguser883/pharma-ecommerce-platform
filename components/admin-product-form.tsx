'use client'

import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { X, Plus, Upload, Link as LinkIcon, Loader2, ImageOff, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { CATEGORY_LIST } from '@/lib/category-list'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

type PackageOption = {
  pillCount: string
  originalPrice: string
  price: string
  benefits: string
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
  price: number
  unit: string
  dosageOptions: string[]
  pricingMatrix: DosagePricing[]
  image: string
  imageAlt: string
  discount: number
  inStock: boolean
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
  category: CATEGORY_LIST[0],
  description: '',
  fullDescription: '',
  price: 0,
  unit: 'pill',
  dosageOptions: [],
  pricingMatrix: [],
  image: '',
  imageAlt: '',
  discount: 0,
  inStock: true,
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
}

function matrixFromDoc(doc: Doc<'products'>): DosagePricing[] {
  if (!doc.pricingMatrix) return []
  return doc.pricingMatrix.map((d) => ({
    dosage: d.dosage,
    packages: d.packages.map((p) => ({
      pillCount: String(p.pillCount),
      originalPrice: String(p.originalPrice),
      price: String(p.price),
      benefits: (p.benefits ?? []).join(', '),
    })),
  }))
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
          price: initial.price,
          unit: initial.unit,
          dosageOptions: initial.dosageOptions,
          pricingMatrix: matrixFromDoc(initial),
          image: initial.image,
          imageAlt: initial.imageAlt ?? '',
          discount: initial.discount,
          inStock: initial.inStock,
          seoTitle: initial.seoTitle ?? '',
          seoDescription: initial.seoDescription ?? '',
          seoKeywords: initial.seoKeywords ?? '',
        }
      : EMPTY_FORM,
  )
  const [dosageInput, setDosageInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageMode, setImageMode] = useState<'upload' | 'url'>(initial?.image ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(initial?.image ?? '')
  const [dragOver, setDragOver] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(!!(initial?.pricingMatrix && initial.pricingMatrix.length > 0))
  const [newDosageForMatrix, setNewDosageForMatrix] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.admin.generateUploadUrl)
  const getUploadedImageUrl = useMutation(api.admin.getUploadedImageUrl)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addDosage = () => {
    const d = dosageInput.trim()
    if (d && !form.dosageOptions.includes(d)) {
      set('dosageOptions', [...form.dosageOptions, d])
    }
    setDosageInput('')
  }

  const removeDosage = (d: string) => set('dosageOptions', form.dosageOptions.filter((x) => x !== d))

  const handleDosageKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addDosage()
    }
  }

  // Pricing matrix helpers
  const addDosagePricing = (dosage: string) => {
    const d = dosage.trim()
    if (!d || form.pricingMatrix.some((m) => m.dosage === d)) return
    set('pricingMatrix', [...form.pricingMatrix, { dosage: d, packages: [] }])
    setNewDosageForMatrix('')
  }

  const removeDosagePricing = (dosage: string) => {
    set('pricingMatrix', form.pricingMatrix.filter((m) => m.dosage !== dosage))
  }

  const addPackageToDosage = (dosageIdx: number) => {
    const updated = form.pricingMatrix.map((d, i) =>
      i === dosageIdx
        ? { ...d, packages: [...d.packages, { pillCount: '', originalPrice: '', price: '', benefits: '' }] }
        : d,
    )
    set('pricingMatrix', updated)
  }

  const removePackage = (dosageIdx: number, pkgIdx: number) => {
    const updated = form.pricingMatrix.map((d, i) =>
      i === dosageIdx ? { ...d, packages: d.packages.filter((_, j) => j !== pkgIdx) } : d,
    )
    set('pricingMatrix', updated)
  }

  const updatePackage = (
    dosageIdx: number,
    pkgIdx: number,
    field: keyof PackageOption,
    value: string,
  ) => {
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
    set('image', url)
    setPreviewSrc(url)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name.trim()) return setError('Brand name is required.')
    if (!form.genericName.trim()) return setError('Generic name is required.')
    if (!form.category) return setError('Category is required.')
    if (form.price <= 0) return setError('Price must be greater than 0.')
    if (form.dosageOptions.length === 0) return setError('Add at least one dosage option.')
    setSaving(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-sky-200 focus:border-sky-400 focus:ring-2 bg-white'
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{initial ? 'Edit Medicine' : 'Add New Medicine'}</h2>
          <button type="button" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Brand name */}
            <div>
              <label className={labelClass}>Brand Name *</label>
              <input ref={nameRef} type="text" className={inputClass} placeholder="e.g. Glucophage"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>

            {/* Generic name */}
            <div>
              <label className={labelClass}>Generic Name *</label>
              <input type="text" className={inputClass} placeholder="e.g. Metformin"
                value={form.genericName} onChange={(e) => set('genericName', e.target.value)} />
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>Category *</label>
              <select className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORY_LIST.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className={labelClass}>Unit</label>
              <select className={inputClass} value={form.unit} onChange={(e) => set('unit', e.target.value)}>
                <option value="pill">Pill</option>
                <option value="sachet">Sachet</option>
                <option value="bottle">Bottle</option>
                <option value="cap">Cap</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className={labelClass}>Base Price (USD) *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">$</span>
                <input type="number" min={0} step={0.01} className={`${inputClass} pl-7`} placeholder="0.00"
                  value={form.price || ''} onChange={(e) => set('price', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className={labelClass}>Discount (%)</label>
              <div className="relative">
                <input type="number" min={0} max={100} className={`${inputClass} pr-7`} placeholder="0"
                  value={form.discount || ''} onChange={(e) => set('discount', parseFloat(e.target.value) || 0)} />
                <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">%</span>
              </div>
            </div>

            {/* Brief Description */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Brief Description</label>
              <p className="mb-1.5 text-xs text-slate-400">Shown on the product detail page header (2–3 sentences).</p>
              <textarea className={`${inputClass} resize-none`} rows={3}
                placeholder="Brief description of the medicine and its uses..."
                value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            {/* Full Product Description */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Product Description</label>
              <p className="mb-1.5 text-xs text-slate-400">Shown in the collapsible tab at the bottom of the product page. Supports plain text with line breaks.</p>
              <textarea className={`${inputClass} resize-y`} rows={8}
                placeholder="Common use&#10;The main component of Viagra is Sildenafil Citrate...&#10;&#10;Dosage and direction&#10;Usually the recommended dose is 50 mg..."
                value={form.fullDescription} onChange={(e) => set('fullDescription', e.target.value)} />
            </div>

            {/* Dosage options */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Dosage Options *</label>
              <p className="mb-1.5 text-xs text-slate-400">Type a dosage and press Enter or comma to add it. These appear as chips on the product card.</p>
              <div className="flex gap-2">
                <input type="text" className={`${inputClass} flex-1`} placeholder="e.g. 500mg, 850mg, 1000mg"
                  value={dosageInput} onChange={(e) => setDosageInput(e.target.value)} onKeyDown={handleDosageKey} />
                <button type="button" onClick={addDosage}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700">
                  <Plus className="h-4 w-4" />Add
                </button>
              </div>
              {form.dosageOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.dosageOptions.map((d) => (
                    <span key={d} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800">
                      {d}
                      <button type="button" onClick={() => removeDosage(d)} className="text-sky-500 hover:text-sky-800" aria-label={`Remove ${d}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Matrix */}
            <div className="sm:col-span-2">
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
                    Add per-dosage, per-package pricing shown on the product detail page. Each dosage gets its own list of packages (10 pills, 30 pills, etc.) with original and discounted prices.
                  </p>

                  {/* Sync from dosage options */}
                  {form.dosageOptions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 px-3 py-2">
                      <span className="text-xs text-sky-700">Dosage options: {form.dosageOptions.join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const existing = new Set(form.pricingMatrix.map((m) => m.dosage))
                          const newEntries = form.dosageOptions
                            .filter((d) => !existing.has(d))
                            .map((d) => ({ dosage: d, packages: [] }))
                          if (newEntries.length > 0) {
                            set('pricingMatrix', [...form.pricingMatrix, ...newEntries])
                          }
                        }}
                        className="ml-auto inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        <Plus className="h-3 w-3" />Sync dosages
                      </button>
                    </div>
                  )}

                  {/* Add new dosage to matrix */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`${inputClass} flex-1`}
                      placeholder="Dosage (e.g. 25mg)"
                      value={newDosageForMatrix}
                      onChange={(e) => setNewDosageForMatrix(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addDosagePricing(newDosageForMatrix) }
                      }}
                    />
                    <button type="button" onClick={() => addDosagePricing(newDosageForMatrix)}
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                      <Plus className="h-4 w-4" />Add Dosage
                    </button>
                  </div>

                  {form.pricingMatrix.map((dosageEntry, dosageIdx) => (
                    <div key={dosageEntry.dosage} className="rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
                        <span className="text-sm font-bold text-slate-800">{dosageEntry.dosage}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => addPackageToDosage(dosageIdx)}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                            <Plus className="h-3 w-3" />Add Package
                          </button>
                          <button type="button" onClick={() => removeDosagePricing(dosageEntry.dosage)}
                            className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {dosageEntry.packages.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-slate-400">No packages yet. Click "Add Package" to add one.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {dosageEntry.packages.map((pkg, pkgIdx) => (
                            <div key={pkgIdx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-4 py-3">
                              <div>
                                <label className="mb-1 block text-xs text-slate-400">Qty ({form.unit}s)</label>
                                <input type="number" min={1} className={inputClass} placeholder="e.g. 30"
                                  value={pkg.pillCount}
                                  onChange={(e) => updatePackage(dosageIdx, pkgIdx, 'pillCount', e.target.value)} />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-400">Original $</label>
                                <input type="number" min={0} step={0.01} className={inputClass} placeholder="34.57"
                                  value={pkg.originalPrice}
                                  onChange={(e) => updatePackage(dosageIdx, pkgIdx, 'originalPrice', e.target.value)} />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs text-slate-400">Sale $</label>
                                <input type="number" min={0} step={0.01} className={inputClass} placeholder="18.99"
                                  value={pkg.price}
                                  onChange={(e) => updatePackage(dosageIdx, pkgIdx, 'price', e.target.value)} />
                              </div>
                              <button type="button" onClick={() => removePackage(dosageIdx, pkgIdx)}
                                className="mt-5 text-slate-400 hover:text-red-500">
                                <X className="h-4 w-4" />
                              </button>
                              <div className="col-span-3">
                                <label className="mb-1 block text-xs text-slate-400">Benefits (comma-separated, e.g. "4 free ED pills, Package delivery insurance")</label>
                                <input type="text" className={inputClass}
                                  placeholder="4 free ED pills, Package delivery insurance, Next orders 10% discount"
                                  value={pkg.benefits}
                                  onChange={(e) => updatePackage(dosageIdx, pkgIdx, 'benefits', e.target.value)} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Product Image</label>

              <div className="mb-3 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setImageMode('upload')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-colors ${imageMode === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Upload className="h-4 w-4" />Upload from device
                </button>
                <button type="button" onClick={() => setImageMode('url')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-semibold transition-colors ${imageMode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <LinkIcon className="h-4 w-4" />Use image URL
                </button>
              </div>

              {imageMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50'}`}>
                  {uploading ? (
                    <><Loader2 className="h-8 w-8 animate-spin text-sky-500" /><p className="text-sm font-medium text-slate-600">Uploading image...</p></>
                  ) : (
                    <><Upload className="h-8 w-8 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Click to select or drag &amp; drop</p>
                      <p className="text-xs text-slate-400">JPG, PNG, WebP, GIF up to any size</p>
                    </div></>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {imageMode === 'url' && (
                <input type="url" className={inputClass} placeholder="https://example.com/image.jpg"
                  value={form.image} onChange={(e) => handleUrlChange(e.target.value)} />
              )}

              {uploadError && <p className="mt-1.5 text-xs font-medium text-red-600">{uploadError}</p>}

              {/* Alt text */}
              <div className="mt-3">
                <label className={labelClass}>Image Alt Text</label>
                <input type="text" className={inputClass} placeholder="e.g. Glucophage 500mg pill bottle"
                  value={form.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} />
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
                        {form.discount > 0 && (
                          <span className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                            -{form.discount}%
                          </span>
                        )}
                        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                          {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                            </div>
                          )}
                          <img src={previewSrc} alt={form.imageAlt || 'Preview'} className="h-24 w-24 object-contain"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement
                              el.style.display = 'none'
                              el.nextElementSibling?.classList.remove('hidden')
                            }} />
                          <div className="hidden flex-col items-center gap-1 text-slate-300">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-xs">Bad URL</span>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-sm font-bold text-slate-900">{form.name || 'Brand Name'}</p>
                        <p className="text-center text-xs text-slate-500">{form.genericName || 'Generic Name'}</p>
                        <p className="mt-1 text-center text-xs font-bold text-slate-900">
                          ${((form.price ?? 0) * (1 - (form.discount ?? 0) / 100)).toFixed(2)} / {form.unit || 'unit'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-xs font-semibold text-white">
                        Buy Now
                      </div>
                    </div>
                    {!uploading && previewSrc && imageMode === 'upload' && (
                      <div className="flex flex-col gap-2 pt-2">
                        <p className="text-xs text-slate-500">Happy with it? Or pick a different one.</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          <Upload className="h-3 w-3" />Change image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* In Stock toggle */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:col-span-2">
              <button type="button" onClick={() => set('inStock', !form.inStock)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.inStock ? 'bg-teal-500' : 'bg-slate-200'}`}
                role="switch" aria-checked={form.inStock}>
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.inStock ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-800">In Stock</p>
                <p className="text-xs text-slate-500">Customers can purchase this item</p>
              </div>
            </div>

            {/* SEO section */}
            <div className="sm:col-span-2">
              <div className="mb-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-800">SEO Metadata</h3>
                <p className="mt-0.5 text-xs text-slate-500">Configure search engine metadata for this product page.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>SEO Title</label>
                  <input type="text" className={inputClass}
                    placeholder="e.g. Generic Viagra (Sildenafil Citrate) - YourPharmacy.com"
                    value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">Used in the browser tab and search results. Recommended: 50–60 characters.</p>
                </div>
                <div>
                  <label className={labelClass}>SEO Description</label>
                  <textarea className={`${inputClass} resize-none`} rows={3}
                    placeholder="e.g. Viagra is used to treat erectile dysfunction. Sildenafil relaxes muscles and blood vessels..."
                    value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">Shown in search engine results. Recommended: 150–160 characters.</p>
                </div>
                <div>
                  <label className={labelClass}>SEO Keywords</label>
                  <input type="text" className={inputClass}
                    placeholder="e.g. sildenafil, viagra, erectile dysfunction, 50mg, 100mg"
                    value={form.seoKeywords} onChange={(e) => set('seoKeywords', e.target.value)} />
                  <p className="mt-1 text-xs text-slate-400">Comma-separated keywords for the meta keywords tag.</p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving || uploading}
            className="rounded-full bg-teal-600 px-6 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
            {saving ? 'Saving...' : initial ? 'Save Changes' : 'Add Medicine'}
          </button>
        </div>
      </div>
    </div>
  )
}
