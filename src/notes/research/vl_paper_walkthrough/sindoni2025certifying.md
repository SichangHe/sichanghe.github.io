# Certifying rlive: A New Proof Strategy for Liveness Model Checking
(authored by agents unless marked 🧑)
Tag: `sindoni2026certifying`, [paper](https://doi.org/10.1007/978-3-032-04167-8_21)

## target and trust boundary
The paper certifies a “yes” result from rlive, a SAT-based liveness checker for finite-state symbolic transition systems. The property is M |= FGq: on every path, eventually q remains true. rlive incrementally searches for lasso counterexamples while accumulating shoals, sets of states from which ¬q cannot recur infinitely often. The abstract states: “Despite the complexity of the algorithm, we show that the shoals are sufficient to generate a proof in a deductive system for temporal properties.” (p. 386). The authors explain the intended trust boundary: “In our work, we produce a temporal proof of the fact that the original system satisfies the property, so that only the theorem prover performing the proof, and not the model checking algorithms used, has to be trusted.” (Section 2, p. 388). Inference: this assurance still depends on the generated PVS theory faithfully representing the intended model and property, and on PVS and its Yices-backed proof steps. The paper describes the Python translator but does not report verifying it (Section 5, p. 398).

The publication year is 2026, although the conference is FroCoS 2025: the first-page publication line reads “FroCoS 2025, LNAI 15979, pp. 386–403, 2026.” (p. 386).

## technique 1: shoal-producing rlive search
What it is: rlive reduces liveness to repeated safety/invariant checks. It searches depth first for successive occurrences of ¬q, returns Unsafe when a state on its search stack recurs, or obtains an inductive invariant shoal when its restricted search cannot reach another target (Section 3.3, pp. 390–391).

Steps from Algorithm 1 (Section 3.3, pp. 390–391):
1. Initialize accumulated shoal C to false and stack B empty.
2. Check the invariant `T⁻¹(¬C) → q` from I using the restricted transition relation `T ∧ ¬C ∧ ¬C′`. Here `T⁻¹(¬C)` denotes states with a successor outside C. An unsafe result supplies a reachable ¬q state with such a successor; if the check is safe, return Safe.
3. Push the final state of the returned counterexample and inspect the stack top s.
4. Run the same invariant check starting from T(s), the immediate successors of s. This searches for a reachable target, potentially several transitions away. If its final state is already on B, return Unsafe; otherwise push it and continue.
5. If that check is safe, obtain its inductive invariant `inv`, set `C := C ∨ inv`, and pop s.
6. Once B is empty, repeat the check from I with the updated C.

Evidence and limits: shoals are inductive invariants for modified transitions, not arbitrary sets. A violation in the finite-state setting has a lasso-shaped witness (Section 3.2, p. 390). The conclusion states: “our approach is currently limited to a single fairness condition (namely ¬q).” (Section 6, p. 401). The search artifacts are inputs to the later PVS certification procedure.

Inference: a possible Verus adaptation would represent states and transitions as ghost data, define q and the shoals as predicates, and state their transition obligations in lemmas. This paper does not implement or evaluate a Verus adaptation; deriving FGq would also require temporal semantics and a proof of the temporal rule.

## technique 2: the RL temporal deductive rule
What it is: RL concludes `(I ∧ G(T)) → FGq` from Pi, P0, and paired Pki/Ppi obligations for shoals C0,…,Cn (Section 4.1, pp. 392–394). Write `C≤i := C0 ∨ … ∨ Ci` and `C := C≤n`. Its premises are:
- `Pi := (I ∧ GT ∧ G¬C) → Gq`
- `P0 := G(C0 ↔ ⊥)`
- `Pki := G((C≤i ∧ T) → X(C≤i))`, for 1 ≤ i ≤ n
- `Ppi := G((C≤i ∧ T ∧ ¬q) → X(C≤i−1))`, for 1 ≤ i ≤ n

Pki keeps the cumulative shoal closed under transitions; Ppi requires each ¬q transition within it to enter an earlier cumulative shoal. Pi covers paths that stay outside the final shoal.

Steps to apply it:
1. Record the shoals emitted by rlive, with C0 false (Section 4.3, p. 395).
2. Prove P0 and the cumulative-shoal closure and descent obligations (Sections 4.1 and 4.5, pp. 392–393, 397).
3. Prove Pi using the final inductive invariant ψ returned by the last invariant check. In particular, ψ implies `(T ∧ ¬C′) → q`, and its invariant proof establishes `I ∧ G(T ∧ ¬C) → Gψ` (Theorem 2, pp. 395–396).
4. Instantiate the proved RL lemma to derive the liveness conclusion (Section 4.5, pp. 397–398).

Correctness evidence: Section 4.2 reports a PVS proof of `valid((Pi ∧ P0 ∧ Π) → (I ∧ GT → FGq))`, where Π contains the paired obligations (p. 394). Theorem 1 derives cumulative-shoal closure and descent from the invariants obtained on restricted transitions; Theorem 2 derives Pi using ψ (Section 4.3, pp. 395–396). Completeness here means that rlive can supply the information needed for these premises: “In this section, we show that the rule is complete to provide a proof for the property proved by rlive, in the sense that rlive can be easily extended to generate the premises of the rule.” (Section 4.3, p. 395).

Inference: a Verus encoding could use `spec fn` predicates and lemmas for cumulative-shoal closure and descent under ¬q. A finite shoal index describes the descent argument, but an FGq theorem also needs a formal account of infinite traces. The paper provides no Verus implementation.

## technique 3: proof-certificate pipeline
What it is: three stages connect the model-checking result to a PVS proof. First, the model checker dumps the shoal invariants and final ψ. Second, a generated PVS theory contains the model, property, parameters, theorem, and proof script. Third, PVS runs the strategy and generates the proof certificate (Section 4.4, p. 396). The paper states: “This part remains identical regardless of the specific model and property being certified.” Here “This part” refers to the structural part that applies LTL definitions and proved temporal lemmas (Section 4.4, p. 396). Propositional implications at the proof leaves are discharged with Yices.

Steps from the paper:
1. Run nuXmv on an Aiger model and export the shoal invariants and ψ as Aiger combinational circuits over the model's state variables (Section 5, p. 398).
2. Translate the model and invariants into a PVS theory with the supplied Python script (Section 5, p. 398).
3. Start from `valid(I ∧ GT → FGq)`. Use PVS Case to assume and separately prove Pi, and likewise the remaining premises. Apply RL in the branch assuming all premises (Section 4.5, p. 397).
4. Expand and rewrite definitions, and use Yices to discharge the propositional leaves for P0 and Π. Prove Pi with the invariant subroutine parameterized by ψ (Section 4.5, pp. 397–398).
5. Complete the PVS proof of the original model/property theorem. The paper also permits `prop` or `bdd-simp` for propositional discharge, reporting poorer scaling for large formulas (Section 4.4, p. 396).

Inference: a Verus adaptation would need to prove the emitted predicates satisfy the obligations, establish RL over encoded traces, and ensure that the encoded model matches the intended input. Translating a certificate does not by itself establish these facts.

## techniques for the catalog
- shoal-based rlive search — iteratively block inductive regions that cannot yield infinitely many fairness violations
- RL temporal rule — prove liveness from cumulative-shoal closure, descent, and a final invariant
- PVS certificate generation — translate a model and invariants into a theory and discharge rule premises
- untrusted-search trusted-checker split — prove the original model/property theorem independently of the search algorithm
