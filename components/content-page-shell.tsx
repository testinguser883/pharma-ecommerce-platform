import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type PageStat = {
  label: string
  value: string
}

export function ContentPageShell({
  eyebrow,
  title,
  description,
  stats = [],
  aside,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  stats?: PageStat[]
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rx-card-dark relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -left-16 top-0 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative">
            <div className="rx-kicker text-teal-200">{eyebrow}</div>
            <h1 className="rx-display mt-4 max-w-3xl text-4xl leading-none text-white sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
            {stats.length > 0 ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
                  >
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {aside ? <aside className="space-y-4">{aside}</aside> : null}
      </section>

      <div className="mt-6">
        <div className="rx-card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}

export function ContentSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-[28px] border border-slate-200/80 bg-white/85 p-6 shadow-sm', className)}>
      <h2 className="rx-display text-3xl text-slate-950">{title}</h2>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function InfoTile({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="rx-card p-6">
      <div className="rx-kicker text-teal-700">Store guide</div>
      <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
      {href && cta ? (
        <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
          {cta}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  )
}
