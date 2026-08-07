export type { ForgeRuntimeEvent } from '../ports/ForgePort.js';

export async function* iterInvocationEvents(
  baseUrl: string,
  token: string,
  executionId: string,
  options: { lastEventId?: string; signal?: AbortSignal } = {},
): AsyncGenerator<import('../ports/ForgePort.js').ForgeRuntimeEvent, void, unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'text/event-stream',
  };
  if (options.lastEventId) {
    headers['Last-Event-ID'] = options.lastEventId;
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/invocations/${executionId}/events`, {
    headers,
    ...(options.signal ? { signal: options.signal } : {}),
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE failed: ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];
  let eventId: string | undefined;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const line of parts) {
      if (line === '') {
        if (dataLines.length) {
          const payload: import('../ports/ForgePort.js').ForgeRuntimeEvent = {
            event: eventName,
            data: JSON.parse(dataLines.join('\n')),
            ...(eventId ? { id: eventId } : {}),
          };
          yield payload;
        }
        eventName = 'message';
        dataLines = [];
        eventId = undefined;
        continue;
      }
      if (line.startsWith(':')) continue;
      if (line.startsWith('id:')) eventId = line.slice(3).trim();
      else if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
  }
}
