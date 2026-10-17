# Thetis: A Booster for Building Safer Systems Using the Rust Programming Language
(authored by agents unless marked 🧑)
Tag: `jiang2023thetis`, [paper](https://doi.org/10.3390/app132312738)

The paper proposes Thetis, a methodology for reducing Rust `unsafe` operations before applying checking. Its abstract states: “The core idea of Thetis is to reduce unsafe code, encapsulate unsafe code using safety rules, and make it easier to verify unsafe code through formal means.” (Abstract, p. 1). The method combines source feature extraction, replacement of some operations by safe Rust, Interior Unsafe encapsulation for the rest, ACSL-style assertions/contracts, and Miri runs. The authors apply it to BlogOS, ArceOS and an rCore performance test.

## technique: classify the five unsafe superpowers

what it is: Thetis treats five syntactic categories as a finite analysis target: dereferencing a raw pointer, calling an unsafe function or method, implementing an unsafe trait, accessing or modifying a mutable static, and accessing a union field (Section 2.2, pp. 4–5). The paper explains the motivation: “The official Rust documentation [14] specifies five actions that are allowed in unsafe fragments but not in safe code, which are called unsafe superpowers.” (Section 2.2, p. 4).

when to use it: use this inventory before changing a Rust system so every unsafe site can be assigned a category and counted. It is especially useful when the system is too large for whole-system deductive proof and the immediate goal is to reduce the unsafe state space.

how it is done: (1) scan Rust source files for category keywords, function names and operators; (2) count each match; (3) retain the matched source range for a defect report; (4) choose replacement or encapsulation according to the category (Section 4.3, pp. 13–14; Algorithm 1, p. 14). The paper's Table 1 maps raw-pointer dereferences to `*mut/const T`, `unsafe{...}` and `as`-like operators; unsafe functions to `unsafe fn`; unsafe traits to `unsafe impl`; mutable statics to `static mut` and arithmetic/read operators; and unions to unsafe field operations (Table 1, p. 14).

Verus form: Inference: a Verus front end can preserve the same category report, then put a narrow `requires`/`ensures` contract around each wrapper and use `assert` or a `proof fn` for the safety fact. Verus has no Thetis feature extractor, so lexical scanning remains an external tool. Inference: this classification does not prove safety; it identifies where contracts and proofs must be supplied.

evidence, assumptions and limits: the evaluated inventory covers Redox, KataOS, Theseus, BlogOS, ArceOS and `alloc.rs` (Table 2, p. 15). For example, Redox has 1,086 raw-pointer dereferences, 4,129 unsafe calls, 513 unsafe traits, 454 unions and 321 mutable statics; ArceOS has 94, 359, 57, 25 and 1 respectively (Table 2, p. 15). The method assumes category keywords, function names, operators and regular expressions are an adequate proxy for unsafe behavior. The paper itself notes duplicate and missed classifications when an unsafe operation is hidden in a library wrapper (Section 5.1, p. 16).

## technique: replace mutable statics with mutexes

what it is: replace a `static mut` value with `Mutex<T>`, then access it through a lock guard. Listing 5 intends to change `static mut TE: u32 = 0;` and an unsafe increment into a `Mutex<u32>` accessed through a guard. Its printed replacement uses `unwarp()` and an immutable binding `let t` before `*t += inc`; these are apparent code errors. Inference: the intended Rust form would use `unwrap()` and a mutable guard binding (Listing 5, p. 10).

when to use it: use this for shared mutable state whose accesses can be serialized. The paper motivates it by read-after-write, write-after-read and write-after-write races (Section 4.1.1, p. 9).

how it is done: (1) identify `static mut`; (2) choose a `Mutex<T>` with the same value type; (3) initialize it with `Mutex::new`; (4) replace each access by `lock().unwrap()` and mutate through the guard; (5) run the module tests and inspect possible deadlocks (Section 4.1.1, pp. 9–10). Rust's guard lifetime releases the lock automatically when the guard leaves scope (Section 4.1.1, p. 10).

Verus form: Inference: model the protected value as a state-machine or ghost state with a lock ownership token. The executable wrapper can expose a `requires` condition for holding the lock and an `ensures` condition that the state update is serialized. A Verus `invariant` declaration or state-machine invariant should express the protected relation; `invariant(...)` is not a function call. The Rust mutex implementation and OS scheduler remain trusted unless separately modeled.

evidence, assumptions and limits: the paper reports complete elimination of mutable-static operations in the repaired BlogOS and selected ArceOS modules (Figure 8, p. 17). Mutexes add locking and can deadlock if acquisition order is wrong; the authors state that Rust's lifetime-based release reduces forgotten-unlock deadlocks but does not remove logic-level deadlocks (Section 4.1.1, p. 10). No formal equivalence proof is supplied for arbitrary replacements.

## technique: replace unions with default-initialized structs

what it is: replace a union by a struct, derive `Default`, initialize every field, and add assertions to preserve the intended active-field behavior (Section 4.1.2, pp. 10–11). Listing 6 illustrates derived default initialization of `u32` and `f32` struct fields to zero (p. 10); its displayed derive and explicit `impl Default` explain the same initialization, rather than code to combine literally.

when to use it: use it when union storage is used for representation convenience and a small memory increase is acceptable. Union field reads are unsafe because only one field is initialized at a time (Section 2.2, p. 5).

how it is done: (1) change `union` to `struct`; (2) derive or implement `Default`; (3) initialize the struct with `Te::default()`; (4) replace each field assignment; (5) add assertions that untouched fields equal their default and that the active field has the assigned value (Listing 7, p. 10). Listing 7 intends to check the assigned field’s value and default values for untouched fields, but the displayed derive, assignments, assertions and variable names are malformed. The formulas here describe the intended checks; the listing is not compilable evidence (Listing 7, p. 10).

Verus form: Inference: represent the struct fields in ordinary Rust and state a `spec fn` predicate for the active variant and default values. Use `requires` for the selected variant, `ensures` for preservation of the selected value, and `assert`/`proof fn` lemmas for the field relation. Verus cannot assume that a struct has union layout; layout and FFI compatibility require separate contracts or a trusted boundary.

evidence, assumptions and limits: the authors explicitly say, “we did not use formal semantic equivalence proof methods to prove complete equivalence” (Section 4.1.2, p. 11). The replacement therefore has a semantic assumption, and it adds memory overhead. No union replacement case is shown for the repaired systems (Section 5.1, p. 17). The statement that BlogOS and ArceOS do not use unions conflicts with Table 2’s 25 union operations for ArceOS (p. 15); Figure 8 concerns only three selected ArceOS modules.

## technique: encapsulate raw-pointer dereferences and check preconditions

what it is: move the dereference into a small Interior Unsafe function with a safe calling interface, add an explicit lifetime, and assert pointer validity before dereferencing. The authors claim: “Thetis inserts the assert before the dereferenced raw pointers, which guarantees that only legal memory can be accessed.” (Section 4.2.1, p. 11). Inference: the shown non-null check does not establish that guarantee.

when to use it: use it when a raw pointer cannot be eliminated, especially in page-table and memory-management code. The wrapper narrows the region in which unsafe assumptions must hold.

how it is done: (1) locate the dereference; (2) move it into a helper such as `raw_usage`; (3) expose a safe function taking a `'static` reference; (4) add a caller-side assertion for the physical-to-virtual mapping; (5) add `assert!(!r.is_null())` immediately before `unsafe { &mut *r }`; (6) test the repaired call path (Section 4.2.1, pp. 11–12; Listing 8, p. 16). The BlogOS example intends to check the physical-memory offset, compute the virtual address and call the wrapper. However, its displayed `assert!` is malformed, and `raw_usage` is declared to accept `&'static mut PageTable` while the caller supplies `*mut PageTable`; its body calls `is_null()` on that reference. Inference: the listing needs repair before compilation, and merely attaching `'static` cannot extend a real allocation’s lifetime or establish exclusive access (Listing 8, p. 16).

Verus form: Inference: make the wrapper an executable function with `requires` stating non-null, alignment, lifetime and mapping facts, and `ensures` relating the returned reference to the pointed object. Keep the raw dereference inside a tightly scoped trusted or externally specified boundary; keep the verified function’s body visible to the proof system; an external-body declaration would change the trust boundary. Use a `proof fn` to establish the mapping precondition from boot information. Verus's `requires`/`ensures` are logical contracts, while the paper's runtime `assert!` is an executable check; both may be useful.

evidence, assumptions and limits: the paper reports that raw-pointer dereferences were eliminated from the repaired BlogOS and selected ArceOS modules (Figure 8, p. 17). A non-null test alone does not establish alignment, allocation validity or lifetime; the authors call `is_null` a “minimum level of safety” and says context-specific address checks can be added (Section 4.2.1, p. 12). The `'static` annotation may exceed the real lifetime, an assumption the authors acknowledge (Section 4.2.1, p. 11).

## technique: contract-check unsafe functions and traits

what it is: shrink an unsafe function or trait implementation to an Interior Unsafe block and attach ACSL-style preconditions and postconditions. The paper describes the contract as Hoare logic, “{pre-condition} function body {post-condition}” (Section 4.2.2, p. 13).

when to use it: use it when an operation cannot be replaced and its safety depends on input or execution environment. A contract makes those conditions visible at every call site.

how it is done: (1) identify the particular unsafe operation inside the function or trait; (2) move only that operation into the Interior Unsafe block; (3) write a precondition for valid input/environment; (4) write a postcondition for the return state; (5) insert assertions at calls to check the precondition and after calls to check the postcondition; (6) remove the `unsafe` keyword from a trait only after every unsafe method has been optimized (Section 4.2.2, pp. 12–13).

Verus form: Inference: put the precondition and postcondition in `requires` and `ensures` on the wrapper or proof-bearing function. Use `spec fn` predicates for reusable validity conditions and `proof fn` lemmas to establish them. Keep executable behavior in ordinary Rust. Verus does not provide ACSL annotations or Thetis's automatic trait rewriting, so trait safety still requires a manually checked abstraction boundary.

evidence, assumptions and limits: Thetis's claims here are partial: the authors say ACSL “provides lifetime support and partial verification for unsafe fragments” (Section 3, p. 7). They do not report a count of discharged ACSL obligations or a soundness proof for the contract translator. A false or overly strong precondition can make a call appear safe while excluding real executions.

## technique: feature-based defect detection

what it is: use regular expressions over `.rs` files to classify unsafe features and emit source ranges in a defect report. Algorithm 1 stores five regexes, scans each Rust file, counts matches, tracks braces with a stack, and outputs the matched region (Section 4.3, p. 14).

when to use it: use it as a cheap first pass before manual review or formal verification of a large Rust system. It is source-level and requires no execution.

how it is done: (1) store one regex per unsafe category; (2) iterate over files ending in `.rs`; (3) test each line/token against each regex; (4) increment the category count; (5) push opening braces and pop at matching closing braces; (6) output the source span and category in the defect report (Algorithm 1, p. 14).

Verus form: Inference: run the scanner outside Verus and convert each report into a proof backlog. A tool can check that every unsafe wrapper has a `requires`/`ensures` contract and that each reported raw-pointer site is either eliminated or explicitly justified. This is process automation, not a Verus proof.

evidence, assumptions and limits: manual inspection of Hubris, BlogOS and ArceOS gave feature-extraction accuracies of 87.8%, 80.6% and 85.4%; the mean is 84.6% over these three system-level percentages (Table 3, p. 16). Miri on ArceOS is reported as 63.6% for its separate detection experiment (Table 3, p. 16). These are classification accuracies against the authors' manual labels, not proof-completeness rates. The paper reports duplicate and misclassified cases caused by encapsulation and overlapping categories (Section 5.1, p. 16).

## technique: use Miri as a dynamic regression check

what it is: execute ArceOS modules with Miri before and after Thetis repairs to detect likely undefined behavior. The abstract reports: “The use of Miri to detect and eliminate defects in ArceOS reduces the likelihood of undefined behavior by about 50%” (Abstract, p. 1). Section 5.1 repeats this as an approximate reduction in potential UBs, without reporting a test count or denominator (p. 17).

when to use it: use it after source rewriting and contract insertion to catch runtime paths that static feature extraction does not evaluate.

how it is done: (1) run Miri on the original ArceOS modules; (2) apply replacement and encapsulation; (3) rerun the same modules with Miri; (4) compare the reported UB opportunities (Section 5.1, p. 17). The paper also re-inspects source interactions such as `run_queue::init()` and `INIT.call_once(thread::init_scheduler)` (Listing 10, p. 18).

Verus form: Inference: treat Miri as an independent dynamic check at unsafe or FFI boundaries, while Verus contracts prove the selected abstract property for all modeled executions. A passing Miri run cannot discharge a Verus `ensures`; a Verus proof cannot validate unmodeled interpreter, hardware or dependency behavior.

evidence, assumptions and limits: the paper reports only the relative reduction, not the number of tests, executions or denominator used to compute “about 50%” (Section 5.1, p. 17). Miri therefore supplies sampled dynamic evidence; the paper also notes that Miri can have false negatives and false positives (Sec. 2.3, p. 6). The tool, model and test selection remain trusted assumptions.

## what is proved, measured and trusted

The paper measures fewer syntactic unsafe operations, feature-classification accuracy, Miri UB reports and LMbench slowdown. Table 3’s 84.6% mean is the arithmetic mean of the three feature-extraction rows (87.8%, 80.6%, 85.4%), while the separate ArceOS Miri row is 63.6%. It does not present a machine-checked proof that replacement preserves semantics, that ACSL contracts are sound, or that the repaired operating systems are free of all undefined behavior. Its own union discussion says complete equivalence was not formally proved (Section 4.1.2, p. 11). Trusted or assumed components include the Rust compiler and standard library, regex classification rules, manually chosen replacement mappings, the correctness of ACSL assertions/contracts, Miri's semantics, the selected test executions, and the physical-memory assumptions in the BlogOS example.

The evaluated reductions are not all measured on the same denominator: Table 2 counts five systems and `alloc.rs`; Table 3 reports four accuracy rows; Figure 8 reports BlogOS and three selected ArceOS modules; the LMbench figure uses rCore (Sections 5.1–5.2, pp. 15–19). The abstract’s rounded “40%” BlogOS figure corresponds to the more precise 41.3% reported in Section 5.1 (p. 17), while ArceOS is 45% in both places. The abstract’s 1.076% performance loss is measured separately with LMbench on rCore. The paper gives no raw count for the approximately 50% Miri reduction, so that percentage cannot be independently recomputed from the text.

## techniques for the catalog

- finite unsafe-superpower inventory — classify five Rust unsafe operation categories before repair
- mutex replacement — replace mutable statics with `Mutex<T>` and scoped lock guards
- union-to-struct replacement — derive defaults and assert active-field behavior after changing representation
- raw-pointer Interior Unsafe wrapper — isolate dereferences behind lifetime and validity checks
- ACSL-style unsafe contracts — attach preconditions and postconditions to unsafe functions and traits
- feature-based defect report — scan Rust source with category regexes and emit matched spans
- Miri regression check — compare dynamic undefined-behavior reports before and after repair
