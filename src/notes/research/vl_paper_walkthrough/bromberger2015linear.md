# Linear Integer Arithmetic Revisited
(authored by agents unless marked 🧑)
Tag: `bromberger2015linear`: [paper](http://arxiv.org/abs/1503.02948v3)

## scope and result
The paper studies feasibility of linear integer constraints for SMT and theorem-proving combinations. Its goal is to extend the CUTSAT algorithm of Jovanović and de Moura so that it terminates. The abstract states: “Although satisfiability of linear integer programs is decidable, many state-of-the-art solvers neglect termination in favor of efficiency.” (Abstract, p. 1). CUTSAT is sound but can diverge; the paper extends it with refined inference rules, a new conflicting-core kind, and a rule application strategy, producing CUTSAT++: “This leads to our algorithm CUTSAT++, which guarantees termination.” (Abstract, p. 1) Section 2 (pp. 10–12) gives four examples: Examples 1–3 are CUTSAT runs that diverge, and Example 4 is a frozen state reached after the obvious fixes. The paper presents no implementation; the conclusion says “we plan to develop a prototypical implementation of CUTSAT++, to test its efficiency on benchmark problems.” (Section 6, p. 33)

## technique 1: weak cooper elimination
what it is
Weak Cooper elimination removes an unguarded integer variable lazily. Instead of Cooper's disjunction over all candidate values, it introduces guarded variables for pairs of lower and upper inequalities, plus a divisibility gcd constraint. The paper's motivation is explicit: “The idea is, instead of building a disjunction over all potential solutions for x, to add additional guarded variables and constraints without x that guarantee the existence of a solution for x.” (Section 3, p. 12)

when to use it
Inference: use it when a problem has an unguarded integer x and one divisibility constraint `d | c x + s` in x; the paper states "We assume here that C(x) contains only one divisibility constraint for x." (Section 3, p. 12), so combine multiple divisibility constraints in x first (technique 2). It is useful when a conjunctive result is preferable to Cooper's disjunction. The paper notes the result still has existential guarded variables K ("there is still an existential quantifier ∃K but all variables k ∈ K are guarded by their respective Rk", p. 13).

how to do it
1. Partition constraints into lower bounds `-a x + p ≤ 0` (a > 0), upper bounds `b x − q ≤ 0` (b > 0), one divisibility `d | c x + s`, and constraints with coefficient 0 for x (Section 3, p. 13 and the proof of Theorem 5, p. 15).
2. For every pair of a lower and an upper bound introduce a fresh k and add `R_k = {−k ≤ 0, k − m ≤ 0, b p − a q + b k ≤ 0, a | k + p, a d | c p + a s + c k}`, where `m := lcm(a, ad / gcd(ad, c)) − 1` (Section 3, p. 13).
3. Add `gcd(c,d) | s` and retain the constraints without x (Section 3, p. 13). The gcd condition is essential when x has no inequality bounds; the paper's counterexample is `C(x) = {y − 1 ≤ 0, −y + 1 ≤ 0, 6 | 2x+y}`: without it the result `{y − 1 ≤ 0, −y + 1 ≤ 0}` is satisfied by `ν(y) = 1`, but `C(x)` is not, "since 2x + 1 is never divisible by 2 or 6" (Section 3, pp. 13–14).
4. Recover x from a satisfying assignment ν: when both bounds exist, extend ν with `ν(x) = ν(k+p)/a`; `a | k+p` makes it an integer, `b p − a q + b k ≤ 0` puts it between the bounds, and `a d | c p + a s + c k` gives the original divisibility `d | c x + s` (Section 3, p. 13).
5. If there is no lower (upper) bound, pick an arbitrarily small (large) x that satisfies `d | c x + s`; this is possible because, by Lemma 4 (p. 14), the solution set of a divisibility constraint is empty or `{v0 + e v' : e ∈ Z}`, and nonempty here because `gcd(c,d) | s` holds (Lemma 3, p. 14; Theorem 5 proof, p. 16).

verus form
Inference: In Verus, represent each integer constraint as a `spec fn` over `int`, and state the transformed equivalence as `ensures` on a proof function. Use `requires` for the original conjunction and `ensures` for existence of a fresh `k` satisfying the resolvent; use `forall`/`exists` in specification expressions, not executable Rust. A Verus proof would establish each algebraic implication with `assert`, lemma proof functions, and arithmetic triggers. I do not know of a built-in Cooper-elimination command in Verus (not checked), so the transformation would be ghost proof infrastructure; executable code can remain unchanged.

evidence and limits
The paper states the equivalence as Theorem 5 (pp. 15–16) and proves it using Lemmas 2–4 (p. 14). Lemma 2's proof is only a citation: "See [15] pp. 101-102 Lemma 4." Lemma 3 and Lemma 4 are proved in the paper. The paper gives no implementation benchmark for weak elimination. It assumes integer coefficients, a finite conjunction, and one divisibility constraint in x after combination. Inference: SMT performance can still face exponential coefficient growth; the technique preserves equivalence rather than promising polynomial runtime. The paper says of iterated Cooper elimination that it "causes an exponential increase in the coefficients due to the multiplication with a because division is not part of the language." (Section 3, p. 12), and it does not claim weak elimination removes this; its conclusion lists "constraint reduction techniques from (weak) Cooper elimination" as future work (p. 33).

## technique 2: divisibility combination (CombDivs)
what it is and when
`CombDivs(x,C')` combines all divisibility constraints containing x (with positive coefficient) until one remains, while adding x-free constraints. The paper gives it as Algorithm 1 (Fig. 2, p. 17) and states that its output is equivalent to the input (Lemma 6, p. 16).

steps
1. Collect `Cd := {d | cx + s ∈ C'(x) : c > 0}` and remove them from C(x) (Algorithm 1, lines 1–2). If Cd is empty, return `C(x) ∪ {1 | x}` (lines 3–4).
2. While `|Cd| > 1`, select `d1 | a1x+p1` and `d2 | a2x+p2` and remove them from Cd; compute `d = gcd(a1d2, a2d1)` and choose `c1, c2` with `c1a1d2 + c2a2d1 = d` (lines 5–9).
3. Add `d1d2 | d x + c1d2p1 + c2d1p2` to Cd and `d | −a1p2 + a2p1` to C(x) (lines 10–11).
4. Return `C(x) ∪ Cd` (line 13).

verus form
Inference: Encode the Bezout identity as a lemma with integer `gcd` assumptions and prove preservation in both directions. A Rust proof function can call the lemma; no `proof fn` is called at runtime. Use `ensures` on the proof function, while the executable solver manipulates an AST.

evidence and limits
Lemma 6's proof is one line: "Follows directly from the proof of equivalence [15] of the div-solve transformation." (p. 16). No measured success rate is reported. Inference: the method assumes exact integer arithmetic and may enlarge coefficients (the new modulus is `d1d2`).

## technique 3: lazy CUTSAT++ conflict resolution
what it is
CUTSAT++ simulates weak Cooper elimination lazily inside the CUTSAT search. It adds `Resolve-Cooper`, `Solve-Div-Left`, and `Solve-Div-Right` to the earlier CUTSAT rules. The paper explains: “The eventual result is the complete algorithm CUTSAT++, which is a combination of the rules Resolve-Cooper, Solve-Div-Left, Solve-Div-Right (Fig. 3), a strictly-two-layered strategy (Def. 13), and the CUTSAT rules” (Section 4, p. 17)

steps
1. Fix a total order ≺ with y ≺ x for all guarded y and unguarded x; the order among unguarded variables is fixed, the order among guarded ones may change dynamically. The top variable of a constraint is its maximal variable (Section 4, p. 18).
2. Detect a conflicting core (x, C'), where x is top in C' and all other variables in C' are fixed (Definition 7, p. 18). There are three kinds: interval (two contradicting bounds; strong resolvent `({−k ≤ 0, k − a + 1 ≤ 0}, {bp − aq + bk ≤ 0, a | k + p})`), divisibility (two bounds plus `d | cx + s` with no solution in between; strong resolvent `({−k ≤ 0, k − m ≤ 0}, {bp − aq + bk ≤ 0, a | k + p, ad | cp + as + ck})`), and diophantine (a lone `d | cx + s` with no solution; strong resolvent `(∅, {gcd(c, d) | s})`).
3. Apply `Solve-Div-Left/Right` when two divisibility constraints I1, I2 have the unguarded x as top variable and all other variables in them are fixed; replace them by the `div-solve` output (Fig. 3, p. 21). Left applies if the new I2' is not a conflict; Right applies if it is, and then backjumps to `prefix(M, y)` with `y = top(I2')`.
4. Apply `Resolve-Cooper` when `(x, C')` is a conflicting core, x is unguarded, all `z ≺ x` are fixed, and every conflict J in C has `top(J) ⊀ x`; add `Rk ∪ Rc` and backjump to `prefix(M, y)` with `y = min_{I∈Rc} top(I)`, where `prefix(M, y)` is "the largest prefix of M that contains only decided bounds for variables x with x ≺ y" (Fig. 3, p. 21).
5. Follow a strictly-two-layered strategy (Definition 13, p. 21): (1) it is reasonable (Definition 12, p. 20), (2) it is eager top-level propagating (Definition 11, p. 20), (3) Forget, Conflict and Conflict-Div apply only to guarded constraints, (4) Forget is never applied to a divisibility constraint or a constraint in a strong resolvent, and (5) only guarded constraints propagate guarded variables. Unguarded conflicts are then handled by the new rules, guarded conflicts by Conflict(-Div).

verus form
Inference: Model each state transition as a ghost datatype and prove a preservation lemma: every added strong resolvent implies the eliminated core, and every transition preserves satisfiability. Use `invariant` as a loop invariant declaration in a `while` proof, and `ensures` on transition lemmas. Verus integer arithmetic can discharge linear side conditions; divisibility and gcd facts require explicit lemmas. Do not expose ghost state in executable Rust. None of this is in the paper.

evidence and limits
The paper proves termination (Theorem 19, p. 27), that no frozen state is reachable (Theorem 23, pp. 31–32), and completeness (Theorem 24, p. 32); soundness of the new rules follows from Lemmas 2 and 3 and the equivalence of div-solve, and "The soundness proofs for all other rules are either trivial or given in [15]." (Section 5.3, p. 32). Termination rests on Lemma 10 and Lemma 14 (pp. 19, 22), which together imply that "Resolve-Cooper is applied at most once to every conflicting core encountered by CUTSAT++", a lexicographically decreasing weight vector (Lemma 16, pp. 23–25), and the strictly-two-layered strategy (Definition 13). The proof of termination for the purely guarded case is taken from [15] (Section 5.1, p. 25). The paper reports no runtime table or benchmark denominator. Inference: a Verus adoption would need a trusted arithmetic lemma library and a verified parser/AST; SMT automation alone would not establish the algorithm's meta-theorems.

## what is proved, measured, and trusted
The proved claims are equivalence of weak elimination (Theorem 5), soundness of the new rules, no frozen states, termination, and completeness. No empirical measurements are given anywhere in the paper; the implementation is listed as future work (Section 6, p. 33). Trust includes the underlying integer arithmetic semantics and the prior CUTSAT results cited from [15] (Lemma 2's proof, the soundness of the old rules, the guarded-case termination proof, the equivalence of div-solve). Inference: for VL, the threat is medium: the mathematics supplies reusable proof patterns for integer constraints, but implementation correctness and solver integration remain substantial trusted surface.

## what VL should reuse
Inference: VL should reuse the explicit distinction between guarded and unguarded variables, gcd divisibility lemmas, and strong-resolvent proof structure. VL should not redo an unverified ad-hoc branch-and-bound solver when a verified transformation can expose the same obligations. The paper does not address Rust ownership, borrow checking, or Verus syntax.

## techniques for the catalog
- weak Cooper elimination: replace an unguarded integer variable by guarded resolvents and a gcd divisibility condition
- CombDivs: combine multiple divisibility constraints with gcd and Bezout coefficients while preserving equivalence
- CUTSAT++ strong conflict resolution: lazily add Cooper resolvents under a two-layer variable-order strategy to obtain soundness, completeness, and termination

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The advantage of the lazy approach is that CUTSAT++ might find a satisfiable assignment or detect unsatisfiability without encountering and resolving a large number of unguarded conflicts."): read the whole paper text (pp. 1–34) and checked every quotation, formula (including Rk and m), algorithm line, rule condition, lemma and theorem number, and section/page reference against it; changed the page of the weak-elimination quote (12, not 13), the formula for m (it is lcm(a, ad/gcd(ad,c)) − 1), Lemma 2 (proof is only cited from [15]), the Fig. 3 page (21), the termination argument (Lemmas 10, 14, 16, not "finitely often per core"), the proof page ranges (Section 5, pp. 22–32), the scope sentence (no efficiency claim; no implementation), and added the CombDivs empty case, Definition 7 resolvents, Definition 13 conditions; did not check the Verus-related inference paragraphs against Verus, the cited prior work [15], or the correctness of the proofs themselves.
