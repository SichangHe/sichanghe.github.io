# Bounded Quantifier Instantiation for Checking Inductive Invariants
(authored by agents unless marked 🧑)
Tag: `feldman2017bounded`, [paper](https://doi.org/10.23638/LMCS-15(3:18)2019)
## scope and measured object

Feldman, Padon, Immerman, Sagiv, and Shoham study checking whether a quantified invariant is preserved by an EPR transition relation. For invariant `I` and transition `δ`, inductiveness is the unsatisfiability of `I ∧ δ ∧ ¬I'` (Section 2.2, p. 6). The target class is `∀*∃*` invariants over uninterpreted relations. The paper's central method, Bounded-Horizon, limits quantifier-instantiation term depth so the check terminates. The text read is the extended journal version (Logical Methods in Computer Science 15(3), 2019, pp. 18:1–18:47; page numbers below are pages within the article, 1–47), whose first page notes that a preliminary version appeared at TACAS 2017. The abstract says it “can help the user diagnose the case when ϕ is not inductive, especially when the underlying reason is the existence of infinite counterexamples” (Abstract, p. 1).

## technique 1: Bounded-Horizon instantiation

What it is: Skolemize the invariant and negated post-invariant, then instantiate universal formulas only with ground terms whose function nesting depth is at most `k`. Let `BHT0` be constants and `BHTk` add one function layer to `BHTk−1` (Definition 3.4, p. 12). The algorithm checks the finite set `Ind[t]` for tuples `t ∈ BHTk` with total depth at most `k` (Section 3, p. 12).

How to apply:

1. Build `Ind = I^S ∧ δ^S ∧ (¬I')^S` by Skolemizing existential quantifiers (Section 3, p. 11)
2. Construct `BHT0` from all constants and iteratively add function applications to obtain `BHTk` (Definition 3.4, p. 12)
3. Instantiate every universal variable in `Ind` with tuples from `BHTk`, retaining only instances whose resulting term depth is at most `k` (Definition 3.5 and Equation (3.1), p. 12)
4. Ask an SMT solver whether the finite ground conjunction is unsatisfiable (Section 3, p. 12)
5. If unsatisfiable, report that `I` is inductive; otherwise report only that `I` is “not known to be inductive” (Section 3, p. 12). Inference: when the finite instance set is satisfiable, keep its model as a partial model, as Section 6 does (p. 30)

For a `∀*∃*` invariant `I = ∀x.∃y.α(x,y)`, the paper's illustrative approximation instantiates `I^S` at `BHTk−1`, while `δ^S` and the negated post-invariant use `BHTk` (Equation (3.2), p. 12). The paper proves soundness for every `k`: if the bounded set is unsatisfiable, the full formula is unsatisfiable (Lemma 3.6, p. 13). It also proves that some finite bound is complete for every inductive invariant by compactness, although no one bound works for all invariants (Lemma 3.8 and Example 3.9, pp. 14–15).

Verus form: Inference: expose a diagnostic mode that limits quantifier instantiations in the SMT encoding generated for a Verus proof obligation. Keep the accepted Verus proof on the ordinary sound checker; bounded mode can return “proved at bound k” or “inconclusive,” never “verified” solely from a satisfiable bounded model. Verus specifications use `requires`, `ensures`, and loop `invariant` clauses; the paper's `BHTk` is an external solver policy, not a Verus source construct.

Evidence and limits: Bound 0 is complete for universal invariants (p. 14); the paper's client-server example is proved with bound 1, while a chained client-server-database example needs bound 2 (Examples 3.7 and 3.9, pp. 13–15). Since inductiveness of `∀*∃*` invariants is undecidable even for EPR transitions (Section 3, p. 11 and Appendix A), incompleteness at a fixed bound is unavoidable.

## technique 2: instrumentation to eliminate quantifier alternation

What it is: add a derived relation `r` intended to encode an existential subformula `ψ(x)`, update it when core relations change, and rewrite program conditions to use `r`. The paper lists three steps: identify `ψ` and `r`; add sound update code; and modify the program to use `r` (Section 4.1, pp. 16–17). A sound instrumentation must preserve all original behaviors under the interpretation `r=ψ`, formalized as the validity of `δ → δ̂[ψ/r,ψ'/r']`, where `δ` is the original and `δ̂` the instrumented transition relation (Definition 4.2, p. 17).

How to apply:

1. Choose an existential formula, such as `ψ(x,y)=∃z.req(x,z)∧match(z,y)`, and declare relation `r(x,y)` (Section 4.1 and Example 4.1, pp. 16–17)
2. Add quantifier-free update code for `r` whenever `req` or `match` changes, ensuring it tracks `ψ` (Section 4.1 step 2, p. 16; Example 4.1, pp. 16–17)
3. Rewrite checks or conditions to refer to `r` instead of the existential formula (Section 4.1 step 3, p. 16; Example 4.1, pp. 16–17)
4. Prove the instrumented transition includes every original transition when `r` is interpreted as `ψ` (Definition 4.2 and Example 4.3, p. 17; the paper notes the user need not know an inductive invariant of the original program in advance, p. 17)
5. Prove a universal invariant over `r`, then substitute `ψ` back to obtain the original quantified invariant (Lemma 4.5 and Example 4.6, pp. 17–18)

Verus form: Inference: represent a derived relation as a ghost map, set, or predicate whose update is proved consistent with executable state. Use Verus `ghost` state and proof lemmas, with `requires`/`ensures` relating the ghost relation to the existential property. Do not mutate executable state solely for instrumentation, and do not use `assume` to assert the relation's meaning. The paper's instrumentation changes the transition model; a Verus implementation must prove refinement between ghost updates and Rust behavior.

Evidence and limits: The client-server invariant `∀u,p. resp(u,p)→∃q.req(u,q)∧match(q,p)` becomes universal after introducing `r` and is proved by bound 1 (Examples 3.7 and 4.1, pp. 13, 16–18). The method is manual and “labor-intensive and error-prone” (Section 1, p. 3); soundness depends on the update code and rewritten conditions.

## technique 3: low-bound completeness via instrumentation correspondence

What it is: Bounded-Horizon with bound 1 or 2 can simulate a sound instrumentation without additional existential quantifiers. The paper's intuition, which it states as a conjecture (“we conjecture that a small depth of instantiations typically suffices”), is that an EPR transition touches only a small “horizon” of the domain, namely elements pointed to by program variables, so instantiating the original existential invariant on those constants supplies what a universal instrumented invariant needs (Section 3, pp. 14–16; Section 4.2, pp. 19–20).

How to apply:

1. Determine whether an instrumented transition adds no new existential witnesses and has an existential naming into the original Skolemized transition (Definitions 4.8–4.9, p. 18)
2. Identify the existential formula `ψ` replaced by relation `r` and check that the instrumented invariant is universal (Section 4.2, p. 19)
3. Run Bounded-Horizon at bound 1 when `ψ` is existential and `r` appears positively, or when `ψ` is universal and `r` appears negatively (Theorem 4.13, p. 22)
4. Use bound 2 when `ψ` is alternation-free with no restriction on how `r` appears and the instrumented invariant is universal (Theorem 4.14, p. 23), or when the instrumented invariant is alternation-free and `ψ` is alternation-free, which gives a 1-alternation original invariant (Theorem 4.16, p. 25)
5. If the low-bound check fails, distinguish invariant is not inductive from the case where no instrumentation without additional existentials can establish it (Section 4.2, p. 19; footnote 5 qualifies this: strictly it excludes instrumentations where `r` appears only positively in the invariant)

Verus form: Inference: use this as a policy for selecting solver bounds after identifying ghost predicates and their dependency direction. The correspondence is a meta-theorem about first-order encodings; it does not authorize weakening Verus contracts or treating a failed bound as a bug. Record which ghost predicate and polarity justified the bound.

Evidence and limits: The paper's theorem guarantees are conditional on sound instrumentation without added existentials. Example 3.9 needs bound 2 because each database response must be linked through a server request and then a client request (pp. 14–15). Arbitrarily deeper chains can require larger bounds.

## technique 4: local instantiation as executable instrumentation

What it is: enforce `r(t) → ψ(t)` only for selected program variables by havocing a fresh witness and assuming the quantifier-free body. For `ψ(x)=∃y.φ(x,y)`, Definition 5.1 inserts `local c := *; assume r(t) → φ(t,c)` (Section 5, p. 26). The added local variable creates an existential in the transition relation and acts as the witness for `y`.

How to apply:

1. Choose a tuple `t` of current program variables or variables representing post-state Skolem constants (Section 5, pp. 26–27)
2. Add a fresh local witness `c` with havoc semantics (Equation (5.1), p. 26)
3. Add `assume r(t) → φ(t,c)` so that whenever `r(t)` holds, `c` witnesses `ψ(t)` (Definition 5.1, p. 26)
4. Add the universal direction `ψ(x)→r(x)` to the verification condition, and share post-state Skolem variables when checking the instrumented invariant (Section 5, pp. 26–27)
5. Repeat local instantiation on newly introduced witness variables to simulate deeper term nesting (Section 5, p. 27)

The paper proves local instantiation is sound because the added constraint does not exclude a transition allowed by the original program when `r` means `ψ` (Lemma 5.2, p. 26). Its database example uses one instantiation on `(id,skp)` and a second on `(id,c1)`, yielding depths 1 and 2 (Figure 6, pp. 28–29).

Verus form: Inference: the safe analogue is a proof lemma that introduces an existential witness and proves its relation to a ghost predicate. A runtime `assume` is not an acceptable Verus proof technique because it can make the obligation vacuous. Keep local witnesses in proof code or a diagnostic model and prove their existence from `requires`, map/set facts, or previously established lemmas.

Evidence and limits: Local instantiations can simulate arbitrary depth if applied iteratively (Section 5, p. 27), but each added witness increases the transition relation and engineering burden. The authors distinguish this technique from instrumentation without added existentials because local instantiation intentionally adds existential quantifiers (Section 5, p. 29).

## technique 5: partial models for diagnosing non-inductiveness

What it is: when the full quantified VC is hard or divergent, obtain a model of the finite bounded instances. This is not a true counterexample, but it can reveal a pattern that extrapolates to an infinite one. The paper says such a structure “is not necessarily a true counterexample but ‘approximates’ one” (Section 1, p. 3).

How to apply:

1. Run the Bounded-Horizon check at bound 1 and save a satisfying partial model if the finite instances are satisfiable (Section 6, p. 30)
2. Increase the bound and compare the resulting finite structures (Section 6, pp. 30–32)
3. Identify a repeated pattern, such as a ring whose every node has a higher-ID successor, that persists as the horizon grows (Section 6.1, pp. 30–32)
4. Form an infinite-model hypothesis explaining the pattern; do not label it a verified concrete execution (Section 6.1, p. 32)
5. Add the missing modeling assumption or induction axiom, then rerun the ordinary inductiveness proof (Sections 6.1–6.2, pp. 32–33)

In the ring-election example, bounds 1 and 2 produce finite partial rings; extrapolation yields an infinite open ring where every node's ID is lower than its successor. Adding `∃n1.∀n2.n2≤n1` (a maximal-ID axiom) makes the VC unsatisfiable and the invariant provable at bound 1 (Section 6.1, p. 32). The trusted-chain example similarly needs an induction principle over the order (Section 6.2, p. 32).

Verus form: Inference: attach bounded SMT models to failed Verus obligations only as diagnostic artifacts. For sequences, maps, and state machines, compare models at increasing abstraction horizons and look for missing well-foundedness or boundary assumptions. A Verus proof must then establish the added assumption explicitly; a model pattern must never be inserted as an `assume` in production code.

Evidence and limits: Partial models are guaranteed to satisfy only the selected instances. The paper's finite models omit elements beyond the instantiation horizon, so a model can suggest but cannot prove an infinite counterexample (Section 6.1, pp. 31–32).

## technique 6: bound-1 implementation with guarded quantifiers

What it is: implement bound 1 by guarding quantified subformulas with equalities to existing constants. If a subformula `∀x.θ` contains function applications, rewrite it to `∀x.(∨_{c∈const[Ind]} x=c)→θ` and let Z3's model-based instantiation handle the resulting formula (Section 7.1, p. 33).

How to apply:

1. Build `Ind = I^S ∧ δ^S ∧ (¬I')^S` and collect its constants (Section 7.1, p. 33)
2. For each universal subformula containing a function application, add a disjunction equating its variable to every existing constant (Section 7.1, p. 33)
3. Send the guarded formula to Z3 with model-based quantifier instantiation enabled (Section 7.1, p. 33)
4. Return unsat as a sound inductiveness proof; a sat answer yields a model of the bounded instances, which the paper uses as a partial model (Sections 3, 6 and 7.1, pp. 12, 30, 33). Inference: a wrapper would also want its own timeout; the paper's evaluation used a 60 second timeout for the baseline (Table 1, p. 36)

The translation grows by `O(#Consts · #∀)`; the number of combinations can still be exponential in the number of quantified variables, which the paper leaves to the solver (Section 7.1, p. 33). The authors argue model-based instantiation terminates because each instantiation has the same truth value in the model as one using an existing ground term (constants, then `BHT1` terms), so Z3 creates no superfluous new terms; this termination claim is attributed to personal communication with Bjørner (Section 7.1, p. 33).

Verus form: Inference: this can be implemented in a Verus-to-SMT diagnostic wrapper only if the generated solver formula and quantifier locations are exposed. It is not a source-level Verus feature. Preserve the exact generated obligation and solver settings so a bounded “pass” is distinguishable from an ordinary Verus proof.

Evidence: The prototype implements bound 1 on Z3 through Ivy (Section 7.1, p. 33). The correct examples in Table 1 all pass at bound 1; the incorrect trusted-chain and ring examples terminate with partial models, while baseline Z3 does not terminate within 60 seconds (Section 7.3, pp. 35–37). Bound-1 total times are 58 ms for client-server, 319 ms for list reverse, 2,004 ms for learning switch, 354 ms for hole-punching firewall with ghost, 485 ms for hole-punching firewall with existential time, 435 ms for trusted chain (correct), and 517 ms for leader election (correct); incorrect trusted chain takes 393 ms and incorrect ring 899 ms, versus baseline Z3 timing out at 60 seconds on both incorrect cases (Table 1, p. 36). Client-server and list reverse were measured on a 3.5GHz i5-4690 with Linux 3.13; the other rows on a Linux 4.15.0 VM on a 2.9GHz i7-7500U. The paper does not say how many runs were taken. On the correct examples bound 1 is slower in total than baseline Z3 (for example 2,004 ms versus 91 ms for learning switch); the paper attributes most of the overhead to constructing the formula (Section 7.3.3, p. 37).

## what is proved, measured, and trusted

The paper proves soundness of every bounded check, finite-bound completeness for any inductive invariant, conditional low-bound power relative to instrumentation, and soundness of local instantiation (Sections 3–5). It measures termination, runtime overhead, and example success on a small suite: bound 1 proves all correct examples in Table 1 and returns partial models for two incorrect cases (Section 7.3, pp. 35–37); the list also includes list reverse, learning switch and two hole-punching firewall variants. It trusts the first-order encoding, Skolemization, Z3's model-based instantiation behavior, and the assumption that EPR transitions accurately model the program.

## techniques for the catalog

- bounded-horizon instantiation — cap Skolem-term depth, check the finite ground set, and accept only unsatisfiability as a sound proof
- derived-relation instrumentation — encode existential predicates in maintained relations and prove a simpler universal invariant
- low-bound completeness criteria — use instrumentation polarity and existential structure to justify bound 1 or 2
- local witness instantiation — add havoced witnesses for selected program variables and iterate to simulate deeper terms
- partial-model diagnosis — compare finite bounded models to infer an infinite counterexample or missing induction axiom
- guarded bound-1 encoding — restrict quantified variables to existing constants and rely on terminating model-based instantiation
