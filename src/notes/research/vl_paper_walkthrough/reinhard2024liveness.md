# Semi-Automated Modular Formal Verification of Critical Software: Liveness and Completeness Thresholds
(authored by agents unless marked 🧑)
Tag: `reinhard2024liveness`, [paper](https://doi.org/10.48550/arxiv.2403.00934)

## scope

This dissertation contains two techniques that address different limits of automated verification. Chapter 3 introduces ghost signals: a separation logic that proves termination of concurrent busy waiting modularly under fair scheduling. Chapter 4 introduces completeness thresholds (CTs): input subdomains extracted from verification conditions (VCs) such that a bounded memory-safety proof implies an unbounded one for an analyzed program class. The paper defines liveness as eventual progress: “We call a program live if something good eventually happens.” (Introduction, p. 2) It defines a CT for a program parameter `x` as a subdomain sufficient to transfer a proof from that subdomain to the whole input domain (Sec. 4.3, p. 46).

## technique: ghost signals for modular termination

What it is. A ghost signal is a proof-only witness for an event another thread promises to perform. Creating one also creates an obligation to set it. The paper explains: “Signals are initially unset and come with an obligation to set them.” (Sec. 3.1, p. 18) The program need not contain a physical flag; ghost signals can be erased after verification. A busy-wait loop is tied to a finite set of signals. Every non-finishing iteration must show that at least one waited-for signal is still unset, and levels prevent direct or indirect self-waiting.

When to use it. Use this technique when a thread loops until another thread changes shared state, such as a producer/consumer queue, a lock, or a flag. The proof is modular: each thread and function is verified in isolation, while fairness and soundness are proved once for the logic (Sec. 3.1, p. 18).

How to apply it.
1. Choose a well-founded partially ordered level set and assign each signal a level (Sec. 3.2.1, pp. 22–24).
2. Create an unset signal and an obligation to set it. In the augmented semantics, `new_signal` adds both a `signal((id,L))` chunk and an obligation (Fig. 3.2, p. 22).
3. Transfer obligations on fork; a thread cannot finish while retaining an obligation (Sec. 3.2.1, p. 22).
4. For every busy-wait iteration, prove the waited-for signal is unset and that its level is lower than every held obligation. This is the side condition `s.lev ≺L O` of `Aug-Red-Await` (Fig. 3.2, p. 22).
5. Discharge the obligation by setting the signal. The proof rule `PR-SetSignal` consumes the obligation and changes the signal to true (Fig. 3.3, p. 26).
6. Prove every thread terminates with an empty obligation chunk: the paper states that proving `⊢ {obs(∅)} c {obs(∅)}` suffices (Sec. 3.2.1, p. 25).

Why levels prove termination. If infinitely many signals were waited for, choose one with minimal level. The path carrying its obligation would have to be infinite by fairness, but it can wait only for lower-level signals, which are waited for finitely often; this contradiction proves there are no fair infinite augmented executions (Sec. 3.2.1, pp. 23–24). Well-foundedness is required so every nonempty level set has a minimal element.

Verus form. Inference: represent each ghost signal and obligation as a `tracked` or ghost token indexed by a level, with a predicate recording `unset`/`set`. A producer `proof fn` consumes an obligation token and returns a set token; a consumer loop carries a `while` `invariant` stating that the relevant signal is unset on non-finishing iterations and that its level is below held obligations. Encode fairness as an assumption in the model or as a scheduler specification; Verus does not itself supply a fair-concurrency semantics. Use ordinary Rust atomics/mutexes for runtime synchronization, while ghost tokens and predicates disappear from executable code.

Evidence. The authors formally define and soundness-prove the logic in Appendix A and a generalized version in technical report Appendix B (Secs. 3.2.4 and 3.8, pp. 35, 42). They verify a bounded FIFO and a CLH lock in VeriFast. The FIFO proof has 160 annotation lines for 37 code lines and takes 0.08 seconds; the CLH proof has 343 annotation lines for 49 code lines and takes 0.1 seconds (Sec. 3.5, p. 40). These are one proof run per artifact, not success rates or repeated-run averages.

## technique: mutex invariants and arbitrary conditions

Physical signals that are not thread-safe require exclusive ownership and a mutex. A signal chunk `signal((sig,L),b)` is non-duplicable; holding it grants the right to read or write the signal. A mutex carries a lock invariant `P` that abstracts protected resources. The paper's invariant is `P := ∃b. signal(s,b)`, and acquiring the mutex yields the signal resource while releasing it restores `P` (Secs. 3.2.2, pp. 27–30).

Apply it as follows.
1. Protect the shared cell and signal with a mutex; define `P` to include both and their relation (Sec. 3.2.2, p. 33).
2. Require signal reads and writes to hold the signal chunk, preventing races (Sec. 3.2.2, pp. 27–29).
3. Give mutex acquisition a level and create a release obligation; release discharges it (Sec. 3.2.2, p. 30).
4. Insert a signal whenever a condition `C` is established, set it atomically with `C`, and prove an invariant that the signal value is equivalent to `C` (Sec. 3.2.3, p. 33).
5. Erase the physical signal and retain it as a ghost signal once the proof is complete (Sec. 3.2.4, pp. 34–35).

The minimal heap example uses `P := ∃v. x 7→ v ∗ signal(s, v = 1)` to tie a signal to whether cell `x` equals one (Sec. 3.2.3, p. 33). Inference: in Verus, encode `P` as a predicate over a mutex-protected view of the cell and ghost signal state; use `invariant` on the critical-section loop and `old(...)` in `ensures` when relating pre-state values. Verus's Rust ownership and borrow rules can enforce some exclusivity, but the proof-level signal/obligation relation and fairness argument remain inferred encodings.

## technique: finite sets of ranked signals for producer/consumer liveness

The realistic example has a bounded FIFO of capacity 10. A producer pushes 100 down to 1; a consumer pops them. The producer waits when full and the consumer waits when empty (Sec. 3.3, pp. 35–39). Allocate signal IDs for each possible push and pop event, initialize at most one active signal of each kind, and assign levels `Lpop = 102 − i` and `Lpush = 101 − i`. The inequalities `s_pop^(i+10).lev < s_push^i.lev < s_pop^i.lev` prevent cycles (Sec. 3.3, pp. 37–39). Each thread discharges its current obligation before initializing the next signal, and both signals are protected by the mutex invariant. The paper says, “Since we proved that each thread discharged all its obligations, we proved that the program terminates.” (Sec. 3.3, p. 39)

Inference: a Verus implementation would use a finite ghost map from queue counters to signal states, with a loop invariant tying queue occupancy and active obligations to the counter. The runtime queue remains ordinary Rust; the rank and obligation map is proof-only.

## technique: completeness thresholds from verification conditions

What it is. A CT is a subdomain `Q ⊆ X` such that proving a property for inputs in `Q` proves it for every input in `X`. The dissertation states: “For us, a CT is not a number k. Instead it is a subdomain Q ⊆ X of an input domain X that is big enough to ensure that a bounded proof only exploring Q covers all relevant cases.” (Introduction, p. 7) This differs from finite-state model checking, where a CT is usually a path-length number.

When to use it. Use CT extraction for bounded proofs of programs whose verification condition becomes independent of an input-size parameter after partitioning. The demonstrated class `Trav` loops over array indices `i = L … s−R` and reads `a[i+Z]` (Sec. 4.2, pp. 45–46).

How to apply it to array traversal.
1. Write a separation-logic specification, such as `{array(a,s)} trav^Z_{L,R} {array(a,s)}`, where `array(a,s)` owns the `s` cells (Sec. 4.3.1, pp. 47–48).
2. Generate a VC, preferably a weakest liberal precondition. The canonical VC is `∀x. A → wlp(c, λr.B)` (Sec. 4.3.1, p. 49).
3. Simplify the VC by eliminating tautological pre/post conjuncts and expanding the array predicate. For `Trav`, the paper reduces it to `∀i. (L ≤ i ≤ s−R) → (0 ≤ i+Z < s)` (Sec. 4.3.1, pp. 50–51).
4. Partition the input domain at the point where the loop becomes nonempty: sizes below `L+R` are vacuously safe; sizes at least `L+R` share the same error conditions (Sec. 4.3, pp. 46–47).
5. Rewrite the large-size VC until `s` disappears. For the traversal class, a single representative `q ≥ L+R` is sufficient, so `{q}` is a CT (Sec. 4.3, pp. 46–47).
6. Check only the representative sizes with BMC or another bounded verifier, and transfer the result to all sizes using the CT theorem.

The paper warns that a VC may over-approximate program behaviour. An extracted CT transfers back to the program only when the VC is precise in the parameter; an unsatisfiable VC is a counterexample to naive transfer (Sec. 4.3.1, pp. 49–50). Inference: a Verus workflow could generate a quantified proof obligation, partition a size parameter, and use a bounded `for` proof only after proving precision; ordinary Verus verification does not automatically discover CTs.

## technique: VC slicing and compositional CTs

If a VC factors as `ax ∗ ay`, where parameter `x` occurs only in `ax`, any CT for `x` in `ax` is a CT for the whole assertion. This is Lemma 4.3.4, “VC Slicing” (Sec. 4.3.2, pp. 52–53). Apply it by separating the array-traversal VC from unrelated data-structure computation, then analyze only the conjunct containing the parameter. For sequential composition, if the VC is `vc1 ∧ vc2` and `Qi` is a CT for `vci`, then `Q1 ∪ Q2` is a CT for the combined program (Sec. 4.3.2, p. 53). For conditionals, combine constraint sets as `(e ∧ K1) ∪ (¬e ∧ K2)` (Sec. 4.3.2, p. 54).

Inference: in Verus, this suggests splitting lemmas and loop invariants by independent parameters and proving a small representative set only after showing the remaining conjuncts do not mention that parameter. The paper's separation-logic `∗` is not the same as a Verus Boolean conjunction; ownership separation must be modeled with views or tracked tokens.

## appendix techniques: formal soundness and generalized thresholds

Appendix A gives the executable proof model behind ghost signals. It defines a small-step language with fork, shared heaps, mutexes, and loops; a fair reduction sequence requires every still-running thread to be scheduled eventually (Defs. A.2.8–A.2.10, pp. 73–74). Logical heaps map resources to rational ownership fractions, and assertions include points-to, mutex, signal, obligation, separating conjunction, and view shifts (Defs. A.3.1–A.3.10, pp. 76–78). The central theorem is: “Let ⊢ {obs(∅)} c {obs(∅)} hold. There exists no fair, infinite reduction sequence (hi , Pi )i∈N with h0 = ∅ and P0 = {(θ0 , c)} for any choice of θ0 .” (Theorem A.3.11, p. 78)

Inference: this theorem is the machine-checkable contract a Verus port would need to approximate: a proof that all obligations are discharged implies no fair infinite execution. The appendix's `PR-Await` rule generalizes a loop to a finite set of waited-for signals and requires a signal relation and lower-level side condition (Fig. A.7, p. 80); this is stronger than the single-signal presentation in Section 3.

Appendices C and D formalize CT extraction. Appendix C defines a VC as an assertion whose validity implies program safety and proves that a CT extracted from a VC transfers to the program when the VC is precise in the parameter (Theorem C.8.3, p. 175). Its iterative workflow is: compute a VC, maintain the current domain, factor out subformulas independent of the parameter, extract a smaller threshold, and repeat until no improvement (Workflow C.8.10, pp. 178–179). Appendix C also provides a reusable bounded-array lemma: any representative `q` above the loop's lower-bound condition is a CT (Lemma C.8.11, p. 179).

Appendix D generalizes CTs from memory safety to arbitrary correctness predicates, including liveness and functional correctness. It defines correctness properties with universal or existential quantifiers and states that CT soundness again requires VC precision (Defs. D.2.1–D.2.7 and Theorem D.2.11, pp. 182–184). Inference: this generalization is directly relevant to VL because a threshold could, in principle, reduce bounded checks for termination or functional postconditions, but only after proving precision for the chosen Verus specification.

## what is proved, trusted, and measured

For ghost signals, the soundness argument reduces liveness to safety of obligations, levels, and resource ownership under fair scheduling. The augmented semantics contains ghost resources, but every augmented execution corresponds to a real execution after erasure (Sec. 3.2.1, p. 21). The VeriFast encoding adds a thread-phase rule to prevent self-fueling loops and places other logic aspects in a trusted header as axioms (Sec. 3.5, p. 40). Inference: that trusted header and VeriFast's checker are part of the trusted base; the reported timings do not measure this trust.

For CTs, the proof is about memory safety of the analyzed array-traversal class and about VC precision. It does not show that arbitrary BMC bounds are safe, nor that every program's VC is precise. The planned FreeRTOS TCP/IP evaluation and speedup experiment are future work, not results (Sec. 5.2, pp. 62–63). No aggregate number of industrial programs or speedup is reported.

Inference: VL should reuse the ghost-signal/obligation pattern for verified Rust concurrency and the CT idea for reducing bounded checks of size-indexed data. Existing work already supplies the liveness logic, a VeriFast implementation, and CT extraction for arrays; redoing a generic busy-wait calculus or claiming bounded checks are unbounded without a precision proof would duplicate known work. Inference: threat to a product of agent-written verified Rust is high for fairness assumptions, forgotten obligations, and imprecise VCs; it is lower when Verus checks local ownership and every CT transfer is accompanied by a machine-checked precision argument.

## techniques for the catalog

- ghost signals: tie each busy-wait loop to proof-only signals with obligations and well-founded levels
- mutex and condition invariants: protect non-thread-safe shared state and maintain a signal-to-condition equivalence
- ranked signal sets: use finite event signals and decreasing levels to prove producer-consumer termination
- completeness thresholds: extract representative input subdomains from VCs so bounded memory proofs imply unbounded ones
- VC slicing: ignore separated VC conjuncts that do not mention the parameter whose threshold is being computed
- CT combinators: combine thresholds by union for sequential composition and guarded union for conditionals

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
