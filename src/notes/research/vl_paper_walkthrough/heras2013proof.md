# Proof-Pattern Recognition and Lemma Discovery in ACL2
(authored by agents unless marked 🧑)
Tag: `heras2013proof`, [paper](https://arxiv.org/abs/1308.1780)

## what the paper proves and builds

The paper presents ACL2(ml), an ACL2 extension combining statistical clustering of theorem shapes with symbolic synthesis of auxiliary lemmas. The abstract states: “We present a novel technique for combining statistical machine learning for proof-pattern recognition with symbolic methods for lemma discovery.” Its target is the common ACL2 situation in which automatic rewriting fails until a user supplies a suitable intermediate lemma. The running examples are equivalences between recursive and tail-recursive factorial, power, and Fibonacci functions, plus JVM bytecode correctness.

Inference: the useful product lesson is a retrieval-and-mutation loop: retrieve structurally similar proved obligations, transform one of their helper lemmas toward the current goal, then reject candidates with executable counterexamples before asking the verifier to prove them. This is lemma discovery assistance, not a proof of arbitrary new mathematics.

## technique: fixed-size term-tree features

Use this when a library contains differently named but structurally similar formulas and raw symbol vocabularies would make feature vectors huge and sparse. The paper defines a term tree recursively: a variable or constant is one node; an application `f(t1,...,tn)` has root `f` and child trees. It then places each node into a 7-by-7 matrix indexed by arity and depth. The paper reports that “In ACL2(ml), we implement a more compact feature extraction, where a total number of features is fixed for all libraries at 49, and the average density of matrices is 20%.”

Steps from Definitions 1–3 (pp. 6–7): (1) parse the theorem term into a tree; (2) compute each node depth, with the root at zero; (3) assign a rational value to each symbol; (4) put that value in the row for variables or node arity and the column for depth; (5) extend the matrix to the maximum arity and depth (the experiments use arity five and depth seven, hence 49 features); (6) concatenate matrix entries into a numeric vector. The factorial theorem's matrix in Figure 3 is the concrete shape.

Verus form (Inference): extract a proof-obligation fingerprint from the syntax of a Verus `requires`/`ensures` formula, loop invariant, and nearby call terms. A tool could encode expression depth and operator arity into a fixed vector, while retaining type and module features as additional dimensions. Verus itself has no paper-defined ACL2(ml) matrix; this would be an external retrieval service that proposes candidate lemmas for a `proof fn`.

Evidence and limits: the representation is compact and dense, but the numeric symbol assignment is learned later and can change as a library grows. It records shape, not semantic equivalence, so unrelated theorems can collide. The paper explicitly notes that “the symbolic analogy tool cannot handle all possible analogical cases (and no algorithmic approach could do that in principle)” (p. 16).

## technique: recurrent definition clustering

Use this before theorem clustering when function names differ across libraries. The paper's Definition 4 assigns values to variables by order, recursive functions by the negative value of their ACL2 termination-measure function, imported Common Lisp symbols by fixed formulas, and newly defined symbols by the cluster index plus proximity of earlier definitions. The implementation repeatedly clusters definitions whenever a new definition appears; thus symbol values reflect earlier structural neighborhoods.

Steps (Section 3, pp. 7–10): (1) choose Weka K-means, EM, or Farthest-First; (2) choose granularity `g` from 1 to 5; (3) compute `n = floor(objects to cluster/(10-g))`; (4) cluster definition feature vectors; (5) assign each symbol `5 + 2*j + p`, where `j` is its cluster and `p` its proximity; (6) rebuild theorem vectors with these values; (7) rerun clustering as definitions are added. Every experiment is run 200 times, and only high-frequency outputs are shown (p. 8).

Verus form (Inference): cluster verified function signatures and normalized specification ASTs, using `spec fn` bodies, `requires`, `ensures`, and recursive decreases information as features. Keep the cluster result advisory; a Verus `proof fn` still has to establish the proposed lemma. A stable implementation would version the learned mapping because adding a function can otherwise change historical fingerprints.

Evidence: with 150 JVM-library lemmas, Table 2 shows that Fibonacci-tail clusters contain the factorial and power analogues across all tested algorithms and granularities; with 996 theorems, Table 3's K-means clusters still contain all three equivalence theorems (for `g=5`, cluster size 4 including the target). The paper's usability breakdown on the 996-theorem, granularity-5 data says 37% of clusters can feed Lemma Analogy directly, 15% share proof lemmas, 15% are used by another theorem in the cluster, about 19% are similar simplification proofs unsuitable for analogy, and 14% show no clear reusable correlation (p. 14). These percentages sum to 100%; their denominator is clusters, not theorems.

## technique: analogy mapping and three-level mutation

Use this when a failed target theorem has a similar source theorem and source auxiliary lemma. A Target Theorem is the current failed goal, a Source Theorem is a clustered analogue, and a Source Lemma is a user lemma used to prove it (Section 4, p. 11). Shared background symbols are fixed; non-shared symbols may map to symbols in the same definition cluster.

Steps (Definition 5, Figure 6, pp. 11–13): (1) form all admissible mappings, preserving shared symbols; (2) Tree Reconstruction recursively replaces source symbols by mapped symbols, adding fresh variables if the target function has more arguments and dropping excess arguments if it has fewer; (3) counter-example-test every left/right equation; (4) if none survives, Node Expansion replaces variables by type-correct terms of maximum depth two built from shared functions, and may replace definitional constants by same-type constants; (5) test all old and new equations; (6) if still empty, Tree Expansion applies shared functions to combinations of generated terms at the top level; (7) present surviving equations as target-lemma suggestions. In the Fibonacci example, this yields `(helper-fib n n1 a) = (+ (* n (fib (- n1 1))) (* a (fib n1)))`, which the counter-example checker does not falsify (p. 13).

Verus form (Inference): translate a source `proof fn` lemma by mapping function symbols and structurally matching quantified variables, then synthesize bounded-depth expressions using functions visible in the target module. Emit a candidate `proof fn` with `ensures`; run a Rust-level executable test or bounded model before invoking Verus. Verus requires explicit types, ownership-compatible arguments, and proof-trigger annotations where needed, so ACL2's untyped argument dropping does not carry over. `invariant` is a loop annotation, not a callable function; generated candidates must use valid Verus constructs from the Verus reference.

Evidence and limits: Table 4 reports analogy successes and QuickSpec comparisons. Analogy generally returns one relevant lemma immediately, while QuickSpec can produce many formulas or run out of memory (marked `OoM`) on high-arity, highly commutative examples. The method only adds structure, so it cannot discover smaller lemmas; it does not generate most extra conditional hypotheses; and it cannot invent the new `subp` concept needed by `int-x-x` (pp. 16–17). Those are assumptions on available symbols, counterexample checking, and a useful source lemma.

## technique: proof-pattern use for staged JVM verification

The appendix gives a reusable three-step verification decomposition: “Write the specification of the function, write the algorithm, and prove that the algorithm satisfies the specification”; then encode and schedule the JVM program in ACL2 and prove it implements the algorithm; finally “Prove total correctness of the Java bytecode” (Appendix B, pp. 19–20). ACL2(ml) clusters the lemma families from all three steps, including `program-correct-*` and `total-correctness-*` theorems.

Verus form (Inference): mirror this with (1) a Rust `spec fn` model and an `ensures` contract, (2) executable Rust plus a `proof fn` relating implementation state to the model, and (3) a termination argument and postcondition for the bytecode/interpreter loop. Use loop `invariant` annotations and a `decreases` clause where required. The paper's staged decomposition is a design pattern; it does not establish that a Verus interpreter or JVM is trusted.

## what is proved, measured, and trusted

The paper proves ACL2 theorems and reports clustering and synthesis behavior, not a soundness theorem for the machine-learning ranking. Its measured denominators and settings are explicit: 150-lemma JVM and 100-lemma Lists libraries in Table 2; 996 theorems across JVM, standard ACL2, and computer-algebra libraries in Tables 3–5; K-means/EM/Farthest-First and granularities 1–5; 200 repetitions per run. Counterexample filtering and final ACL2 proof checking are trusted operational components. Inference: for VL, the largest product threat is plausible but wrong lemma suggestions increasing proof-search cost or encoding an overfitted specification; the final Verus check protects only the candidate theorem's formal statement, not whether that statement captures user intent. Existing ACL2(ml) already covers structural retrieval, analogy mutation, and staged correctness decomposition, so VL should avoid redoing these as unmeasured novelty and instead test whether typed ownership-aware features improve retrieval.

## techniques for the catalog

- fixed-size term-tree features — encode theorem syntax by arity and depth into a 49-value dense vector for scalable clustering
- recurrent definition clustering — assign adaptive numeric symbol values from recursively clustered prior definitions
- analogy mapping — map non-background source symbols to same-cluster target symbols while preserving shared symbols
- three-level term mutation — try reconstruction, bounded node expansion, then top-level tree expansion with counterexample checks
- staged JVM correctness decomposition — separate algorithm specification, program-implementation correspondence, and total bytecode correctness
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
