// Server-sent events hub. Every panel subscribes to /api/events and refreshes
// the data it shows when a relevant event arrives.
const clients = new Set();

export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const client = { res };
  clients.add(client);

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      /* connection closed */
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
}

export function broadcast(type, data = {}) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}
