// Wrapper do bedrock-protocol que FORCA o backend RakNet em JavaScript puro
// (jsp-raknet), evitando o modulo nativo "raknet-native" (que exige compilacao
// e quebra o build no Render).
//
// Replica o que o createClient() oficial faz (ping -> deteccao de versao ->
// handshake de resource packs / chunk radius / tick_sync), mas sem nunca
// importar o createClient.js oficial, que tem 'raknet-native' fixo no codigo.

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const { Client } = require("bedrock-protocol/src/client");
const initRaknet = require("bedrock-protocol/src/rak");
const advertisement = require("bedrock-protocol/src/server/advertisement");
const Options = require("bedrock-protocol/src/options");
const { sleep } = require("bedrock-protocol/src/datatypes/util");

const BACKEND = "jsp-raknet";
const { RakClient } = initRaknet(BACKEND);

export async function pingBedrock({ host, port }) {
  const con = new RakClient({ host, port });
  try {
    return advertisement.fromServerName(await con.ping());
  } finally {
    con.close();
  }
}

// Equivalente ao createClient oficial, com raknetBackend = jsp-raknet.
export function createBedrockClient(options) {
  const client = new Client({
    port: 19132,
    followPort: true,
    ...options,
    raknetBackend: BACKEND,
    delayedInit: true,
  });

  client.on("connect_allowed", () => connect(client));

  if (options.skipPing) {
    // Sem ping nao ha auto-deteccao de versao: usa a informada ou a mais
    // recente que a biblioteca suporta.
    if (!client.options.version) {
      client.options.version = Options.CURRENT_VERSION;
    }
    client.conLog?.(
      `Pulando ping; conectando direto a ${client.options.host}:${client.options.port} como versao ${client.options.version}`
    );
    client.init();
  } else {
    pingBedrock(client.options)
      .then((ad) => {
        const adVersion = ad.version?.split(".").slice(0, 3).join(".");
        client.options.version =
          options.version ??
          (Options.Versions[adVersion] ? adVersion : Options.CURRENT_VERSION);
        if (ad.portV4 && client.options.followPort) {
          client.options.port = ad.portV4;
        }
        client.conLog?.(
          `Conectando a ${client.options.host}:${client.options.port} ${ad.motd} (${ad.levelName}), versao ${ad.version} (como ${client.options.version})`
        );
        client.init();
      })
      .catch((e) => client.emit("error", e));
  }

  return client;
}

function connect(client) {
  client.connect();

  client.on("network_stack_latency", (packet) => {
    if (packet.needs_response) {
      client.queue("network_stack_latency", {
        timestamp: packet.timestamp,
        needs_response: false,
      });
    }
  });

  client.once("resource_packs_info", () => {
    client.write("resource_pack_client_response", {
      response_status: "completed",
      response_status_name: "resourcepackstackfinished",
      resourcepackids: [],
    });
    client.once("resource_pack_stack", () => {
      client.write("resource_pack_client_response", {
        response_status: "completed",
        response_status_name: "resourcepackstackfinished",
        resourcepackids: [],
      });
    });
    client.queue("client_cache_status", { enabled: false });
    if (client.versionLessThanOrEqualTo("1.20.80")) {
      client.queue("tick_sync", {
        request_time: BigInt(Date.now()),
        response_time: 0n,
      });
    }
    sleep(500).then(() =>
      client.queue("request_chunk_radius", {
        chunk_radius: client.viewDistance || 10,
      })
    );
  });

  if (client.versionLessThanOrEqualTo("1.20.80")) {
    const keepAliveInterval = 10;
    const keepAliveIntervalBig = BigInt(keepAliveInterval);
    let keepalive;
    client.tick = 0n;
    client.once("spawn", () => {
      keepalive = setInterval(() => {
        client.queue("tick_sync", {
          request_time: client.tick,
          response_time: 0n,
        });
        client.tick += keepAliveIntervalBig;
      }, 50 * keepAliveInterval);
      client.on("tick_sync", (packet) => {
        client.emit("heartbeat", packet.response_time);
        client.tick = packet.response_time;
      });
    });
    client.once("close", () => clearInterval(keepalive));
  }
}
