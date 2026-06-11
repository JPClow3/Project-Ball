import type { APIRoute } from 'astro';

// A simple in-memory set to keep track of connected clients
const clients = new Set<ReadableStreamDefaultController>();

// Function to broadcast updates to all connected clients
export const broadcastUpdate = (data: { type: string, id: string, html: string }) => {
  const eventName = `${data.type}-${data.id}`;
  const htmlSingleLine = data.html.replace(/\n/g, ' ');
  const payload = `event: ${eventName}\ndata: ${htmlSingleLine}\n\n`;
  for (const client of clients) {
    try {
      client.enqueue(new TextEncoder().encode(payload));
    } catch (e) {
      clients.delete(client);
    }
  }
};

export const GET: APIRoute = () => {
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      controller = c;
      clients.add(controller);
      
      // Send initial connection successful message
      const initialPayload = `data: {"status": "connected"}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialPayload));
    },
    cancel() {
      clients.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      // Allow CORS if needed, or stick to same-origin
      'Access-Control-Allow-Origin': '*'
    }
  });
};
