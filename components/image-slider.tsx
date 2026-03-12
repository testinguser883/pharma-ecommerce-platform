'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { ChevronLeft, ChevronRight, ShieldCheck, Truck } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { brand } from '@/lib/brand'

const featureBadges = [
  { icon: ShieldCheck, label: 'Quality checked' },
  { icon: Truck, label: 'Discreet dispatch' },
]

export function ImageSlider() {
  const images = useQuery(api.admin.listActiveSliderImages)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((value) => (value + 1) % images.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [images])

  if (!images || images.length === 0) {
    return (
      <section className="rx-card-dark relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute inset-y-0 right-[-10%] hidden w-[40%] bg-[radial-gradient(circle,rgba(245,158,11,0.18),transparent_55%)] blur-3xl md:block" />
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <p className="rx-kicker text-teal-200">Trusted online pharmacy</p>
            <h2 className="rx-display mt-4 max-w-2xl text-4xl leading-none text-white sm:text-5xl">
              Order from the comfort of your own home.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Browse quality medicines, manage your cart, and place orders with secure checkout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="rx-btn-primary">
                Browse the catalog
              </Link>
              <Link href="/about-us" className="rx-btn-ghost">
                Read the story
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {featureBadges.map(({ icon: Icon, label }) => (
                <span key={label} className="rx-badge border-white/10 bg-white/5 text-slate-200">
                  <Icon className="mr-2 h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="mx-auto max-w-[240px]">
            <img src="/doctor-hero.svg" alt="Doctor illustration" className="rx-floating w-full drop-shadow-2xl" />
          </div>
        </div>
      </section>
    )
  }

  const currentImage = images[current]
  const prev = () => setCurrent((value) => (value - 1 + images.length) % images.length)
  const next = () => setCurrent((value) => (value + 1) % images.length)

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-slate-950 shadow-[0_28px_80px_-45px_rgba(15,23,42,1)]">
      <div className="relative min-h-[420px]">
        {images.map((image, index) => (
          <img
            key={image._id}
            src={image.url}
            alt={image.altText ?? `Slide ${index + 1}`}
            title={image.titleText ?? image.altText ?? `Slide ${index + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === current ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.9),rgba(2,6,23,0.45),rgba(2,6,23,0.75))]" />

        <div className="relative flex min-h-[420px] flex-col justify-between p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {featureBadges.map(({ icon: Icon, label }) => (
                <span key={label} className="rx-badge border-white/10 bg-white/10 text-white">
                  <Icon className="mr-2 h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
            {images.length > 1 ? (
              <div className="hidden items-center gap-2 sm:flex">
                <button
                  type="button"
                  onClick={prev}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white transition hover:bg-black/35"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white transition hover:bg-black/35"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="max-w-xl">
            <p className="rx-kicker text-teal-200">{brand.name}</p>
            <h2 className="rx-display mt-4 text-4xl leading-none text-white sm:text-5xl">
              {currentImage.titleText?.trim() || 'Quality medicines delivered with care.'}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              {currentImage.altText?.trim() || 'Browse products, manage your cart, and place your order with ease.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="rx-btn-primary">
                Shop now
              </Link>
              <Link href="/contact-us" className="rx-btn-ghost">
                Contact support
              </Link>
            </div>
          </div>
        </div>

        {images.length > 1 ? (
          <div className="absolute bottom-6 left-6 flex gap-2 sm:left-8">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrent(index)}
                className={`h-2 rounded-full transition-all ${
                  index === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
