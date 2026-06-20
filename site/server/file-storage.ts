import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  GuideMessageRecord,
  GuideSessionRecord,
  MediaUploadRecord,
  MvpStoreData,
  PublicMemoryEventRecord,
  UserRecord,
  VisitBookingRecord,
} from './system-types.ts'

const STORE_PATH = new URL('./runtime/mvp-store.json', import.meta.url)
const STORE_FILE_PATH = fileURLToPath(STORE_PATH)

const EMPTY_STORE: MvpStoreData = {
  users: [],
  bookings: [],
  mediaUploads: [],
  guideSessions: [],
  guideMessages: [],
  publicMemoryEvents: [],
}

let writeQueue = Promise.resolve()

function cloneStore(store: MvpStoreData): MvpStoreData {
  return {
    users: [...store.users],
    bookings: [...store.bookings],
    mediaUploads: [...store.mediaUploads],
    guideSessions: [...store.guideSessions],
    guideMessages: [...store.guideMessages],
    publicMemoryEvents: [...store.publicMemoryEvents],
  }
}

async function ensureStoreDirectory() {
  await mkdir(dirname(STORE_FILE_PATH), { recursive: true })
}

async function readStore(): Promise<MvpStoreData> {
  try {
    const raw = await readFile(STORE_FILE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<MvpStoreData>

    return {
      users: parsed.users ?? [],
      bookings: parsed.bookings ?? [],
      mediaUploads: parsed.mediaUploads ?? [],
      guideSessions: parsed.guideSessions ?? [],
      guideMessages: parsed.guideMessages ?? [],
      publicMemoryEvents: parsed.publicMemoryEvents ?? [],
    }
  } catch {
    return cloneStore(EMPTY_STORE)
  }
}

async function writeStore(store: MvpStoreData) {
  await ensureStoreDirectory()
  const tempPath = new URL(`./runtime/mvp-store.${Date.now()}.tmp`, import.meta.url)
  const tempFilePath = fileURLToPath(tempPath)
  await writeFile(tempFilePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  await rename(tempFilePath, STORE_FILE_PATH)
}

async function updateStore(mutator: (store: MvpStoreData) => void | Promise<void>) {
  const nextWrite = writeQueue.then(async () => {
    const store = await readStore()
    await mutator(store)
    await writeStore(store)
    return store
  })

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  )

  return nextWrite
}

export async function findUserByAccount(account: string) {
  const normalized = account.trim().toLowerCase()
  const store = await readStore()

  return (
    store.users.find((user) => {
      return (
        user.account.toLowerCase() === normalized ||
        user.email?.toLowerCase() === normalized ||
        user.phone === account.trim()
      )
    }) ?? null
  )
}

export async function findUserById(userId: string) {
  const store = await readStore()
  return store.users.find((user) => user.id === userId) ?? null
}

export async function countUsers() {
  const store = await readStore()
  return store.users.length
}

export async function createUser(user: UserRecord) {
  await updateStore((store) => {
    store.users.unshift(user)
  })

  return user
}

export async function createBooking(booking: VisitBookingRecord) {
  await updateStore((store) => {
    store.bookings.unshift(booking)
  })

  return booking
}

export async function listBookingsForUser(userId: string) {
  const store = await readStore()
  return store.bookings.filter((booking) => booking.userId === userId)
}

export async function listAllBookings() {
  const store = await readStore()
  return store.bookings
}

export async function updateBookingStatus(
  bookingId: string,
  status: VisitBookingRecord['status'],
) {
  let updated: VisitBookingRecord | null = null
  await updateStore((store) => {
    const booking = store.bookings.find((candidate) => candidate.id === bookingId)

    if (!booking) {
      return
    }

    booking.status = status
    booking.updatedAt = new Date().toISOString()
    updated = booking
  })

  return updated
}

export async function createMediaUpload(record: MediaUploadRecord) {
  await updateStore((store) => {
    store.mediaUploads.unshift(record)
  })

  return record
}

export async function findMediaUpload(mediaId: string) {
  const store = await readStore()
  return store.mediaUploads.find((media) => media.id === mediaId) ?? null
}

export async function listMediaUploads(mediaIds: string[]) {
  const requestedIds = new Set(mediaIds)
  const store = await readStore()
  return store.mediaUploads.filter((media) => requestedIds.has(media.id))
}

export async function upsertGuideSession(session: GuideSessionRecord) {
  await updateStore((store) => {
    const index = store.guideSessions.findIndex((candidate) => candidate.id === session.id)

    if (index >= 0) {
      store.guideSessions[index] = session
      return
    }

    store.guideSessions.unshift(session)
  })
}

export async function createGuideMessage(message: GuideMessageRecord) {
  await updateStore((store) => {
    store.guideMessages.unshift(message)
    store.guideMessages = store.guideMessages.slice(0, 600)
  })

  return message
}

export async function createPublicMemoryEvent(event: PublicMemoryEventRecord) {
  await updateStore((store) => {
    store.publicMemoryEvents.unshift(event)
    store.publicMemoryEvents = store.publicMemoryEvents.slice(0, 1000)
  })

  return event
}
