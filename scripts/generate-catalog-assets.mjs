import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const groups = JSON.parse(readFileSync(join(root, "data/catalog-2026-10-13.json"), "utf8"));
const imageDirectory = join(root, "public/products");
const migrationPath = join(root, "supabase/migrations/20261013221029_catalog_expansion.sql");

const escapeXml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
})[character]);
const quoteSql = (value) => value === null ? "null" : `'${String(value).replaceAll("'", "''")}'`;
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const moneySql = (value) => value === null ? "null" : Number(value).toFixed(2);

function details(category, name) {
  if (name === "GUARANÁ/PEPSI/SUKITA 200ML") {
    return { unit: "cx", description: "Caixa com 12 unidades de 200 ml; marca conforme disponibilidade." };
  }
  if (name === "HEINEKEN LATÃO 473ML") {
    return { unit: "fardo", description: "Fardo com 12 latas de 473 ml." };
  }
  if (name.startsWith("SACOLA ")) {
    return { unit: "pct", description: "Pacote de 5 kg; preço unitário informado por kg." };
  }
  if (name === "PIRULITO BIG BIG") {
    return { unit: "pct", description: "Pacote para revenda; quantidade não informada." };
  }
  if (name === "BUSCA BRISA") {
    return { unit: "un", description: "Bebida. A partir de 7 unidades, R$ 29,99 cada." };
  }
  const packCount = name.match(/\bc\/(\d+)\b/i)?.[1];
  if (packCount) {
    const unit = category === "Embalagens" ? "pct" : "cx";
    return { unit, description: `${unit === "pct" ? "Pacote" : "Caixa"} com ${packCount} unidades.` };
  }
  return { unit: "un", description: "Venda unitária." };
}

