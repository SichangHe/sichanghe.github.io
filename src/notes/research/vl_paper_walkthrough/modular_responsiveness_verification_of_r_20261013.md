# Modular Responsiveness Verification of Rust Async Runtimes
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked the definitions, transfer functions, verification conditions, theorem statements, Tables 1 and 2 with their averages, page references and quotations; changed one claim about seeded bugs, one wrong Verus claim about tracked tokens, and two unmarked inferences.

source: Li, Beschastnikh, Summers (University of British Columbia), arXiv:2610.09198v1, 6 Oct 2026; 36 pages; appendix A (well-formedness) and appendix B (full semantics) included.

The paper verifies Rust code but not with Verus: it uses its own static analysis, Jackdaw. Each Verus form below is an inference. The notes already describe Lion, the Verus-verified async runtime this paper compares itself with, in `distributed_verification_db/liveness_cases.md` and `topic_liveness.md`; what is added here is the Jackdaw technique and its own account of how the two differ.

terms the paper uses:

- pollable: a primitive async operation supplied by the runtime (timer, I/O handle, channel end) whose `poll` method returns `Ready` or `Pending`
- waker: a handle on a suspended user task; calling `wake` asks the scheduler to poll the task again
- reactor: the runtime component that stores wakers of suspended tasks and wakes them when what they wait for has happened
- liveness property: a statement that something eventually happens, as opposed to a safety property, that something bad never happens

## the property, the paper proof, and the trusted parts

The property is eventual progression: “whenever a user task is paused waiting on a pollable whose completion condition will eventually hold, that task is eventually resumed” (§3.2, p.8).

What is proved, on paper and by proof sketch only: for a small modelling language, LART, if every pollable and every reactor passes a syntactic check (the verification conditions VCπ and VCR), then the runtime has eventual progression (Theorems 1–6, §4.3–§5.5). The related-work section says of these proofs: “Conversely, Lion verifies its executor, which we trust (Section 3.2), and its proofs are machine-checked while our soundness argument is on paper.” (§8, p.30)

What is measured: 9 pollables and 4 reactors from smol, futures-rs and tokio were annotated and pass the check; violations seeded for each verification condition were rejected (§6.1, p.26).

Trusted, by the paper's own list:

- the Rust compiler's translation of async functions to state machines (Trusted Component 1, p.8)
- the operating system's event APIs (Trusted Component 2, p.8)
- the scheduler: “The scheduler components of the Rust async runtime schedule tasks passed to them fairly.” (Trusted Component 3, p.8)
- the annotations that say what the Rust code does: “In particular, Jackdaw does not check for mistakes in these annotations, such as triggering a monotonic event when the corresponding update has not been performed in the real memory.” (§7, p.28)
- the translation from Rust's MIR to the model: “The lifting from MIR to LART is not formalized and contains heuristics (e.g., recovering nested branches and loops from a CFG).” (§6, p.26)
- sequential consistency of memory, panic-freedom and type-correctness (§7, p.28)

Inference: no runtime as a whole gets Theorem 5. It needs every pollable and every reactor of the runtime to pass, and the evaluation covers “a representative subset of components” (§6.1, p.26). For tokio only one-shot channel components are in the tables; its I/O driver, timer and the main reactor loop are not.

## technique 1: reduce liveness to per-component conditions on one arbitrary task

what it is: do not reason about the set of all suspended tasks. Fix one task, represented by a pair (waker w, predicate p) called an obligation, and ask each component to treat that one pair correctly. Three conditions on a pollable's `poll` and two on one iteration of a reactor's loop then imply the global liveness property.

when to use: for a liveness property of a system built from a request side that may hand work over and a service loop that picks it up, where what is waited for can only go from false to true.

the insight, in the paper's words: “First, we adopt a task-centric view and find that it is sufficient to consider verification of eventual progression for a single arbitrary task, instead of reasoning about a collection of tasks.” (§1, p.2)

how it is done:

