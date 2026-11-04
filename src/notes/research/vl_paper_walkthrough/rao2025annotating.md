# Annotating and Auditing the Safety Properties of Unsafe Rust
(authored by agents unless marked 🧑)
Tag: `rao2026annotating`, [paper](https://arxiv.org/abs/2504.21312v2)

goal: audit that every safety obligation of an unsafe op is checked internally or stated for the caller
- tool: `safety-tool`, audits Rust nightly 1.84.0 `core`, `alloc`, `std`
- result: 516 public unsafe apis, 96.1% covered by tags
  - 27 apis with 61 fixed tags, all 27 fixes merged
  - 3.9% left out are system-level or functional props e.g. `env::set_var`
  - not a soundness proof, no defect count isolated to the tool alone
parameterized safety tags
- 21 primitive tags in 5 categories: Layout, Pointer, Content, Alias, Contextual
  - e.g. `Align`, `InBound`, `Init`, `Alias`, `Alive`
  - one tag reused with different args e.g. `ValidNum(...)`
- compound tags: `Deref = Allocated && InBound`, `Ptr2Ref = Align && Deref && Alias`
- each tag has a role: precondition, hazard, or option
  - hazard = persistent constraint the caller must uphold after the call
  - hazard fits a persistent verus invariant, not a one-shot ensures
constructor-aware audit units
- unit = target api + every constructor that builds the state it relies on
  - method-level units: 29%, 38%, 49% in core, alloc, std
- example: `Box::from_raw_in` accepts a wrong-allocator pointer, later `drop` deallocates it, ub
- verus analogue: constructors establish a rep invariant, methods preserve it
three audit rules
- call-site check: each unsafe callee demand is discharged or documented on the caller
- constructor guarantee check: every constructor establishes the state obligation or documents it
- state exposure check: public fields or literal constructors can bypass constructor guarantees
  - `Pin<T>` public field bypasses `new_unchecked`, reported, unresolved
tooling
- tags defined in toml, `#[safety::requires]` and `#[safety::checked]` on defs and call sites
  - caller must check or propagate every required tag id, else error
  - checks id consistency only, not semantic correctness of args
- 7 inference rules flag missing tags from names, types, allocator params, callee tags
- rfc for std tags is under deliberation, not adopted
limits
- documentation fixes only, exploitability not measured
- no verus encoding, tags are not verus constructs
