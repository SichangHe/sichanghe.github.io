# A Practical Quantum Hoare Logic with Classical Variables, I
(authored by agents unless marked 🧑)
Tag: `ying2024practical`, [paper](https://arxiv.org/abs/2412.09869v4)

## scope and semantic model

Mingsheng Ying presents QHL+, a Hoare logic for quantum programs with classical variables, quantum arrays, classically parameterised unitary operations, and measurements that store outcomes in classical variables. The supplied paper is arXiv:2412.09869v4, dated 18 April 2026 (p. 1); the tag retains the initial arXiv year. The paper defines a programming language, operational and denotational semantics, an assertion language, proof rules, and a soundness theorem. Relative completeness and its proof are deferred to a companion paper (Section 1, p. 6; Section 6, p. 39).

A program state is `(σ,ρ)`, where `σ` assigns classical values and `ρ` is a partial density operator with trace at most one. Its trace carries probability from earlier measurements (Section 3.4.2, p. 15). Denotational semantics returns a multiset of terminating output states; normalization sums quantum states with the same classical state (Definition 3.4, pp. 17–18). Nontermination probability is the input trace minus the sum of output traces (equation (8), p. 19).

A cq-assertion is `(φ,A)`: “φ is a classical first-order logical formula” and “A is a quantum predicate formula” (Definition 4.7, p. 31). The quantum formula can depend on classical variables. For `{φ,A} P {ψ,B}`, total correctness bounds the input expectation by the sum of terminating output expectations whose classical states satisfy `ψ` and whose quantum postconditions are defined. Partial correctness adds the nontermination probability to that sum (Definition 5.1, p. 32). These are quantitative expectation inequalities, rather than ordinary Boolean assertions about each output.

## technique 1: typed quantum arrays and parameterised operations

what it is. A quantum-array type associates classical index tuples with quantum subsystems. A subscripted quantum variable uses classical expressions to select a subsystem (Section 2, pp. 7–9). Unitary-operation symbols have classical parameter types and quantum operand types (Section 3.1, p. 10). Measurements have quantum operand types and a classical outcome type (Section 3.2, p. 11). The paper assumes finite measurement outcome types (Section 3.4.1, p. 15). It explicitly leaves parameterised measurements out of this language (Remark 3.1, p. 11).

when to use it. The paper uses qubit slices `q[k:l]` and a classical bit array `j` to describe QFT states (Examples 2.1–2.2, pp. 7–8). Example 3.2 expresses a QFT circuit using recursive array slices and classically parameterised controlled rotations (p. 13).

how to do it. (1) Assign classical index types and quantum-array types. (2) Form subscripted variables using classical expressions. (3) Supply unitary and measurement interpretations with the required types. (4) Evaluate the parameters and subscripts in the current classical state. (5) Establish `Dist(q)` for multiple operands, so they denote distinct quantum systems. This distinctness condition appears in the operational rules for unitary operations and measurements (Table 2, pp. 16–17). It is not a general finite-array bounds condition; the paper also allows infinite index types (Section 2.1, p. 7).

Verus form. Inference: a Rust model could represent finite arrays and indices explicitly, with specifications for bounds and operand distinctness. Parameterised operations would need a mathematical model of their effect on quantum state. The paper supplies no Rust or Verus encoding.

## technique 2: paired classical and quantum assertions

what it is. Classical formulas constrain quantum formulas that may contain classical parameters and subscripts. Quantum formulas are built from atomic predicates, negation, tensor products, and Kraus-operator constructions (Definition 4.3, p. 24). Their interpretations are effects, meaning Hermitian operators between zero and identity, whenever defined (Lemma 4.1, p. 28). For a defined pure state `s`, the atomic predicate `[s]` denotes its one-dimensional projection (Definition 4.4, p. 27).

how to apply it. (1) Choose classical conditions `φ,ψ` and quantum formulas `A,B`. (2) Check that their interpretations are defined where required, including distinct operands and disjoint tensor factors. (3) Prove the classical implication `φ |= ψ`. (4) Prove the conditional operator inequality `φ |= A ≤ B`. Together these establish cq-entailment `(φ,A) |= (ψ,B)` (Definitions 4.4–4.5, pp. 27–29; Definition 4.8, p. 31). Under `φ`, the inequality relation requires either both interpretations to be undefined, or both to be defined and ordered. Thus definedness is part of this entailment relation.

paper evidence and limits. Example 5.1 specifies QFT by `{1 ≤ n, A(j,1:n)} QFT[q[1:n]] {true, B(j,1:n)}` for any classical bit array `j` (p. 33). The paper says: “Therefore, we will need to exploit effective techniques and tools for verifying the entailment between quantum predicate formulas based on classical logic in order to implement practical tools for verification of quantum programs with classical variables.” (Section 4.5, p. 31.) This states a tool-development need, rather than reporting an implemented solver.

Verus form. Inference: use classical specifications for indices and parameters, a ghost representation of quantum state, and proof lemmas for conditional operator inequalities. Preserving the paper's quantitative meaning requires modeling expectations; replacing them with arbitrary Boolean state predicates would require a separate justification.

## technique 3: measurement rule without probability-distribution substitution

what it is. `(Axiom-Meas)` reasons about a possible outcome named by a fresh classical variable `y`. It uses ordinary substitution in the precondition and adds `x = y` to the postcondition. Table 3 gives `{φ[y/x], FM(y)[q](A[y/x])} x := M[q] {φ ∧ x = y, A}` (p. 35). Here `FM(y)` supplies the outcome-specific transformation of the quantum predicate. The discussion explains why later reasoning may need to accumulate probabilities of separate outcomes (Section 5.2, pp. 34–36).

how to apply it. (1) Choose `y` outside `free(φ) ∪ cv(A) ∪ {x}`, as required by Table 3. (2) Substitute `y` for `x` in `φ` and `A`. (3) Establish the transformed quantum precondition for that outcome, including its definedness. (4) Apply the measurement axiom to obtain `φ ∧ x = y` and `A`. (5) Accumulate outcome-specific conclusions when needed.

accumulation. `(Rule-Accum1)` combines a common classical precondition, outcome-specific quantum preconditions, pairwise disjoint classical postconditions, and a common quantum postcondition. It requires a Kraus-operator domination condition, quantum operands untouched by the program, and unchanged classical variables in its parameters and subscripts. `(Rule-Accum2)` combines quantum preconditions and postconditions with common classical conditions and the same noninterference requirements (Table 3, p. 35; explanation, p. 36). Their convex special cases use nonnegative weights summing to at most one (pp. 36–37).

Verus form. Inference: prove contracts for individual measurement outcomes, then use a lemma that combines their quantitative contributions. Enumerating branches alone does not establish the required probability and operator inequalities.

## technique 4: classical Hoare rules with quantum predicates

QHL+ uses substitution for classical assignment, quantum-predicate transformations for initialization and unitary operations, and familiar sequence, conditional, consequence, and loop rules (Table 3, p. 35). The total-correctness loop rule additionally requires an integer expression `t`, a fresh integer variable `z`, and the identity quantum predicate `I` (Table 4, p. 36).

how to apply it. (1) Choose classical invariant `φ` and quantum invariant `A`. (2) Prove `{φ ∧ b,A} P {φ,A}`. (3) Apply the partial loop rule to obtain `{φ,A} while b do P {φ ∧ ¬b,A}`. (4) For total correctness, establish the invariant-body triple in total correctness, also prove `{φ ∧ b ∧ t = z,I} P {t < z,I}`, and show `φ → t ≥ 0`. The variable `z` must be absent from the variables listed in Table 4. (5) Apply consequence using a stronger precondition and a weaker postcondition: `(φ′,A′) |= (φ,A)` and `(ψ,B) |= (ψ′,B′)` justify deriving `{φ′,A′} P {ψ′,B′}` from `{φ,A} P {ψ,B}`.

Verus form. Inference: the invariant and decreasing-integer pattern can inform loop proofs in Verus. A faithful translation must still justify the quantum expectation model and the identity-predicate decrease triple.

## technique 5: compositional QFT verification

Example 5.2 proves the QFT specification in five stages (pp. 37–39). (1) Define `B*` for the intermediate QFT state and prove the final reversal triple by the unitary axiom. (2) Prove the Hadamard step. (3) Prove the controlled-rotation subprogram by induction on array length and compose it with that step. (4) Prove the recursive `QFT*` triple by induction, using sequencing and the conditional rule. (5) Compose `QFT*` with reversal to obtain the specification from Example 5.1. Appendix A.4 supplies the omitted reversal and controlled-rotation proofs (pp. 69–71).

The paper concludes: “Thus, the correctness of the circuit implementation (Table 1) of quantum Fourier transform is verified.” (Example 5.2, p. 39.) This is a mathematical derivation. Inference: the reusable pattern for verified Rust is a recursive contract, local operation lemmas, sequencing, and induction on an index interval; the quantum mathematics would need its own verified representation.

## soundness, trust, and product threat

Theorem 6.1 states that derivability implies the corresponding semantic partial or total correctness (p. 39). Its detailed proof is in Appendix A.3 (pp. 50–69). The checked revision reports: “During this process, a gap was found in the proof of the soundness theorem (Theorem 6.1) for the case of total correctness.” It then states: “In this revision, the gap has been fixed.” (Acknowledgement, p. 41.) The preceding context attributes the discovery to Lean formalization by Yuanjie Ren, Jinzheng Li, and Yidi Qi after journal publication. The conclusion still lists proof-assistant formalization and parallel/distributed extensions as research topics (p. 40); that list should be read alongside the later revision note.

Inference: a tool based on QHL+ must justify its semantic encoding, quantum-operator lemmas, classical entailments, and connection between specifications and implementation. This paper offers a logic and a worked QFT derivation, without a Rust/Verus implementation or a performance evaluation. Its applicability claims do not establish a measured productivity improvement for agent-written Rust. The most direct ideas to reuse are paired assertions, explicit measurement-outcome accumulation, and loop variants.

## techniques for the catalog

- typed quantum arrays — select quantum subsystems with classical index expressions and parameterise unitary operations
- paired cq-assertions — combine classical formulas with quantum predicate formulas and track definedness
- fresh-variable measurement rule — substitute an outcome variable and add `x = y` to the postcondition
- outcome accumulation — combine disjoint outcome conditions under Kraus domination and noninterference requirements
- Hoare composition — apply substitution, sequencing, conditionals, consequence, and loops to paired assertions
- total loop rule — establish invariant preservation and a nonnegative integer that strictly decreases
- inductive circuit verification — compose local operation triples over recursively described quantum arrays

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The axioms and proof rules for total correctness are the same except that the rule for while-loop is changed to the rule (Rule-Loop-tot) in Table 4."): read the entire paper, including references and appendices; checked every study quotation, number, section/page reference, and technique step; corrected quotations, page references, operand distinctness, measurement parameterisation, consequence direction, accumulation prerequisites, and revision context; marked Rust/Verus transfers and trust conclusions as inferences; did not independently re-prove the mathematics, inspect the Lean formalization, or validate a Rust/Verus implementation.
