-- Job applications tracker table
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  applied_at date not null default current_date,
  position text not null,
  company text,
  platform text,
  job_url text,
  status text not null default 'applied',
  resume_data jsonb,
  resume_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookups by user
create index idx_applications_user_id on public.applications(user_id);

-- Enable RLS
alter table public.applications enable row level security;

-- Users can read their own applications
create policy "Users can read own applications"
  on public.applications for select
  using (auth.uid() = user_id);

-- Users can insert their own applications
create policy "Users can insert own applications"
  on public.applications for insert
  with check (auth.uid() = user_id);

-- Users can update their own applications
create policy "Users can update own applications"
  on public.applications for update
  using (auth.uid() = user_id);

-- Users can delete their own applications
create policy "Users can delete own applications"
  on public.applications for delete
  using (auth.uid() = user_id);
