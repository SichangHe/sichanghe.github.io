# Recomposition: A New Technique for Efficient Compositional Verification
(authored by agents unless marked 🧑)
Tag: `dardik2024recomposition`, [paper](http://arxiv.org/abs/2408.03488v2)

## problem and central construction

The paper addresses a practical weakness of compositional model checking: the components chosen for verification can determine whether the problem is tractable. Its abstract calls component selection “an explicit, first-class concept” and introduces a framework that decomposes a system and then recomposes components into new components. The framework's core object is a recomposition map from original components (C_i) to new components (D_j); a portfolio of maps is run in parallel (Abstract, p. 1).

The abstract also states: “We therefore propose heuristics to find a small portfolio of recomposition maps, which we then run in parallel.” (Abstract, p. 1). This sentence is the direct motivation for trying several groupings rather than committing to one decomposition.

The running example is a TLA+ model of Two Phase Commit (TP). A monolithic TLC run proves safety for nine resource managers after generating over 10 million states in nearly ten minutes, but for ten resource managers it fails to terminate in an hour after checking over 48 million states (Section II.3, p. 2). The property is `Consistent`: no two resource managers may disagree between aborted and committed states (Section II.2, p. 2).

Inference: the transferable lesson for VL is to treat proof-obligation grouping as an explicit search problem. Verus proofs are deductive rather than finite-state model checks, so the exact TLA+ operators do not carry over; the same idea could group modules, lemmas, or state-machine components and try several proof decompositions.

## technique 1: decomposition with a property-containing component

What it is: split a specification (S) into components (C_1,\ldots,C_n) while preserving (S=C_1//\cdots//C_n), and ensure that (C_1) contains every state variable occurring in safety property (P). These are properties (P1) and (P2) of Algorithm 2 and are used to make recomposed verification sound (Section V-A, pp. 5–6).

Steps from the paper:

1. Start with (S) and the variables (β_P) occurring in (P) (Algorithm 2, lines 1–4, p. 6).
2. Partition state variables into (V_C) and (V_T); close (V_C) under variables that occur in the same expression using `FIX(OCCURS, V)` (Section V-B.2, pp. 6–7).
3. Slice the current specification (T_i) into (C_{i+1}=SLICE(T_i,V_C)) and (T_{i+1}=SLICE(T_i,V_T)) (Algorithm 2, lines 5–7, p. 6).
4. Choose one remaining variable, repeat partitioning and slicing, and stop when (V_T=\varnothing) (Algorithm 2, lines 8–12, p. 6).

Specification slicing recursively removes conjuncts that mention variables outside the selected set; if all conjuncts of an expression are removed, it marks the expression `DEL` (Appendix B, pp. 13–14). The paper gives the simple example of splitting an action updating `var1` and `var2` into two components, whose parallel composition equals the original (Section V-B.3, p. 7).

Verus form: Inference: partition a Rust verified system by ghost state or module ownership, and put every variable used by a target `ensures` predicate in one designated proof component. Inference: replace `SLICE` with selecting the smallest set of contracts and lemmas that mention the target state; this is a design heuristic, not a built-in Verus command. Inference: preserve P1 as a proof that recomposed components implement the same transition relation.

Evidence: for TP, decomposition produces `RM`, `Env`, `TM1`, and `TM2` (Figure 3 and Example 3, pp. 3 and 6). The paper proves P1 and P2 for Algorithm 2 (Lemma 1, Section V-E, p. 7). No performance number is attached to decomposition alone; performance depends on the later map and checker.

## technique 2: recomposition maps and parallel composition

What it is: a recomposition map is a surjective function (f:\{C_1,\ldots,C_n\}\to\{d_P,d_1,\ldots,d_m\}) with (f(C_1)=d_P) (Definition 2, p. 5). New components are parallel compositions (D_j=//f^{-1}(d_j)), and (D_P=//f^{-1}(d_P)). The algorithm then checks (LTS(D_1)\parallel\cdots\parallel LTS(D_m)\models PROP(D_P,P)) (Section V-A, pp. 5–6).

The paper defines a TLA+ parallel operator `//` and proves semantic preservation: “Theorem 1. JLTS(S //T )Kα = JLTS(S ) ∥ LTS(T )Kα.” (Section IV, p. 5). Thus recomposition changes grouping while preserving the behaviors relevant to the property.

Steps from Algorithm 1:

1. Run `DECOMPOSE(S,P)` to obtain components (line 1, p. 5).
2. Let strategy (ρ) choose (f,m) (line 2).
3. Run `STATIC-REDUCE(f,m)` to remove components unnecessary for the property (line 3).
4. Build (D_P) and each (D_j) by parallel-composing the map pre-images (lines 4–6).
5. Run compositional verification on the (D_j) components (line 7).

Verus form: Inference: define a ghost transition-system composition operator for independent modules, then prove that recomposed contracts imply the same global invariant. Inference: (D_P) corresponds to the module or proof context carrying the target invariant; (D_j) correspond to implementation clusters checked against it. Verus `ensures`, `requires`, and state-machine invariants can express the obligations, but the map search and semantic-preservation lemma must be written externally.

Evidence: Example 2 combines `Env` and `TM1` while leaving `TM2` separate, reducing TP from four specifications to three; it reduces the maximum state space by 1,027 states and model-checking time from 1 minute 32 seconds to 51 seconds (Section V-A, p. 6). The denominator is one hand-crafted TP instance.

## technique 3: static specification reduction

What it is: remove components whose actions cannot affect the property component, directly or through data flow. Starting with (X_0=\{C_1\}), repeatedly add any (C_j) whose action alphabet intersects the current set; the union of (X_i) is the necessary subset (Section V-C, p. 7; Appendix C). The paper proves that this fixed-point process converges by at most (n+1) terms (Theorem 3, Appendix C, p. 14) and that checking only the necessary composition preserves (S\models P) (Lemma 2, Appendix C, p. 14).

Steps from the paper:

1. Set (X_0=\{C_1\}), where (C_1) contains property variables (Section V-C, p. 7).
2. Compute (X_{i+1}=\{C_j:\hat{\alpha}_{C_j}\cap\hat{\alpha}_{X_i}\ne\varnothing\}) and union all (X_i) (Section V-C, p. 7).
3. Restrict the recomposition map's domain to that union and adjust its codomain to remain surjective (Algorithm 1, line 3, p. 5).
4. Verify the reduced composition; Lemma 2 establishes equivalence for the safety property (Appendix C, p. 14).

Verus form: Inference: compute a dependency graph from which ghost variables and contracts mention the target invariant; omit modules outside its transitive closure from a proof run, while retaining a separate build check. Inference: this is safe only when omitted code cannot mutate or alias the represented state, so the dependency relation itself must be justified by contracts.

Evidence: static reduction lets `tla-twophase-counter-9` verify an infinite-state benchmark where TLC times out (Section VII-C, p. 9 and Figure 6). The paper reports no denominator beyond the benchmark table and does not claim that every infinite-state model becomes decidable.

## technique 4: data-flow heuristic and strategy portfolio

What it is: rank components by how many dependency steps separate them from the property component, refine this partial order to a total order using state-variable occurrence counts, and try four maps: identity, bottom-heavy, top-heavy, and monolithic (Section VI, pp. 8–9). The portfolio runs maps in parallel and returns the first result. Including the monolithic strategy ensures termination for finite-state specifications (Section VI-B, p. 9).

Steps from the paper:

1. Build sets (E_i=X_i\setminus X_{i-1}) and relation (F_{i+1}) between components whose action alphabets intersect (Section VI-A, p. 8).
2. Order components according to this data-flow partial order; break ties by fewer syntactic state-variable appearances (Section VI-A, p. 8).
3. Run S1 identity, S2 bottom-heavy, S3 top-heavy, and S4 monolithic maps (Section VI-B, pp. 8–9).
4. Run the strategies concurrently and accept the first completed verification result (Section VII-A, p. 9).

Verus form: Inference: derive a dependency order from proof-obligation references and try proof partitions in parallel CI jobs, including a full monolithic proof as a completeness fallback. Inference: Verus itself does not provide a portfolio scheduler; external orchestration must compare solver time, failed obligations, and proof maintenance cost.

Evidence: Recomp-Verify1 and TLC1 each outperform the other on 14 benchmarks and tie on 5; Recomp-Verify1 verifies 29 benchmarks while TLC1 verifies 24 (Section VII-C, p. 9). On four threads, Recomp-Verify4 is faster on 11 benchmarks, TLC4 on 14, and they tie on 8; Recomp-Verify4 completes 32 benchmarks versus TLC4's 24 (Section VII-C, p. 9). All experiments ran on an Apple MacBook Pro with 32 GB RAM and an M1 processor; timeouts were 10 minutes and memory allotment 25 GB (Section VII-B, p. 9). These denominators and settings qualify the percentages and counts.

The winning strategy varies by benchmark; the authors note that S2 performed poorly because its second component was too large and missed short-circuiting opportunities (Section VII-C, p. 9). Recomposition benefits increase when decomposition yields at least four components: Recomp-Verify1 is faster than TLC1 in every such case, and Recomp-Verify4 in all but one case (Section VII-C, p. 9).

## what is proved, trusted, and relevant to VL

The paper proves semantic preservation of parallel composition (Theorem 1), decomposition properties (Lemma 1), static-reduction correctness (Lemma 2), and convergence of reduction (Theorem 3). It measures model-checking time and state counts on a distributed-protocol benchmark, but the prototype, TLA+ semantics, benchmark models, and hardware remain trusted inputs. Inference: a Verus adaptation would additionally trust the dependency extractor, scheduler, solver, and the contracts used to justify omitted modules.

Inference: the threat to agent-written verified Rust is moderate. Recomposition can reduce proof cost when modules have separable state and dependency structure, but it cannot repair an incorrect specification or prove properties absent from contracts. VL should not redo the TLA+ model-checking implementation; it should test whether proof partition portfolios reduce Verus solver time and repair effort on real crates, while retaining a monolithic proof as a comparison.

## techniques for the catalog

- property-aware decomposition: split a specification while keeping all property variables in one component
- recomposition map: map original components to parallel-composed verification components
- semantic parallel composition: compose components while preserving the intersection of their behaviors
- static reduction: remove components outside the transitive action-dependency closure of the property
- data-flow ordering: rank candidate components by dependency distance and variable-use counts
- strategy portfolio: run identity, top-heavy, bottom-heavy, and monolithic maps in parallel
Checked 2026-10-15 against paper dardik2024recomposition: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
