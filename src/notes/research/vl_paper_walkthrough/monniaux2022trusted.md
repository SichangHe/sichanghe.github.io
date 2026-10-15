# The Trusted Computing Base of the CompCert Verified Compiler
(authored by agents unless marked 🧑)
Tag: `monniaux2022trusted`, [paper](https://doi.org/10.1007/978-3-030-99336-8_8)

## result and method

Monniaux and Boulmé audit the trusted computing base (TCB) around CompCert and two forks. CompCert proves that, for a defined-behavior C source, generated assembly has the same observable behavior, but the audit asks which unverified models, extractors, interfaces, printers, runtimes, and platform assumptions can still invalidate that chain. The paper’s abstract says, "We comprehensively analyze aspects of CompCert where errors could lead to incorrect code being generated" (abstract, p. 204).

Inference: this is a trust-boundary checklist for VL. It is not a Verus soundness result and does not test Rust. The Verus mappings below identify analogous boundaries.

## technique 1: decompose and audit the TCB by semantic boundary

what it is and when to use it

The paper partitions CompCert’s TCB into Coq checking and extraction, links from user C text to the formal AST, assembly back-end printing and pseudo-instruction expansion, ABI/value models, runtime libraries, and assembling/linking. This decomposition finds bugs that a theorem-prover-only view misses. The authors conclude, "By construction, the bugs of CompCert are located in a limited subpart of the software, called its TCB, which may however not be as small as we may naively expect" (section 7, p. 228).

how to apply it

1. list every formal theorem and its exact preconditions
2. draw each boundary from user artifact to modeled artifact and from modeled output to executed artifact (sections 4–6, pp. 217–227)
3. mark code that is trusted because it is unverified, extracted, generated, linked, or supplied by hardware/runtime
4. search commits, bug reports, fuzzing results, and tests for failures at each boundary (sections 4.1, 5.1, 5.2, pp. 217–223)
5. state which failures can produce wrong code, merely reject compilation, or affect performance (section 5.3, p. 224)

Verus form

Inference: for a Verus project, inventory the verifier, SMT solver, proof erasure, Rust compiler, standard-library specifications, `external_body` assumptions, unsafe/FFI code, generated serialization, linker, and hardware model. Put the inventory beside each theorem’s contract. A Verus proof establishes the specified Rust model; the audit must separately connect that model to deployed binaries and dependencies.

evidence and limits

The authors found no bugs in CompCert’s verified Coq phases, but found front-end elaboration and numerous back-end printer/expansion issues (section 7, p. 228). This is an empirical audit of the analyzed releases and forks, not a universal frequency claim. Inference: VL should measure defects by boundary and severity, retaining denominator and release information.

## technique 2: keep external oracles untrusted and check their results

what it is and when to use it

CompCert calls OCaml algorithms such as register allocation as oracles: their results guide choices but can be checked. For mutable or nondeterministic external code, the paper describes a may-return monad that models possible outputs and preserves proved invariants. It states, "The functions are ‘oracles’, in the sense that they are not trusted to return correct results; their results are used to guide compilation choices, and may be submitted to checks" (section 3.3, p. 212).

how to apply it

1. specify an external function’s permitted result set rather than a single operational implementation (section 3.3, p. 212)
2. call the function as an oracle
3. validate its output with a proved checker before using it in a semantic transformation (section 3.3, pp. 212–216)
4. if behavior may vary between equal calls, model it with a nondeterministic/may-return monad instead of a pure function (section 3.3, p. 212)
5. keep the trusted escape from the monad explicit and audit it; the paper notes that unsafe exits weaken the argument (section 3.4, p. 215)

Verus form

Inference: model an unverified Rust helper with a `spec fn` describing an allowed result and use a verified checker with `ensures` before consuming it. A function marked `external_body` remains trusted; it should be isolated behind a narrow contract and never be mistaken for a proof of its implementation. Nondeterminism can be represented by a ghost set of allowed results and an invariant that the concrete result belongs to that set.

evidence and limits

The may-return approach increases proof effort and propagates impurity through callers (section 3.3, pp. 212–213). The paper reports no observed CompCert bug from axioms or extraction, but explicitly says that absence is not evidence that the boundary is safe (section 7, p. 228). Inference: checking oracle outputs reduces trust in the oracle but adds checker complexity and does not remove trust in the checker or runtime.

## technique 3: hash-consing and pointer equality with a proved/checking interface

what it is and when to use it

Pointer equality is tempting as a fast equality test for functional trees, but a direct axiom is unsound because structurally equal Coq values can be represented by different runtime pointers. The paper gives a counterexample where Coq proves two equality tests identical although extracted OCaml returns different booleans (section 3.4, pp. 214–215). CompCert-KVX instead either models pointer equality nondeterministically in the may-return monad or uses a smart-constructor/hash-consing discipline whose global invariant makes pointer and structural equality coincide (section 3.4, pp. 215–217).

how to apply it

1. never axiomatize runtime pointer equality as a deterministic function over pure values (section 3.4, p. 214)
2. choose a may-return model when the runtime may return either result, and prove only implications that hold for every allowed result (section 3.4, pp. 215–216)
3. alternatively, force all nodes through a smart constructor and maintain the invariant that reachable structurally equal nodes share one pointer (section 3.4, pp. 216–217)
4. expose only constructor, matcher, and equality operations so clients cannot violate hash-consing (section 3.4, p. 216)

Verus form

Inference: use owned Rust IDs or ghost hashes rather than raw pointer equality in specifications. If an unsafe interning table is needed, wrap it in a narrow API with an `ensures` relation between returned ID and structural value, and prove client properties from that relation. Do not assert pointer identity implies semantic equality without a memory-model theorem.

evidence and limits

The smart-constructor approach adds more OCaml TCB code but is small and auditable; it assumes weak hash-table correctness (section 3.4, p. 217). The monadic approach adds less trusted code but spreads proof complexity and needs a safe exit discipline (section 3.4, pp. 215–216).

## technique 4: audit front-end semantics, assembly expansion, ABI, and runtime assumptions

what it is and when to use it

CompCert’s verified core begins after unverified preprocessing, parsing/elaboration, and type annotation; even a formally verified parser can rely on an unverified pre-parser and elaboration pass (section 4, p. 217). At the back end, verified code emits an abstract assembly data structure; unverified OCaml prints text and expands pseudo-instructions. The paper identifies wrong operand order, wrong mnemonics, immediate-size errors, register-clobber omissions, and aliasing mistakes. One concrete finding was a builtin bug that produced successfully linked but incorrect code on four architectures (section 5.2, p. 222).

how to apply it

1. validate each parser/elaborator transformation against the intended source-language semantics; fuzz semantic corner cases (section 4, pp. 217–219)
2. test every instruction printer and operand permutation, including rare instructions (section 5.1, p. 220)
3. make pseudo-instruction expansions carry explicit size, alignment, aliasing, and clobber cases; keep specification and expansion synchronized (section 5.2, pp. 221–223)
4. where possible, move case distinctions into verified tagged pseudo-instructions selected by Coq code (section 5.2, p. 223)
5. validate ABI conventions, register widths, linker behavior, and runtime allocator assumptions against the target platform (sections 6.1–6.3, pp. 225–227)
6. classify pipeline-model errors as performance-only only when the processor preserves sequential semantics; non-interlocked pipelines need stronger modeling (section 5.3, p. 224)

Verus form

Inference: for VL, treat serialization, FFI, allocator, and generated-machine-code boundaries as separate lemmas/contracts. Use `external_body` only for a precisely documented boundary and add executable differential tests where the model is incomplete. Verus’s proof of an abstract Rust function does not prove a hardware ABI, linker, or foreign implementation.

evidence and limits

The paper reports that all known bugs in the studied releases were in the TCB, especially the last back-end stage; it attributes many to tedious printers, many expansion cases, and unsynchronized specifications (section 7, p. 228). It also records that CompCert assumes `malloc` always succeeds and never returns null, and assumes IEEE-754 round-to-nearest and stable rounding mode (section 6.3, p. 227). These assumptions can invalidate defensive checks if an optimization relies on them.

## what is proved, what remains trusted, and threat to VL

CompCert’s theorem is conditional on defined source behavior, formal language semantics, assembly semantics, ABI, runtime, extraction, assembler/linker, and platform behavior. The audit finds that proof-checker and extractor concerns received more attention than the more failure-prone printer and expansion code (section 7, pp. 228–228). Inference: this is a high threat to a product that promises agent-written verified Rust if the product boundary is defined as deployed behavior rather than Verus-accepted source. VL should publish a TCB ledger, test generated artifacts and FFI boundaries, and distinguish proof failure, executable rejection, performance-only mismatch, and semantic miscompilation.

## techniques for the catalog


- TCB boundary decomposition — enumerate every trusted transformation from source text through verified model to execution

- checked external oracle — permit untrusted algorithms to guide choices only after a proved checker validates their result

- monadic nondeterminism — model impure or variable foreign results as a set of allowed outcomes

- hash-consing discipline — enforce smart constructors and a global uniqueness invariant before treating pointer equality as semantic equality

- back-end case audit — test printers, pseudo-instruction expansions, clobbers, ABI conventions, and runtime assumptions separately

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
