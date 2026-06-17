# Biblioteca DMX

Aplicação web da **Biblioteca DMX** — plataforma de exercícios com vídeos de execução, autenticação de alunos e painel administrativo.

## Stack

- **React 19** + **TypeScript**
- **Vite** — build e dev server
- **Tailwind CSS v4** — estilos
- **Firebase** — Auth + Firestore

## Desenvolvimento local

```bash
cd biblioteca-dmx
npm install
cp .env.example .env   # configure as variáveis do Firebase
npm run dev
```

Acesse `http://localhost:5173`

## Build de produção

```bash
npm run build
npm run preview   # testar o build localmente
```

Os arquivos estáticos ficam em `dist/`.

## Deploy

### Vercel (ativo)

**Site em produção:** [https://biblioteca-dmx.vercel.app](https://biblioteca-dmx.vercel.app)

O projeto já está configurado na Vercel (`peterlvrs-projects/biblioteca-dmx`).

**Deploy manual (CLI):**
```bash
npx vercel --prod
```

**Deploy automático via Git:**
1. Crie um repositório no GitHub e envie o código
2. Em [vercel.com](https://vercel.com) → projeto `biblioteca-dmx` → **Settings** → **Git** → conecte o repositório
3. Cada `git push` na branch `main` gera um novo deploy automaticamente

**Importante — Firebase Auth:** adicione o domínio da Vercel nos domínios autorizados do Firebase:
1. [Firebase Console](https://console.firebase.google.com) → projeto `biblioteca-dmx`
2. **Authentication** → **Settings** → **Authorized domains**
3. Adicione: `biblioteca-dmx.vercel.app`

### Firebase Hosting (alternativa)

```bash
npm run build
firebase login
firebase use biblioteca-dmx
firebase deploy --only hosting
```

### Netlify (alternativa)

1. Conecte o repositório em [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Adicione as variáveis de ambiente `VITE_*`

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
|----------|-----------|
| `VITE_FIREBASE_API_KEY` | Chave da API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_APP_ID` | ID do app no Firestore |

## Estrutura do projeto

```
src/
├── components/     # UI reutilizável
├── lib/            # Firebase, utils, constantes
├── types/          # Tipos TypeScript
└── App.tsx         # Lógica principal
```

## Acesso admin

Administradores são definidos em `src/lib/constants.ts` (`ADMIN_EMAILS`). Também é possível usar `?admin=dmx2026` na URL após login.
