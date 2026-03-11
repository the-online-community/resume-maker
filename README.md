# Resume Maker

AI-powered resume tailoring tool. Upload your existing resumes, paste a job description, and get a polished, ATS-optimized resume in seconds — powered by GPT-5.2.

## Features

- **AI Resume Tailoring** — generates a tailored resume from your uploaded PDFs + a job description
- **From-Scratch Mode** — no resume? The AI creates a professional draft using your Google profile info
- **Live Streaming** — resume fields populate in real-time as the AI generates them
- **Inline Editing** — click any section to edit content directly; AI section rewrite via context menu
- **PDF Export** — download your tailored resume as a clean PDF
- **Dark / Light Theme** — toggle with one click
- **Google OAuth** — sign in with Google via Supabase Auth
- **Usage Limits** — 5 free tailors per account, unlimited with a Pro subscription ($5/mo)
- **Stripe Billing** — checkout, customer portal, and webhook-driven subscription sync

## Tech Stack

| Layer       | Tech                                                                   |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | [Next.js 16](https://nextjs.org) (App Router)                          |
| Language    | TypeScript                                                             |
| Styling     | [Tailwind CSS v4](https://tailwindcss.com)                             |
| UI          | [shadcn/ui](https://ui.shadcn.com) + [Radix](https://www.radix-ui.com) |
| Auth        | [Supabase Auth](https://supabase.com/auth) (Google OAuth / PKCE)       |
| Database    | [Supabase](https://supabase.com) (Postgres + Row Level Security)       |
| AI          | [OpenAI GPT-4.1](https://platform.openai.com)                          |
| Payments    | [Stripe](https://stripe.com) (Subscriptions + Webhooks)                |
| PDF Parsing | [pdf-parse](https://www.npmjs.com/package/pdf-parse)                   |
| Hosting     | [Vercel](https://vercel.com)                                           |

## Prerequisites

- **Node.js** ≥ 18 (tested on v22)
- **pnpm** (recommended) — `npm i -g pnpm`
- A **Supabase** project ([create one →](https://database.new))
- An **OpenAI** API key ([get one →](https://platform.openai.com/api-keys))
- A **Stripe** account with a subscription product ([dashboard →](https://dashboard.stripe.com))
- A **Google Cloud** OAuth 2.0 client (for Google sign-in)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/kjavedan/resume-maker.git
cd resume-maker
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Then fill in each value — see [Environment Variables](#environment-variables) below for details.

### 4. Set up the database

Run the SQL migration files in your Supabase SQL editor (`supabase/migrations/`):

1. **`create_usage_table.sql`** — tracks per-user AI tailor count
2. **`create_subscriptions_table.sql`** — stores Stripe subscription state

Both tables have Row Level Security enabled and pre-configured policies.

### 5. Configure Supabase Auth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable Google provider and paste your **Google Client ID** and **Client Secret**
3. Add your redirect URL:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
4. In **URL Configuration**, set the Site URL and Redirect URLs

### 6. Configure Stripe

1. Create a **Subscription Product** with a recurring price in the [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Copy the **Price ID** → `NEXT_PUBLIC_STRIPE_PRICE_ID`
3. Set up a webhook endpoint:
   - **Local dev**: use [Stripe CLI](https://docs.stripe.com/stripe-cli) to forward events:
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```
   - **Production**: point to `https://your-domain.com/api/stripe/webhook`
4. Subscribe to these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### 7. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env` and fill in each value:

| Variable                        | Required | Description                                                        |
| ------------------------------- | -------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY`                | ✅       | OpenAI API key (starts with `sk-`)                                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | ✅       | Supabase project URL (`https://xxx.supabase.co`)                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅       | Supabase anonymous/public key                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | ✅       | Supabase service role key (for webhook — never expose client-side) |
| `STRIPE_SECRET_KEY`             | ✅       | Stripe secret key (`sk_test_...` or `sk_live_...`)                 |
| `STRIPE_WEBHOOK_SECRET`         | ✅       | Stripe webhook signing secret (`whsec_...`)                        |
| `NEXT_PUBLIC_STRIPE_PRICE_ID`   | ✅       | Stripe Price ID for the Pro subscription (`price_...`)             |

> **Note**: Google OAuth credentials (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) are configured in the **Supabase Dashboard**, not in `.env`.

## Project Structure

```
resume-maker/
├── app/
│   ├── api/
│   │   ├── edit-section/     # AI-powered section rewrite endpoint
│   │   ├── parse-pdf/        # PDF text extraction endpoint
│   │   ├── tailor/           # Main AI resume tailoring (streamed)
│   │   ├── usage/            # Usage tracking (GET/POST)
│   │   └── stripe/
│   │       ├── checkout/     # Create Stripe checkout session
│   │       ├── portal/       # Customer billing portal
│   │       ├── subscription/ # Subscription status check
│   │       └── webhook/      # Stripe webhook handler
│   ├── auth/callback/        # Supabase OAuth callback
│   ├── layout.tsx            # Root layout with providers
│   ├── page.tsx              # Main app page
│   └── globals.css           # Global styles + Tailwind config
├── components/
│   ├── resume/
│   │   ├── resume-content.tsx    # Editable resume template renderer
│   │   ├── resume-preview.tsx    # Resume preview with toolbar
│   │   ├── resume-dropzone.tsx   # PDF upload dropzone
│   │   ├── ai-section-editor.tsx # AI section rewrite dialog
│   │   └── link-edit-popover.tsx # Inline link editor
│   ├── text-editor.tsx       # Rich text editor for job descriptions
│   ├── sign-in-button.tsx    # Google sign-in button
│   ├── user-menu.tsx         # User dropdown (avatar, usage, billing)
│   ├── footer.tsx            # App footer
│   └── ui/                   # shadcn/ui primitives
├── hooks/
│   └── use-user.ts           # Supabase auth state hook
├── lib/
│   ├── resume/
│   │   ├── resume-store.ts   # IndexedDB resume storage
│   │   ├── resume-styles.ts  # Resume CSS (screen + print)
│   │   └── templates.ts      # Resume HTML template + placeholders
│   ├── stripe.ts             # Stripe client initialization
│   ├── supabase/
│   │   ├── client.ts         # Supabase browser client
│   │   └── server.ts         # Supabase server client (cookies)
│   └── utils.ts              # Shared utilities (cn, etc.)
├── supabase/
│   └── migrations/           # SQL migration files
├── middleware.ts              # Supabase session refresh middleware
└── package.json
```

## Available Scripts

| Command             | Description                      |
| ------------------- | -------------------------------- |
| `pnpm dev`          | Start the development server     |
| `pnpm build`        | Create a production build        |
| `pnpm start`        | Serve the production build       |
| `pnpm lint`         | Run ESLint                       |
| `pnpm format`       | Format code with Prettier        |
| `pnpm format:check` | Check formatting without writing |

## Deployment

The app is designed for **Vercel**:

1. Push to GitHub
2. Import the repo into [Vercel](https://vercel.com/new)
3. Add all environment variables from `.env.example` in the Vercel project settings
4. Set up the Stripe production webhook pointing to `https://your-domain.com/api/stripe/webhook`
5. Update Supabase redirect URLs in the dashboard for your production domain

## License

MIT
