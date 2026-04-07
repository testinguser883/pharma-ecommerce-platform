import Link from 'next/link'

export function HeroSection() {
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
            href="/"
            className="mt-7 inline-flex rounded-full bg-white px-8 py-2.5 text-sm font-semibold text-sky-700 shadow hover:bg-sky-50"
          >
            Read more
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
