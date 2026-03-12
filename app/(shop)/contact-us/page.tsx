import { ContentPageShell, ContentSection, InfoTile } from '@/components/content-page-shell'
import { brand } from '@/lib/brand'

export default function ContactUsPage() {
  return (
    <ContentPageShell
      eyebrow="Support"
      title="Reach the support desk without hunting for the details."
      description="This page keeps the same communication guidance but presents it more clearly, with faster scanning and stronger emphasis on confirmation behavior."
      stats={[
        { label: 'Response window', value: '24h' },
        { label: 'Primary path', value: 'Support page' },
        { label: 'Hours', value: 'Weekdays' },
      ]}
      aside={
        <InfoTile
          title="Primary contact"
          body={`${brand.supportEmail} is the best route for order questions, product concerns, and general assistance.`}
        />
      }
    >
      <div className="space-y-6">
        <ContentSection
          title="Customer support"
          description="The team assists with product questions, account help, and order issues."
        >
          <p className="text-sm leading-7 text-slate-600">
            Please allow up to 24 hours for a response during business days. Include your order number when relevant so
            the support team can respond faster.
          </p>
        </ContentSection>

        <ContentSection
          title="Important confirmation notice"
          description="This is still the key operational note and remains intentionally prominent."
        >
          <p className="text-sm leading-7 text-slate-600">
            After you contact the team, you should receive an automatic message confirming that your inquiry was
            received. If you do not receive that confirmation, it likely means your message did not reach the support
            desk and you should try again.
          </p>
        </ContentSection>

        <ContentSection title="Business hours" description="Availability remains the same.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <p className="rx-kicker text-teal-700">Weekdays</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Monday to Friday</p>
              <p className="mt-2 text-sm text-slate-600">9:00 AM to 6:00 PM (GMT)</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <p className="rx-kicker text-teal-700">Weekend</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Saturday and Sunday</p>
              <p className="mt-2 text-sm text-slate-600">Closed</p>
            </div>
          </div>
        </ContentSection>
      </div>
    </ContentPageShell>
  )
}
