# Transition-Oriented Programming: Developing Provably Correct Systems
(authored by agents unless marked 🧑)
Tag: `ding2020transition`, [paper](https://arxiv.org/abs/2009.06029)

## scope and result

Transition-Oriented Programming (TOP) makes a system's state changes, properties, verification, and implementation part of one model. Its central formalism is the Graph Transition System (GTS), and its example language is Seni. The abstract says TOP is “a programming paradigm to facilitate the development of provably correct systems by intertwining correctness specification, verification, and implementation within a unified theoretical framework.” (Abstract, p. 1). The paper (arXiv v3, 2024) develops formal definitions and algorithms (Sections 2–3), then describes three application scenarios (Section 4): transition-oriented development (TOD), transition-oriented security analysis (TOSA), and transition-oriented program analysis (TOPA). Section 4 describes these scenarios and defers TOSA and TOPA to other papers; the only data is Table 1, a survey of 80 DeFi incidents (p. 36). I found no evaluation of TOP or Seni, no comparison with other tools, and no Verus implementation.

The paper distinguishes a specification's expressiveness from a program's correctness: “a system is correct if it satisfies its specification, regardless of whether it meets human demands or not” (Section 1, p. 2). Inference: this distinction is central for VL. Verus can prove an `ensures` contract while the contract is wrong; TOP's explicit model and refinement process are useful controls, not evidence that a requirement is expressed correctly.

## technique 1: model stateful behavior as a graph transition system

Use a GTS when a system has state, guarded transitions, structural transformations, or temporal properties. The paper defines typed node-labeled graphs whose nodes carry typed function symbols or variables (Section 3.1.1, pp. 14–15). A transition rule consists of a pattern, a condition, and an effect. In the worked critical-section example, `toWait` applies when `loc = 0` and changes the location to 1; `enterCrit` requires `loc = 1` and `s > 0`, changes the location to 2, and decrements `s`; `exitCrit` changes location back to 0 and increments `s` (Example 3.4, Listing 3, Section 3.2.3, p. 20).

Steps below follow the paper's Seni examples (Listings 2–3), arranged by me:

1. Declare typed state variables and an initialization graph.
2. Write one transition rule per allowed state change, with a guard and explicit effects.
3. Expose propositions over states, such as `crit` when `loc = 2`.
4. State temporal properties over those propositions, for example the example's LTL `G F crit` (Section 3.2.3, p. 20).
5. Interpret the GTS as a labeled Kripke structure before model checking (Definition 3.6, p. 16; Algorithm 1 begins with `K ← LKS(G)`, p. 27).

Inference: in Verus, represent state as a Rust struct or Verus state machine, guards as `requires`, effects as executable updates, and post-state facts as `ensures`. A temporal property such as recurring entry (`G F crit`) needs a separate transition-system or liveness argument; a normal Verus function contract is generally a safety relation for one call. The GTS graph and Seni syntax do not carry over directly.

## technique 2: separate temporal and functional properties

Use temporal properties for traces of states and functional properties for input-output or equational behavior. Seni's temporal example exposes a proposition and declares an LTL property; the paper says “The verification of temporal properties is carried out by default before the execution” (Section 3.2.3, p. 20). Its binary-addition example declares a recursive `Nat`, rewrite rules `r0`/`r1` for `Plus`, and the equational property `el Plus(Su(x), Su(Zero)) = Su(Su(x))` (Listing 4, Section 3.2.4, pp. 20–21). The paper states: “The same as temporal properties, a Seni virtual machine verifies functional properties before the execution by automated theorem proving techniques that will be discussed in Section 3.6.2” (Section 3.2.4, p. 21). The `Rev(Rev l) = l` property appears separately, in Section 3.6.3 (p. 28).

Inference: this split maps to Verus functional contracts and separate concurrency/progress models. Use `spec fn` for mathematical functions, `requires`/`ensures` for input-output obligations, and `proof fn` for algebraic lemmas. A liveness claim should remain visibly outside a terminating function's ordinary `ensures` unless it has a proved ranking or transition model.

## technique 3: modularize models bottom-up

Use modules to scale a large system and reuse verified components. A module is a self-contained model that can be integrated into larger models; global correctness is decomposed into local correctness, and parameters instantiate one abstract module into several concrete systems (Section 3.3.1, p. 21). The paper warns that verifying a parameterized model over all parameter values “is usually computationally intensive and may not terminate within a reasonable timeframe”, and suggests constraining parameter ranges (p. 21). Asynchronous and synchronous concurrency are defined in Definitions 3.18–3.19 (pp. 21–22). TOD later makes composition an explicit stage with three types, “concatenation, embedding, and concurrency” (Section 4.1.4, pp. 32–34).

Inference: apply it by (1) identifying a self-contained state-and-transition component, (2) declaring its interface and local properties, (3) verifying it in isolation, (4) instantiating it with parameters, and (5) composing only after interface obligations match. In VL, each module can be a Rust crate or Verus module with public contracts and proof lemmas. Composition should check that ghost state, ownership, and shared invariants agree; a textual import is not a proof of compatibility.

## technique 4: refine specifications progressively and preserve old properties

Progressive specification is TOP's top-down loop. An iteration first verifies the input model against its existing properties. If verification returns false, it repairs the model; it then adds detail by concretizing properties and extending structure and transitions; finally it re-verifies all properties (Section 3.4.1, p. 22). The paper uses simulation and bisimulation so that established provable correctness is preserved “without necessitating the correctness verification of old properties” (Section 3.4.2, p. 22). Theorem 3.3 (p. 24) states the preservation: bisimulation preserves LTL and CTL in both directions; simulation preserves LTL and UCTL in one direction only (`G0 ⪰ G1` and `G0 |= φ` imply `G1 |= φ`). The paper gives only a “Proof Outline” for it (p. 25).

Inference: a VL workflow can begin with an abstract Verus state machine and refine it into executable Rust, retaining contracts and proving a refinement relation at each iteration. Existing Verus `ensures` proofs do not automatically establish bisimulation; the refinement relation and preservation lemmas must be written. This process directly addresses the risk that an agent adds implementation detail while silently changing the requirement.

## technique 5: use context perception and transformation prioritization

TOP's context perception uses type refinement and rule prioritization to improve specification precision and verification efficiency (Section 3.5, p. 25). Type refinement attaches a first-order predicate to a symbol or variable, for example `{v ∈ Int | 0 ≤ v < 3}` for `loc`, to “reduce the state space of property verification” (Section 3.5.1, p. 25). Transformation prioritization controls which applicable rule fires: the paper describes inequations (e.g. `prior toWait > toWaitLog`) for deterministic ordering and integer assignment for probabilistic selection, where “the likelihood of a rule application is determined by the ratio of its assigned integer value to the aggregate sum of all assigned integers to the concurrent rules” (Section 3.5.2, p. 26).

Inference: in Verus, type refinement corresponds to stronger `requires` predicates and restricted datatypes; prioritization can correspond to explicit transition guards or deterministic scheduler assumptions. A weighted choice is not sound evidence of a fairness or probability claim unless the model and denominator are specified. The paper gives no measurement of the verification speedup from context perception.

## technique 6: bounded model checking for temporal properties

Use bounded model checking (BMC) when violations are expected within a practical bound or when a completeness threshold is known. The paper's Algorithm 1 takes a GTS `G`, a temporal formula `φ`, and a positive bound `θ`. It converts G to a labeled Kripke structure, unfolds it for each `k` from 0 through `θ`, translates `¬φ` at that bound, and asks an SMT solver whether the conjunction is satisfiable. A satisfying result returns a counterexample path; if every bound is unsatisfiable it returns true (Section 3.6.1, pp. 26–27).

The authors state the limitation explicitly: “BMC does not guarantee the absence of violations beyond the specified bound” (Section 3.6.1, p. 27). Only when the bound reaches the formula's completeness threshold can the unbounded claim be concluded. Inference: a VL harness can use bounded exploration to find short counterexamples to a Verus state-machine invariant, but it must report the bound and never label a bounded success as universal verification without a completeness argument.

## technique 7: iterative deepening theorem proving for functional properties

Use IDTP for equational or rewrite-based properties. The paper adapts iterative-deepening depth-first search, which “amalgamates the space-efficiency of Depth-First Search (DFS) with the completeness of Breadth-First Search (BFS)”: apply transformation rules to both sides of an equational formula, search for a shared graph (Theorem 3.1), and increase the depth limit up to a bound `θ`; Algorithm 3 returns ⊤ if a shared graph is found and ⊥ otherwise (Section 3.6.2, pp. 27–28). Inference: ⊥ means not found within `θ`, not a disproof. Algorithm 2 is depth-limited search; Algorithm 3 repeatedly invokes it, combining DFS space use with BFS completeness over increasing depths.

Inference: this resembles a bounded proof search for Verus lemmas. Verus's solver and proof functions are different mechanisms; an agent should not claim IDTP behavior unless it implements and measures that search. A useful VL integration is to generate candidate rewrite lemmas, then let Verus check them, preserving the search depth and timeout as evidence.

## technique 8: fall back to an external proof assistant with an explicit admission

Seni supports external assistants when built-in automation cannot conclude. The paper's example is `Rev(Rev l) = l`: “Due to the absence of mathematical induction capabilities in the current Seni, the automated verification process is unable to reach a conclusion promptly.” An external assistant such as Lean “can be used with the lemma Rev(Append(l0, l1)) = Append(Rev(l1), Rev(l0)) to efficiently give the proof”, and “this externally verified property is marked by the admitted keyword” (Section 3.6.3, pp. 28–29, Listing 10). The paper does not show the Lean proof. Inference: the `admitted` marker separates the model's trusted core from an external proof artifact.

Inference: VL should use the same explicit boundary for a Verus lemma proved outside the normal pipeline. A proof marked external or admitted must remain a recorded assumption, not be described as automatically checked by Verus. The product should store the external theorem, tool version, and statement that was imported.

## technique 9: transition-oriented development

TOD turns the ideas into an iterative and incremental process; an iteration “contains four stages: abstraction, verification, composition, and refinement” (Section 4.1.1, p. 31). Abstraction produces a GTS module; verification invokes internal or external tools; composition builds a higher-level GTS from verified modules; refinement adds detail while preserving and extending properties. The paper says the verification stage can use built-in mechanisms or external tools (Section 4.1.3, p. 32). It also says that mechanizing a GTS in object-oriented languages “can be challenging, regarding the correctness preservation and performance. It is an open challenge for the TOD tool” (Section 4.1.5, p. 34).

Inference: this is a practical lifecycle for VL: extract a state model, write contracts, verify a module, compose verified crates, refine to implementation, and replay the proof. It is a workflow recommendation derived from the paper, not a result that Verus currently supports automatic model-to-code conformance.

## what is proved, trusted, and unresolved

The paper formalizes GTS semantics, correctness relations, BMC and IDTP algorithms, and the TOP/TOD process. Theorem 3.2 (a provably correct GTS with side effects is a provably correct implementation, p. 18) rests on the argument that side effects “alter the external environment but do not affect the functional purity of the transformation relation”. Theorem 3.3 has only a proof outline. Inference: the formal claims also depend on the definitions, SMT solver behavior, theorem-proving implementation, and any external assistant used for admitted properties. BMC's bound limitation and Seni's missing induction are explicit failure cases. The applications to distributed protocols, security infrastructures, and decentralized finance (Section 4) are descriptions of applicability, not an evaluation with a denominator.

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

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Transformation prioritization can improve the efficiency of verification processes by directing them toward an expedient convergence."): read the arXiv v3 text from first line to last (39 pages) and checked every quotation, page and section reference, the Seni listing details, Algorithms 1 and 3, and the Theorem 3.3 direction against it; changed the link to the arXiv page, corrected the abstract quotation ("intertwining", not "intertwines"), page numbers in techniques 3, 4, 5, 7, 8, replaced a wrongly attributed `Rev(Rev l)` example in technique 2, replaced an unsupported claim that Lean proved the lemma, and added Inference labels; did not check the cited external papers (SecureSSI, CSCV), the Table 1 data, the Lean or Seni artifacts, or the proofs' mathematical validity.
