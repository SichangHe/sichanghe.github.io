# Compositional Inductive Invariant Based Verification of Neural Network Controlled Systems
(authored by agents unless marked 🧑)
Tag: `zhou2024compositional`, [paper](http://arxiv.org/abs/2312.10842v2)

## problem and contribution
Neural-network controlled systems (NNCSs) combine an environment transition relation with a neural controller. The paper checks an infinite-horizon safety property by checking a supplied candidate inductive invariant. Its central obstacle is the monolithic implication

“(IndInv ∧ NextNNC ∧ NextENV ) =⇒ IndInv′” (Section 1, p. 2)

where `NextNNC` encodes a potentially large ReLU network. The proposed method introduces a bridge predicate and verifies two smaller implications. This separates NN reasoning from environment reasoning: a neural-network verifier computes output postconditions, and an SMT solver checks the environment implication.

The paper's formal model has state `s`, NN outputs `a`, initial predicate `Init`, controller relation `NextNNC`, environment relation `NextENV`, and safety predicate `Safe`. A candidate `IndInv` proves safety when it satisfies `Init =⇒ IndInv`, inductiveness, and `IndInv =⇒ Safe` (Section 2, pp. 3–4). The experiments assume the candidate is supplied; automatic candidate discovery is future work (Section 6, p. 14).

## technique 1: generalized bridge decomposition

What it is. Replace the monolithic check with

“(IndInv ∧ NextNNC ) =⇒ Bridge” (Condition 8, Section 3.1, p. 5)

and

“(Bridge ∧ NextENV ) =⇒ IndInv′” (Condition 9, Section 3.1, p. 5).

Theorem 1 gives soundness by transitivity; Theorem 2 gives completeness because `Bridge` may be `IndInv ∧ NextNNC` (Section 3.1, p. 5). A bridge must mention both controller inputs `s` and outputs `a`. An output-only bridge is incomplete: in the mod-4 example, `a = 1 ∨ a = −1` permits `s = 3, a = −1`, which the environment sends to `s′ = 4`; the generalized bridge records the input-dependent case “a generalized bridge predicate could be: ((0 ≤ s ≤ 2) ∧ a = −1) ∨ (s = 3 ∧ a = 1).” (Section 3.1, pp. 6–7).

How to apply it.
1. Express the system as `NextNNC ∧ NextENV`, and select a candidate `IndInv` (Section 2, pp. 3–5).
2. Partition or cover `IndInv` with predicates `p_i` over state inputs `s`.
3. Compute an output predicate `ψ_i` for each `p_i` such that `(p_i ∧ NextNNC) =⇒ ψ_i`.
4. Form `Bridge = (p_1 ∧ ψ_1) ∨ ... ∨ (p_n ∧ ψ_n)`.
5. Check each `(p_i ∧ ψ_i ∧ NextENV) =⇒ IndInv′`. All checks imply inductiveness (Section 3.2, pp. 7–8).

The construction is formalized as

“Bridge = (p1 ∧ ψ1 ) ∨ (p2 ∧ ψ2 ) ∨ · · · ∨ (pn ∧ ψn )” (Condition 12, Section 3.2, p. 7)

with `(p1 ∨ ... ∨ pn) ⇔ IndInv` and `ψ_i ∈ AllPosts(NextNNC,p_i)` (Conditions 13–14, p. 7). Therefore Condition 8 holds by construction (Theorem 3, p. 8). The bridge need not be a disjoint partition, and a strong postcondition is unnecessary.

Verus form. Inference: represent `IndInv` as a predicate over the Rust state, and prove the environment transition's postcondition with a `proof fn` whose `requires` includes the bridge disjunction and whose `ensures` establishes the primed-state invariant. Inference: each `p_i` can be a `requires` case (or a lemma predicate) and each `ψ_i` a lemma-produced fact about NN outputs. Inference: Verus cannot directly verify a floating-point ReLU network as the paper's NN verifier does; use a verified integer/real abstraction or an `external_body` only for a separately trusted NN model, then state that trust explicitly. The logical shape transfers; AutoLIRPA's numerical postcondition computation does not.

Evidence. Table 1 reports deterministic and nondeterministic 2D mazes on a 3.3 GHz 8-core AMD CPU, 16 GB RAM, and Nvidia 3060 GPU (Section 4.1, p. 11). The candidate is `0.25 ≤ x ≤ 0.95 ∧ 0.55 ≤ y ≤ 0.95`; the initial and safety conditions already hold (Section 4.2, p. 12). For deterministic mazes, the compositional verifier proves all sizes except `2 × 128`, where it falsifies inductiveness: 0.52–3.04 seconds for sizes `2 × 32` through `2 × 512`, and 1.94 seconds for `2 × 1024`; the monolithic Z3 check takes 51.59 seconds at `2 × 32`, 410.14 seconds at `2 × 48`, 1,203.76 seconds at `2 × 56`, and times out after one hour at `2 × 64` and larger (Table 1, p. 12). For nondeterministic mazes, compositional times range 0.42–5.23 seconds and all sizes through `2 × 1024` verify; monolithic times out from `2 × 56` onward (Table 1, p. 12). The reported query counts are denominated per case: at `2 × 1024`, deterministic uses 38 splits, 191 SMT queries, and 153 NN-verifier queries; nondeterministic uses 102 splits, 511 SMT queries, and 409 NN-verifier queries (Table 1, p. 12).

Assumptions and limits. Termination is not guaranteed in infinite state spaces because splitting can continue forever (Section 3.4, p. 9). The implementation uses union-of-hyperrectangle invariants, binary midpoint splitting, Z3, and AutoLIRPA/α-β-CROWN (Section 4.1, p. 11). Existing NN verifiers cannot encode the environment's simultaneous arithmetic or nondeterminism in the monolithic NN formulation (Section 4, pp. 10–11). Inference: a Verus implementation must bound or otherwise control splitting, and its proof effort can grow with the number of cases even when each case is simple.

## technique 2: compositional falsification

Purpose. Failure to prove a chosen bridge does not show that `IndInv` is non-inductive. The paper instead searches for a satisfiable `FState` and output predicate `FPred` satisfying

“FState =⇒ IndInv” (Condition 20, Section 3.3, p. 8)

“(FState ∧ NextNNC ) =⇒ FPred” (Condition 21, Section 3.3, p. 8)

“(FState ∧ FPred ∧ NextENV ) =⇒ ¬IndInv′” (Condition 22, Section 3.3, p. 8).

Together these imply a concrete violating transition and falsify inductiveness (Theorem 4, Section 3.3, p. 9).

How to apply it. Use a satisfiable state region inside `IndInv`; compute an NN output over-approximation `FPred`; ask the environment solver whether the next state violates `IndInv′`. Algorithm 1 reuses the current split `p` as `FState` and its postcondition `ψ` as `FPred`; a proved negated implication returns `(False,p)` (Section 3.4, pp. 9–10). This is a compositional counterexample certificate, not merely a failed proof attempt.

Verus form. Inference: encode a violating state as a lemma with `requires p(s)` and `ensures !IndInv(next(s))`, while separately proving the NN-output relation and environment transition relation. Inference: for executable Rust, return an enum containing the witness state; the proof function itself remains ghost and is not called at run time.

Evidence and limits. The deterministic `2 × 128` experiment is the paper's falsification case: compositional verification terminates in 2.21 seconds after 64 splits, 225 SMT queries, and 160 NN queries, while monolithic verification times out (Table 1, p. 12). Falsification is heuristic in the sense that failure to find `FState` does not establish inductiveness; the paper only claims the sufficient conditions of Theorem 4.

## algorithm and implementation details

Algorithm 1 starts with queue `Q = {IndInv}`. It computes `ψ ∈ AllPosts(NextNNC,p)`, checks the environment implication, adds successful `p ∧ ψ` cases to `Bridge`, returns false on a falsifying implication, and otherwise splits `p` into satisfiable predicates whose disjunction equals `p` (Section 3.4, pp. 9–10). The prototype uses AutoLIRPA for postconditions and Z3 for validity checks; splitting divides each hyperrectangle at its midpoint (Section 4.1, p. 11). The appendix's reachability comparison converts PyTorch to ONNX and then NNV or NNet; one million uniformly distributed vectors found a maximum ONNX/NNet output difference of order `10^-6` (Appendix A.1, pp. 18–19). That conversion experiment concerns a comparison toolchain, not the inductiveness proof itself.

## proof boundary and relevance to VL

The proof establishes safety only when the supplied candidate satisfies initialization and implication-to-safety, and when every compositional case is discharged. Z3 and AutoLIRPA, the trained NN weights, model conversion, and floating-point abstractions remain trusted components of the reported setup. Inference: agent-written verified Rust should treat this as a useful proof-structuring pattern for controller/environment separation, but the neural postcondition oracle is a major trust boundary. Existing work already covers bounded NNCS reachability and component-level NN verification; the paper's distinct contribution is infinite-horizon, discrete-time, inductive compositional checking (Section 5, pp. 13–14). Inference: VL should reuse the decomposition and falsification certificates rather than redo those ideas, while investing in a verified NN abstraction and a termination policy for predicate splitting. Inference: the threat to a product that emits verified Rust is medium: the logical bridge pattern is transferable, but unverified numerical NN reasoning can invalidate the end-to-end claim.

## techniques for the catalog
- generalized bridge decomposition: cover an inductive invariant with input regions and NN-output postconditions, then prove each environment case separately
- compositional falsification: combine a state witness, NN output over-approximation, and environment transition to prove a candidate invariant is not inductive
- queue-based splitting: repeatedly split unresolved state predicates until every bridge case is proved or a falsifying case is found
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
