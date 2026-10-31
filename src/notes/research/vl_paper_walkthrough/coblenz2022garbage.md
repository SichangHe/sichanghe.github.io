# Garbage Collection Makes Rust Easier to Use: A Randomized Controlled Trial of the Bronze Garbage Collector
(authored by agents unless marked 🧑)
Tag: `coblenz2022garbage`, [paper](http://arxiv.org/abs/2110.01098v2)

## what the paper proves or measures

The paper presents Bronze, a Rust library for optional garbage-collected references, and a randomized controlled trial of its usability. Its central measured outcome is task performance by Rust learners; it does not prove Bronze's memory safety formally, and the authors report that the version the students used was unsound (§§2, 4, pp. 3-6). The abstract states: “We designed Bronze, an optional, library-based garbage collector for Rust.” (abstract, p. 1). It reports 428 students participating overall, with 333 randomized experimental records analyzed (139 Bronze and 194 Traditional). Of 385 students who signed up (190 assigned Bronze, 195 Traditional), 41 withdrew and 11 submitted code for both versions, and these 52 were not analyzed; the remaining participants of the 428 either submitted surveys without accepting random assignment (34) or accepted assignment without submitting surveys (36) (§5.1, p. 6).

## technique 1: a library interface for aliasing through garbage collection

What it is. Bronze places values in a garbage-collected heap behind `GcRef<T>`, allowing multiple mutable aliases without `Rc<RefCell<T>>`. The paper says: “Bronze introduces GcRef<T>, which represents a reference to a value of type T that exists in a garbage-collected portion of the heap.” (design, §2, p. 3). `GcRef::new(v)` moves `v` into that heap; `GcRef<T>` implements `Deref`; and a mutable `GcRef` can mutate the referent. A user derives `Trace` and `Finalize` for heap types. The paper's example compares a `set` function that takes `&Rc<RefCell<IntContainer>>`, calls `borrow_mut`, and writes `m.n`, with a Bronze function taking `mut GcRef<IntContainer>` and writing `c.n` (Figure 1, p. 4). Two references are made with `c1 = GcRef::new(...)` and `c2 = c1`, then both calls to `set` update the same object (Figure 1, p. 4).

When to use it. Use this interface when a data structure needs persistent, mutable aliases or cycles. The authors attribute the usability benefit to “free persistent (in-field) aliasing” without a separate `Rc` or `borrow` operation (design discussion, §2, p. 4). Bronze does not guarantee thread safety; the paper assigns that responsibility to the programmer (design, §2, p. 3).

How to apply it, following the paper's example.

1. Define the payload type (for example, `IntContainer { n: i32 }`) (Figure 1, p. 4).
2. Derive `Trace` and `Finalize` on a type stored in the GC heap; the paper says only types that implement `Trace` can be put on the garbage-collected heap, and macros derive both traits for straightforward types (Figure 1, p. 4; §2, p. 3).
3. Allocate with `GcRef::new(value)` (design, §2, p. 3).
4. Pass or copy the `GcRef` to obtain aliases, and mutate through a mutable reference (Figure 1, p. 4).
5. For types the derive macros do not handle, write your own `Trace` (used by the collector to trace through the object graph) and, if needed, `Finalize` (code that runs just before an object is deallocated) (design, §2, p. 3). The paper notes the prototype can trace only local variables of type `GcRef<T>` and that further work is needed for arbitrary types (§2, p. 3).

Inference: In Verus, the closest sound form is to keep ownership and aliasing in ordinary Rust and express the shared object through a ghost identity plus a representation invariant. A Verus `struct` can carry a `tracked` permission or map describing the heap object; `requires`/`ensures` clauses can state that each handle denotes the same object and that a mutation preserves the object invariant. Verus cannot treat an unrestricted `GcRef<T>` as permission for simultaneous mutable references: the paper's interface deliberately bypasses Rust's static aliasing discipline. `Trace`/`Finalize` and stack-map root discovery would remain trusted external runtime behavior unless separately specified and verified. This is an inference from the paper's runtime design, not a claim made by the authors.

Evidence and limits. Bronze's collector is precise mark/sweep; it tracks allocated objects in a linked list and collects unmarked objects. The paper explicitly qualifies the implementation: “Bronze’s mark/sweep implementation is only a proof of concept, however, and is not production-ready.” (design, §2, p. 3). The experiment used a version that never collects because assignments allocated too little memory (design, §2, p. 3). Root discovery depends on a modified Rust compiler emitting LLVM stack maps, and that mechanism assumes a single-threaded program (design, §2, p. 3). During review, the authors found that `Deref`, `as_ref`, and `as_mut` could create multiple mutable references and break Rust's invariant; they removed `Deref` and those methods and replaced them with dynamically tracked `borrow` and `borrow_mut` operations (§2, p. 3; limitations, §4, p. 6). They manually adapted 43 student submissions to estimate the effect of the corrected interface; most needed only inserted `borrow`/`borrow_mut` calls, while some needed local variables or curly braces to extend lifetimes (limitations, §4, p. 6).

Inference: A verified Rust product should treat the collector, compiler stack maps, finalization, and any unsafe implementation as trusted unless it verifies each component. The corrected API's dynamic borrow checks resemble a runtime protocol; Verus can specify the protocol's permitted states, but cannot infer safety from the library boundary alone.

## technique 2: randomized evaluation of a verification-relevant usability intervention

What it is. The authors isolate the garbage-collection interface as an independent variable by randomly assigning students to Bronze or Traditional Rust while keeping the assignment structure and instruction shared. They used three cumulative tasks: Basics, Ownership, and Aliasing; Bronze students then repeated Aliasing without GC. The paper says: “We conducted an experiment in which we randomly assigned participants to use either traditional Rust or Bronze when completing a multi-part programming assignment.” (method, §3, p. 4).

How to apply the evaluation method.

1. Recruit a defined learner population and obtain consent (the course had 633 enrolled students; §3.2, p. 5).
2. Randomly assign consenting students to Bronze or Traditional conditions; the Qualtrics tool did the assignment upon consent (§3.3, p. 5).
3. Give both groups the same conceptual tasks, with versions adapted to use GC or not (Table 1 and §3.1, pp. 3-5); Bronze participants additionally redid Aliasing without GC.
4. Record completion (100% score), self-reported task time, surveys after each part, and prior Rust experience (§§3.3, 5.1, pp. 5-6).
5. Reserve 10% of randomized data for exploratory analysis, discard it, and test planned hypotheses on the remaining 90%; apply Holm–Bonferroni correction with α = 0.05 (§5.2, p. 7).
6. Use Fisher exact tests for completion rates and nonparametric Wilcoxon tests for times after a Shapiro–Wilk normality check (§§5.3–5.4, p. 7).

Evidence. Among the 301 analyzed records for completion (333 randomized records minus the reserved 10%), Bronze users were significantly more likely to complete `AliasingGC` than Traditional users were to complete `AliasingnoGC` (p ≈ .006; §5.3, p. 7). Among 149 students who finished all post-Basics tasks, the Bronze median for Aliasing was 4 hours versus 12 hours for Traditional (Wilcoxon W = 561, p < .001; §5.4, p. 7). The total time, including Bronze students' subsequent `AliasingnoGC` task, did not differ significantly (W = 2354.5, p ≈ 1; §5.4, p. 7). For the survey question whether GC makes writing programs easier, 64 of 89 Bronze respondents (72%) strongly agreed after the experiment and 3 (3%) strongly disagreed (§1.2, p. 3); §5.5 reports median agreement of 2 after Basics and 4 after AliasingnoGC, with an ordinal regression p < .001 and odds ratio 21.4 (§5.5, p. 8).

## techniques for the catalog

- bronze gcref aliasing — allocate `Trace`/`Finalize` values with `GcRef::new` so persistent mutable aliases use one handle interface instead of `Rc<RefCell<T>>`

- runtime tracing and finalization — define `Trace` traversal and `Finalize` cleanup while a precise mark/sweep runtime discovers roots through compiler stack maps

- randomized usability evaluation — randomize users across abstraction and baseline, reserve exploratory data, then test completion and time with denominator-aware corrected statistics

- verus boundary modeling — inference: represent shared identities and mutation permissions with Verus ghost state and invariants, while treating collector and stack-map behavior as explicitly trusted unless verified
