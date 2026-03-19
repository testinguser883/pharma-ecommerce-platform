'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { formatPrice } from '@/lib/utils'
import QRCode from 'react-qr-code'

const BTC_PRICE_REFRESH_MS = 20 * 60 * 1000

async function fetchBtcPriceUsd(): Promise<number> {
  const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT')
  if (!res.ok) throw new Error('Failed to fetch BTC price')
  const data = (await res.json()) as { price: string }
  return parseFloat(data.price)
}

export function PaymentPage({ orderId }: { orderId: string }) {
  const order = useQuery(api.orders.getById, { orderId: orderId as Id<'orders'> })
  const btcAddress = useQuery(api.orders.getBtcWalletAddress)
  const saveBtcDetails = useMutation(api.orders.saveBtcPaymentDetails)
  const generateUploadUrl = useMutation(api.orders.generatePaymentProofUploadUrl)
  const savePaymentProof = useMutation(api.orders.savePaymentProof)

  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [btcAmount, setBtcAmount] = useState<number | null>(null)
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<Date | null>(null)
  const [priceError, setPriceError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [proofUploaded, setProofUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Amount to pay: remaining pending for partial_payment, else full order total
  const amountUsd =
    order?.status === 'partial_payment'
      ? (order.partialAmountPending ?? order.total)
      : order?.total ?? 0

  const loadAndSaveBtcPrice = useCallback(async () => {
    if (!order || amountUsd <= 0) return
    try {
      setPriceError(false)
      const price = await fetchBtcPriceUsd()
      const amount = Number((amountUsd / price).toFixed(8))
      setBtcPrice(price)
      setBtcAmount(amount)
      setPriceUpdatedAt(new Date())
      await saveBtcDetails({
        orderId: order._id,
        btcAmountDue: amount,
        btcPriceUsd: price,
      })
    } catch {
      setPriceError(true)
    }
  }, [order, amountUsd, saveBtcDetails])

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
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 5 MB.')
      return
    }
    if (!order) return
    setUploadError(null)
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
      await savePaymentProof({ orderId: order._id, storageId: storageId as Id<'_storage'> })
      setProofUploaded(true)
    } catch {
      setUploadError('Upload failed. Please try again.')
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
            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
    btcAddress && btcAmount
      ? `bitcoin:${btcAddress}?amount=${btcAmount}`
      : btcAddress
        ? `bitcoin:${btcAddress}`
        : ''

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to orders
        </Link>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4">
        <p className="text-sm font-semibold text-orange-800">
          ₿ {order.status === 'partial_payment' ? 'Send Remaining Bitcoin Payment' : 'Send Bitcoin to complete your order'}
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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-slate-800">Upload Payment Screenshot</p>
        <p className="mb-4 text-xs text-slate-500">
          After sending Bitcoin, upload a screenshot of your transaction confirmation.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <button
          type="button"
          disabled={uploading}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Upload Screenshot
            </>
          )}
        </button>
        {uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}
      </div>
    </div>
  )
}
