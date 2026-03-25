import { useEffect, useRef, useState } from 'react'
import {
  academyEraArticles,
  academyIntro,
  steleCategories,
  steleIntro,
  type AcademyEraArticle,
  type SteleCategory,
} from './data/ppt-content'
import { Breadcrumbs, CultureTabs } from './ppt-shell'
import {
  getEraPath,
  getSiblings,
  getSpotPath,
  getStelePath,
  spotById,
} from './ppt-router'

type AcademyHubPageProps = {
  onNavigate: (path: string) => void
}

type AcademyEraPageProps = {
  article: AcademyEraArticle
  onNavigate: (path: string) => void
  onOpenSpot: (spotId: string) => void
}

type SteleHubPageProps = {
  activeCategoryId: string
  onNavigate: (path: string) => void
  onOpenSpot: (spotId: string) => void
  onSelectCategory: (categoryId: string) => void
}

type SteleDetailPageProps = {
  category: SteleCategory
  onNavigate: (path: string) => void
  onOpenSpot: (spotId: string) => void
}

export function AcademyHubPage({ onNavigate }: AcademyHubPageProps) {
  const [activeEraId, setActiveEraId] = useState<string>(
    academyEraArticles[0]?.id ?? '',
  )
  const activeEraButtonRef = useRef<HTMLButtonElement | null>(null)
  const activeArticle =
    academyEraArticles.find((article) => article.id === activeEraId) ??
    academyEraArticles[0]
  const relatedSpot = activeArticle
    ? (spotById.get(activeArticle.spotId) ?? null)
    : null

  useEffect(() => {
    activeEraButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [activeEraId])

  if (!activeArticle) {
    return null
  }

  return (
    <div className="ea-route ea-academy">
      <section
        className="ea-page-shell ea-banner ea-banner--culture"
        style={{ backgroundImage: 'url(/ppt/wenmai/academy/song.png)' }}
      >
        <Breadcrumbs
          items={[{ label: '首页', path: '/' }, { label: '文脉流长' }]}
          onNavigate={onNavigate}
        />
        <div className="ea-banner__copy">
          <span className="ea-kicker">文脉流长</span>
          <h1>{academyIntro.title}</h1>
          <p>{academyIntro.lead}</p>
        </div>
      </section>

      <section className="ea-page-shell ea-section">
        <CultureTabs active="academy" onNavigate={onNavigate} />

        <div className="ea-academy__lead ea-academy__lead--timeline">
          <article className="ea-academy__introcopy">
            {academyIntro.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 22)}>{paragraph}</p>
            ))}
          </article>

          <button
            type="button"
            className="ea-related ea-related--subtle"
            onClick={() => onNavigate('/steles')}
          >
            <span>文脉别卷</span>
            <strong>转入百泉碑刻欣赏</strong>
            <p>
              从书院到碑廊，既是空间上的转身，也是从教育史走向书法史的另一重观看。
            </p>
          </button>
        </div>

        <article className="ea-timeline-stage">
          <img
            className="ea-timeline-stage__image"
            src={activeArticle.imageSrc}
            alt={activeArticle.imageAlt}
            loading="lazy"
          />
          <div className="ea-timeline-stage__veil" />

          <div className="ea-timeline-stage__content">
            <span className="ea-kicker">{activeArticle.era}</span>
            <h2>{activeArticle.title}</h2>
            <p>{activeArticle.summary}</p>

            <div className="ea-timeline-stage__body">
              {activeArticle.paragraphs.slice(0, 2).map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>

            <div className="ea-actions">
              <button type="button" onClick={() => onNavigate(getEraPath(activeArticle.id))}>
                展开这一时期
              </button>
              {relatedSpot ? (
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onNavigate(getSpotPath(relatedSpot.id))}
                >
                  去看相关空间
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <div className="ea-timeline">
          <div className="ea-timeline__line" />
          <div className="ea-timeline__rail">
            {academyEraArticles.map((article, index) => (
              <button
                key={article.id}
                ref={article.id === activeArticle.id ? activeEraButtonRef : null}
                type="button"
                className={article.id === activeArticle.id ? 'is-active' : undefined}
                onClick={() => setActiveEraId(article.id)}
              >
                <i>{String(index + 1).padStart(2, '0')}</i>
                <span>{article.era}</span>
                <strong>{article.title}</strong>
                <small>{article.summary}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="ea-era-grid">
          {academyEraArticles.map((article) => (
            <button
              key={article.id}
              type="button"
              className="ea-era-card"
              onClick={() => onNavigate(getEraPath(article.id))}
            >
              <img src={article.imageSrc} alt={article.imageAlt} loading="lazy" />
              <div>
                <span>{article.era}</span>
                <strong>{article.title}</strong>
                <p>{article.summary}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export function AcademyEraPage({
  article,
  onNavigate,
  onOpenSpot,
}: AcademyEraPageProps) {
  const relatedSpot = spotById.get(article.spotId) ?? null
  const siblings = getSiblings(academyEraArticles, article.id)
  const leadParagraph = article.paragraphs[0] ?? article.summary
  const remainingParagraphs =
    article.paragraphs.length > 1 ? article.paragraphs.slice(1) : [article.summary]
  const eraIndex = academyEraArticles.findIndex((entry) => entry.id === article.id)
  const relatedImage = relatedSpot?.images[0] ?? null

  return (
    <div className="ea-route ea-chapter ea-chapter--academy">
      <section className="ea-chapter-hero">
        <div className="ea-chapter-hero__media">
          <img
            src={article.imageSrc}
            alt={article.imageAlt}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="ea-chapter-hero__veil ea-chapter-hero__veil--academy" />

        <div className="ea-page-shell ea-chapter-hero__inner">
          <Breadcrumbs
            items={[
              { label: '首页', path: '/' },
              { label: '文脉流长', path: '/academy' },
              { label: article.era },
            ]}
            onNavigate={onNavigate}
          />

          <div className="ea-chapter-hero__body">
            <div className="ea-chapter-hero__copy">
              <span className="ea-kicker">{article.era}</span>
              <h1>{article.title}</h1>
              <p>{article.subtitle}</p>

              <div className="ea-actions">
                {relatedSpot ? (
                  <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                    去看对应空间
                  </button>
                ) : null}
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onNavigate('/steles')}
                >
                  转入碑刻分卷
                </button>
              </div>
            </div>

            <aside className="ea-chapter-hero__note">
              <span>时代位置</span>
              <strong>{article.era}</strong>
              <p>{article.summary}</p>
            </aside>
          </div>

          <div className="ea-chapter-hero__footer">
            <div className="ea-chapter-hero__stat">
              <span>历时序号</span>
              <strong>
                {String(eraIndex + 1).padStart(2, '0')} / {academyEraArticles.length}
              </strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>关联空间</span>
              <strong>{relatedSpot?.name ?? '书院遗址'}</strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>文脉后续</span>
              <strong>顺时进入碑刻分卷</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ea-page-shell ea-chapter-subnav">
        <CultureTabs active="academy" onNavigate={onNavigate} />
      </section>

      <section className="ea-page-shell ea-chapter-frame">
        <aside className="ea-chapter-frame__aside">
          <article className="ea-chapter-note">
            <span>时代线索</span>
            <strong>{article.title}</strong>
            <p>沿着时代推进阅读，百泉由讲学之地、书院重镇，再到行宫空间的转折会更清晰。</p>
          </article>

          <div className="ea-chapter-index ea-chapter-index--timeline">
            {academyEraArticles.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === article.id ? 'is-active' : undefined}
                onClick={() => onNavigate(getEraPath(entry.id))}
              >
                <i>{entry.era}</i>
                <strong>{entry.title}</strong>
                <small>{entry.summary}</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="ea-chapter-frame__main">
          <article className="ea-scroll-essay">
            <header className="ea-scroll-essay__header">
              <span className="ea-article__eyebrow">{article.summary}</span>
              <h2>{article.title}</h2>
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

          <section className="ea-scene-panel ea-scene-panel--academy">
            <div className="ea-scene-panel__visual">
              <img
                src={relatedImage?.src ?? article.imageSrc}
                alt={relatedImage?.alt ?? article.imageAlt}
                loading="lazy"
              />
              <div className="ea-scene-panel__veil" />
            </div>

            <div className="ea-scene-panel__copy">
              <span>由文脉回到空间</span>
              <h3>{relatedSpot?.name ?? '相关空间'}</h3>
              <p>{relatedSpot?.description ?? article.summary}</p>
              <p>
                {relatedImage?.caption ??
                  '当时代叙事重新落回具体景处，书院、祠堂、行宫与碑廊之间的关系会更直观地显现出来。'}
              </p>
              {relatedSpot ? (
                <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                  进入这处空间
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
            onClick={() => onNavigate(getEraPath(siblings.previous.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.previous.imageSrc}
                alt={siblings.previous.imageAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>上一时期</span>
              <strong>{siblings.previous.era}</strong>
              <p>{siblings.previous.title}</p>
            </div>
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="ea-journey-return"
          onClick={() => onNavigate('/academy')}
        >
          回到历史总览
        </button>

        {siblings.next ? (
          <button
            type="button"
            className="ea-journey-card"
            onClick={() => onNavigate(getEraPath(siblings.next.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.next.imageSrc}
                alt={siblings.next.imageAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>下一时期</span>
              <strong>{siblings.next.era}</strong>
              <p>{siblings.next.title}</p>
            </div>
          </button>
        ) : (
          <span />
        )}
      </section>
    </div>
  )
}

export function SteleHubPage({
  activeCategoryId,
  onNavigate,
  onOpenSpot,
  onSelectCategory,
}: SteleHubPageProps) {
  const activeCategory =
    steleCategories.find((category) => category.id === activeCategoryId) ??
    steleCategories[0]

  if (!activeCategory) {
    return null
  }

  const relatedSpot = spotById.get(activeCategory.spotId) ?? null

  return (
    <div className="ea-route ea-steles">
      <section
        className="ea-page-shell ea-banner ea-banner--culture"
        style={{ backgroundImage: `url(${activeCategory.coverImage})` }}
      >
        <Breadcrumbs
          items={[
            { label: '首页', path: '/' },
            { label: '文脉流长', path: '/academy' },
            { label: '百泉碑刻欣赏' },
          ]}
          onNavigate={onNavigate}
        />
        <div className="ea-banner__copy">
          <span className="ea-kicker">百泉碑刻欣赏</span>
          <h1>{steleIntro.title}</h1>
          <p>{steleIntro.paragraphs[0]}</p>
        </div>
      </section>

      <section className="ea-page-shell ea-section">
        <CultureTabs active="steles" onNavigate={onNavigate} />

        <article className="ea-panel ea-steles__lead">
          {steleIntro.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 22)}>{paragraph}</p>
          ))}
        </article>

        <article className="ea-stele-stage">
          <div className="ea-stele-stage__image">
            <img
              src={activeCategory.coverImage}
              alt={activeCategory.coverAlt}
              loading="lazy"
            />
            <div className="ea-stele-stage__veil" />
          </div>

          <div className="ea-stele-stage__copy">
            <span className="ea-kicker">{activeCategory.era}</span>
            <h2>{activeCategory.title}</h2>
            <p>{activeCategory.summary}</p>
            <div className="ea-pill-row">
              <span>{activeCategory.gallery.length} 幅碑刻图像</span>
              {relatedSpot ? <span>关联景点：{relatedSpot.name}</span> : null}
            </div>
            <div className="ea-actions">
              <button
                type="button"
                onClick={() => onNavigate(getStelePath(activeCategory.id))}
              >
                进入这一分卷
              </button>
              {relatedSpot ? (
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onOpenSpot(relatedSpot.id)}
                >
                  查看对应空间
                </button>
              ) : null}
            </div>
          </div>
        </article>

        <div className="ea-stele-card-grid">
          {steleCategories.map((category, index) => {
            const categorySpot = spotById.get(category.spotId) ?? null

            return (
              <button
                key={category.id}
                type="button"
                className={[
                  'ea-stele-card',
                  category.id === activeCategory.id ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseEnter={() => onSelectCategory(category.id)}
                onFocus={() => onSelectCategory(category.id)}
                onClick={() => onNavigate(getStelePath(category.id))}
              >
                <div className="ea-stele-card__image">
                  <img src={category.coverImage} alt={category.coverAlt} loading="lazy" />
                </div>
                <div className="ea-stele-card__copy">
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <span>{category.era}</span>
                  <strong>{category.title}</strong>
                  <p>{category.summary}</p>
                  <div className="ea-pill-row">
                    <span>{category.gallery.length} 幅图像</span>
                    {categorySpot ? <span>{categorySpot.name}</span> : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function SteleDetailPage({
  category,
  onNavigate,
  onOpenSpot,
}: SteleDetailPageProps) {
  const relatedSpot = spotById.get(category.spotId) ?? null
  const siblings = getSiblings(steleCategories, category.id)
  const featuredImage = category.gallery[0] ?? null
  const remainingImages = featuredImage ? category.gallery.slice(1) : []
  const categoryIndex = steleCategories.findIndex((entry) => entry.id === category.id)

  return (
    <div className="ea-route ea-chapter ea-chapter--stele">
      <section className="ea-chapter-hero">
        <div className="ea-chapter-hero__media">
          <img
            src={category.coverImage}
            alt={category.coverAlt}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="ea-chapter-hero__veil ea-chapter-hero__veil--stele" />

        <div className="ea-page-shell ea-chapter-hero__inner">
          <Breadcrumbs
            items={[
              { label: '首页', path: '/' },
              { label: '文脉流长', path: '/academy' },
              { label: '百泉碑刻欣赏', path: '/steles' },
              { label: category.era },
            ]}
            onNavigate={onNavigate}
          />

          <div className="ea-chapter-hero__body">
            <div className="ea-chapter-hero__copy">
              <span className="ea-kicker">{category.era}</span>
              <h1>{category.title}</h1>
              <p>{category.summary}</p>

              <div className="ea-actions">
                {relatedSpot ? (
                  <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                    去看碑刻所在空间
                  </button>
                ) : null}
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onNavigate('/steles')}
                >
                  回到碑刻分卷页
                </button>
              </div>
            </div>

            <aside className="ea-chapter-hero__note">
              <span>观碑分卷</span>
              <strong>{category.era}</strong>
              <p>本卷收录 {category.gallery.length} 幅碑刻图像，可从字形、刀法、题记与时代气息层层细看。</p>
            </aside>
          </div>

          <div className="ea-chapter-hero__footer">
            <div className="ea-chapter-hero__stat">
              <span>分卷序号</span>
              <strong>
                {String(categoryIndex + 1).padStart(2, '0')} / {steleCategories.length}
              </strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>图像数量</span>
              <strong>{category.gallery.length} 幅碑刻图像</strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>关联空间</span>
              <strong>{relatedSpot?.name ?? '碑廊'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ea-page-shell ea-chapter-subnav">
        <CultureTabs active="steles" onNavigate={onNavigate} />
      </section>

      <section className="ea-page-shell ea-chapter-frame">
        <aside className="ea-chapter-frame__aside">
          <article className="ea-chapter-note">
            <span>观碑四法</span>
            <strong>先看字势，再辨时代</strong>
            <p>可依次从字形、刀法、题记和整体气韵四个角度观看，让碑刻不止是图片浏览，而像在廊中缓步细看。</p>
          </article>

          <div className="ea-chapter-index">
            {steleCategories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={entry.id === category.id ? 'is-active' : undefined}
                onClick={() => onNavigate(getStelePath(entry.id))}
              >
                <i>{entry.era}</i>
                <strong>{entry.title}</strong>
                <small>{entry.gallery.length} 幅图像</small>
              </button>
            ))}
          </div>
        </aside>

        <div className="ea-chapter-frame__main">
          <article className="ea-scroll-essay ea-scroll-essay--stele">
            <header className="ea-scroll-essay__header">
              <span className="ea-article__eyebrow">{category.era}</span>
              <h2>{category.title}</h2>
              <p className="ea-scroll-essay__lead">{category.summary}</p>
            </header>

            <div className="ea-scroll-essay__body">
              <section className="ea-scroll-essay__section">
                <i>01</i>
                <p>本卷共收录 {category.gallery.length} 幅碑刻图像，适合先从时代整体气息进入，再逐幅辨识细部。</p>
              </section>
              <section className="ea-scroll-essay__section">
                <i>02</i>
                <p>其中既有题亭留名，也有诗文刻石与人物图像，能看见百泉在书院、园林与碑廊之间生成的文脉层次。</p>
              </section>
            </div>
          </article>

          <section className="ea-exhibit-river">
            <div className="ea-exhibit-river__lead">
              {featuredImage ? (
                <figure className="ea-exhibit-river__figure ea-exhibit-river__figure--featured">
                  <img src={featuredImage.src} alt={featuredImage.alt} loading="lazy" />
                  <figcaption>{featuredImage.caption}</figcaption>
                </figure>
              ) : null}

              <article className="ea-exhibit-river__note">
                <span>卷中导览</span>
                <strong>{relatedSpot?.name ?? category.title}</strong>
                <p>{relatedSpot?.description ?? category.summary}</p>
                {relatedSpot ? (
                  <button type="button" onClick={() => onOpenSpot(relatedSpot.id)}>
                    进入碑刻所在空间
                  </button>
                ) : null}
              </article>
            </div>

            {remainingImages.length ? (
              <div className="ea-exhibit-river__grid">
                {remainingImages.map((image, index) => (
                  <figure key={`${image.src}-${index}`} className="ea-exhibit-river__figure">
                    <img src={image.src} alt={image.alt} loading="lazy" />
                    <figcaption>{image.caption}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="ea-page-shell ea-journey-grid">
        {siblings.previous ? (
          <button
            type="button"
            className="ea-journey-card"
            onClick={() => onNavigate(getStelePath(siblings.previous.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.previous.coverImage}
                alt={siblings.previous.coverAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>上一分卷</span>
              <strong>{siblings.previous.era}</strong>
              <p>{siblings.previous.title}</p>
            </div>
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          className="ea-journey-return"
          onClick={() => onNavigate('/steles')}
        >
          回到碑刻总览
        </button>

        {siblings.next ? (
          <button
            type="button"
            className="ea-journey-card"
            onClick={() => onNavigate(getStelePath(siblings.next.id))}
          >
            <div className="ea-journey-card__image">
              <img
                src={siblings.next.coverImage}
                alt={siblings.next.coverAlt}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>下一分卷</span>
              <strong>{siblings.next.era}</strong>
              <p>{siblings.next.title}</p>
            </div>
          </button>
        ) : (
          <span />
        )}
      </section>
    </div>
  )
}
