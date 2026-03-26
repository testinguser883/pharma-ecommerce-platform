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

- Raw HTML is not rendered.
- Markdown is only applied to the full product description accordion on the product page.
- The short product description remains plain text.

Example:

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
