import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const selections = JSON.parse(readFileSync(join(root, "data/product-image-selections.json"), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, "data/catalog-2026-10-13.json"), "utf8"))
  .flatMap(({ items }) => items.map(([name]) => name));
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const imageDirectory = join(root, "public/products/photos");
mkdirSync(imageDirectory, { recursive: true });

async function get(url) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "SantaEdwigesCatalog/1.0 (licensed product imagery)" },
        signal: AbortSignal.timeout(18000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

const sources = [];
for (const selection of selections) {
  const { name, code, source, depiction } = selection;
  if (!catalog.includes(name)) throw new Error(`Produto fora do catálogo: ${name}`);
  const domain = source === "food" ? "world.openfoodfacts.org" : "world.openproductsfacts.org";
  const apiUrl = `https://${domain}/api/v2/product/${code}?fields=code,product_name,brands,quantity,image_front_url`;
  try {
    const payload = await (await get(apiUrl)).json();
    if (payload.status !== 1 || !payload.product?.image_front_url) {
      throw new Error("Produto ou foto frontal indisponível");
    }
    const imageUrl = payload.product.image_front_url;
    const expectedImageHost = source === "food" ? "images.openfoodfacts.org" : "images.openproductsfacts.org";
    if (new URL(imageUrl).hostname !== expectedImageHost || !imageUrl.endsWith(".jpg")) {
      throw new Error(`URL de imagem inesperada: ${imageUrl}`);
    }
    const bytes = Buffer.from(await (await get(imageUrl)).arrayBuffer());
    if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      throw new Error("Imagem JPEG inválida");
    }
    const localPath = `/products/photos/${slugify(name)}.jpg`;
    writeFileSync(join(root, "public", localPath.slice(1)), bytes);
    sources.push({ name, code, source, depiction, localPath,
      sourceUrl: `https://${domain}/product/${code}`,
      imageUrl, productName: payload.product.product_name || "",
      brands: payload.product.brands || "", quantity: payload.product.quantity || "" });
    console.log(`${sources.length}/${selections.length} ${name} — ${bytes.length} bytes`);
  } catch (error) {
    console.error(`FALHOU ${name}: ${error}`);
  }
  writeFileSync(join(root, "data/product-image-sources.json"), JSON.stringify(sources, null, 2) + "\n");
}
console.log(`Baixadas ${sources.length}/${selections.length} fotos.`);
