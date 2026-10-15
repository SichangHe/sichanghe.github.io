# QbC: Quantum Correctness by Construction
(authored by agents unless marked 🧑)
Tag: `peduri2023qbc`, [paper](http://arxiv.org/abs/2307.15641v3)

## scope and guarantee

QbC starts from a Hoare-style specification and constructs a quantum program by replacing typed holes with increasingly concrete programs. The abstract states the goal precisely: “Here we propose Quantum Correctness by Construction (QbC): an approach to constructing quantum programs from their specification in a way that ensures correctness.” (Abstract, p. 1.) The language is a quantum while language, with predicates over density operators and quantum measurements. The paper proves both partial and total correctness refinement systems, then demonstrates coin tossing, teleportation, search, probability boosting, and the quantum Fourier transform (QFT).

## technique 1: specification holes and local refinement

what it is. A hole `{P}□{Q}` is a yet-to-be-constructed subprogram carrying a precondition and postcondition. An abstract program may contain holes; a concrete program has none (Section 3.1, pp. 12–13). The construction process is a sequence of local replacements whose side conditions are logical implications or smaller Hoare obligations.

when to use it. Use a hole when the desired behavior is known but implementation details are not. The paper says: “A hole is a yet-to-be-constructed program tagged with a precondition and a postcondition, such that the corresponding Hoare triple should be satisfied once the hole is filled by a program.” (Section 3.1, p. 12.)

how to do it. (1) Write the initial `{P}□{Q}`. (2) Choose a refinement rule whose side condition is provable. (3) Replace the hole by `skip`, initialization, a unitary, a sequence of holes, a repeat, a measurement case, or a while loop. (4) Continue refining holes inside composite statements. (5) Stop only when no holes remain. For a sequence, choose an intermediate predicate `R` and use `{P}□{Q} ↦ {P}□{R}; {R}□{Q}`. For a bounded repeat, choose predicates `R0 … RN`, prove `P ⇒ R0` and `RN ⇒ Q`, and make each iteration body satisfy `{Rj}□{Rj+1}` (Definition 3.2, pp. 12–14).

paper evidence and limits. The first three rules are concrete choices: `H.skip`, `H.init`, and `H.unit`; the paper explains that sequence, repeat, case, and while rules then expose the necessary intermediate predicates (Section 3.2, pp. 13–14). Quantum case refinement has no canonical classical-style predicate choice: “In the quantum setting, there is generally no canonical choice of the predicates Pω.” (Remark 3.4, p. 14.) Thus finding useful intermediate assertions remains a design task.

Verus form. Inference: model a hole as a design-time specification, then implement each selected refinement as a Rust function with `requires` and `ensures`. Use `spec fn` predicates for mathematical pre/postconditions and `proof fn` lemmas for each side-condition implication. Inference: unlike QbC's density matrices, Verus will need a chosen executable or ghost representation of quantum state; the refinement idea transfers, but the paper's quantum semantics do not become Rust automatically.

## technique 2: total-correctness while refinement

what it is. Partial correctness only relates terminating executions to the postcondition. QbC's total system replaces the ordinary while and split rules with `HT.while` and `HT.split`. `HT.while` uses a weakly increasing sequence of predicates `Rn`, starts at `R0 = 0`, and requires the limit `R` to imply the loop condition needed for termination and the postcondition (Definition 3.5, pp. 14–15).

how to do it. (1) Choose a sequence `R0, R1, …` such that `Rn ⇒ Rn+1`. (2) Show each unrolling reaches the postcondition with the stated probability. (3) Establish that the limit satisfies the while side condition. (4) Refine the body with `{Rn+1}□{B0(Q)+B1(Rn)}`. The authors explain the operational meaning: “if we start inside the loop and Rn holds (with some probability), then the loop terminates within n iterations in a state that satisfies Q (with at least that probability).” (Section 3.2, p. 15.)

paper evidence and limits. The total rules are proved sound, including termination; they are stronger than the partial system. They still require a mathematically suitable sequence and side-condition proofs. Inference: this is analogous to a Verus loop invariant plus a termination argument, but Verus's ordinary `invariant` syntax is a clause on a loop, not a callable predicate.

Verus form. Inference: use a loop with an `invariant` clause for the state relation and a `decreases` clause for a well-founded variant. Use `proof fn` lemmas to show invariant preservation and that the variant decreases. Inference: probabilistic termination and quantum measurement require a ghost model or abstraction; the paper does not provide a Verus encoding.

## technique 3: soundness and completeness of construction

what it proves. Starting from one hole and refining to a concrete program guarantees the original Hoare triple. The paper states: “if one starts with a specification, that is, a single hole {P}□{Q}, and repeatedly refines to construct a concrete program S (i.e., a program without holes), then the constructed program satisfies the initial specification” (Section 3.3, p. 15). Theorems 3.6 and 3.7 establish this for partial and total correctness by induction over refinement-chain length.

Completeness is the converse: every concrete program satisfying `{P} S {Q}` can be obtained by finitely many refinements from `{P}□{Q}` (Theorems 3.8 and 3.9, Section 3.4, pp. 15–16). This is a metatheoretic result, not a benchmark number. It says the rule language loses no correct programs in the modeled quantum while language.

Verus form. Inference: encode each refinement rule as a lemma whose postcondition is the parent specification when the side conditions hold. Inference: a final Verus proof corresponds to soundness for one concrete Rust program; completeness would require a theorem about all programs and is outside normal Verus application. Inference: the trusted base includes the state model, predicate definitions, rule implementation, and Verus/SMT translation.

## technique 4: derive algorithms from natural specifications

The examples show how choices in intermediate predicates expose algorithm structure. For the fair coin, the specification is `{I/2}□{|x⟩⟨x|}` for `x ∈ {0,1}`; refining with `H.unit` chooses a Hadamard gate because its conjugation maps the desired projection (Section 4.1, pp. 16–17). Teleportation is refined by preparing entanglement, measuring, and applying classically controlled corrections (Section 4.2, pp. 17–19). Search starts from a success-probability specification and yields both a random-sampling construction and Grover's construction by different choices at a key refinement (Section 4.3, pp. 19–22).

The practical technique is to leave algorithmic detail open, select one mathematically justified intermediate goal at a time, and let the side condition reveal the next operation. The authors report: “We find that in these examples, the QbC approach allows naturally discovering program detail on the fly, without explicitly using a priori knowledge of the final algorithms.” (Section 4, p. 16.) Inference: this is relevant to an agent that searches over implementation plans while retaining a proof obligation at every step.

Verus form. Inference: represent an abstract plan as a Rust enum or ghost state, and make each refinement function consume one plan node and return a more concrete node with a proof lemma. Inference: keep executable code separate from proof-only search; a `proof fn` can certify a selected transformation, but cannot run at product runtime.

## technique 5: probability boosting rules

QbC adds reusable higher-level rules rather than forcing every repetition proof to be rebuilt. `H.boostRep` reduces construction of success probability `p` to a smaller `ε` by repeating a terminating subprogram and measuring the success projection; `H.boostWhile` repeats until success for a probability-one specification. The rules require a projection `Q`, an orthogonal complement `Q⊥ = I − Q`, and are totally correct (Section 4.4, pp. 22–23). The paper gives the explicit repetition count `ceil(log_(1−ε)(1−p))` and proves both rules in Theorem 4.1.

Inference: the pattern is a proof-producing combinator: once a subroutine has a contract, a generic wrapper derives a stronger success contract. In Verus form, encode the success measure in a ghost numeric model, prove the wrapper's arithmetic probability bound in a `proof fn`, and keep the runtime retry loop's termination variant explicit. Verus cannot establish the quantum projection semantics without a trusted model.

## technique 6: recursive decomposition of QFT

For QFT, QbC specifies the operation on a maximally entangled input, so correctness on that input characterizes the unitary. The base case refines `QFT1` to a Hadamard. For `k>1`, the authors use `H.seq` with the `QFT(k−1)` postcondition as an intermediate goal, then refine the remaining hole into swaps, controlled phase gates, and a final Hadamard (Section 4.5, pp. 23–24). This is a reusable recursion pattern: prove a smaller specification, rearrange state, add controlled corrections, and close the remaining phase relation.

Inference: in Verus, represent the recursive contract over an index `k`, use `requires 1 <= k <= n`, and prove a lemma that the `k` construction preserves the stated state relation. The quantum algebra and matrix equality remain modeled assumptions unless a suitable verified library is supplied.

## evidence, trust, and limits

The paper's evidence is formal: soundness and completeness theorems, induction proofs in Appendices A–B, and worked constructions. It provides no implementation artifact; its data-availability statement says so, while pointing to a separate web prototype (Section 6, p. 25). The assertion side conditions are checked mathematically; the paper notes a finite-complex-matrix decision procedure for fixed qubit counts and suggests Coq or Lean to mechanize general proof obligations (Section 5, p. 25).

Inference: the threat to agent-written verified Rust is moderate. QbC's key benefit is making construction choices produce local proof obligations, but it does not validate the initial specification, the chosen assertion semantics, the quantum runtime, or a translation into Rust. VL should reuse the hole/refinement discipline and reusable proof-producing combinators, while avoiding a new generic “correctness by construction” slogan without a concrete state model and measured proof obligations. Existing QbC already covers post-hoc versus by-construction complementarity; VL should focus on its Rust/Verus boundary and trusted implementation assumptions.

## techniques for the catalog

- specification holes — carry preconditions and postconditions on unfinished programs and refine them locally
- partial-correctness refinement — use sequence, initialization, unitary, repeat, case, and while rules with explicit side conditions
- total-correctness refinement — use increasing predicate sequences and termination-aware while rules
- soundness and completeness theorems — guarantee every refinement result and characterize all correct programs in the language
- proof-guided algorithm derivation — discover concrete algorithms by selecting intermediate predicates from natural specifications
- probability-boosting combinators — turn a subroutine's success contract into stronger success through verified repetition
- recursive QFT construction — derive a large circuit from smaller specifications, swaps, controlled phases, and a closing gate
Checked 2026-10-15 against paper peduri2023qbc: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
