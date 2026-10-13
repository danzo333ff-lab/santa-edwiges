"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import type { Product } from "@/lib/products";
import {
  calculateOrderTotal,
  calculateUnitPrice,
} from "@/lib/order-pricing";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  email: string;
  company: string;
  phone: string;
  status: "pendente" | "ativo" | "bloqueado";
  paymentTerms: number[];
  profile: CustomerProfile;
};

type CustomerProfile = {
  contact: string;
  email: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  zip: string;
  complement: string;
};

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

type CustomerOrder = {
  id: number;
  date: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  adjustmentType: "discount" | "fee" | "none";
  adjustmentAmount: number;
  total: number;
  paymentStatus: string | null;
  payment: string;
  address: string;
  note: string;
  company: string;
  phone: string;
  orderNumber: string;
  dueDate: string | null;
  paymentTermDays: number | null;
};

type StorefrontProps = {
  products: Product[];
  backendConfigured: boolean;
  commercialSettings: {
    deliveryFee: number;
    minimumOrder: number;
    cashDiscountPercent: number;
    cardFeePercent: number;
  };
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const categoryIcons: Record<string, string> = {
  variados: "🍬",
  embalagens: "🥡",
  "bebidas nao alcoolicas": "🥤",
  tabacaria: "📦",
  "bebidas alcoolicas": "🍷",
  bebidas: "🥤",
  graos: "🌾",
  higiene: "🧻",
  limpieza: "🧼",
  padaria: "🥖",
};

const categoryNames: Record<string, string> = {
  graos: "Grãos",
  limpieza: "Limpeza",
};

function categoryKey(category: string) {
  return category
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function categoryLabel(category: string) {
  return categoryNames[categoryKey(category)] ?? category;
}

const emptyProfile: CustomerProfile = {
  contact: "",
  email: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  zip: "",
  complement: "",
};

const orderStatusLabels: Record<string, string> = {
  pendente: "Recebido",
  aprovado: "Aprovado",
  em_preparo: "Em separação",
  enviado: "Saiu para entrega",
  concluido: "Entregue",
  cancelado: "Cancelado",
  rejeitado: "Cancelado",
};

function fullAddress(profile: CustomerProfile) {
  return [
    profile.address,
    profile.number,
    profile.neighborhood,
    profile.city,
    profile.zip,
    profile.complement,
  ]
    .filter(Boolean)
    .join(", ");
}

function productUnitPrice(product: Product, quantity: number) {
  return calculateUnitPrice(
    product.price,
    quantity,
    product.bulkMin,
    product.bulkPrice,
  );
}

const profileSchema = z.object({
  contact: z.string(),
  email: z.string(),
  address: z.string(),
  number: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  zip: z.string(),
  complement: z.string(),
});

export default function Storefront({
  products,
  backendConfigured,
  commercialSettings,
}: StorefrontProps) {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loginPhone, setLoginPhone] = useState("");
  const [loginCompany, setLoginCompany] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginContact, setLoginContact] = useState("");
  const [loginPhoneNumber, setLoginPhoneNumber] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [profileCompany, setProfileCompany] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileNoticeIsError, setProfileNoticeIsError] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<CustomerOrder | null>(null);
  const [checkoutLoginNotice, setCheckoutLoginNotice] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("PIX");
  const [paymentTermDays, setPaymentTermDays] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [orderNotice, setOrderNotice] = useState("");
  const [orderHistory, setOrderHistory] = useState<CustomerOrder[]>([]);
  const orderIdempotencyKey = useRef<string | null>(null);
  const router = useRouter();

  const categories = useMemo(
    () => [...new Set(products.map((product) => product.category))],
    [products],
  );
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "todos" || product.category === activeCategory;
    const searchableText =
      `${product.name} ${product.description} ${categoryLabel(product.category)}`.toLocaleLowerCase(
        "pt-BR",
      );
    return matchesCategory && searchableText.includes(normalizedSearch);
  });

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => {
      const product = products.find((item) => item.id === Number(id));
      return product
        ? { product, quantity, unitPrice: productUnitPrice(product, quantity) }
        : null;
    })
    .filter(
      (
        item,
      ): item is { product: Product; quantity: number; unitPrice: number } =>
        item !== null,
    );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce(
    (sum, item) =>
      sum + Math.round(item.unitPrice * item.quantity * 100) / 100,
    0,
  );
  const paymentAdjustmentRate =
    payment === "Dinheiro"
      ? -commercialSettings.cashDiscountPercent / 100
      : payment === "Cartão"
        ? commercialSettings.cardFeePercent / 100
        : 0;
  const paymentTotals = calculateOrderTotal(
    total,
    commercialSettings.deliveryFee,
    payment === "Dinheiro"
      ? "dinheiro"
      : payment === "Cartão"
        ? "cartao"
        : payment === "Prazo"
          ? "prazo"
          : payment === "PIX"
            ? "pix"
            : "combinar",
    commercialSettings.cashDiscountPercent,
    commercialSettings.cardFeePercent,
  );
  const paymentAdjustmentAmount = paymentTotals.adjustment;
  const finalTotal = paymentTotals.total;

  const loadCustomerProfile = async (userId: string, email: string) => {
    const supabase = createClient();
    const [{ data, error }, { data: terms, error: termsError }] = await Promise.all([
      supabase
      .from("profiles")
      .select(
        "id, role, status, empresa, responsavel, telefone, whatsapp, email, endereco, numero, complemento, bairro, cidade, cep",
      )
      .eq("id", userId)
      .single(),
      supabase
        .from("customer_payment_terms")
        .select("days")
        .eq("customer_id", userId)
        .eq("enabled", true)
        .order("days"),
    ]);
    if (error) throw new Error(`Não foi possível carregar o perfil: ${error.message}`);
    if (termsError) {
      throw new Error(`Não foi possível carregar os prazos autorizados: ${termsError.message}`);
    }
    if (data.role !== "cliente") {
      throw new Error("Esta conta deve acessar o painel administrativo.");
    }

    const customerProfile: CustomerProfile = {
      contact: data.responsavel ?? "",
      email: data.email ?? email,
      address: data.endereco ?? "",
      number: data.numero ?? "",
      neighborhood: data.bairro ?? "",
      city: data.cidade ?? "",
      zip: data.cep ?? "",
      complement: data.complemento ?? "",
    };
    return {
      id: data.id,
      email,
      company: data.empresa ?? "",
      phone: data.whatsapp ?? data.telefone ?? "",
      status: data.status,
      paymentTerms: (terms ?? []).map((term) => term.days),
      profile: customerProfile,
    } satisfies Customer;
  };

  const loadOrders = async (customerId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, subtotal, delivery_fee, discount_amount, fee_amount, total, payment_method, payment_status, payment_term_days, due_date, delivery_address, observation, customer_company, customer_phone, created_at, order_items(product_id, product_name, quantity, price_at_purchase)",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Não foi possível carregar os pedidos: ${error.message}`);

    const history: CustomerOrder[] = (data ?? []).map((order) => {
      const discount = Number(order.discount_amount);
      const fee = Number(order.fee_amount);
      return {
        id: Number(order.id),
        date: order.created_at,
        status: orderStatusLabels[String(order.status)] ?? String(order.status),
        items: order.order_items.map((item) => ({
          id: Number(item.product_id),
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.price_at_purchase),
        })),
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.delivery_fee ?? 0),
        adjustmentType: discount > 0 ? "discount" : fee > 0 ? "fee" : "none",
        adjustmentAmount: discount || fee,
        total: Number(order.total),
        paymentStatus: order.payment_status,
        payment: ({
          pix: "PIX",
          dinheiro: "Dinheiro",
          cartao: "Cartão",
          combinar: "A combinar",
          prazo: `Pagamento a prazo — ${order.payment_term_days} dias`,
        } as Record<string, string>)[String(order.payment_method ?? "combinar")] ?? "A combinar",
        address: order.delivery_address ?? "",
        note: order.observation ?? "",
        company: order.customer_company ?? "",
        phone: order.customer_phone ?? "",
        orderNumber: order.order_number,
        dueDate: order.due_date,
        paymentTermDays: order.payment_term_days,
      };
    });
    startTransition(() => setOrderHistory(history));
  };

  useEffect(() => {
    if (!backendConfigured) return;

    let cancelled = false;
    const restoreSession = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!data.user) return;
        const { data: roleData, error: roleError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (roleError) throw roleError;
        if (roleData.role === "admin" || roleData.role === "funcionario") {
          router.push("/admin");
          return;
        }
        const customer = await loadCustomerProfile(
          data.user.id,
          data.user.email ?? "",
        );
        if (cancelled) return;
        setCurrentUser(customer);
        setProfile(customer.profile);
        setProfileCompany(customer.company);
        setProfilePhone(customer.phone);
        await loadOrders(customer.id);
      } catch (error) {
        if (!cancelled) {
          setAccountError(
            error instanceof Error ? error.message : "Não foi possível carregar a conta.",
          );
        }
      }
    };
    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [backendConfigured, router]);

  const currentUserId = currentUser?.id;
  useEffect(() => {
    if (!backendConfigured || !currentUserId) return;
    const supabase = createClient();
    const customerId = currentUserId;
    const channel = supabase
      .channel(`customer-orders-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          void loadOrders(customerId).catch((error: unknown) => {
            setAccountError(
              error instanceof Error ? error.message : "Não foi possível atualizar os pedidos.",
            );
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [backendConfigured, currentUserId]);

  const openAccount = () => {
    setAccountError("");
    setAccountOpen(true);
  };

  const addToCart = (product: Product) => {
    if ((cart[product.id] ?? 0) >= product.stock) {
      setOrderNotice(`Estoque disponível insuficiente para ${product.name}.`);
      return;
    }
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + 1,
    }));
    setOrderNotice("");
  };

  const changeQuantity = (productId: number, difference: number) => {
    setCart((current) => {
      const quantity = (current[productId] ?? 0) + difference;
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      const product = products.find((item) => item.id === productId);
      if (product && quantity > product.stock) return current;
      return { ...current, [productId]: quantity };
    });
  };

  const startCheckout = () => {
    if (!currentUser) {
      setCheckoutLoginNotice(true);
      openAccount();
      return;
    }
    setCheckoutLoginNotice(false);
    setAddress(fullAddress(profile));
    setCheckoutOpen((isOpen) => !isOpen);
  };

  const loginCustomer = async () => {
    const email = loginPhone.trim().toLowerCase();
    const company = loginCompany.trim();
    const password = loginPassword;
    if (!z.string().email().safeParse(email).success) {
      setLoginError("Informe um e-mail válido.");
      return;
    }
    if (creatingAccount && company.length < 2) {
      setLoginError("Informe o nome da empresa.");
      return;
    }
    if (creatingAccount && loginContact.trim().length < 2) {
      setLoginError("Informe o nome do responsável.");
      return;
    }
    if (creatingAccount && loginPhoneNumber.replace(/\D/g, "").length < 10) {
      setLoginError("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (password.length < 8) {
      setLoginError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setAuthBusy(true);
    try {
      const supabase = createClient();
      if (creatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              empresa: company,
              responsavel: loginContact.trim(),
              telefone: loginPhoneNumber.trim(),
            },
          },
        });
        if (error) throw error;
        if (!data.session || !data.user) {
          setLoginError(
            "Conta criada. Confirme seu e-mail para ativar o acesso; a equipe aprovará o cadastro antes do primeiro pedido.",
          );
          return;
        }
        const customer = await loadCustomerProfile(data.user.id, email);
        setCurrentUser(customer);
        setProfile(customer.profile);
        setProfileCompany(customer.company);
        setProfilePhone(customer.phone);
        await loadOrders(customer.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const { data: roleData, error: roleError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (roleError) throw roleError;
        if (roleData.role === "admin" || roleData.role === "funcionario") {
          router.push("/admin");
          return;
        }
        const customer = await loadCustomerProfile(
          data.user.id,
          data.user.email ?? email,
        );
        setCurrentUser(customer);
        setProfile(customer.profile);
        setProfileCompany(customer.company);
        setProfilePhone(customer.phone);
        await loadOrders(customer.id);
      }
      setLoginPassword("");
      setLoginError("");
      setAccountError("");
      setCheckoutLoginNotice(false);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Não foi possível autenticar a conta.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const logoutCustomer = async () => {
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      setProfile(emptyProfile);
      setOrderHistory([]);
      setCheckoutOpen(false);
      setAccountError("");
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Não foi possível encerrar a sessão.",
      );
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      const { error } = await createClient().rpc("cancel_my_order", {
        p_order_id: orderId,
        p_note: null,
      });
      if (error) throw error;
      if (currentUser) await loadOrders(currentUser.id);
      setAccountError("");
    } catch (error) {
      setAccountError(
        error instanceof Error ? error.message : "Não foi possível cancelar o pedido.",
      );
    }
  };

  const finishOrder = async () => {
    if (!currentUser) {
      setAccountOpen(true);
      return;
    }
    if (currentUser.status !== "ativo") {
      setOrderNotice("Seu cadastro precisa ser aprovado antes de fazer pedidos.");
      return;
    }
    if (cartItems.length === 0) {
      setOrderNotice("Seu carrinho está vazio.");
      return;
    }
    if (payment === "Prazo" && !paymentTermDays) {
      setOrderNotice("Selecione um dos prazos autorizados para sua conta.");
      return;
    }
    const checkedProfile = profileSchema.safeParse(profile);
    if (!checkedProfile.success || !address.trim()) {
      setOrderNotice("Complete o endereço de entrega no seu perfil.");
      return;
    }
    setOrderBusy(true);
    try {
      const supabase = createClient();
      orderIdempotencyKey.current ??= crypto.randomUUID();
      const paymentMethod: Record<string, string> = {
        PIX: "pix",
        Dinheiro: "dinheiro",
        "Cartão": "cartao",
        "A combinar": "combinar",
        Prazo: "prazo",
      };
      const { data, error } = await supabase.rpc("create_order", {
        p_items: cartItems.map(({ product, quantity }) => ({
          product_id: product.id,
          quantity,
        })),
        p_payment_method: paymentMethod[payment] ?? "pix",
        p_idempotency_key: orderIdempotencyKey.current,
        p_delivery_address: address.trim(),
        p_note: note.trim() || null,
        p_payment_term_days: payment === "Prazo" ? paymentTermDays : null,
      });
      if (error) throw new Error(`Não foi possível criar o pedido: ${error.message}`);
      const orderId = Number(data);
      await loadOrders(currentUser.id);
      setCart({});
      setCheckoutOpen(false);
      setAddress("");
      setNote("");
      setPayment("PIX");
      orderIdempotencyKey.current = null;
      setOrderNotice(`Pedido #${orderId} registrado com sucesso!`);
    } catch (error) {
      setOrderNotice(
        error instanceof Error ? error.message : "Não foi possível finalizar o pedido.",
      );
    } finally {
      setOrderBusy(false);
    }
  };

  const saveCustomerProfile = async () => {
    if (!currentUser) return;
    const company = profileCompany.trim();
    const phone = profilePhone.trim();
    if (company.length < 2) {
      setProfileNoticeIsError(true);
      setProfileNotice("Informe o nome da empresa.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setProfileNoticeIsError(true);
      setProfileNotice("Informe um telefone válido com DDD.");
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          empresa: company,
          responsavel: profile.contact.trim(),
          telefone: phone,
          whatsapp: phone,
          endereco: profile.address.trim(),
          numero: profile.number.trim(),
          bairro: profile.neighborhood.trim(),
          cidade: profile.city.trim(),
          cep: profile.zip.trim(),
          complemento: profile.complement.trim(),
        })
        .eq("id", currentUser.id);
      if (error) throw error;
      const nextEmail = profile.email.trim().toLowerCase();
      let emailNotice = "";
      if (nextEmail && nextEmail !== currentUser.email.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: nextEmail,
        });
        if (emailError) throw emailError;
        emailNotice = " Confirme o novo endereço pelo link enviado pelo Supabase.";
      }
      const nextCustomer = { ...currentUser, company, phone, profile };
      setCurrentUser(nextCustomer);
      setProfileCompany(company);
      setProfilePhone(phone);
      setProfileNoticeIsError(false);
      setProfileNotice(`Dados da empresa atualizados com sucesso.${emailNotice}`);
    } catch (error) {
      setProfileNoticeIsError(true);
      setProfileNotice(
        error instanceof Error
          ? error.message
        : "Não foi possível salvar os dados do perfil.",
      );
    }
  };

  const updatePassword = async () => {
    if (!currentUser) return;
    if (newPassword.length < 8) {
      setProfileNoticeIsError(true);
      setProfileNotice("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    try {
      const { error } = await createClient().auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setProfileNoticeIsError(false);
      setProfileNotice("Senha atualizada com sucesso.");
    } catch (error) {
      setProfileNoticeIsError(true);
      setProfileNotice(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a senha.",
      );
    }
  };

  const sendPasswordReset = async () => {
    const email = loginPhone.trim().toLowerCase();
    if (!z.string().email().safeParse(email).success) {
      setLoginError("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setLoginError("Se o e-mail estiver cadastrado, você receberá um link de recuperação.");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.",
      );
    }
  };

  return (
    <>
      {!backendConfigured && (
        <div className="notice show" role="status">
          Configure o Supabase no arquivo .env.local e aplique as migrations para
          carregar o catálogo e habilitar contas e pedidos reais.
        </div>
      )}
      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#inicio" aria-label="Santa Edwiges, início">
            <Image
              className="brand-logo"
              src="/santa-edwiges-logo.png"
              alt="Logo Santa Edwiges"
              width={640}
              height={650}
              loading="eager"
            />
            <span className="brand-name">
              Santa Edwiges
              <small>Mercearia &amp; Distribuidora</small>
            </span>
          </a>
          <div className="header-actions">
            <button className="account-btn" type="button" onClick={openAccount}>
              👤 <span className="account-name">{currentUser?.company ?? "Entrar"}</span>
            </button>
            <a className="account-btn admin-store-link" href="/admin">Administração</a>
            <button
              className="cart-btn"
              type="button"
              onClick={() =>
                document
                  .querySelector(".sidebar")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              🛒 Carrinho <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="inicio">
        {currentUser && currentUser.status !== "ativo" && (
          <div className="notice show" role="status">
            {currentUser.status === "pendente"
              ? "Seu cadastro está aguardando aprovação. Você poderá fazer pedidos quando ele for aprovado."
              : "Sua conta está bloqueada. Entre em contato com a Santa Edwiges."}
          </div>
        )}
        <section className="hero-home">
          <div className="hero-home-inner">
            <div>
              <h1>
                Bem-vindo à <span>Santa Edwiges</span>
              </h1>
              <p>
                Mercearia &amp; Distribuidora. Encontre os produtos que você
                precisa, monte seu pedido de forma rápida e envie tudo organizado
                para nossa equipe.
              </p>
              <div className="hero-actions">
                <a className="hero-action primary" href="#pedidos">
                  Fazer meu pedido
                </a>
                <a className="hero-action secondary" href="#como-funciona">
                  Como funciona
                </a>
              </div>
            </div>
            <div className="hero-logo-card">
              <Image
                src="/santa-edwiges-logo.png"
                alt="Santa Edwiges — Mercearia & Distribuidora"
                width={640}
                height={650}
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="features" id="como-funciona">
          <div className="section-title">
            <h2>Comprar ficou mais simples</h2>
            <p>Uma experiência pensada para facilitar o dia a dia dos nossos clientes.</p>
          </div>
          <div className="feature-grid">
            <article className="feature">
              <div className="feature-icon">🛒</div>
              <h3>Monte seu pedido</h3>
              <p>
                Escolha os produtos, defina as quantidades e confira tudo no
                carrinho antes de enviar.
              </p>
            </article>
            <article className="feature">
              <div className="feature-icon">📋</div>
              <h3>Pedido organizado</h3>
              <p>
                Suas informações e produtos ficam reunidos em um único pedido,
                sem depender de várias mensagens.
              </p>
            </article>
            <article className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Mais agilidade</h3>
              <p>
                Menos troca de mensagens e mais facilidade para nossa equipe
                separar e processar seu pedido.
              </p>
            </article>
          </div>
        </section>

        <section className="cta" id="pedidos">
          <h2>Pronto para fazer seu pedido?</h2>
          <p>Confira nosso catálogo abaixo e monte seu pedido.</p>
        </section>

        <section className="hero catalog-heading">
          <h2>Faça seu pedido</h2>
          <p>Pesquise pelo produto ou navegue pelas categorias para montar seu pedido.</p>
        </section>

        <div className="layout">
          <section aria-label="Catálogo de produtos">
            <div className="catalog-tools">
              <div className="search-wrap">
                <span className="search-icon" aria-hidden="true">🔎</span>
                <input
                  aria-label="Pesquisar produtos"
                  type="search"
                  placeholder="Pesquisar produto..."
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                {searchTerm && (
                  <button
                    className="clear-search show"
                    type="button"
                    aria-label="Limpar pesquisa"
                    onClick={() => setSearchTerm("")}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="category-tabs" aria-label="Categorias">
                <button
                  className={`category-tab${activeCategory === "todos" ? " active" : ""}`}
                  type="button"
                  onClick={() => setActiveCategory("todos")}
                >
                  Todos <span>({products.length})</span>
                </button>
                {categories.map((category) => (
                  <button
                    className={`category-tab${activeCategory === category ? " active" : ""}`}
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    {categoryIcons[categoryKey(category)] ?? "📦"}{" "}
                    {categoryLabel(category)}{" "}
                    <span>
                      ({products.filter((product) => product.category === category).length})
                    </span>
                  </button>
                ))}
              </div>
              <p className="catalog-status" aria-live="polite">
                {normalizedSearch
                  ? `${visibleProducts.length} produto(s) encontrado(s) para “${searchTerm.trim()}”`
                  : `Mostrando ${visibleProducts.length} produto(s) em ${
                      activeCategory === "todos"
                        ? "Todos os produtos"
                        : categoryLabel(activeCategory)
                    }`}
              </p>
            </div>

            <div className="products">
              {visibleProducts.length === 0 ? (
                <div className="no-results">
                  <strong>Nenhum produto encontrado</strong>
                  <span>Tente outro nome ou escolha outra categoria.</span>
                </div>
              ) : (
                visibleProducts.map((product) => (
                  <article className="product" key={product.id}>
                    <div className="product-img">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={420}
                          height={420}
                          unoptimized
                        />
                      ) : (
                        <span className="product-placeholder">Imagem indisponível</span>
                      )}
                    </div>
                    <h3>{product.name}</h3>
                    <p>
                      {categoryLabel(product.category)} · {product.description}
                    </p>
                    <div className="price">
                      {currency.format(product.price)}{" "}
                      <small>por {product.unit}</small>
                    </div>
                    {product.unitPriceDisplay && (
                      <div className="unit-price-note">
                        ≈ {currency.format(product.unitPriceDisplay)} — preço unitário informado
                      </div>
                    )}
                    {product.bulkMin && product.bulkPrice !== undefined && (
                      <div className="product-offer">
                        🔥 {product.bulkMin}+ unidades:{" "}
                        {currency.format(product.bulkPrice)} cada
                      </div>
                    )}
                    <div className="product-stock">
                      {product.stock} {product.unit} em estoque
                    </div>
                    <button
                      className="add"
                      type="button"
                      disabled={!backendConfigured || product.stock <= (cart[product.id] ?? 0)}
                      onClick={() => addToCart(product)}
                    >
                      {product.stock <= 0
                        ? "Sem estoque"
                        : !backendConfigured
                          ? "Supabase não configurado"
                          : "Adicionar ao pedido"}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="sidebar" aria-label="Seu pedido">
            <h2>Seu pedido</h2>
            {cartItems.length === 0 ? (
              <div className="empty">Seu carrinho está vazio.</div>
            ) : (
              <div className="cart-items">
                {cartItems.map(({ product, quantity, unitPrice }) => (
                  <div className="cart-item" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <small>
                        {currency.format(unitPrice)} cada
                        {product.bulkMin &&
                        product.bulkPrice !== undefined &&
                        quantity >= product.bulkMin
                          ? ` · preço por volume (${product.bulkMin}+ unidades)`
                          : ""}
                      </small>
                      <div className="qty">
                        <button
                          type="button"
                          aria-label={`Remover uma unidade de ${product.name}`}
                          onClick={() => changeQuantity(product.id, -1)}
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Adicionar uma unidade de ${product.name}`}
                          onClick={() => changeQuantity(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <strong>
                      {currency.format(unitPrice * quantity)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
            <div className="checkout-breakdown">
              <div>
                <span>Subtotal</span>
                <strong>{currency.format(total)}</strong>
              </div>
              {total < commercialSettings.minimumOrder && (
                <div className="minimum-order-hint">
                  <span>Pedido mínimo</span>
                  <strong>{currency.format(commercialSettings.minimumOrder)}</strong>
                </div>
              )}
              {commercialSettings.deliveryFee > 0 && (
                <div>
                  <span>Entrega</span>
                  <strong>{currency.format(commercialSettings.deliveryFee)}</strong>
                </div>
              )}
              {paymentAdjustmentRate !== 0 && (
                <div>
                  <span>
                    {paymentAdjustmentRate < 0
                      ? `Desconto (${commercialSettings.cashDiscountPercent}%)`
                      : `Taxa do cartão (${commercialSettings.cardFeePercent}%)`}
                  </span>
                  <strong className={paymentAdjustmentRate < 0 ? "saving" : "surcharge"}>
                    {paymentAdjustmentRate < 0 ? "−" : "+"}
                    {currency.format(paymentAdjustmentAmount)}
                  </strong>
                </div>
              )}
              <div className="total">
                <span>Total final</span>
                <span>{currency.format(finalTotal)}</span>
              </div>
            </div>
            <button
              className="primary checkout-button"
              type="button"
              disabled={cartItems.length === 0}
              onClick={startCheckout}
            >
              Continuar pedido
            </button>
            {checkoutLoginNotice && (
              <p className="login-required show">
                Entre na sua conta para finalizar o pedido.
              </p>
            )}
            {checkoutOpen && (
              <div className="form open">
                <label htmlFor="deliveryAddress">Endereço de entrega</label>
                <textarea
                  id="deliveryAddress"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Rua, número, bairro..."
                />
                <label htmlFor="payment">Forma de pagamento</label>
                <select
                  id="payment"
                  value={payment}
                  onChange={(event) => {
                    setPayment(event.target.value);
                    setPaymentTermDays(null);
                  }}
                >
                  <option value="PIX">PIX — sem taxa</option>
                  <option value="Dinheiro">Dinheiro — {commercialSettings.cashDiscountPercent}% de desconto</option>
                  <option value="Cartão">Cartão — {commercialSettings.cardFeePercent}% de taxa</option>
                  <option value="A combinar">A combinar — sem ajuste</option>
                  {currentUser && currentUser.paymentTerms.length > 0 && (
                    <option value="Prazo">Pagamento a prazo</option>
                  )}
                </select>
                {payment === "Prazo" && currentUser?.paymentTerms.length ? (
                  <>
                    <label htmlFor="paymentTermDays">Prazo autorizado</label>
                    <select
                      id="paymentTermDays"
                      value={paymentTermDays ?? ""}
                      onChange={(event) =>
                        setPaymentTermDays(Number(event.target.value) || null)
                      }
                      required
                    >
                      <option value="">Selecione o prazo</option>
                      {currentUser.paymentTerms.map((days) => (
                        <option key={days} value={days}>
                          {days} dias
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <div className="payment-summary">
                  {paymentAdjustmentRate < 0
                      ? `Desconto de ${commercialSettings.cashDiscountPercent}%: −${currency.format(paymentAdjustmentAmount)}`
                    : paymentAdjustmentRate > 0
                        ? `Taxa de cartão de ${commercialSettings.cardFeePercent}%: +${currency.format(paymentAdjustmentAmount)}`
                      : "Sem ajuste para esta forma de pagamento"}
                  {" · "}
                  <strong>Total final: {currency.format(finalTotal)}</strong>
                </div>
                <label htmlFor="orderNote">Observação</label>
                <textarea
                  id="orderNote"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Alguma observação sobre o pedido?"
                />
                <button
                  className="confirm"
                  type="button"
                  disabled={orderBusy || !backendConfigured}
                  onClick={finishOrder}
                >
                  {orderBusy ? "Enviando..." : "Finalizar pedido"}
                </button>
              </div>
            )}
            {orderNotice && (
              <p className="notice show" role="status">
                {orderNotice}
              </p>
            )}
          </aside>
        </div>
      </main>

      <div
        className={`modal-backdrop${accountOpen ? " open" : ""}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setAccountOpen(false);
        }}
      >
        <section
          className="account-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="accountTitle"
          aria-describedby="accountSubtitle"
        >
          <div className="modal-head">
            <div>
              <h2 id="accountTitle">Área do cliente</h2>
              <p className="subtitle" id="accountSubtitle">
                {currentUser
                  ? "Consulte seus dados e acompanhe o histórico dos pedidos feitos por esta conta."
                  : "Entre com seu número de telefone e o nome da empresa para acessar seus pedidos."}
              </p>
            </div>
            <button
              className="close-modal"
              type="button"
              aria-label="Fechar"
              onClick={() => setAccountOpen(false)}
            >
              ×
            </button>
          </div>
          {accountError && (
            <p className="login-required show" role="alert">{accountError}</p>
          )}
          {currentUser ? (
            <>
              <div className="profile-card">
                <div className="profile-top">
                  <div className="profile-info">
                    <strong>{currentUser.company}</strong>
                    <span>{currentUser.phone}</span>
                  </div>
                  <button className="logout-btn" type="button" onClick={logoutCustomer}>
                    Sair
                  </button>
                </div>
                <h3 className="profile-section-title">Perfil da empresa</h3>
                <div className="profile-fields">
                  <div>
                    <label htmlFor="profileCompany">Nome da empresa</label>
                    <input
                      id="profileCompany"
                      autoComplete="organization"
                      value={profileCompany}
                      onChange={(event) => setProfileCompany(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="profileContact">Nome do responsável</label>
                    <input
                      id="profileContact"
                      autoComplete="name"
                      placeholder="Ex.: João da Silva"
                      value={profile.contact}
                      onChange={(event) =>
                        setProfile({ ...profile, contact: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="profilePhone">Telefone / WhatsApp</label>
                    <input
                      id="profilePhone"
                      type="tel"
                      autoComplete="tel"
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="profileEmail">E-mail</label>
                    <input
                      id="profileEmail"
                      type="email"
                      autoComplete="email"
                      placeholder="empresa@email.com"
                      value={profile.email}
                      onChange={(event) =>
                        setProfile({ ...profile, email: event.target.value })
                      }
                    />
                  </div>
                  <div className="full">
                    <label htmlFor="profileAddress">Endereço</label>
                    <input
                      id="profileAddress"
                      autoComplete="street-address"
                      placeholder="Rua, avenida..."
                      value={profile.address}
                      onChange={(event) =>
                        setProfile({ ...profile, address: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="profileNumber">Número</label>
                    <input
                      id="profileNumber"
                      placeholder="Ex.: 250"
                      value={profile.number}
                      onChange={(event) =>
                        setProfile({ ...profile, number: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="profileNeighborhood">Bairro</label>
                    <input
                      id="profileNeighborhood"
                      placeholder="Ex.: Centro"
                      value={profile.neighborhood}
                      onChange={(event) =>
                        setProfile({ ...profile, neighborhood: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="profileCity">Cidade</label>
                    <input
                      id="profileCity"
                      autoComplete="address-level2"
                      placeholder="Ex.: Passos"
                      value={profile.city}
                      onChange={(event) =>
                        setProfile({ ...profile, city: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="profileZip">CEP</label>
                    <input
                      id="profileZip"
                      inputMode="numeric"
                      placeholder="00000-000"
                      value={profile.zip}
                      onChange={(event) =>
                        setProfile({ ...profile, zip: event.target.value })
                      }
                    />
                  </div>
                  <div className="full">
                    <label htmlFor="profileComplement">Complemento / referência</label>
                    <textarea
                      id="profileComplement"
                      placeholder="Ponto de referência ou observações de entrega"
                      value={profile.complement}
                      onChange={(event) =>
                        setProfile({ ...profile, complement: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="profile-actions">
                  <button
                    className="primary"
                    type="button"
                    onClick={saveCustomerProfile}
                  >
                    Salvar dados da empresa
                  </button>
                </div>
                {profileNotice && (
                  <p
                    className={`profile-message${profileNoticeIsError ? " error" : ""}`}
                    role="status"
                  >
                    {profileNotice}
                  </p>
                )}
                <div className="password-card">
                  <h3>Alterar senha</h3>
                  <div className="password-fields">
                    <div>
                      <label htmlFor="newPassword">Nova senha</label>
                      <input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo de 6 caracteres"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="password-hint">
                    A nova senha será atualizada pelo Supabase Auth.
                  </p>
                  <div className="profile-actions">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={updatePassword}
                    >
                      Atualizar senha
                    </button>
                  </div>
                </div>
              </div>
              <div className="history-card">
                <h3>Histórico de pedidos</h3>
                {orderHistory.length === 0 ? (
                  <div className="history-empty">
                    Ainda não há pedidos nesta conta.
                    <br />
                    Seu próximo pedido aparecerá aqui.
                  </div>
                ) : (
                  [...orderHistory].reverse().map((order) => (
                    <article className="order-history-item" key={order.id}>
                      <div className="order-history-top">
                        <span className="order-id">Pedido {order.orderNumber}</span>
                        <span className={`order-status${order.paymentStatus === "vencido" ? " overdue" : ""}`}>
                          {order.status}
                          {order.paymentStatus === "vencido" ? " · Pagamento vencido" : ""}
                        </span>
                      </div>
                      <div className="order-meta">
                        {new Date(order.date).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}{" "}
                        · {order.payment}
                      </div>
                      <div className="order-items">
                        {order.items.map((item) => (
                          <div className="receipt-item" key={`${order.id}-${item.id}`}>
                            <span>
                              {item.quantity}× {item.name} ·{" "}
                              {currency.format(item.unitPrice)} cada
                            </span>
                            <strong>
                              {currency.format(item.quantity * item.unitPrice)}
                            </strong>
                          </div>
                        ))}
                      </div>
                      {order.dueDate && (
                        <div className="order-meta">
                          Pagamento a prazo — {order.paymentTermDays} dias ·
                          vencimento{" "}
                          {new Date(`${order.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                      <div className="order-total">
                        Total: {currency.format(order.total)}
                      </div>
                      <button
                        className="secondary-btn receipt-button"
                        type="button"
                        onClick={() => setReceiptOrder(order)}
                      >
                        🧾 Ver nota / recibo
                      </button>
                      {order.status === "pendente" && (
                        <button
                          className="secondary-btn receipt-button"
                          type="button"
                          onClick={() => void cancelOrder(order.id)}
                        >
                          Cancelar pedido
                        </button>
                      )}
                    </article>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="login-card">
            <h3>{creatingAccount ? "Criar acesso de cliente" : "Entrar na conta"}</h3>
              <p className="subtitle">
              A autenticação e os dados da conta são protegidos pelo Supabase.
            </p>
            <label htmlFor="loginPhone">E-mail</label>
            <input
              id="loginPhone"
              type="email"
              autoComplete="email"
              placeholder="empresa@email.com"
              value={loginPhone}
              onChange={(event) => setLoginPhone(event.target.value)}
            />
            {creatingAccount && (
              <>
                <label htmlFor="loginCompany">Nome da empresa</label>
                <input
                  id="loginCompany"
                  type="text"
                  autoComplete="organization"
                  placeholder="Ex.: Mercado X"
                  value={loginCompany}
                  onChange={(event) => setLoginCompany(event.target.value)}
                />
                <label htmlFor="loginContact">Nome do responsável</label>
                <input
                  id="loginContact"
                  type="text"
                  autoComplete="name"
                  placeholder="João da Silva"
                  value={loginContact}
                  onChange={(event) => setLoginContact(event.target.value)}
                />
                <label htmlFor="loginPhoneNumber">WhatsApp</label>
                <input
                  id="loginPhoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  value={loginPhoneNumber}
                  onChange={(event) => setLoginPhoneNumber(event.target.value)}
                />
              </>
            )}
            <label htmlFor="loginPassword">Senha</label>
            <input
              id="loginPassword"
              type="password"
              autoComplete={creatingAccount ? "new-password" : "current-password"}
              placeholder="Mínimo de 8 caracteres"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
            />
            {loginError && (
              <p className="login-required show" role="alert">{loginError}</p>
            )}
            <div className="login-actions">
              <button
                className="primary"
                type="button"
                disabled={!backendConfigured || authBusy}
                onClick={loginCustomer}
              >
                {authBusy
                  ? "Aguarde..."
                  : creatingAccount
                    ? "Criar conta"
                    : "Entrar"}
              </button>
              {!creatingAccount && (
                <button className="secondary-btn" type="button" onClick={sendPasswordReset}>
                  Esqueci minha senha
                </button>
              )}
              <button
                className="secondary-btn"
                type="button"
                onClick={() => {
                  setCreatingAccount((current) => !current);
                  setLoginError("");
                }}
              >
                {creatingAccount ? "Já tenho conta" : "Criar acesso de cliente"}
              </button>
            </div>
            </div>
          )}
        </section>
      </div>

      {receiptOrder && (
        <div className="receipt-backdrop">
          <section className="receipt-modal" aria-labelledby="receiptTitle">
            <div className="receipt-head">
              <strong id="receiptTitle">DISTRIBUIDORA SANTA EDWIGES</strong>
              <button
                className="close-modal"
                type="button"
                aria-label="Fechar recibo"
                onClick={() => setReceiptOrder(null)}
              >
                ×
              </button>
            </div>
            <div className="receipt-paper">
              <h2>Comprovante do pedido {receiptOrder.orderNumber}</h2>
              <p>
                {new Date(receiptOrder.date).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <div className="receipt-divider" />
              <p><strong>Cliente:</strong> {receiptOrder.company}</p>
              <p><strong>Telefone:</strong> {receiptOrder.phone}</p>
              <p><strong>Entrega:</strong> {receiptOrder.address}</p>
              <p><strong>Pagamento:</strong> {receiptOrder.payment}</p>
              <p><strong>Status:</strong> {receiptOrder.status}</p>
              {receiptOrder.paymentStatus && (
                <p><strong>Situação do pagamento:</strong> {receiptOrder.paymentStatus}</p>
              )}
              {receiptOrder.dueDate && (
                <p>
                  <strong>Vencimento:</strong>{" "}
                  {new Date(`${receiptOrder.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}
                </p>
              )}
              <div className="receipt-divider" />
              {receiptOrder.items.map((item) => (
                <div className="receipt-item" key={`${receiptOrder.id}-${item.id}`}>
                  <span>
                    {item.quantity}× {item.name} · {currency.format(item.unitPrice)} cada
                  </span>
                  <span>
                    {currency.format(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="receipt-divider" />
              <div className="receipt-item">
                <span>Subtotal</span>
                <strong>{currency.format(receiptOrder.subtotal)}</strong>
              </div>
              {receiptOrder.deliveryFee > 0 && (
                <div className="receipt-item">
                  <span>Taxa de entrega</span>
                  <strong>{currency.format(receiptOrder.deliveryFee)}</strong>
                </div>
              )}
              {receiptOrder.adjustmentType !== "none" && (
                <div className="receipt-item">
                  <span>
                    {receiptOrder.adjustmentType === "discount"
                      ? "Desconto"
                      : "Taxa de cartão"}
                  </span>
                  <span>
                    {receiptOrder.adjustmentType === "discount" ? "−" : "+"}
                    {currency.format(receiptOrder.adjustmentAmount)}
                  </span>
                </div>
              )}
              <div className="receipt-item receipt-total">
                <strong>Total final</strong>
                <strong>{currency.format(receiptOrder.total)}</strong>
              </div>
              {receiptOrder.note && (
                <p><strong>Observação:</strong> {receiptOrder.note}</p>
              )}
              <p className="receipt-footer-action">Obrigado pela preferência!</p>
            </div>
            <div className="receipt-actions">
              <button
                className="primary"
                type="button"
                onClick={() => window.print()}
              >
                🖨️ Imprimir / salvar em PDF
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setReceiptOrder(null)}
              >
                Fechar
              </button>
            </div>
          </section>
        </div>
      )}

      <footer className="footer">
        <strong>Santa Edwiges</strong>
        <br />
        Distribuidora · Pedidos online
      </footer>
    </>
  );
}