1. name the completion condition of each pollable as a monotonic predicate p (technique 2)
2. define an obligation (w, p): “if the monotonic condition p ever holds, the runtime must eventually resume the task associated with w” (§4.2, p.14). An obligation is created at each await of a pollable and is discharged only by `poll` returning `Ready` or by a reactor calling `wake(w)`: “These are the only ways these obligations can be discharged.” (§4.2, p.14)
3. require of every pollable (Definition 2, p.15, with Σ the set of predicates true so far, R the repositories and Q the scheduler queue):
   - P1: if it returns `Ready(v)`, then p ∈ Σ at the return point
   - P2: if p ∈ Σ at entry, it returns `Ready(v)`
   - P3: if it returns `Pending`, then (w, p) is in some public repository or w is in Q
4. require of every reactor loop, per iteration i (Definition 3, p.15):
   - R1: every obligation present at iteration start whose p already holds is woken in this iteration
   - R2: the obligations at iteration end include those at the start, plus those inserted concurrently, minus those woken
5. conclude with Theorem 1 (p.16): “If every pollable in the runtime preserves obligations when yielding (Definition 2, (P3)) and every reactor is responsive (Definition 3), then the runtime satisfies Eventual Progression (Definition 1).”

The informal versions (§3.3, p.9) are easier to carry around: “If poll returns Pending, the pollable has transferred its waker to a Reactor along with its completion condition.” “If a transferred waker’s completion condition holds at the start of an iteration, the Reactor calls wake on it within that iteration.” “A transferred waker that is not woken in this iteration is retained in the Reactor’s repository for a future iteration.”

Why the argument closes (proof sketch of Theorem 4, p.21): R2 keeps (w, p) in a repository until it is woken; p stays true once true; the reactor iterates infinitely often, so some iteration starts with p true and (w, p) still stored; R1 then wakes w in that iteration.

the paper's example (Figures 2 and 3, pp.7–8): a timer's `poll` returns `Ready` if `self.instant <= now()`, otherwise calls `self.reactor.transfer(TimerData { instant: self.instant, waker: w })` and returns `Pending`. The reactor's `react` loops forever: partition the stored timers by `t.instant <= now()`, call `t.waker.wake()` on the ready ones, append the others back.

Verus form (inference):

- P1, P2, P3, R1, R2 are all safety properties of a single call or a single loop iteration. That is the point of the decomposition, and it is what makes them expressible in Verus, which checks pre- and postconditions and has no temporal operators. The notes record that Lion's Verus proof likewise uses ghost event logs and no temporal operators
- P1 and P3 become `ensures` clauses of `poll` over ghost state: a `Ghost` history of events for Σ, a ghost set of pairs for each repository, a ghost set for Q. P2 becomes an `ensures` that relates the history at entry to the returned variant
- R1 and R2 become the `ensures` of a function holding the body of one iteration, stated with a `forall` over an arbitrary (w, p); the task-centric view is that quantifier
- what does not carry over: the step from R1 and R2 to the waker eventually being woken (Theorem 4). It needs the premise that the loop runs infinitely often, and fairness, which are not statements about one call. In Verus it would be a separate `proof fn` over a `spec fn` model of traces, or stay an argument on paper as here
- what Verus would add: the ghost updates sit next to the real memory updates and are checked against them, which is exactly the gap the paper leaves open with trusted annotations

evidence: Tables 1 and 2 (p.27); see technique 7.

where it fails or what it assumes: the three trusted components; a fair scheduler is assumed, not checked. R1 is stronger than needed and the paper says so: “In principle this condition could be weakened, but in practice this strong guarantee is common.” (§4.3, p.15)

## technique 2: monotonic predicates as the only facts the analysis tracks

what it is: every condition a task waits for is abstracted to a predicate that, once true, stays true. “A monotonic predicate p ∈ P represents a stable-once-established condition: once p holds, it holds permanently in the future.” (§4.1, p.10) Internal predicates are made true by the program with `trigger(p)`; external ones only by the environment.

