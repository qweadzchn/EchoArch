import { mkdir, unlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { getAuthenticatedUser, optionalAuth } from './auth-routes.ts'
import type { MediaKind, MediaUploadRecord, VisualGrounding } from './system-types.ts'
import { createMediaUpload, createRecordId } from './storage.ts'

const UPLOAD_DIR_URL = new URL('./runtime/uploads/', import.meta.url)
const UPLOAD_DIR = fileURLToPath(UPLOAD_DIR_URL)
const MAX_IMAGE_BYTES = 1024 * 1024 * 6
const MAX_AUDIO_BYTES = 1024 * 1024 * 12

const ttsSchema = z.object({
  text: z.string().trim().min(1).max(800),
})

const storage = multer.diskStorage({
  destination(_request, _file, callback) {
    mkdir(UPLOAD_DIR, { recursive: true })
      .then(() => callback(null, UPLOAD_DIR))
      .catch((error: Error) => callback(error, UPLOAD_DIR))
  },
  filename(_request, file, callback) {
    const extension = extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 12)}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_AUDIO_BYTES,
  },
})

export function getUploadDirectory() {
  return UPLOAD_DIR
}

function isImageFile(file: Express.Multer.File) {
  return file.mimetype.startsWith('image/') && file.size <= MAX_IMAGE_BYTES
}

function isAudioFile(file: Express.Multer.File) {
  return file.mimetype.startsWith('audio/') && file.size <= MAX_AUDIO_BYTES
}

async function removeRejectedFile(file: Express.Multer.File | undefined) {
  if (!file?.path) {
    return
  }

  await unlink(file.path).catch(() => undefined)
}

function getMediaUrl(file: Express.Multer.File) {
  return `/uploads/${file.filename}`
}

function buildMockImageAnalysis(file: Express.Multer.File) {
  return [
    `已接收图像「${file.originalname}」。`,
    '当前环境未配置 Qwen-VL 视觉模型，先按项目资料与当前景点上下文进行讲解。',
    '部署时配置 QWEN_API_KEY、QWEN_BASE_URL、QWEN_VISION_MODEL 后，可替换为真实图像识别、OCR 与细部定位。',
  ].join('')
}

function buildMockTranscription(file: Express.Multer.File) {
  return `已接收语音「${file.originalname}」。当前未配置 ASR 服务，请在输入框中确认想问的问题。`
}

async function createMediaRecord(
  kind: MediaKind,
  file: Express.Multer.File,
  userId: string | null,
  analysis: string | null,
  visualGrounding: VisualGrounding[] = [],
) {
  const record: MediaUploadRecord = {
    id: createRecordId('med'),
    userId,
    kind,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: getMediaUrl(file),
    analysis,
    visualGrounding,
    createdAt: new Date().toISOString(),
  }

  return createMediaUpload(record)
}

export function createMediaRouter() {
  const router = Router()

  router.post('/image', optionalAuth, upload.single('file'), async (request, response) => {
    const file = request.file

    if (!file || !isImageFile(file)) {
      await removeRejectedFile(file)
      response.status(400).json({
        error: '请上传 6MB 以内的图片文件。',
      })
      return
    }

    const user = getAuthenticatedUser(response)
    const analysis = buildMockImageAnalysis(file)
    const media = await createMediaRecord('image', file, user?.id ?? null, analysis)

    response.status(201).json({
      mediaId: media.id,
      url: media.url,
      analysis: media.analysis,
      visualGrounding: media.visualGrounding,
      provider: process.env.QWEN_API_KEY ? 'qwen-ready' : 'mock',
    })
  })

  router.post('/transcribe', optionalAuth, upload.single('file'), async (request, response) => {
    const file = request.file

    if (!file || !isAudioFile(file)) {
      await removeRejectedFile(file)
      response.status(400).json({
        error: '请上传 12MB 以内的音频文件。',
      })
      return
    }

    const user = getAuthenticatedUser(response)
    const text = buildMockTranscription(file)
    const media = await createMediaRecord('audio', file, user?.id ?? null, text)

    response.status(201).json({
      mediaId: media.id,
      text,
      provider: process.env.QWEN_API_KEY ? 'asr-ready' : 'mock',
    })
  })

  router.post('/tts', optionalAuth, async (request, response) => {
    const parsed = ttsSchema.safeParse(request.body)

    if (!parsed.success) {
      response.status(400).json({
        error: '请输入需要朗读的导游文本。',
      })
      return
    }

    response.json({
      audioUrl: null,
      text: parsed.data.text,
      provider: process.env.QWEN_API_KEY ? 'tts-ready' : 'browser-fallback',
    })
  })

  return router
}
