import { ContentPageShell, ContentSection, InfoTile } from '@/components/content-page-shell'
import { brand } from '@/lib/brand'

export default function AboutUsPage() {
  return (
    <ContentPageShell
      eyebrow="About the store"
      title={`About ${brand.name}`}
      description="Learn more about our mission, our standards, and what customers can expect when ordering from us."
      stats={[
        { label: 'Support', value: 'Direct' },
        { label: 'Payment', value: 'BTC' },
        { label: 'Shipping', value: 'Worldwide' },
      ]}
      aside={
        <InfoTile
          title="Need support?"
          body="Use the contact page if you have questions about products, orders, or delivery."
        />
      }
    >
      <div className="space-y-6">
        <ContentSection
          title="Who we are"
          description="Our goal is to provide quality pharmaceutical products with reliable service."
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              {brand.name} is a trusted source for pharmaceutical products delivered with discretion, speed, and care.
            </p>
            <p>We focus on dependable ordering, clear product information, and responsive support for our customers.</p>
          </div>
        </ContentSection>

        <ContentSection
          title="Our mission"
          description="We aim to make access to healthcare products simpler and more dependable."
        >
          <p className="text-sm leading-7 text-slate-600">
            Our mission is to provide safe, reliable, and affordable pharmaceutical products through a secure and
            easy-to-use online platform.
          </p>
        </ContentSection>

        <ContentSection title="Why choose us?" description="What customers can expect when ordering from us.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Wide product selection</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Browse a broad catalog of pharmaceutical products.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Secure payment</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Orders are processed through secure Bitcoin payment.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <h3 className="text-lg font-semibold text-slate-950">Reliable delivery</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                We focus on discreet shipping and dependable support.
              </p>
            </div>
          </div>
        </ContentSection>
      </div>
    </ContentPageShell>
  )
}
