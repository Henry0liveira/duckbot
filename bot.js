/**
 * DUCK DEBUG — WhatsApp Bot
 * Powered by Gemini AI
 *
 * SETUP RÁPIDO:
 * 1. npm install
 * 2. node bot.js
 * 3. Escaneie o QR Code com o WhatsApp
 */

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const qrcodeImage = require("qrcode");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const express = require("express");
require("dotenv").config();

let chromeExecutablePath = process.env.CHROME_PATH;
if (!chromeExecutablePath) {
  try {
    // If puppeteer is installed, use its bundled Chromium
    const puppeteer = require("puppeteer");
    chromeExecutablePath = puppeteer.executablePath();
  } catch {
    // Fallback to system Chrome if available (puppeteer not installed)
    chromeExecutablePath = null;
  }
}

// --- CONFIG ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAFQh9a0niBu39BYd8AV1y1SkIdHi-I51E";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const LOG_FILE = path.join(__dirname, "logs.json");
const SESSIONS_FILE = path.join(__dirname, "sessions.json");
const PROPOSALS_FILE = path.join(__dirname, "proposals.json");
const PORT = process.env.PORT || 3000;

// --- RECONNECTION CONFIG ---
const RECONNECT_CONFIG = {
  maxRetries: 5,
  initialDelay: 5000, // 5 segundos
  maxDelay: 60000, // 1 minuto
  backoffMultiplier: 2,
  puppeteerTimeout: 60000, // 60 segundos para inicializar o browser
};

let client = null;
let reconnectAttempts = 0;
let lastError = null;
let currentQR = null; // Armazena o QR code atual

// --- EXPRESS SERVER ---
const app = express();

// Personalidade da Duck Debug
const SYSTEM_PROMPT = `Você é o DuckBot, assistente virtual da Duck Debug — uma consultoria de tecnologia especializada em resolver problemas complexos com clareza, lógica e pensamento estruturado.

O nome "Duck Debug" é uma homenagem ao método "Rubber Duck Debugging" — quando explicar um problema para um patinho de borracha ajuda a encontrar a solução.

SERVIÇOS DA DUCK DEBUG:
- Code Review & Arquitetura (Refactoring, Clean Code, Design Patterns)
- Otimização de Performance (Profiling, Scalability)
- Análise de Sistemas (Documentation, Diagramming)
- Auditoria de Segurança (JWT, OAuth, Controle de Acesso)
- Consultoria Técnica (Tech Stack, Strategy, Planning)
- Desenvolvimento Web/Mobile (React, Node.js, React Native)

PROJETOS JÁ REALIZADOS:
- Vidraçaria Lucas (sistema de pedidos e orçamentos)
- Karaokê Manager (gestão de filas de músicas)
- Sistema de Cardápio Digital via QR Code
- Dashboard de Monitoramento de Sistemas
- Otimização de Performance em Apps Web
- Sistema de Autenticação e Controle de Acesso

CONTATO:
- Email: contato@duckdebug.com
- Localização: Pindamonhangaba, SP — Brasil
- Horário: Segunda a Sexta, 9h às 18h
- Suporte emergencial 24/7 para clientes

INSTRUÇÕES DE COMPORTAMENTO:
- Seja direto, técnico mas acessível
- Use emojis com moderação (🦆 é a mascote — use quando relevante)
- Para orçamentos, peça mais detalhes e diga que um consultor entrará em contato
- Se não souber algo específico da empresa, diga que vai verificar e que um humano pode ajudar
- Máximo 3 parágrafos por resposta no WhatsApp (seja conciso)
- Se a pergunta for técnica, responda com clareza e ofereça aprofundamento
- Sempre termine oferecendo próximo passo ou perguntando se pode ajudar mais
- Quando o usuário quiser falar com humano, diga para enviar email ou aguardar contato`;

// --- EXPRESS ROUTES ---
app.use(express.static(__dirname));

