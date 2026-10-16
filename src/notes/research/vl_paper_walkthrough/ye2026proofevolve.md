# ProofEvolve: Neuro-Symbolic Evolution for Formal Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ye2026proofevolve`, [paper](https://arxiv.org/abs/2608.26334)
## paper and result

Ye et al. present ProofEvolve, a Lean 4 proof-search system that retains verified partial proof structures instead of discarding every attempt that fails at the root theorem. The system stores each target as an AND-OR proof DAG, lets a language model propose decompositions, repairs, and schema applications, and lets Lean's kernel accept or reject every transition. The abstract states, "The symbolic Lean kernel verifies every proof transition." (Abstract, p. 1) A closed sub-DAG can therefore be reused even when its parent theorem remains open.

Within a target, a behaviorally indexed archive keeps structurally different candidates. Across targets, closed sub-DAGs become quantified theorem schemas in a persistent library. A later schema application is accepted only if Lean elaborates the instantiated proof and any residual premises become explicit child goals. The paper's conclusion describes this as a system that "represents partial proofs as AND-OR DAGs, ranks them using kernel-grounded verified closure, preserves structurally diverse candidates, and extracts closed sub-DAGs as reusable theorem schemas." (Section 6, p. 11)

The main comparison uses Claude Opus 4.8 as the base model and three Lean benchmarks. Table 1 reports mean solve rates over three independent runs: PutnamBench 71.2%, IMO-LeanProofBench 53.3%, and CombiBench 49.0%, for a cross-benchmark average of 57.8%. The table's denominator is each benchmark's target set, and the average is the mean of the three benchmark percentages, not a pooled theorem count. The appendix identifies 326 Putnam, 60 IMO, and 99 Combi targets, 485 total, for the test-time scaling manifest (Appendix C, p. 17). The controlled reuse study uses 19.8% versus 7.3% solve rates when a schema library grows versus resets, and the real Lean Workbook study uses 744 screened evaluation theorems.

## technique 1: represent partial proofs as typed AND-OR DAGs

what it is: make each tactic state a node and each accepted Lean proof constructor a typed hyperedge from child states to a parent state. An OR node may have several alternative outgoing edges; all children of one AND edge must close. A DAG is closed when some outgoing edge has all children closed. The frontier consists of open states with no outgoing accepted edge.

when to use: use this structure when a theorem has reusable intermediate lemmas, several proof strategies, or expensive branches that should survive a failed root attempt. It supports incremental proof construction and exact reuse of accepted sub-DAGs.

how to do it:

1. Fix a Lean environment and context. A state is `(Γ ⊢ g)`, and the kernel-accepted witnesses for that state are terms `p` such that the environment elaborates `p` at type `g` (Section 3, p. 4).
2. Create a root node for the theorem and add an edge only after Lean elaborates the proposed proof constructor. The edge records its child obligations and the checked realizer.
3. Mark a node closed when at least one outgoing edge has every child closed. For a closing edge, the child set is empty and closure is immediate (Equations 2–4, p. 4).
4. Assemble a closed node recursively from a chosen winning edge and the assembled proofs of its children. Acyclicity makes the recursion well founded (Equation 5, p. 4).
5. Keep the open frontier and retain closed internal nodes even when the root stays open. The paper calls a closed internal sub-DAG a typed reusable result while its root remains open (Section 3, p. 4).

Verus form. Inference: model a proof search state as a ghost DAG or as a sequence of proof obligations, with each accepted `proof fn` lemma representing an edge. Use Verus `proof fn`s, `requires`, and `ensures` for typed child-to-parent lemmas; use a `spec fn` to define closure over a finite ghost sequence. Inference: Verus does not expose Lean tactic states or hyperedges, so a VL implementation would maintain the DAG in ordinary Rust tooling and ask Verus to check each generated lemma module independently. The trusted artifact is each Verus-accepted lemma, not the agent's DAG metadata.

evidence: the paper gives formal closure equations and proves that recursive assembly yields a kernel proof term. It reports no separate number of DAG nodes for the benchmark runs; the DAG is an internal search representation.

where it fails or assumes: the DAG must remain finite and acyclic. A proposal with an unresolved hole is rejected unless the hole becomes an explicit child state. The method does not make an incorrect theorem true; it only preserves terms the kernel accepts.

