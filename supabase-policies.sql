-- Run this in the Supabase SQL editor.
-- It allows public analytics inserts, while keeping analytics/receipts readable only by admins.

-- Optional helper to keep policy checks readable.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin_user() to anon, authenticated;

alter table public.site_analytics_events enable row level security;
drop policy if exists "Public analytics insert" on public.site_analytics_events;
create policy "Public analytics insert"
on public.site_analytics_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can read analytics" on public.site_analytics_events;
create policy "Admins can read analytics"
on public.site_analytics_events
for select
to authenticated
using (public.is_admin_user());

alter table public.receipts enable row level security;
drop policy if exists "Admins can read receipts" on public.receipts;
create policy "Admins can read receipts"
on public.receipts
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "Admins can create receipts" on public.receipts;
create policy "Admins can create receipts"
on public.receipts
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "Admins can update receipts" on public.receipts;
create policy "Admins can update receipts"
on public.receipts
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can delete receipts" on public.receipts;
create policy "Admins can delete receipts"
on public.receipts
for delete
to authenticated
using (public.is_admin_user());

-- Blog engagement: unique views, one-like-per-visitor, and real-time counts.
alter table public.blog_posts
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0;

create table if not exists public.blog_post_views (
  id bigint generated always as identity primary key,
  post_id text not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  unique (post_id, visitor_key)
);

create table if not exists public.blog_post_likes (
  id bigint generated always as identity primary key,
  post_id text not null,
  visitor_key text not null,
  created_at timestamptz not null default now(),
  unique (post_id, visitor_key)
);

alter table public.blog_post_views enable row level security;
alter table public.blog_post_likes enable row level security;

drop function if exists public.record_blog_post_view(text, text);
create or replace function public.record_blog_post_view(post_slug text, visitor_key text)
returns table(view_count integer, viewer_viewed boolean)
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_post_id text;
  v_inserted_rows integer := 0;
  v_view_count integer := 0;
begin
  select id::text, coalesce(p.view_count, 0)
    into v_post_id, v_view_count
  from public.blog_posts p
  where p.slug = post_slug
    and p.status = 'Published';

  if v_post_id is null then
    return query select 0::integer, false;
    return;
  end if;

  insert into public.blog_post_views (post_id, visitor_key)
  values (v_post_id, visitor_key)
  on conflict do nothing;

  get diagnostics v_inserted_rows = row_count;

  if v_inserted_rows > 0 then
    update public.blog_posts
    set view_count = coalesce(view_count, 0) + 1
    where id::text = v_post_id
    returning view_count into v_view_count;
  end if;

  return query
    select coalesce(v_view_count, 0), exists(
      select 1
      from public.blog_post_views v
      where v.post_id = v_post_id
        and v.visitor_key = visitor_key
    );
end;
$$;

drop function if exists public.record_blog_post_like(text, text);
create or replace function public.record_blog_post_like(post_slug text, visitor_key text)
returns table(like_count integer, viewer_liked boolean)
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  v_post_id text;
  v_inserted_rows integer := 0;
  v_like_count integer := 0;
begin
  select id::text, coalesce(p.like_count, 0)
    into v_post_id, v_like_count
  from public.blog_posts p
  where p.slug = post_slug
    and p.status = 'Published';

  if v_post_id is null then
    return query select 0::integer, false;
    return;
  end if;

  insert into public.blog_post_likes (post_id, visitor_key)
  values (v_post_id, visitor_key)
  on conflict do nothing;

  get diagnostics v_inserted_rows = row_count;

  if v_inserted_rows > 0 then
    update public.blog_posts
    set like_count = coalesce(like_count, 0) + 1
    where id::text = v_post_id
    returning like_count into v_like_count;
  end if;

  return query
    select coalesce(v_like_count, 0), exists(
      select 1
      from public.blog_post_likes l
      where l.post_id = v_post_id
        and l.visitor_key = visitor_key
    );
end;
$$;

drop function if exists public.get_blog_post_engagement(text, text);
create or replace function public.get_blog_post_engagement(post_slug text, visitor_key text)
returns table(
  view_count integer,
  like_count integer,
  viewer_viewed boolean,
  viewer_liked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(p.view_count, 0) as view_count,
    coalesce(p.like_count, 0) as like_count,
    exists (
      select 1
      from public.blog_post_views v
      where v.post_id = p.id::text
        and v.visitor_key = get_blog_post_engagement.visitor_key
    ) as viewer_viewed,
    exists (
      select 1
      from public.blog_post_likes l
      where l.post_id = p.id::text
        and l.visitor_key = get_blog_post_engagement.visitor_key
    ) as viewer_liked
  from public.blog_posts p
  where p.slug = post_slug
    and p.status = 'Published'
  limit 1;
$$;
