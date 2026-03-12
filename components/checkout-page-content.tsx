'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { Bitcoin, ShieldCheck, Truck } from 'lucide-react'
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
const YEARS = Array.from({ length: 100 }, (_, index) => currentYear - 18 - index)
const DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

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

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rx-card p-6 sm:p-8">
      <p className="rx-kicker text-teal-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="rx-label">{label}</label>
      <div className="mt-2">{children}</div>
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
        ? `${billing.dobYear}-${billing.dobMonth}-${String(billing.dobDay).padStart(2, '0')}`
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
      country: COUNTRIES.find((country) => country.code === billing.country)?.name ?? billing.country,
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
      country: COUNTRIES.find((country) => country.code === shipping.country)?.name ?? shipping.country,
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
    if (!billing.state.trim()) return 'State / Province is required.'
    if (!billing.zipCode.trim()) return 'ZIP / Postal code is required.'
    if (!shippingSameAsBilling) {
      if (!shipping.firstName.trim() || !shipping.lastName.trim()) return 'Shipping: First and last name are required.'
      if (!shipping.streetAddress.trim()) return 'Shipping: Street address is required.'
      if (!shipping.city.trim()) return 'Shipping: City is required.'
      if (!shipping.state.trim()) return 'Shipping: State / Province is required.'
      if (!shipping.zipCode.trim()) return 'Shipping: ZIP / Postal code is required.'
    }
    return null
  }

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
      <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="rx-card px-6 py-6 text-sm text-slate-500">Loading checkout...</div>
      </div>
    )
  }

  const cartEmpty = !cart || cart.items.length === 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="rx-card-dark overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="rx-kicker text-teal-200">Checkout</p>
            <h1 className="rx-display mt-4 text-5xl leading-none text-white sm:text-6xl">Complete your order</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Enter your billing and shipping details, then continue to payment.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-white">
                <Bitcoin className="h-5 w-5 text-amber-300" />
                <span className="font-semibold">Crypto payment required</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                You will be redirected to the payment invoice after placing the order.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 text-white">
                <ShieldCheck className="h-5 w-5 text-teal-200" />
                <span className="font-semibold">Shipping details</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Make sure your address information is accurate before continuing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleCheckoutSubmit} className="space-y-6">
          <SectionCard
            eyebrow="Billing details"
            title="Billing information"
            description="Enter the details for the person placing the order."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New customer">
                <select
                  className="rx-input appearance-none"
                  value={billing.isNewCustomer ? 'yes' : 'no'}
                  onChange={(event) => setBillingField('isNewCustomer', event.target.value === 'yes')}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              <Field label="Mobile phone">
                <input
                  type="tel"
                  className="rx-input"
                  placeholder="+91"
                  value={billing.mobilePhone}
                  onChange={(event) => setBillingField('mobilePhone', event.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className="rx-input"
                  placeholder="you@example.com"
                  value={billing.email}
                  onChange={(event) => setBillingField('email', event.target.value)}
                />
              </Field>
              <Field label="Country">
                <select
                  className="rx-input appearance-none"
                  value={billing.country}
                  onChange={(event) => setBillingField('country', event.target.value)}
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date of birth">
                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    className="rx-input appearance-none"
                    value={billing.dobYear}
                    onChange={(event) => setBillingField('dobYear', event.target.value)}
                  >
                    <option value="">Year</option>
                    {YEARS.map((year) => (
                      <option key={year} value={String(year)}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rx-input appearance-none"
                    value={billing.dobMonth}
                    onChange={(event) => setBillingField('dobMonth', event.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((month, index) => (
                      <option key={month} value={String(index + 1).padStart(2, '0')}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rx-input appearance-none"
                    value={billing.dobDay}
                    onChange={(event) => setBillingField('dobDay', event.target.value)}
                  >
                    <option value="">Day</option>
                    {DAYS.map((day) => (
                      <option key={day} value={String(day)}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.firstName}
                  onChange={(event) => setBillingField('firstName', event.target.value)}
                />
              </Field>
              <Field label="Last name">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.lastName}
                  onChange={(event) => setBillingField('lastName', event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Street address">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.streetAddress}
                  onChange={(event) => setBillingField('streetAddress', event.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.city}
                  onChange={(event) => setBillingField('city', event.target.value)}
                />
              </Field>
              <Field label="State / province">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.state}
                  onChange={(event) => setBillingField('state', event.target.value)}
                />
              </Field>
              <Field label="ZIP / postal code">
                <input
                  type="text"
                  className="rx-input"
                  value={billing.zipCode}
                  onChange={(event) => setBillingField('zipCode', event.target.value)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Shipping details"
            title="Shipping information"
            description="Enter the delivery address or copy the billing details."
          >
            <label className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={shippingSameAsBilling}
                onChange={(event) => setShippingSameAsBilling(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Shipping address is the same as billing
            </label>

            {!shippingSameAsBilling ? (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <input
                      type="text"
                      className="rx-input"
                      value={shipping.firstName}
                      onChange={(event) => setShippingField('firstName', event.target.value)}
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      type="text"
                      className="rx-input"
                      value={shipping.lastName}
                      onChange={(event) => setShippingField('lastName', event.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Street address">
                  <input
                    type="text"
                    className="rx-input"
                    value={shipping.streetAddress}
                    onChange={(event) => setShippingField('streetAddress', event.target.value)}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="City">
                    <input
                      type="text"
                      className="rx-input"
                      value={shipping.city}
                      onChange={(event) => setShippingField('city', event.target.value)}
                    />
                  </Field>
                  <Field label="Country">
                    <select
                      className="rx-input appearance-none"
                      value={shipping.country}
                      onChange={(event) => setShippingField('country', event.target.value)}
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="State / province">
                    <input
                      type="text"
                      className="rx-input"
                      value={shipping.state}
                      onChange={(event) => setShippingField('state', event.target.value)}
                    />
                  </Field>
                </div>

                <Field label="ZIP / postal code">
                  <input
                    type="text"
                    className="rx-input"
                    value={shipping.zipCode}
                    onChange={(event) => setShippingField('zipCode', event.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            eyebrow="Payment"
            title="Continue to payment"
            description="Review your information, then proceed to the payment invoice."
          >
            {errorMessage ? (
              <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={isCryptoSubmitting || cartEmpty} className="rx-btn-primary">
                <Bitcoin className="h-4 w-4" />
                {isCryptoSubmitting ? 'Redirecting...' : 'Pay with crypto'}
              </button>
              <span className="text-sm text-slate-500">Crypto is currently the required payment method.</span>
            </div>
          </SectionCard>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <div className="rx-card overflow-hidden">
            <div className="rx-gradient-hero px-6 py-5 text-white">
              <p className="rx-kicker text-teal-200">Order summary</p>
              <h2 className="mt-2 text-2xl font-semibold">Current basket</h2>
            </div>
            <div className="p-6">
              {cart?.items.length ? (
                <ul className="space-y-3">
                  {cart.items.map((item, index) => (
                    <li
                      key={`${item.productId}-${item.dosage ?? ''}-${item.pillCount ?? ''}-${index}`}
                      className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {item.quantity} × {item.unit}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-slate-950">{formatPrice(item.lineTotal)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-7 text-slate-600">Your cart is empty.</p>
              )}

              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-2xl font-semibold text-slate-950">{formatPrice(cart?.total ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rx-card p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-teal-50 text-teal-700">
                <Truck className="h-5 w-5" />
              </span>
              <div>
                <p className="rx-kicker text-teal-700">Dispatch note</p>
                <p className="text-sm font-semibold text-slate-950">Check your shipping address carefully.</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Correct address information helps avoid delays with processing and delivery.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
