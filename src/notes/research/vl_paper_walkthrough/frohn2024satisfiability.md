# Satisfiability Modulo Exponential Integer Arithmetic
(authored by agents unless marked 🧑)
Tag: `frohn2024satisfiability`, [paper](http://arxiv.org/abs/2402.01501v4)

## scope

The supplied paper is arXiv:2402.01501v4, dated 28 August 2025; it extends the IJCAR 2024 paper cited as [24]. Frohn and Giesl add integer exponentiation to non-linear integer arithmetic as the EIA SMT theory and implement SwInE-Z3. The motivating gap is verification formulas containing powers that polynomial integer arithmetic cannot express precisely. EIA interprets `exp(c,d)` as `c^|d|`; this total interpretation is chosen because SMT functions are total. The paper's abstract states: “We introduce EIA, an SMT theory for integer arithmetic with exponentiation, as well as a technique to analyze satisfiability of EIA problems.”

Inference: For a Verus proof that needs powers, this design suggests either proving arithmetic lemmas or translating the obligation to EIA. Such a translation would need to preserve the intended power semantics, especially for negative exponents.

## technique 1: CEGAR over an NIA solver

What it is. Treat `exp` as uninterpreted while asking an existing non-linear integer arithmetic (NIA) solver for a model. If that model violates EIA's exponentiation semantics, call it a counterexample and conjoin valid lemmas that exclude it. Algorithm 1 preprocesses by constant folding and rewriting, then repeats model/refinement until no NIA model remains or a model is EIA-consistent (Algorithm 1, §4, pp. 5–6).

How to apply it.
1. Encode the verification obligation as a quantifier-free EIA formula.
2. Fold closed exponentials using `c^|d|` and repeatedly apply the sound rewrites `exp(x,c)→x^|c|`, `exp(exp(x,y),z)→exp(x,y·z)`, and `exp(x,y)·exp(z,y)→exp(x·z,y)` when their stated syntactic conditions hold (§4.1, pp. 6–7).
3. Ask an NIA solver for a model with `exp` uninterpreted.
4. Check every exponential subterm in the current formula against its base raised to the absolute value of its exponent in the model; if all agree, return `sat`. If the NIA query is unsatisfiable, return `unsat`.
5. Otherwise generate violated lemmas and conjoin them, then repeat.

The paper gives the exact abstraction rationale: “So the abstraction consists of using NIA- instead of EIA-models.” Its soundness depends on every generated lemma being EIA-valid (Theorem 26, §4.3, p. 18).

Inference: In Verus, the analogous pattern is to expose a `spec fn pow_abs` and prove executable contracts with arithmetic lemmas. A custom EIA solver could discharge opaque nonlinear goals, but the solver and translation become trusted assumptions unless independently checked.

## technique 2: model-guided lemma families

The refinement considers all relevant exponential terms, including sign variants `exp(±s,±t)`. It generates six families (symmetry, monotonicity, bounding, prime, induction, interpolation) and retains only lemmas violated by the current model (§4.2, pp. 7–16).

Symmetry handles signs: even exponents identify `exp(s,t)` with `exp(-s,t)`, odd exponents introduce a sign, and exponent negation preserves value. Monotonicity excludes models that violate strict growth for bases above one and positive exponents. Bounding supplies exact values at exponents 0 and 1, zero/one bases, and coarse lower bounds. Prime lemmas express that the base and its power have the same prime factors when the exponent is nonzero: “So prime lemmas express that exp(𝑠, 𝑡) and 𝑠 have the same prime factors for 𝑡 ≠ 0.” (§4.2.4, p. 10). Generation chooses the smallest differing prime factor of the model values, using wheel factorization (§4.2.4, p. 11). Induction lemmas relate equal bases whose nonnegative exponents differ by a positive integer constant, rather than only consecutive exponents (§4.2.5, pp. 11–12). For upper interpolation bounds, the implementation uses the current point and the closest previously stored interpolation point; its first interpolation uses the current point twice (§4.2.6, p. 15). Lower interpolation bounds use adjacent integer coordinates (§4.2.6, pp. 15–16).

A complete application sequence is:
1. Compute relevant terms from the formula, including sign variants (Definition 6, p. 7).
2. Evaluate each candidate lemma in the NIA model.
3. In Algorithm 2, compute symmetry lemmas first. If none is violated, try monotonicity, then bounding. Stop at the first family with violations and conjoin all its violated lemmas.
4. If those three families have no violations, compute prime, induction, and interpolation lemmas together and conjoin their violated lemmas. Repeat the NIA query.

In the leading example, the implementation generates 12 symmetry, 4 monotonicity, and 17 bounding lemmas total. Eight displayed lemmas suffice for the positive-base case; the overall proof uses 5 more symmetry, 2 more monotonicity, and 4 more bounding lemmas from the generated set. Those are not additional generated batches: “The remaining lemmas that are deduced by our implementation are not used in the final proof of unsatisfiability.” (§4.3, Example 24, p. 17).

The paper's interpolation example explicitly constructs a bilinear polynomial from values at `(3,9)`, `(4,9)`, `(3,10)`, and `(4,10)`; the resulting lemma is violated by the candidate model (Example 23, p. 16). The abstract emphasizes: “Here, the key challenge is to compute suitable lemmas that eliminate the current model from the search space if it violates the semantics of exponentiation.”

Inference: In Verus, these are `proof fn` lemmas over mathematical integer functions, with `requires` expressing sign/divisibility conditions and `ensures` stating the equality or bound. The induction family maps naturally to a recursive proof over the exponent, while interpolation is a generated arithmetic certificate. These are inferences because the paper targets SMT, not Verus.

## technique 3: lazy generation and phasing

Across refinement iterations, there can be infinitely many model-dependent lemmas, although each iteration computes a finite set. Algorithm 2 imposes precedence: symmetry, monotonicity, and bounding first; prime, induction, and interpolation only when no earlier violated lemma exists (§4.3, pp. 16–17). The paper says: “In practice, it is not necessary to compute the entire set of lemmas L.” This reduces order sensitivity while avoiding needless model-dependent generation.

Phasing addresses a different failure: the NIA solver may choose huge exponents, causing interpolation coefficients to explode. Algorithm 3 starts in the sat phase with `b=1` and constrains each relevant exponent `t` by `-2^b ≤ t ≤ 2^b`. A counterexample in this phase is refined without changing `b`. If no bounded NIA model exists, it switches to an unsat phase without the exponent bounds. If that unbounded query is unsatisfiable, it returns `unsat`; if its model satisfies EIA semantics, it returns `sat`. Otherwise it discards that counterexample, increments `b`, and resumes the sat phase (§5, pp. 19–20). The paper states: “In the unsat-phase, our goal is prove unsatisfiability, so we do not impose any bounds on the exponents in Line 9.” (§5, p. 19). Algorithm 3 also changes the lemma order: symmetry, monotonicity, bounding, then prime each get a separate precedence level; induction and interpolation are tried together last (p. 20).

Inference: An automation layer seeking witnesses could similarly bound exponents and widen those bounds after a failed bounded search. An unsatisfiable bounded query alone would not establish the original obligation’s unsatisfiability.

## evidence, limits, and trusted boundary

Theorem 26 proves that Algorithm 2's `sat` and `unsat` answers are sound; Theorem 27 proves every counterexample is eliminated by some generated lemma (§4.3, pp. 18–19). The theory remains undecidable and the algorithm incomplete: the example `x ≥ y ≥ 0 ∧ exp(2,x) ≠ exp(2,x-y)·exp(2,y)` makes Algorithm 2 refine forever. The unrestricted rewrite that combines exponents by addition is unsound for negative exponents, and induction lemmas cannot handle the variable difference between these exponents (§4.3, p. 19 and footnote 11). Without interpolation, the implementation may return `unknown` (footnote 10, p. 18).

Evaluation uses 4,627 LoAT problems: 669 CHC 2022, 158 CHC 2023, 3,146 complexity, and 654 termination instances (§7.1, p. 22). Runs used CLAIX-2023 HPC, 10,560 MiB memory, and a 10-second timeout per example (§7.2, p. 23). On complexity problems, default SwInE-Z3 leaves 2 of 3,146 unsolved versus 58 for SwInE-Legacy; the denominator is the 3,146 complexity set, not all 4,627 problems (Fig. 5, p. 24). On CHC 2022, default solves 296 sat + 373 unsat = 669/669; disabling bounding leaves 111 sat, 373 unsat, 185 unknown, totaling 669 (Fig. 1, p. 24). The 37 PURRS benchmarks are unsatisfiable provided the expected solutions in PURRS’s test suite are correct. With a 300-second wall-clock timeout, default SwInE-Z3 solves 34, quantified-axiom Z3 solves 28, and SwInE-Z3 without induction lemmas solves 3 (Table 1, p. 26; §7.3, pp. 23, 25). The authors state: “With induction lemmas, SwInE-Z3 solves all instances that Z3 can solve as well as 6 additional instances, and it only fails for 3 instances.” (§7.3, p. 25).

## techniques for the catalog

- EIA semantics — model integer exponentiation as `base^|exponent|` so SMT functions remain total

- CEGAR abstraction — solve with uninterpreted exponentiation, detect a counterexample model, and refine with valid lemmas

- sign and arithmetic lemma families — eliminate models with symmetry, monotonicity, bounds, divisibility, induction, and interpolation

- lazy lemma precedence — generate finite families first and model-dependent families only when needed

- phasing — alternate bounded sat search with unbounded unsat search to control interpolation growth
