import { ContentPageShell, ContentSection } from '@/components/content-page-shell'

const faqs = [
  {
    question: 'How do I place an order?',
    answer:
      'Browse the catalog, add items to your cart, and continue to checkout. You will need to create an account or sign in before completing the order.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We currently accept Bitcoin (BTC) as the payment method.',
  },
  {
    question: 'How can I check my order status?',
    answer:
      'Sign in to your account and open the Orders page. You can review payment status, fulfillment progress, and any tracking information there.',
  },
  {
    question: 'Do I need a prescription?',
    answer:
      'Some products may require a valid prescription. Review the product description for any product-specific requirements.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Delivery timing depends on destination and shipping conditions. Standard delivery often ranges from 7 to 14 business days.',
  },
  {
    question: 'What is your return policy?',
    answer:
      'Because these are pharmaceutical products, returns are typically limited to damaged or incorrect items. Contact support promptly if there is an issue.',
  },
]

export default function FAQPage() {
  return (
    <ContentPageShell
      eyebrow="FAQ"
      title="Operational answers without the clutter."
      description="Find quick answers to common questions about ordering, payment, delivery, and support."
      stats={[
        { label: 'Checkout', value: 'Crypto' },
        { label: 'Tracking', value: 'Account' },
        { label: 'Support', value: 'Direct' },
      ]}
    >
      <ContentSection
        title="Frequently asked questions"
        description="The core questions customers typically ask before or after ordering."
      >
        <div className="grid gap-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <h3 className="text-lg font-semibold text-slate-950">{faq.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </ContentSection>
    </ContentPageShell>
  )
}
