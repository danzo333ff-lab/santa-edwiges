import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Variáveis obrigatórias ausentes: ${missing.join(", ")}`);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim() || "Bruno";
const password = process.env.ADMIN_PASSWORD;

let user;
let page = 1;

while (!user) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Não foi possível consultar usuários: ${error.message}`);
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (user || data.users.length < 1000) break;
  page += 1;
}

if (user) {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Não foi possível atualizar a conta: ${error.message}`);
  user = data.user;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { responsavel: name, empresa: "Santa Edwiges" },
  });
  if (error) throw new Error(`Não foi possível criar a conta: ${error.message}`);
  user = data.user;
}

const { error } = await supabase.from("profiles").upsert({
  id: user.id,
  role: "admin",
  status: "ativo",
  nome: name,
  responsavel: name,
  empresa: "Santa Edwiges",
  email,
});

if (error) throw new Error(`Não foi possível promover o administrador: ${error.message}`);
console.info(`Administrador ${email} preparado com sucesso.`);
