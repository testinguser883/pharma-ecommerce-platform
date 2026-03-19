import { PaymentPage } from '@/components/payment-page-content'

export default async function OrderPayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <PaymentPage orderId={orderId} />
}
