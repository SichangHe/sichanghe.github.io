# Towards the verification of a generic interlocking logic: Dafny meets parameterized model checking
(authored by agents unless marked 🧑)
Tag: `cimatti2024interlocking`, [paper](http://arxiv.org/abs/2403.00087v1)

## what the paper establishes

The paper presents a preliminary architecture for verifying a generic railway interlocking logic across stations of arbitrary size. The logic is written in a controlled natural language (CNL), translated through SysML into executable code, and modeled in Dafny for modular verification. A parameterized model checker supplies a stronger inductive invariant for a safety property that Dafny cannot prove from the obvious property alone. The abstract states: “We present a simplified case study, where the interlocking logic is directly encoded in Dafny.” (abstract, PDF p. 1)

The case study is deliberately small. It has track segments with `Init`, `Locked`, and `Free` states, routes with `Init`, `Active`, `Wait`, and `Inactive` states, and a scheduler that chooses enabled route operations. The safety goal is that two incompatible routes, meaning routes sharing a track, cannot both be active (sections 2–3, PDF pp. 2–4). The authors call their result “positive preliminary results” and list scalability and abstraction as open challenges (abstract and section 5, PDF pp. 1 and 5–6).

## technique 1: model a generic system from controlled language through an intermediate model

what it is and when to use it

AIDA sheets describe classes, variables, connected components, state-machine transitions, triggers, guards, and effects in domain-specific controlled natural language. SysML provides an intermediate model from which Python and C are generated. Generic scenarios can later be instantiated for a concrete station (section 2, PDF pp. 2–3). Use this when one specification must generate many finite configurations while preserving traceability to domain requirements.

how the paper does it

1. Define each logical entity in a sheet. The structure part declares variables, parameters, and lists of connected components, such as the tracks used by a route.
2. Define an extended finite-state-machine behavior with source and destination states, triggers, guards, and effects. The paper says: “Guards, i.e. the conditions that must be satisfied to enable a particular transition; Determinism is ensured by explicitly prioritizing guards.” (section 2, PDF p. 2)
3. Translate the CNL sheets into a SysML model with graphical finite-state-machine views.
4. Compile the SysML model into executable Python and C.
5. Keep abstract test scenarios that can be instantiated on a concrete station and run with a train and trackside-device simulator (section 2, PDF p. 3).

Verus form

Inference: In VL, the CNL/SysML layer corresponds to a typed Rust data model for components and transitions, with generated executable methods and Verus contracts. Use enums for states, `Seq` or `Set` for connected components, and `requires`/`ensures` to express guards and effects. Inference: preserve a trace identifier from each natural-language guard to its generated Rust contract and later proof obligation. The paper does not discuss Rust or Verus, so this mapping is an engineering analogy.

evidence and limits

The earlier Kratos2 approach could verify only a configured station because it “is unable to deal with objects of unspecified size,” and large instantiated systems created scalability problems (section 2, PDF p. 3). The generic architecture removes that dependency at the design level, but this paper does not report a full generated-IDE implementation or a complete railway deployment. Inference: generated code and its model need cross-checks, because a proof of the Dafny model does not by itself establish that C or Rust generation preserves the model.

## technique 2: encode component transitions with modular contracts and loop invariants

what it is and when to use it

The Dafny encoding represents each transition as a method with explicit state updates, preconditions, postconditions, and frame information. Modular verification lets the scheduler reason about method contracts instead of re-proving every implementation detail. The paper notes: “The features of the Dafny language support a natural encoding of the interlocking logic described in previous section.” (section 3, PDF p. 3)

how to do it

1. Define state datatypes and classes. A `Track` has `state` and `direction`; a `Route` has `state`, a change-direction request, a sequence of used tracks, and requested directions (Figure 1–2, PDF pp. 3–4).
2. Give constructors postconditions for initial state and well-formed route lengths.
3. Give methods frame clauses and postconditions. `lock` changes a track to `Locked` while preserving its direction; `go_free` changes the state to `Free`; `change_dir` preserves state and changes direction.
4. Define a route activation precondition: all used tracks are free and have the requested direction. Its postcondition locks every used track, preserves directions, and sets the route active (Figure 2, PDF p. 4).
5. Prove the loop that walks over a route's tracks with invariants for the processed prefix: processed tracks are locked and all used tracks preserve their old directions.

The paper points out a generator hazard: “we must explicitly include equalities among variables that remain unchanged in the postconditions.” (section 3, PDF p. 4) This is a concrete rule for generated specifications.

Verus form

Inference: The direct Verus analogue uses enum-like Rust types, `requires` and `ensures` on transition methods, `modifies`-style frame reasoning through the Verus-supported mutable-reference contracts, and loop `invariant` clauses for the processed prefix. Use `old(...)` in postconditions when a prior value must be preserved, as in the paper's Dafny code; Verus syntax and supported framing must be checked against the local Verus guide. Inference: prove route-list bounds and state-preservation lemmas with `proof fn` and `assert` statements. The paper's Dafny `modifies this.used[..]` is not a Verus construct to copy literally.

evidence and limits

The authors say Dafny verification succeeded for the component code and the scheduler once a stronger inductive invariant was supplied. They do not report line counts, proof time for Dafny, or a complete station configuration. The method assumes contracts faithfully represent generated C/Python behavior. Inference: VL should treat generated postconditions as claims requiring tests or refinement evidence, especially for aliasing and shared mutable state.

## technique 3: strengthen a safety property into an inductive invariant

what it is and when to use it

The desired property, `SecureStation`, says incompatible routes are not simultaneously active. It is not preserved by every transition as written. The authors therefore add `SecureInductiveStation`, which includes the safety property and a local fact: a route that uses a free track cannot be active. The paper states: “However, the verification succeeds when we provide a stronger inductive invariant that implies the original property - called \"Secure Inductive Station\".” (section 3, PDF p. 5)

how to do it

1. State the target safety predicate over all route pairs that share a track.
2. Check whether each scheduler transition preserves it. The paper finds that the target alone is insufficient.
3. Add the strengthening that every route using a free track is not active.
4. Put both predicates as scheduler loop invariants.
5. Prove that initialization establishes them and each route operation preserves them. The scheduler's postconditions then return `ValidStation` and `SecureInductiveStation` (Figure 3, PDF p. 5).

Verus form

Inference: In Verus, state the target and strengthening as `spec fn` predicates over an abstract station state. Put both in a loop `invariant` block and prove initialization and transition-preservation lemmas with `proof fn`. Use `assert` to expose route-track membership facts and `old(...)` to relate pre-state and post-state. Inference: the invariant must quantify over the finite collections in the chosen Verus representation; the paper's unbounded mathematical quantifiers are not automatically available over executable Rust collections.

evidence and limits

The strengthening is demonstrated on the simplified station, not on the full AIDA-generated railway system. The paper's scheduler is nondeterministic and uses an unbounded loop with `decreases *` in Dafny (Figure 3, PDF p. 5), so termination is not part of the reported safety proof. Inference: a VL proof should state separately whether it proves safety only, termination, liveness, or fairness.

## technique 4: slice the system into a symbolic parameterized transition system

what it is and when to use it

Parameterized model checking reasons about all system sizes by replacing finite collections with functions over abstract sorts. The paper defines a transition system `S = (X, I(X), T(X,X'))`, where `X` contains state variables, `I` is the initial formula, and `T` is the transition relation (section 4, PDF p. 5). It then keeps only variables relevant to the invariant, rather than encoding every class attribute. Use this when a finite instantiated model does not scale and the safety property depends on a small relational core.

how to do it

1. Choose abstract sorts `track` and `route`.
2. Represent track state as a function `track -> {free, locked}` and route state as `route -> {active, inactive}`.
3. Represent route-track membership with a binary predicate `UsedBy`.
4. State the initial formula: all tracks are free and all routes inactive.
5. Encode the `activate route` transition with an existentially selected inactive route, universal preconditions over its used tracks, and frame conditions that leave unrelated routes and tracks unchanged (section 4, PDF pp. 5–6).
6. Formulate `NotCompatible(r1,r2)` as distinct routes sharing a track and ask for an invariant implying that incompatible routes cannot both be active.

The authors explicitly say: “A key insight here is that we do not need to represent all the attributes of the class, but only the one relevant to building the inductive invariant.” (section 4, PDF p. 5)

Verus form

Inference: This abstraction can be represented in Verus by a ghost state model using finite `Set` or `Map` values when the deployed Rust instance is finite, with `spec fn` transitions and invariants over those maps. For a genuinely parameterized proof, use a mathematical sequence or map abstraction and prove that each concrete station refines one abstract state. Inference: the paper's function-valued unbounded sorts are outside ordinary executable Rust, so a direct Verus encoding would be a ghost abstraction rather than the runtime representation.

evidence and limits

The paper reports that the parameterized checker found the key invariant “in less than one second” for the simplified system (section 4, PDF p. 6). This is one run on a reduced model, not a complexity bound. The authors obtained the relevant-variable slice manually and state that automatic slicing is a future goal. Inference: abstraction choice is a major trusted input; an omitted variable can make a claimed invariant irrelevant to the concrete implementation.

## technique 5: import a model-checker invariant into Dafny

what it is and when to use it

The workflow combines complementary tools: Dafny checks the structured object-oriented implementation, while a parameterized SMT model checker discovers a quantified invariant on a smaller symbolic abstraction. The resulting formula is added as a Dafny ghost predicate and used by the scheduler proof. This avoids forcing one tool to handle both the full implementation structure and invariant synthesis.

how to do it

1. Define the abstract transition system and target property.
2. Run the parameterized model-checking algorithm to synthesize an invariant.
3. Translate the invariant back into the Dafny representation. In this example, the result is the `SecureInductiveStation` predicate.
4. Add it as a scheduler loop invariant and prove that each concrete method preserves it.
5. Keep the original `SecureStation` as a consequence required by the product safety claim (sections 3–4, PDF pp. 4–6).

Verus form

Inference: The analogous VL pipeline can export an abstract invariant as a Verus `spec fn`, then connect concrete Rust state to the abstract model with a representation invariant. Use a `proof fn` to show that every concrete transition maps to an abstract transition and preserves the imported predicate. Inference: the imported invariant is evidence from an external tool, not automatically trusted Verus proof text; Verus must prove the translation and refinement obligations.

evidence and limits

The paper's positive result is conditional on the manually simplified abstraction matching the Dafny implementation. It says that without Dafny, a monolithic model checker “often struggles to scale effectively when dealing with exceptionally large models.” (section 4, PDF p. 6) The paper does not quantify scalability on realistic stations, nor does it demonstrate automatic translation from SysML to Dafny or automatic invariant translation.

## trusted boundary, scope, and implications for VL

The paper proves or measures: Dafny contracts for a simplified track/route implementation; preservation of a strengthened scheduler invariant; and discovery of one invariant by a parameterized model checker in under one second. It leaves trusted the C/Python code generator, CNL-to-SysML translation, manual abstraction and variable selection, the mapping between symbolic and object-oriented models, solver correctness, and the adequacy of the modeled safety property. The work is explicitly ongoing: the authors plan an encoder from SysML to Dafny, property specification through TOSCA, template-generated simple invariants, and model-checker-generated complex invariants (section 5, PDF pp. 6–7).

Inference: the threat to VL is concentrated in abstraction and specification translation. An agent can produce a valid Verus proof for an abstract map while omitting a concrete field, alias relation, or transition. VL should therefore preserve a concrete-to-abstract representation invariant, trace each imported lemma to its source abstraction, and test that generated transitions cover all runtime effects. The paper's pattern is already done and should not be claimed as a new idea: model-based generic logic, modular contracts, strengthened inductive invariants, parameterized abstraction, and external invariant synthesis are its contributions and planned integration.

Inference: a useful new VL experiment would compare proofs with manually selected versus automatically sliced ghost state, measuring missed behaviors, proof repair, verifier time, and the number of concrete transitions whose abstraction obligations fail. This follows the paper's open challenge and is not a result reported by the authors.

## techniques for the catalog

- model-based generic specification: describe parameterized component behavior in controlled language and translate it through SysML to executable code
- modular transition contracts: encode guards, effects, frame conditions, and unchanged-state equalities on component methods
- strengthened inductive invariants: add a local preservation fact that implies the desired global safety property
- parameterized transition abstraction: represent all station sizes with abstract sorts, state functions, and a relational transition system
- external invariant synthesis: use a parameterized model checker to discover a quantified invariant for a reduced abstraction
- invariant import and refinement: translate the discovered invariant into Dafny or Verus and prove concrete transitions preserve it

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
