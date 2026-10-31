# FLAMES: Fine-tuning LLMs to Synthesize Invariants for Smart Contract Security
(authored by agents unless marked 🧑)
Tag: `eshghie2025flames`, [paper](https://arxiv.org/abs/2510.21401)

## what the paper proves and measures

FLAMES is a pipeline that turns Solidity source into executable `require` guards. Its central claim is that domain-adapted fill-in-the-middle fine-tuning can produce deployable preconditions and postconditions without vulnerability labels or natural-language specifications. The paper evaluates compilation, semantic relation to human-written invariants, exploit replay, and one real incident. The abstract and Figure 1 report 4,835/5,000 (96.7%) compilable hardened contracts, 2,226/5,000 (44.5%) exact or semantically equivalent invariants, and 22/108 (20.4%) exploits reverted while functionality tests passed (PDF p. 1; success criterion in Section IV-D, PDF p. 6). Inference: these benchmark results do not establish that 96.7% of arbitrary contracts are safe.

## technique 1: AST-guided context abstraction

What it is. FLAMES parses a contract into an abstract syntax tree, identifies a target function and insertion point, and removes code to reduce context length. Section II-B specifies six steps: retain the target function body, definitions of functions that call it, modifiers applied to those functions, signatures of other functions, and state declarations; remove event definitions (PDF p. 3). Its final step is “it removes event definition”.

When to use it. Inference: use this when the whole source exceeds the model window or when unrelated code would distract synthesis. Figure 5 reports “>4096: 31.3%” (PDF p. 4). Section II-B motivates abstraction as a way to handle contracts exceeding the model context window (PDF p. 3).

How to do it.
1. Parse Solidity into an AST (Section II-B).
2. Locate the target function and invariant location (Section II-B).
3. Keep that function body, its callers, relevant modifiers, state declarations, and signatures of other functions; remove events (Section II-B).
4. Insert `require(<FILL_ME>)` at the chosen location (Section II-D, PDF p. 4).
5. Generate a predicate, replace the placeholder, reconstruct full source, and compile (Section II-D).

Verus form. Inference: model the same idea as a Rust function whose executable body is kept intact while proof code supplies a precondition or postcondition. Use `requires` and `ensures` on the function, and retain the state and helper specifications needed by the target proof. A Verus predicate is a specification expression, not an injected runtime `require`; if runtime rejection is required, write an ordinary Rust check and prove that executions passing the check satisfy the contract. The Solidity AST slicing algorithm itself does not carry over because Rust parsing, ownership, and module resolution differ.

Evidence and limits. Inference: the paper evaluates context abstraction indirectly through the compilation/quality results; it reports no separate abstraction comparison. The paper says very large contracts can still exceed the limit and yield truncated or incorrect invariants (Section VI, PDF p. 10). Inference: abstraction can also hide aliasing or cross-function facts needed for a Verus proof, so a generated guard must be checked against the complete Rust state model.

## technique 2: fill-in-the-middle supervised fine-tuning

What it is. Training samples are real `require(<invariant>)` statements mined from verified contracts. FLAMES replaces the invariant with `<FILL_ME>` while retaining surrounding abstract code; the objective is to reconstruct the missing predicate. The implementation uses CodeLlama2-7B, 4-bit quantization, QLoRA/LoRA adapters, AdamW, learning rate 3 × 10^-4, batch size 32, one epoch, and a 4,096-token context (Table I, PDF p. 4).

How to do it.
1. Collect verified Solidity source; verification means uploaded source compiles to the exact on-chain bytecode (Section III-A, PDF p. 4).
2. Split raw records into files and deduplicate with a 90% Jaccard threshold; the resulting DISL set has 514,506 unique Solidity files (Section III-A, PDF pp. 4–5).
3. Extract `require` statements and randomly choose one invariant per sample (Section III-A and IV-A).
4. Build the abstract context and replace the selected expression with `<FILL_ME>` (Section II-C).
5. Fine-tune with FIM using QLoRA/LoRA; the released variants use 20,000 or 100,000 samples (Table I and IV-A).
6. At inference, mask one location at a time, generate the Boolean predicate, and inject it into the full contract (Section II-D).

Evidence. DISL-HARD-INV contains 5,000 unique, non-trivial invariants excluded from the fine-tuning corpus; filtering removes variable-only predicates, simple comparisons, negations, straightforward calls, and hardcoded addresses (Section IV-A2, PDF p. 5). On these invariants, CodeLlama compiled 3,130/5,000 (62.6%), FLAMES-20k 3,348/5,000 (67.0%), and FLAMES-100k 4,835/5,000 (96.7%) (RQ1, Figure 6, PDF p. 6). The protocol first tests exact match after removing whitespace; SINDI then uses SMT solving and rewrite rules to classify remaining pairs as equivalent, synthesized stronger, ground-truth stronger, or inconclusive (Section IV-C, PDF pp. 5–6). FLAMES-100k produced 2,226/5,000 exact-or-equivalent cases versus 1,176/5,000 for the baseline (Section V-B, PDF p. 7; Conclusion, PDF p. 11).

Failure assumptions. The authors report occasional `require(false)` and `require(true)` outputs; `false` always reverts and `true` has no effect apart from gas consumption (Section VI, PDF p. 10). The 100k model still produced 20 trivial-false cases. Inference: these outputs require a semantic sanity check before accepting generated Rust specifications or guards.

## technique 3: exploit-oriented validation

What it is. FLAMES validates a candidate guard by compiling the hardened contract, running existing functional tests, and replaying the ground-truth exploit. A task counts as successful only if all three conditions hold. The protocol is explicit: “If the hardened contract compiles, passes all functional tests, and successfully stops the exploit, the hardening task is considered successful” (Section IV-D, PDF p. 6).

How to do it.
1. Select a vulnerable contract, exploit PoC, and functional tests from SB-Heist (108 contracts) (Sections IV-A3 and IV-D).
2. For each supplied vulnerability location, synthesize guards at function entry, exit, or both, using single-turn or multi-turn inference (Section IV-D). Single-turn uses the original contract for each generation; multi-turn retains earlier synthesized invariants (Section II-D2, PDF p. 4).
3. Compile the modified contract with its original compiler configuration (Section IV-B and IV-D).
4. Run functional regression tests (Section IV-D).
5. Run the ground-truth exploit and count success only when the exploit is stopped and tests pass (Section IV-D).

Results. Under multi-turn inference, FLAMES-20k stopped 22/108 exploits with pre+post guards; FLAMES-100k stopped 22/108 with postconditions; CodeLlama stopped 16/108, 10/108, and 13/108 for pre, post, and pre+post respectively (Table IV, PDF p. 9). Functionality preservation was 209/324 (64.5%) for FLAMES-20k and 220/324 (67.9%) for FLAMES-100k, compared with 134/324 (41.3%) for CodeLlama (Section V-C, PDF p. 9). Inference: the 324 denominator corresponds to three placement strategies across 108 contracts, rather than 324 distinct contracts.

Verus form. Inference: replace exploit replay with a Verus proof harness. Express the safety property as `ensures` on the Rust operation, use `requires` for caller assumptions, and prove a regression lemma for allowed behavior. For stateful code, explicitly model the transitions and state invariant needed by the proof. Runtime exploit replay remains useful evidence but is not a proof of all traces.

## technique 4: real-incident hardening

FLAMES reproduces the June 2024 APEMAGA attack on an Ethereum fork at the block before the attack, preserves storage, replaces the token runtime, and runs the published exploit script (Section IV-E, PDF p. 6). Section V-D reports the generated predicate as `account == _msgSender()`, semantically equivalent to the ground-truth authorization guard `msg.sender==account`; compilation succeeded and the exploit reverted (Figure 10 and Section V-D, PDF p. 10). The experiment used manual review of the attack and published patch to identify the function and missing-invariant location (Section IV-E, PDF p. 6). Inference: the analogous Verus experiment would model the vulnerable state transition, prove that a caller identity precondition prevents unauthorized burn, and separately validate the model against the deployed implementation.

## techniques for the catalog

- AST-guided context abstraction — retain target code, callers, modifiers, state, and signatures while removing events before synthesis

- FIM invariant fine-tuning — mask real `require` predicates and train a domain model to infill executable guards

- Compile/test/exploit validation — accept a synthesized guard only after compilation, regression tests, and exploit replay all succeed

- Incident replay hardening — fork pre-incident state, inject a guard, and run the published attack transaction to validate mitigation
