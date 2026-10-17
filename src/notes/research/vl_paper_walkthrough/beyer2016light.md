# A Light-Weight Approach for Verifying Multi-Threaded Programs with CPAchecker
(authored by agents unless marked 🧑)
Tag: `beyer2016light`, [paper](https://doi.org/10.4204/EPTCS.233.6)

## what is proved or measured
The paper defines ThreadingCPA, a configurable program analysis (CPA) for bounded-thread C programs in CPAchecker. Its abstract says: “We introduce a new configurable program analysis for verifying multi-threaded programs with a bounded number of threads.” The analysis explores thread interleavings on a control-flow automaton (CFA), while leaving the data-flow abstract domain to existing CPAs such as value, interval, and BDD analysis. The authors state: “The approach is sound and can be combined with several steps of optimization to achieve an efficient analysis for multi-threaded programs.”

A CFA is `A = (L, l0, G)`: locations, initial location, and assignment/assumption edges. A concrete state assigns values to program variables. The reachability algorithm lazily builds an abstract reachability graph (ARG). ThreadingCPA replaces LocationCPA and CallstackCPA; each abstract state maps every active thread identifier to one program location (and, in the implementation, one call stack). Its domain is a flat semilattice of such mappings, with a top unknown location. `mergesep` does not combine different states and `stopsep` covers only equal states.

## technique 1: on-the-fly interleaving transfer
what it is: represent the global state as all active thread locations and produce one successor for every enabled thread edge. This enumerates interleavings without first sequentializing source code.

when to use: use it for bounded thread creation and `pthread_join` programs when the property is reachability or another observer property over reachable states.

how to do it:
1. parse the C program into a CFA and begin with the main entry location (Section 2.1)
2. keep one `(thread identifier -> CFA location)` entry for every active thread (Section 2.2)
3. for each active thread, apply its LocationCPA transfer and enqueue every successor; the paper says “The transfer relation returns all possible successors for all threads that are active in an abstract state” (Section 2.2, PDF p. 3)
4. on `pthread_create`, retain the creator's successor and add the new thread at its entry location; on `pthread_join`, remove the exited thread only when its exit location is present; otherwise advance the selected thread normally (Section 2.2)
5. treat C statements as atomic CFA edges, so interleaving happens at statement level (Section 2.2)

The running example creates two threads that update globals `i` and `j`, joins both, then asserts `j <= 8`. The ARG labels each state with locations of all active threads; joining removes the exited thread location (Section 2.3, pp. 4–5).

Inference: in Verus, model thread state as ghost data (for example, a sequence or map of per-thread control states) and write a `spec fn` transition relation. Use executable Rust APIs with `requires` for enabled create/join operations and `ensures` for the resulting state, and `proof fn` lemmas to show each transition preserves a reachability invariant. Verus does not automatically enumerate all interleavings; the agent must provide a finite-state abstraction or prove a transition-system invariant. The paper's CFA and CPA classes have no direct Verus syntax.

## technique 2: reached-set partitioning
what it is: restrict `merge` and `stop` comparisons to states with the same tuple of program locations for all threads. The paper explains: “Partitioning the set of abstract states makes it possible to perform both operations much more efficiently.”

how to do it:
1. choose a constant partition key from the abstract state's thread-location tuple (Section 3.1)
2. index reached states by that key
3. apply merge and coverage only within the matching partition
4. combine this partitioning with partitions supplied by other CPAs (Section 3.1)

Inference: the Verus analogue is to expose a state-indexed lemma whose precondition fixes the same control-state variant before applying a stronger invariant fact. This is an engineering decomposition, not a Verus optimization primitive; solver performance must be measured rather than assumed.

## technique 3: waitlist ordering
what it is: prioritize states likely to expose a short error path. The implementation adds ordering by number of active threads, then can use BFS or DFS as a tie-breaker.

how to do it:
1. store reached but unexplored ARG states in a waitlist (Section 3.2)
2. sort by fewer active threads first, optionally then by exploration order
3. continue ordinary transfer and coverage

This is a heuristic: the paper says “For a bug-free program this heuristic does not bring any benefit. however an existing error path in a faulty program might be found sooner.” (Section 3.2). Section 5.1 adds that it can reach unsupported operations (such as assigning several thread instances to the same thread identifier) earlier, so the analysis can abort sooner. Inference: it only reorders exploration, so it does not change the reachable-state set when resources are unlimited.

Inference: a Verus proof-search agent can use the same priority to choose which failing transition or invariant obligation to attack first, but the final proof must cover every required transition; a priority queue cannot justify omitting cases.

## technique 4: partial-order reduction (POR)
what it is: collapse sequences of thread-local operations because they cannot interact with another thread. The paper states: “If a statement is thread-local for a thread, we do not simulate any interleaving after analyzing this operation.”

how to do it:
1. statically classify variables and memory accesses as global or thread-local (Section 3.3)
2. mark CFA edges touching only thread-local state as local; dummy operations such as temporaries and returns are often local
3. execute consecutive local edges in the current thread without synchronizing with other threads
4. synchronize at the next global operation, preserving all interactions there
5. for loops, execute both loop and concurrent-thread paths; no special loop detector is required (Section 3.3)

The authors call this sound because local operations cannot interact by the definition of thread-local. Inference: a Verus encoding needs a proved disjointness/ownership fact before commuting operations; Rust ownership may establish some disjointness, but shared-memory or unsafe code requires explicit invariants. Treating an operation as local without such a proof is unsound.

## technique 5: CFA cloning, deadlock observers, and mutex state
CFA cloning handles function-local name collisions when one function executes in several threads: clone function `f` as `f'`, rename all identifiers, and thus make `f::x` and `f'::x` distinct (Section 4.1). Inference: a Verus model should instead carry an explicit thread identifier in ghost state or use ownership-parameterized resources; textual cloning is a source transformation and does not follow from Rust's type system.

Deadlock detection is an observer automaton over ThreadingCPA abstract states. Mutexes are stored in the abstract state; if a requested lock is unavailable, the transfer yields no successor. Atomic sequences use a distinguished mutex, and consecutive thread-local edges are analyzed as one atomic sequence (Sections 4.2–4.3). Inference: represent a lock owner and lock-protected predicate in Verus ghost state, use `requires` to demand ownership, and prove that each transition preserves the lock invariant. A Verus proof of absence of deadlock additionally needs a progress/order argument; merely having a mutex predicate does not provide one.

## evidence, limitations, and trust
The evaluation used 1,016 SV-COMP’16 multi-threaded C tasks, CPAchecker 1.6.1 revision 23 011, a 2.6 GHz Intel Xeon E5-2650 v2 running Ubuntu 16.04, and 15-minute/15-GB limits per run (Section 5, PDF p. 7). Quantile plots compare plain value analysis, partitioning, waitlist ordering, and POR, and compare value, interval, and BDD domains. The paper reports that partitioning reduced runtime by “more than an order of magnitude”; waitlist ordering improved runtime mainly on violation tasks but produced no additional correctly solved tasks in this benchmark; POR reduced explored states and increased performance (Section 5.1). The paper gives plots rather than a table of solved-task fractions, so no denominator supports a percentage claim. Comparisons with CBMC and VVT show competitive runtime, but the authors note missing pointer-aliasing and array support and the simplicity of POR prevent CPAchecker from solving as many tasks within the limit (Section 5.3).

The paper states “The approach is sound” without a separate proof. Inference: the claim holds only under the stated CFA semantics, atomic statements, bounded threads, and conservative local/global classification. Inference: trusted components include CFA construction, each abstract domain, the reachability implementation, and the correctness of the POR classification. Inference: for a Verus product, Verus's verifier and solver remain the acceptance boundary, while the agent's interleaving exploration, state partitioning, and repair priorities are search components. The paper's bounded thread identifiers, fixed clone count, no pointer-aliasing thread IDs, and simple locking do not cover arbitrary Rust concurrency. Inference: threat to agent-written verified Rust is moderate for concurrent protocol specifications: these techniques can guide ghost-state models and proof search, but a claimed verified implementation can still omit an interleaving or weaken the specification unless Verus checks a complete transition invariant.

## techniques for the catalog
- ThreadingCPA interleaving transfer — represent all active thread locations and generate one successor per enabled thread edge
- reached-set partitioning — restrict merge and coverage to states sharing the tuple of thread locations
- thread-count waitlist ordering — prioritize states with fewer active threads to find short violations sooner
- thread-local partial-order reduction — execute local edges without synchronization until the next global operation
- CFA cloning for thread-local names — clone each function per thread to keep analysis identifiers unique
- observer deadlock detection — monitor ThreadingCPA states with an automaton that reports mutual waiting
- mutex-aware transfer — carry lock availability in the abstract state and suppress blocked successors
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our solution is simple: We use different function names for each thread by cloning the function and inserting the corresponding indexed function name."): read all 11 pages (pdftotext) and compared every quotation, section and page reference, the transfer-relation steps, evaluation setup (1,016 tasks, CPAchecker 1.6.1 rev. 23 011, Xeon E5-2650 v2, 15 min/15 GB), and the Section 5.1-5.3 claims; changed the link to the DOI printed in the paper (doi:10.4204/EPTCS.233.6), replaced a misquote in technique 3 (the earlier text attributed to the paper a phrase it does not contain), reworded step 5 of technique 1 (its clause about running until the property or a resource limit is decided was not in the paper), and marked the soundness-scope and trusted-component sentences and the waitlist reachable-set claim as Inference; did not check the PDF figures (Fig. 1-6) beyond the text extraction, the cited references, or any claim about Verus beyond marking it Inference.
