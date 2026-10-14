-- Fotos conferidas por código de barras e inspeção visual.
-- Preserva qualquer imagem personalizada que tenha substituído a ilustração provisória.
update public.products as product
set image_url = photos.image_url, updated_at = now()
from (values
  ('KIT KAT c/24', '/products/photos/kit-kat-c-24.jpg'),
  ('CHOKITO c/30', '/products/photos/chokito-c-30.jpg'),
  ('PRESTIGIO c/30', '/products/photos/prestigio-c-30.jpg'),
  ('DIAMANTE NEGRO c/20', '/products/photos/diamante-negro-c-20.jpg'),
  ('NUTELLA 140g', '/products/photos/nutella-140g.jpg'),
  ('NUTELLA B READY C/10', '/products/photos/nutella-b-ready-c-10.jpg'),
  ('OURO BRANCO C/50', '/products/photos/ouro-branco-c-50.jpg'),
  ('BATON AO LEITE C/30', '/products/photos/baton-ao-leite-c-30.jpg'),
  ('SNICKERS C/20', '/products/photos/snickers-c-20.jpg'),
  ('TODDY 370g c/3', '/products/photos/toddy-370g-c-3.jpg'),
  ('NESCAU 350g c/3', '/products/photos/nescau-350g-c-3.jpg'),
  ('COCA LATA 350ML C/12', '/products/photos/coca-lata-350ml-c-12.jpg'),
  ('COCA COLA 1LT', '/products/photos/coca-cola-1lt.jpg'),
  ('BUCHANANS DELUXE 1LT', '/products/photos/buchanans-deluxe-1lt.jpg'),
  ('REDLABEL 1LT', '/products/photos/redlabel-1lt.jpg'),
  ('BLACK LABEL 1LT', '/products/photos/black-label-1lt.jpg'),
  ('BALLANTINES 1LT', '/products/photos/ballantines-1lt.jpg'),
  ('JACK DANIELS 1LT', '/products/photos/jack-daniels-1lt.jpg'),
  ('HEINEKEN LATÃO 473ML', '/products/photos/heineken-latao-473ml.jpg')
) as photos(name, image_url)
where lower(trim(product.name)) = lower(trim(photos.name))
  and (product.image_url is null or product.image_url like '/products/%.svg');
