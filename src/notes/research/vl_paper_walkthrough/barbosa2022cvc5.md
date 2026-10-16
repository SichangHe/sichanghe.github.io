# cvc5: A Versatile and Industrial-Strength SMT Solver
(authored by agents unless marked 🧑)
Tag: `barbosa2022cvc5`, [paper](https://doi.org/10.1007/978-3-030-99524-9_24)

## scope and architecture

The abstract describes cvc5 as “the latest SMT solver in the cooperating validity checker series and builds on the successful code base of CVC4.” cvc5 is an SMT backend descended from CVC4. It keeps CVC4's architecture while adding theories, APIs, proof production, nonlinear arithmetic, and syntax-guided quantifier instantiation. The authors say, “cvc5 is not a rewrite of CVC4 and indeed builds on its successful code base and architecture.” It accepts SMT-LIBv2, SyGuS2, and TPTP through a command-line parser and exposes C++, Python, and Java APIs (§2). The solver module combines preprocessing, a CDCL(T) propositional engine, theory solvers, model construction, and proof/unsat-core extraction.

## technique: configurable satisfiability-preserving preprocessing

Use preprocessing to reduce verification conditions before search. cvc5 applies a fixed-order sequence of 34 passes (§2.1). The paper separates them into required normalization (for example, removing `ite` terms), optional simplification (finding entailed theory literals), and optional reductions that change logic, such as reducing nonlinear integer arithmetic to bit-vectors with a configurable width (§2.1).

Steps: (1) parse an SMT-LIB or API formula; (2) run required normalization; (3) enable optional simplifications appropriate to the workload; (4) use a reduction only when its bounded encoding is an accepted model; (5) pass the transformed formula to the propositional engine. Passes are self-contained and can be changed without knowing the SMT engine internals (§2.1).

verus form

Inference: Verus users should simplify specifications through ordinary Rust/Verus definitions and expose only needed lemmas, while preserving semantics. A bounded bit-vector reduction is appropriate only when the Rust property is genuinely width-bounded; it cannot justify arbitrary mathematical integers. The final `requires`, `ensures`, `invariant`, and `proof fn` obligations still need Verus checking. Inference: preprocessing can explain solver speed changes without changing the source-level contract, so record backend options in CI.

## technique: CDCL(T) and theory cooperation

The propositional engine clausifies the Boolean abstraction into CNF and runs a customized MiniSat. Extensions include resolution-proof production, push/pop assertions, and a decision engine for custom heuristics (§2.1). As SAT assigns atoms, literals are asserted to the Theory Engine. At standard effort, a theory solver may perform lightweight checks; at full effort it must emit a lemma or decide consistency and, on conflict, emit a theory-valid conflict clause (§2.1).

The Theory Engine dispatches terms to arithmetic, arrays, bit-vectors, sets, strings, floating point, quantifiers, and other modules. An Equality Engine shares equalities; a Combination Engine coordinates theory solvers. Use incremental push/pop when checking many related verification conditions, because the architecture explicitly supports restoring assertion states (§2.3).

verus form

Inference: this maps to Verus's normal workflow: write a contract, let the backend search, and add `proof fn` lemmas when a theory combination needs a missing fact. Incremental checking can support a proof-search driver that pushes a candidate lemma set, runs Verus, and pops it after a counterexample. Verus source should use documented constructs only; cvc5's internal modules are not Rust APIs.

## technique: proof-producing SMT with reconstruction

cvc5's proof module is designed so proof generation costs at most linearly in solving time, emitted proofs are detailed enough for polynomial-time checking, and output can use multiple proof systems (§2.2). The paper states, “The Proof Module in cvc5 produces detailed proofs for nearly all of its theories, rewrite rules, preprocessing passes, internal SAT solvers, and theory combination engines.” It supports eager and lazy production with built-in reconstruction. Internally, one representation can be emitted as LFSC, Alethe, Lean 4, Isabelle/HOL, or Coq (§2.2).

Steps: (1) request proof output for an unsatisfiable query; (2) retain the internal proof through preprocessing, rewriting, SAT, and theory combination; (3) choose an output format; (4) run the corresponding small checker or proof assistant; (5) treat a checker acceptance as evidence for unsatisfiability. Alethe supports coarse and fine steps and reconstruction; Lean output models proof rules as types and reduces checking to type checking (§2.2).

Verus form

Inference: a Verus integration could consume cvc5 proofs only if the translation and checker are trusted and compatible with Verus's formula language. Verus ordinarily relies on its own solver invocation and does not import arbitrary cvc5 proof terms. Proof-producing backends could reduce trust in an opaque solver, but they do not validate Rust compiler behavior, external libraries, or a wrong specification.

## technique: specialized decision procedures and SyGuS

cvc5 adds a nonlinear-arithmetic solver with multiple variable orderings, a new bit-vector solver that can call CaDiCaL or CryptoMiniSat, and syntax-guided quantifier instantiation using the SyGuS solver (§3). Its SyGuS layer also supports invariant, abduction, interpolation, and other synthesis queries (§3). Use the specialized procedure matching the obligation; use SyGuS when the missing lemma or term can be described by a grammar.

Inference: a VL proof assistant could generate bounded candidate lemmas from a grammar and ask a SyGuS backend for terms, then place a returned term into a Verus `proof fn` and verify it. The paper does not establish that generated terms are sufficient for arbitrary Rust APIs.

## evaluation, trust, and limits

The evaluation compares cvc5 commit 5f998504, CVC4 1.8, and Z3 4.8.12 on 379,750 non-incremental SMT-LIB benchmarks, excluding 45 misclassified quantifier-free benchmarks and 1,128 misclassified nonlinear-in-linear-arithmetic benchmarks (§4). Each solver got one Intel Xeon E5-2620 v4 core, 8 GB RAM, and a 20-minute limit per benchmark. Totals solved were cvc5 346,638/379,750, CVC4 342,559/379,750, and Z3 340,819/379,750 (Table 1). The paper reports no satisfiability disagreements. cvc5 lost to CVC4 in QF linear integer arithmetic and QF equality+bit-vector divisions, attributing this to proof-support refactoring and unoptimized theory combination (§4).

These denominators and exclusions matter: the table measures this benchmark snapshot and settings, not universal dominance or Verus speed. Trusted components include the input specification, parser, preprocessing correctness, solver implementation, proof checker, and any translation to a client verifier. Inference: the threat to agent-written verified Rust is medium. Proof production can strengthen backend evidence, while option portfolios and theory-specific regressions can still cause timeouts and maintenance instability.

what VL should reuse

Inference: reuse proof-producing architecture, explicit benchmark denominators, fixed resource limits, and per-logic regression tracking. Do not claim that cvc5's total wins imply Z3 replacement for Verus; test the exact Verus-generated formulas and preserve a checker-backed trust story.

## techniques for the catalog

- 34-pass preprocessing — normalize, simplify, and optionally reduce formulas in a fixed configurable order
- CDCL(T) cooperation — combine CNF SAT search with theory lemmas and conflict clauses at standard/full effort
- proof reconstruction — emit detailed proofs in LFSC, Alethe, Lean 4, Isabelle/HOL, or Coq for independent checking
- specialized theory solvers — use nonlinear arithmetic, bit-blasting, strings, arrays, and quantifier modules per logic
- SyGuS-assisted reasoning — synthesize invariants, abductions, interpolants, and quantified terms from grammars
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
