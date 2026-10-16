# Abstract Compilation for Verification of Numerical Accuracy Properties
(authored by agents unless marked 🧑)
Tag: `jacquemin2019abstract`, [paper](http://arxiv.org/abs/1911.10930v1)

## scope and result

Jacquemin et al. introduce abstract compilation: a source transformation embeds a numerical abstract interpreter into executable code. Their C toolchain combines E-ACSL for runtime assertions over exact integers and rationals, FLDCompiler for unstable-test transformation, and FLDLib for zonotope-based floating-point analysis. The abstract states: “First, we extend an existing runtime assertion checker called E-ACSL with rational numbers to monitor accuracy properties at runtime.” (Abstract, PDF p. 1). The method targets numerical-accuracy and robustness properties when input context and I/O are concrete but floating-point behavior must be over-approximated.

## technique 1: exact runtime specification compilation

What it is. E-ACSL translates ACSL-annotated C to C that checks assertions during execution. This paper extends it with exact rational and integer operations and built-ins for accuracy bounds. Generated mathematical values use GMP; a kind-and-interval type system keeps machine arithmetic where it is provably sufficient.

How to apply it.

1. Express accuracy assertions with integer/rational terms and built-ins such as `accuracy_get_ferr`, `accuracy_assert_ferr`, and `accuracy_get_real`.
2. Infer an integer interval (I(t)) for every term and its kind: integer interval, floating-point type, or rational.
3. Join operand and result kinds for each operator; choose the smallest safe C type or GMP representation.
4. Use subsumption when a larger kind safely supplies a smaller expected type, and downcast only when the inferred kind fits the target machine type.
5. Generate GMP integer/rational code for operations that may overflow machine types, exact comparisons for rational properties, and ordinary machine operators elsewhere.
6. Compile built-ins to FLDLib calls and preserve assertion failure behavior.

The paper states the motivation for the type system: “To reduce the need for GMP code without loss of soundness, we have designed a dedicated type system in order to rely on machine representations as much as possible, and generate GMP code only when necessary.” (Section 4.1, PDF p. 6). Verus form (Inference): represent exact error bounds with mathematical `int` or rational encodings in `spec fn`s, and prove arithmetic contracts with `requires`/`ensures`. Executable Rust floating-point code cannot itself use Verus mathematical values without a ghost shadow; a checked wrapper can update ghost bounds and assert runtime correspondence. GMP calls, FFI, and floating-point semantics would remain trusted unless separately specified and verified.

Evidence and limits. The generated assertion code is exact for rational properties, but the paper does not provide a proof of the whole compiler/runtime chain. Section 7 lists “a proof of soundness for the whole toolchain” as future work (PDF p. 18). Therefore a successful runtime assertion establishes the encoded check for the executed input and assumptions, not universal correctness.

## technique 2: source-to-source abstract compilation for unstable tests

What it is. A floating-point guard can choose a different branch from the corresponding real-valued guard. The compiler encloses each potentially unstable test in a split-merge section that explores all feasible float/real paths and joins their abstract states.

How to apply it.

1. Identify a comparison or floating-point-to-integer cast whose result may differ between floating and real arithmetic.
2. Insert `split` before the smallest block containing that test and `merge` after all paths reconverge.
3. At split, save variables whose values may be modified in one execution and read in another; restore them before each path.
4. Instrument comparisons and casts so FLDLib's path explorer records the float and real outcomes and enumerates feasible combinations.
5. At merge, join only variables modified inside the section and used afterward; keep discrete integer state out of the abstract join.
6. Continue concrete execution with the union of feasible abstract states.

Three placement criteria govern the transformation. “A split must strictly dominate its associated merge. Conversely, a merge must strictly post-dominate its associated split.” (Section 4.2, PDF p. 7). The other criteria require split and merge in one basic block and require non-floating variables to remain unchanged in all joined states (Section 4.2, PDF pp. 7–8). FLDCompiler uses a greedy expansion and a data-dependency analysis with `mustdef`, `maydef`, `mayref`, and `data` sets to compute `save-list` and `merge-list`. Pointer targets come from Frama-C Eva; without alias information, the authors warn that generated lists can be unsound (Section 4.2, PDF p. 9).

Verus form (Inference): model an unstable branch as a relation over a concrete float result and a mathematical real approximation, then prove both branches preserve a common postcondition. A Rust runtime checker can enumerate an explicitly bounded set of abstract paths, but Verus's ordinary `if` proof follows the actual branch and does not automatically explore a counterfactual real branch. A sound Rust adaptation therefore needs a separately verified path-splitting model or a conservative theorem about the branch predicate.

Evidence and limits. The method is complete only for paths the generated split-merge structure explores. The industrial evaluation reports combinatorial explosion when a merge is far from a split and many unstable branches occur (Section 5, PDF pp. 16–17). Manual split/merge placement remains necessary in some cases.

## technique 3: FLDLib domain propagation with zonotopes and intervals

What it is. FLDLib replaces `float` and `double` with structures containing a floating-point interval, a real-number zonotope, an error zonotope, and a relative-error interval. Shared noise symbols preserve linear relationships between variables; interval intersection and subdivision tighten nonlinear results.

How to apply it.

1. Initialize each abstract numeric value with its float interval, real affine form, rounding-error affine form, and relative-error interval.
2. Overload arithmetic, comparisons, and float-to-integer casts so each operation updates all four components.
3. On a branch, derive constraints on noise symbols for each float/real outcome and create a local decision for every feasible combination.
4. Propagate those constraints through shared affine forms; replace a noise symbol only when the authors' 5% amplitude-improvement heuristic is met.
5. Join path states at merge, preserving intervals even when linear zonotope relationships cannot be retained.
6. Evaluate accuracy built-ins and emit a verdict or diagnostic bound.

The paper describes the representation: “The main principle of FLDLib consists in redefining double and float types by a structure containing four fields representing the abstraction.” (Section 4.3, PDF p. 11). Verus form (Inference): use ghost intervals/affine forms and proof lemmas for each floating-point operation, with an explicit rounding-error model. Verus can prove arithmetic properties of the chosen model but does not model IEEE-754 rounding automatically; any `unsafe` floating-point wrapper or operator overload must have a reviewed contract.

Where it fails. FLDLib has no pointer analysis and enumerates discrete values, so it is intended for thin scenarios with few pointer targets. Unbounded noise symbols can make analysis quadratic; the implementation offers a bound that trades precision for time (Section 4.3, PDF p. 13). Inference: this is unsuitable as a universal verifier for arbitrary agent-written Rust, especially alias-heavy code, but it can serve as a checked numerical kernel.

## technique 4: runtime path exploration algorithm

FLDLib's split-merge runtime saves an outer path-explorer context, saves the variables in `save-list`, restores them before each iteration, executes instrumented instructions, merges `merge-list` values, and loops while another feasible path exists. The paper's pseudocode initializes `MΣ`, restores memory at each iteration, merges each path into `MΣ`, then replaces the current memory with `MΣ` (Figure 13, PDF p. 14). Nested sections use a stack and jump to an `end-explore` label when an inner section has no feasible path.

Verus form (Inference): represent the explorer state as a ghost sequence of pending branch assignments and a concrete accumulator. Prove a loop invariant that every feasible explored path contributes a sound abstract state and that saved non-floating variables are unchanged. This requires a finite-path or bounded-noise assumption; it does not follow from a normal Rust loop invariant alone.

## evidence from experiments

The small benchmark compares the toolchain with Fluctuat, Precisa, and FpDebug on examples grouped as simple arithmetic, unstable branches, interpolation, math, and miscellaneous C programs (Figure 14, PDF p. 16). A table entry is an inferred accuracy bound; `ko` means not pertinent or no reasonable bound, and `n/t` means not translated by Precisa. The authors say the toolchain has “almost always the best accuracy” in this table (Section 5, PDF p. 16), but no aggregate success denominator is reported, and comparisons are not normalized for timeout or precision settings. The Precisa comparison is explicitly biased because FPRock optimization was disabled.

Two non-public industrial synchronous-reactive systems have several tens of thousands of lines. One is generated C with physical-model interpolation and filters; the other is hand-written C++ using template libraries. The first produced reasonable error bounds for a thin scenario. The second accumulated error and unstable branches, causing combinatorial explosion; the authors retained one decomposition path to continue analysis. FLDLib scaled better than Fluctuat on these cases because it did not analyze pointers, but its usefulness depended on thin scenarios and bounded noise symbols (Section 5, PDF pp. 17–18).

The paper's central measured claim is therefore conditional: it demonstrates useful accuracy bounds on selected small examples and thin industrial scenarios. It does not report the number of industrial tests, path counts, runtime denominators, confidence intervals, or a soundness proof for the full compiler, libraries, and compiler-generated executable.

## what is proved, trusted, and relevant to VL

Proved or designed: the abstract domains and transformation rules described in the paper, including split-merge criteria and data-dependency lists. Measured: accuracy outputs and qualitative scalability on the listed benchmarks and two industrial systems. Trusted: IEEE-754 and compiler behavior, E-ACSL code generation, FLDCompiler's alias analysis, FLDLib operator overloads, GMP, C/C++ compilers, and the formal specification. The authors explicitly leave end-to-end soundness for future work.

Inference: for Verus and VL, the reusable idea is to separate executable behavior from a ghost numerical abstraction and to make unstable control flow explicit in the proof model. The product threat is a verified Rust contract that silently assumes real arithmetic while executing rounded floats, or a runtime abstraction whose unsound alias handling misses paths. A practical VL component would need a small, verified fixed-point or floating-point kernel with explicit error contracts, bounded path exploration, and tests whose denominators and input domains are recorded. VL should not redo a generic C abstract compiler or claim universal numerical soundness from this paper's prototype.

## techniques for the catalog

- exact assertion compilation: infer integer/rational kinds and emit GMP code only where machine arithmetic is not proved sufficient
- split-merge unstable-test handling: enclose float/real branch disagreements in path-exploring loops and join feasible abstract states
- zonotope-plus-interval propagation: carry shared-noise affine forms, error domains, and intervals through overloaded numeric operations
- dependency-derived save and merge lists: use may-def/may-ref/data analysis to reset and join only variables that cross a split-merge boundary
- bounded runtime path exploration: enumerate feasible branch/cast outcomes with saved memory and nested explorer contexts
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
