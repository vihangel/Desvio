// Gives an artist access without e-mail: creates a confirmed account with a
// random password, links it to the artist, and returns the password once so
// the curators can pass it on. Also issues a new password for artist accounts.
// Only curators may call it; the service role never leaves this function.
// Deploy: supabase functions deploy desvio-invite-artist
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

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
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Easy to read aloud or type: no 0/O, 1/l/I. About 71 bits of entropy.
function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % alphabet.length);
  const chars: string[] = [];
  while (chars.length < 12)
    for (const b of crypto.getRandomValues(new Uint8Array(16)))
      if (b < limit && chars.length < 12) chars.push(alphabet[b % alphabet.length]);
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
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
    const body = await req.json();

    if (body.action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return json({ error: "Informe um e-mail válido." }, 400);
      if (!uuid.test(String(body.artistId)))
        return json({ error: "Pessoa artista inválida." }, 400);
      const password = generatePassword();
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error) {
        // Existing accounts are never taken over here: their password stays.
        if (
          created.error.code === "email_exists" ||
          /already|registered|exists/i.test(created.error.message)
        )
          return json(
            {
              error:
                "Já existe uma conta com este e-mail. Se for de uma artista com acesso, use “Gerar nova senha”.",
            },
            409,
          );
        throw created.error;
      }
      const link = await admin.rpc("desvio_link_artist_account", {
        account_email: email,
        artist: body.artistId,
      });
      if (link.error) {
        await admin.auth.admin.deleteUser(created.data.user.id);
        throw link.error;
      }
      return json({ email, password });
    }

    if (body.action === "reset" || body.action === "remove") {
      if (!uuid.test(String(body.userId)))
        return json({ error: "Conta inválida." }, 400);
      // Only artist accounts; never curators or admins.
      const account = await admin
        .from("desvio_artist_accounts")
        .select("email")
        .eq("user_id", body.userId)
        .maybeSingle();
      if (account.error) throw account.error;
      if (!account.data)
        return json({ error: "Esta conta não é de artista." }, 404);
      const member = await admin
        .from("desvio_memberships")
        .select("user_id")
        .eq("user_id", body.userId)
        .maybeSingle();
      if (member.error) throw member.error;
      if (member.data)
        return json(
          { error: "Contas da curadoria não podem ter a senha trocada aqui." },
          403,
        );
      if (body.action === "remove") {
        // Deleting the login also drops the artist link (on delete cascade).
        const removed = await admin.auth.admin.deleteUser(body.userId);
        if (removed.error) throw removed.error;
        return json({ removed: true });
      }
      const password = generatePassword();
      const updated = await admin.auth.admin.updateUserById(body.userId, {
        password,
      });
      if (updated.error) throw updated.error;
      return json({ email: account.data.email, password });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Falha ao criar acesso." },
      400,
    );
  }
});