// Página inicial com QR code
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DuckBot — QR Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #111111 0%, #1a1a1a 100%);
      font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #f0f0f0;
    }
    .container {
      text-align: center;
      background: rgba(26,26,26,0.8);
      border: 1px solid rgba(255,199,44,0.2);
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    h1 {
      margin-top: 0;
      color: #FFC72C;
      font-size: 1.8rem;
    }
    .status {
      padding: 1rem;
      background: rgba(74,222,128,0.1);
      border-left: 3px solid #4ade80;
      margin: 1rem 0;
      text-align: left;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
    }
    .qr-container {
      margin: 2rem 0;
      padding: 1rem;
      background: white;
      border-radius: 8px;
      display: inline-block;
    }
    img {
      max-width: 300px;
      width: 100%;
      height: auto;
    }
    .info {
      font-size: 13px;
      color: #888;
      margin-top: 1rem;
    }
    .links {
      margin-top: 2rem;
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    a {
      padding: 8px 16px;
      background: #FFC72C;
      color: #111;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      transition: all 0.2s;
    }
    a:hover {
      background: #FFE166;
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🦆 DuckBot</h1>
    <div class="status">
      <strong>Status:</strong> <span id="status">Carregando...</span>
    </div>
    
    <div class="qr-container">
      <img id="qrImage" src="/api/qr" alt="QR Code">
    </div>
    
    <p class="info">Escaneie o QR Code com seu WhatsApp para autenticar o bot.</p>
    <p class="info">O QR Code é atualizado a cada 3 segundos.</p>
    
    <div class="links">
      <a href="/painel.html">📊 Painel de Controle</a>
    </div>
  </div>

  <script>
    // Atualiza QR code a cada 3 segundos
    setInterval(() => {
      document.getElementById('qrImage').src = '/api/qr?t=' + Date.now();
    }, 3000);

    // Verifica status do bot
    setInterval(() => {
      fetch('/api/status')
        .then(r => r.json())
        .then(d => {
          document.getElementById('status').textContent = d.status;
          document.getElementById('status').style.color = d.status === 'Online' ? '#4ade80' : '#f87171';
        })
        .catch(() => {
          document.getElementById('status').textContent = 'Offline';
          document.getElementById('status').style.color = '#f87171';
        });
    }, 5000);
  </script>
</body>
</html>`);
});

// API para retornar o QR code como imagem
app.get("/api/qr", async (req, res) => {
  if (!currentQR) {
    return res.status(400).json({ error: "QR Code não gerado ainda" });
  }
  try {
    const qrImage = await qrcodeImage.toDataURL(currentQR, { width: 300 });
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");
    res.set("Content-Type", "image/png");
    res.send(Buffer.from(base64Data, "base64"));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API para status do bot
app.get("/api/status", (req, res) => {
  const status = client && client.info ? "Online" : "Offline";
  res.json({ status });
});

// --- INIT ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL }); // Flash = mais barato/rápido

// Histórico de conversas por número (contexto)
const conversations = new Map();
// --- MENU ---
const menuState = new Map();

// Stats para o painel
let stats = {
  totalMessages: 0,
  totalContacts: new Set(),
  startTime: new Date().toISOString(),
  messagesPerHour: {},
  lastMessages: [],
};

// --- HELPERS ---
function log(type, message, extra = {}) {
  const entry = {
    time: new Date().toISOString(),
    type,
    message,
    ...extra,
  };
  console.log(`[${entry.time}] [${type}] ${message}`);

  // Salva no arquivo de log
  let logs = [];
  if (fs.existsSync(LOG_FILE)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
    } catch {}
  }
  logs.unshift(entry);
  if (logs.length > 500) logs = logs.slice(0, 500); // Máximo 500 logs
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}

function saveStats() {
  const statsToSave = {
    ...stats,
    totalContacts: Array.from(stats.totalContacts),
    uptime: Math.floor((Date.now() - new Date(stats.startTime)) / 1000),
  };
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(statsToSave, null, 2));
}

function saveProposal(userNumber, userName) {
  let proposals = [];
  if (fs.existsSync(PROPOSALS_FILE)) {
    try {
      proposals = JSON.parse(fs.readFileSync(PROPOSALS_FILE, "utf8"));
    } catch {}
  }

  // Verifica se o cliente já solicitou proposta
  const existingIndex = proposals.findIndex(p => p.number === userNumber);
  
  const proposal = {
    name: userName,
    number: userNumber.replace("@c.us", ""),
    requestedAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    // Atualiza a data da última solicitação
    proposals[existingIndex].requestedAt = proposal.requestedAt;
  } else {
    // Adiciona novo cliente
    proposals.unshift(proposal);
    if (proposals.length > 100) proposals = proposals.slice(0, 100); // Máximo 100 propostas
  }

  fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(proposals, null, 2));
  log("INFO", `Proposta registrada de ${userName} (${userNumber})`);
}

function getHourKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
}

const KEYCAPS = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

const MAIN_MENU = `🦆 *Olá! Bem-vindo à Duck Debug!*

Sou o DuckBot, seu assistente virtual. Estou aqui para ajudar com:

1️⃣ *Serviços* — O que oferecemos
2️⃣ *Projetos* — Cases realizados
3️⃣ *Orçamento* — Solicitar proposta
4️⃣ *Contato* — Falar com a equipe

Ou pode me fazer qualquer pergunta técnica! Como posso ajudar? 😊`;

const SERVICES = [
  {
    title: "Code Review & Arquitetura",
    desc: "Análise profunda de código, refactoring e boas práticas.",
  },
  {
    title: "Otimização de Performance",
    desc: "Identificação de gargalos, profiling e escalabilidade.",
  },
  {
    title: "Análise de Sistemas",
    desc: "Mapeamento, documentação e melhoria de processos.",
  },
  {
    title: "Auditoria de Segurança",
    desc: "Revisão de autenticação, autorização e proteção de dados.",
  },
  {
    title: "Consultoria Técnica",
    desc: "Decisões de stack, estratégia e planejamento.",
  },
  {
    title: "Desenvolvimento Web/Mobile",
    desc: "Criação de aplicações web e mobile modernas e escaláveis.",
  },
];

const PROJECTS = [
  {
    title: "Vidraçaria Lucas",
    desc: "Sistema de pedidos e orçamentos com fluxo simplificado.",
  },
  {
    title: "Karaokê Manager",
    desc: "Gestão de filas, músicas e apresentações.",
  },
  {
    title: "QR Menu",
    desc: "Cardápio digital via QR Code para restaurantes.",
  },
  {
    title: "Dashboard de Monitoramento",
    desc: "Visualização de métricas e alertas operacionais.",
  },
  {
    title: "Otimização Web",
    desc: "Performance e escalabilidade em apps web.",
  },
  {
    title: "Sistema de Auth",
    desc: "JWT, OAuth e controle de acesso.",
  },
];

function setMenuState(userNumber, state) {
  if (!state) {
    menuState.delete(userNumber);
    return;
  }
  menuState.set(userNumber, state);
}

function getMenuState(userNumber) {
  return menuState.get(userNumber) || null;
}

function renderServicesMenu() {
  const lines = SERVICES.map((s, i) => `${KEYCAPS[i + 1]} *${s.title}*`);
  return `🛠️ *Nossos Serviços (escolha um número):*

${lines.join("\n")}

${KEYCAPS[0]} *Menu principal*`;
}

function renderProjectsMenu() {
  const lines = PROJECTS.map((p, i) => `${KEYCAPS[i + 1]} *${p.title}*`);
  return `💼 *Cases Realizados (escolha um número):*

${lines.join("\n")}

${KEYCAPS[0]} *Menu principal*`;
}

// --- GEMINI ---
async function askGemini(userNumber, userName, userMessage) {
  try {
    // Pega ou cria histórico do usuário
    if (!conversations.has(userNumber)) {
      conversations.set(userNumber, []);
    }
    const history = conversations.get(userNumber);

    // --- MENSAGENS ---
    const recentHistory = history.slice(-10);
    const historyText = recentHistory
      .map((h) => `${h.role === "user" ? "Cliente" : "DuckBot"}: ${h.content}`)
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}

${historyText ? `HISTÓRICO RECENTE DA CONVERSA:\n${historyText}\n` : ""}
NOVA MENSAGEM de ${userName || "Cliente"}: ${userMessage}

Responda como DuckBot:`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Salva no histórico
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: response });

    // --- MENSAGENS ---
    if (history.length > 20) {
      conversations.set(userNumber, history.slice(-20));
    }

    return response;
  } catch (error) {
    log("ERROR", `Gemini error: ${error.message}`);
    if (error.message.includes("quota")) {
      return "🦆 Estou com muitas conversas agora! Tente novamente em alguns minutos ou entre em contato pelo email contato@duckdebug.com";
    }
    return "🦆 Ops! Tive um probleminha técnico. Nossa equipe foi notificada. Você pode nos contatar pelo email contato@duckdebug.com";
  }
}

