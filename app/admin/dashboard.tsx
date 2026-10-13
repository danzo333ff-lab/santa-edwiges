"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import type { Product } from "@/lib/products";
import { createClient } from "@/lib/supabase/client";

type Category = { id: number; name: string; active: boolean };
type Customer = {
  id: string;
  empresa: string;
  responsavel: string;
  telefone: string | null;
  cidade: string | null;
  status: "pendente" | "ativo" | "bloqueado";
};
type OrderItem = {
  product_name: string;
  quantity: number;
  unit: string;
  price_at_purchase: number;
  subtotal: number;
};
type AdminOrder = {
  id: number;
  order_number: string;
  customer_id: string;
  customer_company: string | null;
  customer_phone: string | null;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  payment_term_days: number | null;
  due_date: string | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  fee_amount: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
};
type StockMovement = {
  id: number;
  product_id: number;
  movement_type: string;
  quantity: number;
  reason: string;
  created_at: string;
};

type AdminDashboardProps = {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  customerTerms: Record<string, number[]>;
  orders: AdminOrder[];
  stockMovements: StockMovement[];
  settings: Record<string, string>;
  role: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const productInputSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim(),
  category_id: z.number().int().positive(),
  unit: z.string().trim().min(1),
  price: z.number().finite().nonnegative(),
  unit_price_display: z.number().finite().nonnegative().nullable(),
  stock_minimo: z.number().int().nonnegative(),
  bulk_min: z.number().int().positive().nullable(),
  bulk_price: z.number().finite().nonnegative().nullable(),
});
const statusOptions = [
  ["pendente", "Recebido"],
  ["aprovado", "Aprovado"],
  ["em_preparo", "Em separação"],
  ["enviado", "Saiu para entrega"],
  ["concluido", "Entregue"],
  ["cancelado", "Cancelado"],
  ["rejeitado", "Rejeitado"],
];

