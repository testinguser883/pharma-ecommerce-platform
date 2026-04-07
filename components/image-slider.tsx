'use client'

import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ChevronLeft, ChevronRight, Zap, Shield, Truck } from 'lucide-react'
import Link from 'next/link'

const FEATURE_BADGES = [
  { icon: Shield, text: 'Quality Assured' },
  { icon: Truck, text: 'Fast Delivery' },
  { icon: Zap, text: 'Easy Ordering' },
]

export function ImageSlider() {
  const images = useQuery(api.admin.listActiveSliderImages)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [images])

  // Fallback hero when no slider images configured
  if (!images || images.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative grid items-center gap-6 px-8 py-10 md:grid-cols-[1fr_260px] md:px-12 md:py-14">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
              <Zap className="h-3 w-3" />
              Bitcoin Only Pharmacy
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              More Convenience.{' '}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Better Health.
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-base text-slate-400 md:text-lg">
              Order quality medicines from the comfort of your home. Fast delivery, genuine products.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-900/30 hover:from-teal-400 hover:to-cyan-400 transition-all"
              >
                Browse Products
              </Link>
              <Link
                href="/about-us"
                className="inline-flex items-center gap-2 rounded-full border border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
              >
                Learn More
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {FEATURE_BADGES.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-400"
                >
                  <Icon className="h-3 w-3 text-teal-500" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[220px] md:max-w-[240px]">
            <img src="/doctor-hero.svg" alt="Professional doctor" className="w-full drop-shadow-2xl" />
          </div>
        </div>
      </section>
    )
  }

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length)
  const next = () => setCurrent((c) => (c + 1) % images.length)

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-xl">
      <div className="relative aspect-[16/6] w-full bg-slate-900">
        {images.map((img, i) => (
          <img
            key={img._id}
            src={img.url}
            alt={img.altText ?? `Slide ${i + 1}`}
            title={img.titleText ?? img.altText ?? `Slide ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all border border-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-all border border-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-teal-400' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
