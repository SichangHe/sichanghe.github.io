# Refinement Reflection: Complete Verification with SMT
(authored by agents unless marked 🧑)
Tag: `vazou2017refinement`, [paper](https://arxiv.org/abs/1711.03842)

problem: smt axioms for user functions rely on trigger/fuel heuristics, so unpredictable which proofs succeed
- Liquid Haskell answer: reflection, proofs as programs, Proof by Logical Evaluation (PLE)
refinement reflection
- declare uninterpreted symbol, add body to result type `{v | v = e}`, each call unfolds once, no quantifiers
  - `fib 2 = 1` provable by merely mentioning `fib 0`, `fib 1`, `fib 2`
- soundness needs termination measure and totality
  - diverging `f x = 1 + f x` reflected proves 0 = 1
  - reflection opt-in per function
- verus analog (inference): recursive `spec fn` with `decreases`
  - differs: executable `fn` separate, tied by `ensures`; unfolds by fuel, `reveal_with_fuel` or explicit `assert`
proofs as total programs
- theorem = function type, branch = case split, recursion = induction, call = lemma use
  - escape hatches `lazy`, `unsoundError` ~ verus `assume`, `admit()`, `external_body`
- user still finds case split, induction variable, lemma instances
- verus: `proof fn` with `requires`/`ensures`/`decreases`
equational chains `e1 =. e2 =. e3 ** QED`
- each link checked by solver, `∵ lemma` justifies a link
- verus: `calc!` or chained `assert`
- unverified: assume operator, function extensionality `=*`
natural deduction as types, refinements stay quantifier-free
- implication = function, and = pair, or = `Either`, forall = dependent function, exists = dependent pair
- verus discipline: forall as `proof fn` params, exists by returning witness, use via `choose`
PLE: automate unfolding
- guard normal form (guard, body) pairs
- loop: for each application whose guard the solver proves, add `f(t) = body`; stop when goal proved or nothing new
  - fuel fails where PLE works: `pos n = 3 + pos (n-3)` needs fuel ≥ 3 in Dafny/F*
- guarantees: sound; complete for equational proofs; terminates if environment transparent (inhabited or inconsistent)
- user still supplies case splits, induction hypotheses, lemmas
- verus has no PLE, fuel instead
  - agent recipe (not in paper): assert known-guard branch equations `assert(f(t) == body)`, rerun, repeat
  - fixpoint without proof = missing case split, induction hypothesis, or lemma, not more unfolding
other encodings
- data types via testers and selectors, `case` as nested `if`, avoids quantified axioms
- lambdas defunctionalized as uninterpreted `lam`/`app`, ground α/β instances, assumed extensionality
- laws as proof-carrying class methods, client requires verified class
  - verus analog: trait with `spec fn` and law `proof fn`s
evaluation: 13 benchmarks, Table 1
- proof lines 1524 to 638 with PLE (2.39x), time 148.76 s to 150.88 s, SMT queries 1626 to 4068
- text claims (not supported by own data)
  - "2-5x" proof reduction: per benchmark 1.0x to 6.6x
  - "no performance penalty": Ackermann 5.40 s to 13.80 s
  - "order of magnitude more queries": only Applicative exceeds 10x
- SAT solver row 50 s with no proofs, so does not exercise PLE
trust
- Liquid Haskell implementation, smt answers without certificates, termination checker, assumed extensionality
- metatheory on paper, not mechanized
- n-body proof about reals, program uses doubles
not addressed
- imperative code, loops, ownership, machine integers, automating case splits or lemma choice, any llm
