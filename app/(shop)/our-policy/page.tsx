import { ContentPageShell, ContentSection } from '@/components/content-page-shell'

export default function OurPolicyPage() {
  return (
    <ContentPageShell
      eyebrow="Policy"
      title="Policies presented with the same clarity as the product flow."
      description="Review the key policies for ordering, payment, shipping, privacy, and compliance."
      stats={[
        { label: 'Payments', value: 'BTC' },
        { label: 'Shipping', value: 'Worldwide' },
        { label: 'Returns', value: 'Limited' },
      ]}
    >
      <div className="space-y-6">
        <ContentSection
          title="Ordering policy"
          description="Availability and order confirmation still govern the purchasing flow."
        >
          <p className="text-sm leading-7 text-slate-600">
            Orders are subject to availability and confirmation. The team may refuse or cancel orders at its discretion,
            and customers are responsible for providing accurate shipping information.
          </p>
        </ContentSection>

        <ContentSection title="Payment policy" description="Bitcoin is the current payment method.">
          <p className="text-sm leading-7 text-slate-600">
            Bitcoin (BTC) is the accepted payment method. Orders are processed after payment is confirmed, and payment
            credentials are not stored on the platform.
          </p>
        </ContentSection>

        <ContentSection title="Shipping and returns" description="Shipping and refund expectations remain explicit.">
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Orders ship worldwide in discreet packaging, but delivery times vary and may be affected by customs or
              postal delays.
            </p>
            <p>
              Returns are limited to damaged or incorrectly shipped items. Refund requests should be submitted within 48
              hours with supporting evidence.
            </p>
          </div>
        </ContentSection>

        <ContentSection
          title="Privacy and compliance"
          description="Customer responsibility and privacy handling remain the same."
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Personal information collected during checkout is used for order fulfillment and should not be shared with
              unauthorized third parties.
            </p>
            <p>
              Customers are responsible for ensuring the legality of products in their jurisdiction, while the store
              continues to operate within applicable trade and shipping constraints.
            </p>
          </div>
        </ContentSection>
      </div>
    </ContentPageShell>
  )
}
