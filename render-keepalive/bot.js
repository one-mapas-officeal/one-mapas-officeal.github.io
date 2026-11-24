// Bot AFK para Minecraft BEDROCK: entra no servidor Aternos e fica conectado
// para ele nao hibernar. Usa bedrock-protocol com backend RakNet em JS puro.
//
// Passivo: so entra, pede teleporte seguro por chat e mantem a conexao viva.
// Nao mexe na conta alem de ficar online.

import { createBedrockClient } from "./bedrockClient.js";

let estado = {
  conectado: false,
  edicao: "bedrock",
  username: null,
  ultimaEntrada: null,
  tentativas: 0,
  ultimoErro: null,
};

export function getBotEstado() {
  return { ...estado };
}

let reconectarTimer = null;
let clienteAtual = null;

export function iniciarBot(cfg) {
  estado.username = cfg.botUsername;
  conectar(cfg);
  return getBotEstado;
}

function agendarReconexao(cfg, motivo) {
  estado.conectado = false;
  estado.ultimoErro = motivo;
  if (reconectarTimer) return;
  const delay = 30_000; // 30s entre tentativas, sem spam no servidor.
  console.log(`[bot] reconectando em ${delay / 1000}s (motivo: ${motivo})`);
  reconectarTimer = setTimeout(() => {
    reconectarTimer = null;
    conectar(cfg);
  }, delay);
}

function enviarChat(client, msg) {
  try {
    client.queue("text", {
      type: "chat",
      needs_translation: false,
      source_name: client.options?.username || "",
      xuid: "",
      platform_chat_id: "",
      filtered_message: "",
      message: msg,
    });
  } catch (_) {
    // Em algumas versoes o pacote de chat difere; ignora sem derrubar o bot.
  }
}

function conectar(cfg) {
  estado.tentativas += 1;
  const offline = cfg.botAuth === "offline";
  console.log(
    `[bot] (bedrock) conectando a ${cfg.urlAternos}:${cfg.portaAternos} como "${cfg.botUsername}" (offline=${offline}) [tentativa ${estado.tentativas}]`
  );

  let client;
  try {
    client = createBedrockClient({
      host: cfg.urlAternos,
      port: cfg.portaAternos,
      username: cfg.botUsername,
      offline, // true = servidor sem autenticacao Xbox; false = login Microsoft
      version: cfg.mcVersion || undefined, // usa a mais recente suportada se vazio
      skipPing: cfg.skipPing, // pula o ping curto; vai direto na conexao (9s)
      conLog: (...a) => console.log("[bedrock]", ...a),
    });
  } catch (err) {
    agendarReconexao(cfg, "falha ao criar cliente: " + err.message);
    return;
  }

  clienteAtual = client;

  client.on("spawn", () => {
    estado.conectado = true;
    estado.ultimaEntrada = new Date().toISOString();
    estado.ultimoErro = null;
    console.log(`[bot] entrou no servidor @ ${estado.ultimaEntrada}`);
    // Pede teleporte para um lugar seguro (sem monstros).
    setTimeout(() => enviarChat(client, cfg.pedidoTeleporte), 2_000);
  });

  client.on("text", (packet) => {
    // So registra mensagens; o bot nao responde/age (passivo).
    if (packet?.message && packet.source_name !== cfg.botUsername) {
      console.log(`[chat] <${packet.source_name || "?"}> ${packet.message}`);
    }
  });

  client.on("kick", (packet) => {
    const motivo =
      packet?.message || packet?.reason || JSON.stringify(packet || {});
    console.warn("[bot] kickado:", motivo);
    agendarReconexao(cfg, "kick: " + motivo);
  });

  client.on("disconnect", (packet) => {
    const motivo = packet?.message || JSON.stringify(packet || {});
    console.warn("[bot] desconectado:", motivo);
    agendarReconexao(cfg, "disconnect: " + motivo);
  });

  client.on("close", () => {
    console.warn("[bot] conexao fechada");
    agendarReconexao(cfg, "close");
  });

  client.on("error", (err) => {
    console.error("[bot] erro:", err?.message || err);
    estado.ultimoErro = String(err?.message || err);
    agendarReconexao(cfg, "error: " + (err?.message || err));
  });
}
