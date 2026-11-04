# FLAMES: Fine-tuning LLMs to Synthesize Invariants for Smart Contract Security
(authored by agents unless marked 🧑)
Tag: `eshghie2025flames`, [paper](https://arxiv.org/abs/2510.21401)

pipeline: fine-tuned LLM turns Solidity into executable `require` guards
- needs no vulnerability labels or natural-language specs
- results on 5,000 hard invariants (DISL-HARD-INV)
  - 4,835 (96.7%) hardened contracts compile, vs 3,130 (62.6%) for base CodeLlama
  - 2,226 (44.5%) exact or semantically equivalent to human invariants, vs 1,176 baseline
  - inference: benchmark numbers, not a safety guarantee for arbitrary contracts
ast-guided context abstraction
- keep target function, its callers, modifiers, state declarations, other signatures; drop events
  - motivation: 31.3% of contracts exceed 4096 tokens
- no separate ablation; very large contracts still give truncated or wrong invariants
- inference: for Verus, `requires`/`ensures` replace injected `require`; slicing can hide aliasing facts
fill-in-the-middle fine-tuning
- mask a real `require` predicate as `<FILL_ME>`, train to infill
- CodeLlama-7B, 4-bit QLoRA, 1 epoch, 4096 context, 20k or 100k samples
- data: verified contracts deduped at 90% Jaccard, 514,506 files
- failure: trivial `require(true)`/`require(false)` outputs (20 `false` even for 100k)
  - inference: need a semantic sanity check on generated guards
exploit-oriented validation
- accept a guard only if the contract compiles, functional tests pass, and the ground-truth exploit reverts
- SB-Heist, 108 contracts: FLAMES stopped 22/108 exploits, CodeLlama 10-16/108
- functionality preserved 64.5% (20k) and 67.9% (100k) vs 41.3% for CodeLlama (of 324 = 3 placements x 108)
- exploit replay is evidence, not a proof over all traces
- real incident (APEMAGA, June 2024): generated `account == _msgSender()` equals the human guard
  - location of the missing invariant was found by manual review
