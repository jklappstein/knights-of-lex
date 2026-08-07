import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = resolve(__dirname, '../../content');

function safeContentDestination(destinationPath: string): string | null {
  const cleaned = destinationPath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!cleaned || cleaned.includes('..')) return null;
  const abs = normalize(join(CONTENT_ROOT, cleaned.replace(/^content\//, '')));
  if (!abs.startsWith(CONTENT_ROOT + sep) && abs !== CONTENT_ROOT) return null;
  const ext = extname(abs).toLowerCase();
  if (!['.png', '.webp', '.jpg', '.jpeg', '.ogg'].includes(ext)) return null;
  return abs;
}

function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/** Dev-only write path for promoting Forge visual assets into repo content/. */
export function kolPromotePlugin(): Plugin {
  return {
    name: 'kol-promote-art',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/api/kol/promote-art') {
          next();
          return;
        }

        try {
          const body = await readJsonBody(req) as {
            destinationPath?: string;
            dataBase64?: string;
          };
          const destinationPath = body.destinationPath?.trim();
          const dataBase64 = body.dataBase64?.trim();
          if (!destinationPath || !dataBase64) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'destinationPath and dataBase64 are required' }));
            return;
          }

          const abs = safeContentDestination(destinationPath);
          if (!abs) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'invalid destinationPath' }));
            return;
          }

          const bytes = Buffer.from(dataBase64, 'base64');
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, bytes);
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: true, path: destinationPath }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({
            error: err instanceof Error ? err.message : 'promote failed',
          }));
        }
      });
    },
  };
}
