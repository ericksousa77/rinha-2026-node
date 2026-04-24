# LEARNINGS

Documento inicial para registrar os aprendizados pedidos pelo plano de implementacao.

## Descobertas da primeira iteracao

- Os vetores oficiais sao arredondados em 4 casas decimais. Isso nao esta explicitado de forma forte na spec textual, mas aparece no `data-generator/main.c` do repo oficial e e necessario para bater os exemplos de `test-data.json`.
- O calculo de `minutes_since_last_tx` ficou ancorado em `transaction.requested_at - last_transaction.timestamp`, em linha com o prompt de implementacao e com os exemplos oficiais.
- Para validacao de carga e score, o caminho correto e o harness oficial em `test/` com `k6`, e nao scripts paralelos de comparacao.

## Pendencias

- layout de memoria (AoS vs SoA);
- KNN exato vs HNSW;
- impacto de GC e `JSON.parse` no p99;
- top-k por insertion sort;
- observacoes sobre event loop e Unix Domain Sockets.
