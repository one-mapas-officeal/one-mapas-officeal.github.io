# render-keepalive

Web Service do Render que:

1. **Não deixa a si mesmo hibernar** (auto-ping no plano free do Render).
2. Roda um **bot AFK para Minecraft Bedrock** que entra no seu servidor
   **Aternos** como jogador e fica conectado, para o servidor não cair por
   inatividade.

> Engine: [`bedrock-protocol`](https://github.com/PrismarineJS/bedrock-protocol)
> com backend RakNet em **JavaScript puro** (`jsp-raknet`), sem módulo nativo —
> por isso o build usa `--ignore-scripts` / `NPM_CONFIG_IGNORE_SCRIPTS=true`.
> (É Bedrock, não Java. A porta padrão do Bedrock é `19132`.)

O bot é **passivo**: não quebra blocos, não mexe em inventário e **não mexe
na conta** — só entra, pede teleporte para um lugar seguro e se mantém AFK.

## Prova de propriedade (obrigatória)

Para rodar, você **precisa** informar o link de compartilhamento do seu
servidor em `LINK_ATERNOS_ADD` (ex.: `add.aternos.org/Survivalword24h`).

Sem ele, o bot **não sobe** e o `/health` responde:

```json
{ "status": "config_incompleta", "mensagem": ["coloque o link-aternos-add para continuar"] }
```

## Variáveis de ambiente

| Variável           | Obrigatória | Padrão      | Descrição                                               |
| ------------------ | ----------- | ----------- | ------------------------------------------------------- |
| `LINK_ATERNOS_ADD` | ✅ Sim      | —           | Link de compartilhamento. Ex.: `add.aternos.org/...`    |
| `URL_ATERNOS`      | ✅ Sim      | —           | Endereço do servidor. Ex.: `Survivalword24h.aternos.me` |
| `PORTA_ATERNOS`    | Não         | `25565`     | Porta do servidor (Bedrock normalmente `19132`).        |
| `BOT_USERNAME`     | Não         | `nao-cair`  | Nome da conta do bot (ele só fica AFK).                 |
| `BOT_AUTH`         | Não         | `offline`   | `offline` (sem auth Xbox) ou `microsoft` (conta real).  |
| `PEDIDO_TELEPORTE` | Não         | (mensagem)  | Frase que o bot envia pedindo teleporte seguro.         |
| `SELF_URL`         | Não         | —           | URL pública do serviço (para o auto-ping).              |
| `PING_MINUTES`     | Não         | `10`        | Intervalo do auto-ping, em minutos.                     |

## Endpoints

- `GET /health` e `GET /` → status do serviço + estado do bot (conectado,
  última entrada, tentativas, vida).

## Como subir no Render

1. Suba este repo no GitHub.
2. No Render: **New → Web Service** (ou use o `render.yaml`).
3. Em **Environment**, defina pelo menos `LINK_ATERNOS_ADD` e `URL_ATERNOS`.
4. Após o 1º deploy, copie a URL pública e cole em `SELF_URL`; redeploy.

## Observações importantes

- **Teleporte seguro:** o bot *pede* por chat, mas não consegue se
  teleportar sozinho sem permissão (`op`). Deixe a dificuldade em
  **peaceful** ou dê `op` à conta do bot e configure um `/tp` no mundo, para
  ele não morrer para monstros.
- **Conta Microsoft/Xbox:** com `BOT_AUTH=microsoft`, o `bedrock-protocol`
  pede login por código no primeiro start (veja os logs do Render). Use
  `offline` só se o servidor estiver sem autenticação Xbox.
- Use apenas em **servidor seu**. O link de compartilhamento é exigido como
  essa prova.
