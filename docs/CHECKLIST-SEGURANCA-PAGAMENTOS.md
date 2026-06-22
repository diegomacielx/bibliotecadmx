# Checklist manual — Segurança e pagamentos (Etapas 1 a 6)

Documento de referência para validação **antes de ativar tudo em produção**.  
Repositório: `biblioteca-dmx` · Deploy: `app-biblioteca-dmx` → Vercel · Firebase: `biblioteca-dmx`

**Última atualização:** 21 jun/2026 · Branch: `app-biblioteca-dmx` · Commits recentes: `7049fa9`, `15f5ce7`, `f20059a`

---

## Estado atual (código vs produção)

| Área | Código no repo | Ativação em produção |
|------|----------------|----------------------|
| Headers + CSP enforce | ✅ `vercel.json` | ✅ Deploy Vercel |
| App Check (cliente) | ✅ `src/lib/appCheck.ts` | ⚠️ Depende de `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` + Console |
| Firestore rules + App Check | ✅ `firestore.rules` | ⚠️ Confirmar se `firebase deploy --only firestore:rules` já rodou |
| API checkout Stripe | ✅ `api/create-checkout-session.ts` | ❌ Precisa env vars + `PAYMENTS_ENABLED=true` |
| Botão “Comprar acesso” | ✅ `PendingAccessScreen` | ❌ Precisa `VITE_PAYMENTS_ENABLED=true` |
| Retorno pós-pagamento | ✅ `App.tsx` (`?checkout=success`) | ⚠️ Depende do webhook liberar e-mail |
| Webhook Stripe (liberação) | ✅ `functions/src/stripeWebhook.ts` | ❌ Secrets + deploy Functions + URL no Stripe |
| Webhook Kiwify | ✅ `functions/src/kiwifyWebhook.ts` | ⚠️ Idem (se ainda usar Kiwify) |
| Auth e-mail + Google vinculado | ✅ `googleAccountLink.ts` | ✅ Deploy recente |
| Login Google mobile | ✅ redirect (não popup) | ✅ Deploy recente |

**Resumo:** a **infraestrutura de pagamento in-app está implementada no código**, mas o fluxo completo só funciona depois de configurar **Vercel (Stripe)** + **Firebase Functions (webhook)** + **teste ponta a ponta**.

---

## Visão geral do que foi implementado

| Etapa | O quê | Onde vive |
|-------|--------|-----------|
| **1** | Headers de segurança (HSTS, CSP, etc.) | `vercel.json` |
| **2** | API `/api/create-checkout-session` (autenticada) | `api/create-checkout-session.ts` |
| **3** | App Check no frontend (reCAPTCHA Enterprise) | `src/lib/appCheck.ts` |
| **4** | Stripe Checkout in-app + botão na tela pendente | API + `src/lib/checkoutSession.ts` |
| **5** | CSP **enforce** (bloqueio real) | `vercel.json` |
| **6** | Firestore rules exigem App Check + init antes do Firestore | `firestore.rules` + `firebase.ts` |

**Importante:** Etapas 1, 5 e parte da 4 só funcionam **na Vercel** (ou com `vercel dev`).  
`npm run dev` sozinho **não** aplica headers nem roda `/api/*`.

---

## Ordem segura de ativação (não pule)

```
A. Configurar variáveis na Vercel + redeploy
B. Testar app em produção (sem enforce App Check ainda)
C. Configurar App Check no Firebase Console (Monitor)
D. Deploy firestore.rules
E. Validar métricas App Check
F. App Check → Enforce (Firestore + Authentication)
G. Ativar pagamentos Stripe in-app (teste → produção)
H. Validar webhook → `authorized_emails` → aluno aprovado
```

**Erro comum:** publicar `firestore.rules` ou ativar **Enforce** antes de `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` na Vercel → app perde acesso ao Firestore.

**Erro comum (pagamentos):** ligar `PAYMENTS_ENABLED` sem webhook Stripe deployado → usuário paga, mas fica pendente até aprovação manual.

---

## Próximos passos — pagamentos in-app (ordem recomendada)

Use esta sequência para **dar continuidade agora**:

### Fase 1 — Stripe modo teste (sem cobrar de verdade)

1. [ ] Criar conta Stripe (ou usar existente) → modo **Test**
2. [ ] Products → criar produto + **Price** → copiar `price_...`
3. [ ] Vercel → Environment Variables (Production + Preview):
   - [ ] `STRIPE_SECRET_KEY=sk_test_...`
   - [ ] `STRIPE_DEFAULT_PRICE_ID=price_...`
   - [ ] `STRIPE_CHECKOUT_MODE=payment` (ou `subscription`)
   - [ ] `PAYMENTS_ENABLED=true`
   - [ ] `VITE_PAYMENTS_ENABLED=true`
   - [ ] `APP_URL=https://bibliotecadmx.vercel.app`
