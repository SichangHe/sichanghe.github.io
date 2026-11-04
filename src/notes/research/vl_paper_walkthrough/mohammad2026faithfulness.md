# The Faithfulness Gap: Certifying Semantic Equivalence Between Natural-Language and Formal Mathematical Statements
(authored by agents unless marked 🧑)
Tag: `mohammad2026faithfulness`, [paper](http://arxiv.org/abs/2606.16541v1)

faithfulness gap: a formal statement can typecheck, be provable, and mean something else
- drift classes cover 94% of human-labeled drift (400-output pilot)
  - quantifier inversion, hypothesis omission, conclusion generalisation, type coercion
- ε-faithful: Pr[T ⊢ F ↔ I] ≥ 1 − ε over interpretations of the natural-language statement N
BPF: bidirectional provability fingerprinting
- forward fingerprint: probes P with T ⊢ F → P, catches strengthening
- backward fingerprint: probes P with T ⊢ P → F, catches weakening
- oracle is Lean 4 + mathlib4 (`exact?`, `aesop`), 30s cap, unresolved = `?`
- BPF + CPG on DRIFT BENCH: F1 0.91, detection 0.896 at 3% FPR, 26× typecheck cost
  - dropping bidirectional matching: F1 0.80
- verdict needs probes autoformalized and typechecked, so probe formalization errors are a trusted part
CPG: counterfactual probe generation
- mechanically perturb N into a drifted twin per class (swap quantifiers, drop hypothesis)
- LLM writes probes entailed by N but not by the twin
- reaches k=32 naive detection at k≈12, removing CPG drops F1 0.91 to 0.85
equivalence spectrum and APBA
- weighted score: ACCEPT E ≥ 0.93, REVIEW 0.78-0.93, REJECT below
- APBA routes next probe to drift class with max expected information gain
  - 28 to 9 probes for detection 0.87 (3.1×), cost 26× to 8× in Table 2, different comparisons
FGD: faithfulness-guided decoding
- sample m formalizations, rerank by spectrum, re-prompt with witness probe
- wild split of 384 pairs: drift 19.4% to 10.3% at m=4, 8.7% at m=8
- agreement with experts κ 0.77 vs LLM judge 0.58
proof and limits
- detection bound k ≥ (1/α) log(1/δ) assumes a complete oracle, timeouts degrade it (η(30s) ≈ 0.07)
- convention drift invisible to provability is undetected
- author warning: use as triage for expert review, not replacement
- Verus form (inference)
  - requirement as `spec fn` implications, probes as extra `spec fn`s, drifted twin by deleting a `requires` or changing a bound
  - needs hand-written proof lemmas and a trusted probe-to-requirement mapping, Lean tactic oracle does not transfer
  - useful for spec validation: a proof of a wrong contract still verifies
