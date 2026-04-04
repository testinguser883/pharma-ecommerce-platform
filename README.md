# Pharma eCommerce Platform

## Footer pages

`app/(shop)/.../page.tsx` - visit these respective pages to update

## Product Description Markdown

The `Full Product Description` field in the admin product form now supports a safe markdown subset.

Supported syntax:


- `#` through `######` for headings
- Plain paragraphs
- `- item` or `* item` for bullet lists
- `1. item` for numbered lists
- `**bold**`
- `*italic*`
- `` `inline code` ``
- `[link text](https://example.com)`

Notes:

- Markdown is only applied to the full product description accordion on the product page.
- The short product description remains plain text.

Example (plain markdown):

```md
# Common Use

The main component of Viagra is **Sildenafil Citrate**.

## Dosage and Direction

Usually the recommended dose is _50 mg_ before sexual activity.

### Key Benefits

- Fast acting
- Physician-guided use
- Trusted formulation
```

### Inline HTML with CSS

You can embed HTML tags with `style` and `class` attributes for richer formatting:

```html
<span style="color: red; font-weight: bold">This text is red and bold</span>

<div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0">
  This is a green info box
</div>

<p style="font-size: 18px; text-align: center; color: #0f766e">
  Centered teal text at 18px
</p>
```

Mix markdown and HTML freely:

```md
## Product Highlights

<div style="display: flex; gap: 12px; flex-wrap: wrap">
  <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-size: 14px">Sugar Free</span>
  <span style="background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-size: 14px">Vegan</span>
</div>

**Directions:** Take one tablet daily with water.

<p style="color: #dc2626; font-weight: 600">Warning: Keep out of reach of children.</p>
```

#### Allowed HTML tags

`span`, `div`, `p`, `strong`, `em`, `u`, `s`, `sub`, `sup`, `br`, `hr`,
`table`, `thead`, `tbody`, `tr`, `th`, `td`, `ul`, `ol`, `li`,
`h1`–`h6`, `blockquote`, `pre`, `code`, `img`, `a`, `small`, `mark`, `abbr`, `details`, `summary`

#### Allowed CSS properties

`color`, `background`, `background-color`, `font-size`, `font-weight`, `font-style`,
`text-align`, `text-decoration`, `text-transform`, `line-height`, `letter-spacing`,
`padding` (+ directional), `margin` (+ directional),
`border`, `border-radius`, `border-color`, `border-width`, `border-style`,
`display`, `width`, `max-width`, `min-width`, `height`, `max-height`, `min-height`,
`opacity`, `overflow`, `vertical-align`, `white-space`, `word-break`,
`flex`, `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `gap`,
`grid-template-columns`, `grid-template-rows`, `grid-gap`,
`list-style`, `list-style-type`, `box-shadow`, `text-shadow`

#### Security

- Only whitelisted tags and CSS properties are rendered
- `url()` and `expression()` in CSS values are blocked
- Links only allow `http://`, `https://`, `mailto:`, and relative `/` URLs
- All content is rendered as React components (no `dangerouslySetInnerHTML`)

## Home Page Schema Configuration

The home page now supports configurable JSON-LD schema tags through [lib/site-inputs.ts](./lib/site-inputs.ts).

Edit this section:

```ts
siteInputs.home.schema
```

Use it for business-level fields such as:

- Organization name
- Website URL
- Logo path
- Telephone
- Email
- Contact type
- Area served
- Languages
- Local business address
- Price range
- Opening hours

Auto-derived fields:

- Product links
- Product descriptions
- Product prices
- Product availability
- Product images

Those values are generated directly from the current storefront product data so they stay in sync and do not need manual editing.