4. [ ] Redeploy na Vercel
5. [ ] Firebase secrets (terminal, pasta `biblioteca-dmx`):
   ```bash
   firebase login
   firebase use biblioteca-dmx
   firebase functions:secrets:set PAYMENT_WEBHOOK_SECRET
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   firebase deploy --only functions
   ```
6. [ ] Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://us-central1-biblioteca-dmx.cloudfunctions.net/stripeWebhook?key=SEU_PAYMENT_WEBHOOK_SECRET`
   - Eventos: `checkout.session.completed`, `customer.subscription.deleted`, `charge.refunded`
   - Copiar **Signing secret** → usar em `STRIPE_WEBHOOK_SECRET` (passo 5)
7. [ ] Admin no app → Integrações → colar `price_...` em **IDs Stripe permitidos** (ou deixar vazio = todos)

### Fase 2 — Teste ponta a ponta

1. [ ] Cadastrar usuário teste → tela **Acesso em análise**
2. [ ] Botão **Comprar acesso agora** visível
3. [ ] Checkout Stripe abre (cartão teste `4242 4242 4242 4242`)
4. [ ] Retorno `?checkout=success` → toast “Pagamento confirmado!”
5. [ ] Admin → E-mails autorizados: e-mail do teste com `source: stripe`
6. [ ] Aluno entra na biblioteca sem aprovação manual

### Fase 3 — App Check (pode rodar em paralelo à Fase 1, antes de Enforce)

Ver seções C, D, E abaixo. **Não ative Enforce** até métricas ≥ 95%.

### Fase 4 — Produção Stripe

1. [ ] Trocar `sk_test_` → `sk_live_` e `price_` de produção na Vercel
2. [ ] Webhook separado no Stripe **Live** apontando para a mesma Function
3. [ ] Teste real com valor baixo ou cupom
4. [ ] Monitorar Firebase Functions logs + Stripe Dashboard → Events

---

## A. Variáveis de ambiente (Vercel)

Painel: **Vercel → projeto → Settings → Environment Variables**

### Já existentes (confirmar que estão preenchidas)

- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_APP_ID` (`dmx-exercicios-cloud`)
- [ ] Firebase Admin (para `/api/auth-email`, `/api/auth-lookup`, checkout):
  - [ ] `FIREBASE_SERVICE_ACCOUNT` **ou** `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`
- [ ] E-mail (se usar): `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_API_TOKEN`, `VITE_EMAIL_API_TOKEN`

### Novas — App Check (Etapa 3 e 6)

- [ ] `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` — site key pública do Firebase App Check  
  **Onde obter:** Firebase Console → App Check → app **Site Github** → Registrar → reCAPTCHA Enterprise

### Novas — Pagamentos in-app (Etapa 4 — **próximo passo operacional**)

Somente servidor (**sem** prefixo `VITE_`, exceto a flag UI):

| Variável | Valor exemplo | Obrigatório para checkout |
|----------|---------------|---------------------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | Sim |
| `STRIPE_DEFAULT_PRICE_ID` | `price_...` | Sim |
| `PAYMENTS_ENABLED` | `true` | Sim |
| `STRIPE_CHECKOUT_MODE` | `payment` ou `subscription` | Não (padrão: `payment`) |
| `APP_URL` | `https://bibliotecadmx.vercel.app` | Recomendado |
| `VITE_PAYMENTS_ENABLED` | `true` | Sim (mostra botão na UI) |

**Nunca** coloque `STRIPE_SECRET_KEY` em variável `VITE_*`.

Após alterar variáveis:

- [ ] **Redeploy** na Vercel (Production)

---

## B. Etapa 1 e 5 — Headers e CSP (Vercel)

**Onde testar:** apenas **produção/preview Vercel**, não localhost com Vite.

### Como verificar

1. Abra `https://bibliotecadmx.vercel.app`
2. DevTools → **Network** → documento `index.html` ou `/`
3. Confira Response Headers:

