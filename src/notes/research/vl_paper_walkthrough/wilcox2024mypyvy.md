# mypyvy: A Research Platform for Verification of Transition Systems in First-Order Logic
(authored by agents unless marked 🧑)
Tag: `wilcox2024mypyvy`, [paper](https://www.semanticscholar.org/paper/5ea39378766e90d5a2469ddc12040045f73efa32)

## what the paper provides

The paper presents mypyvy as an open-source platform for writing symbolic transition systems in uninterpreted first-order logic, querying them with external solvers, and developing invariant-inference algorithms. It targets distributed algorithms, but its language and solver interfaces are intended as reusable research infrastructure. The abstract states: "mypyvy is an open-source tool for specifying transition systems in first-order logic and reasoning about them." (Abstract, p. 71.) The platform combines a modeling language, solver-based queries, invariant inference, and a benchmark collection (Introduction, p. 72).

The design choice is to avoid SMT theories such as arithmetic, arrays, and algebraic data types when possible. The authors motivate this by solver difficulty when theories are combined with quantifiers, while quantifiers are needed to describe all messages or nodes in distributed algorithms (Introduction, p. 71). EPR, the effectively propositional fragment, is the practical discipline that restores decidability and finite counterexamples (Sect. 3.3, pp. 78–79).

## technique: encode a system as a first-order transition model

Use this when the target is a protocol or concurrent algorithm whose safety argument can be expressed with relations and quantified formulas. The paper's worked example is a toy consensus protocol in which nodes vote for values and a quorum decision must be unique (Sect. 2, pp. 73–75).

Steps from the paper:

1. Choose uninterpreted sorts for the domains. The example uses `node`, `value`, and `quorum`; abstract majorities as quorums satisfying an intersection axiom (Sect. 2, pp. 73–74). The paper says: "The first step is to choose the types over which the transition system is defined." (Sect. 2, p. 73.)
2. Declare state variables as immutable or mutable constants, relations, or functions over those sorts. In the example, `member` is immutable and `v`, `b`, and `d` record votes, prior voting, and decisions (Sect. 2, p. 73).
3. State background restrictions as axioms over immutable symbols. The quorum-intersection condition is an axiom; a total order can abstract natural numbers such as rounds (Sect. 2, pp. 74–75).
4. Define initial states with `init` declarations. The example makes all mutable relations empty (Sect. 2, p. 75).
5. Define atomic transitions with pre-state and post-state formulas. Parameters are nondeterministically assigned local variables. Preconditions constrain unprimed symbols; postconditions constrain primed symbols and relate both states. A `modifies` clause lists mutable components that may change, and omitted components are implicitly unchanged (Sect. 2, p. 75). The paper says: "Transitions can have parameters, which are local variables that are assigned nondeterministically whenever the transition is executed." (Sect. 2, p. 75.)
6. State a safety formula, such as agreement that at most one value is decided. It must hold in every state reachable from an initial state by transitions (Sect. 2, p. 75).

Evidence: the paper gives the complete consensus model in Fig. 2 and says the repository contains over 30 systems, including consensus, networking, and cache-coherence algorithms (Sect. 2.1, p. 75). It gives no aggregate success rate for these models. The model assumes that the abstraction, including quorum intersection and uninterpreted domains, represents the intended protocol; the paper does not prove that modeling abstraction itself against an implementation.

Verus form. Inference: represent the mathematical state with ghost state or a Verus state-machine model, and represent executable Rust state separately. Use `requires` and `ensures` on transition functions for pre/post relations, `invariant` clauses for loop preservation, and `proof fn` lemmas for quorum-intersection consequences. Rust's types and ownership replace some explicit state-variable discipline, but quantified protocol facts and the abstraction of a quorum still need specifications. The paper's `modifies` syntax is not a Verus construct; frame facts should be expressed in postconditions and ownership, using only the supported Verus forms documented in the Verus notes.

## technique: solver-backed inductiveness, theorems, and bounded exploration

Use these queries while developing a model or as building blocks for invariant inference. Once a transition system is specified, mypyvy translates queries into satisfiability problems for Z3 or cvc5 (Sect. 3, p. 75).

Inductiveness checking proceeds as follows: declare candidate invariants; conjoin them with safety properties; split the check into one solver query for every transition/invariant pair; inspect a model when a query is satisfiable (Sect. 3.1, pp. 75–78). Splitting outside the solver improves performance, reliability, and transparency when one case is difficult (Sect. 3.1, p. 76). A failed check returns either a one-state initial-state violation or a two-state counterexample to induction (Sect. 3.2, p. 77). The paper's exact summary is: "The most common query in mypyvy is to check if the candidate invariant is inductive." (Sect. 3.1, p. 76.)

Theorem declarations check formulas modulo axioms. A zero-state theorem uses immutable symbols, a one-state theorem may use mutable symbols, and a two-state theorem relates two states. In the example, these prove nonempty quorums, derive agreement from supporting invariants, and check preservation by `vote` (Sect. 3.1, p. 76). BMC unrolls the transition relation to ask whether a safety violation is reachable within at most `k` transitions (Sect. 3.1, p. 76). Trace queries constrain a pattern of transitions and then ask for unsatisfiability or satisfiability. The paper's example searches for three votes followed by two decisions and a violation; a satisfiable trace query checks that a vote and decision can occur, helping expose vacuity where a modeling error accidentally disables transitions (Sect. 3.1, pp. 76–77).

Relaxed BMC adds relaxation steps that delete elements from the active universe. The implementation introduces a mutable unary `active` relation for every sort, guards every quantifier with it, and adds a `relax` transition whose post-state active set is a subset of the pre-state set. It reasserts axioms after each relaxation and requires constants and function closure (Sect. 3.1, pp. 77–78). A relaxed counterexample from an initial state to a violation proves that no universally quantified inductive invariant implying safety exists for that example (Sect. 3.1, p. 77).

Verus form. Inference: BMC maps to a bounded Rust harness or a finite ghost-state model, while unbounded inductiveness maps to function contracts and loop or state-machine invariants. Counterexample traces can be represented by a ghost sequence and checked with `assert`; Verus does not provide mypyvy's first-order model printer or automatic universe reduction. The relaxed-BMC impossibility result is a logical result about universally quantified invariants, so it would require a separate Verus meta-model rather than an ordinary executable proof.

Evidence and limits: the paper reports mechanisms and illustrative traces, not a benchmark denominator or timing table for query performance. Solver termination is guaranteed only when generated formulas stay in EPR; outside that fragment, solvers may diverge (Sect. 3.3, p. 78). The trusted base includes the external solver, the translation to solver formulas, and the correctness of the model's axioms.

## technique: invariant inference with PDR∀ and primal-dual Houdini

PDR∀ adapts IC3/PDR to universally quantified first-order clauses. It incrementally constructs frames, finds backward-reachable states, and blocks a state by computing a forbidden sub-state that excludes every state containing that pattern. Success returns a conjunction of universally quantified clauses. Failure may loop or return a relaxed trace proving that no universally quantified inductive invariant exists for the property (Sect. 4, p. 79). The implementation is described as state of the art and has been used for comparisons on benchmarks requiring universal invariants (Sect. 4, p. 79).

Primal-dual Houdini exploits a duality between transition-system reachability and incremental induction proofs. It adds one universally quantified clause at a time and is best when the target invariant can be built incrementally. If it cannot be built incrementally, it can produce a witness of that fact (Sect. 4, p. 79). The paper reports that it was prototyped with mypyvy, demonstrating the platform's role in research; it does not give a single success percentage in this platform paper.

Steps for either method are therefore: encode the transition system and safety property; choose the universal-invariant fragment; run the implementation, which repeatedly calls the inductiveness and counterexample queries; inspect the returned clauses, counterexample, relaxed trace, or non-incrementality witness; and validate the result with the ordinary inductiveness query (Sect. 3.1 and Sect. 4, pp. 76–79). The first, second, and fifth steps are direct consequences of the described algorithms; the paper does not prescribe a user checklist beyond the algorithm descriptions.

Verus form. Inference: PDR∀ and Houdini are external invariant synthesizers. A VL pipeline could generate candidate `requires`/`ensures` facts or state-machine invariants, then ask Verus to prove each candidate and use failed proofs as counterexamples. Verus does not expose a PDR∀ implementation, universally quantified clause frames, or a first-order model API in the referenced Verus material. A generated candidate must remain a specification or `proof fn` obligation; it must not be inserted as an unchecked assumption.

## technique: build an extensible verification platform

The paper's engineering technique is to keep the representation close to the user formula and expose reusable interfaces. mypyvy is written in statically typed Python; types document interfaces and catch bugs (Sect. 5, pp. 79–80). Its ASTs support symbolic manipulation without an extra intermediate representation. Scope resolution uses a purely functional context that is discarded and recomputed on each traversal, making generated ASTs easy to process with negligible runtime overhead (Sect. 5, p. 80). The solver layer offers a library of common primitives, a lower-level interface for custom satisfiability queries, minimized models and unsat cores, and parallel execution for thousands of queries (Sect. 5, p. 80).

The benchmark set is itself a technique: over 30 transition systems and their invariants provide reusable evaluation tasks (Sect. 2.1, p. 75). Subsequent projects use these artifacts for phase-guided PDR∀, quantified-invariant search, quantified IC3, finite-instance IC3, and liveness proofs based on ranking functions (Sect. 6, pp. 80–81). The paper gives project names and reuse modes but no common denominator or comparative accuracy number.

Verus form. Inference: a VL implementation can mirror the separation between a Rust/Verus AST, normalized specification facts, solver invocation, and counterexample rendering. Typed Rust data structures and recomputed contexts can reduce stale symbol-table state, but this is an engineering analogy rather than a Verus theorem. Existing mypyvy benchmarks could be translated into Rust state machines to test invariant-generation agents; translation effort and semantic fidelity would need measurement.

## what is proved, measured, and trusted

The paper proves or relies on logical facts about the EPR fragment: satisfiability is decidable and its small-model property yields finite counterexamples (Sect. 3.3, pp. 78–79). It demonstrates that mypyvy can express and query distributed transition systems and host two invariant-inference implementations, and it documents more than 30 benchmarks (Abstract; Sects. 2.1, 4, pp. 71, 75, 79). It does not report a controlled accuracy, runtime, or coverage denominator for all benchmarks in this platform description. No numerical contradiction appears in the reported counts; “over 30” is intentionally an approximate count.

The trusted boundary includes the first-order axioms and abstraction chosen by the modeler, the translation from mypyvy formulas to solver queries, Z3 or cvc5, and the solver's answer. EPR restricts divergence but does not make a wrong model correct. Inference: for agent-written verified Rust, the threat is moderate. The paper supplies a mature pattern for generating and checking quantified invariants and for finding counterexamples, so a product that only offers generic invariant prompts would duplicate this workflow. The paper does not establish automatic translation from arbitrary Rust to first-order transition systems, nor does it check that a protocol abstraction matches an implementation; those remain product opportunities and risks.

What VL should not redo is a generic benchmark platform, basic inductiveness checking, PDR∀, primal-dual Houdini, or a first-order counterexample printer without a Rust-specific contribution. Inference: a useful VL direction is to translate selected mypyvy benchmarks into Verus state machines, compare generated invariants with the original clauses, and measure proof time, repair steps, and abstraction mismatches under fixed versions.

## techniques for the catalog

- first-order transition modeling: choose uninterpreted sorts, axioms, initial states, atomic pre/post transitions, and safety formulas
- split inductiveness queries: check each transition/invariant pair separately and inspect finite solver counterexamples
- theorem and trace queries: use zero/one/two-state theorems, BMC, and constrained traces to prove consequences and expose vacuity
- relaxed bounded model checking: guard quantifiers with active universes and use relaxation traces to test universal-invariant limits
- PDR∀ invariant inference: block forbidden sub-states and synthesize universally quantified inductive clauses
- primal-dual Houdini: add universal clauses incrementally and return a witness when incremental construction fails
- extensible solver platform: typed ASTs, recomputed contexts, solver interfaces, minimized models, unsat cores, parallel queries, and shared benchmarks

Checked 2026-10-15 against the paper by a Codex agent for mypyvy_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
