'use client'

import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { X, Plus, Upload, Link as LinkIcon, Loader2, ImageOff } from 'lucide-react'
import { useMutation } from 'convex/react'
import { CATEGORY_LIST } from '@/lib/category-list'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

export type ProductFormData = {
  name: string
  genericName: string
  category: string
  description: string
  price: number
  unit: string
  dosageOptions: string[]
  image: string
  discount: number
  inStock: boolean
  isBestseller: boolean
}

type Props = {
  initial?: Doc<'products'>
  onSubmit: (data: ProductFormData) => Promise<void>
  onClose: () => void
}

const EMPTY_FORM: ProductFormData = {
  name: '',
  genericName: '',
  category: CATEGORY_LIST[1], // first real category (skip Bestsellers)
  description: '',
  price: 0,
  unit: 'pill',
  dosageOptions: [],
  image: '',
  discount: 0,
  inStock: true,
  isBestseller: false,
}

export function AdminProductForm({ initial, onSubmit, onClose }: Props) {
  const [form, setForm] = useState<ProductFormData>(
    initial
      ? {
          name: initial.name,
          genericName: initial.genericName,
          category: initial.category,
          description: initial.description,
          price: initial.price,
          unit: initial.unit,
          dosageOptions: initial.dosageOptions,
          image: initial.image,
          discount: initial.discount,
          inStock: initial.inStock,
          isBestseller: initial.isBestseller,
        }
      : EMPTY_FORM,
  )
  const [dosageInput, setDosageInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [imageMode, setImageMode] = useState<'upload' | 'url'>(initial?.image ? 'url' : 'upload')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(initial?.image ?? '') // local blob OR final URL
  const [dragOver, setDragOver] = useState(false)

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

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP, etc.)')
      return
    }
    setUploadError('')
    setUploading(true)

    // Instant local preview
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

  const categories = CATEGORY_LIST.filter((c) => c !== 'Bestsellers')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Brand name */}
            <div>
              <label className={labelClass}>Brand Name *</label>
              <input
                ref={nameRef}
                type="text"
                className={inputClass}
                placeholder="e.g. Glucophage"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
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
                onChange={(e) => set('genericName', e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className={labelClass}>Category *</label>
              <select
                className={inputClass}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
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
              </select>
            </div>

            {/* Price */}
            <div>
              <label className={labelClass}>Price (INR) *</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-2 text-sm text-slate-400">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  value={form.price || ''}
                  onChange={(e) => set('price', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className={labelClass}>Discount (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputClass} pr-7`}
                  placeholder="0"
                  value={form.discount || ''}
                  onChange={(e) => set('discount', parseFloat(e.target.value) || 0)}
                />
                <span className="pointer-events-none absolute right-3 top-2 text-sm text-slate-400">%</span>
              </div>
            </div>

            {/* Description — full width */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Brief description of the medicine and its uses..."
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>

            {/* Dosage options */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Dosage Options *</label>
              <p className="mb-1.5 text-xs text-slate-400">Type a dosage and press Enter or comma to add it.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${inputClass} flex-1`}
                  placeholder="e.g. 500mg, 850mg, 1000mg"
                  value={dosageInput}
                  onChange={(e) => setDosageInput(e.target.value)}
                  onKeyDown={handleDosageKey}
                />
                <button
                  type="button"
                  onClick={addDosage}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
              {form.dosageOptions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.dosageOptions.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => removeDosage(d)}
                        className="text-sky-500 hover:text-sky-800"
                        aria-label={`Remove ${d}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Image — full width */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Product Image</label>

              {/* Mode tabs */}
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

              {/* Upload zone */}
              {imageMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
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
                        <p className="text-sm font-semibold text-slate-700">Click to select or drag & drop</p>
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

              {/* URL input */}
              {imageMode === 'url' && (
                <input
                  type="url"
                  className={inputClass}
                  placeholder="https://example.com/image.jpg"
                  value={form.image}
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
              )}

              {uploadError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{uploadError}</p>
              )}

              {/* Live card preview */}
              {(previewSrc || uploading) && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Preview — how it looks on the shop
                  </p>
                  <div className="flex items-start gap-4">
                    {/* Mini product card */}
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
                          <img
                            src={previewSrc}
                            alt="Preview"
                            className="h-24 w-24 object-contain"
                            onError={(e) => {
                              const el = e.currentTarget as HTMLImageElement
                              el.style.display = 'none'
                              el.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="hidden flex-col items-center gap-1 text-slate-300">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-xs">Bad URL</span>
                          </div>
                        </div>
                        <p className="mt-3 text-center text-sm font-bold text-slate-900">
                          {form.name || 'Brand Name'}
                        </p>
                        <p className="text-center text-xs text-slate-500">
                          {form.genericName || 'Generic Name'}
                        </p>
                        <p className="mt-1 text-center text-xs font-bold text-slate-900">
                          ${((form.price ?? 0) * (1 - (form.discount ?? 0) / 100)).toFixed(2)} / {form.unit || 'unit'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-500 py-2 text-xs font-semibold text-white">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Buy Now
                      </div>
                    </div>

                    {/* Change image hint */}
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

            {/* Toggles */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
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

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => set('isBestseller', !form.isBestseller)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.isBestseller ? 'bg-amber-400' : 'bg-slate-200'}`}
                role="switch"
                aria-checked={form.isBestseller}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isBestseller ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-800">Bestseller</p>
                <p className="text-xs text-slate-500">Show in Bestsellers section</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
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
