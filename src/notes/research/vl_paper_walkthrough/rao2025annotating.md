# Annotating and Auditing the Safety Properties of Unsafe Rust
(authored by agents unless marked 🧑)
Tag: `rao2025annotating`, [paper](http://arxiv.org/abs/2504.21312v2)

## what the paper establishes
The paper presents a tag-centric audit method for unsafe Rust documentation. Its aim is contract consistency: every safety obligation introduced by unsafe operations must either be checked internally or be stated for the caller, including obligations that flow through stored object state. The paper says, “This paper presents a tag-centric methodology for auditing the consistency and completeness of safety documentation.” (abstract, p.1). It implements the method in `safety-tool`, audits Rust nightly 1.84.0 `core`, `alloc`, and `std`, and reports 516 public unsafe APIs (excluding most intrinsics), coverage of 96.1% by the tags, 27 APIs with 61 fixed safety tags, and merged fixes for all 27. These are the paper's measurements; they do not prove that every unsafe API is memory-safe or that the taxonomy captures functional correctness.

Inference: for VL (VeruLaw), the transferable idea is a machine-readable contract layer that tracks unsafe or proof-relevant obligations across call sites and constructors before a Verus proof is attempted.

## technique: derive a parameterized safety-tag taxonomy
What it is: replace fragmented natural-language requirements with tags whose arguments instantiate the concrete pointers, types, lengths, ranges, and roles. The paper derives 21 primitive tags in five categories: Layout, Pointer, Content, Alias, and Contextual (Section 4, pp.6–10). Examples include `Align`, `Size`, `!Padding`, `!Null`, `Allocated`, `InBound`, `!Overlap`, `ValidNum`, `ValidString`, `ValidCStr`, `Init`, `Unwrap`, `Typed`, `Owning`, `Alias`, `Alive`, `Pinned`, `!Volatile`, `Opened`, `Trait`, and `!Reachable`; compound properties include `Deref`, `ValidPtr`, `Ptr2Ref`, and `Layout` (Table 2, p.8; Section 4.3.6, p.10).

When to use it: use this when contracts recur across APIs but are expressed inconsistently, or when a caller must preserve an obligation after an unsafe call. The paper's reason is that “Programs have an infinite logic space, but any practical annotation system must be finite.” (Section 4.5, p.10). It treats repetition as the abstraction boundary: `ValidNum(self + rhs <= u8::MAX)` and `ValidNum(len * size_of::<T>() <= isize::MAX)` use one tag with different arguments (Section 4.2.4, p.7).

How to do it, following the paper:
1. Review public unsafe API documentation and follow cross-references until implied constraints are explicit; the paper resolves “pointer must be valid” into dereferenceability, non-dangling, and allocation-range constraints (Section 4.2.1, p.7).
2. Classify each constraint by the UB category it prevents, using the five categories (Section 4.2.2, p.7).
3. Group recurring constraints bottom-up; the paper merges numerical bounds from `unchecked_add` and `slice::from_raw_parts` into `ValidNum` (Section 4.2.3, p.7).
4. Add arguments that identify the actual program values and assign the role `precondition`, `hazard`, or `option` (Sections 4.2.4 and 4.4, pp.7, 10).
5. Combine primitive tags when a requirement is conventionally composite: `Deref = Allocated && InBound`, `ValidPtr = ZST || (!ZST && Deref)`, and `Ptr2Ref = Align && Deref && Alias` (Section 4.3.6, p.10).

Verus form: Inference: represent each tag as a `requires` clause, a `recommends` clause where applicable, or a proof predicate over ghost state. Use `requires` and `ensures` on executable functions, `spec fn` for pure predicates, `old(...)` for pre-state values, and `assert`/`assume` only where the modeled boundary is genuinely trusted. A Verus-shaped pointer wrapper could expose `spec fn valid_ptr(...) -> bool` and require it at an unsafe boundary; the paper's tag syntax itself is not Verus syntax and does not establish pointer semantics in Verus. Hazardous state should be an `ensures` fact carried by a returned ghost/state object or a maintained invariant, rather than a Verus `invariant(...)` call.

Evidence and limits: the paper reports 744 tags for 414 `core` APIs (98.3% coverage), 105 tags for 64 `alloc` APIs (82.8%), and 44 tags for 38 `std` APIs (84.2%) (Section 7.1, p.15). Overall coverage is 96.1%; the 3.9% remainder includes system-level or functional properties such as `env::set_var` (Section 7.1, p.15). Inference: this is evidence for practical annotation coverage in this library snapshot, not completeness for arbitrary crates or Verus functional specifications.

## technique: construct audit units around state dependencies
What it is: audit a target API together with constructors that create the state it later relies on. The paper defines a target API as unsafe or internally unsafe, a constructor as a function that creates a struct without consuming an existing instance, and an audit unit as the target plus its constructors (Section 5.2, pp.11–12). Function-level units check a standalone function's calls; method-level units include constructor paths because a safe method may later invoke an unsafe operation using stored state.

When to use it: use method-level units for wrappers such as `Box<T,A>::drop`, where a constructor establishes allocator provenance and a later safe method calls `Allocator::deallocate`. The paper's example says that `from_raw_in` can accept a pointer from the wrong allocator, after which `drop` deallocates it and causes undefined behavior (Section 5.1, p.11).

How to do it:
1. Identify target APIs and their unsafe callees (Definition 1, Section 5.2).
2. Identify every constructor returning the target struct or smart pointer (Definition 2).
3. Group each target with those constructors (Definition 3).
4. Trace tags through the object's fields and call chain, recording where each obligation is discharged, propagated, or omitted (Section 5.1, p.11).

Verus form: Inference: model the representation invariant as a `spec fn` and attach it with `#[verifier::type_invariant]` when all instances must satisfy it. Constructors use `ensures` to establish the invariant; methods use `requires` and `ensures` to preserve it. A `View` can expose logical ownership or allocator provenance, but raw allocator behavior remains a modeled assumption unless separately verified. Do not translate the paper's informal “hazard” into a nonexistent Verus syntax feature.

Evidence and limits: the audit found 1,184 units in `core`, 269 in `alloc`, and 158 in `std`; method-level units were 28.89%, 37.92%, and 49.37%, respectively (Figure 6, p.16). Inference: the rising method-level share in higher-level crates indicates more cross-function review effort, but the paper does not measure auditor time per unit.

## technique: apply the three progressive audit rules
Rule I, Call-Site Check: for each unsafe callee, require that every safety demand is either discharged by code or documented on the caller. The paper's example finds `Box::from_raw` missing the `Allocator` requirement delegated from `from_raw_in` (Section 5.3, p.12).

Rule II, Constructor Guarantee Check: when a method does not discharge a state-dependent obligation, every valid constructor must establish it internally or document it for its caller. The paper reports that `Box::from_raw_in` and `Box::from_non_null_in` failed to account for allocator provenance required later by `drop` (Section 7.2.2, pp.17–18).

Rule III, State Exposure Check: inspect public fields or literal constructors that can mutate the state on which a safe method relies. If such state is exposed, document the caller's obligation; otherwise the constructor-established guarantee can be bypassed (Section 5.3, p.13). The paper reports a `Pin<T>` issue: its public pointer field permitted a literal constructor that bypassed `new_unchecked`'s `Unpin` or pinning requirement (Section 7.2.2, p.19).

How to use the rules: build the unit; list each unsafe callee's required tags; mark each tag as checked internally, delegated in documentation, established by each constructor, or exposed through mutable state; report missing or contradictory tags. This procedure is the paper's audit algorithm. Inference: for Verus, the same ledger can be generated from `requires`/`ensures` and type invariants, then checked by Verus and a linter for obligations that cross module boundaries.

Evidence: the authors fixed 29 property issues across 15 APIs through call-site and constructor checks, in addition to 30 root annotation omissions found by inference rules; the total is 27 APIs and 61 tags because some APIs have multiple issues (Section 7.2.2, pp.17–18; Table 3, p.18). The paper also found two false `!Null` annotations for zero-sized types (Section 7.2.2, p.18). Inference: these findings show documentation defects, not a direct measurement of runtime exploitability.

## technique: infer expected tags and enforce them continuously
The paper uses seven inference rules as a filter, not as a complete proof. Rule 1 requires every public unsafe API to have a nonempty tag set. Rules 2–6 infer tags from raw-pointer ownership/reference conversions, allocator parameters, `unchecked` names and modules, and `assume_init`; Rule 7 conservatively delegates all callee tags to a caller unless the caller checks them (Section 7.2.1, pp.16–17). The authors manually investigate flagged mismatches with the three audit rules.

`safety-tool` makes the result executable. Tags are defined centrally in TOML with an identifier, arguments, description, formal expression, and URL; attributes `#[safety::requires]` and `#[safety::checked]` annotate definitions and call sites (Section 6.1.1, p.13). At a tagged unsafe call, the caller must check or propagate every required identifier; missing tags produce an error (Section 6.1.2, p.14). A procedural macro expands tags into ordinary documentation, and a Rust compiler driver plus VSCode and Neovim LSP plugins provide checking and completion (Sections 6.1.3–6.1.4, p.14). The paper states, “This ensures the documentation always stays in sync with the actual safety contracts.” (Section 6.1.3, p.14).

Verus form: Inference: implement the linter over Verus contracts by extracting `requires` and `ensures`, checking that every call's precondition is proven or deliberately propagated, and validating that `#[verifier::type_invariant]` is preserved by constructors and field visibility. Verus proofs remain the authority for the modeled formulas; the linter should catch missing contract links and documentation drift. `spec fn`, `proof fn`, `requires`, `ensures`, `assert`, `old`, `View`, and `#[verifier::type_invariant]` are the relevant constructs found in the Verus notes. The paper's `#[safety::requires]` is a proposed Rust attribute, not a Verus construct.

Evidence and trust: safety-tool's reported impact is the 27 APIs and 61 tags corrected in the nightly 1.84.0 standard-library snapshot, with all fixes merged according to the paper (abstract and Section 7, pp.1, 15). Inference: the tool, parser, tag configuration, Verus verifier, SMT solver, compiler, and the truth of each contract remain trusted components; a linter can enforce consistency with a wrong tag. Inference: threat to VL is high when agent-generated unsafe wrappers silently omit a precondition, and materially reduced when contracts are reviewed and checked at every call boundary; residual threat remains for omitted tags, wrong specifications, external code, and exposed state.

## what is proved, measured, and trusted
The paper measures tag coverage, audit-unit counts, inferred omissions, and accepted documentation fixes. It does not prove the semantic soundness of all 516 APIs, prove that the 21 tags cover all functional behavior, or report a soundness theorem for `safety-tool`. It explicitly leaves 3.9% of APIs outside the taxonomy and notes 171 intrinsic APIs without safety descriptions (Section 7.2.2, p.17). Inference: VL should use this work as a contract-audit front end and risk detector, not as a replacement for Verus proofs of functional and memory properties.

## what VL should not redo
The paper already supplies a five-category, 21-tag vocabulary; constructor-aware audit units; three audit rules; seven signature/call inference rules; and a linter design with structured attributes, documentation expansion, and IDE support. Reimplementing those ideas without measuring a Verus-specific gap would duplicate existing work. Inference: a useful VL extension would instead evaluate whether Verus contracts can automatically instantiate these tags and whether dependency upgrades trigger equivalent contract-drift diagnostics.

## techniques for the catalog
- parameterized safety tags — normalize recurring unsafe obligations into named predicates with concrete arguments and contractual roles
- constructor-aware audit units — audit target methods together with every constructor that establishes their state invariants
- three-rule documentation audit — check call sites, constructor guarantees, and exposure of invariant-bearing state
- signature and call inference — infer likely obligations from API names, types, modules, and callee requirements
- continuous contract linter — enforce checked-or-propagated obligations and expand structured tags into synchronized documentation
Checked 2026-10-14 against the paper by a Codex agent: audit record rao2025annotating; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
