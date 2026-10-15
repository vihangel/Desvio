import { useState } from "react";
import type { AuthService } from "../../domain/auth";
// Reached from the e-mailed link. Supabase reads the link and opens a
// temporary session, so the person only types the new password here.
const linkParams = new URLSearchParams(window.location.hash.slice(1));
// Invites from the curators land here too, to create the first password.
const invited = linkParams.get("type") === "invite";
const linkError = (() => {
  const params = linkParams;
  return params.get("error_code") === "otp_expired"
    ? "Este link expirou ou já foi usado."
    : params.get("error_description");
})();
export default function ResetPassword({
  service,
  signedIn,
  loading,
  onDone,
  onLogin,
}: {
  service: AuthService;
  signedIn: boolean;
  loading: boolean;
  onDone: () => void;
  onLogin: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="admin admin-gate">
      <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
      <h1>{invited ? "Crie sua senha" : "Nova senha"}</h1>
      {invited && signedIn && !loading && (
        <p>
          Você foi convidada para o Desvio. Defina uma senha para entrar e
          cuidar das suas salas.
        </p>
      )}
      {loading ? (
        <p role="status">Validando o link…</p>
      ) : !signedIn ? (
        <>
          <p role="alert">
            {linkError ?? "Link inválido ou expirado."} Peça um novo link na
            tela de login, em “Esqueci minha senha”.
          </p>
          <button className="primary" onClick={onLogin}>
            Ir para o login
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (password !== confirm) {
              setError("As senhas não coincidem.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              await service.updatePassword(password);
              onDone();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Falha ao salvar a senha.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {invited ? "Senha" : "Nova senha"}
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Repita a senha
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy
              ? "Salvando…"
              : invited
                ? "Criar senha e entrar"
                : "Salvar nova senha e entrar"}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      )}
    </main>
  );
}
