# 🦆 DuckBot — Manual de Hospedagem Gratuita

Bot WhatsApp da Duck Debug, powered by Gemini AI.

---

## ⚡ INÍCIO RÁPIDO (Rodar Local)

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env e coloque sua GEMINI_API_KEY

# 3. Inicie o bot
npm start

# 4. Acesse http://localhost:3000 e escaneie o QR Code
```

---

## 🔑 OBTER API KEY DO GEMINI (GRÁTIS)

1. Acesse https://aistudio.google.com/app/apikey
2. Clique em **"Create API key"**
3. Copie a chave e coloque no `.env`:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```

**Limites gratuitos:** 15 req/min, 1.500 req/dia, 1M tokens/dia — suficiente para centenas de atendimentos.

---

## ☁️ OPÇÃO 1 — RAILWAY (Recomendado — Mais Fácil)

**Free tier:** US$ 5/mês em créditos (suficiente para ~500h/mês com a config abaixo)

### Passo a passo:

**1. Crie o repositório no GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU-USER/duckbot.git
git push -u origin main
```

**2. Crie conta e projeto no Railway**
- Acesse https://railway.app e crie conta
- Clique em **New Project → Deploy from GitHub repo**
- Selecione seu repositório

**3. Configure as variáveis de ambiente**
No painel do Railway, vá em **Variables** e adicione:
```
GEMINI_API_KEY=sua-chave-aqui
APP_URL=https://duckbot-production-xxxx.up.railway.app
NODE_ENV=production
```

**4. Configure o volume persistente (sessão do WhatsApp)**
- Vá em **Settings → Volumes**
- Clique em **New Volume**
- Mount Path: `/app/.wwebjs_auth`
- Size: 1GB

**5. Deploy automático**
- O Railway faz o build e deploy automaticamente
- Acesse a URL gerada e escaneie o QR Code
- A partir daí, o bot fica online 24/7

**6. Defina o APP_URL correto**
Após o deploy, copie a URL gerada (ex: `https://duckbot-production-abc.up.railway.app`) e atualize a variável `APP_URL` no painel.

### Custo estimado no Railway:
| Recurso | Uso | Custo |
|---------|-----|-------|
| CPU shared | ~5% idle | ~US$ 0,50/mês |
| RAM 512MB | constante | ~US$ 2/mês |
| **Total** | | **~US$ 2-3/mês** |

Com o crédito gratuito de US$ 5, você paga apenas se ultrapassar.

---

## ☁️ OPÇÃO 2 — RENDER (100% Gratuito, mas com limitações)

**Limitação:** No free tier, o serviço "adormece" após 15min sem tráfego. O keep-alive do bot resolve parcialmente isso, mas pode haver cold starts.

**Para 24/7 real no Render, use o plano Starter ($7/mês).**

### Passo a passo:

**1. Suba o código no GitHub** (igual ao Railway)

**2. Crie conta no Render**
- Acesse https://render.com
- Clique em **New → Web Service**
- Conecte seu repositório GitHub

**3. Configure o serviço:**
- **Runtime:** Docker (detecta o Dockerfile automaticamente)
- **Region:** Ohio (menor latência para BR no free)
- **Plan:** Free

**4. Variáveis de ambiente:**
Clique em **Environment** e adicione:
```
GEMINI_API_KEY=sua-chave-aqui
APP_URL=https://duckbot.onrender.com
NODE_ENV=production
```

**5. Disco persistente (evitar perda de sessão):**
- Vá em **Disks** no painel do serviço
- Adicione um disco:
  - Mount Path: `/app/.wwebjs_auth`
  - Size: 1 GB (grátis)

**6. Acesse a URL e escaneie o QR Code**

> ⚠️ **Atenção:** No free tier do Render, o serviço pode reiniciar inesperadamente. Se isso acontecer, você precisará escanear o QR Code novamente — a menos que tenha configurado o disco persistente.

---

## ☁️ OPÇÃO 3 — FLY.IO (Plano gratuito com VM dedicada)

**Free tier:** 3 VMs compartilhadas, 256MB RAM cada — **funciona para o bot**.

### Passo a passo:

**1. Instale o flyctl**
```bash
# macOS/Linux:
curl -L https://fly.io/install.sh | sh

# Windows (PowerShell):
pwsh -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://fly.io/install.ps1'))"
```

**2. Faça login**
```bash
fly auth login
```

**3. Crie o app (na pasta do projeto)**
```bash
fly apps create duckbot
```

**4. Crie volumes persistentes para a sessão**
```bash
fly volumes create duckbot_data --region gru --size 1
fly volumes create duckbot_cache --region gru --size 1
```

**5. Configure os secrets (variáveis de ambiente)**
```bash
fly secrets set GEMINI_API_KEY=sua-chave-aqui
fly secrets set APP_URL=https://duckbot.fly.dev
fly secrets set NODE_ENV=production
```

**6. Faça o deploy**
```bash
fly deploy
```

**7. Escaneie o QR Code**
```bash
# Abra a URL do app:
fly open
# Ou:
open https://duckbot.fly.dev
```

**8. Monitore os logs em tempo real**
```bash
fly logs
```

### Comandos úteis no Fly.io:
```bash
fly status          # Ver status do app
fly logs            # Ver logs em tempo real
fly restart         # Reiniciar o app
fly ssh console     # Acesso SSH ao container
fly deploy          # Redeploy após mudanças
```

