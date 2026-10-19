# KestRel: Relational Verification Using E-Graphs for Program Alignment
(authored by agents unless marked 🧑)
Tag: `dickerson2025kestrel`, [paper](https://doi.org/10.1145/3720474)

## purpose and core idea

KestRel constructs intermediate programs that make relational properties easier for ordinary verifiers. It starts with two programs in a naive paired embedding, represents many equivalent alignments in an e-graph, saturates that graph with algebraic realignment rules, and extracts a candidate using syntax and execution traces. The final intermediate program is sent to Dafny or SeaHorn. The paper's abstract says: "We propose an approach to intermediate program construction that uses e-graphs, equality saturation, and algebraic realignment rules to efficiently represent and build programs amenable to automated verification." (abstract, p. 1).

An alignment places corresponding subcomputations in a relational loop or sequence. Better alignment can expose shared loop invariants; a poor concatenative alignment leaves two unrelated loops and overwhelms a verifier. CoreRel is the relational calculus. Its syntax includes paired commands, relational sequences, conditionals, and loops; left/right embeddings are notation. Loop alignment adds ordinary trailing runoff loops for iterations taken by only one side (Figure 13, p. 13). The paper reports a Coq formalization of CoreRel and its metatheory (section 3, footnote 2, p. 9; Data-Availability Statement, p. 26).

## technique 1: e-graph equality saturation for alignments

What it is. An e-graph compactly stores e-nodes grouped into e-classes of equivalent terms. KestRel inserts the naive alignment `⟨p1 | p2⟩` and repeatedly applies CoreRel rewrite rules. Rules include decomposition, reassociation, commutation, loop alignment, and stuttering transformations. Every extracted term remains equivalent to the initial relational program by construction.

Steps. (1) Alpha-rename the two programs so variable namespaces are disjoint. (2) Build a CoreRel term for their naive paired embedding. (3) Create an e-graph and insert that term. (4) Saturate with CoreRel realignment rules until the chosen resource bound or fixed point. (5) Extract one representative from the root e-class. (6) Reify the CoreRel term as an intermediate program and pass it to a verifier. The paper states: "We then run equality saturation on the e-graph using CoreRel rewrite rules like those listed in Fig. 13." (section 4.2, p. 13).

Inference: possible Verus adaptation. A generator can create a paired Rust proof harness with disjoint state structs and ghost relational loops. Equality saturation should run outside Verus; each extracted alignment is then checked with Verus `requires`, `ensures`, `assert`, and loop `invariant`. The equivalence guarantee must be represented by proved translation lemmas if generated transformations change control flow.

Limits. The e-graph may represent infinitely many terms through cycles; equality saturation can stop at a bound or timeout (sections 2.1 and 4.2, pp. 7, 13). Inference: incorrect rewrite rules could break the semantic-equivalence guarantee.

## technique 2: two-stage extraction with simulated annealing

What it is. KestRel first extracts a syntactic candidate minimizing unfused loops, then explores neighboring e-graph representatives with simulated annealing. Algorithm 1 takes programs, a cost function, and iteration bound `μ`. It samples initial states, builds and saturates the e-graph, extracts `best`, evaluates traces, and repeatedly chooses a `RandomNeighbor`, evaluates it, and accepts it if lower cost or according to the temperature schedule.

Steps. (1) Generate random initial states `Σ` satisfying the relational precondition, using test input generators (section 4.4, p. 16). (2) Build and saturate the e-graph. (3) Extract a local candidate minimizing unfused loops. (4) Reify and execute it on `Σ` to collect traces. (5) Score the traces. (6) Within the iteration bound controlled by `μ`, choose a neighboring e-node selection, execute and score it, and accept by simulated annealing. (7) Reify the returned alignment. In the implementation, first try verifying the syntactic candidate; run data-driven extraction only if that attempt fails, then report the verification result for its output (section 4.4, p. 16). The algorithm description says: "Each iteration of this loop generates a new alignment candidate by perturbing the selection of representative nodes for the e-classes in the current alignment (Line 10)." (section 4, p. 12).

A neighbor is made by selecting an e-class represented in the current term, choosing another e-node in that class, and reusing or randomly selecting child choices. The implementation limits loop-unrolling differences to one step and biases newly constructed children toward small ASTs (section 4.3.3, p. 16).

Inference: possible Verus adaptation. The extracted candidate is a proof-harness choice. The verifier run should reject candidates whose generated invariants fail; annealing itself is heuristic and need not be trusted for soundness if only successful Verus proofs are accepted. Unrepresentative random states may cause the cost to rank candidates poorly.

## technique 3: trace cost for semantic alignment quality

What it is. Pure syntax cannot see whether runoff loops actually execute. KestRel instruments relational, runoff, and ordinary loops with begin, head, and exit tags. It computes two ratios: unmerged loop executions and runoff loop iterations. The overall trace cost is `0.5 * runmerged + 0.5 * rrunoff`, with denominators defined by tag counts (section 4.3.2, p. 15).

Steps. (1) Reify a candidate alignment. (2) Execute it from sampled initial states. (3) Record loop tags `wBᴿ,wHᴿ,wEᴿ` for relational loops, `wBᴼ,wHᴼ,wEᴼ` for runoff loops, and `wB,wH,wE` for ordinary loops. (4) Compute `runmerged = #(wB)/(#(wBᴿ)+#(wB))`. (5) Compute the runoff ratio using the paper's denominator `#(wHᴿ)+#(wHᴿ)+#(wH)` as printed. Inference: the repeated relational-loop tag may be a typographical error; the intended denominator is not established here. (6) Average the two ratios and use the result in annealing.

The paper explains: "Verification is too expensive to use as a measure of the quality of a candidate alignment, so we require an alternative metric." (section 4.3, p. 14). Traces rank alignments; sound CoreRel rewrites preserve their semantics, and the backend verifier checks the requested property (sections 4.2–4.4, pp. 13–17).

Inference: possible Verus adaptation. An executable Rust harness could record loop tags for a cost search outside Verus; Verus could check the resulting relational loop invariants. Since sampled traces are incomplete, do not use them as proof assumptions.

## technique 4: invariant inference and backend verification

KestRel translates alignments to annotated intermediate programs. Its Dafny backend uses Houdini-style elimination over predicates suggested by Daikon and a built-in set; the evaluation also uses user predicates (Algorithm 2, p. 16; sections 4.4 and 5.2.1, pp. 17, 19–20). It repeatedly verifies candidates and removes predicates that are not invariants. The implementation can also target SeaHorn by translating a subset to array-manipulating C (section 5.4, pp. 21–22).

Steps. (1) Form the union of Daikon suggestions and the built-in candidate set. (2) Annotate the program and call Dafny. (3) Remove candidates reported as non-invariants and repeat until no such candidates remain. (4) Return the annotated program; the overall verification result determines success. A failed syntactic candidate triggers the data-driven phase once; failure of that phase's output is reported, without another search loop (section 4.4, pp. 16–17). User hints may be needed for ADT axioms or complex relationships (section 5.2.1, pp. 19–20). Inference: this backend procedure is not itself a contribution to Verus, but illustrates how alignment and invariant search compose.

## evidence and limits

Table 1 evaluates 31 benchmarks: 10 basic-type loop benchmarks, 5 loop-free basic-type benchmarks, and 16 ADT clients (counts from the table rows). Dafny failed naive alignments on 26 loop-containing benchmarks; KestRel verified all but three of those aligned programs. Five successes required semantic extraction beyond the syntactic candidate. Times are total construction plus verification, with a five-minute timeout; for example, `double-square` is naive timeout, syntactic failure at 21.32 seconds, and full success at 36.22 seconds. The data-alignment failure requires guards that skip selected iterations; loop-tiling requires new inner loops; static-caching requires more complex invariants (section 5.2, pp. 18–20).

The benchmark machine was ArchLinux with an 8-core Intel i7-6700K at 4 GHz and 16 GB RAM (section 5.1, p. 17). Figure 20 reports SeaHorn success for `double-square`, `shemer`, `simple`, and `unroll` after full extraction, versus failure for their naive alignments; syntactic extraction succeeds for `shemer` and `simple` and fails for `double-square` and `unroll` (section 5.4, p. 21). The prose above Figure 20 disagrees with its syntactic results; these claims follow the figure. The authors report manually verifying the unsuccessful SeaHorn alignments using VST (p. 22). Ablation found that the combined cost function succeeded on five semantic-extraction benchmarks where either fusion-only or runoff-only cost failed (Figure 19, p. 21).

The rewrite vocabulary limits available alignments, and neighbor/cost heuristics can miss useful candidates. KestRel also inherits backend limitations; ADT predicates can fall outside Daikon's hypothesis space (section 5.5, p. 22). Inference: a Verus adaptation would need justified translation and realignment rules as well as a proof of the extracted program's postcondition. Trace execution and candidate-invariant generation need not establish soundness when their outputs only guide search and all proof obligations are checked. The paper evaluates Dafny and SeaHorn; the Verus adaptations above are proposals, not evaluated results.

## techniques for the catalog

- e-graph alignment saturation: represent many equivalent relational products and rewrite them algebraically
- syntactic plus annealed extraction: start with fused-loop cost, then search neighboring representatives
- trace-based alignment cost: rank candidates by merged-loop and runoff execution ratios
- invariant-guided backend proof: feed extracted products to Houdini-style Dafny or SeaHorn verification
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In practice, we have found that these heuristics identify good neighbors for our suite of benchmarks."): checked the entire paper, quotations, numbers, page and section references, and technique steps; corrected the publication year and DOI link, CoreRel syntax, page references, extraction and invariant-inference workflow, SeaHorn results, and soundness claims; did not inspect the artifact, check the Coq proofs, run experiments, or test the proposed Verus adaptations.
