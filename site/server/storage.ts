import { randomUUID } from 'node:crypto'
import * as fileStorage from './file-storage.ts'
import * as prismaStorage from './prisma-storage.ts'
import type {
  GuideMessageRecord,
  GuideSessionRecord,
  MediaUploadRecord,
  PublicMemoryEventRecord,
  UserRecord,
  VisitBookingRecord,
} from './system-types.ts'

type StorageDriver = {
  findUserByAccount: (account: string) => Promise<UserRecord | null>
  findUserById: (userId: string) => Promise<UserRecord | null>
  countUsers: () => Promise<number>
  createUser: (user: UserRecord) => Promise<UserRecord>
  createBooking: (booking: VisitBookingRecord) => Promise<VisitBookingRecord>
  listBookingsForUser: (userId: string) => Promise<VisitBookingRecord[]>
  listAllBookings: () => Promise<VisitBookingRecord[]>
  updateBookingStatus: (
    bookingId: string,
    status: VisitBookingRecord['status'],
  ) => Promise<VisitBookingRecord | null>
  createMediaUpload: (record: MediaUploadRecord) => Promise<MediaUploadRecord>
  findMediaUpload: (mediaId: string) => Promise<MediaUploadRecord | null>
  listMediaUploads: (mediaIds: string[]) => Promise<MediaUploadRecord[]>
  upsertGuideSession: (session: GuideSessionRecord) => Promise<void>
  createGuideMessage: (message: GuideMessageRecord) => Promise<GuideMessageRecord>
  createPublicMemoryEvent: (
    event: PublicMemoryEventRecord,
  ) => Promise<PublicMemoryEventRecord>
}

let cachedStorage: StorageDriver | null = null

function getStorage(): StorageDriver {
  if (cachedStorage) {
    return cachedStorage
  }

  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase() ?? 'file'
  cachedStorage =
    driver === 'prisma' || driver === 'postgres' || driver === 'postgresql'
      ? prismaStorage
      : fileStorage

  return cachedStorage
}

export function createRecordId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 18)}`
}

export function toPublicUser(user: UserRecord) {
  return {
    id: user.id,
    account: user.account,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  }
}

export async function findUserByAccount(account: string) {
  return getStorage().findUserByAccount(account)
}

export async function findUserById(userId: string) {
  return getStorage().findUserById(userId)
}

export async function countUsers() {
  return getStorage().countUsers()
}

export async function createUser(user: UserRecord) {
  return getStorage().createUser(user)
}

export async function createBooking(booking: VisitBookingRecord) {
  return getStorage().createBooking(booking)
}

export async function listBookingsForUser(userId: string) {
  return getStorage().listBookingsForUser(userId)
}

export async function listAllBookings() {
  return getStorage().listAllBookings()
}

export async function updateBookingStatus(
  bookingId: string,
  status: VisitBookingRecord['status'],
) {
  return getStorage().updateBookingStatus(bookingId, status)
}

export async function createMediaUpload(record: MediaUploadRecord) {
  return getStorage().createMediaUpload(record)
}

export async function findMediaUpload(mediaId: string) {
  return getStorage().findMediaUpload(mediaId)
}

export async function listMediaUploads(mediaIds: string[]) {
  return getStorage().listMediaUploads(mediaIds)
}

export async function upsertGuideSession(session: GuideSessionRecord) {
  return getStorage().upsertGuideSession(session)
}

export async function createGuideMessage(message: GuideMessageRecord) {
  return getStorage().createGuideMessage(message)
}

export async function createPublicMemoryEvent(event: PublicMemoryEventRecord) {
  return getStorage().createPublicMemoryEvent(event)
}
