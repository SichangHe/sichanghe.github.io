# Inductive Synthesis of Inductive Heap Predicates
(authored by agents unless marked 🧑)
Tag: `yang2025inductive`, [paper](https://arxiv.org/abs/2502.14478)

## scope and result

Yang and Sergey present Sippy, an inductive-logic-programming synthesizer for recursive Separation Logic (SL) predicates from concrete heap instances. The paper's abstract states, "We present an approach to automatically synthesise recursive predicates in Separation Logic (SL) from concrete data structure instances using Inductive Logic Programming (ILP) techniques." (Abstract, PDF p. 1) The distinctive problem is positive-only learning: negative heap examples are difficult to generate and are often uninformative junk. Sippy combines positive-only learning (POL), clause minimisation, and SL-specific pruning. Grippy supplies assertion-passing memory graphs from programs that accept the structures as inputs (Sections 2.4–2.6, PDF pp. 7–9).

The implementation uses Popper-style ASP search, Prolog hypothesis testing, and hand-coded SL rules. The reported benchmark lists 19 predicates synthesized within a 20-minute limit, including a partially successful binomial-heap-order predicate, on an 8-core M1 MacBook Pro with 16 GB RAM (Section 6, PDF pp. 15–17). The paper provides soundness arguments for the POL result set and SL validity, and local completeness only within the bounded search space. Inference: these guarantees do not establish that finite examples identify the intended predicate.

## technique 1: positive-only predicate learning with clause minimisation

What it is. Classic ILP searches for a hypothesis entailing every positive example and no negative example. POL has no negatives: it enumerates hypotheses, retains every non-comparable hypothesis that entails all positives, and returns their most-specific set (or, for Sippy, chooses a specific member). During synthesis, clause minimisation excludes a candidate clause when a shorter equivalent clause exists. Searching for specific hypotheses avoids the classic smallest-program bias toward overly general results (Sections 2.4.1 and 3.1, PDF pp. 8–9).

When to use it. Inference: use POL when useful negative heap examples are unavailable and the domain supplies clause-entailment rules and a bounded search space. Theorem 3.1 limits its guarantee to the initial constraints and size limit.

How to do it (paper Algorithm 1, Section 3.2, PDF pp. 9–10).

1. Set `cons` to the initial constraints, `size = 1`, and `sol = True`.
2. Ask the ASP solver Clingo to generate a hypothesis of the current size.
3. If the size is unsatisfiable, increment the size.
4. Test a satisfiable hypothesis in Prolog against the positive examples and background knowledge.
5. If it is complete (entails all positives), add it to the solution set if the current solution does not entail it; remove comparable, more-general solutions. If it is incomplete, add specialization constraints from the test outcome.
6. Apply domain-specific “new pruning” constraints, continue until `max_size`, and return all non-comparable most-specific hypotheses.

Clause minimisation first eliminates a clause when a shorter logically equivalent clause exists (Section 3.1, PDF p. 9). The paper reports Theorem 3.1: "The hypothesis set returned by the positive-only learning in Algorithm 1 contains all non-comparable, most specific predicates that is complete (i.e., entailing all examples) in the search space defined by the algorithm’s initial constraints (in_cons) and the size limit (max_size) parameters." (Section 3.2, PDF p. 10)

Verus form. Inference: an analogous Rust workflow can generate candidate `spec fn` predicates over a mathematical sequence or ghost representation of a heap, then ask Verus to prove each example's `ensures` clause. A `proof fn` can establish entailment lemmas; executable pointer code remains separately verified. Verus does not provide ASP, Prolog, or Separation Logic's separating conjunction, so the search and heap abstraction are external. The finite grammar and size bound must be represented by the generator, not by a Verus keyword.

Evidence and limits. The algorithm theorem is a proof about enumeration under `in_cons` and `max_size`, not completeness over all predicates. Positive examples alone can admit several incomparable hypotheses; conjoining them is not always a well-formed SL predicate, which motivates Sippy's selection step (Section 4.3, PDF p. 13). The authors describe literal count among incomparable, normalised predicates as a practical metric: "containing more literals is likely to contain more information or constraints about the heap structure." (Section 4.3, PDF p. 13) Inference: literal count is not itself a proof of semantic strength.

## technique 2: SL-aware Sippy search and bounded local completeness

What it is. Sippy wraps POL with memory-graph-derived constraints, predicate shapes, and two expanding bounds: maximum variables and maximum body literals. For each shape it runs `MAX_POL`, which chooses the largest POL result under the paper's specificity metric. If a better predicate appears, both bounds are increased by `δ`; if the search cannot improve the result after the margin, Sippy stops.

When to use it. Inference: use this when recursive shape, pointer fields, pure relations (sets, lists, integers), and invented auxiliary predicates must be learned together. The paper restricts each predicate to at most one pure theory in its evaluation, so combined theories may need separate predicates and a merge operation.

How to do it (paper Algorithm 2, Section 4.3, PDF p. 14).

1. Extract `graph_cons` and available predicate shapes from background graph facts and examples.
2. Initialize `max_var = max_body = 1` and `sol = True`.
3. For each shape, compute the maximum search size and run `MAX_POL`.
4. If a more specific predicate is found, set the bounds to the result's variable/body counts plus `δ`, and replace `sol`.
5. If no predicate exists, increase both bounds by one; if an upper bound is reached, try the next shape.
6. If an expanded search yields no more-specific result, stop and return `sol`.

The authors state, "The role of the parameter 𝛿 is, thus, to provide a “margin” for the completeness of the search: it is not guaranteed that Sippy will find the most specific solution across all possible search spaces, but only in the search-space that is bound by the returned output’s parameters plus 𝛿." (Section 4.3, PDF p. 14) Their local-completeness theorem is exactly for that one-`δ` enlargement.

Verus form. Inference: encode the learned shape as a ghost datatype or map abstraction and use loop invariants to preserve list/tree shape during traversals. Candidate predicates should be ordinary Verus specifications and proof lemmas, with no executable call to proof code. Search bounds and shape enumeration stay in a generator; Verus checks the resulting contracts and lemmas.

Evidence and limits. Section 4.2 defines the linearity test: "the positive examples succeed using each points-to fact exactly one time" (PDF p. 13). Sippy applies specialisation pruning to candidates that violate it. Theorem 4.1 states that, for output predicates in Sippy’s search space, Prolog provability with linearity implies SL satisfaction for the corresponding heap; it does not assert that ordinary Prolog conjunction enforces heap disjointness. Recursive or nested structures enlarge both auxiliary and main searches, and lists create larger search spaces than sets because list append is more expressive (Section 6.1, PDF p. 17). The paper uses `δ = (1,2)` empirically (footnote 2, PDF p. 14).

## technique 3: Grippy positive-example generation

What it is. Grippy generates candidate memory graphs, validates them with a program's assertions, and retains only passing graphs plus facts collected by traversal. This supplies positive examples when the program expects a structure as input and therefore cannot simply be executed to obtain one.

When to use it. Inference: use it when a program or standalone traversal can check the intended structure with assertions. Passing assertions provide useful examples only to the extent that the oracle checks the relevant properties. The paper concludes that effectiveness depends on the "“thoroughness” of the structure traversal done by the function that is used as an oracle." (Section 6.2.1, PDF p. 20)

How to do it (paper Algorithm 3, Section 5, PDF p. 15).

1. Initialize an empty result set. For graph sizes from one through `max_size`, initialize a counter to zero.
2. Create random nodes, integer keys, and pointers.
3. Keep a graph only when the validator program's assertions pass.
4. Summarize the accepted graph by traversal, accumulating payload in a set; retain both graph facts and the example, and increment the counter.
5. Repeat until `ceil(n / max_size)` graphs have been accepted for each size, where `n` is the requested graph count.

The paper explains, "Valid memory graphs can be obtained by extracting concrete heap states from the program execution, provided concrete inputs, as, e.g., done by the SLING tool." (Section 5, PDF p. 15) Grippy is the fallback for input-driven programs. The authors caution that random generation also creates many negative graphs, but these are arbitrary junk and are impractical as classic-ILP negatives.

Verus form. Inference: generate Rust heap fixtures or ghost states, run a trusted validator, and translate accepted states into Verus `requires`/`ensures` examples. The validator and random generator remain outside the proof unless their generation algorithm is itself modeled. A Verus proof of a candidate predicate does not show that the fixture set covers all valid heaps.

Evidence and limits. Table 2 explicitly reports "the ratio of the number of valid graphs to all randomly generated graphs" (PDF p. 19). Its ratios range from 1.1% to 100%; it reports 18–100 accepted graphs per case within 10 minutes, using graphs with up to five nodes (Section 6.2.1, PDF p. 19). Inference: these acceptance ratios do not establish coverage of all relevant shapes or invariants.

## evidence, trust, and product implications

The principal quantitative evidence is Table 1’s 19 predicates within 20 minutes on the stated M1/16-GB setup, with the binomial-heap-order case only partially successful (Section 6.1, PDF pp. 16–17). The paper says, "Our experiments demonstrate that 2-3 example graphs with tens of nodes in total (less than 20 node per case study on average in our benchmark suite) are sufficient to synthesise good predicates (we manually assessed the results’ quality)." (Section 6.1, PDF p. 17) The authors manually assessed predicate quality. For the verification experiment, Table 2 distinguishes successful verification from equivalence to the expected predicate: "we did not manage to compile VCDryad" (Section 6.2.1, PDF p. 19). The binomial-heap-order predicate misses constraints distinguishing root and leaf sibling orders (Section 6.3, PDF pp. 21–22). Table 1 records synthesis time, exhaustive-search time, testing fraction, and comparisons with Popper and ShaPE; several cases time out or are unsupported. ShaPE synthesized four predicates in practice, while Sippy handled the 19 listed cases, but the tools do not have identical expressiveness.

What is proved: POL's bounded enumeration theorem, SL validity of output predicates under the graph/Prolog encoding, and Sippy's local completeness within the returned bounds plus `δ`.

## techniques for the catalog

- positive-only predicate learning — enumerate hypotheses against positive examples, retain non-comparable complete candidates, and prune by entailment
- clause minimisation — exclude candidate clauses when a shorter logically equivalent clause exists
- SL-aware bounded synthesis — expand variable/body bounds and use shape-specific constraints, with local completeness only within a bounded margin
- graph-guided example generation — fuzz memory graphs, retain assertion-passing instances, and summarize them as positive logic facts
