# 📚 Guia Completo da Biblioteca DMX

---

## 🎯 Parte 1 — O que é este projeto (resumo simples)

Você estava montando o app dentro de **um único arquivo HTML**. Isso funciona no começo, mas conforme o app cresce, o arquivo fica gigante e começa a **bugar**.

O app foi reorganizado em um **projeto profissional** (React + Vite). Por fora continua **idêntico** (mesmo visual, mesmas funções). Por dentro ficou **organizado, rápido e estável**.

> ⚠️ O HTML antigo (`diego.html`) **não foi apagado**. O app novo está na pasta `biblioteca-dmx`.

---

## 🎬 Parte 2 — E os vídeos? Vou perder eles?

**NÃO.** Os vídeos e exercícios ficam no **Firebase** (nuvem do Google), não dentro do código do site.

O app apenas **se conecta** ao Firebase para buscar os vídeos. O projeto usa o mesmo Firebase de sempre:

- Projeto: `biblioteca-dmx`
- Mesmos exercícios, links do YouTube, alunos cadastrados

Publicar na Vercel **não apaga nada** do Firebase.

---

## 🛠️ Parte 3 — Programas que você precisa no computador

Instale **uma vez**:

| Programa | Para quê | Link |
|---|---|---|
| **Node.js** (versão LTS) | Rodar e testar o projeto | https://nodejs.org |
| **Cursor** | Editar o código e usar a IA | https://cursor.com |

---

## 📂 Parte 4 — Abrindo o projeto no Cursor

1. Abra o **Cursor**
2. **File → Open Folder**
3. Selecione a pasta **`biblioteca-dmx`**
4. Para falar com a IA: **`Ctrl + L`**

---

## ▶️ Parte 5 — Testando no seu computador (antes de publicar)

