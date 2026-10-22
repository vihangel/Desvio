# ROADMAP — Desvio | Museu virtual de arte dissidente de Mato Grosso

> **Versão de planejamento:** 0.1 · **Atualizado:** 22/10/2026 · **Situação:** proposta para priorização e refinamento com direção, curadoria e residentes.  
> **Prioridade nº 1:** editor expográfico visual 3D, com obras, elementos cênicos, luzes e interações configuráveis.  
> **Princípio de implementação:** evoluir a experiência sem regressão da visita atual por navegador, mouse/teclado e celular.

## 1. Visão e propósito

O **Museu do Desvio** é uma iniciativa virtual de valorização, preservação, circulação e experimentação da produção artística dissidente de Mato Grosso, com atenção especial a poéticas que tensionam normas de gênero, corpo e existência. Pretende constituir um espaço de memória e fruição artística, com participação de pessoas artistas, acessibilidade, interpretação cultural e autonomia expográfica.

A plataforma não deve ser apenas uma cópia digital de salas físicas. Ela deve permitir **contemplar obras originais em 2D, experienciar objetos 3D, criar instalações digitais autorizadas e acessar narrativas contextualizadas**, com liberdade para visitas não lineares. A tecnologia é meio de mediação, não um fim em si. A definição de museu do ICOM enfatiza acesso, inclusão, interpretação e participação comunitária [R1]; a literatura sobre aprendizagem informal mostra que contexto, motivação, orientação e escolha importam para o visitante [R2].

**Equipe e residência (conforme texto de convite, sujeitos a confirmação pública):**
- **Linscker Marim:** idealização, coordenação e direção do Museu do Desvio.
- **Vih Angel:** codireção e desenvolvimento.
- **Salas de residência propostas:** **Linscker Marim**, **Sol Ferreira** e **Alice e Anayumi** (sala compartilhada conforme nome do convite; papéis individuais e governança conjunta a confirmar).
- O envio de um convite **não equivale a aceite** nem a autorização para reproduzir obras, nomes de projetos, imagens ou falas. Verificar termos, créditos e consentimentos antes da divulgação definitiva.

### Princípios inegociáveis

1. **Autoria e participação:** o/a residente concebe sua expografia e pode solicitar revisão da interpretação feita pelo museu. A curadoria aprova a publicação; nenhuma visualização técnica transfere autoria [R1][R3][R4].
2. **Fidelidade documental:** distinguir a obra original, sua reprodução fiel e qualquer interpretação/expansão digital; documentar quem criou cada transformação [R5][R6].
3. **Acessibilidade multimodal:** conteúdo essencial disponível fora de VR/3D; teclado, toque, legenda, transcrição, texto alternativo e opções para reduzir movimentos [R7][R8].
4. **Escolha do visitante:** modos livre, guiado e catálogo, com orientação e saída clara [R2].
5. **Segurança e governança:** rascunho privado, revisão, publicação versionada, permissões por sala e registro editorial [R6].
6. **Desempenho e sustentabilidade:** limites de carga por cena, níveis de qualidade e processamento de modelos; não multiplicar efeitos sem benefício museológico [R5].
7. **Sem obrigação de headset, avatar ou multiplayer:** VR será um **modo opcional**; a navegação existente permanece suportada.

## 2. Diagnóstico do código em 22/10/2026