when to use: when a component decides what to do from an observation that may be stale by the time it acts. With a monotonic condition, a stale “true” is still true. “Monotonicity is what allows poll (and the Reactor) to reliably decide completion based on an observation of the condition.” (§3.1, p.7)

how it is done (§5.1, pp.16–17):

1. keep for each predicate one of four observation values: unreachable (⊥), observed true (tt), observed false at an earlier moment (ff), unknown (⊤)
2. on a branch, refine with the operator ▷: unknown becomes the branch's value; ff may become tt; tt stays tt
3. refining tt to ff gives ⊥, and the whole abstract state collapses to unreachable: “A ff observation can be refined to tt, while refining tt into ff violates monotonicity, indicating the current path is unreachable.”
4. at a control-flow merge, join: tt joined with ff is unknown

Step 3 is where the analysis gets its precision: any path that would see a predicate go from true to false is pruned.

Verus form (inference): a monotonic predicate is a `spec fn` on a ghost history that only grows, with a `proof fn` showing that it is preserved when the history is extended. Verus has no built-in notion of monotonic predicate, so the pruning of step 3 is not automatic: the proof must call that lemma wherever a path is to be ruled out. For shared state, the fact must be stated in a form that survives other threads' steps, which is what the lemma gives.

where it fails: Inference: a condition that can turn false again is outside the model. Single-permit primitives are the paper's listed gap, which fits that reading: “a wake-one primitive (non-deterministically discharge one obligation in a repository) for single-permit synchronization idioms (e.g., tokio’s Mutex, Semaphore)” (§7, p.27). Inference: branching on combinations of predicates is also not in the base language; footnote 2 (p.12) says only single predicates are allowed and calls the extension straightforward.

## technique 3: the LART model and its check for pollables

what it is: a pollable is rewritten as a loop-free statement over six operations, and an abstract interpreter is run over it twice.

the language (Figure 4, p.11): `skip`, `return v`, `wake(w)`, `trigger(p)`, `if p then s1 else s2`, `insert(r, w, p)`, sequencing; and for reactors only `take(r, w)`, `for (w, p) in r { s }`, `loop s`. A repository r abstracts whatever data structure the reactor stores wakers in.

how it is done (§5.1–§5.2, pp.16–19):

1. the abstract state is (S, R̂, L̂): S maps predicates to observations; R̂ maps each public repository to the symbolic obligations stored in it; L̂ is the set of symbolic obligations held locally
2. transfer functions (Figure 6, p.17): `trigger(p)` refines S(p) to tt; `insert(r, ŵ, p̂)` moves the obligation from L̂ to R̂(r) and yields unreachable if it was not held locally; `wake(ŵ)` removes it from L̂; `if` refines S(p) to tt on one branch and ff on the other and joins; `return` yields unreachable for what follows
3. run once from a start state where the completion predicate is unknown and L̂ holds the entry obligation; run again from a start state where the predicate is tt
4. inspect the state just before every `return`:
   - P1vc: in the unknown-start run, at every `return Ready(v)`, S(p̂) = tt
   - P2vc: in the tt-start run, every reachable return is a `Ready` return
   - P3vc: in the unknown-start run, at every `return Pending`, L̂ is empty

“(P3vc ) witnesses that the locally-held obligation has been transferred to a public repository (via insert) or discharged (via wake) by the time the pollable yields.” (§5.2, p.18)

the paper's worked example (§5.2, pp.18–19): the timer is modelled as `insert(A, w, pc) ; if pc then { return Ready(()) } else { return Pending }`. Unknown-start run: the insert empties L̂; the then-branch reaches `Ready` with S(pc) = tt, so P1vc holds; the else-branch reaches `Pending` with L̂ empty, so P3vc holds. tt-start run: the else-branch refines tt with ff, which is unreachable, so only the `Ready` return remains and P2vc holds.

