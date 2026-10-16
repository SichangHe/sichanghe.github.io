# Exponential Sample Complexity Separation between Flat and Hierarchical Agentic Theorem Provers
(authored by agents unless marked 🧑)
Tag: `sonoda2026exponential`, [paper](https://arxiv.org/abs/2602.10512)


## what the paper proves

Sonoda, Akiyama, and Uezato model verifier-guided theorem proving as offline imitation learning in a deterministic finite-horizon Markov decision process. A flat student predicts tactic actions from fully inlined proof traces. A hierarchical student predicts a reusable proof DAG, high-level graph actions, and local tactics; solved blocks are memoized. Their result is a statistical guarantee: when flattening duplicates a shared subproof exponentially many times, the sufficient sample count certified by their bounds can be exponentially larger for the flat learner. This is a theorem about explicit upper-bound certificates under assumptions, not an empirical benchmark result and not a minimax lower bound.

The paper defines statistical provability as average probability of reaching a verified state within a finite budget: `SP_T(π) = E_{s0~q0}[V_T^π(s0)]` (Section 1, p. 2). It separates three error sources: teacher top-k mass omitted by the search shortlist, one-step imitation error, and, for hierarchy, graph coverage error. The abstract summarizes the mechanism: “A hierarchical student instead predicts a reusable proof DAG and solves each shared block once” (Abstract, p. 1).

## technique 1: verifier MDP and top-k success bound

what it is: represent proof search as a deterministic MDP `M_K=(S,A_lo,F_lo,G,ι)`. States are open proof goals and contexts; actions are tactics, inference-rule applications, or lemma calls; the verifier transition either accepts an action or rejects it; solved states are `G`. A policy ranks a finite candidate set at every state, and a fixed search wrapper explores the top-k candidates.

when to use it: use this abstraction when measuring a learned prover's finite-budget success rather than only whether a proof exists. It exposes where training error enters the probability of finding a verified proof.

how to do it:

1. define the formal language, proof states, ordinary tactic alphabet, verifier transition, solved-state set, and initial-state map (Section 2, pp. 2–3)
2. condition the teacher distribution on successful traces and define the decision-state mixture
3. compute teacher top-k loss `η_k(s)` and average imitation KL error `e(π)` (Section 3, p. 4)
4. assume search completeness: if every teacher action appears in the student's top-k lists, the wrapper recovers a proof (Assumption 2, p. 4)
5. apply the flat guarantee `E[V_T^π] ≥ 1 − (Lη + c e^p)` from Theorem 1 (Section 4, p. 5)

The source states: “A learned prover is a Markov policy” (Section 2, p. 3). This is a modeling choice; it does not claim current LLM agents are literally Markov policies.

evidence: Theorem 1 is an analytical bound, with `L` the average successful-trace length, `η` intrinsic shortlist loss, and `e` one-step KL error. Theorem 2 supplies a geometric ERM learning rate under a compact state space, finite action alphabet, probability floor, Lipschitz policies, and a Tsybakov-style margin (Sections 3–4, pp. 4–5).

limits and Verus form: the bound assumes deterministic verifier transitions, a complete search wrapper, bounded horizon, and success-conditioned teacher data. It does not measure Lean or Verus tasks. Inference: a Verus implementation would treat a proof state and candidate tactic as Rust/spec datatypes, have an executable search wrapper call Verus, and use `proof fn` lemmas only for the ranking-bound mathematics; Verus itself would remain the checker of generated Rust contracts. The statistical assumptions, LLM policy, and data distribution remain external to Verus.

## technique 2: hierarchical proof DAG with memoized block solving

what it is: add a high-level layer over ordinary tactic search. A proof DAG `M=(V,E,r,λ)` has block interfaces and dependency edges. High-level actions select or expand unresolved blocks, schedule them, reuse a solved compatible block, or close a block with a local certificate. The unfolding map converts the DAG and local proofs back into an ordinary verifier trace, preserving soundness.

when to use it: use when proofs repeatedly invoke the same intermediate argument. A DAG stores that argument once; a flat tree repeats its local decisions at each call site.

how to do it:

1. define block interfaces as finite sets of proof obligations and map each interface to an ordinary proof state (Appendix H, pp. 28–29)
2. maintain partial graph, unresolved blocks, solved blocks, and attached local certificates in the high-level state (Definition 5, Appendix H, p. 29)
3. select or expand an unresolved block and add child interfaces; order available blocks according to dependencies (Appendix H, p. 29)
4. solve terminal blocks with low-level tactics; store the certificate in a memo table
5. reuse a solved block when its interface is compatible; close the parent block and continue until the root is certified
6. unfold the DAG to ordinary low-level actions and submit the result to the verifier (Section 2, p. 3)

The paper says: “shared descendants are memoized subproofs” (Section 2, p. 3). In Lean, its concrete analogy is a named `have` fact reused at several goals (Appendix G, pp. 26–28).

evidence: Theorem 3 bounds hierarchical failure by graph coverage plus separate high-level and low-level errors: `1−SP ≥ Δ_graph + L_hi(η_hi+c_hi e_hi^p_hi)+L_lo(η_lo+c_lo e_lo^p_lo)` (Section 5, p. 7). The decomposition can help by reducing decision counts or making local distributions easier; the paper does not claim it always helps.

limits and Verus form: Assumption 5 requires reusable DAG structure to occur often enough and does not require unique recovery from syntax (Section 5, p. 7). Graph prediction is latent-label learning: training infers a posterior over DAGs from an inlined trace, so posterior mismatch remains in Theorem 4. Inference: Verus could encode each block interface as a spec datatype and expose a `proof fn` certificate for each block; a parent proof can call that lemma repeatedly. Rust execution cannot call a proof function at runtime, so the memo table is an agent/search artifact and the final executable contains only erased proof code.

## technique 3: latent-graph posterior training

what it is: train the hierarchical student even when proof DAG labels are absent. An inference posterior `ν_φ(M | s0,y_flat)` assigns soft DAG labels consistent with a completed inlined trace. The graph predictor is trained on those labels; high-level and low-level policies use posterior-weighted log-loss. An EM-style loop alternates posterior estimation or fixing with policy updates (Section 5, p. 6).

how to do it:

1. collect successful inlined traces without graph annotations (Section 5, p. 6)
2. infer a posterior over compatible DAGs from the initial state and full trace
3. train `μ_θ` on posterior-weighted graph labels
4. train `π_hi` and `π_lo` on posterior-weighted high-level and local decisions
5. at test time, predict a graph using only the initial state; run high-level search, local verification, and memoized reuse
6. account for graph and occurrence-weighted posterior mismatch in the learning bound (Theorem 4, p. 7)

evidence: Theorem 4 gives policy error `inf e(π)+O(r_τ,N)` where `r` includes a geometric learning term, confidence term, and posterior mismatch; Theorem 5 gives graph coverage from a graph log-loss bound plus irreducible coverage floor `ζ_M` (Section 5, pp. 7–8). The paper's theorem does not provide a task-count denominator or an implementation benchmark.

limits: completed traces are available to the training posterior but not at test time. A poor posterior can bias all three learners. Graph labels remove posterior mismatch only in Corollary 1. Inference: for VL, a similar posterior could infer reusable Verus lemmas from proof traces, but the resulting lemma boundaries must be checked against the actual Verus specification; inferred structure is a search hint, not a proof.

## technique 4: flat versus hierarchical sufficient-sample comparison

what it is: compare both students on the same hierarchical teacher data. The flat learner discards the latent DAG and trains on occurrence-level tactics; the hierarchical learner infers DAGs and trains graph and local policies. Theorem 6 solves the two success bounds for the number of independent successful theorem traces needed to reach failure `δ`.

how to do it:

1. unfold every shared DAG call into a fresh low-level copy for the flat trace (Section 6, p. 8)
2. count flat decisions `L_flat` and hierarchical decisions `L_hi+L_lo`
3. assume power-law learning errors `e_τ ≤ a_τ N^{-γ_τ}` and keep intrinsic losses below `δ/2`
4. solve the bounds for certified sample thresholds; in the common-exponent case, the ratio scales as `(L_flat/L_hier)^{1/(pγ)}` (Theorem 6, p. 9)
5. instantiate an exponentially repeated proof family to obtain an exponential ratio

The paper's proof-theoretic example defines `B^(d+1)=B^d∧B^d`; a cut-aware proof derives `B` once, while cut-free inlining repeats it at `2^d` leaves (Appendix G, pp. 26–28). The Lean shape is a local `have Y : B := ...` reused in a conjunction versus repeating the function chain at each leaf (Appendix G, pp. 27–28).

evidence and denominator discipline: Theorem 6 compares sufficient thresholds certified by one-sided upper bounds; it explicitly says these are “not claims about the unknown minimal sample complexities” (Section 6, p. 9). A matching-order lower-bound interpretation requires the Appendix F no-rescue assumptions: local failures must cause proof failure, alternate proof paths must not rescue them, and canonicalization must not remove duplication (Appendix F, p. 25). No experimental theorem-proving success percentage is reported.

limits and Verus form: the separation disappears for a flat learner with perfect canonicalization, or if search often finds alternate proofs. Inference: the Verus analogue is a benchmark family with shared lemmas versus inlined repeated assertions, measuring proof-agent samples and repair cost while Verus checks every candidate. The paper's MDP and learning bounds are not Verus constructs; only the reusable-lemma architecture maps directly to `proof fn` and `ensures` contracts.

## what remains trusted and VL implications

The verifier transition and proof checker are assumed correct; teacher traces, candidate generators, posterior inference, policy learning, search completeness, and the graph coverage assumption are outside the logical proof. Inference: for agent-written verified Rust, the paper suggests organizing generated proofs around reusable, independently checked lemmas and preserving their interfaces across tasks. This is a moderate threat reduction for repeated obligations, but it does not address wrong specifications, missing invariants, Rust ownership, unsafe code, or environmental assumptions. VL should not redo the paper's abstract claim that sharing can reduce sample requirements; it should test whether Verus proof traces exhibit the required repeated substructures and whether graph inference improves real repair throughput.

## techniques for the catalog

- verifier-MDP modeling — represent proof search states, verifier transitions, finite candidate lists, and success probability explicitly
- top-k imitation bounds — separate intrinsic shortlist loss and learned action-distribution error in finite-budget guarantees
- memoized proof DAGs — solve reusable proof blocks once and reuse compatible certificates
- latent-graph posterior training — infer soft DAG labels from inlined traces and train graph and local policies jointly
- sharing-aware sample comparison — compare flat inlining and hierarchical representations under explicit duplication and no-rescue assumptions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
