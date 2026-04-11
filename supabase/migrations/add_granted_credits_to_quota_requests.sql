-- Store how many bonus credits were granted when a quota request is approved
alter table public.quota_requests add column if not exists granted_credits integer;
