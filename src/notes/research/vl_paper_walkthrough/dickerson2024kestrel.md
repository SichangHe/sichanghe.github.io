# KestRel: Relational Verification Using E-Graphs for Program Alignment
(authored by agents unless marked 🧑)
Tag: `dickerson2024kestrel`, [paper](http://arxiv.org/abs/2404.08106v2)

## purpose and core idea

KestRel constructs intermediate programs that make relational properties easier for ordinary verifiers. It starts with two programs in a naive paired embedding, represents many equivalent alignments in an e-graph, saturates that graph with algebraic realignment rules, and extracts a candidate using syntax and execution traces. The final intermediate program is sent to Dafny or SeaHorn. The paper's abstract says: "We propose an approach to intermediate program construction that uses e-graphs, equality saturation, and algebraic realignment rules to efficiently represent and build programs amenable to automated verification." (abstract, p. 1).

An alignment places corresponding subcomputations in a relational loop or sequence. Better alignment can expose shared loop invariants; a poor concatenative alignment leaves two unrelated loops and overwhelms a verifier. CoreRel is the relational calculus. Its terms include paired commands, left/right embeddings, relational loops, and runoff loops for iterations taken by only one side. The paper provides a Coq formalization of CoreRel and its metatheory (section 3, p. 10).

## technique 1: e-graph equality saturation for alignments

What it is. An e-graph compactly stores e-nodes grouped into e-classes of equivalent terms. KestRel inserts the naive alignment `⟨p1 | p2⟩` and repeatedly applies CoreRel rewrite rules. Rules include decomposition, reassociation, commutation, loop alignment, and stuttering transformations. Every extracted term remains equivalent to the initial relational program by construction.

Steps. (1) Alpha-rename the two programs so variable namespaces are disjoint. (2) Build a CoreRel term for their naive paired embedding. (3) Create an e-graph and insert that term. (4) Saturate with CoreRel realignment rules until the chosen resource bound or fixed point. (5) Extract one representative from the root e-class. (6) Reify the CoreRel term as an intermediate program and pass it to a verifier. The paper states: "To build an e-graph representing a space of potential alignments of programs p1 and p2 , we start by constructing an e-graph that contains the naïve alignment term ⟨p1 | p2 ⟩." (section 4.2, p. 14).

Verus form (inference). A generator can create a paired Rust proof harness with disjoint state structs and ghost relational loops. Equality saturation should run outside Verus; each extracted alignment is then checked with Verus `requires`, `ensures`, `assert`, and loop `invariant`. The equivalence guarantee must be represented by proved translation lemmas if generated transformations change control flow.

Limits. Saturation can represent a potentially infinite space. Extraction and rewrite growth therefore need resource limits. The method assumes CoreRel rules preserve semantics; a faulty rule would invalidate every candidate.

## technique 2: two-stage extraction with simulated annealing

What it is. KestRel first extracts a syntactic candidate minimizing unfused loops, then explores neighboring e-graph representatives with simulated annealing. Algorithm 1 takes programs, a cost function, and iteration bound `μ`. It samples initial states, builds and saturates the e-graph, extracts `best`, evaluates traces, and repeatedly chooses a `RandomNeighbor`, evaluates it, and accepts it if lower cost or according to the temperature schedule.

Steps. (1) Generate random initial states `Σ`. (2) Build and saturate the e-graph. (3) Extract a local candidate with the fewest loops. (4) Reify and execute it on `Σ` to collect traces. (5) Score the traces. (6) For up to `μ` iterations, choose a neighboring e-node selection, execute and score it, and accept by simulated annealing. (7) Reify the final best alignment and invoke the verifier. The algorithm description says: "Each iteration of this loop generates a new alignment candidate by perturbing the selection of representative nodes for the e-classes in the current alignment (Line 10)." (section 4, p. 13).

A neighbor is made by selecting an e-class represented in the current term, choosing another e-node in that class, and reusing or randomly selecting child choices. The implementation limits loop-unrolling differences to one step and biases newly constructed children toward small ASTs (section 4.3.3, p. 16).

Verus form (inference). The extracted candidate is a proof-harness choice. The verifier run should reject candidates whose generated invariants fail; annealing itself is heuristic and need not be trusted for soundness if only successful Verus proofs are accepted. Random states must cover relevant loop behavior or the cost may mis-rank candidates.

## technique 3: trace cost for semantic alignment quality

What it is. Pure syntax cannot see whether runoff loops actually execute. KestRel instruments relational, runoff, and ordinary loops with begin, head, and exit tags. It computes two ratios: unmerged loop executions and runoff loop iterations. The overall trace cost is `0.5 * runmerged + 0.5 * rrunoff`, with denominators defined by tag counts (section 4.3.2, pp. 15–16).

Steps. (1) Reify a candidate alignment. (2) Execute it from sampled initial states. (3) Record loop tags `wBᴿ,wHᴿ,wEᴿ` for relational loops, `wBᴼ,wHᴼ,wEᴼ` for runoff loops, and `wB,wH,wE` for ordinary loops. (4) Compute `runmerged = #(wB)/(#(wBᴿ)+#(wB))`. (5) Compute the runoff ratio using the paper's denominator `#(wHᴿ)+#(wHᴿ)+#(wH)` as printed; this duplicated symbol is a typographical inconsistency in the source, so the intended denominator is uncertain. (6) Average the two ratios and use the result in annealing.

The paper's stated motivation is: "Our solution is to combine a syntactic extraction strategy with a data-driven approach ... that examines concrete executions of a candidate alignment to approximate its semantic fitness." (section 4.3, p. 15). Inference: traces are a ranking heuristic, not evidence that the final alignment is correct; only the backend proof supplies that evidence.

Verus form (inference). A Rust harness can emit ghost loop-state tags or maintain counters in a specification-only execution. A cost search outside Verus can select alignments; Verus checks the resulting relational loop invariants. Since sampled traces are incomplete, do not use them as proof assumptions.

## technique 4: invariant inference and backend verification

KestRel translates alignments to annotated intermediate programs. Its Dafny backend uses Houdini-style elimination over predicates suggested by Daikon and by users. It repeatedly verifies candidates and removes predicates that are not invariants. The implementation can also target SeaHorn by translating a subset to array-manipulating C (section 5.4, pp. 21–22).

Steps. (1) Generate or supply candidate invariants for the extracted aligned program. (2) Run Houdini verification attempts; discard clauses that fail. (3) If all remaining clauses and postconditions verify, accept the relational proof. (4) Otherwise try another alignment. User hints may be needed for ADT axioms or complex relationships. Inference: this backend procedure is not itself a contribution to Verus, but illustrates how alignment and invariant search compose.

## evidence and limits

Table 1 evaluates 31 benchmarks: 10 basic-type loop benchmarks, 5 loop-free basic-type benchmarks, and 16 ADT clients (the table lists each denominator explicitly). Dafny failed naive alignments on 26 loop-containing benchmarks; KestRel verified all but three of those aligned programs. Five successes required semantic extraction beyond the syntactic candidate. Times are total construction plus verification, with a five-minute timeout; for example, `double-square` is naive timeout, syntactic failure at 21.32 seconds, and full success at 36.22 seconds. The loop-tiling, data-alignment, and static-caching failures require unsupported loop guards, new inner loops, or stronger invariants (section 5.2, pp. 18–20).

The benchmark machine was ArchLinux with an 8-core Intel i7-6700K at 4 GHz and 16 GB RAM (section 5.1, p. 17). In the SeaHorn subset, the combined workflow verified `double-square`, `shemer`, `simple`, and `unroll` where naive or syntactic strategies often failed; times in Figure 20 are per benchmark and include alignment and verification (section 5.4, pp. 21–22). Ablation found that the combined cost function succeeded on five semantic-extraction benchmarks where either fusion-only or runoff-only cost failed (Figure 19, p. 21).

The trusted base includes CoreRel semantics and rewrite-rule correctness, e-graph implementation, trace execution, invariant inference, translation, Dafny/SeaHorn, and SMT solvers. Inference: for agent-written verified Rust, KestRel reduces a major threat—manual relational alignment errors—but introduces search and translation complexity. VL should reuse the principle that alignment is a generated proof artifact and accept it only after Verus proves the extracted intermediate program; sampled traces may guide search but cannot establish correctness. Existing work already covers e-graph alignment and trace-guided extraction, so VL should not duplicate that search blindly.

## techniques for the catalog

- e-graph alignment saturation: represent many equivalent relational products and rewrite them algebraically
- syntactic plus annealed extraction: start with fused-loop cost, then search neighboring representatives
- trace-based alignment cost: rank candidates by merged-loop and runoff execution ratios
- invariant-guided backend proof: feed extracted products to Houdini-style Dafny or SeaHorn verification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
