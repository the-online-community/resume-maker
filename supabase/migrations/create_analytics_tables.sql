-- Analytics events: resume_generated, pdf_downloaded, job_analyzed, score_checked
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  model text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_type on public.analytics_events(event_type);
create index idx_analytics_events_created on public.analytics_events(created_at);
create index idx_analytics_events_user on public.analytics_events(user_id);

alter table public.analytics_events enable row level security;

-- API errors for system health monitoring
create table if not exists public.api_errors (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  error_message text,
  status_code integer,
  user_id uuid references auth.users(id) on delete set null,
  model text,
  created_at timestamptz not null default now()
);

create index idx_api_errors_route on public.api_errors(route);
create index idx_api_errors_created on public.api_errors(created_at);

alter table public.api_errors enable row level security;
