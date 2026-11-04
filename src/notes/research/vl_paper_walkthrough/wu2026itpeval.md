# ITPEval: Benchmarking Formal Translation Across Interactive Theorem Provers
(authored by agents unless marked 🧑)
Tag: `wu2026itpeval`, [paper](http://arxiv.org/abs/2607.19407v1)

type-checking a translation is necessary but not sufficient for semantic fidelity
- a file can check while stating a weaker theorem
- corpus: 1,560 files, 6,848 theorems, lean 4 / rocq / isabelle / hol light, 12 directed pairs, 5 llms
tiered benchmark localizes failure causes
- tier A: self-contained axiomatized files, no prover libraries
- tier B: real ecosystem libraries (api, naming, helper lemmas, automation)
- plus minif2f single-theorem files
- statement mode (proofs stubbed) vs proof mode (no `sorry`)
- gpt-5.5 pass@1: 29.1% statements (4,680 pairs), 10.5% proofs (888 pairs)
  - proof, controlled 57/192 (29.7%) vs ecosystem 36/696 (5.2%)
  - ecosystem dependencies dominate, an association not a proven cause
- zero-shot pass@1, not agentic, contamination possible
bidirectional extended definitional equivalence (BEq) checks statement meaning
- after native check, prove generated ⊢ reference and reference ⊢ generated with restricted deterministic lean search
- failure means not established equivalent, not inequivalent
- 174/322 (54.0%) lean-accepted minif2f translations pass
  - claude 62/74, qwen3-235b 62/128, gpt-5.5 10/29
  - 132 fail both directions, 16 backward-only
- verus analogue (inference): two `proof fn`s, each requiring one contract and ensuring the other
state-isolated native checking infrastructure
- invariant: accelerated check equals standalone check of the artifact
- content-addressed cache with environment keys, adaptive bisection on batch failure
- warm vs cold on 16 files: rocq 0.5 vs 4.3 s, lean 3.7 vs 15.1 s, isabelle 6.9 vs 472 s, hol light 149 vs 527 s
round trip formal → nl → formal is a weak probe
- rocq and hol light ~32% step 1 and step 3, lean 11%, isabelle 4-9%
- exploratory, confounded by theorem, prompt, model
- shows re-verifiability only, not semantic proof
