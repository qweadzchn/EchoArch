import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import type { HeritageSpot } from '../types'
import { createGuideSessionId, requestGuideReply } from './client'
import {
  getArrivalNote,
  getRouteById,
  getSuggestedRoutes,
  guideProfile,
  guideWorldLabels,
} from './content'
import type { GuideMessage, GuideMode, GuideRoutePreset } from './types'

type GuideCompanionProps = {
  currentSpot: HeritageSpot | null
  currentView: 'home' | 'detail'
  visitedSpotIds: string[]
  allSpots: HeritageSpot[]
  onOpenSpot: (spotId: string) => void
}

type WhisperNote = {
  id: string
  title: string
  content: string
}

type SendGuideOptions = {
  addUserMessage?: boolean
  nextActiveRouteId?: string | null
}

function createUserMessage(input: string, mode: GuideMode): GuideMessage {
  return {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    mode,
    content: input,
  }
}

export function GuideCompanion({
  currentSpot,
  currentView,
  visitedSpotIds,
  allSpots,
  onOpenSpot,
}: GuideCompanionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionId] = useState(() => createGuideSessionId())
  const [isPending, setIsPending] = useState(false)
  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [input, setInput] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
  const [whisper, setWhisper] = useState<WhisperNote | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const viewKeyRef = useRef<string | null>(null)

  const relatedSpots = useMemo(() => {
    if (!currentSpot) {
      return []
    }

    return allSpots.filter((candidate) => currentSpot.related.includes(candidate.id))
  }, [allSpots, currentSpot])

  const activeRoute = useMemo(() => getRouteById(activeRouteId), [activeRouteId])
  const visibleRoutes = useMemo(() => {
    const routes = getSuggestedRoutes(currentSpot)

    if (!activeRoute) {
      return routes
    }

    return [activeRoute, ...routes]
      .filter(
        (route, index, currentRoutes) =>
          currentRoutes.findIndex((candidate) => candidate.id === route.id) === index,
      )
      .slice(0, currentSpot ? 3 : 4)
  }, [activeRoute, currentSpot])
  const suggestedPrompts = currentSpot
    ? guideProfile.detailPrompts
    : guideProfile.defaultPrompts
  const sceneNote = getArrivalNote(currentSpot, activeRoute?.title ?? null)
  const routeProgress = activeRoute
    ? activeRoute.spotIds.filter((spotId) => visitedSpotIds.includes(spotId)).length
    : 0
  const sceneImage = currentSpot?.images[0]?.src ?? '/landing/overview.jpg'
  const sceneLabel = currentSpot
    ? `${currentSpot.region} · ${guideWorldLabels[currentSpot.world]}`
    : '总览入园'
  const currentModeLabel = activeRoute
    ? activeRoute.title
    : currentSpot
      ? '就地听讲'
      : '自由漫游'

  useEffect(() => {
    if (!messageEndRef.current) {
      return
    }

    messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isPending])

  useEffect(() => {
    if (isOpen) {
      setWhisper(null)
      return
    }

    const currentViewKey = `${currentView}:${currentSpot?.id ?? 'home'}:${activeRoute?.id ?? 'free'}`

    if (viewKeyRef.current === currentViewKey) {
      return
    }

    viewKeyRef.current = currentViewKey

    const nextWhisper = {
      id: currentViewKey,
      title: sceneNote.title,
      content: sceneNote.content,
    }

    setWhisper(nextWhisper)

    const timer = window.setTimeout(() => {
      setWhisper((current) => (current?.id === currentViewKey ? null : current))
    }, 5600)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeRoute?.id, currentSpot, currentView, isOpen, sceneNote.content, sceneNote.title])

  async function sendGuideRequest(
    prompt: string,
    mode: GuideMode,
    options?: SendGuideOptions,
  ) {
    if (isPending) {
      return
    }

    const addUserMessage = options?.addUserMessage ?? true
    const nextActiveRouteId =
      options?.nextActiveRouteId === undefined ? activeRouteId : options.nextActiveRouteId

    if (options?.nextActiveRouteId !== undefined) {
      setActiveRouteId(options.nextActiveRouteId)
    }

    setIsPending(true)

    try {
      if (addUserMessage) {
        setMessages((current) => [...current, createUserMessage(prompt, mode)])
      }

      const response = await requestGuideReply({
        sessionId,
        input: prompt,
        mode,
        currentView,
        currentSpotId: currentSpot?.id ?? null,
        visitedSpotIds,
        activeRouteId: nextActiveRouteId,
        currentSpot,
        relatedSpots,
      })

      setMessages((current) => [...current, response.reply])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '导游暂时没有回应，请稍后再试。'

      setMessages((current) => [
        ...current,
        {
          id: `guide-error-${Date.now().toString(36)}`,
          role: 'guide',
          mode: 'ask',
          title: '暂时未连通导游服务',
          content: message,
        },
      ])
    } finally {
      setIsPending(false)
    }
  }

  const sendOpeningGuideRequest = useEffectEvent(
    (prompt: string, mode: GuideMode) => {
      void sendGuideRequest(prompt, mode, {
        addUserMessage: false,
      })
    },
  )

  useEffect(() => {
    if (!isOpen || messages.length > 0) {
      return
    }

    const openingPrompt = currentSpot
      ? '请先带我看看这一处'
      : activeRoute
        ? `请按「${activeRoute.title}」先替我起个头`
        : '先带我认识这片古建筑群'

    sendOpeningGuideRequest(openingPrompt, currentSpot ? 'story' : 'welcome')
  }, [activeRoute, currentSpot, isOpen, messages.length])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextInput = input.trim()

    if (!nextInput) {
      return
    }

    setInput('')
    void sendGuideRequest(nextInput, 'ask')
  }

  function handleRouteSelect(route: GuideRoutePreset) {
    setIsComposerOpen(false)
    void sendGuideRequest(route.prompt, 'route', {
      nextActiveRouteId: route.id,
    })
  }

  return (
    <div
      className={['guide-companion', isOpen ? 'is-open' : ''].filter(Boolean).join(' ')}
    >
      {whisper ? (
        <button
          type="button"
          className="guide-whisper"
          onClick={() => {
            setIsOpen(true)
            setWhisper(null)
          }}
        >
          <span>泉上耳语</span>
          <strong>{whisper.title}</strong>
          <p>{whisper.content}</p>
        </button>
      ) : null}

      <button
        type="button"
        className="guide-companion__toggle"
        onClick={() => {
          setIsOpen((current) => !current)
          setWhisper(null)
        }}
      >
        <span className="guide-companion__lamp" aria-hidden="true" />
        <span className="guide-companion__toggle-copy">
          <strong>{guideProfile.name}</strong>
          <small>{currentSpot ? `正停在 ${currentSpot.name}` : '轻点即可入景'}</small>
        </span>
      </button>

      <aside className="guide-panel">
        <div
          className="guide-panel__scene"
          style={{ '--accent': currentSpot?.accent ?? '#b8894e' } as CSSProperties}
        >
          <img
            src={sceneImage}
            alt={currentSpot?.images[0]?.alt ?? (currentSpot ? currentSpot.name : '百泉总览')}
            loading="lazy"
            decoding="async"
          />

          <div className="guide-panel__scene-copy">
            <span>{sceneLabel}</span>
            <h2>{currentSpot ? currentSpot.name : guideProfile.name}</h2>
            <p>{sceneNote.content}</p>
          </div>

          <div className="guide-panel__scene-badge">
            {activeRoute ? `正在沿「${activeRoute.title}」行游` : guideProfile.subtitle}
          </div>
        </div>

        <div className="guide-panel__ritual">
          <div>
            <span>此刻所至</span>
            <strong>{currentSpot ? currentSpot.name : '百泉总览'}</strong>
          </div>
          <div>
            <span>行过几处</span>
            <strong>
              {activeRoute ? `${routeProgress} / ${activeRoute.spotIds.length}` : `${visitedSpotIds.length} 处`}
            </strong>
          </div>
          <div>
            <span>当前游法</span>
            <strong>{currentModeLabel}</strong>
          </div>
        </div>

        <section className="guide-panel__routes">
          <div className="guide-panel__section-head">
            <span>游园走法</span>
            <strong>{currentSpot ? '顺着这一处继续延展' : '先挑一条气口进入'}</strong>
          </div>

          <div className="guide-route-grid">
            {visibleRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                className={[
                  'guide-route-card',
                  activeRoute?.id === route.id ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleRouteSelect(route)}
              >
                <small>{route.subtitle}</small>
                <strong>{route.title}</strong>
                <p>{route.description}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="guide-panel__quick">
          <button
            type="button"
            onClick={() =>
              void sendGuideRequest('请先轻讲一段', currentSpot ? 'story' : 'welcome')
            }
          >
            先听一段
          </button>
          <button
            type="button"
            onClick={() =>
              void sendGuideRequest(
                '帮我看看这些图像应该怎么读',
                currentSpot ? 'image' : 'ask',
              )
            }
          >
            看图说景
          </button>
          <button
            type="button"
            onClick={() =>
              void sendGuideRequest(
                activeRoute ? `沿着「${activeRoute.title}」接着往下走` : '推荐我接下来该怎么走',
                'route',
              )
            }
          >
            接着往下走
          </button>
        </div>

        <div className="guide-panel__suggestions">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendGuideRequest(prompt, currentSpot ? 'ask' : 'welcome')}
            >
              {prompt}
            </button>
          ))}
        </div>

        <section className="guide-panel__notes">
          <div className="guide-panel__section-head">
            <span>行游札记</span>
            <strong>{messages.length > 0 ? '导游的话会续写在这里' : '先由一段引语开头'}</strong>
          </div>

          <div className="guide-thread">
            {messages.map((message) => (
              <article
                key={message.id}
                className={[
                  'guide-message',
                  message.role === 'user' ? 'is-user' : 'is-guide',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {message.role === 'guide' ? (
                  <span className="guide-message__eyebrow">{message.title ?? '泉上引语'}</span>
                ) : (
                  <span className="guide-message__eyebrow">你轻声问起</span>
                )}

                <p>{message.content}</p>

                {message.suggestedSpotIds?.length ? (
                  <div className="guide-message__route">
                    {message.suggestedSpotIds
                      .map((spotId) => allSpots.find((candidate) => candidate.id === spotId))
                      .filter((spot): spot is HeritageSpot => spot !== undefined)
                      .map((spot) => (
                        <button key={spot.id} type="button" onClick={() => onOpenSpot(spot.id)}>
                          {spot.name}
                        </button>
                      ))}
                  </div>
                ) : null}

                {message.suggestedPrompts?.length ? (
                  <div className="guide-message__chips">
                    {message.suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendGuideRequest(prompt, 'ask')}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}

            {isPending ? (
              <article className="guide-message is-guide is-pending">
                <span className="guide-message__eyebrow">导游正在整理语气</span>
                <p>稍候片刻，我把眼前这一段景与旧事重新替你串一下。</p>
              </article>
            ) : null}

            <div ref={messageEndRef} />
          </div>
        </section>

        <div className="guide-panel__ask-toggle">
          <button type="button" onClick={() => setIsComposerOpen((current) => !current)}>
            {isComposerOpen ? '先把这一问收起' : '低声问一句'}
          </button>
        </div>

        {isComposerOpen ? (
          <form className="guide-panel__composer" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={currentSpot ? `想问问 ${currentSpot.name} 的什么？` : '可以问我从哪条线开始游览'}
              rows={3}
            />
            <button type="submit" disabled={isPending}>
              请导游接一句
            </button>
          </form>
        ) : null}
      </aside>
    </div>
  )
}