---

## ☁️ OPÇÃO 4 — VPS GRATUITA (Mais controle, mais trabalho)

Opções de VPS gratuitas:
- **Koyeb** (https://koyeb.com) — Free tier com Docker
- **Northflank** (https://northflank.com) — 1 serviço grátis
- **Google Cloud Run** — Pay-per-request (praticamente grátis com baixo uso)

### VPS paga de baixo custo (R$ 15-30/mês):
- **Hostinger VPS** (~R$ 15/mês) — Ubuntu 22.04
- **Hetzner Cloud** (~€ 3/mês) — Melhor custo-benefício
- **DigitalOcean Droplet** (~US$ 4/mês)

### Instalação em VPS Ubuntu:
```bash
# 1. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar Chromium e dependências
sudo apt-get install -y \
  chromium-browser \
  fonts-noto \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libasound2

# 3. Subir os arquivos (via scp, rsync ou git)
git clone https://github.com/SEU-USER/duckbot.git
cd duckbot

# 4. Instalar dependências
npm install

# 5. Configurar .env
cp .env.example .env
nano .env  # Adicione GEMINI_API_KEY e APP_URL

# 6. Instalar PM2 (process manager — mantém o bot rodando 24/7)
sudo npm install -g pm2

# 7. Iniciar o bot com PM2
pm2 start bot.js --name "duckbot"

# 8. Configurar auto-inicialização no boot
pm2 startup
pm2 save

# 9. Ver logs
pm2 logs duckbot

# 10. Ver status
pm2 status
```

---

## 🔄 APÓS O PRIMEIRO DEPLOY — FLUXO DE AUTENTICAÇÃO

1. Acesse a URL pública do seu app (ex: `https://duckbot.fly.dev`)
2. Será exibido um QR Code
3. No WhatsApp do número que será o bot:
   - **Android:** ⋮ → Dispositivos conectados → Conectar dispositivo
   - **iPhone:** Ajustes → Dispositivos vinculados → Vincular dispositivo
4. Escaneie o QR Code
5. Aguarde a mensagem "✅ DuckBot está ONLINE"
6. Pronto! O bot estará ativo 24/7

> **Dica:** A sessão fica salva no volume persistente. Você **não precisará** escanear de novo após restarts, apenas se o volume for apagado ou se houver logout forçado.

---

## 🔧 BUGS CORRIGIDOS NESTA VERSÃO

| # | Bug | Solução |
|---|-----|---------|
| 1 | `PUPPETEER_EXECUTABLE_PATH` ignorado | Agora tem prioridade na detecção |
| 2 | API key hard-coded no código | Removida — obrigatória via `.env` |
| 3 | Modelo `gemini-2.5-flash` inexistente | Corrigido para `gemini-1.5-flash` |
| 4 | Timeout de 60s insuficiente em free tier | Aumentado para 120s |
| 5 | Status do bot sem granularidade | Estados: Inicializando, Aguardando QR, Autenticado, Online, Desconectado |
| 6 | Erro 400 ao acessar `/api/qr` sem QR | Nova rota `/api/qr-status` antes de buscar imagem |
| 7 | APIs do painel inexistentes | Criadas: `/api/logs`, `/api/stats`, `/api/proposals` |
| 8 | Escrita de JSON sem proteção | Escrita atômica via arquivo `.tmp` + rename |
| 9 | Limpeza de sessão prematura (após 2 falhas) | Aumentado para 5 falhas |
| 10 | `auth_failure` não limpava sessão | Agora limpa imediatamente |
| 11 | Sem timeout na chamada ao Gemini | Promise.race com timeout de 30s |
| 12 | Poucos args de estabilidade no Puppeteer | Adicionados 8 flags extras |
| 13 | Re-download do WhatsApp Web a cada restart | Configurado `webVersionCache` local |
| 14 | Mensagens sem corpo causavam erro | Guard `if (!message.body)` adicionado |
| 15 | Express 5.x incompatível com alguns middlewares | Fixado para Express 4.x estável |
| 16 | Saudações "bom dia/tarde/noite" sem resposta | Adicionadas ao menu de saudações |

---

## 🛠️ PERSONALIZAÇÃO

### Alterar a personalidade do bot
Edite o `SYSTEM_PROMPT` no início do `bot.js`.

### Adicionar respostas automáticas
Na função `getQuickReply()`, adicione novos `if`:
```javascript
if (msg === "preço" || msg === "valor") {
  return "💰 Nossos preços variam conforme o projeto. Digite *3* para solicitar um orçamento!";
}
```

### Alterar o menu principal
Edite a constante `MAIN_MENU` no `bot.js`.

---

## 📊 PAINEL DE CONTROLE

Após o bot estar rodando, acesse `/painel.html` na URL do seu app:
```
https://seu-app.fly.dev/painel.html
```

O painel mostra:
- Status em tempo real
- Total de mensagens
- Últimas conversas
- Solicitações de orçamento
- Logs do sistema

---

## ⚠️ IMPORTANTE

- Use um número de WhatsApp **exclusivo** para o bot (não o seu pessoal)
- O WhatsApp pode banir números que enviam mensagens em massa — o bot **só responde**, nunca dispara
- Nunca suba o `.env` com a API key para repositórios públicos
- Faça backup periódico do volume com a sessão (`.wwebjs_auth`)

---

## 📧 Suporte

contato@duckdebug.com
