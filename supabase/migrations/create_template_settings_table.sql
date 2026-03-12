-- Template settings table — stores per-user resume template preferences
create table if not exists public.template_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sections jsonb not null default '["SUMMARY","EXPERIENCE","EDUCATION","SKILLS","CERTIFICATIONS"]'::jsonb,
  header_fields jsonb not null default '["EMAIL","PHONE","LOCATION","LINKEDIN","GITHUB","WEBSITE"]'::jsonb,
  bold_labels boolean not null default true,
  bullet_style text not null default 'dot',
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.template_settings enable row level security;

-- Users can read their own settings
create policy "Users can read own template settings"
  on public.template_settings for select
  using (auth.uid() = user_id);

-- Users can insert their own settings
create policy "Users can insert own template settings"
  on public.template_settings for insert
  with check (auth.uid() = user_id);

-- Users can update their own settings
create policy "Users can update own template settings"
  on public.template_settings for update
  using (auth.uid() = user_id);
