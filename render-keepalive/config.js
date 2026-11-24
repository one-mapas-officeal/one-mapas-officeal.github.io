// Leitura e validacao da configuracao via Environment Variables.

function clean(v) {
  return (v || "").trim();
}

export function loadConfig() {
  const linkAternosAdd = clean(process.env.LINK_ATERNOS_ADD);

  return {
    // Prova de que o servidor e seu: link de compartilhamento do Aternos.
    // Ex.: add.aternos.org/Survivalword24h
    linkAternosAdd,

    // Endereco do servidor Aternos.
    urlAternos: clean(process.env.URL_ATERNOS), // ex.: Survivalword24h.aternos.me
    portaAternos: Number(clean(process.env.PORTA_ATERNOS)) || 25565,

    // Conta do bot. "nao-cair" por padrao. O bot NAO mexe nessa conta,
    // so entra e fica parado (AFK).
    botUsername: clean(process.env.BOT_USERNAME) || "nao-cair",

    // Bedrock: "offline" (servidor sem auth Xbox) ou "microsoft" (conta real,
    // login por codigo aparece nos logs no 1o start).
    botAuth: clean(process.env.BOT_AUTH) || "offline",

    // Versao do Minecraft Bedrock (opcional). Com skipPing ligado, se vazio
    // usa a versao mais recente que a biblioteca suporta.
    mcVersion: clean(process.env.MC_VERSION) || false,

    // Pular o ping (que tem timeout curto, ~1s, e o Aternos demora a responder)
    // e ir direto na conexao (timeout de 9s). Padrao: ligado.
    skipPing: clean(process.env.SKIP_PING).toLowerCase() !== "false",

    // Mensagem enviada ao entrar pedindo teleporte pra um lugar sem monstros.
    // O bot NAO consegue se teleportar sozinho sem permissao; ele pede.
    pedidoTeleporte:
      clean(process.env.PEDIDO_TELEPORTE) ||
      "Oi! Sou o bot anti-hibernacao. Podem me teleportar para um local seguro (sem monstros) para eu nao morrer? Obrigado!",
  };
}

// Retorna { ok, erros[] }. Sem o link, o bot nao sobe.
export function validarConfig(cfg) {
  const erros = [];
  if (!cfg.linkAternosAdd) {
    erros.push("coloque o link-aternos-add para continuar");
  }
  if (!cfg.urlAternos) {
    erros.push("defina URL_ATERNOS (endereco do servidor)");
  }
  return { ok: erros.length === 0, erros };
}