function linesFor(name) {
  const words = name.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > 22) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function productShape(category, name, accent) {
  const can = /LATA|LATÃO|HEINEKEN|REDBULL|MONSTER|CABARÉ ICE/.test(name);
  if (category === "Embalagens") {
    if (name.startsWith("SACOLA")) return `<path d="M214 181h212l25 231H189z" fill="#fff" stroke="${accent}" stroke-width="10"/><path d="M271 207v-47c0-50 98-50 98 0v47" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"/><path d="M226 322h188" stroke="${accent}" stroke-width="8" opacity=".3"/>`;
    if (name.startsWith("CANUDO")) return `<g stroke="${accent}" stroke-width="22" stroke-linecap="round"><path d="M223 382l42-211 66 12"/><path d="M306 392l36-221 68 12"/><path d="M388 393l22-163"/></g>`;
    if (name.startsWith("TAMPA")) return `<ellipse cx="320" cy="276" rx="155" ry="56" fill="#fff" stroke="${accent}" stroke-width="10"/><path d="M165 276v52c0 31 69 57 155 57s155-26 155-57v-52" fill="#fff" stroke="${accent}" stroke-width="10"/><ellipse cx="320" cy="276" rx="94" ry="29" fill="${accent}" opacity=".16"/>`;
    return `<path d="M213 174h214l-33 237H246z" fill="#fff" stroke="${accent}" stroke-width="10"/><ellipse cx="320" cy="174" rx="107" ry="26" fill="#fff" stroke="${accent}" stroke-width="10"/><path d="M260 282h120" stroke="${accent}" stroke-width="12" opacity=".4"/>`;
  }
  if (category.includes("Bebidas")) {
    if (can) return `<rect x="243" y="158" width="154" height="252" rx="28" fill="${accent}"/><ellipse cx="320" cy="158" rx="77" ry="20" fill="#e7e9e7"/><ellipse cx="320" cy="410" rx="77" ry="17" fill="${accent}"/><rect x="267" y="232" width="106" height="92" rx="12" fill="#fff" opacity=".78"/><path d="M285 182h70" stroke="#fff" stroke-width="8" opacity=".65"/>`;
    return `<path d="M286 147h68v52c0 18 32 38 40 61l16 121c3 23-10 32-30 32H260c-20 0-33-9-30-32l16-121c8-23 40-43 40-61z" fill="${accent}"/><rect x="282" y="132" width="76" height="29" rx="7" fill="#ddd"/><rect x="252" y="267" width="136" height="99" rx="13" fill="#fff" opacity=".83"/><path d="M266 310h108" stroke="${accent}" stroke-width="9" opacity=".4"/>`;
  }
  if (category === "Tabacaria") {
    if (name.startsWith("ISQUEIRO") || name.startsWith("BIC ")) return `<rect x="261" y="205" width="118" height="205" rx="20" fill="${accent}"/><rect x="282" y="163" width="76" height="51" rx="8" fill="#c5cbd0"/><rect x="303" y="143" width="34" height="23" rx="7" fill="#879198"/><rect x="280" y="262" width="80" height="68" rx="12" fill="#fff" opacity=".72"/>`;
    if (name.startsWith("TESOURA") || name.startsWith("DICHAVADOR")) return `<circle cx="280" cy="320" r="66" fill="none" stroke="${accent}" stroke-width="19"/><circle cx="364" cy="320" r="66" fill="none" stroke="${accent}" stroke-width="19"/><path d="M250 190l180 208M390 190L214 398" stroke="${accent}" stroke-width="17" stroke-linecap="round"/>`;
    return `<rect x="220" y="184" width="200" height="225" rx="18" fill="${accent}"/><rect x="220" y="184" width="200" height="73" rx="18" fill="#fff" opacity=".65"/><rect x="252" y="282" width="136" height="82" rx="10" fill="#fff" opacity=".76"/><path d="M220 256h200" stroke="#fff" stroke-width="8" opacity=".7"/>`;
  }
  if (/NUTELLA|TODDY|NESCAU/.test(name)) return `<rect x="238" y="201" width="164" height="208" rx="34" fill="${accent}"/><rect x="226" y="176" width="188" height="42" rx="13" fill="#e4e7e1"/><rect x="255" y="270" width="130" height="92" rx="16" fill="#fff" opacity=".82"/><path d="M272 308h96" stroke="${accent}" stroke-width="10" opacity=".4"/>`;
  if (/MIOJO|NOODLES/.test(name)) return `<path d="M224 209h192l-25 203H249z" fill="${accent}"/><ellipse cx="320" cy="209" rx="98" ry="29" fill="#f3eee5" stroke="${accent}" stroke-width="8"/><rect x="264" y="279" width="112" height="77" rx="14" fill="#fff" opacity=".8"/>`;
  if (/SALG|BATATA POINT/.test(name)) return `<path d="M240 176h160l27 226H213z" fill="${accent}"/><path d="M240 176h160M220 402h200" stroke="#fff" stroke-width="14" opacity=".58"/><circle cx="320" cy="291" r="54" fill="#fff" opacity=".77"/>`;
  return `<path d="M172 253l30-22h236l30 22-30 22H202z" fill="${accent}" opacity=".75"/><rect x="196" y="213" width="248" height="176" rx="30" fill="${accent}"/><path d="M196 256l-32-18v128l32-17M444 256l32-18v128l-32-17" fill="${accent}" opacity=".7"/><rect x="232" y="265" width="176" height="72" rx="18" fill="#fff" opacity=".82"/><circle cx="320" cy="301" r="20" fill="${accent}" opacity=".34"/>`;
}

