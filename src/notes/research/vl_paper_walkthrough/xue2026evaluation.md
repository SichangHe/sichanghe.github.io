# From Evaluation to Enhancement: Large Language Models for Zero-Knowledge Proof Code Generation
(authored by agents unless marked 🧑)
Tag: `xue2026evaluation`, [paper](https://arxiv.org/abs/2509.11708)

ZK-Eval + ZK-Coder: generate Circom/Noir circuits from natural language
- diagnosis: syntax knowledge does not give correct constraint modeling
  - typical errors: typing, signal mismanagement, faulty constraint enforcement
- ZK-Coder = constraint sketch (ZKSL) → exact primitive retrieval → compile/test repair
- 68 adapted HumanEval tasks, GPT-o3 Pass@1 (10 samples/task)
  - Circom 87.85% vs 20.29% baseline; Noir 97.79% vs 28.38%
- 34 adapted LiveCodeBench tasks, avg over models vs baseline + repair
  - Circom 44.10% vs 14.07%; Noir 56.93% vs 33.95%
  - production patterns 90.83% / 92.09% are easier standard tasks, keep separate
spec-first: formulate constraints in ZKSL before target code
- ZKSL = Python-embedded DSL, typed `Field`/`Bool`/vector inputs, `verify` function, `engine.add(Φ)`
  - arithmetic mod p, matching ZK
  - syntax/type/arity checks, error trace fed back for sketch repair
- GPT-o3 sketch correctness 97.30% Circom, 97.94% Noir
- sketch errors dominate failures: 41.56% Circom, 73.07% Noir
- verus inference: typed Rust sketch with `spec fn` per relation; needs explicit finite-field model, not evaluated in paper
retrieve by canonical primitive, not text similarity
- canonicalize aliases (`>=` → `GreaterEqThan`), distinguish arity/type, exact-match curated verified templates
- ablation avg Pass@1: full 65.66% → no RAG 53.04% (Circom), 76.87% → 72.00% (Noir)
  - text-similarity RAG: 51.42% Circom, 74.59% Noir
- verus inference: retrieval proposes candidates only; proof must still establish the template `ensures`
two-phase repair: compile first, then relation faithfulness
- compile diagnostics, up to 8 retries
- then model-generated acceptance/rejection cases, counterexamples back to model, up to 3 retries
- GPT-o3 repair pass 94.41% Circom, 99.85% Noir (conditional on correct sketch)
- ablation: no compile repair costs 26.04% / 27.12%; no execute repair gives 64.48% / 76.00%
- failures: over-constraint (false rejection) 19.78% / 10.89% vs under-constraint 1.08% / 1.67% (denominator = failures)
- verus inference: tests find bugs, proof is the acceptance guarantee
evaluation design
- 172 Circom + 164 Noir questions, 4 categories; hidden tests, mutation testing
- "only repair" 43.31% / 59.80% vs full 65.66% / 76.87%
  - repair loop cannot replace explicit spec + grounded templates
- tests cannot prove correctness (paper's own threat to validity)
techniques
- intermediate constraint sketch
- structural primitive retrieval
- two-phase bounded repair
- hidden-case evaluation with conditional denominators
- per-component ablation
