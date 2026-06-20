import { Prisma, PrismaClient } from '@prisma/client'
import type {
  BookingStatus,
  GuideMessageRecord,
  GuideSessionRecord,
  MediaUploadRecord,
  PublicMemoryEventRecord,
  UserRecord,
  UserRole,
  VisitBookingRecord,
  VisualGrounding,
} from './system-types.ts'

let prismaClient: PrismaClient | null = null

function prisma() {
  prismaClient ??= new PrismaClient()
  return prismaClient
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

function toStringArray(value: Prisma.JsonValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function toVisualGroundingArray(value: Prisma.JsonValue) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is VisualGrounding => {
    return Boolean(item && typeof item === 'object' && 'label' in item)
  })
}

function toPayloadObject(value: Prisma.JsonValue) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function mapUser(user: {
  id: string
  account: string
  displayName: string
  email: string | null
  phone: string | null
  passwordHash: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}): UserRecord {
  return {
    id: user.id,
    account: user.account,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    passwordHash: user.passwordHash,
    role: user.role,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  }
}

function mapBooking(booking: {
  id: string
  bookingNo: string
  userId: string
  routeId: string
  routeTitle: string
  visitDate: Date
  timeSlotId: string
  timeSlotLabel: string
  visitorCount: number
  contact: string
  note: string
  status: BookingStatus
  createdAt: Date
  updatedAt: Date
}): VisitBookingRecord {
  return {
    id: booking.id,
    bookingNo: booking.bookingNo,
    userId: booking.userId,
    routeId: booking.routeId,
    routeTitle: booking.routeTitle,
    visitDate: toDateOnly(booking.visitDate),
    timeSlotId: booking.timeSlotId,
    timeSlotLabel: booking.timeSlotLabel,
    visitorCount: booking.visitorCount,
    contact: booking.contact,
    note: booking.note,
    status: booking.status,
    createdAt: toIsoString(booking.createdAt),
    updatedAt: toIsoString(booking.updatedAt),
  }
}

function mapMediaUpload(media: {
  id: string
  userId: string | null
  kind: MediaUploadRecord['kind']
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  analysis: string | null
  visualGrounding: Prisma.JsonValue
  createdAt: Date
}): MediaUploadRecord {
  return {
    id: media.id,
    userId: media.userId,
    kind: media.kind,
    filename: media.filename,
    originalName: media.originalName,
    mimeType: media.mimeType,
    size: media.size,
    url: media.url,
    analysis: media.analysis,
    visualGrounding: toVisualGroundingArray(media.visualGrounding),
    createdAt: toIsoString(media.createdAt),
  }
}

export async function findUserByAccount(account: string) {
  const normalized = account.trim().toLowerCase()
  const user = await prisma().user.findFirst({
    where: {
      OR: [{ account: { equals: normalized, mode: 'insensitive' } }, { email: { equals: normalized, mode: 'insensitive' } }, { phone: account.trim() }],
    },
  })

  return user ? mapUser(user) : null
}

export async function findUserById(userId: string) {
  const user = await prisma().user.findUnique({
    where: {
      id: userId,
    },
  })

  return user ? mapUser(user) : null
}

export async function countUsers() {
  return prisma().user.count()
}

export async function createUser(user: UserRecord) {
  const created = await prisma().user.create({
    data: {
      id: user.id,
      account: user.account,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    },
  })

  return mapUser(created)
}

export async function createBooking(booking: VisitBookingRecord) {
  const created = await prisma().visitBooking.create({
    data: {
      id: booking.id,
      bookingNo: booking.bookingNo,
      userId: booking.userId,
      routeId: booking.routeId,
      routeTitle: booking.routeTitle,
      visitDate: parseDate(booking.visitDate),
      timeSlotId: booking.timeSlotId,
      timeSlotLabel: booking.timeSlotLabel,
      visitorCount: booking.visitorCount,
      contact: booking.contact,
      note: booking.note,
      status: booking.status,
      createdAt: new Date(booking.createdAt),
      updatedAt: new Date(booking.updatedAt),
    },
  })

  return mapBooking(created)
}

export async function listBookingsForUser(userId: string) {
  const bookings = await prisma().visitBooking.findMany({
    where: {
      userId,
    },
  })

  return bookings.map(mapBooking)
}

