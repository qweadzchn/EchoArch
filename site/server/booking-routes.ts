import { Router } from 'express'
import { z } from 'zod'
import { getAuthenticatedUser, requireAdmin, requireAuth } from './auth-routes.ts'
import type { BookingStatus, VisitBookingRecord } from './system-types.ts'
import {
  createBooking,
  createRecordId,
  listAllBookings,
  listBookingsForUser,
  updateBookingStatus,
} from './storage.ts'

const bookingSchema = z.object({
  routeId: z.string().min(1),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  timeSlotId: z.string().min(1),
  timeSlotLabel: z.string().min(1).max(32),
  visitorCount: z.number().int().min(1).max(20),
  contact: z.string().trim().min(2).max(80),
  note: z.string().trim().max(300).optional(),
})

const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
})

const routeTitleById: Record<string, string> = {
  'first-arrival': '初入北岸',
  waterfront: '湖心听水',
  academy: '书院行宫',
  'west-mountain': '西山寻碑',
}

function createBookingNo() {
  const stamp = Date.now().toString(36).toUpperCase()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `BQ-${stamp}-${suffix}`
}

function sortBookings(bookings: VisitBookingRecord[]) {
  return [...bookings].sort((left, right) => {
    return right.createdAt.localeCompare(left.createdAt)
  })
}

function resolveRouteTitle(routeId: string) {
  return routeTitleById[routeId] ?? '自选路线'
}

export function createBookingRouter() {
  const router = Router()

  router.post('/', requireAuth, async (request, response) => {
    const user = getAuthenticatedUser(response)
    const parsed = bookingSchema.safeParse(request.body)

    if (!user) {
      response.status(401).json({
        error: '请先登录后再提交预约。',
      })
      return
    }

    if (!parsed.success) {
      response.status(400).json({
        error: '预约信息不完整。',
        issues: parsed.error.flatten(),
      })
      return
    }

    const input = parsed.data
    const now = new Date().toISOString()
    const booking: VisitBookingRecord = {
      id: createRecordId('bkg'),
      bookingNo: createBookingNo(),
      userId: user.id,
      routeId: input.routeId,
      routeTitle: resolveRouteTitle(input.routeId),
      visitDate: input.visitDate,
      timeSlotId: input.timeSlotId,
      timeSlotLabel: input.timeSlotLabel,
      visitorCount: input.visitorCount,
      contact: input.contact,
      note: input.note ?? '',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }

    response.status(201).json({
      booking: await createBooking(booking),
    })
  })

  router.get('/my', requireAuth, async (_request, response) => {
    const user = getAuthenticatedUser(response)

    if (!user) {
      response.status(401).json({
        error: '请先登录。',
      })
      return
    }

    response.json({
      bookings: sortBookings(await listBookingsForUser(user.id)),
    })
  })

  return router
}

export function createAdminBookingRouter() {
  const router = Router()

  router.get('/bookings', requireAdmin, async (_request, response) => {
    response.json({
      bookings: sortBookings(await listAllBookings()),
    })
  })

  router.patch('/bookings/:id', requireAdmin, async (request, response) => {
    const parsed = bookingStatusSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        error: '预约状态不正确。',
      })
      return
    }

    const status: BookingStatus = parsed.data.status
    const booking = await updateBookingStatus(String(request.params.id), status)

    if (!booking) {
      response.status(404).json({
        error: '没有找到这条预约。',
      })
      return
    }

    response.json({
      booking,
    })
  })

  return router
}
