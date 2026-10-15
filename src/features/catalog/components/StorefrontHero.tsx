import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/LanguageProvider'
import { Sparkle, RibbonBow, PearlOrnament } from '@/components/ui/ornaments'
import { ProductImage } from './ProductImage'
import type { Product } from '../types'

interface StorefrontHeroProps {
  title: string
  subtitle: string
  salePercent: number
  featured?: Product
}

export function StorefrontHero({ title, subtitle, salePercent, featured }: StorefrontHeroProps) {
  const { t, lang } = useLanguage()
  return (
    <section
      aria-labelledby="hero-heading"
      className="storefront-hero storefront-enter relative overflow-hidden rounded-card border border-border bg-surface px-5 py-8 shadow-card sm:p-10 lg:p-12"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-6 text-center lg:text-start">
          <p className="inline-flex items-center gap-2 text-small font-semibold text-brand">
            <RibbonBow className="size-5" />
            {t.hero.eyebrow}
          </p>
          <div className="space-y-4">
            <h1
              id="hero-heading"
              className="font-accent text-display font-bold leading-relaxed text-brand text-balance"
            >
              {title}
            </h1>
            <p className="mx-auto max-w-md text-body leading-relaxed text-text-muted lg:mx-0">
              {subtitle}
            </p>
          </div>
          {salePercent > 0 && (
            <p className="inline-flex items-center gap-2 rounded-pill border border-border bg-surface-tint px-4 py-2 text-small font-semibold text-brand">
              <Sparkle className="size-4" />
              {t('hero.title', { n: salePercent })}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <a
              href="#browse"
              className="ui-control ui-button inline-flex items-center justify-center gap-3 rounded-pill bg-brand px-6 py-3 font-semibold text-brand-contrast shadow-pill"
            >
              {salePercent > 0 ? t.hero.cta : t.hero.shopCta}
              <span aria-hidden="true">{lang === 'ar' ? '←' : '→'}</span>
            </a>
            <a
              href="#store"
              className="ui-control ui-button inline-flex items-center justify-center rounded-pill border border-border-input bg-surface px-5 py-3 font-semibold text-text"
            >
              {t.catalog.exploreStore}
            </a>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 text-text-muted lg:justify-start">
            <PearlOrnament className="h-6 w-20 text-sand" />
            <span className="text-caption">{t.hero.littleThings}</span>
          </div>
        </div>
        <div className="min-w-0 px-2 pt-2">
          <figure>
            <div className="storefront-photo rounded-card border border-border bg-surface p-2 shadow-card sm:p-3">
              <ProductImage
                src="/brand/cozy-still-life.webp"
                srcSet="/brand/cozy-still-life-small.webp 720w, /brand/cozy-still-life.webp 1200w"
                sizes="(min-width: 1024px) 520px, (min-width: 640px) 600px, 90vw"
                alt=""
                aspectRatio="4/3"
                loading="eager"
                fetchPriority="high"
                width={1200}
                height={900}
              />
            </div>
            <figcaption className="storefront-caption flex items-center gap-3 rounded-pill border border-border bg-surface px-5 py-3 text-small font-semibold text-brand shadow-pill">
              <RibbonBow className="size-5 shrink-0" />
              {t.hero.photoCaption}
            </figcaption>
          </figure>
          {featured && (
            <Link
              to={`/product/${featured.id}`}
              className="mx-auto mt-6 flex w-fit max-w-full items-center gap-3 rounded-card border border-border bg-surface p-3 text-start"
            >
              <ProductImage src={featured.image_url} alt="" className="w-14! shrink-0" />
              <span>
                <span className="block text-caption text-text-muted">{t.section.bestsellers}</span>
                <span className="text-small font-semibold text-brand">
                  {lang === 'ar' ? featured.name_ar || featured.name : featured.name}
                </span>
              </span>
              <span aria-hidden="true" className="px-2 text-brand">
                {lang === 'ar' ? '←' : '→'}
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
