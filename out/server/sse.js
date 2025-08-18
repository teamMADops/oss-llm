"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseEndpoint = sseEndpoint;
exports.pushEvent = pushEvent;
const clients = new Map();
function sseEndpoint(req, res) {
    const cid = req.params.correlationId;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    clients.set(cid, { cid, res });
    res.write(`event: ping\ndata: ok\n\n`);
    req.on("close", () => clients.delete(cid));
}
function pushEvent(cid, eventType, payload) {
    const client = clients.get(cid);
    if (!client)
        return;
    const data = JSON.stringify({ schemaVersion: "1.0", correlationId: cid, eventType, payload });
    client.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
}
