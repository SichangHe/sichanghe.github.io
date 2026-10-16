# Verification of the Tree-Based Hierarchical Read-Copy Update in the Linux Kernel
(authored by agents unless marked 🧑)
Tag: `liang2016verification`, [paper](http://arxiv.org/abs/1610.03052v3)

## what the paper proves and measures

The paper verifies a model of the non-preemptible Tree RCU implementation from Linux kernel 4.3.6. Its safety property is the Figure 2 assertion `assert(r2 == 0 || r1 == 1)`: a reader that overlaps an updater's grace period cannot observe the forbidden ordering. Its liveness check replaces that assertion with `assert(0)` after both RCU tasks finish; reaching the assertion demonstrates that a grace period completed (§6.1, p. 9). The model covers RCU-sched with two CPUs in the worked scenario and configurations up to 16 CPUs by default or 32 or 64 CPUs in non-default configurations (§5, p. 9).

The paper's central technique is source-level model construction. It starts with Linux C rather than a manually translated model. The authors write: “We then discuss how to construct a model directly from Tree RCU’s source code in C, and use the CBMC model checker to verify its safety and liveness properties.” (Abstract, p. 1). Construction stubs calls into the rest of the kernel, removes irrelevant functions and data, and uses reusable macros for the kernel environment; it changes per-CPU structures into arrays indexed by CPU ID (§5, p. 8). The resulting model has 8,626 lines of C, including about 900 lines for the Linux environment (§5, p. 8).

## technique 1: build a verification model by adapting production C

What it is. The implementation itself is the model subject. The adaptation preserves Tree RCU's source paths while supplying only the kernel context needed by CBMC. The paper says, “Model construction entailed stubbing out calls to other parts of the kernel, removing irrelevant functionality (such as idle-CPU detection), removing irrelevant data (such as statistics), and adding preprocessor directives to conditionally inject bugs (described in Section 6.1).” (§5, p. 8)

When to use it. Use this approach when the implementation changes frequently and a separate formal model would drift. The introduction states that Linux releases are about 60 days apart and RCU changes with each release, so a model intended for regression must remain synchronized (§1, p. 2).

How to do it.

1. Select the concrete implementation variant. The study selects non-preemptible RCU-sched and the three primitives used by the scenario: `rcu_read_lock()`, `rcu_read_unlock()`, and `synchronize_rcu()` (§4, p. 7)
2. Stub external kernel calls and remove paths outside the property. Keep the RCU data structures and control flow, but remove idle-CPU detection, statistics, callback list code, and other irrelevant functionality (§5, p. 8; §6.3, p. 10)
3. Replace per-CPU storage with arrays indexed by CPU ID. The paper uses this to make the model executable while retaining per-CPU state (§5, p. 8)
4. Add preprocessor-controlled mutation points for the bug scenarios in §6.1 (§5, p. 8)
5. Keep assertions and make the model runnable as an ordinary user program. The paper says the model “contains assertions and can be also run as a user program, which provides important validation of the model itself.” (§5, p. 8)

Verus form. Inference: translate the selected Rust implementation into executable Rust plus specifications and proof code. Use `requires`, `ensures`, loop `invariant` clauses, and proof functions for the RCU safety and progress contracts; use ghost state or a Verus state-machine encoding to represent the abstract grace-period state. Inference: represent each CPU's state in a Rust array or proof-oriented map and preserve ownership or permission facts when a CPU reports a quiescent state. Inference: external kernel behavior must be given explicit specifications or modeled as trusted assumptions, because Verus proofs only establish the written contracts.

Evidence. The model has 8,626 C lines, of which about 900 model the Linux environment (§5, p. 8). The CBMC experiments verified a concrete two-CPU harness, and the paper reports that its model covers server-class paths and configurations up to 16, 32, or 64 CPUs (§5, p. 9).

Limits. The authors explicitly exclude CPU hotplug and dyntick-idle, thread-migration failure modes involving per-CPU variables, and RCU priority boosting; they assume that all CPUs are busy executing RCU-related tasks (§5, p. 9). The harness exercises one grace period only, so it cannot detect failures involving multiple grace periods (§5, p. 9). Inference: a Verus model that omits these paths would prove only the selected RCU slice, not Linux Tree RCU as deployed.

## technique 2: encode scheduling and synchronization explicitly

What it is. The model supplies a small environment for concurrency that CBMC can explore. A `cpu_lock` integer array records which task runs on each CPU; a task acquires its CPU's exclusive lock when scheduled and releases it when scheduling away. Two integer arrays model interrupt-disable nesting depth and whether interrupts are disabled (§5, p. 8). Spin locks use CBMC's atomic primitives and assumptions: “CBMC’s CPROVER atomic_begin(), CPROVER atomic_end(), and CPROVER assume() built-in primitives are used to construct atomic test-and-set for spinlock_t and raw_spinlock_t acquisition and atomic reset for release.” (§5, p. 8)

When to use it. Use this encoding when the production scheduler is too large for direct verification but the property depends on task interleavings, lock exclusion, and context switches.

How to do it.

1. Index per-CPU state by CPU ID and track the current task with `cpu_lock` (§5, p. 8)
2. Model only voluntary context switches for the non-preemptible configuration; acquire the CPU lock on scheduling in and release it on scheduling out (§5, p. 8)
3. Use atomic begin/end around test-and-set and an assumption to express lock acquisition; use an atomic reset for release (§5, p. 8)
4. Invoke the context-switch and callback functions directly after releasing a CPU. This substitutes for a separate scheduling-clock thread (§5, p. 8; §6.3, p. 10)

Verus form. Inference: represent lock ownership as a ghost permission or state-machine token, and prove that only the owning CPU can mutate protected RCU-node fields. Inference: use executable Rust atomics for the implementation and prove their abstract transition relation with `proof fn` lemmas and `ensures`; do not call proof functions as runtime scheduling operations. Inference: encode the scheduler assumptions in preconditions and transition guards, rather than treating a proof-only lock as an executable lock.

Evidence and limits. The direct-call approximation makes one injected error (Bug 7) invisible under one reader and sequential consistency, while CBMC detects it with two readers or under TSO or PSO (§6.4, p. 11). Inference: the abstraction can erase the very interleaving needed to expose a race, so the environment model must be checked against the production scheduler semantics.

## technique 3: bounded model checking across memory models

What it is. CBMC translates C to a SAT/SMT formula and checks assertions under a loop-unwinding bound. The paper explains: “CBMC can demonstrate violation of assertions in C programs, or prove their safety under a given loop unwinding bound.” (§5, p. 7). It supports sequential consistency (SC), total store order (TSO), and partial store order (PSO) (§5, p. 7; §6.4, p. 10).

How to do it.

1. Build the adapted C model with assertions for the RCU safety property and the liveness reachability check (§4, p. 7; §6.1, p. 9)
2. Select the memory model. Run `Prove` under SC and `Prove-TSO` or `Prove-PSO` for weak memory; run corresponding `Prove-GP` scenarios with `assert(0)` to check grace-period completion (§6.4, p. 10)
3. Set loop bounds precisely. The authors use `--unwindset` for each compile-time-decidable loop instead of a single large `--unwind`, reducing formula growth (§6.3, p. 10)
4. Use `--ILP32` for the two-CPU harness so integers, longs, and pointers have 32-bit encodings; the paper reports that this halves formula size compared with 64-bit defaults (§6.3, p. 10)
5. Read the SAT result and, if satisfiable, extract the error trace. CBMC's satisfying assignment gives the exact event sequence for an assertion violation (§5, p. 7)

Evidence. Table 2 reports `Prove` under SC with 5.2 million constraints, 30.0 million variables, 149.7 million clauses, 23 GB maximum virtual memory, 9 hours 24 minutes solver time, and 9 hours 36 minutes total time; result Safe (Table 2, p. 11). `Prove-TSO` used 42.0 million variables and 210.7 million clauses, 34 GB, and 11 hours 4 minutes total; `Prove-PSO` used 41.3 million variables and 207.0 million clauses, 34 GB, and 11 hours 36 minutes; both were Safe (Table 2, p. 11). The corresponding grace-period checks returned “GP Completed” in 4 hours 5 minutes (SC), 13 hours 14 minutes (TSO), and 8 hours 37 minutes (PSO) (Table 2, p. 11). These are one run per listed scenario, not percentages over repeated runs.

Verus form. Inference: express the memory-ordering guarantee as a specification over atomic operations and prove the RCU state-machine transitions under the chosen memory model abstraction. Inference: Verus does not inherit CBMC's automatic exploration of all C executions; a Rust proof must state the interleaving and atomicity contracts that the Verus library and model support. Inference: use loop invariants and lemmas in place of CBMC's unwinding bound when proving unbounded Rust loops, while retaining bounded harnesses for regression testing.

Limits. CBMC's safety result is bounded by loop unwinding (§5, p. 7). The paper's harness has one grace period and omits several RCU paths (§5, p. 9). Inference: the reported Safe result is conditional on these bounds and modeled assumptions.

## technique 4: inject faults and validate the harness before trusting proofs

What it is. The authors mutate specific implementation statements to create seven safety or liveness failures, then check whether user-space testing and CBMC expose them (§6.1, pp. 9–10). Bug 1 returns from `synchronize_rcu()` immediately, violating the safety assertion; Bugs 2–6 prevent quiescent states from being recorded or propagated, so the grace period hangs; Bug 7 reports quiescent states too early (§6.1, pp. 9–10).

How to do it.

1. Define a base safety assertion from a small reader/updater example (§4, p. 7)
2. Define liveness as reachability of `assert(0)` after the two RCU tasks complete (§6.1, p. 9)
3. Inject one localized mutation per scenario, preserving the rest of the model (§6.1, pp. 9–10)
4. Run the model as a user program 1,000 times per scenario, with a 60-second timeout and a random reader delay from 0 to 1 second (§6.2, p. 10)
5. Run CBMC under SC, TSO, and PSO and compare the result with the expected failure class (§6.4, p. 10)

Evidence. In Table 1, the unmodified `Prove` scenario had 1,000/1,000 successful runs (100.0%) and no failures or timeouts; `Prove-GP` had 1,000/1,000 failing runs (100.0%) because the intentional `assert(0)` was reached (Table 1, p. 10). Bug 1 had 539 failing runs (53.9%) and 461 successful runs (46.1%) out of 1,000; Bugs 2–6 each timed out in 1,000/1,000 runs (100.0%). Bug 7 with one reader timed out or missed the assertion in all 1,000 runs, while the two-reader variant failed in 242/1,000 runs (24.2%) (Table 1, p. 10). CBMC returned the expected result for every SC scenario except Bug 7 with one reader; it reported Bug 7 with two readers or under TSO or PSO (§6.4, p. 11).

Verus form. Inference: keep mutation tests as an external regression harness around the Verus proof. Use a deliberately weakened executable transition or contract in a test configuration and require a failing `assert` or an unprovable `ensures`; do not weaken the production specification to make the test pass. Inference: pair safety assertions with a progress witness, such as a proved transition to a completed grace period, because safety alone cannot detect a system that never completes.

Limits and trusted parts. The testing harness is probabilistic and misses Bug 7 in the one-reader SC setting. CBMC's Bug 7 two-reader PSO run ran out of memory (Table 2, p. 11). Inference: fault injection demonstrates sensitivity of this harness; it does not establish completeness. The model, CBMC, SAT/SMT solver, compiler, the selected memory-model semantics, and the correctness of the written assertions remain trusted or outside this paper's proof boundary.

## implications for VL

Inference: the paper presents a credible pattern for agent-written verified Rust: preserve the production implementation, isolate environment assumptions, state a small safety contract and an explicit progress condition, then test the harness with faults before trusting a proof. Inference: this is a substantial threat to a product that emits verified Rust only if the product silently models away scheduler interleavings or reports a bounded proof as an unqualified system guarantee. Inference: the measured cost, 23–34 GB and roughly 9–12 hours for the unfaulted two-CPU scenarios, also threatens an interactive workflow unless VL separates small proof obligations from nightly whole-model checks. Inference: what the paper already did and VL should not redo is direct source-level CBMC modeling of Tree RCU's selected non-preemptible paths, including SC, TSO, and PSO checks and localized fault injection. Inference: a useful VL extension would be to generate the environment contract, memory-model assumptions, and mutation tests from the Rust API while making every omitted path visible to the user.

## what remains trusted

The paper proves properties of the adapted C model under CBMC's bounded exploration and selected memory models. The Linux kernel outside the model, omitted RCU features, scheduler approximation, compiler, CBMC translation, SAT solver, and the assertions' adequacy are trusted or assumed. The paper itself records the key scope assumptions: “We model only the fundamental components of Tree RCU” and “we make the assumption that all CPUs are busy executing RCU related tasks.” (§5, p. 9)

## techniques for the catalog

- source-aligned C modeling: adapt production C with stubs, reusable environment macros, removed irrelevant paths, per-CPU arrays, and assertion-bearing harnesses
- explicit concurrency environment: encode CPU ownership, context switches, interrupt state, and atomic spin locks with a small executable scheduler model
- bounded weak-memory checking: run CBMC under SC, TSO, and PSO with precise loop unwinding and reduced-width encodings
- fault-injection validation: mutate safety and progress paths, run 1,000 randomized user-space trials, and compare failures with CBMC results
- formula engineering: simplify thread and list structure, specialize tree traversal, set per-loop bounds, and use `--ILP32` to make bit-precise checking feasible
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
