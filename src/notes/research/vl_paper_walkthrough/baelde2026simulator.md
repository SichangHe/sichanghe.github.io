# Leveraging Cryptographic Simulator Synthesis for Formally Verifying the FOO E-Voting Protocol
(authored by agents unless marked 🧑)
Tag: `baelde2026simulator`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/baelde)

## result

The paper improves the `crypto` tactic of the Squirrel prover, which automatically synthesizes cryptographic simulators (reductions) in computational proofs. A simulator here is one adversary S against a game G = (G0, G1) such that S computes protocol P0 when given oracles G0 and P1 when given oracles G1; Squirrel expresses this as bi-deduction. The new procedure lets simulators memoize oracle outputs across recursive iterations and infers time-sensitive memory invariants. It is validated by a computational proof of vote privacy for the FOO e-voting protocol.

The paper states: “Our main contribution is a new approach to inductive simulator synthesis” (Sec. 1, p. 2726). It also states the procedure “is not complete” (Sec. 1, p. 2726) and supports only games whose global mutable state is logs or sets without flows between logs (Assumption 1, Sec. 5, p. 2735).

## technique 1: basic bi-deduction and oracle synthesis

A cryptographic assumption is a pair of implementations of the same oracles, G = (G0, G1); the target is a pair of programs (P0, P1). The simulator S must compute P0 from G0 and P1 from G1 (Sec. 1, p. 2725). The basic procedure (Sec. 4, Fig. 6) tries four phases in order, never backtracking: (1) reuse phase: obtain the target directly from an input (LOAD); (2) oracle phase: (A) unify an oracle's output with the target, (B) reuse memoized values, (C) case-split on whether names belong to the game, (D) bi-deduce the oracle arguments, or compute directly when no call is needed, (E) store a memoization hint; (3) destruction phase: peel off a shared top-level construct (e.g. FA, FA.⇒) after weak-head normalization; (4) unreachability phase: ask the user to prove the target never needs evaluating (UNREACH), used only as a last resort.

In the IND-CCA2 game (Fig. 1), the left-right oracle appends its ciphertext to a log ℓ and the decryption oracle returns 0 on any ciphertext in ℓ. In the abstract mixnet (Fig. 2), the real voter encrypts its input and the idealized voter encrypts a dummy; the simulator (Fig. 3) calls left-right(input, dummy) so that G0 yields the real outputs and G1 the idealized ones.

Inference: Verus can encode a bounded relational simulator and prove output equivalence with two ghost executions, but probabilistic coupling and computational indistinguishability are outside ordinary Verus functional proofs.

## technique 2: memoizing simulators

When a later protocol step needs the same oracle result as an earlier step, the simulator reuses a stored value instead of calling the oracle again. The paper names the absence of this in the earlier procedure [5]: “the generated simulators cannot memoize values across iterations” (Sec. 1, p. 2726). In the mixnet, a second left-right call at M(i) “would yield an encryption with a different random seed” (Sec. 2, p. 2728), so the simulator reads the ballot memoized at V.

Mechanism: rule MEMOIZE.STORE adds a computed term to the outputs as a memoization hint; MEMOIZE.LOAD reuses a hint from earlier iterations (Fig. 5, Fig. 10). In the inductive procedure, Pass 1 runs basic synthesis to collect hints w x, and later passes take λy.(w y | y < x ∧ x ≤ t) as extra inputs (Fig. 7). The paper says memoized values “allow to reduce the number of oracle calls through re-use, which is critical to simulate our mixnet protocol” (Sec. 5, p. 2735). Memoization is on by default in the new tactic (Sec. 6, p. 2735).

Inference: a Rust/Verus implementation could represent memo tables as ghost maps and prove that a lookup equals the previously generated oracle result. The table itself must not expose secrets at runtime.

## technique 3: time-sensitive inductive invariants

A memory invariant must sometimes depend on the iteration: in the mixnet, the log ℓ is empty before V and holds one element after it (Sec. 2, p. 2728). The induction rule (Sec. 5) bi-deduces (u t) by bi-deducing (u x) for any x ≤ t, assuming (u y) already computed for all y < x; the base case requires the initial memory φ0 to entail I(<, x0). I(⋈, x) is an abstract memory parameterized by a relation ⋈ and a point x; I(<, x) and I(≤, x) describe memory before and after iteration x. The type τ must be fixed, finite and base, with a total order < (Fig. 7).

