// Web Service do Render: mantem a si mesmo acordado (auto-ping), roda o bot
// AFK que entra no servidor Aternos, e escolhe a porta (19132..65535).
//
// IMPORTANTE: a URL do Render (https://...onrender.com) e a pagina de STATUS.
// Para JOGAR, o endereco e o do Aternos (URL_ATERNOS:PORTA_ATERNOS) — um
// cliente de Minecraft nao conecta numa URL https.

import http from "node:http";
import { loadConfig, validarConfig } from "./config.js";
import { iniciarBot, getBotEstado } from "./bot.js";
import { escolherPorta, PORT_MIN, PORT_MAX } from "./port.js";

// Rede de seguranca: um erro de socket do RakNet (jsp-raknet usa UDP cru e nem
// sempre trata 'error') NAO pode derrubar o Web Service. Registramos e seguimos;
// o bot tem logica propria de reconexao.
process.on("uncaughtException", (err) => {
  console.error("[uncaught]", err?.message || err);
});
process.on("unhandledRejection", (err) => {
  console.error("[unhandled]", err?.message || err);
});

const SELF_URL = (process.env.SELF_URL || "").trim();
const PING_MINUTES = Number(process.env.PING_MINUTES || 10);

const cfg = loadConfig();
const check = validarConfig(cfg);

let lastPing = null;
let pingCount = 0;

function comoConectar() {
  if (!cfg.urlAternos) return null;
  return {
    enderecoParaJogar: `${cfg.urlAternos}:${cfg.portaAternos}`,
    obs: "Use este endereco no Minecraft. A URL do Render e so o painel de status.",
  };
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    const body = {
      status: check.ok ? "ok" : "config_incompleta",
      mensagem: check.ok ? undefined : check.erros,
      uptimeSeconds: Math.round(process.uptime()),
      portaServico: server.__porta,
      origemPorta: server.__origemPorta,
      comoConectar: check.ok ? comoConectar() : undefined,
      lastPing,
      pingCount,
      bot: check.ok ? getBotEstado() : undefined,
      now: new Date().toISOString(),
    };
    res.writeHead(check.ok ? 200 : 428, {
      "Content-Type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify(body, null, 2));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "not_found" }));
});

async function main() {
  const { porta, origem } = await escolherPorta();
  server.__porta = porta;
  server.__origemPorta = origem;

  server.listen(porta, "0.0.0.0", () => {
    console.log(
      `[keepalive] escutando na porta ${porta} (origem: ${origem}; range ${PORT_MIN}..${PORT_MAX})`
    );
    if (origem === "plataforma") {
      console.log(
        "[keepalive] porta definida pela plataforma (Render). A URL publica mapeia so para esta porta."
      );
    }

    if (!check.ok) {
      for (const e of check.erros) console.error("[config] " + e);
      console.error("[config] bot NAO iniciado. Defina as variaveis e redeploy.");
    } else {
      console.log(`[config] link de propriedade: ${cfg.linkAternosAdd} — iniciando bot.`);
      const cc = comoConectar();
      if (cc) console.log(`[info] endereco para jogar: ${cc.enderecoParaJogar}`);
      iniciarBot(cfg);
    }

    if (!SELF_URL) {
      console.warn("[keepalive] SELF_URL nao definida; auto-ping desligado.");
    } else {
      console.log(`[keepalive] auto-ping para ${SELF_URL} a cada ${PING_MINUTES} min`);
    }
  });
}

async function selfPing() {
  if (!SELF_URL) return;
  try {
    const target = new URL("/health", SELF_URL).toString();
    const r = await fetch(target, { method: "GET" });
    lastPing = new Date().toISOString();
    pingCount += 1;
    console.log(`[keepalive] ping ${pingCount} -> ${r.status} @ ${lastPing}`);
  } catch (err) {
    console.error("[keepalive] falha no ping:", err.message);
  }
}

if (SELF_URL) {
  setTimeout(selfPing, 30_000);
  setInterval(selfPing, Math.max(1, PING_MINUTES) * 60_000);
}

main().catch((err) => {
  console.error("[fatal]", err.message);
  process.exit(1);
});
