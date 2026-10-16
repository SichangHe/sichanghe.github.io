# FLAMES: Fine-tuning LLMs to Synthesize Invariants for Smart Contract Security
(authored by agents unless marked 🧑)
Tag: `eshghie2025flames`, [paper](https://doi.org/10.1145/3597503.3623302)

## what the paper proves and measures

FLAMES is a pipeline that turns Solidity source into executable `require` guards. Its central claim is that domain-adapted fill-in-the-middle fine-tuning can produce deployable preconditions and postconditions without vulnerability labels or natural-language specifications. The paper evaluates compilation, semantic relation to human-written invariants, exploit replay, and one real incident. The abstract reports 4,835/5,000 (96.7%) compilable hardened contracts, 2,226/5,000 (44.5%) exact or semantically equivalent invariants, and 22/108 (20.4%) exploits reverted while functionality tests passed (Abstract, PDF p. 1). These denominators are the test-set or benchmark totals; they are not a claim that 96.7% of arbitrary contracts are safe.

The trusted parts are the Solidity compiler, SINDI's SMT/rewrite equivalence checks, functional tests, exploit proof-of-concepts, the Ethereum fork and preserved storage for the incident replay, the base model and fine-tuning code, and the correctness of the supplied ground-truth invariants. The paper explicitly warns that “A high compilation rate is a necessary condition for deployable hardening but not a guarantee of semantic correctness or security” (Section IV-B, PDF p. 6). Inference: for VeruLaw, this separates syntactic generation from a Verus proof: a compiling Rust guard is useful only after a Verus contract states the property and the verifier proves it.

## technique 1: AST-guided context abstraction

What it is. FLAMES parses a contract into an abstract syntax tree, identifies a target function and insertion point, and removes irrelevant code so the model fits its context window. The paper states: “F LAMES abstracts the smart contract as follows: 1) it retains the full body of the function containing the current invariant ... 5) it keeps state variable declarations, and 6) it removes event definition” (Section II-B, PDF p. 3). The omitted item 2 is caller function definitions, item 3 applied modifiers, and item 4 signatures of other functions.

When to use it. Use this when the whole source exceeds the model window or when unrelated code would distract synthesis. The authors report that 31.3% of DISL contracts exceed 4,096 tokens (Section II-B, PDF p. 3), so abstraction is a capacity requirement, not an optional optimization.

How to do it.
1. Parse Solidity into an AST (Section II-B).
2. Locate the target function and invariant location (Section II-B).
3. Keep that function body, its callers, relevant modifiers, state declarations, and signatures of other functions; remove events (Section II-B).
4. Insert `require(<FILL_ME>)` at the chosen location (Section II-D, PDF p. 4).
5. Generate a predicate, replace the placeholder, reconstruct full source, and compile (Section II-D).

Verus form. Inference: model the same idea as a Rust function whose executable body is kept intact while proof code supplies a precondition or postcondition. Use `requires` and `ensures` on the function, and keep only the state and helper specifications needed by the target proof. A Verus predicate is a specification expression, not an injected runtime `require`; if runtime rejection is required, write an ordinary Rust check and prove that executions passing the check satisfy the contract. The Solidity AST slicing algorithm itself does not carry over because Rust parsing, ownership, and module resolution differ.

Evidence and limits. The context abstraction is evaluated indirectly through the 4,096-token setup and the compilation/quality results. The paper says very large contracts can still exceed the limit and yield truncated or incorrect invariants (Section VI, PDF p. 12). Inference: abstraction can also hide aliasing or cross-function facts needed for a Verus proof, so a generated guard must be checked against the complete Rust state model.

## technique 2: fill-in-the-middle supervised fine-tuning

What it is. Training samples are real `require(<invariant>)` statements mined from verified contracts. FLAMES replaces the invariant with `<FILL_ME>` while retaining surrounding abstract code; the objective is to reconstruct the missing predicate. The implementation uses CodeLlama2-7B, 4-bit quantization, QLoRA/LoRA adapters, AdamW, learning rate 3 × 10^-4, batch size 32, one epoch, and a 4,096-token context (Table I, PDF p. 4).

How to do it.
1. Collect verified Solidity source; verification means uploaded source compiles to the exact on-chain bytecode (Section III-A, PDF p. 5).
2. Split raw records into files and deduplicate with a 90% Jaccard threshold; the resulting DISL set has 514,506 unique Solidity files (Section III-A, PDF p. 5).
3. Extract `require` statements and choose one invariant per sample (Section III-A and IV-A).
4. Build the abstract context and replace the selected expression with `<FILL_ME>` (Section II-C).
5. Fine-tune with FIM using QLoRA/LoRA; the released variants use 20,000 or 100,000 samples (Table I and IV-A).
6. At inference, mask one location at a time, generate the Boolean predicate, and inject it into the full contract (Section II-D).