Steps (Fig. 7): (1) Pass 1 infers the memoization invariant (technique 2); (2) Pass 2 reruns synthesis with the memoized inputs, checks the hints are unchanged, and turns the post-condition ψ into I(⋈, y) = ∀x. φ1 ⊓ (x ⋈ y ∧ y ≤ t); (3) Pass 3 reruns synthesis from φ0 ⊔ I(<, x) to compute proof obligations Θ′ and name constraints C′ (the coupling). For the mixnet, I(⋈, t) is equivalently ℓ ↦ {encV | V ⋈ t ∧ t ≤ t0} (Sec. 5, p. 2735). The paper says: “Thus, we do not need to check that this invariant is inductive.” (Sec. 5, p. 2734), because it is inductive by construction (Theorem 1). Time-sensitive synthesis is opt-in via a `~time_sensitive` flag, because it changes generated subgoals and would break existing developments (Sec. 6, p. 2735).

Inference: Verus can use a decreases clause and loop invariant indexed by an epoch or fuel counter. This proves termination and state relation, but not the cryptographic coupling itself.

## technique 4: FOO privacy proof decomposition

FOO (Fig. 9) uses commitments, blind signatures and two mixnets over four phases. The model lets the adversary control the bulletin boards, signing voting authority and tally, with two honest voters and an arbitrary number of dishonest voters; privacy follows Benaloh's vote-swapping definition (Sec. 7, p. 2737). The duplicate-ballot check (11) is “necessary for privacy” (p. 2737); checks 21 and 22 rule out the trivial attack of blocking one honest ballot (p. 2738).

Proof steps (Sec. 7, pp. 2738–2739): (1) two reductions to CCA2 (for sk1m and sk2m) replace all encryptions by same-length encryptions of zeroes; (2) case analysis on φ, “the two honest votes have successfully gone through the whole protocol”; (3) if φ holds, open shuffles by vote and reduce Eq. (2) to the blinding game; (4) if φ fails, open shuffles by identity and reduce to the commitment hiding game. Auxiliary steps prove distinct commits and commit secrecy.

The development is 10219 lines (about 10 kLoC) with 28 calls to `crypto`; the proof “takes less than 5 minutes to run” on a laptop with 32 GB RAM and an Intel i7-12700H; 33 of 262 seconds (13 %) is simulator synthesis (Table 1, Sec. 7, pp. 2738–2739). The paper calls it “the first mechanized computational cryptographic proof for FOO”; prior tool-assisted FOO proofs “are in the symbolic model” (Sec. 8, p. 2740). It cautions that other properties “such as verifiability or coercion resistance” should be considered when choosing a voting protocol (Sec. 1, p. 2726).

## evidence and limits

On 13 calls to `crypto` over four games, the original tactic averaged 0.1 s, the performance-optimized one 0.05 s, and the new default with memoization 0.06 s (Sec. 6, pp. 2735–2736). A Needham–Schroeder–Lowe proof needing memoization and time-sensitive invariants shrank from 380 lines to 60 with the new `crypto` (Sec. 6, p. 2736). Assumption 1: “For any update ℓ ← 𝒔 in an oracle of G, the only global mutable variable that 𝒔 may depends upon is {ℓ}.” (Sec. 5, p. 2735). The approach applies to a non-adaptive setting, or an adaptive one when the number of sessions is independent of the security parameter; polynomially many sessions are out of scope (Sec. 1, p. 2726).

Inference: the trusted base is Squirrel's logic and tactic soundness, the hand-written game definitions, the IND-CCA2, blindness and commitment-hiding assumptions, and the shuffle permutation axiom (Sec. 7, p. 2736). UNREACH proof obligations go to the user. Inference: for VL, this work threatens products claiming that LLM-generated Rust verification alone establishes cryptographic protocol security; simulator synthesis addresses relational cryptographic proofs that Verus does not automate. VL should reuse memoization and time-indexed invariants, while retaining explicit computational assumptions and independent protocol modeling.

## techniques for the catalog

- bi-deductive simulator synthesis — find one simulator that computes the real protocol from G0 and the ideal one from G1
- memoization invariant — cache oracle results across recursive protocol iterations and reuse them instead of new oracle calls
- time-sensitive invariant inference — index memory facts by the iteration point under a total order
- inductive three-pass synthesis — infer memoization, infer memory, then emit coupling and proof obligations
- compositional cryptographic reduction — combine CCA2, blindness, and commitment hiding to prove protocol privacy
Checked 2026-10-16 against the full paper by a Claude agent (mid-paper quote: "Crucially, the memory invariant of the second pass is an inductive invariant by construction (see Theorem 1 later)."): checked every quotation, number, section and page reference, and technique step against the paper text; changed the link to the paper's presentation page, corrected the simulator definition (real outputs from G0, idealized from G1, not identical outputs), replaced invented step lists for basic and inductive synthesis with the paper's phases and passes, corrected the FOO proof steps, checks and assumptions, fixed page references for the timing and non-adaptivity claims, noted NSL needed both features, and marked the trusted-base list as inference; did not check the long version, the artifact, or the theorem proofs.
