# Desvio

Museu virtual 3D, em React + TypeScript + React Three Fiber + Three.js. A primeira mostra de pesquisa é **Corpos, fios e territórios**, uma prévia do Acervo Trans de Mato Grosso.

## Executar

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

Hospedagem: Vercel, framework Vite, saída `dist`, repositório `vihangel/Desvio`.

## O que funciona

- Três salas conectadas em 3D, com navegação por teclado e mouse ou joystick/touch.
- Menu de acesso direto às salas e visita guiada por registros.
- Fichas editoriais, links de fonte e narração por voz sintetizada.
- Curadoria documental inicial: Linscker Marim e O Sol Ferreira.
- Painel mockado para editar títulos, autores, descrições, categorias, sala e imagens.
- Inclusão de registros próprios em `localStorage`; restauração do acervo original.
- Preview de arquivos `.glb` em pedestal, a partir de URL pública ou arquivo local durante a sessão.
- Datas e estados de exposições (rascunho/publicada/arquivada) **simulados**.

## Limitações importantes

**Ainda não há Supabase nem login real.** Todas as alterações do painel são locais, no navegador do visitante. Não representam publicações globais. Modelos GLB selecionados do dispositivo usam uma URL temporária que expira após recarregar; a autenticação, o Storage e a aprovação de obras serão implementados posteriormente.

**Este acervo ainda não contém reproduções autorizadas das obras.** Os cartazes gerados em `public/art/desvio-*.svg` são peças editoriais, não reproduções. Consulte [CURADORIA.md](CURADORIA.md) para as fontes e os procedimentos de autorização.

## Próximas entregas

1. Supabase Auth, perfis de admin e artista, permissões RLS.
2. Galeria orientada a templates/slots e editor de posicionamento.
3. Armazenamento persistente e conversão de imagens/GLB, vídeos e áudios.
4. Mediação e roteiros guiados com legendas e trilhas aprovadas pelas pessoas artistas.
5. Acessibilidade, testes em celulares e controle de desempenho/colisões.

## Navegação pública e administração

O público usa o menu **Início / Museu 3D / Obras / Artistas**. Não existe opção de edição nesses caminhos.

A rota `/admin` abriga, temporariamente, um **editor de demonstração local**. Ela não representa autenticação ou segurança: qualquer pessoa que saiba a URL pode acessar o modo de teste, mas as edições não alteram o acervo público no servidor. Para um verdadeiro admin restrito, será obrigatório implementar Supabase Auth, RLS e persistência no banco. Não usar informações privadas no modo mock.

As salas continuam como templates codificados; gestão dinâmica de criação/conexão das salas e editor de posicionamento ficam para a etapa com modelos persistentes. A imagem do painel de detalhes e a textura 3D usam o mesmo campo `image` do registro.
