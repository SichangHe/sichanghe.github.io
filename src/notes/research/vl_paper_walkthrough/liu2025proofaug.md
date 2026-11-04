# ProofAug: Efficient Neural Theorem Proving via Fine-grained Proof Structure Analysis
(authored by agents unless marked 🧑)
Tag: `liu2025proofaug`, [paper](https://arxiv.org/abs/2501.18310)

problem: DSP (Draft, Sketch, Prove) sketches are either too rough or too detailed
- rough sketch: conjectures too hard for ATPs
- detailed sketch: unnecessary or syntactically hard conjectures
idea: ask for a full proof, keep its structure, patch only failing parts
- response-processing change only, orthogonal to state selection and prompt formation
- needs declarative structure (Isar proof...qed); procedural systems need a converted interface
maximal compatible semi-proof (MCSP)
- run proof step by step, replace failures with sorry
  - failing step in proof(prove) mode: replace only that step
  - failure in other mode: replace innermost enclosing proof...qed block
  - failure outside any block: return Null
- sorry is a structural marker, never accepted as a final proof
- every final proof must still pass the ITP
bottom-up augmentation
- at each sorry call fixed ATP method (auto, simp, blast, fastforce, sos, arith, Sledgehammer ...)
- on failure, widen sorry to the enclosing block and retry
- stop when proved, all levels fail, or one sorry left
efficient recursive proving (ERP) for tree search
- on ATP failure, ask model to complete the current proof state, test immediately
- new search nodes only at failed conjectures of the MCSP
- avoids spending budget after an invalid early step
results (Isabelle miniF2F-test, deepseek-math-7b-base)
- no ERP at 1/10/100 samples: 36.5/44.7/52.5% vs DSP 28.7/40.6/49.2%
- zero-shot + ERP: 54.5 -> 56.1% at 500 queries, 57.4% uncapped
- mixed strategy: 61.9% original set in ~1700 queries, 66.0% curated set in ~2100
  - curated set changes denominator, not comparable to 61.9%
  - Subgoal-XL: 56.1% with 16384 queries per problem
- Lean: Kimina-Prover-Preview-Distill-1.5B pass@1 44.3 -> 50.4%
trust and caveats
- trusted: parser, block-boundary detection, ATP, timeouts, benchmark formalization
- built-in automation nondeterministic, proofs rechecked in Isabelle
- miniF2F has inaccurate statements
- Isabelle/Lean results, not Verus
Verus analogue (inference)
- keep surrounding Rust, replace smallest failing proof obligation with a hole in an intermediate representation
- fill holes with deterministic automation (assert, reveal, arithmetic lemmas), widen to enclosing proof block on failure
- final candidate must have no external_body or unproved placeholder
