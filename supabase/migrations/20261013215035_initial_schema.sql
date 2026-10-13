do $$
begin
  create type public.user_role as enum ('cliente', 'admin', 'funcionario');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.pedido_status as enum (
    'pendente', 'aprovado', 'em_preparo', 'enviado', 'concluido', 'cancelado', 'rejeitado'
  );
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.movimento_tipo as enum ('entrada', 'saida', 'ajuste', 'reserva', 'liberacao');
exception when duplicate_object then null;
end
$$;

do $$
begin
  create type public.cliente_status as enum ('pendente', 'ativo', 'bloqueado');
exception when duplicate_object then null;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role public.user_role not null default 'cliente',
  nome text not null,
  telefone text,
  endereco text,
  status public.cliente_status not null default 'pendente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigserial primary key,
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigserial primary key,
  category_id bigint references public.categories(id),
  name text not null,
  description text,
  unit text not null,
  price numeric(12, 2) not null check (price >= 0),
  stock_fisico integer not null default 0 check (stock_fisico >= 0),
  stock_reservado integer not null default 0 check (stock_reservado >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_stock_valid check (stock_fisico >= stock_reservado)
);

create table if not exists public.settings (
  id bigserial primary key,
  key text not null unique,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigserial primary key,
  customer_id uuid not null references public.profiles(id),
  order_number text not null unique,
  status public.pedido_status not null default 'pendente',
  subtotal numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_method text,
  delivery_type text not null default 'retirada',
  observation text,
  cart_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id bigint not null references public.orders(id) on delete restrict,
  product_id bigint not null references public.products(id),
  product_name text not null,
  unit text not null,
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric(12, 2) not null check (price_at_purchase >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id bigserial primary key,
  product_id bigint not null references public.products(id),
  order_id bigint references public.orders(id),
  movement_type public.movimento_tipo not null,
  quantity integer not null,
  reason text not null,
  responsible_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id bigserial primary key,
  order_id bigint not null references public.orders(id),
  from_status public.pedido_status,
  to_status public.pedido_status not null,
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
