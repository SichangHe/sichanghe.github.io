# Counting Immutable Beans: Reference Counting Optimized for Purely Functional Programming
(authored by agents unless marked 🧑)
Tag: `ullrich2019immutable`, [paper](https://arxiv.org/abs/1908.05647)

## what the paper establishes

Ullrich and de Moura design and implement a reference-counting runtime and compiler for Lean's eager, purely functional intermediate representation. The paper's central engineering claim is that explicit reference counting can support functional programs efficiently when the compiler (i) reuses a dead, unique constructor cell, (ii) avoids counter traffic for safe borrowed references, and (iii) avoids atomic operations for values that have not crossed a thread boundary. The authors state that “We propose a new mechanism for efficiently reclaiming memory used by nonshared values, reducing stress on the global memory allocator.” (abstract, PDF p. 1.) They give a formal big-step semantics for the reference-counted IR, but a compiler correctness proof is reported only as work in progress: “Finally, we are working on a formal correctness proof of the compiler described in this paper, using a type system based on intuitionistic linear logic to model owned and borrowed references.” (Section 10, PDF p. 12.)

For VeruLaw, the useful lesson is a compiler-and-runtime proof decomposition: specify ownership and sharing invariants at an IR boundary, then separately prove transformations preserve them. The paper is about Lean runtime performance, not Verus or Rust. Every transfer to Verus below is therefore an inference.

## technique 1: explicit owned reference counting

What it is. The intermediate language starts with a pure A-normal-form IR and adds `inc`, `dec`, `reset`, and `reuse`. A heap maps locations to values and positive counters. An owned reference consumes one counter token; a borrowed reference promises that an enclosing owned reference keeps the object alive. The paper's examples make the accounting executable: `mkPairOf x = inc x ; let p = Pair x x ; ret p` increments because two tokens for `x` are consumed, while `fst x y = dec y ; ret x` drops the unused argument (Section 2, PDF p. 2).

When to use it. Inference: use explicit counters when values are acyclic and immediate reclamation or uniqueness-sensitive updates matter. The authors note “in Lean and λ pure , it is not possible to create cyclic data structures. Thus, one of the main criticisms against reference counting does not apply.” (Section 1, PDF p. 1.) Inference: plain counting is unsuitable for cyclic heaps without an additional cycle scheme; the paper only says it “believe[s] our approach can be extended to programming languages that support cyclic data structures because it is orthogonal to traditional cycle-handling techniques” (Section 10, PDF p. 12).

How to apply it.

1. Start from the pure IR `λ_pure`, an untyped A-normal-form language with `let`, `case`, constructor, projection, call, and partial-application forms, in which functions are lambda-lifted, dead and trivial bindings are removed, and names are distinct (Section 3, PDF pp. 3–4).
2. Treat each owned argument as a token that the callee must consume by returning, storing, passing onward, or `dec` (Section 2, PDF p. 2).
3. Insert `inc` before an owned use unless it is the last use of an owned variable; insert `dec` for an owned variable after its last use (Section 5.3, PDF pp. 6–7). A `dec` on a unique value removes it from the heap and recursively decrements its components (Section 4, PDF p. 4).
4. Define semantics over a context and mutable heap. The paper's `Inc` and `Dec` rules update counters, and `dec` recursively frees a constructor or partial application when its count is one (Figure 2, PDF p. 5).
5. Maintain the stated invariant: “The reference counters of live values should always be positive; dead values are removed from the heap map.” (Section 4, PDF p. 4.)

Verus form (inference). Model the heap and counters in executable Rust structs, expose a `requires`/`ensures` contract for each counter operation, and prove a `view` or ghost abstraction that relates the concrete heap to a mathematical ownership map. Use `assert`, `assert forall`, `requires`, and `ensures` in proof functions; do not make proof code executable. A `dec` contract should state that a positive count decreases, and that zero-count removal recursively preserves the child-count invariant. Rust ownership can enforce some alias discipline, but it does not by itself prove the paper's runtime counter semantics.

Evidence and limits. The semantics is formal, but compiler correctness is not reported as proved. The implementation is in Lean and, at the time of writing, “the compiler supports only one backend where we emit C code” (Section 8, PDF p. 9). Thus evidence supports a working design, not a verified compiler. The runtime assumes no cycles in the pure data representation and represents partial applications as `pap` cells whose argument count is not known statically, so `inc`/`dec` of their arguments is done by the semantics rather than by explicit instructions (Section 4, PDF p. 4).

## technique 2: reset/reuse destructive update for pure code

What it is. `reset x` tests whether `x` is unique. If unique, it decrements the old constructor's children and returns its storage as a reusable token; `reuse token in ctor_i y` writes a constructor of matching arity into that cell. If `x` is shared, reset behaves like `dec` and returns a special reference, and reuse allocates normally (Section 4, Figure 2, PDF pp. 4–5). This realizes the “resurrection hypothesis”: “many objects die just before the creation of an object of the same kind.” (Introduction, PDF p. 1.)

When to use it. Apply it to functional transformations such as `map`, zippers, red-black-tree insertion, and compiler term rewriting where an input becomes dead immediately before a same-shape result is built. Do not fuse reset and reuse blindly: the paper says it “is not a good idea, in general, to fuse reset and reuse into a single instruction”, because in `map` the reference counter of the tail `s` would be greater than 1 even if the counter of `xs` was 1, so no reuse would occur in the recursive call (Section 2, PDF p. 3).

How to apply it.

1. Find a `case x` arm and locate the first point after which `x` is dead, i.e. not used in the remaining body (Section 5.1, PDF pp. 4–6).
2. Insert `let w = reset x` at that point.
3. Search the remaining code for a constructor `let z = ctor_i y` whose argument count equals the matched constructor's field count `n`, and replace it with `let z = reuse w in ctor_i y`; `reset` is inserted only if such a substitution exists (Figure 3, PDF p. 5). The text says that `w` may occur at most once per control path, in a `reuse` or in `dec w`, and that `dec w` is used on paths where `w` cannot be reused (Section 5.1, PDF p. 4); Figure 3 as printed does not show how that `dec` is inserted.
4. Repeat recursively through `let` and `case`; the paper's `D` finds the dead point and `S` performs the substitution (Section 5.1, Figure 3, PDF p. 5).
5. Preserve separate `inc` operations on projections that remain live. The paper's `map` example increments head and tail, resets the list, calls `f` and recursively maps, and reuses the list cell (Section 2, PDF p. 3).

Verus form (inference). Represent a reusable cell with a ghost uniqueness predicate and an executable enum for constructors. Give `reset` a precondition that the cell's abstract count is one and an `ensures` clause returning a token plus a heap whose children have been released. Give `reuse` a precondition that the token's cell capacity matches the constructor arity and an `ensures` clause restoring the constructor invariant. A Verus proof should establish that the optimization preserves an extensional list/tree specification; the paper's dynamic counter is not a substitute for a Rust borrow proof.

Evidence and limits. In the Lean benchmark table, disabling reuse (`-reuse`) raises normalized geometric-mean runtime from 1.24 to 1.74, and `const_fold` rises from 1.00 to 1.64; `rbmap` rises from 1.00 to 3.23 and `unionfind` from 1.00 to 1.41 (Figure 6, PDF p. 10). The paper says reset/reuse “significantly improve performance in the benchmarks const_fold, rbmap, and unionfind” (Section 8, PDF p. 10). Timings are arithmetic means of 50 runs on an i7-3770 with 16 GB RAM, Ubuntu 18.04, Clang 9.0.0 (Section 8, PDF p. 9); the “geom. mean” row is a geometric mean over the nine rows. The effect is workload dependent: `binarytrees` changes from 1.00 to 0.98, and both digits carry the squiggly marker, which the Figure 6 caption defines as “Digits whose order of magnitude is no larger than that of twice the standard deviation”. The procedure is described as “a heuristics-based implementation” (Section 5.1, PDF p. 4). Section 6 notes that in the red-black tree `balance1` some constructor applications are “not guarded by reuse” (PDF p. 8), so opportunities can be missed.

## technique 3: infer borrowed parameters and insert counter operations

What it is. A function signature maps each parameter to Owned (`O`) or Borrowed (`B`). Borrowed parameters do not update the counter and must be kept alive by an owned reference. The paper says “we must never mark x as borrowed if it is used by a let y = reset x instruction”, and that partially applying constants with borrowed parameters “is also problematic” because the value may escape the scope of the borrowed reference (Section 5.2, PDF p. 6). The inference starts with all parameters borrowed and iterates to a fixpoint: mark a parameter owned when it or a projection is used in a reset, or when it is passed to a function that takes an owned reference; the latter “is a heuristic and is not required for correctness” (Section 5.2, PDF p. 6).

How to apply it.

1. Set every function's signature to `B^n`.
2. Collect variables that occur in reset, owned calls, or owned applications. Figure 4's `collectO` traverses `let`, `case`, projections, calls, variable applications, and partial applications (Figure 4, PDF p. 6).
3. Mark collected parameters `O` (`β(c)_i := O` if `y_i` is collected); repeat until a fixpoint is reached. Mutual recursion is not covered, but the paper calls it a simple extension. For `hasNone`, the result is `β(hasNone) = B` (Section 5.2, PDF p. 6).
4. Insert counter operations with Figure 5's `C`, which processes formal parameters and actual arguments in parallel (Section 5.3, PDF pp. 6–7). `O_x^+` inserts `inc x` before an owned use, except when `x` is owned and not live after the use; `O_x^-` inserts `dec x` when `x` is owned and dead, and for a borrowed formal the `dec` of an owned actual argument is placed after the call (Figure 5, PDF p. 7).
5. Add an owned wrapper around partial applications whose callee has borrowed parameters, so that a borrowed value cannot escape the current scope; the `inc`/`dec` pass then converts between the two signatures (Section 5.2, PDF p. 6).
6. Refine the heuristic to keep tail calls intact: set `β(c)_i = O` whenever `c` occurs in a tail call `let r = c x; ret r` where `βl(x_i) = O`, since otherwise a `dec` is inserted after the call (Section 5.3, PDF p. 7).

Verus form (inference). Encode a borrow signature as a ghost sequence of ownership modes and prove each call against a contract saying which abstract permissions are consumed or retained. Rust `&T` can represent a non-owning borrow only while the owner's lifetime is statically available; a runtime counter and higher-order partial application need an explicit verified ownership object. Use `requires`/`ensures` and ghost state to show no borrowed value outlives its owner. Do not write `invariant(...)` as a call or use unsupported `modifies` syntax; the local Verus reference lists supported constructs.

Evidence and limits. Figure 6's `-borrow` column “disables borrow inference, assuming that all parameters are owned”, while borrow annotations on builtins are still honored (Section 8, PDF p. 10). Geometric-mean normalized time changes from 1.24 (base) to 1.27 (this digit carries the squiggly noise marker), while `binarytrees` rises from 1.00 to 1.14 and `deriv` from 1.00 to 1.16; `const_fold` falls from 1.00 to 0.90 (Figure 6, PDF p. 10; 50-run means, same hardware, Section 8, PDF p. 9). The paper says borrow inference “provides significant speedups in benchmarks binarytrees and deriv”. The inference is explicitly heuristic, and borrow annotations supplied manually by users are “always safe” (Section 5.2, PDF p. 6). Inference: the heuristic can be conservative.

## technique 4: thread-safe reference counting by reachability tags

What it is. Values carry a tag: single-threaded, multi-threaded, or persistent. Single-threaded counters use no memory fence; multi-threaded counters use the standard atomic scheme (relaxed fetch-and-add for increments, release/acquire around the deletion check for decrements, Section 7.2, PDF p. 9); persistent values are never deallocated. Before creating a task, `markMT` traverses reachable single-threaded values and tags them multi-threaded. The invariant is directional: from persistent values only persistent values are reachable, and from multi-threaded values only persistent or multi-threaded values are reachable (Section 7.1, PDF pp. 8–9).

How to apply it.

1. Default allocations to single-threaded.
2. Before `Task.mk f` or `Task.bind x f`, call `markMT` on `f` and `x`, so that every value reachable from them is tagged multi-threaded while only one thread can still access it (Section 7.1, PDF p. 9).
3. Traverse only single-threaded nodes; the reachability invariant ensures already multi-threaded subgraphs need not be revisited.
4. On `inc`/`dec`, inspect the tag and use atomic operations and fences only for multi-threaded values; the tag test needs no synchronization because the tag changes only before a value is shared (Section 7.2, PDF p. 9).

Verus form (inference). A state-machine proof can model the tag transition and task creation. Prove that every cross-thread edge is preceded by a transition to `Multi`, and that concurrent counter updates use an abstract atomic transition. Whether Verus's concurrency features can express this state machine was not checked here; the paper's C++ runtime, hardware memory model, and fences would remain trusted unless separately modeled.

Evidence and limits. Disabling the optimization (`-ST`, atomic operations for every value) raises geometric-mean normalized time from 1.24 to 1.89; `binarytrees` rises 1.00 to 1.22 and `deriv` 1.00 to 1.42 (Figure 6, PDF p. 10). `markMT` makes task creation not constant time: “it is proportional to the number of single-threaded values reachable from x and f . This does not seem to be a problem in practice”, and the authors propose a primitive `asMT g` if it becomes one (Section 7.1, PDF p. 9). The paper says of adapting the scheme to other threading libraries: “We just need to identify which functions may send values to other execution threads, and use markMT.” (Section 7.2, PDF p. 9.)

## what is proved, measured, and trusted

The formal object is the big-step semantics of `λ_RC`, including counter updates and reuse. The implementation and benchmark demonstrate performance, not a mechanized compiler-correctness theorem. Inference: the trusted base includes the Lean compiler/runtime implementation, C backend, C++ task runtime, atomic memory model, benchmark harness, and the adequacy of the hand-selected benchmark programs. The compiler correctness proof is work in progress, as quoted above. Timings are arithmetic means of 50 runs, but the paper reports normalized times rather than raw seconds in Figure 6; the cross-language table reports normalized wall time, GC percentage (for Lean, only object deletion time), and last-level-cache misses per second (Figure 7, PDF p. 11). The paper itself calls its results “preliminary” (abstract). Inference: the study therefore cannot claim that the optimization is universally faster or that generated code is verified.

Inference (own arithmetic): the “geom. mean” row of Figure 6 can be reproduced from the nine visible rows of each column (about 1.24, 1.74, 1.27, 1.89), so it is consistent with the displayed values. The paper's “Lean is 5x as fast as OCaml on const_fold” (Section 8, PDF p. 10) refers to cross-language normalized wall time (Figure 7, PDF p. 11), where the Lean base value is 1.00 and ocamlopt is 5.11 in that row. These are different settings from the `-reuse`, `-borrow`, and `-ST` ablations and must not be mixed. The paper also warns that “the absolute runtimes in Fig. 7 are influenced by many factors other than the implementation of garbage collection that make direct comparisons difficult” (Section 8, PDF p. 10).

## implications for VeruLaw

Inference: The most reusable idea is to make sharing and ownership explicit in an intermediate verified representation, then prove each lowering pass against a heap abstraction before optimizing runtime behavior. Inference: `reset/reuse` resembles a uniqueness-guarded destructive update and could reduce allocation in verified persistent data structures, but Verus proofs would need an extensional specification plus a uniqueness lemma. Inference: borrow inference could guide agent-generated Rust APIs, but a heuristic annotation is not a proof; every inferred borrow must be discharged against Rust lifetime and Verus permission obligations. Inference: the thread tags suggest a small state-machine layer for verifying when values may cross tasks. Inference: the product threat is moderate: these techniques improve runtime and compiler construction, but the paper leaves the compiler proof and C/runtime trust boundary open, so it does not by itself threaten VeruLaw's end-to-end verified Rust goal.

## what VL should not redo

The paper already supplies a formal RC semantics, a reset/reuse insertion algorithm, a borrow-signature fixpoint heuristic, an `inc`/`dec` insertion procedure, and a tagged thread-safe runtime design. A new VL effort should not present these as novel algorithms. Inference: the open work is adapting and proving analogous invariants in Rust/Verus and measuring proof effort, not rediscovering the Lean IR rules.

## techniques for the catalog

- explicit owned reference counting — represent heap references as counter tokens and insert `inc`/`dec` according to owned uses

- reset/reuse destructive update — reset a unique dead constructor and reuse its cell for a same-arity constructor

- borrow-signature inference — infer owned versus borrowed parameters by a fixpoint over resets and owned calls

- tagged thread-safe counting — mark cross-thread reachability and reserve atomic fences for multi-threaded values
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "If a function f takes a parameter x as a borrowed reference, then at runtime x may be a shared value even when its reference counter is 1."): read all 12 pages and checked every quotation, number, figure and section reference, the technique steps, and the Figure 6 and 7 values (and recomputed the Figure 6 geometric means from the rows). Changed: the link (the old DOI 10.1145/3110278 is the Ebner et al. reference, not this paper; replaced with arXiv:1908.05647 from the paper text); the conclusion quotation (the paper says “Finally, we are working on…”, not “We are currently working on…”); most PDF page numbers (Figures 2 and 3 are on p. 5, Figure 4 on p. 6, Figure 5 on p. 7, Figures 6 and 7 on pp. 10 and 11, Section 7 on pp. 8–9, Section 8 on pp. 9–10); the inc/dec insertion step (Section 5.3, not Section 4); the claim that the geometric mean cannot be reconstructed (it can); added the squiggly-marker caveat on the -borrow geometric mean, the `dec w` text-versus-figure gap, and Inference labels. Not checked: the Verus-form paragraphs (inference, not tested against Verus), benchmark source code and the cited external works, and the semantics rules in Figures 1 and 2, which I read but did not re-derive.
