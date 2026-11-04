import { useCallback, useEffect, useState } from "react";
import type {
  AccessCredentials,
  ArtistAccount,
  ArtistAccountService,
} from "../../domain/accounts";
import { errorMessage } from "../../domain/errors";
import type { Notify } from "./useNotice";
import { useConfirm } from "./ui";
// Login accounts of artists (curators on Supabase only). Passwords come back
// once, to be copied and sent by the curator.
export function useArtistAccounts(
  service: ArtistAccountService | undefined,
  enabled: boolean,
  notify: Notify,
) {
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState<ArtistAccount[]>();
  const reload = useCallback(async () => {
    if (!service || !enabled) return;
    try {
      setAccounts(await service.list());
    } catch (error) {
      setAccounts([]);
      notify(errorMessage(error, "Falha ao listar contas."), "error");
    }
  }, [service, enabled, notify]);
  useEffect(() => {
    void reload();
  }, [reload]);
  // The password-issuing commands share the same failure handling.
  const issue = async (
    task: () => Promise<AccessCredentials>,
    success: string,
    fallback: string,
  ) => {
    try {
      const credentials = await task();
      notify(success, "success");
      return credentials;
    } catch (error) {
      notify(errorMessage(error, fallback), "error");
      return undefined;
    }
  };
  return {
    available: !!service,
    accounts,
    reload,
    create: async (email: string, artistId: string) => {
      if (!service) return undefined;
      notify(`Criando o acesso de ${email}…`);
      const created = await issue(
        () => service.create(email, artistId),
        "Acesso criado. Copie a senha.",
        "Falha ao criar acesso.",
      );
      if (created) await reload();
      return created;
    },
    resetPassword: async (account: ArtistAccount) =>
      service
        ? issue(
            () => service.resetPassword(account.userId),
            "Nova senha gerada. Copie e envie.",
            "Falha ao gerar senha.",
          )
        : undefined,
    remove: async (account: ArtistAccount) => {
      if (
        !service ||
        !(await confirm({
          title: `Remover o acesso de ${account.email}?`,
          body: "O login da pessoa é apagado e ela deixa de editar as salas. Você pode criar um acesso novo depois.",
          confirmLabel: "Remover acesso",
          tone: "danger",
        }))
      )
        return;
      try {
        await service.remove(account.userId);
        notify("Acesso removido.", "success");
        await reload();
      } catch (error) {
        notify(errorMessage(error, "Falha ao remover."), "error");
      }
    },
  };
}
export type ArtistAccounts = ReturnType<typeof useArtistAccounts>;
