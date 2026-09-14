# NEXUS MOBILE

Projeto completo do aplicativo web/PWA, pronto para GitHub Pages.
Inclui a interface atual, a prévia do iPhone 11, o importador de pacotes e o visualizador de esquemáticos.
Não precisa de servidor próprio, conta de armazenamento, banco externo ou chave de API.

## Publicar no GitHub Pages

1. Descompacte **NEXUS-MOBILE-PROJETO-GITHUB.zip** no computador.
2. Envie **o conteúdo descompactado** ao seu repositório. O arquivo `index.html` deve ficar na raiz, junto de `nexus-sw.js` e da pasta `vendor`. Não envie apenas o ZIP.
3. Inclua o arquivo `.nojekyll`, que mantém os arquivos do visualizador disponíveis. Se o envio pelo navegador atingir seu limite de quantidade, envie as pastas em etapas ou use o GitHub Desktop.
4. No repositório, abra **Settings → Pages**. Em **Source**, selecione **Deploy from a branch**. Escolha **main** e **/(root)** e clique em **Save**.
5. Quando o GitHub informar que publicou, abra o endereço mostrado na seção Pages.

O mesmo projeto funciona num endereço com o nome do repositório, por exemplo `https://SEU-USUARIO.github.io/NEXUS-MOBILE/`. Não é necessário alterar os caminhos.

Referência oficial: [configurar a publicação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
O arquivo `.nojekyll` é explicado em [criar um site do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Usar no celular

1. Abra o endereço publicado com internet e escolha **Instalar app**, ou **Adicionar à tela inicial** no menu do navegador. No iPhone: Safari → Compartilhar → Adicionar à Tela de Início.
2. Abra o aplicativo pelo novo ícone. Ele usa o modo de aplicativo, sem a barra de endereço do navegador.
3. Abra **Arquivos → Adicionar arquivo** e selecione um ZIP de placas. **Não descompacte os ZIPs de dados.**
4. Aguarde a conclusão. As placas, imagens e esquemáticos importados ficam no armazenamento desse aparelho e podem ser usados offline.

O ZIP **do projeto** é descompactado para enviar ao GitHub. Os ZIPs **de placas** são importados fechados dentro do app. São dois tipos diferentes de arquivo.

## Biblioteca de placas

O acervo completo fica separado, na pasta **NEXUS-MOBILE** da área de trabalho:

- `NEXUS-MOBILE-completo.zip`: 208 mapas interativos, 37 esquemas elétricos, 11 documentos Eagle Team Zone, um diagnóstico de tela e duas imagens; cerca de 434 MB compactados / 1,3 GB depois de importar.
- `modelos/`: pacotes individuais, para instalar somente os modelos desejados.

Use o completo **ou** os individuais, conforme precisar. O importador verifica a integridade antes de liberar os dados. Alguns itens conservam apenas metadados de fontes ainda sem visualização preparada; não foram criados mapas ou esquemas inexistentes.

Esses pacotes não precisam ser enviados ao GitHub nem a outro servidor. Guarde os ZIPs como cópia: limpar os dados do navegador também pode apagar a biblioteca.

O endereço provisório e o GitHub Pages possuem armazenamentos separados. Ao mudar de endereço, importe os pacotes novamente no novo app.

## Arquivos e manutenção

`index.html` é a interface e o mapa; `desktop.js`, `board-loader.js` e demais módulos mantêm a navegação. `schematic-viewer.js` e `vendor/pdfjs` exibem PDFs. Os módulos `nexus-*.js` cuidam da biblioteca local, importação e cache offline. `manifest.webmanifest` define a instalação do PWA.

O projeto já está pronto para publicação estática, sem compilação. Se alterar o código depois, use `node tools/update-offline-cache.mjs` antes de publicar. Isso atualiza a versão do cache, para a nova interface chegar aos aparelhos que já instalaram o PWA. Não renomeie o banco local sem uma migração.

As licenças das dependências estão preservadas em `vendor/`. Este pacote não inclui credenciais, configuração privada de hospedagem ou o histórico Git.
