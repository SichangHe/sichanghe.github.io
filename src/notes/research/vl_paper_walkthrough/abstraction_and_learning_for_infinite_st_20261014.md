# Abstraction and Learning for Infinite-State Compositional Verification
(authored by agents unless marked 🧑)
Tag: `giannakopoulou2013abstraction`, [paper](http://arxiv.org/abs/1309.5140v1)

## scope
The paper combines assume-guarantee reasoning, predicate abstraction, counterexample-guided refinement, and Angluin’s L* learning to verify or refute compositions with infinite-state components. A component M satisfies property P under assumption A when every environment satisfying A makes the composition satisfy P. The basic rule is: prove ⟨A⟩M1⟨P⟩ and prove ⟨true⟩M2⟨A⟩, then conclude ⟨true⟩(M1‖M2)⟨P⟩ (Sections 2.2 and 4, pp. 213, 218). The authors explicitly state a limitation: “At the present time, we are not able to perform extensive experimental evaluation of the framework.” (Conclusion, p. 226)

## technique: assume-guarantee decomposition

what it is and when to use it

Replace one monolithic reachability proof with local proofs about components and an environment assumption. Use it when a composition is too large to verify directly and the interaction alphabet is smaller than each component.

how to apply it

1. Model components as communicating state machines and property P as a deterministic safety machine; reduce satisfaction to reachability of an error state. (Sections 2.1–2.2, pp. 212–213)
2. Choose an assumption automaton A over the actions shared with the environment. (Section 2.2, p. 213)
3. Check ⟨A⟩M1⟨P⟩ and ⟨true⟩M2⟨A⟩. If both hold, apply Rule ASYM to conclude the property for M1‖M2. (Section 2.2, p. 214)
4. For a positive result, retain counterexamples from failed premises and determine whether they indicate a real component error or an inadequate assumption. (Sections 3.1 and 4.1, pp. 216–220)

The paper defines the goal of a weakest assumption as both safety and permissiveness: “These two conditions essentially ensure that ∀E : M k E |= P iff E |= Aw .” (Section 2.2, p. 213)

Verus form (Inference)

Represent each Rust component’s abstract interface and state predicate with `spec fn`; prove local transition invariants with `requires`, `ensures`, and `proof fn` lemmas. Encode the composition theorem as a lemma that combines component contracts under an explicit environment assumption. Verus proves deductive invariants, while automaton reachability and language inclusion may remain external checks.

what evidence shows it works and limits

The rule is argued sound and complete for finite-state components. The paper reports prior flight-software demonstrations with time/memory savings, including cases where monolithic verification ran out of resources (Section 3.3, p. 217), but gives no denominator or numeric table here. Manual assumption construction is “highly non-trivial” (Section 2.2, p. 214), motivating learning.

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

The correctness argument is the language-inclusion relation and the implication from may-premise proofs to concrete-premise proofs. Spurious counterexamples are expected; refinement is required. Predicate quality and theorem-prover calculations determine termination, and the paper gives no broad benchmark.

## technique: L* learned assumptions with counterexample teacher

what it is and when to use it

Learn a minimal DFA for the weakest or sufficient assumption by membership queries and counterexamples instead of writing A manually. Use it when component behavior is regular over a finite interaction alphabet.

how to apply it

1. Let L* ask whether a finite interaction string s belongs to the assumption language by checking ⟨s⟩M1⟨P⟩. (Section 3.1, p. 216)
2. Let L* propose a DFA Ai; check safety ⟨Ai⟩M1⟨P⟩ with a model checker. (Section 3.1, p. 216)
3. If safety fails, project the model-checker counterexample onto the assumption alphabet and return it to L* for refinement. (Section 3.1, p. 216)
4. Check permissiveness by testing ⟨true⟩M2⟨Ai⟩. If this fails, distinguish an assumption refinement from a real system violation using another membership query. (Section 3.1, pp. 216–217)
5. Stop when both premises hold or when a real counterexample proves the composition unsafe. (Section 3.1, p. 217)

The paper says, “The framework uses M2 to add behaviors to over-restrictive assumptions on demand, and as needed for completion of the verification.” (Section 3.1, p. 217)

Verus form (Inference)

A Rust/Verus integration can generate finite assumption automata externally, then import an automaton predicate and prove each component’s contract under it. Counterexample traces become proof obligations or test vectors. L* itself is not a Verus proof function; trust must include the learner and teacher correctness arguments, or the resulting automaton must be checked independently.

what evidence shows it works and limits

L* terminates for a regular target and the framework’s teacher answers are intended to be precise with respect to the weakest assumption. The paper says the learned assumption can be smaller than or equal to the weakest assumption and may terminate early once the target property is decided (Section 3.1, p. 217). No extensive evaluation is reported.

## technique: infinite-state interleaving and interface generation

For infinite components, the framework alternates may-abstraction refinement with L* assumption learning. A may counterexample is simulated on the concrete component; if valid, refine the assumption, and if spurious, refine the abstraction. Interface generation uses both may and must abstractions: may checks safety and must checks permissiveness. If a component is observationally deterministic, the must abstraction is deterministic and avoids exponential determinization; otherwise determinization or heuristics are needed. (Sections 4.1 and 6, pp. 219–225)

Verus form (Inference)

Use a verified trace relation for concrete Rust and an abstract interface automaton. Prove refinement lemmas for each predicate addition and keep determinization/learning as audited external artifacts. This is useful for modular VL components but does not eliminate trusted abstraction choices.

## what is proved and trusted

Proved on paper: soundness/completeness of the basic assume-guarantee rule, language inclusion for abstractions, correctness arguments for the learning teacher, and the refinement framework’s termination argument under regular assumptions. Measured: illustrative finite and infinite communication protocols and cited flight-software demonstrations; this paper reports no extensive experiment denominator. Trusted: model-checker results, theorem-prover calculations, learner implementation, abstraction predicates, concrete simulation, and any environment/model-code translation.

Inference: for VeruLaw, this work reduces monolithic-proof threat by providing a principled way to learn interfaces around verified Rust modules. The main risks are spurious abstraction traces, incomplete assumptions, and trusting external automata. VL should reuse the may/must distinction and counterexample classification rather than redo generic L* research.

## techniques for the catalog

- assume-guarantee decomposition: prove component contracts under an explicit environment automaton and compose them
- may/must predicate abstraction: over-approximate for safety and under-approximate for real violations or permissiveness
- L* assumption learning: infer finite assumptions from membership queries, conjecture checks, and counterexamples
- interleaved refinement: classify traces by concrete simulation and refine either predicates or assumptions
- interface generation: combine may safety and must permissiveness checks for infinite-state components
Checked 2026-10-14 against the paper by a Codex agent: audit record giannakopoulou2013abstraction; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
