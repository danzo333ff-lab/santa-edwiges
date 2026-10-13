import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sources = JSON.parse(readFileSync(join(root, "data/product-image-sources.json"), "utf8"));
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
if (new Set(sources.map(({ name }) => name)).size !== sources.length) {
  throw new Error("Há nomes repetidos na seleção de fotos.");
}
for (const { name, localPath } of sources) {
  if (!existsSync(join(root, "public", localPath.slice(1)))) {
    throw new Error(`Foto inexistente: ${name}`);
  }
}

const values = sources.map(({ name, localPath }) =>
  `  (${quote(name)}, ${quote(localPath)})`).join(",\n");
const sql = `-- Fotos conferidas por código de barras e inspeção visual.\n` +
  `-- Preserva qualquer imagem personalizada que tenha substituído a ilustração provisória.\n` +
  `update public.products as product\n` +
  `set image_url = photos.image_url, updated_at = now()\n` +
  `from (values\n${values}\n) as photos(name, image_url)\n` +
  `where lower(trim(product.name)) = lower(trim(photos.name))\n` +
  `  and (product.image_url is null or product.image_url like '/products/%.svg');\n`;
const path = join(root, "supabase/migrations/20261013225000_verified_product_photos.sql");
writeFileSync(path, sql);
console.log(`Migração gerada para ${sources.length} fotos: ${path}`);
