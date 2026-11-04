# Self-Modifying Lean Proof Agents with Verifier-Grounded Benchmark Coevolution
(authored by agents unless marked 🧑)
Tag: `li2026selfmodifying`, [paper](https://www.semanticscholar.org/paper/d3598cbceec98736eb6b276c5d4ba5d1339fc79a)

self-evolving Lean proof agent: workflow, prompts, tools, and meta-editing logic are mutable
- 15 generations, DeepSeek deepseek-v4-pro, temperature 0, single run, no variance estimates
- best held-out miniF2F-test (244 problems) 45.1%, seed 12.7%, best fixed-benchmark agent 32.0%
  - non-monotonic across generations: 11.9% to 45.1%
- active benchmark 76 tasks (L1:L2:L3 = 27:46:3) from a 365-task pool; not the denominator of the headline numbers
trusted runtime separate from mutable workspace
- fixed runtime owns Lean verification, scoring, benchmark updates, context validation
- agent edits only a copied workspace; isolated worker processes, parent never imports mutable modules
- success counts only after fresh re-verification under a trusted Lean snapshot
  - smoke tests check interface validity, not theorem success
- Verus form: immutable orchestrator runs Verus and scores; agent edits proof files and prompts
grounded proof context contract
- each attempt returns {ok, proof_body, proof_context}; representation is free, groundedness mandatory
- needs root, non-root math claim/subgoal/lemma, valid dependency edges, Lean evidence for solved nodes
  - workflow traces and diagnostics do not count
- result: context quality stayed roughly flat while solve rate changed; extracted nodes shallow, often fail in isolation
mastery-throttled benchmark coevolution
- update only if champion raw rate > 0.30; retire up to 6 mastered tasks per generation
- replace with next level only if level mastery >= 0.70, else same level; prefer domains with many archive failures
single-anchor recalibration
- c_{t+1} = c_t * r_t / max(r_{t+1}, 0.1); normalized score q = r*c
  - c rose 1.00 -> 3.17 by generation 15; it is a selection normalization, not a solve rate
- parent weight w = max(q,0)/(1+n_children), counting pending children
evolved workflows
- bounded loop: full proof, Lean run, read errors and verified lemma-name checks, retry
- tools evolved: #check, source search, batched signature checks, verified-only fallbacks
- later branch plans self-contained quantified lemmas, proves each, assembles
  - fragile: interfaces, JSON parsing, assembly, long prompts; very large repair budgets regress
Verus takeaways
- helper lemmas as separate proof fns with explicit requires/ensures, verified before use
- bounded retries, feed exact diagnostics; keep an immutable held-out set
