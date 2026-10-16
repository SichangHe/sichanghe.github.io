# Linear Integer Arithmetic Revisited
(authored by agents unless marked 🧑)
Tag: `bromberger2015linear`: [paper](http://arxiv.org/abs/1503.02948v3)

## scope and result
The paper studies feasibility of linear integer constraints for SMT and theorem-proving combinations. Its goal is a terminating, complete and practically useful replacement for CUTSAT. The abstract states: “Although satisfiability of linear integer programs is decidable, many state-of-the-art solvers neglect termination in favor of efficiency.” (Abstract, p. 1). CUTSAT is sound but can diverge; the paper extends it with refined inference rules, a new conflicting-core kind, and a strategy, producing CUTSAT++ with termination guarantees: “This leads to our algorithm CUTSAT++, which guarantees termination.” (Abstract, p. 1)

## technique 1: weak cooper elimination
what it is
Weak Cooper elimination removes an unguarded integer variable lazily. Instead of Cooper's disjunction over all candidate values, it introduces guarded variables for pairs of lower and upper inequalities, plus a divisibility gcd constraint. The paper's motivation is explicit: “The idea is, instead of building a disjunction over all potential solutions for x, to add additional guarded variables and constraints without x that guarantee the existence of a solution for x.” (Section 3, p. 13)

when to use it
Inference: use it when a problem has an unguarded integer x and one divisibility constraint `d | c x + s`; first combine multiple divisibility constraints in x. It is useful when a conjunctive result is preferable to Cooper's exponentially growing disjunction. The result still has existential guarded variables K.

how to do it
1. Partition constraints into lower bounds `-a x + p ≤ 0`, upper bounds `b x − q ≤ 0`, one divisibility `d | c x + s`, and constraints not mentioning x (Section 3, pp. 12–15).
2. For every lower/upper pair introduce fresh k and add `R_k = {−k ≤ 0, k − m ≤ 0, b p − a q + b k ≤ 0, a | k + p, a d | c p + a s + c k}`; `m := lcm(a, gcd(ad,c)) − 1` (Section 3, p. 13).
3. Add `gcd(c,d) | s` and retain x-free constraints (Section 3, pp. 13–14). This gcd condition is essential when x has no inequality bounds; the paper's counterexample uses `6 | 2x+y` with `y=1` (Section 3, p. 13).
4. Recover x from a satisfying assignment ν: when both bounds exist choose `x = ν(p+k)/a`; divisibility `a | k+p`, interval constraint, and `ad | cp+as+ck` establish integrality, bounds, and the original divisibility (Section 3, p. 13).
5. If there is no lower (upper) bound, use the divisibility solution's unbounded arithmetic progression to choose an arbitrarily small (large) x (Lemma 4, p. 14).

verus form
Inference: In Verus, represent each integer constraint as a `spec fn` over `int`, and state the transformed equivalence as `ensures` on a proof function. Use `requires` for the original conjunction and `ensures` for existence of a fresh `k` satisfying the resolvent; use `forall`/`exists` in specification expressions, not executable Rust. A Verus proof would establish each algebraic implication with `assert`, `lemma` proof functions, and arithmetic triggers. Verus has no direct Cooper-elimination command, so the transformation is ghost proof infrastructure; executable code can remain unchanged.

evidence and limits
The paper proves equivalence in Theorem 5 and Lemmas 2–4 (pp. 13–16), but gives no implementation benchmark for weak elimination itself. It assumes integer coefficients, a finite conjunction, and one positive-coefficient divisibility constraint after combination. Inference: SMT performance can still face exponential coefficient growth; the technique preserves completeness rather than promising polynomial runtime.

## technique 2: divisibility combination (CombDivs)
what it is and when
`CombDivs(x,C')` combines all divisibility constraints containing x until one remains, while adding x-free constraints. The paper gives Algorithm 1 and says its output is equivalent to the input (Lemma 6, pp. 16–17).

steps
1. Collect `d | c x+s` with `c>0`; remove them from C (Algorithm 1, lines 1–2).
2. While at least two remain, select `d1 | a1x+p1` and `d2 | a2x+p2`; compute `d=gcd(a1d2,a2d1)` and Bezout coefficients `c1,c2` with `c1a1d2+c2a2d1=d` (lines 5–9).
3. Replace them by `d1d2 | d x + c1d2p1+c2d1p2`; add `d | −a1p2+a2p1` (lines 10–11).
4. Return the remaining divisibility plus all added constraints (line 13).

verus form
Inference: Encode the Bezout identity as a lemma with integer `gcd` assumptions and prove preservation in both directions. A Rust proof function can call the lemma; no `proof fn` is called at runtime. Use `ensures` on the proof function, while the executable solver manipulates an AST.

evidence and limits
Lemma 6 claims equivalence by the cited div-solve proof (p. 16). No measured success rate is reported. The method assumes exact integer arithmetic and may enlarge coefficients.

## technique 3: lazy CUTSAT++ conflict resolution
what it is
CUTSAT++ interleaves propagation, decisions and conflict analysis with weak-Cooper consequences. It adds `Resolve-Cooper`, `Solve-Div-Left`, and `Solve-Div-Right` to the earlier CUTSAT rules. The paper explains: “The eventual result is the complete algorithm CUTSAT++, which is a combination of the rules Resolve-Cooper, Solve-Div-Left, Solve-Div-Right ... and the CUTSAT rules” (Section 4, p. 17).

steps
1. Fix a total order with guarded variables below unguarded variables; the top variable of a constraint is its greatest variable (Section 4, pp. 17–18).
2. Detect interval, divisibility, or diophantine conflicting cores. For a sole divisibility core `d | cx+s`, add `gcd(c,d)|s`; for bounded cores, add the strong resolvent constraints (Definition 7, p. 18).
3. Apply `Solve-Div-Left/Right` only when x is top and all other variables in the two divisibility constraints are fixed; replace them by `div-solve` output (Fig. 3, p. 20).
4. Apply `Resolve-Cooper` only to an unguarded top variable with all smaller variables fixed and no lower-top conflict; backjump to the prefix before the minimum new top variable (Fig. 3, p. 20).
5. Use a strictly-two-layered strategy: unguarded conflicts use the new rules; guarded conflicts use ordinary Conflict/Conflict-Div; propagation and decisions follow eager top-level restrictions (Definition 13, p. 21).

verus form
Inference: Model each state transition as a ghost datatype and prove a preservation lemma: every added strong resolvent implies the eliminated core, and every transition preserves satisfiability. Use `invariant` as a loop invariant declaration in a `while` proof, and `ensures` on transition lemmas. Verus integer arithmetic can discharge linear side conditions; divisibility and gcd facts require explicit lemmas. Do not expose ghost state in executable Rust.

evidence and limits
The paper proves soundness, completeness and termination (Sections 4–5, pp. 17–27). Termination relies on each conflicting core receiving a strong resolvent only finitely often (Lemma 14) and on the strictly-two-layered strategy (Definition 13). The paper reports no runtime table or benchmark denominator. Inference: a Verus adoption would need a trusted arithmetic lemma library and a verified parser/AST; SMT automation alone would not establish the algorithm's meta-theorems.

## what is proved, measured, and trusted
The proved claims are equivalence of weak elimination, soundness of resolvents, completeness, and termination. No empirical measurements are given in the paper excerpt beyond theoretical claims. Trust includes the underlying integer arithmetic semantics and the prior CUTSAT rules cited from [15]. Inference: for VL, the threat is medium: the mathematics supplies reusable proof patterns for integer constraints, but implementation correctness and solver integration remain substantial trusted surface.

## what VL should reuse
Inference: VL should reuse the explicit distinction between guarded and unguarded variables, gcd divisibility lemmas, and strong-resolvent proof structure. VL should not redo an unverified ad-hoc branch-and-bound solver when a verified transformation can expose the same obligations. The paper does not address Rust ownership, borrow checking, or Verus syntax.

## techniques for the catalog
- weak Cooper elimination: replace an unguarded integer variable by guarded resolvents and a gcd divisibility condition
- CombDivs: combine multiple divisibility constraints with gcd and Bezout coefficients while preserving equivalence
- CUTSAT++ strong conflict resolution: lazily add Cooper resolvents under a two-layer variable-order strategy to obtain soundness, completeness, and termination

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
