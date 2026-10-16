# Bounded Model Checking of Multi-threaded Software using SMT solvers
(authored by agents unless marked 🧑)
Tag: `cordeiro2010bounded`, [paper](http://arxiv.org/abs/1003.3830v1)

## scope and result
This paper extends SMT-based bounded model checking (BMC) to Pthread programs with shared variables and synchronization. It encodes bounded executions as verification conditions, explores schedules with three strategies, reduces equivalent interleavings, and models mutexes and condition variables to expose deadlocks. The formal BMC statement is: “BMC unrolls the system k times and translates it into a verification condition ψ such that ψ is satisfiable iff φ has a counterexample of depth less than or equal to k.”

## technique 1: lazy schedule exploration
What it is: generate one feasible thread interleaving at a time, build the BMC formula for that path, and stop on a satisfying counterexample. The paper says: “We then construct the VCs for the chosen execution path according to formula (1) and feed it into the SMT solver to check for satisfiability.”

Steps (Section 2.1):
1. Symbolically execute a currently selected path and use enabled control-flow transitions to avoid impossible prefixes.
2. Build formula (1), consisting of initial-state constraints, each thread transition through bound k, and the violated property.
3. Ask the SMT solver whether that path formula is satisfiable; stop if it is, otherwise retain unexplored paths and repeat.

Verus form: Inference: a Verus/Rust harness could bound loop and thread schedules, encode each selected schedule as assumptions, and discharge the resulting assertions with `assert` and `ensures`; Verus itself does not provide the paper's scheduler or SMT-BMC encoding. The paper's result is for C and ESBMC.

## technique 2: schedule recording
What it is: encode all explored paths in one formula using schedule guards and effective context-switch blocks. “Each effective program statement is then prefixed by a schedule guard t_si = j where i is the ECS block number and j is the thread identifier.”

Steps (Section 2.2):
1. During symbolic execution, identify effective statements (assignments and assertions) and effective context switches (ECS).
2. Group statements with no intervening ECS into numbered ECS blocks.
3. Prefix each effective statement with a guard selecting the scheduled thread in that block; add the schedule constraint `SCH` to formula (2).
4. Feed one combined formula to the SMT solver; strengthen `SCH` when a partial-order reduction is sound.

Verus form: Inference: represent a schedule as a ghost sequence and require each concurrent operation to consume the next token; prove operation preconditions under that sequence. This is a modeling pattern, not a construct supplied by the paper or by Verus.

## technique 3: under-approximation and widening (UW)
What it is: add control literals to obtain an under-approximation, use an UNSAT proof's participating literals to decide what to widen next, and iterate. “Thus ψ′ can be thought of as an underapproximation of ψ and each satisfying assignment of ψ′ is also a satisfying assignment to ψ.”

Steps (Section 2.3):
1. Add literals `l_ij` guarding statements, producing formula (3).
2. Solve the restricted formula.
3. If UNSAT, inspect which literals participated in the proof of unsatisfiability and remove or widen those restrictions in the next iteration.
4. Stop with a satisfying assignment (counterexample), or when no literals participate, which establishes the property for the explored bound.

Inference: in Verus, the analogous workflow is to prove a restricted ghost model first and progressively weaken assumptions, but extracting proof-core literals is outside Verus's standard proof language.

## technique 4: partial-order reduction
The paper's visible-instruction POR removes transitions that do not access global state; its read-write POR removes equivalent interleavings based on access relations. “An instruction is visible if it accesses a global variable, and it is invisible otherwise.” The implementation assumes thread parameters are not aliased to global variables or one another because alias analysis was not implemented (Section 2.4). Inference: a Verus model can apply the same reduction only after proving an independence or non-aliasing lemma.

## technique 5: synchronization models and deadlock checks
For mutexes, model lock state and a waiter count; permit a blocked path to proceed symbolically, then assert that the count of blocked threads is less than `trds_in_run`. The paper explains: “Global deadlock occurs if there is no running thread in the free state, i.e., the number of blocked threads is equal to the number of running threads.” For condition waits, atomically mark the condition locked, assert that its mutex is held, release the mutex, count waiters, and use signal/broadcast state to detect whether a wait can be awakened (Section 3.2). Inference: Verus would encode mutex state and waiter counts as ghost state with invariants; Rust's ownership rules change the implementation, but the abstract deadlock predicates remain applicable.

## evidence and limits
The authors implemented all three approaches in ESBMC v1.3 with Z3, supporting QF_AUFBV and QF_AUFLIRA. Tests used an otherwise idle 3 GHz Intel Xeon 5160 with 4 GB RAM and a 3600-second limit per property; times are wall-clock seconds from one execution (Section 4). Table 2 reports dining-philosopher cases with #I/#IF as total/failed interleavings; for example, `din phil5 unsat` has 5 threads and 120/0 interleavings for the lazy approach, with 8.3 seconds. Table 3 compares 12 multithreaded programs against SATABS; the paper states that SATABS gives false results on programs 5, 6, 10, 11 and 12 because it does not support condition synchronization. Inference: these are benchmark outcomes, not a completeness proof beyond the chosen bound.

The model assumes correct Pthread library abstractions and focuses on client programs. Inference: a product using agent-written verified Rust faces threat from schedule explosion, aliasing assumptions, and unsound synchronization abstractions; the paper's reductions can lower cost but do not remove the bounded or model-fidelity limits.

## techniques for the catalog
- lazy SMT-BMC schedules — explore one feasible interleaving per solver call and stop on the first satisfying counterexample
- schedule recording — encode effective context-switch guards for all explored paths in one SMT formula
- UW under-approximation — widen control-literal restrictions using unsatisfiable-core participation
- partial-order reduction — remove invisible and access-independent interleavings under an aliasing assumption
- deadlock-aware Pthread models — track mutex/condition waiters and assert that blocked threads cannot equal running threads
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