- [ ] `Strict-Transport-Security`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Content-Security-Policy` (não mais Report-Only)

### Teste funcional pós-CSP enforce

- [ ] Login e-mail/senha
- [ ] Login Google (popup no desktop · **redirect no mobile**)
- [ ] Vincular Google a conta que já tem senha (mesmo e-mail)
- [ ] Abrir vídeo YouTube no lightbox / player mobile
- [ ] Capas dos exercícios carregam
- [ ] Admin abre e salva exercício
- [ ] Console **sem** erros `Refused to load...` / CSP

### Se algo quebrar

Anote no console a URL bloqueada e o directive (`script-src`, `connect-src`, etc.).  
Arquivo a ajustar: `vercel.json` → bloco `Content-Security-Policy`.

**Webhooks Zapier no admin:** só `hooks.zapier.com` está liberado em `connect-src`. Outros domínios (Make, n8n) serão bloqueados até incluir o domínio na CSP ou mover envio para API server-side.

---

## C. Etapa 3 — App Check (Firebase Console, modo Monitor)

### Console: registrar o app

1. [Firebase Console](https://console.firebase.google.com) → projeto **biblioteca-dmx**
2. **App Check** → app web **Site Github** (é o app atual, apelido antigo)
3. [ ] Clicar **Registrar**
4. [ ] Provedor: **reCAPTCHA Enterprise** (ativar API no Google Cloud se pedido)
5. [ ] Copiar **Site key** → colar em `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` na Vercel → redeploy

### Localhost (desenvolvimento)

No `.env` local:

```env
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=6Lxxxx...
VITE_APPCHECK_DEBUG_TOKEN=true
```

1. [ ] `npm run dev`
2. [ ] Console do browser: copiar token `App Check debug token: ...`
3. [ ] Firebase → App Check → **Gerenciar tokens de debug** → adicionar token

### Monitor (não bloqueia ainda)

1. [ ] App Check → **APIs**
2. [ ] **Cloud Firestore** → **Monitor** (não Enforce)
3. [ ] **Authentication** → **Monitor**
4. [ ] Aguardar tráfego real; em **Métricas**, verificar % de requests **válidas**

Meta antes do Enforce: **≥ 95%** válidas por alguns dias (ou após testes completos seus).

---

## D. Etapa 6 — Deploy Firestore rules

**Pré-requisito:** `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` já na Vercel e app redeployado.

No terminal, pasta do projeto:

```bash
firebase login
firebase use biblioteca-dmx
firebase deploy --only firestore:rules
```

- [ ] Deploy concluído sem erro
- [ ] Testar login + biblioteca em produção
- [ ] Testar admin (lista alunos, exercícios)

As rules agora exigem `request.app != null` (App Check). Sem site key no cliente, **tudo falha**.

---

## E. Etapa 6 — App Check Enforce (Console)

**Só depois** de D + métricas OK:

1. [ ] App Check → APIs → **Cloud Firestore** → **Enforce**
2. [ ] App Check → APIs → **Authentication** → **Enforce**
3. [ ] Testar de novo: login, Firestore, admin, aluno

### Rollback de emergência

Se o app parar:

1. Console → App Check → APIs → voltar Firestore/Auth para **Monitor** ou **Off**
2. Ou remover temporariamente `hasValidAppCheck()` das rules e redeploy rules (último recurso)

---

## F. Etapa 2 e 4 — API de checkout e Stripe

### O que o código já faz (referência)

| Peça | Arquivo | Comportamento |
|------|---------|---------------|
| Criar sessão | `api/create-checkout-session.ts` | POST autenticado (Bearer Firebase ID token) |
| UI aluno pendente | `PendingAccessScreen.tsx` | Botão se `VITE_PAYMENTS_ENABLED=true` |
| Redirect Stripe | `src/lib/checkoutSession.ts` | `window.location.assign(session.url)` |
| Pós-pagamento | `App.tsx` | `?checkout=success` → poll `syncUserAccess` até `approved` |
| Liberação automática | `functions/stripeWebhook.ts` | `grantEmailAccess` em `authorized_emails` |

**PCI:** cartão só na página Stripe — nunca no app.

### Pré-requisitos Stripe

- [ ] Conta Stripe (modo **Test** primeiro)
- [ ] Product + **Price** criados → copiar `price_...`
- [ ] Webhook Cloud Function deployada (`stripeWebhook`) — ver seção G

### Ativar na Vercel

- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `STRIPE_DEFAULT_PRICE_ID=price_...`
- [ ] `PAYMENTS_ENABLED=true`
- [ ] `VITE_PAYMENTS_ENABLED=true`
- [ ] `APP_URL=https://bibliotecadmx.vercel.app`
- [ ] Redeploy

### Teste manual (produção, usuário logado pendente)

1. [ ] Cadastrar usuário teste → ficar na tela **Acesso em análise**
2. [ ] Deve aparecer botão **Comprar acesso agora**
3. [ ] Clicar → redirect Stripe Checkout
4. [ ] Cartão teste: `4242 4242 4242 4242`, data futura, CVC qualquer
5. [ ] Após pagamento → volta ao app → toast de confirmação → acesso liberado

