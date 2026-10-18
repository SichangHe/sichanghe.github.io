# A Deductive Verification Framework For Higher Order Programs
(authored by agents unless marked 🧑)
Tag: `soares2020deductive`, [paper](http://arxiv.org/abs/2011.14044v1)

## what the paper builds

Soares presents a preliminary Why3 plugin that translates GOSPEL-annotated OCaml into first-order WhyML. The abstract states: “The main goal of this project is to develop a framework, on top of the Why3 tool, for the verification of effectful higher-order programs.” It also states: “We use defunctionalization as an intermediate transformation from higher-order OCaml implementations into first order ones” (abstract, p. 1). The purpose is to reuse Why3’s automated provers for higher-order programs with effects. The report’s prototype ultimately proves only pure programs and partial correctness (§6, pp. 15–16), so the effectful goal is a design direction rather than an achieved result.

The paper’s verification model is deductive: programmers write preconditions, postconditions, and invariants; Why3 generates verification conditions and sends them to external solvers. In its array-list example, the invariant is `0 <= size <= arr.length`; `set` requires `0 <= i < al.size`, ensures the returned value is `old al.arr[i]`, stores `e`, and leaves all other elements and `size` unchanged (§2, pp. 3–4). The paper reports six verification conditions discharged by Alt-Ergo in less than a second (§2, p. 4). This is one Why3 example, not a speed claim for the translator.

## technique: write heap contracts before translating

When to use it. Use this technique for mutable records and arrays where safety depends on a relation between fields and the heap. The paper uses an `arrayList` with mutable `arr` and `size` (§2, p. 3).

Steps from the paper. (1) Define the mutable type. (2) State a type invariant that every value must preserve: `0 <= size <= arr.length` (§2, p. 3). (3) Put index validity in `requires`, here `0 <= i < al.size`. (4) Use `old` in `ensures` to describe pre-state values and quantify over untouched indices (§2, pp. 3–4). (5) Run Why3; it generates safety, invariant-preservation, and postcondition obligations (§2, p. 4).

Verus form. Inference: use a Rust struct with a `spec fn` describing the representation invariant; attach `requires` to mutating methods and `ensures` to the returned value and unchanged elements. A loop or recursive traversal carries an `invariant` over the array length and logical contents. Use `old(...)` only in postconditions to refer to the pre-state. The mapping is an inference because the paper targets WhyML, not Verus.

## technique: defunctionalize higher-order code

What it is. Defunctionalization converts closures into a first-order algebraic data type plus an `apply` interpreter. The paper’s CPS reverse example has two closures: the identity function and the one that builds the reverse of the list. It introduces `type 'a kont = Kid | Krev of 'a * 'a kont`, then `apply kont arg` pattern-matches on `Kid` and `Krev` (§3.1, pp. 4–5). The original function calls become `apply` calls and anonymous functions become constructors.

Steps, distilled from the paper’s reverse example (the paper does not list them as numbered steps). (1) Put the higher-order code in a form whose function values and free variables are explicit; the example uses continuation-passing style (§3.1). (2) Enumerate closure shapes. (3) Add one constructor per shape, storing its free variables (`Krev(x,k)`). (4) Define a recursive `apply` function that interprets each constructor. (5) Replace function literals with constructors and applications with `apply`. (6) Prove the transformed first-order program with Why3. Inference: preserve a simulation lemma connecting each closure constructor to the source lambda’s behavior; the paper asserts that the translation yields an equivalent first-order program but states no separate simulation theorem.

Verus form. Inference: define an enum representing closure environments and a `fn apply` over it. A `spec fn` can describe the mathematical function represented by each enum variant; `ensures` on `apply` states that the result matches that specification. Recursive `apply` needs a `decreases` measure if termination is to be proved. The report’s prototype does not prove termination, so a Verus implementation must choose whether to add that obligation.

## technique: represent effectful function specifications as pre/post predicates

Why it is needed. Directly writing `k (length l)` in a postcondition leaves the problem of interpreting functions in the logic: the paper says they “may have side effects (e.g., divergence) which can lead to logical inconsistencies” (§3.2, p. 6). The paper therefore models a function as a pair of predicates: a precondition and a postcondition (§3.2, pp. 5–6). For CPS length it uses `ensures { post k (length l) result }`, and the continuation updates the logical length with `post k (l + 1) result` (§3.2, p. 6).

Steps. (1) Replace direct calls of an unknown function in specifications with a `post` relation. (2) Defunctionalize the function value into a first-order `kont` type (`Kid | Klen kont`). (3) Define a recursive `post` predicate by matching on the constructor: `Kid` means `result = length`; `Klen k` recurses with `length + 1` (§3.2). (4) Give `apply` a postcondition connecting the constructor and result. (5) Let Why3 discharge the generated conditions.

Verus form. Inference: encode the relation as a `spec fn post(k, input, output) -> bool` rather than calling executable functions in specifications. A proof `ensures` clause can state `post(k, logical_input, result)`. Keep side effects in executable Rust and expose only the relation to proofs. This follows the paper’s separation of executable application from logical postconditions; the exact Rust encoding is an inference.

## technique: translate syntax with free-variable and type environments

The pipeline translates each OCaml expression together with its free variables and type. For `x + y`, the translator recursively translates both operands, collects `(x,int)` and `(y,int)`, and emits `x + y` (§4.1, pp. 7–8). Lambdas add typed parameters to an environment; applications select `apply1`, `apply2`, and so on according to the function type (§4.1, pp. 8–10). WhyML lacks generalized algebraic data types, so the tool creates separate continuation types and apply functions for different function types (§4.1, p. 9).

GOSPEL annotations are comments beginning with `@`, placed after a definition or, for anonymous functions, between `fun` and the arguments; the translator converts the meta-predicate `post` to a concrete post predicate selected by the function’s explicit type (§4.2, pp. 10–11). For multi-argument functions, `post g x y r` becomes `forall var0 : kont1. post1 g x var0 -> post2 var0 y r`, a universally quantified variable of the intermediate continuation type (§4.2, p. 11). Every function declaration and application is defunctionalized, even when not used as a parameter, for uniformity (§4.1, pp. 9–10); functions with preconditions are instead converted directly, on the assumption that they are never used as first-order values (§5.2, pp. 13–14).

Inference: a Verus translator would need an equivalent typed intermediate representation, closure-environment enums, and generated proof lemmas for each apply function. Rust’s ownership and borrow rules add obligations absent from the pure OCaml prototype.

## technique: prove recursive case studies with generated lemmas

The tree-height case uses two continuations, one per branch, and a postcondition that combines their heights with `1 + max` (§5.1, pp. 11–12). The converted program is proved by CVC4 in less than a second (§5.1, p. 12). The small-step interpreter represents evaluation contexts as functions, uses `decompose_term` to return a context and redex, and repeatedly performs head reductions until a constant (§5.2, pp. 12–14). Alt-Ergo proves the converted interpreter in less than a second after the supplied `post_eval` lemma (§5.2, p. 14). The lemma states that equal evaluations remain equal when placed in the same context; it is broader than the target postcondition (§5.2, p. 14).

Inference: in Verus, encode the evaluator’s semantic function as a `spec fn`, use `ensures` to relate each reduction step to that function, and add a proof lemma analogous to `post_eval` when automation cannot derive congruence. A recursive `decreases` clause is required for a total proof, whereas the paper intentionally proves only partial correctness.

## what is proved, what stays trusted, and limitations

The evidence is two case studies, taken from the earlier paper by one of the supervisors [14] (§5, p. 11), generated verification conditions, and solver success times. The report explicitly says: “our prototype can only be used to prove pure programs” (§6, p. 16). It also does not type-check the original OCaml source before conversion; WhyML performs the later type check, and the authors have no formal proof that a badly typed source cannot translate to a well-typed target (§6, p. 15). The converter supports only a subset of OCaml and requires knowing in advance which functions become first-order values (§6, pp. 15–16). Polymorphism is not handled (§5.1, p. 11; §7, p. 16). Mutual recursion makes termination difficult, so only partial correctness is proved (§6, p. 16).

Inference: the trusted base includes the OCaml parser choice, translation implementation, WhyML type checker, Why3 verification-condition generator, Alt-Ergo/CVC4, and the correctness of every GOSPEL specification. Threat to agent-written verified Rust is medium to high for higher-order APIs: defunctionalization can make closure behavior explicit, but translation bugs, missing closure variants, unproved termination, and Rust ownership effects can invalidate the result. VL should reuse the closure-environment and post-relation ideas; it should not redo the report’s introductory Why3 examples or claim support for effectful OCaml that the prototype does not provide.

## techniques for the catalog

- heap-contract deduction — state representation invariants, preconditions, postconditions, and unchanged-heap facts before proving mutation
- closure defunctionalization — replace each closure shape with an environment constructor and a first-order `apply`
- post-relation specification — describe potentially effectful function values with pre/post predicates instead of executing them in logic
- typed translation pipeline — carry free variables and types through expression translation and choose apply functions by type
- semantic recursion lemmas — connect generated reductions and contexts to a logical evaluator, adding congruence lemmas when automation needs them
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Because post has to work for any function applied to however many arguments of any types, it cannot be defined through WhyML"): read all of the paper text (sections 1-7 and annexes A-F) and checked the quotations, numbers, section and page references, the array-list, reverse, length, translation, tree-height and interpreter descriptions, and the limitations against it; changed an invented quotation (prepend x then continue) to a paraphrase, replaced "unsound" with the paper's wording, relabeled the numbered defunctionalization steps as distilled from the example, corrected "hand-selected" case studies to taken from reference [14], added the direct conversion of functions with preconditions, the apply-everything rule and the polymorphism limitation, and marked the trusted-base sentence as Inference; kept the arXiv link; did not check the Verus mappings (all marked Inference), cited works, or the PDF layout beyond the text.
