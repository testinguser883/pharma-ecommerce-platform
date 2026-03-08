import { siteInputs } from '@/lib/site-inputs'

export default function Head() {
  const googleTagId = siteInputs.home.googleTagId.trim()

  if (!googleTagId) {
    return null
  }

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`} />
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
    </>
  )
}
