# QbC: Quantum Correctness by Construction
(authored by agents unless marked 🧑)
Tag: `peduri2023qbc`, [paper](https://doi.org/10.1145/3720433)

## scope and guarantee

QbC starts from a Hoare-style specification and constructs a quantum program by replacing typed holes with increasingly concrete programs. The abstract states the goal precisely: “Here we propose Quantum Correctness by Construction (QbC): an approach to constructing quantum programs from their specification in a way that ensures correctness.” (Abstract, p. 1.) The language is a quantum while language (skip, initialization, unitary, sequence, repeat, measurement-based case and while; Definition 2.1, p. 6). Predicates are positive semidefinite operators P ⪯ I whose expectation in a state ρ is tr(Pρ) (Definition 2.6, p. 9); programs map partial density operators (trace at most one) to partial density operators. The paper proves sound and complete refinement systems for both partial and total correctness, then constructs a fair coin, teleportation, two search algorithms, probability-boosting rules, and the quantum Fourier transform (QFT) (Section 4, pp. 15–24). It also revisits a "coin toss until zero" running example (Appendix D).

## technique 1: specification holes and local refinement

what it is. A hole `{P}□{Q}` is a yet-to-be-constructed subprogram carrying a precondition and postcondition. An abstract program may contain holes; a concrete program has none (Definition 3.1, p. 12). The construction process is a sequence of local replacements. Each rule has side conditions that are implications between predicates (P ⇒ Q means P ⪯ Q in the Löwner order, Definition 2.6, p. 9); the remaining obligation is carried by the new holes the rule introduces.

when to use it. Use a hole when the desired behavior is known but implementation details are not. The paper says: “A hole is a yet-to-be-constructed program tagged with a precondition and a postcondition, such that the corresponding Hoare triple should be satisfied once the hole is filled by a program.” (Section 3.1, p. 12.)

how to do it. (1) Write the initial `{P}□{Q}`. (2) Choose a refinement rule whose side condition is provable. (3) Replace the hole by `skip` (H.skip, needs P ⇒ Q), initialization (H.init), a unitary (H.unit), a sequence of holes (H.seq), a repeat (H.repeat), a measurement case (H.case), or a while loop (HP.while); HP.split and the derived H.sw also weaken the precondition or strengthen the postcondition. (4) Continue refining holes inside composite statements with the C.* rules. (5) Stop only when no holes remain. For a sequence, choose an intermediate predicate `R` and use `{P}□{Q} ↩→ {P}□{R}; {R}□{Q}`. For a bounded repeat, choose predicates `R0 … RN`, prove `P ⇒ R0` and `RN ⇒ Q`, and make each iteration body satisfy `{Rj}□{Rj+1}` for `j` in `0 … N−1` (Definition 3.2, pp. 12–13).

paper evidence and limits. The first three rules refine to concrete statements: `H.skip`, `H.init`, and `H.unit`; the sequence, repeat, case, and while rules introduce further holes whose predicates must be chosen (Section 3.2, p. 13). Quantum case refinement has no canonical classical-style predicate choice: “In the quantum setting, there is generally no canonical choice of the predicates Pω.” (Remark 3.4, p. 14.) The paper adds: "We leave the problem of finding suitable heuristics to future work." Inference: finding useful intermediate assertions therefore remains a design task left to the human or agent.

Verus form. Inference: model a hole as a design-time specification, then implement each selected refinement as a Rust function with `requires` and `ensures`. Use `spec fn` predicates for mathematical pre/postconditions and `proof fn` lemmas for each side-condition implication. Inference: unlike QbC's density matrices, Verus will need a chosen executable or ghost representation of quantum state; the refinement idea transfers, but the paper's quantum semantics do not become Rust automatically.

## technique 2: total-correctness while refinement

what it is. Partial correctness only counts the postcondition insofar as the program terminates (Definition 2.8, p. 10). QbC's total system keeps the (H.*) and (C.*) rules and replaces `HP.while` and `HP.split` with `HT.while` and `HT.split` (Definition 3.5, p. 14). `HT.while` uses a weakly increasing sequence of predicates `Rn` (`Rn ⇒ Rn+1`) with `R0 = 0`, and requires that the limit `R = lim Rn` satisfies `P ⇒ B0(Q) + B1(R)`. `HT.split` allows arbitrary non-negative weights that need not sum to one (p. 15).

how to do it. (1) Choose a sequence `R0, R1, …` with `R0 = 0` and `Rn ⇒ Rn+1`. (2) Check that the limit `R` satisfies `P ⇒ B0(Q) + B1(R)`. (3) Refine the loop body hole `{Rn+1}□{B0(Q)+B1(Rn)}`, where `n` is a formal parameter. The authors explain the operational meaning: “if we start inside the loop and Rn holds (with some probability), then the loop terminates within n iterations in a state that satisfies Q (with at least that probability).” (Section 3.2, p. 14.)

paper evidence and limits. Theorem 3.7 proves the total rules sound, with the `HT.while` case treated in Appendix A. The paper notes that total correctness "gives stronger guarantees and in particular enables reasoning about termination" (Section 1.2, p. 4). The user still has to supply a suitable sequence and side-condition proofs. Inference: this is analogous to a Verus loop invariant plus a termination argument, but Verus's ordinary `invariant` syntax is a clause on a loop, not a callable predicate.

Verus form. Inference: use a loop with an `invariant` clause for the state relation and a `decreases` clause for a well-founded variant. Use `proof fn` lemmas to show invariant preservation and that the variant decreases. Inference: probabilistic termination and quantum measurement require a ghost model or abstraction; the paper does not provide a Verus encoding.

## technique 3: soundness and completeness of construction

what it proves. Starting from one hole and refining to a concrete program guarantees the original Hoare triple. The paper states: “if one starts with a specification, that is, a single hole {P}□{Q}, and repeatedly refines to construct a concrete program S (i.e., a program without holes), then the constructed program satisfies the initial specification” (Section 3.3, p. 15). Theorems 3.6 and 3.7 establish this for partial and total correctness by induction over refinement-chain length (proofs in Appendix A, with the while rules the most delicate).

Completeness is the converse: every concrete program satisfying `{P} S {Q}` can be obtained by finitely many refinements from `{P}□{Q}` (Theorems 3.8 and 3.9, Section 3.4, p. 15; proved by induction on program structure in Appendix B). This is a metatheoretic result, not a benchmark number. It says the rule language loses no correct programs in the modeled quantum while language. The paper qualifies it: completeness "is relative to the theory of complex numbers, as defined in Ref. [80], which is also assumed in all prior works" (Section 1.1, p. 3), and the results do not depend on the choice of allowed unitaries or measurements (Remark 2.2, p. 7).

Verus form. Inference: encode each refinement rule as a lemma whose postcondition is the parent specification when the side conditions hold. Inference: a final Verus proof corresponds to soundness for one concrete Rust program; completeness would require a theorem about all programs and is outside normal Verus application. Inference: the trusted base includes the state model, predicate definitions, rule implementation, and Verus/SMT translation.

## technique 4: derive algorithms from natural specifications

The examples show how choices in intermediate predicates expose algorithm structure. For the fair coin, the specification is `{I/2}□{|x⟩⟨x|}` for `x ∈ {0,1}`; after `H.seq` and `H.init`, the intermediate predicate `R = H|x⟩⟨x|H` (the weakest precondition of the Hadamard for that postcondition) lets `H.unit` produce `q := |0⟩; q := H(q)` (Section 4.1, pp. 15–16). For teleportation, the shared entangled pair `a,b` is part of the precondition, not something the program prepares. `H.seq` and `H.case` split the program into Alice's part, a measurement of `q,a`, and Bob's outcome-dependent part; solving the side conditions gives Alice's unitary `V = (H ⊗ I)CNOT` and Bob's corrections `U(x,y) = X^x Z^y` (Section 4.2, pp. 16–18). Search starts from the success-probability specification `{pI}□{Σ|x⟩⟨x|}` over solutions. Construction I prepares the uniform superposition and gets `p = T/N`; Construction II strengthens the postcondition to the good state with `H.sw`, rotates toward it with `H.repeat`, builds each rotation from two reflections, and arrives at Grover's algorithm with success probability at least `1 − T/N` and `O(√(N/T))` queries (Section 4.3, pp. 19–21). The conclusion says the two programs come "by making a different choice at a key step" (Section 5, p. 25).

The authors describe the method: “In each case, we start from their intuitive specification and use one key algorithmic idea or refinement step at a time.” (Section 1.1, p. 3.) They report: “Particularly for the more complicated algorithms, we find that the QbC approach allows naturally discovering program detail on the fly, without explicitly using a priori knowledge of the final algorithms.” (Section 4, p. 15.) The evidence is worked examples done by hand; the paper reports no user study or measurements. Inference: the technique is to leave algorithmic detail open, pick one justified intermediate goal at a time, and let the side condition reveal the next operation. Inference: this is relevant to an agent that searches over implementation plans while retaining a proof obligation at every step.

Verus form. Inference: represent an abstract plan as a Rust enum or ghost state, and make each refinement function consume one plan node and return a more concrete node with a proof lemma. Inference: keep executable code separate from proof-only search; a `proof fn` can certify a selected transformation, but cannot run at product runtime.

## technique 5: probability boosting rules

QbC adds reusable higher-level rules rather than forcing every repetition proof to be rebuilt (Section 4.4, p. 22). `H.boostRep` reduces a hole `{pI, I}□{Q, I}` with success probability `p` to a body hole `{εQ⊥, Q⊥}□{Q, I}` with smaller `ε ∈ (0,p)`, wrapped in `repeat ⌈log_(1−ε)(1−p)⌉ do if meas q with Q⊥ then … end end`. `H.boostWhile` reduces the probability-one specification `{I}□{Q}` to the same body hole inside `while meas q with Q⊥ do … end`, for `ε ∈ (0,1)`. Both need a projection `Q` with complement `Q⊥ = I − Q`. The paper's stated conditions for boosting are that the program terminates almost surely and the postcondition is a projection. Both rules are totally correct; Theorem 4.1 states them and Appendix C proves them (using H.repeat, H.if and HP.split for the first, HT.while and HT.split for the second).

Inference: the pattern is a proof-producing combinator: once a subroutine has a contract, a generic wrapper derives a stronger success contract. In Verus form, encode the success measure in a ghost numeric model, prove the wrapper's arithmetic probability bound in a `proof fn`, and keep the runtime retry loop's termination variant explicit. Verus cannot establish the quantum projection semantics without a trusted model.

## technique 6: recursive decomposition of QFT

For QFT, QbC specifies the operation on half of a maximally entangled input state `|Φn+⟩`, so correctness on that input characterizes the unitary (Section 4.5, p. 22). The base case `S1` refines to a Hadamard via `H.unit`. For `k>1`, the authors use `H.seq` with the postcondition of `S(k−1)` as the intermediate predicate, so the first hole is `S(k−1)` (refined recursively). The remaining hole is refined into a sequence of SWAPs that moves qubit `k` to the front, then controlled phase unitaries `CRz` on qubits `q2 … qk` controlled by `q1`, and a final Hadamard on `q1` (Section 4.5, pp. 23–24). Inference: this is a reusable recursion pattern: prove the smaller specification, rearrange state, add controlled corrections, and close with a basis change.

Inference: in Verus, represent the recursive contract over an index `k`, use `requires 1 <= k <= n`, and prove a lemma that the `k` construction preserves the stated state relation. The quantum algebra and matrix equality remain modeled assumptions unless a suitable verified library is supplied.

## evidence, trust, and limits

The paper's evidence is formal: soundness and completeness theorems, induction proofs in Appendices A–B, the boosting proof in Appendix C, and worked constructions. The data-availability statement says: "We do not provide an artifact, but note that [65] gives a web-based prototype." (Section 6, p. 25.) On checking side conditions, the paper says of that prototype: “The conditions of refinement are checked using a decision procedure on finite-sized complex matrices to verify the Löwner order.” For general programs it proposes future work: "integrate QbC with a proof assistant such as Coq or Lean to handle proof obligations of side conditions" (Section 5, p. 25).

## techniques for the catalog

- specification holes — carry preconditions and postconditions on unfinished programs and refine them locally
- partial-correctness refinement — use sequence, initialization, unitary, repeat, case, and while rules with explicit side conditions
- total-correctness refinement — use increasing predicate sequences and termination-aware while rules
- soundness and completeness theorems — guarantee every refinement result and characterize all correct programs in the language
- proof-guided algorithm derivation — discover concrete algorithms by selecting intermediate predicates from natural specifications
- probability-boosting combinators — turn a subroutine's success contract into stronger success through verified repetition
- recursive QFT construction — derive a large circuit from smaller specifications, swaps, controlled phases, and a closing Hadamard