// --- MENU ---
function getQuickReply(userNumber, userName, message) {
  const msg = message.toLowerCase().trim();
  const state = getMenuState(userNumber);

  if (msg === "0" || msg === "menu" || msg === "voltar") {
    setMenuState(userNumber, null);
    return MAIN_MENU;
  }

  if (state === "services_menu") {
    const idx = Number(msg);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= SERVICES.length) {
      const service = SERVICES[idx - 1];
      return `🛠️ *${service.title}*\n${service.desc}\n\nSe quiser outro serviço, responda com outro número.\n${KEYCAPS[0]} *Menu principal*`;
    }
  }

  if (state === "projects_menu") {
    const idx = Number(msg);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= PROJECTS.length) {
      const project = PROJECTS[idx - 1];
      return `💼 *${project.title}*\n${project.desc}\n\nQuer ver outro case? Responda com outro número.\n${KEYCAPS[0]} *Menu principal*`;
    }
  }

  // Respostas instantâneas para comandos simples (sem gastar API)
  if (msg === "oi" || msg === "olá" || msg === "ola" || msg === "hello" || msg === "hi") {
    return MAIN_MENU;
  }

  if (msg === "1" || msg === "serviços" || msg === "servicos") {
    setMenuState(userNumber, "services_menu");
    return renderServicesMenu();
  }

  if (msg === "2" || msg === "projetos") {
    setMenuState(userNumber, "projects_menu");
    return renderProjectsMenu();
  }

  if (msg === "3" || msg === "orçamento" || msg === "orcamento" || msg === "orçar") {
    // Registra a solicitação de orçamento
    saveProposal(userNumber, userName);
    return `💰 *Solicitar Orçamento*\n\nPara te dar uma proposta precisa, preciso de algumas informações:\n\n1. Qual é o projeto/problema?\n2. Qual tecnologia você usa (ou quer usar)?\n3. Tem prazo em mente?\n\nMe conte mais detalhes aqui ou envie um email para:\n📧 contato@duckdebug.com\n\nNossa equipe responde em até 1 dia útil! 🦆`;
  }

  if (msg === "4" || msg === "contato") {
    return `📞 *Fale com a Duck Debug:*\n\n📧 *Email:* contato@duckdebug.com\n📍 *Local:* Pindamonhangaba, SP — Brasil\n🕐 *Horário:* Seg a Sex, 9h às 18h\n🚨 *Emergências:* 24/7 para clientes\n\nPara um retorno rápido, envie um email descrevendo seu problema!`;
  }

  if (msg === "tchau" || msg === "até logo" || msg === "ate logo" || msg === "valeu" || msg === "obrigado" || msg === "obrigada") {
    return `🦆 Foi um prazer ajudar! Se precisar de mais alguma coisa, é só chamar.\n\n*Duck Debug* — Explique o problema. Encontre a solução.\n📧 contato@duckdebug.com`;
  }

  return null; // Vai para o Gemini
}