Repositório: [vihangel/Desvio](https://github.com/vihangel/Desvio). A avaliação é de código e documentação, **não é uma validação integral do site em dispositivos reais**.

| Dimensão | Já existe | Limite atual e oportunidade |
| --- | --- | --- |
| Visita | `src/features/visit/VisitPage.tsx`, `src/gallery/Player.tsx` | Primeira pessoa e joystick; guia ainda segue registros, sem roteiro curatorial independente. |
| Salas | `src/gallery/Scene.tsx`, `src/domain/entities.ts` | Apenas `template: "corridor"`, módulos de 10 × 12 m com parede/iluminação programadas. |
| Obras | `src/gallery/Painting.tsx`, `Sculpture.tsx`, `VideoArtwork.tsx` | Imagem, modelo e vídeo presentes; falta biblioteca de **elementos expositivos/cenográficos**. |
| Montagem | `src/domain/slots.ts`, `Placement`, formulário admin | Posições numéricas e slots; falta **editor 3D WYSIWYG**, manipulação por eixos e edição de iluminação. |
| Administração | `src/features/admin/*` e adaptadores Supabase | Conta, curadoria/artista, rascunho e mídia; precisam evoluir para propostas expográficas versionadas por sala. |
| Publicação | `src/domain/publication.ts` | A edição pública é recalculada por status de obra; falta snapshot histórico da **exposição integral por residência**. |
| VR | React Three Fiber e Three.js | Não há integração XR identificada; câmera atual é controlada diretamente pelo `Player`. |
| Acervo | `CURADORIA.md` e fichas | Ampliar metadados de proveniência, autorização específica por derivação 3D e pedidos de correção. |

**Dívida documental:** README, `docs/ARQUITETURA.md` e `docs/SUPABASE.md` descrevem ciclos editoriais em momentos diferentes. Antes das mudanças de schema, harmonizar a versão vigente de publicação/rascunho e as migrações realmente aplicadas. Não sobrescrever dados nem executar migrações apenas por referência neste documento.

## 3. Prioridades e marcos

| Marco | Priorização | Entrega demonstrável | Dependência |
| --- | --- | --- | --- |
| **M0 — Base segura do editor** | **P0** | Contratos, perfis, scene graph e salvamento versionado em rascunho | Modelo existente / compatibilidade |
| **M1 — Editor expográfico 3D** | **P0 / prioridade máxima** | Selecionar, adicionar, mover, girar, escalar, iluminar, salvar e rever uma sala | M0 |
| **M2 — Residências e ciclos de exposição** | **P0** | Sala permanente, proposta anual, aprovação e arquivo histórico | M0–M1 |
| **M3 — Interpretação e dinamismo** | **P1** | Ambientes narrativos, mediação, roteiro curatorial, 2D + 3D | M1 |
| **M4 — VR/WebXR opcional** | **P1, após estabilizar o editor** | Uma sala visitável em headset sem alterar controles web | M1 + testes |
| **M5 — Sobre, participação e memória** | **P1** | Página institucional, processo de residência, linha do tempo e correções | Pode avançar em paralelo |
| **M6 — NPC e diálogos** | **P2 / futuro** | Mediação por personagem/totem, primeiro com áudio roteirizado | M3–M4 |

P0/P1/P2 são prioridades, **não prazos ou compromissos financeiros**. Evitar publicar datas sem estimativa baseada no esforço e na disponibilidade de curadoria/artistas.

---

## 4. M0 — Modelo de editor e preservação do acervo (P0)

**Objetivo:** permitir um editor visual sem colapsar obra, ambiente, reprodução digital e exposição na mesma entidade.

### Contratos sugeridos

- `ResidentRoom`: identidade permanente da sala, residente responsável (pessoa ou coletivo), estado do vínculo e políticas; existe independentemente da exposição ativa.
- `ExhibitionEdition`: proposta expositiva completa vinculada a uma sala, título, conceito, intervalo, equipe, estado (`draft`, `in_review`, `approved`, `published`, `archived`), número da revisão e snapshot da montagem.
- `RoomTemplate`: geometria e pontos-base, sem conteúdo de artista; inicialmente corredor/galeria/sala audiovisual/instalação.
- `RoomScene`: configuração versionada de cenário (iluminação ambiental, fundo, materiais, elementos e ambiente sonoro).
- `SceneNode`: objeto presente na sala; `id`, `roomId`, `kind`, `assetId?`, `transform`, `properties`, `interaction?`, `visible`, `locked`, `order`. `kind`: `artwork`, `prop`, `light`, `label`, `audio_zone`, `portal`.
- `Asset`: original, reprodução digital ou interpretação derivada (inclusive licença, créditos, autoria da adaptação, fontes, autorização, formatos e versão); referências estáveis no Storage.
- `GuidedTour` / `TourStop`: roteiro próprio; ponto de câmera, sala, texto, áudio, duração opcional e sequência; não derivar a ordem apenas da lista de obras.
- `EditorialEvent`: submissão, decisão, comentários de curadoria, publicação, substituição, retirada ou pedido de correção.

**Unidades:** metros para posição; rotação em radianos no motor com apresentação em graus no formulário; escala adimensional. Transformações de objetos locais à sala (não exclusivamente coordenadas absolutas do corredor), permitindo mudar de template sem reposicionar manualmente toda obra.

**Persistência:** estender o padrão atual de RPC, RLS e `expectedRevision` do Supabase; gravação atômica, snapshot imutável da edição publicada e migração reversível. Em produção, nenhum papel de artista deve conceder a si mesmo aprovação/publicação [R6].

### Critérios de aceite

- [ ] Abrir o acervo atual e renderizar as salas/obras preexistentes sem perda.
- [ ] Um documento de migração e plano de rollback existentes, com testes para rascunho e edição publicada.
- [ ] Alterar uma proposta privada **não muda** a versão pública.
- [ ] Um artista só edita o que está associado à sua residência e às permissões recebidas.
- [ ] Cada interpretação digital identifica obra fonte, criadores da transformação e condição de uso.

## 5. M1 — Editor expográfico 3D (P0, primeira implementação visual)

> **Caso-piloto:** sala de Linscker, com obras 2D preservadas e elementos cenográficos de fios, modelos 3D e iluminação colorida, **somente com conceito e autorizações validados pela artista**. Não transformar automaticamente obras originais em objetos animados.

### 5.1 Interface no admin

Layout proposto para desktop:

- **Esquerda — Biblioteca:** Obras autorizadas, Modelos/Cenografia, Luzes, Textos, Sons, Interações; pesquisar por tipo e filtrar arquivos aptos a publicação.
- **Centro — Cena 3D:** câmera orbit/free para editar, gizmo de mover/girar/escalar, grade e encaixe; alternância **Editar sala / Testar como visitante**.
- **Direita — Propriedades:** posição XYZ, rotação, escala, visibilidade, vínculo com obra, luz, cor, animação e descrição acessível.
- **Barra superior:** nome e revisão da edição, salvar rascunho, desfazer/refazer, comparação com publicado, pré-visualizar, enviar à curadoria.

**O editor não substitui o visitante.** A manipulação livre existe apenas em modo de edição; no modo público, obras e luzes têm propriedades somente de leitura.

### 5.2 Ferramentas priorizadas

- [ ] Seleção por clique/raycast e destaque visível; a seleção não movimenta o visitante.
- [ ] Inserção de obras em slots de parede, base/pedestal ou pontos livres autorizados.
- [ ] Objetos GLB da biblioteca ou upload próprio com miniatura, escala normalizada e posição inicial segura.
- [ ] Mover, rotacionar e escalar por gizmos e campos numéricos; eixos e limites configuráveis; bloquear proporção por padrão; duplicar e remover.
- [ ] Ajuste fino por teclado, **snap** opcional, grade, alinhamento à parede/piso; ação desfazer/refazer e aviso de alterações não salvas.
- [ ] Detectar peças atravessando paredes, obstruindo portas/rotas e sobreposição evidente; avisar e bloquear publicação quando houver impedimento de acesso.
- [ ] **Luzes:** `spot` e `point` configuráveis com posição, direção/alvo, cor, intensidade, alcance, ângulo/cone e sombra habilitável; presets “Galeria neutra”, “Luz de destaque” e “Instalação dramática”.
- [ ] **Ambiente:** tonalidade de parede/piso, luz ambiente, intensidade geral, cor de fundo, versão reduzida de efeitos visuais; presets acessíveis.
- [ ] **Interações por elemento:** `none`, `open_artwork`, `show_text`, `play_audio_on_action`, `navigate_to_room`; nenhuma execução arbitrária de JavaScript ou HTML externo.
- [ ] Prévia publicada versus rascunho e simulação desktop/mobile; cena acessível por link de revisão somente a participantes autorizados.
- [ ] Persistir iluminação e cenário com a proposta expográfica, não alterar a iluminação global de todas as residências.

### 5.3 Estratégia incremental (evitar construtor de jogos)

**Entrega A: vertical slice** — selecionar 1 quadro, 1 GLB cênico, 1 spot de luz e 1 legenda; mover/rotacionar/escalar, salvar e recarregar a mesma sala.  
**Entrega B:** biblioteca, múltiplos elementos, validação, desfazer/refazer, cores, presets e fluxo de aprovação.  
**Entrega C:** novos templates de sala e conectividade além do corredor, respeitando rotas de navegação.

Começar com **elementos modulares + limites seguros**. Paredes móveis/aberturas arbitrárias e física avançada ficam para uma fase posterior. Para manipulação no React Three Fiber, avaliar `TransformControls` de `@react-three/drei`, com isolamento do controle de câmera durante o arrasto; a escolha exata depende de protótipo e testes de interoperabilidade.

### 5.4 Segurança e otimização

- GLB como formato preferencial de apresentação de cenografia. STL/OBJ podem continuar como importação, mas devem gerar uma versão normalizada para exibição.
- Limitar peso de arquivo, complexidade geométrica, número de luzes com sombras e texturas simultâneas **com valores derivados de medições**; comprimir e carregar ambientes sob demanda.
- Conteúdos externos não podem executar scripts nem carregar dependências arbitrárias; validar formato e sanitizar metadados. Mostrar impacto de um efeito na performance durante a edição.
- Garantir que luzes piscantes, efeitos intensos e movimentos tenham alternativa estática ou opção de desligamento [R7][R8].
- A bibliografia sobre patrimônio 3D recomenda definir utilidade, direitos, qualidade e preservação antes de digitalizar [R5].

### Aceite M1

- [ ] Artista monta a sala-piloto sem editar código-fonte.
- [ ] Obras e cenografia mantêm posição, rotação, escala, cor e luz após recarregar.
- [ ] A equipe testa a sala no editor, submete e publica uma revisão aprovada.
- [ ] Visitantes não veem os gizmos, controles administrativos nem rascunhos.
- [ ] A mesma sala permanece navegável pelo **desktop e celular atuais**.
- [ ] Cada mídia e objeto de cenografia tem créditos, origem e estado de autorização.

## 6. M2 — Residência permanente e exposições versionadas (P0)

### Regras da proposta de convite de 15/10/2026

As condições abaixo reproduzem o **modelo proposto no convite**; ainda dependem de aceite e eventual formalização escrita com as pessoas residentes:

| Regra da residência | Requisito sugerido |
| --- | --- |
| Sala exclusiva por residente | Vínculo estável `ResidentRoom` ↔ responsável ou coletivo; não ceder/repassar sala a outra pessoa sem decisão da direção/curadoria. |
| Autoria da expografia | Residente cria a proposta e organiza cenário, obras e textos; obras coletivas são permitidas com créditos completos e protagonismo curatorial da residente. |
| Aprovação institucional | Toda **nova proposta expositiva completa** passa por revisão e aprovação da direção/curadoria. |
| Atualização | **Até 2 substituições integrais da exposição por ano**; não contabilizar simples ajuste de texto ou correção técnica como uma nova edição. |
| Frequência mínima | Meta de **pelo menos 1 exposição por ano** de cada residência; emitir aviso e abrir diálogo antes de qualquer sanção automática. |
| Permanência histórica | Ao entrar uma nova edição, preservar a anterior em arquivo navegável, com datas, ficha curatorial e autorização de disponibilidade. |
| Voluntariado nesta etapa | Registrar que não há financiamento e que a participação inicial é voluntária e sem remuneração; não prometer recursos futuros. |
| Oportunidades futuras | Prioridade proposta para residentes em futuros editais e serviços remunerados, **condicionada** às regras das chamadas e à disponibilidade de recursos. |

**Questões de governança a formalizar (não codificar como verdades definitivas):** como contar “ano” (ano-calendário ou janela de 12 meses); se a primeira montagem do ano conta como uma das duas atualizações; o tratamento de exposições em coautoria; suspensão/saída de residente; ausência de proposta no período; autorização de manter obras arquivadas após saída; funcionamento da sala “Alice e Anayumi”.

### Fluxo de uma proposta

`Residência → Criar proposta de exposição → Montar cenário 3D + selecionar obras → Revisar direitos/acessibilidade → Enviar à curadoria → Solicitar ajustes ou aprovar → Publicar snapshot → Arquivar edição anterior`.

- A apresentação de uma nova exposição é uma **versão completa** e coerente (não mera adição avulsa de uma obra na exposição corrente).
- Correção técnica/de crédito pode gerar *revisão menor* da mesma edição com histórico e motivo.
- A curadoria pode devolver a proposta com comentários por obra/elemento, sem apagar o trabalho artístico.
- Guardar número e ano das substituições aprovadas, sem alterar retroativamente uma versão publicada.
- Escrever testes de permissões (residente versus curadoria), contadores anuais, arquivamento, restauração e coautoria.

### Aceite M2

- [ ] Salas Linscker, Sol e Alice e Anayumi podem ter versões expositivas distintas, vinculadas aos responsáveis previstos.
- [ ] É possível ver exposição atual e arquivo histórico, sem perder documentos de versões anteriores.
- [ ] Apenas a curadoria publica; artista edita e envia, com revisão registrável.
- [ ] O contador de substituições integrais permite cumprir a regra acordada, sem bloquear correções emergenciais e acessibilidade.

## 7. M3 — Narrativa, mediação e dinamismo intencional (P1)

**Interações devem ser escolhidas em função da obra e de sua mediação, não apenas por apelo visual** [R2][R5][R9].

- [ ] **Modos de apresentação:** (a) contemplação 2D; (b) objeto 3D autoral ou reprodução autorizada; (c) instalação derivada, creditada; (d) vídeo/áudio; (e) conjunto de mídias relacionadas.
- [ ] **Camadas de interpretação:** contexto inicial opcional → ficha técnica → processo criativo → fontes e materiais associados.
- [ ] **Roteiro curatorial específico:** introdução, ordem, paradas, duração estimada, texto, narração, desfecho; salto direto para obras e modo livre sempre disponíveis.
- [ ] **Áudio localizado e legendas/transcrições:** reprodução sob ação do visitante por padrão; volumes ajustáveis, silenciar, replay e separação clara da voz sintetizada/voz da artista.
- [ ] **Interações espaciais discretas:** revelar camadas, mudar o foco de uma luz ao tocar um elemento, observar diferentes pontos de vista, sem efeitos obrigatórios.
- [ ] **Página de detalhe e aprofundamento acessível:** para cada elemento 3D essencial, oferecer equivalente 2D/textual.
- [ ] **Metadados de derivações:** obra original, criadores, processo de transformação, finalidade, autorização e possibilidade de retirar/rever.
- [ ] **Mapa e teleporte por ponto de interesse** também no navegador e mobile, não apenas em VR.
- [ ] **Modo sem animação** e configurações de conforto persistidas localmente.

A definição de museu do ICOM e a Carta ICOMOS valorizam interpretação e contexto [R1][R9]; a aprendizagem de livre escolha favorece flexibilidade [R2].

## 8. M4 — VR/WebXR opcional, com regressão zero na navegação (P1)

**Decisão:** implementar VR em headset compatível por **WebXR**, com `@react-three/xr` como candidato técnico, após uma prova de conceito. A API WebXR tem suporte desigual e requer contexto seguro; expor “Entrar em VR” **somente quando a capacidade for verificada** [R10][R11].

### Plano de implementação

- [ ] Criar adaptadores de entrada separados: `DesktopInput`, `TouchInput`, `XRInput`; cena e coleção permanecem as mesmas.
- [ ] Separar câmera/origem de movimento e `Player`: **nunca** sobrescrever posição/orientação do headset com o código atual de altura fixa e yaw/pitch. Desativar o controlador convencional **somente durante a sessão XR**.
- [ ] Implementar entrada/saída voluntária, retorno ao modo web, reposicionar/recentralizar, estado de sessão e fallback quando XR não existir.
- [ ] Seleção com raio de controlador e alvos maiores, além de interação com botão e acesso a texto/áudio.
- [ ] **Teletransporte** e **rotação em passos** como primeiras formas de movimento, com velocidade/alternativas configuráveis; área sentada e desvio de obstáculos [R7].
- [ ] UI espacial simples para ficha de obra e roteiro; evitar depender de `Html` e iframes como se fossem texturas VR.
- [ ] Definir estratégia de **vídeos YouTube** em headset: link/modo 2D dedicado ou mídia autorizada compatível com apresentação espacial. Não presumir que o player HTML existente será visível em XR.
- [ ] Otimizar cena por modo/dispositivo e medir tempo de quadro, texturas, draw calls, memória, estabilidade e conforto; iluminação dinâmica deve ter fallback de menor custo.
- [ ] Fazer teste presencial em ao menos um headset real com pessoas usuárias, incluindo quem nunca usou VR, além de regressão desktop/mobile.

**PoC mínima:** uma sala residente com **um quadro 2D, uma escultura GLB, um spot e um ponto narrativo**, visitáveis com teleporte e seleção de obra.

### Critérios de aceite

- [ ] Sem headset e/ou sem WebXR: visita atual segue funcionando **sem aviso bloqueante**.
- [ ] Headset: entrada e saída sem perder a obra/sala, seleção e leitura de detalhes.
- [ ] Sem movimento forçado de câmera; opção de recentralizar, teletransportar, pausar e sair.
- [ ] Conteúdo essencial acessível fora do headset e sem efeitos especiais.
- [ ] Matriz de teste assinada para Chrome desktop, Android/iOS mobile e navegador do headset escolhido.

Fontes: documentação WebXR/MDN [R10], migração R3F → XR [R11] e requisitos W3C de conforto/acessibilidade XR [R7].

## 9. M5 — “Sobre o Desvio”, transparência e participação (P1; pode correr em paralelo)

### Menu público sugerido

**Início · Museu 3D · Exposições · Artistas · Acervo · Sobre o Desvio**.  
No mobile, priorizar “Visitar”, “Exposições” e “Menu”. A área `/admin` continua separada, fora da navegação pública. Evitar duplicar **Acervo** e **Obras** sem justificativa: se mantivermos um só, usar **Acervo** como agrupador de obras e arquivos.

### Página `/sobre` sugerida

1. **O que é o Desvio?** Missão, território e proposta de museu virtual, com linguagem acessível.
2. **Por que um acervo de arte dissidente?** Memória, circulação, experimentação e preservação, sem reduzir trajetórias a sofrimento.
3. **Quem constrói:** direção/coordenação, codireção/desenvolvimento, curadoria e residentes **somente após confirmação de vinculação**.
4. **Residências permanentes:** conceito de sala exclusiva, autoria da expografia, revisão curatorial, atualização de exposições e arquivo histórico. Link para política completa, não regras contratuais em texto promocional.
5. **Como visitar:** modo livre, guiado, catálogo acessível e, após estar pronto, VR opcional.
6. **Como participar/contatar:** proposta artística, parcerias, sugestões e solicitações de correção, com meios oficiais revisados pela equipe.
7. **Direitos e ética:** créditos, autorizações, reprodução e derivações digitais, aviso de conteúdo, privacidade e pedidos de retirada.
8. **Etapas e transparência:** fase atual, ausência de financiamento no momento, trabalho voluntário nesta etapa e eventuais editais futuros **sem promessas de remuneração**.

**Texto-base curto (sujeito a aprovação editorial):**

> O Museu do Desvio é uma iniciativa virtual dedicada à valorização, preservação e circulação de produções artísticas dissidentes em Mato Grosso. Sob direção de Linscker Marim e codireção e desenvolvimento de Vih Angel, o projeto busca construir um espaço de memória, encontro e experimentação, em diálogo com as pessoas artistas e suas próprias propostas expográficas. O acervo combina obras em duas e três dimensões, exposições temporárias e novas linguagens imersivas, respeitando autoria, contexto, acessibilidade e direitos de reprodução.

### Participação e memória

- [ ] Seção de **residências** com sala atual, histórico de exposições e créditos.
- [ ] Canal de **correção e retirada** contextualizado por obra, evitando formulário público de exposição involuntária de dados pessoais.
- [ ] Revisão de metadados de gênero/nome/pronomes **apenas quando relevantes, autorizados e em linguagem autodescritiva**; não inferir identidade a partir de fotografias ou documentos históricos [R3].
- [ ] Registro de proveniência, direitos e políticas de preservação [R6].
- [ ] Avaliar versão institucional resumida em português e, futuramente, outras línguas após revisão humana.
- [ ] Explicar que “metaverso” é uma proposta de ambiente digital imersivo; **não** implica blockchain, NFTs, multiplayer ou obrigatoriedade de headset.

## 10. M6 — NPCs, totens e diálogos (P2, futuro)

- **Primeira iteração:** totem/personagem genérico opcional, identificado como recurso museográfico; áudio roteirizado e aprovado, com legenda/transcrição e controle explícito de início/parada.
- **Segunda iteração:** interações por perguntas previamente escritas e respostas aprovadas pela curadoria/artista; permitir sair da conversa e voltar à obra.
- **Terceira iteração, somente após avaliação:** mediação conversacional com IA, com fonte verificável, limites temáticos, revisão humana, indicação visível de que é IA e mecanismos para não inventar falas nem imitar a voz/identidade de artistas.
- NPC não é condição de acesso ao conteúdo e **não substitui a fala/autoria das pessoas artistas**.
- Consentimento explícito para uso de voz, aparência, retrato ou personagem que represente uma pessoa real.

## 11. Qualidade, pesquisa e avaliação de IHC

### Instrumentar sem rastrear desnecessariamente

Eventos agregados e opcionais de navegação (ex.: entrada/salida de sala, carregamento falhou, modo utilizado) podem ajudar a melhorar UX. Preferir estatísticas sem identificadores persistentes; publicar política de privacidade e consentimento quando necessário. Não inferir ou registrar orientação/identidade de visitantes. Avaliação de pessoas artistas requer condições próprias de participação e consentimento.

### Testes recomendados por marco

| Público | Tarefas | Indicadores |
| --- | --- | --- |
| Curadoria | Criar sala, montar e aprovar edição | Erros, tempo, segurança editorial, recuperação de alterações |
| Pessoa residente | Criar cenário, mover 2D/GLB, iluminar e enviar | Autonomia, clareza do editor, satisfação com representação da obra |
| Visitante desktop/mobile | Achar artista, chegar a obra, ler ficha, concluir percurso | Sucesso, desorientação, compreensão, satisfação, acessibilidade |
| Visitante em headset | Entrar, teletransportar, selecionar, sair | Conforto, mal-estar, compreensão, estabilidade e orientação |

Método: comparação qualitativa e quantitativa entre galeria atual e sala-piloto; tarefas, observação, entrevistas, questionários e sessões de cocriação. Falk e Storksdieck fundamentam a atenção ao contexto e ao livre arbítrio [R2]. Nina Simon propõe instituições culturalmente participativas [R4].

### Definição transversal de pronto (DoD)

- [ ] Requisitos de acesso, autoria, direitos e contexto definidos.
- [ ] Dados e migrações testados; rollback descrito quando necessário.
- [ ] Mobile, desktop, teclado e alternativa 2D sem regressões.
- [ ] Acessibilidade avaliada contra WCAG 2.2 AA onde aplicável; requisitos XR específicos nos módulos VR [R7][R8].
- [ ] Assets têm licença/créditos, texto alternativo, versão e orçamento de performance.
- [ ] Nenhum rascunho/revisão privada aparece para visitantes.
- [ ] Testes automatizados e validação manual de cena; participação da pessoa artista antes da aprovação curatorial.

## 12. Riscos e decisões abertas

| Risco | Mitigação |
| --- | --- |
| Editor livre quebrar portas, escala ou câmera | Gizmos com limites, encaixe, validação de colisões e prévia do visitante. |
| Luzes e assets degradarem mobile e VR | Perfis de qualidade e orçamento medido por aparelho, sombras seletivas, streaming por sala. |
| Efeitos alterarem sentido de uma obra | Aprovação da artista, descrição da interpretação e possibilidade de desativar elementos. |
| Derivações 3D confundidas com obra original | Metadado `relationType`, autoria da derivação e rótulo público. |
| Residências confundidas com exposições atuais | Separar sala permanente e `ExhibitionEdition` histórica. |
| Conteúdo de catálogo sem autorização | Manter privado/identificado como prévia, regularizar direitos antes de divulgação pública. |
| WebXR indisponível | Detecção de capacidade, VR opcional, fallback para desktop/mobile e catálogo. |
| Mediação por IA inventar fala de artista | Postergar, fontes vinculadas, aprovação humana, não clonar voz/identidade. |
| Convite interpretado como aceite/remuneração garantida | Comunicar status de proposta e termos condicionais, não anunciar adesões não confirmadas. |

## 13. Primeiras issues recomendadas

1. **[P0][scene-schema]** Definir `RoomScene` e `SceneNode`, versões e contratos de persistência.
2. **[P0][editor-3d]** Criar shell do editor 3D e alternância editar/visitar.
3. **[P0][editor-3d]** Seleção de objetos e `TransformControls`, com persistência/undo.
4. **[P0][lighting]** Inserir e editar spots coloridos (posição, direção, potência, ângulo e sombras).
5. **[P0][assets]** Biblioteca de GLB cênico com créditos, dimensões e limites de desempenho.
6. **[P0][governance]** Modelar residência e edição expositiva integral, com histórico.
7. **[P0][permissions]** Revisar RLS para autoria, submissão e aprovação de propostas por sala.
8. **[P1][exhibition]** Implementar roteiro curatorial independente da ordem das obras.
9. **[P1][webxr]** Prova de conceito de uma sala XR com fallback não-XR.
10. **[P1][about]** Criar rota `/sobre`, menu e política/residências.
11. **[P1][accessibility]** Catálogo equivalente, conforto e controle de movimentos.
12. **[P2][npc]** Totem com áudio pré-aprovado e legendas.

## 14. Referências e rastreabilidade das escolhas

As referências a seguir fundamentam princípios de museologia, documentação, acessibilidade e possibilidades técnicas. **As features exatas são decisões de produto para validar com a equipe e residentes; não são funcionalidades prescritas literalmente pelas fontes.**

- **[R1]** ICOM (2022). *Museum Definition*. Acesso, inclusão, interpretação e participação. https://icom.museum/en/resources/standards-guidelines/museum-definition/
- **[R2]** Falk, J. H.; Storksdieck, M. (2005). *Using the contextual model of learning to understand visitor learning from a science center exhibition*. Science Education, 89(5), 744–778. Escolha, orientação, contexto e exposição. https://doi.org/10.1002/sce.20078
- **[R3]** Trans Metadata Collective (2023), v2.5. *Metadata Best Practices for Trans and Gender Diverse Resources*. Descrição responsável e linguagem de metadados. https://zenodo.org/records/10076876
- **[R4]** Simon, N. (2010). *The Participatory Museum*. Participação, cocriação e avaliação de projetos participativos. https://participatorymuseum.org/read/
- **[R5]** European Commission / Expert Group on Digital Cultural Heritage and Europeana (2020). *Basic principles and tips for 3D digitisation of cultural heritage*. Utilidade, qualidade, direitos, versões e preservação. https://digital-strategy.ec.europa.eu/en/library/basic-principles-and-tips-3d-digitisation-cultural-heritage
- **[R6]** Collections Trust. *Spectrum 5.1*, especialmente `Rights management`, `Reproduction`, `Cataloguing` e `Use of collections`. Gestão documental, autorizações e rastreabilidade. https://collectionstrust.org.uk/spectrum/procedures/
- **[R7]** W3C (2021). *XR Accessibility User Requirements (XAUR)*. Locomoção alternativa, conforto, controle de tempo, texto para áudio e minimização de efeitos. https://www.w3.org/TR/xaur/
- **[R8]** W3C (2024). *Web Content Accessibility Guidelines (WCAG) 2.2*. Navegação por teclado, operação previsível, pausas, foco e alternativas de interação. https://www.w3.org/TR/WCAG22/
- **[R9]** ICOMOS, conforme UNESCO World Heritage Centre. *Charter for the Interpretation and Presentation of Cultural Heritage Sites*: acesso, fontes, contexto, autenticidade, inclusão e avaliação. https://whc.unesco.org/en/faq/290
- **[R10]** Mozilla MDN. *WebXR Device API*. Capacidades, compatibilidade, contexto seguro e restrições do navegador. https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API
- **[R11]** pmndrs. *@react-three/xr — Convert to XR*. Caminho técnico para adaptar app React Three Fiber a XR (com testes de compatibilidade e regressão). https://pmndrs.github.io/xr/docs/getting-started/convert-to-xr
- **[R12]** Caswell, M.; Cifor, M. (2016). *From Human Rights to Feminist Ethics: Radical Empathy in the Archives*. Archivaria, 81, 23–43. Ética do cuidado e responsabilidade com criadores/sujeitos/comunidades. https://archivaria.ca/index.php/archivaria/article/view/13557

---

### Decisão de foco desta versão

**Começar M0 + M1 pela sala-piloto de Linscker**, validando com ela os elementos narrativos, os spots, a configuração espacial, a expografia e as condições de uso das obras. O mesmo editor deve servir depois às salas propostas para Sol Ferreira e Alice e Anayumi. Em seguida: governança de residência/edição completa, narrativa e WebXR opcional, mantendo o comportamento web atual; NPC somente após a experiência central estar estável.
