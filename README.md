# App da Fazenda Lorenzetti

App de campo que funciona sem internet. Os lançamentos ficam numa fila no celular e vão para as planilhas Google quando aperta **Sincronizar**.

- `index.html`, `sw.js`, `manifest.json`: o app (instalar pelo navegador: "Adicionar à tela inicial").
- `pastos.json`: desenho dos pastos (do KMZ "Fazenda Lorenzetti – Pastos 2026").
- `api/Codigo.gs`: Apps Script que recebe a fila e grava nas planilhas (os PINs ficam só no projeto do Apps Script).
