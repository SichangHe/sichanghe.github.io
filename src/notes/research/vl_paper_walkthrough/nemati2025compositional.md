# Compositional Verification of Concurrency Using Past-Time Temporal Epistemic Logic
(authored by agents unless marked 🧑)
Tag: `nemati2025compositional`, [paper](http://arxiv.org/abs/2502.18885v3)

## scope and semantic model

The paper develops a past-time temporal epistemic logic for compositional safety proofs of shared-memory concurrency. Its running case is Peterson's two-thread mutual-exclusion algorithm. The target is `Always ¬(InCS0 ∧ InCS1)`, where `InCSi` means that thread i is at its critical-section control location (§2, PDF p.3).

The operational model has a shared store, a local component for each thread, and interleaving steps in which exactly one thread acts (§3, PDF pp.3–4). A thread observes its local component and the values returned by its shared-memory reads. The paper makes reads explicit with last-read local registers and desugars compound guards into micro-steps, each with at most one shared-memory access (§3, PDF pp.4–5). Observation histories have perfect recall and no global clock: environment steps that leave a thread's local state unchanged do not change that thread's information set (§3, PDF p.5).

The logic has atomic predicates, Boolean connectives, past operators `Prev` and `Since`, and an epistemic operator `K_A φ` meaning that φ holds in every run point indistinguishable to A by its complete observation history (§4.1–4.6, PDF pp.5–8). It defines `after_A ≜ Prev(A act)` for the previous step, `Prev_A φ` for the most recent state reached by A, `Write_A(x)` for A's write to x, and `Last_W(φ)` for the most recent occurrence of a marker (§4.4–4.5, PDF pp.7–8).

The paper states, “The key rely–guarantee style reasoning principle we develop is: ‘if A established ϕ at its last step and ϕ is stable under environmental interference since then, then ϕ holds now.’” (§2, PDF p.3). This is the bridge between temporal history and rely–guarantee interference reasoning.

Inference: Verus does not provide this temporal-epistemic logic as a built-in notation. A Verus adaptation must encode the relevant state-machine history and observation facts as specifications and proof lemmas, then use executable Rust transitions as the atomic steps.

## technique 1: model observations and past-time events explicitly

Inference: Use this technique before proving knowledge or interference properties. Give each thread a local control location and explicit read-result fields. For each shared read, update the corresponding last-read register in the post-state. Split a compound guard such as Peterson's `flag[j] == 1 && victim == i` into sequential micro-steps that read one variable at a time (§3, PDF pp.4–5).

Then define formulas over the transition labels and control locations. `after_A` identifies a state reached by A's step. `Prev_A φ` is true at the most recent A-step state satisfying φ; `pre_A φ ≜ Prev_A(Prev φ)` refers to the pre-state of that step. `Write_A(x) ≜ after_A ∧ chg(x)` identifies an atomic write. `Last_W(φ) ≜ ¬W Since (W ∧ φ)` supports last-occurrence arguments (§4.4–4.5, PDF p.7).

Steps for applying the method:

1. Choose the local observation function as the local component, including read results (§3, PDF p.4).
2. Define the history equivalence relation by equality of the complete sequence of observations (§3, PDF p.5).
3. Mark each atomic instruction with a transition predicate based on prior and current control locations (§7.2, PDF p.16).
4. Express the value read at the last step with `pre_A` and the read register rather than assuming a thread sees the entire shared store (§3, §7.5, PDF pp.4–5, 18).

Inference: In Verus, represent local control and shared state in a ghost or specification state machine. Use `spec fn` predicates for `after_A`, `pre_A`, ownership, and event markers. Use `requires` to state the pre-state and scheduler conditions and `ensures` to expose deterministic postconditions. The history relation is an inference and must be proved sound against the actual Rust scheduler or concurrency API.

## technique 2: define stability as a rely condition

For a thread A and state formula φ, the paper defines `Stable_A(φ) ≜ Always ¬after_A → (Prev φ → φ)` (§6.1, PDF p.11). It means every environment step preserves φ. This turns the informal rely side condition “P is stable under the rely” into a formula that can be checked and composed.

The paper proves closure under conjunction and disjunction: if φ and ψ are stable, then φ ∧ ψ and φ ∨ ψ are stable (Lemma 1, §6.2, PDF p.11). A frame condition `Frame_A(x) ≜ Always ¬after_A → (x = Prev x)` yields stability of every equality `x = v`, and closure builds stable tuples (§6.2, PDF p.11).

Apply it as follows:

1. State the environment frame or ownership condition for each shared variable (§6.2, PDF p.11).
2. Derive stability of each value fact needed by a local proof (§6.2, PDF p.11).
3. Combine stable facts with Lemma 1 when the proof needs a conjunction (§6.2, PDF p.11).
4. Use stability to carry a fact from a thread's last step to the current state with the stability-lifting lemma (§6.3, PDF pp.11–12).

Inference: In Verus, encode ownership as transition-system invariants or `requires`/`ensures` facts that other threads cannot modify a protected field. Prove a lemma that an environment transition preserves the predicate, then invoke it between local steps. This transfers the proof pattern; it does not imply that ordinary Rust aliasing alone establishes the paper's scheduler assumptions.

## technique 3: separate temporal persistence from epistemic knowledge

Inference: A last-step fact is not automatically knowledge. The paper proves `Stable_A(φ) ∧ Prev_A φ ⊨ φ` (Lemma 2, §6.3, PDF pp.11–12): stability lifts a fact across any number of environment steps. It separately proves `Prev_A(K_A φ) ⊨ K_A φ` (Lemma 3, §6.4, PDF p.12): under perfect recall and no global clock, A's information set does not change between A-steps, so knowledge persists.

Use this separation when a thread reads a guard and later relies on it. First prove what the thread observed at its own step (`K_A pre_A ¬guard`); then use stability only for shared facts that remain unchanged under the environment. The Peterson case uses exactly this split. Entering the critical section records that the loop guard was false in the pre-state, while ownership and stability preserve `flag[i] = 1` between i's steps (§7.5–7.6, PDF pp.18–19).

Inference: In Verus, keep observation claims in ghost state and prove them from the read result at the transition. Keep persistence claims as ordinary invariant lemmas. Do not replace an epistemic assumption with an unchecked assertion about current shared memory: the paper's proof requires a rely condition for that replacement.

## technique 4: derive a global invariant from per-thread preservation

The paper defines `Pres(I) ≜ Always Prev ⊤ → (Prev I → I)` and proves that an initial I plus global step preservation implies `Always I` (Lemma 4, §6.7, PDF pp.14–15). It then decomposes preservation by the active thread: `Pres_A(I) ≜ Always after_A → (Prev I → I)`. Since interleaving gives exactly one active thread at every step, proving every `Pres_A(I)` entails `Pres(I)` (§6.7, PDF p.15).

The reusable proof recipe is explicit:

1. Choose a global safety invariant I (§6.7, PDF p.15).
2. For each thread A, prove `Pres_A(I)` by sequential reasoning under rely assumptions (§6.7, PDF p.15).
3. Prove rely/guarantee compatibility: other threads' guarantees imply A's rely (§6.7, PDF p.15).
4. Apply the initial-state and step-preservation lemma to conclude `Always I` (§6.7, PDF p.15).

The paper packages this as a derived parallel-composition rule. Let `G−A` be the conjunction of all other threads' guarantees. Prove `G−A ⊨ R_A` and `(G_A ∧ R_A) ⊨ Pres_A(I)` for every A (§6.8, PDF pp.15–16).

Inference: In Verus, write each transition's `ensures` as its guarantee and use a state-machine invariant for I. The rely proof becomes a lemma that another transition preserves the current thread's assumptions. A Verus `invariant` clause on a loop can carry I through a spin loop; `decreases` is needed only for terminating loops and does not prove Peterson's liveness, which the paper does not address.

## technique 5: encode ownership and prove Peterson mutual exclusion

For Peterson, the paper assumes each thread i alone writes `flag[i]` and writes `victim` only when executing `victim = i` (§7.3, PDF p.17). Ownership is expressed as `OwnFlag_i ≜ Always ¬after_i → (flag[i] = Prev flag[i])`; this yields stability of `flag[i] = 0` and `flag[i] = 1`. Rely/guarantee interfaces make compatibility explicit: thread j's guarantee that it never writes `flag[i]` entails i's rely that non-i steps preserve `flag[i]` (§7.4, PDF p.17).

The local proof uses deterministic step postconditions: setting, clearing, and writing `victim` produce the expected values (§7.5, PDF p.18). Entering the critical section implies epistemic knowledge of the pre-state guard: `Always EnterCS_i → K_i pre_i ¬(flag[j]=1 ∧ victim=i)` (§7.5, PDF p.18).

The last-entrant contradiction has four steps (§7.6, PDF pp.19–21):

1. If j is in its critical section, its flag is 1 by control flow and ownership.
2. If i enters last, its recorded pre-state guard says not both `flag[j] = 1` and `victim = i`; with j's flag equal to 1, the pre-state has `victim = j`.
3. Since i wrote `victim = i` before waiting, a later write by j must have produced `victim = j`; this gives the happens-before relation `SetVictim_i ≺ SetVictim_j`.
4. At that later j write, i's flag remains 1 and j's loop guard is true. The guard remains true until i's entry, so j cannot already be in the critical section, a contradiction (§7.6, PDF pp.19–21).

The paper's discussion states, “The formal structure mirrors the informal proof, but the logic forces a clean separation: knowledge is used only to justify the pre-state guard fact (3), whereas stability (rely/guarantee) transports flag-facts across unbounded environment interference.” (§7.6, PDF p.21).

Inference: In Verus, encode each thread's transition relation and ownership facts in a concurrency state-machine proof. Prove the deterministic postconditions as `ensures`; prove the mutual-exclusion contradiction as a `proof fn` over the abstract state and event history. The exact representation of `K_i`, histories, and scheduler interleavings is a design obligation for VL, not a result supplied by this paper.

## evidence, trust, and limits

The paper describes its proof-system scope as, “The system is intended to support paper-and-pencil proofs (and, ultimately, automation); it is not meant as a complete axiomatization of all validities of temporal–epistemic logic.” (§5, PDF p.9). Its Theorem 1 states soundness for every model and run point satisfying the assumptions (§5.4, PDF p.9). It also provides a partial Isabelle/HOL mechanization at the repository named on PDF p.2. The paper's Peterson proof is a proof sketch, not a reported benchmark with success percentages or runtime denominators. Its evidence is the formal semantics, soundness argument, derived lemmas, and worked case study.

Trusted assumptions include the interleaving operational semantics, locality/frame behavior, read instrumentation, perfect-recall observation model, initial-state assumptions, and ownership guarantees (§3, §7.3, PDF pp.3–5, 17). The paper explicitly limits scope: its conclusion says dedicated termination and liveness proof rules have not been developed (§9, PDF p.22). It also notes that a fully formal development would add explicit predicates for each instruction and discharge local control-flow facts with Hoare reasoning (§7.6, PDF p.21).

Inference: The threat to agent-written verified Rust is concentrated in the abstraction boundary. A Verus proof can establish mutual exclusion for an abstract transition system while the executable scheduler, atomicity, read instrumentation, or ownership API differs. VL should reuse the four-step per-thread rely/guarantee recipe and the separation of knowledge from stability. It should not redo the paper's logic design; it should validate the chosen Verus concurrency encoding against concrete Rust operations and test liveness separately.

## techniques for the catalog

- explicit observation histories: model local state, read results, perfect recall, and indistinguishable run points
- past-time event markers: define last-thread-step, pre-state, write, and last-occurrence predicates
- stability reasoning: encode rely conditions as preservation under environment steps
- epistemic persistence: separate knowledge retained between own steps from ordinary invariant stability
- compositional invariant proof: prove per-thread preservation, rely/guarantee compatibility, then global safety
- ownership-based Peterson proof: combine flag ownership, victim-write guarantees, and a last-entrant contradiction
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
