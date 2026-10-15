// Invites an artist by e-mail and links the account to an artist record.
// Only curators may call it; the service role never leaves this function.
// Deploy: supabase functions deploy desvio-invite-artist
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const { email, artistId, redirectTo } = await req.json();
    if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return json({ error: "Informe um e-mail válido." }, 400);
    if (
      typeof artistId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(artistId)
    )
      return json({ error: "Pessoa artista inválida." }, 400);
    // The link must land on this app's password page, never elsewhere.
    const target = new URL(String(redirectTo));
    const origin = req.headers.get("origin");
    if (
      target.pathname !== "/admin/redefinir-senha" ||
      (origin && target.origin !== origin)
    )
      return json({ error: "Endereço de retorno inválido." }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: req.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false },
    });
    const editor = await caller.rpc("desvio_is_editor");
    if (editor.error || editor.data !== true)
      return json({ error: "Sem permissão de curadoria." }, 403);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });
    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: target.toString(),
    });
    // An existing account is linked as is; the person can reset the password.
    const existed =
      !!invite.error && /already|registered|exists/i.test(invite.error.message);
    if (invite.error && !existed) throw invite.error;
    const link = await admin.rpc("desvio_link_artist_account", {
      account_email: email,
      artist: artistId,
    });
    if (link.error) throw link.error;
    return json({ invited: !existed });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Falha no convite." },
      400,
    );
  }
});
