import { siteInputs } from '@/lib/site-inputs'

export default function AboutUsPage() {
  const siteHost = new URL(siteInputs.home.schema.organization.url).host
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">About Us</h1>

      <div className="space-y-5 text-slate-600">
        <p>
          Welcome to {siteHost} — your trusted source for pharmaceutical products delivered with discretion, speed, and
          care.
        </p>

        <p>
          We are committed to providing our customers with access to high-quality medications at competitive prices. Our
          team of pharmacy professionals ensures that every product listed on our platform meets the highest standards
          of safety and efficacy.
        </p>

        <p>
          Since our founding, we have served thousands of satisfied customers across India. We understand that access to
          healthcare is a fundamental need, and we work hard every day to make that access simpler and more affordable.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-700">Our Mission</h2>
        <p>
          Our mission is to provide safe, reliable, and affordable pharmaceutical products to customers across India
          through a secure and easy-to-use online platform.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-slate-700">Why Choose Us?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Wide selection of pharmaceutical products</li>
          <li>Secure Bitcoin payment processing</li>
          <li>Discreet and reliable shipping across India</li>
          <li>Dedicated customer support team</li>
          <li>Strict quality control and product verification</li>
        </ul>
      </div>
    </div>
  )
}
