# Resource Specifications for Resource-Manipulating Programs
(authored by agents unless marked 🧑)
Tag: `grannan2023resource`, [paper](https://arxiv.org/abs/2304.12530v2)

first-class resources in Prusti (Rust) replace verbose state-based specs of asset-moving code
- problem: state-based specs need frame conditions, e.g. other balances unchanged after a deposit, plus aliasing case splits
- resource = `#[resource_kind]` struct + integer amount, tracked as ghost state per stack frame
  - ops: `produce!` (create), `consume!` (destroy), transfer across frames via callee pre/postconditions
  - built-in conservation: amount constant unless explicitly created/destroyed
  - consuming a resource not held is a verification error
  - interface spec: `resource(Money(a), amt)` in `requires`/`ensures`
coupling invariants tie abstract resources to concrete state
- `#[invariant_twostate(...)]` relates change in `holds(...)` to change in program state
  - acts as implicit postcondition on every fn taking a `&mut` to the type
- encoding: Prusti turns resources into Viper `perm()` expressions
evaluation: 31 functions in 4 apps (IBC token transfer, IBC NFT transfer, ERC-721, PSP-22)
- specs 48% fewer lines on average
  - fewer for 25 functions, equal for 3, more for 3 (all NFT transfer)
- smaller AST: depth 29 fns (38% avg), size 26 fns (41% avg)
- verification 35% slower overall, e.g. token transfer 61.83 s to 78.37 s
- proved properties: two-way peg, supply preservation
- ease of understanding is only a hypothesis; user study is future work
limits and trust
- unsupported: fns that reborrow and return a live `&mut`; untrusted external code
- case study changed some Prusti-unsupported types, assumed IBC core standards correct
- no soundness proof; Viper encoding, SMT solver, Rust front end trusted
- users still design the resource abstraction and coupling invariants
- inference: solver incompleteness can cause false rejections
takeaway for catalog
- first-class resources, coupling invariants, default conservation obligations
