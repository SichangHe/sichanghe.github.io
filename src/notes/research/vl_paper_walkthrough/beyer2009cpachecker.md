# CPAchecker: A Tool for Configurable Software Verification
(authored by agents unless marked 🧑)
Tag: `beyer2009cpachecker`, [paper](http://arxiv.org/abs/0902.0019v1)

## scope

CPAchecker is a Java framework for composing configurable program analyses (CPAs). The paper’s central claim is that “The main algorithm is configurable to perform a reachability analysis on arbitrary combinations of existing CPAs” (abstract, p. 1). A CPA supplies an abstract domain and operators; the generic algorithm explores a control-flow automaton (CFA) without knowing the concrete analysis. The release implements predicate abstraction, octagon, and explicit-value domains (abstract, p. 1). The experiments use C driver benchmarks, not Rust or Verus.

## technique 1: a common CPA interface

What it is. The CPA formalism gives an interface containing the abstract domain, `post`, `merge`, and `stop` operators (Section 1, p. 2). CPAchecker keeps analyses interchangeable: “The tool can be seen as a set of components that are loosely dependent on each other and that are easy to substitute” (Section 1, p. 2).

When to use it. Use this design when experiments must isolate one analysis component while holding parsing, solver, and other components constant. The authors identify a reproducibility problem: parser front end, theorem prover, and pointer-alias analysis can dominate performance, making it hard to tell what a new algorithm contributes (Section 1, p. 2).

How to do it.

1. Parse source into a syntax tree, then transform it into CFAs. A CFA has control-flow locations and edges; an edge is an assume operation, assignment block, function call, or function return (Section 2, p. 2).
2. Define an abstract domain and implementations of the CPA operation interfaces (Section 2, p. 3).
3. Feed the CFA and CPA object to the generic reachability algorithm. The algorithm invokes only the CPA interface (Section 2, p. 3).
4. Compose several CPAs when desired; the usual concrete CPA is a Composite CPA (Section 2, p. 3).

Verus form. Inference: model each Verus analysis component as a Rust module with explicit state, transition/specification functions, and proof lemmas; keep orchestration independent of the component’s representation. Inference: Verus does not provide a runtime CPA interface, so this architecture would organize proof-generation and counterexample analyses around traits or enums, while the verified program itself remains ordinary Rust with `requires`, `ensures`, and invariants. Inference: CFA edges correspond to program statements and branch assumptions, but Verus’s proof state is richer than a simple Java object interface.

Evidence and limits. The paper reports no proof that arbitrary CPA combinations terminate or preserve soundness; each CPA implementation and solver remains trusted. The architecture is intended for extension rather than a complete soundness theorem.

## technique 2: add a new analysis with two integration steps

What it is. To add a new abstract domain, CPAchecker requires exactly two framework changes: “First, an entry in the global properties file is necessary in order to announce the new CPA for composition. Second, the interface for CPA needs to be implemented, and implementations of all CPA operation interfaces need to be provided” (Section 2, p. 3).

How to do it. Create a class such as `ShapeCPA`; implement the CPA interface and each operation interface; register it in the global properties file; then select it, or several implementations of one operator, in an experiment configuration (Section 2, pp. 3–4). The paper’s example says that alternative merge operators can be supplied as separate implementations and freely configured (Section 2, p. 4).

Verus form. Inference: encode each proof strategy behind a module boundary and choose it through a build or command-line configuration; do not hide unsound assumptions behind an `external_body` function. Inference: registration metadata can select lemma sets or solver options, but the verified function’s contract must remain explicit in the Rust source.

## technique 3: precision through composite explicit values and predicates

What it is. The experiment combines explicit-value analysis (constant propagation) with Cartesian, lazy predicate abstraction (Section 3, p. 4). Explicit analysis tracks integer values up to a threshold. When the threshold is exceeded, the value becomes top (unknown); predicate abstraction then discovers predicates to eliminate infeasible paths (Section 3, p. 5).

How to do it. Choose a threshold for the number of explicit values tracked per variable. Run the composite analysis; when a value reaches the threshold, abstract it to top; let predicate abstraction generate predicates during refinement; repeat until the error location is proved unreachable or reached (Section 3, pp. 4–5). Compare thresholds including 0 (pure predicate abstraction), finite values, and infinity (pure explicit-value analysis).

Evidence. On ten simplified Windows-driver programs, Table 1 reports processor-time seconds for five thresholds (0, 2, 3, 5, infinity), with a 1200-second termination limit. For example, `cdaudio simpl1` takes more than 1200 seconds at threshold 0, 525.90 at 2, 74.65 at 3, 8.43 at 5, and 2.96 at infinity (Table 1, p. 5). The authors state that threshold 5 gives the best total performance for this set and is a tradeoff between expensive predicate abstraction and exploding explicit-value analysis (Section 3, p. 5). Table 2 records predicate and refinement counts; for `cdaudio simpl1`, threshold 5 uses 2 predicates and 11 refinements, while threshold 2 uses 81 predicates and 332 refinements (Table 2, p. 5).

Verus form. Inference: represent finite value facts as ghost state and discharge path conditions with `assert` and lemmas; use stronger invariants or abstraction lemmas when concrete values exceed a manageable case split. Inference: Verus does not automatically perform lazy predicate abstraction, so this strategy would be a proof-authoring or external search layer that proposes invariants, followed by Verus checking them. The threshold experiment transfers as a tuning study over invariant strength or case partition size.

Limits. The benchmark is ten driver variants, all safety reachability tasks, on Ubuntu 8.10 x86-32, Intel Core 2 Duo, 2 GB RAM; the JVM memory limit is 1.8 GB and timeout 1200 seconds (Section 3, p. 5). These settings and the small benchmark do not establish general performance. Inference: VL should publish machine, solver, timeout, and benchmark denominators for every configuration.

## what is proved, measured, and trusted

Measured outputs are runtime, predicate counts, and refinement counts. The paper does not prove the implementation’s soundness, and the extracted paper gives no formal theorem that composition preserves it. Trusted components include the parser/CDT front end, CFA construction, CPA implementations, SMT solvers (Simplify and MathSAT), interpolation procedures, Java runtime, and benchmark classifications (Section 2, p. 3; Section 3, p. 5). Inference: for VL, Verus and its SMT backend, Rust compiler model, and any generated proof-search code must be named as trusted or checked components.

## implications for VL

Inference: CPAchecker’s most reusable lesson is an experiment architecture that keeps representations and analysis choices replaceable, so VL can compare invariant-generation or counterexample-guided strategies under one harness. Inference: VL should not redo CPAchecker’s Java/CFA parser or its threshold experiment; those are background designs. Inference: threat to an agent-written verified-Rust product is medium: modular proof search and reproducible tuning can improve reliability, but a wrong abstraction, unsound external assumption, or misconfigured solver can still yield a misleading result.

## techniques for the catalog

- configurable program analysis interface — separate abstract state, post, merge, and stop operations behind a replaceable CPA contract
- two-step analysis integration — register a component and implement every CPA operation interface
- composite explicit-value and predicate abstraction — combine cheap value tracking with predicate refinement and tune the value threshold
- reproducible precision tuning — report runtime, predicate/refinement counts, machine, memory, timeout, and benchmark denominator
Checked 2026-10-15 against paper beyer2009cpachecker: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
