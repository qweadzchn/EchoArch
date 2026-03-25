import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { headerNavItems, type AppRoute, type NavKey } from './ppt-router'

export type BreadcrumbItem = {
  label: string
  path?: string
}

type SiteHeaderProps = {
  activeNav: NavKey
  route: AppRoute
  visitedCount: number
  onNavigate: (path: string) => void
  onOpenGuide: () => void
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
  onNavigate: (path: string) => void
}

type CultureTabsProps = {
  active: 'academy' | 'steles'
  onNavigate: (path: string) => void
}

type ScrollCueProps = {
  className?: string
  label?: string
  targetId?: string
  threshold?: number
}

export function SiteHeader({
  activeNav,
  route,
  visitedCount,
  onNavigate,
  onOpenGuide,
}: SiteHeaderProps) {
  const activeNavItem = headerNavItems.find((item) => item.id === activeNav)

  return (
    <header className="ea-header" data-route={route.page}>
      <div className="ea-header__rail">
        <button
          type="button"
          className="ea-header__brand"
          onClick={() => onNavigate('/')}
        >
          <span>EchoArch</span>
          <strong>百泉湖古建筑群</strong>
        </button>

        <div className="ea-header__peek" aria-hidden="true">
          <span>当前分卷</span>
          <strong>{activeNavItem?.label ?? '首页'}</strong>
        </div>

        <nav className="ea-header__nav" aria-label="主导航">
          {headerNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeNav ? 'is-active' : undefined}
              onClick={() => onNavigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ea-header__side">
          <button
            type="button"
            className="ea-header__guide"
            onClick={onOpenGuide}
          >
            唤醒导游
          </button>

          <div className="ea-header__status">
            <span>已驻足</span>
            <strong>{String(visitedCount).padStart(2, '0')} 处</strong>
          </div>
        </div>
      </div>
    </header>
  )
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <div className="ea-crumbs" aria-label="页面层级">
      {items.map((item, index) => {
        const path = item.path

        return (
          <span key={`${item.label}-${index}`}>
            {path ? (
              <button type="button" onClick={() => onNavigate(path)}>
                {item.label}
              </button>
            ) : (
              <strong>{item.label}</strong>
            )}
            {index < items.length - 1 ? <i>/</i> : null}
          </span>
        )
      })}
    </div>
  )
}

export function CultureTabs({ active, onNavigate }: CultureTabsProps) {
  return (
    <div className="ea-culture-tabs" aria-label="文脉流长分支导航">
      <button
        type="button"
        className={active === 'academy' ? 'is-active' : undefined}
        onClick={() => onNavigate('/academy')}
      >
        百泉书院历史变迁
      </button>
      <button
        type="button"
        className={active === 'steles' ? 'is-active' : undefined}
        onClick={() => onNavigate('/steles')}
      >
        百泉碑刻欣赏
      </button>
    </div>
  )
}

export function ScrollCue({
  className,
  label = '继续下探',
  targetId,
  threshold = 40,
}: ScrollCueProps) {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    const syncVisibility = () => {
      setIsHidden(window.scrollY > threshold)
    }

    syncVisibility()
    window.addEventListener('scroll', syncVisibility, { passive: true })

    return () => {
      window.removeEventListener('scroll', syncVisibility)
    }
  }, [threshold])

  function handleClick(event: ReactMouseEvent<HTMLButtonElement>) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const fallbackTarget = event.currentTarget.closest('section')?.nextElementSibling
    const target =
      (targetId ? document.getElementById(targetId) : fallbackTarget) ?? null

    if (!(target instanceof HTMLElement)) {
      return
    }

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <button
      type="button"
      className={['ea-scrollcue', isHidden ? 'is-hidden' : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-label={`${label}，滚动到下一部分`}
      onClick={handleClick}
    >
      <span>{label}</span>
      <i aria-hidden="true">
        <b />
      </i>
    </button>
  )
}
