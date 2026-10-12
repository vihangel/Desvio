# Desvio · Acervo Trans de Mato Grosso

Esta é uma **prévia curatorial independente**, ainda não uma exposição autorizada pelas pessoas artistas. Ela reúne informações públicas verificáveis sobre produções trans de Mato Grosso.

## Pessoas artistas

- **Linscker Marim**: artista visual de Rondonópolis, com atuação em moda, arte têxtil, performance e audiovisual. Fonte: https://panorama.labfront.com.br/os-artistas/
- **O Sol Ferreira**: multiartista transmasculino de Mato Grosso, com atuação em artes visuais, teatro, poesia e audiovisual. Fonte: https://www.hnt.com.br/cuiabanalia/exposicao-homem-fruta-homem-mato-destaca-trajetoria-de-o-sol-ferreira-na-ufmt/510752

## Referências documentais do MVP

- Entre Fios & Tramas: TRANSgressões de Gênero (Linscker, exposição, 2024). Financiamento FARM + Instituto Precisa Ser. Fonte: https://panorama.labfront.com.br/os-artistas/
- Emaranhados Psíquicos (Linscker, videoarte, 2024). Fonte: https://panorama.labfront.com.br/obras-2026/
- Trans•forma•ação (Linscker e coletivo de Rondonópolis, videoarte apresentada no 26º Salão Jovem Arte). Data de criação a confirmar. Fonte: https://panorama.labfront.com.br/os-artistas/
- Manga Coração de Boi (O Sol Ferreira, exposição, 2021). Fonte: https://cenariomt.com.br/cenario-politico/gov-mt/exposicao-manga-coracao-de-boi-transversaliza-aspectos-mato-grossenses-e-a-existencia-de-pessoas-trans/
- Homem-fruta, Homem-mato (O Sol Ferreira, exposição, 2025). Fonte: https://www.hnt.com.br/cuiabanalia/exposicao-homem-fruta-homem-mato-destaca-trajetoria-de-o-sol-ferreira-na-ufmt/510752
- De Cara com Sol (O Sol Ferreira, websérie documental, 2025). Fonte: https://leiagora.com.br/gravada-na-galeria-do-padua-webserie-sobre-universo-trans-e-exibida-em-cuiaba/

## Política de acervo e direitos

Os arquivos SVG em `public/art/desvio-*.svg` são **painéis editoriais originais criados para testar o sistema**. Eles não reproduzem fotografias nem obras das pessoas artistas.

Antes da publicação de imagens originais, vídeos, modelos 3D, áudios ou entrevistas, solicitar autorização expressa de uso e registrar autoria, direitos sobre registro fotográfico/audiovisual, atribuição e condições de permanência.

Confirmar com cada pessoa artista: nome e pronomes de apresentação, mini-biografia, ficha técnica, ano, créditos coletivos, título, formas de mediação, acessibilidade e autorização para reprodução digital.

O acervo precisa permitir correções, atualização e retirada de conteúdo. A documentação deve distinguir uma **obra individual**, uma **exposição** e um **projeto audiovisual**.

## MVP atual

- Museu com três salas e painéis de referência.
- Navegação por teclado/mouse ou joystick/touch, e atalhos de salas.
- Visita livre e sequência guiada.
- Painel de edição local (sem autenticação real), incluindo troca de sala, textos, nova obra e imagem pequena.
- Estado de exposição e datas **simulados**, armazenados apenas no navegador.

Pendências principais: Supabase Auth + RLS, Storage, aprovação curatorial, upload persistente de GLB/vídeo/áudio, editor visual de pontos expositivos, validação de acessibilidade e autorização dos direitos.

## Prévia local de obras de Linscker

A rota de desenvolvimento `/previa/linscker` contém uma montagem temporária com três imagens do catálogo [Entre Fios & Tramas — TRANSgressões de Gênero](https://www.transgressoesdegenero.com/galeria/):

- [Além das Amarras](https://www.transgressoesdegenero.com/obras/3/), 2024, técnica mista, 59 × 111 cm. PNG fornecido pelo usuário.
- [A Neca da Boneca](https://www.transgressoesdegenero.com/obras/1/), 2023, técnica mista, 175 × 182 cm. PNG obtido do catálogo.
- [Retificada](https://www.transgressoesdegenero.com/obras/2/), 2023, técnica mista, 33 × 24 cm. PNG obtido do catálogo.

As imagens são representações das obras disponíveis no catálogo, não os painéis editoriais SVG do Desvio. Os textos são sínteses editoriais; ano, técnica, dimensões e materiais foram conferidos nas páginas de origem. Crédito fotográfico individual não identificado nessas páginas.

Por solicitação de demonstração no site publicado, as três imagens também integram a navegação principal em desenvolvimento e produção. A montagem não modifica o seed público nem os rascunhos persistidos, e as mídias têm estado de direitos `preview`, bloqueado na validação de publicação. A autorização de reprodução pública permanece pendente. Os arquivos ficam em `src/assets/linscker/`; são imagens de catálogo de 270 × 295 pixels, suficientes para testar a composição, mas não arquivos de exposição em alta resolução.