export default function AdminDashboard({
  products: initialProducts,
  categories,
  customers: initialCustomers,
  customerTerms: initialCustomerTerms,
  orders: initialOrders,
  stockMovements,
  settings: initialSettings,
  role,
}: AdminDashboardProps) {
  const router = useRouter();
  const products = initialProducts;
  const customers = initialCustomers;
  const customerTerms = initialCustomerTerms;
  const orders = initialOrders;
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState(false);
  const [liveOrderNotice, setLiveOrderNotice] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("todos");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("todos");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [stockInputs, setStockInputs] = useState<Record<number, string>>({});
  const [commercialSettings, setCommercialSettings] = useState(initialSettings);
  const canAdminister = role === "admin";
  const editingProduct = products.find((product) => product.id === editingProductId);
  const lowStock = products.filter(
    (product) => product.stock <= product.minStock,
  );
  const totals = useMemo(
    () => ({
      newOrders: orders.filter((order) => order.status === "pendente").length,
      inProgress: orders.filter((order) =>
        ["aprovado", "em_preparo", "enviado"].includes(order.status),
      ).length,
      delivered: orders.filter((order) => order.status === "concluido").length,
      cancelled: orders.filter((order) =>
        ["cancelado", "rejeitado"].includes(order.status),
      ).length,
      sales: orders
        .filter((order) => order.status !== "cancelado" && order.status !== "rejeitado")
        .reduce((sum, order) => sum + order.total, 0),
      due: orders.filter((order) => order.payment_status === "em_aberto").length,
      overdue: orders.filter((order) => order.payment_status === "vencido").length,
    }),
    [orders],
  );
  const filteredOrders = orders.filter((order) => {
    const search = orderSearch.trim().toLocaleLowerCase("pt-BR");
    return (
      (orderStatusFilter === "todos" || order.status === orderStatusFilter) &&
      (orderPaymentFilter === "todos" || order.payment_method === orderPaymentFilter) &&
      (!search ||
        order.order_number.toLocaleLowerCase("pt-BR").includes(search) ||
        (order.customer_company ?? "").toLocaleLowerCase("pt-BR").includes(search)) &&
      (!orderDate ||
        (() => {
          const created = new Date(order.created_at);
          const localDate = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
          return localDate === orderDate;
        })()) &&
      (!overdueOnly || order.payment_status === "vencido")
    );
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as { order_number?: string };
          setLiveOrderNotice(
            `Novo pedido recebido${order.order_number ? `: ${order.order_number}` : ""}.`,
          );
          window.setTimeout(() => router.refresh(), 500);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  const run = async (operation: () => Promise<void>, successMessage: string) => {
    setNotice("");
    setErrorNotice(false);
    try {
      await operation();
      setNotice(successMessage);
      router.refresh();
    } catch (error) {
      setErrorNotice(true);
      setNotice(error instanceof Error ? error.message : "A operação não foi concluída.");
    }
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdminister) return;
    const form = new FormData(event.currentTarget);
    const parsed = productInputSchema.safeParse({
      name: form.get("name"),
      description: form.get("description"),
      category_id: Number(form.get("category_id")),
      unit: form.get("unit"),
      price: Number(form.get("price")),
      unit_price_display: form.get("unit_price_display")
        ? Number(form.get("unit_price_display"))
        : null,
      stock_minimo: Number(form.get("stock_minimo")),
      bulk_min: form.get("bulk_min") ? Number(form.get("bulk_min")) : null,
      bulk_price: form.get("bulk_price") ? Number(form.get("bulk_price")) : null,
    });
    if (!parsed.success) {
      setErrorNotice(true);
      setNotice("Confira nome, categoria, unidade e valores informados.");
      return;
    }
    const image = form.get("image");
    let imageUrl = products.find((product) => product.id === editingProductId)?.imageUrl ?? null;
    if (image instanceof File && image.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
        setErrorNotice(true);
        setNotice("A imagem deve estar no formato JPG, PNG ou WebP.");
        return;
      }
      if (image.size > 5 * 1024 * 1024) {
        setErrorNotice(true);
        setNotice("A imagem deve ter até 5 MB.");
        return;
      }
      const supabase = createClient();
      const objectPath = `${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(objectPath, image, { contentType: image.type, upsert: false });
      if (error) {
        setErrorNotice(true);
        setNotice(`Não foi possível enviar a imagem: ${error.message}`);
        return;
      }
      imageUrl = supabase.storage.from("product-images").getPublicUrl(objectPath).data.publicUrl;
    }

    const values = {
      ...parsed.data,
      image_url: imageUrl,
      active: form.get("active") === "on",
    };
    const formElement = event.currentTarget;
    await run(async () => {
      const supabase = createClient();
      const query = editingProductId
        ? supabase.from("products").update(values).eq("id", editingProductId)
        : supabase.from("products").insert({ ...values, stock_fisico: 0, stock_reservado: 0 });
      const { error } = await query;
      if (error) throw new Error(error.message);
      setEditingProductId(null);
      formElement.reset();
    }, "Produto salvo. Estoque inicial permanece zerado até registrar uma movimentação.");
  };

  const changeStatus = async (orderId: number, status: string) => {
    await run(async () => {
      const { error } = await createClient().rpc("update_order_status", {
        p_order_id: orderId,
        p_new_status: status,
        p_note: null,
      });
      if (error) throw new Error(error.message);
    }, "Status do pedido atualizado.");
  };

  const changeCustomerStatus = async (customerId: string, status: string) => {
    await run(async () => {
      const { error } = await createClient().rpc("update_customer_status", {
        p_customer_id: customerId,
        p_status: status,
      });
      if (error) throw new Error(error.message);
    }, "Status do cliente atualizado.");
  };

  const changeTerm = async (
    customerId: string,
    days: number,
    enabled: boolean,
  ) => {
    await run(async () => {
      const { error } = await createClient().rpc("set_customer_payment_term", {
        p_customer_id: customerId,
        p_days: days,
        p_enabled: enabled,
      });
      if (error) throw new Error(error.message);
    }, `Prazo de ${days} dias atualizado.`);
  };

  const registerStock = async (productId: number) => {
    const quantity = Number(stockInputs[productId]);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setErrorNotice(true);
      setNotice("Informe uma quantidade inteira positiva para o movimento.");
      return;
    }
    const reason = window.prompt("Motivo da entrada de estoque:");
    if (!reason?.trim()) return;
    await run(async () => {
      const { error } = await createClient().rpc("register_stock_movement", {
        p_product_id: productId,
        p_type: "entrada",
        p_quantity: quantity,
        p_reason: reason.trim(),
      });
      if (error) throw new Error(error.message);
    }, "Entrada de estoque registrada.");
  };

  const markPaid = async (orderId: number) => {
    await run(async () => {
      const { error } = await createClient().rpc("mark_payment", {
        p_order_id: orderId,
        p_amount: null,
        p_method: "manual",
        p_note: null,
      });
      if (error) throw new Error(error.message);
    }, "Pagamento registrado.");
  };

  const saveSetting = async (key: string) => {
    await run(async () => {
      const { error } = await createClient().rpc("update_commercial_setting", {
        p_key: key,
        p_value: commercialSettings[key] ?? "0",
      });
      if (error) throw new Error(error.message);
    }, "Regra comercial atualizada.");
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" className="admin-brand">
          <Image src="/santa-edwiges-logo.png" alt="" width={48} height={48} />
          <span>Santa Edwiges <small>Painel administrativo</small></span>
        </Link>
        <Link href="/" className="admin-store-link">Voltar à loja</Link>
      </header>
      <section className="admin-content">
        <div className="admin-title">
          <div>
            <p className="admin-eyebrow">OPERAÇÃO DA DISTRIBUIDORA</p>
            <h1>Painel de gestão</h1>
            <p>Pedidos, clientes, produtos e estoque em um só lugar.</p>
          </div>
          <button
            type="button"
            className="admin-secondary"
            onClick={() => void run(async () => {
              const { error } = await createClient().auth.signOut();
              if (error) throw new Error(error.message);
              router.push("/");
            }, "Sessão encerrada.")}
          >
            Sair
          </button>
        </div>
        {liveOrderNotice && <p className="admin-live" role="status">{liveOrderNotice}</p>}
        {notice && <p className={errorNotice ? "admin-alert error" : "admin-alert"} role="status">{notice}</p>}
        <section className="admin-metrics" aria-label="Resumo">
          <article><span>Pedidos novos</span><strong>{totals.newOrders}</strong></article>
          <article><span>Em andamento</span><strong>{totals.inProgress}</strong></article>
          <article><span>Entregues</span><strong>{totals.delivered}</strong></article>
          <article><span>Cancelados</span><strong>{totals.cancelled}</strong></article>
          <article><span>Clientes</span><strong>{customers.length}</strong></article>
          <article><span>Produtos</span><strong>{products.length}</strong></article>
          <article><span>Estoque baixo</span><strong>{lowStock.length}</strong></article>
          <article><span>Vendas registradas</span><strong>{currency.format(totals.sales)}</strong></article>
          <article><span>Prazo em aberto</span><strong>{totals.due}</strong></article>
          <article><span>Contas vencidas</span><strong>{totals.overdue}</strong></article>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">ACOMPANHAMENTO</p><h2>Pedidos</h2></div>
            <span>{filteredOrders.length} de {orders.length} pedidos recentes</span>
          </div>
          <div className="admin-order-filters">
            <input
              aria-label="Buscar por pedido ou cliente"
              placeholder="Pedido ou empresa"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
            />
            <select
              aria-label="Filtrar por status"
              value={orderStatusFilter}
              onChange={(event) => setOrderStatusFilter(event.target.value)}
            >
              <option value="todos">Todos os status</option>
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              aria-label="Filtrar por pagamento"
              value={orderPaymentFilter}
              onChange={(event) => setOrderPaymentFilter(event.target.value)}
            >
              <option value="todos">Todos os pagamentos</option>
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao">Cartão</option>
              <option value="combinar">A combinar</option>
              <option value="prazo">A prazo</option>
            </select>
            <input
              aria-label="Filtrar por data"
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
            />
            <label><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /> Apenas vencidos</label>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Pedido / cliente</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th><th>Ação</th></tr></thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.order_number}</strong><small>{order.customer_company} · {new Date(order.created_at).toLocaleString("pt-BR")}</small></td>
                    <td>{order.order_items.map((item, index) => <div key={`${order.id}-${index}`}>{item.quantity} × {item.product_name} · {currency.format(item.price_at_purchase)} / {item.unit}</div>)}</td>
                    <td>{({
                      pix: "PIX",
                      dinheiro: "Dinheiro",
                      cartao: "Cartão",
                      combinar: "A combinar",
                      prazo: "A prazo",
                    } as Record<string, string>)[order.payment_method ?? ""] ?? "—"}{order.payment_term_days ? <small>Prazo {order.payment_term_days} dias · vence {order.due_date}</small> : null}{order.payment_status && <small>{order.payment_status}</small>}</td>
                    <td>{currency.format(order.total)}<small>Subtotal {currency.format(order.subtotal)} · entrega {currency.format(order.delivery_fee)}</small>{order.discount_amount > 0 && <small>Desconto −{currency.format(order.discount_amount)}</small>}{order.fee_amount > 0 && <small>Taxa +{currency.format(order.fee_amount)}</small>}</td>
                    <td>
                      <select
                        aria-label={`Status do pedido ${order.order_number}`}
                        value={order.status}
                        onChange={(event) => void changeStatus(order.id, event.target.value)}
                      >
                        {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td>
                      <Link className="admin-secondary" href={`/admin/orders/${order.id}/receipt`} target="_blank">
                        Recibo
                      </Link>{" "}
                      {order.payment_status && order.payment_status !== "pago" && order.payment_status !== "cancelado" && (
                        <button className="admin-secondary" type="button" onClick={() => void markPaid(order.id)}>Marcar pago</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && <tr><td colSpan={6}>Nenhum pedido corresponde aos filtros.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">CADASTROS</p><h2>Clientes</h2></div></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Empresa / responsável</th><th>Contato</th><th>Cidade</th><th>Status</th><th>Prazo autorizado</th></tr></thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.empresa}</strong>
                      <small>{customer.responsavel}</small>
                      <small>
                        {orders.filter((order) => order.customer_id === customer.id).length} pedido(s) ·{" "}
                        {currency.format(orders
                          .filter((order) => order.customer_id === customer.id)
                          .reduce((sum, order) => sum + order.total, 0))}
                      </small>
                    </td>
                    <td>{customer.telefone ?? "—"}</td><td>{customer.cidade ?? "—"}</td>
                    <td>
                      <select
                        aria-label={`Status de ${customer.empresa}`}
                        value={customer.status}
                        disabled={!canAdminister}
                        onChange={(event) => void changeCustomerStatus(customer.id, event.target.value)}
                      >
                        <option value="pendente">Pendente</option><option value="ativo">Ativo</option><option value="bloqueado">Bloqueado</option>
                      </select>
                    </td>
                    <td>{[3, 7, 14].map((days) => (
                      <label className="admin-term" key={`${customer.id}-${days}`}>
                        <input
                          type="checkbox"
                          disabled={!canAdminister}
                          checked={customerTerms[customer.id]?.includes(days) ?? false}
                          onChange={(event) => void changeTerm(customer.id, days, event.target.checked)}
                        />{days} dias
                      </label>
                    ))}</td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={5}>Nenhum cliente cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div><p className="admin-eyebrow">RASTREABILIDADE</p><h2>Movimentações de estoque</h2></div>
            <span>Últimos {stockMovements.length} registros</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Data</th><th>Produto</th><th>Movimento</th><th>Quantidade</th><th>Motivo</th></tr></thead>
              <tbody>
                {stockMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{new Date(movement.created_at).toLocaleString("pt-BR")}</td>
                    <td>{products.find((product) => product.id === movement.product_id)?.name ?? `Produto ${movement.product_id}`}</td>
                    <td>{movement.movement_type}</td>
                    <td>{movement.quantity}</td>
                    <td>{movement.reason}</td>
                  </tr>
                ))}
                {stockMovements.length === 0 && <tr><td colSpan={5}>Nenhuma movimentação de estoque registrada.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading"><div><p className="admin-eyebrow">CATÁLOGO</p><h2>Produtos e estoque</h2></div></div>
          {canAdminister && (
            <form key={editingProductId ?? "new"} className="admin-product-form" onSubmit={(event) => void saveProduct(event)}>
              <input name="name" required minLength={2} placeholder="Nome do produto" defaultValue={editingProduct?.name ?? ""} />
              <input name="description" placeholder="Descrição" defaultValue={editingProduct?.description ?? ""} />
              <select name="category_id" required defaultValue={categories.find((category) => category.name === editingProduct?.category)?.id ?? ""}><option value="" disabled>Categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <input name="unit" required placeholder="Unidade (cx, un)" defaultValue={editingProduct?.unit ?? ""} />
              <input name="price" required type="number" min="0" step="0.01" placeholder="Preço do pacote/caixa" defaultValue={editingProduct?.price ?? ""} />
              <input name="unit_price_display" type="number" min="0" step="0.01" placeholder="Preço por unidade (exibição)" defaultValue={editingProduct?.unitPriceDisplay ?? ""} />
              <input name="stock_minimo" required type="number" min="0" step="1" defaultValue={editingProduct?.minStock ?? 0} placeholder="Estoque mínimo" />
              <input name="bulk_min" type="number" min="1" step="1" placeholder="Mínimo promocional" defaultValue={editingProduct?.bulkMin ?? ""} />
              <input name="bulk_price" type="number" min="0" step="0.01" placeholder="Preço promocional" defaultValue={editingProduct?.bulkPrice ?? ""} />
              <input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
              <label><input name="active" type="checkbox" defaultChecked={editingProduct?.active ?? true} /> Ativo</label>
              <button className="admin-primary" type="submit">{editingProductId ? "Salvar edição" : "Cadastrar produto"}</button>
              {editingProductId && <button className="admin-secondary" type="button" onClick={() => setEditingProductId(null)}>Cancelar edição</button>}
            </form>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Produto</th><th>Preço</th><th>Estoque físico / reservado / disponível</th><th>Mínimo</th><th>Movimento / edição</th></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><small>{product.category} · {product.active ? "Ativo" : "Inativo"}</small></td>
                    <td>{currency.format(product.price)}{product.unitPriceDisplay !== undefined && <small>≈ {currency.format(product.unitPriceDisplay)} / unidade</small>}{product.bulkMin && product.bulkPrice ? <small>{product.bulkMin}+ por {currency.format(product.bulkPrice)}</small> : null}</td>
                    <td>{product.stockPhysical ?? product.stock} / {product.stockReserved ?? 0} / {product.stock} {product.unit}</td>
                    <td>{product.minStock}{product.stock <= product.minStock && <small className="admin-low-stock">Estoque baixo</small>}</td>
                    <td className="admin-row-actions">
                      {canAdminister && <button className="admin-secondary" type="button" onClick={() => setEditingProductId(product.id)}>Editar</button>}
                      <input
                        aria-label={`Quantidade de entrada ${product.name}`}
                        type="number"
                        min="1"
                        step="1"
                        value={stockInputs[product.id] ?? ""}
                        onChange={(event) => setStockInputs({ ...stockInputs, [product.id]: event.target.value })}
                      />
                      <button className="admin-secondary" type="button" onClick={() => void registerStock(product.id)}>Entrada</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canAdminister && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><p className="admin-eyebrow">REGRAS DO NEGÓCIO</p><h2>Configurações</h2></div></div>
            <div className="admin-settings">
              {[
                ["minimum_order", "Pedido mínimo (R$)"],
                ["delivery_fee", "Taxa de entrega (R$)"],
                ["cash_discount_percent", "Desconto em dinheiro (%)"],
                ["card_fee_percent", "Acréscimo no cartão (%)"],
              ].map(([key, label]) => (
                <label key={key}>{label}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commercialSettings[key] ?? ""}
                    onChange={(event) => setCommercialSettings({ ...commercialSettings, [key]: event.target.value })}
                  />
                  <button className="admin-secondary" type="button" onClick={() => void saveSetting(key)}>Salvar</button>
                </label>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
