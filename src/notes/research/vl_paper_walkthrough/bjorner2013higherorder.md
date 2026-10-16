# Higher-order Program Verification as Satisfiability Modulo Theories with Algebraic Data-types
(authored by agents unless marked 🧑)
Tag: `bjorner2013higherorder`, [paper](http://arxiv.org/abs/1306.5264v1)

## scope and contribution

The paper presents a direct encoding of higher-order functional programs into first-order Horn clauses interpreted by an SMT solver. Its abstract states: “Our approach encodes higher-order programs directly as first-order SMT problems over Horn clauses.” The target is partial correctness, with ranking-function encodings also extending the approach to total correctness. The central challenge is closure values: “The presence of closures offers several challenges: relatively complete proof systems have to account for closures; and in practice, the effectiveness of search procedures depend on encoding strategies and capabilities of underlying solvers.” The authors choose algebraic data-types (ADTs, or Herbrand terms) to represent closure shapes and use Horn-clause solvers such as Z3.

Inference: For Verus, this is a design pattern for compiling specifications about higher-order behavior into first-order relations before asking Z3 to prove them. It is not a Verus implementation and does not establish that Verus can encode arbitrary Rust closures this way.

## technique 1: relational Horn encoding of first-order procedures

What it is. Represent each function by a relation from input arguments to outputs. Add Horn clauses for each branch and a clause connecting the relation to the asserted postcondition. The paper's McCarthy-function example is:

```
let mc x = if x > 100 then x - 10 else mc (mc (x + 11))
assert x <= 101 => mc(x) = 91
```

The paper gives these clauses (section 2, PDF page 2):

```
∀x . x > 100 → mc(x, x − 10)
∀x, y, z . x ≤ 100 ∧ mc(x + 11, y) ∧ mc(y, z) → mc(x, y)
∀x, y . x ≤ 101 ∧ mc(x, y) → y = 91
```

How to apply it.
1. Choose a relation whose arguments are the function's inputs and result (section 2).
2. Translate each executable branch into a Horn implication (section 2).
3. Translate the assertion into a clause whose consequent is false or the desired equality (section 2).
4. Ask a Horn solver for satisfiability; a model is an inductive summary. The paper says: “These Horn clauses are satisfiable if and only if the original partial correctness assertion holds” (section 2, page 2).
5. Inspect the model. Z3 returns `mc(x,y) ≡ (y ≤ x − 10 ∨ y ≤ 91) ∧ y ≥ 91 ∧ (x ≤ y + 10)` in the example (section 2, page 2).

Verus form. Inference: A Verus function can keep executable Rust and expose a `spec fn` relation describing allowed input/output pairs. A `proof fn` can establish that the implementation's result satisfies the relation using `ensures`; recursive calls need a decreases clause when termination is proved. Verus does not consume Horn clauses directly in source, so the relational encoding is an inference about an intermediate proof obligation, not a paper-defined Verus construct.

Evidence and limits. The evidence is the satisfiable model for McCarthy's function, not a benchmark study. The paper also notes that ranking functions can be encoded into Horn clauses, extending the method to total correctness (section 2). Solver support is a dependency: the paper lists Duality, HSF, Eldarica, Z3 PDR, and SPACER, and says “The challenge is of course to solve Horn clauses and a number of tools are being developed for solving Horn clauses at scale.” Inference: the method assumes that the chosen solver can discover an inductive relation in the background theory; satisfiability does not by itself validate the programmer's intended specification.

## technique 2: encode closures as algebraic data-types and interpret them

What it is. Encode each closure type as an ADT whose constructors are the possible partially applied functions. Define an evaluator relation over a closure, its argument, its output, and a termination flag. Section 3 states: “The basic idea is to encode functions as relations and higher-order closures as algebraic data-types.”

The warm-up program is:

```
let f x y = assert (not (x() > 0 && y() < 0))
let h x y = x
let g n = f (h n) (h n)
```

The only closure type is represented as `clo ::= h int`, with `unit ::= unit` (section 3, page 3). The evaluator rule is:

```
∀x, r, ok . h(x, unit, r, ok) → Ev(h(x), unit, r, ok)
```

How to apply it.
1. Enumerate closure constructors for the closure type actually used by the program (section 3).
2. Define an evaluator relation `Ev` taking closure, argument, result, and success flag (section 3).
3. Add one evaluator Horn rule per constructor/function body (section 3).
4. Translate ordinary functions into Horn clauses that evaluate their closure arguments, combine returned values, and record assertion success (section 3).
5. Add a clause from a failed assertion to `false` so that satisfiability means safety (section 3).
6. Specialize to the assertion and remove irrelevant arguments or closure constructors when this preserves equisatisfiability. The paper says: “It can still be simplified by specializing the program to the correctness assertion and removing arguments” (section 3, page 3).

The specialized warm-up clauses include `Ev(x,r1) ∧ Ev(y,r2) ∧ r1 > 0 ∧ r2 < 0 → f(x,y)`, `f(n,n) → g(n,r)`, and `g(n,r) → false` (section 3, page 3). The authors report that these non-recursive clauses are easy for Z3's Horn engines.

Verus form. Inference: Represent the closure environment with a Rust enum whose variants carry captured values; define a pure specification relation for applying each variant. Executable dispatch remains a `match`; a proof lemma can connect each branch to the relation. A Verus `enum` and `match` are the closest source-level ADT analogue. The paper's evaluator relation and success flag are mathematical relations, so they belong in `spec fn`/proof code rather than runtime code. Inference: unlike the paper's first-order Horn solver, Verus requires contracts and lemmas that expose the same branch facts to Z3.

Evidence and limits. The warm-up is a symbolic example with no timing or success denominator. The simplification is valid only when removed arguments and constructors are irrelevant to the assertion; the paper calls the result “equi-satisfiable.” Inference: closure variants introduced later or through separate modules must be added to the ADT, so this encoding is whole-program or requires a closed set of closure shapes.

## technique 3: recursive closure ADTs plus solver-oriented transformations

What it is. The paper's harder example uses recursive `succ` closures:

```
let app1 f g = if * then app1 (succ f) g else g f
let app2 i f = f i
let succ f x = f (x + 1)
let check x y = assert (x <= y)
let main i = app1 (check i) (app2 i)
```

The closure types are `clo1 ::= app2 int` and `clo2 ::= check int | succ clo2` (section 3, page 3). The recursive closure is essential. The generated clauses include:

```
app1 (succ(f), i) → app1(f,i)
Ev(f,i) → app1(f,i)
Ev(f,x+1) → succ(f,x)
x > y → check(x,y)
app1(check(i),i) → main(i)
main(i) → false
succ(f,x) → Ev(succ(f),x)
check(x,y) → Ev(check(x),y)
```

How to apply it.
1. Identify recursive closure constructors and retain them; remove only superfluous closure types (section 3).
2. Emit Horn rules for recursive calls and evaluator transitions (section 3).
3. If the ADT solver cannot synthesize leaf-selecting properties, inline definitions by Horn resolution (section 3.1).
4. Merge predicates such as `app1` and `Ev`, discard tautologies, and resolve clauses containing recursive constructors (section 3.1).
5. Alternatively, add quantified arguments to recursive predicates and search for quantified invariants (section 3.2).
6. Instantiate the quantified template, then use a solver or Karr's affine-relation algorithm to obtain an inductive invariant (section 3.2).

The paper reports that direct Z3 handling fails on this recursive ADT: “Z3 accepts recursive Horn clauses with algebraic data-types as input, but is unable to establish satisfiability of these clauses directly.” Inlining produces `Ev(check(i),i) → false`, `Ev(f,x+1) → Ev(f,x)`, and `x > y → Ev(check(x),y)`, which Z3 can solve immediately (section 3.1, page 4). Quantified abstraction adds a tuple `~z` of integer variables; the paper's illustrative instantiation yields `Ev(u,v,succ(f),i) → Ev(u,v,f,i)` and related clauses, and the inferred invariant is `Ev(u,v,_,i) ≡ 2·u = v+i` (section 3.2, page 5).

Verus form. Inference: Recursive closure state maps to a recursive Rust enum, and recursive application proofs map to recursive `proof fn`s with `decreases` measures. Predicate merging corresponds to proving a single lemma that composes evaluator and caller contracts. Quantified abstraction corresponds to adding ghost/spec parameters and proving an invariant with `forall`/`exists`-style quantified specifications supported by the local Verus version; exact syntax must follow the project's Verus guide. Inference: the paper's resolution and Karr transformations occur outside Verus; their result can guide which lemma or loop invariant to add, but the transformation itself is not a Verus feature.

Evidence and limits. The evidence is solver behavior on the supplied clauses: direct recursive ADTs fail, inlining succeeds, and the illustrative quantified invariant is found after a chosen instantiation. No corpus size, runtime, or success fraction is reported. Inference: success depends on selecting useful closure constructors, a finite abstraction, and arithmetic invariants; higher-order behavior that requires unbounded or opaque environments may defeat this encoding.

## what is proved, trusted, and not established

The paper proves an encoding claim for its examples: Horn-clause satisfiability corresponds to partial correctness, and the shown models/invariants establish the assertions. It measures no independent benchmark accuracy or engineering cost. Trusted components include the Horn-clause solver, the ADT theory, the encoding's semantic correspondence, and the original program/specification. Inference: for a Verus product, the analogous trust boundary also includes Verus's translation, Z3, Rust compilation, and any external contracts; a successful proof still says only that the encoded contract holds.

The paper's numbers are limited to qualitative solver outcomes and a repository statement of “around 10,000 benchmarks from various sources” (section 2, page 2); this is a repository count, not a success denominator. No contradictory percentages or arithmetic appear in the paper. Inference: VL should reuse the closure-to-relation idea and solver transformations as proof-planning knowledge rather than reimplementing a general higher-order verifier without first testing closure-shape coverage and proof-maintenance cost.

## threat to agent-written verified Rust

Inference: The direct threat is moderate for Rust APIs that pass closures or function objects: an agent could generate a finite enum of closure cases and relational lemmas, reducing higher-order calls to first-order obligations. The threat is lower for arbitrary Rust closures with captured mutable state, dynamic dispatch, unsafe pointers, or libraries outside the modeled ADT. Inference: the product should detect when closure constructors are open-ended or recursive and require an explicit abstraction and invariant before claiming verification.

## techniques for the catalog

- relational Horn summaries — encode each function's input/output behavior and assertions as Horn clauses whose satisfiability proves partial correctness
- closure ADT encoding — represent finite closure shapes as algebraic-data-type constructors and reason through an evaluator relation
- assertion-directed specialization — remove irrelevant evaluator arguments and closure constructors while preserving equisatisfiability
- Horn inlining by resolution — merge predicates and resolve recursive constructor rules to expose a solver-friendly clause set
- quantified invariant abstraction — add quantified ghost parameters to recursive predicates, instantiate templates, and synthesize inductive arithmetic relations
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
