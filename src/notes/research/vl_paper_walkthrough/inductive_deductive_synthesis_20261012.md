# Inductive Deductive Synthesis: code and proof grow together
(authored by agents unless marked 🧑)

ids synthesizes distributed-store implementation plus rocq refinement proof from a fixed formal spec
- spec is input, not produced: "IDS takes such specifications as input rather than producing them" (§2)
- guarantee is forward simulation: every implementation trace is an abstract-spec trace
  - conditional on execution model and spec
  - authors: guarantee "only as strong as the specification" (§6)
- 7 specs: ryw, mw, mr, combined ryw/mw, chapar causal, author causal, label-filtered causal
- not covered: runtime scaling, reconfiguration, fault recovery
search design
- incomplete candidates typecheck with `Admitted` holes, none allowed at final acceptance
  - actions: define, prove, decompose, repair, revert
  - partial typechecking does not show holes fillable
- coordinator runs several workspaces
  - proposer after 10 stagnant polls: exact helper signatures, tactics
  - reloader at 20/40/60 polls: change representation, abstraction function, invariant, decomposition
  - failure history survives fresh workers
- change representation when proof will not split
  - per-key cells, per-(key, client) entries, vector clocks, balanced trees
- benchmark extracted code before proofs finish, feed performance into search, return fastest accepted
  - incomplete candidates scorable, never verified
- deterministic acceptance audit
  - zero admissions, zero Axiom/Hypothesis/Parameter, clean rebuild
  - patterns for constant puts, always-true guards, empty simulation domains
  - a false put guard made the theorem hold trivially (§5.4)
  - pattern checks do not prove non-vacuity or liveness
results (author-reported, not reproduced)
- table 1: ids succeeds on 7/7 specs (6 at 3/3, author causal at 2/3)
  - codex gpt-5.4 and claude code opus 4.6 each 2/7
  - 48 h, $744 total, ~6.8 h and $106 per spec
- throughput up to 3x chapar vector-clock, ~1.4x author causal and mr, ryw within 20%
  - mw reference timeouts partly due to udp reordering and no-retry cas, not universal
  - performance feedback mean 1.42x over first-accepted
- "roughly 200x faster" compares one run to historical 9-12 months of expert effort, not a controlled trial
- ablation on verina: full 176/189, no joint design 160, no proposer 150, no reloader 167, no rich feedback 110
- proof-only benchmarks
  - dafnybench hardest 88/100, miniCodeProps 100/100, verus-bench 149/150 (codex/claude code 148/150), coqstoq hardest 97/100
  - on proof-only tasks ids reduces to its proof component, no design space
  - near saturation
- code+proof: verina 176/189, algoveri dafny 65/77, cloverbench 62/62 (vanilla agents also 62/62)
implications
- strong prior art for proof-directed code/proof co-design and performance-guided search
- open: spec adequacy, repository-scale rust, model-to-runtime gap
