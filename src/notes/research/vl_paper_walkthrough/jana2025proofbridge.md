# ProofBridge: Auto-Formalization of Natural Language Proofs in Lean via Joint Embeddings
(authored by agents unless marked 🧑)
Tag: `jana2025proofbridge`, [paper](https://arxiv.org/abs/2510.15681v3)

proofbridge = nl theorem+proof to lean 4 theorem+proof (iclr 2026)
- joint nl/lean embedding
  - nl encoder all-MiniLM-L6-v2, lean encoder = ByT5 over proof-state dag from lean repl
  - symmetric contrastive loss, shared 512-dim space
  - 3,895 held-out pairs: nl→fl recall 52.83% at k=1, 95.08% at k=50
- retrieval-augmented sft
  - top-5 retrieved lean pairs plus scores in prompt
  - model Kimina-Prover-RL-1.7B
  - data: 38,951 nl-lean pairs, 30% human-written, rest generated
- verifier-guided repair
  - up to 5 iterations: lean type check, then semantic equivalence check
  - feedback = lean error messages and locations
- two-level metrics
  - tc = type checks without sorry
  - sc = lean-checked biconditional with gold theorem, llm proposes proof, kernel checks
    - assumes gold formalizations are faithful
- results on miniF2F-test-pf (244 problems), pass@32
  - full system: 62.70% sc, 95.49% tc
  - sft without repair: 55.33% sc, 89.75% tc
  - random few-shot baseline: 31.56% sc, 93.85% tc
  - kimina-prover-72b zero-shot: 43.03% sc, 79.51% tc
  - two-step translator+prover: 43.44% sc, 59.43% tc, cascading errors
- trust
  - correctness rests on lean checking
  - embedding, retrieval db, and nl proofs only affect generation quality
- verus transfer
  - retrieve verus modules with contracts and diagnostics
  - bounded repair loop around verus
  - llm judge for spec equivalence is weaker than a mechanical equivalence lemma
