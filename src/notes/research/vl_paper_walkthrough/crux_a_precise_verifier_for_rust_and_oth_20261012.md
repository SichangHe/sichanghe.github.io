# Crux, a Precise Verifier for Rust and Other Languages
(authored by agents unless marked 🧑)
Tag: `pernsteiner2024crux`, [paper](https://arxiv.org/abs/2410.18280v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## what this paper contributes

Pernsteiner et al. present Crux, with Crux-MIR as its Rust front end. It targets bounded, intricate, optimized code, including unsafe Rust, and checks bit-precise properties by symbolic execution. The proof interface is a Rust-shaped symbolic unit test. A test supplies symbolic inputs, assumptions, calls to the implementation, and assertions; Crux searches for a concrete counterexample. The paper's central claim is that this interface combines the usability of unit tests with the compositional and cross-language capabilities of the SAW-Cryptol toolchain. The abstract states: “Crux targets bounded, intricate pieces of code that are difficult for humans to get right: for example, cryptographic modules and serializer / deserializer pairs.” (Abstract, p. 1)

This is a verifier for implementation/specification equivalence and inline properties, not a general proof assistant. Its high automation depends on static bounds and fixed-size data. The authors explicitly qualify the target: “Crux is not intended for every task. Rather, it is a particular point in the design space which addresses our needs when verifying cryptographic libraries and similar.” (Introduction, p. 3)

## technique 1: symbolic tests for quantified properties

What it is. Replace concrete unit-test values with values created by `Symbolic::symbolic`, then use `crucible_assume!` to restrict the input domain and `crucible_assert!` to state the postcondition. Mark the module `#[cfg(crux)]` and the test `#[crux_test]`. Running `cargo crux-test` asks the solver for an assignment satisfying assumptions and violating an assertion. No assignment means the bounded theorem holds; an assignment is a counterexample.

The vector-clock example verifies commutativity. The test creates symbolic `a` and `b`, computes `merge_vc(a,b)` and `merge_vc(b,a)`, then asserts equality. The paper explains the operational semantics: “This has the effect of requiring a post-condition on the values of symbolic variables.” (Section 2.1, p. 5) The same pattern verifies a scalar property: the introduction converts a test on `f(42)` into a symbolic `x`, assumes `-100 <= x`, and asserts `f(x) >= 0`, thereby proving all `i32` values satisfying that lower bound and not only 42 (Introduction, pp. 2–3).

How to apply it:

1. Put verification-only modules behind `#[cfg(crux)]`.
2. Mark each proof entry point with `#[crux_test]`.
3. Instantiate every input with its `Symbolic` implementation and a debugging name.
4. Add `crucible_assume!` for preconditions, including bounds needed for loops or valid protocol states.
5. Call the production function on symbolic data.
6. State the desired Boolean property with `crucible_assert!`.
7. Run `cargo crux-test`; inspect a generated counterexample when it fails.

Verus form (inference). Give the executable function `requires` and `ensures` clauses over all inputs (a universally quantified contract), checked by Verus, or state the property in a `proof fn` over a spec model; an `external_body` harness would skip the check. Verus does not provide Crux's `Symbolic` trait or `cargo crux-test` counterexample search. A Verus proof generally supplies quantified lemmas and loop invariants; the Rust implementation and arithmetic semantics can remain, but the test macro, solver query construction, and model extraction do not carry over.

Evidence and limits. The commutativity claim is exhaustive over the modeled `VectorClock` type, subject to Crux-MIR's semantics and panic checks. It is not randomized testing. The approach is most effective for bounded loops and statically sized arrays; arbitrary bounds reduce theorem strength or require invariants (Introduction, p. 2).

## technique 2: extensional equality against an executable specification

What it is. Inline a Cryptol specification with `cryptol!`, or use executable Rust/hacspec, and assert equality between implementation and specification outputs for symbolic inputs. “By extensional equality, we mean (1) that code and specification cannot generate undefined behaviour / panic, and (2) that they produce equivalent output when supplied with equivalent inputs.” (Introduction, p. 2) Thus the proof checks both definedness and output correspondence.

For vector clocks, the paper's Cryptol code defines element-wise maximum using a list comprehension. A test computes Rust `merge_vc(a,b)` and asserts equality with `cryptol_spec::merge_vc(a,b)` (Section 2.2, pp. 6–7; Figure 3, p. 6; Figure 4, p. 7). For ChaCha20, the Rust crate's `new` and `generate` are compared against Cryptol's `cryptol_kexp` and `cryptol_core` on symbolic key, IV, and counter (Section 2.4, pp. 8–11; Figure 7, p. 11). Bindings can import a separate Cryptol repository, so a generic specification is not tied to the implementation's Rust structure.

How to apply it:

1. Write or select an executable reference in Cryptol, hacspec, or Rust.
2. Bind reference functions with `cryptol!` (or keep hacspec as ordinary Rust).
3. Give implementation and specification symbolic inputs of corresponding types.
4. Run both sides, applying any representation adaptation (for example, the ChaCha20 key/counter adjustment).
5. Assert equality element by element or as an aggregate.
6. If the direct query is too large, factor and compose as in technique 3.

Verus form (inference). Encode the reference algorithm as a pure `spec fn` or a ghost model and state `ensures result == model(input)`. For a Cryptol/hacspec reference, translate the executable definition into Verus specification functions or expose a trusted external model; prove representation-mapping lemmas. Verus's `ensures` can express equality, while panic-freedom and array bounds must be discharged by its preconditions and invariants. The external Cryptol compiler and SAW-Core translation are additional trusted components in Crux and would become a model-trust boundary in Verus.

## technique 3: compositional reasoning with proved function specifications

What it is. Prove a small function's extensional equality once, mark the test `#[crux_spec_for(function)]`, then enable that specification in callers. Crux replaces calls to the function with a simpler executable specification (or an arbitrary symbolic value constrained by the proved property), shrinking the caller's SMT formula. The authors state: “Compositional reasoning is necessary to verify even mid-size pieces of code.” (Section 4.4, p. 15)

The vector-clock proof first establishes `merge_clocks` equal to Cryptol and then calls `merge_c_equiv_spec().enable()` before checking `merge_vc`; each subsequent call is replaced by the reference function (Figure 4, p. 7; Section 2.3, p. 8). For a large equality `I(v) == R(v)`, the paper gives an explicit procedure (Section 4.4, p. 15): factor subexpressions `i` and `r`, prove `i == r` as a spec, enable that spec in the top-level test, and let Crux reduce the remaining goal to the unfactored parts. A spec test must contain only one call to its function under test.

How to apply it:

1. Identify a repeated or expensive sub-function.
2. Write a single-call test proving it equal to a simpler reference.
3. Mark that test with `#[crux_spec_for(sub_function)]`.
4. In a caller test, invoke `sub_function_spec().enable()` before the caller.
5. Re-run the top-level proof; repeat the decomposition recursively if needed.

Verus form (inference). State a function contract (`requires`/`ensures`) and prove it in a separate lemma or proof function. In a caller proof, invoke the lemma and use `assert`/`reveal` to rewrite calls to the implementation into the model. Verus does not automatically replace executable calls with arbitrary values, so ghost state and explicit lemma application are needed. The decomposition idea carries over directly; Crux's generated “most general implementation” and `enable()` mechanism do not.

Evidence and limits. Each spec is sound only relative to its own proof and the model. The paper warns that monolithic tests often exceed SMT capacity; composition trades a larger theorem for several smaller queries. A missing SAW-Core term-rewriting feature means Crux cannot reproduce the most complex SAW-Cryptol goals (Related Work, p. 19).

## technique 4: bit-precise symbolic execution and panic checking

Crux-MIR obtains Rust MIR with MIR-JSON, converts it to the Crucible intermediate language, symbolically executes control flow, and emits SMT-LIB. Crucible clones state at branches and merges at post-dominators; loops are unrolled until the solver proves the condition cannot hold. The generated query adds initial assumptions, negated user assertions, and program equations, then asks for a satisfying assignment (Sections 3 and 4.3, pp. 12, 14–15). “In Crux-MIR, all panic! invocations in the program and its libraries are treated as failed assertions, so Crux-MIR also attempts to prove that the program does not panic.” (Section 3, p. 12)

How to apply it: compile through the Crux MIR hook, ensure the code's loops and allocation sizes are finite or bounded, run the symbolic test, and treat either an assertion counterexample or a panic path as a failing proof. Crux's formulas use bit-vectors and typed aggregates, so integer overflow and wrapping behavior are modeled at machine precision.

Verus form (inference). Rust integer types and `wrapping_*` operations can stay in the executable code; Verus requires explicit proof lemmas for arithmetic facts. Use `requires` for valid indices and lengths, `ensures` for no-panic postconditions where possible, and loop `invariant`s plus `decreases` for termination. Verus's verifier does not search for a concrete counterexample in the same workflow, and its trusted arithmetic/SMT semantics differ from Crux's MIR-to-Crucible translation.

## technique 5: model extraction, memory boundaries, and cross-language support

MIR-JSON erases lifetimes, relying on the Rust borrow checker, and monomorphizes generics to concrete MIR. Crux's memory model represents each allocation as a typed mutable location; references are an allocation plus a path through fields and array offsets. This enables safe and unsafe Rust but deliberately omits raw-layout behavior. “Crux-MIR does not expose the concrete representations of types in terms of flat arrays of bytes” (Section 4.2, p. 13), so `transmute`, C unions, pointer casts, and non-array pointer arithmetic are generally unsupported. Its `transmute` implementation handles only primitive integer/byte-array coercions (Section 4.2, pp. 13–14). Standard-library functions may be overridden by simpler equivalent implementations; for example, Crux uses insertion sort for `slice::sort` because only stable-sorted output matters (Section 4.2, p. 14).

The Crucible IR is language-neutral. Rust, Cryptol, and hacspec are translated to SAW-Core, permitting cross-language equality. Crux-LLVM handles C/C++; x86/ARM models exist but lacked an assertion-based proof interface at publication (Sections 1 and 4.5, pp. 3–4, 16).

Verus form (inference). Verus already relies on Rust's borrow checker and can express typed references and slice extents, but unsafe layout claims generally need `unsafe` external bodies, ghost byte models, or manually proved wrapper contracts. A Rust spec function can replace Crux's simplified library model. Any external model, unchecked body, or compiler assumption must be listed as trusted in a Verus assurance case.

## technique 6: factorized loop proofs for cryptography

Directly comparing large optimized loops creates an SMT expression too large to solve. The SHA2 proof factors the Rust implementation and Cryptol specification into matching helpers. For `compress_words`, it proves one-iteration functions `compress_t1` and `compress_t2`; with those specs enabled, the loop bodies become trivially equal (Section 5.2, p. 18). The same graph goes from optimized Rust to factorized Rust to Cryptol (Figure 8, p. 17). This is proof engineering: engineers choose boundaries that align implementation and model, often consulting the FIPS-180 standard.

Verus form (inference). Introduce loop invariants relating each Rust iteration's state to a ghost specification state, and prove one-step transition lemmas for `compress_t1`/`compress_t2`. The factorization and transitive equality carry over; replacing an entire helper with a proved contract requires explicit lemma calls and invariant strengthening.

## evidence, trusted parts, and product implications

Crux-MIR verified Ring's SHA1 and SHA2 implementations against Cryptol and hacspec. Four proof developments (SHA1/Cryptol, SHA1/hacspec, SHA2/Cryptol, SHA2/hacspec) each re-verified in under ten minutes on a recent MacBook Pro. An engineer with a short Crux introduction and no cryptography background completed SHA1/Cryptol in three weeks, then the other three in three additional weeks (Section 5.2, p. 18). The paper reports an AWS Shardstore deployment that proved deserializers cannot panic for any on-disk byte sequence up to a size bound (Section 5.1, p. 17), but this paper does not state the bound; it quotes Bornholt et al. [12, p.10].

The proved object is the modeled MIR program, its assertions, and its executable reference. Trusted foundations include Rust's borrow checker (lifetimes are erased), MIR-JSON and Crux-MIR translation, Crucible/What4 and the SMT solver, overridden standard-library semantics, and the Cryptol/SAW-Core implementation. Bounds, representation mappings, and any simplified library replacement are assumptions that users must audit. The paper gives no defect count, solver timeout distribution, or independent validation of the Cryptol specifications; the reported four proof developments under ten minutes each are a throughput claim, not evidence that the specs are correct.

For VL (VeruLaw, agents writing Rust verified with Verus), Crux is a direct competitor for bounded cryptographic or serializer code and demonstrates a lower-friction symbolic-test workflow. Its threat is highest where VL's product promise is automated verification of existing unsafe or optimized Rust against executable models. Its limitations also leave room for VL: Crux lacks arbitrary-layout unsafe support, requires bounded structures, and its specification and solver assumptions are external. VL should not redo the basic idea of symbolic tests plus compositional reference equality; it should instead integrate explicit Verus contracts, trusted-boundary reporting, and proofs for the unbounded or layout-sensitive cases Crux excludes. These threat assessments are my inference from the paper's scope and limitations.

## techniques for the catalog

- symbolic unit tests — instantiate symbolic Rust values, constrain them with `crucible_assume!`, assert properties with `crucible_assert!`, and search exhaustively for counterexamples
- executable extensional equality — compare bit-precise implementation outputs and panic behavior with Cryptol, hacspec, or Rust reference functions
- compositional specifications — prove a helper once with `#[crux_spec_for]`, enable it in callers, and replace expensive calls with its simpler model
- MIR-to-SMT symbolic execution — extract MIR, translate to Crucible, merge branch states, and discharge negated assertions with an SMT solver
- bounded memory modeling — represent typed allocations and reference paths while rejecting most raw-layout casts and pointer arithmetic
- factorized loop verification — prove one-iteration helper equivalences and compose them to make large cryptographic loops tractable

## study status

This study was read from the full extracted text (22-page paper including references; no separate appendix). The title gate passed before reading. The final gate command is run by the parent agent after neighboring studies are available.

Audited 2026-10-12 against the paper: checked every page/section/figure reference, the quotations, the Section 4.4 factoring procedure, Sections 3, 4.1-4.5, 5.1-5.2 (three weeks plus three weeks, under 10 minutes, four proof developments) and the Verus forms. Changed: Section 2.1 quotation page 6 to 5; Figure 3 is on p. 6 not p. 7; replaced the Verus external_body harness suggestion (it would skip verification) with a checked requires/ensures contract; replaced the unsupported claim that the Shardstore bound is in the SOSP paper with what the paper says. Everything else matched.
