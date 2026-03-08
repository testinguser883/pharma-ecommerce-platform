import type { Metadata } from 'next'
import { HomePageContent } from '@/components/home-page-content'
import { siteInputs } from '@/lib/site-inputs'

export const metadata: Metadata = {
  title: siteInputs.home.seoTitle,
  description: siteInputs.home.seoDescription,
  keywords: siteInputs.home.seoKeywords,
}

export default function HomePage() {
  return <HomePageContent />
}
