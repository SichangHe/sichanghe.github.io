# Controlled Owicki-Gries Concurrency: Reasoning about the Preemptible eChronos Embedded Operating System
(authored by agents unless marked 🧑)
Tag: `andronick2015controlled`, [paper](https://doi.org/10.4204/EPTCS.196.2)

## what the paper builds

Andronick, Lewis, and Morgan adapt Owicki-Gries (OG) reasoning so a uniprocessor system can model explicit, hardware-controlled interleaving: preemptible user tasks, nested interrupts, and synchronous/asynchronous ARM supervisor calls. They formalise both the generic framework and an eChronos scheduler model in Isabelle/HOL. The abstract describes “a controlled concurrency framework, derived from the Owicki-Gries method, for describing a hardware interface in detail sufficient to support the modelling and verification of small, embedded operating systems (OS’s) whose run-time responsiveness is paramount.” (Abstract, p. 10)

The key modelling fact is that the machine is not truly parallel, but interrupts and saved contexts simulate concurrency. The paper says, “Our extension follows from the observation that a uniprocessor OS is not truly concurrent: via interrupts and saved contexts it interleaves its tasks’ executions in a way that simulates concurrency.” (Section 2, p. 12) The assumptions the paper names are: the hardware interface operations (such as ITake and IRet) are atomic as in the ARM manual, single OG statements are atomic (to be validated later by refinement proofs), and hardware pseudo-variables are accessed only through the hardware API, which "will remain an assumption for any user-provided applications" (Section 4, pp. 15–16). Proving that the implementation refines the model is planned ("We plan to then prove that this restricted but faithful model of the eChronos OS is refined by its implementation", Section 1, p. 11), not done here.

## technique 1: control OG interleaving with an active-task guard

what it is

Introduce a pseudo-variable `AT` (active task), assign each task a unique identifier, and guard every atomic command with `AWAIT AT = task-id`. A task yields by atomically assigning `AT` to another task or scheduler. This removes impossible interference cases from the OG proof conditions while retaining low-level shared-variable reasoning.

when to use it

Use it for a uniprocessor scheduler or interrupt-driven system where execution order is constrained by explicit hardware or scheduler state. The paper chooses low-level OG because more structured mechanisms such as monitors and critical regions trade away run-time performance (Section 2, p. 12).

how to do it

1. Write each task as a sequence of OG atomic commands. For task 2's `First; Second; Third`, apply the paper's transformation: “AWAIT AT=2 THEN First END; AWAIT AT=2 THEN Second END; AWAIT AT=2 THEN Third END;” (Section 2, p. 12).
2. Insert a guarded atomic assignment when control is transferred, for example `AWAIT AT=2 THEN AT := 1 END`.
3. Model a scheduler as a loop that, while `AT=0`, chooses the next runnable task and assigns `AT := t` (Section 2, p. 12).
4. Implement `control T P` as a preprocessing function that inserts the guard `AT=T` into every atomic command of program `P` (Section 2, p. 12; in the Isabelle model it is `control r c ≡ add-await-bare-com {|AT = r|} c`, Appendix B.2, pp. 19–20). The paper then relies on the OG proof method over the controlled program; it does not describe a separate generator.

Verus form (inference)

Inference: represent `AT` and runnable-task state as ghost state protected by a lock or an atomic protocol. Put `requires active == id` and `ensures` clauses on task-step functions; prove that a step preserves other task assertions with `proof fn` interference lemmas. A Rust `while` scheduler loop needs an `invariant`; Verus does not have Isabelle's source-to-source `control` preprocessor, so guards must be explicit or generated before verification.

evidence and limits

The authors expect most non-interference conditions to become trivial because an assertion guarded by `AT=X` and a statement guarded by `AT=Y` has a false antecedent when `X ≠ Y` (footnote 2, p. 12). The paper says plain OG interference-freedom conditions are "quadratically numerous in the size of the program" (Section 2, p. 11). Inference: the paper does not say this quadratic growth disappears under `control`; it only claims most conditions become trivial. The paper reports no completed end-to-end refinement proof.

## technique 2: model nested interrupts with stacks and masks

what it is

Use pseudo-variables `ATstack` and `EITstack` to save interrupted active-task and enabled-interrupt sets. Use `EIT` for enabled interrupts and a generic `interrupt policy X Y` predicate for which interrupt `Y` may preempt `X`.

how to do it

1. Define interrupt masking as `Int Disable(X) ≡ EIT := EIT − X` and `Int Enable(X) ≡ EIT := EIT ∪ X` (Section 3.1, p. 13; equations (1) and (2)).
2. On `ITake(X)`, require that `X` is enabled, is not current or already stacked, and satisfies the policy. Atomically push `AT` and `EIT`, then set `AT := X`. The exact guard is “AWAIT X ∈ EIT − AT − ATstack ∧ (interrupt policy AT X ) THEN” (Section 3.1, p. 14).
3. Allow nested handlers by pushing each interrupted context. Guard normal handler execution with `AT=X`; return with `IRet` only at the handler end, restoring stack heads.
4. Treat pending masked interrupts as nondeterministic future `ITake` events; no separate pending queue is needed for ordinary interrupts. The paper says for re-enabling that "adding the interrupt identifier to EIT is enough" (Section 3.1, p. 13), and similarly for return from interrupt (p. 14).

Verus form (inference)

Inference: define ghost `Seq<routine>` stacks and a set/map for enabled interrupts; prove push/pop and policy predicates in `proof fn` lemmas. The atomic take/return transition should be one lock-protected Rust operation whose contract states stack and `AT` updates. Hardware atomicity remains an assumption unless connected to a verified platform model.

evidence and limits

The model targets ARM nested interrupts but leaves the interrupt policy generic. The paper states, “Note that all statements inside an AWAIT are executed atomically, where the atomicity here is ensured by the hardware (i.e. these multiple instructions represent a single atomic hardware-defined mechanism).” (Section 3.1, p. 14) This is an explicit trusted hardware assumption. Note: the Isabelle model in Appendix B differs slightly from the Section 3 presentation: its `ITake` and context save do not store `EIT`, because "ARM does not save the mask status when an interrupt occurs" (footnote 4, p. 20).

## technique 3: synchronous and asynchronous SVC transitions

what it is

Represent ARM supervisor calls as additional OG tasks. A synchronous call saves context and immediately sets `AT := SVCs`; an asynchronous call sets a request bit and is taken later when enabled and permitted.

how to do it

1. Model synchronous `SVC now()` as the atomic transition `ATstack := AT + ATstack; EITstack := EIT + EITstack; AT := SVCs` (Equation 3, Section 3.2, p. 14; the Appendix B version `SVC-now` pushes only `AT`, p. 21).
2. Model `SVCa Request()` as `SVCa Req := True` (Equation 4, p. 15).
3. Run an unguarded `ITakeSVCa` task that atomically checks the request bit, enabled set, current task, stack, and policy; clear the bit, push context, and set `AT := SVCa` (p. 15).
4. Extend `IRet` to inspect the saved enabled set and policy. If an asynchronous request can run, switch to `SVCa`; otherwise restore the interrupted context (p. 15).

Verus form (inference)

Inference: encode SVC request and take as separate contract-bearing functions over ghost scheduler state. Use an atomic flag for the request and prove that clearing it and changing the active routine are one linearizable transition. The saved-context conditions belong in `requires`; restoration and request handling belong in `ensures`.

evidence and limits

The framework is instantiated by defining user tasks `U`, interrupt handlers `I`, asynchronous handler `A`, and synchronous handler `S` (end of Section 3, p. 15). The paper says "we only model here what is relevant to the task interleaving" (Section 3.1, p. 13). Inference: ARM registers and instruction semantics beyond that are not modelled.

## technique 4: instantiate and reduce verification conditions

what it is

Instantiate the generic framework with eChronos scheduling code, then exploit controlled guards and automated simplification to remove redundant OG conditions.

how to do it

1. Define user-task, interrupt, synchronous-SVC, and asynchronous-SVC programs and compose them as in Figure 1 (Section 3, p. 13).
2. Instantiate `U`, `I`, `S`, `A` (Appendix A, p. 18) and leave the scheduling policy generic (`sched-policy` is unspecified, Appendix B.3, p. 20); the intended property is that "whenever application code is executing, then it is the highest priority task" (Section 4, p. 15). In the instantiation, interrupt handlers do `E := change events; SVCa Request()`, and user tasks run a `syscall block` that disables SVCa, marks the task not runnable, calls `SVC now()`, re-enables SVCa and waits for `SVCa Req` to clear (Appendix A, p. 18).
3. Generate OG conditions for the composed model.
4. Automatically remove redundant conditions before invoking Isabelle/HOL proof methods. The paper reports: “As expected, at first there are a very large number of verification conditions: on the order of 10,000. However, by just defining a method that automatically removes any redundant conditions we can easily reduce this to under 500.” (Section 4, p. 16)
5. Discharge conditions with standard Isabelle/HOL methods; the paper says the last 10 needed human guidance and that this number might be reduced by small improvements to automation (Section 4, p. 16).

Verus form (inference)

Inference: stage Verus verification similarly: write contracts and loop invariants, prove generic scheduler/interrupt lemmas once, then run the verifier and eliminate duplicate obligations through reusable lemmas. Unlike Isabelle's reported tactic, Verus's SMT proof search will need explicit trigger-friendly predicates and may require manual `assert` steps.

evidence and limits

After reduction to under 500, “The majority of these are then trivial enough to be automatically solved by standard Isabelle/HOL methods, with the final 10 conditions requiring human guidance.” (Section 4, p. 16) The paper calls this an "initial verification" ("we have begun initial verification of our model", Section 4, p. 16); it states no completed functional correctness theorem for eChronos and does not report that the final 10 conditions were discharged. "Validating the hardware abstractions still requires informal arguments" (Section 4, p. 16), and the atomicity of single OG statements awaits refinement proofs.

## what is proved, measured, and trusted

Formalised in Isabelle/HOL (Section 1, p. 11; Appendix B): controlled OG, the interrupt/SVC hardware interfaces, and an eChronos scheduling model. No theorem about the model is reported as proved; only initial verification-condition reduction is reported. Reported numbers (Section 4, p. 16): on the order of 10,000 initial conditions, under 500 after automatic removal of redundant conditions, and 10 requiring human guidance. Assumed (Section 4, pp. 15–16): ARM-manual-based atomicity of the hardware operations, atomicity of single OG statements, and application compliance with the hardware-variable access discipline. Inference: Isabelle's kernel is also trusted, as in any Isabelle development; the paper does not discuss it. The paper does not report a percentage success rate, runtime, or a refinement theorem to the deployed implementation.

## techniques for the catalog

- active-task controlled OG — guard each atomic command with `AWAIT AT=task` and model yields as atomic active-task changes
- nested-interrupt stacks — save active task and interrupt masks on stacks, enforce enablement and priority policy, and restore on return
- SVC transition modelling — represent synchronous and asynchronous supervisor calls as guarded atomic state transitions with request bits
- obligation reduction — automatically remove redundant OG conditions (about 10,000 down to under 500) before Isabelle discharge
