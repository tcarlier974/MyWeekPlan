-- Run this migration in the Supabase SQL editor before enabling the client-side persistence.
-- The product catalogue remains shared; only the user-owned state below is private.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.inventaire_frigo add column if not exists user_id uuid references auth.users(id) on delete cascade;
-- Legacy shared inventory rows remain unassigned (user_id is NULL) and are
-- intentionally invisible once RLS is enabled; no existing stock is deleted.
create unique index if not exists inventaire_frigo_user_ingredient_key on public.inventaire_frigo(user_id, tag_ingredient);

create table if not exists public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  budget numeric not null default 50,
  meals_count integer not null default 7,
  portions integer not null default 2,
  planning_mode text not null default 'balanced',
  menu jsonb not null default '[]'::jsonb,
  total_cost numeric not null default 0,
  locked_meals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id bigint generated always as identity primary key,
  plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rayon text not null,
  item_id text not null,
  nom text not null,
  quantite numeric not null,
  tag text not null,
  checked boolean not null default false,
  unique(plan_id, item_id)
);

alter table public.profiles enable row level security;
alter table public.inventaire_frigo enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.shopping_list_items enable row level security;

drop policy if exists "Profiles belong to their owner" on public.profiles;
create policy "Profiles belong to their owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Inventory belongs to its owner" on public.inventaire_frigo;
create policy "Inventory belongs to its owner" on public.inventaire_frigo for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Plans belong to their owner" on public.weekly_plans;
create policy "Plans belong to their owner" on public.weekly_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Shopping items belong to their owner" on public.shopping_list_items;
create policy "Shopping items belong to their owner" on public.shopping_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