// --- WHATSAPP CLIENT FACTORY ---
function createClient() {
  const newClient = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: {
      headless: true,
      ...(chromeExecutablePath ? { executablePath: chromeExecutablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
      timeout: RECONNECT_CONFIG.puppeteerTimeout,
    },
  });

  // QR Code
  newClient.on("qr", (qr) => {
    currentQR = qr; // Armazena para servir via HTTP
    console.log("\n[QR] Escaneie o QR Code no WhatsApp\n");
    qrcode.generate(qr, { small: true });
    log("INFO", "QR Code gerado — aguardando escaneamento");
    reconnectAttempts = 0; // Reset tentativas ao gerar novo QR
  });

  newClient.on("ready", () => {
    console.log("\n✅ DuckBot está ONLINE e pronto para atender!\n");
    log("INFO", "Bot iniciado com sucesso");
    reconnectAttempts = 0;
    saveStats();
  });

  newClient.on("authenticated", () => {
    log("INFO", "WhatsApp autenticado com sucesso");
  });

  newClient.on("auth_failure", (msg) => {
    log("ERROR", `Falha na autenticação: ${msg}`);
  });

  newClient.on("disconnected", (reason) => {
    log("WARN", `Bot desconectado: ${reason}`);
    scheduleReconnection();
  });

  // Captura erros não tratados
  newClient.on("error", (error) => {
    lastError = error;
    log("ERROR", `Erro do cliente: ${error.message}`);
    scheduleReconnection();
  });

  return newClient;
}

// --- RECONNECTION LOGIC ---
let reconnectionTimeout = null;

