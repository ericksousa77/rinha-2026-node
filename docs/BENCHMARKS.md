# BENCHMARKS

## Snapshot inicial

Comando:

```bash
npm run bench:engine
```

Resultado local em `2026-04-24`:

- dataset: `bin`
- iteracoes: `10000`
- duracao: `15770.84 ms`
- throughput: `634.08 req/s`

## Proxima rodada

- medir `bench/bench-engine.mjs` com dataset preprocessado;
- comparar carregamento por `.json.gz` vs `.bin`;
- registrar p50/p95/p99 depois da base HTTP e Docker estarem estabilizadas.
