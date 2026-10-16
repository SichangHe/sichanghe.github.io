# A flexible specification approach for verifying total correctness of fine-grained concurrent modules
(authored by agents unless marked 🧑)
Tag: `fasse2023flexible`, [paper](https://doi.org/10.48550/arxiv.2312.15379)

## scope and result

Fasse and Jacobs address modular total-correctness proofs for fine-grained concurrent modules whose progress depends on a client. Their example is lock handoff: one thread acquires a lock and another releases it, so a lock module cannot hard-code a same-thread release rule. The paper’s central device is Sassy, a higher-order interface that passes erasable auxiliary functions into blocking operations. The functions create obligations and fuel while the client-specific progress argument remains outside the module.

The abstract states: “We overcome this limitation by instead having the blocking operations take the obligation creation operations required for the specific client scenario as arguments.” (Abstract, PDF p. 1). It further says: “We validated Sassy by developing (non-foundational) machine-checked proofs of representative locks—an unfair spinlock (competitive succession), a fair ticketlock (direct handoff succession) and the hierarchically constructed cohortlock that is starvation-free if the underlying locks are starvation-free—against our specifications using an encoding of the approach in the VeriFast program verifier for C and Java.” (Abstract, PDF p. 1). The validation is mechanized proofs in VeriFast, not a Verus implementation or a performance study.

## technique 1: eraseable fuel and obligations

What it is. The authors extend HeapLang with erasable auxiliary state, obtaining HeapLang<. Recursive calls consume call permissions (fuel). A signal has a well-founded level, an obligation to set it, and an unset/set state. `NewSignal` creates the signal and obligation; `SetSignal` fulfills it; `Expect` generates a call permission only when an unset signal is legitimately expected. `NewExpectPerm` pre-pays for that generation by consuming a higher-degree call permission. A thread with outstanding obligations cannot finish.

Why it is needed. Ordinary call permissions can fuel recursion but cannot justify a fair busy-wait: the waiter may need unbounded iterations while another thread eventually changes a flag. The authors show the pattern with a forked `while !f do () done` and then instrument it so the waiter executes `Expect s 0` while the owner eventually executes `SetSignal s` (Section 2, PDF pp. 5–6).

How to apply it. (1) Choose a well-founded degree for recursive-call fuel and lower higher degrees into finite multisets of lower degrees. (2) Create a signal before forking with `NewSignal`; retain or pass its obligation deliberately. (3) In the waiting loop, execute `Expect` atomically with the read that justifies waiting. (4) Pre-create the expect permission with `NewExpectPerm`, consuming a higher-degree call permission; do not use the unsound version that creates fuel for free. (5) Pass obligations and permissions at `fork`. (6) Fulfill all obligations before `Finish` by calling `SetSignal`. The paper proves: “A HeapLang< program of the form e; Finish does not have infinite fair executions.” (Theorem 2.1, PDF p. 6), and derives safe termination for programs that cannot get stuck (Corollary 2.2, PDF p. 6).

Verus form. Inference: model a permission budget and signal state as ghost state in a Verus state machine. A transition that consumes fuel can have a decreasing measure; a waiting transition can require an obligation token owned by another thread. Use `requires`/`ensures`, ghost fields, and state-machine transition proofs. Inference: the paper’s erasable auxiliary expressions have no direct Verus syntax; they must be ghost/spec code and cannot be allowed to alter executable behavior. Verus does not inherit the paper’s theorem automatically.

Trust and limitation. The theorem depends on the HeapLang< operational semantics, well-founded degree orders, fairness, and safety of the instrumented program. The authors explicitly note the first `Expect` scheme is unsound because it generates fuel “out of thin air”; prepaid expect permissions repair that issue (Section 2, PDF p. 6). This is a useful warning against treating ghost progress tokens as unconstrained resources.

## technique 2: Sassy parameterization for client-dependent blocking

What it is. A blocking module operation receives two auxiliary functions: `η` runs while the operation is blocked and must produce fuel; `κ` runs at the operation’s linearization point and creates or destroys client-specific obligations. In the parameterized spinlock, `acquire lk η κ` invokes `η` on failed attempts and `κ` when the compare-and-set succeeds; `release lk κ` invokes `κ` before clearing the lock. This permits the middle thread to receive the obligation that justifies another thread’s wait.

How to apply it. (1) Identify which client action eventually makes the operation’s atomic precondition true. (2) Add an `η` argument whose pre/postcondition supplies one call permission whenever the operation is blocked on that client action. (3) Add a `κ` argument at each linearization point to create, transfer, or destroy the required obligation. (4) Instantiate these arguments in each client thread, choosing signal locations and well-founded degrees. (5) Verify the module against a parameterized total-correctness logically atomic triple, then verify each client compositionally. Figure 3’s handoff uses `η` to expect an obligation held by the future releasing thread and `κ` to create/destroy those obligations (Section 3, PDF pp. 2 and 7–8).

The paper says: “This approach correspondingly also leaves it up to the client to create whatever obligations, in whatever threads, it needs to be able to do so.” (Section 3, PDF p. 7). This is the precise flexibility missing from classic lock contracts.

Verus form. Inference: represent `η` and `κ` as proof closures or explicit proof functions passed as ghost parameters, with contracts stating the permission they consume and return. The executable lock method should remain a normal Rust function; the closures should be erased proof code. Use `ensures` on the lock operation and state-machine transitions to tie `κ` to the linearization point. Inference: higher-order closure verification and thread ownership need a supported Verus encoding; this paper’s Iris/VeriFast rules cannot be copied verbatim.

## technique 3: safety separation logic implies total correctness

What it is. The paper reduces total correctness to safety. First instrument the program so every infinite fair execution would run out of fuel and get stuck. Then prove safety (no stuck state) with an existing separation logic. If the instrumented program is safe, the erased original terminates under fair scheduling. The authors use Iris concepts—ownership, separating conjunction, invariants, fancy updates, and logically atomic triples—to reason compositionally about fine-grained operations.

How to apply it. (1) Define the erased program and the auxiliary HeapLang< program. (2) Prove the instrumentation theorem for the chosen fuel and obligations. (3) Specify module operations with logically atomic triples: a client-side atomic precondition, a module postcondition, and an invariant describing shared state. (4) Open shared invariants only around atomic steps and close them before the step ends. (5) Prove each implementation and client using separation-logic framing and ownership transfer. (6) Conclude termination from safety plus Theorem 2.1. The paper’s Figure 10 uses an invariant containing the shared location and an exclusive ghost resource, while Figure 12 packages a spinlock as a logically atomic module.

Verus form. Inference: use Verus’s executable/spec/proof split, ghost ownership tokens, `atomic`-style state-machine transitions where applicable, and explicit invariants to model shared resources. `requires` and `ensures` can express the module contract; `assert` and proof lemmas establish ownership facts. Inference: Verus’s permission model is not Iris’s separating conjunction, so the reduction theorem and fairness model would need to be proved anew.

What remains trusted. The reduction assumes fair scheduling and correctness of the instrumentation semantics. Separation logic proves safety relative to its resource algebra and specifications; it does not prove that the client’s liveness assumptions hold in an unfair environment.

## technique 4: fair versus unfair module contracts

For an unfair lock, the client must eventually make the atomic precondition true, and `η` may need to generate fuel repeatedly. The paper expresses this with an “eventually” arrow in the total-correctness logically atomic triple. For a fair lock, the lock module guarantees only finitely many bypasses; the client supplies a compensating call permission per bypass. A round resource records whether compensation for the current round has already occurred.

The ticketlock example increments `next` to obtain a ticket and waits until `owner` reaches it. Its two acquire linearization points are (i) the successful fetch-and-add when the ticket equals the old owner, and (ii) the release-side increment that hands the lock to an earlier ticket. The paper states: “Indeed, the ticket regime enforces a first-in-first-out (FIFO) direct handoff succession policy.” (Section 6.1, PDF p. 16). The auxiliary `FAIRNESS` code lowers a degree into as many permissions as the observed `next-owner` gap, matching the finite number of bypasses. The cohortlock case study composes fair and unfair locks and establishes starvation freedom when underlying locks are starvation-free (Sections 6–9).

Verus form. Inference: encode a fairness round counter and ticket ownership in a state machine; prove each transition preserves ticket order and decreases a bounded bypass measure. Use a ghost round token to prevent double compensation. A progress theorem needs an explicit scheduler/fairness assumption or a bounded environment model; ordinary functional `ensures` alone cannot prove it.

## evidence, contradictions, and VL implications

The evidence is three non-foundational machine-checked VeriFast developments: spinlock, ticketlock, and cohortlock. The paper gives no lines-of-code total, proof-time denominator, solver-success percentage, or independent benchmark. “Machine-checked” therefore means the supplied encodings checked in VeriFast; it does not measure engineering cost or prove a Verus implementation.

The paper’s central safety boundary is explicit: auxiliary code is erasable, but the reduction only applies when the instrumented program is safe and the scheduler is fair. Inference: a VL product that emits verified Rust should treat liveness claims as separate artifacts from memory safety and functional postconditions. Inference: the threat to agent-written verified Rust is high for concurrent code if the agent silently assumes fair scheduling, lock fairness, or cross-thread obligation transfer; a proof can establish safety of an instrumented model while the executable’s environment violates those assumptions.

VL should not redo the idea of parameterizing blocking operations with client-supplied progress code, nor the reduction from safe fuel-bounded instrumentation to fair termination. A new contribution would need a Verus-native encoding, measured proof effort, and explicit checks that generated obligations correspond to real Rust thread behavior.

## techniques for the catalog

- prepaid progress fuel — instrument waits with erasable signals, obligations, and pre-paid expect permissions so fair infinite executions become impossible
- Sassy higher-order blocking — pass client-supplied `η` and `κ` auxiliary functions for waiting fuel and linearization-point obligation updates
- safety-to-termination reduction — prove an instrumented program safe, then derive termination of the erased program under fair scheduling
- total-correctness atomic triples — extend logically atomic module specifications with liveness arrows, obligation resources, and per-round compensation
- fairness contracts — distinguish unfair locks requiring client eventuality from fair locks that bound bypasses and provide FIFO handoff
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