Evidence. On 5,000 DISL-HARD-INV invariants, CodeLlama compiled 3,130/5,000 (62.6%), FLAMES-20k 3,348/5,000 (67.0%), and FLAMES-100k 4,835/5,000 (96.7%) (RQ1, Figure 6, PDF p. 7). SINDI classifies exact match, equivalent, synthesized stronger, ground-truth stronger, or inconclusive by checking mutual or one-way logical implication (Section IV-C). FLAMES-100k produced 2,226/5,000 equivalent cases versus 1,176/5,000 for the baseline (Conclusion, PDF p. 13).

Failure assumptions. The authors report occasional `require(false)` and `require(true)` outputs; `false` always reverts and `true` has no effect (Section VI, PDF p. 12). The 100k model still produced 20 trivial-false cases. Inference: these outputs require a semantic sanity check before accepting generated Rust specifications or guards.

## technique 3: exploit-oriented validation loop

What it is. FLAMES validates a candidate guard by compiling the hardened contract, running existing functional tests, and replaying the ground-truth exploit. A task counts as successful only if all three conditions hold. The protocol is explicit: “If the hardened contract compiles, passes all functional tests, and successfully stops the exploit, the hardening task is considered successful” (Section IV-D, PDF p. 7).

How to do it.
1. Select a vulnerable contract and exploit PoC from SB-Heist (108 contracts) (Section IV-D).
2. Synthesize guards at precondition, postcondition, or both locations, using single-turn or multi-turn inference (Section IV-D).
3. Compile the modified contract with its original compiler configuration (Section IV-B and IV-D).
4. Run functional regression tests (Section IV-D).
5. Run the ground-truth exploit and count success only when the exploit is stopped and tests pass (Section IV-D).

Results. Under multi-turn inference, FLAMES-20k stopped 22/108 exploits with pre+post guards; FLAMES-100k stopped 22/108 with postconditions; CodeLlama stopped 16/108, 10/108, and 13/108 for pre, post, and pre+post respectively (Table IV, PDF p. 10). Functionality preservation was 209/324 (64.5%) for FLAMES-20k and 220/324 (67.9%) for FLAMES-100k, compared with 134/324 (41.3%) for CodeLlama (Section V-C, PDF p. 10). These are candidate invariant/location combinations, not unique contracts.

Verus form. Inference: replace exploit replay with a Verus proof harness. Express the safety property as `ensures` on the Rust operation, use `requires` for caller assumptions, and prove a regression lemma for allowed behavior. For stateful or concurrent code, encode transitions and invariants using Verus state-machine constructs documented in the Verus transition-system notes. Runtime exploit replay remains useful evidence but is not a proof of all traces.

## technique 4: real-incident hardening

FLAMES reproduces the June 2024 APEMAGA attack on an Ethereum fork at the block before the attack, preserves storage, replaces the token runtime, and runs the published exploit script (Section IV-E, PDF p. 8). The model generated `account == msg.sender()`, semantically equivalent to the ground-truth authorization guard; compilation succeeded and the exploit reverted (Figure 10 and RQ4, PDF pp. 11–12). Inference: the analogous Verus experiment would model the vulnerable state transition, prove that a caller identity precondition prevents unauthorized burn, and separately validate the model against the deployed implementation.

## what VL should retain and what it should not redo

The reusable ideas are AST-based slicing, FIM training on real contracts, explicit semantic-equivalence categories, and a three-part compile/test/exploit gate. Inference: VL should reuse the gate shape but replace Solidity compilation and exploit replay with Verus verification plus executable regression tests. FLAMES does not prove completeness: unchecked low-level calls, front-running, and “other” vulnerabilities all had zero successful mitigations in its table (Table IV, PDF p. 10), and 22/108 is a minority of exploits. The main product threat is false confidence from compilable or functionality-preserving guards that are orthogonal to the exploit; the reentrancy example in Figure 9 demonstrates this failure (Section V-C, PDF p. 10).

## techniques for the catalog

- AST-guided context abstraction — retain target code, callers, modifiers, state, and signatures while removing events before synthesis

- FIM invariant fine-tuning — mask real `require` predicates and train a domain model to infill executable guards

- Compile/test/exploit validation — accept a synthesized guard only after compilation, regression tests, and exploit replay all succeed

- Incident replay hardening — fork pre-incident state, inject a guard, and run the published attack transaction to validate mitigation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
