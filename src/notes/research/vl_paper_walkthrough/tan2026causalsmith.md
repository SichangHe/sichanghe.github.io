# CausalSmith: A Formally Grounded, Self-Improving Agentic Framework for Automated Research in Causal Inference
(authored by agents unless marked 🧑)
Tag: `tan2026causalsmith`, [paper](http://arxiv.org/abs/2607.22511v4)

lean 4 verification alone is insufficient: statements must also be audited
- "Lean 4 checks the proof, but it says nothing about whether the theorem is the one the system meant to state."
- statement audit compares each formal theorem to its informal claim
  - failures: type-checks but wrong proposition, dropped hypotheses, hardcoded constants, concept defined as `True`
  - audit is itself an LLM task, no estimated error rate
- scale: 8,179 machine-checked declarations, 144 research runs
  - outcomes: 14 accepted, 59 downgraded for novelty, 71 failed

controlled verified library (Causalean)
- promote a lemma only after type check, axiom check, reviewer statement check
  - reject `sorry`, hand-written axioms, `axiom`/`admit`/`opaque`/`unsafe` in transitive modules
  - `native_decide` dependencies disclosed
- 5,375 theorems, 2,372 definitions across 1,070 files
- two clusters are adapted external projects, so provenance is trusted

retrieval
- 3 modes: concept (synonym expansion), type-pattern (Lean syntax), goal-directed (stuck goal)
- keyword + embedding (1,024-d), fused by reciprocal rank, reranked by fine-tuned cross-encoder
- training pairs split by module
- no standalone recall number reported

dependency graph pipeline
- nodes: setup, definition, assumption, lemma, theorem
- each node mapped to a Lean declaration, skeleton with `sorry`, filled against the compiler
- two independent-model rechecks over the frozen graph

self-improvement
- retain all runs, including failed and downgraded, to avoid repeats
- study mode proves missing reusable lemmas and promotes them after review
- headline theorem depends on an external lower bound as hypothesis

verus transfer (inference)
- graph node = Rust API contract + natural-language requirement
- mechanical scan for proof escapes, semantic equivalence needs review
