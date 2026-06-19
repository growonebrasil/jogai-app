# Camada de Conformidade Legal (LGPD) — JOGA.I

Adicionar uma camada jurídica e de consentimento ao app, **sem alterar fluxos existentes**. Toda a lógica nova vive em volta da sessão autenticada (gate de aceite) e em uma camada global de cookies.

## 1. Banco de dados (1 migração)

**Tabela `legal_documents`** — versões publicadas dos textos legais
- `kind` (`terms` | `privacy` | `cookies`)
- `version` (texto, ex.: `"1.0.0"`)
- `content_md` (markdown do documento)
- `published_at`, `is_current` (apenas uma versão atual por tipo)
- Leitura pública (anon + authenticated)

**Tabela `legal_consents`** — log imutável de aceites
- `user_id` (FK auth.users)
- `terms_version`, `privacy_version`, `cookies_version`
- `cookie_preferences` (jsonb: `{essential:true, analytics, marketing, personalization}`)
- `ip_address` (texto, opcional), `user_agent` (texto, opcional)
- `accepted_at`
- RLS: usuário só lê os próprios; insert próprio; service_role total
- GRANTs apropriados

**Tabela `account_deletion_requests`**
- `user_id`, `reason` (opcional), `status` (`pending` | `processing` | `completed` | `canceled`), `requested_at`, `processed_at`
- RLS: usuário cria/lê os próprios; service_role total

**Versões correntes** (constantes em `src/lib/legal.ts`):
```
TERMS_VERSION = "1.0.0"
PRIVACY_VERSION = "1.0.0"
COOKIES_VERSION = "1.0.0"
```
Comparação client-side: se a última linha em `legal_consents` do usuário tiver alguma versão diferente das constantes, força reaceite.

## 2. Conteúdo legal (rascunho PT-BR)

Criar `src/content/legal/`:
- `terms.ts` — Termos de Uso (uso da plataforma, contas, conduta, peladas, limitação de responsabilidade, planos PRO, foro)
- `privacy.ts` — Política de Privacidade (dados coletados: perfil, estatísticas, mídia; bases legais LGPD; compartilhamento; direitos do titular; retenção; contato DPO)
- `cookies.ts` — Política de Cookies (categorias, finalidades, opt-out)

Markdown renderizado com componente simples.

## 3. Gate de aceite obrigatório

**Hook `useLegalConsent`** (`src/hooks/useLegalConsent.ts`)
- Carrega o último consentimento do usuário logado
- Expõe `needsAcceptance: boolean`, `latestConsent`, `recordConsent(prefs)`

**Componente `LegalAcceptanceGate`** (`src/components/legal/LegalAcceptanceGate.tsx`)
- Modal bloqueante (não fechável) renderizado dentro de `ProtectedRoute`
- Mostra resumo + links "Ler completo" que abrem cada documento em dialog
- 2 checkboxes obrigatórios (Termos+Privacidade / Cookies)
- Botão "Aceitar e continuar" → grava em `legal_consents` com preferências padrão (todos cookies ativos, usuário pode ajustar depois) + IP via `https://api.ipify.org` (best-effort, opcional) + `navigator.userAgent`
- Reabre automaticamente quando versões mudarem

Integração: editar `src/components/ProtectedRoute.tsx` para envolver `children` com o gate (não altera roteamento).

## 4. Banner e preferências de cookies

**Store `src/lib/cookieConsent.ts`** — `localStorage` (`joga_cookie_prefs_v1`) com `{essential, analytics, marketing, personalization, decidedAt}`. Essential sempre `true`.

**`CookieBanner.tsx`** — banner inferior fixo (dark + neon verde), aparece se não houver decisão salva.
- Botões: "Aceitar todos" / "Recusar não essenciais" / "Gerenciar preferências" (abre modal)

**`CookiePreferencesModal.tsx`** — 4 toggles (essencial desabilitado/marcado), botão salvar.

Renderizado globalmente em `App.tsx` (fora das rotas protegidas — também aparece para visitantes na landing).

Sincronização: ao salvar preferências e existir usuário logado, escreve novo registro em `legal_consents` refletindo a mudança.

