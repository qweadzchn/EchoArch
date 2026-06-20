import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { PublicUser, UserRecord } from './system-types.ts'
import {
  countUsers,
  createRecordId,
  createUser,
  findUserByAccount,
  findUserById,
  toPublicUser,
} from './storage.ts'

const AUTH_COOKIE_NAME = 'echoarch_session'
const AUTH_SECRET =
  process.env.AUTH_SECRET?.trim() ||
  process.env.MVP_AUTH_SECRET?.trim() ||
  'echoarch-local-development-secret'
const AUTH_COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7

const registerSchema = z.object({
  account: z.string().trim().min(3).max(40),
  displayName: z.string().trim().min(2).max(32).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().min(6).max(24).optional().or(z.literal('')),
  password: z.string().min(6).max(80),
})

const loginSchema = z.object({
  account: z.string().trim().min(1),
  password: z.string().min(1),
})

type AuthTokenPayload = {
  userId: string
}

export type AuthLocals = {
  authUser?: PublicUser
}

function getAuthLocals(response: Response): AuthLocals {
  return response.locals as AuthLocals
}

function signAuthToken(userId: string) {
  return jwt.sign({ userId } satisfies AuthTokenPayload, AUTH_SECRET, {
    expiresIn: '7d',
  })
}

function setAuthCookie(response: Response, userId: string) {
  response.cookie(AUTH_COOKIE_NAME, signAuthToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: '/',
  })
}

function clearAuthCookie(response: Response) {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
}

function readBearerToken(request: Request) {
  const authorization = request.header('authorization')?.trim() ?? ''

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return ''
  }

  return authorization.slice('bearer '.length).trim()
}

async function resolveUserFromRequest(request: Request) {
  const token =
    (typeof request.cookies?.[AUTH_COOKIE_NAME] === 'string'
      ? request.cookies[AUTH_COOKIE_NAME]
      : '') || readBearerToken(request)

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as Partial<AuthTokenPayload>

    if (!decoded.userId) {
      return null
    }

    const user = await findUserById(decoded.userId)
    return user ? toPublicUser(user) : null
  } catch {
    return null
  }
}

export async function optionalAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const user = await resolveUserFromRequest(request)

  if (user) {
    getAuthLocals(response).authUser = user
  }

  next()
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const user = await resolveUserFromRequest(request)

  if (!user) {
    response.status(401).json({
      error: '请先登录后再继续。',
    })
    return
  }

  getAuthLocals(response).authUser = user
  next()
}

export async function requireAdmin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const user = await resolveUserFromRequest(request)

  if (!user || user.role !== 'admin') {
    response.status(403).json({
      error: '需要管理员权限。',
    })
    return
  }

  getAuthLocals(response).authUser = user
  next()
}

export function getAuthenticatedUser(response: Response) {
  return getAuthLocals(response).authUser ?? null
}

async function inferRoleForNewUser(): Promise<UserRecord['role']> {
  return (await countUsers()) === 0 ? 'admin' : 'visitor'
}

export function createAuthRouter() {
  const router = Router()

  router.get('/me', optionalAuth, (_request, response) => {
    response.json({
      user: getAuthenticatedUser(response),
    })
  })

  router.post('/register', async (request, response) => {
    const parsed = registerSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        error: '注册信息不完整。',
        issues: parsed.error.flatten(),
      })
      return
    }

    const input = parsed.data
    const existing = await findUserByAccount(input.account)

    if (existing) {
      response.status(409).json({
        error: '这个账号已经注册过。',
      })
      return
    }

    const now = new Date().toISOString()
    const passwordHash = await bcrypt.hash(input.password, 10)
    const role = await inferRoleForNewUser()
    const user: UserRecord = {
      id: createRecordId('usr'),
      account: input.account,
      displayName: input.displayName || input.account,
      email: input.email || null,
      phone: input.phone || null,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    }

    await createUser(user)
    setAuthCookie(response, user.id)

    response.status(201).json({
      user: toPublicUser(user),
    })
  })

  router.post('/login', async (request, response) => {
    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        error: '请输入账号和密码。',
      })
      return
    }

    const user = await findUserByAccount(parsed.data.account)

    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      response.status(401).json({
        error: '账号或密码不正确。',
      })
      return
    }

    setAuthCookie(response, user.id)

    response.json({
      user: toPublicUser(user),
    })
  })

  router.post('/logout', (_request, response) => {
    clearAuthCookie(response)
    response.json({
      ok: true,
    })
  })

  return router
}