1. Abra o terminal no Cursor: **Terminal → New Terminal** (ou `` Ctrl + ` ``)
2. Na **primeira vez**, rode:

```bash
npm install
```

3. Para ligar o app localmente:

```bash
npm run dev
```

4. Abra o endereço que aparecer (geralmente `http://localhost:5173`)
5. Para parar: **`Ctrl + C`** no terminal

> `localhost` só funciona no **seu** computador. Outras pessoas não acessam esse link.

---

## 🚀 Parte 6 — Publicar na Vercel (passo a passo completo)

Esta é a parte principal. Siga **na ordem**, clicando exatamente onde indicado.

### ✅ O que você JÁ fez

- [x] Criou conta na Vercel
- [x] Conectou a Vercel ao GitHub
- [x] Deu acesso aos seus repositórios no GitHub

### ⬜ O que falta fazer (este guia)

- [ ] Garantir que o código está no GitHub
- [ ] Criar o projeto na Vercel
- [ ] Configurar build do Vite
- [ ] Cadastrar variáveis de ambiente (Firebase)
- [ ] Fazer o primeiro Deploy
- [ ] Liberar o domínio no Firebase (login)
- [ ] Testar o site no ar

---

### Passo 0 — Enviar o projeto para o GitHub (repositório `bibliotecadmx`)

Você **já tem** o repositório **`bibliotecadmx`** no GitHub com as capas dos exercícios. Perfeito — vamos **adicionar o código do app no mesmo lugar**, sem apagar as capas.

> 💡 **Tranquilo:** o Git só **adiciona** arquivos novos. As capas que já estão lá **continuam lá**, a menos que você delete algo manualmente.

#### Antes de começar — instale o Git (se ainda não tiver)

1. Acesse **https://git-scm.com/download/win**
2. Baixe e instale (clique Next em tudo)
3. **Feche e abra o Cursor de novo** depois de instalar

---

#### Opção A — Pelo Cursor (recomendado para iniciante)

Siga **cada clique** na ordem:

**1. Abrir a pasta certa no Cursor**

1. Abra o **Cursor**
2. Menu **File → Open Folder**
3. Selecione a pasta **`biblioteca-dmx`** (a que tem `package.json`, pasta `src/`, etc.)
4. Clique em **Selecionar pasta**

**2. Abrir o controle de versão (Git)**

1. Na **barra lateral esquerda**, clique no ícone que parece um **galho / Y** (terceiro ou quarto ícone — se passar o mouse, aparece **"Source Control"**)
2. Se aparecer um botão **"Initialize Repository"** → clique nele  
   (Isso cria o Git dentro da pasta. Só precisa fazer **uma vez**.)

**3. Ver o que vai ser enviado**

1. Na lista **"Changes"**, você verá muitos arquivos ( `src`, `package.json`, etc.)
2. **NÃO deve aparecer:** `node_modules`, `.env`, pasta `.vercel` — o projeto já está configurado para **não** enviar esses (segurança)

**4. Preparar o envio (Stage)**

1. Passe o mouse sobre a palavra **"Changes"**
2. Clique no **"+"** ao lado (Significa: "incluir tudo no próximo pacote")
   - Ou clique com botão direito em **Changes → Stage All Changes**

**5. Escrever a mensagem do commit**

1. No campo de texto em cima (escrito *"Message"* ou *"Mensagem"*)
2. Digite algo simples, por exemplo:

```
Primeira versão do app Biblioteca DMX
```

**6. Fazer o commit (salvar o pacote localmente)**

1. Clique no botão **"Commit"** (✓) ou **"Commit"** azul/verde
2. Se pedir nome/e-mail do Git na primeira vez, preencha (pode usar seu nome e e-mail do GitHub)

**7. Conectar ao repositório `bibliotecadmx` no GitHub**

Como o repositório **já existe**, use o **terminal**:

1. Menu **Terminal → New Terminal** (ou `` Ctrl + ` ``)
2. Cole estes comandos **um por vez**, apertando Enter após cada um

Substitua `SEU-USUARIO` pelo seu usuário do GitHub (ex.: se o link for `github.com/diegomacielx/bibliotecadmx`, use `diegomacielx`):

```bash
git remote add origin https://github.com/SEU-USUARIO/bibliotecadmx.git
```

```bash
git branch -M main
```

```bash
git pull origin main --allow-unrelated-histories
```

> Se o `git pull` abrir um editor estranho pedindo mensagem de merge: feche salvando, ou no terminal digite:
> `git pull origin main --allow-unrelated-histories --no-edit`

> Se der erro "remote origin already exists", use em vez do primeiro comando:
> `git remote set-url origin https://github.com/SEU-USUARIO/bibliotecadmx.git`

**8. Enviar para o GitHub (Push)**

```bash
git push -u origin main
```

1. Pode abrir o **navegador** pedindo login no GitHub → autorize
2. Quando terminar, vá em **https://github.com/SEU-USUARIO/bibliotecadmx**
3. Você deve ver **as capas antigas + os arquivos novos** (`src/`, `package.json`, etc.)

---

#### Opção B — Se preferir clonar o repo primeiro (mais seguro se já tem muita coisa lá)

Use esta opção se o repositório `bibliotecadmx` já tem **muitas pastas** e você quer ter certeza de não sobrescrever nada:

1. No GitHub, abra **bibliotecadmx** → botão verde **Code** → copie o link HTTPS
2. No Windows, clone em uma pasta nova (Explorador de Arquivos ou terminal)
3. Copie **o conteúdo** da pasta `biblioteca-dmx` do seu PC **para dentro** da pasta clonada (não apague as pastas de capas que já existem)
4. Abra **essa pasta clonada** no Cursor
5. Repita os passos **2 a 8** da Opção A (Initialize → Stage → Commit → Push)

---

#### Como saber se deu certo?

Abra no navegador:

```
https://github.com/SEU-USUARIO/bibliotecadmx
```

Você deve ver:

- [ ] Pastas/arquivos das **capas** (como antes)
- [ ] Pasta **`src/`**
- [ ] Arquivo **`package.json`**
- [ ] Arquivo **`vercel.json`**

**Não** deve ver (correto — ficaram só no seu PC):

- `node_modules/`
- `.env`
- `.vercel/`

---

#### Depois disso — conectar na Vercel

No Passo 3 abaixo, ao importar o projeto, escolha o repositório **`bibliotecadmx`** (não precisa criar outro).

Se o código ficou na **raiz** do repo (junto com as capas): Root Directory = **vazio** ou **`.`**

Se você colocou o app dentro de uma subpasta `biblioteca-dmx/`: Root Directory = **`biblioteca-dmx`**

---

#### ⚠️ Sobre as capas no app

O app busca capas em um endereço configurado no código (`GITHUB_COVER_BASE`). Se as capas estão em `bibliotecadmx` mas o app aponta para **outro** repositório, as capas **continuam funcionando** enquanto o link antigo existir. Se no futuro quiser que o app leia capas direto de `bibliotecadmx`, peça ajuda à IA no Cursor para atualizar esse endereço.

---

### Passo 1 — Remover vínculo com conta antiga (se existir)

Se alguém publicou antes na conta dele, pode existir uma pasta escondida **`.vercel`** no projeto. Ela faz o deploy ir para a conta errada.

**No Cursor** (`Ctrl + L`):

> *"Apague a pasta .vercel deste projeto, se ela existir"*

Se não existir, siga em frente.

---

### Passo 2 — Entrar no painel da Vercel

1. Abra **https://vercel.com**
2. Faça login na **sua** conta
3. Você verá o **Dashboard** (painel inicial)

---

### Passo 3 — Criar o projeto (Importar do GitHub)

1. No Dashboard, clique em **"Add New…"** (canto superior direito)
2. Clique em **"Project"**
3. Aparece a lista dos repositórios do GitHub
4. Procure **`bibliotecadmx`** (seu repositório com capas + código)
5. Clique em **"Import"** ao lado dele

> Se o repositório **não aparecer**: clique em **"Adjust GitHub App Permissions"** ou **"Configure GitHub App"** e libere acesso ao repositório certo. Depois volte e atualize a página.

---

### Passo 4 — Configurar o projeto ANTES do Deploy

Na tela **"Configure Project"**, confira **cada campo**:

#### 4.1 — Framework Preset

- Deve detectar **Vite** automaticamente
- Se não detectar, escolha manualmente: **Vite**

#### 4.2 — Root Directory (Diretório raiz)

- Se o repositório GitHub contém **só** a pasta do app (arquivos `package.json`, `src/`, etc. na raiz): deixe **vazio** ou **`.`**
- Se o repositório tem a pasta `biblioteca-dmx` **dentro** de outra pasta: clique em **"Edit"** ao lado de Root Directory e selecione **`biblioteca-dmx`**

#### 4.3 — Build and Output Settings

Clique em **"Build and Output Settings"** para expandir e confira:

| Campo | Valor correto |
|---|---|
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` (padrão) |

> O projeto já tem um arquivo `vercel.json` que cuida das rotas do React. **Não precisa mudar nada nele.**

#### 4.4 — Environment Variables (OBRIGATÓRIO — faça AGORA)

**Não clique em Deploy ainda.** Expanda **"Environment Variables"**.

Abra no Cursor o arquivo **`.env`** do projeto (está na raiz de `biblioteca-dmx`).

Cadastre **cada linha** abaixo. Para cada uma:

1. **Key** = nome da variável (coluna esquerda)
2. **Value** = valor copiado do seu `.env`
3. Marque os 3 ambientes: **Production**, **Preview** e **Development**
4. Clique em **Add**

| Key (nome) | Onde pegar o valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | arquivo `.env` |
| `VITE_FIREBASE_AUTH_DOMAIN` | arquivo `.env` |
| `VITE_FIREBASE_PROJECT_ID` | arquivo `.env` |
| `VITE_FIREBASE_STORAGE_BUCKET` | arquivo `.env` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | arquivo `.env` |
| `VITE_FIREBASE_APP_ID` | arquivo `.env` |
| `VITE_APP_ID` | arquivo `.env` |
| `VITE_FUNCTIONS_REGION` | arquivo `.env` (geralmente `us-central1`) |

Variável **opcional** (só se existir no seu `.env`):

| Key | Quando usar |
|---|---|
| `VITE_FIRESTORE_EXERCISES_PATH` | Só se você tiver essa linha no `.env` |

> ⚠️ **Nunca** suba o arquivo `.env` para o GitHub. As chaves vão **só** na Vercel, nesta tela.

---

### Passo 5 — Fazer o primeiro Deploy

1. Com tudo conferido, clique no botão **"Deploy"**
2. Aguarde 1–3 minutos. Você verá logs rolando na tela
3. Quando terminar, aparece **"Congratulations!"** com confetes 🎉
4. Clique em **"Visit"** (ou no preview) para abrir o site

**Anote o seu link.** Será algo como:

```
https://biblioteca-dmx.vercel.app
```

ou

```
https://biblioteca-dmx-seunome.vercel.app
```

> Esse link agora é **seu**. Guarde para compartilhar com os alunos.

---

### Passo 6 — Se o site abrir em branco ou com erro

Quase sempre é variável de ambiente faltando.

1. No Vercel, entre no projeto → aba **"Settings"**
2. Menu lateral → **"Environment Variables"**
3. Confira se **todas** as variáveis da tabela do Passo 4.4 estão lá
4. Vá na aba **"Deployments"**
5. No deploy mais recente, clique nos **três pontinhos (⋯)** → **"Redeploy"**
6. Marque **"Use existing Build Cache"** desmarcado (para forçar rebuild limpo)
7. Clique em **"Redeploy"**

---

### Passo 7 — Liberar o domínio no Firebase (login dos alunos)

Sem isso, o site abre mas o **login falha**.

1. Acesse **https://console.firebase.google.com**
2. Entre com o e-mail dono do projeto
3. Clique no projeto **`biblioteca-dmx`**
4. Menu esquerdo → **Build** → **Authentication**
5. Aba **Settings** (Configurações)
6. Seção **Authorized domains** (Domínios autorizados)
7. Clique em **"Add domain"**
8. Cole **somente o domínio**, sem `https://`:

```
biblioteca-dmx.vercel.app
```

(use o domínio exato que a Vercel te deu no Passo 5)

9. Clique em **Add**

> A Vercel também cria domínios de preview (ex.: `biblioteca-dmx-git-main-seunome.vercel.app`). Para testes em preview, você pode adicioná-los depois. O essencial é o domínio **Production**.

---

### Passo 8 — Testar o site publicado

Abra o link da Vercel e confira:

- [ ] A página inicial carrega (não fica branca)
- [ ] Os exercícios aparecem
- [ ] Você consegue **fazer login** com seu e-mail admin
- [ ] Abrir um vídeo funciona
- [ ] Busca e categorias funcionam

Se algo falhar, copie a mensagem de erro e cole no Cursor (`Ctrl + L`).

---

### Passo 9 — Atualizações automáticas (depois do primeiro deploy)

Com GitHub conectado, **cada push** no repositório gera um deploy novo automaticamente.

Fluxo do dia a dia:

1. Peça mudanças no Cursor (ou edite você mesmo)
2. Salve os arquivos
3. Envie para o GitHub (`git push`) — peça ajuda à IA se não souber
4. A Vercel detecta sozinha e publica em 1–2 minutos
5. Acompanhe em **Vercel → seu projeto → Deployments**

> Você **não precisa** clicar em Deploy manualmente toda vez — só no primeiro setup.

---

### Passo 10 — Domínio personalizado (opcional, depois)

Se quiser um endereço tipo `biblioteca.seusite.com.br`:

1. Vercel → projeto → **Settings** → **Domains**
2. Digite o domínio e siga as instruções de DNS
3. Adicione esse domínio também em **Firebase → Authentication → Authorized domains**

---

## 🔐 Parte 7 — O que são as variáveis de ambiente (`.env`)

São as "chaves" para o app conversar com o Firebase.

| Onde | O que acontece |
|---|---|
| **Seu computador** | Chaves no arquivo `.env` (já existe no projeto) |
| **Vercel (site no ar)** | Mesmas chaves cadastradas em Environment Variables |

> ⚠️ **Nunca** poste o `.env` publicamente (redes sociais, prints, GitHub).

---

## ☁️ Parte 8 — Firebase Functions (não vão para a Vercel)

O **site** (telas, botões, player) fica na **Vercel**.

Coisas como **webhooks de pagamento** (Kiwify/Stripe) rodam no **Firebase Functions** — serviço separado do Google.

- Publicar na Vercel **não** publica as Functions
- Se você usar integrações de pagamento, as Functions precisam ser publicadas no Firebase à parte (`firebase deploy --only functions`)

Para o app básico (login, vídeos, admin), **só a Vercel + variáveis de ambiente** já bastam.

---

## 🆘 Parte 9 — Problemas comuns

| Problema | Solução |
|---|---|
| Repositório não aparece na Vercel | GitHub → Settings do Vercel App → liberar acesso ao repo |
| Build falhou | Vercel → Deployments → clique no deploy vermelho → leia **"Building"** logs. Peça ajuda à IA colando o erro |
| Site em branco | Faltam variáveis de ambiente → Passo 4.4 e Redeploy (Passo 6) |
| Login não funciona no ar | Firebase → Authorized domains → Passo 7 |
| `npm` não reconhecido | Instale Node.js e reinicie o Cursor |
| Mudança no código não apareceu no ar | Fez `git push`? Veja Deployments na Vercel |

---

## ✅ Resumo rápido (cola)

**Você já fez:** conta Vercel + GitHub conectado.

**Agora faça:**

1. Código no GitHub (Passo 0)
2. Apague `.vercel` se existir (Passo 1)
3. Vercel → **Add New → Project** → Import `biblioteca-dmx` (Passo 3)
4. Build: `npm run build` · Output: `dist` · Root: pasta certa (Passo 4)
5. Cadastre **todas** as `VITE_*` do `.env` (Passo 4.4)
6. Clique **Deploy** (Passo 5)
7. Firebase → Authentication → **Authorized domains** → seu link Vercel (Passo 7)
8. Teste login e vídeos (Passo 8)

**Link oficial:** anote o que a Vercel mostrar após o Deploy (Passo 5).

---

*Qualquer dúvida, abra o chat da IA no Cursor (`Ctrl + L`) e pergunte. Ela conhece este projeto e responde em português.* 💪
