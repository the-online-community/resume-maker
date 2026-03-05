-- Usage tracking table
create table if not exists public.usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.usage enable row level security;

-- Users can read their own usage
create policy "Users can read own usage"
  on public.usage for select
  using (auth.uid() = user_id);

-- Users can insert their own usage row
create policy "Users can insert own usage"
  on public.usage for insert
  with check (auth.uid() = user_id);

-- Users can update their own usage
create policy "Users can update own usage"
  on public.usage for update
  using (auth.uid() = user_id);
