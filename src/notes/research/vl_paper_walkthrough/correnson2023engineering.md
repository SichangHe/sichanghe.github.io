# Engineering a Formally Verified Automated Bug Finder
(authored by agents unless marked 🧑)
Tag: `correnson2023engineering`, [paper](https://doi.org/10.1145/3611643.3616290)

## scope and result
The paper defines correctness for symbolic-execution bug finders and implements WiSE in Coq. Its central claim is that a tester can be both testing-sound (every reported bug has a witness) and testing-complete (every reachable bug is eventually reported), provided the symbolic semantics, path exploration, and solver interface satisfy explicit conditions. The authors formalize a small imperative language IMP with assignments, sequencing, conditionals, loops, and `fail`. They prove symbolic reachability equivalent to concrete reachability, derive bug-detection theorems, and extract OCaml and Python implementations. The paper states: “This paper presents a systematic approach for engineering provably sound and complete symbolic execution-based bug finders by relating a programming language’s operational semantics with a symbolic semantics.” (Abstract, p. 1)

## technique 1: relate concrete and symbolic semantics
Use this when a symbolic executor must be justified rather than tested only by examples. Define concrete states as environment/program pairs and give small-step rules. Define symbolic states as path-condition/store/program triples. Start execution at `<true, id, p>`, where `id` maps each variable to a same-named symbolic value. Symbolic assignments update expressions; conditionals and loops fork, conjoining the guard or its negation to the path condition.

The proof uses a concretization relation. A concrete state is represented by a symbolic state when the program counters agree, the concrete environment equals the initial environment evaluated through the symbolic store, and the initial environment satisfies the path condition. Prove store-update commutation by structural induction, monotonicity of path conditions, and one-step simulation in both directions. Lift one-step simulation to reflexive-transitive closure. The resulting theorem is `Reachsym(p, σ) ⇔ Reach(p, σ)`. The paper states: “The glue we use to establish this connection is reachability.” (Sect. 2.1, p. 4)

Inference: In Verus, model an IMP state with Rust datatypes and define a `spec fn` for expression evaluation and a recursive concretization relation. State simulation as `ensures` on proof functions, using `requires` for well-formed stores and path-condition satisfaction. Verus can encode the inductive lemmas, but the paper’s Coq extraction and coinductive streams do not carry over directly.

## technique 2: reduce bug finding to reachability and stuckness
Use this when the product needs a precise bug oracle. Define `Progress(σ)` as `σ` being `skip` or having a successor; define `Stuck(σ)` as its negation. A program has a bug when some reachable state is stuck. Define symbolic counterparts by replacing concrete reachability with symbolic reachability and concretizing the symbolic state before testing stuckness. Prove equivalence for three queries: whether a program has any bug, whether a particular state is erroneous, and whether a given input triggers a bug. The paper states: “A buggy program has a reachable, stuck state.” (Definition 2.7, Sect. 2.2, p. 5)

The implementation’s oracle marks a state as stuck when the next command is `fail`; division-by-zero is modeled by inserting `if y == 0 then fail else d = div(x,y)`. A bug-triggering input is obtained by solving the path condition. Figure 5 decomposes the check into symbolic reachability, satisfiability, and stuckness.

Inference: In Verus, represent the oracle as a `spec fn` returning whether a state is `fail` and prove that any reported witness satisfies the concrete transition relation. Keep SMT solving outside verified code; treat returned models as inputs checked by a verified replay function.

## technique 3: breadth-first lazy exploration with proved properties
Use BFS when loops can make depth-first search starve shallower paths. Implement `expand` to return all symbolic successors for each command. Implement `run` over a FIFO task list: yield the first state, append `expand` results, and recurse; yield `None` when the queue is empty. The paper states: “At every iteration, it yields the first state from the queue. Then, the direct successors of the current state are computed using expand and enqueued in the task queue (with the lowest priority, realizing a breadth-first search).” (Sect. 3.2, p. 7)

Represent execution as a lazy infinite stream rather than imposing a loop-unrolling bound. Prove `expand` exactly matches the symbolic one-step relation. Prove every emitted state is reachable (relative soundness), every reachable successor eventually appears (relative completeness), and `None` is permanent after the queue empties (sound termination). Convert states to `Pending`, `BugFound`, or `Finished` messages. BFS is complete for finite-depth bugs, while infinite streams avoid claiming a finite bound is complete.

Inference: In Verus, a finite queue and an explicit fuel parameter are practical. Prove that each dequeue either emits a previously queued state or decreases a queue measure; represent unbounded completeness as a theorem over any finite depth rather than an executable infinite stream.

## technique 4: obtain T-sound/T-complete decisions with a solver
Use this when a binary “has bug” answer is required. Filter `BugFound` states through a complete satisfiability procedure. Iterate the stream until a satisfiable bug path is found (`YES`) or a `Finished` message is reached (`NO`). The paper’s Figure 10 gives `has_bug p = YES` on a satisfiable `BugFound` and `NO` on `Finished`, and Theorem 3.8 states `has_bug(p) = YES ⇔ HasBug(p)` (Sect. 3.5, p. 9).

Evidence: WiSE is proved in Coq; OCaml extraction is automatic, while PyWiSE is a manual syntax-preserving port. Three numeric algorithms (factorial, integer square root, greatest common divisor) are annotated with assertions and mutated bugs; BFS finds the injected bugs, whereas the depth-first option gets trapped in an early infinite loop (Sect. 4, pp. 9–10). The extracted implementations are not themselves proved equivalent to Coq. The paper explicitly says: “Since the transformations from Coq to executable programs are not formally proven correct, we evaluated them with three numeric algorithms.” (Sect. 4, p. 9)

## what is proved, measured, and trusted
Proved: IMP operational semantics, symbolic semantics, reachability equivalence, relative stream soundness/completeness, and the Coq WiSE implementation. Measured: three algorithm case studies and termination on finite input domains. Trusted: Coq’s kernel and axioms, the external constraint solver, parser/runtime behavior, and the unproved OCaml/Python transformations. Constraints include IMP’s simplicity, solver completeness for T-soundness, and nontermination for unrestricted loops. Inference: For agent-written verified Rust, the threat is high if search strategy, solver results, or replay are trusted without proofs; the paper’s decomposition gives a concrete architecture for reducing that trust base. Existing work on symbolic semantics and verified analyzers means VL should reuse the reachability/simulation pattern rather than invent another symbolic-execution correctness definition.

## techniques for the catalog
- semantic simulation: prove symbolic and concrete reachability equivalent through concretization and step simulation
- stuck-state oracle: define bugs as reachable stuck states and separate reachability, satisfiability, and oracle checks
- BFS lazy executor: explore symbolic states with FIFO expansion and prove relative soundness, completeness, and termination signaling
- solver-filtered decision: turn a stream of bug reports into a T-sound/T-complete binary result with satisfiable path conditions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
