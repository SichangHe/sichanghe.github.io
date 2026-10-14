# FO-Complete Program Verification for Heap Logics
(authored by agents unless marked 🧑)
Tag: `murali2026fo`, [paper](http://arxiv.org/abs/2601.06719v1)
## scope and central result
The paper develops Frame Logic (FL) and a separation logic with Frame-Logic-inspired semantics (SL-FL). Its target is predictable automated heap verification: recursive definitions are interpreted as arbitrary fixpoints for the completeness guarantee, while soundness is still with respect to least-fixpoint meaning. The authors state: “We develop the first two heap logics that have implicit heaplets and that admit FO-complete program verification.” (abstract, p. 1). FO-completeness means that every theorem valid under fixpoint semantics eventually terminates and is proved; a theorem valid only under least-fixpoint semantics is not promised to terminate (Introduction, pp. 2–3). The paper identifies finite-only models, least-fixpoint recursion, second-order set quantification, and combined quantified background theories as sources of incompleteness (Section 2, pp. 5–6).

Inference: For Verus, the useful design lesson is to keep specifications in a first-order fragment whose quantified variables are locations and to make heap footprints uniquely determined. This is a design hypothesis, not a result about Verus.

## technique 1: support-based Frame Logic specifications

What it is. FL extends first-order logic with recursive definitions by a support operator Sp. Sp(φ) is the set of locations whose mutable fields must be read to determine φ. The authors explain: “The support is similar to local heaplets in separation logic.” (Introduction, p. 3). Unlike standard separation logic, FL gives every formula one support, including disjunction and negation; Sp(α ∨ β) is the union of both supports (Section 3.2, pp. 7–9).

When to use it. Use Sp when a contract must express ownership/frame disjointness or when a postcondition must identify exactly the allocated locations. A linked-list contract can state List(x) ∧ List(y) ∧ Sp(List(x)) ∩ Sp(List(y)) = ∅ (Section 3.2, p. 7). Hoare validity requires the initial allocated set to equal Sp(pre) and the final set to equal Sp(post) (Definition 3.1, p. 9).

How to apply it.
1. Declare Loc as the foreground sort; model pointer fields as Loc→Loc and data fields as Loc→background (Section 3.1, pp. 6–7)
2. Define recursive predicates positively, with location arguments; use the one-way signature restriction (Section 3.1, p. 7)
3. Add Sp to formulas and define disjointness by set intersection
4. For each contract, require allocated locations to equal the pre/post support; use relaxed postconditions when only subset inclusion is needed (Section 3.3, p. 10)

Verus form (Inference: the paper is not about Verus). Represent the footprint as a ghost `Set<int>` or set of node identifiers, maintain it with ghost state, and state disjointness with set intersection. Use `requires` and `ensures` on executable functions; use a `spec fn` for pure recursive predicates and `proof fn` lemmas for support properties. Verus has no Sp operator, so support computation must be encoded as ghost predicates/sets and proved by lemmas. The paper’s exact program-level predicate is a Hoare triple, not Rust syntax.

Evidence. The paper defines FL semantics by least-fixpoint equations for Sp and proves support soundness properties in its prior FL basis (Section 3.2, pp. 7–9). In the new implementation, FLV generates verification conditions (VCs) and sends them to a natural-proofs solver (Section 6, pp. 21–22).

Limits and assumptions. FL’s guarded quantification is restricted to ∃y : y = f(x).φ, recursive symbols are one-way, and supports are unique by construction (Section 3.2, p. 8). Inference: mutable aliasing patterns that cannot be represented by a unique support need a different invariant or a manual proof.

## technique 2: SL-FL unique-heaplet semantics and translation

What it is. SL-FL keeps separation-logic syntax but defines `Supp(α,s,h)` mutually with satisfaction so that a formula can hold on at most one subheaplet. The paper says: “The primary design principle is that formulas have unique heaplets under which they can hold.” (Section 4, p. 10). Heaplets may be finite or infinite, avoiding finite-model incompleteness; recursive definitions take only location parameters (Section 4, p. 10).

When to use it. Use SL-FL when a team wants separating conjunction, conjunction, guarded existential, case analysis, recursive list/tree predicates, and background data such as integer keys, but wants a translation into FL rather than magic-wand verification. The semantics of `true` is heap-independent and therefore holds only on an empty heaplet; `ite` selects the support of the guard and then the selected branch (Section 4.1, pp. 11–13).

How to apply it.
1. Write spatial atoms `x -f-> y`, separating conjunction `α * β`, conjunction, weak conjunction, `ite`, and guarded existential (Figure 4, p. 11)
2. Define `Supp` for each constructor; for `*`, union the two supports, and for `ite`, use the guard support plus the selected branch support (Figure 5, p. 12)
3. Add recursive predicates/functions only with location arguments; collect background values through functions such as Keys(x) (Section 4.2, p. 14)
4. Translate bottom-up with Π: `Π(α * β) = Π(α) ∧ Π(β) ∧ Sp(Π(α)) ∩ Sp(Π(β)) = ∅` and analogous clauses in Figure 6 (p. 13)
5. Verify the translated FL program with FLV

Verus form (Inference). Encode each node predicate as a `spec fn` over a ghost heap model and expose a ghost footprint set. Translate separating conjunction to conjunction plus disjointness of footprint sets. Encode `ite` with ordinary conditional specifications or branch lemmas. The unique-heaplet theorem becomes a lemma stating that two satisfying footprint sets are equal; it is not automatic in Verus.

Evidence. Lemma 4.2 states both that satisfaction implies `Supp(α,s,h) = dom(h)` and that at most one subheaplet satisfies α (Section 4.1, p. 13). Lemma 4.3 states that Π preserves truth and maps the SL-FL support to FL’s Sp (p. 13). Inference: these lemmas are the formal justification for reducing SL-FL verification to FL verification.

Limits. Disjunction has nonstandard semantics: supports of both disjuncts are combined, and the combined heaplet must satisfy one disjunct; the evaluation benchmarks avoided disjunction and used `ite` instead (Section 4, pp. 10–11; Section 6.2, p. 23). Recursive definitions cannot quantify over background sorts (Section 4.2, p. 14).

## technique 3: cloud operator and strongest-postcondition VC generation

What it is. The cloud operator `[·]` preserves a term or formula’s value while assigning it empty support. This removes guarded existential quantification without changing truth. The paper gives the list example and says: “The cloud of a formula (resp. term) α is a formula [α] that evaluates the same way as α, but whose support is empty.” (Section 5.1, p. 15).

When to use it. Use cloud when a recursive definition needs the value of `f(x)` but must not count the dereference of `x` twice in its support. For List, replace the existential next-node variable with `[next(x)]`, and add the tautology `next(x)=next(x)` so the enclosing support still includes x (Section 5.1, p. 15).

How to apply it.
1. Start with a quantifier `∃y : y=f(x).φ(y)`
2. Replace it with `(f(x)=f(x)) ∧ φ([f(x)])`
3. Give `[f(x)]` empty support while retaining its value
4. Build VCs over the quantifier-free result; Lemma 5.1 proves equivalence and equal support (Section 5.1, p. 15)
5. Convert each program into SSA basic blocks, splitting conditionals with `assume` (Section 5.2, pp. 16–17)
6. For each block, symbolically maintain `(T,A,H,Fr,RD)`: transformation, allocated set, heap map, frame rules, and recursive definitions (Definition 5.2, p. 18)
7. Generate `VC = (∧Fr ∧ T ⇒ (post ∧ Sp(post)=A))`; use subset for relaxed post and omit support checks for heapless post (Definition 5.3, pp. 18–19)
8. For each mutation, add a frame rule preserving recursive values outside the modified set; for dereferences/frees, add heap-safety triples; for calls, check the callee precondition and its support (Section 5.2, pp. 16–17; Section 5.3, pp. 18–20)

Verus form (Inference). A Verus implementation can keep `T`, `A`, and frame facts as ghost variables and prove each basic block’s postcondition with `assert`, `old(...)`, and proof lemmas. Heap maps become ghost models of pointer fields. There is no direct Verus cloud operator; use a ghost value with an explicitly empty footprint and prove the correspondence. Frame rules become lemmas whose `requires` says the modified set is disjoint from the predicate footprint and whose `ensures` preserves the predicate value.

Evidence. The paper’s VC transformer is defined formally in Figure 9 and Theorem 5.4 proves soundness for basic blocks (Section 5.3, pp. 18–20). FLV translates VCs to FORD and invokes a natural-proofs solver (Section 6.1, pp. 21–22).

Limits. The method assumes SSA blocks, modularly assumes validity of called-method contracts, and restricts quantification to the foreground sort to stay in `L_oneway` (Sections 3.1 and 5.2). Inference: loops require supplied invariants because the paper’s core syntax omits while loops and says they can be added with FL invariants (Section 3.3, p. 9).

## technique 4: FO-complete natural-proofs automation

What it is. The `L_oneway` fragment permits one-way functions and existential quantification only over Loc; natural proofs instantiate recursive definitions and lemmas, then use SMT reasoning. The paper states: “Validity checking for formulas in L_oneway is FO-complete and can be automated effectively using a systematic quantifier-instantiation procedure.” (Section 3.1, p. 7).

When to use it. Use this fragment when a VC must be discharged automatically but remains recursive. Keep pointer/data functions one-way and instantiate only relevant terms. The authors’ procedure translates SL-FL to FL, eliminates quantifiers with clouds, and then sends the resulting FORD formulas to the existing natural-proofs implementation (Sections 4.1 and 6.1, pp. 13, 21–22).

Evidence and numbers. FLV and SLFLV were evaluated on singly-linked lists, doubly-linked lists, circular lists, trees, and related routines. Table 1 reports the number of basic blocks and FL/SL-FL verification times; the text reports that “Our tool verifies all benchmarks effectively, in less than a minute for all benchmarks.” (Section 6.3, p. 23). The machine was a MacBook Pro with an Apple M1 Pro and 16 GB memory (Section 6.3, p. 23). The denominator is all benchmarks in the authors’ suite; no percentage is reported. The authors also report that initial quantifier instantiations sufficed for all benchmarks (p. 23).

Verus form (Inference). Verus uses SMT-backed verification but does not provide the paper’s FO-completeness theorem. A practical approximation is to keep quantified lemmas trigger-friendly, instantiate recursive facts with explicit `reveal`/lemma calls, and isolate heap reasoning in ghost maps and ownership predicates. This is an engineering transfer, not an established equivalence.

Trusted and proved. The paper proves soundness of VC generation and translation lemmas, and relies on the natural-proofs solver, SMT solver, and trusted semantics of the source languages. It does not prove that least-fixpoint validity is always found; FO-completeness applies to validity under arbitrary fixpoints. The empirical claim is bounded by the listed benchmark suite, not arbitrary programs.

Threat and prior work. Inference: The threat to agent-written verified Rust is medium: the techniques expose a route to automated framing and recursive data-structure proofs, but unique footprints, cloud-style quantifier elimination, and supplied inductive lemmas remain substantial specification work. The paper explicitly builds on prior Frame Logic and natural-proofs work; VL should not redo those foundations. New work for VL is a sound Rust/Verus encoding, ownership interaction, and evaluation on real Rust APIs.

## techniques for the catalog
- support-based Frame Logic: represent each formula’s heap footprint with Sp and verify exact or relaxed allocated-set conditions
- unique-heaplet SL-FL: use determined heaplets and translate separating formulas to FL with support disjointness
- cloud quantifier elimination: replace guarded location quantifiers with value-preserving, support-free terms
- strongest-postcondition VC generation: process SSA blocks while tracking transformations, heaps, allocations, frames, and recursive definitions
- FO-complete natural proofs: restrict VCs to one-way foreground functions and discharge them by systematic quantifier instantiation plus SMT
Checked 2026-10-13: audit record murali2026fo; paper-study comparison complete; gate executed; experiments not rerun
