# Integração Supabase

O projeto **Desvio Museu Virtual** (`rptvhzdbenwrnhxhrfjb`) está conectado, com cinco migrações aplicadas e 10 registros publicados. Leia [MIGRACOES.md](MIGRACOES.md) para entrar, importar edições locais e configurar outra máquina.

O Supabase é a fonte padrão do admin e do museu. Login usa Auth; permissões usam vínculos privados de curadoria e RLS. Cadastro de conta não concede acesso editorial, exceto ao e-mail reservado e confirmado para o primeiro administrador. `user_metadata` não participa da autorização.

Rascunho e publicação são edições independentes. Salvar não altera o museu público: envie para revisão e publique. Operações usam revisão esperada e bloqueio transacional; conflitos exigem recarregar. Arquivar retira a edição da leitura pública.

## Arquivos e montagem

- Imagens: PNG/JPEG/WebP até 5 MB no remoto; GLB 2.0, STL ou OBJ até 24 MB.
- GLBs devem incorporar buffers e texturas, sem referências a arquivos externos. O cliente verifica cabeçalho e estrutura básica; o Storage restringe tamanho e MIME, mas não inspeciona polígonos nem executa um antivírus.
- O banco persiste `bucket/path`, nunca a URL assinada. O adaptador resolve URLs de uma hora ao carregar o acervo. Recarregue após expiração; uma URL já emitida pode continuar válida até expirar mesmo após arquivamento.
- Uploads têm nomes novos e não sobrescrevem arquivos de edições existentes. Arquivos abandonados ficam privados; sua exclusão deve ser feita pelo operador após verificar referências. As políticas bloqueiam exclusão de arquivos vinculados.
- Quadro aceita imagem; pedestal/chão aceitam modelos GLB/STL/OBJ. O pedestal é gerado pelo site e não precisa ser enviado junto.
- Salas: 1–24 módulos de corredor, cada módulo mantém 10 × 12 m e altura de 4 m. Dimensões livres e plantas arbitrárias ainda não estão implementadas.
- Capacidade configurável: 1–6 quadros por parede e 0–4 posições 3D. A escala visual dos quadros se adapta à densidade sugerida. Ajustes manuais podem exigir conferir sobreposições na prévia.
- O formulário edita uma mídia e uma montagem por obra na exposição atual. Múltiplas exposições simultâneas e múltiplas mídias na mesma obra ainda não têm interface.

## Estrutura e permissões

`desvio_collections` mantém revisão e ponteiros para edições. `desvio_versions` guarda o cabeçalho da exposição; artistas, registros, mídias, salas e montagens têm tabelas próprias com IDs e FKs por edição. Conteúdo editorial extensível fica em JSONB por entidade, não em um JSON único do acervo. Autorizações privadas ficam numa tabela separada e não entram na leitura pública.

As tabelas têm RLS. Clientes só têm SELECT; escrita ocorre na RPC. O comando privilegiado fica no schema privado, tem `search_path` fixo, EXECUTE restrito e verifica `auth.uid()` e vínculo de curadoria antes de qualquer escrita. A função pública é SECURITY INVOKER. Eventos editoriais são registrados na mesma transação.

As entidades de domínio e validações de runtime são independentes do SDK. Os tipos gerados do banco ainda não foram incorporados ao adaptador; as respostas das RPCs são validadas em runtime. Não confunda esses tipos com os DTOs do domínio.

## Verificar após conectar

1. Visitante: catálogo publicado, nenhum rascunho ou autorização privada.
2. Conta sem vínculo: não consegue editar nem enviar arquivos.
3. Curadoria: cadastro, GLB no Storage, recarga mantendo o arquivo e prévia de pedestal/chão.
4. Duas abas: a segunda edição com revisão antiga deve falhar.
5. Publicação: rascunho não altera edição pública; arquivamento bloqueia novas URLs assinadas.
6. Execute os advisors no projeto real e confira as políticas do Storage.

Referências: [Auth](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [URLs assinadas](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Vídeo, objetos 3D e voz do artista

A terceira migração `20261014171252_desvio_multimedia.sql` já está aplicada. O roteiro atualizado está em [MIGRACOES.md](MIGRACOES.md).

O formulário aceita GLB com materiais, STL e OBJ sem arquivos MTL/texturas externos. A renderização usa loaders específicos e preserva a escala proporcional, apoiando a base do objeto. Para materiais completos e melhor portabilidade, exporte GLB.

Vídeos são links do YouTube, não HTML arbitrário nem upload de MP4. Use público ou não listado com incorporação habilitada. O adaptador remoto normaliza o link para o formato canônico. A tela na sala inicia silenciosamente apenas quando o visitante se aproxima de frente; pausa ao perder foco. O botão externo **Assistir vídeo** abre um player dedicado, com controles e opção de tela cheia; a navegação 3D fica suspensa durante a reprodução. A tela dentro da sala não captura cliques. O detalhe da obra oferece o mesmo player sem autoplay. Os controles nativos do YouTube permanecem disponíveis.

Narração é um anexo independente da obra (MP3/WAV/OGG/M4A), com créditos, transcrição e autorização. Até 20 MB no remoto e 12 MB no demo. A referência documental de autorização fica na tabela privada já existente, junto com a autorização da mídia. O campo `authorized` é uma confirmação editorial e não substitui o documento. No demo, áudios e modelos enviados ficam apenas na sessão.

Vídeo, áudio e voz sintetizada usam um coordenador único: iniciar outra fonte pausa a anterior; fechar o detalhe, sair de foco ou ocultar a aba interrompe a mídia correspondente. A voz do artista é iniciada pelo visitante, nunca automaticamente ao caminhar. URLs assinadas dos áudios seguem as mesmas políticas e expiração das imagens e modelos.

Referência do comportamento de reprodução: [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference). A incorporação é um iframe CSS sobre a cena, não uma textura WebGL exportável; o desempenho e a reprodução dependem da rede, do navegador e das permissões do vídeo.

## Contas e senha da curadoria

Não há cadastro público: a tela `/admin` só oferece login e “Esqueci minha senha”. Contas são criadas pela administração no painel do Supabase (Authentication → Users → Add user / Invite). O primeiro admin é vinculado pelo e-mail em `desvio_private.admin_bootstrap`; demais pessoas recebem papel em `desvio_memberships`.

Configurar no painel:

1. Authentication → Sign In / Providers → desligar **Allow new users to sign up**. Remover o botão da interface não impede cadastros pela API.
2. Authentication → URL Configuration → adicionar `https://<domínio>/admin/redefinir-senha` (e `http://localhost:5173/admin/redefinir-senha` para desenvolvimento) em **Redirect URLs**.

O link de redefinição abre `/admin/redefinir-senha`; o cliente Supabase lê o link, abre uma sessão temporária e a pessoa só digita a nova senha.

## Status das obras

Cada obra tem status **Publicada**, **Rascunho** ou **Desativada**. Toda operação do editor regrava a edição pública a partir das obras publicadas (`20261014210000_desvio_record_status.sql`), então salvar uma obra publicada atualiza o site imediatamente. “Tirar exposição do ar” esvazia o site sem mudar o status das obras. A migration converte o acervo atual: obras que estavam no site viram Publicada, as demais Rascunho.

Para trazer um acervo salvo no modo demonstrativo, aplicar `20261014200000_desvio_replace_draft_from_local.sql` e `20261014210000_desvio_record_status.sql`. A importação substitui as obras salvas; as que estiverem com status Publicada vão para o site.
