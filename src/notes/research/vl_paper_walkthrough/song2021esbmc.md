# ESBMC-Solidity: An SMT-Based Model Checker for Solidity Smart Contracts
(authored by agents unless marked 🧑)
Tag: `song2021esbmc`, [paper](http://arxiv.org/abs/2111.13117v1)

## what is proved or measured
ESBMC-Solidity is a Solidity frontend for ESBMC's SMT-based context-bounded model checker. It translates Solidity compiler JSON AST into ESBMC's intermediate representation (IR), reuses symbolic execution and SMT solving, and reports state-trace counterexamples for satisfiable safety violations. The abstract claims: “The experiments performed here showed that ESBMC-Solidity detected all vulnerabilities, was the fastest tool, and provided a counterexample for each benchmark.” The 4-page paper presents an early prototype and evaluates eight test cases (TC1-TC8) covering five vulnerability types listed under three SWC IDs (SWC-101, SWC-115, SWC-110, Table 2); it proves no theorem about Solidity semantics or completeness.

## technique 1: grammar-guided AST-to-IR frontend
what it is: compile Solidity to compact JSON AST, then convert each AST node to ESBMC's tree-shaped `irept` IR while preserving semantic information and type checking. The IR is converted to a symbol table and then a GOTO program.

how to do it (the paper gives the pipeline, not numbered steps; the numbering is ours):
1. invoke the Solidity compiler with `--ast-compact-json` for lexical analysis, parsing, and JSON AST production (Section 2.1, PDF p. 2)
2. traverse each node with conversion routines such as `get_var_decl_stmt`, `get_expr`, and `get_statement`
3. follow the production rules of the Solidity grammar documentation so child nodes are visited in the correct order; a `for` node has four children (initialisation, condition, increment, loop body), and the initialisation must be visited before the body
4. create an equivalent `irept` and populate the ESBMC symbol table, merging it with the symbol table obtained by instantiating ESBMC's existing clang frontend on the more than 70 intrinsic declarations (e.g. forward declarations for nondeterministic types) (Section 2.2, PDF pp. 2-3)
5. translate the symbol table into a GOTO program for symbolic execution (Section 2.1, PDF p. 2); the paper says the frontend then reuses ESBMC's incremental and k-induction strategies (Section 1)

The authors warn that converting a loop body before its variable initialization makes the type checker “fail to handle any reference to it”. The paper says: “The proposed approach takes JSON AST and converts each of its nodes into an equivalent IR one, using the ESBMC’s irept, a tree-structured IR that preserves a program’s semantics.”

Inference: a Verus pipeline can use an AST-to-intermediate representation only as a front-end engineering layer. Rust syntax and ownership must be represented explicitly, then Verus itself should check the resulting Rust contracts. No Solidity parser, GOTO program, or `irept` carries over as a Verus construct.

## technique 2: hybrid instrumentation with assertions, assumptions, and nondeterminism
what it is: add three source-level primitives to make bounded model checking express a safety property, restrict input states, and explore unknown values.

how to do it (numbering is ours; Section 2.2 "Hybrid conversion" requires `assert()`, `assume()` and `nondet()` and says ESBMC implements them as C-style declarations, which the frontend converts through its clang frontend):
1. use `nondet()` to assign an unconstrained value of the desired Solidity type
2. use `__ESBMC_assume(condition)` to restrict the symbolic state space
3. use `assert(property)` to state the safety condition
4. invoke ESBMC on the JSON AST and target function, for example `esbmc <JSON AST> --function func_sat --z3` (Section 2.3, PDF p. 3; the paper's example defines `nondet()` and `__ESBMC_assume` as functions inside the contract)
5. let symbolic execution encode the constraints and property into a verification condition

The paper's example sets `x = 0`, chooses `uint8 y = nondet()`, assumes `y < 255`, `y > 220`, and `y != 224`, and asserts `sum % 16 != 0`. The authors explain: “Those help developers narrow down the scope for triggering a bug, hence identifying a set of breaking inputs.” Inference: the assumptions are part of the analyzed model; they do not prove that deployed callers satisfy them.

Inference: in Verus, executable inputs should be explicit Rust parameters, while a `requires` clause expresses an input restriction and an `ensures` clause expresses the desired result. A `proof fn` or `assert` can establish arithmetic consequences. the paper does not discuss Verus, and I did not check Verus documentation here, so the claim that Verus lacks a `nondet()` primitive for executable code is unverified; an agent can quantify or reason over an arbitrary input in a spec, but should not mistake a sampled value for universal coverage. `__ESBMC_assume` does not carry over as Verus syntax.

## technique 3: SSA verification condition and counterexample trace
what it is: symbolically execute the GOTO program into static single assignment (SSA), form `C ∧ ¬P`, and ask an SMT solver whether the negated property is satisfiable.

how to do it:
1. generate SSA assignments from symbolic execution (Section 2.1, PDF p. 2)
2. collect assumptions and nondeterministic assignments into `C`
3. encode the safety assertion as `P`
4. query an off-the-shelf solver on `C ∧ ¬P`
5. if satisfiable, report a violating path and a state trace that can reproduce the bug (the paper: “If a property is satisfiable, an execution path leads to a bug in an original Solidity smart contract.”); Inference: if unsatisfiable, the bounded query found no violation under its model (the paper does not describe this case)

For the example, ESBMC introduces `temp = sum % 16`, sets `P` to `temp != 0`, and the counterexample shows “where y is set with a value 240” (Section 2.3, PDF p. 3). The paper states: “Consequently, ESBMC reports a property violation and provides a counterexample that contains a trace of states showing the set of assignments and the breaking values that trigger such violation, where y is set with a value 240”. ESBMC supports Z3, Bitwuzla, Boolector, MathSAT, CVC4, and Yices (Section 2.1, PDF p. 2).

Inference: in Verus, the final acceptance query is generated by Verus and its solver, not by an agent. A countermodel can guide repair of `requires`, `ensures`, or loop `invariant`, but it is evidence about a failed obligation, not a proof of the universal postcondition. Bounded context exploration and Solidity's transaction semantics do not automatically cover Rust threads, heap aliasing, or unbounded loops.

## technique 4: vulnerability benchmark design and cross-tool comparison
what it is: build a benchmark suite from a vulnerability taxonomy and compare bug detection, counterexamples, and CPU time against other Solidity tools.

how to do it:
1. select SWC registry categories: integer overflow/underflow (TC1–TC4), `tx.origin` authorization (TC5), and static/dynamic array out-of-bounds (TC6–TC8) (Table 2, PDF p. 4)
2. write one test case (TC) per row of Table 2; the paper says the suite and logs are publicly available on Zenodo (Section 3.1, PDF p. 3), and that all bugs in the TCs “were detected and confirmed by at least one of the non-ESBMC tools”
3. run ESBMC-Solidity, SmartCheck, Slither, Oyente, and Mythril
4. record Found and CE (counterexample) separately and record total CPU time (Table 1)
5. (authors' hypothesis, not tested) explain the other tools' missing counterexamples by loss of the original Solidity syntax: “One possible reason for the missing counterexamples could be loss of the original Solidity syntax”

The denominator is eight test cases (TC1–TC8). ESBMC-Solidity's table shows Found=Yes for all 8 and CE=Yes for TC1–TC4 and TC6–TC8, while TC5 is Found=Yes and CE=N/A; the paper says “For TC5, a counterexample is not needed, as a tool should only inform that authorization via tx.origin must be avoided.” SmartCheck and Slither found only TC5, Oyente found nothing ("Failed to compile" on TC5), and Mythril reported Found=Yes on all eight with CE=No on the seven where a CE applies (Table 1). Total CPU times are ESBMC-Solidity 0.183 s, Slither 0.519 s, Oyente 1.116 s, SmartCheck 1.160 s, and Mythril 3.106 s (Table 1, p. 4; “the CPU time [18] used for verification”). The paper's explanations for the speed gap are hedged: Oyente and Mythril “employ simulation for execution path-exploration [20], which might be the reason why they are slower”, and Slither's code optimization “might add to the total verification time” (Section 3.2). The paper does not report hardware, repeat counts or variance for the times.

Inference: “all vulnerabilities” means all eight cases in this benchmark, not all Solidity programs, and the benchmark was authored by the tool's authors. The abstract's “provided a counterexample for each benchmark” does not match Table 1's TC5 N/A; this study reports the table's explicit denominator and exception.

## evidence, trust, limitations, and threat
The authors call the system an “early prototype” (Section 3, Conclusions) and state: “Our current focus is on providing 100% coverage for the language Solidity, including polymorphism, inheritance, special crypto functions, such as Keccak256 and sha256, and multiple returns.” (Conclusions, PDF p. 4). Inference: the evaluation therefore says nothing about unsupported language features. Inference: bounded model checking can miss behaviors outside the explored bound; the paper provides no completeness proof or bound-sensitivity experiment. Inference: it also relies on the Solidity compiler's AST, ESBMC's symbolic executor and GOTO conversion, the chosen SMT solver, and the semantic correctness of the frontend.

## techniques for the catalog
- grammar-guided AST conversion — traverse compiler JSON AST in grammar order and emit semantic-preserving verifier IR
- hybrid contract instrumentation — combine nondeterministic values, assumptions, and assertions to define bounded safety queries
- SSA SMT violation search — form `C ∧ ¬P` and use an SMT solver to return a violating state trace
- taxonomy-driven vulnerability benchmarks — derive cases from SWC categories and record detection, counterexamples, and CPU time
- trace-preserving counterexamples — retain original source declarations so solver states reproduce the reported bug (the paper offers this only as a possible reason other tools lack counterexamples)
