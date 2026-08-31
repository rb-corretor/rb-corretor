-- Fonte única de dados da rede credenciada. Não insere dados fictícios.
create extension if not exists pgcrypto;

create table if not exists public.network_data (
  id uuid primary key default gen_random_uuid(),
  operator_name text not null,
  operator_key text not null,
  product_name text not null,
  product_key text not null,
  product_code text,
  city_name text not null,
  city_key text not null,
  state_code text not null check (char_length(state_code) = 2),
  provider_name text not null,
  provider_key text not null,
  provider_type text,
  address text,
  neighborhood text,
  zip_code text,
  phone text,
  email text,
  cnpj text,
  cnes text,
  source text,
  source_url text,
  source_row_hash text not null unique,
  active boolean not null default true,
  last_updated timestamptz,
  imported_at timestamptz not null default now()
);

create index if not exists network_data_operator_idx on public.network_data(operator_key) where active;
create index if not exists network_data_product_idx on public.network_data(operator_key, product_key) where active;
create index if not exists network_data_lookup_idx on public.network_data(operator_key, product_key, state_code, city_key) where active;
create index if not exists network_data_provider_idx on public.network_data(provider_key) where active;

alter table public.network_data enable row level security;
drop policy if exists network_data_public_read on public.network_data;
create policy network_data_public_read on public.network_data for select to anon, authenticated using (active = true);
grant usage on schema public to anon, authenticated;
grant select on public.network_data to anon, authenticated;

create or replace function public.mrs_operators(p_limit integer default 100)
returns table(operator_key text, operator_name text)
language sql stable security invoker set search_path = public as $$
  select nd.operator_key, min(nd.operator_name) as operator_name
  from network_data nd
  where nd.active
  group by nd.operator_key
  order by min(nd.operator_name)
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

create or replace function public.mrs_products(p_operator_key text, p_limit integer default 100)
returns table(product_key text, product_name text, product_code text)
language sql stable security invoker set search_path = public as $$
  select nd.product_key, min(nd.product_name) as product_name, min(nd.product_code) as product_code
  from network_data nd
  where nd.active and nd.operator_key = p_operator_key
  group by nd.product_key
  order by min(nd.product_name)
  limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;

create or replace function public.mrs_search_network(
  p_operator_key text, p_product_key text, p_city_key text, p_state_code text default null,
  p_type text default null, p_limit integer default 100
)
returns table(provider_key text, provider_name text, provider_type text, address text, neighborhood text, zip_code text, phone text, email text, city_name text, state_code text, source text, source_url text, last_updated timestamptz, total_count bigint)
language sql stable security invoker set search_path = public as $$
  with matched as (
    select distinct on (nd.provider_key)
      nd.provider_key, nd.provider_name, nd.provider_type, nd.address, nd.neighborhood, nd.zip_code, nd.phone, nd.email,
      nd.city_name, nd.state_code, nd.source, nd.source_url, nd.last_updated
    from network_data nd
    where nd.active
      and nd.operator_key = p_operator_key
      and nd.product_key = p_product_key
      and nd.city_key = p_city_key
      and (p_state_code is null or nd.state_code = p_state_code)
      and (p_type is null or p_type = '' or nd.provider_type ilike '%' || p_type || '%')
    order by nd.provider_key, nd.last_updated desc nulls last, nd.id
  ), counted as (
    select matched.*, count(*) over() as total_count from matched
  )
  select * from counted
  order by provider_name
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

grant execute on function public.mrs_operators(integer) to anon, authenticated;
grant execute on function public.mrs_products(text, integer) to anon, authenticated;
grant execute on function public.mrs_search_network(text, text, text, text, text, integer) to anon, authenticated;
