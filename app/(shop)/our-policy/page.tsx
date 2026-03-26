import { siteInputs } from '@/lib/site-inputs'

export default function OurPolicyPage() {
  const siteHost = new URL(siteInputs.home.schema.organization.url).host
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Our Policy</h1>

      <div className="space-y-6 text-slate-600">
        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Ordering Policy</h2>
          <p>
            All orders placed on {siteHost} are subject to availability and confirmation. We reserve the right to refuse
            or cancel any order at our discretion. Customers are responsible for ensuring they provide accurate shipping
            information.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Payment Policy</h2>
          <p>
            We accept Bitcoin (BTC) as our payment method. Orders are processed once payment has been confirmed on the
            blockchain. We do not store any payment credentials on our servers.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Shipping Policy</h2>
          <p>
            We currently deliver within India only using tracked and discreet packaging. Delivery times vary by
            destination. We are not responsible for delays caused by courier or postal services.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Returns & Refunds</h2>
          <p>
            Due to the nature of pharmaceutical products, we do not accept returns except in cases of damaged or
            incorrectly shipped items. Refund requests must be submitted within 48 hours of receiving your order with
            supporting evidence (photos).
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Privacy Policy</h2>
          <p>
            We take your privacy seriously. All personal information collected during checkout is used solely for order
            fulfillment and is never shared with third parties. Please refer to our full privacy policy for more
            details.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Compliance</h2>
          <p>
            Customers are solely responsible for ensuring that the products they order are legal in their jurisdiction.
            We comply with all applicable international trade laws and regulations.
          </p>
        </div>
      </div>
    </div>
  )
}
