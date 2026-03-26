import { siteInputs } from '@/lib/site-inputs'

export default function TestimonialsPage() {
  const siteHost = new URL(siteInputs.home.schema.organization.url).host
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Testimonials</h1>

      <p className="mb-8 text-slate-600">Here is what our customers say about their experience with {siteHost}.</p>

      <div className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-slate-600 italic">
            &ldquo;I have been ordering from this pharmacy for over a year. The process is simple, shipping is fast, and
            the products are always as described. Highly recommended.&rdquo;
          </p>
          <p className="text-sm font-semibold text-slate-700">— John D.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-slate-600 italic">
            &ldquo;Customer service is excellent. I had a question about my order and received a response within hours.
            Very professional and trustworthy service.&rdquo;
          </p>
          <p className="text-sm font-semibold text-slate-700">— Sarah M.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-slate-600 italic">
            &ldquo;Discreet packaging and reliable delivery. This is the only online pharmacy I trust. Will continue to
            be a customer.&rdquo;
          </p>
          <p className="text-sm font-semibold text-slate-700">— Robert K.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-slate-600 italic">
            &ldquo;Bitcoin payments make everything so easy and private. The checkout process is smooth and I always
            receive confirmation promptly.&rdquo;
          </p>
          <p className="text-sm font-semibold text-slate-700">— Alex T.</p>
        </div>
      </div>
    </div>
  )
}
