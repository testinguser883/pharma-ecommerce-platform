import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Auto-cancel orders that have been pending payment for more than 7 days
crons.daily('cancel-expired-pending-orders', { hourUTC: 2, minuteUTC: 0 }, internal.orders.cancelExpiredOrders)

export default crons