export async function listAllBookings() {
  const bookings = await prisma().visitBooking.findMany()
  return bookings.map(mapBooking)
}

export async function updateBookingStatus(bookingId: string, status: VisitBookingRecord['status']) {
  try {
    const updated = await prisma().visitBooking.update({
      where: {
        id: bookingId,
      },
      data: {
        status,
      },
    })

    return mapBooking(updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null
    }

    throw error
  }
}

export async function createMediaUpload(record: MediaUploadRecord) {
  const created = await prisma().mediaUpload.create({
    data: {
      id: record.id,
      userId: record.userId,
      kind: record.kind,
      filename: record.filename,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      analysis: record.analysis,
      visualGrounding: record.visualGrounding as Prisma.InputJsonValue,
      createdAt: new Date(record.createdAt),
    },
  })

  return mapMediaUpload(created)
}

export async function findMediaUpload(mediaId: string) {
  const media = await prisma().mediaUpload.findUnique({
    where: {
      id: mediaId,
    },
  })

  return media ? mapMediaUpload(media) : null
}

export async function listMediaUploads(mediaIds: string[]) {
  const media = await prisma().mediaUpload.findMany({
    where: {
      id: {
        in: mediaIds,
      },
    },
  })

  return media.map(mapMediaUpload)
}

export async function upsertGuideSession(session: GuideSessionRecord) {
  await prisma().guideSession.upsert({
    where: {
      id: session.id,
    },
    create: {
      id: session.id,
      userId: session.userId,
      anonymousId: session.anonymousId,
      summary: session.summary,
      currentRouteId: session.currentRouteId,
      visitedSpotIds: session.visitedSpotIds as Prisma.InputJsonValue,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
    },
    update: {
      userId: session.userId,
      anonymousId: session.anonymousId,
      summary: session.summary,
      currentRouteId: session.currentRouteId,
      visitedSpotIds: session.visitedSpotIds as Prisma.InputJsonValue,
    },
  })
}

export async function createGuideMessage(message: GuideMessageRecord) {
  const created = await prisma().guideMessage.create({
    data: {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      mode: message.mode,
      content: message.content,
      mediaRefs: message.mediaRefs as Prisma.InputJsonValue,
      createdAt: new Date(message.createdAt),
    },
  })

  await pruneGuideMessages()

  return {
    id: created.id,
    sessionId: created.sessionId,
    role: created.role as GuideMessageRecord['role'],
    mode: created.mode,
    content: created.content,
    mediaRefs: toStringArray(created.mediaRefs),
    createdAt: toIsoString(created.createdAt),
  }
}

export async function createPublicMemoryEvent(event: PublicMemoryEventRecord) {
  const created = await prisma().publicMemoryEvent.create({
    data: {
      id: event.id,
      sessionId: event.sessionId,
      userId: event.userId,
      eventType: event.eventType,
      sceneId: event.sceneId,
      payload: event.payload as Prisma.InputJsonValue,
      createdAt: new Date(event.createdAt),
    },
  })

  await prunePublicMemoryEvents()

  return {
    id: created.id,
    sessionId: created.sessionId,
    userId: created.userId,
    eventType: created.eventType,
    sceneId: created.sceneId,
    payload: toPayloadObject(created.payload),
    createdAt: toIsoString(created.createdAt),
  }
}

async function pruneGuideMessages() {
  const overflow = (await prisma().guideMessage.count()) - 600

  if (overflow <= 0) {
    return
  }

  const oldest = await prisma().guideMessage.findMany({
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
    take: overflow,
  })

  await prisma().guideMessage.deleteMany({
    where: {
      id: {
        in: oldest.map((message) => message.id),
      },
    },
  })
}

async function prunePublicMemoryEvents() {
  const overflow = (await prisma().publicMemoryEvent.count()) - 1000

  if (overflow <= 0) {
    return
  }

  const oldest = await prisma().publicMemoryEvent.findMany({
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
    take: overflow,
  })

  await prisma().publicMemoryEvent.deleteMany({
    where: {
      id: {
        in: oldest.map((event) => event.id),
      },
    },
  })
}
