import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import PrintReceiptButton from "@/app/admin/orders/[orderId]/receipt/print-button";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const receiptSchema = z.object({
  id: z.coerce.number(),
  order_number: z.string(),
  customer_company: z.string().nullable(),
  customer_phone: z.string().nullable(),
  delivery_address: z.string().nullable(),
  observation: z.string().nullable(),
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
});

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusLabels: Record<string, string> = {
  pendente: "Recebido",
  aprovado: "Aprovado",
  em_preparo: "Em separação",
  enviado: "Saiu para entrega",
  concluido: "Entregue",
  cancelado: "Cancelado",
  rejeitado: "Cancelado",
};

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  combinar: "A combinar",
  prazo: "Pagamento a prazo",
};

async function Receipt({ orderId }: { orderId: string }) {
  if (!getSupabaseConfig()) {
    return <main className="admin-message">Configure o Supabase para consultar recibos.</main>;
  }

  const parsedId = Number(orderId);
  if (!Number.isSafeInteger(parsedId) || parsedId < 1) notFound();

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", authData.user.id)
    .single();
  if (profileError) throw new Error(`Não foi possível validar o acesso: ${profileError.message}`);
  if (!profile || !["admin", "funcionario"].includes(profile.role) || profile.status !== "ativo") {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_company, customer_phone, delivery_address, observation, status, payment_method, payment_status, payment_term_days, due_date, subtotal, delivery_fee, discount_amount, fee_amount, total, created_at, order_items(product_name, quantity, unit, price_at_purchase, subtotal)")
    .eq("id", parsedId)
    .single();
  if (error) {
    if (error.code === "PGRST116") notFound();
    throw new Error(`Não foi possível carregar o recibo: ${error.message}`);
  }
  const order = receiptSchema.parse(data);

  return (
    <main className="admin-receipt-page">
      <article className="admin-receipt-paper">
        <header>
          <strong>SANTA EDWIGES</strong>
          <span>Mercearia &amp; Distribuidora</span>
          <small>Comprovante comercial — não é documento fiscal</small>
        </header>
        <h1>Pedido {order.order_number}</h1>
        <p>{new Date(order.created_at).toLocaleString("pt-BR")}</p>
        <hr />
        <p><strong>Cliente:</strong> {order.customer_company ?? "—"}</p>
        <p><strong>Telefone:</strong> {order.customer_phone ?? "—"}</p>
        <p><strong>Endereço:</strong> {order.delivery_address ?? "—"}</p>
        <p><strong>Status:</strong> {statusLabels[order.status] ?? order.status}</p>
        <p><strong>Pagamento:</strong> {paymentLabels[order.payment_method ?? ""] ?? "—"}</p>
        {order.payment_status && <p><strong>Situação financeira:</strong> {order.payment_status}</p>}
        {order.payment_term_days && (
          <p><strong>Prazo:</strong> {order.payment_term_days} dias · vencimento {order.due_date}</p>
        )}
        <hr />
        <div className="admin-receipt-items">
          {order.order_items.map((item, index) => (
            <div key={`${order.id}-${index}`}>
              <span>{item.quantity} × {item.product_name} ({item.unit})<small>{currency.format(item.price_at_purchase)} cada</small></span>
              <strong>{currency.format(item.subtotal)}</strong>
            </div>
          ))}
        </div>
        <hr />
        <p><span>Subtotal</span><strong>{currency.format(order.subtotal)}</strong></p>
        <p><span>Entrega</span><strong>{currency.format(order.delivery_fee)}</strong></p>
        {order.discount_amount > 0 && <p><span>Desconto</span><strong>−{currency.format(order.discount_amount)}</strong></p>}
        {order.fee_amount > 0 && <p><span>Taxas</span><strong>+{currency.format(order.fee_amount)}</strong></p>}
        <p className="admin-receipt-total"><strong>Total</strong><strong>{currency.format(order.total)}</strong></p>
        {order.observation && <p><strong>Observação:</strong> {order.observation}</p>}
        <p className="admin-receipt-footer">Obrigado pela preferência!</p>
      </article>
      <PrintReceiptButton />
    </main>
  );
}

export default async function AdminOrderReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  return (
    <Suspense fallback={<main className="admin-message">Carregando recibo...</main>}>
      <ReceiptPage params={params} />
    </Suspense>
  );
}

async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <Receipt orderId={orderId} />;
}
