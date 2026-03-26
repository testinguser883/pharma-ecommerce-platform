'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useAction } from 'convex/react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { COUNTRIES } from '@/lib/countries'
import { formatPrice } from '@/lib/utils'
import QRCode from 'react-qr-code'

type BillingForm = {
  isNewCustomer: boolean
  mobilePhone: string
  email: string
  dobYear: string
  dobMonth: string
  dobDay: string
  firstName: string
  lastName: string
  streetAddress: string
  city: string
  country: string
  state: string
  zipCode: string
}

type ShippingForm = {
  firstName: string
  lastName: string
  streetAddress: string
  city: string
  country: string
  state: string
  zipCode: string
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - 18 - i)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const EMPTY_BILLING: BillingForm = {
  isNewCustomer: true,
  mobilePhone: '',
  email: '',
  dobYear: '',
  dobMonth: '',
  dobDay: '',
  firstName: '',
  lastName: '',
  streetAddress: '',
  city: '',
  country: 'India',
  state: '',
  zipCode: '',
}

const EMPTY_SHIPPING: ShippingForm = {
  firstName: '',
  lastName: '',
  streetAddress: '',
  city: '',
  country: 'India',
  state: '',
  zipCode: '',
}

const inputClass =
  'w-full border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 bg-white'
const selectClass =
  'w-full border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 bg-white appearance-none'
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1'

const DELIVERY_COUNTRIES = COUNTRIES

function SectionHeader({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-sky-600 text-white text-lg font-bold">
        {number}
      </div>
      <h2 className="text-base font-bold uppercase tracking-widest text-sky-700">{title}</h2>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  )
}

// ── BTC Payment Panel ──────────────────────────────────────────────────────────

const BTC_PRICE_REFRESH_MS = 20 * 60 * 1000 // 20 minutes

