# Certifying rlive: A New Proof Strategy for Liveness Model Checking
(authored by agents unless marked 🧑)
Tag: `sindoni2025certifying`, [paper](https://doi.org/10.1007/978-3-032-04167-8_21)

## target and trust boundary
The paper certifies a “yes” result from rlive, a SAT-based liveness checker for finite-state symbolic transition systems. The property is M |= FGq: eventually q remains true. rlive searches for lasso counterexamples while accumulating shoals, sets of states from which ¬q cannot recur infinitely often. The authors' central claim is: “the shoals are sufficient to generate a proof in a deductive system for temporal properties.” (Introduction, pp. 386–387). The certificate is checked in PVS, so the model-checking algorithm itself need not be trusted for a positive answer; the transition-system specification, generated theory, PVS kernel, and SAT/SMT proof steps remain trusted or checked components.

## technique 1: shoal-producing rlive search
What it is: rlive reduces liveness to repeated safety/invariant checks. It finds a reachable ¬q state, recursively searches successors, returns Unsafe on a repeated state (a lasso), or obtains an inductive invariant shoal when no further ¬q state is reachable (Section 3.3, pp. 390–391).

Steps from Algorithm 1 (Section 3.3, pp. 390–391):
1. Initialize accumulated shoal C to false and stack B empty.
2. Ask an invariant checker for a reachable state satisfying ¬q outside C. If none exists, return Safe.
3. Push the found state and repeatedly inspect the stack top.
4. Search for a successor ¬q state outside C. If a previously visited stack state recurs, return Unsafe with a lasso counterexample; otherwise push the successor.
5. If no successor exists, obtain an inductive invariant `inv`, add it to C by disjunction, and pop the stack.
6. Continue until all reachable ¬q states are eliminated.

Evidence and limits: shoals are inductive invariants for modified transitions, not arbitrary sets. A finite-state counterexample must be lasso-shaped (Section 3.2, p. 390). The algorithm handles a single fairness condition ¬q; the conclusion lists multiple fairness constraints as future work (Section 6, p. 401). It is a model-checking search, not by itself a proof artifact accepted by an independent kernel.

Verus form (inference): model states and transitions as ghost data, define a predicate `q`, and prove each shoal is inductive with `requires`/`ensures` on a transition function. A stack-based executable search can produce candidate shoals, but Verus does not prove liveness from an unbounded search automatically; the certificate obligations must be separately stated and proved.

## technique 2: the RL temporal deductive rule
What it is: the paper introduces rule RL with premises Pi, P0, and paired Pki/Ppi obligations for a sequence C0…Cn of shoals. P0 says the initial shoal is empty; Pki says the cumulative shoal is inductive; Ppi says a ¬q transition from the cumulative shoal enters an earlier shoal. The conclusion is `(I ∧ G(T)) → FGq` (Section 4.1, pp. 392–394). The first premise captures the remaining system after shoals are removed. The paper says: “Pi expresses that the formula q is an invariant for the model”. (Section 4.5, p. 397).

Steps to apply it:
1. Record the shoals C0,…,Cn emitted by rlive, with C0 false (Section 4.3, p. 395).
2. Prove each cumulative disjunction C≤i is inductive under T (Pki) (Section 4.1, p. 393).
3. Prove that a state in C≤i with ¬q transitions to C≤i−1 (Ppi), so repeated ¬q cannot stay in the newest shoal (Section 4.1, p. 393).
4. Prove Pi using the final invariant ψ returned by the last invariant check; ψ implies q under T with C removed (Section 4.3, pp. 395–396).
5. Instantiate RL in the deductive system to derive the liveness conclusion (Section 4.5, pp. 397–398).

Correctness evidence: the authors formalized and proved `valid((Pi ∧ P0 ∧ Π) → (I ∧ GT → FGq))` in PVS (Section 4.2, p. 394). Theorem 1 derives the cumulative-shoal obligations by induction, and Theorem 2 derives Pi from ψ (Sections 4.3, pp. 395–396). These are universal logical results over formulas, not benchmark percentages.

Verus form (inference): encode each C_i as a `spec fn` over a ghost state and prove induction lemmas for cumulative disjunction and descent under ¬q. A finite decreasing shoal index can support a `decreases` proof for bounded recurrence; the full FGq theorem needs a separately formalized temporal semantics. Verus's `ensures` can state transition obligations, but RL's LTL rule is not a built-in Verus construct.

## technique 3: proof-certificate pipeline
What it is: three stages make a checker result independently auditable. (1) nuXmv dumps shoal invariants C and final ψ; (2) a Python script generates a PVS theory containing the model, property, parameters, theorem, and proof script; (3) PVS runs the fixed RL strategy and emits a proof certificate (Section 4.4, p. 396). The paper emphasizes that “The structural part remains identical regardless of the specific model and property being certified.” (Section 4.4, p. 396) The leaves discharge propositional implications with Yices.

Steps from the paper:
1. Run nuXmv on an AIGER model and export C and ψ (Section 5, p. 398).
2. Translate model and invariants to PVS theory with the supplied Python script (Section 5, p. 398).
3. Start PVS goal `valid(I ∧ GT → FGq)`, split branches for RL premises, and rewrite definitions (Section 4.5, pp. 397–398).
4. Use PVS's Yices-backed SAT solver to discharge propositional leaves; alternatively use `prop` or `bdd-simp`, which scale less well (Section 4.4, p. 396).
5. Retain the PVS proof object as the certificate, with PVS checking the original model/property theorem (Section 2, p. 388).

Verus form (inference): treat the emitted shoals and ψ as untrusted input, parse them into ghost predicates, and verify each obligation in Verus lemmas. Keep the translator outside the trusted kernel unless its output is checked. A Verus proof can replace PVS only after encoding LTL traces and the RL soundness lemma; Yices certificates do not directly become Verus proofs.

## measured evidence, limitations, and VL impact
The evaluation used 53 safe HWMCC instances successfully proved by nuXmv within 1200 seconds. PVS certified 41/53 (77.4%) within 3600 seconds and 8 GB, while 12/53 exceeded memory (Section 5, pp. 398–399). The denominator is the 53-instance safe benchmark set; this is certification throughput, not model-checking correctness. PVS proof time was usually higher than model-checking time, with bottlenecks in LTL expansion and bookkeeping rather than Yices (Section 5, pp. 399–400). Inference: the threat to VL is low for direct Rust functional verification but high for any VL liveness checker whose “verified” result lacks a replayable certificate. Inference: VL should preserve the separation between untrusted search output and a small proof checker. Already done here: do not redo a bespoke liveness search without exporting inductive certificates and checking the original transition system.

## techniques for the catalog
- shoal-based rlive search — iteratively block inductive regions that cannot yield infinitely many fairness violations
- RL temporal rule — prove liveness from cumulative-shoal induction, descent, and a final invariant
- PVS certificate replay — regenerate a theory and discharge rule leaves with a theorem prover and SAT solver
- untrusted-search trusted-checker split — accept model-checker artifacts only after independent proof replay
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
