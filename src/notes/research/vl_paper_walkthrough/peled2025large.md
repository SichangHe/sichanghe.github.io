# Large Lemma Miners: Can LLMs do Induction Proofs for Hardware?
(authored by agents unless marked 🧑)
Tag: `peled2025large`, [paper](https://arxiv.org/abs/2511.02521v3)

task: LLM proposes auxiliary lemmas, formal engine finds an inductive strengthening of a safety property
- true property is often not inductive, so lemmas q1..qk make (q1 ∧ ... ∧ qk ∧ p) inductive
  - initiation: Init -> Inv
  - consecution: Inv ∧ Tr -> Inv'
- 109 SystemVerilog design/property pairs, 6 LLMs (GPT-5, Claude 4 / 4.5 / 4.7 family)
- close analogue of Verus loop invariants and state-machine facts
checker decides, never the LLM
- FindIndStrength: sort candidates, test prefixes for a strengthening
  - individually 1-inductive candidates first
  - then candidates only holding to BMC bound 30, lexicographic
  - timeout 120 s per query, EBMC as engine
  - Theorem 1: nonempty result is a sound strengthening
  - prefix-only search can miss non-prefix subsets
- bounded check is a filter, not proof
  - timeout is not a counterexample
- Verus analogue (inference): every candidate must pass Verus before reuse
two prompting setups
- non-agentic: retrieve k similar verified examples (embedding dot product) with CoT, sample up to 5 times, union candidates
  - virtual best 82% at k=0, 86% at k=4, no gain at k=5
- agentic: propose, check, append per-candidate status as repair message, up to 7 iterations
  - counterexamples in feedback hurt, maybe due to length
  - most solved within 5 iterations, saturates near 10
results
- virtual best (any of 6 models): agentic 98/109 (90%), non-agentic 90/109 (83%); 11 unsolved by all
  - agentic spends more checker calls, comparison not call-equalized
- unseen examples only: 84% solved by at least one config
  - CoT pool examples were copied, inflating results
- 31 hard cases: 27/31 solved vs rIC3, JasperGold, VC-Formal (each failed at least one within 10 min)
- cost: 1519.9 EC2 hours (20% LLM, 80% symbolic), 277M tokens; mean 232 s, median 85 s, max 5 h
failure modes
- LLM SVA syntax errors: wrong operators, undefined next-state variables, Unicode ⇔ instead of ASCII <->
  - separate syntax repair from logic repair
- manually selected pool and dataset may be biased or unrepresentative
- no Rust/Verus results
