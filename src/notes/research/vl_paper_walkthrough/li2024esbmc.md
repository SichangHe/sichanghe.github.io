# ESBMC v7.6: Enhanced Model Checking of C++ Programs with Clang AST
(authored by agents unless marked 🧑)
Tag: `li2024esbmc`, [paper](http://arxiv.org/abs/2406.17862v2)

## pipeline and bounded proof

ESBMC v7.6 replaces the legacy CPROVER parser with a Clang-AST front end, translates C++ to GOTO, symbolically executes GOTO into SSA constraints, and asks an SMT solver for a bounded verdict (Fig. 1, §3, pp. 7–8). The paper defines bounded model checking (BMC) by unrolling a transition system k times into `ψk = I(s0) ∧ ⋀ T(si,si+1) ∧ ⋁ ¬φ(si)` (§2.1, p. 5). It states: “The condition ψk is satisfiable if and only if a counterexample of length k or less exists for the property ϕ.” The evaluation defines success as: “A TC passes when the tool reports a verdict of “VERIFICATION SUCCESSFUL” on a program without any violation of properties or reports “VERIFICATION FAILED” on an unsafe program that violates a property.” The architecture caption says: “The grey block represents the extended Clang-based C++ front-end developed in ESBMC v7.6.”

How to apply it.
1. Parse and type-check C++ with Clang, including templates and modern language features.
2. Convert the AST to GOTO and then SSA.
3. Build the bounded formula with initial-state, transition, and negated-property constraints.
4. Run an SMT solver; a satisfying assignment is a counterexample trace, while unsat means no violation within k steps (§2.1, p. 5).
5. Use k-induction or a proven state bound for claims beyond k; the paper warns that unsat BMC alone is not complete (§2.1, p. 5).

Inference: Verus uses contracts and invariants rather than BMC, but the bounded counterexample workflow can validate generated Rust snippets before attempting an inductive proof. BMC's bound and solver remain trusted limits; a passing bound does not prove unbounded safety.

## technique 1: AST object models for polymorphism

Clang's AST lacks implicit vtable/vptr details, so ESBMC constructs them. Each class gets vptrs initialized by constructors; child classes get vtables and thunks redirecting a base-pointer call to an override (§3.1, pp. 8–9). Process Flow 1 says to parse class relationships, create object models, redirect virtual calls through a thunk when a vptr exists, and otherwise call the base method. The paper's example `Bird *p = new Penguin(); assert(p->doit() == 42);` is converted into a GOTO dereference of `Bird@Penguin` and a thunk that calls `Penguin::doit` (Figs. 2–4, pp. 8–9).

Inference: In Verus, dynamic dispatch should be modeled with an enum/tag and explicit function specs, or a trait contract whose implementation is selected by a ghost tag. The paper's vtable construction is an implementation technique for C++ IR, not a Verus construct.

## technique 2: template and modern-language front end

The Clang front end delegates template type checking, specialization, and diagnostics to production compiler analysis (§3.2, pp. 9–12). This replaces speculative argument maps in v2.1 and catches circular dependencies earlier. The implementation also models rvalue references and move semantics (§3.3), dynamic `new`/`delete` memory (§3.4), and exceptions by checking throw specifications and routing a throw to a matching catch or reporting a property violation (§3.5, Process Flow 5, pp. 14–16). The exception flow is explicit: parse throw/try/catch, check the specification, jump to a matching handler, otherwise raise an assertion violation.

Inference: For agent-written Rust, the lesson is to normalize ownership moves, allocation, and exceptional exits into the proof model before generating contracts. Rust's borrow checker changes the semantics, so C++ operational models cannot be copied.

## technique 3: operational models for STL

ESBMC replaces unverified STL implementation bodies with manually maintained operational models (OMs) carrying preconditions, postconditions, and side effects (§2, p. 4; §3.6, pp. 16–17). v7.6 updates container, stream, string, numeric, exception, and memory models to compile against the Clang front end (Table 1, p. 17). This avoids encoding optimized library assembly while preserving safety properties such as bounds, arithmetic overflow, memory errors, and assertion failures.

Inference: In Verus, the equivalent is a verified specification layer for standard-library APIs, with explicit assumptions about external bodies. The trusted boundary includes every OM contract; an incorrect contract can make downstream proofs pass falsely.

## evidence and limits

The evaluation used 532 core-language test cases across six collections plus 1,001 OM-dependent cases, Ubuntu 22.04, an eight-core CPU, 16 GB RAM, 900-second timeout, and 6 GB memory limit (§4.1, p. 18). Table 2 reports Boolector results on the six core sets: v7.6 pass rates were cpp 83%, inheritance 93%, polymorphism 85%, cbmc-template 97%, gcc-template-tests 78%, and template 81%; cumulative time was 545 s. The denominators are the test cases in each collection, not the combined 1,533 cases. Table 5 reports v7.6 over all benchmarks: Boolector 545 s/33,800 MB, Bitwuzla 549 s/38,700 MB, Z3 1,430 s/34,300 MB, CVC4 2,230 s/44,100 MB, CVC5 1,420 s/42,300 MB, MathSAT 2,930 s/50,500 MB, and Yices 1,270 s/40,800 MB (§4.3, p. 23).

The paper reports unresolved constructor/destructor ordering for complex diamond inheritance and unsupported Clang AST nodes (§4.4, p. 24). It also notes that OMs are numerous and may not fully support the standard library. Inference: the threat to VL is specification and front-end mismatch: an agent can produce a verified Rust contract around a wrong library model, or rely on bounded evidence as if it were an inductive proof. Existing work already supplied ESBMC v2.1 and v7.3; this paper's new contribution is the Clang-based conversion and expanded C++ feature coverage, not a new Rust verifier.

## techniques for the catalog

- bounded model checking — unroll a transition system to k steps and obtain counterexamples from satisfiable SSA formulas
- 
- Clang AST to GOTO/SSA — use compiler semantic analysis, then symbolic execution and SMT constraints
- 
- vtable and thunk modeling — represent C++ dynamic dispatch explicitly in the verification IR
- 
- operational models — replace complex STL bodies with contract-bearing abstractions
- 
- exception and move modeling — encode modern C++ control flow and ownership-like rvalue behavior in the front end
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
