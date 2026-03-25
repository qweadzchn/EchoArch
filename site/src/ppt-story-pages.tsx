import { openGuideCompanion } from './guide/events'
import { storyArticles, type StoryArticle } from './data/ppt-content'
import { Breadcrumbs, ScrollCue } from './ppt-shell'
import {
  getSiblings,
  getStoryPath,
  spotById,
} from './ppt-router'

type StoryHubPageProps = {
  activeStoryId: string
  onNavigate: (path: string) => void
  onOpenSpot: (spotId: string) => void
  onSelectStory: (storyId: string) => void
}

type StoryDetailPageProps = {
  story: StoryArticle
  onNavigate: (path: string) => void
  onOpenSpot: (spotId: string) => void
}

export function StoryHubPage({
  activeStoryId,
  onNavigate,
  onOpenSpot,
  onSelectStory,
}: StoryHubPageProps) {
  const activeStory =
    storyArticles.find((story) => story.id === activeStoryId) ?? storyArticles[0]

  if (!activeStory) {
    return null
  }

  const relatedSpot = spotById.get(activeStory.spotId) ?? null

  return (
    <div className="ea-route ea-story">
      <section
        className="ea-page-shell ea-banner ea-banner--story"
        style={{ backgroundImage: `url(${activeStory.heroImage})` }}
      >
        <Breadcrumbs
          items={[{ label: '首页', path: '/' }, { label: '鸾翔凤集' }]}
          onNavigate={onNavigate}
        />
        <div className="ea-banner__copy">
          <span className="ea-kicker">鸾翔凤集</span>
          <h1>先辨人物，再循其足迹入景。</h1>
          <p>岳飞、苏轼、竹林七贤、彭了凡与乾隆南巡，让百泉的湖山、碑刻、书院与行宫一层层显出人文回声。</p>
        </div>
      </section>

      <section className="ea-page-shell ea-story-stage">
        <div className="ea-story-stage__rail">
          {storyArticles.map((story) => (
            <button
              key={story.id}
              type="button"
              className={story.id === activeStory.id ? 'is-active' : undefined}
              onClick={() => onSelectStory(story.id)}
            >
              <span>{story.deck}</span>
              <strong>{story.label}</strong>
              <small>{story.preview}</small>
            </button>
          ))}
        </div>

        <article className="ea-story-stage__feature">
          <div className="ea-story-stage__visual">
            <img src={activeStory.heroImage} alt={activeStory.heroAlt} loading="lazy" />
            <div className="ea-story-stage__veil" />
          </div>

          <div className="ea-story-stage__copy">
            <div className="ea-story-stage__header">
              <span>{activeStory.deck}</span>
              <h2>{activeStory.title}</h2>
              <p>{activeStory.preview}</p>
            </div>

            <div className="ea-story-stage__meta">
              <div>
                <span>关联景点</span>
                <strong>{relatedSpot?.name ?? '人物线索'}</strong>
                <p>{relatedSpot?.description ?? '从人物旧事切入，再回到建筑现场。'}</p>
              </div>
              <div>
                <span>阅读方式</span>
                <strong>先识人物，再循景入园</strong>
                <p>把人物、碑刻、建筑与时代背景串成一条更完整的浏览路径。</p>
              </div>
            </div>

            <div className="ea-actions">
              <button type="button" onClick={() => onNavigate(getStoryPath(activeStory.id))}>
                展开人物篇章
              </button>
              {relatedSpot ? (
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onOpenSpot(relatedSpot.id)}
                >
                  去相关景点
                </button>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

export function StoryDetailPage({
  story,
  onNavigate,
  onOpenSpot,
}: StoryDetailPageProps) {
  const relatedSpot = spotById.get(story.spotId) ?? null
  const siblings = getSiblings(storyArticles, story.id)
  const leadParagraph = story.paragraphs[0] ?? story.preview
  const remainingParagraphs =
    story.paragraphs.length > 1 ? story.paragraphs.slice(1) : [story.preview]
  const storyIndex = storyArticles.findIndex((entry) => entry.id === story.id)
  const relatedImage = relatedSpot?.images[0] ?? null

  return (
    <div className="ea-route ea-chapter ea-chapter--story">
      <section className="ea-chapter-hero">
        <div className="ea-chapter-hero__media">
          <img
            src={story.heroImage}
            alt={story.heroAlt}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="ea-chapter-hero__veil" />

        <div className="ea-page-shell ea-chapter-hero__inner">
          <Breadcrumbs
            items={[
              { label: '首页', path: '/' },
              { label: '鸾翔凤集', path: '/stories' },
              { label: story.label },
            ]}
            onNavigate={onNavigate}
          />

          <div className="ea-chapter-hero__body">
            <div className="ea-chapter-hero__copy">
              <span className="ea-kicker">{story.deck}</span>
              <h1>{story.detailTitle}</h1>
              <p>{story.detailSubtitle}</p>

              <div className="ea-actions">
                {relatedSpot ? (
                  <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                    前往相关景处
                  </button>
                ) : null}
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() =>
                    openGuideCompanion({
                      mode: 'story',
                      prompt: `请以导游口吻继续讲${story.title}与百泉的关联，并推荐我下一步该去哪里。`,
                    })
                  }
                >
                  让导游接着讲
                </button>
              </div>
            </div>

            <aside className="ea-chapter-hero__note">
              <span>人物入卷</span>
              <strong>{story.label}</strong>
              <p>{story.preview}</p>
            </aside>
          </div>

          <div className="ea-chapter-hero__footer">
            <div className="ea-chapter-hero__stat">
              <span>人物卷次</span>
              <strong>
                {String(storyIndex + 1).padStart(2, '0')} / {storyArticles.length}
              </strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>落点景处</span>
              <strong>{relatedSpot?.name ?? '人物线索'}</strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>阅读方式</span>
              <strong>先识人物，再循景入园</strong>
            </div>
          </div>
        </div>

        <ScrollCue label="继续入卷" />
      </section>

      <section className="ea-page-shell ea-chapter-frame">
        <aside className="ea-chapter-frame__aside">
          <article className="ea-chapter-note">
            <span>卷中指引</span>
            <strong>{relatedSpot?.name ?? story.label}</strong>
            <p>
              {relatedSpot?.description ??
                '从人物旧事切入，再回到古建筑与湖山现场，观看会更有层次。'}
            </p>
          </article>

          <div className="ea-chapter-index">
            {storyArticles.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === story.id ? 'is-active' : undefined}
                onClick={() => onNavigate(getStoryPath(entry.id))}
              >
                <i>{String(index + 1).padStart(2, '0')}</i>
                <strong>{entry.label}</strong>
                <small>{entry.deck}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="ea-chapter-frame__main">
          <article className="ea-scroll-essay">
            <header className="ea-scroll-essay__header">
              <span className="ea-article__eyebrow">{story.title}</span>
              <h2>{story.detailTitle}</h2>
              <p className="ea-scroll-essay__lead">{leadParagraph}</p>
            </header>

            <div className="ea-scroll-essay__body">
              {remainingParagraphs.map((paragraph, index) => (
                <section
                  key={paragraph.slice(0, 28)}
                  className="ea-scroll-essay__section"
                >
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <p>{paragraph}</p>
                </section>
              ))}
            </div>
          </article>

          <section className="ea-scene-panel">
            <div className="ea-scene-panel__visual">
              <img
                src={relatedImage?.src ?? story.heroImage}
                alt={relatedImage?.alt ?? story.heroAlt}
                loading="lazy"
              />
              <div className="ea-scene-panel__veil" />
            </div>

            <div className="ea-scene-panel__copy">
              <span>循人入景</span>
              <h3>{relatedSpot?.name ?? '相关景点'}</h3>
              <p>{relatedSpot?.description ?? story.preview}</p>
              <p>
                {relatedImage?.caption ??
                  '人物线索并不止于文字，继续进入空间现场，建筑、碑刻与地景会把这段故事重新点亮。'}
              </p>
              {relatedSpot ? (
                <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                  进入这一景处
                </button>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section className="ea-page-shell ea-journey-grid">
        {siblings.previous ? (
          <button
            type="button"
            className="ea-journey-card"
            onClick={() => onNavigate(getStoryPath(siblings.previous.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.previous.heroImage}
                alt={siblings.previous.heroAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>上一篇</span>
              <strong>{siblings.previous.label}</strong>
              <p>{siblings.previous.preview}</p>
            </div>
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="ea-journey-return"
          onClick={() => onNavigate('/stories')}
        >
          回到人物总览
        </button>

        {siblings.next ? (
          <button
            type="button"
            className="ea-journey-card"
            onClick={() => onNavigate(getStoryPath(siblings.next.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.next.heroImage}
                alt={siblings.next.heroAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>下一篇</span>
              <strong>{siblings.next.label}</strong>
              <p>{siblings.next.preview}</p>
            </div>
          </button>
        ) : (
          <span />
        )}
      </section>
    </div>
  )
}