Verus form (inference): the two runs are a case split in a proof of `poll`'s postcondition: one case assumes nothing about the predicate at entry, the other assumes it holds. The local set L̂ behaves like a linear resource: it must be given away (`insert`) or used up (`wake`) before returning `Pending`. Verus has such resources: a `Tracked` ghost token for the obligation, taken as a parameter by `poll` and consumed by the ghost operations for insert and wake. Verus does not by itself reject a dropped token, since Rust behaves more like an affine type system, allowing dropping of any value (Verus linear ghost types paper, model-language section); so the `Pending` case needs an `ensures` saying the token is now in the ghost repository, or the token returned. This is a design sketch, not something the paper or the notes show built.

where it fails: a completion decision stored in a boolean and tested after a merge loses precision, since the join of tt and ff is unknown; the paper needed a “post-join re-assertion” annotation for it (§6.1, p.26).

## technique 4: checking a reactor with two symbolic obligations and no fixpoint

what it is: one pass over the loop body, started with two symbolic obligations per repository, decides R1 and R2 for all concrete obligations.

how it is done (§5.3, p.19):

1. for each public repository r, seed R̂(r) with two symbolic obligations: one tagged tt whose predicate is assumed true at iteration start, one tagged ⊤ whose predicate is unknown; L̂ starts empty
2. run the transfer functions over the body once. `take(r, ŵ)` moves an obligation from R̂(r) to L̂; `for (w, p) in r { s }` is unrolled once per symbolic obligation in R̂(r) (Figure 7, p.18)
3. no loop fixpoint is computed: the body is analyzed as a single iteration
4. check at the end:
   - R1vc: the tt-tagged obligation is neither in L̂ nor in any R̂(r′)
   - R2vc: the ⊤-tagged obligation is not in L̂

“R1vc witnesses that all obligations whose predicates hold at iteration start have been consumed by wake and removed from public repositories.” (§5.3, p.19) R2vc says an obligation of unknown status was either woken or is still in a repository; what is forbidden is that it ends the iteration held locally, that is, taken out and dropped.

the paper's worked example (§5.3, pp.19–20): the timer reactor is `loop for (w, p) in A { if p then { take(A, w) ; wake(w) } else skip }`. For the tt-tagged obligation the else-branch is unreachable, and take followed by wake removes it from everywhere: R1vc holds. For the ⊤-tagged one both branches survive; after the join it is in R̂(A) and not in L̂: R2vc holds. The buggy variant replaces `wake(w)` by `skip`: the tt-tagged obligation ends in L̂, and R1vc fails.

Why two obligations are enough (proof sketch of Theorem 3, p.21): the tt-tagged one stands for every obligation whose predicate holds at iteration start; the ⊤-tagged one stands for all others, including those inserted by concurrently running pollables during the iteration.

Verus form (inference): write the iteration body as a function whose `ensures` has two quantified clauses over an arbitrary pair in the ghost repository at entry: if its predicate held in the entry history, the waker is in the ghost woken set; otherwise the pair is in the woken set or still in the repository at exit. A `for` over a `Vec` of timers needs a loop `invariant` stating the same two clauses for the elements already visited. What does not carry over is the absence of invariants: Jackdaw unrolls the `for` symbolically, Verus needs the invariant written.

where it fails: the reactor body may contain no inner loop other than the repository iteration, and must never return (well-formedness `wfr`, Appendix A, p.35). Each reactor is assumed to have at most one public repository per type of pollable (§4.1, p.11).

## technique 5: terminating reactors and the precedes relation

what it is: some components wake a waiter but run once, not forever. The paper's case is the sending end of a one-shot channel: `send` delivers the value and wakes the receiver, then is gone. For these, an obligation inserted after the single run is kept and never served. “Progression therefore holds only for obligations whose transfer strictly precedes termination of the reactor.” (§5.5, p.23)

when to use: any register-then-sleep protocol against a one-time notifier. Inference: this is the lost-wakeup race.

how it is done (§5.5, pp.22–24; Figure 8, p.22):

