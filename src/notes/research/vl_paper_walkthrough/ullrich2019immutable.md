# Counting Immutable Beans: Reference Counting Optimized for Purely Functional Programming
(authored by agents unless marked 🧑)
Tag: `ullrich2019immutable`, [paper](https://doi.org/10.1145/3110278)

## what the paper establishes

Ullrich and de Moura design and implement a reference-counting runtime and compiler for Lean's eager, purely functional intermediate representation. The paper's central engineering claim is that explicit reference counting can support functional programs efficiently when the compiler (i) reuses a dead, unique constructor cell, (ii) avoids counter traffic for safe borrowed references, and (iii) avoids atomic operations for values that have not crossed a thread boundary. The authors state that “We propose a new mechanism for efficiently reclaiming memory used by nonshared values, reducing stress on the global memory allocator.” (abstract, PDF p. 1.) They give a formal big-step semantics for the reference-counted IR, but report that a complete compiler correctness proof was future work: “We are currently working on a formal correctness proof of the compiler described in this paper.” (conclusion, PDF p. 12.)

For VeruLaw, the useful lesson is a compiler-and-runtime proof decomposition: specify ownership and sharing invariants at an IR boundary, then separately prove transformations preserve them. The paper is about Lean runtime performance, not Verus or Rust. Every transfer to Verus below is therefore an inference.

## technique 1: explicit owned reference counting

What it is. The intermediate language starts with a pure A-normal-form IR and adds `inc`, `dec`, `reset`, and `reuse`. A heap maps locations to values and positive counters. An owned reference consumes one counter token; a borrowed reference promises that an enclosing owned reference keeps the object alive. The paper's examples make the accounting executable: `mkPairOf x = inc x ; let p = Pair x x ; ret p` increments because two tokens for `x` are consumed, while `fst x y = dec y ; ret x` drops the unused argument (Section 2, PDF p. 2).

When to use it. Use explicit counters when values are acyclic and immediate reclamation or uniqueness-sensitive updates matter. The authors note that Lean's pure IR cannot create cyclic structures, so the usual cycle leak objection does not apply (Section 1, PDF p. 1). It is unsuitable without an additional cycle scheme for cyclic heaps.

How to apply it.

1. Lower pure expressions to administrative `let`, `case`, constructor, projection, and call forms (Section 3, PDF p. 3).
2. Treat each owned argument as a token that the callee must consume by returning, storing, passing onward, or `dec` (Section 2, PDF p. 2).
3. Insert `inc` before copying a value into an additional owned use; insert `dec` after the last owned use. Recursive `dec` removes a unique cell and decrements its children (Section 4, PDF pp. 3–4).
4. Define semantics over a context and mutable heap. The paper's `Inc` and `Dec` rules update counters, and `dec` recursively frees a constructor or partial application when its count reaches one (Figure 2, PDF p. 4).
5. Validate that live values have positive counters and dead values are absent from the heap (Section 4, PDF p. 3).

Verus form (inference). Model the heap and counters in executable Rust structs, expose a `requires`/`ensures` contract for each counter operation, and prove a `view` or ghost abstraction that relates the concrete heap to a mathematical ownership map. Use `assert`, `assert forall`, `requires`, and `ensures` in proof functions; do not make proof code executable. A `dec` contract should state that a positive count decreases, and that zero-count removal recursively preserves the child-count invariant. Rust ownership can enforce some alias discipline, but it does not by itself prove the paper's runtime counter semantics.

Evidence and limits. The semantics is formal, but compiler correctness is not reported as proved. The implementation is in Lean and targets C, with experiments on one backend (Section 8, PDF p. 8). Thus evidence supports a working design, not a verified compiler. The runtime assumes no cycles in the pure data representation and uses a custom model for partial applications.

## technique 2: reset/reuse destructive update for pure code

What it is. `reset x` tests whether `x` is unique. If unique, it decrements the old constructor's children and returns its storage as a reusable token; `reuse token in ctor_i y` writes a constructor of matching arity into that cell. If `x` is shared, reset behaves like `dec`, and reuse allocates normally (Section 4, Figure 2, PDF pp. 3–4). This realizes the “resurrection hypothesis”: “many objects die just before the creation of an object of the same kind.” (Introduction, PDF p. 1.)

When to use it. Apply it to functional transformations such as `map`, zippers, red-black-tree insertion, and compiler term rewriting where an input becomes dead immediately before a same-shape result is built. Do not fuse reset and reuse blindly: in `map`, the recursive tail can temporarily raise the input count and prevent safe reuse (Section 2, PDF p. 2).

How to apply it.

1. Find a `case x` arm and locate the first point after which `x` is dead (Section 5.1, PDF p. 4).
2. Insert `let w = reset x` at that point.
3. Search the remaining arm for a constructor `let z = ctor_i y` with the same arity as the matched constructor. Replace it with `let z = reuse w in ctor_i y`; if no reuse is possible on a path, emit `dec w` (Figure 3, PDF p. 4).
4. Repeat recursively through `let` and `case`; the paper's `D` finds the dead point and `S` performs the substitution (Section 5.1, PDF p. 4).
5. Preserve separate `inc` operations on projections that remain live. The paper's `map` example increments head and tail, resets the list, recursively maps, and reuses the list cell (Section 2, PDF p. 2).

Verus form (inference). Represent a reusable cell with a ghost uniqueness predicate and an executable enum for constructors. Give `reset` a precondition that the cell's abstract count is one and an `ensures` clause returning a token plus a heap whose children have been released. Give `reuse` a precondition that the token's cell capacity matches the constructor arity and an `ensures` clause restoring the constructor invariant. A Verus proof should establish that the optimization preserves an extensional list/tree specification; the paper's dynamic counter is not a substitute for a Rust borrow proof.

Evidence and limits. In the Lean benchmark table, disabling reuse (`-reuse`) raises normalized geometric-mean runtime from 1.24 to 1.74, and `const_fold` rises from 1.00 to 1.64 (Figure 6, PDF p. 8). These are arithmetic means of 50 runs on an i7-3770, Ubuntu 18.04, and Clang 9 (Section 8, PDF p. 8). The effect is workload dependent: `binarytrees` changes from 1.00 to 0.98, within the paper's reported variation marker. The procedure is heuristic; it can miss opportunities and relies on exact liveness and constructor arity.

## technique 3: infer borrowed parameters and insert counter operations

What it is. A function signature maps each parameter to Owned (`O`) or Borrowed (`B`). Borrowed parameters do not update the counter and must be kept alive by an owned reference. The paper explicitly warns that borrowing is unsafe when the parameter is reset, and that partial application can let a borrowed reference escape (Section 5.2, PDF p. 5). The inference starts with all parameters borrowed and iterates to a fixpoint: mark a parameter owned when it or a projection is reset, or when it is passed to an owned parameter; the latter is a performance heuristic rather than a correctness requirement (Section 5.2, PDF p. 5).

How to apply it.

1. Set every function's signature to `B^n`.
2. Collect variables that occur in reset, owned calls, or owned applications. Figure 4's `collectO` traverses `let`, `case`, projections, calls, and partial applications (Figure 4, PDF p. 5).
3. Mark collected parameters `O`; repeat over recursive definitions until no mark changes. For `hasNone`, the result is `β(hasNone) = B` (Section 5.2, PDF p. 5).
4. For each call, process formal parameters and actual arguments in parallel. Before an owned use, `O_x^+` inserts `inc x` unless this is the last live use; after a borrowed use, `O_x^-` inserts `dec x` when an owned argument becomes dead (Figure 5, PDF pp. 5–6).
5. Add an owned wrapper around partial applications whose callee has borrowed parameters, preventing the borrowed value from escaping the current scope (Section 5.2, PDF p. 5).
6. Refine the heuristic to keep tail calls intact: mark a parameter owned when a borrowed formal would otherwise require a post-call `dec` (Section 5.3, PDF p. 6).

Verus form (inference). Encode a borrow signature as a ghost sequence of ownership modes and prove each call against a contract saying which abstract permissions are consumed or retained. Rust `&T` can represent a non-owning borrow only while the owner's lifetime is statically available; a runtime counter and higher-order partial application need an explicit verified ownership object. Use `requires`/`ensures` and ghost state to show no borrowed value outlives its owner. Do not write `invariant(...)` as a call or use unsupported `modifies` syntax; the local Verus reference lists supported constructs.

Evidence and limits. Figure 6's `-borrow` column disables inference and assumes all parameters owned. Geometric-mean normalized time changes from 1.24 (base) to 1.27, while `binarytrees` rises from 1.00 to 1.14 and `deriv` from 1.00 to 1.16 (50-run means, same hardware and setting, Figure 6 and Section 8, PDF p. 8). Inference can be conservative and is explicitly heuristic; manually supplied annotations are considered safe by the authors.

## technique 4: thread-safe reference counting by reachability tags

What it is. Values carry a tag: single-threaded, multi-threaded, or persistent. Single-threaded counters use no memory fence; multi-threaded values use atomic operations; persistent values are never deallocated. Before creating a task, `markMT` traverses reachable single-threaded values and tags them multi-threaded. The invariant is directional: from persistent values only persistent values are reachable, and from multi-threaded values only persistent or multi-threaded values are reachable (Section 7.1, PDF p. 7).

How to apply it.

1. Default allocations to single-threaded.
2. Before `Task.mk f` or `Task.bind x f`, call `markMT` on every value that will cross to the new thread (Section 7.1, PDF p. 7).
3. Traverse only single-threaded nodes; the reachability invariant ensures already multi-threaded subgraphs need not be revisited.
4. On `inc`/`dec`, inspect the tag and select relaxed atomic operations and fences only for multi-threaded values (Section 7.2, PDF p. 7).

Verus form (inference). A state-machine proof can model the tag transition and task creation. Prove that every cross-thread edge is preceded by a transition to `Multi`, and that concurrent counter updates use an abstract atomic transition. Verus concurrency APIs can express the abstract state machine, but the paper's C++ runtime, hardware memory model, and fences remain trusted unless separately modeled.

Evidence and limits. Disabling the optimization (`-ST`, atomic operations for every value) raises geometric-mean normalized time from 1.24 to 1.89; `binarytrees` rises 1.00 to 1.22 and `deriv` 1.00 to 1.42 (Figure 6, PDF p. 8). `markMT` costs time proportional to the number of reachable single-threaded values, a limitation the authors state explicitly (Section 7.1, PDF p. 7). Correctness depends on callers identifying all functions that send values between threads.

## what is proved, measured, and trusted

The formal object is the big-step semantics of `λ_RC`, including counter updates and reuse. The implementation and benchmark demonstrate performance, not a mechanized compiler-correctness theorem. The trusted base includes the Lean compiler/runtime implementation, C backend, C++ task runtime, atomic memory model, benchmark harness, and the adequacy of the manually selected benchmark programs. The compiler correctness proof is future work, as quoted above. Measurements use 50 arithmetic-mean runs, but the paper reports normalized times rather than raw seconds in Figure 6; the cross-language table reports normalized wall time, GC percentage, and last-level-cache misses (Figure 7, PDF p. 9). The study therefore cannot claim that the optimization is universally faster or that generated code is verified.

The paper's claims and numbers are internally coherent at the displayed level: the geometric mean is a separate benchmark aggregate, not an average of the visible row values that can be independently reconstructed without raw timings. The “5x as fast as OCaml on const_fold” statement refers to cross-language normalized wall time (Figure 7, PDF p. 9), whereas the Lean base value is 1.00 and ocamlopt is 5.11 in that row. These are different settings from the `-reuse`, `-borrow`, and `-ST` ablations and must not be mixed.

## implications for VeruLaw

Inference: The most reusable idea is to make sharing and ownership explicit in an intermediate verified representation, then prove each lowering pass against a heap abstraction before optimizing runtime behavior. Inference: `reset/reuse` resembles a uniqueness-guarded destructive update and could reduce allocation in verified persistent data structures, but Verus proofs would need an extensional specification plus a uniqueness lemma. Inference: borrow inference could guide agent-generated Rust APIs, but a heuristic annotation is not a proof; every inferred borrow must be discharged against Rust lifetime and Verus permission obligations. Inference: the thread tags suggest a small state-machine layer for verifying when values may cross tasks. The product threat is moderate: these techniques improve runtime and compiler construction, but the paper leaves the compiler proof and C/runtime trust boundary open, so it does not by itself threaten VeruLaw's end-to-end verified Rust goal.

## what VL should not redo

The paper already supplies a formal RC semantics, a reset/reuse insertion algorithm, a borrow-signature fixpoint heuristic, an `inc`/`dec` insertion procedure, and a tagged thread-safe runtime design. A new VL effort should not present these as novel algorithms. The open work is adapting and proving analogous invariants in Rust/Verus and measuring proof effort, not rediscovering the Lean IR rules.

## techniques for the catalog

- explicit owned reference counting — represent heap references as counter tokens and insert `inc`/`dec` according to owned uses

- reset/reuse destructive update — reset a unique dead constructor and reuse its cell for a same-arity constructor

- borrow-signature inference — infer owned versus borrowed parameters by a fixpoint over resets and owned calls

- tagged thread-safe counting — mark cross-thread reachability and reserve atomic fences for multi-threaded values
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
