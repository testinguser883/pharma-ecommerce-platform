export default function FAQPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">Frequently Asked Questions</h1>

      <div className="space-y-6 text-slate-600">
        <div>
          <h2 className="mb-2 font-semibold text-slate-700">How do I place an order?</h2>
          <p>
            Browse our product catalog, add items to your cart, and proceed to checkout. You will need to create an
            account or log in to complete your purchase.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">What payment methods do you accept?</h2>
          <p>
            We currently accept Bitcoin (BTC) as our payment method. This ensures fast and secure transactions for all
            our customers in India.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">How can I check my order status?</h2>
          <p>
            Log in to your account and visit the Order Status page to track the progress of your orders. You will also
            receive email notifications when your order is processed and shipped.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">Do I need a prescription?</h2>
          <p>
            Some of our products require a valid prescription. Please check the product description for details. We
            strictly comply with all applicable laws and regulations regarding the sale of pharmaceutical products.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">How long does delivery take?</h2>
          <p>
            Delivery times vary depending on your location and the shipping option selected at checkout. Standard
            delivery typically takes 7–14 business days. Express options may be available.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">What is your return policy?</h2>
          <p>
            Due to the nature of pharmaceutical products, returns are only accepted for items that are damaged or
            incorrect. Please contact our support team within 48 hours of receiving your order.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-700">How do I contact customer support?</h2>
          <p>
            You can reach our support team via the Contact Us page. We aim to respond to all inquiries as quickly as
            possible. Please note that an automatic confirmation email will be sent upon receiving your message.
          </p>
        </div>
      </div>
    </div>
  )
}
