# A Case Study on Model Checking and Runtime Verification for Awkernel
(authored by agents unless marked 🧑)
Tag: `hasegawa2025awkernel`, [paper](https://arxiv.org/abs/2503.09282v1)

## what the paper proves or measures

Hasegawa et al. propose model-checking-assisted code review for concurrent Rust operating-system code, then add runtime verification to expose the model's semantic gap. The case study target is Awkernel, an asynchronous/preemptive Rust operating system for autonomous-driving workloads. The method is deliberately lighter than a theorem-proving verification of the whole kernel: the authors say their method “can be completed in around three person-months.” They contrast this with six person-years reported for repeating the seL4 methodology on a new kernel (Section 2, p. 2). The paper's central limitation is explicit: “While this approach aids in tracing behaviors, the accuracy of the results is limited because of the semantics gap between the modeling language and the programming language.” (Abstract, p. 1)

The model-checking result is exhaustive only for the translated Promela model and its finite approximations. Runtime verification executes the Rust implementation and checks observed transitions, but is not exhaustive. The authors report two bugs that were difficult to find by manual review: a preemption-timing race and an invalid task-transition path (Sections 6.3–6.4, pp. 9–10). Inference: the method therefore supplies complementary evidence: exhaustive exploration under stated model assumptions, plus observations of the actual implementation.

## technique 1: translate implementation code line by line into a code-review model

what it is: write a Promela model by translating Awkernel's Rust implementation line by line, instead of first writing an independent specification. The resulting artifact is called the code review model. The translation follows developers' understanding of the code, so it is a review aid rather than a semantics-preserving compiler. The paper states: “Thus, we manually translated the Rust code into Promela line by line while minimizing behavioral changes caused by semantics differences.” (Section 4.1, p. 4)

when to use: Inference: use this when concurrent behavior is too difficult to trace mentally and a full theorem-proving effort is infeasible. The authors explain why they translate implementation code instead of starting from a standard (Section 2, p. 2). They omit FIFO because “the round-robin scheduler operates in the same way as the FIFO scheduler when preemption does not occur” (Section 4.1, p. 4).

how to do it:

1. select the concurrent subsystem and its Rust source files; the paper selected the round-robin scheduler, task, preemption, queue, and related kernel paths (Sections 3.2 and 4.1, pp. 3–4)
2. translate control flow and state updates into Promela, retaining the implementation's intended behavior; Figure 2/3 gives a `run_main` example in which Rust's `get_next_task`, context-taking, and `yield_and_pool` are represented by Promela branches (Section 4.2, p. 5)
3. Inference: record semantic assumptions explicitly; the authors say the model “does not represent the actual behavior of the implementation; it is constructed based on the developers design choices.” (Section 4.2, p. 5)
4. Inference: run Spin on the model and inspect counterexample paths as code-review traces; compare the translated path with the source implementation (Sections 4.1 and 6.2, pp. 4, 9)

Verus form. Inference: represent the scheduler state and task-state machine with Rust structs plus `spec fn` predicates. Put transition preconditions and postconditions in `requires` and `ensures`; use loop `invariant` declarations for queue/state preservation, and `assert` or `proof fn` lemmas for each transition fact. Inference: Verus verifies the executable Rust against those predicates, so it can remove the separate Promela translation for properties expressible over the Rust model; it does not automatically explore all thread interleavings or model hardware interrupts. Inference: a Promela review model can still be retained as an independent search oracle, but a refinement relation between it and Verus state must be proved if its results are to establish Rust behavior.

evidence: the final code-review model contains 1,009 lines (Table 1, p. 9). The authors state: “We set the number of tasks to three, which is sufficient for checking preemption and resumption across different CPU cores.” They report an intentionally embedded bug, without identifying it here as the preemption-timing bug: “Although we identified the bug intentionally embedded in the model before the out-of-memory error, we could not complete the entire run with this configuration.” This was the two-Heavy-Task configuration (Section 6.2, p. 9).

limits and assumptions: Rust ownership, destructor behavior, library method atomicity, and hardware execution are not reproduced exactly. The method can miss a path omitted by the translation or a source call outside the modeled files; the authors later found two such overlooked behaviors through runtime verification (Section 7.3, p. 11). Model-checking exhaustiveness is therefore conditional on model scope, abstractions, and scheduler/task parameter bounds.

## technique 2: finite abstractions for Rust containers and return types

what it is: replace difficult Rust library types with finite Promela representations. `Vec` and `VecDeque` become fixed-size arrays whose length equals the modeled maximum number of tasks. `Option` and `Result` become records with a tag and value. Operations whose hardware-level interleaving is uncertain are treated as atomic. The paper gives the rule: “we assumed that dequeuing a task from a queue, removing the task, and assigning a return value to the register are atomically, with no preemption occurring between these actions” (Section 4.2, p. 5).

when to use: Inference: use these abstractions when dynamic allocation or library implementation details cause an intractable model, and when a finite task bound is acceptable for the review question. They are appropriate for checking scheduler ordering at a chosen task limit, not for proving arbitrary queue capacity or every possible allocator interleaving.

how to do it:

1. choose the maximum task count for one model run; allocate static arrays of that size in Promela for `Vec`/`VecDeque` (Section 4.2, p. 5)
2. encode `Some(v)` and `None` with a label and value, and encode `Result` similarly; the paper's representation is `x.label = Some; x.value = 3` for `x = Some(3)` (Section 4.2, p. 5)
3. group dequeuing/removal/return-value assignment and analogous `Option`/`Result` statements as atomic operations (Section 4.2, p. 5)
4. record that timing bugs inside those grouped operations are outside the model, while timing around function calls remains observable (Section 4.2, p. 5)

Verus form. Inference: use bounded Rust representations only when the product itself has a fixed bound, and state the bound in `requires`. For an unbounded specification, use a ghost sequence or set and prove that the executable bounded queue refines it with `ensures`; use `assert` and `proof fn` lemmas for enqueue/dequeue facts. Inference: Verus's Rust semantics do not justify declaring an arbitrary library call atomic; atomicity must come from the executable synchronization implementation and a proved contract. Inference: a Verus contract can hide an implementation behind a function boundary, but that is a trusted abstraction unless the function body is verified.

evidence and limits: the paper reports no independent proof that these atomic assumptions match hardware. It explicitly warns that “if the timing of operations related to such types is critical, we may overlook timing-related bugs.” (Section 4.2, p. 5) The abstraction is thus useful for state-space reduction but cannot support claims about races within the abstracted operation.

## technique 3: emulate preemption by splitting one task into guarded Promela processes

what it is: because Promela cannot save and restore a process's execution state, represent one Awkernel task with multiple Promela processes: a regular-operation process and a preemption process. Guard each process with a context-state condition using Promela's `provided` statement. The model uses `CtxNotInitialized`, `CtxActive`, `CtxDoPreemption`, `CtxPreempted`, and `CtxInThreadPool` (Section 4.3, p. 6).

when to use: Inference: use this encoding when the implementation suspends a thread at an interrupt and later resumes it, but the model checker lacks direct continuation capture. It is specifically suited to checking ordering between normal execution, context save, enqueue, and resume.

how to do it:

1. create a context-state variable per modeled task and initialize it to `CtxNotInitialized` (Section 4.3, p. 6)
2. define guarded processes such as `proctype run_main(byte __ctx_id) provided (CONTEXT_STATE[__ctx_id] == CtxActive) { ... }` (Section 4.3, p. 6)
3. change the state to `CtxActive` on start; change it to `CtxDoPreemption` when an interrupt occurs, enabling the preemption process and disabling regular execution (Section 4.3, p. 6)
4. retain the disabled regular process's state to model saved progress; the paper lists `CtxPreempted` and `CtxInThreadPool` but does not specify their detailed transition rules (Section 4.3, p. 6)
5. on resumption, restore `CtxActive`, which re-enables the regular process at the modeled continuation point (Section 4.3, p. 6)

Verus form. Inference: encode context state as an enum field in a Rust task struct and prove transition functions with `requires`/`ensures`. A loop `invariant` can state that exactly one context mode is active and that a preempted task is either saved or in the scheduler queue. Inference: Verus can verify the state-transition code and a ghost saved-context relation, but it does not provide Promela's `provided` process scheduler; interrupt interleavings require a concurrency model and contracts for the interrupt source. Inference: if a context switch uses unsafe assembly or foreign code, the corresponding contract remains an assumption unless that boundary is separately verified.

evidence and limits: the authors say the split “successfully emulated the preemption sequence of Awkernel in the code review model.” (Section 4.3, p. 6) They also report that complex approximations created many interleavings and made some bugs difficult to diagnose (Section 7.1, pp. 10–11). Inference: the encoding does not prove that the Promela process split is equivalent to real register/context behavior.

## technique 4: over-approximate time and constrain repeated interrupts

what it is: avoid a model-time variable, which would multiply states, by allowing the round-robin scheduler to send a preemption IPI at any time. The authors call this an over-approximation of time-related operations. Because the approximation admits impossible infinite IPI sequences, add a flag that blocks the next preemption until a task completes (Section 4.4, p. 6).

how to do it:

1. omit an explicit time counter; do not make every elapsed-time value part of the Spin state (Section 4.4, p. 6)
2. enable an IPI/preemption transition at any model point, thereby exploring paths that could occur after a time quantum (Section 4.4, p. 6)
3. add a flag set after preemption; require a task completion before allowing another preemption, excluding continuous and infinite IPIs (Section 4.4, p. 6)
4. Inference: interpret counterexamples as scheduler-ordering paths requiring validation against implementation timing (Sections 4.4 and 7.3, pp. 6, 11)

Verus form. Inference: state the scheduler's timing assumption as a ghost event or abstract `spec fn` that returns whether a preemption request is permitted; use `requires`/`ensures` to connect that event to task-state transitions. Inference: a Verus proof can establish safety for every permitted request, but an unconstrained request predicate proves an over-approximation unless a separate theorem relates it to real timer behavior. Inference: a ghost flag and loop `invariant` can enforce the paper's restriction against continuous and infinite IPIs; this is a proof assumption, not a hardware-time proof.

evidence and limits: a cycling time variable may cause state explosion. The authors explain the approximation's unwanted paths: “However, this approximation allows for sequences where the scheduler continuously sends IPIs to all non-primary cores and where preemption occurs alternately, which would not happen in actual implementation.” (Section 4.4, p. 6) Inference: the flag restricts those paths but does not recover exact elapsed-time semantics.

## technique 5: under-approximate task behavior and partition parameter space

what it is: model only two task classes. A Light Task terminates quickly and cannot be preempted; a Heavy Task runs longer, is preempted repeatedly, and returns `Poll::Pending`. Fix the number, type, and generation order before each model run. Run separate Spin processes for parameter sets instead of one nondeterministic model, because nondeterminism caused out-of-memory failures (Section 4.5, p. 7).

how to do it:

1. define Light and Heavy task automata (Section 4.5, p. 7)
2. choose a finite task count and assign each generated task a class and order as external parameters (Section 4.5, p. 7)
3. use Heavy tasks to exercise preemption and `Poll::Pending`; use Light tasks to cover quick-completion races (Section 4.5, p. 7)
4. run Spin separately for each parameter set instead of encoding all choices nondeterministically in one state space (Section 4.5, p. 7)

Verus form. Inference: express the task transition relation as a `spec fn` over an enum of task kinds and prove each concrete task function's `ensures` against that relation. Inference: bounded task classes are a test partition, not a proof for arbitrary futures; a Verus proof of a general scheduler must quantify over a task contract and establish that every permitted future obeys it. Inference: separate proof lemmas for Light and Heavy cases can mirror the paper's partition, while a ghost sequence can record the generated order.

evidence and limits: “Thus, if a single Heavy Task is sufficient to reproduce a bug, we can set the remaining tasks as Light Tasks to reproduce it more quickly and efficiently.” (Section 4.5, p. 7) The paper also bounds how many preemptions and entries into `Waiting` each task can have (Section 7.4, p. 11). Inference: under-approximation can miss behavior outside these task classes and bounds. The two-Heavy-Task, three-task run exhausted 4 TB of memory before completion (Section 6.2, p. 9), while one Heavy plus two Light tasks completed.

## technique 6: monitor task transitions with a DFA embedded in Rust

what it is: convert a task-transition model into a deterministic finite automaton, implement a generic Rust monitor with states, transitions, and current state, and call it at each event in the running Awkernel. A violation raises an alert. The model tracks both `state` and `need_sched`; `Terminated` and `Panicked` ignore the flag because they have no outgoing transitions (Sections 5.1–5.3, pp. 7–8).

how to do it:

1. draw an initial task-transition model; Figure 5 includes `Ready`, `Runnable`, `Running`, `Waiting`, `Preempted`, `Terminated`, and `Panicked` (Section 5.2, p. 7)
2. use the initial model as a monitor, add `need_sched` as a Boolean state component with developer input, and refine missing transitions through runtime verification; Figure 6 shows the final model (Section 5.2, pp. 7–8)
3. identify state-changing events; Figure 6 includes calls such as `wake()`, `get_next()`, `preempt()`, and `spawn()`, and results such as `Poll::Pending` and `Poll::Ready` (Section 5.3, p. 8)
4. implement a monitor containing `states`, `transitions`, and `current_state`; keep one `TaskModel` per task in a mutex-protected `MODELS` map (Figure 7, Section 5.3, p. 8)
5. add hooks for the defined events; Figure 8 creates a model, passes `&runtime_verification::event::Event::Spawn` to `model.next`, unwraps the result, and inserts the model under the returned task ID (Section 5.3, p. 8)
6. run the instrumented kernel repeatedly, compare unexpected transitions with the model, revise the model, and report problematic implementation paths to the developer (Section 7.1, p. 10)

Verus form. Inference: represent `TaskModel` as an executable Rust state machine and define an abstract transition predicate as a `spec fn`. Give `next` a `requires` clause stating that the event is enabled and an `ensures` clause stating the resulting state; prove that each hook preserves the model relation with `assert` and `proof fn` lemmas. Inference: a Verus proof can guarantee that verified hooks never perform an invalid transition under their contracts, whereas the runtime DFA can detect unmodeled calls in production. Inference: keep the monitor executable for validation of assumptions, because a proof of the transition relation does not prove that every external driver call was instrumented.

evidence: “We executed Awkernel on QEMU and encountered the error shown in Figure 9 within a few seconds.” Figure 9 reports an invalid `GetNext` from `Running(false)`. This exposed a model omission: “Although the implementation is designed to check that a task is not in the Running state before it starts and to ignore it if it is, this function call was missed in the code review model.” Continuous monitoring also found a preempted task resuming without re-entering `Running` (Section 6.3, p. 9).

limits and assumptions: runtime verification does not guarantee exhaustive execution. The initial model was incomplete, and the authors needed developer input plus repeated model revision (Sections 5.1–5.2, p. 7). The monitor itself must be hooked at every relevant event; calls from drivers outside the modeled files were an omission found later (Section 7.3, p. 11).

## technique 7: use model checking to validate a concurrent bug fix

what it is: use the model to expose a non-atomic preemption race, set the existing `need_sched` flag before sending an IPI, and re-run model checking to gain confidence that the fix does not create a waiting-task regression. The race is: the scheduler checks task α, α finishes, task β starts on the same core, then the old IPI preempts β incorrectly (Section 6.4.1, pp. 9–10).

how to do it:

1. model the scheduler's elapsed-time check and IPI as separate operations, since they are not atomic (Section 6.4.1, p. 9)
2. explore the interleaving in which α finishes and β starts before the scheduler sends the IPI (Section 6.4.1, p. 10)
3. before sending the IPI, set `need_sched` on α (Section 6.4.1, p. 10)
4. when the receiving core begins preemption, cancel it if the currently running task β lacks `need_sched`; otherwise transition the target to `Preempted` and enqueue it (Section 6.4.1, p. 10)
5. review the interaction with the existing Waiting-task use of `need_sched` through model checking; the authors report: “By employing model checking, we gained confidence and applied the above fix.” (Section 6.4.1, p. 10)

Verus form. Inference: represent `need_sched` in the task state and require the receiving core to check the current task's flag before preempting it. A proof function can establish that an unset flag leaves the current task `Running`; a loop `invariant` can preserve the correspondence between queue membership and task state. Inference: Verus can prove the logical race-prevention contract for modeled events, but correctness of the interrupt delivery and core-local atomicity still depends on verified synchronization or trusted hardware contracts.

evidence: runtime verification found a task resuming while marked `Preempted`; model checking helped trace and fix its path. The authors also found that the `in_queue` flag affected transition destinations and revised task transitions (Section 6.4.2, p. 10). The conclusion states: “We fixed these bugs and confirmed the correctness of the fixes through model checking and runtime verification.” (Section 8, p. 11) The reported effort was two weeks for runtime verification and three months for model checking (Section 7.1, p. 10).

## what is proved or measured, and what remains trusted

The paper measures model size, memory/time behavior, effort, and discovered bugs. The code-review model has 1,009 lines (Table 1, p. 9). Three tasks suffice for the stated preemption/resumption check, but two Heavy tasks exhaust 4 TB without completing (Section 6.2, p. 9). The completed run uses one Heavy task generated immediately and two Light tasks spawned at arbitrary times by existing tasks. This same configuration requires 570.6 GB and 1.43 hours: “This configuration required 570.6GB of memory and 1.43 hours.” The machine has an AMD EPYC 7H12 2.6GHz CPU and 4 TB of DDR4/3200 SDRAM (Section 6.2, p. 9). Runtime verification executes on QEMU and reports an error within seconds (Section 6.3, p. 9). No percentage or success rate is reported. The checks use separate monitoring processes rather than LTL formulas for properties such as eventual termination and no return to `Running` (Section 6.2, p. 9). Inference: the results do not establish full-kernel correctness.

Inference: the trusted or assumed elements are the line-by-line translation, atomicity choices, finite task and queue bounds, time over-approximation, task under-approximation, interrupt/hardware semantics, unmodeled driver calls, and correctness of Spin, the Rust compiler, QEMU, and the monitor implementation. Inference: neither Spin's exhaustive search nor a Verus proof over an abstract transition system closes these gaps without a proved refinement to the concrete scheduler and trusted boundary.

The paper distinguishes model exploration from implementation coverage: “Hence, even though model checking exhaustively verifies described behaviors, it must be noted that behaviors not described are not checked.” (Section 7.3, p. 11) Runtime verification addresses some omissions but is itself non-exhaustive. Inference: combining the two is evidence strengthening, not a compositional proof of the entire implementation.

## implications for VeruLaw

Inference: the strongest transferable idea is to make concurrency assumptions executable twice: as a finite search model for rare interleavings and as a runtime monitor for implementation/model mismatch. A VL agent could generate a Verus transition contract, a small bounded harness, and an optional runtime monitor from one reviewed task-state specification.

Inference: the product threat is high for agent-written verified concurrent Rust if agents silently choose atomic blocks, bounds, or timer assumptions. A successful Verus check can establish only the written contract; it does not establish that the Promela abstraction, task partition, or interrupt model covers production behavior. The paper's two discovered omissions show why runtime instrumentation and human review of the model boundary remain necessary.

Inference: VL should not redo the basic pattern of line-by-line Promela translation, guarded-process preemption encoding, DFA task monitoring, or the `need_sched` race scenario as if they were new techniques. Existing work already reports them, including the concrete resource measurements and two bug classes above. A useful new VL experiment would measure whether one shared transition specification can generate sound Verus contracts and runtime monitors without introducing an unproved translation gap.

## techniques for the catalog

- line-by-line model-checking-assisted review — translate concurrent Rust control flow into Promela and inspect Spin's exhaustive traces under explicit assumptions
- finite container and result abstraction — replace bounded `Vec`/`VecDeque` with arrays and `Option`/`Result` with tagged records, grouping selected operations as atomic
- guarded-process preemption model — split one interruptible task into context-state-guarded Promela processes
- time over-approximation with an IPI guard — allow preemption at any model point and block repeated IPIs with a completion flag
- task-class under-approximation — use Light and Heavy task automata and run fixed parameter sets separately to control state explosion
- DFA runtime transition monitor — embed one deterministic task model per task and check every state-changing event in the Rust implementation
- model-checked race repair — mark the intended task with `need_sched`, cancel stale preemption, and re-check the existing waiting-task behavior
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Once preemption occurs, the flag ensures that the next preemption cannot happen until one of the tasks completes its process."): checked all paper text, quotations, numbers, section/page references, and technique steps; corrected quotations, the single completed-run configuration, the intentionally embedded bug description, preemption and monitor steps, and inference labels; did not check external references, implementation artifacts, or the proposed Verus adaptations.
