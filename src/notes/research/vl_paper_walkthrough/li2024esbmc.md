# ESBMC v7.6: Enhanced Model Checking of C++ Programs with Clang AST
(authored by agents unless marked 🧑)
Tag: `li2025esbmc`, [paper](https://arxiv.org/abs/2406.17862v2)

## pipeline and bounded proof

ESBMC v7.6 extends the Clang-AST front end introduced in v7.3, which replaced the legacy parser (§1, pp. 2–3). It translates C++ with its operational models to GOTO, symbolically executes GOTO into SSA constraints, and asks an SMT solver for a bounded verdict (Fig. 1, §3, p. 7). The paper defines bounded model checking (BMC) by unrolling a transition system k times into `ψk = I(s0) ∧ ⋀_{i=0}^{k−1} T(si,si+1) ∧ ⋁_{i=0}^{k} ¬ϕ(si)` (§2.1, p. 5). It states: “The condition ψk is satisfiable if and only if a counterexample of length k or less exists for the property ϕ.” The evaluation defines a passing test case (TC) as follows (§4.1, p. 18): “A TC passes when the tool reports a verdict of “VERIFICATION SUCCESSFUL” on a program without any violation of properties or reports “VERIFICATION FAILED” on an unsafe program that violates a property.” The architecture caption says: “The grey block represents the extended Clang-based C++ front-end developed in ESBMC v7.6.”

How to apply it.
1. Parse and type-check C++ with Clang, including templates and modern language features.
2. Convert the AST to GOTO and then SSA.
3. Build the bounded formula with initial-state, transition, and negated-property constraints.
4. Run an SMT solver; a satisfying assignment is a counterexample trace, while unsat means no violation within k steps (§2.1, p. 5).
5. Use k-induction or a proven state bound for claims beyond k; the paper warns that unsat BMC alone is not complete (§2.1, p. 5).

Inference: A comparable bounded counterexample workflow could test generated Rust snippets before attempting an inductive proof, provided a suitable Rust verifier models their semantics. This paper evaluates C++, not Rust or Verus; a passing bound alone does not prove unbounded safety.

## technique 1: AST object models for polymorphism

Clang's AST lacks vtable/vptr details, so ESBMC constructs them. Each class gets one or more virtual pointers (vptrs), initialized by constructors to point to virtual function tables (vtables). A child class has an additional pointer to a vtable with a thunk, a function that redirects the call to the override (§3.1, pp. 7–9). Process Flow 1 parses class relationships, creates object models with vptrs, redirects calls through thunks to overrides, and otherwise calls the base method. Multiple inheritance uses multiple inherited vptrs; virtual inheritance avoids duplicating vptrs referring to the same vtable. The example `Bird *p = new Penguin(); assert(p->doit() == 42);` becomes a GOTO dereference of `Bird@Penguin` and a thunk that casts the receiver to `Penguin*` and calls `Penguin::doit` (Figs. 2–4, pp. 8–9).

Inference: An explicit dispatch model could make the selected implementation visible to a proof system. The paper's vtable construction supplies a C++ intermediate-representation technique, not evidence about Verus support.

## technique 2: template and modern-language front end

The Clang front end delegates template type checking and diagnostics to compiler analysis, replacing the speculative template-argument approach in v2.1 (§2.2, p. 6). Process Flow 2 parses the template class and its friend function template, instantiates them, and converts the Clang AST to an intermediate representation (§3.2, pp. 10–11). The Friend18 example uses a C++20 extension; v7.6 detects its failing assertion, whereas v2.1 reports a conversion error (Fig. 5, p. 10).

Dynamic `new`/`delete` support uses a flat memory model with dynamic-object size and validity tracking (§3.3, pp. 11–12). Process Flow 3 parses the operators and object, initializes the object, creates a valid dynamic object, checks matching allocation/deallocation operators such as `new[]`/`delete[]`, invalidates deallocated objects, and checks validity on dereference. Rvalue references are modeled as pointers and dereferenced for the relevant assignments and computations (§3.4, Process Flow 4, pp. 12–13). The front end also supports `std::move` and parses implicit move member functions from Clang AST (Fig. 8, p. 14).

Exception handling parses throw/try/catch, checks exception specifications, and routes a throw to the first matching handler (§3.5, pp. 14–17). A throw not caught within a called function propagates to its caller; an unhandled exception causes an assertion violation. `THROW DECL` checks exception specifications, including `noexcept`. The derived-class example is caught by the earlier base-class handler, so the later handler's failing assertion is not executed (Fig. 9, p. 15).

Inference: For generated Rust, the transferable idea is to model moves, allocation, and control flow explicitly before reasoning about contracts. Applying it requires a separate account of Rust semantics.

## technique 3: operational models for STL

ESBMC replaces STL implementations containing unverifiable optimized assembly with manually maintained operational models (OMs) carrying preconditions, postconditions, and side effects, including exception propagation (§2, p. 4; §3.6, pp. 16–17). v7.6 fixes parsing errors in container, stream, string, numeric, language-support, general, and localization models, updating syntax and variable names (Table 1, p. 17). The authors warn (§5, p. 25): “Accurate OMs are essential, as any approximation may lead to incorrect encoding and invalidate the verification results.”

Inference: In Verus, the equivalent is a verified specification layer for standard-library APIs, with explicit assumptions about external bodies. The trusted boundary includes every OM contract; an incorrect contract can make downstream proofs pass falsely.

## evidence and limits

The evaluation used 532 core-language test cases across six collections plus 1,001 OM-dependent cases, Ubuntu 22.04, an eight-core Intel CPU, 16 GB RAM, a 900-second timeout, and a 6 GB memory limit (§4–4.1, p. 18). Table 2 (p. 20) reports Boolector results on the six core sets: v7.6 pass rates were cpp 83%, inheritance 93%, polymorphism 85%, cbmc-template 97%, gcc-template-tests 78%, and template 81%; cumulative CPU time was 545 s, compared with 1,090 s for v2.1 and 71 s for v7.3. Performance comparisons use only cases verified correctly within the time limit (§4.2, p. 19). Inference: v7.6 improves pass rates over v7.3 on four sets and ties on two, so the boxed EQ1 claim of improvement across all sets overstates Table 2.

Table 5 reports solver configurations on the same benchmarks: Boolector 545 s/33,800 MB, Bitwuzla 549 s/38,700 MB, Z3 1,430 s/34,300 MB, CVC4 2,230 s/44,100 MB, CVC5 1,420 s/42,300 MB, MathSAT 2,930 s/50,500 MB, and Yices 1,270 s/40,800 MB (§4.3, pp. 23–24). These memory figures represent cumulative maximum resident set size across cases, rather than a single process's peak (Table 3, p. 22). The separate OM results remain uneven: v7.6 reaches 89% on vector but only 18% on multiset, below v2.1's 74% (Table 4, p. 23).

The paper reports unresolved constructor/destructor ordering for complex inheritance, including diamond inheritance (§4.4, p. 24), and unsupported Clang AST nodes (§4.2, p. 23). It questions whether the front end can fully support the standard library (§4.4, p. 24). OMs still lack some C++11 containers and multithreaded libraries (§5, p. 25). The new v7.6 contributions extend memory management, rvalue references, exceptions, and OMs on top of v7.3's Clang-based front end (§1, p. 3).

Inference: The threat to verification-guided code generation is specification and front-end mismatch: a proof may rely on an incorrect library model, or bounded evidence may be mistaken for an inductive proof. This evaluation does not establish correctness for generated Rust or Verus contracts.

## techniques for the catalog

- bounded model checking — unroll a transition system to k steps and obtain counterexamples from satisfiable SSA formulas
- Clang AST to GOTO/SSA — use compiler semantic analysis, then symbolic execution and SMT constraints
- vtable and thunk modeling — represent C++ dynamic dispatch explicitly in the verification IR
- operational models — replace complex STL bodies with contract-bearing abstractions
- exception and move modeling — encode modern C++ control flow and ownership-like rvalue behavior in the front end
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "If a suitable exception handler is found, the thrown value is assigned to the catch variable if one exists; otherwise, an error will be reported if no valid handler is present."): checked all paper text, quotations, numbers, section/page references, and technique steps; corrected version attribution, section/page references, evaluation scope, and the tag year to match the May 2025 version, expanded the memory/move/exception steps, and removed unsupported claims and empty catalog bullets; did not inspect implementation code, the linked artifact, or reproduce experiments.
