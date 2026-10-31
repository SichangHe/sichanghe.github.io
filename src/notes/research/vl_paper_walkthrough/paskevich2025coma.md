# Coma, an Intermediate Verification Language with Explicit Abstraction Barriers
(authored by agents unless marked 🧑)
Tag: `paskevich2025coma`, [paper](https://doi.org/10.1007/978-3-031-91121-7_8)

## scope and claims
Coma is a continuation-passing intermediate verification language whose assertions are mixed with executable code. Its distinctive construct is an explicit abstraction barrier separating interface code checked at each call from implementation checked once at the definition. The abstract states: “A special programming construct representing the abstraction barrier is used to separate, inside a subroutine, the “interface” part of the code, which is verified at every call site, from the “implementation” part, which is verified only once, at the definition site” (Abstract, p. 175). The authors define a verification-condition (VC) generator, prove its correctness (Theorem 3, Section 4, p. 191), and implement it on top of Why3 (Section 5, p. 192); the implementation “currently serves as a back-end for Creusot, a tool for deductive verification of Rust programs” (Section 1, pp. 178–179).

## technique: place explicit barriers where callers need a contract
Use a barrier when only part of a function should be exposed to callers, or when different execution paths need different specifications. The paper’s `wrapExit` example moves a precondition into an assertion above a black-box barrier:

```text
let wrapExit (r: int) = assert { 0 ≤ r < 256 };
                      (↑ Unix.exit r)
```

The paper explains: “Since the assertion is put above the barrier, it must be verified at every call of wrapExit, whereas the rest of the body is invisible to the caller and produces no proof obligations at call sites” (Section 1, p. 177). At the definition, the code below the barrier is verified under the asserted assumption; the resulting definition VC is `∀r . 0 ≤ r < 256 → φ`, where `φ` is the VC of the call `Unix.exit r` (Section 1, p. 177).

Inference (steps distilled from the Section 1 examples, pp. 176–178; the paper gives no step list): (1) identify the caller-visible assertion; (2) place it above `↑`; (3) put the implementation below `↑`; (4) callers get obligations from the exposed assertion; (5) the definition gets one obligation for the hidden implementation under that assumption. For a path-specific contract, the paper puts the assertion and barrier inside one branch. In `removeRoot`, the `Node` branch passes `mergeTree l r` to a local `out` handler asserting `∀e:elt. e ∈ s ↔ e ∈ l ∨ e ∈ r` above its own barrier, while the `Empty` branch is `fail` with no assertion or barrier; thus “the pattern matching and the inadmissibility of Empty are part of the interface of removeRoot, and will appear in the VC for every individual call of the function” (Section 1, p. 178). For non-recursive functions, barriers can be omitted entirely, and the function is “effectively inlined” in callers’ VCs (Section 1, p. 178).

Inference: Verus has no construct like Coma’s `↑`/`↓` barriers. A similar boundary can be expressed with a Rust function whose `requires` and `ensures` are the public contract, while its body is verified once; path-specific obligations can use branch-local `assert` statements. This preserves the caller/callee split, but it does not reproduce Coma’s freely movable barrier or its continuation-passing semantics.

## technique: encode postconditions through continuation wrappers
Coma represents a postcondition as a precondition on the continuation that receives the result: “We get around this complication by treating the postcondition of a function as the precondition of its continuation” (Section 1, p. 177). The paper’s `triple` takes an explicit continuation `ret`, defines `out (y)` as `assert { y = 3 · x }; (↑ ret y)`, and its body is `(↑ out (x + x + x))`: the definition of `out` is above the barrier of `triple`, the call of `out` below it (Section 1, p. 177). The paper says, “A locally defined function out provides a precondition for ret, similarly to wrapExit above” (Section 1, p. 177). At call sites, this produces `∀y . y = 3 · x → φ`, where `φ` is the VC of `ret y`; at the definition, the implementation must prove that `x + x + x` equals `3 · x` (Section 1, p. 177).

Inference (steps distilled from the example): (1) make the continuation explicit; (2) define a wrapper receiving the result; (3) assert the postcondition in the wrapper, above the wrapper’s own barrier; (4) put the wrapper call under the implementation barrier; (5) callers assume the wrapper’s assertion, and the implementation must prove it. The paper’s extended handler prototypes (Fig. 9) generate these assertions, barriers and wrappers automatically from pre- and postconditions written in the prototype (Section 5, p. 193).

Inference: In Verus, use an ordinary function `ensures` clause for a returned value; a continuation wrapper is only needed when modeling CPS explicitly.

## technique: two-stage VC generation and modes
Coma first translates source into a higher-order logical “recipe”, then evaluates the recipe to a first-order formula. The paper says, “An evaluation procedure, defined as an abstract machine à la Krivine, converts recipes into first-order formulas, suitable for automated proving” (Section 1, p. 178). Evaluation can factorize selected subformulas, which curbs “the well-known exponential growth of classical weakest preconditions” (Section 1, p. 178).

The VC operator has four modes (Section 4, p. 188): caller `C^⊤_⊥` (“to verify individual calls of a defined handler”); callee `C^⊥_⊤` (“to prove the correctness of a handler definition”); full `C^⊤_⊤`, which merges both and is “the starting verification mode for Coma expressions”; null `C^⊥_⊥`, which generates no proof obligations. The caller mode treats every assertion as a precondition to verify at call sites and stops at the black-box barrier. The callee mode treats every assertion as an assumption and verifies the implementation after the black-box barrier (Section 4, p. 188). “The white-box barrier ↓ replaces the second flag with 𝔭. This preserves the current value of 𝔭 for the rest of the expression, regardless of the subsequent barriers” (Section 4, p. 189).

The rules in Figure 8 turn an assertion into an implication plus a subgoal generated only when the proof flag 𝔭 is true, and make the second flag 𝔡 take the place of 𝔭 at a black-box barrier (Section 4, p. 189). For factorization, “in our current implementation, we select non-neutral cells that are used multiple times in the final VC and are derived from executable code instead of just a sequence of assertions” (Section 3, p. 188). On Fig. 5’s `product`, the unfactorized callee VC “coincides with the verification condition for the definition of product obtained by the traditional weakest-precondition calculus”, and factorizing the `next` handler yields a compact VC in the style of Flanagan and Saxe (Section 4, p. 192).

Inference (steps): (1) translate the Coma program into a recipe in full mode, with barriers switching modes inside; (2) evaluate the recipe with the abstract machine; (3) factorize selected cells during evaluation; (4) send the resulting first-order VC through Why3 to automated provers.

Inference: Verus directly generates and discharges VCs from Rust specifications, so a user would not implement Coma’s recipe evaluator in Verus. The transferable design is to separate public-contract checking from implementation checking and factor repeated proof subgoals in a preprocessing layer.

## technique: automated specification extraction
For a first-order handler, Coma can produce, on request, logical pre- and postconditions (Section 5, p. 194). For `getRoot`, the caller VC is `(∀lvr. t = Node l v r → return v) ∧ (t = Empty → 0)`. Instantiating `return` with the neutral recipe `λx.♮ 0` yields, after evaluation and simplification, `t ≠ Empty`. Neutralizing the caller VC and instantiating `return` with `λx. z = x → 0`, for a fresh `z`, yields `∀lvr. t = Node l v r → z = v → ⊥`, equivalent to `¬(∃lr. t = Node l z r)`, “exactly the negated postcondition of getRoot” (Section 5, p. 194). The paper says, “This procedure works in a similar way to subgoal factorization discussed in Sec. 3” and that it extends to handlers with multiple outcomes, giving one postcondition per outcome (Section 5, p. 194).

Steps (Section 5, p. 194): (1) compute the caller recipe; (2) instantiate the continuation with `λx.♮ 0` and simplify to get the precondition; (3) neutralize the caller recipe; (4) instantiate the continuation with `λx. z = x → 0`; (5) evaluate to get the negated postcondition.

Inference: Verus can state inferred contracts as `requires` and `ensures`, but Verus does not provide this Coma recipe-extraction operation. Any inferred contract must be reviewed because logical extraction is not evidence that the intended API behavior was specified.

## technique: CPS and ghost predicates for higher-order code
The regular-expression case study verifies an OCaml matcher using higher-order functions and exceptions; its Coma version “can be obtained by a mechanical CPS-translation of the OCaml code” (Section 6, p. 195). The continuations `k` and `o` act as success and error/backtrack continuations (Section 6, p. 196). The specification uses the built-in predicate `mem s r` (string `s` is in the language of `r`), a ghost parameter `ck` that is “a first-class predicate which characterizes the index j passed to k”, and a predicate `cons` that is “a shortcut to simplify annotations” (Section 6, p. 196). Termination of handler `a` uses the variant `(|s| − i, r)` ordered lexicographically; the VC is split by Why3 into 44 proof tasks, “easily discharged by the SMT solvers Z3 [4] and Alt-Ergo [3]” (Section 6, p. 196).

Inference (steps): (1) CPS-transform the source, making success and failure continuations explicit; (2) add a predicate for the semantic result; (3) add ghost parameters describing what continuations accept; (4) specify each continuation’s parameters and outcomes; (5) state a lexicographic decreasing variant; (6) send generated tasks to SMT solvers. The paper notes a gap: “the current implementation of Coma does not provide any special treatment for ghost code and data. In future, we plan to introduce the necessary checks that ensure that ghost computations do not interfere with the observable part of the program” (Section 6, p. 196).

Inference: In Verus, use `spec fn` for semantic predicates, ghost variables or `Ghost<T>` for proof-only state, and `decreases` for recursive termination. The exact Coma CPS syntax and `ck` treatment do not carry over; Rust ownership and Verus’s executable/spec separation must be respected.

## technique: lower unstructured assembly through a dominator tree
The assembly case study annotates x86-64 `sortbits` with two loop invariants and a final assertion that the population count is preserved (Section 7, p. 197). The tool parses the code and annotations, builds a control-flow graph, computes the dominator tree, and emits Coma code that follows the dominator tree, so “we do not need to repeat the outer invariant in the inner loop for variables that are not modified”; “Each invariant is translated into an assertion followed by a barrier” (Section 7, p. 198). Conditional jumps become calls of the primitive `if`, unconditional jumps become handler calls, and instructions such as `andn` use the authors’ Why3 model of a fragment of the x86-64 instruction set (Section 7, p. 198). Why3 splits the VC into 5 proof tasks—“two instances of invariant initialization, two instances of invariant preservation, and the final postcondition”—automatically proved by Z3 and Alt-Ergo (Section 7, p. 198).

Steps (Section 7, p. 198): (1) parse annotated assembly; (2) build the control-flow graph; (3) compute dominators; (4) nest handlers according to the dominator tree; (5) translate invariants into assertion/barrier pairs; (6) translate jumps and instructions using a logical instruction model; (7) compute the VC and discharge the tasks. The example proves only population-count preservation: “we do not show that bits are indeed sorted” (Section 7, p. 197).

## evidence, limitations, and product relevance
The benchmark used the Creusot test suite: of the Rust files that did not change when Creusot switched from Why3 to Coma (235 files), files whose absolute VC-generation-time difference “was smaller than the sum of two standard deviations” were excluded, leaving 33. Coma’s VC generator was faster than Why3’s on all but one of those 33, and “For a third of the tests, Coma was more than 50% faster” (Section 5, p. 194). The denominator is the 33 retained files, not all 235.

Stated limitations: VCs are for partial correctness; termination needs variants (Section 4, p. 191). An OCaml exception carrying closures that may raise the same exception cannot be given a finite type in Coma (Section 2, p. 184). Pre-write annotations are not inferred for higher-order outcomes (Section 5, p. 193). Ghost code has no special treatment yet (Section 6, p. 196).

Inference: the proof-task counts (44 and 5) measure decomposition, not confidence. Trusted components include the Why3 logic, SMT solvers, instruction model, parser and translation, and the specifications themselves. For agent-written verified Rust, a wrong barrier placement, ghost predicate, instruction model, or inferred contract can yield a valid proof of the wrong claim. The paper’s abstraction boundaries and dominator-based lowering do not establish that a generated specification matches product intent.

The authors state: “To our knowledge, no deductive verification system features explicit abstraction barriers in the style of Coma” (Section 8, p. 199).

## techniques for the catalog
- explicit abstraction barriers: expose assertions to callers while checking hidden implementation once under those assumptions
- continuation postcondition wrappers: encode a result postcondition as an assertion on the continuation receiving that result
- recipe-based VC generation: translate to higher-order recipes, evaluate to first-order formulas, and factor repeated subgoals
- caller/callee VC modes: separately compute call-site obligations and implementation obligations, or combine them in full mode
- contract extraction by neutralization: instantiate continuation recipes to derive preconditions and postconditions
- CPS ghost predicates: specify higher-order continuations with ghost predicates and lexicographic termination variants
- dominator-guided invariant lowering: nest handlers by control-flow dominators so loop invariants are asserted once at the right scope
