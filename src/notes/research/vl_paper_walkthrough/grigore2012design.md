# The Design and Algorithms of a Verification Condition Generator
(authored by agents unless marked 🧑)
Tag: `grigore2012design`, [paper](http://arxiv.org/abs/1204.6719v1)
## scope
Radu Grigore’s FreeBoogie dissertation (University College Dublin PhD thesis, dated March 2010; arXiv v1 posted 30 Apr 2012; page numbers below are the thesis’s printed page numbers) studies a Boogie-style verification-condition (VC) generator as a compiler pipeline. It gives operational semantics for core Boogie, a flowgraph and AST architecture, passivation algorithms, weakest-precondition (WP) and strongest-postcondition (SP) VC generation, incremental VC pruning, and semantic reachability analysis. The central engineering premise is explicit: “The VC generator is a trusted component of program verifiers” (section 1.1, p. 2).

## technique 1: a staged, typed VC pipeline

What it is. FreeBoogie parses Boogie, repeatedly desugars and normalizes it, cuts loops, removes assignments, computes a VC, adds prover-specific axioms, simplifies, and queries an SMT prover. The pipeline is shown in Figure 3.3 (p. 21). The dissertation states, “All these transformations are designed not to miss bugs, at the cost of possible false positives” (section 3.2, p. 21).

How to do it.
1. Parse source into an abstract syntax tree (AST).
2. Desugar `break`, `while`, `if`, calls, `havoc`, and specifications into a core language of `assert`, `assume`, `goto`, and return (section 3.2, p. 21).
3. Keep auxiliary information (types, a symbol table, a flowgraph) consistent with the AST. FreeBoogie’s AST is immutable, transformations do not update auxiliary information while building nodes and instead recompute it at the end, caches ensure that no computation is repeated, and the AST is type-checked after each transformation to catch bugs in FreeBoogie (sections 3.3.4–3.5, pp. 29–33).
4. Handle loops so the flowgraph is acyclic, then passivate/remove assignments (section 3.2, p. 22).
5. Compute a VC using WP or SP, add axioms for theories absent from the prover, simplify, and send SMT (section 3.2, p. 22).
6. Dump each phase so intermediate graphs can be inspected; the command `fb --dump-intermediate-stages=log example.bpl` writes the output of each processing phase to a subdirectory of `log`, and desugaring introduces labels prefixed by `$$` plus a string like `if` or `while` that hints at their origin (section 3.1, pp. 19–20).

Evidence and limits. The dissertation states “All transformations in FreeBoogie are sound; all transformations in FreeBoogie are complete, except loop handling” (section 3.2, p. 22). Soundness and completeness are defined only against core Boogie semantics, so for the earlier desugarings the paper can describe them only informally (remark 2, p. 21). Inference: the prover backend remains trusted unless it emits checkable certificates; the paper notes that SMT solvers may produce proofs checkable by a small program (section 1.3, p. 6). The paper does not measure Verus-like Rust front-end costs.

## technique 2: passivation and single-assignment versions

What it is. Passivation replaces mutable assignments by versioned variables and assumptions, producing an assignment-free acyclic program whose VC avoids exponential substitution blowup. Without passivation, the “exploding diamonds” example yields a query of size `Θ(2^n)`; after passivation, the size is linear in the program (section 4.1.1, pp. 43–45). The paper summarizes, “Passivation follows loop cutting and precedes the computation of the VC” (section 4.5, p. 65).

How to do it.
1. Cut loops to obtain an acyclic flowgraph.
2. For each mutable variable, classify nodes as read, write, or read-write and assign a version to each write.
3. Insert copy nodes on edges where a read needs a different reaching write version.
4. The passive form still contains assignments to fresh versions; Figure 4.7 shows `v0 := u`, the branch assumptions, and `v1 := v0 + 1` and the inserted copy `v1 := v0` (section 4.1.4, p. 51).
5. Replace each remaining assignment `v := e` by `assume v = e`, which the paper argues is sound and complete for passive programs (Example 5, p. 59; section 5.3, p. 75).
6. Use the resulting assignment-free graph for WP or SP VC generation. Hash-cons SMT trees to share common subexpressions.

Verus form.

Evidence. The Flanagan–Saxe algorithm does not handle `goto`; the comparison therefore ran on the Boogie benchmark’s series-parallel flowgraphs (1,070 implementations; `goto` is used in an interesting way in only 16% of them). The experiment passivated 1,177 variables (section 4.3.2, pp. 60–61). “For 70% of the variables in the Boogie benchmark both algorithms say that one version is enough”; for the remaining 30%, Flanagan–Saxe used on average 46% more versions than needed (section 4.3.2, p. 60). On randomly generated series-parallel flowgraphs, “Both algorithms say that only one version is needed in less that 1% of situations, while for the others the algorithm of Flanagan and Saxe introduces on average 160% more versions than needed” (section 4.3.2, p. 61). The percentages for the benchmark are over variables; random and benchmark settings are distinct. Finding a copy-optimal increasing-version passive form is proved NP-complete (theorem 2, p. 63); the polynomial version-optimal algorithm of Figure 4.10 (theorem 1, p. 58) is the one the paper calls “the algorithm of choice in practice” (section 4.4, p. 61). The paper leaves open the complexity of copy-optimal distinct-version passive forms (conjecture 1, p. 63).

## technique 3: weakest-precondition and strongest-postcondition VC generation

What it is. After passivation, FreeBoogie can generate VCs backwards with weakest preconditions or forwards with strongest postconditions. For a flowgraph, WP combines successor preconditions by conjunction; SP combines predecessor postconditions by disjunction. The dissertation states, “The strongest postcondition method always finds the strongest predicate that could possibly explain the flowgraph; the weakest precondition method always finds the weakest predicate that could possibly explain the program” (section 5.2, p. 71).

How to do it.
1. Define Hoare triples for `assert`, `assume`, and assignment and show that an annotation with valid initial precondition, valid node triples, and valid edge implications explains correctness (sections 5.1.1–5.1.2, pp. 69–71).
2. For SP, set the initial precondition to `true`, compute each node’s postcondition forward, and disjoin predecessor postconditions (equations 5.4, 5.5, 5.18, 5.19, pp. 72, 74).
3. For WP, set the postconditions of nodes without outgoing edges (return nodes) to `true`, compute node preconditions backward, and conjoin successor preconditions (equations 5.6, 5.21, 5.22, pp. 72, 74). The WP query is the validity of the initial node’s precondition (equation 5.23).
4. For SP, add for each assertion an implication from its precondition to the assertion’s predicate and conjoin these local VCs into the final query (equation 5.20, p. 74; figure 5.2, p. 76).
5. Memoize `Pre` and `Post`. The SP algorithm computes the VC in `O(|V|+|E|)` time and size `O(|V|+|E|+n)`, where `n` is expression storage (propositions 7–8, pp. 76–77); the paper says analogous results hold for WP (remark 11, p. 77).

Verus form.

Evidence. In Z3 v1.2 experiments on a single core of an AMD Opteron 2218 with 16 GiB RAM, WP mildly outperformed SP, but “in over 40% of the test cases the time ratio between the worse method and the better method is > 2” (section 5.5, p. 81). The denominator is test cases; the hardware and solver setting are part of the result. The paper concludes that “it turns out to be worth trying both approaches in parallel if two processing units are available” (section 5.6, p. 82). This does not imply one method is universally faster.

## technique 4: sorted, hash-consed SMT backend and unsharing

What it is. FreeBoogie represents SMT terms as hash-consed rooted trees with sorts and dynamic sort checks. Shared DAGs save memory, but printing a DAG recursively can produce exponentially long text. The `EliminateSharing` transformation “plucks” definitions into implications while preserving validity.

How to do it.
1. Define labels with argument and result sorts before constructing terms; dynamically reject wrong arity or sort.
2. Intern equal trees so pointer equality represents structural equality (section 3.6.1, pp. 34–36).
3. Build a VC DAG with shared subexpressions and memoized SP/WP computations.
4. Before serialization, replace a substitution term `(v ← q) p` with `(v = q) ⇒ p`; repeatedly pluck shared definitions (section 5.4.2, pp. 77–79).
5. The constant `k` controls how much plucking is done; choosing `k = -1` ensures only leaves have multiple parents and linear print size (section 5.4.2, p. 79). The paper says FreeBoogie’s actual implementation is slightly more complicated and gave Simplify queries answered in 30% less time than the simple algorithm, measured on the chapter 7 benchmark (p. 81).

The paper states, “The call EliminateSharing(t) returns in O(n) time and uses O(n) space, where n is the size of the dag t” and preserves validity (theorem 4, p. 79).

Verus form. Inference: a Verus tool can hash-cons repeated SMT terms and expose compact DAG provenance, but must not alter the trusted formula without a validity-preserving proof. Keep sort checks at the boundary and report encoding errors before solver calls. Verus’s owned values and mathematical integers have semantics that differ from Boogie’s unconstrained terms.

## technique 5: incremental verification by pruning an old valid VC

What it is. Edit-and-verify reuses a previous valid VC. Given old predicate `p` and current predicate `q`, a `prune p q` transformer removes portions already established by `p` while preserving validity equivalence. Interpolants give a sufficient condition for a broad class of valid pruning transformers (theorem 5, p. 89: if r is an interpolant of ¬p ∧ q and q, then |¬p| ⇒ (|¬q| = |¬r|)). The chapter’s contribution is “a proof technique for algorithms that simplify a VC by using an old VC as a reference” (chapter 6 introduction, p. 85).

How to do it.
1. Cache the previous valid VC and its expression DAG.
2. Improve sharing between old and new VCs before pruning. The experiments showed that the pruning algorithm “is useless by itself, because the SMT dags that represent the predicates p and q seldom share much”, so FX7 improves sharing by renaming leaves (variables): it finds a one-to-one correspondence between leaves of the two DAGs by maximum-weight bipartite matching on a leaf-similarity weight. The paper says a FreeBoogie implementation should find correspondences, then eliminate sharing (section 5.4.2), and then prune (sections 6.4–6.4.1, pp. 96–99).
3. Apply the recursive prune rewrite rules (6.17)–(6.20) to the negated VCs, which are conjunctions and disjunctions: if some disjunct of the old predicate also occurs as a conjunct of the new one, the result is `false`; shared conjuncts are kept and the rest is pruned recursively; a disjunction is pruned disjunct by disjunct; otherwise the new predicate is kept (section 6.3.1, p. 90; figure 6.2, p. 94). Theorem 6 (p. 93) proves these rules solve Problem 8.
4. Send the pruned formula to the prover. In the paper’s negated form the prover answers a satisfiability query; if the new VC is identical to a previous valid one, the pruned query is trivial (section 6.2, p. 88).
5. Inference: recompute from scratch when contracts, dependencies, or unrelated formula structure invalidate reuse. The paper says that when a method’s contract changes, all methods that depend on it must be re-verified (section 6.5, p. 102), and that prune p q ≡ q (“forget the old VC”) is always a valid fallback (section 6.3.1, p. 90).

Verus form.

Evidence. In the `dayOfYear` example (figure 6.1, p. 87), the VC generated by ESC/Java took about 17 seconds with Simplify “in all cases”, and FX7 spent about 2 seconds pruning it. For the original program plus line 1 (a comment) or plus line 8 (an extra `ensures` on another method), Simplify handled the pruned VC in under 0.1 seconds. Plus line 15 (an extra `ensures` on `dayOfYear`), the pruned VC was not handled faster, so verification was slowed down overall; plus line 30, the pruned VC took about 8 seconds, “so the proving time is approximatively cut in half” (section 6.5, p. 102). These are single-method times, not averages. The paper also reports that Z3 2.0 proved the same method in 0.5 seconds and FX7 in about 2000 seconds, and concludes that “pruning might be worthwhile only for methods that are difficult to verify” (section 6.5, p. 102). The chapter admits “the lack of substantial evidence that the particular pruning method proposed in Section 6.3.1 does indeed reduce the size of typical queries” (section 6.6, p. 103). The pruning algorithm takes at least exponential time in the worst case when input size is the representation size (proposition 9, p. 95) and is linear only when input size is the number of root paths of the new DAG (proposition 10, p. 96), so it is efficient only for DAGs with little sharing and matching heuristics matter.

## technique 6: semantic reachability and smoke testing

What it is. Semantic reachability asks whether a node has any execution under code and annotations. It detects dead code, doomed assertions, inconsistent specifications, and verifier unsoundness. The dissertation defines the purpose directly: “Semantic reachability analysis finds four seemingly unrelated types of problems: dead code, doomed code, inconsistent specifications, and bugs in the frontend of the program verifier” (section 7.1, p. 107).

How to do it.
1. After passivation, compute SP preconditions for all flowgraph nodes.
2. A node is semantically reachable iff its precondition is satisfiable (proposition 12, p. 113).
3. Query `Valid(Not(Pre(x)))`; report unreachable nodes. For assertion nodes, query `Valid(Not(Post(x)))` to report doomed points (figure 7.5, p. 114).
4. To reduce prover calls, split each node into input and output nodes, maintain white/reachable, black/unreachable, and gray/unknown colors, and use dominators to propagate consequences (sections 7.3.1–7.3.3, pp. 115–120).
5. Choose a query whose probability of being black is near 1/2; for a path of n nodes with an expected b bugs under an independent-bug model, this gives k ≈ 0.7·n/b (equation 7.7, p. 120), and the general algorithm applies a binary search with this split along a path of the dominator tree (figure 7.9, p. 121).
6. Propagate white to dominators and black to successors whose predecessors are all black (figure 7.8, p. 118).

Verus form. Inference: run a separate satisfiability analysis on Verus path conditions to identify unreachable branches, contradictory `requires`, vacuous invariants, and postconditions that are impossible on every path. Keep it diagnostic: a proof that a path is unreachable does not prove the intended property on reachable paths. Use Verus `assert`/`assume` and branch conditions; do not treat `external_body` as evidence.

Evidence. The query bound is l queries for a bug-free flowgraph with l leaves and roughly l + b lg h for b bugs (section 7.3.4, pp. 121–122). On ESC/Java’s JavaFE frontend (1,890 methods; 217 annotated classes per section 7.4), verification took 31,589 seconds, of which 34.8% went to semantic reachability analysis and 99.8% of that to the prover. There were 3,256 flowgraph leaves and 3,351 prover queries; per method, the analysis took 5.82 seconds, of which 5.81 seconds were in 1.77 prover queries (section 7.3.4, p. 122); loops were unrolled once in this benchmark. The case study found “≈ 50 issues” (section 7.4, pp. 122–123): dead code, 1 unreachable catch block, 9 intended dead-code cases, and 1 classic dead-code case; doomed code, 6 assertions bound to fail on any input and 9 doomed method calls; 5 inconsistent JDK specifications; unsoundness and bugs, 1 informal-comment case, 4 loops with a constant bound above the unrolling limit, and 2 missing-`modifies` cases; and 12 with unclear cause. These counts are issue categories in one JavaFE setting, not general defect rates.

## what is proved, trusted, and left open
The dissertation gives pen-and-paper proofs for properties of its core-language transformations (for example theorems 1, 3, 4, 6) and asymptotic bounds, and evaluates benchmark behavior; it does not report a machine-checked proof. It states “The VC generator is a trusted component of program verifiers” (section 1.1, p. 2).

## techniques for the catalog
- staged VC pipeline — normalize source through typed transformations and preserve inspectable intermediate representations
- passivation — replace assignments with versioned variables and assumptions to prevent exponential VCs
- weakest/strongest predicate transformers — compute backward or forward proof obligations with memoized flowgraph formulas
- hash-consed SMT backend — share terms, sort-check encodings, and unshare only with validity-preserving rewrites
- incremental VC pruning — simplify a new obligation using common structure with an old valid obligation
- semantic reachability — use satisfiable preconditions, dominators, and adaptive queries to detect dead, doomed, inconsistent, or unsound code
