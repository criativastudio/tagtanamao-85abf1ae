-- Shipping history for Melhor Envio
create table if not exists public.shipping_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  cep_origem text,
  cep_destino text,
  price numeric(10,2),
  days integer,
  carrier text,
  service_name text,
  label_url text,
  declaration_url text,
  created_at timestamptz not null default now()
);

alter table public.shipping_history enable row level security;

create policy "Allow authenticated read"
  on public.shipping_history
  for select
  to authenticated
  using (true);
