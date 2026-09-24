import { liveMessageSchema, type LiveMessage } from "@runhach/shared";
import { DurableObject } from "cloudflare:workers";

/**
 * One instance per raid (Phase 5). In Phase 0 it only proves the live channel
 * works end to end: it answers pings and reports how many clients are connected.
 * Uses hibernatable WebSockets so idle connections cost nothing.
 */
export class RaidRoom extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let message: LiveMessage;
    try {
      message = liveMessageSchema.parse(JSON.parse(typeof raw === "string" ? raw : ""));
    } catch {
      ws.close(1003, "Unsupported message");
      return;
    }
    if (message.type === "ping") {
      const pong: LiveMessage = {
        type: "pong",
        sentAt: message.sentAt,
        connections: this.ctx.getWebSockets().length,
      };
      ws.send(JSON.stringify(pong));
    }
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // 1005/1006/1015 describe how a socket closed but may not be sent back.
    const sendable = code >= 1000 && code < 5000 && ![1005, 1006, 1015].includes(code);
    try {
      ws.close(sendable ? code : 1000, reason);
    } catch {
      // Already closed.
    }
  }
}
