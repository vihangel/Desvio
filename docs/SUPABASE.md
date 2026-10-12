# Contrato para integrar o Supabase

## Modelo relacional recomendado

| Tabela                 | Campos e invariantes principais                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `artists`              | UUID, nome público, localização, biografia, fontes. Separada de `auth.users`.                          |
| `profiles`             | UUID de `auth.users`; dados privados mínimos.                                                          |
| `artist_memberships`   | Usuário vinculado a artista; vínculo concedido pela administração.                                     |
| `user_roles`           | Papéis de curadoria/admin, com escrita administrativa protegida.                                       |
| `records`              | Identidade estável do registro, responsável pela submissão.                                            |
| `record_revisions`     | Conteúdo editorial versionado e estado; versão publicada não muda ao salvar rascunho.                  |
| `record_artists`       | Revisão, artista, função e ordem; FK e unicidade.                                                      |
| `media_assets`         | Revisão, bucket, path, tipo, MIME, tamanho, alt, créditos, condições e referência de autorização.      |
| `exhibitions`          | UUID, slug único, título, datas, estado e revisão publicada.                                           |
| `exhibition_revisions` | Composição aprovada da exposição; não seguir automaticamente o último rascunho de um registro.         |
| `exhibition_rooms`     | Revisão de exposição, UUID da sala, ordem, template e versão do template.                              |
| `placements`           | Revisão, sala, mídia e revisão do registro; slot, vetores e escala. Unicidade em `(room_id, slot_id)`. |
| `editorial_events`     | Transições, autor, data e motivo; escrita via operação autorizada.                                     |

Gerar migrations pelo CLI quando o projeto for definido, e gerar tipos TypeScript a partir do banco. Os tipos gerados pertencem à infraestrutura; os componentes usam entidades do domínio e projeções mapeadas pelo adaptador.

## Operações e fronteiras

Implementar `CollectionRepository` em `infrastructure/supabase`. Substituir o serviço no composition root (`src/app/services.ts`). Para produção, separar consultas públicas de consultas administrativas: nunca baixar todos os rascunhos no bundle/snapshot de um visitante.

O snapshot atual é uma interface de coordenação do MVP local, não um plano para armazenar o banco inteiro em JSON. Adaptar consultas por exposição, paginar o catálogo e resolver mídia conforme visibilidade. Evoluir o contrato de carregamento quando houver múltiplas exposições.

Salvar registro + créditos + mídia + posicionamento precisa ser uma transação. Usar uma função/RPC com permissões do chamador e verificação de revisão. Publicar exige permissão curatorial, validação server-side, autorização de mídia quando necessária e referência às revisões aprovadas. Retirada de autorização deve bloquear também o acesso à mídia, inclusive em exposições que a referenciam.

## Matriz de acesso proposta

| Ação                      | Visitante | Artista vinculado | Curadoria | Admin |
| ------------------------- | --------- | ----------------- | --------- | ----- |
| Ler publicado             | Sim       | Sim               | Sim       | Sim   |
| Ler rascunhos             | Não       | Próprios          | Sim       | Sim   |
| Editar rascunho           | Não       | Próprios          | Sim       | Sim   |
| Enviar para revisão       | Não       | Próprios          | Sim       | Sim   |
| Aprovar/publicar/arquivar | Não       | Não               | Sim       | Sim   |
| Conceder papel ou vínculo | Não       | Não               | Não       | Sim   |

Aplicar grants mínimos e RLS por operação, inclusive `USING` e `WITH CHECK` nos updates. Papéis não devem depender de `user_metadata` editável pelo usuário. Separar dados públicos de informações privadas de autorizações/perfis. Views públicas devem respeitar RLS (`security_invoker` quando apropriado). Não criar funções privilegiadas só para contornar erros de permissão.

## Auth e Storage

Inicializar um cliente tipado com URL e publishable key. Segredos e `service_role` nunca entram em variáveis `VITE_*`. Não habilitar um modo remoto que faça fallback silencioso para o editor demonstrativo quando login ou configuração falhar.

Implementar Auth com estado inicial de sessão, observação de mudanças, saída e invalidação de consultas. Guardas de rota servem à navegação; RLS é a autorização real.

Manter originais/rascunhos em bucket privado. Persistir caminho, não URL assinada. Publicar derivados explicitamente autorizados ou usar URLs assinadas com duração curta; bucket público é inadequado para material que precisa de controle de retirada. Definir INSERT/SELECT/UPDATE/DELETE de `storage.objects` conforme proprietário e papel. Upsert exige as três permissões correspondentes.

Gerar miniatura de catálogo e textura otimizada para a galeria; validar tamanho, MIME real, GLB e dimensões no servidor. O `MediaService` local é só uma preparação de preview, não uma validação de upload de produção. Implementar limites, compensação para upload sem registro salvo e limpeza de arquivos órfãos no backend.

## Critério de conclusão da integração

1. Identificar projeto e ambiente de desenvolvimento.
2. Criar schema/migrations e seed; gerar tipos e implementar adaptadores reais.
3. Configurar Auth e Storage; adicionar UI de login e fluxo de submissão/revisão.
4. Testar RLS por leitura/escrita: visitante, artista A, artista B, curadoria e admin; incluir tentativa de autopromoção e troca de proprietário.
5. Confirmar que edição não altera versão publicada, que a publicação é transacional e que retirada bloqueia mídia e exposição.
6. Executar advisors e testes de banco; validar navegador → serviço → banco/Storage → UI.

Referências oficiais: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [tipos gerados](https://supabase.com/docs/guides/api/rest/generating-types), [Storage](https://supabase.com/docs/guides/storage/security/access-control).
