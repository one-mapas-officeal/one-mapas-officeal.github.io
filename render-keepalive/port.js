// Escolha de porta.
//
// Regras:
// - Portas validas vao de 1 a 65535 (99999 nao existe).
// - Local/VPS: procura a primeira porta livre a partir de PORT_MIN (19132),
//   indo para a proxima se estiver em uso, ate PORT_MAX (65535).
// - Render (ou qualquer plataforma que define process.env.PORT): usa EXATAMENTE
//   essa porta, sem procurar — senao a URL publica do servico nao funciona.

import net from "node:net";

export const PORT_MIN = Number(process.env.PORT_MIN || 19132);
export const PORT_MAX = Math.min(Number(process.env.PORT_MAX || 65535), 65535);

function portaLivre(porta) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", (err) => {
      resolve(err.code !== "EADDRINUSE" ? false : false);
    });
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(porta, "0.0.0.0");
  });
}

// Retorna { porta, origem } onde origem = "plataforma" | "scan".
export async function escolherPorta() {
  const envPort = Number((process.env.PORT || "").trim());
  if (envPort) {
    // Plataforma (Render) atribuiu a porta: usar exatamente ela.
    return { porta: envPort, origem: "plataforma" };
  }

  let min = PORT_MIN;
  if (min < 1 || min > 65535) min = 19132;

  for (let p = min; p <= PORT_MAX; p++) {
    // eslint-disable-next-line no-await-in-loop
    const livre = await portaLivre(p);
    if (livre) {
      if (p !== min) {
        console.log(`[porta] ${min}..${p - 1} em uso; usando ${p}`);
      }
      return { porta: p, origem: "scan" };
    }
  }

  throw new Error(`nenhuma porta livre entre ${min} e ${PORT_MAX}`);
}
