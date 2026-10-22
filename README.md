# Desvio

📍 **Planejamento:** [Roadmap museológico e técnico — editor expográfico 3D, residências artísticas, WebXR e mediação](docs/ROADMAP.md). Documento de proposta para discussão e implementação incremental, atualizado em 22/10/2026.

Museu virtual 3D, em React + TypeScript + React Three Fiber + Three.js. A primeira mostra de pesquisa é **Corpos, fios e territórios**, uma prévia do Acervo Trans de Mato Grosso.

## Executar

```bash
npm ci
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

Hospedagem: Vercel, framework Vite, saída `dist`, repositório `vihangel/Desvio`.

## Acervo e administração

O admin e o museu usam Supabase por padrão: Auth, banco com RLS, edições de rascunho/publicação e Storage privado. O projeto remoto já recebeu as cinco migrações e os 10 registros do acervo, incluindo as três obras de Linscker. Consulte [docs/MIGRACOES.md](docs/MIGRACOES.md) para entrar e importar suas edições antigas.

A rota `/admin` permite cadastrar artistas, salas, obras e montagens; enviar GLB/STL/OBJ e áudio; vincular vídeos do YouTube; revisar e publicar. A prévia administrativa mostra o rascunho. O museu público mostra a última edição publicada.

O público navega por teclado/mouse ou joystick/touch, abre detalhes e usa visita guiada. Ao se aproximar de um vídeo, pode escolher **Assistir vídeo**, com controles em player dedicado e tela cheia.

O modo offline exige `VITE_DATA_MODE=demo`. Não há fallback local em caso de erro remoto. Reprodução de obras e narrações depende das autorizações editoriais; os painéis SVG são peças editoriais e as imagens de Linscker permanecem marcadas como prévia.

## Arquitetura e validação

O projeto separa domínio, infraestrutura local, composição de serviços, páginas, componentes compartilhados e cena 3D. Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e o [contrato de integração Supabase](docs/SUPABASE.md).

```bash
npm run check
```

O comando verifica formatação, testes e build. A CI instala pelo lockfile com `npm ci`.

A importação inicial preserva a cópia de `desvio:collection:v3` no navegador. Modelos e áudios temporários precisam ser reenviados. Salas, registros, mídias e posições são persistidos no banco; imagens históricas também usam arquivos estáticos do repositório.

## Montagem no admin

Cadastre artistas, crie e reordene salas, ajuste capacidade de paredes e objetos 3D e vincule conjuntos de artistas. Cada obra tem mídia separada de sua montagem: imagem como quadro, GLB sobre pedestal ou direto no chão, posição em metros, rotação em graus e escala proporcional. Obras do mesmo tipo podem trocar suas posições salvas em uma operação. Salas ocupadas não podem ser excluídas nem perder posições usadas.

A geometria é um corredor de módulos fixos; o número de salas é dinâmico. Veja as instruções e limitações de ativação em [docs/SUPABASE.md](docs/SUPABASE.md).

## Multimídia

O admin aceita GLB, STL e OBJ, links de vídeo do YouTube e narração do artista em MP3/WAV/OGG/M4A. Vídeos usam telas na parede e prévia silenciosa por foco; o som é ativado pelo visitante. Vídeo, áudio e voz sintetizada compartilham um coordenador que mantém uma fonte ativa por vez.

Para o projeto conectado **Desvio Museu Virtual**, siga [docs/MIGRACOES.md](docs/MIGRACOES.md): as cinco migrações já aplicadas, conta Auth, vínculo inicial de administrador e variáveis do site.
