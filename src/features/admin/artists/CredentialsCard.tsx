import { useState } from "react";
import type { AccessCredentials } from "../../../domain/accounts";
// Shown once after creating access or a new password; the app keeps no copy.
export default function CredentialsCard({
  artistName,
  credentials,
  onClose,
}: {
  artistName: string;
  credentials: AccessCredentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState("");
  const login = `${window.location.origin}/admin`;
  const message = `Olá! Seu acesso ao Desvio está pronto.\n\nEndereço: ${login}\nE-mail: ${credentials.email}\nSenha: ${credentials.password}\n\nDepois de entrar, você pode trocar a senha em “Trocar senha”.`;
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("");
    }
  };
  return (
    <div className="credentials-card" role="status">
      <b>Acesso de {artistName} pronto</b>
      <p>
        Copie e envie para a pessoa por um canal seguro (WhatsApp, Signal,
        e-mail). Esta senha não aparece de novo.
      </p>
      <dl>
        <div>
          <dt>Endereço</dt>
          <dd>{login}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{credentials.email}</dd>
        </div>
        <div>
          <dt>Senha</dt>
          <dd>
            <code>{credentials.password}</code>
          </dd>
        </div>
      </dl>
      <div className="inline-actions">
        <button
          type="button"
          className="primary"
          onClick={() => void copy("message", message)}
        >
          {copied === "message" ? "Mensagem copiada ✓" : "Copiar mensagem"}
        </button>
        <button
          type="button"
          className="outline"
          onClick={() => void copy("password", credentials.password)}
        >
          {copied === "password" ? "Senha copiada ✓" : "Copiar só a senha"}
        </button>
        <button type="button" className="link-button" onClick={onClose}>
          Já enviei, fechar
        </button>
      </div>
    </div>
  );
}
