import { useState } from "react";
import type { AuthService } from "../../domain/auth";
import GatePage from "../../shared/GatePage";
import { useFormSubmit } from "./useFormSubmit";
// Reached from the e-mailed link. Supabase reads the link and opens a
// temporary session, so the person only types the new password here.
const linkParams = new URLSearchParams(window.location.hash.slice(1));
const linkError =
  linkParams.get("error_code") === "otp_expired"
    ? "Este link expirou ou já foi usado."
    : linkParams.get("error_description");
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
  const { busy, error, setError, submit } = useFormSubmit(
    "Falha ao salvar a senha.",
  );
  return (
    <GatePage title="Nova senha">
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
          onSubmit={(e) => {
            if (password !== confirm) {
              e.preventDefault();
              setError("As senhas não coincidem.");
              return;
            }
            void submit(async () => {
              await service.updatePassword(password);
              onDone();
            })(e);
          }}
        >
          <label>
            Nova senha
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
            {busy ? "Salvando…" : "Salvar nova senha e entrar"}
          </button>
          {error && <p role="alert">{error}</p>}
          <button className="link-button" type="button" onClick={onDone}>
            Voltar ao admin
          </button>
        </form>
      )}
    </GatePage>
  );
}
