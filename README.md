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

## Proximos passos

- fechar a fase de benchmarks e documentacao (`docs/BENCHMARKS.md`, `docs/LEARNINGS.md`);
- validar o stack completo com `docker compose up`;
- adicionar backend `hnsw` como experimento controlado.
