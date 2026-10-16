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
3. Keep irredundant `N` and redundant `U` clauses, each split into active (`N_a`, `U_a`) and discarded (`N_d`, `U_d`) parts; the implementation uses three sets to reduce case splits (section 3, pages 210–211).
4. When subsumption or tautology removal discards a clause, leave its literals in the retained set. For subsumption, show that a propagation from the larger clause corresponds to a conflict from the smaller clause, so the transformed behavior is allowed by original CDCL.
5. Remove the auxiliary clause-set split in a later code-generation refinement; the paper says the sets are “only required for the connection to our CDCL transition system” (section 3, page 210).

Verus form (Inference:)

Represent the original literal set and active/discarded clauses as ghost state, with an executable active store. A Verus `invariant` can state that every active/discarded clause’s literals belong to the fixed original literal set; transition proof functions establish propagation and subsumption simulation. Use `requires` for clause well-formedness and `ensures` for preservation. This is an inference because the paper uses Isabelle transition systems, not Verus.

## technique 2: generic PCDCL inprocessing rules

The paper states: “We combine these rules to express subsumption-resolution: We first learn the clause obtained by resolution.” The calculus first permits a general learn-any-clause rule, with side conditions that the learned clause is entailed, duplicate-free, non-tautological, and added only when no decision literal is present. A subsumption rule deactivates `D` when `C ⊆ D`. The authors combine these rules to express subsumption-resolution: learn the resolvent, then deactivate one or both antecedents. They report nine rules overall, including propagation, conflict, clause simplification, and pure-literal deletion (section 3, pages 211–212).

how to apply

1. Define the abstract state with trail `M`, initial clauses `N`, learned clauses `U`, and conflict information.
2. Add a transition rule for each legal transformation, carrying side conditions as premises.
3. Prove termination and correctness of the transition system, then refine it to deterministic functions.
4. Specialize the generic rules to concrete techniques such as forward subsumption. Sort clauses by size, test candidates against smaller clauses, and perform separate passes for binary and larger clauses because two-watched literals treat them differently (section 3, page 212).
5. Build occurrence lists and a marking structure to find subsuming resolutions efficiently.

Verus form (Inference:)

Encode each transition as a proof function over a ghost abstract SAT state and an executable state. Contracts should state that learned clauses are entailed and that each transformation preserves satisfiability/model correspondence. A Verus loop over clauses needs invariants for sorted-prefix processing and occurrence-list soundness; the Isabelle refinement relation itself does not carry over.

## technique 3: refinement-driven code synthesis to LLVM

Start from abstract inductive transition rules, refine them to deterministic functions, and use Sepref to replace functional lists with imperative arrays (section 2, page 209). Isabelle/LLVM generates LLVM IR from a shallow embedding inside Isabelle. Compared with SML/MLton, the authors report a simpler trusted pretty printer and less compiler trusted code. Fixed-width integers require a bounded LLVM specification: the LLVM model permits an unknown result if arrays would exceed the representable bound, whereas the SML theorem assumes proper literals and no duplicate literals (section 4, pages 212–213).

A practical porting method is to use getter/setter accessors for large tuple state instead of tuple case-splits, which made synthesis much faster. Sepref’s no-alias ownership model forced dummy values when moving state components out; in the hot propagation loop the authors unfolded code to avoid repeated allocation and freeing. A pointer-to-state experiment was twice as slow after hand optimization and was abandoned (section 5.1, pages 213–214).

Verus form (Inference:)

The closest Verus pattern is a ghost refinement invariant linking an executable `Vec`/array representation to an abstract sequence and a proof function for each mutating accessor. Rust ownership naturally helps express no-alias access, but fixed-width overflow and LLVM lowering remain trusted unless separately modeled and proved.

## technique 4: measure and debug verified performance

The paper instruments the solver with statistics and C-side timing. A reported run spent 83.48% (581.66 s) in propagation, 0.12% (0.82 s) reducing clauses, 0.06% (0.39 s) in subsumption, 0.05% (0.33 s) in pure-literal processing, and 0.16% (1.10 s) in garbage collection (section 5.3, page 215). These denominators are the reported run’s total measured time; the percentages are not benchmark averages. Statistics exposed scheduling mistakes and an inversion of reducing clauses versus physical garbage collection.

## evidence, trust, and limitations

IsaSAT’s SML and LLVM theorems state end-to-end refinement from the executable solver to a model-producing specification, under explicit preconditions. The LLVM theorem is technically weakened by bounded arrays and permits `unknown` on an array-size overflow, although the authors say practical guarantees are unchanged (section 4, pages 212–213). The parser and command-line interface are unverified C; printing and DRAT proof output are inserted by post-processing generated code because Isabelle/LLVM lacks output support (section 5.2, pages 214–215). The paper also reports nearly two hours to check the roughly 91,000 lines of heuristic and synthesis code plus proof, after splitting files for parallel development (section 5.3, page 215).

Evaluation used every SAT Competition 2022 benchmark on an Intel Xeon E5-2620 v4 at 2.10 GHz, turbo disabled, with 7 GB memory and a 5,000-second timeout. IsaSATSML solved 40 instances, the first LLVM port 98, and the current inprocessing version 166; out-of-memory counts were 335, 23, and 19 respectively (section 6, pages 216–217). Inference: these numbers support this implementation’s engineering gains, not a universal claim that verified SAT solvers outperform unverified ones. Variable elimination remains unsupported because it changes models and requires further PCDCL extensions (section 7, page 217).

Inference: for VL, the most reusable design is to separate a small abstract transition calculus from optimized Rust and prove a refinement relation, while tracking every unverified parser, FFI, output, and bounded-resource assumption. The PCDCL clause-set trick and accessor-based state refinement are domain-specific adaptations, not ready-made Verus libraries.

## techniques for the catalog

- active/discarded clause splitting — retain original literals while allowing inprocessing to ignore transformed clauses
- generic PCDCL transitions — express learning, subsumption, simplification, and restarts through verified state rules
- refinement-driven LLVM synthesis — refine abstract rules to deterministic arrays and generate lower-level code
- accessor-based state decomposition — replace tuple case-splits with getter/setter refinement to make synthesis tractable
- timing-guided proof engineering — collect runtime statistics to find scheduling and allocation bugs in verified implementations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
