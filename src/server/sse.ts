import { Request, Response } from "express";

type Client = { cid: string; res: Response };
const clients = new Map<string, Client>();

export function sseEndpoint(req: Request, res: Response) {
  const cid = req.params.correlationId;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.set(cid, { cid, res });
  res.write(`event: ping\ndata: ok\n\n`);

  req.on("close", () => clients.delete(cid));
}

export function pushEvent(
  cid: string,
  eventType: string,
  payload: Record<string, any>
) {
  const client = clients.get(cid);
  if (!client) return;
  const data = JSON.stringify({ schemaVersion: "1.0", correlationId: cid, eventType, payload });
  client.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
}
