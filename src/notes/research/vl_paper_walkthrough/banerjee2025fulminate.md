# Fulminate: Testing CN Separation-Logic Specifications in C
(authored by agents unless marked 🧑)
Tag: `banerjee2025fulminate`, [paper](https://doi.org/10.1145/3704879)

## scope and result
Fulminate translates C annotated with CN separation-logic specifications into instrumented C that checks ownership and pure-value conditions during concrete executions. The same CN specifications are also used by the CN tool for static refinement-type proof. The key observation is that CN's existing syntactic restriction, introduced for predictable proof, also makes specifications executable.

> “We discuss various design issues and develop this as a C+CN source to C source translation, Fulminate.” (Abstract, p. 1)

> “Together with the earlier work on CN, this gives a separation-logic specification language for which the same specifications can be used both for runtime testing and for proof, that is reasonably expressive w.r.t. separation and ownership properties.” (Sec. 1, p. 3)

## technique: executable ownership predicates
Classic separation logic has disjunction, existentials, and separating conjunction over heap splittings, which naively need backtracking and search. CN replaces these with scoped ownership binders: `take r = Owned(p); P` asserts ownership of `p`, binds the value at `p` to `r`, and continues with `P`. A recursive `IntList(p)` predicate uses `if ... else` instead of disjunction, takes each node, and returns an abstract mathematical list.

> “The CN specification language captures this with simple variable scoping: instead of primitive 𝑥 ↦→ 𝑦 points-to predicates, separating conjunction of arbitrary formulas, and existential quantification, it combines ownership assertions and binders.” (Sec. 2.1, p. 3)

> “Executing the CN IntList(p) requires walking over the heap, reading values and asserting ownership for takes of the primitive Owned predicate, constructing the mathematical-list result, and recursing as needed.” (Sec. 2.1, p. 4)

The paper lists four restrictions Fulminate relies on (Sec. 2.4.2, pp. 9–10): (1) existentials only over resource outputs, computable from inputs and owned memory; (2) `if-then-else` instead of disjunction in predicate definitions; (3) no general (separating or non-separating) conjunction; (4) universal quantifiers (`each`) have lower and upper bounds, so they translate to C for-loops. Restriction (4) is new for testing; (1)–(3) were already imposed for proof.

Inference: In Verus, `requires`/`ensures` can use ghost recursive functions over a `Map` or sequence, but runtime execution would need a separate checker because Verus specifications are erased.

## technique: reified ghost-state ownership tracking
Fulminate represents ownership as a finite partial map from each memory byte to the C stack depth owning it, currently a hashtable from virtual addresses (Sec. 4.5).

> “Instead of passing the ambient resources around explicitly, we maintain reified ghost state that encodes a finite partial function that, for each byte of memory, gives the C stack depth of the C function holding ownership of that byte (if any).” (Sec. 2.3, p. 7)

The paper's five-step outline (Sec. 2.3, p. 7): (1) at ownership creation (globals, function parameters, block-scope entry), map the footprint to the current stack depth; (2) at function exit and block-scope exit, unmap it; (3) for `requires`, compute the predicate, check its resources are mapped at the caller's depth, and update them to the current depth; (4) for `ensures`, compute the predicate, check resources at the current depth, update them to the caller's depth, and optionally check for leaks; (5) for each memory access, check the footprint is owned at the current depth. Access checking is optional (Sec. 4.5.3).

> “For each memory access, we add instrumentation that checks that the footprint of the access is owned at the current stack depth.” (Sec. 2.3, p. 7)

In a small C-like calculus (MiniCN), the paper proves that this stack-depth instrumentation and an explicit resource-passing semantics bisimulate each other and fail under the same conditions (Sec. 3.4, Thm. 3.5, Cor. 3.6; proofs in supplementary material).

Inference: For VL, a debug build could attach ownership IDs to allocations and assert that a function's pre/post resource transfer matches the Verus contract. Stack depth is C-specific; Rust would need allocation and borrow-owner IDs.

## technique: source-to-source instrumentation
Fulminate uses the Cerberus front-end to parse, desugar, and C-type-check, generates executable versions of CN specifications as Typed Ail, and injects their pretty-print into a copy of the original source (Sec. 4.1). The output keeps source layout and comments, builds with gcc/clang, runs under existing test harnesses, and checks on-line without logs (Sec. 2.2). gdb or lldb can be used on the generated code, including to examine abstract states computed by CN predicates (Sec. 2.2). Failures report the original C+CN source location and the generated-code location (Sec. 4.7).

> “Fulminate is structured as an annotated-C source to C source translation, which adds instrumentation to check the CN specifications.” (Sec. 2.2, p. 5)

Inference: A Rust/Verus analogue would instrument MIR or wrappers while preserving source locations.

## technique: testing and proof as one workflow
Fulminate tests whether pre- and post-conditions hold of the concrete states reached, not whether preconditions imply postconditions (Sec. 2.2). Developers can start with partial CN specifications, add ownership and functional properties, and interleave testing with CN proof (Sec. 2.2). The 75 CN tutorial examples were combined into 54 whole programs with added `main` functions; the paper also ported a subset of the VeriFast C tutorial and a simple hashtable from Verifiable C (Sec. 5.2).

> “All examples run successfully in Fulminate; additionally, the CN and VeriFast tutorial examples were verified using CN’s proof mode.” (Sec. 5.2, p. 22)

Anecdote (Sec. 5.5, p. 27): two CN users had abandoned verifying a VST string-to-integer hashtable in CN because of abstract error messages; with Fulminate, fixing a misspecified hash function took a few minutes and fixing a double-owned resource in the hashtable predicate took around ninety minutes.

Inference: Runtime success covers only executed paths and inputs; it is not a proof. For VL, running generated tests before difficult Verus proof obligations follows the same idea.

## technique: detecting specification and implementation bugs
The pKVM buddy allocator has 320 lines of C and 702 lines of CN specification (Sec. 5.3, p. 23).

> “The allocator, an earlier version of which was used as a case study for CN proof [41], lets us demonstrate Fulminate on production systems software that requires subtle ownership invariants for reasoning about computed memory accesses; it has 320 lines of C code and 702 lines of CN specification.” (Sec. 5.3, p. 23)

Three injected bugs, all found with the same test (pool of 8 order-0 pages; allocate 2 pages, then free both, the “2+2 test”):
- omitting one guard condition in the `Hyp_pool` invariant: a runtime ownership failure in 0.37 s runtime after 29 s generation (Fig. 3 shows the error)
- omitting the exception for page `p` in the `__hyp_extract_page` postcondition: caught in 1.40 s (28 s with generation and compilation)
- removing `p = min(p, buddy)` from `__hyp_attach_page`: caught in 0.37 s runtime (31 s generation) as a violated alignment precondition of `__find_buddy_avail`

> “We run the allocator initialised for a pool of 8 order-0 pages (of 212 -bytes each), under a client that first allocates 2 0-order pages, then hands both back to the allocator (henceforth “2+2 test”); this produces, in 0.37s runtime after 29s generation time, the Fulminate error shown in Fig. 3.” (Sec. 5.3, p. 23; “212” is 2^12 in the PDF)

Figure 4 (p. 25), means (SD); times in s, space in KB:
- CN tutorial: generation 0.18 (0.11), runtime Δ 0.10 (0.54), space Δ 25.70 (55.32)
- VeriFast examples: generation 0.29 (0.24), runtime Δ 0.02 (0.05), space Δ 31.20 (17.30)
- buddy (single run): generation 28.64, runtime Δ 0.10, space Δ 24064.00

Scaling (Figs. 5–6, p. 26): a Software Foundations stack example from 2 to 1024 elements gives 38 to 3,155,974 dynamic `Owned` calls and runtime Δ from −0.01 to 2.70 s; the buddy allocator from 2 to 8 pages gives 335,613 to 4,849,348 `Owned` calls and runtime Δ from 0.10 to 1.35 s.

> “A more informative measure of the Fulminate cost is perhaps the overhead per dynamic occurrence of Owned, which in the largest examples above is 0.3𝜇s or 0.9𝜇s.” (Sec. 5.4, p. 26)

Inference: These numbers come from different settings (tutorial programs, selected examples, one buddy run, scaling inputs), so they are not one aggregate overhead figure. VL should not redo runtime separation-logic instrumentation for C; it should adapt the ownership-map and debugging workflow to Rust.

## trust, limits, and VL threat
The equivalence proof covers only the MiniCN calculus, which omits loops, structured data, and pointer arithmetic (Sec. 3.1). Inference: the Cerberus front end, the translator, and the test inputs remain trusted or outside the proof.

Stated limits:
- no test generation (Sec. 2.2)
- not yet run at EL2 bare metal (Sec. 2.2)
- instrumentation allocations are never deallocated (Sec. 5.4)
- `goto` into or out of blocks, multiple compilation units, and C unions are unsupported (Sec. 7)
- `Block` and `Owned` are not distinguished; CN maps must be indexed by bitvectors or integers (Sec. 7)
- no concurrency (Sec. 7)
- VeriFast examples needing function pointers, polymorphism, or concurrency were excluded because CN does not support them (Sec. 5.2)

Inference: VL could reuse executable-specification checks and pre-proof dynamic testing, adapting ownership IDs to Rust allocation/borrow identities and making concurrency explicit. Inference: threat to an agent-written verified Rust product is medium to high: runtime checks expose specification mistakes quickly, but passing tests cannot replace Verus's universal proof.

## techniques for the catalog

- executable CN predicates — restrict ownership formulas to directional binders and conditionals that walk concrete memory
- reified ghost ownership map — track byte ownership by stack depth and transfer it at calls, returns, and scopes
- source-to-source runtime instrumentation — compile annotated C into ordinary C with online pre/post and access checks
- specification-guided testing — use the same predicates for concrete tests and static proof, beginning with partial assertions
- counterexample-driven spec debugging — inject wrong predicates or code and use precise ownership/precondition failures to repair them
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Injecting into the original source, rather than simply pretty-printing modified Typed Ail, keeps the structure, layout, and comments of the original, making the generated code easier to navigate when necessary."): checked every quotation, number, section and page reference, and technique step against the paper text; changed the allocator quote's section/page (was Sec. 2.2, p. 5; is Sec. 5.3, p. 23), the Sec. 5.2 quote's page (23 to 22), the “2+2 test” quote marks, the tutorial-example counts wording, the unsupported-feature list (function pointers etc. were VeriFast exclusions, not Fulminate limits), removed "Inference:" from statements the paper makes, and added the four executability restrictions, the MiniCN proof scope, and the Fig. 4 buddy space figure; did not check the supplementary proofs or the cited references.
