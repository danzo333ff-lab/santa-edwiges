-- Catálogo enviado pelo proprietário em 13/10/2026. Fotos provisórias são ilustrações locais.
-- Atualizações preservam estoque, promoção existente e qualquer foto real já enviada.
insert into public.categories (name, active)
values
  ('Variados', true),
  ('Embalagens', true),
  ('Bebidas não alcoólicas', true),
  ('Tabacaria', true),
  ('Bebidas alcoólicas', true)
on conflict (name) do update set active = true;

do $$
declare
  item record;
begin
  for item in
    select c.id as category_id, catalog.*
    from (values
      ('Variados', 'KIT KAT c/24', 'Caixa com 24 unidades.', 'cx', 80.00, 3.33, '/products/kit-kat-c-24.svg'),
      ('Variados', 'CHOKITO c/30', 'Caixa com 30 unidades.', 'cx', 77.00, 2.56, '/products/chokito-c-30.svg'),
      ('Variados', 'PRESTIGIO c/30', 'Caixa com 30 unidades.', 'cx', 77.00, 2.56, '/products/prestigio-c-30.svg'),
      ('Variados', 'DIAMANTE NEGRO c/20', 'Caixa com 20 unidades.', 'cx', 46.00, 2.30, '/products/diamante-negro-c-20.svg'),
      ('Variados', 'LAKA c/20', 'Caixa com 20 unidades.', 'cx', 46.00, 2.30, '/products/laka-c-20.svg'),
      ('Variados', 'TRENTO c/16', 'Caixa com 16 unidades.', 'cx', 35.00, 2.18, '/products/trento-c-16.svg'),
      ('Variados', 'DISQUETI c/24', 'Caixa com 24 unidades.', 'cx', 36.00, 1.50, '/products/disqueti-c-24.svg'),
      ('Variados', 'NUTELLA 140g', 'Venda unitária.', 'un', 11.50, null, '/products/nutella-140g.svg'),
      ('Variados', 'NUTELLAO 700g', 'Venda unitária.', 'un', 45.00, null, '/products/nutellao-700g.svg'),
      ('Variados', 'TORTUGUITA c/24', 'Caixa com 24 unidades.', 'cx', 33.00, 1.37, '/products/tortuguita-c-24.svg'),
      ('Variados', 'AMASSYXUP C/50', 'Caixa com 50 unidades.', 'cx', 29.99, 0.60, '/products/amassyxup-c-50.svg'),
      ('Variados', 'BALA BUTTER TOFFE C/68', 'Caixa com 68 unidades.', 'cx', 16.80, 0.24, '/products/bala-butter-toffe-c-68.svg'),
      ('Variados', 'OURO BRANCO C/50', 'Caixa com 50 unidades.', 'cx', 54.99, 1.10, '/products/ouro-branco-c-50.svg'),
      ('Variados', 'BONOBON C/50', 'Caixa com 50 unidades.', 'cx', 47.99, 0.95, '/products/bonobon-c-50.svg'),
      ('Variados', 'BATON AO LEITE C/30', 'Caixa com 30 unidades.', 'cx', 47.99, 1.59, '/products/baton-ao-leite-c-30.svg'),
      ('Variados', 'NUTELLA B READY C/10', 'Caixa com 10 unidades.', 'cx', 39.99, 3.99, '/products/nutella-b-ready-c-10.svg'),
      ('Variados', 'SNICKERS C/20', 'Caixa com 20 unidades.', 'cx', 69.99, 3.50, '/products/snickers-c-20.svg'),
      ('Variados', 'SUFLAIR 50G C/20', 'Caixa com 20 unidades.', 'cx', 99.99, 4.99, '/products/suflair-50g-c-20.svg'),
      ('Variados', 'TRENTO BITES C/12', 'Caixa com 12 unidades.', 'cx', 41.00, 3.41, '/products/trento-bites-c-12.svg'),
      ('Variados', 'DOCE BOTICÃO C/20', 'Caixa com 20 unidades.', 'cx', 22.00, 1.10, '/products/doce-boticao-c-20.svg'),
      ('Variados', 'DOCE RICCO ESPETO C/35', 'Caixa com 35 unidades.', 'cx', 48.99, 1.39, '/products/doce-ricco-espeto-c-35.svg'),
      ('Variados', 'GELEIA DIN DAN C/20', 'Caixa com 20 unidades.', 'cx', 17.99, 0.89, '/products/geleia-din-dan-c-20.svg'),
      ('Variados', 'DOCE GIBI C/50', 'Caixa com 50 unidades.', 'cx', 16.80, 0.33, '/products/doce-gibi-c-50.svg'),
      ('Variados', 'HALLS c/21', 'Caixa com 21 unidades.', 'cx', 26.50, 1.26, '/products/halls-c-21.svg'),
      ('Variados', 'FINI DESENHOS C/12', 'Caixa com 12 unidades.', 'cx', 11.50, 0.95, '/products/fini-desenhos-c-12.svg'),
      ('Variados', 'FINI TUBES c/12', 'Caixa com 12 unidades.', 'cx', 10.00, 0.83, '/products/fini-tubes-c-12.svg'),
      ('Variados', 'FRUITELLA c/15', 'Caixa com 15 unidades.', 'cx', 34.00, 2.26, '/products/fruitella-c-15.svg'),
      ('Variados', 'MENTOS c/16', 'Caixa com 16 unidades.', 'cx', 32.00, 2.00, '/products/mentos-c-16.svg'),
      ('Variados', 'CHIC BRINQ TATOO c/100', 'Caixa com 100 unidades.', 'cx', 8.00, 0.08, '/products/chic-brinq-tatoo-c-100.svg'),
      ('Variados', 'PLUTONITA c/40', 'Caixa com 40 unidades.', 'cx', 7.50, 0.17, '/products/plutonita-c-40.svg'),
      ('Variados', 'TRIDENT c/21', 'Caixa com 21 unidades.', 'cx', 39.00, 1.85, '/products/trident-c-21.svg'),
      ('Variados', 'SALG BACON BITS c/10', 'Caixa com 10 unidades.', 'cx', 24.00, 2.40, '/products/salg-bacon-bits-c-10.svg'),
      ('Variados', 'SALGADINHO BECK+ c/10', 'Caixa com 10 unidades.', 'cx', 13.00, 1.30, '/products/salgadinho-beck-c-10.svg'),
      ('Variados', 'SAG POINT BACON c/10', 'Caixa com 10 unidades.', 'cx', 17.00, 1.70, '/products/sag-point-bacon-c-10.svg'),
      ('Variados', 'BATATA POINT CHIPS c/24', 'Caixa com 24 unidades.', 'cx', 35.00, 1.45, '/products/batata-point-chips-c-24.svg'),
      ('Variados', 'PIRULITO BIG BIG', 'Pacote para revenda; quantidade não informada.', 'pct', 11.50, null, '/products/pirulito-big-big.svg'),
      ('Variados', 'TODDY 370g c/3', 'Caixa com 3 unidades.', 'cx', 27.00, 8.99, '/products/toddy-370g-c-3.svg'),
      ('Variados', 'NESCAU 350g c/3', 'Caixa com 3 unidades.', 'cx', 29.10, 9.70, '/products/nescau-350g-c-3.svg'),
      ('Variados', 'NISSIN MIOJO C/10', 'Caixa com 10 unidades.', 'cx', 25.50, 2.55, '/products/nissin-miojo-c-10.svg'),
      ('Variados', 'CUP NOODLES C/6', 'Caixa com 6 unidades.', 'cx', 28.50, 4.75, '/products/cup-noodles-c-6.svg'),
      ('Embalagens', 'CANUDO PLAZAPEL C/100', 'Pacote com 100 unidades.', 'pct', 6.00, 0.06, '/products/canudo-plazapel-c-100.svg'),
      ('Embalagens', 'COPO 770ML C/25', 'Pacote com 25 unidades.', 'pct', 10.00, 0.40, '/products/copo-770ml-c-25.svg'),
      ('Embalagens', 'COPO 550ML C/50', 'Pacote com 50 unidades.', 'pct', 13.50, 0.27, '/products/copo-550ml-c-50.svg'),
      ('Embalagens', 'COPO 500ML C/50', 'Pacote com 50 unidades.', 'pct', 12.00, 0.24, '/products/copo-500ml-c-50.svg'),
      ('Embalagens', 'TAMPA 700ML C/50', 'Pacote com 50 unidades.', 'pct', 14.00, 0.28, '/products/tampa-700ml-c-50.svg'),
      ('Embalagens', 'TAMPA 500ML C/50', 'Pacote com 50 unidades.', 'pct', 7.99, 0.16, '/products/tampa-500ml-c-50.svg'),
      ('Embalagens', 'SACOLA 30x40 5KG', 'Pacote de 5 kg; preço unitário informado por kg.', 'pct', 70.00, 14.00, '/products/sacola-30x40-5kg.svg'),
      ('Embalagens', 'SACOLA 40x50 5KG', 'Pacote de 5 kg; preço unitário informado por kg.', 'pct', 70.00, 14.00, '/products/sacola-40x50-5kg.svg'),
      ('Bebidas não alcoólicas', 'GUARANÁ/PEPSI 2LT c/6', 'Caixa com 6 unidades.', 'cx', 42.50, 7.08, '/products/guarana-pepsi-2lt-c-6.svg'),
      ('Bebidas não alcoólicas', 'GUARANÁ 1LT C/6', 'Caixa com 6 unidades.', 'cx', 25.50, 4.25, '/products/guarana-1lt-c-6.svg'),
      ('Bebidas não alcoólicas', 'GUARANÁ/PEPSI/SUKITA 200ML', 'Caixa com 12 unidades de 200 ml; marca conforme disponibilidade.', 'cx', 21.00, 1.75, '/products/guarana-pepsi-sukita-200ml.svg'),
      ('Bebidas não alcoólicas', 'ENERG JACK 2lt c/6', 'Caixa com 6 unidades.', 'cx', 36.00, 6.00, '/products/energ-jack-2lt-c-6.svg'),
      ('Bebidas não alcoólicas', 'REDBULL 250ML c/4', 'Caixa com 4 unidades.', 'cx', 33.60, 8.39, '/products/redbull-250ml-c-4.svg'),
      ('Bebidas não alcoólicas', 'REDBULL 473ML', 'Venda unitária.', 'un', 12.99, null, '/products/redbull-473ml.svg'),
      ('Bebidas não alcoólicas', 'MONSTER 473ML C/6', 'Caixa com 6 unidades.', 'cx', 51.00, 8.49, '/products/monster-473ml-c-6.svg'),
      ('Bebidas não alcoólicas', 'ÁGUA 500ML C/12', 'Caixa com 12 unidades.', 'cx', 12.00, 1.00, '/products/agua-500ml-c-12.svg'),
      ('Bebidas não alcoólicas', 'ÁGUA 1,5LT C/6', 'Caixa com 6 unidades.', 'cx', 12.00, 2.00, '/products/agua-1-5lt-c-6.svg'),
      ('Bebidas não alcoólicas', 'COCA LATA 350ML C/12', 'Caixa com 12 unidades.', 'cx', 46.00, 3.83, '/products/coca-lata-350ml-c-12.svg'),
      ('Bebidas não alcoólicas', 'COCA COLA 1LT', 'Venda unitária.', 'un', 7.69, null, '/products/coca-cola-1lt.svg'),
      ('Tabacaria', 'ISQUEIRO CHAMA c/50', 'Caixa com 50 unidades.', 'cx', 50.00, 1.00, '/products/isqueiro-chama-c-50.svg'),
      ('Tabacaria', 'PITEIRA PAPELITO c/24', 'Caixa com 24 unidades.', 'cx', 61.00, 2.54, '/products/piteira-papelito-c-24.svg'),
      ('Tabacaria', 'BLUNT SABORES c/5', 'Caixa com 5 unidades.', 'cx', 6.99, 1.39, '/products/blunt-sabores-c-5.svg'),
      ('Tabacaria', 'DOURADINHO', 'Venda unitária.', 'un', 13.00, null, '/products/douradinho.svg'),
      ('Tabacaria', 'BIC MAXI c/12', 'Caixa com 12 unidades.', 'cx', 55.00, 4.58, '/products/bic-maxi-c-12.svg'),
      ('Tabacaria', 'SEDA ZOMO c/25', 'Caixa com 25 unidades.', 'cx', 26.50, 1.06, '/products/seda-zomo-c-25.svg'),
      ('Tabacaria', 'TESOURA DOBRÁVEL c/6', 'Caixa com 6 unidades.', 'cx', 48.00, 7.99, '/products/tesoura-dobravel-c-6.svg'),
      ('Tabacaria', 'DICHAVADOR c/6', 'Caixa com 6 unidades.', 'cx', 18.00, 2.99, '/products/dichavador-c-6.svg'),
      ('Bebidas alcoólicas', 'MANSÃO MAROMBA c/6', 'Caixa com 6 unidades.', 'cx', 78.00, 12.99, '/products/mansao-maromba-c-6.svg'),
      ('Bebidas alcoólicas', 'INVICTUS COMBO c/6', 'Caixa com 6 unidades.', 'cx', 52.50, 8.75, '/products/invictus-combo-c-6.svg'),
      ('Bebidas alcoólicas', 'GIN INVICTUS c/6', 'Caixa com 6 unidades.', 'cx', 87.00, 14.49, '/products/gin-invictus-c-6.svg'),
      ('Bebidas alcoólicas', 'BUSCA BRISA', 'Bebida. A partir de 7 unidades, R$ 29,99 cada.', 'un', 31.99, null, '/products/busca-brisa.svg'),
      ('Bebidas alcoólicas', 'BOB PINGA', 'Venda unitária.', 'un', 23.99, null, '/products/bob-pinga.svg'),
      ('Bebidas alcoólicas', 'JACK JAMES', 'Venda unitária.', 'un', 22.99, null, '/products/jack-james.svg'),
      ('Bebidas alcoólicas', 'JACK JAMES VIKINGS', 'Venda unitária.', 'un', 31.99, null, '/products/jack-james-vikings.svg'),
      ('Bebidas alcoólicas', 'MORANGO DO AMOR', 'Venda unitária.', 'un', 21.99, null, '/products/morango-do-amor.svg'),
      ('Bebidas alcoólicas', 'JAPIRA SABORES', 'Venda unitária.', 'un', 16.50, null, '/products/japira-sabores.svg'),
      ('Bebidas alcoólicas', 'BRISA MÁGICA', 'Venda unitária.', 'un', 23.99, null, '/products/brisa-magica.svg'),
      ('Bebidas alcoólicas', 'WHISKY BOSS c/6', 'Caixa com 6 unidades.', 'cx', 108.00, 18.00, '/products/whisky-boss-c-6.svg'),
      ('Bebidas alcoólicas', 'WHITE HORSE 1LT', 'Venda unitária.', 'un', 69.99, null, '/products/white-horse-1lt.svg'),
      ('Bebidas alcoólicas', 'REDLABEL 1LT', 'Venda unitária.', 'un', 89.99, null, '/products/redlabel-1lt.svg'),
      ('Bebidas alcoólicas', 'BLACK LABEL 1LT', 'Venda unitária.', 'un', 159.99, null, '/products/black-label-1lt.svg'),
      ('Bebidas alcoólicas', 'BUCHANANS DELUXE 1LT', 'Venda unitária.', 'un', 164.99, null, '/products/buchanans-deluxe-1lt.svg'),
      ('Bebidas alcoólicas', 'BALLANTINES 1LT', 'Venda unitária.', 'un', 79.99, null, '/products/ballantines-1lt.svg'),
      ('Bebidas alcoólicas', 'JACK DANIELS 1LT', 'Venda unitária.', 'un', 129.99, null, '/products/jack-daniels-1lt.svg'),
      ('Bebidas alcoólicas', 'LICOR 43', 'Venda unitária.', 'un', 139.99, null, '/products/licor-43.svg'),
      ('Bebidas alcoólicas', 'LICOR 1985', 'Venda unitária.', 'un', 49.99, null, '/products/licor-1985.svg'),
      ('Bebidas alcoólicas', 'BALLENA', 'Venda unitária.', 'un', 110.00, null, '/products/ballena.svg'),
      ('Bebidas alcoólicas', 'VODKA ABSOLUT', 'Venda unitária.', 'un', 79.99, null, '/products/vodka-absolut.svg'),
      ('Bebidas alcoólicas', 'VODKA ORLOFF', 'Venda unitária.', 'un', 27.99, null, '/products/vodka-orloff.svg'),
      ('Bebidas alcoólicas', 'GIN TANQUERAY', 'Venda unitária.', 'un', 99.99, null, '/products/gin-tanqueray.svg'),
      ('Bebidas alcoólicas', 'GIN BEEFEATER', 'Venda unitária.', 'un', 86.99, null, '/products/gin-beefeater.svg'),
      ('Bebidas alcoólicas', 'CONHAQUE PRESIDENTE', 'Venda unitária.', 'un', 14.00, null, '/products/conhaque-presidente.svg'),
      ('Bebidas alcoólicas', 'CABARÉ ICE c/12', 'Caixa com 12 unidades.', 'cx', 74.00, 6.16, '/products/cabare-ice-c-12.svg'),
      ('Bebidas alcoólicas', 'HEINEKEN LATÃO 473ML', 'Fardo com 12 latas de 473 ml.', 'fardo', 69.60, 5.79, '/products/heineken-latao-473ml.svg')
    ) as catalog(category_name, name, description, unit, price, unit_price_display, image_url)
    join public.categories c on c.name = catalog.category_name
  loop
    update public.products as product
    set category_id = item.category_id,
        name = item.name,
        price = item.price,
        unit_price_display = item.unit_price_display,
        image_url = coalesce(product.image_url, item.image_url),
        active = true,
        updated_at = now()
    where lower(trim(product.name)) = lower(trim(item.name));

    if not found then
      insert into public.products (category_id, name, description, unit, price,
        stock_fisico, stock_reservado, stock_minimo, active, image_url, unit_price_display)
      values (item.category_id, item.name, item.description, item.unit, item.price,
        0, 0, 0, true, item.image_url, item.unit_price_display);
    end if;
  end loop;
end;
$$;
