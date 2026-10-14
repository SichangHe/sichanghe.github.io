# Graph Based Reduction of Program Verification Conditions
(authored by agents unless marked 🧑)
Tag: `couchot2009graph`, [paper](http://arxiv.org/abs/0907.1357v1)
## scope and contribution

Couchot, Giorgetti and Stouls reduce first-order verification conditions (VCs) before sending them to automated theorem provers. The paper’s abstract states: “The relevance of a hypothesis is determined by the combination of a syntactic analysis and two graph traversals.” The introduction also warns: “Simply passing this large context to an automated prover induces a combinatorial explosion, preventing the prover from terminating in reasonable time.” (Introduction, p.1) The target is industrial C verification in Caduceus/Why, where a large context contains many irrelevant memory-model and language axioms.

A VC is a context of axioms and a goal whose validity establishes an annotated program property (§3, p.2). The Oslo trusted-loader case has about 1,500 lines of code, 1,500 lines of functional specification and 7,300 VCs; the observed slice has 218 code lines, 1,400 specification lines and 771 VCs (Table 1, p.2). A typical Caduceus/Why VC has more than 80 axioms (§3, p.2).

## technique: constant dependency graph

What it is: construct an undirected graph whose nodes are constants (including fresh constants for compound terms) and whose edges record joint occurrence in a ground axiom. Constants in the conclusion seed a breadth-first traversal; reachable constants are increasingly admitted as relevant (§4.1, pp.3–4).

How to apply it:

1. Rewrite compound terms into fresh constants as needed and collect constants from the goal (§4.1)
2. Create an edge when two constants occur together in an axiom; preserve which axioms generated each edge (§4.1)
3. Start `C0` with goal constants
4. Breadth-first traverse to obtain `C1, C2, ...`; optionally prioritize nodes linked several times (§5.1, p.5)
5. Let `C∞` include all reachable and unreachable constants for completeness (§5.1)
6. Keep a hypothesis only when its constants meet the chosen relevance criterion (§5.3.1)

The running example yields `C0={mx,mv,a}`, then `C1` adds `acc` constants, `C2` adds `singleton, shift`, `C3` adds another `shift`, and `C4` adds `upd` (§5.1, p.5). Inference: for Verus, the analogous dependency graph can rank which `assert`, lemma or quantified fact to expose to Z3, but Verus facts are Rust/Verus expressions and ownership relations, not Caduceus memory constants. A Verus proof should retain only facts proven necessary after checking that omitted facts do not change validity.

## technique: predicate dependency graph and comparison closure

What it is: build a directed weighted graph over predicate symbols. A clause in conjunctive normal form contributes arcs according to literal polarity; a path indicates that one predicate may imply another. Arc weight uses clause size (`card(Cl)-1`), with parallel arcs combined by minimum weight (§4.2, pp.4–5). Equalities and inequalities receive special typed nodes (`=int`, `≤int`, `>int`, etc.) and edges derived from order axioms without adding those axioms to the SMT context (§4.3, pp.4–5).

Steps:

1. Convert each context axiom to CNF (§4.2)
2. Add one vertex per predicate symbol, representing negation by polarity (§4.2)
3. Add weighted arcs for each pair of literals according to Table 2; add contrapositives (§4.2)
4. Add typed comparison predicates and relation edges for reflexivity, symmetry, transitivity and order implications, without inserting comparison axioms (§4.3)
5. Seed `L0` with predicates in the conclusion; traverse backward/forward paths to create `L1, L2, ...` by minimum distance/weight (§5.2)
6. Use `L_i` with `C_j` to filter hypotheses and context axioms (§5.3)

In Verus (Inference), arithmetic comparisons are already interpreted by the SMT theory, but quantified lemmas and predicate facts can still create search noise. A safe adaptation is to select lemma assertions by syntactic predicate dependencies, then run Verus and compare proofs with the full context; the graph is a performance heuristic, not a soundness premise.

## technique: strongest clause selection and context filtering

The authors test three criteria: retain a clause with any relevant symbol; retain one exceeding relevance thresholds; or require all clause constants and predicates to be relevant. Experiments select the strongest criterion because weak criteria select too many clauses and make the prover diverge (§5.3.1, p.6). Conjunctive hypotheses may be split, but the original formula is preserved when the whole hypothesis is relevant (§5.3.1).

Context axioms are retained when they define a relevant predicate relation; the implementation records the axioms that generated traversed graph edges (§5.3.2, p.6). This is an automatic alternative to manually classifying axioms. For Verus, one could place candidate facts in separate proof blocks or modules and expose a graph-selected subset, while preserving all executable code and specifications.

## technique: incremental constant-first prover loop

The general algorithm first calls the prover on the complete VC. If it returns satisfiable or unsatisfiable, it stops. On timeout, it initializes maximum predicate and constant depths, starts at `i=0,j=0`, and repeatedly calls the prover on `selection(VC,i,j)`, incrementing `j` first (more constants) and then `i` (more predicates); it terminates after all depths or a timeout (§5.4, Fig. 5, pp.6–7). The authors explain that increasing constants is less critical because constants do not appear in context axioms, so predicate depth is deferred (§5.4).

Verus form (Inference): run `verus` with a reduced set of explicitly exposed facts, then widen the set if verification fails or times out. Never delete a `requires` or `ensures` contract merely for performance; reduce only redundant proof context. A Verus `assert` or lemma call can be made conditional on the selected context, but the final proof must still verify the same specification.

Evidence: 741 of 771 Oslo VCs discharge directly; earlier graph selection raises this to 752; the present extensions prove 10 more with Simplify, Alt-Ergo 0.8 and Yices 1.0.20 at 10 seconds (§6.2, p.7). Thus the final selected result is 762/771, leaving 9 unresolved (the paper’s text gives these counts; 741+10 after the prior 752 is 762). Observed depth bounds are `imax≤6`, `jmax≤7`; weighted edges raise `imax` to 18 and double execution time (§6.2). On the public Why benchmark, Alt-Ergo discharges 1,260 directly and 1,297 with selection; Simplify directly discharges 1,310 and selection adds 3 (§6.3, p.7). These denominators are benchmark VC counts, not programs.

Failure and assumptions: selection is syntactic and can omit needed axioms until a larger depth; a satisfiable result after omission is not trusted as a proof of the original VC, so the algorithm only stops immediately on the initial full-context result. Results depend on solver, timeout, graph weights and the C memory model. The approach is implemented in under 1,700 lines of OCaml as optional Why modules (§6.1, p.7).

## what is proved, trusted, and relevant to VL

The backend prover proves selected VCs; the authors conclude: “We have presented a new strategy to select relevant hypotheses in formulae coming from program verification.” (Conclusion, p.7) Soundness for the original VC relies on the selection algorithm’s implication preservation and on not treating reduced satisfiability as full satisfiability. Trusted components include Caduceus/Why VC generation, graph construction, the prover, memory axioms and annotations. The paper reports no proof of the heuristic itself in a proof assistant.

Inference: threat to agent-written verified Rust is moderate and mostly operational: an overlarge Verus context can cause solver timeouts, and graph-guided fact exposure could improve stability. It cannot repair a false contract or prove omitted model assumptions. Existing work already supplies automatic relevance filtering and measured industrial gains; VL should reuse the idea as a configurable proof-context optimization rather than reimplementing Caduceus’s exact graphs.

## techniques for the catalog

- constant dependency traversal — breadth-first graph reachability from goal constants selects relevant terms
- predicate dependency traversal — weighted implication paths select predicates connected to the goal
- comparison-predicate handling — typed order/equality nodes add relation edges without bloating the SMT context
- strongest clause filtering — keep clauses whose constants and predicates are all relevant
- incremental constant-first selection — retry the prover with increasingly broad constant then predicate depths
Checked 2026-10-13: audit record couchot2009graph; paper-study comparison complete; gate executed; experiments not rerun
