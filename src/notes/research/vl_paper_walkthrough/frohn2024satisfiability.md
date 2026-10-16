# Satisfiability Modulo Exponential Integer Arithmetic
(authored by agents unless marked 🧑)
Tag: `frohn2024satisfiability`, [paper](http://arxiv.org/abs/2402.01501v4)

## scope

Frohn and Giesl add integer exponentiation to non-linear integer arithmetic as the EIA SMT theory and implement SwInE-Z3. The motivating gap is verification formulas containing powers that polynomial integer arithmetic cannot express precisely. EIA interprets `exp(c,d)` as `c^|d|`; this total interpretation is chosen because SMT functions are total. The paper's abstract states: “We introduce EIA, an SMT theory for integer arithmetic with exponentiation, as well as a technique to analyze satisfiability of EIA problems.”

Inference: A Verus proof that needs powers can use this design as a solver-side inspiration, but Verus currently exposes Z3 through its own specification language; integrating EIA would require a trusted solver bridge or lemmas, not a Rust syntax change.

## technique 1: CEGAR over an NIA solver

What it is. Treat `exp` as uninterpreted while asking an existing non-linear integer arithmetic (NIA) solver for a model. If that model violates EIA's exponentiation semantics, call it a counterexample and conjoin valid lemmas that exclude it. Algorithm 1 preprocesses by constant folding and rewriting, then repeats model/refinement until no NIA model remains or a model is EIA-consistent (Algorithm 1, §4, pp. 5–6).

How to apply it.
1. Encode the verification obligation as a quantifier-free EIA formula.
2. Fold closed exponentials using `c^|d|` and repeatedly apply the sound rewrites `exp(x,c)→x^|c|`, `exp(exp(x,y),z)→exp(x,y·z)`, and `exp(x,y)·exp(z,y)→exp(x·z,y)` when their stated syntactic conditions hold (§4.1, pp. 6–7).
3. Ask an NIA solver for a model with `exp` uninterpreted.
4. Check every relevant `exp(s,t)` against `s^|t|`; if all agree, return `sat`.
5. Otherwise generate violated lemmas and conjoin them, then repeat.

The paper gives the exact abstraction rationale: “The abstraction consists of using NIA- instead of EIA-models.” Its soundness depends on every generated lemma being EIA-valid (Theorem 26, §4.3, p. 18).

Inference: In Verus, the analogous pattern is to expose a `spec fn pow_abs` and prove executable contracts with arithmetic lemmas. A custom EIA solver could discharge opaque nonlinear goals, but the solver and translation become trusted assumptions unless independently checked.

## technique 2: model-guided lemma families

The refinement considers all relevant exponential terms, including sign variants `exp(±s,±t)`. It generates six families (symmetry, monotonicity, bounding, prime, induction, interpolation) and retains only lemmas violated by the current model (§4.2, pp. 7–16).

Symmetry handles signs: even exponents identify `exp(s,t)` with `exp(-s,t)`, odd exponents introduce a sign, and exponent negation preserves value. Monotonicity excludes models that violate strict growth for bases above one and positive exponents. Bounding supplies exact values at exponents 0 and 1, zero/one bases, and coarse lower bounds. Prime lemmas use divisibility and prime factorizations; induction lemmas relate consecutive exponent values; interpolation lemmas construct bilinear lower or upper bounds from neighboring integer points (§4.2.1–§4.2.6, pp. 7–16).

A complete application sequence is:
1. Compute relevant terms from the formula, including sign variants (Definition 6, p. 7).
2. Evaluate each candidate lemma in the NIA model.
3. Add every violated finite-family lemma; generate model-dependent prime, induction, and interpolation lemmas only as needed.
4. Repeat the NIA query with the strengthened formula.
5. For a proof example, retain the chain of violated-model exclusions as the certificate. The leading example eventually uses 12 symmetry, 4 monotonicity, and 17 bounding lemmas, then additional 5 symmetry, 2 monotonicity, and 4 bounding lemmas (§4.3, p. 17).

The paper's interpolation example explicitly constructs a bilinear polynomial from values at `(3,9)`, `(4,9)`, `(3,10)`, and `(4,10)`; the resulting lemma is violated by the candidate model (Example 23, p. 16). The abstract emphasizes: “the key challenge is to compute suitable lemmas that eliminate the current model from the search space if it violates the semantics of exponentiation.”

Inference: In Verus, these are `proof fn` lemmas over mathematical integer functions, with `requires` expressing sign/divisibility conditions and `ensures` stating the equality or bound. The induction family maps naturally to a recursive proof over the exponent, while interpolation is a generated arithmetic certificate. These are inferences because the paper targets SMT, not Verus.

## technique 3: lazy generation and phasing

Naively generating all lemmas can be infinite. Algorithm 2 imposes precedence: symmetry, monotonicity, and bounding first; prime, induction, and interpolation only when no earlier violated lemma exists (§4.3, pp. 16–17). The paper says: “In practice, it is not necessary to compute the entire set of lemmas L.” This reduces order sensitivity while avoiding needless model-dependent generation.

Phasing addresses a different failure: the NIA solver may choose huge exponents, causing interpolation coefficients to explode. Algorithm 3 alternates a bounded sat phase and an unbounded unsat phase. In sat phases, relevant exponents are bounded by `2^b`; if no bounded model is found, switch to unsat; after a counterexample, increase `b` and retry (§5, pp. 19–20). The authors report that the bound grows exponentially with phase changes, so small solutions are tried first without excluding eventual large solutions.

Inference: A Verus automation layer could similarly cap nonlinear search terms, then widen bounds after proving that no small witness exists. This policy would be an engineering heuristic, not a completeness guarantee.

## evidence, limits, and trusted boundary

Theorem 26 proves that Algorithm 2's `sat` and `unsat` answers are sound; Theorem 27 proves every counterexample is eliminated by some generated lemma (§4.3, pp. 18–19). The theory remains undecidable and the algorithm incomplete: the authors give a formula on which refinement does not terminate because a needed rewrite would be unsound under absolute-value exponent semantics (p. 19). Without interpolation, the implementation may return `unknown` (footnote 10, p. 18).

Evaluation uses 4,627 LoAT problems: 669 CHC 2022, 158 CHC 2023, 3,146 complexity, and 654 termination instances (§7.1, p. 22). Runs used CLAIX-2023 HPC, 10,560 MiB memory, and a 10-second timeout per example (§7.2, p. 23). On complexity problems, default SwInE-Z3 leaves 2 of 3,146 unsolved versus 58 for SwInE-Legacy; the denominator is the 3,146 complexity set, not all 4,627 problems (Fig. 5, p. 24). On CHC 2022, default solves 296 sat + 373 unsat = 669/669; disabling bounding leaves 111 sat, 373 unsat, 185 unknown, totaling 669 (Fig. 1, p. 24). On the 37 PURRS unsatisfiable benchmarks, SwInE-Z3 solves all instances Z3 solves plus six and fails on three, while the paper says results depend on the configuration and benchmark (Table 1, pp. 25–26).

What remains trusted is the EIA semantics, validity of lemma schemas, NIA solver behavior, and translation into SMT-LIB. Inference: for VL, the product threat is a false confidence from a solver `sat` result when the generated model or bridge does not reflect Rust semantics; the paper supplies no Rust memory or compiler validation. Existing work already uses incremental linearization for other arithmetic theories; this paper's novel contribution is integer exponentiation with sign-aware lemmas and phasing, so VL should reuse the pattern rather than repeat a generic CEGAR survey.

## techniques for the catalog

- EIA semantics — model integer exponentiation as `base^|exponent|` so SMT functions remain total
- 
- CEGAR abstraction — solve with uninterpreted exponentiation, detect a counterexample model, and refine with valid lemmas
- 
- sign and arithmetic lemma families — eliminate models with symmetry, monotonicity, bounds, divisibility, induction, and interpolation
- 
- lazy lemma precedence — generate finite families first and model-dependent families only when needed
- 
- phasing — alternate bounded sat search with unbounded unsat search to control interpolation growth
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
