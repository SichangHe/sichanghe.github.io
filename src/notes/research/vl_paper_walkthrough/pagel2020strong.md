# Strong-Separation Logic
(authored by agents unless marked 🧑)
Tag: `pagel2020strong`, [paper](http://arxiv.org/abs/2001.06235v2)

## scope and results

Pagel and Zuleger change the semantics of separating conjunction so that heap composition can share locations only when those locations are named by stack variables. They call the resulting logic strong-separation logic (SSL). The paper targets formulas with points-to atoms, singly linked list segments, separating conjunction, magic wand, and Boolean connectives. Its central claim is a complexity result: satisfiability and entailment for this SSL fragment are decidable and PSpace-complete, although the corresponding standard-semantics problem with list segments is undecidable. The abstract states that SSL is “decidable even in the presence of both the magic wand and the list-segment predicate—a combination of features that leads to undecidability for the standard semantics.” (Abstract, p. 1)

## technique: strong-separation semantics

Use this technique when a separation-logic verifier needs magic wand, negation, or list segments but arbitrary heap splitting makes reasoning undecidable or produces irrelevant dangling pointers. A state is a stack–heap pair `(s,h)`: the stack maps program variables to locations and the heap is a finite partial pointer function (§1, pp. 1–3). Under ordinary separation logic, `ϕ * ψ` holds when `h` can be split into disjoint allocated domains, even if a pointer in one part targets a location allocated in the other. The authors identify this as the source of arbitrary dangling pointers.

Apply SSL as follows:

1. define the stack variables that name the program-visible locations (§1, pp. 1–3)
2. when composing two heaps, allow their union only when the shared locations are values of stack variables (§1, p. 3)
3. interpret points-to, list-segment, Boolean, and magic-wand formulas with this restricted separating conjunction (§2)
4. retain the ordinary frame rule and standard separation-algebra reasoning, justified by the paper's result that the models form a separation algebra (§1, p. 3; Lemma 1, §2.2, p. 7)
5. use the resulting semantics for symbolic heaps, symbolic execution, and abduction (§1, pp. 3–4)

The paper's Figure 1 contrasts `ls(x,y) * ls(y,nil)`, whose models can be split only at the location of variable `y`, with `ls(x,nil) * t`, where standard semantics permits arbitrary dangling pointers into the list. The authors write, “We propose to parameterize the separating conjunction by the stack and exclusively allow the union of heaps that only share locations that are pointed to by the stack.” (§1, p. 3) They show that symbolic-heap specifications agree between standard and strong semantics, so existing symbolic-heap specifications do not change when SSL is adopted (§1, p. 3; Lemma 4, §2.3, p. 9). Footnote 4 (p. 9) restricts Lemma 4 to symbolic heaps with the list predicate and no other data structures.

Inference: Verus does not expose a separation-logic `*` with this semantic parameter. A Verus model could represent ownership by Rust references or proof-oriented ghost state and encode a restricted composition predicate over sets of locations. The restriction would need to be stated as a `spec fn` or lemma and proved for each API; it would not automatically alter Verus's borrow checker or solver semantics. The transfer is conceptual, not a construct supplied by the paper or by Verus.

## technique: abstract-memory-state decision procedure

Use the decision procedure to decide SSL satisfiability or entailment for a finite set of stack variables. The theorem is explicit: “Let ϕ ∈ SL and let x ⊆ Var be a finite set of variables with fvs(ϕ) ⊆ x. It is decidable in PSpace (in |ϕ| and |x|) whether there exists a model (s, h) with dom(s) = x and (s, h) |= ϕ.” (Theorem 1, §3, p. 9) The paper's complexity is a worst-case bound, not an experiment. The paper says its direct algorithm `abs` "runs in exponential time" and then shows that an enumeration-based implementation needs only polynomial space (§3.7, pp. 18–19).

The construction proceeds in the following order:

1. decompose a model's heap into minimal nonempty sub-heaps, called chunks, under the strong composition operator (§3.1, pp. 10–11)
2. classify each chunk as positive if it satisfies an atomic formula, or negative otherwise; record garbage, unlabeled dangling pointers, and overlaid list segments among negative cases (§3.1, p. 11)
3. build an abstract memory state (AMS) `A = ⟨V,E,ρ,γ⟩`: `V` partitions stack variables by aliasing, `E` is a partial map between these variable classes whose labels are "= 1" (a single pointer) or "≥ 2" (a list segment of at least length two), `ρ` groups the variable classes allocated together in each negative chunk, and `γ` counts the negative chunks that allocate no stack variable (the garbage-chunk count) (§3.2, pp. 12–13)
4. prove refinement: models with the same AMS satisfy exactly the same SSL formulas (Theorem 2, §3.3, p. 13; supporting Lemmas 8–14 on pp. 14–15; proof in Appendix B, pp. 33–34)
5. recursively compute the set of AMSs denoted by each formula, by Lemmas 15–19 (§3.4, pp. 15–16), bounding the garbage-chunk count by the formula's chunk size (Theorem 3, §3.5, p. 16) and lifting that bound during composition (Fig. 6 and Definition 10, §3.6, p. 17)
6. decide satisfiability by checking whether the computed AMS set is nonempty, and decide entailment `ϕ |= ψ` as unsatisfiability of `ϕ ∧ ¬ψ` (Theorem 5 and Corollary 4, §3.6, p. 18; proof of Corollary 4 in Appendix B, p. 37)
7. enumerate AMS encodings while retaining at most one AMS per subformula; the polynomial encoding length yields PSpace membership, and a QBF reduction yields PSpace hardness (§3.7, pp. 18–19)

The refinement invariant is the key soundness argument. The paper states, “If (s1, h1) and (s2, h2) abstract to the same AMS, then they satisfy the same formulas.” (§3, p. 9) The authors also establish PSpace-hardness even without list segments by encoding positive and negative Boolean literals with points-to formulas, using magic wand for universals and septraction for existentials (§3.7, p. 18). The conclusion reports PSpace-completeness for SSL with lists and contrasts it with undecidability under weak semantics (§6, p. 27).

Inference: A Verus analogue would be a finite ghost abstraction of an ownership graph, with a `spec fn` mapping a concrete structure to aliases, edges, and allocated markers. A proof lemma could show that equal abstractions imply equal truth of a selected family of predicates, then a finite enumeration could discharge bounded satisfiability questions. This would be a new Verus library and would not make arbitrary quantified Rust specifications decidable. Verus's SMT backend may still return unknown or require user lemmas; the PSpace theorem applies only to the paper's finite SSL syntax and semantics.

## technique: forward symbolic execution with frame and materialization

Use these rules to discharge verification conditions for loop-free pointer code. The paper defines a six-command language: field update `x.next := y`, field read `x := y.next`, `free(x)`, `malloc(x)`, assignment `x := y`, and `assume(ϕ)` where `ϕ` is equality or disequality (§4, pp. 19–20). Figure 8 gives local Hoare rules for each command. For example, `{x 7→ z} x.next := y {x 7→ y}`, `{x 7→ z} free(x) {emp}`, and `{emp} malloc(x) {x 7→ m}` (Fig. 8, p. 19).

The application procedure is:

1. annotate the loop-free command sequence with a robust precondition and desired postcondition (§4, pp. 21–23)
2. for each command, match its local precondition `P` inside the current symbolic state `Qi = A * P` (§4, p. 21)
3. apply the local rule `{P} c {Q}` and preserve the frame `A`, substituting fresh copies for variables modified by `c` (§4, p. 21)
4. if `P` is a points-to assertion not yet exposed, apply materialization to introduce a fresh target variable `z` and a septraction frame (§4, pp. 21–22)
5. repeat through the sequence to derive `{Pstart} c1 … ck {Q0}` (§4, p. 21)
6. invoke SSL entailment to check `Q0 |= Q`, accounting for fresh logical variables and requiring robust annotations (§4, pp. 21–23)

The frame rule is shown as `{P} c {Q}` yielding `{A * P} c {A[x0/x] * Q}`, with fresh `x0` for modified variables (Fig. 9, p. 19). The materialization rule exposes `x 7→ z` when the current formula entails that `x` is allocated, then leaves the remainder as a septraction. The authors emphasize, “The frame rule is essential for lifting the local proof rules to larger heaps.” (§4, p. 21) They prove each local rule is a local contract and then prove soundness of the whole forward calculus (Lemmas 25–26, §4, pp. 22–23).

The paper's worked examples verify loop invariants for list reverse and list copy (Fig. 11 and Examples 6–7, pp. 23–24). For list reverse, materialization exposes `x 7→ z`, the field read binds `b = z`, the update makes `x 7→ a`, and assignments re-establish the invariant `ls(x,nil) * ls(a,nil)` (Example 6, p. 24). For list copy, allocation and field update extend the copied list while preserving `ls(u,x) * ls(x,nil) * ls(r,s) * s 7→ m` (Example 7, pp. 23–24). The paper claims full automation for the loop-free entailment check by combining the local rules, frame/materialization, and its decision procedure (§4, p. 23); it supplies no benchmark count.

Inference: In Verus, local rules correspond to function contracts (`requires` and `ensures`) and ghost state describing list segments. A frame-like lemma can preserve an untouched segment while a command contract updates one pointer. Materialization resembles proving an allocation or map lookup fact before using a field relation. Verus has no `septraction`, so the residual ownership formula must be represented with explicit predicates and proof lemmas. Loop invariants remain ordinary Verus `invariant` clauses, and the SSL automation claim does not carry over to Rust code without implementing these predicates.

## technique: normal forms for optimal abduction

Use abduction when a verifier must find a missing heap fragment `ζ` such that `ϕ * ζ |= ψ`. The paper defines the weakest solution as `ϕ −* ψ` and the weakest spatially minimal solution as `ϕ −* ψ ∧ ¬((ϕ −* ψ) * ¬emp)` (Definition 14 and Lemma 27, §5, p. 26). The challenge is to compute an explicit formula, rather than merely assert that a solution exists.

The normal-form procedure is:

1. collect the AMSs of the models of the formula over stacks with domain `x`, written `αx(ϕ)` (the paper also defines the bounded set `abstx(ϕ)`) (§5, p. 25)
2. translate each AMS `A = ⟨V,E,ρ,γ⟩` into `AMS2SLm(A)`, combining aliasing, graph edges, negative allocation, and bounded garbage components (Fig. 12, p. 26)
3. disjoin the translations to obtain `NFx(ϕ)` (§5, p. 25)
4. use the equivalence theorem `NFx(ϕ) |= ϕ` and `ϕ |= NFx(ϕ)` to replace a formula by its normal form (Theorem 6, §5, p. 25)
5. apply the normal form to `ζ := ϕ −* ψ` for the weakest solution, or to `ζ' := ϕ −* ψ ∧ ¬((ϕ −* ψ) * ¬emp)` for the weakest minimal solution, giving explicit representations `NFx(ζ)` and `NFx(ζ')` (§5, p. 27)
6. to stay inside the positive fragment, add a new atom `ls≥2(x,y)` (a list segment of length at least 2) to SSL, translate edges labelled "≥ 2" directly to it, and disjoin the translations of the AMSs in `αx(ζ)` with `ρ = ∅` and `γ = 0`; the paper states that this "is the weakest resp. the weakest minimal solution to the abduction problem from the positive fragment" (§5, p. 27)

The paper explains the components of the translation: aliasing encodes variable equality, graph encodes points-to and list edges, `negalloc` records negative chunks, and `garbage` ensures the stated number of additional chunks that allocate no stack variable (p. 25; Fig. 12, p. 26). It reports a theoretical result only: explicit weakest and weakest-minimal solutions are computable for the stated SSL fragment. The authors say that using these representations in a program analyzer is future work (§5, p. 27).

Inference: In Verus, abduction could generate a missing `requires` fact, ghost ownership predicate, or lemma precondition from a failed proof obligation. A finite normal form is plausible for bounded data structures, but Verus specifications commonly quantify over unbounded sequences and arithmetic, so this exact construction would not be complete. Any generated precondition must be reviewed against the intended API contract; a weaker precondition can make a proof easier while changing the program's required behavior.

## techniques for the catalog

- strong-separation semantics — restrict heap composition to stack-named shared locations to retain magic-wand and list reasoning
- abstract-memory-state decision procedure — decompose heaps into chunks and decide SSL satisfiability and entailment in PSpace
- forward symbolic execution — combine local pointer rules with frame and materialization rules, then discharge entailment
- normal-form abduction — translate finite abstract memory states into formulas for weakest and spatially minimal missing heap facts
