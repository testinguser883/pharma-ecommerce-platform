import { siteInputs } from '@/lib/site-inputs'

export default function TermsConditionsPage() {
  const siteHost = new URL(siteInputs.home.schema.organization.url).host
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Terms &amp; Conditions</h1>

      <div className="space-y-6 text-slate-600">
        <p>
          By accessing or using {siteHost}, you agree to be bound by these Terms &amp; Conditions. If you do not agree
          with any part of these terms, please do not use our website.
        </p>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">1. Use of the Website</h2>
          <p>
            You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of
            others. You must not use this site to distribute any unlawful, harmful, or fraudulent content.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">2. Products and Orders</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue any product or service without notice. All product
            descriptions are provided in good faith, but we do not warrant that descriptions are accurate, complete, or
            current.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">3. Pricing</h2>
          <p>
            All prices are listed in USD and are subject to change without notice. We reserve the right to refuse any
            order placed at an incorrect price due to typographical or system errors.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">4. Intellectual Property</h2>
          <p>
            All content on this website, including text, images, logos, and graphics, is the property of {siteHost} and
            is protected by applicable intellectual property laws. Unauthorized reproduction or use is strictly
            prohibited.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">5. Limitation of Liability</h2>
          <p>
            We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our
            website or products. Our total liability to you for any claim shall not exceed the amount paid for the
            relevant order.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">6. Changes to Terms</h2>
          <p>
            We reserve the right to update these Terms &amp; Conditions at any time. Continued use of the website after
            changes are posted constitutes acceptance of the revised terms.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">7. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with applicable law. Any disputes shall be
            resolved through binding arbitration.
          </p>
        </div>
      </div>
    </div>
  )
}
