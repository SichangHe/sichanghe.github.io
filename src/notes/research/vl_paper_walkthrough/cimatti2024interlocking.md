# Towards the verification of a generic interlocking logic: Dafny meets parameterized model checking
(authored by agents unless marked 🧑)
Tag: `cimatti2024interlocking`, [paper](http://arxiv.org/abs/2403.00087v1)

## what the paper establishes

The paper presents a preliminary architecture for verifying a generic railway interlocking logic across stations of arbitrary size. The logic is written in a controlled natural language (CNL), translated through SysML into executable code, and modeled in Dafny for modular verification. For the simplified example, a parameterized model checker finds a lemma that strengthens the safety property into an inductive invariant; the corresponding strengthened predicate lets Dafny verify preservation by the scheduler. The abstract states: “We present a simplified case study, where the interlocking logic is directly encoded in Dafny.” (abstract, PDF p. 1)

The case study is deliberately small. It has track segments with `Init`, `Locked`, and `Free` states, routes with `Init`, `Active`, `Wait`, and `Inactive` states, and a scheduler that nondeterministically selects a route and executes the operation for its state, checking the activation guard when needed. The safety goal is that two incompatible routes, meaning routes sharing a track, cannot both be active (sections 2–3, PDF pp. 2–4). The authors call their result “positive preliminary results” and list scalability and abstraction as open challenges (abstract and section 5, PDF pp. 1 and 5–6).

## technique 1: model a generic system from controlled language through an intermediate model

what it is and when to use it

AIDA sheets describe classes, variables, connected components, state-machine transitions, triggers, guards, and effects in domain-specific controlled natural language. SysML provides an intermediate model from which Python and C are generated. TOSCA supports generic test scenarios that can later be instantiated for a concrete station (section 2, PDF p. 2). Inference: use this when one specification must generate many finite configurations while preserving traceability to domain requirements.

how the paper does it

1. Define each logical entity in a sheet. The structure part declares variables, parameters, and lists of connected components, such as the tracks used by a route.
2. Define an extended finite-state-machine behavior with source and destination states, triggers, guards, and effects. The paper says: “Guards, i.e. the conditions that must be satisfied to enable a particular transition. Determinism is ensured by explicitly prioritizing guards;” (section 2, PDF p. 2)
3. Translate the CNL sheets into a SysML model with graphical finite-state-machine views.
4. Compile the SysML model into executable Python and C.
5. Keep abstract test scenarios that can be instantiated on a concrete station and run with a train and trackside-device simulator (section 2, PDF p. 2).

Verus form

evidence and limits

The earlier Kratos2 approach could verify only a configured station because it “is unable to deal with objects of unspecified size”, and large instantiated systems created scalability problems (section 2, PDF p. 2). The paper instead studies parameterized verification without a fixed station configuration; automatic SysML-to-Dafny generation remains future work (sections 2 and 5, PDF pp. 3 and 5–6). Inference: generated code and its model need cross-checks, because a proof of the Dafny model does not by itself establish that C or Rust generation preserves the model.

## technique 2: encode component transitions with modular contracts and loop invariants

what it is and when to use it

The Dafny encoding represents each transition as a method with explicit state updates, preconditions, postconditions, and frame information. The authors motivate modular verification with: “Moreover, the verification in Dafny is modular, thus possibly reducing the complexity of the system to verify the single components.” (section 3, PDF p. 3) The paper notes: “The features of the Dafny language support a natural encoding of the interlocking logic described in previous section.” (section 3, PDF p. 3)

how to do it

1. Define state datatypes and classes. A `Track` has `state` and `direction`; a `Route` has `state`, a change-direction request, a sequence of used tracks, and requested directions (Figures 1–2, PDF pp. 3–4).
2. Give constructors postconditions for initial state and well-formed route lengths.
3. Give methods frame clauses and postconditions. `lock` changes a track to `Locked` while preserving its direction; `go_free` changes the state to `Free`; `change_dir` preserves state and changes direction.
4. Require a well-formed route in state `Wait`, with all used tracks free and in the requested direction, before activation. Its postcondition locks every used track, preserves directions, and sets the route active (Figure 2, PDF p. 4).
5. Use loop invariants for index bounds, locked tracks in the processed prefix, and unchanged directions for all used tracks (Figure 2, PDF p. 4).

The paper points out a generator hazard: “we must explicitly include equalities among variables that remain unchanged in the postconditions.” (section 3, PDF p. 3) Inference: generated specifications must preserve this explicit frame information.

Verus form

Inference: The direct Verus analogue uses enum-like Rust types, `requires` and `ensures` on transition methods, `modifies`-style frame reasoning through the Verus-supported mutable-reference contracts, and loop `invariant` clauses for the processed prefix. Use `old(...)` in postconditions when a prior value must be preserved, as in the paper's Dafny code; Verus syntax and supported framing must be checked against the local Verus guide. Inference: prove route-list bounds and state-preservation lemmas with `proof fn` and `assert` statements. The paper's Dafny `modifies this.used[..]` is not a Verus construct to copy literally.

evidence and limits

The authors describe component checks against method specifications and report successful scheduler verification with the stronger inductive invariant (section 3, PDF pp. 3–4). They do not report line counts, proof time for Dafny, or a complete station configuration.

## technique 3: strengthen a safety property into an inductive invariant

what it is and when to use it

The desired property, `SecureStation`, says incompatible routes are not simultaneously active. The safety predicate alone is not inductive: assuming only that predicate is insufficient to prove preservation by the scheduler. The authors therefore add `SecureInductiveStation`, which includes the safety property and a local fact: a route that uses a free track cannot be active. The paper states: “However, the verification succeeds when we provide a stronger inductive invariant that implies the original property - called "Secure Inductive Station".” (section 3, PDF p. 4)

how to do it

1. State the target safety predicate over all route pairs that share a track.
2. Check whether each scheduler transition preserves it. The paper finds that the target alone is insufficient.
3. Add the strengthening that every route using a free track is not active.
4. Define `SecureInductiveStation` as the conjunction of the target and strengthening, and use it alongside `ValidStation` as a scheduler loop invariant.
5. Verify preservation by route operations. The scheduler requires `ValidStation` and `SecureInductiveStation` on entry and lists both as postconditions; Figure 3 does not show station initialization establishing them (PDF p. 4).

Verus form

Inference: In Verus, state the target and strengthening as `spec fn` predicates over an abstract station state. Put both in a loop `invariant` block and prove initialization and transition-preservation lemmas with `proof fn`. Use `assert` to expose route-track membership facts and `old(...)` to relate pre-state and post-state. Inference: the invariant must quantify over the finite collections in the chosen Verus representation; the paper's unbounded mathematical quantifiers are not automatically available over executable Rust collections.

evidence and limits

The strengthening is demonstrated on the simplified station, not on the full AIDA-generated railway system. Figure 3 uses an unbounded scheduler loop with `decreases *` in Dafny (PDF p. 4).

## technique 4: slice the system into a symbolic parameterized transition system

what it is and when to use it

Parameterized model checking reasons about all system sizes by replacing finite collections with functions over abstract sorts. The paper defines a transition system `S = (X, I(X), T(X,X'))`, where `X` contains state variables, `I` is the initial formula, and `T` is the transition relation (section 4, PDF p. 5). It then keeps only variables relevant to the invariant, rather than encoding every class attribute. Inference: use this when a finite instantiated model does not scale and the safety property depends on a small relational core.

how to do it

1. Choose abstract sorts `track` and `route`.
2. Represent track state as a function `track -> {free, locked}` and route state as `route -> {active, inactive}`.
3. Represent route-track membership with a binary predicate `UsedBy`.
4. State the initial formula: all tracks are free and all routes inactive.
5. Encode the `activate route` transition with an existentially selected inactive route, universal preconditions over its used tracks, and frame conditions that leave unrelated routes and tracks unchanged (section 4, PDF p. 5).
6. Formulate `NotCompatible(r1,r2)` as distinct routes sharing a track and ask for an invariant implying that incompatible routes cannot both be active.

The authors explicitly say: “A key insight here is that we do not need to represent all the attributes of the class, but only the one relevant to building the inductive invariant.” (section 4, PDF p. 5)

Verus form

Inference: This abstraction can be represented in Verus by a ghost state model using finite `Set` or `Map` values when the deployed Rust instance is finite, with `spec fn` transitions and invariants over those maps. For a genuinely parameterized proof, use a mathematical sequence or map abstraction and prove that each concrete station refines one abstract state. Inference: the paper's function-valued unbounded sorts are outside ordinary executable Rust, so a direct Verus encoding would be a ghost abstraction rather than the runtime representation.

evidence and limits

The paper reports that the parameterized checker found the key invariant “in less than one second” for the simplified system (section 4, PDF p. 5). The paper reports this timing for its reduced example, without a broader timing evaluation. The authors obtained the relevant-variable slice manually and state that automatic slicing is a future goal. Inference: transferring the abstract invariant to an implementation requires justification that the abstraction covers the relevant concrete behavior.

## technique 5: import a model-checker invariant into Dafny

what it is and when to use it

The workflow combines complementary tools: Dafny checks the structured object-oriented implementation, while a parameterized SMT model checker discovers a quantified invariant on a smaller symbolic abstraction. The discovered lemma, conjoined with the target property, matches the Dafny `SecureInductiveStation` ghost predicate used by the scheduler proof. The paper describes this as an ideal scenario on a manually simplified system, with IDE integration left to future work (sections 4–5, PDF pp. 5–6).

how to do it

1. Define the abstract transition system and target property.
2. Run the parameterized model-checking algorithm to synthesize an invariant.
3. Combine the discovered lemma with the target property. In this example, that conjunction is the same invariant as the Dafny `SecureInductiveStation` predicate; the paper does not demonstrate an automatic translator.
4. Add it as a scheduler loop invariant and prove that each concrete method preserves it.
5. Keep the original `SecureStation` as a conjunct of the strengthened invariant (sections 3–4, PDF pp. 4–5).

Verus form

evidence and limits

Inference: transferring the symbolic result to the Dafny implementation requires the manually simplified abstraction to cover the relevant behavior. The paper says that without Dafny, a monolithic model checker “often struggles to scale effectively when dealing with exceptionally large models.” (section 4, PDF p. 5) The paper does not quantify scalability on realistic stations, nor does it demonstrate automatic translation from SysML to Dafny or automatic invariant translation.

## techniques for the catalog

- model-based generic specification: describe parameterized component behavior in controlled language and translate it through SysML to executable code
- modular transition contracts: encode guards, effects, frame conditions, and unchanged-state equalities on component methods
- strengthened inductive invariants: conjoin the desired global safety property with a local fact that makes it inductive
- parameterized transition abstraction: represent all station sizes with abstract sorts, state functions, and a relational transition system
- external invariant synthesis: use a parameterized model checker to discover a quantified invariant for a reduced abstraction
- invariant correspondence: match the discovered abstract invariant to a Dafny predicate and verify scheduler preservation; extension to Verus and explicit refinement proofs are inferences
