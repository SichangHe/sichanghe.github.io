# Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization
(authored by agents unless marked 🧑)
Tag: `cutler2024cedar`, [paper](https://doi.org/10.23919/FMCAD.2018.8602994)

## what the paper proves and builds

Cedar separates authorization rules from application code. A policy has an effect (`permit` or `forbid`), a scope over principal/action/resource, and optional conditions. The implementation is Rust; a Lean model defines the semantics and proofs. The paper claims, “We have modeled Cedar in the Lean programming language, and used Lean’s proof assistant to prove important properties of Cedar’s design.” (Abstract, p. 1) It also reports differential random testing between the Lean model and Rust implementation. Cedar is a useful architecture for a verified Rust product because the executable engine, specification, validator, compiler, and tests have distinct roles.

## technique 1: schema-directed policy validation

What it is. A schema declares entity types, attributes, parent types, actions, and allowed principal/resource shapes. Validation typechecks each policy separately for every environment induced by an allowed action. Optional attributes are guarded by static capabilities; boolean singleton types `True` and `False` propagate known outcomes.

When to use it. Use this before deployment to reject policies that can access a missing attribute, use a wrong type, or are vacuous or over-broad. Use action-specific environments when a generic environment would create false alarms.

How to do it.

1. Define entity types and parent relationships; in TinyTodo, `List` has `owner`, `readers`, and `editors` attributes (Section 2.5, p. 6; Figure 4).
2. Declare each action's permitted principal and resource entity types (Section 2.5, p. 6).
3. For each policy and each action schema, construct the request environment mapping `principal`, `action`, and `resource` to types (Section 2.5, p. 6).
4. Typecheck the policy in every such environment. A policy is valid only if every check succeeds (Section 2.5, p. 6).
5. Track a capability when an expression proves an optional attribute exists; reject an unguarded access. Propagate singleton `False` through short-circuit operators so an erroring branch of `false && ...` is unreachable (Section 2.5, p. 6).

Verus form. Inference: represent schemas and policies as Rust datatypes, define `spec fn well_typed` and `spec fn capability_safe`, and prove checker lemmas with `proof fn` declarations whose `ensures` state that accepted policies cannot produce a missing-attribute error. Use ordinary `requires`, `ensures`, `assert`, and loop `invariant` constructs. Inference: the paper's Lean typing judgment and singleton-type metatheory do not become Verus syntax automatically; the checker and its soundness proof must be implemented explicitly. Keep validation ghost/spec-only so it cannot authorize a request at runtime.

Evidence and limits. The paper proves “Validation soundness” in Lean: a well-typed expression evaluates to a value for every conforming entity store (Section 3.5, p. 13). The validation complexity is typically O(n a), with n policy size and a action count, because each action is specialized (Section 2.5, p. 6). The type system does not answer semantic questions such as policy equivalence; those require symbolic analysis (Section 2.6, p. 6).

## technique 2: deterministic authorization and sound policy slicing

What it is. Cedar denies by default, gives `forbid` precedence over `permit`, and selects only policies whose principal/action/resource scope can match a request. The slice is proved sound: excluded policies cannot satisfy that request.

When to use it. Use slicing when a policy set contains many scoped templates or policies. Retain the full-policy semantics as the reference because slicing is an optimization whose correctness must be proved.

How to do it.

1. Parse the request and policy scopes (Sections 2.3–2.4, pp. 4–5).
2. Index scope constraints on principal and resource, and select policies compatible with the request (Section 2.4, p. 5; Section 3.3, p. 11).
3. Evaluate selected policies. If any `forbid` evaluates true, deny; otherwise allow only if a `permit` evaluates true; otherwise deny (Section 2.4, p. 5).
4. Prove that every excluded policy cannot satisfy the request, the “Sound slicing” property in Section 3.5 (p. 13).

Verus form. Inference: encode requests and policies as ghost values, define a `spec fn slice_sound`, and use a `proof fn` with `ensures` that every excluded policy's match predicate is false for the request. The executable Rust authorizer can evaluate the slice; a second proof function can establish equivalence to evaluating all policies. Inference: Verus has no Cedar slice operator; indexing and the proof relation are product code to be designed.

Evidence. Lean proofs cover “Forbid trumps permit,” “Default deny,” “Explicit allow,” and “Sound slicing” (Section 3.5, p. 13). The paper's key safety claim is: “Cedar’s authorizer is deterministic: It is guaranteed to terminate and always produce the same authorization decision for a given request, hierarchy, and set of policies.” (Section 2.4, p. 5). Slicing is not uniformly faster: with templates it was about 18% faster than default Cedar for github but about 94% slower for gdrive (Section 5.3, p. 22); these are averages over the tested input sizes, not universal guarantees.

## technique 3: symbolic compilation to SMT

What it is. Compile a well-typed Cedar policy, entity store, and request into SMT terms so an analyzer can ask whether two policy sets differ. The compiler uses built-in SMT primitive/set types, algebraic datatypes for entities and records, and finite ground constraints for hierarchy well-formedness.

When to use it. Use it to check policy equivalence, subsumption, or a refactoring's semantic preservation, where testing cannot cover all requests and entity stores.

How to do it.

1. Encode Cedar types, entity stores, and requests as SMT types and variables (Section 4, p. 13; Section 4.1, p. 13).
2. Translate each well-typed Cedar expression to an SMT term using the rules in Figure 10 (Section 4.2, p. 14).
3. Add finite constraints making the entity hierarchy sufficiently well formed, including acyclicity constraints (Section 4.3, pp. 15–16).
4. Ask the solver for a model in which one policy set allows a request and the other denies it. A model becomes a concrete request/entity-store counterexample (Section 2.6, p. 6).
5. Use the counterexample to repair the policy; the paper's TinyTodo example adds `action == Action::"CreateList"` to fix an over-restrictive replacement (Section 2.6, p. 6).

Verus form. Inference: define a ghost policy semantics as `spec fn` predicates over request and entity-store values, then state equivalence as a `proof fn` whose `ensures` says both predicates agree for all modeled inputs. A Rust tool can emit SMT externally, but the compiler's soundness relation must be proved or separately trusted. Verus's `requires`, `ensures`, `assert`, and proof functions can verify a finite encoding; the paper's exact SMT translation and Lean theorem do not carry over automatically.

Evidence and trust. The paper states: “The Cedar symbolic encoding is sound and complete for standard policy analyses, such as equivalence or subsumption” (Section 4.4, p. 17). It says the result is proved on paper and that Lean proofs of the full encoder were underway (Section 4.4, p. 17), so the paper does not claim a completed mechanized proof of every compiler theorem. In 50 trials, median encoding-plus-solving times were 27.1+33.8 ms for github, 16.4+28.9 ms for gdrive, and 52.2+67.4 ms for TinyTodo for the correct refactoring; the sums are encoder plus solver times (Table 1, p. 22). Buggy refactorings took 29.9+40.9, 19.6+34.9, and 56.2+77.3 ms respectively (same table and denominator).

## technique 4: model-to-Rust differential testing

What it is. Compile the executable Lean model to native code, generate random policies, entity stores, and requests, and compare Lean and Rust outputs. Separately fuzz parser/printer round trips and Rust properties.

When to use it. Use this after formalizing semantics and implementing the Rust engine. It detects implementation/model divergence and keeps the specification synchronized in continuous integration; it is not a substitute for proofs.

How to do it.

1. Write generators for policies, entity stores, and requests in the style described in Section 3.6 (p. 13).
2. Feed identical inputs to compiled Lean and Rust implementations and require equal authorization outputs.
3. Use `cargo fuzz` for differential tests and direct Rust properties, including parse-after-pretty-print round trips (Section 3.6, p. 13).
4. Run the tests in CI so changes that invalidate the model or proofs are rejected (Section 3.6, p. 13).

Verus form. Inference: generate owned Rust inputs satisfying schema preconditions, run the executable implementation, and compare it with a pure `spec fn` reference through proof harnesses. Fuzzing remains an untrusted test generator; Verus contracts and proof functions establish the universal claims. Inference: a Verus reference model must avoid `external_body` or unchecked axioms if the product's claim is end-to-end verification.

Evidence. The authors report that this regime found “nearly two dozen bugs since the project’s inception” and forced CI to keep the Lean specification and proofs up to date (Section 3.6, p. 13). Performance tests used one EC2 m5.4xlarge, 200 datastores and 500 random requests per datastore, totaling 100,000 requests per datapoint; they report medians and p99 times (Section 5.2.1, p. 20). Cedar was 28.7×, 34.4×, and 35.2× faster than OpenFGA on gdrive, github, and TinyTodo, and 60.4×, 80.8×, and 42.8× faster than Rego, respectively, averaged over tested input sizes and median performance (Section 5.2.2, p. 20). These comparisons exclude storage, parsing, initialization, and HTTP time (Section 5.2.1, p. 20).

## what remains trusted and what VL should learn

Lean's kernel, the formal Cedar model, the proofs actually completed, the SMT solver and encoding implementation, Rust compiler, test harness, schemas, and generated random data form the practical trust boundary. Differential tests provide sampled evidence; they do not prove that every generated policy is safe. The authors state that formal proofs exposed bugs in the semantics and validator (Section 3.5, p. 13), showing why writing the model is itself a discovery technique.

Inference: threat to an agent-written verified-Rust product is high for authorization components but low for general Rust verification. Cedar already supplies a production Rust engine, a Lean-checked semantic model, a schema validator, symbolic policy analysis, and fuzzing discipline. VL should not redo a generic “verified policy language” study. Its distinct opportunity is agent-facing synthesis and repair of Rust/Verus contracts, with Cedar-style reference models, counterexamples, and CI differential tests used as acceptance evidence. The paper's performance and correctness numbers are for Cedar's three examples and specified hardware/settings; they do not establish equivalent results for arbitrary VL workloads.

## techniques for the catalog

- schema-directed validation — specialize policy typing to action schemas and use capabilities and singleton booleans to rule out runtime errors
- default-deny authorization — make forbid precedence and explicit permits part of a deterministic, Lean-proved decision semantics
- sound policy slicing — index scopes to evaluate a smaller policy set while proving excluded policies cannot match
- symbolic SMT compilation — encode policies and finite hierarchy constraints to find equivalence counterexamples
- differential model testing — compare generated Lean-model and Rust executions and fuzz parser/printer properties in CI
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
