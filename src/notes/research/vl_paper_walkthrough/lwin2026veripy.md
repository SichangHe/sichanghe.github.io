# VeriPy Source-Preserving Verification and Compatibility Checking for Python Components
(authored by agents unless marked 🧑)
Tag: `lwin2026veripy`, [paper](https://doi.org/10.48550/arxiv.2610.02814)

## scope and result

Lwin presents VeriPy, an implemented workflow that keeps Python source, contracts, backend proofs, native callers, and old/new compatibility checks connected. The abstract states: “Developers and agents express contracts, invariants, and proof hooks as Python comments, then refine checked auxiliary lemmas using source-located diagnostics.” (Abstract, p. 1). Direct AST encoders emit Dafny or Lean while preserving admitted executable bodies. A relational product checks old-domain inclusion and equality of returned values and modeled exception outcomes. This is a workflow and evaluation paper, not a Verus implementation; its reported results are for Python, Dafny 4.11.0, Lean 4.33.1, and pinned repositories.

## technique 1: source-located contracts, invariants, and proof hooks

what it is: put preconditions, postconditions, loop invariants, decreases measures, and named proof calls beside executable statements as comments. The implementation remains available to native callers; annotations are interpreted by VeriPy and erased for execution.

when to use: use this when developers or agents need diagnostics tied to the original source and when proof code must not alter runtime behavior.

how to do it:

1. write exact input and output contracts, including normal and modeled exceptional outcomes (Sections 2 and 3.2, pp. 2–4)
2. add loop invariants and a termination measure at the loop (Figure 1, p. 2)
3. define a ghost predicate and a checked auxiliary lemma in a sidecar; call the lemma with a `#@ proof` hook before the executable update (Section 2, pp. 2–3)
4. run admission and the selected backend; use source-located diagnostics to refine invariants or lemmas
5. preserve the source body and verify that comments add no runtime execution (Section 3.3, p. 4)

Verus form. Inference: write Rust `requires`, `ensures`, loop invariants, and `decreases` clauses in the function being verified, and use `proof fn` plus `spec fn` for ghost predicates and lemmas. Verus proof code is erased from executable output, but unlike VeriPy's comments it is Rust syntax checked by Verus. Keep source locations and artifact hashes in CI metadata.

evidence and limits: Django's base36 example retains every executable statement and checks 267 generated Dafny obligations with no errors (Section 2, p. 3). The denominator is generated obligations, not independent tests or programs. Annotation and sidecar work remains manual or agent-assisted; no authoring-time total is reported.

## technique 2: typed admission and explicit dependency environments

what it is: reject unsupported Python syntax and operations before proof, and model dependencies, constants, aliases, exceptions, and regular expressions explicitly. `basedpyright` checks types, then structural admission determines the backend-supported fragment (Section 3.1, p. 3).

how to do it:

1. run static type checking and structural-fragment admission
2. erase type annotations and compare admitted executable AST with the retained source body
3. resolve module constants only with the bounded AST evaluator; do not execute arbitrary initializers
4. supply explicit models for imports, dependency operations, exception hierarchies, aliases, and configured string/Unicode behavior
5. reject unresolved or unsupported boundaries and record assumptions in the report (Sections 3.1 and 3.3, pp. 3–4)

Verus form. Inference: define a supported Rust subset and reject unsupported unsafe, FFI, trait, or library operations unless they have reviewed specifications. Pin dependency source and feature flags. Use `requires` to state modeled environment assumptions and bind proof artifacts to exact source hashes. An import or external function should not silently become trusted merely because the compiler resolves it.

evidence and limits: the paper says “An import statement by itself grants no proof authority.” (Section 3.1, p. 3). Stable snapshot reads, specialized collection interfaces, and initialized constants remain assumptions. The admitted fragment therefore bounds the guarantee; it is not a proof of arbitrary Python.

## technique 3: direct multi-backend translation and sidecar gates

what it is: translate one admitted source directly to Dafny/Boogie/Z3 or Lean, using separate encoders and checked proof sidecars. The paper explicitly says it “does not introduce a backend-neutral intermediate language.” (Section 3.2, p. 4).

how to do it:

1. parse source and annotations once through shared admission and dependency machinery
2. emit a Dafny model and contracts for SMT-backed checking, or Lean definitions and propositions checked by Lean's kernel (Section 3.2, p. 4)
3. regenerate sidecars into complete artifacts
4. gate sidecars: reject explicit assumptions and axiomatic additions in Dafny; restrict declarations and audit axioms in Lean (Section 3.2, p. 4)
5. retain backend identity, artifact hashes, and source/contract provenance in the report

Verus form.

evidence and limits: an audit found that a Lean sidecar could introduce an ambient `False` hypothesis while the frontend reported the unconditional contract as proved; VeriPy fixed this by rejecting ambient declarations and retaining a reproducer (Section 3.2, p. 4). Backend exit codes or axiom lists alone are therefore insufficient. There is no mechanized end-to-end soundness theorem for the complete encoder.

## technique 4: execution guards and differential checks

what it is: generate runtime guards from admitted types, preconditions, dependency assumptions, and contracts; independently compare native Python execution with executable translations using Hypothesis, deterministic grids, replay, or kernel-reduced Lean execution.

how to do it:

1. generate a guard that checks the supported boundary and preconditions
2. execute the original body and translated model on the same inputs
3. compare returned values, modeled exceptions, and selected alias/mutation observations
4. use CrossHair or Hypothesis as auxiliary bug-search paths, never as the deductive proof
5. bind the guard to source, proof, dependency, and artifact hashes; invalidate it after changes (Sections 3.1 and 3.3, pp. 3–4)

Verus form. Inference: pair Verus proofs with Rust tests, Miri, and differential tests against a reference implementation. Tests provide behavioral evidence but do not replace `verus`; keep runtime checks at the exact callable boundary and record assumptions about external resources.

evidence and limits: the authors warn, “Matching executions do not prove translation correctness.” (Section 3.3, p. 4). Guards enforce only their implemented conditions, and arbitrary objects, reflection, unrestricted regexes, resource exhaustion, and concurrent mutation are outside scope (Section 7, p. 8).

## technique 5: relational product for scoped backward compatibility

what it is: reduce old/new behavioral compatibility to an ordinary verification problem over a product program. For old input `x`, the checked relation is `Aold(x) ⇒ Anew(x) ∧ O(Mold(x)) = O(Mnew(x))`, where observations include typed return values and modeled exception tags (Section 4, p. 5).

how to do it:

1. pin old and new sources, contracts, environments, and admitted domains
2. prove each body functionally against exact contracts, not only a broad range postcondition
3. construct separate namespaces and a sequential wrapper that runs both models on corresponding inputs
4. prove old-domain admission implies new-domain admission and equality of declared observations
5. classify outcomes as proved compatible, counterexample, inconclusive, or unsupported; never label failed proof without witness as incompatibility (Section 4, p. 5)

Verus form. Inference: encode old and new implementations as separate modules or functions, define an observation `spec fn`, and prove a relational lemma with `requires` old admission and `ensures` new admission plus equal outputs/exceptions. If loops differ, supply a checked relation lemma or a common abstraction; Verus will not infer alignment automatically.

evidence and denominators: Table 2 reports ten pinned old/new boundaries: Black and Django changed-code proofs are proved; CPython and Werkzeug unchanged-body controls are proved; Packaging has a counterexample; stdnum is inconclusive; PyPNG, SGLang, PyTorch, and vLLM are unsupported (Table 2, p. 7). These are ten selected boundaries, not a representative project sample. The Django product's 267 obligations and six timestamp comparisons are separate evidence; the latter are bounded integration checks, not release-wide compatibility.

## technique 6: evaluate agent maintenance with frozen controls

what it is: compare an agent that receives checked old proofs (Reuse) with one that receives only the fixed specification (Rebuild), under identical sources, contracts, checker, model, and response budgets. The study freezes artifacts before generating updates and keeps failures.

how to do it:

1. seal old proofs for six human-reviewed components
2. select twelve agent-authored updates, repeated twice per arm, with four no-private-proof controls
3. allow at most three responses under the same model and medium reasoning setting
4. count joint functional-and-compatibility proofs, first-response completions, responses, and failure categories
5. run a separate diagnostic only when public library information is equal; do not pool it with the primary effect (Section 5.3, pp. 7–8)

Verus form.

evidence and limits: Reuse proves 14/24 trials (58.3%) and Rebuild 10/24 (41.7%); these are 24 trials per arm with repetitions, not independent samples. The paper says the gap occurs only in Packaging and is sensitive to library information: a post-hoc equal-regex diagnostic passes 4/4 in both arms (Section 5.3, p. 8). Thus the primary difference does not isolate a general benefit from proof reuse.

## techniques for the catalog

- source-located proof annotations — keep contracts, invariants, and proof hooks beside executable code
- explicit admission boundary — reject unsupported syntax and model dependencies before proof
- direct multi-backend translation — emit checked Dafny/Lean artifacts with sidecar gates and provenance
- guarded differential execution — compare native and translated behavior while treating tests as auxiliary evidence
- relational compatibility product — prove old-domain inclusion and equality of declared observations
- frozen agent maintenance trial — compare proof reuse and rebuild under identical budgets with repeated denominators
