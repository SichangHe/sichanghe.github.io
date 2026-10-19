# The Vampire Diary
(authored by agents unless marked 🧑)
Tag: `bartek2025vampire`, [paper](http://arxiv.org/abs/2506.03030v3)

## what the paper provides

This CAV 2025 tool paper documents Vampire’s input language, proof-search architecture, arithmetic and induction extensions, polymorphism, higher-order features, counterexamples, and engineering guidance. The abstract states: “Vampire now supports arithmetic, induction, and higher-order logic.” (Abstract, p. 1). Inference: it is a prover guide and tool report, not a Verus integration or a benchmark of Rust verification.

## technique 1: portfolio proof search

what it is: run many configured strategies rather than one fixed proof attempt. Vampire accepts TPTP or SMT-LIB 2 and seeks unsatisfiability by deriving falsum; a conjecture supplied in TPTP is automatically negated (Section 2, p. 2, footnote 6). The user guide recommends `vampire --mode portfolio --schedule <schedule> --cores 0 <problem>` (Section 2, p. 3).

when to use it: the paper recommends portfolio mode because a single proof attempt will likely be poorly suited to the input. Choose a built-in schedule, allocate available cores, and set time, memory, or instruction limits. The paper warns: “It is possible, but usually undesirable, to invoke Vampire directly on an input file.” (Section 2, p. 3).

how to do it:
1. encode the conjecture and axioms in TPTP or SMT-LIB 2
2. select a portfolio schedule
3. run with `--cores 0` or a fixed core count
4. inspect SZS status and the proof or counter-satisfiable result
5. rerun with output or resource options when debugging

Vampire reports `Theorem` when a conjecture’s negation is unsatisfiable and `CounterSatisfiable` when it is satisfiable (Section 2, p. 3). Inference: a VL pipeline could try Vampire on translated logical obligations, provided the translation preserves their meaning and the result is independently checked; this paper supplies no Verus integration.

evidence and limits: the paper gives no aggregate success denominator for portfolio schedules. Resource limits are time (`-t`), memory (`-m`), and retired instructions (`-i`) (Section 2, p. 4). Inference: reaching a resource limit without a result leaves the obligation undecided.

## technique 2: saturation and superposition inspection

what it is: preprocess formulas to clause normal form and apply superposition and simplification to seek the empty clause. A complete calculus can also establish satisfiability by saturation (Section 2, p. 2); a resource limit may stop the search. Vampire works in two phases: “First, the input is parsed, the conjecture — if present — is negated, and the resulting formulas are converted to clause normal form (CNF) and preprocessed. Then Vampire tries to derive the empty clause (witnessing contradiction) in order to refute the CNF of the input problem.” (Section 2.1, p. 4).

when to use it: use clausification and internal-state output to understand a failed encoding or why preprocessing removes terms. Run `vampire --mode clausify <problem>`, then enable `--show_preprocessing on`, `--show_new on`, `--show_passive on`, `--show_active on`, or `--show_reductions on` (Section 2.1, p. 4).

how to do it:
1. provide the input formulas, or axioms and a TPTP conjecture that Vampire negates
2. clausify and inspect the resulting CNF
3. let Vampire derive new clauses through superposition and simplify them
4. inspect reductions and passive/active sets
5. inspect the result, including whether a resource limit stopped the search

The paper’s motivating list theorem has a proof ending in “□” (Figure 3, p. 6). Inference: inspecting intermediate logical representations could help debug a future VL translation; the paper does not demonstrate such a translation.

## technique 3: ALASCA quantified arithmetic

what it is: the Abstracting Linear Arithmetic Superposition Calculus combines inequality chaining, unification with abstraction, and rewriting modulo linear arithmetic (Section 4.1, p. 5). It permits arithmetic-aware superposition in quantified clauses. In the list-sum example, Vampire rewrites `sum(x # y)` to `x + sum(y)` using an arithmetic equality (Section 4.1, p. 5).

when to use it: use ALASCA for quantified linear real arithmetic with uninterpreted functions, especially when ordinary superposition cannot orient a useful rewrite. Vampire extends the implementation to mixed integer-real arithmetic with quantifier elimination and floor/rounding support (Section 4.1, p. 7).

how to do it:
1. encode the arithmetic problem and any required function definitions in a supported input format
2. let ALASCA normalize arithmetic literals and chain inequalities
3. apply arithmetic-aware superposition and variable elimination
4. optionally use Vampire’s Z3 integration through AVATAR modulo theories or theory instantiation
5. inspect the resulting refutation

The paper says, “Vampire sometimes hands off ground, that is quantifier-free, arithmetic reasoning to the Z3 SMT solver [16].” (Section 4.1, p. 7). Its theory-instantiation example starts with `∀x : Z. P(x) ∨ 0 > 3x ∨ x ≥ 1`. The SMT solver finds `x = 0` satisfying the negated arithmetic disjunction; Vampire instantiates and simplifies the clause to `P(0)` (Section 4.1, p. 7).

evidence and limits: Vampire proves the paper’s polymorphic list-sum proposition, and the authors qualify their comparison: “other solvers such as CVC5 [2] or Z3 [16] cannot, to the best of our knowledge, yet process or prove problems such as this one” (Section 3, p. 5). No comparative runtime or denominator is given. Nonlinear multiplication is treated as an uninterpreted function with added axiomatization, rather than handled by a dedicated nonlinear calculus (Section 4.1, p. 7).

## technique 4: automated structural and well-founded induction

what it is: generate induction lemmas when an eligible induction goal is derived, then immediately resolve the lemmas with that goal. In the structural list example, Vampire instantiates the induction axiom, converts it to CNF, and resolves away its universally quantified conclusion. Vampire supports structural induction on datatypes, bounded integer induction, and well-founded induction from recursive definitions (Section 4.2, p. 7).

when to use it: use this for list/tree recursion, bounded counters, or recursive functions whose proof requires a base and inductive step. The paper restricts induction to literals with up to one free variable; footnote 10 says this covers universally quantified conjectures and conjectures with any number of universal variables and one existential variable (Section 4.2, p. 7).

how to do it:
1. detect an eligible inductive goal
2. instantiate the datatype’s induction axiom with the target predicate
3. convert the axiom to CNF
4. resolve the goal with the clausified axiom, removing its conclusion
5. discharge the resulting arithmetic and rewrite obligations

For the list example, Vampire sets `L[t] := 0 = sum(t) + sum(σ0) − sum(t ++ σ0)` and derives `¬L[ϵ] ∨ L[σ4]` and `¬L[ϵ] ∨ ¬L[σ3 # σ4]` (Section 4.2, p. 8). These clauses jointly express failure of the induction antecedent, which the remaining proof refutes. The authors state: “Immediately after Vampire generates the induction lemmas, it uses them to resolve their corresponding goals.” (Section 4.2, p. 7).

evidence and limits: the Figure 3 proof reaches the empty clause after 19 displayed steps (Figure 3, p. 6), but this is one example, not a success rate. The paper describes “more explosive lemma generation techniques essential for solving some inductive problems” (Section 4.2, p. 7). Inference: applicability depends on the supported goal forms and manageable proof search. Vampire can generalize terms, literals, and clauses while synthesizing lemmas (Section 4.2, p. 8), as part of this lemma generation.

## technique 5: polymorphic and higher-order encodings

what it is: Vampire supports rank-1 polymorphic types, useful for generic lists and polymorphic theories such as arrays; it requires explicit sort arguments because it has no sort inference routine. Vampire also supports Fool, a conservative first-order extension with if-then-else and let-in expressions that can encode next-state relations of loop-free programs (Section 4.3–4.4, p. 8).

when to use it: use polymorphism for parametric data structures and Fool for loop-free program-state relations. For higher-order reasoning, use the separate HOL branch (Section 4.4, p. 9).

how to do it:
1. declare polymorphic constructors and functions
2. supply explicit sort arguments where required
3. encode conditionals and lets in Fool when modeling next-state behavior
4. for higher-order input, use the HOL branch and its schedules rather than assuming every extension is in mainline

The paper notes that “all sorts in non-variable terms must be explicitly given as sort arguments” (Section 4.3, p. 8). The HOL branch uses bounded-depth unification and introduces constraints for remaining unification terms (Section 4.4, p. 9). Section 5.5 (p. 11) explains: “The way we are currently dealing with this tension is by keeping this kind of feature on git branches, which are periodically synchronised with mainline Vampire.”

## trusted boundary, evidence, and product risk

Vampire uses external MiniSat, CaDiCaL, optional Z3, VIRAS quantifier elimination, and mini-gmp (Section 2, p. 3). Inference: a VL integration that accepts Vampire’s answer without independent checking would rely on the relevant solver components and the correctness of its translation. Vampire’s output is a proof or model status, but the paper does not claim a formally verified Vampire implementation. The paper provides a worked list-sum proof and qualitative tool capabilities; it gives no benchmark denominator, runtime table, or failure rate. It also reports: “in CASC-J12, the most recent world championship in theorem proving, Vampire proved more problems than any other system in every competition division [64].” (Section 1, p. 2). That competition result is cited, not reproduced as an evaluation here. Inference: a future integration should check that the translated obligation matches the intended Rust specification; a solver result alone cannot establish that correspondence.

Inference: before implementing a saturation prover, ALASCA, or automated induction engine for VL, evaluate Vampire’s existing capabilities. A possible integration would also need a sound translation, result checking, and specification review. The paper’s warning that one direct strategy is “usually undesirable” supports portfolio-style helper search, but not treating portfolio success as proof of complete coverage.

## techniques for the catalog

- portfolio theorem proving — run multiple Vampire strategies with schedules, cores, and explicit resource limits
- saturation debugging — inspect CNF, active/passive clauses, reductions, and superposition search
- ALASCA arithmetic — combine arithmetic-aware superposition, quantifier elimination, and optional Z3 handoff
- automated induction — instantiate structural, bounded, or well-founded induction and resolve base/step clauses
- polymorphic, Fool, and higher-order modeling — supply explicit sorts, encode loop-free next-state relations, and use the HOL branch for higher-order reasoning
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Theory instantiation uses an SMT solver to find possible instantiations of clauses based on their purely arithmetical literals."): checked all study quotations, numbers, section and page references, technique steps, and capability claims against the full paper; corrected the portfolio page, quotations, VIRAS spelling, conjecture handling, induction steps, and branch limits, and removed unsupported Verus claims; did not run Vampire, reproduce the proof or competition results, inspect implementation code, or verify a Verus integration.
