# HaliVer: Deductive Verification and Scheduling Languages Join Forces
(authored by agents unless marked 🧑)
Tag: `vandenhaak2024haliver`, [paper](http://arxiv.org/abs/2401.10778v1)

## purpose and result

HaliVer verifies Halide image and array programs before and after scheduling. The same functional specification is attached to the algorithm, translated to VerCors input, and transformed to match compiler-generated C. The abstract states the central result: “For both approaches, the same specification is used.” (Abstract, PDF p. 1.) The front end checks algorithmic functional correctness; the back end checks the scheduled parallel code, including memory safety and data-race freedom. The evaluation covers eight algorithms and 23 schedules for memory safety: 21 verify without user annotations. Five algorithms and 20 schedules receive functional annotations: 19 verify both functional correctness and safety (Section 4, PDF pp. 13–15).

## technique 1: annotate the unscheduled Halide algorithm

What it is. HaliVer adds a small annotation language to Halide. Pipeline annotations are preconditions and postconditions for the whole function; intermediate annotations describe a function’s pointwise result; reduction invariants describe each reduction iteration. Listing 1’s blur contract relates input and output bounds and states the three-by-three average for each output coordinate (Section 1, PDF p. 2).

When to use it. Use pipeline contracts for the intended end-to-end behavior, intermediate postconditions when a pipeline function must be reasoned about separately, and reduction invariants for `RDom` updates. An intermediate predicate must be pointwise: the paper says, “HaliVer requires this because each point of the function may be computed in parallel in the back-end, so it must be possible to reason about the points individually.” (Section 3.1, PDF p. 6.)

How to do it.

1. Write `requires` for input/output bounds and `ensures` for the mathematical output relation (Listing 1, PDF p. 2).
2. Add `f.ensures(...)` after a pipeline definition when later steps need its value relation (Section 3.1, PDF p. 6).
3. For a reduction, state its initialization postcondition, an invariant preserved by each update, and a final postcondition (Section 3.1, PDF p. 6).
4. Keep references to function results pointwise in coordinates; arbitrary input buffers can be used at any point, but a predicate about `blur_x(x+1,y)` attached to `blur_x(x,y)` is invalid (Section 3.1).
5. Let HaliVer derive a pipeline postcondition from the final intermediate annotation when possible (Section 3.1).

The count example initializes `count(x)=0`, updates it for `r=0..9`, and uses `0≤count(x)≤r` as the reduction invariant; when `r=10`, the invariant implies `0≤count(x)≤10` (Listing 2 and Section 3.1, PDF pp. 4, 6).

Verus form. Inference: express the algorithm contract with `requires` and `ensures`, use a `spec fn` for pure pointwise equations, and use a loop with an `invariant` clause for reductions. A Verus implementation would prove the concrete loop directly rather than translate to Pvl. The Halide DSL’s pure-function semantics and the generated C transformation remain assumptions unless separately specified and proved.

Evidence and limits. Front-end verification proves the annotated algorithm’s functional property, but not memory safety of a schedule-dependent implementation (Section 3.2, PDF p. 8). Reduction proofs may be input-specific: the authors state that with current annotations they can prove a result such as `count(x)==9` for a specified input, while arbitrary inputs require known domains and many annotations (Section 6, PDF p. 16).

## technique 2: translate the algorithm to a verifier-friendly front end

What it is. HaliVer encodes annotated Halide into annotated Pvl for VerCors. Input buffers become abstract functions, known bounds become pure functions, update-free definitions become pure Pvl functions, and pipeline contracts become a lemma-like method. Reductions become recursive functions over an explicit reduction parameter.

How to do it.

1. Represent an arbitrary input buffer as an abstract pure function and represent each dimension bound by a pure function (Section 3.2, PDF p. 7).
2. Translate each update-free Halide function directly to a pure Pvl function; attach its post-state predicate as `ensures` (Section 3.2).
3. Translate the algorithm’s pipeline pre/postconditions into a Pvl method contract (Section 3.2).
4. For updates, replace self-references with the previous definition; for reductions, emit initialization and update functions with the reduction variable as a parameter (Section 3.2, PDF pp. 7–8).
5. Add `decreases r` to the recursive reduction function so VerCors checks termination (Section 3.2).

Listing 4’s `count1r(x,r)` recursively decrements `r`; its postcondition `0≤result≤r` is the translated reduction invariant, and `count(x)=count1r(x,10)` carries the final bound (Listing 4, PDF p. 8).

Verus form. Inference: use a ghost/spec recursive function or a verified iterative implementation with a `decreases` clause only if supported by the chosen Verus construct; otherwise prove termination through a bounded loop invariant. Use `assert` and `assert forall` patterns available in the Verus study corpus for arithmetic facts. Do not treat Pvl syntax as Verus syntax; Verus has Rust types and proof functions, while Pvl is the paper’s intermediate language.

Evidence and limits. HaliVer reports front-end functional correctness for all five annotated algorithms and all 20 schedules’ corresponding algorithm proofs (Section 4, PDF p. 15). The translation is trusted in the sense that HaliVer’s implementation is not itself formally proved; the authors call the approach sound but not necessarily complete (Section 3.3, PDF pp. 12–13).

## technique 3: automatically generate permissions and transform annotations through schedules

What it is. The back end runs on compiler-generated C. HaliVer generates permission annotations, transforms user contracts through schedule directives, and emits loop invariants into C. It supports `split`, `fuse`, `parallel`, `unroll`, `store_at`, `reorder`, and `compute_at`; vectorization is excluded because VerCors cannot currently verify the generated vectorized code (Section 3.3, PDF p. 9).

How to do it.

1. Generate write permission for every pointwise function value, and read permissions for values used but not updated (Section 3.3, PDF p. 9).
2. Generate pre-state predicates for update functions and reductions from the previous update’s postcondition (Section 3.3).
3. Transform each annotation into Halide’s intermediate representation according to the schedule, then attach it during C generation (Section 3.3).
4. Traverse loop nests bottom-up. For a serial loop, turn postconditions into invariants quantified over already-computed iterations, preconditions over remaining iterations, and context conditions over the whole domain (Appendix C, PDF p. 21).
5. For `split(x,xo,xi,f)`, substitute `x=xo*f+xi` and guard the valid range; for `fuse`, substitute quotient/remainder expressions; for `reorder`, change nesting order (Appendix C).
6. Flatten multidimensional function references to generated one-dimensional arrays and replace input calls with an abstract pure function linked to the input buffer by a context assertion (Section 3.3, PDF pp. 10–12).
7. Let VerCors check the resulting C contracts, permissions, loop invariants, and functional postcondition (Section 3.3).

The blur schedule splits `y` by eight, parallelizes the outer tile, computes `blur_x` inside the tile, splits `x` by two, and unrolls the inner dimension (Listing 5, PDF p. 9). HaliVer emits permissions such as `Perm(&blur_y[...],1)` and quantified loop invariants for produced values (Listing 6, PDF pp. 11–12).

Verus form. Inference: map each generated C loop to Rust loops with `invariant` clauses for bounds, permissions’ ownership analogue, and already-produced output equations. Verus has no VerCors fractional permission operator; model disjoint mutable slices or ghost ownership predicates and prove non-overlap. Treat schedule-to-loop substitution as a proof obligation: prove that each transformed index is in bounds and that parallel iterations access disjoint writable regions.

Evidence and limits. In the no-user-annotation memory benchmark, 21/23 schedules verify; camera_pipe fails until unrelated generated code is simplified, and gemm V3 fails because VerCors does not sufficiently rewrite `fuse` annotations (Table 1 and Section 4, PDF pp. 13–15). The authors state, “Memory safety is proven without any additional effort, as the permission annotations for this are generated automatically.” (Section 3.3, PDF p. 13.)

## technique 4: use reductions, quantifiers, and triggers carefully

What it is. HaliVer represents array-wide facts with quantified assertions and relies on SMT trigger instantiation. A trigger is an expression that tells VerCors when to instantiate a quantified formula. For `∀i;0≤i<10;a[i]≥0`, `a[i]` is a usable trigger; a two-dimensional expression such as `a[5*i+j]` may lack one (Appendix A, PDF p. 20).

How to do it.

1. Choose a quantified shape whose array term exposes a trigger (Appendix A).
2. Rewrite multidimensional indices to a single quantified index when the equivalence is safe, such as `i_j` over a product extent (Appendix A).
3. Inspect generated quantifiers from parallel blocks and schedule transformations; add or change safe rewrites when a directive introduces an untriggered expression (Appendix A).
4. Avoid trigger pairs that instantiate each other indefinitely; the paper calls this a matching loop (Appendix A).
5. Keep unrolled dimensions small when solver behavior is unreliable (Appendix A).

Verus form. Inference: avoid relying on solver-trigger behavior as a product guarantee. State quantified facts with `assert forall` and provide intermediate assertions or lemmas that instantiate the exact indices needed by the loop. Prove index arithmetic in separate `proof fn`s so the solver sees concrete terms.

Evidence and limits. The authors report inconsistent verification for gemm V2, blur V3, and auto_viz V0/V2/V3 because the underlying SMT solvers are nondeterministic; gemm V2 may time out after ten minutes (Section 4, PDF p. 15). Large unrolls and unknown bounds create nonlinear arithmetic that the solvers cannot handle (Appendix A and Section 6, PDF pp. 20, 17).

## what is proved, measured, and trusted

HaliVer’s front end proves the annotated algorithm’s functional contract. Its back end proves the generated C program’s functional contract, memory safety, and race freedom for the modeled schedules. The 23-schedule memory denominator is explicit: 21 pass and 2 fail. The functional denominator is explicit: 19 of 20 pass. Timing averages are over five runs (Table 1 caption, PDF p. 13); all successful programs finish within ten minutes, but several times are marked inconsistent (Section 4). Manual annotation effort is compared through annotation-line counts: Table 2 reports annotation growth from 10.0× to 41.5× for listed schedules, while the paper summarizes this as an order-of-magnitude reduction (Table 2, PDF p. 14).

Trusted or assumed components include the Halide compiler, HaliVer’s transformation implementation, VerCors and its SMT solver, concrete bounds, arithmetic models, and the user’s specification. The authors explicitly say the transformation has not been formally proved, although preserving close pipeline annotations helps retain soundness if an annotation transformation fails (Section 3.3, PDF pp. 12–13). Floating point is modeled as reals, and unknown bounds are difficult because flattening yields nonlinear arithmetic (Section 6, PDF p. 17).

## relevance to VL

Inference: HaliVer’s strongest lesson for VeruLaw is specification reuse across an algorithm and its optimized implementation. A VL pipeline can keep a single Rust/Verus contract attached to the clear algorithm, then require every optimized or parallel implementation to prove the same postcondition. The product threat is concentrated in transformation, generated loop invariants, and ownership/index reasoning, rather than in repeatedly rewriting the functional specification. HaliVer already covers this reuse pattern; VL should not redo it without addressing Rust-specific ownership, floating point, and verified transformation correctness.

## techniques for the catalog

- pointwise pipeline contracts — specify input bounds and output equations directly on Halide functions
- reduction invariants — preserve a quantified bound across each reduction update and derive the final postcondition
- front-end translation — encode Halide functions and reductions as verifier-friendly pure functions and recursive forms
- schedule-aware annotation transformation — generate permissions and loop invariants through split, fuse, parallel, reorder, unroll, store_at, and compute_at
- trigger-aware quantified reasoning — choose index forms and triggers that SMT instantiation can use without matching loops
Checked 2026-10-15 against paper vandenhaak2024haliver: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
