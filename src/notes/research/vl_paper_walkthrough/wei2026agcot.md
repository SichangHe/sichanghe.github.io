# AG-CoT: Verified Algorithmic Traces for LLM Program Synthesis on Clifford Circuits
(authored by agents unless marked 🧑)
Tag: `wei2026agcot`, [paper](https://doi.org/10.22331/q-2021-11-16-580)

## problem and verification boundary
The paper studies OpenQASM generation for Clifford state preparation. A prompt gives signed Pauli stabilizer generators for a target state; a model must emit a circuit from |0⟩. The verifier parses QASM, converts it to a Clifford object, simulates its tableau, and checks the target. The paper states: “A stabilizer state |ψ⟩ can be specified by n independent commuting signed Pauli generators S1 , . . . , Sn such that Si |ψ⟩ = |ψ⟩ for every generator index i.” It distinguishes strict saved-label equality (`Exact`) from basis-insensitive state equivalence (`StateEq`). “StateEq@1 hence removes generator-basis sensitivity while preserving the same parsing, Clifford-conversion and state-preparation boundary as Exact@1lab.”

Inference: for VL, the transferable idea is to make a cheap executable semantic oracle a training filter and evaluation gate, while keeping representation-level and semantic-level metrics separate.

## technique 1: verifier-checked algorithmic-trace supervision
What it is: expose the deterministic Aaronson–Gottesman reduction that constructs each circuit, then train on the trace plus the final circuit. The paper says, “AG-CoT completions contain the Aaronson–Gottesman reduction steps from which each circuit is constructed, so the supervision covers the synthesis procedure as well as its output.”

When to use it: use this when a verifier can check both a final program and a deterministic derivation. It is useful when output syntax is easy for the model but semantic transformations are difficult.

Steps in the paper:
1. Parse each reference circuit into a Clifford object (Section 4, “Reference-circuit AG-CoT construction”).
2. Apply deterministic Aaronson–Gottesman row reduction; record the reduction circuit and phase corrections.
3. Invert the reduction in reverse order, inverting each gate, to obtain the preparation circuit.
4. Record either per-qubit reduction groups (Basic AG-CoT) or the destabilizer row after each operation (Step AG-CoT).
5. Put the trace in a `<think>` block followed by OpenQASM.
6. Keep only pairs whose emitted circuit satisfies `Exact(x,yx)=1` under strict saved-label checking.

The target-conditioned variant instead completes the signed generators to a full tableau, reduces it, inverts the reduction, compiles to `{h,s,cx}`, and verifies with `StateEq`.

Inference: in Verus, a comparable training record would contain a Rust function, its `requires`/`ensures`, and proof steps or lemmas that Verus accepts. Verus does not carry over quantum tableau semantics automatically; those become executable/specification functions and lemmas, and the final acceptance must be a Verus check. Do not model the trace as a runtime proof function: proof code is erased and only executable code runs.

Evidence: on 3,661 held-out targets with one greedy output and no repair, Qwen Direct SFT solved 33/3,661 (0.90%), while AG-CoT SFT solved 201/3,661 (5.49%). The paper reports “AG-CoT SFT turns 170 Direct SFT failures into successes while losing 2 Direct SFT successes,” with exact McNemar p = 4.97 × 10−48. On the same targets, Mistral rose from 71/3,661 (1.94%) to 316/3,661 (8.63%). In the complementary 32B setup, Basic AG-CoT reached StateEq@1 5.37% on 3,894 prompts; Step AG-CoT reached 4.83%.

## technique 2: verifier-filtered continuation (RFT)
What it is: continue supervised training on the model’s own outputs that pass the semantic verifier. The paper describes this as “a verifier-filtered form of rejection-sampling fine-tuning (RFT).”

Steps: initialize from the AG-CoT adapter; generate completions; require one complete `<think>` block and QASM; parse, enforce Clifford validity, gate set, qubit count and header; run `StateEq`; retain accepted responses verbatim; mask prompt tokens and train on the fixed accepted set. The paper explicitly says, “Each accepted response is kept verbatim with its original prompt, and RFT continues supervised training from the AG-CoT adapter on this fixed dataset with prompt tokens masked from the loss.”

Evidence: Qwen RFT versions solved 213/3,661 (5.82%), 215/3,661 (5.87%), and 210/3,661 (5.74%), versus 201/3,661 for AG-CoT. Mistral RFT solved 322/3,661 (8.80%) versus 316/3,661. The paired gains were 19, 21, and 18 targets, with losses of 7, 7, and 9; only version 2 remained below 0.05 after Holm adjustment (p=0.038). In the 32B direct study, RFT-v1 had the highest StateEq@1, 6.14%, and Exact@1 saved-label, 3.13%, among reported variants.

Inference: a VL pipeline can retain only Verus-compiling, contract-satisfying candidate Rust proofs for later supervised continuation. The filter must include the exact project build and specification checks; compilation alone is the analogue of syntax validity, not semantic success.

## technique 3: separate terminal criteria and search budget
The verifier records syntax, Clifford validity, strict labels, and state equivalence separately. For 64 sampled candidates per target, Basic AG-CoT achieved strict saved-label Pass@64 4.42% but StateEq-Pass@64 10.07%; the same candidate pool had estimated StateEq-Pass@1 4.65%. RFT had estimated saved-label Pass@1 3.18% and observed Pass@64 5.19%. These denominators and candidate budgets matter: the paper warns that Pass@64 is finite-budget coverage, not direct one-output reliability.

Inference: report Verus compile rate, exact postcondition success, and multi-sample “at least one succeeds” separately; otherwise search-time retries can be mistaken for a better single-generation model.

## what is proved, trusted, and assumed
The Qiskit tableau simulator and exact state checks establish the paper’s chosen Clifford-state criterion. They do not prove arbitrary quantum unitaries, non-Clifford states, or that the saved-label convention is the user’s intended semantics. The paper itself says, “An extension to generic state preparation would require a representation for non-stabilizer states and a state-fidelity threshold fixed before evaluation.” Inference: a Verus adaptation likewise trusts Verus, its solver, Rust compilation/erasure, and any external specifications; it proves only the stated contracts.

Inference: threat to VL is medium. The method directly threatens any workflow that trains on plausible proof text without verifier filtering, but the reported absolute semantic success remains 5.49–8.80% in the controlled one-output setting. VL should reuse the verifier-filtered-data pattern and metric separation, not assume trace supervision solves proof generation.

## techniques for the catalog
- verifier-checked algorithmic traces — train on deterministic derivations paired with final programs retained only after exact semantic verification
- verifier-filtered continuation — fine-tune on the model’s own verifier-accepted completions
- criterion-separated evaluation — report syntax, representation equality, semantic equivalence, and finite-budget Pass@N independently
Checked 2026-10-14 against the paper by a Codex agent: audit record wei2026agcot; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
