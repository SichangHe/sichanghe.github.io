# An Update on Deductive Synthesis and Repair in the Leon Tool
(authored by agents unless marked 🧑)
Tag: `koukoutos2016update`, [paper](http://arxiv.org/abs/1611.07625v1)


## problem and result

Leon synthesizes or repairs recursive, purely functional Scala programs from formal specifications, pre/postconditions, and symbolic input-output examples. The paper's goal is to enlarge the search space while reducing redundant candidates and verification time. The abstract reports: “Our techniques increase the scope of synthesis by expanding the space of programs we can synthesize and by reducing the synthesis time in many cases” (Abstract, p. 100).

A synthesis problem is written as inputs, path condition, specification, and output variables. A solution is a pair of a precondition and a program term. The framework applies deductive decomposition rules until a closing rule generates expressions, then validates candidates with a Leon solver backed by Z3 or CVC4 (Sections 1–1.2, pp. 100–102).

## technique 1: dedicated recursive-call rule

What it is. The new `Introduce Recursive Calls` rule inserts a recursive call into the synthesis context while forcing one argument to be structurally or numerically smaller. All other arguments remain fixed. The returned value is bound as `rec` and can be pattern-matched by later rules (Section 2, pp. 102–103).

How to apply it.

1. Track a synthesis context of the form `⇓[foo(a1,...,an)]` and a path condition Π (Section 2, p. 102).
2. Choose an argument `ai` and enumerate `argsSmaller(ai,Π)`: decrement positive integers, increment negative integers, or recurse into an abstract-data field known to have the required type (Section 2, p. 102).
3. Add `rec ← foo(a1,...,a'i,...,an)` to the path condition, with `a'i` drawn from `argsSmaller` (formal rule, p. 102).
4. Solve the resulting subproblem and expose `rec` to decomposition and pattern-matching rules (Section 2, p. 103).

The paper explicitly limits the rule: “This approach cannot generate recursive calls where more than one argument changes” (Section 2, p. 103). Its benefit is that the recursive result is available before symbolic term exploration; this enables the run-length encoder's match on `rec` (Section 2, p. 103).

Verus form. Inference: a Verus proof-guided generator could restrict recursive Rust function candidates to calls on structurally smaller data and require a `decreases` measure where the Verus construct is available. The generated function would still need `requires`/`ensures` and loop `invariant(...)` proofs. The Leon rule itself is a synthesis search rule, not a Verus annotation, and Verus does not automatically synthesize the recursive call from this paper's context notation.

Evidence and failure. The new recursive rule solved four additional synthesis benchmarks in the paper's ablation (Section 5, p. 107). It does not improve running times and cannot express accumulator-style recursion with multiple changing arguments (Sections 2 and 5, pp. 103, 107).

## technique 2: attributed term grammars

What it is. Symbolic Term Exploration (STE) generates expressions from a type-directed context-free grammar. Leon augments nonterminals with attributes that filter productions before generation, removing syntactically different but semantically equivalent terms. The paper contrasts this with post-generation disambiguation: “Our attributes affect the grammar itself, meaning that all terms produced are automatically good candidates” (Section 3, p. 103).

How to apply it.

1. Build a grammar from variables and callable functions in scope, e.g. `Int ::= Int + Int | Int - Int | 0 | a | foo(Bool)` (Section 3, p. 103).
2. Attach `Sized` attributes and assign each operator a cost. Generate only combinations whose child sizes sum to the requested size; for commutative operators impose a canonical ordering of child sizes (Section 3, pp. 103–104).
3. Attach `¬f` to the right child of associative operator `f` so operators associate left and equivalent reassociations are not generated (Section 3, p. 104).
4. Use `G` and `¬G` to separate ground-term generation from terms containing variables; remove constants from `¬G` productions and variables from `G` productions (Section 3, p. 104).
5. Exclude neutral or absorbing operands with attributes such as `¬0`, removing forms like `e+0`, `e/1`, and `e*0` (Section 3, p. 104).

Verus form. Inference: the same normalization idea can constrain an agent's candidate Rust/Verus proof terms before invoking Verus: canonicalize commutative expressions, avoid neutral arithmetic, and bound expression size. These are generator-side transformations; they do not change Verus's valid constructs or prove equivalence. Any generated candidate still needs Verus `assert`, lemmas, and contracts checked by the verifier.

Limits. The paper notes that unconstrained depth causes the number of terms to explode double exponentially (Section 3, p. 103). Attribute rules remove redundancy but do not make the overall search complete or polynomial.

## technique 3: symbolic term exploration with counterexample-guided testing

STE unfolds the attributed grammar by increasing program size. It first filters candidates by concrete execution on examples, then asks the Leon solver to validate survivors. Algorithm 1 gives the procedure:

1. For each size `n` from 1 through `maxSize`, unfold grammar `G` to a symbolic program tree `P` (Algorithm 1, p. 105).
2. Run concrete tests on every initial example, removing failing candidates (Algorithm 1, p. 105).
3. If few candidates remain, validate each against the specification. If one is proved, return it (Algorithm 1, p. 105).
4. Otherwise query the solver for whether some candidate in `P` satisfies the specification for a fresh symbolic input. If unsatisfiable, abandon this size; if satisfiable, extract a model candidate and validate it (Algorithm 1, p. 105).
5. When validation finds a counterexample, add that input to the test base and concretely execute all remaining candidates on it (Algorithm 1, pp. 105–106).
6. Prioritize tests that have eliminated the most programs and reuse partially synthesized program branches with a placeholder for the current subproblem (Section 4, pp. 105–106).

The paper states: “our experience using STE since the previous iterations of the tool has shown that concrete execution is usually faster than a single SMT query” (Section 4, p. 105). This is an engineering observation, not a theorem. Inference: for Verus-oriented synthesis, the same counterexample pool could cheaply reject candidate Rust contracts before expensive verification, but the final `ensures` proof remains necessary.

## technique 4: deductive synthesis and repair specifications

The run-length encoder illustrates specification-driven synthesis. The input gives `decode`, a `legal` predicate, and a nondeterministic `choose` requiring `legal(res) && decode(res) == l`; Leon synthesizes a deterministic `encode` and verifies the postcondition. The paper reports that it generates and verifies this solution in about 20 seconds (Section 1.1, p. 101). The repair benchmark suite uses existing faulty programs plus contracts and examples; candidates are tested and repaired under the same solver-based validation (Section 5, pp. 106–108).

Verus form. Inference: a Verus-facing system could translate a specification into candidate Rust implementations and use `ensures` as the acceptance condition. A `choose`-style nondeterministic specification is a synthesis input, not executable Verus code; the final implementation must be deterministic Rust whose proof passes. Inference: agent-generated candidates must preserve the specification's quantifier and abstraction meaning, because passing a weakened contract would not establish the intended behavior.

## evidence, measurements, and trust

Table 1 evaluates synthesis variants on 25 listed benchmarks, with a 200-second timeout per benchmark. The new system solves five hard benchmarks that prior versions could not, and produces a more concise verifiable solution for `StrictSortedList.delete` (Section 5, p. 106). The ablation reports that STE improvements reduce time without adding solved benchmarks; improved grammars further reduce time; the recursive-call rule solves four additional benchmarks (Section 5, p. 107). Table 2 contains 35 repair rows; times are in seconds for previous and current versions, separated into testing and repair. The current version is often slower because of reliability changes, and `List.drop` is no longer solvable under the new recursive-call handling (Section 5, pp. 107–109).

The paper's denominators are benchmark rows, not random samples: the five-new-benchmark claim refers to the synthesis table, while the four-benchmark claim refers to the recursive-rule ablation. Timeouts count as failures, and parenthesized results mean a solution was produced but not verified (Table 1 caption, p. 107). Trusted components include the Leon-to-SMT translation, Z3/CVC4, the concrete evaluator, and the user specification. Inference: synthesis success is only as meaningful as the specification and the completeness of candidate grammar.

Inference: the threat to agent-written verified Rust is high for candidate-generation workflows and low for direct Verus proof checking. Leon demonstrates that recursion-aware search, grammar normalization, and counterexample-guided testing can produce verified code automatically, but it targets pure Scala and does not handle Rust ownership, unsafe operations, concurrency, or Verus's proof language. The useful product lesson is to separate cheap candidate filtering from expensive proof validation and to make search restrictions explicit.

## techniques for the catalog

- recursive-call introduction — generate one structurally smaller recursive argument and expose its result to later synthesis rules
- attributed term grammars — canonicalize size, associativity, commutativity, groundness, and neutral-element choices before generation
- symbolic term exploration — enumerate candidates by size, test concretely, and validate symbolically with SMT
- counterexample-guided test growth — add solver counterexamples to a prioritized concrete test base
- specification-driven repair — synthesize or repair code only when the resulting candidate satisfies formal contracts
Checked 2026-10-14: audit record koukoutos2016update; paper-study comparison complete; gate executed; experiments not rerun