## technique 2: use verified closure as a graded fitness signal

what it is: replace the root's binary solved/unsolved signal with `ρ`, a value in `[0,1]` computed from kernel-accepted subgoals. A closed node has value 1, a frontier leaf has value 0, an AND edge receives the weighted average of its children, and an OR node receives the maximum value of its outgoing edges. The paper proves `ρ(D)=1` exactly when the root is closed and that extending a DAG cannot decrease `ρ` (Equations 8–10, Section 4.2, pp. 5–6).

when to use: use it when many proof attempts make partial progress but rarely close the root within one budget. The signal lets selection prefer an attempt whose internal lemmas are mostly proved over an attempt with no checked progress.

how to do it:

1. Assign positive child weights summing to one for every non-closing edge. The experiments use uniform weights (Section 4.2, p. 5).
2. Evaluate edge and node values in reverse topological order. A non-closing edge is the weighted sum of child values; a node takes the maximum over its outgoing edges, or 0 if it has none.
3. Compute `ρ(D)` at the root and store it with the candidate in the archive. An extension preserves previous edges and closed nodes, so its score is monotone nondecreasing.
4. Schedule frontier work by counterfactual gain. For each frontier state, set its value to one and measure the resulting root score increase; select the state with the largest `ΔD(s)` (Equation 13, p. 6).

The paper's trajectory experiment shows `ρ` rising as lemmas close, while finally failed runs plateau below one. Figure 2b shows one proof DAG whose lemma nodes close at iterations 5, 7, 10, and 11 before the root closes (Section 5.3, p. 8).

Verus form. Inference: define a ghost `spec fn closure` over a finite list of obligation records and prove monotonicity when a new `proof fn` closes an obligation. Inference: the score itself is search bookkeeping and need not be part of a production Rust contract; it should never replace Verus's binary proof result. A VL agent can use the score to choose which failing lemma to repair, then rerun Verus on the selected candidate.

evidence: the mathematical equivalence `ρ=1` iff root closure is proved under the paper's finite-DAG assumptions. The experiment measures trajectories, not a universal relation between higher intermediate `ρ` and eventual success.

where it fails or assumes: weighted closure can favor a branch whose checked subgoals are easy but irrelevant to the root unless frontier scheduling and decomposition expose the dependency. It also depends on accurate child weights; the paper uses uniform weights rather than learning them.

## technique 3: preserve diversity with a behaviorally indexed archive

what it is: partition candidates by a descriptor containing binned proof depth, dominant tactic family, and schema-index region. Store at most one DAG per cell. A challenger replaces the incumbent only when it occupies a new cell or has higher `ρ`; ties retain the incumbent. Parent sampling uses a softmax over `ρ` with temperature `τ` (Equations 11–12, p. 6).

when to use: use it when a single highest-scoring strategy would crowd out structurally different proof routes. Distinct cells retain decomposition-heavy, repair-heavy, and schema-heavy candidates that may become useful on different goals.

how to do it:

1. Choose a descriptor space `B` that captures meaningful proof-strategy differences. The paper uses depth bins, dominant tactic family, and schema-index region (Section 4.2, p. 6).
2. Insert an accepted challenger into its descriptor cell if empty or if its verified closure exceeds the incumbent.
3. Sample parents from occupied cells with probability proportional to `exp(ρ(D)/τ)`. Higher closure is favored, but non-maximal cells remain selectable.
4. Apply decomposition, repair, or schema recombination to a selected frontier. Send rejected proposals and Lean errors to the repair context, but leave the trusted archive unchanged.

Verus form. Inference: maintain the archive outside the verified Rust program and tag candidates by proof depth, lemma family, and dependency region. The candidate accepted into a VL branch must still compile and verify under Verus. Inference: the descriptor and sampling policy are heuristic; a `proof fn` can certify a candidate lemma but cannot certify that archive diversity is optimal.

evidence: the ablation study on 60 IMO-LeanProofBench problems repeats each run with five seeds. The full system solves an average of 32/60, with 22/30 Basic and 10/30 Advanced. Removing decomposition gives 11/60 (9/30 Basic, 2/30 Advanced), removing recombination 14/60 (11/30, 3/30), and removing repair 9/60 (7/30, 2/30) (Section 5.4, p. 9). These are means over five random seeds, not one deterministic run.

