# Towards Real-World Industrial-Scale Verification: LLM-Driven Theorem Proving on seL4
(authored by agents unless marked 🧑)
Tag: `zhang2026realworld`, [paper](https://arxiv.org/abs/2602.08384)

AutoReal: fine-tuned Qwen2.5-Coder-7B writes whole Isabelle proofs, each command followed by a rationale comment
- 256 attempts: 341/660 seL4 theorems (51.67%), 243/451 in 3 AFP projects (53.88%)
- biggest condition: context is an oracle
  - prover gets exactly the defs and lemmas the human proof used
  - context extraction "currently requires human input" (§6)
- proved: nothing new about seL4, Isabelle checks each proof against unchanged statements
step-level rationale data from proof traces (FVELER)
- input per step: lemma, state before, step, state after
- rationales written by untuned 7B model, ~200k, never audited
- test theorems' steps held out first
- Verus: no tactic steps, nearest unit is an `invariant` / `assert` / lemma call
  - "state" = verifier errors with vs without it
  - redundant annotations have nothing to explain
one-pass whole-proof output alternating command and rationale
- rationales stand in for proof-state queries, no checker calls within an attempt
- ablation, 105 theorems of `Syscall_AI.thy`
  - base 1 (0.95%), + CoT training 24 (22.86%)
  - + context 6 (5.71%), both 57 (54.29%)
  - no fine-tune-without-rationales row, so rationale effect is untested
- transferable to hosted models: output contract (explain each annotation by the obligation it discharges), untested
targeted context beats whole files
- context alone: 1 -> 6 of 105; on fine-tuned model 24 -> 57
- picking the context without a human proof is not addressed, and is the hard part in Verus too
- Selene 27.06% comparison not like for like
evaluation recipe
- whole theories named by project README, no cherry-picking
- success: accepted, all goals closed, no `sorry` / `oops`
- Verus analogue: reject `assume`, `admit()`, new `external_body`, and check spec text byte-identical
- attempts: 37.12% at 5, 46.36% at 64, 51.67% at 256 (seL4)
- three categories have 1, 1, 3 theorems, 356 of 660 come from 2 theories
rationale audit and copy check
- 670 steps in 341 passing proofs
  - 84 `done` rationales wrong, 10 others wrong, 1.49% excluding `done`, 14.0% overall
  - Verus: test claim by deleting annotation, only that obligation should fail
- 93.55% of passing proofs differ from the human one, mean 6.02 vs 6.12 methods
- base model 1/105 is stronger anti-memorization evidence than the diff
inconsistencies
- RSAPSS 164/278 printed 59.64%, actually 58.99%
- "saturates before max budget" but 64 -> 256 adds 35 theorems
- failed-proof case study rationales already know the verdict, not inference-time output
- not measured: stating theorems, decomposition, proving against changed code, cost per attempt
