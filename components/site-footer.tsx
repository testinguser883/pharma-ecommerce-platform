import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="bg-[#dce8f0] text-slate-700 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {/* Column 1 */}
          <div className="flex flex-col gap-2">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/orders" className="hover:underline">
              Order Status
            </Link>
            <Link href="/faq" className="hover:underline">
              FAQ
            </Link>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2">
            <Link href="/contact-us" className="hover:underline">
              Contact Us
            </Link>
            <Link href="/testimonials" className="hover:underline">
              Testimonials
            </Link>
            <Link href="/about-us" className="hover:underline">
              About Us
            </Link>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-2">
            <Link href="/our-policy" className="hover:underline">
              Our Policy
            </Link>
            <Link href="/terms-conditions" className="hover:underline">
              Terms &amp; Conditions
            </Link>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-slate-800">Payment Methods</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center rounded bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                ₿ BTC
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-300 pt-4 text-xs text-slate-500">
          <p className="text-center">
            Please note, that in reply to your message you are supposed to get an automatic message notifying you that
            your message was received. Our support team will reply to your inquiry ASAP. If you did not receive an
            automatic reply, it means that your message did not reach us. We kindly ask you to contact us by phone.
          </p>
        </div>
      </div>

      <div className="bg-slate-400 py-3 text-center text-xs text-white">
        ©Copyright pharma-ecommerce-platform-5an9.vercel.app. All rights reserved
      </div>
    </footer>
  )
}
