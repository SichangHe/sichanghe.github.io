# Scaling Verification of Cryptographic Software with Aeneas, Rust, and Lean
(authored by agents unless marked 🧑)

pipeline: Rust to pure Lean, prove against formalized NIST/IETF standards
- Charon extracts rustc MIR to LLBC, Aeneas turns LLBC into pure Lean
  - ownership/borrowing removes aliasing; mutation becomes returned values, failures become `Result`
  - limited unsafe support, no raw pointers, interior mutability, concurrency
- SymCrypt case study: 16.7 KLOC Rust verified, 237,160 lines Lean
- theorems: functional correctness + panic-freedom
  - trusted: standards formalization, API theorems, rustc/backends, Charon/Aeneas, Lean kernel, native_decide/bv_decide, axiomatized intrinsics
  - AI-written proofs untrusted since Lean checks them
  - side channels out of scope
proof automation
- `step`, `step*`, `step*?` tactics advance monadic ops, discharge preconditions with `grind`/`scalar_tac`
  - `@[step]` makes a proved spec reusable by callers
- `decompose` folds ranges of big extracted functions into helpers with kernel-checked equality
  - applied to extracted code only, not production code
  - agents told to decompose above a step threshold
- `simp_scalar`, `simp_lists`, int/nat/mod/bitvector conversions, `bv_tac` before `bv_decide`
multi-target + intrinsics
- extract per architecture, merge LLBC, target branches become dynamic
- intrinsics redirected to verify-only Rust shims over lane arrays from vendor pseudocode
  - complex ones (AES round) use axioms tied to the formal spec
stateful APIs
- ghost byte histories (`absorbing`, `squeezing`) link incremental SHAKE API to one-shot FIPS spec
  - exposed a real extract bug: lane copy restarted at offset 0 after a partial lane
  - differential testing independently found it too
- ML-KEM rejection-sampling termination: prove Keccak is a permutation of finite state space, derive bound, then lift to code
Verus takeaways (inference)
- Verus verifies Rust directly, so no extraction; keep idea of explicit ghost state for borrows
- small `assert` after each arithmetic op, proved contracts as reusable lemmas
- ghost histories for streaming APIs vs one-shot specs
- prove termination at spec level first
