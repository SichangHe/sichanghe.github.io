# DSLean: A Framework for Type-Correct Interoperability Between Lean 4 and External DSLs
(authored by agents unless marked 🧑)
Tag: `rowney2026dslean`, [paper](https://openalex.org/W7131319411)

## purpose and trust boundary

Rowney, Ahuja, Avigad, and Welleck present DSLean, a Lean framework for bidirectional translation between Lean expressions and external domain-specific languages. A user supplies equivalences between external syntax and Lean terms; DSLean parses, elaborates, and recursively translates in both directions. The paper's abstract states: “DSLean requires only a specification of an external language and its Lean equivalents, abstracting away meta-level implementation details.” Three tactics demonstrate the interface: Gappa interval arithmetic, SageMath ordinary differential equations, and Macaulay2 ring-ideal membership.

The implementation is compact in the case studies: 203 lines for gappa, 95 for desolve, and 315 for lean_m2 (page 1). This is engineering evidence, not a measure of proof quality. DSLean itself uses Lean's native parser and other unsafe or unverifiable code; the authors explicitly provide no formal guarantee of round-trip consistency.

## technique: specify bidirectional equivalences

when to use it

Use an equivalence table when a prover and an external solver have corresponding syntax and semantics, and you need to avoid bespoke serializer, parser, and elaborator code. Type-correct Lean expressions should constrain which external terms are accepted.

how it is done

1. Declare an external language and equivalences with `external NAME where`, placing external syntax on the left and a Lean object on the right of `<==>` (Section II).
2. Use `fromExternal` to parse external text into a typed Lean expression and `toExternal` to serialize a Lean expression. The paper's minimal example maps `"True" <==> True` and `"False" <==> False`; `fromExternal ... "True"` returns `(True : Prop)` and `toExternal ... False` returns `("False" : String)` (Section II, pages 1–2).
3. Represent recursive syntax with free variables, for example `"not" x <==> ¬ x`; DSLean recursively translates the subexpression bound to `x` (page 2).
4. Specify one-way rules with `<==.` or `.==>` when an equivalence is not reversible. DSLean detects non-reversibility; the paper's `"(" a "," b ")[0] ==> a` intentionally drops `b` (page 2).
5. Set precedence and associativity when defaults do not fit. Unspecified values are inferred; users can set `+rightAssociative` or `precedence := ...` (Section IV-C1).

The benefit is type filtering. The paper says: “As DSLean only translates to and from type-correct Lean code, the types of the Lean objects in question impose typing constraints on the external syntax.”

Verus form (inference)

Inference: Verus has no Lean `external` command or general metaprogramming framework. The analogous design is a Rust data type for the external AST, a parser boundary marked as trusted, and a pure executable translation function with `requires`/`ensures` contracts. Use a `spec fn` to define semantic correspondence and proof lemmas to show that translating an AST preserves the modeled operation. A Verus contract can establish type-correctness of a specific translator; it cannot make an unverified parser or foreign solver sound automatically.

## technique: translate Lean expressions by definitional matching

Algorithm 1 (Section IV-B) gives the forward procedure. Start with an empty output, iterate equivalences sorted so trivial patterns come last, and test `DEFINITIONALLY EQUAL(leanExpr, leanPattern)`. For a matching external pattern, append terminal strings, convert terminal binder names with `BINDER NAME`, recursively translate each nonterminal's corresponding subexpression, and return. If no pattern matches, throw “No patterns matched; expression is not translatable.” Nonterminal variables become metavariables; Lean's definitional equality assigns subexpressions to them. The authors explain: “The high-level algorithm for using a set of equivalences to translate a Lean expression into external syntax is outlined in Algorithm 1.”

The paper guards termination: generic patterns that match without progress are checked last, and an upper limit on recursive calls rejects inputs that could overflow. It also substitutes lambda-bound metavariables so dependencies on outside binders are represented, then asserts definitional equality after beta reduction (Section IV-B).

Inference: in Verus, write a recursive translator over an enum and prove a measure decreases on every recursive call. Use `decreases` on the recursive function and `ensures` to relate output tokens to an abstract specification. A parser or serializer that uses Rust libraries remains an external assumption unless those libraries are modeled and verified.

## technique: parse and elaborate external syntax back into Lean

Algorithm 2 separates parsing and elaboration (Section IV-C). First parse raw input with Lean's extensible Pratt parser into a syntax tree. Then find a corresponding Lean pattern, replace terminal binders with recorded names, recursively translate each nonterminal tree, unify the result with the parent expression, and report “External syntax is ill-typed; translation is impossible” on a type mismatch. Numerals have a special parser category and default to `Nat` with coercions; users may change `numberCast`. Bound variables are temporarily free during elaboration and restored afterward.

This is a type-checking technique: failed unification rejects ill-typed foreign syntax before a proof can use it. The native parser imposes restrictions on reserved terminals and punctuation; these are implementation limitations (Section IV-C1). The authors state that the processing is not formally guaranteed because it depends on unsafe parser code, even though definitional equality checks dominate the later stages.

Inference: a Verus bridge should keep parsing, AST-to-model translation, and proof obligations separate. Validate an AST's shape before constructing a verified value; use `requires` for parser invariants and `ensures` for semantic preservation. Do not mark the function being verified `external_body`; isolate only the genuinely foreign parser or solver boundary.

## technique: wrap external solvers as proof-producing or oracle tactics

Gappa translates Rocq proof certificates into Lean terms. The tactic proves interval bounds such as `x ∈ Set.Icc 0 1 → y ∈ Set.Icc (-1) 1 → 2*x+y ∈ Set.Icc (-1) 3`; unsolved subgoals remain for the user (Section V-A). The authors emphasize: “the translated Lean proofs ... do not rely on outside axioms,” so exact interval examples preserve Lean soundness even though Gappa is external.

Desolve translates an ODE goal to SageMath and translates a computed general solution back. It supports equations such as `y′(x)=1` with solution `x+C` and asks Lean to prove any remaining equivalence. SageMath emits no proof certificate, so the tactic uses an axiom of assumed SageMath correctness; the paper explicitly labels SageMath an oracle (Section V-B). This is a distinct trust mode from Gappa.

Lean_m2 translates ring and field expressions to Macaulay2, reconstructs membership proofs, and reports a nonzero remainder when membership is false. Examples cover integers, rationals, complex numbers, finite fields, polynomial rings, and quotients (Section V-C). The original bespoke translator was five times larger; DSLean replaced it. The paper says: “After translating back into Lean by similar methods, lean_m2 then synthesizes proof based on the output, or reports if the goal is unsatisfiable.”

Inference: in Verus, prefer a certificate-producing external tool whose certificate is checked by Verus-compatible lemmas. If only an oracle answer exists, state the solver result as a trusted assumption in the specification and report it separately from proved facts. For Rust arithmetic, a translated certificate can be represented by ghost data and checked with `proof fn`; solver execution itself cannot be called at runtime through proof code.

## evidence, limits, and VL implications

DSLean demonstrates three nontrivial automations and short implementations, but no benchmark denominator or success-rate table is reported. The paper's own limits include syntax whose grammar depends on prior semantic expressions, indentation-based syntax, parser API restrictions, and unverified parser/serialization code. Round-trip consistency is a design goal, not a theorem. Desolve additionally trusts SageMath; Gappa and lean_m2 aim to reconstruct Lean proofs.

Inference: threat to a product generating verified Rust is moderate and concentrated at interoperability boundaries. A DSLean-like layer could let VL call specialized analyzers while keeping proof certificates inside the prover, but foreign parsing, solver correctness, and semantic adequacy remain trusted. Existing work has already shown bidirectional DSL bridges, proof-certificate reconstruction, oracle-based ODE tactics, and algebraic solver integration; VL should focus on Rust/Verus certificate formats and measured maintenance rather than reimplementing generic translation infrastructure.

## techniques for the catalog

- typed bidirectional DSL specification — declare external-to-prover equivalences and let prover types reject ill-typed foreign syntax
- recursive translation with termination guards — match definitional patterns, recurse through nonterminals, and cap non-progressing translations
- certificate versus oracle integration — check external certificates inside the prover when possible and mark uncertified solver answers as explicit trusted axioms
Checked 2026-10-15 against paper rowney2026dslean: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
