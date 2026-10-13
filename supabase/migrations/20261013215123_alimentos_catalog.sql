do $$
declare
  alimentos_id bigint;
  catalog record;
begin
  insert into public.categories (name, active)
  values ('Alimentos', true)
  on conflict (name) do update set active = true
  returning id into alimentos_id;

  for catalog in
    select *
    from (values
      ('KIT KAT c/24', 'Caixa com 24 unidades.', 'cx', 80.00::numeric, 3.33::numeric),
      ('CHOKITO c/30', 'Caixa com 30 unidades.', 'cx', 77.00, 2.56),
      ('PRESTIGIO c/30', 'Caixa com 30 unidades.', 'cx', 77.00, 2.56),
      ('DIAMANTE NEGRO c/20', 'Caixa com 20 unidades.', 'cx', 46.00, 2.30),
      ('LAKA c/20', 'Caixa com 20 unidades.', 'cx', 46.00, 2.30),
      ('TRENTO c/16', 'Caixa com 16 unidades.', 'cx', 35.00, 2.18),
      ('DISQUETI c/24', 'Caixa com 24 unidades.', 'cx', 36.00, 1.50),
      ('NUTELLA 140g', 'Pote de 140 g.', 'un', 11.50, null::numeric),
      ('NUTELLAO 700g', 'Pote de 700 g.', 'un', 45.00, null),
      ('TORTUGUITA c/24', 'Caixa com 24 unidades.', 'cx', 33.00, 1.37),
      ('AMASSYXUP C/50', 'Pacote com 50 unidades.', 'pct', 29.99, 0.60),
      ('BALA BUTTER TOFFE C/68', 'Pacote com 68 unidades.', 'pct', 16.80, 0.24),
      ('OURO BRANCO C/50', 'Caixa com 50 unidades.', 'cx', 54.99, 1.10),
      ('BONOBON C/50', 'Caixa com 50 unidades.', 'cx', 47.99, 0.95),
      ('BATON AO LEITE C/30', 'Caixa com 30 unidades.', 'cx', 47.99, 1.59),
      ('NUTELLA B READY C/10', 'Caixa com 10 unidades.', 'cx', 39.99, 3.99),
      ('SNICKERS C/20', 'Caixa com 20 unidades.', 'cx', 69.99, 3.50),
      ('SUFLAIR 50G C/20', 'Caixa com 20 unidades de 50 g.', 'cx', 99.99, 4.99),
      ('TRENTO BITES C/12', 'Caixa com 12 unidades.', 'cx', 41.00, 3.41),
      ('DOCE BOTICÃO C/20', 'Caixa com 20 unidades.', 'cx', 22.00, 1.10),
      ('DOCE RICCO ESPETO C/35', 'Caixa com 35 unidades.', 'cx', 48.99, 1.39),
      ('GELEIA DIN DAN C/20', 'Caixa com 20 unidades.', 'cx', 17.99, 0.89),
      ('DOCE GIBI C/50', 'Caixa com 50 unidades.', 'cx', 16.80, 0.33),
      ('HALLS c/21', 'Display com 21 unidades.', 'cx', 26.50, 1.26),
      ('FINI DESENHOS C/12', 'Pacote com 12 unidades.', 'pct', 11.50, 0.95),
      ('FINI TUBES c/12', 'Pacote com 12 unidades.', 'pct', 10.00, 0.83),
      ('FRUITELLA c/15', 'Caixa com 15 unidades.', 'cx', 34.00, 2.26),
      ('MENTOS c/16', 'Display com 16 unidades.', 'cx', 32.00, 2.00),
      ('CHIC BRINQ TATOO c/100', 'Pacote com 100 unidades.', 'pct', 8.00, 0.08),
      ('PLUTONITA c/40', 'Pacote com 40 unidades.', 'pct', 7.50, 0.17),
      ('TRIDENT c/21', 'Display com 21 unidades.', 'cx', 39.00, 1.85),
      ('SALG BACON BITS c/10', 'Caixa com 10 unidades.', 'cx', 24.00, 2.40),
      ('SALGADINHO BECK+ c/10', 'Caixa com 10 unidades.', 'cx', 13.00, 1.30),
      ('SAG POINT BACON c/10', 'Caixa com 10 unidades.', 'cx', 17.00, 1.70),
      ('BATATA POINT CHIPS c/24', 'Caixa com 24 unidades.', 'cx', 35.00, 1.45),
      ('PIRULITO BIG BIG', 'Pacote para revenda.', 'pct', 11.50, null),
      ('TODDY 370g c/3', 'Caixa com 3 unidades de 370 g.', 'cx', 27.00, 8.99),
      ('NESCAU 350g c/3', 'Caixa com 3 unidades de 350 g.', 'cx', 29.10, 9.70),
      ('NISSIN MIOJO C/10', 'Caixa com 10 unidades.', 'cx', 25.50, 2.55),
      ('CUP NOODLES C/6', 'Caixa com 6 unidades.', 'cx', 28.50, 4.75)
    ) as products(name, description, unit, price, unit_price_display)
  loop
    update public.products as product
    set category_id = alimentos_id,
        name = catalog.name,
        description = catalog.description,
        unit = catalog.unit,
        price = catalog.price,
        unit_price_display = catalog.unit_price_display,
        bulk_min = null,
        bulk_price = null,
        active = true,
        updated_at = now()
    where lower(trim(product.name)) = lower(trim(catalog.name));

    if not found then
      insert into public.products (
        category_id,
        name,
        description,
        unit,
        price,
        stock_fisico,
        stock_reservado,
        stock_minimo,
        active,
        unit_price_display
      )
      values (
        alimentos_id,
        catalog.name,
        catalog.description,
        catalog.unit,
        catalog.price,
        0,
        0,
        0,
        true,
        catalog.unit_price_display
      );
    end if;
  end loop;
end;
$$;
