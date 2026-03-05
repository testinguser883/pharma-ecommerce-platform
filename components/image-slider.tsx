'use client'

import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
      <section className="pharma-gradient relative overflow-hidden rounded-3xl px-6 py-10 text-white shadow-md md:px-10">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_280px]">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">More Convenience</h1>
            <p className="mt-2 text-2xl font-semibold text-sky-100">Order from the comfort of your own home</p>
            <p className="mt-5 max-w-2xl text-base text-cyan-50/95">
              Our goal and mission are on the surface: we try our best to provide quality products and service.
            </p>
            <Link
              href="/products"
              className="mt-7 inline-flex rounded-full bg-white px-8 py-2.5 text-sm font-semibold text-sky-700 shadow hover:bg-sky-50"
            >
              Browse Products
            </Link>
          </div>
          <div className="mx-auto max-w-[260px]">
            <img src="/doctor-hero.svg" alt="Professional doctor" className="w-full" />
          </div>
        </div>
        <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
      </section>
    )
  }

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length)
  const next = () => setCurrent((c) => (c + 1) % images.length)

  return (
    <section className="relative overflow-hidden rounded-3xl shadow-md">
      <div className="relative aspect-[16/6] w-full bg-slate-100">
        {images.map((img, i) => (
          <img
            key={img._id}
            src={img.url}
            alt={img.altText ?? `Slide ${i + 1}`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
