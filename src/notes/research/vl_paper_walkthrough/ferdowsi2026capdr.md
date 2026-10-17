# Certificate-Aware Property-Directed Reachability
(authored by agents unless marked 🧑)
Tag: `ferdowsi2026capdr`, [paper](http://arxiv.org/abs/2605.16472v2)

## result and trust boundary

Ferdowsi and Kovács introduce CAPDR, a Property-Directed Reachability (PDR/IC3) variant that learns how to order verifier-generated choices while leaving correctness to SAT guards and an independent checker. The target is a finite-state Boolean transition system `(Init(X), Trans(X,U,X′), Prop(X))`. A SAFE certificate is an inductive invariant; an UNSAFE certificate is a finite counterexample trace. “The policy only orders verifier-generated proposals, while ordinary PDR guards and the independent checker preserve correctness” (Section I, contribution list, p. 1).

The central separation is explicit: the ranker is trained offline on a disjoint corpus, frozen, and used only to order proposals on held-out instances. Per the abstract, “it cannot bypass the SAT guards on blocker insertion and pushing; obligation scheduling remains fair, and every SAFE/UNSAFE claim requires independent checker acceptance.” CAPDR reports SAFE or UNSAFE only after the corresponding checker accepts; rejection is FAIL. The trusted computing base is only the standalone certificate checker: its parsing layer, the SAT engine used for SAFE certificates, the trace-evaluation routine used for UNSAFE certificates, and any validation routine for the auxiliary-variable extension mode (Section IV-A, pp. 3–4). Everything else, including the possibly nondeterministic verifier, the learned policy, feature extraction, training and hyperparameter tuning, is untrusted.

## technique 1: checker-defined SAFE and UNSAFE certificates

what it is

A SAFE invariant `Inv(X)` must satisfy three implications: `Init⇒Inv`, `Inv∧Trans⇒Inv′`, and `Inv⇒Prop`. In base mode these are three UNSAT checks. An UNSAFE trace `(x0,u0,…,xk)` must satisfy `Init(x0)`, every `Trans(xi,ui,xi+1)`, and `¬Prop(xk)`. “A safe certificate is a Boolean formula Inv (X) over the state variables satisfying” the three conditions (Definition 3, p. 3); “An unsafe certificate is a finite trace x0, . . . , xk with inputs u0 , . . . , uk−1” satisfying the initial, transition, and bad-state conditions (Definition 4, p. 3).

when to use it

Use this boundary whenever a heuristic, learned model, or agent proposes proof artifacts. The proposal generator can be untrusted; the checker must independently validate the final invariant or trace.

how to do it

1. Parse the fixed transition system and certificate.
2. For SAFE, query UNSAT of `Init∧¬Inv`, `Inv∧Trans∧¬Inv′`, and `Inv∧¬Prop`; equivalently check the three implications. The paper defines implication checking as unsatisfiability: “All implications are checked via unsatisfiability: A ⇒ B iff A ∧ ¬B is UNSAT.” (Definition 5, p. 4.)
3. For UNSAFE, simulate or SAT-check each trace step and the final violation.
4. Return SAFE/UNSAFE only on checker acceptance; otherwise return FAIL.
5. If auxiliary variables `Y` are used, also check a conservative relation `Def(X,Y)` satisfying initial-state and transition projection conditions (Eqs. 4–5, p. 4).

Verus form

Inference: Encode `Init`, `Trans`, and `Prop` as `spec fn` predicates. State the invariant as a `spec fn inv(x: State) -> bool`. A `proof fn check_inv()` can `requires` the transition assumptions and `ensures` the three implication properties, using `assert` and previously proved transition lemmas. A trace checker is a `proof fn` over a sequence with `requires` that each adjacent pair satisfies `Trans` and `ensures` that the final state violates `Prop`. Verus checks the proof obligations; it does not independently replay an arbitrary external certificate unless the checker is itself verified.

evidence, assumptions, limits

Theorem 1 proves that an accepted SAFE certificate implies safety; Theorem 2 proves accepted UNSAFE traces imply a reachable bad state (Section V, pp. 8–9). These claims assume SAT-query correctness and parser/evaluation correctness (Assumptions A1–A2, p. 7). They are checker-relative: a malformed or incorrectly encoded checker remains trusted.

## technique 2: guarded PDR and four learned choice points

PDR maintains frames `F0,…,Fk+1` with `F0=Init`, monotonicity `Fi⇒Fi+1`, `Fi⇒Prop`, and closed-level consecution `Fi∧Trans⇒Fi+1′` (Eqs. 6–9, p. 4). It searches for counterexamples to induction (CTIs), creates obligations `(i,d)` for complete state cubes, blocks them with clauses, pushes clauses forward, and declares a fixed point `Fk=Fk+1` as a SAFE candidate. If blocking reaches frame zero, predecessor links yield an UNSAFE trace (Section III-C, p. 3).

CAPDR leaves this control and inserts learning only at four points:

1. CP1 blocker generalization. After `UNSAT(Init∧d)` and `UNSAT(Fi−1∧Trans∧d′)`, generate clauses `C=¬d⋆` for subcubes `d⋆⊆d`, always retaining exact fallback `C0=¬d`. Try candidates in ranker order, but insert only when `d⇒¬C`, `Init⇒C`, and `Fi−1∧Trans⇒C′` are all satisfied (Eqs. 12–14, pp. 5–6). Proposition 1 proves the fallback is admissible.
2. CP2 obligation ordering. Rank ready obligations `(i,d)` using frame index, recency, requeue count, predecessor depth, and SAT history. Enforce bounded starvation so every pending obligation is eventually served (Section IV-D, p. 6).
3. CP3 pushing. Rank eligible clause pushes; add `C` to `Fi+1` only after `UNSAT(Fi∧Trans∧¬C′)` (Eq. 15, p. 6).
4. CP4 optional extensions. Rank strengthening proposals only when their auxiliary semantics and checker validation are conservative; CP4 was disabled in the base-mode experiments (Section IV-D, p. 6).

The operational summary (Section IV-G, p. 7; Algorithm 1, p. 8) is: find a frontier CTI; check initial reachability; if needed find a predecessor; rank and guard-check blockers; schedule obligations fairly; rank and guard-check pushes; stop at a fixed point; run the independent checker.

Verus form

Inference: Model each frame as a ghost predicate over `State`, and each blocker/push as a proof lemma with `requires` matching the SAT guard and `ensures` preserving frame invariants. Use a `proof fn` for each accepted transition and `decreases` for a bounded obligation measure if proving termination of the search. The learned ranker can remain ordinary untrusted Rust because every state-changing action is rechecked by verified lemmas or a separately verified checker. Verus itself does not provide SAT or PDR; these are an external algorithm and trust boundary.

## technique 3: certificate-aware objective and frozen ranking

CAPDR evaluates each run by `(t, size(π), tchk)`: solving time, certificate size, and independent checker time. For a CNF invariant, `size(π)=lit(Inv)`; for an UNSAFE trace, it is `(k+1)|X|+k|U|` bits (Definition 7, p. 6). When a scalar is needed, use `J=αt+βsize(π)+γtchk`; experiments fix `(α,β,γ)=(1,10−3,1)` (Eq. 16 and Section VI-A4, pp. 6, 10).

Training is within-event pairwise preference learning. At a saved proof state, compare two candidates under the same continuation policy, seed, resource budget, and tie-breaking; label `a+` preferred when its continuation cost `Jbe(a+)` is lower. Fit a linear scorer with regularized logistic loss, then freeze parameters. Deployment computes local features, scores finite verifier-generated candidate sets, and uses deterministic tie-breaking. It does not evaluate the objective, roll out candidates, update parameters, or call the checker per candidate (Section IV-F, pp. 6–7).

Replay logs record versions, configurations, seeds, SAT-derived control artifacts, actions, guard outcomes, and context hashes. Replay reuses or checks these objects and measures invariant Jaccard distance; exact replay has distance zero (Section IV-F, p. 7).

Inference: For Verus proof search, the same interface can rank candidate lemma applications or invariant-strengthening attempts while leaving proof checking to Verus. Log candidate order, solver versions, seeds, and accepted obligations so a run can be replayed. Ranking must never be treated as evidence of correctness.

evidence and denominators

The held-out evaluation corpus is the full 319-instance HWMCC’24 bit-level safety archive; development uses a deduplicated HWMCC’20 subset, with all HWMCC’24 benchmark names and canonical AIGER hashes removed, whose SAFE subset has 190 instances (Section VI-A1, pp. 9–10). On the 319 held-out instances, baseline PDR solved 287 and left 32 unsolved; CAPDR solved 293 and left 26. Medians are over each configuration’s checker-accepted solved set, not all 319 instances: PDR `t=109.7s`, `size=19,365`, `tchk=1.24s`, `J=151.1`; CAPDR `115.2s`, `14,596`, `0.63s`, `142.4`; CAPDR+INV-MIN `117.5s`, `12,785`, `0.55s`, `140.5` (Table I, p. 11). The reported 24.6% size and 49% checker-time reductions are `(19,365−14,596)/19,365` and `(1.24−0.63)/1.24`, respectively, using different solved sets, so they are workflow medians rather than paired per-instance percentages.

For the shared post-hoc minimizer on the 180 common SAFE inputs, medians use the 178 inputs completed by both: PDR+[7] completed 178/180 with raw 19,842 literals, 14,026 MSIS literals, and 0.78s checking; CAPDR+[7] completed 180/180 with raw 14,731, 11,741 MSIS literals, and 0.48s checking (Table II, p. 11). Relative to those paired medians, CAPDR+[7] has 16.3% fewer literals and 38.5% lower checker time, as reported by the paper.

On the 190-instance development SAFE set, baseline certified 176/190; CP1-only certified 175/190 with median 11,314 literals and 2.21s checker time versus baseline 16,154 and 3.51s; full CP1–CP3 certified 179/190 with 9,620 literals and 1.61s; replay has median Jaccard distance 0.00 (Table III, p. 11). These rows have configuration-specific solved sets, so medians are not paired except where stated. The paper also reports a separate 200-instance coverage sanity check: CAPDR solved 189 under a 7200-second per-instance timeout, compared with cited 181/182 results for other tools; the cited figures are LeGend’s reports for IC3ref (181) and ABC (182), and the paper calls the run “a coverage-only sanity check, not a controlled tool comparison” (Section VI-B4, p. 12).

## what is proved and trusted

Theorem 3 states checker-relative CAPDR soundness: under A1–A2, accepted SAFE means the original system satisfies `Prop`, and accepted UNSAFE means it violates `Prop` (Section V-C, p. 9). The ranker, feature extraction, training, and nondeterministic verifier search (including its SAT guards, fairness rule and exact fallback) remain outside the trusted base, which is only the standalone checker. The guards and fallback keep the search well-formed and let it make progress (Proposition 1), but correctness of a reported result rests on checker acceptance. The method has no claim that learning transfers well: transfer is empirical and a poor policy may waste search while preserving soundness.

Inference: The threat to agent-written verified Rust is low at the final-certificate boundary if the checker or Verus proof is independently kernel-checked; it is moderate in workflow quality because a bad ranker can increase proof size, checker cost, or timeout. A larger threat remains checker/model mismatch: accepted evidence proves only the encoded `Init`, `Trans`, and `Prop`.

Existing PDR/IC3, independent certificate checking, and invariant minimization are prerequisites CAPDR reuses. The paper explicitly says it is “neither a new certificate format nor a new checker.” (Section I, p. 1). 

Inference: VL should reuse checker-first trust separation and log replay, rather than build a learned component into the proof kernel.

## techniques for the catalog

- checker-accepted certificates — report SAFE or UNSAFE only after independent invariant or trace acceptance
- guarded PDR blocker learning — rank finite blocker proposals while requiring target, initiation, and relative-inductiveness SAT guards
- fair obligation and push ordering — learn search order for obligations and pushes without bypassing fairness or push checks
- certificate-aware objective — optimize solving time, artifact size, and checker time with explicit denominators and solved-set scope
- frozen ranker and replay logs — train on a disjoint corpus, freeze deployment, and record choices for deterministic re-execution
- post-hoc invariant minimization — apply a shared checker-preserving clause/literal deletion pass to compare raw search artifacts fairly
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The verifier generates proposals, the policy orders them, and the appropriate guarded or fair control decides what is committed."): read the whole paper text (Sections I–VII and Appendices A–D) and compared every quotation, number (Tables I–III, 319 held-out and 190 development instances, 24.6%, 49%, 16.3%, 38.5%, weights (1, 10^-3, 1)), equation and theorem reference, page number and technique step against it; changed the attribution of the first quotation (it is in Section I, not the abstract), the trusted-base description (the paper says only the standalone checker is trusted; guards, fairness and fallback are untrusted search control), the page of Assumptions A1–A2 (p. 7, not p. 8), the page range of the corpus description (pp. 9–10), the wording of the LeGend coverage check, a heading using a banned word, and marked one unmarked conclusion as Inference; did not check the Verus encodings (marked Inference, not from the paper), the cited external papers, the artifact repository, or the numbers behind Fig. 2 beyond the text, and the link is the arXiv link from the fetch record (arXiv:2605.16472v2 appears in the paper text).
