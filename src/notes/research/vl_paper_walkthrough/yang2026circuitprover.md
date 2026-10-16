# CircuitProver: Agentic Lean 4 Theorem Proving with Reusable Circuit Proof Library for Hardware Verification
(authored by agents unless marked 🧑)
Tag: `yang2026circuitprover`, [paper](http://arxiv.org/abs/2607.27259v1)

## problem and architecture
CircuitProver verifies parameterized Chisel hardware by translating implementation and natural-language specification into executable Lean 4 models, having an agent construct proofs through Lean feedback, and storing successful proof knowledge for reuse. The paper contrasts this with instance-by-instance model checking: “CircuitProver proves parameterized correctness in Lean 4 and accumulates reusable proof knowledge, while traditional model checking verifies instantiated designs independently.” Its target theorem is generally ∀ n, Spec ≡ Impl for all legal parameters.

Inference: the transferable VL idea is proof accumulation: preserve reusable invariants and lemmas as checked artifacts, while preserving natural-language guidance only as a hint. A Verus adaptation must store Verus-valid lemmas/contracts, not trust an agent’s summary of a proof.

## technique 1: hardware auto-formalization
Phase I translates a Chisel design D and natural-language specification S into Lean implementation LD and specification LS. The parser handles a subset of Chisel, including parameter structures, state, initialization, and step functions. The paper’s counter example defines `Params` with `n : Nat`, a `State` containing `BitVec p.n`, an `init` state, and a `step` function. The specification is a proposition relating reset, enable, and next-state behavior for every time t.

Steps: parse typed Chisel AST; construct Lean parameter and state types; define initial state and transition; formalize the natural-language recurrence as a proposition; generate a theorem scaffold comparing implementation and specification. The paper notes that “CircuitProver automatically formalizes hardware implementations and specifications into executable Lean 4 models.”

Inference: in Verus, write executable Rust state and transition functions, then `spec fn` predicates for the specification and `ensures` contracts for the theorem. Verus syntax and semantics differ from Lean; the paper’s dependent types and Lean kernel checking do not carry over automatically. The specification remains a trusted modeling choice in either system.

## technique 2: iterative agentic theorem proving
Given LD, LS, and a generated proof scaffold P, the agent repeatedly edits a Lean proof, invokes Lean, and interprets proof states and errors. The paper formalizes this as Fproof : (LD, LS, P) → Π, where Π is a machine-checked proof accepted by the Lean kernel. On failure the agent may revise the plan, add lemmas, strengthen invariants, or adjust assumptions. The paper states, “All generated proof steps are checked by the Lean kernel, ensuring that only formally verified proofs are accepted.”

Steps in the workflow: create a proof plan; construct a scaffold; invoke Lean; inspect diagnostics; select or create a lemma; revise the proof; repeat until all obligations discharge. The workflow can use either single-step induction or invariant-based proofs. Inference: Verus can use a corresponding loop of editing Rust proof code, running Verus, and reacting to diagnostics. Use only constructs documented for Verus, such as `requires`, `ensures`, `invariant`, `assert`, `assert forall`, `spec fn`, and proof functions/lemmas in proof contexts. A proof function is erased and cannot be called as runtime code.

## technique 3: reusable proof guidance and theorem libraries
CircuitProver stores two complementary libraries. The Proof Guidance Library preserves successful interaction knowledge as natural-language strategies, while the Lean-checked theorem library stores machine-checked lemmas. Future agents retrieve both when facing related tasks. This addresses the paper’s claim that ordinary theorem proving loses useful reasoning once a proof is accepted.

The carry-skip adder case study illustrates a reusable decomposition. Phase 1 names the block operation, fold step, and initial state. Phase 2 proves each block’s low sum and carry equations. Phase 3 uses a fold read-back lemma and radix closure lemma to lift block facts to full width. Phase 4 uses carry equality, reverse-Horner rewriting, and record extensionality to prove output equality. The paper records the resulting reusable insight: “when every bit in a block satisfies Ai ⊕ Bi = 1, the two operand slices sum to 2b − 1. The outgoing carry therefore equals the incoming carry, which justifies the carry-skip path.”

Inference: for Verus, save proved lemmas about state transitions, sequence folds, and arithmetic packing in modules that later proofs can import. Store agent prose as guidance only; the acceptance criterion remains a Verus proof. Avoid inventing a Lean-style theorem-library interface where Verus does not provide one.

## evidence and denominators
Across 63 benchmark tasks, CircuitProver solved 63/63. The matched vanilla agent, using the same model, Lean model, specification, and scaffold but no reusable libraries or hardware guidance, solved 58/63 (92.1%). The abstract reports “reducing proof length by 16.3% and verification time by 23.2%.” Table 1’s full-benchmark averages are over successfully solved tasks: CircuitProver averages 506.2 seconds, 108.6 proof LoC, 61.7K output tokens, and 4.6 rounds; vanilla averages 658.9 seconds, 129.8 LoC, 66.0K tokens, and 9.2 rounds. These are not per-all-task averages, and token averages cover different solved subsets.

The 2×2 ablation separates guidance from theorem reuse. With guidance fixed, adding the library raises within-40-round coverage from 60 to 63 tasks; without guidance, it raises 58 to 63. With the library fixed, guidance raises round-10 coverage from 53 to 56 and reduces rounds for full coverage from 29 to 18. Model scaling changes solved tasks from 31/63 (Haiku 4.5), 47/63 (Sonnet 4.6), 60/63 (Sonnet 5), to 63/63 (Opus 4.8). These comparisons use the same 63-task benchmark but different solved-task subsets for cost averages.

## what is proved, trusted, and assumed
Lean kernel checks establish only the formalized Lean theorem. Trust remains in Chisel-to-Lean parsing, the natural-language specification, Lean and its libraries, and any unsupported Chisel constructs. The prototype runs Lean 4 v4.29.0 and supports only a subset of Chisel; full industrial RTL coverage is future work. Inference: Verus similarly trusts its verifier, solver, Rust compiler/erasure, external APIs, and the correctness of the written contract. Reusable lemmas can amplify a wrong abstraction if the specification is wrong.

Inference: threat to VL is moderate to high for proof maintenance and agent scalability: the library can reduce repeated proof search and preserve hard-won invariants. It does not prove that an agent-generated specification matches product intent, nor does it remove the need for model-specific proof engineering. What VL should not redo is unstructured proof retry without a persistent checked-lemma store; the paper already quantifies the cost of rediscovery.

## techniques for the catalog
- auto-formalization — translate parameterized implementations and specifications into executable theorem-prover models
- feedback-driven proving — iteratively edit proof scaffolds using compiler/prover states until the kernel accepts the proof
- reusable proof libraries — distill checked lemmas and separate natural-language strategies for retrieval on related tasks
- parameterized verification — prove one symbolic theorem for all legal design parameters instead of checking instances separately
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
