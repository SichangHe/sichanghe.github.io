# Neuro-Symbolic Software Verification: Hyper-charging Local Language Models with Symbolic Reasoning at Scale
(authored by agents unless marked 🧑)
Tag: `pirzada2026neurosymbolic`, [paper](https://arxiv.org/abs/2606.16886)

veribmc: local open-weight llm + esbmc for c loop invariants
- rule: cheap symbolic reasoning first, llm only on the residue
- every candidate accepted only after esbmc proves it; llm not trusted
esbmc as 3-valued invariant oracle: provable, disprovable, unknown
- atomic test: pre → φ ∧ (φ ∧ g ∧ body → φ')
- whole-program test adds φ ∧ ¬g → ψ
  - failure means inductive but too weak
- timeout or parse error = unknown, never acceptance
phase 0: run verifier on unannotated program first
- 520 problems, 21 overflow cases excluded, 499 effective
- solves 111 (22.2%), +3 integer-relaxed
phase 1: enumerate atoms over live vars and constants, no llm
- ≤ 6(|V|² + |V|·|C|) candidates, each tested, store in provable p / disprovable d / unknown u
- conjoin p, check whole program
- solves 75/499 that phase 0 could not
- net gains: llama-3.1-8b +36, qwen2.5-7b +22, gpt-oss-20b +15, qwen2.5-32b +3, gpt-oss-120b 0
phase 2: llm refinement with p/d/u feedback
- decompose failed formula into subformulas, classify each, recombine provable atoms
- counterexample traces hurt small models (longer context)
- basic: 1931/2600 model-problem pairs (74.3%)
  - gpt-oss-120b 431/499 vs 428 llm-only; llama-3.1-8b 342; qwen2.5-7b 352
- 65.1% of llm solves on first iteration, 85.1% within 5; max 171
- 62 problems unsolved by every configuration at 600s
prompting extras gave little
- cot families (inductive, hoare, horn): model identity dominates strategy, no per-style results
- tot scoring (0.6|P| − 0.3|D| + 0.1|U|) gets 49 new pairs but lowers aggregate
  - gpt-oss-120b 421 vs 431; llama 285 vs 342; weights unablated
- dual-llm gains track the stronger second model (llama +47, qwen2.5-7b +64), not a controlled ablation
limits
- mostly mathematical integers, not fixed-width; 431/499 includes integer-relaxed successes
- contamination, stochastic decoding, 600s timeout, parse failures
- 431, 437, 440 are different configuration unions, not additive
trusted: esbmc parser/smt/goto transform, benchmark specs, recombination host code
verus takeaways (inference)
- verus first on unannotated code, enumerate scalar `invariant` atoms, keep only proved clauses
- p/d/u as host-side sets keyed by normalized expressions
- scalar templates insufficient for arrays or heap
