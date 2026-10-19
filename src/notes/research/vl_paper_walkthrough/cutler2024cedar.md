# Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization
(authored by agents unless marked 🧑)
Tag: `cutler2024cedar`, [paper](https://arxiv.org/abs/2403.04651v2)

## what the paper proves and builds

Cedar separates authorization rules from application code. A policy has an effect (`permit` or `forbid`), a scope over principal/action/resource, and optional conditions. The implementation is Rust; a Lean model defines the semantics and proofs. The paper claims, “We have modeled Cedar in the Lean programming language, and used Lean’s proof assistant to prove important properties of Cedar’s design.” (Abstract, p. 1) It also reports differential random testing between the Lean model and Rust implementation. Inference: Cedar is a useful architecture for a verified Rust product because the executable engine, specification, validator, compiler, and tests have distinct roles.

## technique 1: schema-directed policy validation

What it is. A schema declares entity types, attributes, parent types, actions, and allowed principal/resource/context shapes. Validation typechecks each policy separately for every environment induced by an allowed action. Optional attributes are guarded by static capabilities; boolean singleton types `True` and `False` propagate known outcomes.

When to use it. Inference: use validation before deployment to catch type errors and unguarded optional-attribute accesses. Its guarantees require conforming requests and entity stores, with referenced entities defined. Singleton types also support warnings for policies that are always true or always false; validation does not establish that a policy grants the intended permissions.

How to do it.

1. Define entity types and parent relationships; in TinyTodo, `List` has `owner`, `readers`, and `editors` attributes (Section 2.5, p. 6; Figure 4).
2. Declare each action's permitted principal and resource entity types (Section 2.5, p. 6).
3. For each action, construct every permitted request environment mapping `principal`, `resource`, and `context` to types. Convert the policy to an expression and substitute the action entity for `action` (Section 3.4, p. 10).
4. Typecheck the policy in every such environment. A policy is valid only if every check succeeds (Section 2.5, p. 6).
5. Track a capability when an expression proves an optional attribute exists; reject an unguarded access. Propagate singleton `False` through short-circuit operators so an erroring branch of `false && ...` is unreachable (Section 2.5, p. 6).

Verus form. Inference: represent schemas and policies as Rust datatypes, define `spec fn well_typed` and `spec fn capability_safe`, and prove checker lemmas with `proof fn` declarations whose `ensures` state that accepted policies cannot produce a missing-attribute error. Use ordinary `requires`, `ensures`, `assert`, and loop `invariant` constructs. Inference: the paper's Lean typing judgment and singleton-type metatheory do not become Verus syntax automatically; the checker and its soundness proof must be implemented explicitly. Inference: a runtime validator would need executable code connected to the specification by a soundness proof; a ghost predicate alone does not implement validation.

Evidence and limits. The paper proves “Validation soundness” in Lean, assuming a conforming request and entity store and that “entity references in 𝑐 and 𝜎 are defined.” (Section 3.5, p. 12) This qualification matters for missing-entity accesses. The validation complexity is typically O(n a), with n policy size and a action count, because each action is specialized (Section 2.5, p. 6). The type system does not answer semantic questions such as policy equivalence; those require symbolic analysis (Section 2.6, p. 6).

## technique 2: deterministic authorization and sound policy slicing

What it is. Cedar denies by default, gives `forbid` precedence over `permit`, and indexes policies using principal and resource scope constraints. The slice is proved sound: excluded policies cannot satisfy that request.

When to use it. Inference: use slicing when a large policy store has principal/resource scope constraints and the requested entities have relatively few ancestors. Retain evaluation of all policies as the reference semantics.

How to do it.

1. Parse the request and policy scopes (Sections 2.3–2.4, pp. 4–5).
2. Index each policy by its named principal and resource, using `Any` for an unconstrained component. Form request keys from the cross-product of the principal and resource, their ancestors, and `Any`; union the policy sets stored at those keys (Section 3.3, pp. 9–10).
3. Convert selected policies to expressions and evaluate them. Collect only policies evaluating to true, skipping policies that error. If any collected policy is `forbid`, deny; otherwise allow only if a collected policy is `permit`; otherwise deny (Section 3.3, p. 9).
4. Prove that every excluded policy cannot satisfy the request, the “Sound slicing” property in Section 3.5 (p. 12).

Verus form. Inference: encode requests and policies as ghost values, define a `spec fn slice_sound`, and use a `proof fn` with `ensures` that every excluded policy's match predicate is false for the request. The executable Rust authorizer can evaluate the slice; a second proof function can establish equivalence to evaluating all policies. Inference: Verus has no Cedar slice operator; indexing and the proof relation are product code to be designed.

Evidence. Lean proofs cover “Forbid trumps permit”, “Default deny”, “Explicit allow”, and “Sound slicing” (Section 3.5, p. 12). The paper's key safety claim is: “The third aspect of safety is that Cedar’s authorizer is deterministic: It is guaranteed to terminate and always produce the same authorization decision for a given request, hierarchy, and set of policies.” (Section 2.4, p. 5). Slicing is not uniformly faster: averaged across tested input sizes, the median for templates with slicing was about 18% faster than default Cedar for github but about 94% slower for gdrive (Section 5.3, p. 22).

## technique 3: symbolic compilation to SMT

What it is. Compile well-typed Cedar expressions under a schema and request environment into SMT terms so an analyzer can ask whether two policy sets differ. Uninterpreted functions and constants represent possible entity stores and requests. The encoding uses SMT primitive types, CVC5’s set theory, algebraic datatypes for entities and records, and finite ground constraints for hierarchy well-formedness.

When to use it. Inference: use it to check policy equivalence, subsumption, or a refactoring’s semantic preservation across all well-formed inputs conforming to a schema and request environment.

How to do it.

1. Encode Cedar types, entity stores, and requests as SMT types and variables (Section 4, p. 13; Section 4.1, p. 13).
2. Translate each well-typed Cedar expression to an SMT term using Figure 10. The term has an `Option` type; `none` represents an error not ruled out by validation (Section 4.2, pp. 15–16).
3. Collect entity-typed subexpressions to over-approximate the expression’s entity footprint. Generate ground acyclicity and transitivity constraints for this footprint, avoiding universally quantified hierarchy constraints (Section 4.3, pp. 15–17).
4. Ask the solver for a model in which one policy set allows a request and the other denies it. A model becomes a concrete request/entity-store counterexample (Section 2.6, p. 7).
5. Use the counterexample to repair the policy; the paper’s TinyTodo example adds `&& action == Action::"CreateList"` to Policy 0.1’s `unless` condition so it excludes only interns creating lists, rather than also excluding interns listing their lists (Section 2.6, p. 7).

Verus form. Inference: define a ghost policy semantics as `spec fn` predicates over request and entity-store values, then state equivalence as a `proof fn` whose `ensures` says both predicates agree for all modeled inputs. A Rust tool can emit SMT externally, but the compiler's soundness relation must be proved or separately trusted. Verus's `requires`, `ensures`, `assert`, and proof functions can verify a finite encoding; the paper's exact SMT translation and Lean theorem do not carry over automatically.

Evidence and trust. The paper states: “The Cedar symbolic encoding is sound and complete for standard policy analyses, such as equivalence or subsumption [5].” (Section 4.4, p. 17). It says the result is proved on paper and that Lean proofs of the full encoder were underway (Section 4.4, p. 17), so the paper does not claim a completed mechanized proof of every compiler theorem. In 50 trials, median encoding-plus-solving times were 27.1+33.8 ms for github, 16.4+28.9 ms for gdrive, and 52.2+67.4 ms for TinyTodo for the correct refactoring; the sums are encoder plus solver times (Table 1, p. 22). Buggy refactorings took 29.9+40.9, 19.6+34.9, and 56.2+77.3 ms respectively (same table, 50 trials). The solver was CVC5 1.0.5 on an Intel Xeon Platinum 8124M at 3.00 GHz. Invalid cases include an additional action and therefore an additional solver invocation (p. 23).

## technique 4: model-to-Rust differential testing

What it is. Compile the executable Lean model to native code, generate random policies, entity stores, and requests, and compare Lean and Rust outputs. Separately fuzz parser/printer round trips and Rust properties.

When to use it. Inference: use this after formalizing semantics and implementing the Rust engine to detect implementation/model divergence. The authors report that it helped keep the model and proofs synchronized in continuous integration; sampled tests do not establish universal correctness.

How to do it.

1. Write generators for policies, entity stores, and requests in the style described in Section 3.6 (p. 13).
2. Feed identical inputs to compiled Lean and Rust implementations and require equal authorization outputs.
3. Use `cargo fuzz` for differential tests and direct Rust properties, including parse-after-pretty-print round trips (Section 3.6, p. 13).
4. Run this testing regime in CI to help keep the specification and proofs up to date (Section 3.6, p. 13).

Verus form. Inference: use an executable reference implementation for runtime differential testing. Separately state the reference semantics with `spec fn` definitions and prove that executable functions agree with it. A specification function alone cannot serve as the executable fuzzing oracle. These are proposed adaptations, not techniques evaluated in this paper.

Evidence. The authors report that this regime found “nearly two dozen bugs since the project’s inception” and forced CI to keep the Lean specification and proofs up to date (Section 3.6, p. 13). Performance tests used one EC2 m5.4xlarge, 200 datastores and 500 random requests per datastore, totaling 100,000 requests per datapoint; they report medians and p99 times (Section 5.2.1, p. 20). Cedar was 28.7×, 34.4×, and 35.2× faster than OpenFGA on gdrive, github, and TinyTodo, and 60.4×, 80.8×, and 42.8× faster than Rego, respectively, averaged over tested input sizes and median performance (Section 5.2.2, p. 20). These comparisons exclude storage, parsing, initialization, and HTTP time (Section 5.2.1, p. 20).

## what remains trusted and what VL should learn

Inference: assurance depends on the formal model matching intended authorization behavior, the proof checker, the Rust implementation and build tools, and the analysis implementation and solver. Schemas and input conformance are assumptions of the validation and analysis claims. Differential testing checks agreement on sampled inputs; it does not prove Rust/Lean equivalence. The authors write: “Moreover, writing down a formal spec forced us to think deeply about corner cases, and the process revealed other subtle bugs in our semantics.” (Section 3.5, p. 13)

Inference: VL could adapt Cedar’s separation of executable code, reference semantics, validation, symbolic analysis, and differential testing when synthesizing or repairing Rust/Verus contracts. This paper does not evaluate Verus, agent-written Rust, or VL; it does not establish their performance, correctness, or competitive position. The main performance comparison uses three example applications and specified settings; Section 6 also reports a small experiment with translated AWS IAM policies.

## techniques for the catalog

- schema-directed validation — specialize policy typing to action schemas and use capabilities and singleton booleans to exclude type and optional-attribute errors under the soundness assumptions
- default-deny authorization — make forbid precedence and explicit permits part of a deterministic, Lean-proved decision semantics
- sound policy slicing — index scopes to evaluate a smaller policy set while proving excluded policies cannot match
- symbolic SMT compilation — encode policies and finite hierarchy constraints to find equivalence counterexamples
- differential model testing — compare generated Lean-model and Rust executions and fuzz parser/printer properties in CI
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We have also implemented the symbolic encoder in Lean, and proofs of soundness and completeness using the Lean encoder are underway, as of this writing."): read the complete extended paper, including references and Appendix A; checked quotations, numbers, section/page references, and technique steps; corrected the unrelated DOI to the paper’s arXiv identifier, validation assumptions and environments, slicing details, symbolic encoding steps, page references, and unsupported Verus/VL claims; did not inspect code or proof artifacts, reproduce experiments, or independently validate the proposed Verus adaptations.
