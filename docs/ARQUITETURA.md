# Arquitetura do Desvio

## Camadas e dependências

- `domain`: entidades normalizadas, regras editoriais, slots, projeções e contratos. Sem React, navegador, Storage ou SDK Supabase.
- `infrastructure/local`: seed, migração do formato v2, validação dos dados persistidos, repositório local e leitura de arquivos.
- `app`: composição dos serviços, carregamento do acervo e navegação. É o ponto de troca dos adaptadores.
- `features`: páginas, formulários e hooks de coordenação. Recebem repositório e serviço de mídia por contrato; não acessam localStorage nem importam adaptadores.
- `gallery`: renderização Three.js, recursos GLB, movimentação e entrada transitória. Recebe uma projeção de leitura; não conhece persistência nem publicação.
- `shared`: cabeçalho, diálogo e narração de navegador. Não contém regras curatoriais.

`App` coordena as páginas e o diálogo. Não salva dados, monta formulários ou descreve geometria. Galeria e admin são chunks carregados sob demanda.

## Modelo atual

`CollectionRecord` representa um registro curatorial. `credits` referencia IDs de artistas e permite autoria coletiva. `creditNote` complementa os créditos sem simular um perfil cadastrado. Uma pessoa artista pode existir sem conta de usuário.

`MediaAsset` separa imagem/modelo, texto alternativo, créditos e autorização. `src` é resolução de leitura/local; o futuro adaptador remoto armazena `bucket` e `path` e resolve URLs em runtime.

`Placement` relaciona registro, mídia e sala. Salas têm UUID e ordem explícita; slots têm capacidade e tipo. Os templates continuam restritos às três salas de corredor do MVP: criar/conectar salas exige generalizar a geometria e colisões, não apenas inserir uma linha no banco.

O formulário atual edita uma mídia e uma posição por registro. Os contratos não exigem que URLs ou índices de sala sejam identidade. Múltiplas mídias por registro, participações em outras exposições e versões independentes devem ser implementadas no adaptador remoto e nos respectivos formulários.

## Rascunho e publicação

O repositório mantém `draft` e `published` separados. Salvar/deletar um registro só altera o rascunho. Enviar para revisão valida a exposição. Publicar exige estado em revisão e copia a versão aprovada. Arquivar retira os registros da consulta pública.

A publicação local não é uma autorização real. No Supabase, validação e transições devem existir também no banco/servidor; o navegador não pode conceder papéis ou aprovar a si mesmo. A versão local contém o acervo completo para demonstração e não deve guardar dados privados.

O contrato de mutação recebe `expectedRevision`. O adaptador remoto precisa realizar comparação e escrita na mesma transação, com conflito explícito. O controle local detecta revisões alteradas entre operações/abas, mas localStorage não fornece compare-and-swap atômico para gravações simultâneas.

## Compatibilidade e erros

- A chave `desvio:works:v2` é validada e migrada para o rascunho v3; o catálogo publicado começa com o seed editorial. A chave antiga é preservada.
- Metadados antigos de estado/data eram simulações não usadas pelo catálogo e não são convertidos em aprovação/publicação.
- Dados malformados, relações inválidas e excesso de slots não são sobrescritos silenciosamente. A interface oferece restauração explícita; exporte dados importantes pelo navegador antes de restaurar.
- Falha de quota impede a confirmação de salvamento.
- URLs `blob:` ficam somente na sessão e são removidas da representação persistida. Publicação exige mídia persistente. O modelo procedural do seed é uma demonstração explícita.
- Falhas de mídia ficam isoladas por recurso na cena. GLBs carregados fora de tempo são descartados, e geometrias, materiais e texturas próprios são liberados ao desmontar.

## Integração Supabase

Ver [SUPABASE.md](SUPABASE.md) para modelo relacional, acesso, fluxo e critérios de validação. Nenhum projeto remoto foi escolhido nem banco alterado nesta refatoração. Não há adaptador remoto fictício ou chave de serviço no frontend.

## Verificação

`npm run check` executa formatação, testes de domínio/repositório e build TypeScript/Vite. A CI usa `npm ci` com lockfile. Testes incluem isolamento de publicação, revisão obrigatória, ocupação de slots, conflito entre abas, migração, quota, integridade, URLs e direitos.
