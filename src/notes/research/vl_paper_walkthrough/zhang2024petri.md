# Petri Nets-based Methods on Automatically Detecting for Concurrency Bugs in Rust Programs
(authored by agents unless marked 🧑)
Tag: `zhang2024petri`, [paper](https://doi.org/10.1145/3849803)

## Scope and claims
The paper presents a static pipeline that compiles Rust to MIR, extracts concurrency-relevant operations, translates a simplified program model into a labeled program Petri net (PPN), builds a reachability graph, and detects deadlock, data race, and atomicity-violation patterns. The authors claim soundness and completeness for their defined subset, bounded thread creation, and finite recursion. The paper says: “To unify the semantics of control flow and resource interaction, we propose a program Petri net (PPN), a labeled extension of the basic Petri net.” (Section 4, p. 5). Inference: this is a bug-finding abstraction rather than a deductive proof of arbitrary Rust functional specifications.

## technique: Rust/MIR to a program Petri net
Use this when concurrency behavior must be explored across thread schedules and the input is Rust for which MIR can expose monomorphized functions and basic blocks. The paper's method is:

1. Compile the source to monomorphized functions and extract each function's MIR control-flow graph (Algorithm 1, lines 3–6, p. 11).
2. Visit statements and record locks, unlocks, atomics, unsafe operations, and call-graph edges; run alias analysis over the resource data (Algorithm 1, lines 7–25, p. 11).
3. Set binary or library entry points and form `Prog = (F, G_call, CFG, Σ, D, ι)` (Section 4.1, pp. 7–8).
4. Add entry/exit places and start/return transitions per function, a control place and transition per basic block, and arcs following control flow (Algorithm 2, lines 1–10, p. 12).
5. Map unsafe blocks statement-by-statement; map call, synchronization, and atomic terminators using the stated rules; mark entry places initially (Algorithm 2, lines 11–29, p. 12).
6. Generate the reachability graph and pass it to the detectors (Section 4, p. 6).

The representation scans every statement in an unsafe block for memory accesses, while synchronization primitives are captured at MIR terminators (Section 4, p. 5). It omits procedural macros and inline assembly and focuses on a simplified concurrency-critical subset (Section 4.1, p. 8). The paper states: “This subset focuses exclusively on concurrency-critical elements, enabling rigorous conversion rules that maintain semantic correctness while reducing complexity.” (Section 4.1, p. 8).

Verus form (Inference): Verus code would keep executable Rust but expose an abstract state machine with `tracked` resources and transition proofs. A `spec fn` can describe a resource invariant; `proof fn` lemmas establish that each operation preserves it; `ensures` belongs on executable or proof functions, not on a `spec fn`. Verus does not automatically construct a reachability graph for `std::thread`; scheduling and resources must be modeled explicitly. PPN places, transitions, and initial marking therefore become ghost state and proof invariants rather than direct Verus primitives.

Evidence: the evaluation uses L-Bench, M-Bench, and P-Bench against LockBud and Miri (Section 6.1, pp. 17–20). The reduction table reports average structural reductions of 34.88% in places, 37.21% in transitions, and 33.76% in flow relations; Rayon-demo falls from 1,259 to 69 states (94.5%) and maximum reduction time is 4.8 ms for a 2,316-element model (Section 6.5, p. 24, Table 4). These are model-reduction measurements, not proof-completion rates. The authors also state: “AtomVChecker cannot report errors in Fig. 4(b), while PPN cannot detect the atomicity violations in Fig. 4(a).” (Section 6.4, p. 23).

## technique: deadlock detection with global and cyclic cases
Use this when the reachability graph is finite enough to enumerate. First apply the reduction of Section 5.5. For each marking, report a global deadlock when no transition is enabled and the marking is not a valid final marking; scenario 1 checks a terminal marking whose resource places have not been restored (Algorithm 3, lines 3–14, p. 14). Then compute strongly connected components with Tarjan's algorithm; in each nontrivial SCC, report a local deadlock if a resource place has zero tokens in every marking, no unlock transition is enabled, and the cycle is not benign (Algorithm 3, lines 15–26, p. 14). The paper defines: “A deadlock state is defined as a state where no transitions are enabled under non-terminal markings.” (Section 5.1, p. 13).

Verus form (Inference): model resource token counts as ghost fields in a state machine, and prove every transition preserves a lock invariant or consumes a token under a precondition. Deadlock freedom additionally requires a stated progress relation and proof that some enabled transition exists; safety invariants alone do not prove liveness.

## technique: unsafe data-race detection
Use for unsafe shared memory. At each reachable marking, compute enabled transitions and, for every unsafe-data place, pair distinct enabled transitions that access it and where at least one is a write (Algorithm 4, pp. 15–16). Group reports by metadata location to avoid duplicates. The paper defines a race as two enabled transitions accessing the same unsafe place with at least one write (Section 5.2, p. 14). This depends on correct alias analysis and unsafe annotations.

Verus form (Inference): encode exclusive permission to a location as a linear `tracked` token and give read/write operations preconditions requiring the token or a shared permission. Prove that two concurrent transition specifications cannot both own incompatible write permission. This requires trusted specifications for unsafe or foreign code.

## technique: relaxed-atomicity pattern search
The detector builds a transition-to-state predecessor map, starts at every fired relaxed load followed by a branch, and recursively backtracks incoming transitions. It collects relaxed stores to the same atomic place, stops at synchronization transitions, and reports when at least two stores are found (Algorithm 5, pp. 16–17). The method is a bounded pattern and does not cover the AtomVChecker pattern in Fig. 4(a). Inference: a Verus model would represent an atomic protocol as an abstract state machine and prove an invariant relating load results to permitted store histories; this is a proof of a chosen protocol, not an automatic search over all interleavings.

## reduction and trust boundaries
The three reductions are linear-sequence compression, concurrency-irrelevant call-chain pruning that protects shared nodes, and localized loop abstraction without resource access (Section 6.5, p. 24). The claimed preservation is for safety and liveness properties in the modeled subset. Trusted components include Rust/MIR extraction, alias analysis, mapping rules, reachability implementation, external Tina/Lola/Pnml tools (Figure 2, p. 6), and correctness of bug predicates. Unsupported language features, unbounded thread creation or recursion, and incomplete unsafe alias modeling can invalidate completeness.

## techniques for the catalog
- MIR-to-PPN translation — extract monomorphized MIR, resource metadata, and aliases, then map blocks and operations to Petri-net places and transitions
- reachability deadlock detection — classify terminal disabled markings and SCC cycles with permanently starved resource places
- unsafe race detection — pair concurrently enabled accesses to one unsafe place when at least one access writes
- relaxed atomicity backtracking — trace predecessors from a branch after a relaxed load and collect unsynchronized relaxed stores
- Petri-net reduction — compress linear chains, prune irrelevant calls, and abstract resource-free loops before exploration
