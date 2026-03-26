'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { formatPrice } from '@/lib/utils'
import QRCode from 'react-qr-code'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

const BTC_PRICE_REFRESH_MS = 20 * 60 * 1000
const MAX_REJECTIONS = 5

function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`
}

export function PaymentPage({ orderId }: { orderId: string }) {
  const order = useQuery(api.orders.getById, { orderId: orderId as Id<'orders'> })
  const btcAddress = useQuery(api.orders.getBtcWalletAddress)
  const refreshBtcQuote = useAction(api.orders.saveBtcPaymentDetails)
  const generateUploadUrl = useAction(api.orders.generatePaymentProofUploadUrl)
  const savePaymentProof = useMutation(api.orders.savePaymentProof)

  // BTC price
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [btcAmount, setBtcAmount] = useState<number | null>(null)
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<Date | null>(null)
  const [priceError, setPriceError] = useState(false)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [proofUploaded, setProofUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  // Honeypot
  const [honeypot, setHoneypot] = useState('')

  // Tick every second for cooldown countdowns
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Abuse guard computed from order history
  const { isLocked, isCoolingDown, cooldownSecsLeft, rejectionCount } = useMemo(() => {
    const history = order && 'paymentProofHistory' in order ? (order.paymentProofHistory ?? []) : []
    const rejections = history.filter((h) => h.decision === 'rejected')
    const locked = rejections.length >= MAX_REJECTIONS
    const last = rejections[rejections.length - 1]
    const cooldownMs = last ? Math.pow(2, rejections.length - 1) * 5 * 60 * 1000 : 0
    const endsAt = last ? last.decidedAt + cooldownMs : 0
    const secsLeft = Math.max(0, Math.ceil((endsAt - now) / 1000))
    return {
      isLocked: locked,
      isCoolingDown: secsLeft > 0,
      cooldownSecsLeft: secsLeft,
      rejectionCount: rejections.length,
    }
  }, [order, now])

  const amountUsd =
    order?.status === 'partial_payment' ? (order.partialAmountPending ?? order.total) : (order?.total ?? 0)

  const loadAndSaveBtcPrice = useCallback(async () => {
    if (!order || amountUsd <= 0) return
    try {
      setPriceError(false)
      const quote = await refreshBtcQuote({ orderId: order._id })
      setBtcPrice(quote.btcPriceUsd)
      setBtcAmount(quote.btcAmountDue)
      setPriceUpdatedAt(new Date(quote.btcPriceUpdatedAt))
    } catch {
      setPriceError(true)
    }
  }, [order, amountUsd, refreshBtcQuote])

  useEffect(() => {
    if (!order) return
    loadAndSaveBtcPrice()
    timerRef.current = setInterval(loadAndSaveBtcPrice, BTC_PRICE_REFRESH_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [order, loadAndSaveBtcPrice])

  const handleCopy = async () => {
    if (!btcAddress) return
    await navigator.clipboard.writeText(btcAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFile = async (file: File) => {
    if (honeypot) {
      setProofUploaded(true)
      return
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5 MB.')
      return
    }
    if (!order || !turnstileToken) return
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
      const uploadUrl = await generateUploadUrl({ orderId: order._id, captchaProof, captchaTimestamp })
      const res = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.type }, body: file })
      if (!res.ok) throw new Error('Upload failed')
      const { storageId } = (await res.json()) as { storageId: string }
      await savePaymentProof({ orderId: order._id, storageId: storageId as Id<'_storage'> })
      setProofUploaded(true)
    } catch (err) {
      const raw = err instanceof Error ? ((err as any).data ?? err.message) : ''
      const knownPhrases = [
        'wait',
        'locked',
        'review',
        'rejected',
        'large',
        'not found',
        'attempt',
        'contact',
        'captcha',
      ]
      setUploadError(knownPhrases.some((p) => raw.toLowerCase().includes(p)) ? raw : 'Upload failed. Please try again.')
      // Reset Turnstile so a fresh token is required for the next attempt
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setUploading(false)
    }
  }

  if (order === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    )
  }
  if (order === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-slate-700">Order not found</p>
        <Link href="/orders" className="text-sm text-teal-600 underline">
          Back to orders
        </Link>
      </div>
    )
  }
  if (order.status !== 'pending_payment' && order.status !== 'partial_payment') {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10 text-center">
        <p className="text-lg font-semibold text-slate-700">
          {order.status === 'payment_review'
            ? 'Your payment proof is under review.'
            : order.status === 'paid'
              ? 'This order has already been paid.'
              : 'No payment needed for this order.'}
        </p>
        <Link href="/orders" className="inline-block text-sm text-teal-600 underline">
          Back to orders
        </Link>
      </div>
    )
  }
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
          We&apos;ve received your screenshot. Our team will verify and confirm your order shortly.
        </p>
        <Link
          href="/orders"
          className="mt-5 inline-block rounded-full bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          View My Orders
        </Link>
      </div>
    )
  }

  const qrValue =
    btcAddress && btcAmount ? `bitcoin:${btcAddress}?amount=${btcAmount}` : btcAddress ? `bitcoin:${btcAddress}` : ''

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to orders
      </Link>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
        <p className="text-sm font-semibold text-orange-800">
          ₿{' '}
          {order.status === 'partial_payment'
            ? 'Send Remaining Bitcoin Payment'
            : 'Send Bitcoin to complete your order'}
        </p>
        {order.status === 'partial_payment' && order.partialAmountReceived != null && (
          <p className="mt-1 text-xs text-orange-700">
            Previously received: {formatPrice(order.partialAmountReceived)} · Remaining: {formatPrice(amountUsd)}
          </p>
        )}
        <p className="mt-1 text-xs text-orange-700">
          Scan the QR code or copy the wallet address below. The BTC amount refreshes every 20 minutes.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {btcAmount && btcAddress ? (
          <>
            <div className="mb-4 inline-block rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <QRCode value={qrValue} size={192} />
            </div>
            <div className="mb-3 space-y-1">
              <p className="text-2xl font-extrabold text-slate-900">
                {btcAmount} <span className="text-orange-500">BTC</span>
              </p>
              <p className="text-sm text-slate-500">
                ≈ {formatPrice(amountUsd)} at {formatPrice(btcPrice ?? 0)}/BTC
              </p>
            </div>
            {priceUpdatedAt && (
              <p className="mb-4 text-xs text-slate-400">
                Price updated at {priceUpdatedAt.toLocaleTimeString()} · refreshes every 20 min
              </p>
            )}
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
              onClick={() => void loadAndSaveBtcPrice()}
              className="mt-3 rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
            <p className="text-sm text-slate-500">Fetching live BTC price…</p>
          </div>
        )}
      </div>

      {/* Upload section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-800">Upload Payment Screenshot</p>
        <p className="mb-4 text-xs text-slate-500">
          After sending Bitcoin, upload a screenshot of your transaction confirmation.
        </p>

        {isLocked ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 text-center">
            <p className="text-sm font-semibold text-red-800">Upload Locked</p>
            <p className="mt-1 text-xs text-red-600">Maximum rejected submissions reached. Please contact support.</p>
            <Link
              href="/contact-us"
              className="mt-3 inline-block rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Contact Support →
            </Link>
          </div>
        ) : isCoolingDown ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-5 text-center">
            <p className="text-sm font-semibold text-amber-800">Upload Cooldown Active</p>
            <p className="mt-1 text-xs text-amber-700">
              Your previous proof was rejected. Please wait before uploading again.
            </p>
            <div className="my-3 inline-block rounded-xl border border-amber-300 bg-white px-6 py-2">
              <span className="font-mono text-xl font-bold text-amber-700">{formatCountdown(cooldownSecsLeft)}</span>
            </div>
            <p className="text-xs text-amber-600">
              Attempt {rejectionCount}/{MAX_REJECTIONS} · {Math.round(Math.pow(2, rejectionCount - 1) * 5)}-minute
              cooldown
            </p>
          </div>
        ) : (
          <div className="space-y-4">
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

            {/* Turnstile widget */}
            {siteKey && (
              <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={(token: string) => setTurnstileToken(token)}
                onError={() => setTurnstileToken(null)}
                onExpire={() => setTurnstileToken(null)}
                options={{ theme: 'light', size: 'normal' }}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
            <button
              type="button"
              disabled={uploading || !turnstileToken}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                    />
                  </svg>
                  Upload Screenshot
                </>
              )}
            </button>

            {!turnstileToken && !uploading && (
              <p className="text-xs text-slate-400">Complete the verification above to enable upload.</p>
            )}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            {rejectionCount > 0 && (
              <p className="text-xs text-slate-400">
                Upload attempts used: {rejectionCount}/{MAX_REJECTIONS}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
