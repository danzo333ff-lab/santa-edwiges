# Santa Edwiges Distribuidora

Aplicação B2B baseada no projeto Next.js existente. O catálogo, Auth, perfis,
pedidos, pagamentos, estoque, imagens e eventos administrativos usam Supabase;
`lib/mock-data.ts` não é fonte de dados da loja.

## Requisitos

- Node.js 22+
- Projeto Supabase com Auth, PostgreSQL, Storage e Realtime
- As migrations deste repositório aplicadas na ordem do timestamp

## Configuração

1. Copie `.env.example` para `.env.local` e preencha
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. Aplique todas as migrations em `supabase/migrations` na ordem do timestamp,
   incluindo `20261013215123_alimentos_catalog.sql`, no SQL Editor do Supabase.
   Para instalações gerenciadas pelo CLI, use o fluxo versionado de
   `supabase db push`.
3. Configure confirmação de e-mail e inclua a URL publicada da loja entre as
   URLs de redirecionamento no Supabase Auth antes de disponibilizar cadastros.
4. Instale dependências e inicie o Next.js:

```powershell
npm.cmd install
npm.cmd run dev
```

5. Abra `http://localhost:3000`.

Sem as duas variáveis públicas, a aplicação informa que o backend não está
configurado e não habilita contas, catálogo ou pedidos de demonstração.

## Administrador inicial

Configure `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e,
opcionalmente, `ADMIN_NAME` no ambiente local protegido. Depois execute:

```powershell
npm.cmd run seed:admin
```

O script usa a chave service-role somente em processo Node no servidor para
criar o usuário e conceder a função no perfil. Se a conta já existe, preserva
a senha alterada pelo administrador. Não exponha a chave em variáveis
`NEXT_PUBLIC_*`, no navegador, em commits ou em logs. Configure `ADMIN_EMAIL`
também nos ambientes da Vercel. O administrador entra em `/admin/login` com o
usuário registrado em `settings.admin_username` e pode trocar usuário e senha
em **Perfil do administrador**.

O catálogo fica público. Para adicionar produtos ao carrinho ou fazer pedidos,
o cliente cria uma conta com nome, telefone, e-mail e senha, confirma o e-mail
quando solicitado e entra na loja. Endereço e outros dados de entrega podem ser
incluídos depois em **Meu perfil**. Novos clientes recebem status ativo após o
cadastro; contas bloqueadas continuam impedidas de comprar.

## Segurança e operações críticas

- A sessão Supabase é mantida em cookies por `proxy.ts`; páginas e operações
  administrativas verificam o usuário e a função armazenada em `profiles`.
- RLS restringe perfis, pedidos, itens, prazos, pagamentos, imagens e auditoria.
  Clientes não recebem permissão SQL para alterar role, preço, estoque, pedido
  ou movimentos diretamente.
- `create_order` calcula preços, desconto por volume, taxa, desconto de
  pagamento, autorização de prazo e vencimento; reserva estoque, salva os
  preços praticados, cria histórico e movimentações numa transação. A chave de
  idempotência impede duplicidade por reenvio.
- Status, cancelamento, pagamento, prazo, estoque e configurações usam RPCs
  autorizadas no banco.
- Fotos de produto são enviadas ao bucket Supabase Storage `product-images`.
- O painel `/admin` confere a função no servidor e atualiza pedidos com
  Supabase Realtime.
- O recibo é comprovante comercial imprimível, não uma NF-e/NFC-e.

## Catálogo e estoque

A migration `20261013221029_catalog_expansion.sql` cadastra os 94 produtos e
preços enviados em cinco categorias. A fonte editável é
`data/catalog-2026-10-13.json`; execute `node scripts/generate-catalog-assets.mjs`
para regerar a migration e as ilustrações locais em `public/products/`. Itens
já cadastrados são atualizados por nome sem zerar o estoque ou substituir uma
foto real. Busca Brisa mantém a promoção a R$ 29,99 a partir de 7 unidades.
Os preços unitários informados são exibidos como aproximação, inclusive nos
casos em que diferem por arredondamento do preço do pacote.

Dezenove produtos têm fotos verificadas; os outros 75 mantêm ilustrações até a
marca ou variante ser confirmada. Fotos próprias podem ser enviadas pelo
painel administrativo e têm prioridade sobre a arte local. Novos produtos
começam com estoque zero por segurança; registre as entradas reais no painel
antes de aceitar pedidos.

## Verificações

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Os testes automatizados locais cobrem limites do desconto por volume e cálculos
de pagamento. Testes reais de Auth, RLS, Storage, Realtime e concorrência exigem
um projeto Supabase configurado e usuários de teste separados; não devem ser
considerados aprovados apenas pelo build.

## Estado da integração

As migrations versionadas foram aplicadas ao projeto Supabase configurado em
`.env.local`, com 94 produtos ativos e estoque inicial zero. O arquivo local
contém URL, chave pública e e-mail administrativo; as variáveis públicas estão nos
ambientes de produção, prévia e desenvolvimento da Vercel. A chave service-role
e a senha do administrador devem ser configuradas separadamente, sem commit.

Ainda faltam fotos reais fornecidas pelo proprietário e testes reais de Auth,
RLS, Storage, Realtime e concorrência com usuários de teste. Execute esses cenários
antes de liberar pedidos reais. As migrations versionadas são a fonte oficial
do banco; `supabase/schema.sql` é apenas um aviso de compatibilidade e não deve
ser executado.
