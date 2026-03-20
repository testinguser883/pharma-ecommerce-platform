import { siteInputs } from '@/lib/site-inputs'

export default function ContactUsPage() {
  const { email, telephone } = siteInputs.home.schema.organization
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Contact Us</h1>

      <p className="mb-8 text-slate-600">
        We are here to help. If you have any questions, concerns, or need assistance with your order, please do not
        hesitate to get in touch with our support team.
      </p>

      <div className="space-y-6 text-slate-600">
        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Customer Support</h2>
          <p>
            Our customer support team is available to assist you with order inquiries, product questions, and general
            assistance. Please allow up to 24 hours for a response during business days.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              Email:{' '}
              <a className="font-medium text-teal-700 underline underline-offset-2" href={`mailto:${email}`}>
                {email}
              </a>
            </li>
            <li>
              Phone:{' '}
              <a className="font-medium text-teal-700 underline underline-offset-2" href={`tel:${telephone}`}>
                {telephone}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Important Notice</h2>
          <p>
            Please note, that in reply to your message you are supposed to get an automatic message notifying you that
            your message was received. Our support team will reply to your inquiry ASAP. If you did not receive an
            automatic reply, it means that your message did not reach us. We kindly ask you to contact us by phone.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Business Hours</h2>
          <p>Monday – Friday: 9:00 AM – 6:00 PM (GMT)</p>
          <p>Saturday – Sunday: Closed</p>
        </div>
      </div>
    </div>
  )
}
