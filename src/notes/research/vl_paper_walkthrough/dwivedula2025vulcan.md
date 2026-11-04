# Vulcan: Instance-Specialized, Verifiable Systems Heuristics Through LLM-Driven Search
(authored by agents unless marked 🧑)
Tag: `dwivedula2027vulcan`, [paper](https://doi.org/10.1145/3842654.3848582)

vulcan: llm synthesizes only stateless decision logic, trusted code owns state and integration
- Rank (order candidates) and Value (scalar output) interfaces
  - cache template: 74 lines developer code serves 32 instances
  - coupled decisions compose Value then Rank, may need new interfaces
- libVulcan listeners hold stateful aggregates (average, rolling percentile, ewma) outside generated code
  - written and reviewed once, queried by generated code
- Anvil language gives safety by construction
  - no pointers, arrays, heap, recursion, unbounded loops
  - guarantees memory safety, leak freedom, termination only if linked externs satisfy them
  - no semantic correctness verification, stated as future work
evidence
- spot vm scheduling: ~4.9x savings of UP, 1.7x ADRS
- cache eviction: 32 instances, 2 beat all baselines, 13 in top 3
  - heuristic costs 13.4x FIFO execution time
- memory tiering on cxl hardware: +14.2% over ARMS on GUPS
- supports evaluated settings only
for verus
- inference: generated body = pure fn with contract over immutable feature snapshot
  - listeners as separately verified library, Verus can prove stronger properties than safety-by-syntax