1. model the component as a `t-reactor`: a reactor body without the enclosing loop; R1 and R2 are read per invocation
2. add to the abstract state a relation ≺ between predicates; p ≺ q records that at some moment p was true and q was not
3. add a predicate tf_r meaning the obligation has been transferred to repository r; `insert` sets S(tf_r) to tt
4. extend ≺ on each refinement to false: “Second, refining S(p) to ff (e.g., by entering the else-branch of an if-statement) extends ≺ with q ≺ p for every q already observed to be true (S(q) = tt).”
5. at a merge, keep only the orderings present on all incoming paths
6. new check SOTvc (strict obligation transfer): at every reachable `return Pending` whose obligation went into a terminating reactor's repository, tf_r ≺ p̂ must hold

In code terms the check passes only for a receiver that registers its waker first and then tests the completion condition again before returning `Pending`. A receiver that tests, then registers, then returns reaches `Pending` with the same observation S(pc) = ff and is told apart only by ≺.

Theorem 6 (p.24) gives progression for such obligations if the host invokes the reactor. That last condition is outside the proof: “If a one-shot channel is never sent on, its receiver legitimately waits forever, a user-level failed obligation rather than a runtime fault.” (§5.5, p.24)

Verus form (inference): the ordering fact becomes an index comparison on a ghost event log: the position of the register event is below the position of the completion event. The receiver's `poll` gets an `ensures` for the `Pending` case that states this. With atomics, the register and the re-check are two separate atomic steps, so the proof has to carry the fact across the gap through the shared-state invariant; `AtomicInvariant` is the Verus construct the filed studies mention for that.

where it fails: the relation depends on a memory model in which operations are totally ordered. The paper: “All operations in LART , e.g., insert, take, and wake are atomic operations under a sequential consistency model; our techniques, and especially the precedes relation extension defined in Sec. 5.5 rely on sequential consistency.” (§7, p.28) tokio uses weaker atomic orderings, and the tool does not check that this is harmless.

## technique 6: retry loops in pollables by fixpoint

what it is: a pollable that contends for a bounded resource (a channel slot, a mutex permit) may loop: try, on failure insert a waker, re-try. The base language forbids loops in pollables; the extension admits `loop s` and analyzes it with a least fixpoint.

how it is done (§5.6, pp.24–25):

1. relax well-formedness: the loop body must contain at least one `return`
2. compute h* as the least fixpoint of h ↦ σ ⊔ T[s](h), where σ is the state at loop entry
3. collect the states before each `return` inside s during the evaluation of T[s](h*) and apply the unchanged P1vc, P2vc, P3vc to them
4. termination of the fixpoint: predicates, symbolic wakers and repository names in one pollable are finite, so the lattice is finite, and the transfer functions are monotone

what it does not do: “Our analysis does not attempt to check termination of this loop, which ultimately depends on an external predicate eventually holding; instead, this extension to pollable loops checks that provided the loop eventually terminates, the necessary obligations will be satisfied.” (§5.6, p.24)

Verus form (inference): h* is a loop `invariant` found automatically. In Verus the invariant is written by hand: on every arrival at the loop head, either the obligation token is still held locally or it is registered in a repository, together with what is known of the predicate.

where it fails: the retry that goes through the scheduler (return `Pending`, be woken, be polled again, possibly fail again) is not covered: “Our modular analysis techniques do not support this pattern as described” (§5.6, p.24). Only the explicit in-function loop is.

## technique 7: Jackdaw, annotation macros on unchanged Rust

what it is: a rustc plugin of about 5k lines of Rust. Macros mark where the real code performs a LART operation; the tool extracts the model from MIR and runs the checks.

how it is done (§6, pp.25–26):

1. tag entry points with `#[jackdaw::pollable]` or `#[jackdaw::reactor]`
2. `bind!` names the component's waker, completion predicate and public repositories
3. `mono_pred!` declares a predicate; `obs!`, `obs_tt!`, `obs_ff!` record an observation of it
4. `trigger!`, `wake!`, `insert!`, `take!` mark effects; `repo_for!` marks iteration over a repository
5. macros expand to no-op markers: “The annotated Rust code compiles and behaves identically to the original.”
6. the tool walks the MIR, recovers branches and loops, emits a LART model that can be read by hand, and checks VCπ and VCR
7. two additions beyond the formal language: `assume(p, b)`, which refines a predicate without a branch, and a nondeterministic choice `nd-match`

