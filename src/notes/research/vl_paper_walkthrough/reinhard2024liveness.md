# Semi-Automated Modular Formal Verification of Critical Software: Liveness and Completeness Thresholds
(authored by agents unless marked 🧑)
Tag: `reinhard2024liveness`, [paper](https://arxiv.org/abs/2403.00934)

## scope

This dissertation contains two techniques that address different limits of automated verification. Chapter 3 introduces ghost signals: a separation logic that proves termination of concurrent busy waiting modularly under fair scheduling. Chapter 4 studies completeness thresholds (CTs): input subdomains that suffice for unbounded memory-safety proofs of certain array traversals. Thresholds extracted from verification conditions (VCs) transfer to programs under a precision condition (Theorem C.8.3, p. 175). The paper defines liveness as eventual progress: “We call a program live if something good eventually happens.” (Introduction, p. 2) It defines a CT for a program parameter `x` as a subdomain sufficient to transfer a proof from that subdomain to the whole input domain (Sec. 4.3, p. 46).

## technique: ghost signals for modular termination

What it is. A ghost signal is a proof-only witness for an event another thread promises to perform. Creating one also creates an obligation to set it. The paper explains: “Signals are initially unset and come with an obligation to set them.” (Sec. 3.1, p. 18) The program need not contain a physical flag; ghost signals can be erased after verification. A busy-wait loop is tied to a finite set of signals. Every non-finishing iteration must show that at least one waited-for signal is still unset, and levels prevent direct or indirect self-waiting.

When to use it. Use this technique when a thread loops until another thread changes shared state, such as a producer/consumer queue, a lock, or a flag. The proof is modular: “By modularly, we mean that we reason about each thread and each function in isolation.” Fair scheduling is an assumption, needed to ensure the responsible thread runs often enough (Sec. 3.1, p. 17).

How to apply it.
1. Choose a well-founded partially ordered level set and assign each signal a level (Sec. 3.2.1, pp. 22–24).
2. Create an unset signal and an obligation to set it. In the augmented semantics, `new_signal` adds both a `signal((id,L))` chunk and an obligation (Fig. 3.2, p. 22).
3. Transfer obligations on fork; a thread cannot finish while retaining an obligation (Sec. 3.2.1, pp. 21–23).
4. For every busy-wait iteration, prove the waited-for signal is unset and that its level is lower than every held obligation. This is the side condition `s.lev ≺L O` of `Aug-Red-Await` (Fig. 3.2, p. 22).
5. In the final ghost-signal logic, set the signal and discharge its obligation using the view shift `VS-SetSignal`: `obs(O ⊎ {[s]}) ∗ signal(s, _) ⇛ obs(O) ∗ signal(s, True)` (Fig. 3.9b, p. 36). The earlier `PR-SetSignal′` applies to physical thread-safe signals (Fig. 3.3b, p. 26).
6. Prove the triple `⊢ {obs(∅)} c {obs(∅)}` using the logic’s rules, which justify loops and require empty obligations at thread completion (Sec. 3.2.1, p. 25; Theorem A.3.11, p. 78).

Why levels prove termination. Suppose some signals are waited for infinitely often; choose one of minimal level among them. Fairness makes the path carrying its undischarged obligation infinite. That path can wait only for lower-level signals, each waited for finitely often, contradicting its infinitude (Sec. 3.2.1, pp. 23–24). Well-foundedness supplies the minimal level. The formal proof also uses finite signal sets and a decreasing rank for control-flow paths, then applies Weak König’s Lemma to exclude an infinite program-order graph (Lemmas A.4.33–A.4.35, pp. 96–99).

Verus form. Inference: a port could represent signals and obligations with tracked tokens indexed by levels. It would need an explicit concurrent execution model, a fair-scheduling assumption, and a soundness proof connecting token rules to termination. Token bookkeeping and loop invariants alone do not establish that connection. The dissertation implements the logic in VeriFast; it does not demonstrate a Verus port.

Evidence. The authors formally define and soundness-prove the logic in Appendix A and a generalized version in technical report Appendix B (Secs. 3.2.4 and 3.8, pp. 35, 42). They verify a bounded FIFO and a CLH lock in VeriFast. The FIFO proof has 160 annotation lines for 37 code lines and takes 0.08 seconds; the CLH proof has 343 annotation lines for 49 code lines and takes 0.1 seconds (Sec. 3.5, p. 40). The dissertation does not specify repetition counts or an averaging procedure for these timings.

## technique: mutex invariants and arbitrary conditions

Physical signals that are not thread-safe require exclusive ownership and a mutex. A signal chunk `signal((sig,L),b)` is non-duplicable; holding it grants the right to read or write the signal. A mutex carries a lock invariant `P` that abstracts protected resources. The paper's invariant is `P := ∃b. signal(s,b)`, and acquiring the mutex yields the signal resource while releasing it restores `P` (Secs. 3.2.2, pp. 27–30).

Apply it as follows.
1. Protect the shared cell and signal with a mutex; define `P` to include both and their relation (Sec. 3.2.3, pp. 32–33).
2. Require signal reads and writes to hold the signal chunk, preventing races (Sec. 3.2.2, pp. 27–29).
3. Assign a level to each mutex. Acquisition requires its level to be lower than every held obligation and creates a release obligation; releasing the mutex discharges that obligation (Sec. 3.2.2, p. 30).
4. Insert a signal for each waited-for condition `C`; set it when establishing `C` and prove an invariant relating its value to `C`. In the heap-cell example, both updates occur in the same mutex-protected critical section (Sec. 3.2.3, pp. 32–33).
5. Erase the physical signal and retain it as a ghost signal once the proof is complete (Sec. 3.2.4, pp. 34–35).

The minimal heap example uses `P := ∃v. x 7→ v ∗ signal(s, v = 1)` to tie a signal to whether cell `x` equals one (Sec. 3.2.3, p. 33). Inference: a Verus port could encode `P` over protected cell and signal state, while separately proving that its synchronization and obligation rules support the fair-termination argument.

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
6. Prove memory safety for the representative sizes, covering all executions for those sizes. A bounded proof of the corresponding VC suffices; transferring bounded program-safety proofs via a VC-derived CT additionally uses precision in the size parameter (Theorem C.8.3, p. 175). This does not remove unrelated execution-depth bounds (Sec. 4.3, p. 46).

The paper warns that a VC may over-approximate program behaviour; its unsatisfiable-VC example refutes unrestricted transfer from VC thresholds to program thresholds (Sec. 4.3.1, pp. 49–50). Precision in the parameter is a sufficient condition for transfer: program safety at each fixed parameter value must imply validity of the corresponding VC (Definition C.7.2, p. 173; Theorem C.8.3, p. 175). Inference: a Verus workflow could partition a quantified size parameter and prove a representative-size reduction, with precision established whenever it transfers a VC-derived threshold to bounded program-safety checks.

## technique: VC slicing and compositional CTs

If a VC factors as `ax ∗ ay`, where parameter `x` occurs only in `ax`, any CT for `x` in `ax` is a CT for the whole assertion. This is Lemma 4.3.4, “VC Slicing” (Sec. 4.3.2, pp. 52–53). Apply it by separating the array-traversal VC from unrelated data-structure computation, then analyze only the conjunct containing the parameter. For sequential composition, if the combined VC rewrites to `∀x. vc1 ∧ vc2` and `Qi` is a CT for `x` in `vci`, then `Q1 ∪ Q2` is a CT for that VC (Sec. 4.3.2, p. 53). The chapter also sketches conditional constraint sets `(e ∧ K1) ∪ (¬e ∧ K2)` (Sec. 4.3.2, p. 54); transferring VC thresholds to program thresholds still needs justification.

Inference: in Verus, this suggests splitting lemmas and loop invariants by independent parameters and proving a small representative set only after showing the remaining conjuncts do not mention that parameter. The paper's separation-logic `∗` is not the same as a Verus Boolean conjunction; ownership separation must be modeled with views or tracked tokens.

## appendix techniques: formal soundness and generalized thresholds

Appendix A gives the formal proof model behind ghost signals. It defines a small-step language with fork, shared heaps, mutexes, and loops; a fair reduction sequence requires every still-running thread to be scheduled eventually (Defs. A.2.8–A.2.10, pp. 73–74). Logical heaps map resources to nonnegative rationals; assertions describe points-to, mutex, signal, and obligation resources using separating conjunction. View shifts form a separate relation for logical implications and ghost-state changes (Defs. A.3.1–A.3.10, pp. 76–78). The central theorem is: “Let ⊢ {obs(∅)} c {obs(∅)} hold. There exists no fair, infinite reduction sequence (hi , Pi )i∈N with h0 = ∅ and P0 = {(θ0 , c)} for any choice of θ0 .” (Theorem A.3.11, p. 78)

Inference: a Verus port would need an analogous theorem connecting its proof rules to the absence of fair infinite executions. Appendix A’s `PR-Await` supports finite sets of waited-for signals and permits the obligations to change across iterations (Fig. A.7, p. 80). Chapter 3 already introduces finite signal sets in Section 3.3 (p. 37).

Appendices C and D formalize CT extraction. Appendix C defines a VC as an assertion whose validity implies program safety and proves that a CT extracted from a VC transfers to the program when the VC is precise in the parameter (Theorem C.8.3, p. 175). Its iterative workflow is: compute a VC, maintain the current domain, factor out subformulas independent of the parameter, extract a smaller threshold, and repeat until no improvement (Workflow C.8.10, pp. 178–179). For `vc(s) = ∀i ∈ Z. a ≤ i < s+b → 0 ≤ i+Z < s`, Appendix C’s reusable array lemma states that `{q}` is a CT whenever `q > a−b` (Lemma C.8.11, p. 179). This uses an exclusive upper loop bound, unlike Chapter 4’s inclusive bound.

Appendix D generalizes CTs from memory safety to arbitrary correctness predicates, including liveness and functional correctness. It defines correctness properties with universal or existential quantifiers and gives VC precision as a sufficient condition for transferring CTs (Defs. D.2.1–D.2.7 and Theorem D.2.11, pp. 182–184).

## what is proved, trusted, and measured

For ghost signals, the soundness argument reduces liveness to safety of obligations, levels, and resource ownership under fair scheduling. Every augmented execution corresponds to a real execution after erasure (Sec. 3.2.1, p. 21). The termination proof uses the converse construction for verified programs: every fair infinite real execution would yield a corresponding augmented execution, which the logic rules out (Sec. 3.2.1, p. 23). The VeriFast encoding adds a thread-phase rule to prevent self-fueling loops and places other logic aspects in a trusted header as axioms (Sec. 3.5, p. 40). Inference: that trusted header and VeriFast's checker are part of the trusted base; the reported timings do not measure this trust.

For CTs, the proof is about memory safety of the analyzed array-traversal class and about VC precision. It does not show that arbitrary BMC bounds are safe, nor that every program's VC is precise. The planned FreeRTOS TCP/IP evaluation and speedup experiment are future work, not results (Sec. 5.2, pp. 62–63). No completed industrial CT evaluation or measured CT speedup is reported.

## techniques for the catalog

- ghost signals: tie each busy-wait loop to proof-only signals with obligations and well-founded levels
- mutex and condition invariants: protect non-thread-safe shared state and maintain a signal-to-condition equivalence
- ranked signal sets: use finite event signals and well-founded level constraints to prove producer-consumer termination
- completeness thresholds: extract representative input subdomains from VCs so bounded memory proofs imply unbounded ones
- VC slicing: ignore separated VC conjuncts that do not mention the parameter whose threshold is being computed
- CT combinators: combine thresholds for conjunctive VCs by union; the chapter sketches guarded constraint sets for conditionals
