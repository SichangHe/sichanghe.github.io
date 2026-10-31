# RustyDL: A Program Logic for Rust
(authored by agents unless marked 🧑)
Tag: `drodt2026rustydl`, [paper](https://arxiv.org/abs/2602.22075)

## scope and result

RustyDL is a source-level dynamic logic and sequent calculus for a safe-Rust subset. The paper's claim is that a human-in-the-loop (HIL) calculus can model ownership, references, arrays, integer overflow, loops, and calls without translating Rust to an intermediate language. The implementation is a KeY prototype. The calculus works on the Rust compiler's high-level intermediate representation (HIR), which the paper describes as "close to source-level Rust but with macros expanded and some structures like the different forms of loop normalized" (Sec. 3.1, p. 8). The authors state: “We presented RustyDL, a dynamic logic for a subset of Rust, as well as a sequent calculus to prove validity of RustyDL formulas.” (Sec. 5, p. 17)

The supported fragment is compiler-approved Rust with primitive values, shared and mutable references, and arrays; structs and enums are said to be modelable similarly, while unions, smart pointers, and traits are future work (Sec. 2, p. 2). Unsafe Rust is assumed encapsulated ("confined to a part of the code that may be analyzed and verified separately") rather than modeled. The paper says the rules "have been proven sound relative to a formal semantics [14] in ongoing work" (Sec. 3, p. 8); that proof is not in this paper.

## technique: source-level symbolic execution

What it is. RustyDL embeds a Rust fragment in dynamic-logic modalities and repeatedly rewrites the next expression into updates and simpler modalities. The calculus has ordinary propositional and first-order rules plus schematic symbolic-execution rules. The `ifElseSplit` rule makes two premises, one with the guard true and one false; `unfoldIfElse` first binds a complex guard to a fresh variable. Copy assignments become an update and unit expression, and update simplification substitutes values. The paper's worked example turns `x = x + y; y = x - y;` into updates and then the arithmetic formula `x + y - y = z` (Sec. 3.2, pp. 8–10; Example 5 ignores overflow).

How to apply it. Start with a sequent whose modality contains the Rust statements and desired postcondition. Match the next construct with the appropriate rule. For conditionals, split paths; for copy assignments, accumulate `{x := t}`; remove side-effect-free expression statements; simplify updates; finish with first-order arithmetic or other background theories. A proof engineer can inspect and intervene at every sequent, which is the HIL benefit. Inference: a Verus front end could expose analogous path splitting through `if` branches and let SMT discharge the resulting arithmetic, but Verus does not expose RustyDL's dynamic-logic update calculus as a user-visible proof language.

Evidence and limits. The prototype was “able to manually and automatically prove a number of examples showcasing several Rust features” and verified binary search "creating a proof of 4260 rule applications in 2.1 seconds" (Sec. 3.8, p. 16). Inference: this is one example, not a success rate. The authors argue "the core is trustworthy and the implementation faithfully reflects the calculus rules above" because KeY is "time-proven", and they state: “The proof system is not foundational; we rely on theories of integers, sequences, etc.” (Sec. 3.8, p. 16). Inference: the rules and their implementation are therefore trusted relative to those theories.

## technique: ownership by anonymizing moves

A move of a non-`Copy` value invalidates the source variable. Instead of carrying an explicit uninitialized value and testing every access, the `move` rule assigns the destination the source and assigns the source a fresh constant of its type. The fresh constant deliberately says nothing about the moved-from value. The paper argues that explicit uninitialized values would require testing every variable on each access, similar to problems with many-valued logic; fresh constants avoid this. Later uses of the source are unconstrained (Sec. 3.3, p. 10).

To use it, classify the right-hand side as `Copy` or non-`Copy`; use the copy rule for the former, and for the latter add parallel updates `{x := y ∥ y := c}` with fresh `c`. Inference: Verus's ownership checker already rejects many use-after-move programs before verification. The closest Verus proof-level analogue is to let Rust typing enforce the move and avoid representing the moved-from value; the fresh-constant encoding is useful only if a translation needs an explicit logical state.

## technique: references without a loan ghost variable

RustyDL trusts the compiler's borrow checker instead of re-implementing active loans. Shared borrow `x = &y` is represented as `x := sref(y)`, preserving the value at borrow time; dereferencing simplifies `*sref(t)` to `t`. Mutable borrow `x = &mut y` is represented as `x := mref(T_y^W)`, where the term names the lender place. Reading uses a state-dependent dereference operator; writing through `*x` uses a mutating update `x ∗→ t`, which is later converted to an elementary lender update when the lender is known. The paper's example reduces `x = 1; y = &mut x; *y = 3` to `x := 3` while retaining the reference term (Sec. 3.5, pp. 11–13).

Steps are: trust compiler borrow validity; encode shared borrows with the current value; encode mutable borrows with a lender place; translate reads through the appropriate dereference operator; translate writes to mutating updates; simplify mutating updates into lender assignments. Inference: Verus usually writes specifications over ordinary values and uses `&mut` in executable code; a direct RustyDL `mref` term has no standard Verus construct. A Verus encoding should state the pre/post relation for the mutable reference and use `old(...)` where the pre-state is needed, rather than inventing `invariant(...)` calls or unsupported permission keywords.

The assumption is significant: lifetimes are omitted, and the logic handles only compiler-approved safe fragments. The compiler, rather than RustyDL, guarantees that borrow aliases are legal.

## technique: checked integer semantics and array safety

For debug-mode integer semantics, an addition to `u32` splits into an in-range branch that updates `x` and an out-of-range branch that becomes `panic!()`. The predicate `inU32` checks the bounds 0 through 2^32−1. Release-mode wrapping is outside the chosen verification semantics (Sec. 3.4, p. 10–11). Inference: a Verus proof should state arithmetic bounds in `requires` and prove them before arithmetic, because this paper's explicit panic branch is a logic rule rather than a Verus syntax feature.

Arrays are modeled with typed `get` and `set` functions over an abstract `Field` sort; `idx(i)` maps an integer index to a field. Read and write rules each split into an out-of-bounds panic branch and an in-range update branch. The worked term `get(set(set(a,idx(i),1),idx(j),2),idx(i))` yields 2 when `i=j`, otherwise 1 (Sec. 3.6, pp. 13–14). Inference: Verus arrays and sequences can express the same functional relation with `seq![...]` or array-index specifications, but bounds obligations must be written in Verus's supported expression language.

## technique: loop scopes and invariants

The paper says the Rust compiler translates all loops to unconditional loops, so the invariant rules of Hoare, Dijkstra, or JavaDL, which "make a case distinction based on the guard's value", are unsuitable: no loop guard can be extracted. RustyDL uses the loop scope concept of Steinhöfel and Wasser [31] (Sec. 3.7), an auxiliary statement `⟳x body ⟲` with a fresh Boolean index variable `x`: exiting through `break` sets `x=true`; otherwise `x=false`. The loop invariant rule first proves the invariant initially, then symbolically executes one generic iteration under an anonymizing update that forgets variables written by the body. It proves the postcondition when `x=true` and re-establishes the invariant when `x=false` (Sec. 3.7, pp. 14–16).

The paper's product loop uses `inv ≡ n = a·(old_b−b) ∧ b ≤ old_b`, then simplifies the break branch to `n = a·old_b` (overflow ignored, Example 10). To apply this method: choose an invariant covering initialization and one iteration; introduce the loop scope; execute body rules; handle break/continue by setting `x`; split exit and continue obligations; discharge arithmetic. Inference: this maps directly to a Verus `while` invariant containing the product relation, with `invariant` clauses on the loop and `old_b` as a copy of `b` made before the loop (a plain program variable in the paper's Listing 2). Verus's syntax is a loop annotation, not RustyDL's modality.

