'use client'

import { FormEvent, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { COUNTRIES } from '@/lib/countries'
import { formatPrice } from '@/lib/utils'

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

const CRYPTO_COINS = [
  { value: 'sol', label: 'Solana', symbol: 'SOL', color: 'text-purple-500' },
  { value: 'xrp', label: 'XRP', symbol: 'XRP', color: 'text-blue-500' },
  { value: 'ltc', label: 'Litecoin', symbol: 'LTC', color: 'text-slate-400' },
  { value: 'doge', label: 'Dogecoin', symbol: 'DOGE', color: 'text-yellow-500' },
  { value: 'btc', label: 'Bitcoin', symbol: 'BTC', color: 'text-orange-500' },
  { value: 'usdttrc20', label: 'USDT (Tron)', symbol: 'USDT', color: 'text-green-500' },
] as const

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
  mobilePhone: '+919876543210',
  email: 'test@example.com',
  dobYear: '1990',
  dobMonth: 'January',
  dobDay: '1',
  firstName: 'John',
  lastName: 'Doe',
  streetAddress: '123 Main Street',
  city: 'Mumbai',
  country: 'IN',
  state: 'Maharashtra',
  zipCode: '400001',
}

const EMPTY_SHIPPING: ShippingForm = {
  firstName: 'John',
  lastName: 'Doe',
  streetAddress: '123 Main Street',
  city: 'Mumbai',
  country: 'IN',
  state: 'Maharashtra',
  zipCode: '400001',
}

const inputClass =
  'w-full border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 bg-white'
const selectClass =
  'w-full border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 bg-white appearance-none'
const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-slate-700 mb-1'

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

export function CheckoutPageContent() {
  const cart = useQuery(api.cart.getMyCart)
  const createPendingCryptoOrder = useMutation(api.orders.createPendingCryptoOrder)
  const createNowPaymentsInvoice = useAction(api.orders.createNowPaymentsInvoice)

  const [billing, setBilling] = useState<BillingForm>(EMPTY_BILLING)
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING)
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(false)
  const [isCryptoSubmitting, setIsCryptoSubmitting] = useState(false)
  const [selectedCoin, setSelectedCoin] = useState<(typeof CRYPTO_COINS)[number]['value']>('btc')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const setBillingField = <K extends keyof BillingForm>(key: K, value: BillingForm[K]) =>
    setBilling((prev) => {
      const next = { ...prev, [key]: value }
      // Reset state when country changes
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
      country: COUNTRIES.find((c) => c.code === billing.country)?.name ?? billing.country,
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
      country: COUNTRIES.find((c) => c.code === shipping.country)?.name ?? shipping.country,
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
    await handleCryptoCheckout()
  }

  const handleCryptoCheckout = async () => {
    setErrorMessage(null)
    if (!cart || cart.items.length === 0) {
      setErrorMessage('Your cart is empty.')
      return
    }
    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }
    try {
      setIsCryptoSubmitting(true)
      const { orderId } = await createPendingCryptoOrder({
        billingAddress: buildBillingAddress(),
        shippingAddress: buildShippingAddress(),
      })
      const { invoiceUrl } = await createNowPaymentsInvoice({ orderId, payCurrency: selectedCoin })
      window.location.href = invoiceUrl
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate crypto payment.')
      setIsCryptoSubmitting(false)
    }
  }

  if (cart === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <p className="text-sm text-slate-500">Loading checkout...</p>
      </div>
    )
  }

  const cartEmpty = !cart || cart.items.length === 0

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1fr_320px] lg:px-6">
      <form onSubmit={handleCheckoutSubmit}>
        {/* ── Section 1: Billing Address ── */}
        <div className="border border-slate-200 bg-white p-6 shadow-sm mb-5">
          <SectionHeader number={1} title="Billing Address" />

          <div className="space-y-4">
            {/* New customer */}
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

            {/* Mobile Phone */}
            <Field label="Mobile Phone:">
              <input
                type="tel"
                className={inputClass}
                placeholder="+91"
                value={billing.mobilePhone}
                onChange={(e) => setBillingField('mobilePhone', e.target.value)}
              />
            </Field>

            {/* E-Mail */}
            <Field label="E-Mail:">
              <input
                type="email"
                className={inputClass}
                placeholder="your@email.com"
                value={billing.email}
                onChange={(e) => setBillingField('email', e.target.value)}
              />
            </Field>

            {/* Date of Birth */}
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

            {/* First + Last Name */}
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

            {/* Street Address */}
            <Field label="Street Address:">
              <input
                type="text"
                className={inputClass}
                value={billing.streetAddress}
                onChange={(e) => setBillingField('streetAddress', e.target.value)}
              />
            </Field>

            {/* City */}
            <Field label="City:">
              <input
                type="text"
                className={inputClass}
                value={billing.city}
                onChange={(e) => setBillingField('city', e.target.value)}
              />
            </Field>

            {/* Country */}
            <Field label="Country:">
              <div className="relative">
                <select
                  className={selectClass}
                  value={billing.country}
                  onChange={(e) => setBillingField('country', e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
              </div>
            </Field>

            {/* State / Province */}
            <Field label="State / Province:">
              <input
                type="text"
                className={inputClass}
                placeholder="State / Province"
                value={billing.state}
                onChange={(e) => setBillingField('state', e.target.value)}
              />
            </Field>

            {/* ZIP */}
            <Field label="ZIP/Postal Code:">
              <input
                type="text"
                className={inputClass}
                value={billing.zipCode}
                onChange={(e) => setBillingField('zipCode', e.target.value)}
              />
            </Field>
          </div>

          {/* Shipping section (inside the same card) */}
          <div className="mt-6">
            <h3 className="mb-4 text-center text-sm font-bold uppercase tracking-widest text-sky-700">
              Shipping Address
            </h3>

            {/* "Same as Billing" checkbox - shown first so users can skip the form */}
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
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
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

        {errorMessage && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>}

        {/* Coin selector */}
        <div className="mb-4 border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-700">Select Cryptocurrency</p>
          <div className="flex flex-wrap gap-2">
            {CRYPTO_COINS.map((coin) => (
              <button
                key={coin.value}
                type="button"
                onClick={() => setSelectedCoin(coin.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  selectedCoin === coin.value
                    ? 'border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-300'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <span className={coin.color}>{coin.symbol}</span>
                <span>{coin.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Withdrawal fee warning */}
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ If your exchange charges a withdrawal fee, add that fee <strong>on top of</strong> the shown amount when sending. Sending less than required will result in a partial payment and your order will not be confirmed automatically.
        </p>

        {/* Action button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isCryptoSubmitting || cartEmpty}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCryptoSubmitting ? (
              'Redirecting...'
            ) : (
              <>
                <span className="font-bold">
                  {CRYPTO_COINS.find((c) => c.value === selectedCoin)?.symbol}
                </span>
                Pay with {CRYPTO_COINS.find((c) => c.value === selectedCoin)?.label}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Order Summary */}
      <aside className="pharma-card h-fit p-5">
        <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
        <ul className="mt-4 space-y-2">
          {cart?.items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between text-sm">
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
            <div className="text-right">
              <span className="text-lg font-bold text-slate-900">{formatPrice(cart?.total ?? 0)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
