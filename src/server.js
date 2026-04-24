import { chmodSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { createFraudEngine } from './engine/index.js';

const MAX_BODY_BYTES = 64 * 1024;
const JSON_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
});

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

/**
 * Serializa respostas no formato JSON usado pela API.
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

/**
 * Lê o body inteiro e valida limite de tamanho + JSON.
 */
async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > maxBytes) {
      throw new HttpError(413, 'request body too large');
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    throw new HttpError(400, 'request body is required');
  }

  try {
    const body = chunks.length === 1 ? chunks[0] : Buffer.concat(chunks);
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid json payload');
  }
}

/**
 * Cria o roteamento mínimo da aplicação.
 * A regra de fraude fica no engine; a camada HTTP só traduz entrada/saída.
 */
export function createRequestHandler(engine) {
  return async function handleRequest(req, res) {
    try {
      if (req.method === 'GET' && req.url === '/ready') {
        sendJson(res, 200, { ready: true });
        return;
      }

      if (req.method === 'POST' && req.url === '/fraud-score') {
        const payload = await readJsonBody(req);
        const decision = engine.score(payload);
        sendJson(res, 200, decision);
        return;
      }

      sendJson(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof HttpError) {
        sendJson(res, error.statusCode, { error: error.message });
        return;
      }

      sendJson(res, 500, { error: 'internal_server_error' });
    }
  };
}

/**
 * Remove o arquivo de socket antigo para permitir restart limpo do processo.
 */
async function removeSocketFile(socketPath) {
  if (!socketPath) {
    return;
  }

  await rm(socketPath, { force: true });
}

/**
 * Sobe o servidor em Unix Domain Socket ou TCP.
 * UDS é o caminho esperado para a arquitetura final com HAProxy.
 */
export async function startServer(options = {}) {
  const engine = options.engine ?? await createFraudEngine(options);
  const socketPath = options.unixSocketPath ?? process.env.RINHA_UNIX_SOCKET_PATH ?? '';
  const port = Number(options.port ?? process.env.PORT ?? 9999);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';

  await removeSocketFile(socketPath);

  const server = http.createServer(createRequestHandler(engine));
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
  server.requestTimeout = 0;
  server.maxRequestsPerSocket = 0;

  server.on('connection', (socket) => {
    if (typeof socket.setNoDelay === 'function') {
      socket.setNoDelay(true);
    }
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('error', onError);
      reject(error);
    };

    server.once('error', onError);

    if (socketPath) {
      server.listen(socketPath, () => {
        server.off('error', onError);
        resolve();
      });
      return;
    }

    server.listen(port, host, () => {
      server.off('error', onError);
      resolve();
    });
  });

  if (socketPath) {
    // O socket é compartilhado com o HAProxy via volume, então a permissão
    // precisa ser aberta depois do bind.
    chmodSync(socketPath, 0o666);
  }

  /**
   * Fecha o listener e limpa o socket do filesystem.
   */
  async function close() {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await removeSocketFile(socketPath);
  }

  const address = server.address();
  const url = address && typeof address === 'object'
    ? `http://127.0.0.1:${address.port}`
    : null;

  return {
    close,
    engine,
    server,
    socketPath,
    url,
  };
}

/**
 * Permite reutilizar o módulo em testes sem disparar o bootstrap automaticamente.
 */
function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return fileURLToPath(import.meta.url) === process.argv[1];
}

if (isMainModule()) {
  let runningServer;
  let shuttingDown = false;

  const shutdown = async (exitCode) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    try {
      await runningServer?.close();
      process.exit(exitCode);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  startServer()
    .then((serverState) => {
      runningServer = serverState;
      process.on('SIGINT', () => {
        void shutdown(0);
      });
      process.on('SIGTERM', () => {
        void shutdown(0);
      });
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
