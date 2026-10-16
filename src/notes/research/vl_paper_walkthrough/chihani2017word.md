# CDCL-inspired Word-level Learning for Bit-vector Constraint Solving
(authored by agents unless marked 🧑)
Tag: `chihani2017word`, [paper](http://arxiv.org/abs/1706.09229v1)

## scope and result

The paper proposes conflict-driven, word-level learning for quantifier-free bit-vectors. Its target is the loss of structure caused by reducing every bit-vector to Boolean variables. The central claim is that a solver can retain word-level decisions, propagation, conflict detection, explanations, and inference while still learning constraints that are sound, asserting, minimal, theory-internal, and compositional. The abstract states: “We propose a conflict-driven, word-level, combinable constraints learning for the theory of quantifier-free bitvectors.” (abstract, p. 1)

The paper is a design paper. It gives definitions, inference rules, an analysis algorithm, worked examples, and soundness propositions, but no implementation or benchmark measurements. It explicitly says: “The presentation of our technique is high-level.” (section 1, p. 2) The conclusion identifies implementation and practical evaluation as future work: “The immediate future work is, of course, the implementation of our ideas in a word-level solver for practical evaluation and the fine-tuning of all practical ingredients of an efficient CDCL-style learning mechanism, including clause deletion, variable ordering, and other learning-related heuristics.” (section 5, p. 15)

Inference: for VeruLaw (VL), this is a solver-engineering technique rather than a proof annotation method. It could reduce Z3 bit-vector search only if the underlying verification pipeline exposes equivalent word-level propagations and explanations; the paper does not show that Verus or Z3 can consume these rules directly.

## technique: represent word-level propagation explanations

A bit-vector domain records each bit as set, cleared, unknown, or conflicting. A conflict is created when propagation requests the opposite value of an already fixed bit. The paper's explanation language starts with literals made from variables, constants, and logical shifts. A word-level clause (w-clause) is a bitwise disjunction equal to an all-ones vector. For a propagation that clears a variable through literals `a1 ... an`, record `x | a1 | ... | an`; for a propagation that sets it through `b1 ... bm`, record `x | b1 | ... | bm`. Table 1 gives these clauses for conjunction, disjunction, xor, and shifts (section 3.1, pp. 5–6).

The construction is:

1. maintain a four-valued bit mask for every variable (section 2.2, p. 4)
2. when an operator propagates bits, emit the corresponding w-clause from Table 1 (section 3.1, pp. 5–6)
3. attach the propagation decision level `p` and an impact mask `m` containing exactly bits that changed from unknown to fixed (Definition 3.3, p. 6)
4. merge two explanations with the same `(p, C)` by disjoining their masks (section 3.1, p. 6)
5. retain explanations in `E(x)` for later conflict analysis (Definition 3.3, p. 6)

The worked example uses `a & b = c`: it forwards known zero and one bits into `c`, and backwards propagates known bits of `c` into `a` and `b` (section 3.1, p. 5). The soundness argument derives the w-clauses from the per-bit bit-blasting equivalence. The paper states: “Proposition 3.1 (Explanation soundness). The propagation clauses of Table 1 are implied by their respective bitvector constraint.” (section 3.1, p. 6)

Inference: a Verus analogue would keep the executable bit-vector operation unchanged and expose a ghost explanation record containing a decision level, a `u64`-like impact mask, and a logical clause over bit-vector expressions. Verus `spec fn` definitions can describe masks and clause implication; `requires`/`ensures` can state that each recorded explanation follows from the operator contract. This is an inference because the paper does not use Rust or Verus, and its solver-side explanation store is not a Verus construct.

## technique: lift resolution from bits to words

The paper groups independent Boolean resolution steps into one bit-vector rule. For clauses `A | c` and `c | B`, resolve to `A | B`; the same operation is applied simultaneously to every bit position. Proposition 3.2 states that this is a sound extension of binary resolution (section 3.2, p. 7). Shifted literals require masks to identify overlapping source positions. The paper gives rules such as resolving `A | (y >> n)` with `B | y` into `A | (B >> n)`, and separate rules for equal-direction and opposite-direction shifts (section 3.2, pp. 7–8).

Structural operators are reduced to the basic blocks: concatenation is a shift followed by disjunction, and extraction is a shift, conjunction with a mask, and negation where needed (section 3.2, p. 8). Before resolution, expressions are normalized with terminating rewrite rules that distribute conjunction/disjunction through concatenation and extraction and push shifts inward. The paper states: “Proposition 3.3. The normalization rewrite rules form a terminating rewrite system.” (section 3.2, p. 8)

To apply the rule:

1. normalize every explanation literal to variables, shifts, and bitwise operators (section 3.2, p. 8)
2. choose two w-clauses sharing a literal whose bit positions overlap (section 3.2, pp. 7–8)
3. apply the shift-aware word-resolution rule only on the overlapping positions (section 3.2, p. 7)
4. normalize the resulting clause again (section 3.2, p. 8)
5. optionally combine the result with ordinary Boolean resolution over theory atoms (section 3.2, p. 8)

The resulting clause is implied by the original constraints: “Theorem 3.1 (Learning soundness). Any constraint obtained from the word-level resolution of w-clause (and Boolean resolution) is implied by the original problem and therefore constitutes a sound extension of it.” (section 3.2, p. 8)

Inference: in Verus, the corresponding proof would be a `proof fn` establishing implication between `spec fn` bit-vector clauses, with `assert` steps for each normalization rewrite and resolution premise. The executable solver would still need an external implementation of this inference; Verus can certify the rule but does not provide a word-level CDCL engine.

## technique: conflict analysis with masks and explanations

A conflict w-clause and conflict mask initialize one analysis reason at decision level `p`. Each culprit bit is classified as fixed before `p` or fixed at `p`; bits are equivalent when they share the same current-level explanation. Different equivalence classes become separate reasons, which limits each learned clause to bits that share an explanation. Definition 3.4 describes a reason as a w-clause, an analyzed mask, and a set of marked literals (section 3.3, p. 9).

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

Word-level grouping can produce a learned clause that does not propagate after backtracking when one variable appears at multiple shifts. The paper's two-bit example derives `c | v | d | (d >> 1)`, but after backtracking the clause becomes `?0 | d | (d >> 1)` and does not force a value. The paper explains: “This sort of problem arises because a decision is allowed to be made on many bits of the same variable, unlike in bit-blasting where decisions are made on Boolean variables.” (section 3.3, p. 12)

The proposed repair is to record, in the domain representation, that the affected variable may receive only partial decisions. A simple flag forces bit-by-bit decisions; a stronger option derives a decision mask from the conflict mask and permits grouped decisions only inside that mask. This makes the learned clause asserting after backtracking (section 3.3, p. 12).

Inference: a Verus implementation would need a ghost decision-mask invariant and a proof that every post-backtrack decision respects it. The executable Rust bit-vector value need not change, but the search-state API must carry the mask; this is a product-level inference, not a result measured by the paper.

## technique: learn from simplifications and mixed theories

Section 3.4 extends explanations beyond domain propagation. A shift equality can explain that a value is zero when the shift is positive; a disjunction can explain an equality when one operand is zero; and two xor equalities sharing two variables can explain equality of their third variables (section 3.4, pp. 13–14). These explanations are Boolean clauses whose atoms are bit-vector equalities, disequalities, or arithmetic predicates. Word-level resolution is then combined with ordinary Boolean resolution.

The paper's example decides `y = 0011`, propagates `x = 0`, `z = t`, `a = c`, then `a = 0`, and finally reaches a conflict between `a = v & m` and `a = v | n`. The mixed derivation learns `(m | n) ∨ ¬(y > 0)`, excluding positive `y` when `m = 1111` and `n = 0000` (section 3.4, pp. 13–14).

Inference: VL could use this pattern to connect bit-vector facts with integer or arithmetic facts in a proof search service. Verus would express the cross-theory facts as lemmas over mathematical integers and bit-vector specs, while the generated Rust proof would call those lemmas only in ghost code.

## evidence, limits, trust, and VL implications

The paper proves explanation soundness, word-resolution soundness, normalization termination, and learning soundness by reduction to Boolean encodings and rule composition (sections 3.1–3.2, pp. 6–8). It measures no solver runtime, solved-instance count, memory use, or proof benchmark. There is therefore no experimental denominator or percentage to report. The examples demonstrate derivations, not performance.

Trusted elements include the correctness of the bit-vector semantics, the bit-blasting equivalences used in the soundness arguments, the implementation of propagation and mask bookkeeping, the resolution engine, and any host arithmetic used to manipulate masks. The method assumes that every propagation has a sound explanation, that conflict masks identify exactly the conflicting positions, and that normalization and shift overlap rules are implemented correctly. Clause deletion, variable ordering, explanation recording, and practical heuristics are explicitly left open (section 1, p. 2).

Inference: threat to a product that writes agent-authored verified Rust is indirect but material. A word-level backend could reduce proof-query cost for bit-precise contracts, yet adopting this paper would add a new trusted solver component and new explanation interfaces. It does not automate writing Verus contracts, loop invariants, or ownership proofs. Existing VL work should reuse the paper's mask-aware explanation records, sound rule checking, mixed-theory learning, and explicit treatment of non-asserting clauses; it should not claim solver speedups until an implementation is benchmarked.

## techniques for the catalog

- word-level propagation explanations — record a sound w-clause, decision level, and impact mask for every bit-vector propagation
- word-level resolution — combine overlapping per-bit resolutions into shift-aware bit-vector inference rules
- masked conflict analysis — split reasons by explanation-equivalent culprit bits and resolve only covered masks
- asserting-clause repair — constrain grouped decisions with partial decision masks when shifts relate bits of one variable
- simplification and mixed-theory learning — turn algebraic simplifications into explanations and combine word-level with Boolean resolution
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
