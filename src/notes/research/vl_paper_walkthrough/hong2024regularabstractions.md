# Regular Abstractions for Array Systems
(authored by agents unless marked 🧑)
Tag: `hong2024regularabstractions`, [paper](https://doi.org/10.1145/3632864)

## result and assumptions
The paper introduces regular abstractions for array systems. It overapproximates an array system with a string-rewriting system whose words use a finite alphabet obtained from indexed predicates. The abstract system can then be checked with regular model checking. The abstract states preserve array sizes and index variables while replacing element values with predicate truth bits. The abstract says: “The crux of the framework is to overapproximate an array system as a string rewriting system (i.e. over a ﬁnite alphabet) by means of a new predicate abstraction that exploits the so-called indexed predicates.”

The method targets safety and liveness, including parameterized distributed protocols. The authors demonstrate selection sort, merge sort, Dijkstra’s self-stabilizing protocol, and Chang–Roberts leader election (abstract and section 7, pages 22:1 and 22:19–22:22). The key soundness direction is one-way: if the abstract overapproximation has no counterexample, the concrete property holds. Spurious abstract paths can occur; the examples in section 2 show that rough approximations produce them. The abstraction procedure requires a decidable quantifier-free array theory. A singly indexed array (SIA) formula has at most one quantified index variable per data atom (sections 3 and 5.1, pages 22:5 and 22:10). The safety and eventuality reductions require an abstractable system and an abstractable negation of the property. Liveness additionally requires progress: every maximal counterexample path must be infinite. The fairness reduction also assumes index-bounded systems, whose index variables stay between fixed parameters during each execution (section 6, pages 22:15–22:17).

## technique 1: indexed-predicate word abstraction

what it is and when to use it
Choose atoms containing a designated index variable `i`, such as `a[i] = a[n]`. For each array position, record the truth values of all chosen predicates as an m-bit letter. The array becomes a word over `{0,1}^m`; integer parameters and index variables remain explicit. Use this when array elements range over infinite domains but the property depends on finitely many relational observations.

how to do it
1. Define indexed predicates `P = ⟨P1,…,Pm⟩` over the system variables and a designated `i` (Definition 4.2, page 7).
2. For each bitvector `v`, define `φ^P_v` as the conjunction of each predicate or its negation according to the bit (equation 2, page 7).
3. For a word `w`, define `Φ^P_w` as the conjunction of `φ^P_{w[i]}` over every position `i` up to the word length (equation 3, page 7).
4. Define `α(SC)` as abstract tuples that retain the concrete index and parameter values and encode a state in `SC` by a word whose length equals the maximum system-parameter value. Define `γ(SA)` by requiring every compatible word of that length, paired with those concrete values, to belong to `SA` (page 7).
5. Use the abstract next-step operator `NA(SA) = α(NC(γ(SA)))` (equation 5, page 8).

The paper’s Dijkstra example uses `⟨a[i]=a[n], a[i]=a[i−1]⟩`; the displayed state `(1,3,[1,2,1])` maps to `[10,00,10]` and `[11,00,10]` (section 2, page 4). Inference: the varying bit reflects the unspecified `a[0]`, used by the second predicate at position 1. Hong and Lin state (section 1, page 22:3): “Although we have chosen to abstract away the actual array values by means of such indexed predicates, our abstraction maintains the concrete values of array sizes and index variables in the abstract domain.”

Verus form (inference)
Inference: represent the array and parameter state as Verus datatypes, define each indexed predicate as a `spec fn`, and represent the abstract word as a sequence of booleans or bitvectors. Use specification functions for the abstraction and concretization relations, including their sets of compatible words. Monotonicity and simulation would be proof obligations. The paper does not implement or evaluate this Verus encoding.

what evidence shows it works and limits
Proposition 4.6 gives the abstraction/concretization adjunction, and Theorem 4.9 proves that a regular transition relation gives an abstract interpretation (pages 8–10). The abstraction is an overapproximation: proving absence of abstract bad paths implies the concrete safety property, but abstract paths need not be realizable. The Dijkstra example explicitly reports spurious counterexamples from rough `S` and `F` abstractions (page 4).

## technique 2: compute regular overapproximations with constraint clauses

what it is
For a singly indexed array formula, replace each data-expression conjunction with clauses over the selected predicates that are valid consequences of the concrete formula. Encode the resulting predicate formula in the automatic structure of words. This yields a computable regular relation even though the original quantified array theory is undecidable.

how to do it
1. Put the quantifier-free matrix of the SIA formula in disjunctive normal form, retaining the quantifier prefix, with index-expression conjunctions `gj` and data-expression conjunctions `hj` (section 5.2, page 11). Normalize data atoms to contain exactly one quantified index variable as described in section 5.1 (page 10).
2. For each `hj`, form the finite atom set `A(hj,P)` containing positive and negative predicate instances at index terms from `hj` or `P`.
3. Compute `cstr(hj)` as the conjunction of every clause `C ⊆ A(hj,P)` for which `hj ⇒ C` is valid in the indexed array theory `T` (equation 8, page 11).
4. Replace each `hj` with `cstr(hj)` to obtain the abstraction formula `φ*` in negation normal form. Apply `κ^P`: replace a positive predicate instance by `boundary ⇒ Δk(t,w)` and a negative instance by `boundary ⇒ ¬Δk(t,w)`, retaining the index constraints and quantifiers (pages 11–12).
5. For transitions, extend `P` with primed predicates and encode assignments with `copy_except` and array-update terms (equations 9–10, page 12).
6. Prove soundness using Lemma 5.2 and Theorem 5.3: a satisfying concrete valuation induces a satisfying word valuation, so the regular language contains the concrete abstraction (pages 12–13).

In the Dijkstra no-privileged-process example, the authors enumerate minimal feasible clauses for `a[i] ≠ a[n]` and `a[i] = a[i−1]`; the resulting regular formula is unsatisfiable, proving the original formula unsatisfiable. They report that their tool proves unsatisfiability “in a second” while Z3 and cvc5 return “unknown” (Example 5.1, pages 11–12). Hong and Lin state: “Since regular abstractions are overapproximations, this implies that 𝜙 is unsatisﬁable in T .” (Example 5.1, page 22:12).

Verus form (inference)
Inference: use ghost sets of predicate clauses, with a proof obligation that every generated clause follows from the concrete formula. A proposed abstraction builder would guarantee `concrete_step ==> abstract_step`. Its automaton encoding and backend checker would also need verification or trust; the paper provides no Verus implementation.

## technique 3: safety, liveness, and fairness reductions

For safety `∀i.(ψ1 ⇒ G ψ2)`, Skolemize `i` with a fresh parameter `c`, conjoin `ψ1[c/i]` to the initial state, and define bad states as `¬ψ2[c/i]`. Compute regular automata `I`, `T`, and `B`; prove safety by checking `T* (I) ∩ B = ∅` (section 6.3, page 15, Theorem 6.2).

For liveness `∀i.(ψ1 ⇒ F ψ2)`, similarly initialize with `ψ1[c/i]`, use `ψ2[c/i]` as the final condition, and check that every maximal abstract execution reaches the complement of the abstraction of non-final states. The reduction preserves infinite counterexample paths. Because finite maximal counterexamples can break liveness reasoning, establish the `¬φ`-progress condition, which can be checked as a safety property (section 6.4, pages 15–16, Theorem 6.3).

For fairness, restrict to index-bounded systems, abstract universally quantified Boolean combinations of `GF ψ` and `FG ψ`, and search reachable fair cycles in the weakly finite regular abstraction (section 6.5, pages 16–17, Theorem 6.6). Hong and Lin define the progress condition explicitly: “We say that a transition system is ¬𝜙-progressing if every maximal system path satisfying ¬𝜙 is an inﬁnite path.” (section 6.4, page 22:16).

An abstractable formula permits leading existential index variables that can be replaced by fresh Skolem parameters to obtain an SIA formula (Definition 6.1, page 15). The generic temporal reduction additionally requires an index-bounded monodic property: each temporal subformula has at most one free variable outside the system vocabulary. It builds a product with a monitor for the negated property, using fresh arrays and fairness conditions. Under the abstractability, index-boundedness, and progress assumptions of Theorem 6.8, verification reduces to fair termination of the abstract system (section 6.6, pages 18–19).

Verus form (inference)
Inference: a Verus encoding could model concrete transitions and monitor state as ghost data, with invariant and ranking proof obligations. Fairness would remain an explicit assumption where required. This proposed use would need its own validation, including the treatment of infinite paths and the regular-language backend.

## technique 4: refinement-driven automation and case-study evidence

The prototype computes minimal unsatisfiable cores (MUCs) with MUST, adds singleton clauses first, and injects larger clauses when the abstract checker finds a spurious counterexample or times out. Transition templates add update-specific clauses, such as copying a predicate across an array assignment (section 8, pages 22–23). Abstraction formulae are converted to automata with Mona and Z3; safety uses an L* learning verifier, while liveness uses liveness-to-safety or SLRP (page 23).

Experiments ran on a 3.6 GHz Intel i7 laptop with a 16 GB memory limit and a 20-minute timeout (section 8, page 23). For each property, the prototype computed sufficiently precise abstractions using constraints generated by no more than 10 clauses from its incremental and template methods (section 8, page 23). Safety cases completed in seconds. Selection-sort termination took 0.7 s with L* and 1.5 s with SLRP; merge-sort liveness took 5m47s with L* and 1.4 s with SLRP. Dijkstra P1 and P3 timed out with L* at 20 minutes, while SLRP took 12m54s and 3m14s respectively. Dijkstra P2 took 9m13s with L*. Chang–Roberts liveness took 3m04s with L*. Fairness cases were unavailable to SLRP (Table 2, page 22). The entries report total runtime per property, including abstraction construction and solver time.

## threat and reuse for VL

The method assumes suitable indexed predicates are supplied. Hong and Lin state: “Lastly, we have assumed in this work that appropriate indexed predicates have been supplied.” They extract them from atoms in the case-study specifications. The resulting abstraction may grow exponentially in the predicate count, especially when bitvector letters are represented explicitly (section 10, page 22:25).

Inference: regular abstraction is useful for verifying parameterized invariants around VL’s replicated or indexed state, but it proves properties of an overapproximate model. The selected predicates, automaton translation, solver, and model-to-Rust correspondence must be trusted or separately verified.

Inference: VL can use the refinement loop to discover compact ghost invariants: start with indexed predicates over process state, generate a regular overapproximation, inspect spurious counterexamples, and add clauses that express the missing relation. This complements Verus proofs of concrete Rust transitions; it does not replace them.

Inference: a VL claim about eventual repair or review completion would need a progress argument and any fairness assumptions required by that claim. The paper does not evaluate VL or establish that its scheduling assumptions hold in a deployed system.

## techniques for the catalog
- indexed-predicate words — encode each array position by a finite bitvector while retaining sizes and indices concretely
- regular abstraction clauses — derive finite predicate clauses from valid consequences of singly indexed formulas
- alpha-gamma simulation — prove abstract reachability sound using monotone abstraction and concretization
- temporal reductions — reduce quantified safety and liveness to regular automata reachability and progress checks
- fairness via weak finiteness — verify fair liveness by reachable fair-cycle search under index-boundedness
- constraint refinement — include singleton and update-template clauses initially, then add larger MUC-derived clauses after spurious counterexamples or timeouts

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For a safety property, this requirement is met automatically since extensions of a counterexample path are still counterexample paths."): read the whole paper, including references; checked all study quotations, numbers, section and page references, technique steps, assumptions, and Table 2 runtimes; corrected the DOI link, abstraction definitions and procedure, temporal prerequisites, page references, and Dijkstra runtime scope, and marked proposed Verus/VL uses as inferences; did not reproduce proofs, run the prototype, or validate the proposed Verus/VL encodings.
