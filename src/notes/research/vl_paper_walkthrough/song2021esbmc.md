# ESBMC-Solidity: An SMT-Based Model Checker for Solidity Smart Contracts
(authored by agents unless marked 🧑)
Tag: `song2021esbmc`, [paper](http://arxiv.org/abs/2111.13117v1)

## what is proved or measured
ESBMC-Solidity is a Solidity frontend for ESBMC's SMT-based context-bounded model checker. It translates Solidity compiler JSON AST into ESBMC's intermediate representation (IR), reuses symbolic execution and SMT solving, and reports state-trace counterexamples for satisfiable safety violations. The abstract claims: “The experiments performed here showed that ESBMC-Solidity detected all vulnerabilities, was the fastest tool, and provided a counterexample for each benchmark.” The 4-page paper presents an early prototype and evaluates eight test cases derived from four SWC vulnerability categories; it proves no theorem about Solidity semantics or completeness.

## technique 1: grammar-guided AST-to-IR frontend
what it is: compile Solidity to compact JSON AST, then convert each AST node to ESBMC's tree-shaped `irept` IR while preserving semantic information and type checking. The IR is converted to a symbol table and then a GOTO program.

how to do it:
1. invoke the Solidity compiler with `--ast-compact-json` for lexical analysis, parsing, and JSON AST production (Section 2.1, PDF p. 2)
2. traverse each node with conversion routines such as `get_var_decl_stmt`, `get_expr`, and `get_statement`
3. follow Solidity grammar production order; for a `for` node visit initialization, condition, increment, and body in dependency order
4. create an equivalent `irept` and populate the ESBMC symbol table, merging intrinsic declarations from the existing C frontend (Section 2.2, PDF p. 2)
5. translate the symbol table into a GOTO program for symbolic execution

The authors warn that converting a loop body before its variable initialization causes the type checker to miss references. The paper says: “The proposed approach takes JSON AST and converts each of its nodes into an equivalent IR one, using the ESBMC’s irept, a tree-structured IR that preserves a program’s semantics.”

Inference: a Verus pipeline can use an AST-to-intermediate representation only as a front-end engineering layer. Rust syntax and ownership must be represented explicitly, then Verus itself should check the resulting Rust contracts. No Solidity parser, GOTO program, or `irept` carries over as a Verus construct.

## technique 2: hybrid instrumentation with assertions, assumptions, and nondeterminism
what it is: add three source-level primitives to make bounded model checking express a safety property, restrict input states, and explore unknown values.

how to do it:
1. use `nondet()` to assign an unconstrained value of the desired Solidity type
2. use `__ESBMC_assume(condition)` to restrict the symbolic state space
3. use `assert(property)` to state the safety condition
4. invoke ESBMC on the JSON AST and target function, for example `esbmc <JSON AST> --function func_sat --z3` (Section 2.3, PDF p. 3)
5. let symbolic execution encode the constraints and property into a verification condition

The paper's example sets `x = 0`, chooses `uint8 y = nondet()`, assumes `y < 255`, `y > 220`, and `y != 224`, and asserts `sum % 16 != 0`. The authors explain: “Those help developers narrow down the scope for triggering a bug, hence identifying a set of breaking inputs.” Inference: the assumptions are part of the analyzed model; they do not prove that deployed callers satisfy them.

In Verus, executable inputs should be explicit Rust parameters, while a `requires` clause expresses an input restriction and an `ensures` clause expresses the desired result. A `proof fn` or `assert` can establish arithmetic consequences. Verus has no `nondet()` primitive for executable code; an agent can quantify or reason over an arbitrary input in a spec, but should not mistake a sampled value for universal coverage. `__ESBMC_assume` does not carry over as Verus syntax.

## technique 3: SSA verification condition and counterexample trace
what it is: symbolically execute the GOTO program into static single assignment (SSA), form `C ∧ ¬P`, and ask an SMT solver whether the negated property is satisfiable.

how to do it:
1. generate SSA assignments from symbolic execution (Section 2.1, PDF p. 2)
2. collect assumptions and nondeterministic assignments into `C`
3. encode the safety assertion as `P`
4. query an off-the-shelf solver on `C ∧ ¬P`
5. if satisfiable, report a violating path and a state trace that can reproduce the bug; if unsatisfiable, the bounded query found no violation under its model

For the example, ESBMC introduces `temp = sum % 16`, sets `P` to `temp != 0`, and finds `y = 240` as a breaking value (Section 2.3, PDF p. 3). The paper states: “Consequently, ESBMC reports a property violation and provides a counterexample that contains a trace of states.” ESBMC supports Z3, Bitwuzla, Boolector, MathSAT, CVC4, and Yices (Section 2.1).

Inference: in Verus, the final acceptance query is generated by Verus and its solver, not by an agent. A countermodel can guide repair of `requires`, `ensures`, or loop `invariant`, but it is evidence about a failed obligation, not a proof of the universal postcondition. Bounded context exploration and Solidity's transaction semantics do not automatically cover Rust threads, heap aliasing, or unbounded loops.

## technique 4: vulnerability benchmark design and cross-tool comparison
what it is: build a benchmark suite from a vulnerability taxonomy and compare bug detection, counterexamples, and CPU time against other Solidity tools.

how to do it:
1. select SWC registry categories: integer overflow/underflow (TC1–TC4), `tx.origin` authorization (TC5), and static/dynamic array out-of-bounds (TC6–TC8) (Table 2, PDF p. 4)
2. implement one or more vulnerable contracts per test case and publish the suite and logs in Zenodo
3. run ESBMC-Solidity, SmartCheck, Slither, Oyente, and Mythril
4. record Found and CE (counterexample) separately and record total CPU time (Table 1)
5. inspect missing counterexamples for traceability to original Solidity syntax

The denominator is eight test cases (TC1–TC8). ESBMC-Solidity's table shows Found=Yes for all 8 and CE=Yes for TC1–TC4 and TC6–TC8, while TC5 is Found=Yes and CE=N/A because the paper says a counterexample is unnecessary for that authorization rule. Total CPU times are ESBMC-Solidity 0.183 s, Slither 0.519 s, Oyente 1.116 s, SmartCheck 1.160 s, and Mythril 3.106 s (Table 1, p. 4). Thus “all vulnerabilities” means all eight cases in this benchmark, not all Solidity programs. The abstract's “provided a counterexample for each benchmark” conflicts with Table 1's TC5 N/A; this study reports the table's explicit denominator and exception.

Inference: for VL, a useful analogue is a versioned suite of Rust/Verus programs with distinct contract failures, recording verifier success, counterexamples, and wall time under fixed toolchain and solver versions. The SWC taxonomy and Solidity AST are domain-specific; the benchmark discipline is reusable.

## evidence, trust, limitations, and threat
The authors call the system an “early prototype” and state that current work targets 100% Solidity language coverage, including inheritance, polymorphism, cryptographic functions, and multiple returns (Conclusion, PDF p. 4). The evaluation therefore says nothing about unsupported language features. ESBMC's bounded model checking and context bounds can miss behaviors outside the explored bound; the paper does not provide a completeness proof or a bound-sensitivity experiment. It also relies on the Solidity compiler's AST, ESBMC's symbolic executor and GOTO conversion, the chosen SMT solver, and the semantic correctness of the frontend.

Inference: the trusted boundary for a Verus product should be Verus's verifier, solver assumptions, Rust compiler, and specifications; AST translation and agent-generated test selection are untrusted support layers. The paper already covers AST-preserving translation, assertion/assumption instrumentation, SSA `C ∧ ¬P` checking, and vulnerability-oriented benchmarks, so VL should not redo these generic patterns. Inference: threat to agent-written verified Rust is moderate for safety checking and regression detection, but high if bounded counterexamples are presented as exhaustive proof. A failed Verus obligation should trigger a concrete repair, while a passing proof must still be checked with a clean Verus run and reviewed for weakened contracts or unconstrained assumptions.

## techniques for the catalog
- grammar-guided AST conversion — traverse compiler JSON AST in grammar order and emit semantic-preserving verifier IR
- hybrid contract instrumentation — combine nondeterministic values, assumptions, and assertions to define bounded safety queries
- SSA SMT violation search — form `C ∧ ¬P` and use an SMT solver to return a violating state trace
- taxonomy-driven vulnerability benchmarks — derive cases from SWC categories and record detection, counterexamples, and CPU time
- trace-preserving counterexamples — retain original source declarations so solver states reproduce the reported bug
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
