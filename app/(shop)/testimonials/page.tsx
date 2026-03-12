import { ContentPageShell, ContentSection } from '@/components/content-page-shell'

const testimonials = [
  {
    quote:
      'I have been ordering from this pharmacy for over a year. The process is simple, shipping is fast, and the products are always as described.',
    author: 'John D.',
  },
  {
    quote:
      'Customer service is excellent. I had a question about my order and received a response within hours. Very professional and trustworthy service.',
    author: 'Sarah M.',
  },
  {
    quote:
      'Discreet packaging and reliable delivery. This is the only online pharmacy I trust. Will continue to be a customer.',
    author: 'Robert K.',
  },
  {
    quote:
      'Bitcoin payments make everything so easy and private. The checkout process is smooth and I always receive confirmation promptly.',
    author: 'Alex T.',
  },
]

export default function TestimonialsPage() {
  return (
    <ContentPageShell
      eyebrow="Testimonials"
      title="What our customers say"
      description="Feedback from customers about ordering, support, shipping, and payment."
      stats={[
        { label: 'Themes', value: 'Trust' },
        { label: 'Shipping', value: 'Reliable' },
        { label: 'Checkout', value: 'Smooth' },
      ]}
    >
      <ContentSection
        title="What customers keep calling out"
        description="The common themes remain trust, delivery, responsiveness, and simplicity."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <div key={testimonial.author} className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-6">
              <p className="text-sm italic leading-7 text-slate-600">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-5 text-sm font-semibold text-slate-950">— {testimonial.author}</p>
            </div>
          ))}
        </div>
      </ContentSection>
    </ContentPageShell>
  )
}
