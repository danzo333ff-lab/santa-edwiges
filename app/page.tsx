import { Suspense } from "react";
import Storefront from "@/app/storefront";
import { z } from "zod";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/products";

async function Catalog() {
  const config = getSupabaseConfig();
  if (!config) {
    return (
      <Storefront
        products={[]}
        backendConfigured={false}
        commercialSettings={{ deliveryFee: 0, minimumOrder: 50, cashDiscountPercent: 1, cardFeePercent: 3 }}
      />
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, category_id, name, description, unit, price, stock_fisico, stock_reservado, stock_minimo, active, image_url, unit_price_display, bulk_min, bulk_price",
    )
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);
  }

  const productRows = z.array(z.object({
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
  })).parse(data ?? []);
  const categoryIds = [...new Set(productRows.flatMap((row) => row.category_id ?? []))];
  const { data: categoryData, error: categoryError } = categoryIds.length
    ? await supabase.from("categories").select("id, name").in("id", categoryIds)
    : { data: [], error: null };
  if (categoryError) {
    throw new Error(`Não foi possível carregar as categorias: ${categoryError.message}`);
  }
  const { data: settingData, error: settingError } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["delivery_fee", "minimum_order", "cash_discount_percent", "card_fee_percent"]);
  if (settingError) {
    throw new Error(`Não foi possível carregar as regras comerciais: ${settingError.message}`);
  }
  const settings = new Map(
    z.array(z.object({ key: z.string(), value: z.string() }))
      .parse(settingData ?? [])
      .map(({ key, value }) => [key, Number(value)]),
  );
  const categories = z.array(z.object({
    id: z.coerce.number(),
    name: z.string(),
  })).parse(categoryData ?? []);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const products: Product[] = productRows.map((row) => {
    const category = row.category_id === null ? undefined : categoryNames.get(row.category_id);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      category: category ?? "Outros",
      unit: row.unit,
      price: row.price,
      stock: row.stock_fisico - row.stock_reservado,
      minStock: row.stock_minimo,
      active: row.active,
      image: "",
      imageUrl: row.image_url ?? undefined,
      unitPriceDisplay: row.unit_price_display ?? undefined,
      bulkMin: row.bulk_min ?? undefined,
      bulkPrice: row.bulk_price ?? undefined,
    };
  });

  return (
    <Storefront
      products={products}
      backendConfigured
      commercialSettings={{
        deliveryFee: settings.get("delivery_fee") ?? 0,
        minimumOrder: settings.get("minimum_order") ?? 50,
        cashDiscountPercent: settings.get("cash_discount_percent") ?? 1,
        cardFeePercent: settings.get("card_fee_percent") ?? 3,
      }}
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="catalog-loading" aria-live="polite">
          Carregando catálogo...
        </main>
      }
    >
      <Catalog />
    </Suspense>
  );
}
