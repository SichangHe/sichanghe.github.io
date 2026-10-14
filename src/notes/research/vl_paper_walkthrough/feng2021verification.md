# Verification of Distributed Quantum Programs
(authored by agents unless marked 🧑)
Tag: `feng2021verification`, [paper](http://arxiv.org/abs/2104.14796v1)

## scope and result

The paper defines a CSP-like language for distributed quantum programs, gives operational and denotational semantics, and extends quantum Hoare logic to distributed processes. Its abstract states: “After presenting its operational and denotational semantics, we develop a Hoare-style logic for distributed quantum programs and establish its soundness and (relative) completeness with respect to both partial and total correctness.” The logic is applied to quantum teleportation and a local implementation of a non-local CNOT gate (abstract, PDF p. 1). The language permits local quantum operations and classical communication; asynchronous quantum-state communication is future work (Conclusion, PDF p. 14).

## technique 1: model a distributed program with ownership and rendezvous constraints

Use this when a system consists of deterministic local processes that share classical channels but have disjoint mutable state. A sequential quantum program has assignments, probabilistic assignments, measurements, initialization, unitaries, sequencing, guarded alternatives, and guarded loops (Sec. 2.1, PDF pp. 4–5). A sequential process adds an initialization program followed by a loop of guarded input/output actions. An input `c?x` and output `c!e` match when they use the same channel, opposite directions, and the same type; their communication effect is `x := e` (Sec. 2.2, PDF p. 5).

The distributed program is `S1 ‖ ... ‖ Sn`. Apply two side conditions: for every pair, variables changed by one process and quantum variables of that process are disjoint from all variables of the other; and each channel is shared by at most two processes (Definition 2, Sec. 2.3, PDF p. 6). Encode coordination with classical stage variables. In the teleportation example Alice performs CNOT, H, and two measurements, sets `stageA := 0`, then sends `xA` and `zA`; Bob starts at `stageB := 0`, receives the values, conditionally applies X and Z, and advances his stage (Example 3, Sec. 2.3, PDF p. 6).

The rationale is explicit: “The second clause in Definition 2 implies that each communication channel is shared by at most two processes.” The paper also says, “The constraints in Definition 2 look very strict at the first glance,” then explains that control variables can transform more general systems to this form (Sec. 2.3, PDF p. 6).

Inference: in Verus, represent each process as a Rust object whose owned state excludes the other process's mutable fields, and represent a rendezvous as a verified transition method consuming a matching protocol state. Use `requires` for the stage/channel precondition, `ensures` for the updated stage and message effect, and a `proof fn` for preservation of disjointness. This is an adaptation: the paper's quantum state and channel semantics are mathematical, not Rust semantics. Verus ownership can enforce the data separation, but quantum operators and probabilistic distributions need explicit ghost/spec representations and lemmas.

## technique 2: give probabilistic interleaving operational semantics

Use this when local actions can interleave, so nondeterministic scheduling must be distinguished from probabilistic measurement. A configuration is `<S, σ, ρ>`, with program, classical state (or failure), and a density operator. Sequential rules map a configuration to a probability distribution. Measurement with operators `Mi` creates branch probability `pi = tr(Mi ρ Mi†)` and post-state `Mi ρ Mi† / pi`; probabilistic assignment similarly creates branches. Parallel execution advances one enabled process (rule `Paral`), while a matching pair advances both and applies `x := e` (rule `Comm`) (Table 1, PDF p. 7).

The authors explicitly changed the earlier notation because distributed execution has real scheduling nondeterminism: “To distinguish these two types of nondeterminism, we decide to model quantum measurements and probabilistic assignments in a (standard) probabilistic way” (Sec. 3.2, PDF p. 8). A terminal configuration includes proper termination, failure, or deadlock; the denotation keeps only properly terminated configurations and records their total probability (Sec. 3.2, PDF pp. 8–9).

To apply the method, define (1) configuration and probability-distribution types, (2) one-step rules for every command, (3) closure of one-step transitions to distributions, and (4) a computation as an infinite sequence of distributions. For each computation take the least upper bound of properly terminated classical-quantum states. Example 8 traces teleportation: four equally weighted measurement outcomes eventually all leave Bob's qubit in `|ψ⟩` (Sec. 3.2, PDF p. 9).

Inference: a Verus encoding can use ghost maps for classical state and a spec-level state for a density matrix or an abstract probability mass. A `spec fn step` can describe one transition; a `proof fn` can show that branch probabilities sum to one and that a state invariant survives each branch. Executable Rust should carry only the concrete protocol; the quantum distribution is proof-only. Verus does not natively provide the paper's real-valued linear algebra or probability measure, so these facts become trusted axioms or separately proved arithmetic libraries unless represented over a finite exact domain.

## technique 3: prove schedule independence, then sequentialize

The key concurrency proof is that all legal interleavings compute one denotation. Theorem 9 states that for a fixed input, “the set `{Δπ : π is a computation of S starting in ⟨σ, ρ⟩}` has exactly one element” (Sec. 3.2, PDF p. 9). The appendix constructs a derivative tree for a computation, labels each edge by the process action or communication, fixes an order on enabled labels, and calls a run good when it always takes the least enabled label (Definitions 25–27, PDF pp. 20–21). A non-good tree is transformed by commuting an enabled action earlier; pairwise state/variable disjointness makes the transformation preserve branch probabilities and the final cq-state (proof of Theorem 9, PDF pp. 21–22). Repeating the transformation yields the unique good computation.

After determinism, define a sequential program `T(S)`: execute every process initializer, then loop over matched guards in a fixed order. Add a condition `Bi` that excludes earlier matching pairs so the result is deterministic (Sec. 4, PDF p. 10). Distributed and sequential programs differ on deadlock: define `TERM` as all local guards disabled and `BLOCK` as all communication pairs disabled. Theorem 12 proves `[[S]](Δ) = [[T(S)]](Δ)|TERM`, restricting the sequential result to states satisfying `TERM` (Sec. 4, PDF p. 10). Example 13 sequentializes teleportation by copying `xA` and `zA` into Bob's variables in two ordered loop branches (PDF p. 10).

Inference: this is directly useful to Verus because it turns a concurrent proof obligation into a sequential proof obligation plus a commutation lemma. Model each process step as an abstract transition and prove that independent transitions commute on the abstract state; then verify the deterministic scheduler `T(S)` with ordinary loop invariants. A Verus state-machine proof can express the allowed transitions, while `invariant` clauses preserve ownership and protocol state. The paper's exact probability-preserving commutation argument remains domain-specific ghost mathematics.

## technique 4: use classical-quantum assertions and expectation Hoare triples

A cq-assertion maps every classical state to a Hermitian operator with eigenvalues in `[0,1]`; each operator's preimage must be definable by a classical assertion (Definition 14, PDF p. 11). For a cq-state `Δ` and assertion `Θ`, define `Exp(Δ |= Θ)` as the sum of traces of `Θ(σ)` times the corresponding density operator (Definition 15, PDF p. 12). This expectation lets a single assertion describe both classical predicates and quantum observables.

State correctness as `{Θ} S {Ψ}`. Total correctness requires `Exp(Δ |= Θ) ≤ Exp([[S]](Δ) |= Ψ)`; partial correctness adds the probability of nontermination, `tr(Δ) − tr([[S]](Δ))` (Definition 16, PDF p. 12). Teleportation's postcondition can mention only Bob's qubit: `|=tot {|ψ⟩q ⊗ |β⟩q1,q2} Teleport {|ψ⟩q2}` (Example 17, PDF p. 12). This deliberately forgets Alice's measured qubits.

Inference: in Verus, encode a cq assertion as a ghost predicate over a classical ghost state and an abstract quantum-state value. Use `requires` for the precondition, `ensures` for the postcondition, and quantify only over the state components needed by the contract. The expectation inequalities are not ordinary executable assertions; they require spec functions and proof lemmas over the chosen finite representation. If a product only needs classical control correctness, a simpler predicate can preserve the stage/message invariant and leave quantum fidelity as an external assumption.

## technique 5: apply syntax-directed partial-correctness rules

Table 2 gives rules for skip, abort, assignment, probabilistic assignment, initialization, unitary, measurement, sequencing, alternatives, loops, implication, and distributed composition (Sec. 5.3, PDF p. 13). The distributed rule first proves the sequential initializers and every matched communication branch, then concludes a postcondition conjoined with `TERM`. Theorem 18 states: “The proof system in Table 2 is both sound and (relatively) complete with respect to the partial correctness of distributed quantum programs” (Sec. 5.3, PDF p. 13).

To use the distributed rule, compute `T(S)` from the process guards. Prove `{Θ} S1,0;...;Sn,0 {Ψ}`. For each communication tuple `(i,j,k,l)`, prove `{Bi,j ∧ Bk,l ∧ Ψ} Effect(αi,j, αk,l); Si,j; Sk,l {Ψ}`. The rule then yields `{Θ} S1 ‖ ... ‖ Sn {Ψ ∧ TERM}` (Table 2, PDF p. 13). The appendix establishes soundness by reducing this proof to sequential weakest liberal preconditions and Theorem 12; completeness uses `wlp.S.Θ` as the canonical precondition (Appendix C.4, PDF pp. 26–27).

Inference: the closest Verus form is a method contract plus a loop invariant for each scheduler loop and helper lemma for each branch. Do not encode the paper's Hoare rule as a runtime function. Use `proof fn` only to establish the branch contract and `ensures` on executable methods for the transition result.

## technique 6: prove termination with ranking assertions

Total correctness adds a decreasing sequence of cq-assertions `{Θk}` whose limit is bottom and whose expected value decreases after every loop body (Definition 19, PDF p. 13). Table 3 replaces partial loop and distributed rules with `Rep-T` and `Dist-T`, requiring ranking assertions. The paper also supplies simpler classical rules in Table 5: choose an integer expression `t`, show it is nonnegative, preserve the loop invariant, and prove every enabled branch changes `t = z` to `t < z`; for a distributed loop additionally show `p ∧ BLOCK → TERM` (Appendix D, PDF pp. 29–30). Theorem 34 proves these auxiliary rules sound.

Teleportation uses `t = 2 − stageA`. Its invariant `Ψ` has three stage cases: before communication Bob holds `X^i Z^j |ψ⟩`, after the first correction he holds `Z^j |ψ⟩`, and at stage two he holds `|ψ⟩`; each case is weighted by the four measurement outcomes (Example 35, Appendix E.1, PDF pp. 30–31). The proof (1) preserves `Ψ` through the two communication branches and conditional X/Z operations, (2) proves `t` decreases and `p ∧ BLOCK → TERM`, and (3) proves the initializer establishes `Ψ`. It concludes total correctness and then derives the desired Bob-only postcondition (PDF pp. 30–31).

Inference: in Verus, use an integer ghost rank in a loop invariant, require `rank >= 0`, and prove `rank decreases` on each scheduler transition. A stage counter is a natural executable rank for finite protocols. Verus's loop invariant syntax and `decreases` clause can express this shape; the cq expectation ranking sequence cannot be copied directly without a custom mathematical model.

## evidence, trust, limits, and VL relevance

The paper proves semantic properties and proof-system soundness/relative completeness as Theorems 9, 12, 18, 20, and 34. Its empirical evidence is two worked case studies, teleportation and remote CNOT; no runtime benchmark or denominator-based performance experiment is reported. The authors state that “The effectiveness of the logic is demonstrated by its application in verification of quantum teleportation and local implementation of non-local CNOT gates” (Conclusion, PDF p. 14). The proofs assume finite-dimensional Hilbert spaces, deterministic local processes, pairwise variable/channel constraints, and classical rendezvous communication. The semantics and proofs are mathematical; the quantum-mechanical primitives, real arithmetic, solver correctness, and any implementation of the language remain trusted foundations.

Inference: the threat to agent-written verified Rust is indirect. The valuable reusable ideas are ownership-separated process models, explicit communication effects, schedule commutation, sequentialization, assertion contracts, and ranking proofs. They do not verify Rust memory safety or Rust API behavior, and they do not remove the need to specify the desired product property. VL should reuse these proof patterns when verifying distributed protocols, but should not redo a quantum-specific Hoare calculus unless a product requirement actually includes quantum state semantics. Existing Verus studies already cover Rust contracts, state machines, loop invariants, and trusted boundaries; this paper adds the distributed proof decomposition and the distinction between scheduling nondeterminism and probabilistic branching.

Inference: the paper's LOCC restriction is a product boundary. Its conclusion says that quantum-state communication would require ownership tracking to preserve no-cloning, and calls that extension more challenging (Conclusion, PDF p. 14). For VL, the analogous lesson is to make resource ownership and communication assumptions explicit before claiming end-to-end verification.

## techniques for the catalog

- ownership-constrained rendezvous model — represent distributed processes with pairwise-disjoint mutable state and two-party matching channels
- probabilistic interleaving semantics — separate scheduler interleavings from probabilistic measurement branches with distribution-valued transitions
- schedule commutation and sequentialization — prove all legal interleavings share one denotation, then verify a deterministic sequential transformation
- cq assertion expectations — express classical predicates and quantum observables as operator-valued assertions with expectation-based Hoare triples
- partial-correctness distributed Hoare rule — verify initializers and every matched communication branch before concluding a `TERM`-guarded postcondition
- ranking-based total correctness — combine a preserved invariant with a decreasing assertion sequence or integer rank and a deadlock-to-termination implication
Checked 2026-10-14: audit record feng2021verification; paper-study comparison complete; gate executed; experiments not rerun
