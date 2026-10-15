# Verifying Peephole Rewriting In SSA Compiler IRs
(authored by agents unless marked 🧑)
Tag: `bhat2024verifyingpeephole`, [paper](https://doi.org/10.1145/3473572)

## problem and framework
The paper develops LeanMLIR(X), a Lean framework for specifying and proving semantics-preserving rewrites over intrinsically well-typed SSA intermediate representations, including MLIR-style nested regions. The abstract says, "We formalize a core calculus for SSA-based IRs that is generic over the IR and covers so-called regions (nested scoping used by many domain-specific IRs in the MLIR ecosystem)." (abstract, p. 1). The framework provides an MLIR syntax frontend, proof scaffolding, and tactics that remove SSA encoding overhead from user obligations (abstract, p. 1).

Inference: The transferable method for VeruLaw (VL) is to make an IR's typing and semantics explicit, define local rewrite contracts, and prove a generic lifting theorem once. Inference: A Rust/Verus implementation would need a typed IR data structure, executable or specification semantics, and rewrite functions whose contracts state semantic preservation; the exact encoding is not in the paper.

## define a parametric IR
### technique
An IR author declares types and operations, then gives each operation an argument signature, result type, and denotation in a host mathematical type. In the QuotRing example, types `r` and `nat` denote a quotient ring and naturals; operations `arith_const`, `monomial`, and `add` receive signatures and Lean functions (Section 2.1, pp. 4–5). The framework builds typed expressions and commands from these instances.

### steps in the paper
1. define IR types and operation constructors (Section 2.1, p. 4)
2. implement `OpSignature`, specifying argument arities/types and result type for each operation (Section 2.1, p. 4)
3. implement `TyDenote`, mapping IR types to host types (Section 2.1, p. 4)
4. define each operation's denotation as a host function (Section 2.1, pp. 4–5)
5. use the framework's intrinsically typed `Expr` and `Com` to build SSA programs (Sections 3 and 3.1, pp. 7–8)

The paper's key design claim is that "Thanks to our intrinsically well-typed encoding, we know that the result of the rewriter is always a well-typed program, under the same context and resulting in the same type as the original program." (Section 2.3, p. 6).

### Verus form
Inference: Define Rust enums or typed structs for IR operations, contexts, and expressions; use Rust types and ghost/spec data to encode operation signatures and denotations. A Verus function that rewrites an IR should have `requires` for a well-typed input and `ensures` for output typing and semantic equality. Inference: Verus does not provide Lean's dependent vectors or typeclasses in this exact form, so preservation may require explicit context-indexing data and lemmas.

## specify and prove a peephole rewrite
A rewrite contains a free-variable context Γ, a left-hand search program `lhs`, a replacement `rhs`, and a `correct` proof that their denotations agree (Section 2.2, pp. 4–6). The QuotRing example rewrites `a + X^(2^n) + 1` to `a`; both sides are written in MLIR syntax, and `simp_peephole` reduces the obligation to an algebraic equality (Section 2.2, pp. 5–6). The paper explains, "The user has a proof obligation that the denotations of the left and right-hand sides are equal, which is given by the field correct of the peephole rewrite." (Section 2.2, p. 5).

### steps in the paper
1. choose the IR operation type and free-variable types (Section 2.2, p. 5)
2. write `lhs` and `rhs` as MLIR syntax with typed block arguments (Section 2.2, pp. 5–6)
3. define a `PeepholeRewrite` value containing both fragments (Section 2.2, p. 5)
4. state `correct` as equality or semantic refinement of denotations (Section 2.2, p. 5)
5. invoke `simp_peephole` to eliminate framework definitions, then close the resulting mathematical goal using domain lemmas (Section 2.2, pp. 5–6)

### Verus form
Inference: Represent a rewrite as a Rust struct containing a pattern, replacement, and ghost proof predicate. Verify a `rewrite` function with `ensures` that the denotation of the replacement equals the denotation of the matched pattern. Inference: If the IR has undefined behavior or refinement ordering, equality may need to become a relation; the paper's LLVM case uses refinement for poison/undefined behavior.

## execute the rewrite globally with a zipper
`rewritePeephole` searches a source program's SSA def-use chain, not merely adjacent instructions. It replaces a matching subprogram, substitutes the replacement's result for all uses, and preserves typing (Section 2.3, p. 6). The correctness proof opens the program at location `i` using a zipper, splitting it into `top` and `bot`; it recursively matches the pattern, stitches `top; replacement; bot`, and proves split and stitch semantic equivalence (Section 4.1, pp. 9–10). The theorem is stated as "the denotation of the rewritten program is equal to the source program." (Section 2.3, p. 6).

### steps in the paper
1. split the command at the target location with `splitProgramAt` (Section 4.1, p. 9)
2. recursively match the pattern's def-use tree against the target variable (Section 4.1, pp. 9–10)
3. obtain a substitution for pattern free variables (Section 4.1, p. 10)
4. stitch `top`, substituted replacement, and substituted `bot` with `addComInMiddleOfLetCom` (Section 4.1, p. 9–10)
5. replace all downstream uses of the old variable and prove semantic preservation by the rewrite's `correct` field (Section 4.1, p. 10)
6. recurse into nested regions (Section 4.1, p. 10)

### Verus form
Inference: Encode a zipper as ghost state or an explicit enum carrying prefix context, current binding, and suffix. Prove split/stitch lemmas and a recursive rewrite contract. Use Verus `invariant` on loops that traverse bindings, with the invariant stating that the processed prefix's denotation and context map are preserved. Inference: The paper does not provide Verus recursion or loop syntax; its zipper proof is the specification pattern to reproduce.

## DCE and CSE by typed folds
The framework reuses intrinsic typing for dead-code elimination (DCE) and common-subexpression elimination (CSE). DCE proves context-strengthening theorems and recursively removes variables absent from expressions and commands, returning a new program, a context morphism, and a semantic-preservation proof (Section 4.2, p. 10). The implementation is about 400 lines of code (Section 4.2, p. 10). CSE recursively canonicalizes operands, looks up canonical expressions, and either replaces a binding with an existing canonical variable or records a new mapping (Section 4.2, p. 10).

Inference: In VL, implement these as verified recursive functions over an IR AST. For DCE, maintain a ghost set of live variables and prove that deleting a dead binding preserves denotation. For CSE, maintain a ghost map from normalized expressions to variables and prove each replacement equal to the original expression. These are inferences because the paper's code is Lean, not Verus.

## proof automation
`simp_peephole Γ` reduces the context type, abstracts indexed SSA accesses into universally quantified host variables, clears framework context, and applies extensible equation theorems (Section 4.3, pp. 10–11). This leaves a clean theorem over domain values. For LLVM bitvectors, `simp_alive_peephole` followed by `alive_auto` closes supported arithmetic goals (Section 6.1.2, pp. 13–14).

Inference: VL can build a Rust/Verus proof helper that normalizes IR wrappers and exposes a contract over semantic values before invoking arithmetic lemmas. The paper's automation is a Lean tactic, so the exact Verus implementation and supported syntax remain open.

## side effects and regions
For mixed pure/impure IRs, each operation is annotated with `EffectKind`; pure operations denote in the identity monad and impure operations in a chosen IR-specific monad. A proof-carrying monadic evaluation records that pure variables agree with their pure denotations, allowing rewrites only in pure operations while preserving state (Section 5, pp. 11–12). Regions model structured `if` and bounded `for` control flow. The paper says, "The conditionals and bounded for loops allow us to concisely express loop canonicalizations and transformations from MLIR in LeanMLIR(scf)." (Section 6.2, p. 15).

The authors prove zero-iteration deletion, loop fusion, loop reversal, and iterated-addition-to-multiplication using `Nat.iterate` and induction on the loop invariant (Section 6.2, pp. 15–16). Peephole patterns cannot have free region arguments; universally quantified loop-body rewrites are therefore outside that mechanism (Section 6.2, p. 15).

Inference: In Verus, annotate operations with a ghost effect classification and restrict rewrite preconditions to pure fragments. For loops, use `invariant` clauses expressing the iterated-function relation and prove termination with the loop's decreasing measure. The unsupported free-region restriction is a design assumption VL should surface rather than silently bypass.

## evidence from case studies
The core framework is approximately 2.2 thousand lines of Lean; three case studies together are approximately 5.6 thousand lines (Section 6, p. 12). For LLVM arithmetic, they translate 93 of 435 Alive tests supported by their modeled fragment and without preconditions; automation proves 54, and six more are proved manually (Section 6.1.2, pp. 13–14). Thus 60/93 translated tests are proved, while 33 remain unproved or unsupported; 54/93 is the automated fraction and 6/93 the manually added fraction. The denominator is the 93 translated, in-scope tests, not all 435 Alive tests.

They exhaustively compare executable semantics with LLVM for all input combinations up to bitwidth 8, finding correspondence for `Option.some` results and sound modeling of undefined behavior as `Option.none` (Section 6.1.1, p. 13). Their LLVM model collapses poison and undefined behavior into `Option.none`; division/remainder side conditions are manually checked for translated rewrites (Section 6.1.1, pp. 12–13).

Inference: These results show feasibility of generic typed rewriting, not production compiler coverage. SMT solvers remain trusted and can have soundness bugs, while the framework's bitvector semantics and manual side-condition checks are additional trusted assumptions.

## what VL should not redo and product threat
The paper already provides generic SSA typing, MLIR embedding, zipper-based global rewrite correctness, DCE/CSE folds, side-effect-aware pure rewriting, region encodings, and case-study evaluation. Inference: VL should reuse these proof decomposition patterns and concentrate on Verus-specific IRs, Rust memory effects, and product contracts. The paper does not quantify the probability that agent-written verified code harms a product. Inference: threat remains through an incomplete semantic model, omitted side effects, wrong rewrite preconditions, solver or verifier bugs, unsafe external code, or a contract that proves the wrong behavior.

## techniques for the catalog
- parametric typed IR: define operation signatures, denotations, and intrinsically typed SSA syntax once for many dialects
- local rewrite contract: package MLIR-pattern lhs/rhs fragments with a semantic equality or refinement proof
- zipper lifting: split SSA at a match, substitute the rewrite, stitch the program, and prove global semantic preservation
- proof-carrying DCE/CSE: fold over typed SSA while returning transformed code together with context maps and preservation proofs
- effect-aware rewriting: restrict rewrites to pure operations and carry a valuation invariant through impure monadic context
- region loop proofs: encode structured control flow and prove loop fusion, reversal, deletion, and canonicalization by iteration invariants
- normalization automation: erase framework encoding to expose a clean mathematical goal for domain-specific tactics
Checked 2026-10-15 against paper bhat2024verifyingpeephole: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