## 5. Páginas e acesso posterior

Rotas públicas (acessíveis sempre):
- `/legal/termos` → `LegalTerms.tsx`
- `/legal/privacidade` → `LegalPrivacy.tsx`
- `/legal/cookies` → `LegalCookies.tsx`

Página autenticada:
- `/configuracoes/privacidade` → `PrivacySettings.tsx`
  - Botão "Gerenciar cookies" (abre `CookiePreferencesModal`)
  - Links para os 3 documentos
  - Seção "Solicitar exclusão de conta" com aviso e botão de confirmação (`AlertDialog`)

Adicionar entrada "Privacidade e dados" no `AppSidebar.tsx` (no final, separada).

## 6. Exclusão de conta (edge function)

**`supabase/functions/request-account-deletion/index.ts`**
- Verifica JWT do usuário
- Insere registro em `account_deletion_requests` (status `pending`)
- Executa imediatamente exclusão automática:
  - Apaga linhas do usuário em tabelas com dados pessoais (profiles, player_cards, player_xp, feed_posts, feed_comments, feed_likes, follows, notifications, pelada_members onde aplicável)
  - Anonimiza vínculos históricos (match_stats, match_votes) substituindo nome por "Usuário removido"
  - Chama `supabase.auth.admin.deleteUser(uid)`
  - Marca request como `completed`
- Frontend chama via `supabase.functions.invoke`, faz `signOut` e redireciona para `/`

Edge function declarada em `supabase/config.toml` com `verify_jwt = true`.

## 7. Manifest mobile (instalável)

Criar `public/manifest.webmanifest` mínimo + `<link rel="manifest">` em `index.html`.
```
{ "name":"JOGA.I", "short_name":"JOGA.I", "start_url":"/", "display":"standalone",
  "background_color":"#121212", "theme_color":"#0FA958",
  "icons":[{ "src":"/icon-192.png","sizes":"192x192","type":"image/png" },
           { "src":"/icon-512.png","sizes":"512x512","type":"image/png" }] }
```
Usa o favicon existente; geramos os 2 PNGs simples a partir do logo atual.

## 8. Design

- Modal e banner: bg `#1C1C1C` com borda neon `#0FA958/30`, glow sutil, tipografia display do projeto, sem poluição
- Markdown renderer simples (`prose-invert`) para os documentos
- Botões verde neon principais, ghost para secundários

## Arquivos

**Migrações:** 1 nova (`legal_documents`, `legal_consents`, `account_deletion_requests`, GRANTs, RLS, seed das versões 1.0.0)

**Novos:**
- `src/lib/legal.ts`, `src/lib/cookieConsent.ts`
- `src/content/legal/{terms,privacy,cookies}.ts`
- `src/hooks/useLegalConsent.ts`, `src/hooks/useCookieConsent.ts`
- `src/components/legal/LegalAcceptanceGate.tsx`
- `src/components/legal/CookieBanner.tsx`
- `src/components/legal/CookiePreferencesModal.tsx`
- `src/components/legal/LegalMarkdown.tsx`
- `src/pages/legal/{LegalTerms,LegalPrivacy,LegalCookies}.tsx`
- `src/pages/PrivacySettings.tsx`
- `supabase/functions/request-account-deletion/index.ts`
- `public/manifest.webmanifest` (+ ícones)

**Modificados:**
- `src/App.tsx` (rotas legais, rota privacidade, `<CookieBanner />` global)
- `src/components/ProtectedRoute.tsx` (envolve com `LegalAcceptanceGate`)
- `src/components/AppSidebar.tsx` (link "Privacidade e dados")
- `index.html` (manifest + theme-color)
- `supabase/config.toml` (registra edge function)

## Observações

- **Não altera** nenhuma tela/fluxo existente além de adicionar o gate e o link no sidebar.
- Cookies essenciais nunca são bloqueados.
- O gate reaparece automaticamente se subirmos `TERMS_VERSION` / `PRIVACY_VERSION` / `COOKIES_VERSION`.
- Textos legais são **rascunho padrão** PT-BR — revisão jurídica recomendada antes do lançamento.

Pronto para implementar?
