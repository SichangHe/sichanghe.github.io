# cvc5: A Versatile and Industrial-Strength SMT Solver
(authored by agents unless marked 🧑)
Tag: `barbosa2022cvc5`, [paper](https://doi.org/10.1007/978-3-030-99524-9_24)

## scope and architecture

The abstract describes cvc5 as “the latest SMT solver in the cooperating validity checker series and builds on the successful code base of CVC4.” The authors say, “cvc5 is not a rewrite of CVC4 and indeed builds on its successful code base and architecture” (§1). The paper lists these new since CVC4 1.8: a new C++ API with new Python and Java APIs, a new bit-vector theory solver, a proof-production module, a new non-linear arithmetic procedure, and syntax-guided quantifier instantiation (§1). The command-line interface is built on the parser and accepts SMT-LIBv2, SyGuS2, and TPTP; the C++ API is the main interface, with Java and Python bindings (§2, §3). The SMT Solver module contains a Rewriter, a Preprocessor, a Propositional Engine (CDCL(T) with a customized MiniSat), and a Theory Engine that handles theory combination and quantified reasoning; it also constructs models and extracts assumptions, cores, and proofs for unsatisfiable formulas (§2, §2.1).

## technique: configurable satisfiability-preserving preprocessing

Before any satisfiability check, cvc5 applies to each input formula a sequence of satisfiability-preserving transformations: 34 passes, executed in a fixed order (§2.1). The paper separates them into (i) required normalization (for example, removal of `ite` terms), (ii) optional simplification (for example, finding entailed theory literals), and (iii) optional reductions from one logic to another (for example, non-linear integer arithmetic to a bit-vector problem with configurable bit-width). Optional passes are enabled and disabled through configuration options. Passes are self-contained, and adding or modifying one does not require knowledge of the solver engine internals (§2.1). The paper also says non-linear integer problems are solved by incremental linearization and “incomplete techniques based on reductions to bit-vectors” (§2.1, Non-linear Arithmetic), so a bit-vector reduction is not a complete method.

Inference, a workflow built on this (the paper gives no such steps): (1) parse an SMT-LIB or API formula; (2) required normalization runs; (3) enable optional simplifications suited to the workload; (4) use a bit-width reduction only when a bounded answer is acceptable, because it is incomplete; (5) the transformed formula goes to the propositional engine.

verus form

Inference: Verus users could simplify specifications through ordinary Rust/Verus definitions and expose only needed lemmas, while preserving semantics. A bounded bit-vector reduction is appropriate only when the Rust property is genuinely width-bounded; it cannot justify arbitrary mathematical integers. The final `requires`, `ensures`, `invariant`, and `proof fn` obligations still need Verus checking. Inference: preprocessing can explain solver speed changes without changing the source-level contract, so record backend options in CI. (Claims about Verus are not from the paper and were not checked against it.)

## technique: CDCL(T) and theory cooperation

The Clausifier converts the Boolean abstraction of the input into CNF, which is the input of the SAT solver, a customized MiniSat. The extensions the authors added to MiniSat are “the production of resolution proofs; native support for pushing and popping assertions; and a Decision Engine,” which can create customized decision heuristics (§2.1). The Propositional Engine asserts a theory literal to the Theory Engine as soon as the SAT solver assigns a value to the propositional variable abstracting the atom. Consistency is checked at two efforts, standard (partial Boolean model) and full (full Boolean model). At standard effort, a theory solver may optionally perform lightweight consistency checking; at full effort it must either produce a lemma or determine whether the asserted literals are satisfiable and, if not, produce a conflict clause, one that is valid in the theory but inconsistent with the asserted literals (§2.1).

The Theory Engine dispatches asserted literals to the appropriate theory solvers and sends propagated literals and lemmas back to the Propositional Engine. Each theory solver relies on an Equality Engine (congruence closure). The Combination Engine coordinates theory solvers using polite theory combination and care graphs, and controls the Model Manager that builds the model (§2.1). The Equality Engine policy is configurable: distributed (one engine per theory solver) or central (one shared engine) (§3). Push/pop is part of SMT-LIB and is supported by context-dependent data structures that save and restore solver state, which lets the solver reuse work from earlier checks (§2.4).

verus form

Inference: this maps to Verus's normal workflow: write a contract, let the backend search, and add `proof fn` lemmas when a theory combination needs a missing fact. Incremental checking could support a proof-search driver that pushes a candidate lemma set, runs Verus, and pops it after a counterexample. Verus source should use documented constructs only; cvc5's internal modules are not Rust APIs.

## technique: proof-producing SMT with reconstruction

The Proof Module was built from scratch and replaces CVC4's incomplete proof system. Its design principles (§2.2) are: proof-production overhead “should be at most linear in the solving time”; emitted proofs detailed enough to enable efficient (polynomial) checking; disabling a component in proof mode because it lacks proof support should be rare; and proof production flexible enough for different formats. The paper states, “the Proof Module in cvc5 produces detailed proofs for nearly all of its theories, rewrite rules, preprocessing passes, internal SAT solvers, and theory combination engines.” These are design goals and a coverage claim; the paper reports no measurement of proof overhead or checking time. It supports eager and lazy proof production with built-in proof reconstruction. It keeps a single internal proof representation. §2.2 says it can emit proofs in formats supported by the LFSC proof checker and by the Lean 4, Isabelle/HOL and Coq proof assistants; §3 says the currently supported output formats are LFSC, Alethe, and Lean 4 (§2, §3).

In §3, Alethe proofs can be checked by reconstruction within Isabelle/HOL and within Coq (via SMTCoq); the paper calls these integrations “ongoing work.” Lean 4 is supported only as an external checker, for a subset of theories: cvc5 models proof rules as Lean types and reduces proof checking to type checking. LFSC comes with a small generic checker that takes a proof term and a signature; cvc5 has signatures for all its theories (§3).

Inference, a workflow: (1) request proof output for an unsatisfiable query; (2) choose an output format; (3) run the matching checker or reconstruction; (4) treat acceptance as evidence for unsatisfiability.

verus form

Inference: a Verus integration could consume cvc5 proofs only if the translation and checker are trusted and compatible with Verus's formula language. Proof-producing backends could reduce trust in an opaque solver, but they do not validate Rust compiler behavior, external libraries, or a wrong specification. (Claims about how Verus invokes its solver are not from the paper.)

## technique: specialized decision procedures and SyGuS

cvc5's new non-linear arithmetic sub-solver is based on cylindrical algebraic coverings, uses the libpoly library, and “implements several different variable orderings, as these can have a significant impact on run-times in practice” (§3). The new bit-vector solver supports off-the-shelf SAT back-ends such as CaDiCaL or CryptoMiniSat for both eager and lazy bit-blasting (§3). Syntax-guided quantifier instantiation is a theory-agnostic enumerative technique that uses the SyGuS solver to synthesize instantiation terms in a counterexample-guided manner (§3). The SyGuS solver also underlies the interpolation and abduction solvers; the paper describes SyGuS support for programming-by-example (decision-tree learning), among other techniques (§3).

## evaluation, trust, and limits

The evaluation compares cvc5 commit 5f998504, CVC4 1.8, and Z3 4.8.12 on the non-incremental SMT-LIB benchmarks (379,750 in the Table 1 total), excluding 45 (misclassified) benchmarks that have quantifiers in quantifier-free logics and 1128 (misclassified) benchmarks that have non-linear literals in linear arithmetic logics (§4). Each solver and benchmark pair got one CPU core of an Intel Xeon E5-2620 v4 cluster, 8GB of RAM, and a 20-minute limit. Totals solved were cvc5 346,638/379,750, CVC4 342,559/379,750, and Z3 340,819/379,750 (Table 1). The paper reports “no disagreements among the solvers on the satisfiability of benchmarks.” The solvers ran with competition scripts (SMT-COMP 2020 for CVC4, a slightly updated SMT-COMP 2021 script for cvc5) that, for some logics such as quantified logics, try multiple options in a sequential portfolio; Z3's options are not described.

Per Table 1, cvc5 solved fewer than CVC4 in several divisions, notably QF linear integer arithmetic (8619 vs 8778) and QF equality+bit-vector (16274 vs 16333); smaller deficits appear in Equality, QF Equality+LinearArith, QF Equality+NonLinearArith, QF LinearRealArith, and QF Strings. Z3 solved more than cvc5 in Arith, Equality+LinearArith, QF Equality+Bitvec, QF Equality+LinearArith, QF Equality+NonLinearArith, and QF NonLinearIntArith. The paper explains only some of the CVC4 gaps: the linear integer arithmetic loss is attributed to “refactorings related to adding proof support,” the equality and bit-vector loss to the new bit-vector solver not yet being “optimized for theory combination,” and for strings, to bug fixes since CVC4 that affected performance (§4).

On industrial use (§4), the paper says “CVC4 is used extensively in industry, and our users are in the process of updating to cvc5,” listing back-ends for Zelkova at Amazon, Boogie (used in projects including Dafny and the Move Prover), Certora, Sledgehammer, and SPARK. This is a claim by the authors about CVC4 users, not a measurement for cvc5.

These denominators and exclusions matter: the table measures this benchmark snapshot, these settings, and this hardware, not universal dominance or Verus speed. Inference: trusted components for a verifier using cvc5 include the input specification, parser, preprocessing correctness, solver implementation, proof checker (if used), and any translation to a client verifier. Inference: proof production can strengthen backend evidence, while option portfolios and per-division regressions can still cause timeouts and maintenance instability.

Inference: reuse the proof-producing architecture idea, explicit benchmark denominators, fixed resource limits, and per-logic regression tracking. Do not claim that cvc5's total wins imply Z3 replacement for Verus; test the exact Verus-generated formulas and preserve a checker-backed trust story.

## techniques for the catalog

- 34-pass preprocessing — normalize, simplify, and optionally reduce formulas in a fixed order, with optional passes configurable
- CDCL(T) cooperation — combine CNF SAT search with theory lemmas and conflict clauses at standard/full effort
- proof reconstruction — emit detailed proofs in LFSC, Alethe, or Lean 4 for independent checking; Isabelle/HOL and Coq integrations via Alethe are ongoing
- specialized theory solvers — use non-linear arithmetic, bit-blasting, strings, arrays, and quantifier modules per logic
- SyGuS-assisted reasoning — synthesize abducts, interpolants, and quantifier-instantiation terms from grammars