### Teste via console (opcional)

Logado no app, DevTools:

```javascript
const token = await firebase.auth().currentUser.getIdToken();
const res = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ mode: 'payment' }),
});
console.log(res.status, await res.json());
```

- [ ] Com pagamentos desligados: `503` + `payments_not_enabled`
- [ ] Com pagamentos ligados: `200` + `{ ok: true, url: "https://checkout.stripe.com/..." }`
- [ ] Sem login: `401`

---

## G. Webhooks existentes (Kiwify / Stripe — Cloud Functions)

Pagamento in-app **também** depende do webhook para liberar e-mail em `authorized_emails`.

### Secrets Firebase (terminal)

```bash
firebase functions:secrets:set PAYMENT_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
```

- [ ] `PAYMENT_WEBHOOK_SECRET` — senha longa (32+ chars), mesma na URL do webhook
- [ ] Deploy functions: `firebase deploy --only functions`

### URLs (Admin → Integrações no app)

- [ ] Webhook Stripe apontando para Cloud Function + `?key=SEU_SEGREDO`
- [ ] Eventos Stripe: `checkout.session.completed`, `customer.subscription.deleted`, `charge.refunded`
- [ ] IDs price permitidos no admin (ou vazio = todos)

---

## H. Admin — Alunos (feito no mesmo ciclo de segurança)

Validar fluxos manuais:

- [ ] **Pendente:** Aprovar · Recusar · Remover
- [ ] **Aprovado:** Bloquear (efeito imediato na tela do aluno)
- [ ] **Bloqueado:** Aprovar · Remover
- [ ] **Duplicatas:** agrupadas por e-mail + **Limpar duplicatas**
- [ ] Remover perfil → aluno deslogado / perde acesso na hora

---

## I. Checklist rápido “antes de dormir”

Use como ordem no dia do teste:

```
□ 1. Vercel env vars OK + redeploy
□ 2. Site abre, login OK, sem erro CSP no console
□ 3. App Check site key na Vercel + redeploy
□ 4. Console: App Check Monitor (Firestore + Auth)
□ 5. firebase deploy --only firestore:rules
□ 6. Testar app produção
□ 7. Métricas App Check OK → Enforce
□ 8. Testar app de novo
□ 9. Stripe test + checkout in-app (Fases 1–2 acima)
□ 10. Webhook Stripe libera e-mail → aluno aprovado
□ 11. Login Google mobile + vinculação com conta senha
```

---

## J. O que NÃO fazer

- [ ] Não colocar `STRIPE_SECRET_KEY` em variável `VITE_*`
- [ ] Não ativar App Check **Enforce** antes da site key na Vercel
- [ ] Não fazer `firebase deploy --only firestore:rules` antes da site key na Vercel
- [ ] Não criar formulário próprio de cartão no app (PCI)
- [ ] Não apagar usuário só no Firebase Auth e esperar sumir da lista admin (apagar perfil Firestore ou **Remover** no admin)

---

## K. Links úteis

| Recurso | URL |
|---------|-----|
| App produção | https://bibliotecadmx.vercel.app |
| Firebase Console | https://console.firebase.google.com/project/biblioteca-dmx |
| Vercel Dashboard | https://vercel.com/dashboard |
| Stripe Dashboard (test) | https://dashboard.stripe.com/test/dashboard |
| App Check docs | https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider |

---

## L. Contatos admin configurados

E-mails com permissão admin (rules + app):

- `diego.maciel.965@gmail.com`
- `contatomacielx@gmail.com`

---

## M. Auth — mudanças recentes (não estavam no checklist antigo)

- **Google no mobile:** `signInWithRedirect` (Safari/Brave não usam popup).
- **Mesmo e-mail, senha + Google:** fluxo de vinculação (`googleAccountLink.ts`) — senha continua válida após vincular.
- **`/api/auth-lookup`:** retorna `uid` para detectar contas duplicadas.

Testar antes de abrir pagamentos a usuários reais:

- [ ] Conta só senha → login senha OK
- [ ] Mesmo e-mail → Google → pede senha para vincular → ambos funcionam
- [ ] Conta pendente → checkout → aprovada automaticamente

---

## Anotações do seu teste (preencher depois)

**Data do teste:** _______________

**Problemas encontrados:**

```
(anote aqui)
```

**Resolvido?**

- [ ] Sim — tudo OK em produção
- [ ] Parcial — detalhes acima
- [ ] Não — rollback App Check para Monitor
