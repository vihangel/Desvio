import { useState } from "react";
import type { AuthService } from "../../domain/auth";
import { routes } from "../../app/routes";
// Accounts are created by the administration; there is no public sign-up.
export default function AdminLogin({
  service,
  signedIn,
  accountEmail,
  onExit,
}: {
  service: AuthService;
  signedIn: boolean;
  accountEmail: string;
  onExit: () => void;
}) {
  const [mode, setMode] = useState<"sign_in" | "forgot">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const switchTo = (next: typeof mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };
  return (
    <main className="admin admin-gate">
      <div className="eyebrow">ÁREA ADMINISTRATIVA</div>
      <h1>Gestão do Desvio</h1>
      {signedIn ? (
        <>
          <p>
            Conta conectada: <strong>{accountEmail}</strong>
          </p>
          <p>
            Esta conta não tem acesso à curadoria. Peça à administração para
            liberar o acesso.
          </p>
          <button className="outline" onClick={() => void service.signOut()}>
            Sair desta conta
          </button>
        </>
      ) : mode === "sign_in" ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await service.signIn(email, password);
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Falha ao entrar.",
              );
            } finally {
              setPassword("");
              setBusy(false);
            }
          }}
        >
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          {error && <p role="alert">{error}</p>}
          <button
            className="link-button"
            type="button"
            onClick={() => switchTo("forgot")}
          >
            Esqueci minha senha
          </button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await service.requestPasswordReset(
                email,
                window.location.origin + routes.reset_password,
              );
              setNotice(
                "Se este e-mail tiver acesso, você vai receber um link para criar uma nova senha. Abra o link neste mesmo navegador.",
              );
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "Falha ao enviar o link.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Informe o e-mail da sua conta. Enviaremos um link que abre a página
            para definir uma nova senha.
          </p>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Enviando…" : "Enviar link de redefinição"}
          </button>
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <button
            className="link-button"
            type="button"
            onClick={() => switchTo("sign_in")}
          >
            ← Voltar para o login
          </button>
        </form>
      )}
      <button className="outline admin-gate-back" onClick={onExit}>
        Voltar ao museu
      </button>
    </main>
  );
}
