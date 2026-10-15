# Memory-Safety Challenge Considered Solved? An In-Depth Study with All Rust CVEs
(authored by agents unless marked 🧑)
Tag: `xu2021memory`, [paper](https://doi.org/10.1145/3466642)

## what the paper proves or measures

Xu et al. survey 186 real-world Rust memory-safety bug reports. Their dataset combines RustSec Advisory-DB, the Trophy Case, Rust compiler issues, and selected projects; the paper says it is “a superset of all existing Rust CVEs with memory-safety issues” (§3, p. 4). One compiler bug is separated from the other 185 bugs. Table 1 counts 186 bugs by consequence and culprit, with source components written as `std-lib + CVEs + others` (caption, p. 6). The largest consequences are 82 use-after-free bugs and 40 buffer-overflow/over-read bugs (§4, p. 6). The largest culprit groups are 52 unsound generic or trait bugs, 35 automatic-memory-reclaim bugs, and 29 unsound-function bugs (§4, p. 6).

The main empirical result is narrow: “all memory safety-bugs in our dataset except the compiler bug require unsafe code” (§4, p. 7). The authors also report that all existing CVEs in the dataset are library bugs (§4, p. 7). These are observations about the collected reports, not a proof that every future Rust bug has the same cause. Inference: a Verus project that verifies only safe call sites still needs contracts for unsafe libraries, FFI, and compiler assumptions.

The paper’s three main categories are automatic memory reclaim, unsound function, and unsound generic or trait (“Result Highlight for RQ-2,” §5, p. 12). The paper does not verify programs; it classifies incidents and extracts recurring fault patterns. Inference: its techniques are review and specification checks that can guide what a Verus proof must state.

## technique: audit ownership transfer and automatic drops

What it is. Rust inserts `drop()` calls during compilation. The paper states: “Rust achieves automatic memory reclaim by adding drop() function calls for particular memories in MIR code during compilation” (§5.1, p. 12). The bug pattern is constructing a raw-pointer-backed value while the original owner remains scheduled for destruction. In Code 1, `genvec` takes `s.as_mut_ptr()`, builds a `Vec` with `Vec::from_raw_parts`, returns it, and then `s` is freed; using the returned vector is use-after-free and dropping it can double-free (§5.1.1, pp. 12–13). The paper’s complete example includes `/*fix1: mem::forget(s);*/` and `/*fix2: let mut s = ManuallyDrop::new(...)*/` (Code 1, p. 13).

When to use it. Apply the audit whenever unsafe code turns a pointer, allocation, or borrowed view into a new owner, or whenever a raw pointer is stored in a struct. The paper says a useful patch for a struct that does not own pointed-to memory is `PhantomData<T>` (§5.1.1, p. 13).

Steps from the paper. (1) Identify the original allocation and every alias created from it (Code 1, lines 2–6). (2) Follow the compiler’s normal drop point; here the temporary string is dropped when `genvec` returns (§5.1.1, p. 13). (3) Check whether the returned object also frees or accesses that allocation (Code 1, lines 13–15). (4) Transfer or suppress destruction explicitly with `ManuallyDrop<T>` or `forget()`; the paper warns that late `forget()` leaves panic-sensitive points (§5.1.1, pp. 13–14). (5) For structs containing raw pointers, encode ownership with `PhantomData<T>` when the struct really owns the target (§5.1.1, p. 13).

Verus form. Inference: represent an owned allocation with a ghost ownership/resource predicate and give the constructor a `requires` clause establishing that the input allocation is live and exclusively owned. Give the returned wrapper an `ensures` clause transferring that predicate; the destructor proof must consume it exactly once. For a non-owning pointer wrapper, the postcondition should preserve the source ownership predicate and state that dereference is forbidden after the source lifetime. A loop or panic-cleanup path needs an `invariant` stating that each allocation has exactly one owning resource. This is an inference because the paper uses Rust APIs and does not present Verus code.

Evidence and limits. The dataset contains 35 automatic-reclaim bugs, including 23 during normal execution and 12 during stack unwinding (§5.1, p. 12). The evidence is incident counting, not a measured reduction from the proposed patches. The analysis excludes concurrency crashes that do not involve memory safety (§3, p. 3). Inference: a proof that covers normal returns but omits panic/unwind or abort-mode behavior does not cover the paper’s cleanup pattern.

## technique: make initialization and panic cleanup safe

What it is. During panic unwinding, Rust drops values even if initialization is incomplete. Code 4 allocates `mem::uninitialized::<Foo>()`, fills bytes through a raw slice, and can panic before initialization; unwinding then drops an invalid `Vec` pointer (§5.1.2, p. 14). The paper states: “If the program panics at these vulnerable points, the stack unwinding process would call the destructor of Foo which contains an invalid pointer in Vec” (§5.1.2, p. 14).

Steps from the paper. (1) Mark every point between allocation and full initialization as vulnerable (Code 4, lines 3–8). (2) Consider a panic at each such point and the destructor that unwinding invokes (§5.1.2, p. 14). (3) Replace `uninitialized()` with `MaybeUninit`; the paper says Rust deprecated `uninitialized()` for this requirement (§5.1.2, p. 14). (4) Apply the same check to `set_len()` before newly exposed elements are initialized and to `forget()` used after pointer conversion (§5.1.2, pp. 14–15). Inference: the same procedure should be applied to every early return and error branch, even if the paper discusses panic specifically.

Verus form. Inference: use a ghost initialization flag or predicate. The constructor requires allocated but uninitialized storage; each write establishes a field predicate; the return `ensures` clause requires the complete `Foo` predicate. Any branch before completion must preserve the predicate that prevents `drop` from reading the value. A loop `invariant` can state that initialized length is at most allocated length and that every initialized element is valid. Do not model `forget()` as a run-time proof call; model its ownership effect in the specification.

Evidence and limits. The paper attributes 12 of the 35 automatic-reclaim bugs to stack unwinding (§5.1, p. 12), but it does not report how many were prevented by `MaybeUninit` patches. Inference: the count supports prioritizing unwind paths, not a quantitative claim about patch effectiveness.

## technique: check public function contracts, FFI, and generic bounds

What it is. The paper divides unsound functions into bad safety declarations, wrong mutability, insufficient lifetimes, and excessive visibility (§5.2.1, p. 15). It states: “If developers falsely declared an unsafe function as safe, users of the function may cause undefined behaviors without using unsafe code themselves” (§5.2.1, p. 15). FFI adds undefined behavior, races, misalignment, and layout mismatch (§5.2.2, p. 15).

Steps from the paper. (1) For each public function, check whether its body calls unsafe operations and whether the signature marks the required preconditions (§5.2.1). (2) Check that mutable effects are reflected in parameter mutability and that lifetimes are sufficient (§5.2.1). (3) Enumerate every FFI behavior—zero-size allocation, recursive locks, races, alignment, and layout—and either handle it or make the caller unsafe (§5.2.2). (4) For generic and trait APIs, list required `Send`, `Sync`, `Pin`, and `'static` bounds; Code 5 shows an `unsafe impl<T> Send` repaired as `unsafe impl<T:Send> Send` (§5.3.1, p. 16). (5) Test adversarial concrete types such as `Rc<T>` and a `#[repr(align(128))]` type; Code 6 shows that insufficient alignment breaks a dereference assertion (§5.3.1, pp. 16–17).

Verus form. Inference: express each safety precondition in `requires` and the promised memory/aliasing behavior in `ensures`; keep FFI specifications as trusted external contracts and state their assumptions explicitly. For a generic function, add trait and lifetime assumptions to the contract or restrict the type parameter. Use a proof `invariant` for thread-shared state; the paper’s `Send`/`Sync` failures are precisely cases where the invariant is missing. Verus cannot prove an external FFI implementation without a model; that boundary remains trusted.

Evidence and limits. The study reports 29 unsound-function bugs and 52 unsound-generic-or-trait bugs (§4, p. 6). Code 5’s race explanation is a concrete witness, not a frequency estimate for all generic APIs. The paper excludes ordinary implementation mistakes that are not API unsoundness (§5.2, p. 15).

## what remains trusted and what VL should not redo

The paper trusts the correctness of its source repositories, CVE descriptions, and manual classification; it does not mechanically re-prove any CVE. Inference: VL should not spend effort rediscovering the three-way taxonomy or repeating the 186-report count. It should instead turn each pattern into reusable contract templates and regression tests for unsafe wrappers, FFI boundaries, initialization, drops, generic bounds, and alignment. The authors report “over two hundred unsoundness issues” in the Rust compiler project from 2014–2020 (§4, p. 7); this is a repository count, not a proof that the compiler is currently unsound in every case.

Inference: threat to a product that generates agent-written verified Rust is high at unsafe and API boundaries. A successful Verus proof can establish the stated contract while leaving FFI behavior, compiler soundness, external library implementations, and specification adequacy trusted. The paper’s evidence supports prioritizing these boundaries; it does not measure agent error rates or Verus coverage.

## techniques for the catalog

- ownership-drop audit — trace raw-pointer ownership, compiler-inserted drops, aliases, and panic paths; transfer or suppress destruction explicitly
- initialization-unwind audit — prove that every panic or early return sees only initialized values and use `MaybeUninit`-style staged initialization
- API and FFI contract audit — expose unsafe preconditions, mutability, lifetimes, FFI behavior, alignment, and layout in contracts
- generic-bound adversarial testing — instantiate generic and trait APIs with `Rc`, unusual alignment, pinning, and lifetime cases to test missing bounds

Checked 2026-10-15 against the paper by a Codex agent for memory_safety_challenge_considered_solve_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