function scheduleReconnection() {
  if (reconnectionTimeout) clearTimeout(reconnectionTimeout);

  if (reconnectAttempts >= RECONNECT_CONFIG.maxRetries) {
    log("ERROR", `Limite de reconexões atingido (${RECONNECT_CONFIG.maxRetries}). Aguardando 5 minutos antes de tentar novamente...`);
    reconnectAttempts = 0;
    reconnectionTimeout = setTimeout(() => {
      reconnectAttempts = 0;
      scheduleReconnection();
    }, 5 * 60 * 1000); // Aguarda 5 minutos
    return;
  }

  const delay = Math.min(
    RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.backoffMultiplier, reconnectAttempts),
    RECONNECT_CONFIG.maxDelay
  );

  reconnectAttempts++;
  log("INFO", `Tentando reconectar em ${delay / 1000}s (tentativa ${reconnectAttempts}/${RECONNECT_CONFIG.maxRetries})`);

  reconnectionTimeout = setTimeout(() => {
    initializeClient();
  }, delay);
}

// --- INITIALIZE CLIENT ---
async function initializeClient() {
  try {
    if (client) {
      try {
        await client.destroy();
      } catch {}
    }

    // Limpa sessão corrompida
    const authPath = path.join(__dirname, ".wwebjs_auth");
    if (reconnectAttempts > 2 && fs.existsSync(authPath)) {
      log("WARN", "Limpando sessão local due a múltiplas tentativas de falha");
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
      } catch {}
    }

    client = createClient();
    await client.initialize();
    reconnectAttempts = 0;
  } catch (error) {
    lastError = error;
    log("ERROR", `Falha ao inicializar cliente: ${error.message}`);
    scheduleReconnection();
  }
}

// --- MESSAGE HANDLER ---
// Essa função será chamada sempre que setupMessageListener() for executada
function setupMessageListener() {
  if (!client) return;
  
  client.on("message", async (message) => {
    // Ignora grupos e status
    if (message.from.includes("@g.us")) return;
    if (message.from === "status@broadcast") return;
    if (message.fromMe) return;

    const contact = await message.getContact();
    const userName = contact.pushname || contact.name || "Cliente";
    const userNumber = message.from;
    const userMessage = message.body;

    log("MSG", `Nova mensagem de ${userName} (${userNumber}): ${userMessage.substring(0, 50)}`);

    // Atualiza stats
    stats.totalMessages++;
    stats.totalContacts.add(userNumber);
    const hourKey = getHourKey();
    stats.messagesPerHour[hourKey] = (stats.messagesPerHour[hourKey] || 0) + 1;
    stats.lastMessages.unshift({
      time: new Date().toISOString(),
      name: userName,
      number: userNumber.replace("@c.us", ""),
      message: userMessage.substring(0, 100),
    });
    if (stats.lastMessages.length > 50) stats.lastMessages = stats.lastMessages.slice(0, 50);
    saveStats();

    try {
      // Indicador de digitando
      await client.sendPresenceAvailable();

      // Tenta resposta rápida primeiro
      const quickReply = getQuickReply(userNumber, userName, userMessage);

      if (quickReply) {
        await message.reply(quickReply);
        log("INFO", `Resposta rápida enviada para ${userName}`);
      } else {
        // --- GEMINI ---
        const aiResponse = await askGemini(userNumber, userName, userMessage);
        await message.reply(aiResponse);
        log("INFO", `Resposta Gemini enviada para ${userName}`);
      }
    } catch (error) {
      log("ERROR", `Erro ao responder ${userName}: ${error.message}`);
      try {
        await message.reply(
          "🦆 Tive um probleminha técnico! Entre em contato pelo email contato@duckdebug.com"
        );
      } catch {}
    }
  });
}

// --- START ---
console.log("\n🦆 DUCK DEBUG BOT — Iniciando...\n");
log("INFO", `Versão do Node.js: ${process.version}`);
log("INFO", `Plataforma: ${process.platform}`);

// Inicia servidor HTTP para QR code
app.listen(PORT, () => {
  log("INFO", `Servidor web rodando em porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT} para ver o QR Code\n`);
});

initializeClient().then(() => {
  setupMessageListener();
  log("INFO", "Message listener configurado");
}).catch((error) => {
  log("ERROR", `Erro fatal na inicialização: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  log("INFO", "Bot encerrado pelo usuário");
  if (reconnectionTimeout) clearTimeout(reconnectionTimeout);
  saveStats();
  if (client) {
    client.destroy().finally(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

// Tratamento de erros não capturados
process.on("unhandledRejection", (reason, promise) => {
  log("ERROR", `Promise rejeitada não tratada: ${reason}`);
});

process.on("uncaughtException", (error) => {
  log("ERROR", `Exceção não capturada: ${error.message}`);
  lastError = error;
  if (client) {
    client.destroy().catch(() => {});
  }
});








