# Inductive Synthesis of Inductive Heap Predicates
(authored by agents unless marked 🧑)
Tag: `yang2025inductive`, [paper](https://doi.org/10.1145/XXXXXXX)

## scope and result

Yang and Sergey present Sippy, an inductive-logic-programming synthesizer for recursive Separation Logic (SL) predicates from concrete heap instances. The paper's abstract states, "We present an approach to automatically synthesise recursive predicates in Separation Logic (SL) from concrete data structure instances using Inductive Logic Programming (ILP) techniques." (Abstract, PDF p. 1) The distinctive problem is positive-only learning: negative heap examples are difficult to generate and are often uninformative junk. Sippy combines positive-only learning (POL), SL-specific entailment pruning, and Grippy, a generator that fuzzes valid memory graphs from a structure-checking program.

The implementation uses Popper-style ASP search, Prolog hypothesis testing, and hand-coded SL rules. The reported benchmark has 19 predicates synthesized within a 20-minute limit, on an 8-core M1 MacBook Pro with 16 GB RAM (Section 6, PDF pp. 15–16). The paper provides soundness arguments for the POL result set and SL validity, and local completeness only within the bounded search space. It does not prove that the intended predicate is identified from finite examples.

## technique 1: positive-only predicate learning with clause minimisation

What it is. Classic ILP searches for a hypothesis entailing every positive example and no negative example. POL has no negatives: it enumerates hypotheses, retains every non-comparable hypothesis that entails all positives, and returns their most-specific set (or, for Sippy, chooses a specific member). Before search, it removes logically redundant clauses. This prevents “smallest program” bias from selecting an over-general predicate.

When to use it. Use POL when negative heap states are unavailable or too numerous to be useful, and when the domain supplies an entailment procedure and a bounded grammar. The method needs a finite initial constraint set and a maximum predicate size; it cannot infer facts outside that grammar.

How to do it (paper Algorithm 1, Section 3.2, PDF pp. 9–10).

1. Set `cons` to the initial constraints, `size = 1`, and `sol = True`.
2. Ask the ASP solver Clingo to generate a hypothesis of the current size.
3. If the size is unsatisfiable, increment the size.
4. Test a satisfiable hypothesis in Prolog against the positive examples and background knowledge.
5. If it is complete (entails all positives), add it to the solution set unless an existing solution entails it; remove solutions that it semantically dominates. If it is incomplete, add specialization constraints from the test outcome.
6. Apply domain-specific “new pruning” constraints, continue until `max_size`, and return all non-comparable most-specific hypotheses.

Clause minimisation first eliminates a clause when a shorter logically equivalent clause exists (Section 3.1, PDF p. 9). The paper reports Theorem 3.1: "The hypothesis set returned by the positive-only learning in Algorithm 1 contains all non-comparable, most specific predicates that is complete (i.e., entailing all examples) in the search space defined by the algorithm’s initial constraints (in_cons) and the size limit (max_size) parameters." (Section 3.2, PDF p. 10)

Verus form. Inference: an analogous Rust workflow can generate candidate `spec fn` predicates over a mathematical sequence or ghost representation of a heap, then ask Verus to prove each example's `ensures` clause. A `proof fn` can establish entailment lemmas; executable pointer code remains separately verified. Verus does not provide ASP, Prolog, or Separation Logic's separating conjunction, so the search and heap abstraction are external. The finite grammar and size bound must be represented by the generator, not by a Verus keyword.

Evidence and limits. The algorithm theorem is a proof about enumeration under `in_cons` and `max_size`, not completeness over all predicates. Positive examples alone can admit several incomparable hypotheses; conjoining them is not always a well-formed SL predicate, which motivates Sippy's selection step (Section 4.3, PDF p. 13). Inference: choosing the largest candidate by literal count is a heuristic for specificity and can be wrong when two candidates have different semantic strength.

## technique 2: SL-aware Sippy search and bounded local completeness

What it is. Sippy wraps POL with memory-graph-derived constraints, predicate shapes, and two expanding bounds: maximum variables and maximum body literals. For each shape it runs `MAX_POL`, which chooses the largest POL result under the paper's specificity metric. If a better predicate appears, both bounds are increased by `δ`; if the search cannot improve the result after the margin, Sippy stops.

When to use it. Use this when recursive shape, pointer fields, pure relations (sets, lists, integers), and invented auxiliary predicates must be learned together. The paper restricts each predicate to at most one pure theory in its evaluation, so combined theories may need separate predicates and a merge operation.

How to do it (paper Algorithm 2, Section 4.3, PDF p. 14).

1. Extract `graph_cons` and available predicate shapes from background graph facts and examples.
2. Initialize `max_var = max_body = 1` and `sol = True`.
3. For each shape, compute the maximum search size and run `MAX_POL`.
4. If a more specific predicate is found, set the bounds to the result's variable/body counts plus `δ`, and replace `sol`.
5. If no predicate exists, increase both bounds by one; if an upper bound is reached, try the next shape.
6. If an expanded search yields no more-specific result, stop and return `sol`.

The authors state, "The role of the parameter δ is, thus, to provide a ‘margin’ for the completeness of the search: it is not guaranteed that Sippy will find the most specific solution across all possible search spaces, but only in the search-space that is bound by the returned output’s parameters plus δ." (Section 4.3, PDF p. 14) Their local-completeness theorem is exactly for that one-`δ` enlargement.

Verus form. Inference: encode the learned shape as a ghost datatype or map abstraction and use `invariant` clauses to preserve list/tree shape during traversals. Candidate predicates should be ordinary Verus specifications and proof lemmas, with no executable call to proof code. Search bounds and shape enumeration stay in a generator; Verus checks the resulting contracts and lemmas.

Evidence and limits. Theorem 4.1 states that if a generated memory graph is provable in Prolog with linearity, the corresponding heap is valid under SL semantics (Section 4.2, PDF p. 13). This relies on the paper's graph encoding and Prolog rules. Recursive or nested structures enlarge both auxiliary and main searches, and lists create larger search spaces than sets because list append is more expressive (Section 6.1, PDF p. 17). The paper's `δ = (1,2)` is an empirical choice, not a universal guarantee.

## technique 3: Grippy positive-example generation

What it is. Grippy generates candidate memory graphs, validates them with a program's assertions, and retains only passing graphs plus facts collected by traversal. This supplies positive examples when the program expects a structure as input and therefore cannot simply be executed to obtain one.

When to use it. Use it for a structure validator with assertions and basic validity constraints such as root reachability. It is unsuitable when passing assertions do not characterize the intended structure or when random generation rarely reaches informative states.

How to do it (paper Algorithm 3, Section 5, PDF p. 15).

1. For graph sizes from one through `max_size`, initialize a counter.
2. Create random nodes, integer keys, and pointers.
3. Keep a graph only when the validator program's assertions pass.
4. Summarize the accepted graph by traversing it and accumulating payload facts.
5. Repeat until the requested number of examples per size is reached.

The paper explains, "Valid memory graphs can be obtained by extracting concrete heap states from the program execution, provided concrete inputs, as, e.g., done by the SLING tool." (Section 5, PDF p. 15) Grippy is the fallback for input-driven programs. The authors caution that random generation also creates many negative graphs, but these are arbitrary junk and are impractical as classic-ILP negatives.

Verus form. Inference: generate Rust heap fixtures or ghost states, run a trusted validator, and translate accepted states into Verus `requires`/`ensures` examples. The validator and random generator remain outside the proof unless their generation algorithm is itself modeled. A Verus proof of a candidate predicate does not show that the fixture set covers all valid heaps.

Evidence and limits. Grippy's algorithm is specified, but the evaluation does not report a coverage denominator for generated versus rejected graphs. Inference: random positive generation can systematically miss rare balancing, ordering, or aliasing cases, so generated predicates may be sound for examples yet incomplete for the data structure.

## evidence, trust, and product implications

The principal quantitative evidence is the benchmark: 19 predicates, each within 20 minutes, on the stated M1/16-GB setup (Section 6.1, PDF pp. 16–17). The paper says, "Our experiments demonstrate that 2-3 example graphs with tens of nodes in total (less than 20 node per case study on average in our benchmark suite) are sufficient to synthesise good predicates (we manually assessed the results’ quality)." (Section 6.1, PDF p. 17) “Good” is manually assessed, so there is no independent correctness denominator. Table 1 records synthesis time, exhaustive-search time, testing fraction, and comparisons with Popper and ShaPE; several cases time out or are unsupported. ShaPE synthesized four predicates in practice, while Sippy handled the 19 listed cases, but the tools do not have identical expressiveness.

What is proved: POL's bounded enumeration theorem, SL validity of output predicates under the graph/Prolog encoding, and Sippy's local completeness within the returned bounds plus `δ`. What stays trusted: the memory-graph encoding, Prolog linearity rules, ASP solver, parser and implementation, validator assertions, and the user's choice of examples and grammar. Inference: for VL, the transferable idea is example-driven discovery of shape and ownership lemmas, but Sippy is not a Verus backend and its SL semantics do not automatically establish Rust aliasing or lifetime correctness. The threat to agent-written verified Rust is specification undercoverage: a learned predicate can be internally proved yet omit a rare heap shape or pure invariant.

Already done that VL should not redo. Positive-only ILP, entailment-based clause minimisation, shape-bounded search, and graph fuzzing are all explicit prior techniques. VL should instead test how these abstractions map to Verus ghost state and whether candidate predicates survive adversarial heap fixtures.

## techniques for the catalog

- positive-only predicate learning — enumerate hypotheses against positive examples, retain non-comparable complete candidates, and prune by entailment
- clause minimisation — remove logically equivalent clauses with shorter bodies before searching
- SL-aware bounded synthesis — expand variable/body bounds and use shape-specific constraints, with local completeness only within a bounded margin
- graph-guided example generation — fuzz memory graphs, retain assertion-passing instances, and summarize them as positive logic facts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