evidence (Tables 1 and 2, p.27; rustc 1.91.0-nightly, 2.30 GHz Core i9-9880H, analysis time the mean of 300 runs):

- pollables, as source lines / annotation lines / ratio / analysis time: smol EventListener 15 / 5 / 33% / 24.6 µs; smol MPSC-send 28 / 6 / 21% / 68.0 µs; smol MPSC-recv 27 / 6 / 22% / 63.2 µs; smol MPSC-close 21 / 4 / 19% / 39.0 µs; smol AsyncIO-Read/Write 29 / 6 / 21% / 99.5 µs; smol AsyncIO-Ready 38 / 5 / 13% / 86.2 µs; futures OneShot-recv 23 / 8 / 35% / 82.8 µs; tokio OneShot-recv 59 / 11 / 19% / 152.2 µs; tokio OneShot-closed 45 / 10 / 22% / 111.1 µs
- reactors: smol Timer/AsyncIO (looping) 59 / 11 / 19% / 38.5 µs; futures OneShot-recv (terminating) 12 / 7 / 58% / 10.9 µs; tokio OneShot-recv (terminating) 12 / 7 / 58% / 9.9 µs; tokio OneShot-closed (terminating) 13 / 7 / 54% / 10.6 µs
- “Each pollable verifies with 4 to 11 lines of annotation, giving an annotation-to-code ratio of 23% on average.” (§6.1, p.26) The nine ratios average 22.8%; total annotation lines over total source lines is 61/285 = 21.4% (both computed here)
- bug detection: “For each verification condition (P1/P2/P3 of VC π , R1/R2 of VC R , and the strict-obligation-transfer condition from Section 5.5), we seed a violation in a real component and confirm Jackdaw rejects it; no false negatives are observed across the suite.” (§6.1, p.26) That is six conditions; the number of seeded bugs is not given

where it fails (§6.1, pp.26–27; §7, pp.27–28):

- three cases needed extra annotation or code changes: the boolean-flag imprecision; tokio's cooperative-yield mechanism, pruned by hand (“Our model cannot handle tokio’s fairness mechanism, which requires pollables to cooperatively yield.”) with `ignore_path!`; and tokio's OneShot-recv, which needed ghost annotations for invariants that span several polls
- cancellation is not modelled: “Our model currently has no notion of obligation revocation and no mechanism for a reactor to learn that a transferred obligation becomes irrelevant; adding this to our operational semantics would be straightforward.” (§7, p.28)
- only progress in the unbounded future is covered; no latency bound
- Inference: `assume(p, b)` and `ignore_path!` are escape hatches whose misuse the tool cannot see, in addition to the trusted annotations. No real, previously reported bug was run through the tool, and no count of false alarms on correct code is given beyond the three cases

## how the paper places itself against Verus work

Two sentences matter for VL because they describe Verus projects.

On Lion (§8, p.30): “Lion obtains verifiability by rebuilding the runtime, at roughly 40k lines of specification and proof for 3.4k lines of code, whereas Jackdaw checks components of existing production runtimes as written, with lightweight annotations and automatic analyses.” And the two are complementary in scope: “Lion does not verify the pollables that user code awaits.” Lion's proof assumes a task returning `Pending` has registered a wake source; P1–P3 here are meant to discharge that assumption, while Lion verifies the executor that this paper trusts.

On Anvil (§8, p.29): “Anvil requires users to encode their system logic manually in TLA and to prove ESR interactively within Verus.”

Inference: the ratio the paper quotes for Lion is about 12 lines of specification and proof per line of code; Jackdaw's is 0.2 lines of annotation per line of code. The two do not buy the same thing: Lion's proof is machine-checked against the real code, Jackdaw's annotations are trusted and its soundness proof is a sketch.

## contradictions and gaps in the paper

