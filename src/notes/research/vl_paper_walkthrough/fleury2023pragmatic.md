# A More Pragmatic CDCL for IsaSAT and Targetting LLVM (Short Paper)
(authored by agents unless marked 🧑)
Tag: `fleury2023pragmatic`, [paper](https://doi.org/10.1007/978-3-031-38499-8_12)

## result and verification boundary
IsaSAT is an Isabelle-verified CDCL SAT solver extended with inprocessing and Isabelle/LLVM code generation. The paper’s goal is unusually strong: “Our goal is to produce a fully verified SAT solver, without any runtime checks, that both terminates and returns a correct model while using efficient data structures” (section 2, page 209). The PCDCL calculus combines terminating CDCL with formula transformations and restarts. The paper reports 166 solved SAT Competition 2022 instances for the latest version versus 40 for the original SML solver, under the stated 5,000-second and 7-GB limits (section 6, pages 216–217).

## technique 1: split active and discarded clause sets

why and when

Inprocessing strengthens or removes clauses, but removing a clause can remove literals needed to preserve models of the original formula. Use a split representation when transformations must be executable while the refinement proof still relates the transformed solver to the original CDCL calculus.

steps from the paper

1. Maintain the set of all literals of the original problem as an invariant.
2. Partition clauses into active clauses used for propagation/conflict and discarded clauses retained only for their literals.
3. Keep irredundant `N` and redundant `U` clauses, each split into active (`N_a`, `U_a`) and discarded (`N_d`, `U_d`) parts; the development actually uses three discarded sets (clauses with a literal set at level 0 or tautologies, subsumed clauses, and false clauses) to reduce case distinctions in some proofs (section 3, pages 210–211). Irredundant clauses are never demoted to redundant ones, but can be promoted.
4. When subsumption or tautology removal discards a clause, leave its literals in the retained set. For subsumption, show that a propagation from the larger clause corresponds to a conflict from the smaller clause, so the transformed behavior is allowed by original CDCL.
5. Remove the auxiliary clause sets when generating code; the paper says the additional sets are “only required for the connection to our CDCL transition system, and we entirely remove them when generating the code” (section 3, page 210).

Verus form (Inference:)

Represent the original literal set and active/discarded clauses as ghost state, with an executable active store. A Verus `invariant` can state that every active/discarded clause’s literals belong to the fixed original literal set; transition proof functions establish propagation and subsumption simulation. Use `requires` for clause well-formedness and `ensures` for preservation. This is an inference because the paper uses Isabelle transition systems, not Verus.

## technique 2: generic PCDCL inprocessing rules

The paper states: “We combine these rules to express subsumption-resolution: We first learn the clause obtained by resolution.” The calculus first permits a general learn-any-clause rule, with side conditions that the clause’s literals occur in `N + N_d`, the clause is entailed, duplicate-free, non-tautological, and learned only when `count decided M = 0` (no decision literal on the trail). A subsumption rule deactivates `D` when `C ⊆ D`. The authors combine these rules to express subsumption-resolution: learn the resolvent, then deactivate one or both antecedents. They report nine rules overall, including propagation, conflict, clause simplification, and pure-literal deletion (section 3, pages 211–212).

how to apply

1. Define the abstract state with trail `M`, initial clauses `N`, learned clauses `U`, and conflict information.
2. Add a transition rule for each legal transformation, carrying side conditions as premises.
3. Prove termination and correctness of the transition system, then refine it to deterministic functions.
4. Specialize the generic rules to concrete techniques such as forward subsumption. Sort clauses by size, test candidates against smaller clauses, and perform separate passes for binary and larger clauses because two-watched literals treat them differently (section 3, page 212).
5. Build occurrence lists, populated with binary clauses (the paper contrasts this with Kissat, which reuses watch lists), and add a new marking data structure for efficient detection of subsumption-resolution (section 3, page 212).

Verus form (Inference:)

Encode each transition as a proof function over a ghost abstract SAT state and an executable state. Contracts should state that learned clauses are entailed and that each transformation preserves satisfiability/model correspondence. A Verus loop over clauses needs invariants for sorted-prefix processing and occurrence-list soundness; the Isabelle refinement relation itself does not carry over.

## technique 3: refinement-driven code synthesis to LLVM

Start from abstract inductive transition rules, refine them to deterministic functions, and use Sepref to replace functional lists with imperative arrays (section 2, page 209). Isabelle/LLVM generates LLVM IR from a model of LLVM IR inside the theorem prover; the code generator interprets a shallow embedding of Isabelle/LLVM as equivalent to similar-looking LLVM code (section 2, page 209). Compared with SML/MLton, the authors report a simpler trusted pretty printer and fewer compiler parts to trust, since only the LLVM backend is used (sections 2 and 4, pages 209 and 212–213). Fixed-width integers require a bounded LLVM specification: the LLVM specification permits an unknown result if arrays would exceed the size allowed by the fixed bit-width, whereas the SML theorem assumes no duplicated literals and no empty clause (section 4, page 212).

A practical porting method is to use getter/setter accessors for the large tuple state instead of tuple case-splits. The case-splits had become infeasible because of a 2021 SeprefLLVM regression (pointer-equality tracking caused quadratic behaviour), and the paper says of the accessors: “This makes synthesis much faster.”. Sepref’s no-alias ownership model forced dummy values when moving state components out; LLVM did not optimize their allocation away, so the authors locally unfolded code “to make sure that we need only one free in the inner propagation loop”. Passing a pointer to the state (as Kissat does) gave code a factor of 10 slower; hand-optimizing the accessors reduced this to a factor of 2 slower, and the authors gave up after noticing that the LLVM optimizer replaced the pointer by the structure passed directly as argument (section 5.1, pages 213–214).

Verus form (Inference:)

The closest Verus pattern is a ghost refinement invariant linking an executable `Vec`/array representation to an abstract sequence and a proof function for each mutating accessor. Rust ownership naturally helps express no-alias access, but fixed-width overflow and LLVM lowering remain trusted unless separately modeled and proved.

## technique 4: measure and debug verified performance

The paper instruments the solver with printed statistics and timing measured in the C program. Its example timing output lists propagation 83.48% (581.66 s), reduce 0.12% (0.82 s), subsumption 0.06% (0.39 s), pure_lits 0.05% (0.33 s), binary_simp 0.02% (0.15 s), and GC 0.16% (1.10 s) (section 5.3, pages 215–216). The paper does not say which instance or run this is. Inference: the percentages are shares of one unspecified run’s total, not benchmark averages. The statistics made scheduling bugs visible (“we accidentally ran some techniques way too often or barely ever”). The paper also found a bug where reducing clauses (marking them removed) and garbage collection (physically removing them) were inverted, so clauses were nearly always physically deleted; this went unseen because the statistics were printed inverted too. The authors say timing output helps identify bottlenecks, outliers needing limits or rescheduling, and errors such as allocations in loops.

## evidence, trust, and limitations

IsaSAT’s SML and LLVM theorems state end-to-end refinement from the executable solver to a model-producing specification, under explicit preconditions. The LLVM theorem is technically weakened by bounded arrays and permits `unknown` on an array-size overflow, although the authors say practical guarantees are unchanged (section 4, pages 212–213). The parser and command-line interface are unverified C; printing and DRAT proof output are inserted by post-processing generated code because Isabelle/LLVM lacks output support; the post-processing is not required for IsaSAT to work, but without it no DRAT proofs are printed (section 5.2, page 214). The paper also reports that checking the Isabelle files takes nearly two hours, with the heuristic and code synthesis part amounting to 91 000 loc; after splitting the files into three parts (shared definitions, single-threaded synthesis, refinement correctness proof) to speed up testing of new heuristics, “proof checking still takes 2 h” (section 5.3, page 215).

Evaluation used every SAT Competition 2022 benchmark on an Intel Xeon E5-2620 v4 at 2.10 GHz, turbo disabled, with 7 GB memory and a 5,000-second timeout. IsaSATSML solved 40 instances, the first LLVM port 98, and the current inprocessing version 166; out-of-memory counts were 335, 23, and 19 respectively (section 6, pages 216–217). Inference: these numbers support this implementation’s engineering gains, not a universal claim that verified SAT solvers outperform unverified ones. Variable elimination remains unsupported because it changes models and requires further PCDCL extensions (section 7, page 217).

Inference: for VL, the most reusable design is to separate a small abstract transition calculus from optimized Rust and prove a refinement relation, while tracking every unverified parser, FFI, output, and bounded-resource assumption. The PCDCL clause-set trick and accessor-based state refinement are domain-specific adaptations, not ready-made Verus libraries.

## techniques for the catalog

- active/discarded clause splitting — retain original literals while allowing inprocessing to ignore transformed clauses
- generic PCDCL transitions — express learning, subsumption, simplification, and restarts through verified state rules
- refinement-driven LLVM synthesis — refine abstract rules to deterministic arrays and generate lower-level code
- accessor-based state decomposition — replace tuple case-splits with getter/setter refinement to make synthesis tractable
- timing-guided proof engineering — collect runtime statistics to find scheduling and allocation bugs in verified implementations
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Before porting the development to LLVM, we removed our only remaining source of unbounded integers: the clause indices during the garbage collection."): read the whole paper text and checked every quotation, number, section and page reference and technique step against it; tag, authors, year and the DOI link (printed in the paper header) are correct; changed the three-sets description, the clause-set removal wording, learn-rule side conditions, the SML precondition wording, the accessor/pointer experiment details, the timing-example pages and caveat, the claim that statistics exposed the reduce/GC inversion (the paper says the statistics were inverted too), the section 5.2 page range, and the "plus proof"/"parallel development" claims on the two-hour check time; did not check the cited external papers, the figure 1 curves, or the Isabelle formulas beyond what the text states.
