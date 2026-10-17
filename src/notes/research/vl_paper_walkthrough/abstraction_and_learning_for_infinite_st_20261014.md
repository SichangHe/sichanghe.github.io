# Abstraction and Learning for Infinite-State Compositional Verification
(authored by agents unless marked 🧑)
Tag: `giannakopoulou2013abstraction`, [paper](https://doi.org/10.4204/EPTCS.129.13) (DOI from the paper text, EPTCS 129, 2013, pp. 211–228)

## scope
The paper combines assume-guarantee reasoning, predicate abstraction, counterexample-guided refinement, and Angluin’s L* learning to verify or refute compositions with infinite-state components. A component M satisfies property P under assumption A when every environment satisfying A makes the composition satisfy P. The basic rule is: prove ⟨A⟩M1⟨P⟩ and prove ⟨true⟩M2⟨A⟩, then conclude ⟨true⟩(M1‖M2)⟨P⟩ (Sections 2.2 and 4, pp. 213–214, 218). The authors explicitly state a limitation: “At the present time, we are not able to perform extensive experimental evaluation of the framework.” (Conclusion, p. 226)

## technique: assume-guarantee decomposition

what it is and when to use it

Replace one monolithic reachability proof with local proofs about components and an environment assumption. Use it when a composition is too large to verify directly. The paper says the assumption should be “(much) smaller than M2” (Section 2.2.1, p. 214).

how to apply it

1. Model components as communicating state machines and property P as a deterministic safety machine; reduce satisfaction to reachability of an error state. (Sections 2.1–2.2, pp. 212–213)
2. Choose an assumption automaton A over the actions shared with the environment. (Section 2.2, p. 213)
3. Check ⟨A⟩M1⟨P⟩ and ⟨true⟩M2⟨A⟩. If both hold, apply Rule ASYM to conclude the property for M1‖M2. (Section 2.2, pp. 213–214)
4. If a premise fails, analyze its counterexample to decide whether it shows a real error or an inadequate assumption (or, in the infinite-state case, a spurious abstract trace). (Sections 3.1 and 4.1, pp. 216–220)

The paper characterizes the weakest assumption by safety and permissiveness: “These two conditions essentially ensure that ∀E : M k E |= P iff E |= Aw .” (Section 2.2, p. 213)

Verus form (Inference)

Represent each Rust component’s abstract interface and state predicate with `spec fn`; prove local transition invariants with `requires`, `ensures`, and `proof fn` lemmas. Encode the composition theorem as a lemma that combines component contracts under an explicit environment assumption. Verus proves deductive invariants, while automaton reachability and language inclusion may remain external checks.

what evidence shows it works and limits

The paper states that Rule ASYM is sound and complete, with short proofs (Section 2.2.1, p. 214). It says the learning framework “has been demonstrated on checking flight software models, where it achieved significant savings in terms of time and memory, and in some cases it was able to terminate while the monolithic (non-compositional) verification ran out of time and memory resources” (Section 3.3, p. 217), but gives no numbers here. Manual assumption construction is “highly non-trivial” (Section 2.2.1, p. 214), motivating learning.

## technique: may/must predicate abstraction

what it is and when to use it

Map infinite concrete states to Boolean valuations of finitely many predicates. A may abstraction over-approximates behavior for proving safety; a must abstraction under-approximates behavior for finding real violations or checking permissiveness.

how to apply it

1. Select predicates over program variables and map each concrete state q to the predicates true in q. (Section 2.3, p. 214)
2. Add a may transition when some concrete state in the source abstract state can make the concrete transition; add a must transition when every concrete source state has a successor in the target abstract state. (Section 2.3, p. 214)
3. Use the inclusion `L(Cmust) ⊆ L(C) ⊆ L(Cmay)` to interpret under- and over-approximation. (Section 2.3, p. 215)
4. Check assume-guarantee premises on may abstractions. Analyze each abstract counterexample by symbolic simulation on the concrete component. (Section 4, pp. 218–219)
5. If the trace is spurious, refine predicates with weakest-precondition calculations and repeat. (Section 4.1, pp. 219–220)

The paper states, “The may abstraction represents an over-approximation; it consists of all concrete behaviors of the concrete component but it may also contain additional, spurious ones.” (Section 2.3, p. 215)

Verus form (Inference)

Implement predicates as pure specifications over Rust state and prove abstraction soundness lemmas connecting concrete transitions to abstract transitions. A may abstraction can justify an invariant when the abstract proof succeeds; a failed abstract trace requires a concrete simulation lemma before treating it as a bug. A must abstraction needs existential witness states and is generally harder to encode directly in executable Rust.

what evidence shows it works and limits

The correctness argument is the language-inclusion relation and the implication from may-premise proofs to concrete-premise proofs. Spurious counterexamples are expected; refinement is required. The paper says abstraction refinement “may not always terminate” for infinite-state components, but converges if the component has a finite bisimulation quotient (Section 4.2, p. 220). It gives no broad benchmark.

## technique: L* learned assumptions with counterexample teacher

what it is and when to use it

Learn a minimal DFA for the weakest or sufficient assumption by membership queries and counterexamples instead of writing A manually. Inference: it fits when the needed assumption is a regular language over a finite interaction alphabet, since L* learns regular languages (Section 2.4, p. 215).

how to apply it

1. Let L* ask whether a finite interaction string s belongs to the assumption language by checking ⟨s⟩M1⟨P⟩. (Section 3.1, p. 216)
2. Let L* propose a DFA Ai; check safety ⟨Ai⟩M1⟨P⟩ with a model checker. (Section 3.1, p. 216)
3. If safety fails, project the model-checker counterexample onto the assumption alphabet and return it to L* for refinement. (Section 3.1, p. 216)
4. Check permissiveness by testing ⟨true⟩M2⟨Ai⟩. If this fails, distinguish an assumption refinement from a real system violation using another membership query. (Section 3.1, pp. 216–217)
5. Stop when both premises hold or when a real counterexample proves the composition unsafe. (Section 3.1, p. 217)

The paper says the framework does not need a fully permissive assumption; “it uses M2 to add behaviors to over-restrictive assumptions on demand, and as needed for completion of the verification.” (Section 3.1, p. 216)

Verus form (Inference)

A Rust/Verus integration can generate finite assumption automata externally, then import an automaton predicate and prove each component’s contract under it. Counterexample traces become proof obligations or test vectors. L* itself is not a Verus proof function; trust must include the learner and teacher correctness arguments, or the resulting automaton must be checked independently.

what evidence shows it works and limits

L* terminates with a minimal DFA for its target (Section 2.4, p. 215), and the paper says the answers given to L* “are always precise with respect to the targeted weakest assumption” (Section 3.1, p. 217). It says the learned assumption is “smaller than, or in the worst case equal to Aw in terms of number of states” and learning stops as soon as the property is proved or disproved (Section 3.1, p. 217). The finite-state example in Section 5.1 (p. 221) yields a 2-state assumption, one state fewer than the Receiver, which the paper calls “modest” benefit. No extensive evaluation is reported.

## technique: infinite-state interleaving and interface generation

For infinite-state components, the framework checks both premises on may abstractions and interleaves abstraction refinement with L* learning. Each counterexample c is simulated on the concrete component with simulate(c, M1) or simulate(c, M2). If c is not a real trace, the abstraction is refined with ref ine(c); refinement does not require L* to restart. If c is a real violating trace of M1 (premise 1), the assumption is refined and c ↑ αAi goes to L*. If c is a real trace of M2 (premise 2), a further membership query on M1 decides between an assumption refinement and a real error. (Section 4.1, pp. 219–220) Refinement predicates come from weakest preconditions over the counterexample transitions. (Section 4.1, p. 220) Termination is not guaranteed in general; see Section 4.2, p. 220. The paper’s own example (Section 5.2, pp. 221–222) refines an abstraction on x = 0 and x > 0 by adding x > 5 and x ≤ 5 after a spurious trace.

Interface generation (Section 6, pp. 222–225) differs: a component’s environment is unknown, so permissiveness cannot be checked against M2. It uses both may and must abstractions: may for safety, must for permissiveness. The cited result [30] is: if an interface is safe with respect to M^may and permissive with respect to M^must, it is safe and permissive with respect to M. If a component is observationally deterministic, the must abstraction is deterministic and avoids exponentially expensive determinization; otherwise determinization is needed. For compositional verification, “may abstractions are sufficient” because M2 is known (Section 6, p. 225).

Verus form (Inference)

Use a verified trace relation for concrete Rust and an abstract interface automaton. Prove refinement lemmas for each predicate addition and keep determinization/learning as audited external artifacts. This is useful for modular VL components but does not eliminate trusted abstraction choices.

## what is proved and trusted

Argued on paper (not mechanically checked): soundness and completeness of the basic assume-guarantee rule (Section 2.2.1), the language-inclusion relation for abstractions (Section 2.3), and correctness and termination arguments for the framework (Sections 3.2 and 4.2). The termination argument for infinite-state components holds only when the component has a finite bisimulation quotient (Section 4.2, p. 220). Not measured: the paper reports no experiments; it gives two small illustrative protocol examples (Section 5), and for the infinite-state one “we carried out all steps, except for abstraction refinement, automatically” (Section 8, p. 226). The flight-software results are cited from earlier work. Inference: a user of this technique would have to trust model-checker results, theorem-prover calculations, the L* implementation, the choice of abstraction predicates, concrete simulation, and any environment/model-code translation.

Inference: for VeruLaw, this work reduces monolithic-proof threat by providing a principled way to learn interfaces around verified Rust modules. The main risks are spurious abstraction traces, incomplete assumptions, and trusting external automata. VL should reuse the may/must distinction and counterexample classification rather than redo generic L* research.

## techniques for the catalog

- assume-guarantee decomposition: prove component contracts under an explicit environment automaton and compose them
- may/must predicate abstraction: over-approximate for safety and under-approximate for real violations or permissiveness
- L* assumption learning: infer finite assumptions from membership queries, conjecture checks, and counterexamples
- interleaved refinement: classify traces by concrete simulation and refine either predicates or assumptions
- interface generation: combine may safety and must permissiveness checks for infinite-state components
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Note that this framework has an important characteristic: the information that is communicated to L* is always correct with respect to the concrete system."): I read the whole paper text (pp. 211–228) and the whole study; I checked every quotation, page and section reference, the rule and premise descriptions, the may/must definitions, the L* query/conjecture steps, the infinite-state counterexample handling, the interface-generation claims and the tag. I changed one quotation that was not word for word (“The framework uses M2 …” is “it uses M2 …” on p. 216), the link (now the DOI printed in the paper text, replacing the arXiv link), the wrong claim that termination depends on predicate quality (the paper ties it to a finite bisimulation quotient), the wrong Measured and Proved-on-paper wording (nothing is measured; arguments are paper arguments), the overgeneral restriction of soundness and completeness to finite-state components, and the oversimplified counterexample classification for the infinite-state case; I added the example, the 2-state assumption result and the interface-generation theorem from [30]. I did not check the cited prior work ([8], [28], [30]) or the figures beyond their captions and text, and the Verus-form paragraphs are my own inferences, not claims of the paper.
