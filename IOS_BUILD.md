# JOGA.I — Build iOS (Capacitor + Xcode)

App público: **JOGA.I**
Bundle ID: **br.com.growone.jogai**
Versão inicial: **1.0**
URL de produção carregada na webview: **https://jogaiapp.lovable.app**

> O Capacitor já está configurado neste repositório (`capacitor.config.ts`).
> A pasta nativa `ios/` **não é gerada dentro do Lovable** — você precisa rodar os comandos abaixo na sua máquina (macOS + Xcode 15+).

---

## 1. Exportar e clonar o projeto

1. Clique em **GitHub → Connect / Export to GitHub** no Lovable.
2. Na sua máquina:

```bash
git clone <seu-repo>.git
cd <seu-repo>
npm install
```

## 2. Adicionar a plataforma iOS (apenas na primeira vez)

```bash
npx cap add ios
```

Isso cria a pasta `ios/` com o projeto Xcode (`ios/App/App.xcworkspace`).

## 3. Build web + sync

Sempre que mudar código web:

```bash
npm run build
npx cap sync ios
```

## 4. Abrir no Xcode

```bash
npx cap open ios
```

No Xcode:

- Selecione o target **App** → aba **Signing & Capabilities**
  - Team: seu Apple Developer Team
  - Bundle Identifier: `br.com.growone.jogai`
- Aba **General**
  - Display Name: `JOGA.I`
  - Version: `1.0` / Build: `1`
  - Deployment Target: iOS 14.0+

## 5. Ícone do app e Splash

Coloque seus assets em `ios/App/App/Assets.xcassets/`:

- `AppIcon.appiconset` — gere com https://www.appicon.co (1024×1024 fonte)
- `Splash.imageset` — fundo `#121212` com a logo centralizada (2732×2732 recomendado)

A splash screen já está configurada em `capacitor.config.ts` (fundo `#121212`, 2 s).

## 6. Rodar em simulador / device

- No Xcode, escolha um simulador ou seu iPhone conectado e clique **Run** (▶).
- Para device físico, é necessário conta paga do Apple Developer Program.

## 7. Subir para TestFlight / App Store Connect

1. No Xcode: **Product → Archive**
2. Após o archive, abre o **Organizer** → **Distribute App** → **App Store Connect** → **Upload**
3. No App Store Connect (https://appstoreconnect.apple.com):
   - Crie o app com Bundle ID `br.com.growone.jogai`
   - Aguarde o processamento do build (~10–30 min)
   - Adicione testers no **TestFlight**

---

## ⚠️ Importante — Assinatura PRO no iOS

**Não use Stripe para assinaturas dentro do app iOS.** A Apple exige
**In-App Purchase (StoreKit)** para qualquer conteúdo/funcionalidade digital
consumida no app, sob pena de rejeição.

Recomendação:
- Mantenha Stripe apenas no fluxo **web** (`https://jogaiapp.lovable.app` aberto fora do app).
- Para o app iOS, integre o plugin **`@revenuecat/purchases-capacitor`** (mais simples) ou `capacitor-plugin-purchase` ligado a produtos criados no App Store Connect.
- Esconda os botões de upgrade Stripe quando rodando em `Capacitor.getPlatform() === 'ios'`, mostrando o paywall IAP no lugar.

Quando quiser implementar IAP, peça aqui e eu adiciono o plugin + paywall condicional.

---

## Modo de execução

O `capacitor.config.ts` aponta `server.url` para `https://jogaiapp.lovable.app`,
então o app empacotado funciona como **webview da versão publicada** — qualquer
deploy novo no Lovable aparece automaticamente no app, sem precisar reenviar
build para a App Store (exceto mudanças nativas).

Se preferir empacotar os arquivos web **localmente** (offline, sem depender do
domínio), remova o bloco `server` do `capacitor.config.ts` e rode
`npm run build && npx cap sync ios` antes do archive.
