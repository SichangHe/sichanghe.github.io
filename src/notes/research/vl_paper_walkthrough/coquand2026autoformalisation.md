# Auto formalisation of Chaitin and of the surprise incompleteness Theorem
(authored by agents unless marked 🧑)
Tag: `coquand2026autoformalisation`, [paper](https://arxiv.org/abs/2606.12462v1)

## scope and trust boundary

This paper reports an Agda formalization, generated with Claude, of Chaitin's first incompleteness proof and the Kritchman–Raz surprise-examination form of the second incompleteness theorem inside Guard's Basic Recursive Arithmetic (T). The formal artifact is a total Agda function transforming a proof of the open consistency formula `ConT` into a proof of contradiction. The paper states: “The resulting formalisation clarifies a number of details left implicit in the original presentation and provides a fully machine-checked proof of these arguments for Church’s Basic Recursive Arithmetic.” (abstract, PDF p. 1).

Section 9 reports: “The proof is checked in Agda, in the same T4 development as the Guard-route proof of [4], under the global options --safe --without-K --exact-split, with no postulates and no holes.” (PDF p. 8). Section 6 states: “The consistency hypothesis is consumed exactly once per step of the descent of §8, and is the only assumption: every other ingredient is constructed.” (PDF p. 4). Inference: the derivability result depends on Agda's checker, the T development, the encoding, and the formal statement. It does not establish consistency of T.

## technique: bounded code representation

Chaitin's argument needs an internal computation representation but cannot define an unrestricted evaluation function in primitive recursive arithmetic. The paper encodes a program as a natural number read in base 3, with digits from a three-symbol alphabet, then parses that string into an expression. Section 7.1 defines length as the number of base-3 digits and states that programs of length at most L* are exactly the interval `p < N`, where `N = 3^(L*+1)` (PDF p. 4). Coquand writes (section 7.1, PDF p. 4):

> This is the single simplification that makes the whole argument feasible: there is no separate enumeration to verify — “the set of short programs” is an interval of numbers, and quantification over it is bounded quantification over {p < N }.

The construction (1) represents programs as ternary strings, (2) parses them into expressions, and (3) uses the interval `p < N` for the bounded disjunction over short programs (sections 7.1–7.2, PDF pp. 4–5). The paper does not give parser round-trip or uniqueness lemmas. Inference: a Verus analogue would use executable Rust parsers plus `spec fn` representations for bounded syntax and `requires p < N`; `ensures` can state parser round trips and uniqueness. Verus cannot inherit Agda's object-level arithmetic library, so the parser, bounds, and arithmetic lemmas must be separately specified and proved (inference).

## technique: small-step interpreter with explicit fuel

The universal interpreter is a Landin CK-style machine. A configuration is a control expression and continuation stack; one `step` either decomposes control and pushes deferred work or pops a frame and plugs in a value. Iterating `step` for l steps runs a program. Halting means value control plus empty stack, and the output is read from that configuration (section 7.2, PDF p. 5). A bounded µ-search wraps the evaluator to enumerate theorem codes until a fitting proof is found. The paper defines `def p (l,u)` as “running p for l steps halts with output u + 1”; `+1` separates a halted value from the non-halted code 0.

Inference: in Verus, model machine state as a datatype or sequence, write an executable one-step transition, and specify a `run` loop with a decreasing fuel counter. Prove a loop invariant relating the sequence state to the mathematical evaluator and a postcondition that a halted state yields the claimed output. Use `decreases` for termination and `invariant` declarations in Verus syntax; do not treat a proof function as runtime code (inference).

## technique: Gandy–Howard majorant for internal termination

The difficult formal step is that the interpreter's run length must be an object term accepted by the internal verifier `th`, rather than a meta-level natural. A statement quantified over an external numeral cannot be fed into an internal derivation. The paper therefore constructs a closed combinator `fuel(f)` that majorizes the number of steps used by every run of function f, by primitive recursion mirroring f. The induction proves the stable property “the run completes at any fuel ≥ fuel(f)(x)”; a second `fuelµ` majorizes the bounded search. The paper reports: “The resolution adapts the classical majorisation method of Howard and Gandy [7, 5]: one defines, by primitive recursion mirroring the structure of f , a closed combinator fuel(f ) that provably majorises the actual number of steps any run of f consumes at every term input.” (section 7.3, PDF p. 5).

The described method (1) constructs `fuel(f)` by recursion mirroring f, (2) proves completion at every fuel at least `fuel(f)(x)`, (3) combines it with `fuelµ` through a fuel-composition lemma, and (4) puts `fuelµ(…) + fuel(…)` in the internal proof's fuel slot (section 7.3, PDF p. 5). The paper does not list the majorant's defining equations. It explains the failed naive induction: “Proving such a statement by induction on the combinator tree of f stalls at the primitive-recursion node, where one would need numerical control over the running time of the recursive calls — information not available at the derivation level.” (section 7.3, PDF p. 5).

Inference: in Verus, pair a `run` function with a ghost/specification fuel bound and prove that each recursive branch decreases a well-founded measure. A `decreases` clause can express termination, while a `proof fn` can establish that the chosen bound dominates all recursive calls. This is a design pattern for verified interpreters, not a direct translation of Agda combinators (inference).

## technique: explicit diagonal proof transformer

The short program `gL*` enumerates theorem codes until it finds a statement asserting `K(?) > L*`, then outputs the witness. The formalization builds it as an actual one-variable object combinator `G` by bracket abstraction. The internal Chaitin implication (C) has no consistency premise: if `th(w)` is the code of `K(out(w)) > L*`, then `th(G · w)` is the code of `0 = 1`, where `out(w)` reads the witness from w. The paper says: “The deduction lives entirely inside the object logic as an implication; the run of the interpreter on gL⋆ , with the Term-fuel of §7.3, is what closes the positive leg of (C).” (section 7.4, PDF p. 6).

Remark 7.1 says: “First, it carries no consistency premise: it isolates the pure diagonal mechanism as an object implication, and the single appeal to ConT is deferred to Step 6 of the descent.” (PDF p. 6). It contrasts (C)'s explicit verifier and free run-length variable with an abstract provability predicate and object quantifiers. Inference: Verus can express the transformer as an executable function with an `ensures` relation from an input proof-code representation to an output contradiction-code representation, with a `proof fn` establishing the relation. The code's soundness still depends on the modeled verifier and parser; Verus does not certify an external proof system automatically (inference).

## technique: six-step sorites descent

Instead of counting incompressible numbers, the paper defines an open stage statement S(r): no assignment of short programs can describe all days in `[r,N]` at one run length. The induction S(r) -> S(r+1) has six formal steps (section 8.2, PDF pp. 7–8):

1. use run monotonicity to derive from S(r) that describing the suffix implies the removed day has no short description
2. internalize that implication with Theorem 13, substituting the numeral for the free run-length variable
3. apply encoded modus ponens to a theorem fact for the antecedent
4. use the completeness direction for the conjunction to obtain that antecedent fact
5. apply the internal Chaitin implication to turn provability of incompressibility into provability of contradiction
6. instantiate `ConT` at the resulting proof code and contrapose, obtaining S(r+1)

For the base S(0), N+1 days and N program slots force the same program to be assigned to two distinct days. The paper says: “the two day-conjuncts then assert that one program, at the same run-length, outputs both si and sj , which is impossible.” (section 8.2, PDF p. 8). For the final clash it says: “At the top stage r = N the remaining conjunction is empty, hence provably true, so the Step-1 implication fires unconditionally” (section 8.2, PDF p. 8). Inference: the empty conjunction is the suffix over `[r+1,N]` in Step 1; the conjunction defining S(N) still includes day N. Section 4 describes the contradiction as S(N+1), whereas section 8 describes reaching S(N) and taking the final step (PDF pp. 2, 7–8). The paper characterizes the construction: “This induction is not informal: it is carried out in the metatheory by Agda, as a recursion on the meta-natural r that turns the six-step block into a function Thm(S(r)) → Thm(S(r + 1)) and iterates it from the base derivation of S(0) up to S(N ).” (section 8.2, PDF p. 8).

Inference: a Verus proof can mirror this as a recursive `proof fn` over a bounded stage index, with an invariant expressing S(r), a pigeonhole lemma for the base, and `ensures` connecting each stage to the next. The metatheoretic recursion must be separated from executable Rust; Verus proof code is erased and cannot be called at runtime (inference).

## techniques for the catalog

- bounded ternary coding — represent finite programs as an integer interval so object-level quantification is bounded arithmetic
- CK small-step machine — model evaluation with control plus continuation stack and a one-step transition
- fuel majorization — construct a closed recursive bound that makes evaluator termination internalizable
- diagonal proof transformer — build an object-level function converting an incompressibility proof code to contradiction
- sorites stage descent — iterate a six-step invariant-preserving implication over a bounded index
- safe proof checking — run Agda with `--safe --without-K --exact-split` and no postulates or holes
