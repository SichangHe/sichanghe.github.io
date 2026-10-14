# The Design and Algorithms of a Verification Condition Generator
(authored by agents unless marked 🧑)
Tag: `grigore2012design`, [paper](http://arxiv.org/abs/1204.6719v1)
## scope
Radu Grigore’s FreeBoogie dissertation studies a Boogie-style verification-condition (VC) generator as a compiler pipeline. It gives operational semantics for core Boogie, a flowgraph and AST architecture, passivation algorithms, weakest-precondition (WP) and strongest-postcondition (SP) VC generation, incremental VC pruning, and semantic reachability analysis. The central engineering premise is explicit: “The VC generator is a trusted component of program verifiers” (section 1.1, p. 2).

Inference: For Verus and VL, this is a design reference for making lowering, obligation generation, caching, and vacuity analysis reviewable. FreeBoogie is not a Verus implementation; mappings below are inferences.

## technique 1: a staged, typed VC pipeline

What it is. FreeBoogie parses Boogie, repeatedly desugars and normalizes it, cuts loops, removes assignments, computes a VC, adds prover-specific axioms, simplifies, and queries an SMT prover. The pipeline is shown in Figure 3.3 (p. 21). The dissertation states, “All these transformations are designed not to miss bugs, at the cost of possible false positives” (section 3.2, p. 21).

How to do it.
1. Parse source into an abstract syntax tree (AST).
2. Desugar `break`, `while`, `if`, calls, `havoc`, and specifications into a core language of `assert`, `assume`, `goto`, and return (section 3.2, p. 21).
3. Update type information, symbol tables, and a flowgraph after transformations; FreeBoogie recomputes auxiliary information after a batch and caches repeated computations (sections 3.3–3.4, pp. 23–32).
4. Handle loops so the flowgraph is acyclic, then passivate/remove assignments (section 3.2, p. 22).
5. Compute a VC using WP or SP, add axioms for theories absent from the prover, simplify, and send SMT (section 3.2, p. 22).
6. Preserve source locations and phase dumps so intermediate graphs can be inspected; the command `fb --dump-intermediate-stages=log example.bpl` writes each phase (section 3.1, p. 19).

Verus form. Inference: retain Rust spans and Verus construct provenance through parsing, ownership checking, specification elaboration, SMT lowering, and solver query creation. Verus’s `requires`, `ensures`, `invariant`, `assert`, `assume`, `old`, and `proof fn` are the source-level counterparts of contract and proof nodes. A VL diagnostic should identify the phase that introduced an assumption or obligation. Do not represent Verus `invariant` as a callable function, and do not call `proof fn` at runtime.

Evidence and limits. FreeBoogie’s transformations are intended sound, but the dissertation says all are complete except loop handling (section 3.2, p. 22). The prover backend remains trusted unless it emits checkable certificates. The paper does not measure Verus-like Rust front-end costs.

## technique 2: passivation and single-assignment versions

What it is. Passivation replaces mutable assignments by versioned variables and assumptions, producing an assignment-free acyclic program whose VC avoids exponential substitution blowup. Without passivation, the “exploding diamonds” example yields a query of size `Θ(2^n)`; after passivation, the size is linear in the program (section 4.1.1, pp. 43–45). The paper summarizes, “Passivation follows loop cutting and precedes the computation of the VC” (section 4.5, p. 65).

How to do it.
1. Cut loops to obtain an acyclic flowgraph.
2. For each mutable variable, classify nodes as read, write, or read-write and assign a version to each write.
3. Insert copy nodes on edges where a read needs a different reaching write version.
4. Replace each assignment with a fresh version and an equality assumption; Figure 4.7 shows `v0 := u`, branch assumptions, and `v1 := v0 + 1`/`v1 := v0` (section 4.1.4, p. 51).
5. Use the resulting assignment-free graph for WP or SP VC generation. Hash-cons SMT trees to share common subexpressions.

Verus form. Inference: Rust SSA-like lowering and SMT snapshots already provide much of this behavior. VL should preserve old values and mutable-field versions when explaining a loop invariant or `ensures`; use Verus `old(...)` and ghost state rather than exposing Boogie version names to users. Ownership means aliasing is constrained differently from Boogie globals, but array/map updates still need explicit snapshots.

Evidence. On the Boogie benchmark, the study passivated 1,177 variables. “For 70% of the variables in the Boogie benchmark both algorithms say that one version is enough”; for the remaining 30%, Flanagan–Saxe used on average 46% more versions than needed (section 4.3.2, p. 60). On randomly generated series-parallel graphs, fewer than 1% needed one version; for the others, the older algorithm used 160% more versions on average (section 4.3.2, p. 60). The denominator is variables, not programs; random and benchmark settings are distinct. Finding a copy-optimal increasing-version form is proved NP-complete (theorem 2, p. 63), so version-optimal heuristics are the practical choice.

## technique 3: weakest-precondition and strongest-postcondition VC generation

What it is. After passivation, FreeBoogie can generate VCs backwards with weakest preconditions or forwards with strongest postconditions. For a flowgraph, WP combines successor preconditions by conjunction; SP combines predecessor postconditions by disjunction. The dissertation states, “The strongest postcondition method always finds the strongest predicate that could possibly explain the flowgraph; the weakest precondition method always finds the weakest predicate that could possibly explain the program” (section 5.2, p. 71).

How to do it.
1. Define Hoare triples for `assert`, `assume`, and assignment and show that an annotation with valid initial precondition, valid node triples, and valid edge implications explains correctness (sections 5.1.1–5.1.2, pp. 69–71).
2. For SP, set the initial precondition to `true`, compute each node’s postcondition forward, and disjoin predecessor postconditions.
3. For WP, set return postconditions to `true`, compute node preconditions backward, and conjoin successor preconditions.
4. For each assertion, add an implication from its precondition to the assertion; conjoin local VCs into the final query.
5. Memoize `Pre` and `Post`. The SP algorithm computes the VC in `O(|V|+|E|)` time and size `O(|V|+|E|+n)`, where `n` is expression storage (propositions 7–8, pp. 76–77).

Verus form. Inference: use SP-like forward explanation for reachability and WP-like backward explanations for a failed `ensures`. The Verus proof query remains generated by Verus; VL can expose both views as diagnostics. Quantifier polarity and substitution behavior must follow Verus’s actual SMT encoding.

Evidence. In Z3 v1.2 experiments on a single core of an AMD Opteron 2218 with 16 GiB RAM, WP mildly outperformed SP, but “in over 40% of the test cases the time ratio between the worse method and the better method is > 2” (section 5.5, p. 81). The denominator is test cases; the hardware and solver setting are part of the result. This does not imply one method is universally faster.

## technique 4: sorted, hash-consed SMT backend and unsharing

What it is. FreeBoogie represents SMT terms as hash-consed rooted trees with sorts and dynamic sort checks. Shared DAGs save memory, but printing a DAG recursively can produce exponentially long text. The `EliminateSharing` transformation “plucks” definitions into implications while preserving validity.

How to do it.
1. Define labels with argument and result sorts before constructing terms; dynamically reject wrong arity or sort.
2. Intern equal trees so pointer equality represents structural equality (section 3.6.1, pp. 34–36).
3. Build a VC DAG with shared subexpressions and memoized SP/WP computations.
4. Before serialization, replace a substitution term `(v ← q) p` with `(v = q) ⇒ p`; repeatedly pluck shared definitions (section 5.4.2, pp. 77–79).
5. Choose `k = -1` to ensure only leaves have multiple parents and linear print size (section 5.4.2, p. 79).

The paper proves, “The call EliminateSharing(t) returns in O(n) time and uses O(n) space, where n is the size of the dag t” and preserves validity (theorem 4, p. 79).

Verus form. Inference: a Verus tool can hash-cons repeated SMT terms and expose compact DAG provenance, but must not alter the trusted formula without a validity-preserving proof. Keep sort checks at the boundary and report encoding errors before solver calls. Verus’s owned values and mathematical integers have semantics that differ from Boogie’s unconstrained terms.

## technique 5: incremental verification by pruning an old valid VC

What it is. Edit-and-verify reuses a previous valid VC. Given old predicate `p` and current predicate `q`, a `prune p q` transformer removes portions already established by `p` while preserving validity equivalence. Interpolants characterize a broad class of valid pruning transformers. The chapter’s contribution is “a proof technique for algorithms that simplify a VC by using an old VC as a reference” (chapter 6 introduction, p. 85).

How to do it.
1. Cache the previous valid VC and its expression DAG.
2. Find common subtrees between old and new VCs, allowing a heuristic renaming of leaves (section 6.4, pp. 96–101).
3. Apply recursive prune rules to conjunctions, disjunctions, and implications; retain only symbols shared between old and new formulas.
4. Send the pruned formula to the prover; if it simplifies to `true`, skip expensive proving.
5. Recompute from scratch when contracts, dependencies, or unrelated formula structure invalidate reuse.

Verus form. Inference: VL can cache per-function proof queries keyed by normalized Rust/Verus syntax, dependency contracts, and solver settings. A cached `true` result is valid only under an equivalence check or a trusted incremental solver protocol. Never reuse a proof after changing a called function’s `requires`/`ensures` without invalidating dependents.

Evidence. In the `dayOfYear` example, Simplify took about 17 seconds without pruning; FX7 pruning took about 2 seconds. Adding an unchanged line or another method’s contract reduced Simplify’s handling of the pruned VC to under 0.1 seconds; adding an assertion did not speed proving, while adding a later assertion reduced proving to about 8 seconds (section 6.5, p. 102). These are single-method times, not averages. Z3 2.0 took 0.5 seconds and FX7 about 2,000 seconds on the same method, showing solver-specific tradeoffs (section 6.5, p. 102). The pruning algorithm can be exponential in a DAG-size measure in the worst case (proposition 9, p. 95), so matching heuristics matter.

## technique 6: semantic reachability and smoke testing

What it is. Semantic reachability asks whether a node has any execution under code and annotations. It detects dead code, doomed assertions, inconsistent specifications, and verifier unsoundness. The dissertation defines the purpose directly: “Semantic reachability analysis finds four seemingly unrelated types of problems: dead code, doomed code, inconsistent specifications, and bugs in the frontend of the program verifier” (section 7.1, p. 107).

How to do it.
1. After passivation, compute SP preconditions for all flowgraph nodes.
2. A node is semantically reachable iff its precondition is satisfiable (proposition 12, p. 113).
3. Query `Valid(Not(Pre(x)))`; report unreachable nodes. For assertion nodes, query `Valid(Not(Post(x)))` to report doomed points (figure 7.5, p. 114).
4. To reduce prover calls, split each node into input and output nodes, maintain white/reachable, black/unreachable, and gray/unknown colors, and use dominators to propagate consequences (sections 7.3.1–7.3.3, pp. 115–120).
5. Choose a query near probability 1/2 of being black; under an expected-bug model, query around `0.7·n/b` along a dominator path (section 7.3.3, p. 120).
6. Propagate white to dominators and black to successors whose predecessors are all black (figure 7.8, p. 118).

Verus form. Inference: run a separate satisfiability analysis on Verus path conditions to identify unreachable branches, contradictory `requires`, vacuous invariants, and postconditions that are impossible on every path. Keep it diagnostic: a proof that a path is unreachable does not prove the intended property on reachable paths. Use Verus `assert`/`assume` and branch conditions; do not treat `external_body` as evidence.

Evidence. On ESC/Java’s JavaFE frontend (217 classes, 1,890 methods), semantic reachability took 34.8% of 31,589 seconds total verification time; 99.8% of that analysis time was prover time. There were 3,256 flowgraph leaves and 3,351 prover queries; averages were 5.82 seconds per method and 1.77 prover queries (section 7.3.4, p. 121). The case study found approximately 50 issues: 1 unreachable catch, 9 intended dead-code cases, 6 assertions doomed on every input, 9 doomed calls, 5 inconsistent JDK specifications, 4 loop-unrolling or modifies-related soundness bugs, and 12 unclear cases (section 7.4, pp. 122–123). These counts are issue categories in one JavaFE setting, not general defect rates.

## what is proved, trusted, and left open
FreeBoogie proves properties of its core-language transformations, gives asymptotic bounds, and evaluates benchmark behavior. Trust remains in parsing, front-end desugaring, loop handling (the one incomplete transformation class), VC generation, SMT encoding, solver answers, and any added axioms. The dissertation warns that inconsistent theories make everything provable; semantic reachability is therefore a guard against vacuity and verifier bugs. Inference: VL should show when a Verus proof depends on contradictory assumptions, unreachable branches, or axioms, and should invalidate cached proofs on dependency changes.

What VL should not redo: basic WP/SP calculus, assignment passivation, hash-consed SMT representation, and generic incremental-pruning theory are established. Inference: VL’s distinct work is Rust ownership-aware provenance, Verus-correct syntax and snapshots, trusted-boundary reporting, and practical diagnostics for agent-written proofs. The paper’s strongest product threat is a green result caused by an inconsistent contract or unsound front-end transformation; semantic reachability and explicit trust accounting directly address it.

## techniques for the catalog
- staged VC pipeline — normalize source through typed transformations and preserve inspectable intermediate representations
- passivation — replace assignments with versioned variables and assumptions to prevent exponential VCs
- weakest/strongest predicate transformers — compute backward or forward proof obligations with memoized flowgraph formulas
- hash-consed SMT backend — share terms, sort-check encodings, and unshare only with validity-preserving rewrites
- incremental VC pruning — simplify a new obligation using common structure with an old valid obligation
- semantic reachability — use satisfiable preconditions, dominators, and adaptive queries to detect dead, doomed, inconsistent, or unsound code
Checked 2026-10-13: audit record grigore2012design; paper-study comparison complete; gate executed; experiments not rerun