function BtcPaymentPanel({
  orderId,
  orderTotal,
  btcAddress,
  onProofUploaded,
}: {
  orderId: Id<'orders'>
  orderTotal: number
  btcAddress: string
  onProofUploaded: () => void
}) {
  const refreshBtcQuote = useAction(api.orders.saveBtcPaymentDetails)
  const generateUploadUrl = useAction(api.orders.generatePaymentProofUploadUrl)
  const savePaymentProof = useMutation(api.orders.savePaymentProof)

  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [btcAmount, setBtcAmount] = useState<number | null>(null)
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<Date | null>(null)
  const [priceError, setPriceError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [proofUploaded, setProofUploaded] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Turnstile + honeypot
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)
  const [honeypot, setHoneypot] = useState('')

  const loadAndSaveBtcPrice = useCallback(async () => {
    try {
      setPriceError(false)
      const quote = await refreshBtcQuote({ orderId })
      setBtcPrice(quote.btcPriceUsd)
      setBtcAmount(quote.btcAmountDue)
      setPriceUpdatedAt(new Date(quote.btcPriceUpdatedAt))
    } catch {
      setPriceError(true)
    }
  }, [orderId, refreshBtcQuote])

  useEffect(() => {
    loadAndSaveBtcPrice()
    refreshTimerRef.current = setInterval(loadAndSaveBtcPrice, BTC_PRICE_REFRESH_MS)
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [loadAndSaveBtcPrice])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(btcAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPEG, PNG, etc.).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5 MB.')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      if (!turnstileToken) throw new Error('Please complete the CAPTCHA verification.')
      const verifyRes = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      const { success, captchaProof, captchaTimestamp } = (await verifyRes.json()) as {
        success: boolean
        captchaProof?: string
        captchaTimestamp?: number
      }
      if (!success || !captchaProof || !captchaTimestamp)
        throw new Error('CAPTCHA verification failed. Please try again.')
      const uploadUrl = await generateUploadUrl({ orderId, captchaProof, captchaTimestamp })
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!res.ok) throw new Error(`Upload failed (HTTP ${res.status})`)
      const { storageId } = (await res.json()) as { storageId: string }
      await savePaymentProof({ orderId, storageId: storageId as Id<'_storage'> })
      setProofUploaded(true)
      onProofUploaded()
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      console.error('[BtcPaymentPanel] upload error:', err)
      setUploadError(raw || 'Upload failed. Please try again.')
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setUploading(false)
    }
  }

  const qrValue = btcAmount ? `bitcoin:${btcAddress}?amount=${btcAmount}` : `bitcoin:${btcAddress}`

  if (proofUploaded) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
        <div className="mb-3 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-7 w-7 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-bold text-green-800">Payment Proof Submitted!</h2>
        <p className="mt-2 text-sm text-green-700">
          We&apos;ve received your payment screenshot. Our team will verify and confirm your order shortly.
        </p>
        <a
          href="/orders"
          className="mt-5 inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          View My Orders
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
        <p className="text-sm font-semibold text-orange-800">₿ Send Bitcoin to complete your order</p>
        <p className="mt-1 text-xs text-orange-700">
          Scan the QR code or copy the wallet address below. The BTC amount refreshes every 20 minutes to reflect the
          current price.
        </p>
      </div>

      {/* QR + Amount */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        {btcAmount ? (
          <>
            <div className="mb-4 inline-block rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <QRCode value={qrValue} size={192} />
            </div>

            <div className="mb-3 space-y-1">
              <p className="text-2xl font-extrabold text-slate-900">
                {btcAmount} <span className="text-orange-500">BTC</span>
              </p>
              <p className="text-sm text-slate-500">
                ≈ {formatPrice(orderTotal)} at {formatPrice(btcPrice ?? 0)}/BTC
              </p>
            </div>

            {priceUpdatedAt && (
              <p className="mb-4 text-xs text-slate-400">
                Price updated at {priceUpdatedAt.toLocaleTimeString()} · refreshes every 20 min
              </p>
            )}

            {/* Wallet address */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bitcoin Wallet Address
              </p>
              <div className="flex items-center gap-2">
                <p className="flex-1 break-all font-mono text-xs text-slate-700">{btcAddress}</p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        ) : priceError ? (
          <div className="py-8">
            <p className="text-sm text-red-600">Failed to fetch BTC price.</p>
            <button
              type="button"
              onClick={loadAndSaveBtcPrice}
              className="mt-3 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            <p className="text-sm text-slate-500">Fetching live BTC price...</p>
          </div>
        )}
      </div>

      {/* Upload proof */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-800">Upload Payment Screenshot</p>
        <p className="mb-4 text-xs text-slate-500">
          After sending Bitcoin, upload a screenshot of your transaction confirmation.
        </p>

        {/* Honeypot */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <input
            type="text"
            name="company"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Cloudflare Turnstile */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="mb-3">
            <Turnstile
              ref={turnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token: string) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: 'light', size: 'normal' }}
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              if (honeypot) {
                onProofUploaded()
                return
              }
              void handleFileUpload(file)
            }
          }}
        />
        <button
          type="button"
          disabled={uploading || !btcAmount || !turnstileToken}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-sm font-semibold text-slate-600 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Click to upload payment screenshot
            </>
          )}
        </button>
        {!turnstileToken && !uploading && (
          <p className="mt-2 text-xs text-slate-400">Complete the verification above to enable upload.</p>
        )}
        {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
        <p className="mt-3 text-xs text-slate-400">
          You can also upload proof later from your{' '}
          <Link href="/orders" className="font-medium text-sky-600 underline underline-offset-2">
            Orders page
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

// ── Main Checkout Component ────────────────────────────────────────────────────

export function CheckoutPageContent() {
  const cart = useQuery(api.cart.getMyCart)
  const btcAddress = useQuery(api.orders.getBtcWalletAddress)
  const createBtcOrder = useMutation(api.orders.createBtcOrder)

  const [billing, setBilling] = useState<BillingForm>(EMPTY_BILLING)
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING)
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<Id<'orders'> | null>(null)
  const [orderTotal, setOrderTotal] = useState(0)
  const [proofSubmitted, setProofSubmitted] = useState(false)

  // Checkout-form CAPTCHA
  const [checkoutTurnstileToken, setCheckoutTurnstileToken] = useState<string | null>(null)
  const checkoutTurnstileRef = useRef<TurnstileInstance>(null)
  const [checkoutHoneypot, setCheckoutHoneypot] = useState('')

  const setBillingField = <K extends keyof BillingForm>(key: K, value: BillingForm[K]) =>
    setBilling((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'country') next.state = ''
      return next
    })

  const setShippingField = <K extends keyof ShippingForm>(key: K, value: ShippingForm[K]) =>
    setShipping((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'country') next.state = ''
      return next
    })

  const buildBillingAddress = () => {
    const dob =
      billing.dobYear && billing.dobMonth && billing.dobDay
        ? `${billing.dobYear}-${billing.dobMonth.padStart(2, '0')}-${String(billing.dobDay).padStart(2, '0')}`
        : undefined
    return {
      isNewCustomer: billing.isNewCustomer,
      mobilePhone: billing.mobilePhone,
      email: billing.email,
      dateOfBirth: dob,
      firstName: billing.firstName,
      lastName: billing.lastName,
      streetAddress: billing.streetAddress,
      city: billing.city,
      country: billing.country,
      state: billing.state,
      zipCode: billing.zipCode,
    }
  }

  const buildShippingAddress = () => {
    if (shippingSameAsBilling) return { sameAsBilling: true as const }
    return {
      sameAsBilling: false as const,
      firstName: shipping.firstName,
      lastName: shipping.lastName,
      streetAddress: shipping.streetAddress,
      city: shipping.city,
      country: shipping.country,
      state: shipping.state,
      zipCode: shipping.zipCode,
    }
  }

  const validateForm = () => {
    if (!billing.firstName.trim() || !billing.lastName.trim()) return 'First and last name are required.'
    if (!billing.email.trim()) return 'Email is required.'
    if (!billing.mobilePhone.trim()) return 'Mobile phone is required.'
    if (!billing.streetAddress.trim()) return 'Street address is required.'
    if (!billing.city.trim()) return 'City is required.'
    if (!billing.state) return 'State / Province is required.'
    if (!billing.zipCode.trim()) return 'ZIP / Postal code is required.'
    if (!shippingSameAsBilling) {
      if (!shipping.firstName.trim() || !shipping.lastName.trim()) return 'Shipping: First and last name are required.'
      if (!shipping.streetAddress.trim()) return 'Shipping: Street address is required.'
      if (!shipping.city.trim()) return 'Shipping: City is required.'
      if (!shipping.state) return 'Shipping: State / Province is required.'
      if (!shipping.zipCode.trim()) return 'Shipping: ZIP / Postal code is required.'
    }
    return null
  }

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    if (checkoutHoneypot) return
    if (!cart || cart.items.length === 0) {
      setErrorMessage('Your cart is empty.')
      return
    }
    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    if (!btcAddress) {
      setErrorMessage('Bitcoin payment is not configured. Please contact support.')
      return
    }
    if (!checkoutTurnstileToken) {
      setErrorMessage('Please complete the CAPTCHA verification.')
      return
    }
    try {
      setIsSubmitting(true)
      const { orderId: newOrderId, total } = await createBtcOrder({
        billingAddress: buildBillingAddress(),
        shippingAddress: buildShippingAddress(),
      })
      setOrderId(newOrderId)
      setOrderTotal(total)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create order.')
      checkoutTurnstileRef.current?.reset()
      setCheckoutTurnstileToken(null)
      setIsSubmitting(false)
    }
  }

  if (cart === undefined || btcAddress === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <p className="text-sm text-slate-500">Loading checkout...</p>
      </div>
    )
  }

  const cartEmpty = !cart || cart.items.length === 0

  // Show payment panel once order is created
  if (orderId) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Complete Your Payment</h1>
          <p className="mt-1 text-sm text-slate-500">Order created — send Bitcoin to the address below.</p>
        </div>
        {!proofSubmitted && btcAddress ? (
          <BtcPaymentPanel
            orderId={orderId}
            orderTotal={orderTotal}
            btcAddress={btcAddress}
            onProofUploaded={() => setProofSubmitted(true)}
          />
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
            <p className="text-lg font-bold text-green-800">Payment Proof Submitted!</p>
            <p className="mt-2 text-sm text-green-700">We'll verify and confirm your order shortly.</p>
            <Link
              href="/orders"
              className="mt-5 inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              View My Orders
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_320px] lg:px-6">
      <form onSubmit={handleCheckoutSubmit}>
        {/* ── Section 1: Billing Address ── */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm mb-5">
          <SectionHeader number={1} title="Billing Address" />

          <div className="space-y-4">
            <Field label="New Customer?:">
              <div className="relative">
                <select
                  className={selectClass}
                  value={billing.isNewCustomer ? 'yes' : 'no'}
                  onChange={(e) => setBillingField('isNewCustomer', e.target.value === 'yes')}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
              </div>
            </Field>

            <Field label="Mobile Phone:">
              <input
                type="tel"
                className={inputClass}
                placeholder="+91"
                value={billing.mobilePhone}
                onChange={(e) => setBillingField('mobilePhone', e.target.value)}
              />
            </Field>

            <Field label="E-Mail:">
              <input
                type="email"
                className={inputClass}
                placeholder="your@email.com"
                value={billing.email}
                onChange={(e) => setBillingField('email', e.target.value)}
              />
            </Field>

            <Field label="Date of Birth:">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    className={selectClass}
                    value={billing.dobYear}
                    onChange={(e) => setBillingField('dobYear', e.target.value)}
                  >
                    <option value="">year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-2.5 text-xs text-slate-400">▾</span>
                </div>
                <span className="text-slate-500">–</span>
                <div className="relative flex-1">
                  <select
                    className={selectClass}
                    value={billing.dobMonth}
                    onChange={(e) => setBillingField('dobMonth', e.target.value)}
                  >
                    <option value="">month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, '0')}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-2.5 text-xs text-slate-400">▾</span>
                </div>
                <span className="text-slate-500">–</span>
                <div className="relative flex-1">
                  <select
                    className={selectClass}
                    value={billing.dobDay}
                    onChange={(e) => setBillingField('dobDay', e.target.value)}
                  >
                    <option value="">day</option>
                    {DAYS.map((d) => (
                      <option key={d} value={String(d)}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2 top-2.5 text-xs text-slate-400">▾</span>
                </div>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First Name:">
                <input
                  type="text"
                  className={inputClass}
                  value={billing.firstName}
                  onChange={(e) => setBillingField('firstName', e.target.value)}
                />
              </Field>
              <Field label="Last Name:">
                <input
                  type="text"
                  className={inputClass}
                  value={billing.lastName}
                  onChange={(e) => setBillingField('lastName', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Street Address:">
              <input
                type="text"
                className={inputClass}
                value={billing.streetAddress}
                onChange={(e) => setBillingField('streetAddress', e.target.value)}
              />
            </Field>

            <Field label="City:">
              <input
                type="text"
                className={inputClass}
                value={billing.city}
                onChange={(e) => setBillingField('city', e.target.value)}
              />
            </Field>

            <Field label="Country:">
              <div className="relative">
                <select
                  className={selectClass}
                  value={billing.country}
                  onChange={(e) => setBillingField('country', e.target.value)}
                >
                  {DELIVERY_COUNTRIES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
              </div>
            </Field>

            <Field label="State / Province:">
              <input
                type="text"
                className={inputClass}
                placeholder="State / Province"
                value={billing.state}
                onChange={(e) => setBillingField('state', e.target.value)}
              />
            </Field>

            <Field label="ZIP/Postal Code:">
              <input
                type="text"
                className={inputClass}
                value={billing.zipCode}
                onChange={(e) => setBillingField('zipCode', e.target.value)}
              />
            </Field>
          </div>

          {/* Shipping section */}
          <div className="mt-6">
            <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-sky-700">
              Shipping Address
            </h3>
            <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={shippingSameAsBilling}
                onChange={(e) => setShippingSameAsBilling(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
              />
              Shipping address same as billing
            </label>

            {!shippingSameAsBilling && (
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="First Name:">
                    <input
                      type="text"
                      className={inputClass}
                      value={shipping.firstName}
                      onChange={(e) => setShippingField('firstName', e.target.value)}
                    />
                  </Field>
                  <Field label="Last Name:">
                    <input
                      type="text"
                      className={inputClass}
                      value={shipping.lastName}
                      onChange={(e) => setShippingField('lastName', e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Street Address:">
                  <input
                    type="text"
                    className={inputClass}
                    value={shipping.streetAddress}
                    onChange={(e) => setShippingField('streetAddress', e.target.value)}
                  />
                </Field>
                <Field label="City:">
                  <input
                    type="text"
                    className={inputClass}
                    value={shipping.city}
                    onChange={(e) => setShippingField('city', e.target.value)}
                  />
                </Field>
                <Field label="Country:">
                  <div className="relative">
                    <select
                      className={selectClass}
                      value={shipping.country}
                      onChange={(e) => setShippingField('country', e.target.value)}
                    >
                      {DELIVERY_COUNTRIES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
                  </div>
                </Field>
                <Field label="State / Province:">
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="State / Province"
                    value={shipping.state}
                    onChange={(e) => setShippingField('state', e.target.value)}
                  />
                </Field>
                <Field label="ZIP/Postal Code:">
                  <input
                    type="text"
                    className={inputClass}
                    value={shipping.zipCode}
                    onChange={(e) => setShippingField('zipCode', e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* BTC payment notice */}
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <p className="font-semibold">₿ Bitcoin Payment</p>
          <p className="mt-0.5 text-xs text-orange-700">
            After placing your order, you&apos;ll receive a Bitcoin wallet address and QR code. Send the exact BTC
            amount and upload your transaction screenshot to confirm payment.
          </p>
        </div>

        {!btcAddress && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Bitcoin wallet address is not configured. Please contact support before placing an order.
          </div>
        )}

        {errorMessage && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}

        {/* Honeypot */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <input
            type="text"
            name="website"
            value={checkoutHoneypot}
            onChange={(e) => setCheckoutHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {/* Cloudflare Turnstile */}
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <div className="mb-4">
            <Turnstile
              ref={checkoutTurnstileRef}
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              onSuccess={(token: string) => setCheckoutTurnstileToken(token)}
              onError={() => setCheckoutTurnstileToken(null)}
              onExpire={() => {
                setCheckoutTurnstileToken(null)
                setErrorMessage('Verification expired. Please complete the CAPTCHA again.')
              }}
              options={{ theme: 'light', size: 'normal' }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || cartEmpty || !btcAddress || !checkoutTurnstileToken}
          className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating order...' : 'Place Order & Pay with Bitcoin'}
        </button>
      </form>

      {/* Order Summary */}
      <aside className="pharma-card h-fit p-5">
        <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
        <ul className="mt-4 space-y-2">
          {cart?.items.map((item) => (
            <li
              key={`${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium text-slate-900">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-slate-200 pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatPrice(cart?.total ?? 0)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
