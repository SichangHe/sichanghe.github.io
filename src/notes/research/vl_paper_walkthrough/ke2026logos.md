# Logos: Certified Order-Sensitive SQL Rewrites with Mechanized Semantics and LLM Guidance
(authored by agents unless marked 🧑)
Tag: `ke2026logos`, [paper](https://www.semanticscholar.org/paper/513b2356cc9a799751b6c96ce838f98e67b8696e)

LLM proof agent + mechanized semantics gives kernel-checked SQL rewrite certificates
- FormalSQL in Rocq: typed, error-aware, order-sensitive semantics, 2000+ verified lemmas
- LLM selects lemmas and writes per-query Rocq proofs; Rocq kernel checks every certificate
  - also builds countermodels (fixed typed database) for non-equivalence
set-valued semantics
- query denotes all legal ordered lists plus observable errors, not one engine order
  - `IN` to join rewrite with 21 matches and `LIMIT 20`: 21 possible outputs, picking one order is unsound
bag-closure lifting
- forget order only when every permutation of each outcome is legal (bag closed)
- Theorem 9: bag-closed + equal bags + equal errors implies ordered-outcome equivalence
  - if closure fails, keep list semantics
  - invalid closure proof would certify an unsound rewrite
results (389 query pairs)
- solved 338 (86.9%) vs SQLSolver 249 (64.0%), QED 213, Cosette 50
- order-sensitive 104 pairs: 76 (73.1%) vs SQLSolver 43 (41.3%)
- 47 timeouts (12.1%), 4 unsupported
- cost: median 3632s per solved case, 396.3h total for 338 vs SQLSolver 1.70h for 249
  - 87.6% of agent time is model deliberation, 12.4% Rocq compilation
  - 53,565 submissions, 50,841 did not compile
- 224/243 equivalence certificates use Logos-specific lemmas; 58/243 use bag-to-list bridge
limits
- finite, PostgreSQL-oriented fragment; dialect translation (SQLGlot) may differ in semantics
- solved rate is within 14,400s budget, not decision power
