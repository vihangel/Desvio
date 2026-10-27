# Acessibilidade

Referência: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) nível AA. A verificação automática usa o [axe-core](https://github.com/dequelabs/axe-core) (dependência de desenvolvimento); ela não substitui testar com teclado e leitor de tela.

## O que o site garante

- **Semântica:** menu com links reais (`<a href>`), uma área principal (`<main>`) e um título (`<h1>`) por página, regiões nomeadas e link "Pular para o conteúdo".
- **Navegação:** a cada troca de página, o título da aba muda e o foco vai para o título da página (o leitor de tela anuncia). Diálogos prendem o foco e fecham com Esc. Sair de um formulário com alterações pede confirmação.
- **Museu 3D:** a cena é visual; todas as obras também ficam acessíveis em **"Obras desta sala"** e no menu de salas. A sala atual é anunciada. Teclado: WASD ou setas para andar.
- **Som:** os vídeos do museu começam **sem som**. O botão "Som ligado/desligado" fica sempre visível na visita e no painel de acessibilidade. Vídeos do YouTube abrem com legendas em português quando o vídeo tem.
- **Narração das pessoas artistas:** transcrição sempre visível e, quando houver arquivo `.vtt`, legenda sincronizada com botão para ligar e desligar.
- **Painel "Acessibilidade"** (ícone no cabeçalho): tamanho do texto (normal, grande, muito grande), alto contraste, leitura facilitada (espaçamento do WCAG 1.4.12 e links sublinhados), som no museu e tradução em Libras pelo **VLibras** (carregado de `vlibras.gov.br` só quando ativado). As escolhas ficam salvas no navegador da pessoa.
- **Movimento:** o site respeita a opção "reduzir movimento" do sistema (sem animações nem rotação automática).

Evitamos widgets de "acessibilidade instantânea" que se sobrepõem ao site: eles não corrigem o código e costumam atrapalhar leitores de tela.

## O que a curadoria precisa preencher

Acessibilidade também depende do conteúdo:

1. **Descrição acessível** de toda imagem e objeto 3D: descreva o que se vê, não repita o título.
2. **Descrição da obra** (obrigatória para publicar): é o que o leitor de tela e a narração sintetizada leem.
3. **Narração:** sempre com **transcrição**. Se possível, anexe a **legenda `.vtt`** (texto + tempos). Ferramentas como o Subtitle Edit ou o próprio YouTube Studio exportam WebVTT.
4. **Vídeos do YouTube:** prefira vídeos com legendas em português revisadas (as automáticas costumam errar nomes próprios).
5. Evite informação só por cor e textos em imagem sem descrição.

## Como verificar

- `npm run check` roda testes de semântica básica (links do menu, painel, legendas).
- No navegador, com o servidor de desenvolvimento, rode o axe no console: carregue `/node_modules/axe-core/axe.min.js` e execute `axe.run()`.
- Teste manual: navegue só com Tab/Shift+Tab/Enter/Esc; no Mac, use o VoiceOver (Cmd+F5); no Android, o TalkBack.
