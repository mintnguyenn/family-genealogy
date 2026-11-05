'use client'

import { m, Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { useI18n } from '@/lib/i18n/useI18n'

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
}

interface LandingHeroProps {
  siteName: string
}

export default function LandingHero({ siteName }: LandingHeroProps) {
  const { t } = useI18n()

  return (
    <m.div
      className='relative z-10 w-full max-w-5xl space-y-12 text-center'
      initial='hidden'
      animate='visible'
      variants={staggerContainer}>
      <m.div
        className='flex flex-col items-center space-y-6 sm:space-y-8'
        variants={fadeIn}>
        <h1 className='max-w-4xl font-serif text-5xl leading-[1.1] font-semibold text-stone-900 sm:text-6xl md:text-7xl lg:text-[5rem]'>
          <span className='block'>{siteName}</span>
        </h1>

        <p className='mx-auto max-w-3xl text-sm leading-relaxed font-light text-stone-600'>
          {t('landingDescription')}
        </p>
      </m.div>

      <m.div
        className='relative flex w-full flex-col items-center justify-center gap-4 px-4 pt-6 sm:flex-row sm:px-0'
        variants={fadeIn}>
        <div className='absolute top-1/2 left-1/2 z-0 hidden h-16 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/30 blur-2xl sm:block'></div>
        <Link
          href='/dashboard'
          className='group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-stone-800 bg-primary px-8 py-4 text-sm font-medium text-white transition duration-300 hover:-translate-y-1 hover:border-stone-700 hover:bg-stone-800 active:translate-y-0 sm:w-auto sm:px-10 sm:py-5'>
          <span className='relative z-10 flex items-center gap-3'>
            {t('landingCta')}
            <ArrowRight className='size-5 transition-transform group-hover:translate-x-1.5' />
          </span>
        </Link>
      </m.div>
    </m.div>
  )
}
