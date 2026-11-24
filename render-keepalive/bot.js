// Bot AFK: entra no servidor Aternos e fica parado para nao hibernar.
// Comportamento passivo: nao quebra blocos, nao mexe em inventario,
// nao mexe na conta. So entra, pede teleporte seguro e se mantem AFK.

import mineflayer from "mineflayer";

let estado = {
  conectado: false,
  username: null,
  ultimaEntrada: null,
  tentativas: 0,
  ultimoErro: null,
  health: null,
};

export function getBotEstado() {
  return { ...estado };
}

let reconectarTimer = null;

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

function conectar(cfg) {
  estado.tentativas += 1;
  console.log(
    `[bot] conectando a ${cfg.urlAternos}:${cfg.portaAternos} como "${cfg.botUsername}" (auth=${cfg.botAuth}) [tentativa ${estado.tentativas}]`
  );

  let bot;
  try {
    bot = mineflayer.createBot({
      host: cfg.urlAternos,
      port: cfg.portaAternos,
      username: cfg.botUsername,
      auth: cfg.botAuth, // "offline" ou "microsoft"
      version: cfg.mcVersion,
      hideErrors: false,
    });
  } catch (err) {
    agendarReconexao(cfg, "falha ao criar bot: " + err.message);
    return;
  }

  bot.once("spawn", () => {
    estado.conectado = true;
    estado.ultimaEntrada = new Date().toISOString();
    estado.ultimoErro = null;
    console.log(`[bot] entrou no servidor @ ${estado.ultimaEntrada}`);

    // Pede teleporte para um lugar seguro (sem monstros).
    try {
      bot.chat(cfg.pedidoTeleporte);
    } catch (_) {}

    // Anti-AFK leve e passivo: so um leve girar da cabeca, sem andar
    // nem interagir com nada. Mantem conexao viva sem baguncar nada.
    const girar = setInterval(() => {
      if (!estado.conectado) {
        clearInterval(girar);
        return;
      }
      try {
        const yaw = Math.random() * Math.PI * 2;
        bot.look(yaw, 0, false);
      } catch (_) {}
    }, 60_000);
  });

  bot.on("health", () => {
    estado.health = bot.health;
    // Se a vida estiver baixa, apenas registra e pede teleporte de novo.
    // O bot nao foge/ataca (passivo) — depende do dono deixar area segura.
    if (bot.health <= 6) {
      try {
        bot.chat(cfg.pedidoTeleporte);
      } catch (_) {}
    }
  });

  bot.on("kicked", (reason) => {
    const motivo = typeof reason === "string" ? reason : JSON.stringify(reason);
    console.warn("[bot] kickado:", motivo);
    agendarReconexao(cfg, "kicked: " + motivo);
  });

  bot.on("end", (reason) => {
    console.warn("[bot] conexao encerrada:", reason);
    agendarReconexao(cfg, "end: " + reason);
  });

  bot.on("error", (err) => {
    console.error("[bot] erro:", err.message);
    // "end" normalmente dispara em seguida e agenda a reconexao.
    estado.ultimoErro = err.message;
  });
}
