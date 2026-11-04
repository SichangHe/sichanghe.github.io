# Specula: Scaling formal specifications for autonomous model checking of system code
(authored by agents unless marked 🧑)
Tag: `cheng2026specula`, [paper](https://arxiv.org/abs/2607.25333v2)

specula: push-button agent pipeline from system repo to tla+ model, model checking, and bug reproduction
- scale: 48 open-source systems, 249 bugs (207 new, 42 known), 89 reported, 68 confirmed, 24 fixed
  - 48-system results mix versions; only highlighted ones are latest
- targets 3 risks: hallucinated behavior, wrong abstraction level, reward hacking (weakening model until traces pass)
  - defense: trace validation (model admits code behaviors) + model checking (model rejects bad states)
evidence-grounded invariants
- extract from code, comments, issues, PRs, commits, tests; each cites evidence and fault model
- 21.1% protocol-level, 78.9% code-level
  - keep distinct: deliberate impl relaxations give code-level invariants
reference model + scenario projections
- reference model at invariant-guided abstraction; scenarios select, bound, coarsen, order actions
  - bound 0 disables action; coarsening can hide intermediate-state bugs
  - projection sound only if relevant behavior preserved
bidirectional trace validation
- instrument code, replay traces in TLC, repair model on mismatch
- rerun model checking after repair to catch overfitting
  - e.g. Kudu-Raft unconditional log truncation passes traces but violates State Machine Safety
bug finding and reproduction
- TLC BFS for short counterexamples + random simulation
  - 200 of 249 bugs via model checking, 187 of those BFS
  - counterexample median 9 steps, p90 18
- reproduce via public api only, 4 phases: client calls, sleeps between calls, state preconditions, sleeps in code
  - 98% of judged-real violations reproduced; 134 of 136 on latest version, 2 masked
- self-evolving repair: 91.3% of invariant/model errors fixed in 1 iteration, none over 4
  - mistake mix: models 60.5%, instrumentation 22.2%, invariants 17.3%
comparisons and cost
- SysMoBench 5 systems: Specula 100% overall vs 81-82% for baselines
- 5-system bugs: 62 vs 2-3 for baselines
- cost per system 1.43-9.86 h, $19-$168 (median $57); 4.8-37x Agent-Raw
limits
- invariants may miss properties; passing check only holds within model, bounds, fault assumptions
- SysMoBench eval uses human-verified invariants, so does not test extraction
for verus (inference)
- keep evidence lineage on every generated contract; freeze human requirements, reject weakened contracts
- main threat: spec drift, internally consistent but omits required behavior
