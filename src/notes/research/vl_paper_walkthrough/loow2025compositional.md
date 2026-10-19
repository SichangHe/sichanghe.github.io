# Compositional Symbolic Execution for the Next 700 Memory Models
(authored by agents unless marked 🧑)
Tag: `loow2025compositional`, [paper](https://doi.org/10.1145/3763151)

## what the paper proves

The paper gives a mechanised Rocq foundation for compositional symbolic execution (CSE) whose memory model is an explicit parameter. It defines concrete memory, assertion resources, symbolic memory, and relations needed to lift local reasoning to whole-engine over-approximate (OX) verification and under-approximate (UX) bug finding. The paper states its central gap precisely: “No previous work provides a satisfactory formal foundation for CSE platforms that are parametric on the memory model” (section 1, p. 2). The authors instantiate the theory for linear, fractional-ownership, C block-offset, object-oriented, CHERI, and VeriFast/Viper-inspired models.

The soundness target concerns terminating executions. Subject to the restrictions below, OX covers every concrete execution from a represented initial state; UX requires every concrete state represented by a symbolic result to be reachable from some represented initial state. The paper explains the use: “OX soundness is a good foundation for verification and UX soundness is a good foundation for bug-finding” (section 2.1, p. 5). The theory covers sequential memory models and a simple imperative demonstrator language; concurrent memory models and varying the rest of the language are outside the paper's scope (section 1, p. 4).

## technique: factor a verifier into memory-model instance data

What it is. The authors make the CSE engine generic, and supply each memory model through seven instance definitions (IDefs) and four instance properties (IProps). The four abstractions are concrete memory model, resource model, symbolic memory model, and OX/UX relations. Inference: this isolates model-specific state and proof obligations from the generic execution engine.

When to use it. Inference: use this architecture when one verifier must support languages or ownership disciplines whose heaps differ. The paper gives the reason: “there is no one-size-fits-all memory models” because accuracy, abstraction, implementation effort, performance, and annotation burden trade off (section 1, p. 2).

How to do it.

1. Define `CMem`, an empty memory, a partial composition operator, and well-formedness. Require that memory, the empty element, and composition form a partial commutative monoid (PCM); the empty memory must be well-formed and composition must preserve well-formedness (IDef. 1 and IProp. 1, section 3, p. 8).
2. Define each concrete memory action as a relation from memory and arguments to an outcome, new memory, and returned values. Require preservation of well-formedness (IDef. 2, section 3, p. 8).
3. Prove the OX and/or UX frame properties required for the intended analysis. OX requires that removing a frame allows an action to return `miss` or reproduce the original outcome, return values, and residual memory. UX requires that adding a composable frame to a non-`miss` final memory preserves the execution and frame (IProp. 2, section 3, p. 9).
4. Define resource assertions and their satisfaction relation, such as points-to or negative-cell assertions (IDef. 3, section 4, p. 10).
5. Define symbolic memory, its empty element, satisfaction, symbolic action semantics, and resource-level `consumeRes`/`produceRes` operations (IDefs. 4–7, sections 5.1–5.4, pp. 11–13).
6. Prove the corresponding OX/UX soundness properties for symbolic actions and resource operations. Lemma 5.1 lifts resource-operation soundness to generic `consume` and `produce` soundness (sections 5.3–5.4, pp. 12–14).
7. Instantiate the generic CSE rules and apply Theorems 5.2 and 5.3, which establish OX and UX engine soundness under the corresponding instance properties (section 5.5, p. 14).

The running linear model is concrete: memory is a finite map from natural addresses to values or a freed marker; composition is disjoint union; actions are `lookup`, `mutate`, `new`, and `free` (section 3, pp. 8–9). The lookup rules include an `ok` result for a present cell and `miss` with `"MissingCell"` for an absent address (section 3, p. 8).

Verus form. Inference: represent the generic engine as Rust traits or proof-oriented modules whose associated spec types provide memory, composition, action semantics, resource satisfaction, and symbolic operations. Use `spec fn` for mathematical relations, `requires`/`ensures` on executable or proof functions, and `proof fn` lemmas for PCM and frame properties. Keep concrete and symbolic memories as distinct types. This is a proposed translation; the paper reports a Rocq mechanisation.

Evidence. Table 1 lists nine model variants. Cut branching is UX-only; the linear model without negative information and the VeriFast/Viper-inspired model are OX-only. The other rows have both OX and UX checkmarks, with two qualifications: the object-oriented model is not mechanised, and CHERI has only a mechanised OX proof. The table explains: “the mechanised proof only covers OX soundness” and “UX soundness is left for future work because of the size of the task” (table 1 caption, p. 3). Nonzero proof-script sizes range from approximately 0.5 to 19 kLoC; CHERI is 19 kLoC and the block-offset model is 4 kLoC (table 1, p. 3). The authors say the artefact contains “all source code and proofs of our Rocq mechanisation” (section 1, p. 4).

Limits. The concrete memory model remains in the trusted computing base: “the TCB of analysis results includes only the semantics of assertions (to express pre- and postconditions) and the concrete semantics of the language” (section 5.6, p. 15). Inference: a Verus port would need its own account of which semantics and implementation components it trusts.

## technique: consume-produce symbolic execution

What it is. Execute assertion-based commands by consuming a precondition from the symbolic state and producing a postcondition. A function call consumes its specification precondition and produces its postcondition (section 2.1, p. 4). Symbolic state contains a symbolic store, symbolic memory, user predicates, and a path condition (section 5.1, p. 11).

How to apply it.

1. Start with a symbolic state and a function-specification context that is valid for the implementation (section 4, p. 10).
2. Call `consume(mode, oracle, assertion, substitution, state)`. The result is an outcome, updated oracle and substitution, and a state with the assertion's resources removed (section 5.4, p. 12).
3. Implement resource-specific `consumeRes` to return an outcome, updated oracle, output expressions, residual memory, a condition that the input state must imply, and a condition to append to the path condition. Generic `consume` extends the substitution using the returned output expressions (section 5.4, pp. 12–13).
4. Call `produce` with the postcondition; its resource operation adds the symbolic resources (section 5.4, p. 13).
5. Prove the four consume/produce soundness obligations (OX and UX for each). The paper's UX consume condition requires that any composable models of the consumed assertion and residual state together model the original state (section 5.4, p. 13).
6. Use the generic function-call and predicate fold/unfold rules. The paper mechanises function calls as OX- and UX-sound and fold/unfold as OX-sound (section 5.4, p. 14).

Verus form. Inference: describe symbolic states and consume/produce relations with specification types and functions, and prove the four soundness obligations with proof functions. An executable engine would additionally need implementations proved to satisfy those relations.

Evidence and failure. Theorems 5.2 and 5.3 require valid function specifications and the corresponding mode and instance properties. The OX theorem requires every reachable satisfiable symbolic result to exclude `abort`, and any such `miss` result to contain no symbolic predicates. The UX theorem imposes those outcome restrictions on the selected symbolic result. The authors explain: “the soundness of miss outcomes cannot be guaranteed in the presence of symbolic predicates” (section 5.5, p. 14). Their counterexample hides cell 1 in a predicate: concrete lookup succeeds, symbolic lookup returns `miss`, and both soundness directions fail (section 5.5, p. 14). Appendix C.8 additionally restricts the demonstrated OX function-verification procedure to non-recursive functions: “for now our verification procedure only handles non-recursive functions” (p. 38).

## technique: bi-abduction for UX bug finding

What it is. Start from an empty precondition, run UX symbolic execution, and turn missing-resource errors into an anti-heap assertion describing resources that must be added. The paper calls this “a technique that facilitates automatic ISL specification synthesis by incrementally discovering the resources needed to execute a given piece of code starting from an empty pre-condition/symbolic state” (section 5.6, p. 15).

Steps.

1. Run the UX engine on command `C` with a symbolic state and valid function specs.
2. Catch `miss` and `abort` outcomes.
3. Invoke a memory-model-dependent `fix` operation on the current symbolic state to construct assertions for missing resources.
4. Produce those assertions into the state and append them to the anti-heap.
5. Continue execution until a final outcome and anti-heap are returned.
6. Apply Theorem 5.4: for each concrete state represented by the final symbolic state, there must exist an initial concrete state and a concrete fix memory satisfying the anti-heap, whose composition executes to that final state with the reported outcome. The initial state satisfies the initial symbolic state with its path condition replaced by the final path condition (section 5.6, p. 15).

Verus form. Inference: model the anti-heap as an assertion and use ghost witnesses to prove the concrete reachability property. A separate executable `fix` implementation would need to satisfy that specification.

Evidence. The paper says the UX result generalises prior linear-memory work and that soundness follows from Theorem 5.3 plus Lemma 5.1 (section 5.6, p. 15). No benchmark denominator or bug count is reported in the paper; the evidence is mechanised theorem proving and model instantiation.

## what is proved, measured, and trusted

Proved: generic OX and UX engine soundness, sound consume/produce lifting, function-call soundness, OX predicate fold/unfold, and UX bi-abduction soundness, conditional on instance properties (sections 5.4–5.6, pp. 13–15). Measured: Rocq proof-script sizes for the memory models in Table 1, from about 0.5 to 19 kLoC; no runtime or defect-detection denominator is supplied (table 1, p. 3). Trusted: the paper identifies concrete language and assertion semantics, including the concrete memory model. It demonstrates removal of ghost annotations from the TCB through a simulation argument (section 5.6, p. 15).

Inference: for agent-written verified Rust, reusing a symbolic execution engine without proving its model-specific obligations can invalidate the claimed soundness. Its reusable design is also an opportunity: a Verus library could make those obligations explicit and reject an unsupported memory model before proofs are attempted. The paper's sequential demonstrator and lack of concurrent memory models leave concurrency-specific threats unresolved.

## techniques for the catalog

- memory-model-parametric CSE: factor concrete memory, resources, symbolic memory, and OX/UX relations into instance definitions and properties, then reuse one engine
- consume-produce reasoning: implement assertion consumption and production with four soundness obligations and lift them to calls and predicates
- bi-abduction: repair UX missing-resource errors with a model-dependent anti-heap and prove the concrete witness theorem
- OX/UX frame design: require PCM composition and separate over-approximate and under-approximate frame properties for each memory action
