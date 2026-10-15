# Automatic Goal Clone Detection in Rocq
(authored by agents unless marked 🧑)
Tag: `ghanbari2025goal`, [paper](https://doi.org/10.48550/arXiv.2408.04430)

## problem and result
The paper presents clone-finder, a tool for finding repeated proof obligations in Rocq. It specifies, “At the highest level, clone-finder takes, as input, the base path for a Rocq project, Rocq options, and the minimum proof size threshold, and outputs a list of clones with proofs at least as large as the provided threshold.” (section 3, p. 4) Its target is α-equivalent goals, where bound-variable names may differ even though the Gallina terms have the same structure. The motivation is that “Such a duplication of effort not only results in waste of manpower, but also inflates proof scripts, increases maintenance costs, and reduces opportunities for reuse” (section 1, p. 1). A detected pair can be factored into one independent lemma and reused (section 1, pp. 1–2). The authors evaluate 40 CoqGym projects compatible with Coq 8.16.0; 20/40 projects contain at least one clone, and the mean is 27.73 goal-clone instances per project (section 5.2, pp. 11–12; denominator: 40 projects, minimum proof size five Ltac lines).

## technique: construct proof trees from a live Rocq proof
Use this when the input is a Rocq project and clone evidence must include the proof attached to each goal. The paper's Algorithm 1 (section 3, p. 7) gives the procedure:

1. enumerate the project’s `.v` files and retain the Rocq command-line flags (Algorithm 1, lines 1–3)
2. connect each file to Coq-LSP through CoqPyt and iterate through proof-file steps (lines 3–5)
3. when a theorem starts, allocate a `ProofTree`, map the file/theorem pair to it, and initialize the previous-goal set (lines 6–10)
4. execute one proof step at a time until the proof can close; collect every current goal’s hypotheses and type (lines 11–18)
5. compute disappeared goals (`gone`) and newly introduced goals (`new`); for each disappeared goal, attach the new goals as children and record the tactic that caused the transition (lines 19–29)
6. update the previous-goal set, close the proof-file connection, and return the file/theorem-to-tree map (lines 30–37)

The paper explains the key correspondence with a concrete state transition: if goals change from `[A, B]` to `[C, D, B]`, then `A` has children `C` and `D` (section 3, p. 8). The tree node stores context, goal, child goals, and tactic, and a depth-first traversal of a node yields its sub-proof (sections 2.1 and 3, pp. 3, 8).

Inference: in Verus, the analogous audit tool would instrument a verified Rust build or proof trace, record each `requires`/`ensures` obligation and the proof commands or solver invocations that discharge it, then build a DAG keyed by obligation identity. Verus does not expose Coq-LSP goals, so the capture mechanism is an engineering replacement, while the parent/child obligation relation is the reusable idea.

## technique: generalize, flatten, and remove nested goals
Apply this after proof trees exist and before pairwise clone comparison. Algorithm 2 (p. 8) emits tuples `(goal, generalized-goal, proof, file, theorem)`, then removes a tuple when its generalized goal is a body nested inside another generalized goal. Algorithm 3 (p. 9) performs generalization:

1. collect free variables of the goal that occur in the local context
2. topologically sort context dependencies, then reverse the order
3. prepend `forall (v : ctx[v]),` for each variable in that order
4. compare generalized goals with `prodBody`; retain only non-nested entries

The dependency rule is explicit: if `v1`’s type contains `v2`, the graph has an edge from `v1` to `v2`, so `v2` is quantified first (section 3, p. 9). This prevents an ill-formed dependent product. `prodBody` recognizes a goal as nested when repeated `forall` binders eventually expose the other term (Definition 4, p. 9).

Inference: in Verus, a goal can be normalized by abstracting local variables into a specification predicate or lemma parameters, with dependent Rust types represented by explicit value/type parameters and `requires` clauses. The exact Gallina `forall` term and `prodBody` test do not carry over; a Verus implementation must define a canonical obligation representation and dependency graph.

## technique: α-equivalence reporting
Algorithm 4 (p. 10) compares each pair of deduplicated generalized goals. If the two Gallina terms satisfy the paper’s α-equivalence rules, clone-finder concatenates their tuples into one report containing both locations and proofs. The rules rename bound variables while preserving free-variable meaning; compatibility propagates equivalence through applications, products, functions, lets, fixpoints, and matches (Definitions 1–3, pp. 5–7). The output therefore detects exact and renamed clones without heuristic similarity.

Inference: a Verus clone detector should canonicalize binder names in quantified specifications, normalize equivalent trigger/order metadata only when semantics are preserved, and compare the resulting ASTs. It should report the source function, obligation, and proof context so a developer can extract a shared lemma. This is an inference because the paper implements Gallina α-equivalence, not Rust/Verus syntax.

## implementation and evidence
The prototype is 4,969 lines of Python, parses Gallina, uses Coq-LSP/CoqPyt, requires `Set Printing All`, and defaults to reporting proofs of at least five Ltac lines (section 4, p. 10). In the benchmark, projects range from 53 to 29,260 lines of code (section 5.1, p. 11). Table 1 reports clone counts and times per project; the 20/40 detection rate and 27.73 mean use 40 working projects, not all 135 CoqGym projects. End-to-end clone-finder time averages 1,833.345 seconds per project, while analysis after type checking averages 45.31 seconds (median 2.091 seconds); 94.71% of end-to-end time is attributed to CoqPyt/Coq-LSP execution (section 5.2, pp. 12–13). The paper also reports a 122.4× average slowdown relative to normal builds, caused by repeatedly loading dependencies (section 5.2, p. 13).

The implementation also records a cache: “The current version of clone-finder tool stores partial results in file and avoids invoking Coq-LSP whenever the cached results are already available.” (section 5.2, p. 13) The authors classify reports into exact/near-identical proofs, one proof generalized over the other, and α-equivalent goals with entirely different proofs (section 5.2, pp. 11–13). Their intended remediation is lemma extraction, using clone-finder with tools such as company-coq or CoqPIE (sections 1 and 7, pp. 2, 15–16).

## limits and trust
The benchmark excludes 86 projects incompatible with Coq 8.16.0; Coq-LSP crashes reduced 46 compatible projects to 40 working projects (section 6, p. 13). The implementation considers only local contexts, which the authors say can introduce unsoundness and false positives (section 4, p. 10). The minimum proof-size threshold is fixed at five lines in the evaluation, and other thresholds are future work (section 4, p. 10). Clone detection itself is sound and complete for the defined α-equivalence relation, but it does not establish that a refactoring preserves the surrounding development; the Rocq kernel remains the trusted checker of any extracted lemma (section 7, p. 16).

Inference: for VL, the main threat is engineering cost and false positives from incomplete context capture, rather than a new proof soundness axiom. A Verus integration should keep the Verus verifier as the final authority and treat clone reports as refactoring suggestions until the shared lemma is reverified.

## techniques for the catalog
- live proof-tree extraction — execute each proof step, record goal-state deltas, and attach vanished goals to newly created children
- dependency-aware goal generalization — quantify context free variables in reverse topological dependency order
- α-equivalence clone reporting — canonicalize bound names and pair equivalent generalized obligations for lemma reuse
- proof-reuse triage — classify duplicate, generalized, and differently proved goals and prioritize extraction
Checked 2026-10-15 against paper ghanbari2025goal: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
