# Regular Abstractions for Array Systems
(authored by agents unless marked 🧑)
Tag: `hong2024regularabstractions`, [paper](http://arxiv.org/abs/2401.02618v1)

## result and assumptions
The paper introduces regular abstractions for array systems. It overapproximates an array system with a string-rewriting system whose words use a finite alphabet obtained from indexed predicates. The abstract system can then be checked with regular model checking. The abstract states preserve array sizes and index variables while replacing element values with predicate truth bits. The abstract says: “The crux of the framework is to overapproximate an array system as a string rewriting system (i.e. over a finite alphabet) by means of a new predicate abstraction that exploits the so-called indexed predicates.”

The method targets safety and liveness, including parameterized distributed protocols. The authors demonstrate selection sort, merge sort, Dijkstra’s self-stabilizing protocol, and Chang–Roberts leader election (abstract and section 7, pages 1 and 20–22). The key soundness direction is one-way: if the abstract overapproximation has no counterexample, the concrete property holds. Spurious abstract paths can occur; the examples in section 2 show that rough predicates produce them. The method assumes indexed array logic, singly indexed array (SIA) formulas for automated abstraction, and abstractable temporal properties. Liveness additionally needs progress, and fairness results assume index-bounded systems (section 6, pages 14–18).

## technique 1: indexed-predicate word abstraction

what it is and when to use it
Choose atoms containing a designated index variable `i`, such as `a[i] = a[n]`. For each array position, record the truth values of all chosen predicates as an m-bit letter. The array becomes a word over `{0,1}^m`; integer parameters and index variables remain explicit. Use this when array elements range over infinite domains but the property depends on finitely many relational observations.

how to do it
1. Define indexed predicates `P = ⟨P1,…,Pm⟩` over the array variables and a designated `i` (Definition 4.2, page 7).
2. For each bitvector `v`, define `φ^P_v` as the conjunction of each predicate or its negation according to the bit (equation 2, page 7).
3. For a word `w`, define `Φ^P_w` as the conjunction of `φ^P_{w[i]}` over every position `i` up to the word length (equation 3, page 7).
4. Define the abstraction `α(SC)` as abstract tuples whose word encodes a concrete state in `SC`; define concretization `γ(SA)` by requiring every word compatible with a concrete state to belong to `SA` (page 8).
5. Use the abstract next-step operator `NA(SA) = α(NC(γ(SA)))` (equation 5, page 8).

The paper’s Dijkstra example uses `⟨a[i]=a[n], a[i]=a[i−1]⟩`; the concrete state `(1,3,[1,2,1])` maps to two possible words because the predicates do not determine every relation (section 2, page 4). The paper states: “Although we have chosen to abstract away the actual array values by means of such indexed predicates, our abstraction maintains the concrete values of array sizes and index variables in the abstract domain.”

Verus form (inference)
Represent the array and parameter state as Verus datatypes, define each indexed predicate as a `spec fn`, and represent the abstract word as a sequence of booleans or bitvectors. Define `alpha` and `gamma` as specification functions over finite sequences. Prove monotonicity and simulation with `proof fn` lemmas and `ensures`; use loop invariants when computing a word over positions. This is a proposed encoding, not a claim in the paper.

what evidence shows it works and limits
Proposition 4.6 gives the abstraction/concretization adjunction, and Theorem 4.9 proves that a regular transition relation gives an abstract interpretation (pages 8–10). The abstraction is an overapproximation: proving absence of abstract bad paths implies the concrete safety property, but abstract paths need not be realizable. The Dijkstra example explicitly reports spurious counterexamples from rough `S` and `F` abstractions (page 4).

## technique 2: compute regular overapproximations with constraint clauses

what it is
For a singly indexed array formula, replace each data-expression conjunction with clauses over the selected predicates that are valid consequences of the concrete formula. Encode the resulting predicate formula in the automatic structure of words. This yields a computable regular relation even though the original quantified array theory is undecidable.

how to do it
1. Put the SIA formula in disjunctive normal form, with index-expression conjunctions `gj` and data-expression conjunctions `hj` (section 5.2, page 11).
2. For each `hj`, form the finite atom set `A(hj,P)` containing positive and negative predicate instances at index terms from `hj` or `P`.
3. Compute `cstr(hj)` as the conjunction of every clause `C ⊆ A(hj,P)` for which `hj ⇒ C` is valid in the element theory (equation 8, page 11).
4. Replace each `hj` with `cstr(hj)` to obtain the abstraction formula `φ*`, then apply `κ^P` to replace predicate instances with word-bit predicates and boundary checks (page 11).
5. For transitions, extend `P` with primed predicates and encode assignments with `copy_except` and array-update terms (equations 9–10, page 12).
6. Prove soundness using Lemma 5.2 and Theorem 5.3: a satisfying concrete valuation induces a satisfying word valuation, so the regular language contains the concrete abstraction (pages 12–13).

In the Dijkstra no-privileged-process example, the authors enumerate minimal feasible clauses for `a[i] ≠ a[n]` and `a[i] = a[i−1]`; the resulting regular formula is unsatisfiable, proving the original formula unsatisfiable. They report that the regular check finishes in one second while Z3 and cvc5 return “unknown” (Example 5.1, pages 11–12). The paper states: “Since regular abstractions are overapproximations, this implies that φ is unsatisfiable in T.”

Verus form (inference)
Use ghost finite sets of predicate clauses and prove each clause as a lemma from the concrete transition precondition. A verified abstraction builder can return a relation with an `ensures` clause stating `concrete_step ==> abstract_step`. The finite automaton backend remains an external trusted component unless its encoding and checker are verified.

## technique 3: safety, liveness, and fairness reductions

For safety `∀i.(ψ1 ⇒ G ψ2)`, Skolemize `i` with a fresh parameter `c`, conjoin `ψ1[c/i]` to the initial state, and define bad states as `¬ψ2[c/i]`. Compute regular automata `I`, `T`, and `B`; prove safety by checking `T* (I) ∩ B = ∅` (section 6.3, pages 15–16, Theorem 6.2).

For liveness `∀i.(ψ1 ⇒ F ψ2)`, similarly initialize with `ψ1[c/i]`, use `ψ2[c/i]` as the final condition, and check that every abstract path reaches the complement of the abstraction of non-final states. The reduction preserves infinite counterexample paths. Because finite maximal counterexamples can break liveness reasoning, first verify the `¬φ`-progress condition as a safety property (section 6.4, pages 16–17, Theorem 6.3).

For fairness, restrict to index-bounded systems, abstract fairness formulas such as `GF ψ` and `FG ψ`, and search reachable fair cycles in the weakly finite regular abstraction (section 6.5, pages 17–18, Theorem 6.6). The paper’s own limitation is explicit: “We say that a transition system is ¬φ-progressing if every maximal system path satisfying ¬φ is an infinite path.”

Verus form (inference)
Model the concrete transition relation and temporal monitor as ghost state machines. Prove safety by an invariant excluding abstract bad states; prove liveness with a well-founded ranking and fairness assumptions represented as `requires`. Verus can establish transition preservation and ranking decreases, but the regular-language and Büchi decision procedures require separate verified or trusted checkers.

## technique 4: refinement-driven automation and case-study evidence

The prototype computes minimal unsatisfiable cores (MUCs) with MUST, adds singleton clauses first, and injects larger clauses when the abstract checker finds a spurious counterexample or times out. Transition templates add update-specific clauses, such as copying a predicate across an array assignment (section 8, pages 22–23). Abstraction formulae are converted to automata with Mona and Z3; safety uses an L* learning verifier, while liveness uses liveness-to-safety or SLRP (page 23).

Experiments ran on a 3.6 GHz Intel i7 laptop with 16 GB memory and a 20-minute timeout. No property needed more than 10 clauses. Safety cases completed in seconds. Selection-sort termination took 0.7 s with L* and 1.5 s with SLRP; merge-sort liveness took 5m47s with L* and 1.4 s with SLRP. Dijkstra liveness properties timed out with L* at 20 minutes, while SLRP took 12m54s and 3m14s for its two applicable properties. Chang–Roberts liveness took 3m04s with L*. Fairness cases were unavailable to SLRP (Table 2, page 22). These denominators are individual properties, not aggregate success rates.

## threat and reuse for VL

Inference: regular abstraction is useful for verifying parameterized invariants around VL’s replicated or indexed state, but it proves properties of an overapproximate model. The selected predicates, automaton translation, solver, and model-to-Rust correspondence must be trusted or separately verified.

Inference: VL can use the refinement loop to discover compact ghost invariants: start with indexed predicates over process state, generate a regular overapproximation, inspect spurious counterexamples, and add clauses that express the missing relation. This complements Verus proofs of concrete Rust transitions; it does not replace them.

Inference: the paper establishes that liveness needs explicit progress and fairness assumptions. A VL product claim about eventual repair or review completion should expose those assumptions in the Verus contract and measure whether the deployed scheduler satisfies them.

## techniques for the catalog
- indexed-predicate words — encode each array position by a finite bitvector while retaining sizes and indices concretely
- regular abstraction clauses — derive finite predicate clauses from valid consequences of singly indexed formulas
- alpha-gamma simulation — prove abstract reachability sound using monotone abstraction and concretization
- temporal reductions — reduce quantified safety and liveness to regular automata reachability and progress checks
- fairness via weak finiteness — verify fair liveness by reachable fair-cycle search under index-boundedness
- counterexample refinement — add MUC-derived and update-template clauses when coarse abstractions are spurious

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
