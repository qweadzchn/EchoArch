export type PublicUser = {
  id: string
  account: string
  displayName: string
  email: string | null
  phone: string | null
  role: 'visitor' | 'admin'
  createdAt: string
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export type VisitBooking = {
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

export type BookingInput = {
  routeId: string
  visitDate: string
  timeSlotId: string
  timeSlotLabel: string
  visitorCount: number
  contact: string
  note: string
}

export type MediaUploadResult = {
  mediaId: string
  url?: string
  analysis?: string
  text?: string
  provider: string
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error)
        : `请求失败：${response.status}`
    throw new Error(message)
  }

  return payload as T
}

export async function getCurrentUser() {
  return requestJson<{ user: PublicUser | null }>('/api/auth/me')
}

export async function registerUser(input: {
  account: string
  displayName?: string
  email?: string
  phone?: string
  password: string
}) {
  return requestJson<{ user: PublicUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function loginUser(input: { account: string; password: string }) {
  return requestJson<{ user: PublicUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function logoutUser() {
  return requestJson<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function createVisitBooking(input: BookingInput) {
  return requestJson<{ booking: VisitBooking }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getMyBookings() {
  return requestJson<{ bookings: VisitBooking[] }>('/api/bookings/my')
}

export async function uploadGuideImage(file: File) {
  const formData = new FormData()
  formData.set('file', file)

  return requestJson<MediaUploadResult>('/api/media/image', {
    method: 'POST',
    body: formData,
  })
}

export async function uploadGuideAudio(file: Blob, filename = 'guide-voice.webm') {
  const formData = new FormData()
  formData.set('file', file, filename)

  return requestJson<MediaUploadResult>('/api/media/transcribe', {
    method: 'POST',
    body: formData,
  })
}

export async function requestGuideTts(text: string) {
  return requestJson<{ audioUrl: string | null; text: string; provider: string }>('/api/media/tts', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}
