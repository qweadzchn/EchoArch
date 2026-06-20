export type UserRole = 'visitor' | 'admin'

export type UserRecord = {
  id: string
  account: string
  displayName: string
  email: string | null
  phone: string | null
  passwordHash: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export type PublicUser = {
  id: string
  account: string
  displayName: string
  email: string | null
  phone: string | null
  role: UserRole
  createdAt: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type VisitBookingRecord = {
  id: string
  bookingNo: string
  userId: string
  routeId: string
  routeTitle: string
  visitDate: string
  timeSlotId: string
  timeSlotLabel: string
  visitorCount: number
  contact: string
  note: string
  status: BookingStatus
  createdAt: string
  updatedAt: string
}

export type MediaKind = 'image' | 'audio' | 'tts'

export type VisualGrounding = {
  label: string
  bbox?: number[]
  point?: number[]
}

export type MediaUploadRecord = {
  id: string
  userId: string | null
  kind: MediaKind
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  analysis: string | null
  visualGrounding: VisualGrounding[]
  createdAt: string
}

export type GuideSessionRecord = {
  id: string
  userId: string | null
  anonymousId: string | null
  summary: string | null
  currentRouteId: string | null
  visitedSpotIds: string[]
  createdAt: string
  updatedAt: string
}

export type GuideMessageRecord = {
  id: string
  sessionId: string
  role: 'user' | 'guide'
  mode: string
  content: string
  mediaRefs: string[]
  createdAt: string
}

export type PublicMemoryEventRecord = {
  id: string
  sessionId: string | null
  userId: string | null
  eventType: string
  sceneId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

export type MvpStoreData = {
  users: UserRecord[]
  bookings: VisitBookingRecord[]
  mediaUploads: MediaUploadRecord[]
  guideSessions: GuideSessionRecord[]
  guideMessages: GuideMessageRecord[]
  publicMemoryEvents: PublicMemoryEventRecord[]
}
