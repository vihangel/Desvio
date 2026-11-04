# Supabase do Desvio

As cinco migrações iniciais foram aplicadas em **Desvio Museu Virtual** (`rptvhzdbenwrnhxhrfjb`), na conta conectada “Linscker Museu”, em 14/10/2026. As migrações posteriores também estão aplicadas, incluindo a atualização de 04/11/2026. Não execute novamente nenhuma delas neste banco.

1. `20261014013434_desvio_collection.sql`: acervo, edições, permissões e operações editoriais.
2. `20261014013655_desvio_storage.sql`: Storage privado.
3. `20261014171252_desvio_multimedia.sql`: vídeo, modelos e narração.
4. `20261014183336_desvio_existing_catalog.sql`: os 10 registros existentes, incluindo as três obras de Linscker, e importação inicial do rascunho local.
5. `20261014183748_desvio_admin_bootstrap.sql`: concessão inicial de administrador por e-mail confirmado.

A leitura anônima pela Data API foi verificada: 10 registros publicados, três salas e nenhum rascunho exposto. As imagens históricas continuam em `public/art/`; seus endereços e metadados estão no banco. Novos arquivos enviados pelo admin ficam no Storage.

## Entrar e migrar suas edições

1. Reinicie o servidor local, abra `/admin` e escolha **Criar minha conta**. Use o e-mail reservado nesta sessão e defina sua própria senha.
2. Confirme o e-mail recebido pelo Supabase e entre. O vínculo de administrador é concedido após a confirmação; outras contas não recebem acesso editorial automaticamente.
3. No mesmo navegador e endereço onde fez as edições antigas, clique em **Importar rascunho deste navegador**, antes de fazer outras alterações remotas. A cópia local é preservada e a edição publicada não é substituída.
4. Reenvie modelos e áudios temporários. Endereços `blob:` não contêm um arquivo recuperável após encerrar a sessão. Imagens persistidas em base64 são enviadas ao Storage na importação.
5. Revise os dados, envie para revisão e publique para atualizar o museu público. Salvar rascunho atualiza somente a prévia administrativa.

A importação inicial é bloqueada depois da primeira alteração remota para evitar sobrescrever trabalho. As reproduções de Linscker continuam marcadas como prévia; a próxima publicação exige resolver as autorizações de reprodução e de narração.

Em Authentication → URL Configuration, permita os endereços de retorno `/admin` do desenvolvimento e do domínio publicado. Se a confirmação retornar para um endereço diferente, volte ao `/admin` deste projeto e entre.

## Variáveis do site

O `.env.local` desta máquina e as variáveis da Vercel (produção, preview e desenvolvimento) já apontam para o projeto correto. A configuração da Vercel passa a valer no próximo build; o deploy atual não é reconstruído automaticamente. Para outra máquina ou hospedagem:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://rptvhzdbenwrnhxhrfjb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=CHAVE_PUBLICA_DO_PROJETO
```

Use a publishable key ou `anon`; nunca `service_role` ou secret key no frontend. Reinicie o servidor/refaça o build após alterar variáveis. Em Data API, exponha `public` e mantenha `desvio_private` fora dos schemas expostos. O modo `demo` é opcional e explícito; erros remotos não acionam fallback local.

## Outras contas de curadoria

Um operador pode conceder acesso usando o UUID da conta Auth:

```sql
insert into public.desvio_memberships(user_id, role)
values ('UUID_REAL_DA_CONTA', 'curator');
```

O e-mail reservado é configurado privadamente pelo operador, fora das migrações versionadas. A concessão inicial só pode ser reivindicada uma vez.

Para instalar em outro banco vazio, execute todos os arquivos de `supabase/migrations/` na ordem do nome. O arquivo `20261014183748_desvio_admin_bootstrap.sql` instala o mecanismo de concessão, mas não configura um e-mail. Não reaplique instalações existentes. Consulte [SUPABASE.md](SUPABASE.md) para limites e políticas.

## Migrações posteriores

- `20261014200000_desvio_replace_draft_from_local.sql`: importar o acervo local depois de haver edições remotas.
- `20261014210000_desvio_record_status.sql`: status por obra.
- `20261015090000_desvio_artist_accounts.sql`: contas de artista.
- `20261103090000_desvio_schema_improvements.sql`: **aplicada em 04/11/2026** no projeto `rptvhzdbenwrnhxhrfjb`, registrada no histórico do Supabase como `20261104140709_desvio_schema_improvements`. O que mudou:
  - **Remover acesso** deixa de falhar para quem já editou: o histórico fica, sem o vínculo com a conta.
  - Edições públicas sem uso são **apagadas de vez**: as antigas, ao aplicar, e a atual, a cada vez que a exposição sai do ar. O rascunho não é afetado, e a edição pública é recriada ao colocar no ar de novo.
  - Novos índices e checagens de integridade. Se algum dado existente não passar, a migração para com erro e nada é alterado.
  - Um único validador e funções comuns para os comandos da curadoria e de artista. A legenda `.vtt` passa a ser validada também no servidor, e a importação local passa a exigir o mesmo das obras publicadas.
  - Saem funções sem uso (`desvio_import_local`, `desvio_remove_artist_account`) e o tipo `application/octet-stream` do bucket, já que os modelos sempre chegam como GLB.

  A aplicação foi validada em 04/11/2026. Não havia versões órfãs a excluir; o rascunho (12 obras) e a edição pública (11 obras) foram preservados, com revisão `8`. As novas funções `desvio_private.commit_edit` e `desvio_private.validate_snapshot(jsonb)` foram verificadas, assim como a remoção das antigas. A consulta pública continuou retornando 11 obras e 3 salas. Não reaplique a migração.
