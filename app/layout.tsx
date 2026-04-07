import type { Metadata } from 'next'
import { fetchQuery } from 'convex/nextjs'
import { headers } from 'next/headers'
import './globals.css'
import { api } from '@/convex/_generated/api'
import { ConvexClientProvider } from './convex-client-provider'
import { getToken } from '@/lib/auth-server'
import { buildProductSchemas, buildSiteSchemas } from '@/lib/home-schema'
import { siteInputs } from '@/lib/site-inputs'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pharma eCommerce Platform',
  description: 'Trusted online pharmaceutical platform with secure authentication and real-time cart sync.',
}

function serializeJsonLd(schema: unknown) {
  return JSON.stringify(schema).replace(/</g, '\\u003c')
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getToken()
  const pathname = (await headers()).get('x-pathname') ?? ''
  const isHomePage = pathname === '/'
  const googleTagId = isHomePage ? siteInputs.home.googleTagId.trim() : ''
  let schemas: unknown[] = buildSiteSchemas()

  if (isHomePage) {
    const recommendedProducts = await fetchQuery(api.products.listRecommended)
    const fallbackProducts =
      recommendedProducts.length > 0 ? recommendedProducts : await fetchQuery(api.products.list, { limit: 8 })
    schemas = [...schemas, ...buildProductSchemas(fallbackProducts)]
  }

  return (
    <html lang="en">
      <head>
        {googleTagId ? <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`} /> : null}
        {googleTagId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(googleTagId)});
              `,
            }}
          />
        ) : null}
        {schemas.map((schema, index) => (
          <script
            key={`home-schema-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
          />
        ))}
      </head>
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js');
  navigator.serviceWorker.addEventListener('message', (e) => {
    if(e.data?.type === 'IMAGE_UPDATED'){
      document.querySelectorAll('img[src="' + e.data.url + '"]').forEach((img) => {
        img.src = e.data.url + '?t=' + Date.now();
      });
    }
  });
}`,
          }}
        />
        <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
      </body>
    </html>
  )
}
