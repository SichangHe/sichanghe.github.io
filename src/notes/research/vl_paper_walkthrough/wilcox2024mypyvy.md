# mypyvy: A Research Platform for Verification of Transition Systems in First-Order Logic
(authored by agents unless marked 🧑)
Tag: `wilcox2024mypyvy`, [paper](https://doi.org/10.1007/978-3-031-65630-9_4)

## what the paper provides

The paper presents mypyvy as an open-source platform for writing symbolic transition systems in uninterpreted first-order logic, querying them with external solvers, and developing invariant-inference algorithms. It targets distributed algorithms, but its language and solver interfaces are intended as reusable research infrastructure. The abstract states: "mypyvy is an open-source tool for specifying transition systems in first-order logic and reasoning about them." (Abstract, p. 71.) The platform combines a modeling language, solver-based queries, invariant inference, and a benchmark collection (Introduction, p. 72).

The design choice is to avoid SMT theories such as arithmetic, arrays, and algebraic data types when possible. The authors motivate this by solver difficulty when theories are combined with quantifiers, while quantifiers are needed to describe all messages or nodes in distributed algorithms (Introduction, p. 71). EPR, the effectively propositional fragment, is the practical discipline that restores decidability and finite counterexamples (Sect. 3.3, pp. 78–79).

## technique: encode a system as a first-order transition model

Inference: use this when the target is a protocol or concurrent algorithm whose safety argument can be expressed with relations and quantified formulas. The paper's worked example is a toy consensus protocol in which nodes vote for values and at most one value may be decided (Sect. 2, pp. 73–75).

Steps from the paper:

1. Choose uninterpreted sorts for the domains. The example uses `node`, `value`, and `quorum`; abstract majorities as quorums satisfying an intersection axiom (Sect. 2, pp. 73–74). The paper says: "The first step is to choose the types over which the transition system is defined." (Sect. 2, p. 73.)
2. Declare state variables as immutable or mutable constants, relations, or functions over those sorts. In the example, `member` is immutable and `v`, `b`, and `d` record votes, prior voting, and decisions (Sect. 2, p. 73).
3. State background restrictions as axioms over immutable symbols. The quorum-intersection condition is an axiom; a total order can abstract natural numbers such as rounds (Sect. 2, p. 74).
4. Define initial states with `init` declarations. The example makes all mutable relations empty (Sect. 2, p. 75).
5. Define atomic transitions with pre-state and post-state formulas. Parameters are nondeterministically assigned local variables. Preconditions constrain unprimed symbols; postconditions constrain primed symbols and relate both states. A `modifies` clause lists mutable components that may change, and omitted components are implicitly unchanged (Sect. 2, p. 75). The paper says: "Transitions can have parameters, which are local variables that are assigned nondeterministically whenever the transition is executed." (Sect. 2, p. 75.)
6. State a safety formula, such as agreement that at most one value is decided. It must hold in every state reachable from an initial state by transitions (Sect. 2, p. 75).

Evidence: the paper gives the consensus model in Fig. 2 and states: "The mypyvy repository includes over 30 transition systems collected over the years." These include consensus, networking, and cache-coherence algorithms (Sect. 2.1, p. 75). It gives no aggregate success rate for these models. Inference: applying a result to an implementation requires justifying the modeling abstraction; the paper does not prove a refinement from an implementation to this example.

Verus form. Inference: a possible adaptation would represent mathematical protocol state separately from executable Rust state, express each transition's preconditions and postconditions, and prove quorum-intersection consequences as lemmas. The adaptation would need explicit facts about unchanged state and a justification of the quorum abstraction. This paper does not evaluate a Verus encoding.

## technique: solver-backed inductiveness, theorems, and bounded exploration

Use these queries while developing a model or as building blocks for invariant inference. Once a transition system is specified, mypyvy translates queries into satisfiability problems for Z3 or cvc5 (Sect. 3, p. 75).

Inductiveness checking proceeds as follows: declare candidate invariants; conjoin them with safety properties; split the check into one solver query for every transition/invariant pair; inspect a model when a query is satisfiable (Sects. 3.1–3.2, pp. 76–78). The authors report: "In our experience, splitting the disjunction outside the solver improves performance and reliability, and, best of all, improves transparency for the user when one of the cases is more problematic (e.g., takes a long time)." (Sect. 3.1, p. 76.) A failed check returns either a one-state initial-state violation or a two-state counterexample to induction (Sect. 3.2, pp. 77–78). The paper's exact summary is: "The most common query in mypyvy is to check if the candidate invariant is inductive." (Sect. 3.1, p. 76.)

Theorem declarations check formulas modulo axioms. A zero-state theorem uses immutable symbols, a one-state theorem may use mutable symbols, and a two-state theorem relates two states. In the example, these prove nonempty quorums, derive agreement from supporting invariants, and check preservation by `vote` (Sect. 3.1, p. 76). BMC unrolls the transition relation to ask whether a safety violation is reachable within at most `k` transitions (Sect. 3.1, p. 76). Trace queries constrain a pattern of transitions and then ask for unsatisfiability or satisfiability. The paper's example searches for three votes followed by two decisions and a violation; a satisfiable trace query checks that a vote and decision can occur, helping expose vacuity where a modeling error accidentally disables transitions (Sect. 3.1, pp. 76–77).

Relaxed BMC adds relaxation steps that delete elements from the active universe. The implementation introduces a mutable unary `active` relation for every sort, guards every quantifier with it, and adds a `relax` transition whose post-state active set is a subset of the pre-state set. Other state variables remain unchanged over the active part. Axioms are asserted initially and after every step, with assertions that active universes contain constants and are closed under functions (Sect. 3.1, p. 77). A relaxed counterexample from an initial state to a violation proves that no universally quantified inductive invariant implying safety exists for that example (Sect. 3.1, p. 77).

Counterexample presentation is also extensible. A model lists sort universes and immutable interpretations, then mutable interpretations for each state; relations print positive tuples by default. Annotations and Python printer plugins can order elements or display sets. `@no_print` hides symbols, while `@no_minimize` prevents minimization of elements of a chosen sort or relation (Sect. 3.2, p. 78).

Verus form. Inference: bounded traces could become finite test cases, while inductiveness obligations could become transition contracts or state-machine invariants. Transferring the relaxed-BMC impossibility result would require formalizing its first-order invariant class and universe-reduction semantics. The paper does not establish these adaptations.

Evidence and limits: the paper reports mechanisms and illustrative traces, not a timing table for query performance. EPR supplies a decidability guarantee and finite counterexamples; outside a decidable fragment, solvers may diverge (Sect. 3.3, pp. 78–79). Inference: trusting a verification result requires trusting the external solver and translation, and justifying the model's axioms.

## technique: invariant inference with PDR∀ and primal-dual Houdini

PDR∀ adapts IC3/PDR to universally quantified first-order clauses. It incrementally constructs invariants by finding backward-reachable states and blocking them relative to a frame. Blocking computes a forbidden sub-state that excludes every state containing that pattern. Success returns a conjunction of universally quantified clauses. Otherwise, it may loop forever or return a relaxed trace proving that no universally quantified inductive invariant exists for the property (Sect. 4, p. 79). The authors describe their implementation as state of the art and cite comparisons in other papers; they report success on benchmarks requiring only universal invariants (Sect. 4, p. 79).

Primal-dual Houdini exploits a duality between transition-system reachability and incremental induction proofs. It adds one universally quantified clause at a time and is best when the target invariant can be built incrementally. If it cannot be built incrementally, it can produce a witness of that fact (Sect. 4, p. 79). The paper reports that it was prototyped with mypyvy, demonstrating the platform's role in research; it does not give a single success percentage in this platform paper.

Inference: a workflow using either implementation would encode the transition system and safety property, seek universally quantified invariants, run the implementation, inspect its invariant or witness, and independently check any returned invariant with the inductiveness query. This is a proposed workflow based on Sects. 3.1 and 4 (pp. 76–79), not a checklist prescribed by the paper.

Verus form.

## technique: build an extensible verification platform

The paper's engineering technique is to keep the representation close to the user formula and expose reusable interfaces. mypyvy is written in statically typed Python; types document interfaces and catch bugs (Sect. 5, pp. 79–80). Its ASTs support symbolic manipulation without an extra intermediate representation. Scope resolution uses a purely functional context that is discarded and recomputed on each traversal; the authors report that this makes generated ASTs easy to process with negligible runtime overhead (Sect. 5, p. 80). The solver layer offers a library of common primitives, a lower-level interface for custom satisfiability queries, minimized models and unsat cores, and parallel execution for thousands of queries (Sect. 5, p. 80).

The repository supplies over 30 transition systems (Sect. 2.1, p. 75) and includes invariants for use as benchmarks (Introduction, p. 73). Phase-PDR∀ builds on the code and PDR∀ implementation; SWISS accepts input files and uses benchmarks but is implemented separately in C++; P-FOL-IC3 uses the code and benchmarks; IC3PO uses manually translated benchmarks; and LVR uses models, benchmarks, and P-FOL-IC3 inference for ranking-function liveness proofs (Sect. 6, pp. 80–81). The paper gives these reuse modes without a common comparative evaluation.

Verus form.

## what is proved, measured, and trusted

The paper relies on established logical facts about the EPR fragment: satisfiability is decidable and its small-model property yields finite counterexamples (Sect. 3.3, pp. 78–79). It demonstrates that mypyvy can express and query distributed transition systems and host two invariant-inference implementations, and it documents more than 30 benchmarks (Abstract; Sects. 2.1, 4, pp. 71, 75, 79). It does not report a controlled accuracy, runtime, or coverage denominator for all benchmarks in this platform description. The benchmark count is stated only as “over 30”.

## techniques for the catalog

- first-order transition modeling: choose uninterpreted sorts, axioms, initial states, atomic pre/post transitions, and safety formulas
- split inductiveness queries: check each transition/invariant pair separately and inspect solver counterexamples, guaranteed finite for EPR queries
- theorem and trace queries: use zero/one/two-state theorems, BMC, and constrained traces to prove consequences and expose vacuity
- relaxed bounded model checking: guard quantifiers with active universes and use relaxation traces to test universal-invariant limits
- PDR∀ invariant inference: block forbidden sub-states and synthesize universally quantified inductive clauses
- primal-dual Houdini: add universal clauses incrementally and return a witness when incremental construction fails
- extensible solver platform: typed ASTs, recomputed contexts, solver interfaces, minimized models, unsat cores, parallel queries, printer plugins, and shared benchmarks