- the timer model does not match the timer code. Figure 2 (p.7) tests the condition first and transfers the waker only on the `Pending` path. The LART model of §5.2 (p.18) inserts first and tests afterwards. Inference: both orders pass P1vc–P3vc, so the conclusion stands, but the model shown is not the model of the code shown; the insert-then-test order is the one technique 5 requires for terminating reactors
- §6.1 (p.26) says the evaluation spans timers, I/O and channels. Table 1 has no timer pollable; the timer appears only as the smol reactor in Table 2
- the introduction says “less than 30%” for the average specification-to-code ratio of pollables (p.2); §6.1 says 23%. Both are true of the same data; the terminating reactors, at 54% to 58%, are excluded from that average
- the conclusion says the evaluation is on “smol and tokio” (p.31); the introduction (p.2) and Tables 1 and 2 include futures-rs as a third
- §4.3 (p.15) says the soundness theorem for Theorem 1 “and its proof are in Section 5.4”; §5.4 has proof sketches for Theorems 2 to 5 and none labelled for Theorem 1
- Theorem 1 uses only P3 of the pollable conditions. Inference: Definition 1 speaks of the task being resumed, which P3 with R1 and R2 gives; that the resumed poll then returns `Ready` needs P2, which enters only at Theorem 5

## what VL should not redo

Inference:

- the decomposition itself: P1–P3 and R1–R2 are a ready-made specification for any waker-based component. A Verus proof of an async primitive can take them as its `ensures` clauses without re-deriving them
- verifying a from-scratch async executor in Verus: Lion did, at 40k proof lines
- looking for a lighter way to state the lost-wakeup condition: tf_r ≺ p is that statement

What is open and fits Verus: checking the annotations against real memory. Jackdaw trusts them; a Verus proof of even one of the 15- to 59-line pollables in Table 1 with ghost state tied to the actual atomics would close the gap the authors name first in their limitations, for that component.

## Jackdaw as a competitor to Verus proofs

Inference: little as competition, some as a standard of comparison. Jackdaw is a special-purpose checker for one property of one kind of component, and its guarantee rests on trusted annotations and a paper proof. It does not produce verified code and does not generalize to functional correctness, which the authors say (§7, p.28). The comparison that can hurt a Verus-based product is cost: 4 to 11 annotation lines and microseconds per component against the proof-to-code ratio the paper quotes for Lion. Where a customer wants only this property of existing code, the lighter tool is the reasonable choice. Where the customer wants the annotations themselves checked, it is not.

## techniques for the catalog

- task-centric obligation — reduce a liveness property over many tasks to the fate of one arbitrary (waker, predicate) pair that must be handed over or discharged, never dropped
- pollable conditions P1–P3 — `Ready` only if the condition held, `Ready` if it held at entry, and on `Pending` the waker is registered or already woken
- reactor conditions R1–R2 — each iteration wakes every stored obligation whose predicate already holds and keeps every other one
- monotonic predicate abstraction — model each awaited condition as a fact that never turns false, so a stale positive observation remains valid
- monotone refinement pruning — treat a path that observes true and then false for one predicate as unreachable
- two-start-state pollable check — analyze `poll` once with the condition unknown and once with it true, and inspect the state before each return
- two-symbolic-obligation reactor check — seed one obligation assumed ready and one unknown, run one iteration, and require the first to be woken and the second not to be left held locally
- locally-held obligation set — track an obligation as a resource that only insert or wake may remove, so an empty set at return proves it was not forgotten
- precedes relation for strict obligation transfer — record which predicates were true when another was observed false, and require registration to precede completion for one-shot notifiers
- terminating reactor — model a one-time waker such as a channel send as a reactor body without the loop, checked per invocation
- retry-loop fixpoint — admit a try-wait-retry loop in a pollable by computing the least fixpoint at the loop head and checking the same return-site conditions
- no-op annotation macros over MIR — mark model operations in unchanged Rust with macros that expand to markers and extract the model from the compiler's intermediate representation
- seeded violation per verification condition — test a checker by breaking a real component once for each condition it claims to enforce