where it fails or assumes: descriptor bins can hide useful candidates in the same cell or preserve candidates that score well but do not lead to a root proof. The paper does not compare alternative descriptor designs or temperatures.

## technique 4: extract and recombine kernel-checked theorem schemas

what it is: turn a newly closed local sub-DAG into a quantified schema with all free variables bound, all used hypotheses made explicit premises, and its closed proof term retained. At a later goal, instantiate the schema by a typed substitution. Any premise lacking a local witness becomes a new child state. Lean checks the entire instantiated hyperedge before acceptance (Sections 4.3 and 4.4, pp. 6–7).

when to use: use it across targets that share algebraic identities, induction patterns, or domain lemmas. Schema reuse is most useful when a solved subproof is structurally general but its original theorem is different.

how to do it:

1. On each DAG extension, compute the newly closed states and follow the chosen winning edges to assemble their proof terms.
2. Abstract exactly the free local constants and hypotheses, in dependency order, producing `ℓ : ∀x, A1 → ... → Am → C` with a kernel proof `πℓ : ℓ` (Equation 14, p. 6).
3. Insert `(ℓ,πℓ)` only if the abstraction and its kernel judgment succeed. Failed generalization yields no schema.
4. At a later goal `(Γ ⊢ g)`, find a substitution `σ` such that the schema conclusion is definitionally equal to `g` and every instantiated binder elaborates without metavariables.
5. Ask Lean for witnesses to local premises. Turn each missing witness into a child state, then elaborate the complete schema application as one checked realizer.
6. Keep the schema library persistent across targets. A rejected schema application leaves the trusted archive and library unchanged.

The controlled compositional-family experiment isolates this mechanism: a growing library solves 19.8% of targets versus 7.3% when reset before each target, a 2.7× ratio with other components held fixed (Section 5.6, p. 10). In the real Lean Workbook experiment, 9,968 source theorems produce 5,546 kernel-accepted proofs; after screening, the 744-theorem evaluation set sees solve rate rise from 49.5% zero-shot to 53.4% with relevant retrieval at `K=8`, while random retrieval reaches 49.6%. Relevant retrieval closes 351 theorem instances left open by zero-shot across three runs, and 322/351 (91.7%) do not reproduce any shown proof verbatim (Section 5.6, p. 10).

Verus form. Inference: package a reusable Verus lemma as a `proof fn` with explicit `requires` premises and an `ensures` conclusion. A later proof calls that lemma with a typed instantiation; if a premise is unavailable, Verus reports the missing obligation and the agent must prove it. Inference: the schema library should store source signatures and proof bodies but never be treated as trusted text; every instantiation must rerun Verus in the target context. This mirrors the paper's kernel-checked transformation while respecting Verus's proof-function model.

evidence: Lean's kernel checks schema extraction and every instantiation. The 19.8/7.3 controlled result uses synthetic compositional families; the 49.5/53.4/49.6 results use 744 screened Lean Workbook theorems, three-run means, and a one-shot proof condition with the DAG archive and other operators disabled. These denominators and disabled components matter when interpreting reuse.

where it fails or assumes: schema generalization can fail, and a definitionally matching conclusion can still leave hard premises. The retrieval experiment isolates in-context examples rather than the full typed recombination mechanism. The library is built from the prover's own proofs, so it does not show that arbitrary external proof databases transfer safely.

## technique 5: repair rejected proposals while preserving the trusted state

what it is: let the LLM see a rejected proposal, its retrieval context, and Lean's error, then propose a replacement edge at the same frontier state. The corrected edge is accepted only by the same kernel transition check. Rejected proposals, errors, and metadata are kept as search history but cannot modify the proof archive or schema library (Section 4.2, p. 5).

when to use: use it when a candidate is close to a valid proof and the kernel error identifies a missing premise, wrong type, or failed tactic. Repair is one of the three variation operators and can be paired with decomposition to expose the missing subgoal.

how to do it:

1. Select an open frontier state from an archived DAG.
2. Prompt the LLM with the failed proof edge, relevant retrieved lemmas/schemas, and the exact Lean diagnostic.
3. Require the model to return a replacement proof constructor whose holes are explicit child states.
4. Run the kernel transition. Accept only an acyclic extension with a checked realizer; otherwise retain the error and retry under the budget.
5. Recompute closure and archive-cell fitness after acceptance.

