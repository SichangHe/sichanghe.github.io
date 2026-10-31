# Annotating and Auditing the Safety Properties of Unsafe Rust
(authored by agents unless marked 🧑)
Tag: `rao2026annotating`, [paper](https://arxiv.org/abs/2504.21312v2)

## what the paper establishes
The paper presents a tag-centric audit method for unsafe Rust documentation. Its aim is contract consistency: every safety obligation introduced by unsafe operations must either be checked internally or be stated for the caller, including obligations that flow through stored object state. The paper says, “This paper presents a tag-centric methodology for auditing the consistency and completeness of safety documentation.” (abstract, p.1). It implements the method in `safety-tool`, audits Rust nightly 1.84.0 `core`, `alloc`, and `std`, and reports 516 public unsafe APIs (excluding most intrinsics), coverage of 96.1% by the tags, 27 APIs with 61 fixed safety tags, and merged fixes for all 27. The supplied version is dated 25 April 2026 on its first page. Inference: these measurements do not establish that every unsafe API is memory-safe or that the taxonomy captures functional correctness.

## technique: derive a parameterized safety-tag taxonomy
What it is: replace fragmented natural-language requirements with tags whose arguments instantiate the concrete pointers, types, lengths, ranges, and roles. The paper derives 21 primitive tags in five categories: Layout, Pointer, Content, Alias, and Contextual (Section 4, pp.6–10). Examples include `Align`, `Size`, `!Padding`, `!Null`, `Allocated`, `InBound`, `!Overlap`, `ValidNum`, `ValidString`, `ValidCStr`, `Init`, `Unwrap`, `Typed`, `Owning`, `Alias`, `Alive`, `Pinned`, `!Volatile`, `Opened`, `Trait`, and `!Reachable`; compound properties include `Deref`, `ValidPtr`, `Ptr2Ref`, and `Layout` (Table 2, p.8; Section 4.3.6, pp.9–10).

When to use it: use this when contracts recur across APIs but are expressed inconsistently, or when a caller must preserve an obligation after an unsafe call. The paper's reason is that “Programs have an infinite logic space, but any practical annotation system must be finite.” (Section 4.5, p.10). It treats repetition as the abstraction boundary: `ValidNum(self + rhs <= u8::MAX)` and `ValidNum(len * size_of::<T>() <= isize::MAX)` use one tag with different arguments (Section 4.2.4, p.7).

How to do it, following the paper:
1. Review public unsafe API documentation and follow cross-references until implied constraints are explicit; the paper resolves “pointer must be valid” into dereferenceability, non-dangling, and allocation-range constraints (Section 4.2.1, p.7).
2. Map constraints from the four UB categories in Table 1 to five tag categories, separating Layout from Pointer and introducing Contextual for state-dependent invariants (Section 4.2.2, p.7).
3. Group recurring constraints bottom-up; the paper merges numerical bounds from `unchecked_add` and `slice::from_raw_parts` into `ValidNum`. Two authors cross-validate the derived tags (Section 4.2.3, p.7).
4. Add arguments that identify the actual program values and assign the role `precondition`, `hazard`, or `option` (Sections 4.2.4 and 4.4, pp.7, 10).
5. Combine primitive tags when a requirement is conventionally composite: `Deref = Allocated && InBound`, `ValidPtr = ZST || (!ZST && Deref)`, and `Ptr2Ref = Align && Deref && Alias` (Section 4.3.6, pp.9–10).

Verus form: Inference: translate tag meanings into proof predicates or function preconditions. Model a hazardous state as an obligation maintained across later operations; a fact true immediately after a call does not alone express that continuing obligation. The paper defines a hazard as “a persistent constraint imposed by an API call that the caller must uphold throughout subsequent operations.” (Section 4.4, p.10). It does not provide a Verus encoding.

Evidence and limits: the paper reports 744 tags for 414 `core` APIs (98.3% coverage), 105 tags for 64 `alloc` APIs (82.8%), and 44 tags for 38 `std` APIs (84.2%) (Section 7.1, p.15). Overall coverage is 96.1%; the 3.9% remainder includes system-level or functional properties such as `env::set_var` (Section 7.1, p.15). Inference: this is evidence for practical annotation coverage in this library snapshot, not completeness for arbitrary crates or Verus functional specifications.

## technique: construct audit units around state dependencies
What it is: audit a target API together with constructors that create the state it later relies on. The paper defines a target API as unsafe or internally unsafe, a constructor as a function that creates a struct without consuming an existing instance, and an audit unit as the target plus its constructors (Section 5.2, pp.11–12). Function-level units check a standalone function's calls; method-level units include constructor paths because a safe method may later invoke an unsafe operation using stored state.

When to use it: use method-level units for wrappers such as `Box<T,A>::drop`, where a constructor establishes allocator provenance and a later safe method calls `Allocator::deallocate`. The paper's example says that `from_raw_in` can accept a pointer from the wrong allocator, after which `drop` deallocates it and causes undefined behavior (Section 5.1, p.11).

How to do it:
1. Identify target APIs and their unsafe callees (Definition 1, Section 5.2, p.11).
2. For an instance method, identify every associated constructor returning the struct or a smart pointer to it, without a `self` parameter (Definition 2, p.11).
3. Form a method-level unit from that target and its constructors; use a function-level unit for a standalone function or static method without `self` (Definition 3 and unit types, pp.11–12).
4. Trace tags through the object's fields and call chain, recording where each obligation is discharged, propagated, or omitted (Section 5.1, p.11).

Verus form: Inference: express the shared state requirement as a proof predicate. Have each constructor establish it and each method preserve it. Allocator provenance needs an explicit model; the paper does not verify raw allocator behavior in Verus.

Evidence and limits: the audit found 1,184 units in `core`, 269 in `alloc`, and 158 in `std`; method-level units were 28.89%, 37.92%, and 49.37%, respectively (Section 7.1, p.15; Figure 6, p.16). Inference: the rising method-level share in higher-level crates indicates more cross-function review effort, but the paper does not measure auditor time per unit.

## technique: apply the three progressive audit rules
Rule I, Call-Site Check: for each unsafe callee, require that every safety demand is either discharged by code or documented on the caller. The paper's example finds `Box::from_raw` missing the `Allocator` requirement delegated from `from_raw_in` (Section 5.3, pp.12–13).

Rule II, Constructor Guarantee Check: when a method does not discharge a state-dependent obligation, every valid constructor must establish it internally or document it for its caller. The paper reports that `Box::from_raw_in` and `Box::from_non_null_in` failed to account for allocator provenance required later by `drop` (Section 7.2.2, p.18).

Rule III, State Exposure Check: inspect public fields or literal constructors that can mutate the state on which a safe method relies. If such state is exposed, document the caller's obligation; otherwise the constructor-established guarantee can be bypassed (Section 5.3, p.13). The paper reports a `Pin<T>` issue: its public pointer field permitted a literal constructor that bypassed `new_unchecked`'s `Unpin` or pinning requirement. It says, “We have reported the issue to the official Rust repository, but it remains unresolved and is therefore omitted from the table 3.” The paper describes a hidden field, the `unsafe_pin_internals` feature requirement, and a claimed bypass through `pin!` (Section 7.2.2, p.19). This is a reported, unresolved issue, separate from the merged fixes.

How to use the rules: build the unit; list each unsafe callee's required tags; mark each tag as checked internally, delegated in documentation, established by each constructor, or exposed through mutable state; report missing or contradictory tags. This restates the paper's manual audit rules. Inference: a Verus adaptation could maintain the same record of obligations alongside proof contracts and representation invariants.

Evidence: Section 7.2.2 reports 14 APIs with 30 tags corrected through inference rules (p.17), then states, “Our application of audit rules uncovered a total of 29 safety property issues spanning 15 APIs.” (p.18). It separately reports 23 delegation instances across 11 APIs (pp.18–19) and two false `!Null` annotations in `read_unaligned` and `write_unaligned` (Table 3, p.18; discussion, p.19). The overall result remains the authors' reported 27 APIs and 61 tags. Inference: these breakdowns do not provide a complete numerical reconciliation of that total, so they should not be treated as disjoint counts that sum to 61. The findings concern documentation; runtime exploitability was not measured.

## technique: infer expected tags and enforce them continuously
The paper uses seven inference rules as a filter, not as a complete proof. Rule 1 requires every public unsafe API to have a nonempty tag set. Rules 2–6 infer tags from raw-pointer ownership/reference conversions, allocator parameters, `unchecked` names and modules, and `assume_init`; Rule 7 predicts delegation of all unsafe-callee tags under the conservative assumption that the caller verifies nothing (Section 7.2.1, pp.16–17). The authors manually investigate flagged mismatches with the three audit rules.

`safety-tool` checks the resulting annotations. Tags are defined centrally in TOML with an identifier, arguments, roles, description, formal expression, and URL; attributes `#[safety::requires]` and `#[safety::checked]` annotate definitions and call sites (Section 6.1.1, p.13). At a tagged unsafe call, the caller must check or propagate every required identifier; missing tags produce an error (Section 6.1.2, pp.13–14). A procedural macro expands tags into ordinary documentation, and a Rust compiler driver plus VSCode and Neovim LSP plugins provide compiler-based checking and editor autocompletion and hover documentation (Sections 6.1.3–6.1.4, p.14). The paper states, “This ensures the documentation always stays in sync with the actual safety contracts.” (Section 6.1.3, p.14).

Verus form: Inference: extract obligations from proof contracts and use annotation checks to flag missing links when dependencies change. Actual verification must establish that code satisfies the modeled formulas. The paper's `#[safety::requires]` and `#[safety::checked]` attributes are not Verus constructs.

Evidence and trust: the 27 APIs and 61 tags are results of the overall methodology, including manual analysis; the paper does not isolate a defect count found by `safety-tool` alone. Section 6.1.2 states that caller annotations must “include all defined property identifiers” (p.13). Inference: identifier consistency does not prove that arguments are semantically correct, that an asserted check works, or that the tag definitions are complete. A Verus adaptation would also depend on its specifications and trusted verification components.

The authors submitted a Safety Tags RFC proposing standard-library annotations, Clippy checking, and rust-analyzer support. They describe it as “presently under active deliberation” (Section 6.2, p.14), rather than an adopted standard.

## what is proved, measured, and trusted
The paper measures tag coverage, audit-unit counts, inferred omissions, and accepted documentation fixes. It does not prove the semantic soundness of all 516 APIs, prove that the 21 tags cover all functional behavior, or report a soundness theorem for `safety-tool`. It explicitly leaves 3.9% of the 516 counted APIs outside the taxonomy and notes 171 intrinsic APIs without safety descriptions (Sections 7.1, p.15, and 7.2.2, p.17).

## techniques for the catalog
- parameterized safety tags — normalize recurring unsafe obligations into named predicates with concrete arguments and contractual roles
- constructor-aware audit units — audit target methods together with every constructor that establishes their state invariants
- three-rule documentation audit — check call sites, constructor guarantees, and exposure of invariant-bearing state
- signature and call inference — infer likely obligations from API names, types, modules, and callee requirements
- continuous contract linter — enforce checked-or-propagated obligations and expand structured tags into synchronized documentation
