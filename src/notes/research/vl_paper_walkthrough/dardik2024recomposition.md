# Recomposition: A New Technique for Efficient Compositional Verification
(authored by agents unless marked 🧑)
Tag: `dardik2024recomposition`, [paper](http://arxiv.org/abs/2408.03488v2)

The paper identifies itself as arXiv:2408.03488v2, dated 15 August 2024 (p. 1); the link uses that identifier. Page references below use the paper's printed page numbers.

## problem and central construction

The paper addresses a practical weakness of compositional model checking: the components chosen for verification can determine whether the problem is tractable. Its abstract calls component selection “an explicit, first-class concept” and introduces a framework that decomposes a system and then recomposes components into new components. The framework's core object is a recomposition map from original components (C_i) to new components (D_j); a portfolio of maps is run in parallel (Abstract, p. 1).

The abstract also states: “We therefore propose heuristics to find a small portfolio of recomposition maps, which we then run in parallel.” (Abstract, p. 1).

The running example is a TLA+ model of Two Phase Commit (TP). A monolithic TLC run proves safety for nine resource managers after generating over 10 million states in nearly ten minutes, but for ten resource managers it fails to terminate in an hour after checking over 48 million states (Section II.3, p. 2). The property is `Consistent`: no two resource managers may disagree between aborted and committed states (Section II.2, p. 2).

## technique 1: decomposition with a property-containing component

What it is: split a specification (S) into components (C_1,\ldots,C_n) while preserving (S=C_1//\cdots//C_n), and ensure that (C_1) contains every state variable occurring in safety property (P). These are properties (P1) and (P2) required of Algorithm 2 (Sections V-A and V-B, pp. 5–6). Section V-A states: “the first component, C1, contains all state variables that occur syntactically in P.” (p. 5).

Steps from the paper:

1. Start with (S) and the variables (β_P) occurring in (P) (Algorithm 2, lines 1–4, p. 6).
2. Partition state variables into (V_C) and (V_T); close (V_C) under variables that occur in the same action conjunct using `FIX(OCCURS, V)` (Section V-B.2 and Algorithm 2, p. 6).
3. Slice the current specification (T_i) into (C_{i+1}=SLICE(T_i,V_C)) and (T_{i+1}=SLICE(T_i,V_T)) (Algorithm 2, lines 5–7, p. 6).
4. Choose one remaining variable, repeat partitioning and slicing, and stop when (V_T=\varnothing) (Algorithm 2, lines 8–12, p. 6).

Specification slicing recursively removes conjuncts that mention variables outside the selected set; if all conjuncts of an expression are removed, it marks the expression `DEL` (Appendix B, pp. 13–14). The paper gives the simple example of splitting an action updating `var1` and `var2` into two components, whose parallel composition equals the original (Section V-B.3, p. 6).

Verus form: Inference: partition a Rust verified system by ghost state or module ownership, and put every variable used by a target `ensures` predicate in one designated proof component. Inference: replace `SLICE` with selecting the smallest set of contracts and lemmas that mention the target state; this is a design heuristic, not a built-in Verus command. Inference: preserve P1 as a proof that recomposed components implement the same transition relation.

Evidence: for TP, decomposition produces `RM`, `Env`, `TM1`, and `TM2` (Figure 3 and Example 3, pp. 3 and 6). Lemma 1's proof establishes P1 and that C1 contains the property variables (Section V-E, p. 7); its displayed P2 reverses the inclusion stated in Section V-B and used in its own proof. The evaluation measures the complete verification process, rather than isolating decomposition's performance (Section VII, pp. 9–10).

## technique 2: recomposition maps and parallel composition

What it is: a recomposition map is initially a total surjective function (f:\{C_1,\ldots,C_n\}\to\{d_P,d_1,\ldots,d_m\}) with (f(C_1)=d_P) (Definition 2, p. 5). Static reduction may make it partial. New components are parallel compositions (D_j=//f^{-1}(d_j)), and (D_P=//f^{-1}(d_P)). The algorithm then checks (LTS(D_1)\parallel\cdots\parallel LTS(D_m)\models PROP(D_P,P)) (Section V-A, p. 5).

The paper defines a syntactic TLA+ parallel operator `//` for specifications with distinct state variables: “We now define // in the usual way, by synchronizing common actions between specifications and interleaving all others actions [26].” (Section IV, p. 4). Theorem 1 equates the action-based behaviors of `LTS(S // T)` and `LTS(S) ∥ LTS(T)` (p. 5; proof in Appendix A, pp. 12–13).

Steps from Algorithm 1:

1. Run `DECOMPOSE(S,P)` to obtain components (line 1, p. 5).
2. Let strategy (ρ) choose (f,m) (line 2).
3. Run `STATIC-REDUCE(f,m)` to remove components unnecessary for the property (line 3).
4. Build (D_P) and each (D_j) by parallel-composing the map pre-images (lines 4–6).
5. Run compositional verification on the (D_j) components (line 7).

Verus form: Inference: define a ghost transition-system composition operator for independent modules, then prove that recomposed contracts imply the same global invariant. Inference: (D_P) corresponds to the module or proof context carrying the target invariant; (D_j) correspond to implementation clusters checked against it. Verus `ensures`, `requires`, and state-machine invariants can express the obligations, but the map search and semantic-preservation lemma must be written externally.

Evidence: Example 2 combines `Env` and `TM1` while leaving `TM2` separate, reducing TP from four specifications to three; it reduces the maximum state space by 1,027 states and model-checking time from 1 minute 32 seconds to 51 seconds (Section V-A, p. 5). These figures concern the running TP example with a hand-crafted optimal map. Figure 6 reports different timings: 1 minute 8 seconds for Recomp-Verify1 on `tla-twophase-10` (p. 10).

Compositional checking begins with a minimized error LTS for D_P and P, then composes it with each minimized `LTS(D_j)` in map order. It returns true as soon as the error state becomes unreachable, or false if the error remains reachable after all components (Algorithm 3, p. 7). Only individual components are minimized; the accumulated compositions are not. The authors explain: “We choose to only minimize components because we observed that minimizing the composition of components was generally slow.” (Section V-D, p. 7).

## technique 3: static specification reduction

What it is: remove components outside the chain of shared symbolic actions connected to the property component. Starting with (X_0=\{C_1\}), compute sets of components whose symbolic action alphabets intersect the current set; the union of (X_i) is the retained subset (Section V-C, pp. 6–7; Appendix C). Theorem 3 states (X_n=X_{n+1}), so only the first (n+1) terms are needed. Lemma 2 states that checking the retained composition preserves (S\models P) (Appendix C, p. 14).

Steps from the paper:

1. Set (X_0=\{C_1\}), where (C_1) contains property variables (Section V-C, p. 6).
2. Compute (X_{i+1}=\{C_j:\hat{\alpha}_{C_j}\cap\hat{\alpha}_{X_i}\ne\varnothing\}) and union the sets (Section V-C, p. 6).
3. Restrict the recomposition map's domain to that union and adjust its codomain and m to remain surjective (Algorithm 1, line 3, p. 5; Section V-C, p. 6).
4. Verify the reduced composition; Lemma 2 establishes equivalence for the safety property (Appendix C, p. 14).

Verus form: Inference: compute a dependency graph from which ghost variables and contracts mention the target invariant; omit modules outside its transitive closure from a proof run, while retaining a separate build check. Inference: this is safe only when omitted code cannot mutate or alias the represented state, so the dependency relation itself must be justified by contracts.

Evidence: static reduction removes the independent, unbounded `Counter` component in Example 5 (pp. 6–7). For `tla-twophase-counter-9`, Figure 6 reports 19 seconds and 145,176 states for Recomp-Verify1, 31 seconds and 145,691 states for Recomp-Verify4, and timeouts for both TLC configurations (p. 10). Section VII-C identifies it as the evaluation's one infinite-state benchmark (p. 9).

## technique 4: data-flow heuristic and strategy portfolio

What it is: build a partial order from chains of shared symbolic actions leading from the property component, extend it to a total order using state-variable occurrence counts, and try four maps: identity, bottom-heavy, top-heavy, and monolithic (Section VI, p. 8). The portfolio runs maps in parallel and returns the first result (Section VII-A, p. 9). Including the monolithic strategy ensures termination for finite-state specifications (Section VI-B, p. 8).

Steps from the paper:

1. Set (E_0=X_0), then (E_{i+1}=X_{i+1}\setminus X_i). Let (F_0=\varnothing); put (C_j,C_k) in (F_{i+1}) when (C_j\in E_i), (C_k\in E_{i+1}), and their symbolic action alphabets intersect. Take the reflexive transitive closure of the union of these relations (Section VI-A, p. 8).
2. Extend this partial order to a total order: order incomparable components by fewer syntactic appearances of their state variables in S, breaking equal counts arbitrarily (Section VI-A, p. 8).
3. After ordering, run S1 with C1 in D_P and every other component separate; S2 with C1 in D_P and all others in D1; S3 with all but the last component in D_P and the last in D1; and S4 with all components in D_P (Section VI-B and Example 8, p. 8).
4. Run the strategies concurrently and accept the first completed verification result (Section VII-A, p. 9).

Verus form: Inference: derive a dependency order from proof-obligation references and try proof partitions in parallel CI jobs, including a full monolithic proof for comparison. Inference: an external scheduler could compare solver time, failed obligations, and proof maintenance cost; the paper's finite-state completeness result does not establish termination for deductive Verus proofs.

Evidence: Recomp-Verify1 uses hand-crafted maps; Recomp-Verify4 uses the four-strategy portfolio, implementing S4 with TLC1 (Section VII-B, p. 9). The paper reports: “In terms of verification speed, Recomp-Verify1 and TLC1 both outperform each other in fourteen benchmarks, and tie in five cases.” It reports 29 completed benchmarks for Recomp-Verify1 versus 24 for TLC1. For four threads it reports 11 faster cases for Recomp-Verify4, 14 for TLC4, 8 ties, and 32 completed benchmarks versus TLC4's 24 (Section VII-C, p. 9; 33 benchmark rows in Figure 6, p. 10). All experiments ran on an Apple MacBook Pro with 32 GB RAM and an M1 processor; timeouts were 10 minutes and memory allotment 25 GB (Section VII-B, p. 9).

The reported state count is TLC's unique-state count, or for Recomp-Verify the maximum of each component's generated unique-state count and each intermediate composition's state count (Section VII-B, p. 9). It is not a total over all portfolio workers. The authors' claim that TLC always enumerates at least as many states conflicts with Figure 6: `pyv-sharded-kv-no-lost-keys-3-3-3` has 9,261 states for each Recomp-Verify configuration and 27 for each TLC configuration (pp. 9–10).

The winning strategy varies by benchmark. For S2's poor performance, the authors offer a tentative explanation: “Most likely, this is because the second component in this strategy is too large, and therefore misses opportunities for short-circuiting.” They observe that Recomp-Verify1 is faster than TLC1 whenever decomposition yields at least four components, and Recomp-Verify4 is faster than TLC4 in all but one such case (Section VII-C, p. 9). Inference: this observation supports testing more granular decomposition; it does not establish a general performance guarantee.

## techniques for the catalog

- property-aware decomposition: split a specification while keeping all property variables in one component
- recomposition map: map original components to parallel-composed verification components
- semantic parallel composition: compose components while preserving the intersection of their behaviors
- static reduction: remove components outside the transitive action-dependency closure of the property
- data-flow ordering: rank candidate components by dependency distance and variable-use counts
- strategy portfolio: run identity, top-heavy, bottom-heavy, and monolithic maps in parallel
