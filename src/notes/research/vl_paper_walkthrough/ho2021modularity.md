# Modularity, Code Specialization, and Zero-Cost Abstractions for Program Verification
(authored by agents unless marked 🧑)
Tag: `ho2021modularity`, [paper](https://www.semanticscholar.org/paper/16cf4f555c2926c1ca50e79e810f1e0985ef164f)

## problem and architecture
The paper develops F★/Low★ proof-engineering methods for writing generic verified code, specializing it to efficient C, and preserving a readable call graph. “We present the design, implementation and evaluation of a set of language-based techniques that allow the programmer to modularly write and verify code at a high level of abstraction, while retaining control over the compilation process and producing high-quality, zero-overhead, low-level code suitable for integration into mainstream software.” (Abstract, p. 1)

The techniques are evaluated on HACL★, which the paper reports as 105k lines of F★ and 72k lines of generated C (Section 5, p. 14). Inference: the central VL lesson is to separate proof-facing generic interfaces from extraction-facing specialization, while keeping every generated function type-checked.

## technique 1: dependent indices and partial evaluation
Purpose. Encode a functor-like generic function with a dependent index carrying type choices, then partially evaluate a concrete instantiation. In the map example, the index contains key and value types; an instantiated `ifind` is normalized by beta-reduction and record projection simplification.

Steps (Section 3.1, pp. 5–6): (1) define a generic function over an `eq_type` record and value type; (2) choose concrete arguments such as string equality and integer values; (3) bind the instantiated function; (4) run F★’s normalizer at extraction; (5) inspect the specialized body, which removes dictionary records and leaves direct operations. The paper warns that fully inlining every function duplicates bodies and can produce unacceptable code size.

Inference: in Verus, use Rust generic functions and `spec fn`/proof lemmas for type-independent properties, then let Rust monomorphization or explicit wrappers specialize executable code. Verus does not provide F★ normalization or extraction; the proof obligation must remain valid for each concrete instantiation.

## technique 2: parameterize functions by specialized callees
The paper avoids dictionary-passing and uncontrolled inlining with a rewriting pattern. “Instead of using a dependent record, for each function, we add additional parameters that stand in for the callees that need to be specialized.” (Section 3.2, p. 7)

Steps (Sections 3.2 and Listing 4, pp. 7–8): (1) identify each callee whose implementation must specialize; (2) add only those callees as function parameters; (3) put all type choices in a first `index` argument; (4) write the body through the parameters; (5) instantiate each generic function with concrete implementations; (6) partially evaluate each definition independently. `send` receives `find` and `enc`, while `recv` receives `find` and `dec`; the resulting specialized functions both call one specialized `ifind`, preserving the call graph.

Inference: a Verus form uses Rust function parameters for executable callees and contracts on those parameters where supported; ghost specifications can state the common behavior. A Verus proof cannot assume a function’s contract is correct unless that function is verified or given an explicitly trusted external body, so VL should verify each implementation at the boundary.

## technique 3: declarative call-graph rewriting
Manual higher-order parameters cause boilerplate. The authors introduce a Low★ DSL with `Specialize` and `Eliminate` annotations and a Meta-F★ elaborator-reflection pass. “We thus automate our methodology by designing a DSL that guides an automated code-rewriting transformation which automatically applies the pattern from §3 to the user’s code.” (Introduction, p. 3)

Steps (Section 4, pp. 9–13): (1) declare top-level assumed callees for parameters that are shared widely; (2) mark functions to specialize; (3) recursively traverse the static call graph from API roots; (4) rewrite each `let f idx x =` into `let mkf idx (g1:tg1 idx)… x =`; (5) replace calls with bound callee variables; (6) stop traversal at an `assume` declaration; (7) let F★ type-check generated terms when specializations are instantiated. The rewriter is user-space and untrusted; the kernel checks generated terms.

Inference: a Verus build tool could generate wrappers or trait implementations, but the generated Rust and all proof contracts must be checked by Verus. The paper’s tactic-level rewrite is not itself a Verus proof.

## technique 4: fine-grained elimination and specialization
Generic heuristics are avoided by explicit control. “Using F★’s annotation system, we provide two attributes, Specialize and Eliminate, that enable a fine-grained control on the rewritings performed by our approach.” (Section 4.3, p. 12) `Eliminate` definitions are inlined before rewriting; only `Specialize` declarations become higher-order parameters; unannotated library functions are left alone. This keeps loop closures available for proofs while producing direct extracted code.

Inference: in Verus, this corresponds to separating proof-only helper lemmas from executable functions and choosing explicit wrapper boundaries; there is no `Specialize`/`Eliminate` attribute in the Verus constructs catalog.

## technique 5: generic state and block-to-streaming transformation
The streaming case captures state, footprints, invariants, pure reflections, and framing lemmas in a `state_index`, then defines a block API with `init_s`, `update_multi_s`, `update_last_s`, `finish_s`, and a fold lemma. “We want to take all of the block-based algorithms, and devise a way to wrap their respective block APIs into a uniform, safe API that eliminates all of the pitfalls above.” (Section 6.1, p. 18)

Steps (Sections 6.2–6.3, pp. 19–21): (1) define the low-level state type and ghost footprint/invariant; (2) provide allocation, free, copy, and frame lemmas; (3) specify block transitions as pure functions; (4) require `update_multi_s` to satisfy a fold law; (5) prove the central incremental correctness lemma equating block processing with one-shot `spec_s`; (6) instantiate the generic streaming wrapper for each algorithm; (7) erase ghost and type arguments during extraction. The state index distinguishes runtime versus erased keys and permits open-ended specializations.

Inference: a Verus implementation would use ghost predicates for state validity and `requires`/`ensures` framing over `old(...)` memory snapshots. The exact Low★ `modifies` theory and F★ `Ghost` effect do not carry over; frame facts must use Verus-supported predicates and contracts.

## evidence, trust, and limits
The HACL★ adaptation affects 30k generated C lines (Section 7, p. 24). Rechecking tactic-generated definitions adds 27% for ChaCha20, 17% Poly1305, 34% ChaCha-Poly, 88% Curve25519, and 132% HPKE to their verification times (Table 1, p. 25); each percentage is overhead relative to that algorithm’s total verification time. The tactic is 620 lines and was debugged on Curve25519; “once debugged, the tactic never generated ill-typed code and was used successfully by other co-authors.” (Section 7.2, p. 26)

For streaming, the old API had proof-to-code ratio 1.11; the generic API uses 1,667 F★ lines across 14 applications and reports a final ratio 0.51, interpreted by the authors as a twofold productivity gain (Section 7.3, p. 26). Six of the 14 applications entered Python’s reference implementation; the denominator is all 14 instantiations, not six.

What remains trusted includes F★’s kernel, normalization/type checking, extraction, generated C compiler, and the specifications supplied in indices. The meta-program is outside the TCB but its output is rechecked. Inference: threat to agent-written verified Rust is moderate: specialization can multiply proof obligations and stale contracts can hide integration errors, but checked wrappers and framing lemmas contain the risk. VL should reuse the generic-index, callee-parameter, and fold-law patterns rather than reimplementing ad hoc per-algorithm streaming proofs.

## techniques for the catalog
- dependent-index specialization — carry type choices in an index and normalize concrete instantiations
- callee-parameter rewriting — parameterize each function by exactly the callees that must specialize
- call-graph metaprogramming — recursively rewrite API-root call graphs and rely on kernel type checking
- elimination controls — choose explicitly which helpers inline and which remain specialized calls
- state-index streaming abstraction — package footprints, invariants, transitions, and fold correctness once for many algorithms

Checked 2026-10-15 against the paper by a Codex agent for modularity_code_specialization_and_zero__20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
