# Automated verification of practical garbage collectors
(authored by agents unless marked 🧑)
Tag: `podelski2009automated`, [paper](https://www.semanticscholar.org/paper/2d0c3df0bec1c403314b7740192228c2e6146091)

## result and specification boundary

Hawblitzel and Petrank verify a Cheney copying collector and a mark-sweep collector, including allocators, in an x86-like Boogie language. The abstract says: “We used the Boogie verification generator and the Z3 automated theorem prover to verify this assembly language code mechanically.” The central specification abstracts physical addresses into a ghost graph: a concrete-to-abstract mapping `$toAbs`, abstract memory `$AbsMem`, and invariants relating object fields, allocation state, and collector colors. The verified interface is `Initialize`, `Alloc`, `ReadField`, and `WriteField`; a mutator uses these operations without directly modifying the representation.

Inference: this is a concrete design pattern for Verus systems proofs: separate an abstract state machine from raw memory and prove each low-level operation preserves the representation invariant. It does not show that arbitrary unsafe Rust or a real runtime is verified automatically.

## technique: abstract/concrete simulation with ghost state

Use this when physical pointers and moving objects make direct functional specifications awkward. `$AbsMem` records the abstract object graph, while `$toAbs` maps each allocated concrete address to a unique abstract node or `NO_ABS`. `WellFormed` enforces injectivity; `ObjInv` says each concrete object's fields point to concrete addresses representing the corresponding abstract values; `MutatorInv` packages these facts and allocation/color constraints. `Initialize` establishes the invariant, and every interface procedure requires and ensures it.

Steps (Section 4.1, pp. 7–9): (1) define the abstract graph and concrete memory arrays; (2) introduce ghost mappings and prove `WellFormed`; (3) define `Pointer` and `ObjInv`; (4) define the mutator invariant over every memory address; (5) give preconditions for valid pointers and abstract updates; (6) give postconditions that preserve the invariant and update `$AbsMem`; (7) verify collection separately, requiring all surviving objects to have been reached during the collection. The paper emphasizes that “The verification ensures that if an allocation or garbage collection operation completes, then the physical heap managed by the allocator and collector faithfully represents the abstract graph of objects defined by the mutator.”

Verus form (Inference): make the abstract graph a ghost value or `spec fn`, define a representation predicate over addresses and ghost mappings, and put it in `requires`/`ensures` of allocator and field operations. Use `proof fn`s for mapping injectivity and field correspondence. Verus ownership and borrows must account for aliasing and mutable memory; the Boogie array model's unrestricted mathematical updates do not carry over.

## technique: tri-color mark-sweep invariants

Use this to verify tracing collection without proving an entire reachability algorithm as one monolith. Objects are white (unvisited), gray (discovered but not scanned), or black (scanned). `GcInv` requires that black objects do not point to white objects, and that allocated objects satisfy `ObjInv`. The mark procedure colors a node gray before recursively visiting children, then black afterward; this intermediate state prevents cycles from causing nontermination of recursive marking. Sweep requires no gray objects, deallocates white objects, and turns black objects white for the next cycle.

Steps (Sections 4.2 and 7.1, pp. 15 and 27–29): (1) initialize reachable roots gray and put them on the mark stack; (2) pop a gray object; (3) push each white child and color it gray; (4) color the popped object black; (5) after the mark phase, scan the heap; (6) free white objects and remove their mappings; (7) recolor black objects white; (8) maintain free-list and local-cache invariants in the allocator. The practical collector uses an iterative mark stack and a simple linear sweep to balance speed and proof tractability.

Verus form (Inference): encode color and mark-stack facts in loop `invariant`s and prove each mutation preserves no-black-to-white edges. Use a `decreases` measure only if proving termination is a product requirement; the paper explicitly does not prove termination. Represent the collector's abstract graph with a ghost map and use `ensures` to relate post-collection reachable objects to allocated memory.

## technique: region-based invariants for moving collectors

Use regions when a copying collector changes mappings and a single global object invariant creates non-local quantified obligations. The paper replaces one `$toAbs` mapping with source and target regions `$rs` and `$rt`, requires regions to grow monotonically via `RExtend`, and lets object fields point from one region to another. During copying, `$r1` describes from-space and `$r2` the growing to-space; after collection, `$r2` becomes the current representation.

Steps (Section 5, pp. 17–19): (1) define region mappings and a monotonic extension predicate; (2) define `ObjInv(i,$rs,$rt,...)` so field lookups use the target region; (3) establish source-region invariants before copying; (4) add each copied object to the target region; (5) prove that target pointers remain valid under region extension; (6) discard source-region facts only after the collection's postconditions establish the target representation. This converts many non-local facts into local color/region cases. The paper notes that “Together, these three strategies were sufficient for both mark-sweep and copying collectors.”

Verus form (Inference): model each region as a ghost set/map and prove monotonicity with `ensures`; use `invariant` clauses for source/target ownership and copied-object correspondence. Verus cannot use Boogie's `$` ghost naming convention or mathematical arrays directly; encode snapshots and maps using supported spec values and explicit proof lemmas.

## technique: trigger-directed quantified automation

Use triggers to control SMT instantiation of quantified invariants. The authors write logically equivalent quantified formulas with different triggers and add a true function `T(i)` solely as a trigger. They explicitly assert `T(e)` for program expressions that should instantiate an invariant, while avoiding trigger expressions that recursively reintroduce themselves. The paper warns: “With an overly selective trigger, a quantified formula may never get instantiated, leaving a theorem unproved. With an overly liberal trigger, a quantified formula may be instantiated too often (or even infinitely often), drowning the theorem prover in unwanted information.”

Steps (Section 4.3, pp. 15–17): (1) identify quantified array or pointer invariants; (2) choose a trigger expression such as `memAddr(i)` or `Color[i]`; (3) if these create loops, add a semantically trivial trigger function; (4) assert trigger instances at relevant addresses; (5) use shared triggers to relate old and new array values for local updates; (6) add region-extension triggers for non-local pointer facts; (7) split general pointer and field-index triggers in the realistic collector. Local facts work for mark-sweep; forwarding pointers require regions and additional triggers.

Verus form (Inference): control quantifier exposure through explicit proof lemmas and carefully chosen quantified `requires`/`ensures` facts. Verus's solver interface is different from Boogie's trigger syntax, so the exact `T(i)` idiom is not a Verus construct; use only supported Verus quantifier patterns and proof functions.

## technique: verified subset translation and specification testing

The realistic collectors are written in an x86-like Boogie subset, then translated to MASM-compatible x86 by a small tool. The translator rejects ghost variables at run time, enforces matched calls and returns, restricts memory to checked `Load`/`Store`, and preserves 32-bit word bounds. The authors deliberately translate verified Boogie to assembly, rather than assembly to Boogie, so the trusted verifier has checked the source before code generation.

The large Bartok specification was tested two ways: Boogie's smoke feature attempted to prove false assertions, and a hand translation to C# added runtime assertions to the original collectors. Those checks found five specification bugs, including address-unit and compressed-return-table mistakes. Inference: this is an essential validation layer for VL because a mechanically proved but wrong ghost model can otherwise hide an implementation defect.

## evidence, assumptions, and threat

The miniature collector has seven verified procedures in less than two seconds. For practical collectors, Table 1 reports 115 seconds for copying, 70 seconds for mark-sweep, and 12 seconds for shared code on one 2.4GHz Intel Core2; the code has 802 and 865 x86 instructions before inlining, 2,398 and 3,038 non-comment Boogie lines, plus 779 shared lines, and about two to three annotation lines per instruction. The performance comparison uses ten C# benchmarks on one four-core machine and reports time and space in the same general range as Bartok's native runtime; it is not a speedup denominator for all programs.

What remains trusted includes Boogie, Z3, the Boogie-to-x86 translator, the abstract memory specification, hardware, and unsupported runtime behavior. The paper states that verification “does not prove termination”; collectors may halt on out-of-memory or unsupported multithreading. Inference: for agent-written verified Rust, the largest threat is an abstraction gap between raw pointers, allocator metadata, and the ghost heap model. Existing work already demonstrates simulation invariants, tri-color reasoning, regions, and trigger engineering, so VL should reuse these patterns and focus on Rust ownership and runtime integration.

## techniques for the catalog

- ghost abstract/concrete simulation — map physical addresses to an abstract object graph and preserve the mapping invariant
- tri-color mark-sweep proof — maintain no-black-to-white edges through mark, sweep, and allocation loops
- region-based copying proof — use monotone source/target regions to localize moving-pointer invariants
- trigger-directed SMT automation — choose and assert quantifier triggers to control useful instantiation
- verified subset translation — verify an x86-like source subset, then translate while rejecting unsupported ghost behavior
- specification testing — test the ghost model with smoke proofs and runtime assertions to expose specification bugs
Checked 2026-10-14: audit record podelski2009automated; paper-study comparison complete; gate executed; experiments not rerun
