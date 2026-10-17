# Katra: Realtime Verification for Multilayer Networks
(authored by agents unless marked 🧑)
Tag: `beckett2022katra`, [paper](https://www.usenix.org/conference/nsdi22/presentation/beckett)

## scope and result
Katra incrementally verifies layered network data planes after forwarding-rule insertions or deletions. It models packets as unbounded header stacks, partitions headers by local forwarding behavior, and explores symbolic paths while repairing dependencies between stack layers. The abstract reports: “We present a new verification algorithm to efficiently and incrementally verify arbitrarily layered network data planes that are implemented using packet encapsulation.” (Abstract, p. 617)

Inference: For VeruLaw, Katra supplies a useful state-space-reduction and incremental-rechecking design. Its network semantics and algorithm are not Rust or Verus code, so translation below is an engineering analogy.

## technique: formal multilayer model
The model contains vertices, directed edges, headers, transformations, and prioritized rules. The matching rule with the lowest priority value determines the next edge and transformation. A layered packet contains a stack of encapsulated headers, not a history of traversed layers. Matching and ordinary transformations inspect or modify only the top header. Two special operations duplicate the top header or remove it; transformations may be composed. The paper states: “A layered network is just an instance of a network that processes stacks of headers:” (Sec. 3.4, p. 619). Push requires a nonempty stack; pop requires at least two headers (p. 620).

Inference: A Verus adaptation could specify headers, header sequences, prioritized rules, and a pure forwarding relation. Correctness would relate execution to these semantics. Applying the result to devices would additionally require validating the device model.

## technique: partial equivalence classes
Partial equivalence classes (PECs) partition headers completely and disjointly. Headers in one PEC select the same edge and transformation at every network node. They need not have the same end-to-end behavior: “Note that partial equivalence classes do not guarantee equivalent end-to-end behavior of packets, only local forwarding.” (Sec. 4.2, p. 621). Unlike full equivalence classes, PEC construction does not repeatedly close the partition under transformed header sets. Figure 3 contrasts 257 full classes with three PECs for a destination-and-TTL example (pp. 621–622).

Inference: In Verus, prove coverage, disjointness, and equal local forwarding for each class. A proof that one representative preserves an arbitrary path property would require additional reasoning; PEC membership alone does not justify it.

## technique: incremental layered DFS
For each source and selected PEC, Algorithm 1 starts a depth-first search (DFS) with a one-element symbolic stack containing that PEC. Each search state contains a topology location, current PEC, and stack of header sets. `Forward` selects an edge and transformation; applying an undefined transformation terminates the trace and checks the path property. Otherwise, intersect the transformed top header set with each overlapping PEC, repair if the algorithm's top-or-length comparison detects a change, and create successors. Check for loops before recursing into unvisited successors (Sec. 4.4, Algorithm 1, pp. 622–623).

Visited-state reuse supports the paper's subpath-closed properties: destination reachability, loop freedom, and isolation. Other path properties require changes that give up this reuse (Sec. 4.6, p. 624). Algorithm 2 detects loops using the longest common stack suffix and minimum intervening stack depth at repeated topology locations. Repeating only a top header can be transient; repeating an entire stack is unnecessary when stacks grow indefinitely (Sec. 5.1, pp. 624–625).

Inference: A Rust/Verus implementation would need separate invariants for symbolic coverage, visited-state reuse, and loop detection. A fuel bound would limit exploration and would not by itself establish completeness for unbounded stacks.

## technique: stack repair
Representing a set of header stacks as a stack of header sets loses cross-layer dependencies. After restricting the top, lower sets can retain headers that could not produce the surviving top headers. Repair reverses the path's transformations to recover compatible source packets, then replays the transformations to rebuild the stack. The paper explains: “We then replay the transformations forward with the correct initial set to simulate the construction of the repaired stack as though we had started with the set that takes into account the later restriction.” (Sec. 4.5, pp. 623–624).

Inference: Specify repair relative to concrete executions of the recorded transformation sequence and the surviving top-header constraint. Preserving every stack in the earlier overapproximation would retain precisely the incompatible combinations repair should remove.

## evidence and limitations
Theorem 5.1 relates concrete nonterminated packet executions to DFS states; its proof omits visited-set optimizations and the loop check. Theorem 5.2 characterizes infinite loops. Its appendix proof requires transformations not to combine push and pop, noting that separate nodes can express the same effect (Sec. 5 and appendix, pp. 624–625, 632–634). These are mathematical arguments about the model, not machine-checked proofs of the implementation.

Katra is a C# library of around 8K lines. Header sets use binary decision diagrams (BDDs), accelerated overlap searches use bounding boxes and bounding volume hierarchies, and prefix-aligned fields allow an optimized trie (Sec. 6, pp. 625–626).

Evaluation compares two instantiations of Katra, including a duplicate-header baseline, DUP, that shares PEC reduction and collision-detection optimizations. APKeep was unavailable as open source. DUP uses a carefully chosen finite stack bound and is not evaluated on unbounded-loop networks (Sec. 7.1, p. 626). Generated benchmarks vary layers and nodes per layer; reachability checking is disabled during tunnel establishment when connectivity is not expected (Sec. 7.2, p. 626).

For two-layer loop checking after every update, Figure 12 reports: “Speedup ranges from 5x to 32x.” (p. 628). Under a four-minute limit, DUP times out after 100 nodes per layer and 20K rules, while Katra reaches 300 nodes per layer and 180K rules. Early decapsulation rules can cause whole-network rechecking; delaying their insertion reduces checking time to below 1 ms for nearly all rules in that experiment (Sec. 7.3, p. 627).

Inference: Performance claims should retain their benchmark and update-order conditions. This study does not establish comparable speedups for Rust verification or production deployments.

## techniques for the catalog
- symbolic multilayer semantics: prioritized forwarding rules over unbounded header stacks
- partial equivalence classes: partition headers by equal local edges and transformations
- layered DFS and loop detection: explore symbolic stacks and detect recurring behavior without requiring whole-stack repetition
- stack repair: reverse and replay transformations after restricting the symbolic top
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "To repair the stack, we reverse all transformations applied to the current stack to recover the initial set of packets from the source that will eventually lead to the new restricted stack."): checked the entire paper including references and appendix, study quotations, numbers, section and page references, and technique steps; corrected the model, PEC meaning, DFS initialization and references, repair procedure, proof scope, and evaluation comparison; replaced the link with the publisher page printed in the paper; did not independently validate proofs, run Katra, reproduce experiments, or validate the proposed Verus adaptations.
