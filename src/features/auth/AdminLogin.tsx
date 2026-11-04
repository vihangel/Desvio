import { useState } from "react";
import type { AuthService } from "../../domain/auth";
import { routes } from "../../app/routes";
import GatePage from "../../shared/GatePage";
import { useFormSubmit } from "./useFormSubmit";
function EmailInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      E-mail
      <input
        type="email"
        autoComplete="username"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function SignInForm({
  service,
  email,
  onEmail,
  onForgot,
}: {
  service: AuthService;
  email: string;
  onEmail: (email: string) => void;
  onForgot: () => void;
}) {
  const [password, setPassword] = useState("");
  const { busy, error, submit } = useFormSubmit("Falha ao entrar.");
  return (
    <form
      onSubmit={submit(async () => {
        try {
          await service.signIn(email, password);
        } finally {
          setPassword("");
        }
      })}
    >
      <EmailInput value={email} onChange={onEmail} />
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
      <button className="link-button" type="button" onClick={onForgot}>
        Esqueci minha senha
      </button>
    </form>
  );
}
function ForgotPasswordForm({
  service,
  email,
  onEmail,
  onBack,
}: {
  service: AuthService;
  email: string;
  onEmail: (email: string) => void;
  onBack: () => void;
}) {
  const [notice, setNotice] = useState("");
  const { busy, error, submit } = useFormSubmit("Falha ao enviar o link.");
  return (
    <form
      onSubmit={submit(async () => {
        await service.requestPasswordReset(
          email,
          window.location.origin + routes.reset_password,
        );
        setNotice(
          "Se este e-mail tiver acesso, você vai receber um link para criar uma nova senha. Abra o link neste mesmo navegador.",
        );
      })}
    >
      <p>
        Informe o e-mail da sua conta. Enviaremos um link que abre a página para
        definir uma nova senha.
      </p>
      <EmailInput value={email} onChange={onEmail} />
      <button className="primary" disabled={busy}>
        {busy ? "Enviando…" : "Enviar link de redefinição"}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="link-button" type="button" onClick={onBack}>
        ← Voltar para o login
      </button>
    </form>
  );
}
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
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <GatePage>
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
      ) : forgot ? (
        <ForgotPasswordForm
          service={service}
          email={email}
          onEmail={setEmail}
          onBack={() => setForgot(false)}
        />
      ) : (
        <SignInForm
          service={service}
          email={email}
          onEmail={setEmail}
          onForgot={() => setForgot(true)}
        />
      )}
      <button className="outline admin-gate-back" onClick={onExit}>
        Voltar ao museu
      </button>
    </GatePage>
  );
}
