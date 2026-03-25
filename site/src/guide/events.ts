import type { GuideMode } from './types'

export const GUIDE_OPEN_EVENT = 'echoarch:guide-open'

export type GuideOpenEventDetail = {
  mode?: GuideMode
  prompt?: string
}

export function openGuideCompanion(detail: GuideOpenEventDetail = {}) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<GuideOpenEventDetail>(GUIDE_OPEN_EVENT, {
      detail,
    }),
  )
}