function imageSvg(category, name, index) {
  const palettes = {
    "Variados": ["#9e3f50", "#f6e8e3"],
    "Embalagens": ["#367787", "#e5f3f2"],
    "Bebidas não alcoólicas": ["#2b7f6d", "#e8f4ed"],
    "Tabacaria": ["#6b6382", "#eeeaf4"],
    "Bebidas alcoólicas": ["#80567a", "#f3eaf0"],
  };
  const [accent, background] = palettes[category];
  const titleLines = linesFor(name);
  const title = titleLines.map((line, lineIndex) => `<text x="48" y="${496 + lineIndex * 37}" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#fff">${escapeXml(line)}</text>`).join("");
  const decorationX = 84 + (index * 71) % 460;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="Ilustração provisória de ${escapeXml(name)}"><rect width="640" height="640" fill="${background}"/><circle cx="${decorationX}" cy="125" r="98" fill="${accent}" opacity=".08"/><circle cx="520" cy="355" r="125" fill="${accent}" opacity=".07"/><text x="48" y="67" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="2" fill="${accent}">${escapeXml(category.toLocaleUpperCase("pt-BR"))}</text>${productShape(category, name, accent)}<path d="M0 440h640v200H0z" fill="${accent}"/>${title}<text x="48" y="611" font-family="Arial, sans-serif" font-size="18" fill="#fff" opacity=".83">IMAGEM ILUSTRATIVA · FOTO PENDENTE</text></svg>\n`;
}

const rows = groups.flatMap(({ category, items }) => items.map(([name, price, unitPrice]) => ({
  category, name, price, unitPrice, ...details(category, name), slug: slugify(name),
})));
if (rows.length !== 94 || new Set(rows.map(({ slug }) => slug)).size !== rows.length) {
  throw new Error("O catálogo deve conter 94 nomes e slugs únicos.");
}
for (const row of rows) {
  if (!Number.isFinite(row.price) || row.price < 0 || (row.unitPrice !== null && (!Number.isFinite(row.unitPrice) || row.unitPrice < 0))) {
    throw new Error(`Preço inválido: ${row.name}`);
  }
}

mkdirSync(imageDirectory, { recursive: true });
rows.forEach((row, index) => writeFileSync(join(imageDirectory, `${row.slug}.svg`), imageSvg(row.category, row.name, index), "utf8"));

const categoriesSql = groups.map(({ category }) => `  (${quoteSql(category)}, true)`).join(",\n");
const rowsSql = rows.map((row) => `      (${quoteSql(row.category)}, ${quoteSql(row.name)}, ${quoteSql(row.description)}, ${quoteSql(row.unit)}, ${moneySql(row.price)}, ${moneySql(row.unitPrice)}, ${quoteSql(`/products/${row.slug}.svg`)})`).join(",\n");
const migration = `-- Catálogo enviado pelo proprietário em 13/10/2026. Fotos provisórias são ilustrações locais.\n-- Atualizações preservam estoque, promoção existente e qualquer foto real já enviada.\ninsert into public.categories (name, active)\nvalues\n${categoriesSql}\non conflict (name) do update set active = true;\n\ndo $$\ndeclare\n  item record;\nbegin\n  for item in\n    select c.id as category_id, catalog.*\n    from (values\n${rowsSql}\n    ) as catalog(category_name, name, description, unit, price, unit_price_display, image_url)\n    join public.categories c on c.name = catalog.category_name\n  loop\n    update public.products as product\n    set category_id = item.category_id,\n        name = item.name,\n        price = item.price,\n        unit_price_display = item.unit_price_display,\n        image_url = coalesce(product.image_url, item.image_url),\n        active = true,\n        updated_at = now()\n    where lower(trim(product.name)) = lower(trim(item.name));\n\n    if not found then\n      insert into public.products (category_id, name, description, unit, price,\n        stock_fisico, stock_reservado, stock_minimo, active, image_url, unit_price_display)\n      values (item.category_id, item.name, item.description, item.unit, item.price,\n        0, 0, 0, true, item.image_url, item.unit_price_display);\n    end if;\n  end loop;\nend;\n$$;\n`;
writeFileSync(migrationPath, migration, "utf8");
console.log(`Gerados ${rows.length} SVGs ilustrativos e ${migrationPath}.`);
