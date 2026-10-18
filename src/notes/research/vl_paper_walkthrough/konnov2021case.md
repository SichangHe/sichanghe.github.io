# A case study on parametric verification of failure detectors
(authored by agents unless marked 🧑)
Tag: `konnov2021case`, [paper](https://doi.org/10.46298/LMCS-19%281:17%292023)

Page numbers below are the journal page numbers of the LMCS version (Tran, Konnov, Widder, LMCS 19(1), 2023, pages 17:1 to 17:52), written as p. 1 for 17:1.

## problem and result

The paper verifies safety and liveness of the Chandra–Toueg eventually perfect failure detector under partial synchrony, with both the number of processes and time bounds treated parametrically. Partial synchrony supplies a message-delay bound Δ and a relative-process-speed bound Φ. The paper studies the case of unknown Δ and Φ with GST T0 = 1, so the bounds hold in every execution from the start (Section 1, p. 2; Section 2, p. 4). The abstract states: “These characteristics make partially synchronous algorithms both parameterized and parametric, which render automated verification of partially synchronous algorithms challenging” (Abstract, p. 1). The paper’s method combines a cutoff proof, tool-specific encodings, model checking for fixed parameters (TLC, APALACHE, FAST), and inductive-invariant proofs in IVy for arbitrary Δ and Φ.

The paper’s algorithm is concrete: each process initializes `timeout[p,q]` and `suspected[p,q]`, periodically sends “alive,” suspects a process when it has not heard from it during the last timeout ticks, and on receiving “alive” from a suspected process increases the timeout by 1 and clears the suspicion (Algorithm 1, p. 3). The claimed contributions include both safety and liveness: “We demonstrate how to reduce the liveness properties Eventually Strong Accuracy, and Strong Completeness to safety properties” (Section 1, p. 2).

## technique 1: cutoff by symmetry and index projection

what it is

A cutoff reduces a parameterized proof over every process count to a fixed small instance. The paper defines a cutoff as a number k such that a property holds for every instance exactly when it holds for instances with k processes (Section 1, p. 2). It formalizes symmetric point-to-point algorithms: every process follows the same template, and transpositions of process indices preserve the template and the global system (Section 3, p. 5).

how to apply it

1. Define a process template whose state is a location, N sets of received messages, and N local values, with transitions for send, receive, local computation, crash, and stutter (Section 3.1, pp. 5–8).
2. Define the global system as N processes, N² point-to-point buffers, and N control components saying who may step. A global round has four sub-rounds, Schedule, Send, Receive, and Computation; crashes happen only in Schedule (Section 3.2, pp. 8–11). For partial synchrony, tag each message with its age and add constraints PS1 (message delay) and PS2 (relative speed) (Section 3.3, pp. 11–13).
3. Define an index transposition (i ↔ j) and its action on template states, global configurations, and receive transitions (Definitions 4.3–4.5, Section 4.1, pp. 14–15). Lemmas 4.6 and 4.7 say the transposition preserves the template and the global system (p. 15).
4. Project an N-process execution onto indices {1,2} (Constructions 4.8 and 4.9, pp. 15–16). Lemma 4.10 says the projection of an admissible sequence is admissible (p. 16). Lemma 4.12 builds the reverse direction by crashing processes 3..N from the beginning (p. 17), and Lemma 4.13 combines them into trace equivalence of G2 and GN (p. 17). Theorems 4.1 and 4.2 (p. 13) are the resulting cutoffs for one-index and two-index properties; detailed proofs are in Section 5 (pp. 18–35).
5. For the partial-synchrony case, Lemma 6.3 shows that the projection preserves PS1 and PS2, and Lemma 6.4 shows that the embedding with processes 3..N crashed from the beginning preserves them (Section 6, pp. 36–37). Theorems 6.1 and 6.2 state the cutoffs (pp. 35–36).
6. Verify the failure detector on one sender (process 1) and one receiver (process 2). The paper reduces the properties to `G((Correct(1) ∧ Correct(2)) ⇒ ¬Suspected(2,1))`, its F G form, and `F G((¬Correct(1) ∧ Correct(2)) ⇒ Suspected(2,1))` (Formulas 7.1–7.3, Section 7.1, p. 37). The sender runs only Task 1; the receiver runs the initialization, Task 2, and Task 3 (Section 7.1, p. 38).

verus form

Inference: In Verus, represent a finite process-index set, a process state, and buffers as ghost `Seq`/`Map`/`Set` values and define index-renaming and projection as `spec fn`s. State symmetry as quantified lemmas: renaming preserves the transition relation and the property predicate. Prove a two-process cutoff as a `proof fn` relating an arbitrary N-process trace to its projection and embedding. Use `requires` for the symmetry and transition assumptions and `ensures` for preservation. Verus does not automatically provide temporal model checking or an unbounded process family; the cutoff theorem itself must be proved in ghost code, and the product implementation must satisfy the modeled symmetry assumptions.

evidence and limits

The theorems cover the paper’s class and LTL\X formulas whose predicates take the allowed one- or two-index forms: P1(i) or P2(i,i) in Theorem 4.1, and P1(i), P2(j), P3(i,j), or P4(j,i) with i ≠ j in Theorem 4.2 (p. 13; Theorems 6.1–6.2, pp. 35–36). The point-to-point reduction in Section 7.1 also assumes that each process keeps messages to itself locally and that “communication between processes is point-to-point” (Section 7.1, p. 38). Inference: It does not justify checking two processes for a protocol with quorum thresholds, identities used asymmetrically, topology-dependent behavior, or a property mentioning three distinct process indices. The paper says that “the general parameterized verification problem is undecidable” and that existing cutoff results cannot be applied to this failure detector “because it relies on point-to-point communication and timeouts” (Section 11.1, p. 48). Inference: the cutoff proofs are written arguments in Sections 4–6 and many cases are given as “similar arguments”; the paper text I read contains no machine-checked version of them.

## technique 2: tool-specific message-buffer abstractions

what it is

The unbounded “alive” message buffer creates an infinite state space. The paper gives two encodings. With a predicate, `existsMsgOfAge(k)` says whether an in-transit message that is k time-units old exists (Section 7.2.1, p. 38). With a counter, a natural number `buf` has its kth bit set when such a message exists; `buf' = buf + 1` adds a fresh message and `buf' = buf × 2` ages every message by one (Section 7.2.2, p. 39). The paper states: “The first approach works for TLA+ and IVy, but not for counter automata (FAST). The latter is supported by all mentioned tools, but it is less efficient as it requires more transitions” (Section 7.2, p. 38).

how to apply it

1. Use the cutoff to keep only sender and receiver.
2. If using TLA+ or IVy, define `existsMsgOfAge(x)`. Formulas 7.4–7.5 describe a send (age-0 message added, others unchanged); Formulas 7.6–7.9 describe a delivery (at least one message removed, none older than Δ remain, none created) (Section 7.2.1, p. 38).
3. If using FAST, or if one encoding for all tools is needed, use the counter encoding. Delivery cannot be written with division in Presburger arithmetic, so the paper enumerates the possible values of `buf` and `buf'`, and the number of delivery transitions depends on Δ (Section 7.2.2, p. 39). Fig. 9 (p. 46) shows the FAST send transition.
4. Optionally bound the buffer with the abstraction of old messages: “our abstraction keeps only one old message that is ∆ time-units old, does not increase its age, and throws away other old messages” (Section 7.2.3, p. 40). Formulas 7.10–7.13 give the predicate version of the age increase, and Fig. 5 gives the counter version (pp. 40–41).
5. Encode relative speed with a timer per process (`sTimer`, `rTimer`). In the Schedule sub-round the environment either resets the timer to 0 or, if it is below Φ, increases it by 1; the process must step whenever its timer is 0 (Section 7.3, p. 41).

verus form

Inference: Use ghost maps from sender/receiver to age sets or age counts. Define transition lemmas for send, tick, and receive that preserve nonnegativity and the partial-synchrony age bound. The old-message abstraction can be a ghost predicate that keeps one message at age Δ and drops older ones; prove that the detector’s guards depend only on the abstraction. Verus arithmetic proofs can establish counter updates, but fairness and temporal eventuality still require a trace model and explicit well-founded arguments.

limits and evidence

The predicate encoding is unavailable in FAST because “the input language of FAST does not support functions” (Section 7.2.1, p. 39), and the counter encoding needs Δ fixed to stay in Presburger arithmetic (Section 7.2.2, p. 39; Section 10, p. 46). FAST is a semi-decision procedure and “could not prove Strong Accuracy in case of arbitrary Φ, and crashed after 30 minutes” (Section 9.2, p. 46). Inference: these are tool and encoding limits, not failures of the detector’s algorithm.

## technique 3: liveness-to-safety reduction

what it is

Eventually Strong Accuracy and Strong Completeness are liveness properties. The paper says: “Intuitively, these liveness properties are bounded; therefore, they become safety ones” (Section 8, p. 41). For Eventually Strong Accuracy, it shows that if `timeout[2,1]` stays below some constant on a path then the property holds on that path, then finds a threshold g depending only on Δ and Φ and checks the safety property G(timeout[2,1] ≥ g ⇒ ((Correct(1) ∧ Correct(2)) ⇒ ¬Suspected(2,1))) (Formula 8.3, Section 8.1, p. 42). For Strong Completeness, it adds a ghost variable hLFSC that counts how long the sender has been crashed without being suspected, and checks the safety property G(hLFSC = g′ ⇒ ((¬Correct(1) ∧ Correct(2)) ⇒ Suspected(2,1))) (Formula 8.6, Section 8.2, p. 42).

how to apply it

1. Use the two-process cutoff to reduce the quantified formulas to Formulas 8.1 and 8.4 on a sender and a receiver (Sections 8.1–8.2, pp. 41–42).
2. For Eventually Strong Accuracy, use three observations: correct processes send “alive” infinitely often (fairness, Line 5 of Algorithm 1); a message from an always-correct sender is received infinitely often (Constraint TC1); and a transition invariant says that receiving a message while suspecting increases `timeout[2,1]` by 1 (Formula 8.2) (Section 8.1, pp. 41–42).
3. For Strong Completeness, introduce `hLFSC`, set to 0 when the sender crashes and increased by 1 in every global step in which the receiver has not suspected the crashed sender (Formula 8.5, Section 8.2, p. 42).
4. Find thresholds g and g′ that depend only on Δ and Φ, and check Formulas 8.3 and 8.6. The paper notes that `timeout[2,1]` may start above g because the default timeout is a parameter (footnote 5, p. 42).
5. Prove the resulting safety property in IVy as part of an inductive invariant: “we reduced them into safety properties by applying a reduction technique in Section 8, and found inductive invariants containing the resulting safety properties” (Section 10, p. 47).
6. For GST > 0, the paper says additional inductive strengthenings are needed “because the global system is under asynchrony before GST” (Section 10, p. 48); extending the results to arbitrary GST is stated as future work (Section 12, p. 49).

verus form

Inference: Represent the reduction’s auxiliary variable (for example a ghost counter like `hLFSC`) as a ghost field. State the reduced safety property in an `invariant` block attached to a loop or in a `proof fn` over trace prefixes, then prove that each transition preserves it. Use `ensures` for the transition relation and separate lemmas for the threshold argument that the counter or timeout cannot grow forever. Do not encode `invariant(...)` as a function call; the Verus form must follow the verifier’s loop-invariant syntax.

limits

IVy supports a liveness-to-safety reduction, but “this technique is not fully automated, and IVy still needs user-guided inductive invariant for reduced safety properties” (Section 10, p. 48). The paper did not try IVy’s built-in reduction because “IVy has not supported reasoning techniques for clocks” (Section 10, p. 48). Inference: a Verus proof similarly needs a trusted argument that the threshold g (or g′) really bounds the auxiliary variable.

## technique 4: counterexample-guided invariant discovery and proof

what it is

The authors first model fixed small Δ and Φ in TLA+ (checked with TLC and APALACHE) and in FAST. Counterexamples for candidate inductive invariants at small parameters guide the strengthening; the invariants are then generalized to arbitrary bounds and proved in IVy. The paper says: “After obtaining inductive invariants in small cases, we can generalize them for cases of arbitrary bounds, and check with theorem provers, e.g., IVy” (Section 9.1, p. 43).

how to apply it

1. Build the TLA+ next-state relation with explicit scheduler, send, receive, computation, and message-age actions (Section 9.1, Figs. 6–8, pp. 43–44).
2. Run TLC or APALACHE with fixed Δ, Φ, and initial timeout. If a counterexample is found, analyze it and change the constraints of the inductive-invariant candidate (Section 9.1, p. 43).
3. Optionally run FAST on the counter-encoded model with fixed Δ; inspect its result or timeout (Section 9.2, pp. 45–46).
4. Generalize fixed constants to symbolic Δ and Φ, use the predicate encoding, and write an IVy invariant. The paper’s invariants “use non-linear integers, quantifiers, and uninterpreted functions” (Section 10, p. 47).
5. Supply strengthening steps only when IVy cannot discover them; Table 4 records the number of lines of strengthening steps provided.

verus form

Inference: Mirror this as counterexample-guided ghost invariant development: first instantiate bounded `u64` parameters and run executable tests or model exploration, then generalize to `nat`/integer ghost parameters and prove transition-preservation lemmas in Verus. Every candidate invariant must become a Verus `requires`/`ensures` fact or loop invariant; bounded testing remains a discovery aid, not proof evidence.

evidence and measured results

For fixed parameters, Table 1 reports Strong Accuracy with initial timeout 6 × Φ + ∆. With Δ=2, Φ=4 and a predicate buffer, TLC explored 10.2K states in 3 seconds at depth 176; with a counter buffer, it explored the same 10.2K states in 3 seconds, while FAST took 16 minutes (Table 1, p. 45). Table 2 initializes timeout to ∆ + 1 and reports violations; for Δ=2, Φ=4 with a predicate buffer, TLC found 840 states in 1 second at depth 43 (Table 2, p. 45). Table 3 reports inductive-invariant checks with a predicate buffer: Δ=4, Φ=40 Strong Accuracy took TLC 33 minutes over 347.3M states and APALACHE 12 seconds (Table 3, p. 45).

For arbitrary Δ and Φ, Table 4 reports IVy times and invariant sizes: Strong Accuracy with timeout `=6×Φ+Δ` took 4 seconds with a 30-line invariant and zero strengthening steps; Strong Completeness with timeout `≥6×Φ+Δ` took 22 seconds with a 124-line invariant and 15 lines of strengthening steps (Table 4, p. 47). The paper adds that “it took us about 4 weeks to learn IVy from scratch, and to prove these inductive invariants” (Section 10, p. 47). The denominators are one verification run per table row, not a benchmark population. Inference: these measurements show feasibility for this model, not a general speed comparison across distributed protocols.

## what is proved and trusted; implications for VL

The paper’s claims are: cutoff theorems with written proofs (Sections 4–6); safety for fixed parameters by model checking (Section 9); and IVy inductive invariants for Strong Accuracy, Eventually Strong Accuracy, and Strong Completeness for arbitrary Δ and Φ with GST T0 = 1 (Table 4, p. 47). The paper itself says its specifications are outside IVy’s decidable theories (Section 10, p. 47). Inference: the trusted boundary includes the process/buffer semantics, the fairness assumptions, the cutoff proof, each tool’s kernel, and the correctness of the encodings. Inference: agent-written verified Rust faces risk from a wrong network model, an unjustified cutoff, omitted fairness, or a ghost abstraction that does not match runtime buffering; Verus can check the resulting arithmetic and transition lemmas but does not remove those modeling assumptions.

The paper conjectures that “correctness of other partially synchronous algorithms may be proven by following the presented methodology” (Abstract, p. 1). The methodology it presents is: prove symmetry and cutoffs, tune state representation to each solver, use model checking at small parameters to discover invariants, reduce liveness to safety, then prove generalized invariants. Inference: VL should reuse that workflow for verified Rust protocol components instead of redoing ad hoc bounded checks without a cutoff argument. The method does not directly verify arbitrary Rust code or arbitrary GST; the paper says GST > 0 needs additional strengthenings (Section 10, p. 48).

## techniques for the catalog

- symmetry cutoff by index projection — prove that one- and two-process instances preserve the relevant LTL\X properties of every N-process instance
- message-buffer abstraction — encode ages as a predicate or a bit-encoded counter and keep one message at age Δ in place of all older ones
- relative-speed timers — represent partial synchrony’s Φ bound through scheduler timers that reset or count up to Φ
- liveness-to-safety reduction — bound a timeout or a ghost counter by a threshold g that depends only on Δ and Φ, so eventual accuracy/completeness become safety checks
- counterexample-guided invariant discovery — use fixed-parameter TLC/APALACHE counterexamples to shape generalized IVy invariants
- parametric inductive proof — prove quantified, nonlinear invariants for arbitrary Δ and Φ in IVy
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Now we present how to construct an admissible path of GN from a given admissible path of G2 with Lemma 4.12 below."): read the whole paper text (LMCS version, pages 17:1 to 17:52) and checked every quotation, the Table 1–4 numbers, section and page references, and each technique step against it; changed the link to the DOI printed in the paper (the arXiv link is not in the paper text), converted page references to journal page numbers and corrected them, rewrote the counter-buffer description (a bit encoding, not counts by age), the old-message abstraction (keep one message at age Δ, drop older ones), the liveness-to-safety steps (timeout threshold g and ghost variable hLFSC, not a generic phase variable) and the cutoff lemma list, removed unsupported claims (contents of the IVy invariants, "bounded model checking" for TLC, a "round scheduler" component), added the GST T0 = 1 scope, and marked my own conclusions "Inference:"; did not check the Section 5 proofs line by line, the related work or the paper's tool artifacts, and kept the tag as is although its year 2021 is the arXiv submission year and the journal date is 2023.
