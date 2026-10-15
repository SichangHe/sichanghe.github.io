# Transition-Oriented Programming: Developing Provably Correct Systems
(authored by agents unless marked 🧑)
Tag: `ding2020transition`, [paper](https://www.semanticscholar.org/paper/063074175dc02a46fe5d233e46c4c1d94311b1a5)

## scope and result

Transition-Oriented Programming (TOP) makes a system's state changes, properties, verification, and implementation part of one model. Its central formalism is the Graph Transition System (GTS), and its example language is Seni. The abstract says TOP “intertwines correctness specification, verification, and implementation within a unified theoretical framework.” (Abstract, p. 1). The paper develops formal definitions and algorithms, then describes transition-oriented development (TOD), security analysis, and decentralized-application analysis. It does not provide a product-scale empirical comparison or a Verus implementation.

The paper distinguishes a specification's expressiveness from a program's correctness: a system is correct if it satisfies its specification, but the specification may fail to capture a human demand (Section 1, pp. 2–3). Inference: this distinction is central for VL. Verus can prove an `ensures` contract while the contract is wrong; TOP's explicit model and refinement process are useful controls, not evidence that a requirement is expressed correctly.

## technique 1: model stateful behavior as a graph transition system

Use a GTS when a system has state, guarded transitions, structural transformations, or temporal properties. The paper defines typed node-labeled graphs whose nodes carry typed function symbols or variables (Section 3.1.1, pp. 14–15). A transition rule consists of a pattern, a condition, and an effect. In the worked critical-section example, `toWait` applies when `loc = 0` and changes the location to 1; `enterCrit` requires `loc = 1` and `s > 0`, changes the location to 2, and decrements `s`; `exitCrit` changes location back to 0 and increments `s` (Listing around Section 3.2.3, pp. 19–20).

Apply it step by step:

1. Declare typed state variables and an initialization graph.
2. Write one transition rule per allowed state change, with a guard and explicit effects.
3. Expose propositions over states, such as `crit` when `loc = 2`.
4. State temporal properties over those propositions, for example the example's LTL `G F crit` (Section 3.2.3, p. 20).
5. Interpret the GTS as a labeled Kripke structure before model checking.

Inference: in Verus, represent state as a Rust struct or Verus state machine, guards as `requires`, effects as executable updates, and post-state facts as `ensures`. A temporal property such as eventual entry needs a separate transition-system or liveness argument; a normal Verus function contract is generally a safety relation for one call. The GTS graph and Seni syntax do not carry over directly.

## technique 2: separate temporal and functional properties

Use temporal properties for traces of states and functional properties for input-output or equational behavior. Seni's temporal example exposes a proposition and checks LTL before execution; its binary-addition example declares a recursive `Nat`, rewrite rules for `Plus`, and an equation `Rev(Rev l) = l`-style property (Sections 3.2.3–3.2.4, pp. 19–21). The paper states: “The same as temporal properties, a Seni virtual machine verifies functional properties before the execution by automated theorem proving techniques” (Section 3.2.4, p. 21).

Inference: this split maps to Verus functional contracts and separate concurrency/progress models. Use `spec fn` for mathematical functions, `requires`/`ensures` for input-output obligations, and `proof fn` for algebraic lemmas. A liveness claim should remain visibly outside a terminating function's ordinary `ensures` unless it has a proved ranking or transition model.

## technique 3: modularize models bottom-up

Use modules to scale a large system and reuse verified components. A module is a self-contained model that can be integrated into larger models; global correctness is decomposed into local correctness, and parameters instantiate one abstract module into several concrete systems (Section 3.3.1, pp. 21–22). TOD later makes composition an explicit stage: concatenate, embed, or compose concurrently verified GTS modules (Section 4.1.4, p. 32).

Apply it by (1) identifying a self-contained state-and-transition component, (2) declaring its interface and local properties, (3) verifying it in isolation, (4) instantiating it with parameters, and (5) composing only after interface obligations match. Inference: in VL, each module can be a Rust crate or Verus module with public contracts and proof lemmas. Composition should check that ghost state, ownership, and shared invariants agree; a textual import is not a proof of compatibility.

## technique 4: refine specifications progressively and preserve old properties

Progressive specification is TOP's top-down loop. An iteration first verifies the input model against its existing properties. If verification returns false, it repairs the model; it then adds detail by concretizing properties and extending structure and transitions; finally it re-verifies all properties (Section 3.4.1, pp. 25–26). The paper uses simulation and bisimulation to preserve established correctness when refining, so old properties need not be re-proved from scratch (Section 3.4.2, p. 26).

Inference: a VL workflow can begin with an abstract Verus state machine and refine it into executable Rust, retaining contracts and proving a refinement relation at each iteration. Existing Verus `ensures` proofs do not automatically establish bisimulation; the refinement relation and preservation lemmas must be written. This process directly addresses the risk that an agent adds implementation detail while silently changing the requirement.

## technique 5: use context perception and transformation prioritization

TOP's context perception uses type refinement and rule prioritization to make specifications more precise and verification more efficient (Section 3, pp. 14–15). Type information narrows the values and transitions considered. Transformation prioritization controls which applicable rule fires: the paper describes inequations for deterministic ordering and integer weights for probabilistic selection, where a rule's probability is its weight divided by the sum of concurrent rule weights (Section 3.5, pp. 24–25).

Inference: in Verus, type refinement corresponds to stronger `requires` predicates and restricted datatypes; prioritization can correspond to explicit transition guards or deterministic scheduler assumptions. A weighted choice is not sound evidence of a fairness or probability claim unless the model and denominator are specified. The paper gives no product-level measurement of the accuracy gained from context perception.

## technique 6: bounded model checking for temporal properties

Use bounded model checking (BMC) when violations are expected within a practical bound or when a completeness threshold is known. The paper's Algorithm 1 takes a GTS `G`, a temporal formula `φ`, and a positive bound `θ`. It converts G to a labeled Kripke structure, unfolds it for each `k` from 0 through `θ`, translates `¬φ` at that bound, and asks an SMT solver whether the conjunction is satisfiable. A satisfying result returns a counterexample path; if every bound is unsatisfiable it returns true (Section 3.6.1, pp. 26–27).

The authors state the limitation explicitly: “BMC does not guarantee the absence of violations beyond the specified bound” (Section 3.6.1, p. 27). Only when the bound reaches the formula's completeness threshold can the unbounded claim be concluded. Inference: a VL harness can use bounded exploration to find short counterexamples to a Verus state-machine invariant, but it must report the bound and never label a bounded success as universal verification without a completeness argument.

## technique 7: iterative deepening theorem proving for functional properties

Use IDTP for equational or rewrite-based properties when exhaustive breadth-first search is too memory-intensive. The paper adapts iterative-deepening depth-first search: apply transformation rules to both sides of an equational formula, search for a shared typed node-labeled graph, and increase the depth limit until a proof or failure is returned (Section 3.6.2, pp. 27–28). Algorithm 2 is depth-limited search; Algorithm 3 repeatedly invokes it, combining DFS space use with BFS completeness over increasing depths.

Inference: this resembles a bounded proof search for Verus lemmas. Verus's solver and proof functions are different mechanisms; an agent should not claim IDTP behavior unless it implements and measures that search. A useful VL integration is to generate candidate rewrite lemmas, then let Verus check them, preserving the search depth and timeout as evidence.

## technique 8: fall back to an external proof assistant with an explicit admission

Seni supports external assistants when built-in automation cannot conclude. The paper's example is `Rev(Rev l) = l`; because Seni lacks mathematical induction, Lean proves a lemma about reversing an append, and the property is marked `admitted` (Section 3.6.3, pp. 28–29). This separates the model's trusted core from an external proof artifact.

Inference: VL should use the same explicit boundary for a Verus lemma proved outside the normal pipeline. A proof marked external or admitted must remain a recorded assumption, not be described as automatically checked by Verus. The product should store the external theorem, tool version, and statement that was imported.

## technique 9: transition-oriented development

TOD turns the ideas into an iteration pipeline with four stages: abstraction, verification, composition, and refinement (Section 4.1.1, p. 31). Abstraction produces a GTS module; verification invokes internal or external tools; composition builds a higher-level GTS from verified modules; refinement adds detail while preserving and extending properties. The paper says the verification stage can use built-in mechanisms or external tools (Section 4.1.3, p. 32).

Inference: this is a practical lifecycle for VL: extract a state model, write contracts, verify a module, compose verified crates, refine to implementation, and replay the proof. It is a workflow recommendation derived from the paper, not a result that Verus currently supports automatic model-to-code conformance.

## what is proved, trusted, and unresolved

The paper formalizes GTS semantics, correctness relations, BMC and IDTP algorithms, and the TOP/TOD process. Its formal claims depend on the definitions, SMT solver behavior, theorem-proving implementation, and any external assistant used for admitted properties. BMC's bound limitation and Seni's missing induction are explicit failure cases. The applications to distributed protocols, security infrastructures, and decentralized finance are demonstrations of applicability, not a denominator-based product evaluation.

Inference: the threat to agent-written verified Rust is substantial at the specification-to-implementation boundary. TOP's model, refinement, and modularization address requirement drift; its automation does not remove the need to validate the requirement, the refinement relation, solver assumptions, or external proofs. VL should reuse the four-stage lifecycle, explicit transition models, BMC counterexample workflow, and refinement evidence. It should not redo generic claims that a verified model automatically guarantees a side-effecting Rust implementation without a proved conformance relation.

## techniques for the catalog

- graph transition system — represent typed state, guarded transitions, effects, and exposed propositions in one executable model
- temporal/functional split — verify trace properties separately from equational input-output properties
- modular composition — verify parameterized modules locally before concatenation, embedding, or concurrency composition
- progressive specification — refine a model iteratively while preserving old properties by simulation or bisimulation
- context perception — use type refinement and prioritized transformations to narrow states and guide verification
- bounded model checking — unfold a transition model to a declared bound and search SMT for counterexample paths
- iterative deepening theorem proving — search rewrite transformations at increasing depths for functional equivalence
- external proof boundary — import an outside theorem only with an explicit admitted or trusted marker
- transition-oriented development — organize abstraction, verification, composition, and refinement as one lifecycle

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
