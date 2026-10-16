# A case study on parametric verification of failure detectors
(authored by agents unless marked 🧑)
Tag: `konnov2021case`, [paper](http://arxiv.org/abs/2112.08826v4)

## problem and result

The paper verifies safety and liveness of the Chandra–Toueg eventually perfect failure detector under partial synchrony, with both the number of processes and time bounds treated parametrically. Partial synchrony supplies a message-delay bound Δ and a relative-process-speed bound Φ after stabilization. The abstract states: “These characteristics make partially synchronous algorithms both parameterized and parametric, which render automated verification of partially synchronous algorithms challenging” (Abstract, p. 1). The paper’s method combines a cutoff proof, tool-specific encodings, bounded model checking for fixed parameters, and inductive-invariant proofs for arbitrary Δ and Φ.

The paper’s algorithm is concrete: each process initializes `timeout[p,q]` and `suspected[p,q]`, periodically sends “alive,” suspects a process when no message arrives within the timeout, then increases the timeout and clears suspicion on receiving “alive” (Algorithm 1, p. 2). The claimed contributions include both safety and liveness: “We demonstrate how to reduce the liveness properties Eventually Strong Accuracy, and Strong Completeness to safety properties” (Section 1, p. 2).

## technique 1: cutoff by symmetry and index projection

what it is

A cutoff reduces a parameterized proof over every process count to a fixed small instance. The paper defines a cutoff as a number k such that a property holds for every instance exactly when it holds for instances with k processes (Section 1, p. 2). It formalizes symmetric point-to-point algorithms: every process follows the same template, and transitions and predicates are invariant under renaming process indices.

how to apply it

1. Define a process template with control state, local variables, received-message state, and transitions for send, receive, computation, crash, and stutter (Sections 3.1–3.2, pp. 7–12).
2. Define the global system as N copies of the template plus point-to-point buffers and a round scheduler.
3. Define an index transposition and its action on local states, global configurations, transitions, and predicates (Section 4.1, pp. 13–15).
4. For a two-process instance, project an N-process execution onto indices `{1,2}`. The paper proves that the projection preserves admissibility and transitions (Lemmas 4.6–4.10, Sections 4–5, pp. 16–26).
5. For the partial-synchrony case, prove that the projection preserves both PS1 (message age/delay) and PS2 (relative speed), and construct the reverse embedding by crashing processes 3 through N from the beginning (Theorems 6.1 and 6.2, Section 6, pp. 35–37).
6. Verify the failure detector on one sender and one receiver. The paper reduces the properties to `G((Correct(1) ∧ Correct(2)) ⇒ ¬Suspected(2,1))`, its eventual form, and eventual suspicion of a crashed process (Section 7.1, pp. 37–38).

verus form

Inference: In Verus, represent a finite process-index set, a process state, and buffers as ghost `Seq`/`Map`/`Set` values and define index-renaming and projection as `spec fn`s. State symmetry as quantified lemmas: renaming preserves the transition relation and the property predicate. Prove a two-process cutoff as a `proof fn` relating an arbitrary N-process trace to its projection and embedding. Use `requires` for the symmetry and transition assumptions and `ensures` for preservation. Verus does not automatically provide temporal model checking or an unbounded process family; the cutoff theorem itself must be proved in ghost code, and the product implementation must satisfy the modeled symmetry assumptions.

evidence and limits

The theorem is exact only for the paper’s class and LTL\X properties whose predicates have the allowed one- or two-index forms (Theorems 6.1–6.2, p. 35). Inference: It does not justify checking two processes for a protocol with quorum thresholds, identities used asymmetrically, topology-dependent behavior, or a property mentioning three distinct process indices. The paper explicitly notes that general parameterized verification is undecidable and that unrelated cutoff results cannot be applied to this point-to-point timeout algorithm (Section 11.1, p. 48).

## technique 2: tool-specific message-buffer abstractions

what it is

The unbounded “alive” message buffer creates an infinite state space. The paper gives two encodings. A predicate `existsMsgOfAge(k)` records whether any in-transit message has age k; a counter records the number of messages by age. It states: “The first approach works for TLA+ and IVy, but not for counter automata (FAST). The latter is supported by all mentioned tools, but it is less efficient as it requires more transitions” (Section 7.2, p. 38).

how to apply it

1. Use the cutoff to keep only sender and receiver.
2. If using TLA+ or IVy, define `existsMsgOfAge(k)` and update it when time advances, a message is sent, or a message is received (Section 7.2.1, pp. 38–39).
3. If using FAST, or if a common encoding is needed, use age counters; increment ages, add a fresh age-zero message, and decrement/remove a message on receive (Section 7.2.2, pp. 39–40; Fig. 9, p. 46).
4. Abstract messages older than Δ by a predicate or region because their exact age no longer affects delivery under the partial-synchrony assumption (Section 7.2, pp. 38–40).
5. Encode relative process speed with counters over natural numbers and a scheduler that bounds how long a process can remain inactive (Section 7.3, pp. 40–41).

verus form

Inference: Use ghost maps from sender/receiver to age sets or age counts. Define transition lemmas for send, tick, and receive that preserve nonnegativity and the partial-synchrony age bound. An “older-than-Δ” abstraction can be a ghost predicate that merges all ages above Δ; prove that the detector’s guards depend only on the abstraction. Verus arithmetic proofs can establish counter updates, but fairness and temporal eventuality still require a trace model and explicit well-founded arguments.

limits and evidence

The predicate encoding is unavailable in FAST because FAST does not support functions; the counter encoding works everywhere but adds transitions (Section 7.2, p. 38). FAST is a semi-decision procedure and “could not prove Strong Accuracy in case of arbitrary Φ, and crashed after 30 minutes” (Section 9.2, p. 46). These are tool and encoding limits, not failures of the detector’s algorithm.

## technique 3: liveness-to-safety reduction

what it is

Eventually Strong Accuracy and Strong Completeness are liveness properties. The paper transforms each into a safety property by adding state that records whether a violation has persisted or whether the required eventual condition has been reached, then proves an inductive invariant containing the reduced safety claim (Section 8, pp. 41–43).

how to apply it

1. Use the two-process cutoff to reduce the quantified liveness formula to a sender/receiver pair (Section 8.1–8.2, pp. 41–43).
2. Introduce auxiliary variables that track the stabilization/timeout phase and the condition that must eventually hold.
3. Express the reduced property as an invariant over every reachable state.
4. Prove initiation and consecution of that invariant with IVy. The invariant includes the original detector state relations, buffer-age constraints, and the reduced safety predicate (Section 10, pp. 46–48).
5. For arbitrary GST or other partial-synchrony variants, add strengthening invariants for the pre-GST asynchronous prefix; the paper says this is future work (Section 10, p. 48; Section 12, p. 49).

verus form

Inference: Represent the reduction’s auxiliary phase and “bad forever” state as ghost fields. State the reduced safety property in an `invariant` block attached to a loop or in a `proof fn` over trace prefixes, then prove that each transition preserves it. Use `ensures` for the transition relation and separate lemmas for eventuality-to-safety well-foundedness. Do not encode `invariant(...)` as a function call; the Verus form must follow the verifier’s loop-invariant syntax.

limits

IVy supports a liveness-to-safety reduction, but “this technique is not fully automated, and IVy still needs user-guided inductive invariant for reduced safety properties” (Section 10, p. 48). The paper did not try IVy’s built-in reduction because IVy lacked clock reasoning (Section 10, p. 48). Inference: A Verus proof similarly needs a trusted argument that the auxiliary ranking or phase cannot postpone the eventual condition forever.

## technique 4: counterexample-guided invariant discovery and proof

what it is

The authors first model fixed small Δ and Φ in TLA+ and FAST. Counterexamples and successful bounded runs expose the shape of invariants; those invariants are generalized to arbitrary bounds and proved in IVy. The paper says: “After obtaining inductive invariants in small cases, we can generalize them for cases of arbitrary bounds, and check with theorem provers, e.g., IVy” (Section 9.1, p. 44).

how to apply it

1. Build the TLA+ next-state relation with explicit scheduler, send, receive, computation, and message-age actions (Section 9.1, Figs. 6–8, pp. 43–44).
2. Run TLC or APALACHE with fixed Δ, Φ, and initial timeout. Use a violating trace to identify a missing invariant conjunct.
3. Run FAST on the counter-encoded model when Presburger arithmetic is sufficient; inspect its result or timeout.
4. Generalize fixed constants to symbolic Δ and Φ, replace bounded buffer state with the predicate encoding, and write an IVy invariant with quantified variables, nonlinear integer expressions, and uninterpreted functions (Section 10, pp. 46–47).
5. Supply strengthening steps only when IVy cannot discover them; Table 4 records the number of user-provided strengthening steps.

verus form

Inference: Mirror this as counterexample-guided ghost invariant development: first instantiate bounded `u64` parameters and run executable tests/model exploration, then generalize to `nat`/integer ghost parameters and prove transition-preservation lemmas in Verus. Every candidate invariant must become a Verus `requires`/`ensures` fact or loop invariant; bounded testing remains a discovery aid, not proof evidence.

evidence and measured results

For fixed parameters, Table 1 reports Strong Accuracy. For example, with Δ=2, Φ=4 and a predicate buffer, TLC explored 10.2K states in 3 seconds at depth 176; with a counter buffer, it explored the same 10.2K states in 3 seconds, while FAST took 16 minutes (Table 1, p. 45). Table 2 intentionally initializes timeout too small and reports violations; for Δ=2, Φ=4 with a predicate buffer, TLC found 840 states in 1 second at depth 43 (Table 2, p. 45). Table 3 reports inductive-invariant checks: Δ=4, Φ=40 Strong Accuracy took TLC 33 minutes over 347.3M states and APALACHE 12 seconds (Table 3, p. 45).

For arbitrary Δ and Φ, Table 4 reports IVy times and invariant sizes: Strong Accuracy with timeout `=6×Φ+Δ` took 4 seconds with a 30-line invariant and zero strengthening steps; Strong Completeness with timeout `≥6×Φ+Δ` took 22 seconds with a 124-line invariant and 15 strengthening steps (Table 4, p. 47). The denominators are one verification run per table row, not a benchmark population. Inference: These measurements show feasibility for this model, not a general speed comparison across distributed protocols.

## what is proved and trusted; implications for VL

The proved claims are cutoff theorems, safety for fixed parameters, and IVy inductive invariants establishing safety and reduced liveness for arbitrary Δ and Φ under the stated partial-synchrony model. The trusted boundary includes the process/buffer semantics, scheduler fairness assumptions, cutoff proof, each tool’s kernel, and the correctness of the encodings. The paper itself says its specifications are outside IVy’s decidable theories (Section 10, p. 47). Inference: Agent-written verified Rust faces risk from a wrong network model, an unjustified cutoff, omitted fairness, or a ghost abstraction that does not match runtime buffering; Verus can check the resulting arithmetic and transition lemmas but does not remove those modeling assumptions.

The paper already supplies a reusable methodology for parameterized distributed verification: prove symmetry/cutoffs, tune state representation to each solver, use bounded model checking to discover invariants, reduce liveness to safety, then prove generalized invariants. Inference: VL should reuse that workflow for verified Rust protocol components instead of redoing ad hoc bounded checks without a cutoff argument. The method does not directly verify arbitrary Rust code or arbitrary GST; the paper lists GST>0 as requiring additional strengthening (Section 10, p. 48).

## techniques for the catalog

- symmetry cutoff by index projection — prove that one- and two-process instances preserve the relevant LTL\X properties of every N-process instance
- message-buffer abstraction — encode ages as predicates or counters and merge messages older than Δ
- relative-speed counters — represent partial synchrony’s Φ bound through scheduler counters and inactivity constraints
- liveness-to-safety reduction — add auxiliary state so eventual accuracy/completeness become inductive safety invariants
- counterexample-guided invariant discovery — use fixed-parameter TLC/APALACHE/FAST traces to shape generalized IVy invariants
- parametric inductive proof — prove quantified, nonlinear invariants for arbitrary Δ and Φ in IVy
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
