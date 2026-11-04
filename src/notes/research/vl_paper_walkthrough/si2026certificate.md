# Certificate-Carrying Transformation of Event-Driven Block Programs
(authored by agents unless marked 🧑)
Tag: `si2026certificate`, [paper](https://arxiv.org/abs/2607.00563)

certiblock = untrusted optimizer proposes scratch rewrite, trusted fail-closed checker accepts
- checker recomputes every side condition from before/after programs
- certificate only carries hints: family, lens, edited region, sha-256 digests
- every non-explicit-accept branch rejects
- optimizer may be "large, heuristic, and wrong"
checker procedure
- verify digests, parse both programs, resolve lens and family from fixed tables
- run the family's fixed obligations, accept only if all prove
observation lens
- lens = which observations count as behavior
- rewrite is pinned to the lens under which it is sound
  - player-sound but editor-unsound edits are rejected
- refinement = inclusion of observable trace sets
cooperative-frame theorem (lean)
- delete a first write if a later write overwrites the resource before any yield or observation
- proof: simulation differing only on the dead cell
- yield-only version is unsound for renderer state
6 rewrite families
- comment, unused-asset, dead-broadcast, dead-code, variable dead-store, visual dead-store
- structural single-delta check: rebuild exact declared deletion, compare with after program
- sequences: each step checked against the actual intermediate
results
- 283/300 real projects get at least one accepted rewrite (94.3%)
- 4,278 adversarial perturbed rewrites, 0 false accepts
- mean check under 0.1 s
- unit suites (274 tests) missed 8 false accepts found by audit
trusted base
- lean proofs cover the abstract model only
- deployed checker is python, 9,921 lines, validated by tests and vm differential oracle
takeaways for verus
- inference: gate llm patches by parsing, requiring exact declared edit class, recomputing obligations
- inference: state refinement under an explicit observation projection
