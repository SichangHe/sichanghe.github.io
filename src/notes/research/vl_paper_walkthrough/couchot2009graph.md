# Graph Based Reduction of Program Verification Conditions
(authored by agents unless marked 🧑)
Tag: `couchot2009graph`, [paper](http://arxiv.org/abs/0907.1357v1)
## scope and contribution

Couchot, Giorgetti and Stouls reduce first-order verification conditions (VCs) before sending them to automated theorem provers. The paper’s abstract states: “The relevance of a hypothesis is determined by the combination of a syntactic analysis and two graph traversals.” The introduction also warns: “Simply passing this large context to an automated prover induces a combinatorial explosion, preventing the prover from terminating in reasonable time.” (Introduction, p.1) The target is industrial C verification in Caduceus/Why, where a large context contains many irrelevant memory-model and language axioms.

A VC is a context of axioms and a goal whose validity establishes an annotated program property (§3, p.2). The Oslo trusted-loader case has about 1,500 lines of code, 1,500 lines of functional specification and 7,300 VCs; the observed slice has 218 code lines, 1,400 specification lines and 771 VCs (Table 1, p.2). A typical Caduceus/Why VC has more than 80 axioms (§3, p.2).

## technique: constant dependency graph

What it is: construct an undirected graph Gc by syntactic analysis of term occurrences in each hypothesis of a VC. Vertices are the constants of the goal plus fresh constants `f_i` created for each compound term `f(t1,...,tn)`; there is an edge between `f_i` and `c`, where `c` is `tj` if `tj` is a constant and the fresh constant of `tj` if `tj` is a compound term (§4.1, p.3). The introduction describes the same edges as “the conjoint presence of two constants in some ground axiom”. Constants in the conclusion seed a breadth-first traversal, and reachable constants are admitted as relevant at increasing depth (§5.1, p.5).

How to apply it:

1. Rewrite compound terms of the goal into fresh constants and collect the constants (§4.1, p.3)
2. Create an edge between each fresh constant `f_i` and the constants for the arguments of `f(t1,...,tn)` (§4.1)
3. Start `C0` with the constants of the conclusion (§5.1)
4. Breadth-first traverse to obtain `C1, C2, ...`, the constants reachable from `C0` in at most `i` steps; as a heuristic, insert nodes linked several times before nodes linked once, after which the index `i` of `Ci` is no longer a path length (§5.1, p.5)
5. Let `C∞` be the limit of the sequence augmented with the unreachable constants, for completeness (§5.1)
6. Keep a clause of a hypothesis only when the relevance criterion on its constants and predicates holds; the paper uses the strongest criterion (§5.3.1, p.5)

The running example yields `C0={mx,mv,a}`, then `C1` adds `acc` constants, `C2` adds `singleton, shift`, `C3` adds another `shift`, and `C4` adds `upd` (§5.1, p.5). Inference: for Verus, the analogous dependency graph can rank which `assert`, lemma or quantified fact to expose to Z3, but Verus facts are Rust/Verus expressions and ownership relations, not Caduceus memory constants. A Verus proof should retain only facts proven necessary after checking that omitted facts do not change validity.

## technique: predicate dependency graph and comparison handling

What it is: build a directed weighted graph over predicate symbols. A clause in conjunctive normal form contributes arcs according to literal polarity; a path indicates that one predicate may imply another. Arc weight uses clause size (`card(Cl)-1`), with two parallel arcs of weights w1 and w2 replaced by one arc of weight min(w1,w2) (§4.2, pp.3–4). Comparison predicates get a special construction: each typed comparison (`=t`, `≠t`, `≤t`, `<t`, `≥t`, `>t`) is represented by two nodes, one for the predicate and one for its negation, and the paper analyses ten axioms between distinct comparison predicates (five shown in Fig. 4, the five symmetric ones with ≤ and < not reproduced) “as if they were in the context” without adding them to the context (§4.3, p.4). The motivation is that, with equality treated like other predicates, “the process of Section 4.2 connects too many vertices with the vertex labeled =”.

Steps:

1. Convert each context axiom to CNF (§4.2)
2. Add one vertex per predicate symbol, representing negation by polarity (§4.2)
3. For each pair of distinct literals in an axiom clause, add an arc according to the three polarity cases of Table 2 (¬p,q gives p→q; p,q gives p̄→q; ¬p,¬q gives p→q̄), with weight card(Cl)-1; contrapositives are not stored as arcs but are considered during traversal (§4.2, p.3)
4. Add typed comparison predicates and the arcs obtained by applying Table 2 to the ten comparison axioms between distinct predicates; reflexivity, irreflexivity, symmetry and transitivity are not handled because only arcs between distinct nodes matter (§4.3, p.4)
5. Seed `L0` with the predicates of the conclusion (assumed to be a single clause); `Li` is the set of vertices whose minimal-weight path distance to `L0` is at most `i`, following arcs and their contrapositive counterparts; `L∞` also contains the vertices from which `L0` is not reachable (§5.2, p.5)
6. Use `Li` with `Cj` to filter hypotheses and context axioms (§5.3)

Inference: in Verus, arithmetic comparisons are already interpreted by the SMT theory, but quantified lemmas and predicate facts can still create search noise. A safe adaptation is to select lemma assertions by syntactic predicate dependencies, then run Verus and compare proofs with the full context; the graph is a performance heuristic, not a soundness premise.

## technique: strongest clause selection and context filtering

The authors test three criteria: retain a clause with any relevant symbol; retain one exceeding relevance thresholds; or require all clause constants and predicates to be relevant. Experiments select the strongest criterion because weak criteria select too many clauses and make the prover diverge (§5.3.1, p.5). The criteria are: (1) at least one relevant constant or predicate; (2) relevant fractions of constants or predicates above thresholds tv or tp; (3) all constants and predicates of the clause relevant. Conjunctive parts of a universally quantified hypothesis are split and filtered separately, but the original formula is kept when the whole splittable hypothesis is relevant (§5.3.1).

A context axiom is selected if one of the predicate relations it defines is relevant for one hypothesis; for each arc passed through while generating `Li`, the algorithm keeps all context axioms that generated that arc (§5.3.2, p.5). The related-work section says this makes the axiom classification needed by earlier selection strategies [23, 7] automatic (§7, p.7). Inference: for Verus, one could place candidate facts in separate proof blocks or modules and expose a graph-selected subset, while preserving all executable code and specifications.

## technique: incremental constant-first prover loop

The general algorithm (Fig. 5) first calls the prover on the complete VC and stops if the result is unsatisfiable or satisfiable (“in the latter case, removing axioms cannot modify the result”). On timeout, it sets `imax` and `jmax` to one plus the minimal depth reaching all reachable predicates and constants, starts at `i=0,j=0`, and repeatedly calls the prover on `selection(VC,i,j)` with the strongest criterion (3), incrementing `j` first (more constants); when `j` exceeds `jmax`, it increments `i` and resets `j` to 0. The loop ends on `unsat` or when `i` exceeds `imax`, and the procedure also ends if the formula is still not discharged within the user's time limit after incrementing `i` and `j` (§5.4, Fig. 5, p.6). The authors say that allowing predicates “has a more critical impact than allowing new constants, since constants do not appear in context axioms”, so `j` is incremented first (§5.4).

Inference, Verus form: run `verus` with a reduced set of explicitly exposed facts, then widen the set if verification fails or times out. Never delete a `requires` or `ensures` contract merely for performance; reduce only redundant proof context. A Verus `assert` or lemma call can be made conditional on the selected context, but the final proof must still verify the same specification.

Evidence: of 771 Oslo VCs, 741 are discharged without axiom selection; the approach of [5] raises this to 752; “10 more VCs are automatically proved” with the extensions, using Simplify, Alt-Ergo 0.8 and Yices 1.0.20 with a 10 second timeout (§6.2, pp.6–7). Inference: if the 10 are counted over the 752, the total is 762 of 771; the paper text does not state a total, and I did not read Figure 6, which sums up the results. Observed depth bounds do not exceed `imax = 6` and `jmax = 7`; “If edge weights are considered, then imax grows up to imax = 18 and the execution time is twice as long” (§6.2, p.7). The option that ignores arc weights, `--prune-coarse-pred-comp`, “gives better execution times on the Oslo benchmark” (§6.1, p.6). On the public Why benchmark, Alt-Ergo discharges 1260 VCs directly and 1297 with axiom selection, while selection adds 3 VCs to the 1310 discharged directly by Simplify (§6.3, p.7); the paper does not state the benchmark size in that passage. The experiments ran on an Intel T8300 at 2.4GHz with 4Gb of memory (§6.1).

Failure and assumptions: the paper says that if a reduced formula is satisfiable, “we may have omitted some axioms”, so `i` or `j` is incremented (§5.4, p.6); a reduced `unsat` is final because “Adding more axioms cannot make the problem satisfiable”. Inference: results depend on solver, timeout, arc weights and the C memory model, as the experiments vary these. The strategies are implemented in OCaml as modules in the Why tool in less than 1700 lines of code, and are optional via command line arguments (§6.1, p.6). The related-work section says the syntactic selection is “linear in the size of the input formula” (§7, p.7).

## what is proved, trusted, and relevant to VL

The backend prover proves selected VCs; the authors conclude: “We have presented a new strategy to select relevant hypotheses in formulae coming from program verification.” (Conclusion, p.7) Inference: a reduced VC that a prover shows unsatisfiable (the paper's formulation is by satisfiability) settles the original VC, because adding axioms cannot make it satisfiable; a reduced satisfiable result settles nothing, and the algorithm continues. Inference: trusted components include Caduceus/Why VC generation, the graph construction and selection code, the provers, memory axioms and annotations. I found no proof of the heuristic in a proof assistant in the paper.

Inference: threat to agent-written verified Rust is moderate and mostly operational: an overlarge Verus context can cause solver timeouts, and graph-guided fact exposure could improve stability. It cannot repair a false contract or prove omitted model assumptions. The paper supplies automatic relevance filtering and measured gains on one industrial benchmark; VL should reuse the idea as a configurable proof-context optimization rather than reimplementing Caduceus’s exact graphs.

## techniques for the catalog

- constant dependency traversal — breadth-first graph reachability from goal constants selects relevant terms
- predicate dependency traversal — weighted implication paths select predicates connected to the goal
- comparison-predicate handling — typed order/equality nodes and arcs from ten comparison axioms enrich the predicate graph without adding those axioms to the context
- strongest clause filtering — keep clauses whose constants and predicates are all relevant
- incremental constant-first selection — retry the prover with increasingly broad constant then predicate depths
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our experiments on these criteria have shown that a too weak criterion does not accomplish what it is designed for: too many clauses are selected for few iterations, making the prover quickly diverge."): I read the whole paper text (pp.1-8, references skimmed) and checked quotations, numbers (Table 1, 741/752/10, imax/jmax, 1260/1297/1310/+3, 1700 lines, 80 axioms), section and page references, and the technique steps against sections 4-5 and Fig. 5. Changed: constant-graph definition and edge construction (hypotheses, not axioms), removal of an unsupported claim that constant-graph edges record the axioms that generated them, contrapositives (traversal only, not arcs), comparison handling (ten axioms between distinct predicates; no reflexivity/symmetry/transitivity), relevance criteria and algorithm details, page numbers (5.3.1 p.5, 6.1 p.6), the 762 total (now marked Inference), and labelled my own conclusions "Inference:". Not checked: Figures 2-6 as images (including Fig. 6 bar values), reference list contents, and whether Why/Caduceus code matches the description.
