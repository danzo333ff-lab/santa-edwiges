import type { Product } from "@/lib/products";

export type { Product } from "@/lib/products";

export type OrderStatus =
  | "pendente"
  | "aprovado"
  | "em_preparo"
  | "enviado"
  | "concluido"
  | "cancelado"
  | "rejeitado";

export type OrderSummary = {
  id: number;
  number: string;
  customer: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  items: number;
};

export const appConfig = {
  deliveryFee: 12.5,
  minimumOrder: 50,
  maxItemsPerOrder: 100,
};

export const productCategories = [
  "Todos",
  "Bebidas",
  "Graos",
  "Higiene",
  "Limpieza",
  "Padaria",
];

export const products: Product[] = [
  {
    id: 1,
    name: "Arroz 5kg",
    description: "Arroz tipo 1, embalagem de 5 kg para estoque de vendas diárias.",
    category: "Graos",
    unit: "cx",
    price: 28.5,
    stock: 42,
    minStock: 12,
    active: true,
    image: "🌾",
  },
  {
    id: 2,
    name: "Leite Integral",
    description: "Caixa de leite integral, fornecimento de rotina do cliente local.",
    category: "Bebidas",
    unit: "cx",
    price: 18.9,
    stock: 16,
    minStock: 8,
    active: true,
    image: "🥛",
  },
  {
    id: 3,
    name: "Papel Toalha",
    description: "Rolo de papel toalha com dobra reforçada para uso de cozinha.",
    category: "Higiene",
    unit: "cx",
    price: 16.25,
    stock: 10,
    minStock: 6,
    active: true,
    image: "🧻",
  },
  {
    id: 4,
    name: "Sabão em Pó",
    description: "Pacote de 1kg para lavanderia doméstica e uso comercial.",
    category: "Limpieza",
    unit: "cx",
    price: 21.4,
    stock: 7,
    minStock: 10,
    active: true,
    image: "🧼",
  },
  {
    id: 5,
    name: "Farinha de Trigo",
    description: "Saco de farinha com boa absorção para padarias e cozinhas.",
    category: "Padaria",
    unit: "cx",
    price: 32.8,
    stock: 9,
    minStock: 8,
    active: true,
    image: "🌾",
  },
  {
    id: 6,
    name: "Café Torrado",
    description: "Pacote de café torrado e moído para uso diário do cliente.",
    category: "Bebidas",
    unit: "cx",
    price: 24.5,
    stock: 28,
    minStock: 10,
    active: true,
    image: "☕",
  },
  {
    id: 7,
    name: "Saco de Açúcar",
    description: "Produto de alta rotação em distribuidores de varejo e comércios.",
    category: "Graos",
    unit: "cx",
    price: 19.9,
    stock: 4,
    minStock: 8,
    active: true,
    image: "🍬",
  },
  {
    id: 8,
    name: "Detergente Neutro",
    description: "Detergente neutro para uso geral em limpeza doméstica.",
    category: "Limpieza",
    unit: "un",
    price: 11.8,
    stock: 22,
    minStock: 8,
    active: true,
    image: "🧴",
  },
];

export const orders: OrderSummary[] = [
  {
    id: 201,
    number: "#1024",
    customer: "Maria da Silva",
    total: 172.3,
    status: "pendente",
    createdAt: "2026-10-12 09:15",
    items: 4,
  },
  {
    id: 202,
    number: "#1023",
    customer: "João Pereira",
    total: 238.65,
    status: "em_preparo",
    createdAt: "2026-10-11 15:40",
    items: 6,
  },
  {
    id: 203,
    number: "#1022",
    customer: "Ana Souza",
    total: 91.1,
    status: "enviado",
    createdAt: "2026-10-09 18:22",
    items: 3,
  },
  {
    id: 204,
    number: "#1021",
    customer: "Carlos Mendes",
    total: 63.5,
    status: "concluido",
    createdAt: "2026-10-08 11:05",
    items: 2,
  },
];

export const stockMovements = [
  { product: "Arroz 5kg", quantity: 12, type: "entrada", reason: "Compra de fornecedor", responsible: "Dono" },
  { product: "Leite Integral", quantity: -4, type: "saída", reason: "Pedido #1023", responsible: "Sistema" },
  { product: "Sabão em Pó", quantity: 6, type: "ajuste", reason: "Contagem física", responsible: "Admin" },
  { product: "Farinha de Trigo", quantity: -3, type: "saída", reason: "Pedido #1024", responsible: "Sistema" },
];

export const customers = [
  { name: "Maria da Silva", status: "ativo", phone: "(11) 97456-1001", email: "maria@cliente.com" },
  { name: "João Pereira", status: "pendente", phone: "(11) 98001-2400", email: "joao@cliente.com" },
  { name: "Carlos Mendes", status: "bloqueado", phone: "(11) 99887-3312", email: "carlos@cliente.com" },
];

export const businessRules = [
  "Cliente só vê e altera seus próprios dados e pedidos.",
  "Cadastro público sempre gera perfil de cliente; admin nasce por script.",
  "Preço e total são recalculados no banco e nunca confiados ao navegador.",
  "Pedido reserva estoque na mesma transação em que é salvo.",
  "Movimentações de estoque nunca são apagadas; erro gera ajuste novo.",
  "Status só segue as transições permitidas do diagrama do projeto.",
  "Produto desativado continua em pedidos, estoque e histórico.",
  "Sem exclusão física de pedidos, produtos ou clientes.",
];
