# Resume Maker

AI-powered resume tailoring tool. Upload your existing resumes, paste a job description, and get a polished, ATS-optimized resume in seconds — powered by OpenAI.

## Features

- **AI Resume Tailoring** — generates a tailored resume from your uploaded PDFs + a job description
- **From-Scratch Mode** — no resume? The AI creates a professional draft using your Google profile info
- **Resume Analyzer** — scores your resume against the job description and gives actionable improvement suggestions
- **Template Customization** — toggle sections, reorder them, pick header fields, and choose formatting options (bold headings, bullet style)
- **Live Streaming** — resume fields populate in real-time as the AI generates them
- **Inline Editing** — click any section to edit content directly; AI section rewrite via context menu
- **Speech-to-Text** — dictate job descriptions using the built-in voice input
- **PDF Export** — download your tailored resume as a clean PDF
- **Job Application Tracker** — log applications with position, company, platform, status, and notes
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
| AI          | [OpenAI](https://platform.openai.com)                                  |
| Payments    | [Stripe](https://stripe.com) (Subscriptions + Webhooks)                |
| PDF Parsing | [pdf-parse](https://www.npmjs.com/package/pdf-parse)                   |
| Hosting     | [Vercel](https://vercel.com)                                           |

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** — `npm i -g pnpm`
- A **Supabase** project ([create one →](https://database.new))
- An **OpenAI** API key ([get one →](https://platform.openai.com/api-keys))
- A **Stripe** account with a subscription product ([dashboard →](https://dashboard.stripe.com))
- A **Google Cloud** OAuth 2.0 client (for Google sign-in)

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/kjavedan/resume-maker.git
cd resume-maker
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in each value — see [Environment Variables](#environment-variables) for details.

### 3. Set up the database

Run the SQL files from `supabase/migrations/` in your **Supabase SQL Editor**, in order:

| #   | File                                 | Purpose                              |
| --- | ------------------------------------ | ------------------------------------ |
| 1   | `create_usage_table.sql`             | Tracks per-user AI tailor count      |
| 2   | `create_subscriptions_table.sql`     | Stores Stripe subscription state     |
| 3   | `create_applications_table.sql`      | Job application tracker entries      |
| 4   | `create_template_settings_table.sql` | Per-user resume template preferences |

All tables use Row Level Security with pre-configured policies.

### 4. Create the storage bucket

The job tracker lets users upload PDF resumes to Supabase Storage. Run this in the **SQL Editor**:

```sql
-- Create the "resumes" bucket (public so resume URLs are accessible)
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload files to their own folder
create policy "Users can upload own resumes"
  on storage.objects for insert
  with check (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update/overwrite their own files
create policy "Users can update own resumes"
  on storage.objects for update
  using (
    bucket_id = 'resumes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow anyone to read (bucket is public)
create policy "Public read access for resumes"
  on storage.objects for select
  using (bucket_id = 'resumes');
```

### 5. Configure Supabase Auth

1. Go to **Supabase Dashboard → Authentication → Providers → Google**
2. Enable Google and paste your **Google Client ID** & **Client Secret**
3. Add redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
4. In **URL Configuration**, set the Site URL and Redirect URLs

### 6. Configure Stripe

#### Create a subscription product

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products) and click **+ Add product**
2. Set a name (e.g. "Pro Plan"), choose **Recurring** pricing, set the amount (e.g. $5/month)
3. Click **Save product**
4. Copy the **Price ID** (starts with `price_...`) → paste into `NEXT_PUBLIC_STRIPE_PRICE_ID` in `.env`

#### Create a webhook endpoint (production)

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **+ Add endpoint**
3. Set the endpoint URL to `https://your-domain.com/api/stripe/webhook`
4. Under **Select events to listen to**, add:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**, then reveal the **Signing secret** (starts with `whsec_...`) → paste into `STRIPE_WEBHOOK_SECRET`

#### Forward webhooks locally (pick one)

**Option A — Stripe CLI**

```bash
# Install: https://docs.stripe.com/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the `whsec_...` secret it prints → paste into `STRIPE_WEBHOOK_SECRET` in `.env`.

**Option B — ngrok** (Recommended)

```bash
# Install: https://ngrok.com/download
ngrok http 3000
```

Copy the forwarding URL (e.g. `https://abc123.ngrok-free.app`) and add a webhook in the [Stripe Dashboard](https://dashboard.stripe.com/webhooks) pointing to `https://abc123.ngrok-free.app/api/stripe/webhook` with the same 3 events listed above. Use the signing secret from that endpoint as `STRIPE_WEBHOOK_SECRET`.

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

> **Note**: Google OAuth credentials are configured in the **Supabase Dashboard**, not in `.env`.

## Project Structure

```
resume-maker/
├── app/
│   ├── api/
│   │   ├── analyze-resume/      # AI resume scoring & suggestions
│   │   ├── applications/        # Job application tracker CRUD
│   │   │   └── [id]/upload/     # Resume PDF upload to Supabase Storage
│   │   ├── edit-section/        # AI-powered section rewrite
│   │   ├── parse-pdf/           # PDF text extraction
│   │   ├── tailor/              # Main AI resume tailoring (streamed)
│   │   ├── template-settings/   # Per-user template preferences
│   │   ├── usage/               # Usage tracking (GET/POST)
│   │   └── stripe/
│   │       ├── checkout/        # Create Stripe checkout session
│   │       ├── portal/          # Customer billing portal
│   │       ├── subscription/    # Subscription status check
│   │       └── webhook/         # Stripe webhook handler
│   ├── applications/            # Job tracker page
│   ├── auth/callback/           # Supabase OAuth callback
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Main resume tailoring page
│   └── globals.css              # Global styles + Tailwind config
├── components/
│   ├── resume/
│   │   ├── resume-content.tsx          # Editable resume template renderer
│   │   ├── resume-preview.tsx          # Resume preview with toolbar
│   │   ├── resume-dropzone.tsx         # PDF upload dropzone
│   │   ├── resume-analyzer-dialog.tsx  # AI analysis results dialog
│   │   ├── ai-section-editor.tsx       # AI section rewrite dialog
│   │   ├── template-settings-dialog.tsx # Template customization dialog
│   │   └── link-edit-popover.tsx       # Inline link editor
│   ├── text-editor.tsx          # Rich text editor for job descriptions
│   ├── sign-in-button.tsx       # Google sign-in button
│   ├── user-menu.tsx            # User dropdown (avatar, usage, billing)
│   ├── theme-toggle.tsx         # Dark/light theme switch
│   ├── theme-provider.tsx       # next-themes provider wrapper
│   ├── footer.tsx               # App footer
│   └── ui/                      # shadcn/ui primitives
├── hooks/
│   ├── use-user.ts              # Supabase auth state hook
│   ├── use-speech-to-text.ts    # Browser speech recognition hook
│   └── use-undo-history.ts      # Undo/redo state hook
├── lib/
│   ├── resume/
│   │   ├── resume-store.ts      # IndexedDB resume storage
│   │   ├── resume-styles.ts     # Resume CSS (screen + print)
│   │   └── templates.ts         # Template definitions & settings
│   ├── stripe.ts                # Stripe client initialization
│   ├── supabase/
│   │   ├── client.ts            # Supabase browser client
│   │   └── server.ts            # Supabase server client (cookies)
│   └── utils.ts                 # Shared utilities (cn, etc.)
├── supabase/
│   └── migrations/              # SQL migration files
├── middleware.ts                 # Supabase session refresh middleware
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
