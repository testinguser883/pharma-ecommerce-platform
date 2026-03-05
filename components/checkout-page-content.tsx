'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { formatPrice } from '@/lib/utils'

// Countries list (abbreviated for practicality)
const COUNTRIES = [{ code: 'IN', name: 'India (भारत)' }]

const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]

const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
]

const CA_PROVINCES = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
]

function getStatesForCountry(countryCode: string): string[] {
  if (countryCode === 'IN') return INDIA_STATES
  if (countryCode === 'US') return US_STATES
  if (countryCode === 'CA') return CA_PROVINCES
  return []
}

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
  mobilePhone: '+91',
  email: '',
  dobYear: '',
  dobMonth: '',
  dobDay: '',
  firstName: '',
  lastName: '',
  streetAddress: '',
  city: '',
  country: 'IN',
  state: '',
  zipCode: '',
}

const EMPTY_SHIPPING: ShippingForm = {
  firstName: '',
  lastName: '',
  streetAddress: '',
  city: '',
  country: 'IN',
  state: '',
  zipCode: '',
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [usdRate, setUsdRate] = useState<number | null>(null)

  useEffect(() => {
    fetch('https://api.frankfurter.app/latest?from=INR&to=USD')
      .then((r) => r.json())
      .then((d: { rates: { USD: number } }) => setUsdRate(d.rates.USD))
      .catch(() => setUsdRate(1 / 83))
  }, [])

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
      const { orderId, total } = await createPendingCryptoOrder({
        billingAddress: buildBillingAddress(),
        shippingAddress: buildShippingAddress(),
      })
      const { invoiceUrl } = await createNowPaymentsInvoice({ orderId, total })
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
  const billingStates = getStatesForCountry(billing.country)
  const shippingStates = getStatesForCountry(shipping.country)

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
              <div className="relative">
                {billingStates.length > 0 ? (
                  <select
                    className={selectClass}
                    value={billing.state}
                    onChange={(e) => setBillingField('state', e.target.value)}
                  >
                    <option value="">Please select state.</option>
                    {billingStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="State / Province"
                    value={billing.state}
                    onChange={(e) => setBillingField('state', e.target.value)}
                  />
                )}
                {billingStates.length > 0 && (
                  <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
                )}
              </div>
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
                  <div className="relative">
                    {shippingStates.length > 0 ? (
                      <select
                        className={selectClass}
                        value={shipping.state}
                        onChange={(e) => setShippingField('state', e.target.value)}
                      >
                        <option value="">Please select state.</option>
                        {shippingStates.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="State / Province"
                        value={shipping.state}
                        onChange={(e) => setShippingField('state', e.target.value)}
                      />
                    )}
                    {shippingStates.length > 0 && (
                      <span className="pointer-events-none absolute right-3 top-2.5 text-slate-400">▾</span>
                    )}
                  </div>
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
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
                </svg>
                Pay with Crypto (Required)
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
              {usdRate !== null && (
                <p className="text-xs text-slate-500 mt-0.5">
                  ≈ ${((cart?.total ?? 0) * usdRate).toFixed(2)} USD
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
