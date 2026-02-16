-- Atualiza a constraint de status para aceitar os estados usados no admin
alter table if exists public.orders
  drop constraint if exists orders_status_creck;

alter table if exists public.orders
  add constraint orders_status_creck
  check (
    status is null or status in (
      'pending',
      'awaiting_payment',
      'created',
      'new',
      'paid',
      'payment_confirmed',
      'confirmed',
      'awaiting_customization',
      'customization_pending',
      'awaiting_art',
      'art_pending',
      'art_finalized',
      'processing',
      'in_production',
      'ready_to_ship',
      'shipped',
      'in_transit',
      'delivered',
      'completed'
    )
  );
