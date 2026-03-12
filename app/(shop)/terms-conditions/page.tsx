import { ContentPageShell, ContentSection } from '@/components/content-page-shell'

export default function TermsConditionsPage() {
  return (
    <ContentPageShell
      eyebrow="Terms"
      title="Terms & conditions"
      description="Review the terms that apply when using the website and placing orders."
      stats={[
        { label: 'Pricing', value: 'Dynamic' },
        { label: 'Usage', value: 'Lawful' },
        { label: 'Updates', value: 'Possible' },
      ]}
    >
      <div className="space-y-6">
        <ContentSection
          title="Use of the website"
          description="Access to the site comes with baseline conduct expectations."
        >
          <p className="text-sm leading-7 text-slate-600">
            Use the website only for lawful purposes and in a way that does not infringe on the rights of others or
            distribute harmful, unlawful, or fraudulent content.
          </p>
        </ContentSection>

        <ContentSection
          title="Products, orders, and pricing"
          description="Product information and pricing remain subject to change."
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Product availability, descriptions, and services may change without notice. Orders may be refused or
              cancelled when necessary.
            </p>
            <p>
              Prices are listed in USD and may change. Orders placed at clearly incorrect prices due to errors may also
              be refused.
            </p>
          </div>
        </ContentSection>

        <ContentSection title="Ownership, liability, and updates" description="Standard legal protections still apply.">
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              Site content, including text, graphics, and branding, remains protected by applicable intellectual
              property laws.
            </p>
            <p>
              Liability is limited to the amount paid for the relevant order, and the store may revise these terms over
              time. Continued use of the site constitutes acceptance of updated terms.
            </p>
          </div>
        </ContentSection>
      </div>
    </ContentPageShell>
  )
}
