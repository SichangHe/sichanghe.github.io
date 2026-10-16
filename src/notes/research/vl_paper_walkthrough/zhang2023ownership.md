# Ownership guided C to Rust translation
(authored by agents unless marked 🧑)
Tag: `zhang2023ownership`, [paper](https://doi.org/10.1007/978-3-031-37709-9_22)

## problem and approach

Zhang et al. present Crown, a static-analysis-guided translator from C to safer Rust. Its input is c2rust-like Rust containing raw pointers. Crown infers where each pointer owns memory, whether it is mutable, and whether it is an array pointer; it then retypes pointers and rewrites their uses. The stated motivation is that direct syntax translation preserves C's unsafe pointers. The paper says: “The translation does not synthesise an ownership model and thus is not able to do more than replicating the unsafe use of pointers in C.” (Section 1, p. 1). Crown instead “The resulting tool, Crown, scales to real-world codebases (half a million lines of code in less than 10 seconds) and achieves a high conversion rate.” (Abstract, p. 1).

The central assumption is ownership monotonicity. Along an access path, ownership can only decrease: if `p` is a prefix of `q`, `O_p >= O_q`. This stronger-than-Rust restriction avoids a full alias analysis. The authors define it as: “Given two access paths p and q, if is prefix(p, q), then Op ≥ Oq.” (Definition 1, Section 5.1, p. 8). Inference: this is a useful pre-verification normalization for VL when importing C, but it is not itself a functional proof; a Verus proof still needs contracts for behavior and memory effects.

## technique 1: infer ownership with access-path constraints

Use this when C pointers and pointer fields must be classified as owning or non-owning before producing safe Rust.

Steps from Sections 4 and 5 (pp. 7–12):

1. build MIR for the c2rust-translated program and enumerate access paths such as `p` and `(*p).next`
2. create a Boolean ownership variable for each path, one for owning and zero for non-owning
3. generate constraints for assignments, calls, allocation/free operations, control-flow joins, loops, and ownership monotonicity
4. represent joins with SSA-style φ constraints requiring ownership values to agree across incoming paths
5. solve the resulting 0/1 equalities with a SAT solver
6. reject programs with no satisfying ownership scheme, including detected C leaks or schemes violating monotonicity

The paper specifies the solver representation: “The ownership constraint system consists of a set of 3-variable linear constraints of the form Ov = Ow + Ou , and 1-variable equality constraints Ov = 0 and Ov = 1.” (Section 5.3, p. 11). It proves the constraint problem NP-complete and reports that a satisfying assignment is checked by compiling the resulting Rust because the authors do not formally prove the correspondence to all Rust semantics.

Assignment transfer follows Box move semantics. If `q` is assigned to `p`, ownership may move from every path rooted at `q` to corresponding paths rooted at `p`; the old path becomes non-owning. The analysis also forces the destination to be non-owning before reassignment, so an owning destination signals a C memory leak and is rejected. For loops, Crown analyzes the body once, then equates ownership status at loop entry and exit. For null checks, it inserts an explicit null assignment in the null branch so ownership is determined by the non-null branch.

Inference: Verus can use the inferred classification to choose executable representations (`Box`, `&mut`, or raw pointers) and to state ownership-sensitive contracts. It cannot import Crown's SAT result as a proof of functional correctness. A Verus implementation would prove each safe wrapper's `requires`/`ensures` and loop `invariant`; ownership facts that matter to behavior should be expressed as predicates or `proof fn` lemmas. Verus has no direct `Option<Box<T>>` requirement from this paper, so that representation is an implementation choice, not a paper result.

## technique 2: retype pointers and rewrite uses

Use this after ownership, mutability, and fatness analyses have produced qualifiers.

Steps from Section 6 (pp. 12–14):

1. classify a pointer globally as owning if it owns at any location in its scope
2. retype owning non-array pointers to `Option<Box<T>>`
3. retain non-owning local pointers as raw `*mut T` when lifetime analysis is unavailable; retype output parameters to `Option<&mut T>`
4. leave array pointers raw because Crown does not synthesize array metadata
5. rewrite each use according to the context: Box, mutable reference, shared reference, or raw pointer
6. use `take` for moves, `as_deref`/`as_deref_mut` for non-consuming borrows, `as_ref`/`as_mut` for raw-pointer conversion, and `Box::from_raw` where required
7. introduce `to_raw` to convert a safe optional box back to a nullable raw pointer
8. compile the result and revert culpable Box pointers to raw pointers if the analysis missed a use-after-move condition

The retyping table maps owning pointers to `Option<Box<T>>` and non-owning pointers to `*mut T` or `Option<&mut T>`. The paper explains the helper: “as_deref_mut converts &mut Option<Box<T>> to Option<&mut T>.” (Section 6.2, p. 14). The singly-linked-list example changes `next` and `head` to `Option<Box<Node>>`; output `list` becomes `Option<&mut List>`. The bzip2 example transfers list ownership through `aa` and `aa2`, frees `name`, and leaves the array pointer raw.

Inference: for Verus, safe pointer retyping can reduce the unsafe surface before verification, but Verus proofs should target the rewritten Rust's actual ownership and alias behavior. Raw-pointer uses need a Verus-supported abstraction and explicit proof obligations; merely compiling safe Rust does not establish data-structure invariants. `Box::from_raw` and foreign allocation boundaries remain trusted or require modeled contracts.

## evidence and denominators

The evaluation uses 20 benchmarks, from 154 to 537,723 lines of C, on Rust nightly-2023-01-26, c2rust 0.16.0, Z3 bindings 0.11.2, an eight-core Apple M1 with 16 GB RAM. The authors report median Crown reductions of 37.3% of mutable non-array raw-pointer declarations and 62.1% of raw-pointer uses across the 20 benchmarks. These percentages are medians over the benchmark rows, not fractions of all pointers. Crown reaches 100% declarations and uses for avl, bst, buffer, and ht; for the largest benchmark, brotli (846 declarations and 3,686 uses), reductions are 21.4% and 20.9%. The paper says: “The median reduction rates achieved by Crown for raw pointers and raw pointer uses are 37.3% and 62.1%, respectively.” (Section 8.1, p. 17). Six benchmarks with test suites (libtree, rgba, quadtree, urlparser, genann, buffer) pass all provided tests. The complete analysis and rewrite run in 60 seconds or less for the whole suite.

The comparison with Laertes uses the same table but is not a proof comparison: Laertes is a search guided by compiler errors, whereas Crown uses ownership constraints. All translated benchmarks compile under the stated compiler. Compilation and tests establish syntax/type acceptance and those test cases' behavior, not full semantic equivalence for all inputs. Inference: the product threat is partial safety and false confidence. Crown leaves raw pointers for arrays, unsupported allocators, function pointers, unions, variadic calls, and local mutable borrows; it may also reject valid Rust ownership because monotonicity is stricter than Rust. A Verus pipeline that starts from Crown output must measure the residual unsafe surface and separately prove contracts for the translated algorithms.

## assumptions, failures, and trust boundary

Crown assumes one owner per allocated object and uses monotonicity instead of precise alias analysis. It does not support function-pointer constraints, non-standard memory managers, splitting one allocation into multiple regions, pointers that may refer to stack or heap, or array metadata synthesis. The authors state: “Crown’s translation will attempt to rewrite a variable as long as there exists a constraint involving it. As a result, the translation is in theory neither sound nor complete.” (Section 7.2, p. 15). Unions and variadic arguments can crash the tool; three Laertes benchmarks were excluded for this reason. Lifetime analysis is absent, so local mutable borrows remain raw pointers. The Rust compiler is used as a post-translation check, and the SAT assignment itself is not formally shown to satisfy all Rust semantics.

What is proved: the paper proves properties of its ownership-constraint rules, including unique-owner preservation under monotonicity, and empirically compiles generated Rust. What remains trusted: c2rust preprocessing, Crown's MIR analyses and rewrite implementation, the Rust compiler, standard-library behavior, foreign allocators, the correctness of the monotonicity assumption for each program, and the user's intended C semantics. Inference: Verus can narrow this trust boundary by proving translated functions against explicit specifications, but cannot prove unmodeled C library or hardware behavior automatically.

## prior work VL should not repeat

Crown already provides an ownership-analysis-to-retyping workflow, SAT constraints, handling for loops and nulls, and measured C-to-Rust conversion rates. A VL contribution should not claim that replacing raw C pointers with Boxes is novel. Inference: a useful extension is to verify Crown's rewritten data structures in Verus and report which inferred ownership constraints become executable proof invariants, which unsupported raw-pointer cases remain, and how proof effort changes across dependency revisions.

## techniques for the catalog

- ownership-monotonicity analysis — model pointer access paths with Boolean ownership variables, constrain transfers and aliases, and solve the constraints with SAT
- ownership-guided pointer retyping — map owning paths to `Option<Box<T>>`, output parameters to mutable references, and preserve unsupported arrays or lifetimes as raw pointers
- context-sensitive use rewriting — rewrite moves, borrows, raw conversions, and dereferences with `take`, `as_deref_mut`, `as_ref`, `as_mut`, and `Box::from_raw`
- loop and null ownership handling — analyze loop bodies once with entry/exit equalities and make null branches explicit so ownership constraints remain consistent
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
