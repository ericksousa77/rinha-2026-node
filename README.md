# rinha-2026-node

Implementacao inicial da Rinha de Backend 2026 em Node.js puro, seguindo o plano definido em `../IMPLEMENTATION_PROMPT_RINHA.md`.

## Status

- `vectorize(payload)` implementado com os 14 campos e arredondamento em 4 casas, compatível com os vetores oficiais.
- `decision(labels)` implementado com threshold fixo de `0.6`.
- backend `exact` implementado sobre `Float32Array` contiguo + `Uint8Array`.
- `scripts/preprocess.mjs` converte `resources/references.json.gz` para `data/references.bin` e `data/labels.bin`.
- servidor HTTP nativo com `GET /ready` e `POST /fraud-score`, com suporte a TCP ou Unix Domain Socket.
- base de `Dockerfile`, `docker-compose.yml` e `haproxy.cfg` criada.

## Comandos

```bash
npm test
npm run preprocess
npm start
```

Para desenvolvimento local em TCP, o servidor usa `PORT=9999` por padrao. Para o arranjo final da rinha, defina `RINHA_UNIX_SOCKET_PATH`.

## Testes com k6

Os testes oficiais de carga e score ficam em `test/` e devem ser executados com `k6`.

Pre-requisitos:
- `k6` instalado na maquina
- stack da aplicacao em execucao na porta `9999`

Suba a stack:

```bash
docker compose up -d --build
```

Se quiser escolher a versao do Node usada na imagem:

```bash
NODE_VERSION=22 docker compose up -d --build
NODE_VERSION=24 docker compose up -d --build
```

Rode o smoke test:

```bash
k6 run test/smoke.js
```

Rode o teste completo:

```bash
k6 run test/test.js
```

Ao final, o `k6` gera o arquivo `test/results.json` com:
- `p99`
- `final_score`
- contadores de `FP`, `FN` e `http_errors`

Para comparar backends, altere apenas a env antes de subir a stack:

```bash
RINHA_SEARCH_BACKEND=exact docker compose up -d --build --force-recreate
RINHA_SEARCH_BACKEND=hnsw docker compose up -d --build --force-recreate
```

Tambem e possivel combinar backend e versao do Node:

```bash
NODE_VERSION=22 RINHA_SEARCH_BACKEND=hnsw docker compose up -d --build --force-recreate
NODE_VERSION=24 RINHA_SEARCH_BACKEND=hnsw docker compose up -d --build --force-recreate
```
