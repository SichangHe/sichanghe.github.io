# Controlled Owicki-Gries Concurrency: Reasoning about the Preemptible eChronos Embedded Operating System
(authored by agents unless marked 🧑)
Tag: `andronick2015controlled`, [paper](http://arxiv.org/abs/1511.04170v1)

## what the paper builds

Andronick, Lewis, and Morgan adapt Owicki-Gries (OG) reasoning so a uniprocessor system can model explicit, hardware-controlled interleaving: preemptible user tasks, nested interrupts, and synchronous/asynchronous ARM supervisor calls. They formalise both the generic framework and an eChronos scheduler model in Isabelle/HOL. The abstract describes “a controlled concurrency framework, derived from the Owicki-Gries method, for describing a hardware interface in detail sufficient to support the modelling and verification of small, embedded operating systems (OS’s) whose run-time responsiveness is paramount.” (Abstract, p. 10)

The key modelling fact is that the machine is not truly parallel, but interrupts and saved contexts simulate concurrency. The paper says, “Our extension follows from the observation that a uniprocessor OS is not truly concurrent: via interrupts and saved contexts it interleaves its tasks’ executions in a way that simulates concurrency.” (Section 2, p. 12) The trusted assumptions include ARM hardware atomicity for the interface operations, single OG statements, and restrictions on applications accessing pseudo-hardware variables. Refinement to the actual implementation is planned, not proved here.

## technique 1: control OG interleaving with an active-task guard

what it is

Introduce a pseudo-variable `AT` (active task), assign each task a unique identifier, and guard every atomic command with `AWAIT AT = task-id`. A task yields by atomically assigning `AT` to another task or scheduler. This removes impossible interference cases from the OG proof conditions while retaining low-level shared-variable reasoning.

when to use it

Use it for a uniprocessor scheduler or interrupt-driven system where execution order is constrained by explicit hardware or scheduler state. It is useful when monitors or critical regions would abstract away performance-critical code.

how to do it

1. Write each task as a sequence of OG atomic commands. For task 2's `First; Second; Third`, apply the paper's transformation: “AWAIT AT=2 THEN First END; AWAIT AT=2 THEN Second END; AWAIT AT=2 THEN Third END;” (Section 2, p. 12).
2. Insert a guarded atomic assignment when control is transferred, for example `AWAIT AT=2 THEN AT := 1 END`.
3. Model a scheduler as a loop that, while `AT=0`, chooses the next runnable task and assigns `AT := t` (Section 2, p. 12).
4. Implement `control T P` as a preprocessing function that inserts the guards into every atomic command of program `P`; then run the ordinary OG verification-condition generator (Section 2, p. 12).

Verus form (inference)

Inference: represent `AT` and runnable-task state as ghost state protected by a lock or an atomic protocol. Put `requires active == id` and `ensures` clauses on task-step functions; prove that a step preserves other task assertions with `proof fn` interference lemmas. A Rust `while` scheduler loop needs an `invariant`; Verus does not have Isabelle's source-to-source `control` preprocessor, so guards must be explicit or generated before verification.

evidence and limits

The authors expect most non-interference conditions to become trivial because an assertion guarded by `AT=X` and a statement guarded by `AT=Y` has a false antecedent when `X ≠ Y` (footnote 2, p. 12). OG conditions are still quadratic in program size (Section 2, pp. 11–12). The paper reports no completed end-to-end refinement proof.

## technique 2: model nested interrupts with stacks and masks

what it is

Use pseudo-variables `ATstack` and `EITstack` to save interrupted active-task and enabled-interrupt sets. Use `EIT` for enabled interrupts and a generic `interrupt policy X Y` predicate for which interrupt `Y` may preempt `X`.

how to do it

1. Define interrupt masking as `Int Disable(X) ≡ EIT := EIT − X` and `Int Enable(X) ≡ EIT := EIT ∪ X` (Section 3.1, p. 13).
2. On `ITake(X)`, require that `X` is enabled, is not current or already stacked, and satisfies the policy. Atomically push `AT` and `EIT`, then set `AT := X`. The exact guard is “AWAIT X ∈ EIT − AT − ATstack ∧ (interrupt policy AT X ) THEN” (Section 3.1, p. 14).
3. Allow nested handlers by pushing each interrupted context. Guard normal handler execution with `AT=X`; return with `IRet` only at the handler end, restoring stack heads.
4. Treat pending masked interrupts as nondeterministic future `ITake` events; no separate pending queue is needed for ordinary interrupts (Section 3.1, p. 14).

Verus form (inference)

Inference: define ghost `Seq<routine>` stacks and a set/map for enabled interrupts; prove push/pop and policy predicates in `proof fn` lemmas. The atomic take/return transition should be one lock-protected Rust operation whose contract states stack and `AT` updates. Hardware atomicity remains an assumption unless connected to a verified platform model.

evidence and limits

The model targets ARM nested interrupts but leaves the interrupt policy generic. The paper states, “Note that all statements inside an AWAIT are executed atomically, where the atomicity here is ensured by the hardware (i.e., these multiple instructions represent a single atomic hardware-defined mechanism).” (Section 3.1, p. 14) This is an explicit trusted hardware assumption.

## technique 3: synchronous and asynchronous SVC transitions

what it is

Represent ARM supervisor calls as additional OG tasks. A synchronous call saves context and immediately sets `AT := SVCs`; an asynchronous call sets a request bit and is taken later when enabled and permitted.

how to do it

1. Model synchronous `SVC now()` as the atomic transition `ATstack := AT + ATstack; EITstack := EIT + EITstack; AT := SVCs` (Equation 3, Section 3.2, p. 14).
2. Model `SVCa Request()` as `SVCa Req := True` (Equation 4, p. 15).
3. Run an unguarded `ITakeSVCa` task that atomically checks the request bit, enabled set, current task, stack, and policy; clear the bit, push context, and set `AT := SVCa` (p. 15).
4. Extend `IRet` to inspect the saved enabled set and policy. If an asynchronous request can run, switch to `SVCa`; otherwise restore the interrupted context (p. 15).

Verus form (inference)

Inference: encode SVC request and take as separate contract-bearing functions over ghost scheduler state. Use an atomic flag for the request and prove that clearing it and changing the active routine are one linearizable transition. The saved-context conditions belong in `requires`; restoration and request handling belong in `ensures`.

evidence and limits

The framework is instantiated with user tasks `U`, interrupt handlers `I`, asynchronous handler `A`, and synchronous handler `S` (Section 3.2, p. 15). The paper models only state relevant to interleaving; it does not verify all ARM registers or instruction semantics.

## technique 4: instantiate and reduce verification conditions

what it is

Instantiate the generic framework with eChronos scheduling code, then exploit controlled guards and automated simplification to remove redundant OG conditions.

how to do it

1. Define user-task, interrupt, synchronous-SVC, and asynchronous-SVC programs and compose them as in Figure 1 (Section 3, p. 13).
2. Define the scheduler's priority policy; the intended property is that application code runs only for the highest-priority task (Section 4, p. 16).
3. Generate OG conditions for the composed model.
4. Automatically remove redundant conditions before invoking Isabelle/HOL proof methods. The paper reports: “As expected, at first there are a very large number of verification conditions: on the order of 10,000. However, by just defining a method that automatically removes any redundant conditions we can easily reduce this to under 500.” (Section 4, p. 16)
5. Discharge routine conditions automatically and guide the final difficult cases interactively.

Verus form (inference)

Inference: stage Verus verification similarly: write contracts and loop invariants, prove generic scheduler/interrupt lemmas once, then run the verifier and eliminate duplicate obligations through reusable lemmas. Unlike Isabelle's reported tactic, Verus's SMT proof search will need explicit trigger-friendly predicates and may require manual `assert` steps.

evidence and limits

After reduction to under 500, “The majority of these are then trivial enough to be automatically solved by standard Isabelle/HOL methods, with the final 10 conditions requiring human guidance.” (Section 4, p. 16) These are initial verification results, not a full functional correctness theorem for eChronos. Hardware abstraction accuracy and atomicity still require informal justification and future refinement proofs.

## what is proved, measured, and trusted

Proved: formal definitions of controlled OG, interrupt/SVC hardware interfaces, and an eChronos scheduling model in Isabelle/HOL; initial verification-condition reduction and discharge. Measured: approximately 10,000 initial conditions, under 500 after redundancy elimination, and 10 requiring human guidance. Trusted: Isabelle's kernel, ARM-manual-based atomicity assumptions, single OG-statement atomicity, and application compliance with the hardware-variable access discipline. The paper does not report a percentage success rate, runtime, or a refinement theorem to the deployed implementation.

## what VL should reuse and product threat

Existing work already supplies a precise pattern for scheduler and nested-interrupt interleaving; VL should not reinvent generic active-task guards, context stacks, or SVC request transitions without checking this model. Inference: for agent-written verified Rust, the largest threat is an incorrect abstraction boundary—treating a multi-instruction hardware transition as atomic or allowing ordinary code to mutate ghost hardware state. A Verus library should make those operations opaque behind contracts and prove access-control invariants before verifying scheduler policy.

## techniques for the catalog

- active-task controlled OG — guard each atomic command with `AWAIT AT=task` and model yields as atomic active-task changes
- nested-interrupt stacks — save active task and interrupt masks on stacks, enforce enablement and priority policy, and restore on return
- SVC transition modelling — represent synchronous and asynchronous supervisor calls as guarded atomic state transitions with request bits
- obligation reduction — remove guard-implied redundant OG conditions before automated Isabelle discharge
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
