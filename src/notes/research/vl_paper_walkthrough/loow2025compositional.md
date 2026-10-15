# Compositional Symbolic Execution for the Next 700 Memory Models
(authored by agents unless marked 🧑)
Tag: `loow2025compositional`, [paper](https://doi.org/10.1145/3763151)

## what the paper proves

The paper gives a mechanised Rocq foundation for compositional symbolic execution (CSE) whose memory model is an explicit parameter. It defines concrete memory, assertion resources, symbolic memory, and relations needed to lift local reasoning to whole-engine over-approximate (OX) verification and under-approximate (UX) bug finding. The paper states its central gap precisely: “No previous work provides a satisfactory formal foundation for CSE platforms that are parametric on the memory model” (section 1, p. 2). The authors instantiate the theory for linear, fractional-ownership, C block-offset, object-oriented, CHERI, and VeriFast/Viper-inspired models.

The soundness target is operational. OX requires every concrete step from a represented state to have a matching symbolic step; UX requires every symbolic result to correspond to some concrete execution. The paper explains the use: “OX soundness is a good foundation for verification and UX soundness is a good foundation for bug-finding” (section 2.1, p. 5). The theory covers sequential languages and a simple demonstrator language; concurrent memory models and varying the rest of the language are outside the paper's scope (section 1, p. 4).

## technique: factor a verifier into memory-model instance data

What it is. Make the CSE engine generic, and supply each memory model through seven instance definitions (IDefs) and four instance properties (IProps). The four abstractions are concrete memory model, resource model, symbolic memory model, and OX/UX relations. This isolates model-specific state and proofs from the generic execution engine.

When to use it. Use this architecture when one verifier must support languages or ownership disciplines whose heaps differ. The paper gives the reason: “there is no one-size-fits-all memory models” because accuracy, abstraction, implementation effort, performance, and annotation burden trade off (section 1, p. 2).

How to do it.

1. Define `CMem`, an empty memory, a partial composition operator, and well-formedness. Require that these form a partial commutative monoid (PCM) (IDef. 1 and IProp. 1, section 3, pp. 8–9).
2. Define each concrete memory action as a relation from memory and arguments to an outcome, new memory, and returned values. Require preservation of well-formedness (IDef. 2, section 3, p. 8).
3. Prove OX and UX frame properties for every action. The OX property permits a frame to cause a miss or preserve the action's result; UX lifts a successful action to a disjoint frame (IProp. 2, section 3, pp. 9–10).
4. Define resource assertions and their satisfaction relation, such as points-to or negative-cell assertions (IDef. 3, section 4, p. 10).
5. Define symbolic memory, its empty element, satisfaction, symbolic action semantics, and resource-level `consumeRes`/`produceRes` operations (IDefs. 4–7, section 5, pp. 11–14).
6. Prove OX/UX soundness for symbolic actions and resource operations. Lemma 5.1 then lifts those proofs to generic `consume` and `produce` operations (section 5.4, p. 14).
7. Instantiate the generic CSE rules and apply Theorems 5.2 and 5.3, which establish OX and UX engine soundness under the corresponding instance properties (section 5.5, pp. 14–15).

The running linear model is concrete: memory is a finite map from natural addresses to values or a freed marker; composition is disjoint union; actions are `lookup`, `mutate`, `new`, and `free` (section 3, pp. 8–9). The lookup rules include an `ok` result for a present cell and `miss` with `"MissingCell"` for an absent address (section 3, p. 8).

Verus form. Inference: represent the generic engine as Rust traits or proof-oriented modules whose associated spec types provide memory, composition, action semantics, resource satisfaction, and symbolic operations. Use `spec fn` for mathematical relations, `requires`/`ensures` on executable or proof functions, and `proof fn` lemmas for PCM and frame properties. Keep concrete and symbolic memories as distinct types; do not model `invariant` as a call. The paper's Rocq development is a separate trusted prover, so this is a translation plan rather than a reported Verus implementation.

Evidence. Table 1 reports nine model variants. All listed models have OX proofs; UX is absent for the cut-branching and no-negative-information linear variants, and CHERI's UX proof is explicitly left for future work. Mechanised proof sizes range from approximately 0.5 to 19 kLoC; CHERI is 19 kLoC and OX-only, while the block-offset model is 4 kLoC (table 1, p. 3). The authors say the artefact contains “all source code and proofs of our Rocq mechanisation” (section 1, p. 4).

Limits. The concrete memory model remains in the trusted computing base: “the TCB of analysis results includes only the semantics of assertions (to express pre- and postconditions) and the concrete semantics of the language” (section 5.6, p. 16). Inference: a Verus port would still trust the executable memory implementation, external specifications, Verus translation, solver, and hardware unless separately modelled.

## technique: consume-produce symbolic execution

What it is. Execute assertion-based commands by consuming a precondition from the symbolic state and producing a postcondition. A function call consumes its specification precondition and produces its postcondition (section 2.1, pp. 4–5). Symbolic state contains a symbolic store, symbolic memory, user predicates, and a path condition (section 5.1, p. 11).

How to apply it.

1. Start with a symbolic state and a function-specification context that is valid for the implementation (section 4, p. 10).
2. Call `consume(mode, oracle, assertion, substitution, state)`. The result is an outcome, updated oracle and substitution, and a state with the assertion's resources removed (section 5.3, pp. 12–13).
3. Implement resource-specific `consumeRes` to return residual memory, output bindings, an implied path condition, and a new path condition. In the linear example, consuming `x ↦ y` removes that symbolic cell and binds `y` (section 5.4, p. 13).
4. Call `produce` with the postcondition; its resource operation adds the symbolic resources (section 5.4, p. 13).
5. Prove the four consume/produce soundness obligations (OX and UX for each). The paper's UX consume condition requires that composing the consumed resource with the residual state models the original state (section 5.4, p. 14).
6. Use the generic function-call and predicate fold/unfold rules. The paper mechanises function calls as OX- and UX-sound and fold/unfold as OX-sound (section 5.4, p. 15).

Verus form. Inference: encode a symbolic state as a ghost structure with a map, predicate multiset, and path-condition spec value. Implement consuming and producing as proof functions that establish map-update and separation lemmas; expose executable code only after proof erasure. Rust ownership can enforce unique access to concrete resources, while ghost state records logical ownership fractions. Verus does not automatically obtain Rocq's coinductive or relational definitions, so those relations need explicit specs and lemmas.

Evidence and failure. Theorems 5.2 and 5.3 require a valid function-specification context and forbid `abort`; `miss` is sound only when no symbolic predicates remain. The paper gives a counterexample in which a predicate hides cell 1: concrete lookup succeeds, symbolic lookup returns `miss`, and both soundness directions fail (section 5.5, p. 15). This is a concrete completeness boundary, not a solver failure.

## technique: bi-abduction for UX bug finding

What it is. Start from an empty precondition, run UX symbolic execution, and turn missing-resource errors into an anti-heap assertion describing resources that must be added. The paper calls this “a technique that facilitates automatic ISL specification synthesis by incrementally discovering the resources needed to execute a given piece of code starting from an empty pre-condition/symbolic state” (section 5.6, p. 16).

Steps.

1. Run the UX engine on command `C` with a symbolic state and valid function specs.
2. Catch `miss` and `abort` outcomes.
3. Invoke a memory-model-dependent `fix` operation on the current symbolic state to construct assertions for missing resources.
4. Produce those assertions into the state and append them to the anti-heap.
5. Continue execution until a final outcome and anti-heap are returned.
6. Apply Theorem 5.4: there must exist a concrete state satisfying the initial symbolic state and a concrete “fix” memory satisfying the anti-heap such that execution from their composition reaches the reported outcome (section 5.6, p. 16).

Verus form. Inference: model the anti-heap as a ghost predicate or finite resource map and prove that `fix` supplies a frame satisfying the missing-resource precondition. A Verus proof would establish the theorem's existential witness through ghost values; it would not make `fix` executable unless the product needs runtime synthesis.

Evidence. The paper says the UX result generalises prior linear-memory work and that soundness follows from Theorem 5.3 plus Lemma 5.1 (section 5.6, p. 16). No benchmark denominator or bug count is reported in the paper; the evidence is mechanised theorem proving and model instantiation.

## what is proved, measured, and trusted

Proved: generic OX and UX engine soundness, sound consume/produce lifting, function-call soundness, OX predicate fold/unfold, and UX bi-abduction soundness, conditional on instance properties (sections 5.4–5.6, pp. 14–16). Measured: Rocq proof-script sizes for the memory models in Table 1, from about 0.5 to 19 kLoC; no runtime or defect-detection denominator is supplied (table 1, p. 3). Trusted: concrete language and assertion semantics, the Rocq kernel and extraction/toolchain, and the chosen memory model; ghost annotations can be removed from the TCB only by a separate simulation argument (section 5.6, p. 16).

Inference: for agent-written verified Rust, the paper presents a high threat when agents assume that a generic symbolic execution layer is sound without proving model-specific PCM, frame, consume, and produce obligations. Its reusable design is also an opportunity: a Verus library could make those obligations explicit and reject an unsupported memory model before proofs are attempted. The paper's sequential demonstrator and lack of concurrent memory models leave concurrency-specific threats unresolved.

## techniques for the catalog

- memory-model-parametric CSE: factor concrete memory, resources, symbolic memory, and OX/UX relations into instance definitions and properties, then reuse one engine
- consume-produce reasoning: implement assertion consumption and production with four soundness obligations and lift them to calls and predicates
- bi-abduction: repair UX missing-resource errors with a model-dependent anti-heap and prove the concrete witness theorem
- OX/UX frame design: require PCM composition and separate over-approximate and under-approximate frame properties for each memory action
Checked 2026-10-15 against paper loow2025compositional: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
