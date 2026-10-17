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
What it is: encode all explored paths in one formula using schedule guards and effective context-switch blocks. “Each effective program statement is then prefixed by a schedule guard tsi = j where i is the ECS block number and j is the thread identifier.”

Steps (Section 2.2):
1. During symbolic execution, identify effective statements (assignments and assertions) and effective context switches (ECS).
2. Group statements with no intervening ECS into numbered ECS blocks.
3. Prefix each effective statement with a guard selecting the scheduled thread in that block; add the schedule constraint `SCH` to formula (2).
4. Feed one combined formula to the SMT solver. Optionally add constraints to `SCH` to remove interleavings that do not contribute to checking the property; the paper's example adds ts1 = 2 and ts2 = 1 to drop the interleaving {Y1}. With no constraints, all interleavings are considered.

Verus form: Inference: represent a schedule as a ghost sequence and require each concurrent operation to consume the next token; prove operation preconditions under that sequence. This is a modeling pattern, not a construct supplied by the paper or by Verus.

## technique 3: under-approximation and widening (UW)
What it is: add control literals to obtain an under-approximation, use an UNSAT proof's participating literals to decide what to widen next, and iterate. “Thus, ψ′ can be thought of as an underapproximation of ψ and each satisfying assignment of ψ′ is also a satisfying assignment to ψ.”

Steps (Section 2.3):
1. Add literals `l_ij` guarding statements, producing formula (3). Initially every literal is false, and at each state only the enabled transitions of the thread with the smallest index are expanded.
2. Solve the restricted formula.
3. If UNSAT, inspect which literals participated in the proof of unsatisfiability and remove or widen those restrictions in the next iteration.
4. Stop with a satisfying assignment (counterexample), or when none of the additional literals participates in the proof of unsatisfiability; the paper then concludes that the property holds because the procedure does not rely on the under-approximation. Inference: as in any BMC, this holds for the unrolling bound k.

Inference: in Verus, the analogous workflow is to prove a restricted ghost model first and progressively weaken assumptions, but extracting proof-core literals is outside Verus's standard proof language.

## technique 4: partial-order reduction
The paper's visible-instruction POR removes transitions that do not access global state; its read-write POR removes equivalent interleavings based on access relations. “An instruction is visible if it accesses a global variable, and it is invisible otherwise.” The implementation assumes thread parameters are not aliased to global variables or one another because alias analysis was not implemented (Section 2.4). Inference: a Verus model can apply the same reduction only after proving an independence or non-aliasing lemma.

## technique 5: synchronization models and deadlock checks
For mutexes (Section 3.1, Figure 6), model lock state and a count of threads waiting on the mutex; instead of blocking a path whose lock is already held, ignore the mutex state and lock it again, then assert that the count is less than `trds_in_run`, the number of running threads. The paper explains: “Global deadlock occurs if there is no running thread in the free state, i.e., the number of blocked threads is equal to the number of running threads.” For condition waits, atomically mark the condition locked, assert that its mutex is held, release the mutex, count waiters, and use signal/broadcast state to detect whether a wait can be awakened (Section 3.2). Inference: Verus would encode mutex state and waiter counts as ghost state with invariants; Rust's ownership rules change the implementation, but the abstract deadlock predicates remain applicable.

## evidence and limits
The authors implemented all three approaches in ESBMC v1.3 with Z3, supporting QF_AUFBV and QF_AUFLIRA. Tests used an otherwise idle 3 GHz Intel Xeon 5160 with 4 GB RAM and a 3600-second limit per property; times are wall-clock seconds from one execution (Section 4). Table 2 reports dining-philosopher cases with #I/#IF as total/failed interleavings; for example, `din phil5 unsat` has 5 threads and, for the lazy approach, 120/0 interleavings and 11.1 seconds (schedule recording 8.3, UW 8.7). Table 2 compares against MPOR and PPOR (dining philosophers, 2 to 7 philosophers). Table 3 compares UW, schedule recording and lazy ESBMC against SATABS on 24 programs: 1-12 dining philosophers, 13-22 from the INSPECT suite, 23-24 from Helgrind. Programs 19-22 were not run with SATABS because it does not support the condition synchronization primitive. The paper says UW ESBMC outperforms SATABS except on programs 5, 6, 10, 11 and 12, and that SATABS “provides false results for programs 7-12, 15, 23, and 24” and times out on 17 and 18; it concludes that SATABS “does not seem to explore all interleavings”. In Table 2 and Table 3, UW and schedule recording hit time or memory limits on 7 philosophers, and the paper says its SMT-based procedures “do not scale well for problems of increasing complexity”. The authors report that enabling proof generation to extract unsatisfiable cores always brought memory overhead and slowdowns, and the unsatisfiable core was capped at 500 control literals because Z3 segfaults on thousands. Context switches inside a single statement are not modelled: “This approach is safe as long as statements only read or write a single global variable, but is an under-approximation to programs that contain statements involving multiple global variables.” Inference: these are benchmark outcomes, not a completeness proof beyond the chosen bound.

The model assumes correct Pthread library abstractions and focuses on client programs. Inference: a product using agent-written verified Rust faces threat from schedule explosion, aliasing assumptions, and unsound synchronization abstractions; the paper's reductions can lower cost but do not remove the bounded or model-fidelity limits.

## techniques for the catalog
- lazy SMT-BMC schedules — explore one feasible interleaving per solver call and stop on the first satisfying counterexample
- schedule recording — encode effective context-switch guards for all explored paths in one SMT formula
- UW under-approximation — widen control-literal restrictions using unsatisfiable-core participation
- partial-order reduction — remove invisible and access-independent interleavings under an aliasing assumption
- deadlock-aware Pthread models — track mutex/condition waiters and assert that blocked threads cannot equal running threads
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We assume that the library function implementations are correct and focus our effort only on verifying client programs that use them."): read the whole paper text and checked every quotation, the tag, the Section 2-4 technique steps and the Table 2 and Table 3 numbers; changed a quote typo (tsi), the SCH step, the UW stopping condition, the mutex description, the Table 2 timing (8.3 s is schedule recording, lazy is 11.1 s), the Table 3 description (24 programs, not 12) and the wrong reason given for the SATABS false results (the paper does not tie them to condition synchronization), and added the single-statement context-switch limit; did not check the PDF figures or the cited references, and the Verus-related sentences are marked Inference and are not from the paper.
