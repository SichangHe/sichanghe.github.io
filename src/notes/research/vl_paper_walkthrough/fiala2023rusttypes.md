# Leveraging Rust Types for Program Synthesis
(authored by agents unless marked 🧑)
Tag: `fiala2023rusttypes`, [paper](https://doi.org/10.1145/3591278)

RusSOL: synthesizes safe Rust from type signature + functional annotations, correct by construction
- rust types shrink the search space: ownership, no duplication, no values from thin air
  - `singleton(elem: T) -> List<T>`: only empty or singleton list type-checks, empty drops `elem`
  - `borrow` needs only `self.data.is_some() == result.is_ok()`, the only `&T` comes from matching `&self.data`
- inference: in verus, ownership carries memory-safety facts so `ensures` can state only functional behavior
  - verus does not synthesize bodies, still needs proof
specification lessons
- pure functions for preconditions: `peek` with `requires self.len() > 0`, `Nil` branch becomes `unreachable!()`
  - verus analogue is `spec fn`, not interchangeable with executable pure helpers
- strengthen postconditions against vacuous implementations
  - `push` with only `len + 1` inserts at the end
  - add structural equality of `next` with the old list, giving `mem::replace`
- relate reborrowed references at expiry
  - `last_mut` with `(^self).len() == (*self).len() + (^result).len()` forces traversal to `Nil`
  - final snapshot of a reference is a prophecy variable, resolved at `DropRef`
synthetic ownership logic (SOL)
- separation-logic variant, goal `{P} _ {Q}` over symbolic heaps with pure snapshot formulas
- borrowing via lifetime-indexed blocking sets and partial permissions for immutable refs
- bidirectional symbolic execution with gadgets (fused rules)
  - forward: `Destr`, `CopyOut`; backward: `Constr`, `ReBorrow`; bridge: `Drop`, `Rename`
  - branch closes when both heaps are empty and smt proves pure pre => post
- best-first and-or search, cost = size of P and Q, reuses SuSLik search
  - idea for proof agents: expand smallest outstanding obligation, backtrack on verifier failure; no evidence it is optimal
evidence
- 117 annotated tasks, 115 solved, mean 1.8s, programs 5.4 lines on average, max derivation 103 rule applications
  - 2 failures: needs unsafe, pure arithmetic expression
- 100-Crates: 2,671 signatures, 1,036/1,036 primitive-return, 1,328/1,635 non-primitive solved
- annotations 27% more concise than synthesized code
- checked: manual intent review, rust compiler, creusot on a subset, no errors
  - no soundness proof of SOL, needs formal semantics for safe Rust
