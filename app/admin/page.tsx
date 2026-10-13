import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import AdminDashboard from "@/app/admin/dashboard";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/products";

const productRowsSchema = z.array(z.object({
  id: z.coerce.number(),
  category_id: z.coerce.number().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string(),
  price: z.coerce.number(),
  stock_fisico: z.coerce.number(),
  stock_reservado: z.coerce.number(),
  stock_minimo: z.coerce.number(),
  active: z.boolean(),
  image_url: z.string().nullable(),
  unit_price_display: z.coerce.number().nullable(),
  bulk_min: z.coerce.number().nullable(),
  bulk_price: z.coerce.number().nullable(),
}));

const customersSchema = z.array(z.object({
  id: z.string(),
  empresa: z.string(),
  responsavel: z.string(),
  telefone: z.string().nullable(),
  cidade: z.string().nullable(),
  status: z.enum(["pendente", "ativo", "bloqueado"]),
}));

const orderSchema = z.array(z.object({
  id: z.coerce.number(),
  order_number: z.string(),
  customer_id: z.string(),
  customer_company: z.string().nullable(),
  customer_phone: z.string().nullable(),
  status: z.string(),
  payment_method: z.string().nullable(),
  payment_status: z.string().nullable(),
  payment_term_days: z.coerce.number().nullable(),
  due_date: z.string().nullable(),
  subtotal: z.coerce.number(),
  delivery_fee: z.coerce.number(),
  discount_amount: z.coerce.number(),
  fee_amount: z.coerce.number(),
  total: z.coerce.number(),
  created_at: z.string(),
  order_items: z.array(z.object({
    product_name: z.string(),
    quantity: z.coerce.number(),
    unit: z.string(),
    price_at_purchase: z.coerce.number(),
    subtotal: z.coerce.number(),
  })),
}));

async function AdminContent() {
  if (!getSupabaseConfig()) {
    return (
      <main className="admin-message">
        Configure o Supabase e aplique as migrations para habilitar o painel.
      </main>
    );
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/?admin=login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", authData.user.id)
    .single();
  if (profileError) throw new Error(`Não foi possível validar a função: ${profileError.message}`);
  if (!profile || !["admin", "funcionario"].includes(profile.role) || profile.status !== "ativo") {
    redirect("/");
  }

  const { error: overdueError } = await supabase.rpc("refresh_overdue_payments");
  if (overdueError) {
    throw new Error(`Não foi possível atualizar as contas vencidas: ${overdueError.message}`);
  }

  const [
    productsResult,
    categoriesResult,
    customersResult,
    termsResult,
    ordersResult,
    movementsResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, category_id, name, description, unit, price, stock_fisico, stock_reservado, stock_minimo, active, image_url, unit_price_display, bulk_min, bulk_price")
      .order("name"),
    supabase.from("categories").select("id, name, active").order("name"),
    supabase
      .from("profiles")
      .select("id, empresa, responsavel, telefone, cidade, status")
      .eq("role", "cliente")
      .order("empresa"),
    supabase
      .from("customer_payment_terms")
      .select("customer_id, days")
      .eq("enabled", true),
    supabase
      .from("orders")
      .select("id, order_number, customer_id, customer_company, customer_phone, status, payment_method, payment_status, payment_term_days, due_date, subtotal, delivery_fee, discount_amount, fee_amount, total, created_at, order_items(product_name, quantity, unit, price_at_purchase, subtotal)")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("stock_movements")
      .select("id, product_id, movement_type, quantity, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("settings").select("key, value"),
  ]);

  const results = [
    productsResult,
    categoriesResult,
    customersResult,
    termsResult,
    ordersResult,
    movementsResult,
    settingsResult,
  ];
  for (const result of results) {
    if (result.error) throw new Error(`Erro ao carregar o painel: ${result.error.message}`);
  }

  const productRows = productRowsSchema.parse(productsResult.data ?? []);
  const categories = z.array(z.object({
    id: z.coerce.number(),
    name: z.string(),
    active: z.boolean(),
  })).parse(categoriesResult.data ?? []);
  const customers = customersSchema.parse(customersResult.data ?? []);
  const terms = z.array(z.object({
    customer_id: z.string(),
    days: z.coerce.number(),
  })).parse(termsResult.data ?? []);
  const orders = orderSchema.parse(ordersResult.data ?? []);
  const settings = z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).parse(settingsResult.data ?? []);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const products: Product[] = productRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: categoryNames.get(row.category_id ?? -1) ?? "Outros",
    unit: row.unit,
    price: row.price,
    stock: row.stock_fisico - row.stock_reservado,
    stockPhysical: row.stock_fisico,
    stockReserved: row.stock_reservado,
    minStock: row.stock_minimo,
    active: row.active,
    image: "",
    imageUrl: row.image_url ?? undefined,
    unitPriceDisplay: row.unit_price_display ?? undefined,
    bulkMin: row.bulk_min ?? undefined,
    bulkPrice: row.bulk_price ?? undefined,
  }));

  return (
    <AdminDashboard
      key={JSON.stringify([
        productRows.map((row) => [row.id, row.price, row.active, row.stock_fisico, row.stock_reservado]),
        customers.map((customer) => [customer.id, customer.status]),
        terms.map((term) => [term.customer_id, term.days]),
        orders.map((order) => [order.id, order.status, order.payment_status, order.total]),
        movementsResult.data?.map((movement) => [movement.id, movement.quantity]) ?? [],
        settings.map((setting) => [setting.key, setting.value]),
      ])}
      products={products}
      categories={categories}
      customers={customers}
      customerTerms={terms.reduce<Record<string, number[]>>((allTerms, term) => {
        allTerms[term.customer_id] ??= [];
        allTerms[term.customer_id].push(term.days);
        return allTerms;
      }, {})}
      orders={orders}
      stockMovements={z.array(z.object({
        id: z.coerce.number(),
        product_id: z.coerce.number(),
        movement_type: z.string(),
        quantity: z.coerce.number(),
        reason: z.string(),
        created_at: z.string(),
      })).parse(movementsResult.data ?? [])}
      settings={Object.fromEntries(settings.map(({ key, value }) => [key, value]))}
      role={profile.role}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<main className="admin-message">Carregando painel administrativo...</main>}>
      <AdminContent />
    </Suspense>
  );
}
