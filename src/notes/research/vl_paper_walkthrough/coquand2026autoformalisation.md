# Auto formalisation of Chaitin and of the surprise incompleteness Theorem
(authored by agents unless marked 🧑)
Tag: `coquand2026autoformalisation`, [paper](http://arxiv.org/abs/2606.12462v1)

## scope and trust boundary

This paper reports an Agda formalization, generated with Claude, of Chaitin's first incompleteness proof and the Kritchman–Raz surprise-examination form of the second incompleteness theorem inside Guard's Basic Recursive Arithmetic (T). The formal artifact is a total Agda function transforming a proof of the open consistency formula `ConT` into a proof of contradiction. The paper states: “The resulting formalisation clarifies a number of details left implicit in the original presentation and provides a fully machine-checked proof of these arguments for Church’s Basic Recursive Arithmetic.” (abstract, PDF p. 1).

The proof checks under Agda `--safe --without-K --exact-split`, with no postulates and no holes (section 9, PDF p. 8). This establishes the stated derivability implication in the encoded T system, conditional on trusting Agda's checker, the T development, the encoding, and the formal statement. It does not establish consistency of T; `ConT` is the sole hypothesis and is consumed once per descent step.

## technique: bounded code representation

Chaitin's argument needs an internal computation representation but cannot define an unrestricted evaluation function in primitive recursive arithmetic. The paper encodes a program as a natural number read in base 3, with digits from a three-symbol alphabet, then parses that string into an expression. Program length is the number of base-3 digits, so programs of length at most L* are exactly the interval `p < N`, where `N = 3^(L*+1)` (section 7.1, PDF p. 4). The authors emphasize: “This is the single simplification that makes the whole argument feasible: there is no separate enumeration to verify — ‘the set of short programs’ is an interval of numbers, and quantification over it is bounded quantification over {p < N }.” (section 7.1, PDF p. 4).

Apply it by (1) choosing the finite ternary alphabet and parser, (2) defining the numeric length bound, (3) replacing quantification over syntactic programs with bounded quantification over integers below N, and (4) proving parser and coding lemmas in the object theory. This turns the finite set used in the incompleteness argument into arithmetic data. Inference: a Verus analogue would use executable Rust parsers plus `spec fn` representations for bounded syntax and `requires p < N`; `ensures` can state parser round trips and uniqueness. Verus cannot inherit Agda's object-level arithmetic library, so the parser, bounds, and arithmetic lemmas must be separately specified and proved (inference).

## technique: small-step interpreter with explicit fuel

The universal interpreter is a Landin CK-style machine. A configuration is a control expression and continuation stack; one `step` either decomposes control and pushes deferred work or pops a frame and plugs in a value. Iterating `step` for l steps runs a program. Halting means value control plus empty stack, and the output is read from that configuration (section 7.2, PDF p. 5). A bounded µ-search wraps the evaluator to enumerate theorem codes until a fitting proof is found. The paper defines `def p (l,u)` as “running p for l steps halts with output u + 1”; `+1` separates a halted value from the non-halted code 0.

Inference: in Verus, model machine state as a datatype or sequence, write an executable one-step transition, and specify a `run` loop with a decreasing fuel counter. Prove a loop invariant relating the sequence state to the mathematical evaluator and a postcondition that a halted state yields the claimed output. Use `decreases` for termination and `invariant` declarations in Verus syntax; do not treat a proof function as runtime code (inference).

## technique: Gandy–Howard majorant for internal termination

The difficult formal step is that the interpreter's run length must be an object term accepted by the internal verifier `th`, rather than a meta-level natural. A statement quantified over an external numeral cannot be fed into an internal derivation. The paper therefore constructs a closed combinator `fuel(f)` that majorizes the number of steps used by every run of function f, by primitive recursion mirroring f. The induction proves the stable property “the run completes at any fuel ≥ fuel(f)(x)”; a second `fuelµ` majorizes the bounded search. The authors report: “The resolution adapts the classical majorisation method of Howard and Gandy [7, 5]: one defines, by primitive recursion mirroring the structure of f , a closed combinator fuel(f ) that provably majorises the actual number of steps any run of f consumes at every term input.” (section 7.3, PDF p. 5).

Use this method by (1) defining a step-count measure, (2) recursively defining a closed majorant for constants, application, and recursion, (3) proving by structural induction that every run terminates with fuel at least that majorant, (4) composing it with a second majorant for µ-search, and (5) placing the resulting closed term in the internal proof's fuel slot. The paper says the naive induction stalls at primitive recursion because derivation-level running-time control is absent; the majorant supplies exactly that missing object-level bound.

Inference: in Verus, pair a `run` function with a ghost/specification fuel bound and prove that each recursive branch decreases a well-founded measure. A `decreases` clause can express termination, while a `proof fn` can establish that the chosen bound dominates all recursive calls. This is a design pattern for verified interpreters, not a direct translation of Agda combinators (inference).

## technique: explicit diagonal proof transformer

The short program `gL*` enumerates theorem codes until it finds a statement asserting `K(?) > L*`, then outputs the witness. The formalization builds it as an actual one-variable object combinator `G` by bracket abstraction. The internal Chaitin implication is an object-level implication: a theorem code for the incompressibility statement is transformed by `G` into a theorem code for contradiction. The paper says: “The deduction lives entirely inside the object logic as an implication; the run of the interpreter on gL⋆ , with the Term-fuel of §7.3, is what closes the positive leg of (C).” (section 7.4, PDF p. 6).

This makes the proof constructive and avoids an abstract provability predicate: the object function `G` is a proof transformer whose correctness is checked in T. Inference: Verus can express the transformer as an executable function with an `ensures` relation from an input proof-code representation to an output contradiction-code representation, with a `proof fn` establishing the relation. The code's soundness still depends on the modeled verifier and parser; Verus does not certify an external proof system automatically (inference).

## technique: six-step sorites descent

Instead of counting incompressible numbers, the paper defines an open stage statement S(r): no assignment of short programs can describe all days in `[r,N]` at one run length. The induction S(r) -> S(r+1) has six formal steps (section 8.2, PDF pp. 7–8):

1. use run monotonicity to derive from S(r) that describing the suffix implies the removed day has no short description
2. internalize that implication with Theorem 13, substituting the numeral for the free run-length variable
3. apply encoded modus ponens to a theorem fact for the antecedent
4. use the completeness direction for the conjunction to obtain that antecedent fact
5. apply the internal Chaitin implication to turn provability of incompressibility into provability of contradiction
6. instantiate `ConT` at the resulting proof code and contrapose, obtaining S(r+1)

The base S(0) is pigeonhole: N+1 days but only N program slots force two equal outputs at one run length. At r=N the conjunction is empty and true, so the step yields contradiction; external Agda induction iterates the block from S(0) to S(N). The paper characterizes the construction: “This induction is not informal: it is carried out in the metatheory by Agda, as a recursion on the meta-natural r that turns the six-step block into a function Thm(S(r)) → Thm(S(r + 1)) and iterates it from the base derivation of S(0) up to S(N ).” (section 8.2, PDF p. 8).

Inference: a Verus proof can mirror this as a recursive `proof fn` over a bounded stage index, with an invariant expressing S(r), a pigeonhole lemma for the base, and `ensures` connecting each stage to the next. The metatheoretic recursion must be separated from executable Rust; Verus proof code is erased and cannot be called at runtime (inference).

## evidence, assumptions, and product threat

The reported evidence is a checked Agda repository and the absence of postulates or holes, not performance data. Trusted elements include Agda, the prior T4 development, parser and machine definitions, the chosen axioms of Basic Recursive Arithmetic, and the formalization's interpretation of Chaitin and Kritchman–Raz. The author explicitly says the rest of the report was generated by Claude and reviewed, so language-model generation is not itself a trust mechanism.

Inference: threat to VeruLaw is moderate for verified interpreter and proof-orchestration work. The paper supplies reusable patterns—bounded encodings, explicit small-step semantics, fuel majorants, and stage invariants—but it concerns Agda and arithmetic metatheory, not Rust ownership, unsafe code, concurrency, or external dependencies. VL should reuse these proof shapes rather than redo their arithmetic result; its unresolved risks remain specification adequacy, trusted parser/runtime boundaries, and translating generated proof structure into valid Verus constructs (inference).

## techniques for the catalog

- bounded ternary coding — represent finite programs as an integer interval so object-level quantification is bounded arithmetic
- CK small-step machine — model evaluation with control plus continuation stack and a one-step transition
- fuel majorization — construct a closed recursive bound that makes evaluator termination internalizable
- diagonal proof transformer — build an object-level function converting an incompressibility proof code to contradiction
- sorites stage descent — iterate a six-step invariant-preserving implication over a bounded index
- safe proof checking — run Agda with `--safe --without-K --exact-split` and no postulates or holes
Checked 2026-10-14 against the paper by a Codex agent: audit record coquand2026autoformalisation; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
