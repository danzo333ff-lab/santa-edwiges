import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  username: z.string().trim().toLowerCase().min(3).max(32),
  password: z.string().min(1).max(256),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  }

  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Informe usuário e senha." }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    return Response.json({ error: "A conta administrativa ainda não foi configurada." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: setting, error: settingError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "admin_username")
    .single();
  if (settingError || !setting) {
    return Response.json({ error: "O login administrativo não está disponível." }, { status: 503 });
  }
  if (setting.value !== parsed.data.username) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return Response.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .single();
  if (profileError || profile?.role !== "admin" || profile.status !== "ativo") {
    await supabase.auth.signOut();
    return Response.json({ error: "Esta conta não tem acesso administrativo." }, { status: 403 });
  }

  return Response.json({ ok: true });
}