Verus form. Inference: feed Verus diagnostics to an agent that may edit only a proof body, `assert`, loop `invariant`, or new `proof fn`; protect the function's `requires` and `ensures`. Rerun Verus after every repair and reject any candidate containing an unjustified `assume`, `admit`, or new external specification. Inference: this is the nearest Verus analogue of kernel-gated repair; Verus has no Lean-style tactic state, so the repair unit is a function or lemma module.

evidence: the ablation isolates repair's contribution: with all 60 IMO problems and five seeds, full solves 32/60 while removing repair solves 9/60 (Section 5.4, p. 9). The comparison holds the base model and compute budget constant, but it does not show repair alone causes every recovered proof because operators interact.

where it fails or assumes: repair cannot recover a theorem whose specification is false, and bounded attempts can leave a valid proof undiscovered. A verifier error is feedback, not a guarantee that the model's diagnosis is correct.

## what is proved, measured, and trusted

The paper proves an invariance theorem: every accepted edge has a kernel-checked realizer, every closed node assembles to a kernel proof, and every schema-library entry has a checked proof term. Its corollary says every returned proof type-checks in the fixed Lean environment under the standard axioms (Section 4.4, pp. 6–7). The experiments measure solve rates, closure trajectories, ablations, budget scaling, and cross-target reuse. They independently reverify every reported solution and state that across more than 400 reverifications they found 0 false positives; solutions using `native_decide` are excluded because that path introduces an axiom outside the standard kernel (Section 5.1, p. 7).

The trusted boundary includes Lean's kernel, the fixed Mathlib version, standard axioms, the benchmark statements, and the theorem schemas' explicit premises. The authors state, "Every proof ProofEvolve returns therefore type-checks against the standard axioms by construction." (Section 4.4, p. 7) The LLM policy, retriever, archive ranking, and variation operators are search components; their proposals become trusted only after kernel acceptance. Inference: a Verus version would similarly trust Verus's verifier, SMT translation, Rust compiler model, and any external specifications, while treating the agent's archive and retrieval metadata as untrusted.

## contradictions, reuse, and product risk

The 57.8% headline is the unweighted mean of 71.2%, 53.3%, and 49.0%, whereas the appendix scaling manifest contains 485 targets with benchmark counts 326, 60, and 99. A pooled count would have a different denominator and is not reported. The 91.7% figure is 322 of the 351 theorem instances closed by relevant retrieval but left open by zero-shot, not 91.7% of all 744 evaluation theorems. The 19.8% versus 7.3% result is a synthetic controlled family, not the Lean Workbook benchmark.

Inference: VL should reuse kernel-gated partial-proof retention, verified-closure scoring, diverse strategy cells, typed lemma recombination, and repair from verifier diagnostics. VL should not claim that a schema library is sound merely because retrieved text looks plausible; every instantiated `proof fn` must be rechecked in its target context. VL should also preserve the paper's distinction between universal proof acceptance and search heuristics.

Inference: the threat to agent-written verified Rust is medium-to-high. ProofEvolve shows that preserving verified subproofs and composing them can materially improve proof search, so a product that throws away partial Verus lemmas wastes reusable evidence. The corresponding risk is semantic drift: a schema with overly broad premises, an unsound external specification, or a changed contract can transfer a proof pattern while proving the wrong property. Independent Verus checks and frozen contracts keep that threat bounded.

## techniques for the catalog

- kernel-gated proof DAGs — retain only Lean-checked typed edges and assemble closed AND-OR subgraphs into proof terms
- verified closure fitness — score partial proofs by weighted child closure so kernel-certified progress guides search before root completion
- behaviorally diverse archive — keep one candidate per strategy descriptor cell and sample parents by closure-weighted softmax
- typed schema extraction — generalize newly closed sub-DAGs into explicit-premise theorem schemas with checked proof terms
- residual-premise recombination — instantiate a schema only when its conclusion matches and expose missing premises as new subgoals
- verifier-guided repair — feed rejected proposals and Lean errors back to the model while leaving the trusted state unchanged
- frozen-contract Verus port — map reusable schemas to `proof fn`s and let agents edit proof bodies while preserving `requires` and `ensures`
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
