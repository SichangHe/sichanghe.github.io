# Incorporating Data Dependencies and Properties in Difference Verification with Conditions (Technical Report)
(authored by agents unless marked 🧑)
Tag: `jakobs2023incorporating`, [paper](http://arxiv.org/abs/2309.01585v1)

## purpose and result

Jakobs and Pollandt address repeated verification after software changes. Their setting is a pair of deterministic control-flow automata (CFAs): an original program P and modified program P′, with a safety property represented by an error location. The paper's central claim is that the existing syntax-based extractor's overapproximation is "rather coarse" (Introduction, p. 2), so a syntax-only change detector explores more paths than needed. Their `diffDP` detector uses data dependencies and the property to produce a smaller overapproximation of modified paths that could contain a regression bug. The abstract states: “This paper provides a second difference detector diffDP, which computes a more precise overapproximation by taking data dependencies and program properties into account when determining the overapproximation of those modified execution paths that may cause a new property violation.” (Abstract, p. 1)

Difference verification has two stages. A difference-condition extractor first computes a difference graph and converts it to an automaton condition. A conditional verifier then checks only paths not covered by that condition. A regression path is a path that reaches an error in P′ for an input that did not reach an error in P. The detector may overapproximate these paths, but it must not omit any real regression path. The authors state: “The respective difference verifier first runs a difference condition extractor.” (Introduction, p. 2) They also state the soundness obligation: “the verifier needs to explore at least all paths with regression bugs pathsrb (P, P ′ )”. (Section 3, p. 7)

The running example changes `r = -x` to `r = x` before an `if (x > 0)` and assertion `r <= 0`. The later assignment `r = -x` overwrites the changed value before the assertion. The syntax-based detector still treats changed syntactic paths as relevant; `diffDP` finds an original witness path with the same input and branching structure, so it can exclude the path. Inference: the practical lesson is that a changed statement matters only while its changed values can reach a property-relevant test or error.

## technique 1: condition-based incremental reverification

what it is

Represent each program as a CFA, detect a difference graph in which paths reaching the regression bug indicator nodes (set Δ) are the ones that may cause regression bugs, and use Algorithm 1 to turn the graph into a condition automaton. The condition accepts prefixes known not to lead to an indicator node. Conditional model checking can then skip accepted paths while preserving soundness. The paper defines a condition as “a finite set Q of states including the initial state q0 ∈ Q and a set F ⊆ Q of accepting states” plus transitions (Definition 2, Section 2, p. 4).

when to use it

Use it when a verifier can consume a conditional model-checking condition (a non-conditional verifier can be wrapped with the reducer-based approach, Section 1, p. 2, footnote 3). Inference: it pays off when the modified program is close enough to the original that most paths are unchanged. The evaluation used safety properties encoded as unreachability of `reach_error()`.

how to do it

1. Build deterministic CFAs for P and P′, with initial and error locations and one edge per assignment or assume (Section 2, pp. 3–4).
2. Define a difference graph with a start node, modified-program edges, and regression-indicator set Δ. Require every real regression path represented in the graph to have an extension to Δ (Definition 4, p. 5).
3. Run the detector described below to construct the graph (Algorithm 2, p. 8).
4. Run the condition generator's backward search over the graph. It marks prefixes that cannot reach Δ and makes them accepting (Algorithm 1, p. 6).
5. Give the modified program and condition to a conditional verifier. The verifier checks at least all paths not covered by the condition (Section 2, pp. 4–5).

Verus form (inference)

Inference: For Verus, keep executable Rust and its specifications unchanged, but maintain a dependency summary for each changed executable statement and each postcondition or assertion it can influence. A re-verification driver could select affected proof functions and call existing `proof fn` lemmas only for those paths. Verus has no paper-defined CFA condition interface, so this is an orchestration layer around `requires`, `ensures`, `assert`, `invariant`, and `proof fn`; it must conservatively retain every path that could violate an `ensures` clause. Inference: The useful analogue is a dependency-indexed proof cache, not replacing a Verus proof with an untrusted skip.

evidence and limits

The paper proves the condition construction sound through its difference-graph requirement (Theorem 1, p. 6). It does not claim that the condition is minimal. Inference: the verifier and condition generator remain trusted components of the reported result, and the safety property itself is assumed to be the right one. Inference: A Verus integration would additionally trust the dependency analysis and cache invalidation unless every omission is checked by a full proof fallback.

## technique 2: diffDP witness alignment with data dependencies

what it is

`diffDP` groups executions by a syntactic path in P′ and tries to find one original syntactic witness path in P. The witness must have a similar sequence of assume operations, be executable whenever the modified path is executable, and reach an error no later. The paper says: “for each syntactical path p′ of the modified program diffDP tries to detect a syntactic (witness) path p in the original program”. (Section 3, p. 7) It tracks `Vδ`, the variables whose values may differ because of modifications at an alignment point.

when to use it

Use it when syntactic diffs are too coarse, especially when changed assignments are overwritten before a property check. The approach assumes deterministic CFAs and operations whose read and write sets can be computed. Its implementation targets C programs and safety properties reducible to error-location reachability.

how to do it, step by step

1. Initialize `waitlist` with `(ℓ0, ℓ′0)`, the aligned initial locations; initialize node and edge sets, Δ, and empty affected-variable map `Vδ` (Algorithm 2, line 1, p. 8).
2. Pop an alignment pair and inspect every outgoing modified edge (lines 2–4).
3. For an assignment, look for an identical assignment from the original location. If found, align both successors and if the assignment reads an already affected variable, add its written variables to the affected set (propagating the dependency); otherwise remove its written variables from the set (lines 5–9, in particular lines 7–8). If no identical edge exists, treat the modified assignment as a new assignment, advance only P′, and add its written variables to the affected set (line 10; explanation, p. 10).
4. For an assume edge, first advance through original assignments until the next assume or error, adding their written variables to the affected set (lines 11–14). Check whether the assume operations match exactly or the original one is more general (and the modified assume is satisfiable), provided the original has not reached its error location (line 15; footnote 7, p. 10).
5. If matching assumes read an affected variable, stop alignment and put the modified successor in Δ (line 16); if they match and read no affected variable, align both successors and propagate the affected set (line 17); if no matching assume exists, align the modified successor with the original location reached after the assignments and keep the affected set (line 18; explanation, p. 10).
6. In `process`, record a failed witness extension as a Δ node; otherwise queue unseen alignments whose affected-variable information changed, record nodes and edges, and recursively mark a modified-only error as a regression indicator (lines 22–33, p. 8; explanation, p. 11).
7. Convert recorded nodes and Δ into the returned difference graph (lines 19–21, p. 8). If the initial alignment already fails (ℓ′0 ∈ Δ or ℓ′0 is a new error location), return a single-node graph whose only node is an indicator node (line 19).

The example ends with the changed variable `r` propagated through the first assignment and assumptions, then removed when the identical later assignment `r = -x` redefines it. The assertion assumptions can therefore be aligned without a dependency from the original change (Figure 3 and walkthrough, pp. 11–12).

Verus form (inference)

Inference: Model each changed Rust expression as a dependency source and each specification expression as a read set. A Verus proof can expose these sets in `spec fn` summaries or ghost state; executable code should remain ordinary Rust. Use `proof fn` lemmas to show that an overwrite removes an old dependency only when the new value does not read it. Use `assert` and loop `invariant` clauses to establish the dependency facts at alignment points. Inference: because Verus proofs are path-sensitive and solver-driven rather than CFA automata, the sound implementation should conservatively rerun a proof whenever the analysis cannot prove that all reads are unaffected.

evidence and limits

The authors prove: “Algorithm 2 returns a difference graph.” (Theorem 2, p. 12; the detailed proof is Appendix A, pp. 24–31.) The method does not prove that every reported path is a real regression; it intentionally overapproximates. It also uses a heuristic alignment policy: the explanation says they “always handle the modification like a new assignment” and postpone resynchronization to an assume. (Section 3, p. 10) Inference: this can make the graph larger than necessary. The validity section says the combination tasks were "artificially constructed" and the regression tasks "only focus on the particular domain of Linux device drivers" (Section 4.3, p. 19). Separately, the authors report that the reducer's residual programs can hurt verifiers (Section 4.2, p. 14), and that ESBMC with diffDP reported ten false proofs (missed bugs) that CPAchecker with diffDP detected, which they attribute to "an issue of ESBMC" (Section 4.2, p. 14).

## measured evidence

The evaluation contains 10,426 combination tasks and 3,936 regression tasks derived from revisions of 62 Linux device drivers (Section 4.1, p. 12). Runs used CPAchecker 2.1, ESBMC, and Predicate, with 4 processing units, 15 minutes CPU time, and 15 GB memory per run on Intel Xeon E3-1230 v5 machines (p. 13). Table 1 reports counts, not percentages, with category denominators shown in its header, for example `eca05+token (2,340+1,300)` and `regression (3,936+0)`. The paper reports that about 40% of verifier-task points were faster with difference verification, while about 20% were faster for the conditional verifier but lost the advantage after extraction cost (Figure 4, p. 15). `diffDP` timed out on 285 regression tasks (the paper's text also says 286 regression tasks were excluded from the condition-size plot because the extractor failed, mostly by timeout) and took up to five times longer than the syntax extractor, with median and mean increases between 8% and 40% per category (Figure 5, p. 16). Its conditions were larger for 82% of the combination tasks and 55% of the regression tasks, yet had a single accepting state for 1,676 tasks, versus 75 tasks for the syntax extractor (for which the paper says both extractors produce the same condition); only 317 tasks had equal condition size (p. 16). These numbers are for the stated task sets, verifiers, 900-second limit, and extractor comparison.

The paper's own conclusion is bounded: “our extractor computes more precise conditions, but is slower.” (Section 4.2, p. 17) It also says: “difference verification with our extractor is not always better than difference verification with the syntax-based difference condition extractor, but our extractor is more effective and efficient for several tasks.” (Section 4.2, p. 19)

## what is proved, trusted, and useful for VL

Proved: the returned graph satisfies the required extension property (Theorem 2), and a condition generated by Algorithm 1 from any difference graph covers no path with a regression bug (Theorem 1). Measured: solved-task counts, CPU time, condition sizes, and extractor time for the stated C benchmarks. Inference (trusted or assumed, not all stated by the paper): CFA construction, read/write sets, deterministic semantics, the property encoding, verifier implementations, reducer-generated residual programs, solver behavior, and the premise that the chosen safety property captures the desired behavior.

Inference: For agent-written verified Rust, this paper threatens the cost model more than the proof obligation. A VL pipeline could avoid rerunning unaffected Verus proofs after local changes, but a false dependency omission could silently preserve a stale proof cache. A conservative dependency graph with mandatory full-verification fallback is therefore the product-relevant design. Existing incremental-verification work already covers the basic idea; VL should reuse its distinction between a fast affected-set analysis and a sound proof fallback rather than redo a syntax-only prototype.

## techniques for the catalog

- difference verification with conditions: compute a sound overapproximation of regression paths, encode it as a condition, and verify only uncovered paths
- diffDP witness alignment: align modified and original paths while propagating variables changed by data dependencies
- affected-variable propagation: add written variables after changes, propagate through reads, and remove overwritten variables when safe
- conditional-verifier evaluation: compare full and incremental verification by solved counts, CPU time, condition size, and extractor overhead
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "The increase could have been expected considering that our constructor produces larger and more precise conditions."): read the whole paper text including the appendix proofs; checked every quotation word for word, all numbers (task counts, 4 units/15 min/15 GB, 40%/20%, 285 timeouts, 5x, 8-40%, 1,676, 75, 317, 82%, 55%), section, page, algorithm line and definition references, and each step of the two techniques against Algorithms 1 and 2; changed the Definition 2 page (p. 4, not 5), Algorithm 2 line ranges and the descriptions of lines 7-8, 15-18 and 19, the "62 revisions" wording (62 drivers), the ESBMC ten-bug attribution, the "precisely the paths" claim for Δ, and marked own conclusions as Inference; did not check the appendix lemma proofs step by step, the Verus-form inferences against Verus, the Table 1 and 2 cell values beyond the cited ESBMC ten false proofs, or the figures; link from the paper text (arXiv:2309.01585v1).
