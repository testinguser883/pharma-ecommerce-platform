import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { SITE_NAME } from '../lib/site-inputs'

function formatPrice(amount: number) {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}

function itemsTableHtml(
  items: Array<{
    name: string
    genericName: string
    dosage?: string
    pillCount?: number
    quantity: number
    unitPrice: number
    unit: string
    lineTotal: number
  }>,
) {
  const rows = items
    .map((item) => {
      const variant = item.dosage
        ? `${item.dosage}${item.pillCount ? ` · ${item.pillCount} ${item.unit.split(' ')[0]}s` : ''}`
        : ''
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
          <strong style="color:#0f172a;">${item.name}</strong>
          <span style="color:#64748b;font-size:13px;"> (${item.genericName})</span>
          ${variant ? `<br/><span style="color:#0d9488;font-size:12px;">${variant}</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#334155;">
          ${item.quantity}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;color:#334155;">
          ${formatPrice(item.unitPrice)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#0f172a;">
          ${formatPrice(item.lineTotal)}
        </td>
      </tr>`
    })
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:16px 0;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function userEmailHtml(opts: {
  firstName: string
  orderId: string
  total: number
  items: Parameters<typeof itemsTableHtml>[0]
  paymentMethod: string
  appUrl: string
}) {
  const isConfirmed = opts.paymentMethod === 'crypto'
  const statusLabel = isConfirmed ? 'Payment Confirmed' : 'Order Placed'
  const statusColor = isConfirmed ? '#0d9488' : '#2563eb'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#10b981,#0d9488);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${SITE_NAME}</h1>
            <p style="margin:6px 0 0;color:#d1fae5;font-size:14px;">Your trusted online pharmacy</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <div style="display:inline-block;background:${statusColor}1a;color:${statusColor};border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-bottom:16px;">
              ✓ ${statusLabel}
            </div>
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Hi ${opts.firstName},</h2>
            <p style="margin:0 0 24px;color:#475569;line-height:1.6;">
              ${
                isConfirmed
                  ? 'Great news! Your crypto payment has been confirmed and your order is now being processed.'
                  : "Thank you for your order! We've received it and will begin processing it shortly."
              }
            </p>

            <!-- Order ID -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="color:#64748b;font-size:13px;">Order ID</td>
                <td style="text-align:right;font-family:monospace;font-size:13px;color:#0f172a;font-weight:600;">${opts.orderId}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Payment Method</td>
                <td style="text-align:right;font-size:13px;color:#0f172a;padding-top:8px;text-transform:capitalize;">${opts.paymentMethod}</td>
              </tr>
            </table>

            <!-- Items -->
            <h3 style="margin:0 0 8px;color:#0f172a;font-size:15px;">Order Summary</h3>
            ${itemsTableHtml(opts.items)}

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
              <tr>
                <td style="text-align:right;color:#64748b;font-size:14px;padding:8px 0;">Subtotal</td>
                <td style="text-align:right;font-size:14px;color:#0f172a;padding:8px 0 8px 16px;">${formatPrice(opts.total)}</td>
              </tr>
              <tr>
                <td style="text-align:right;font-weight:700;font-size:16px;color:#0f172a;padding-top:8px;border-top:2px solid #e2e8f0;">Total Paid</td>
                <td style="text-align:right;font-weight:700;font-size:16px;color:#0d9488;padding-top:8px;border-top:2px solid #e2e8f0;padding-left:16px;">${formatPrice(opts.total)}</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin-top:32px;">
              <a href="${opts.appUrl}/orders"
                style="display:inline-block;background:linear-gradient(135deg,#10b981,#0d9488);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:25px;font-weight:600;font-size:15px;">
                View My Orders
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.<br/>
              If you have questions, reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function adminEmailHtml(opts: {
  orderId: string
  total: number
  customerName: string
  customerEmail: string
  paymentMethod: string
  items: Parameters<typeof itemsTableHtml>[0]
  appUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:20px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:18px;">${SITE_NAME} Admin</h1>
            <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">New Order Notification</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <div style="background:#d1fae5;color:#065f46;border-radius:8px;padding:12px 16px;font-weight:600;margin-bottom:24px;">
              💰 New ${opts.paymentMethod === 'crypto' ? 'Crypto Payment Confirmed' : 'Order Placed'} — ${formatPrice(opts.total)}
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="color:#64748b;font-size:13px;">Order ID</td>
                <td style="text-align:right;font-family:monospace;font-size:13px;color:#0f172a;font-weight:600;">${opts.orderId}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Customer</td>
                <td style="text-align:right;font-size:13px;color:#0f172a;padding-top:8px;">${opts.customerName}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Email</td>
                <td style="text-align:right;font-size:13px;color:#2563eb;padding-top:8px;">${opts.customerEmail}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Payment</td>
                <td style="text-align:right;font-size:13px;color:#0f172a;padding-top:8px;text-transform:capitalize;">${opts.paymentMethod}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Total</td>
                <td style="text-align:right;font-size:15px;font-weight:700;color:#0d9488;padding-top:8px;">${formatPrice(opts.total)}</td>
              </tr>
            </table>

            ${itemsTableHtml(opts.items)}

            <div style="text-align:center;margin-top:24px;">
              <a href="${opts.appUrl}/admin"
                style="display:inline-block;background:#1e293b;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:25px;font-weight:600;font-size:14px;">
                View in Admin Panel
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">${SITE_NAME} Admin Notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail(opts: { apiKey: string; from: string; to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`Failed to send email to ${opts.to}:`, text)
  }
}

function partialPaymentEmailHtml(opts: {
  firstName: string
  orderId: string
  total: number
  amountReceived: number
  amountPending: number
  dueDate: string
  appUrl: string
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="100%" style="max-width:600px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${SITE_NAME}</h1>
            <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">Partial Payment Received</p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            <div style="display:inline-block;background:#fef3c71a;color:#d97706;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-bottom:16px;">
              ⚠ Partial Payment Received
            </div>
            <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;">Hi ${opts.firstName},</h2>
            <p style="margin:0 0 24px;color:#475569;line-height:1.6;">
              We received a partial payment for your order. Please send the remaining balance by <strong>${opts.dueDate}</strong> to complete your order.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;">
              <tr>
                <td style="color:#64748b;font-size:13px;">Order ID</td>
                <td style="text-align:right;font-family:monospace;font-size:13px;color:#0f172a;font-weight:600;">${opts.orderId}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Order Total</td>
                <td style="text-align:right;font-size:13px;color:#0f172a;padding-top:8px;">${formatPrice(opts.total)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Amount Received</td>
                <td style="text-align:right;font-size:13px;color:#16a34a;font-weight:600;padding-top:8px;">${formatPrice(opts.amountReceived)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Amount Pending</td>
                <td style="text-align:right;font-size:15px;color:#dc2626;font-weight:700;padding-top:8px;">${formatPrice(opts.amountPending)}</td>
              </tr>
              <tr>
                <td style="color:#64748b;font-size:13px;padding-top:8px;">Payment Due By</td>
                <td style="text-align:right;font-size:13px;color:#d97706;font-weight:600;padding-top:8px;">${opts.dueDate}</td>
              </tr>
            </table>
            <p style="color:#475569;font-size:13px;line-height:1.6;">
              Please send the remaining amount to our Bitcoin wallet and upload a screenshot of the transaction on your orders page.
            </p>
            <div style="text-align:center;margin-top:32px;">
              <a href="${opts.appUrl}/orders"
                style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:25px;font-weight:600;font-size:15px;">
                View My Orders &amp; Upload Proof
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              © ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export const sendPaymentConfirmedEmail = internalAction({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return

    const fromEmail = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId as Id<'orders'>,
    })
    if (!order) return

    const customerEmail = order.billingAddress?.email
    const firstName = order.billingAddress?.firstName ?? 'Customer'

    if (customerEmail) {
      await sendEmail({
        apiKey: resendKey,
        from: `${SITE_NAME} <${fromEmail}>`,
        to: customerEmail,
        subject: `Payment Confirmed – Order #${order._id}`,
        html: userEmailHtml({
          firstName,
          orderId: order._id,
          total: order.total,
          items: order.items,
          paymentMethod: 'crypto',
          appUrl,
        }),
      })
    }
  },
})

export const sendPartialPaymentEmail = internalAction({
  args: {
    orderId: v.id('orders'),
    amountReceived: v.number(),
    amountPending: v.number(),
  },
  handler: async (ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return

    const fromEmail = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId as Id<'orders'>,
    })
    if (!order) return

    const customerEmail = order.billingAddress?.email
    const firstName = order.billingAddress?.firstName ?? 'Customer'
    const dueDate = order.partialPaymentDueAt
      ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(order.partialPaymentDueAt)
      : 'in 30 days'

    if (customerEmail) {
      await sendEmail({
        apiKey: resendKey,
        from: `${SITE_NAME} <${fromEmail}>`,
        to: customerEmail,
        subject: `Partial Payment Received – Order #${order._id}`,
        html: partialPaymentEmailHtml({
          firstName,
          orderId: order._id,
          total: order.total,
          amountReceived: args.amountReceived,
          amountPending: args.amountPending,
          dueDate,
          appUrl,
        }),
      })
    }
  },
})

export const sendOrderConfirmationEmails = internalAction({
  args: { orderId: v.id('orders') },
  handler: async (ctx, args) => {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.warn('RESEND_API_KEY not configured — skipping order confirmation email')
      return
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const fromEmail = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const order = await ctx.runQuery(internal.orders.getOrderById, {
      orderId: args.orderId as Id<'orders'>,
    })
    if (!order) return

    const customerEmail = order.billingAddress?.email
    const firstName = order.billingAddress?.firstName ?? 'Customer'
    const lastName = order.billingAddress?.lastName ?? ''
    const customerName = `${firstName} ${lastName}`.trim()
    const paymentMethod = order.paymentMethod ?? 'standard'
    const isConfirmed = paymentMethod === 'crypto'

    const subjectSuffix = isConfirmed ? 'Payment Confirmed' : 'Order Placed'

    // Email to customer
    if (customerEmail) {
      await sendEmail({
        apiKey: resendKey,
        from: `${SITE_NAME} <${fromEmail}>`,
        to: customerEmail,
        subject: `${subjectSuffix} – Order #${order._id}`,
        html: userEmailHtml({
          firstName,
          orderId: order._id,
          total: order.total,
          items: order.items,
          paymentMethod,
          appUrl,
        }),
      })
    }

    // Email to admin
    if (adminEmail) {
      await sendEmail({
        apiKey: resendKey,
        from: `${SITE_NAME} Orders <${fromEmail}>`,
        to: adminEmail,
        subject: `[Admin] New Order – ${customerName} – ${subjectSuffix}`,
        html: adminEmailHtml({
          orderId: order._id,
          total: order.total,
          customerName,
          customerEmail: customerEmail ?? 'Unknown',
          paymentMethod,
          items: order.items,
          appUrl,
        }),
      })
    }
  },
})
