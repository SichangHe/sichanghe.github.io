# Multi-Threaded Software Model Checking via Parallel Trace Abstraction Refinement
(authored by agents unless marked 🧑)
Tag: `barth2026multithreaded`, [paper](https://arxiv.org/abs/2509.13699v2)

## scope and result

This paper parallelizes trace abstraction, an automata-based software model-checking algorithm for safety properties. Its implementation in Ultimate Automizer analyzes different syntactic paths in parallel, while a coordinator performs path selection and abstraction refinement. Barth and Jakobs write: “More concretely, our approach analyzes different traces (syntactic program paths) that could violate the safety property in parallel.” (Abstract, p. 1.) The supplied paper is arXiv:2509.13699v2, dated 15 Jan 2026 (p. 1).

The evaluation uses Ultimate Automizer 0.3.0-474959ed, four parallel configurations with 1, 2, 4, and 6 workers, the sequential SV-COMP configuration, and DSS. It runs all 14,560 sequential-C, `unreach-call` tasks from SV-COMP 2025: 11,158 property-adhering and 3,402 property-violating tasks (Section 4.1, p. 10). Runs have 8 CPU cores, 15 minutes of wall time, and 30 GB memory on an Intel Xeon E3-1230 v5 machine (Section 4.1, p. 11). The authors specify: “We limit each run of any tool configuration on a verification task to 8 CPU cores, 15 min of wall time and 30 GB of memory and enforce the limits with BenchExec [10] (version 3.18).” (Section 4.1, p. 11.)

## technique 1: sequential trace abstraction and CEGAR

what it is and when to use it

A program automaton accepts syntactic traces that reach an error location. The presentation uses assignments and assume statements over integer variables; the implementation supports C statements (Section 2.1, p. 3, footnote 2). The current abstraction automaton A contains syntactic error traces not yet excluded as infeasible (Sections 2.1–2.2, pp. 3–5). Safety properties are encoded by error locations. The authors state: “Thus, the set SI contains all traces that model a syntactic program path that may end in an error location.” (Section 2.1, p. 4.)

how to do it

1. initialize A with the program automaton AP
2. if L(A) is empty, return SAFE
3. select a trace π from L(A), using breadth-first search
4. construct an SSA formula φπ for π and call an SMT solver
5. if φπ is SAT, return UNSAFE because π is a feasible error path
6. if φπ is UNSAT, derive interpolants and build an interpolant automaton Aπ accepting π and paths with similar reasons for infeasibility
7. refine by computing A := A \ Aπ and repeat (Algorithm 1, p. 4; Section 2.2, pp. 4–5)

The paper’s NotZero example illustrates formulas. For the else path `!(x > 0), !(x > −10), !(x != 0)`, it checks `¬(x0 > 0)∧¬(x0 > −10)∧¬(x0 ̸= 0)`; for the then path it checks `x0 > 0 ∧ x1 = −x0 ∧ ¬(x1 ̸= 0)` (Section 2.2, p. 5). An interpolant automaton stores assertions on states and removes related infeasible paths.

Verus form

Inference: a possible Verus adaptation would ask an external engine to generate candidate path conditions or lemmas, then check the resulting obligations in Verus. This is a proposed adaptation, not a demonstrated translation of the paper’s C trace semantics to Rust.

Evidence and limits

The refinement relies on the interpolant automaton excluding only infeasible traces: “Given the interpolant automaton, which by construction only accepts traces that are semantically infeasible, line 8 refines our current trace abstraction.” (Section 2.2, p. 5.) Algorithm 1 presents SAT and infeasible-path processing without a separate SMT-unknown branch. The paper targets safety properties encoded by error locations.

## technique 2: coordinator-worker parallel refinement

what it is and when to use it

The authors observe that feasibility checking is independent of A. Interpolant generation uses A for efficiency, so an older A remains sound. Refinement updates are serialized, although their order is commutative. “The update of the abstraction in line 8 aggregates the results of the different iterations and therefore, should not be done in parallel.” (Section 3.1, p. 6). Inference: use parallel refinement when those checks dominate runtime and the machine has multiple cores.

how to do it

1. initialize A=AP and an empty assigned-trace set Sπex
2. while idle workers and unassigned traces in L(A) exist, select a trace π, add it to Sπex, and submit `(π,A)` to a worker
3. each worker runs `checkSAT(φπ)`; on UNSAT it builds Aπ, and on SAT it publishes an empty-language automaton plus the SAT result
4. the coordinator waits for at least one result, then processes all available results
5. on SAT, return UNSAFE; on UNSAT, update A := A \ Aπ
6. stop with SAFE when L(A) becomes empty (Algorithms 2–3, pp. 6–7)

The coordinator is the only component that selects paths, checks termination, and mutates the global abstraction. The evaluation summarizes this trend as “Effectiveness typically increases when the number of workers increases.” (Section 4.2, p. 11). Workers may use stale copies of A; this is sound because stale A accepts more paths, though it can cause unnecessary work (Section 3.1, p. 6). A fixed Java thread pool and `CompletionService` implement asynchronous submission and result retrieval without busy waiting (Section 3.4, pp. 9–10).

Verus form

Inference: an external coordinator could dispatch independent Verus verification jobs and collect checked lemmas serially. The paper does not establish concurrent ghost execution or a Rust implementation. Its soundness argument concerns older trace abstractions that accept more traces, not arbitrary stale Rust heap assumptions.

Evidence and limits

The authors accept the memory cost: “This is acceptable because from our experience sequential trace abstraction much more often runs out of time than it runs out of memory.” (Section 3.1, p. 6.) They also suggest that refinement order can change intermediate abstractions and delay relevant traces (Section 4.3, pp. 12–13). Inference: scheduling can therefore affect runtime and which tasks finish within the resource limit.

## technique 3: diverse trace selection

what it is and when to use it

Selecting merely distinct traces can still duplicate the same infeasibility reason. Algorithm 4 recursively searches A for a trace that diverges early from traces already assigned but not yet known infeasible (Section 3.3, pp. 8–9). Inference: use it when workers are available and diversity may expose independent interpolants.

how to do it

1. start at q0 with empty prefix ε and relevant assigned set Sπex∩L(A)
2. if no relevant trace shares the prefix, return the prefix followed by its shortest accepting continuation, or null if no accepting state is reachable
3. list outgoing transitions and sort them by the number of previously selected continuations of the prefix plus that transition
4. dequeue the least-used transition first
5. skip a transition that recreates a selected trace; otherwise recurse on its successor and restricted relevant set
6. backtrack when no new trace is reachable; the algorithm returns a new trace whenever one exists outside the selected set (Algorithm 4, p. 8)

In the first iteration of each dispatch phase, the implementation tries breadth-first search. It dispatches that trace if it has not already been assigned; otherwise it uses diverse search. Later iterations use diverse search (Section 3.4, p. 9). Instead of computing Sπex∩L(A), it overapproximates this set by removing a trace from Sπex when processing its result. It limits trace search to five seconds in place of the non-emptiness check for work distribution. The authors explain: “Note that this is sound because we never use the non-emptiness check to determine the result of the verification.” (Section 3.4, p. 10.) This limit does not replace the final emptiness check for SAFE.

Verus form

Inference: this could guide an external scheduler toward proof cases that differ early. The paper motivates diversity heuristically; it does not prove that the search maximizes distinct infeasibility reasons.

## technique 4: measured parallel configurations

Effectiveness is reported in Table 1 as counts, not percentages. On all 14,560 tasks, SEQ-UA reports 1,128 correct alarms and 3,377 correct proofs; PAR-1-UA 1,140 and 3,695; PAR-2-UA 1,241 and 3,747; PAR-4-UA 1,243 and 3,860; PAR-6-UA 1,245 and 3,858. Incorrect alarms are 0 for SEQ, PAR-1, PAR-2, and PAR-4, and 1 for PAR-6; all five have 0 incorrect proofs (Table 1, p. 11). These are counts over the benchmark, not rates; there are 3,402 violating tasks and 11,158 adhering tasks. DSS reports 291 correct alarms, 1,263 correct proofs, 317 incorrect alarms, and 62 incorrect proofs (Table 1, p. 11). The authors attribute PAR-1-UA’s improvement over SEQ-UA partly to exception recovery: “One reason is that our new search strategy allows us to recover from exceptions that occur during trace processing.” (Section 4.2, p. 11.)

Each scatter plot includes tasks correctly solved by at least one compared configuration: 5,036 for PAR-2 versus PAR-1, 5,178 for PAR-4 versus PAR-1, and 5,203 for PAR-6 versus PAR-1. The paper explicitly says “all tasks correctly solved by at least one of the two compared configurations” (Section 4.3, p. 12). These are union sizes, not commonly solved totals. PAR-2 is faster on 2,369 of 4,787 commonly solved tasks (49%); PAR-4 on 2,002 of 4,760 (reported as 43%; Inference: the ratio rounds to 42%); PAR-6 on 1,619 of 4,735 (34%). The paper reports speedups greater than 3 for 67 tasks with PAR-2, greater than 5 for 42 with PAR-4, and greater than 7 for 31 with PAR-6 (Section 4.3, p. 13). These percentages use the stated commonly solved denominators, not all 14,560 tasks. The authors caution: “Nevertheless, parallelization will only make sense if the number of traces analyzed by sequential trace abstraction is at least as large as the number of workers.” (Section 6, p. 16.)

Against DSS, the comparison restricts to 1,395 tasks correctly solved by both PAR-6-UA and DSS. DSS is faster on 915 of 1,395 (66%), by 7.1 seconds median; the authors say Ultimate Automizer’s startup time is about 4.7 seconds larger (Section 4.4, pp. 14–15). They write: “For these 915 tasks, DSS is faster by 7.1s in the median.” (Section 4.4, p. 14.) PAR-6 solves many more tasks and has fewer incorrect reports in Table 1, but it is not faster on this restricted subset.

## techniques for the catalog

- CEGAR trace abstraction: enumerate error traces, decide path feasibility with SMT, and remove infeasible languages using interpolant automata
- coordinator-worker refinement: run expensive feasibility/interpolant work in parallel and serialize abstraction subtraction
- stale-abstraction scheduling: permit older abstraction copies because they add redundant work but do not invalidate infeasibility results
- diverse trace search: recursively prioritize transitions with fewer previously selected continuations
- bounded non-emptiness search: cap heuristic trace search at five seconds while preserving sound final-result logic
- Inference: Verus adaptation could schedule independent verification jobs and collect checked lemmas serially