## technique: contracts and termination witnesses for calls

A function contract is `(pre, post, trm)`, with an optional termination witness. The call rule first proves `pre` after binding actuals to formals, and for recursion proves that `trm` decreases in a well-founded relation. It then assumes `post`; mutable-reference parameters receive an anonymizing update assigning fresh values to possibly changed lender places. This avoids inlining, which cannot handle unbounded recursion and can cause state explosion (Appendix B, pp. 21–23).

To apply it: write pre/post formulas over arguments and result; prove the callee contract separately; at each call prove precondition and, for recursion, strict decrease; apply postcondition; forget mutable-reference side effects except those specified. Inference: Verus uses `requires`, `ensures`, and `decreases` clauses and verifies recursive calls with a decreasing measure. The paper's contract decomposition transfers closely, but its update notation and `trm` syntax do not.

## techniques for the catalog

- source-level symbolic execution — split control flow and rewrite Rust statements into logical updates until first-order goals remain
- anonymizing move semantics — model moved-from non-`Copy` values with fresh unknown constants
- lender-place mutable references — encode `&mut` reads and writes through state-dependent and mutating updates
- checked arithmetic and array rules — branch on overflow or bounds and expose panic obligations
- loop scopes — use a Boolean exit marker plus invariant preservation for break/continue loops
- contract calls with decreases — verify preconditions, postconditions, mutable side effects, and well-founded recursive descent
