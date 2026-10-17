# CDCL-inspired Word-level Learning for Bit-vector Constraint Solving
(authored by agents unless marked 🧑)
Tag: `chihani2017word`, [paper](http://arxiv.org/abs/1706.09229v1)

## scope and result

The paper proposes conflict-driven, word-level learning for quantifier-free bit-vectors. Its target is the loss of structure caused by reducing every bit-vector to Boolean variables. The central claim is that a solver can retain word-level decisions, propagation, conflict detection, explanations, and inference while still learning constraints that are sound, asserting, minimal, and part of the bit-vector theory (section 1, p. 2); the paper also lists compositionality with learning in other theories as a desirable property (section 2.1, p. 4). Section 3.3 then admits that with its method a learnt clause is not always asserting and proposes a repair (section 3.3, pp. 12–13). The abstract states: “We propose a conflict-driven, word-level, combinable constraints learning for the theory of quantifier-free bitvectors.” (abstract, p. 1)

The paper is a design paper. It gives definitions, inference rules, an analysis algorithm, worked examples, and soundness propositions, but no implementation or benchmark measurements. It explicitly says: “The presentation of our technique is high-level.” (section 1, pp. 2–3) The conclusion identifies implementation and practical evaluation as future work: “The immediate future work is, of course, the implementation of our ideas in a word-level solver for practical evaluation and the fine-tuning of all practical ingredients of an efficient CDCL-style learning mechanism, including clause deletion, variable ordering, and other learning-related heuristics.” (section 5, p. 16)

## technique: represent word-level propagation explanations

A bit-vector domain records each bit as set, cleared, unknown, or conflicting. A conflict is created when propagation requests the opposite value of an already fixed bit. The paper's explanation language starts with literals made from variables, constants, and logical shifts. A word-level clause (w-clause) is a bitwise disjunction equal to an all-ones vector. For a propagation that clears a variable through literals `a1 ... an`, record `x | a1 | ... | an`; for a propagation that sets it through `b1 ... bm`, record `x | b1 | ... | bm`. Table 1 gives these clauses for conjunction, disjunction, xor, and shifts (section 3.1, pp. 5–6). Literals may be negated (overlined in the paper); the inline notation here omits the overlines.

The construction is:

1. maintain a four-valued bit mask for every variable (section 2.2, p. 4)
2. when an operator propagates bits, emit the corresponding w-clause from Table 1 (section 3.1, pp. 5–6)
3. attach the propagation decision level `p` and an impact mask `m` containing exactly bits that changed from unknown to fixed (Definition 3.3, p. 6)
4. merge two explanations with the same `(p, C)` by disjoining their masks (section 3.1, p. 7)
5. retain explanations in `E(x)` for later conflict analysis (Definition 3.3, p. 6); because the impact mask covers only bits that were unknown, no two explanations of a variable cover the same bit (section 3.1, p. 7)

The worked example uses `a & b = c`: it forwards known zero and one bits into `c`, and backwards propagates known bits of `c` into `a` and `b` (section 3.1, p. 5). The soundness argument derives the w-clauses for `&` from the per-bit bit-blasting equivalence and says "A similar argument can be made for the other constraints of Table 1" (section 3.1, p. 6). The paper states: “Proposition 3.1 (Explanation soundness). The propagation clauses of Table 1 are implied by their respective bitvector constraint.” (section 3.1, p. 6)

Inference: a Verus analogue would keep the executable bit-vector operation unchanged and expose a ghost explanation record containing a decision level, a `u64`-like impact mask, and a logical clause over bit-vector expressions. Verus `spec fn` definitions can describe masks and clause implication; `requires`/`ensures` can state that each recorded explanation follows from the operator contract. This is an inference because the paper does not use Rust or Verus, and its solver-side explanation store is not a Verus construct.

## technique: lift resolution from bits to words

The paper groups independent Boolean resolution steps into one bit-vector rule. For clauses `A | c` and `c | B`, resolve to `A | B`; the same operation is applied simultaneously to every bit position. Proposition 3.2 states that this is a sound extension of binary resolution (section 3.2, p. 7). Resolution on shifted literals only makes sense when the two literals share bits that come from the same position; the paper says its selection algorithm only selects w-clauses for which resolution is justified (section 3.2, p. 8). The paper gives rules such as resolving `A | (y >> n)` with `B | y` into `A | (B >> n)`, and separate rules for equal-direction and opposite-direction shifts (section 3.2, pp. 7–8).

Structural operators are reduced to the basic blocks: concatenation is a shift followed by disjunction, and extraction is a shift conjoined with a shifted mask (section 3.2, p. 8). To obtain the actual w-clauses, the paper normalizes with (non-exhaustively listed) rewrite rules that distribute conjunction/disjunction through concatenation and extraction and push shifts inward. The paper states: “Proposition 3.3. The normalization rewrite rules form a terminating rewrite system.” (section 3.2, p. 8)

To apply the rule:

1. normalize explanation literals with the rewrite rules into variables, shifts, and bitwise operators (section 3.2, p. 8)
2. choose two w-clauses that resolve on a variable `y` (one with `y`, one with its negation) and, for shifted literals, whose shifted literals share bits from the same positions (section 3.2, pp. 7–8)
3. apply the matching word-resolution rule, chosen by shift direction and by the relative sizes of the shifts (section 3.2, pp. 7–8)
4. optionally combine the result with ordinary Boolean resolution, e.g. `F ∨ (a | c)` with `(c | b) ∨ G` giving `F ∨ (a | b) ∨ G`, with negations as in the paper (section 3.2, p. 8)

The resulting clause is implied by the original constraints: “Theorem 3.1 (Learning soundness). Any constraint obtained from the word-level resolution of w-clause (and Boolean resolution) is implied by the original problem and therefore constitutes a sound extension of it.” (section 3.2, p. 9). The paper states Theorem 3.1 and Proposition 3.2 without a written proof.

Inference: in Verus, the corresponding proof would be a `proof fn` establishing implication between `spec fn` bit-vector clauses, with `assert` steps for each normalization rewrite and resolution premise. The executable solver would still need an external implementation of this inference; Verus can certify the rule but does not provide a word-level CDCL engine.

## technique: conflict analysis with masks and explanations

A conflict w-clause and conflict mask initialize one analysis reason at decision level `p`. Each culprit bit is classified as fixed before `p` or fixed at `p`; bits are equivalent when both were fixed before `p` or both are covered by the same explanation at `p`. Different equivalence classes become separate reasons, which limits each learned clause to bits that share an explanation. Definition 3.4 describes a reason as a w-clause accumulator with an analysed mask; the tuples in the set of reasons also carry the decide depth and the set of marked literals (section 3.3, pp. 9–10).

Algorithm 1 repeatedly rewrites a reason:

1. select an unmarked literal `x` in the reason (Algorithm 1, line 1, p. 10)
2. find an explanation `(p, C, mi)` for `x` whose mask overlaps the analyzed mask (line 2)
3. if the explanation covers the whole mask, resolve the reason with `C` on `x` and mark `x` (lines 3–4)
4. otherwise split the mask into the covered part and remainder, resolve only the covered part, and keep the remainder as a second reason (lines 5–9)
5. if no explanation exists at the current level, mark `x` without resolving (lines 11–12)
6. when every literal is marked, emit the reason as a learned w-clause (lines 14–15)

The paper's example starts with `a | b | c`, splits the mask when one explanation for `a` covers only `1100`, then follows separate resolution branches. It reports that two learned clauses each propagate two bits into `d` and avoid the conflict (section 3.3, pp. 10–11). Explanation order can emulate First-UIP or Last-UIP strategies (section 3.3, p. 12), and shifted literals are handled by shifting the impact mask during the overlap test (section 3.3, p. 12).

Inference: a Verus model can represent a reason as a ghost record with a `Seq` of literals, a mask, and a set of marked variable identifiers. A recursive `proof fn` can prove that each rewrite preserves implication, with a `decreases` measure based on the number of unmarked literals. This is an inferred encoding; the paper's algorithm is solver pseudocode, not Rust code.

## technique: enforce asserting learned clauses

Word-level grouping can produce a learned clause that does not propagate after backtracking when one variable appears at multiple shifts. The paper's two-bit example derives `c | v | d | (d >> 1)`, but after backtracking the clause becomes `?0 | d | (d >> 1)`, which the paper says "does not propagate" (section 3.3, p. 12). The paper explains: “This sort of problem arises because a decision is allowed to be made on many bits of the same variable, unlike in bit-blasting where decisions are made on Boolean variables.” (section 3.3, pp. 12–13)

The proposed repair is to record, in the domain representation, that the affected variable may receive only partial decisions. A simple flag forces bit-by-bit decisions; a stronger option derives a decision mask from the conflict mask and permits grouped decisions only inside that mask. This makes the learned clause asserting after backtracking (section 3.3, p. 13).

Inference: a Verus implementation would need a ghost decision-mask invariant and a proof that every post-backtrack decision respects it. The executable Rust bit-vector value need not change, but the search-state API must carry the mask; this is a product-level inference, not a result measured by the paper.

## technique: learn from simplifications and mixed theories

Section 3.4 extends explanations beyond domain propagation. A shift equality can explain that a value is zero when the shift is positive; a disjunction can explain an equality when one operand is zero; and two xor equalities sharing two variables can explain equality of their third variables (section 3.4, p. 13). The paper states these as regular Boolean clauses "where atoms are formed through bitvector constraints, equalities or disequalities" (section 3.4, p. 13); the example also uses the arithmetic atom `y > 0`. Word-level resolution is then combined with ordinary Boolean resolution.

The paper's example decides `y = 0011`, propagates `x = 0`, `z = t`, `a = c`, then `a = 0`, and finally reaches a conflict between `a = v & m` and `a = v | n`. The mixed derivation learns `(m̄ | n) ∨ ¬(y > 0)` (overline on `m` as in the paper's Figure 3), which the paper says "excludes any value strictly greater than 0 from the concretization of y in the (current) event that n = 0 and m = 1111" (section 3.4, p. 14). The conflict arises on `v`: `a = v & m` gives `v = 0` and `a = v | n` tries to make it `1111`.

## techniques for the catalog

- word-level propagation explanations — record a sound w-clause, decision level, and impact mask for every bit-vector propagation
- word-level resolution — combine overlapping per-bit resolutions into shift-aware bit-vector inference rules
- masked conflict analysis — split reasons by explanation-equivalent culprit bits and resolve only covered masks
- asserting-clause repair — constrain grouped decisions with partial decision masks when shifts relate bits of one variable
- simplification and mixed-theory learning — turn algebraic simplifications into explanations and combine word-level with Boolean resolution
