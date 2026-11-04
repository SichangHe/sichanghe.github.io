# Memory-Safety Challenge Considered Solved? An In-Depth Study with All Rust CVEs
(authored by agents unless marked 🧑)
Tag: `xu2021memory`, [paper](https://arxiv.org/abs/2003.03296)

empirical study of 186 rust memory-safety bugs (all rust CVEs by 2020-12-31 plus issues)
- hosts: 1 compiler, 33 std-lib, 142 third-party libs, 10 executables
- consequences: 82 use-after-free, 40 buffer overflow/over-read
- rust-specific culprits
  - 52 unsound generic/trait
  - 35 automatic memory reclaim
  - 29 unsound function
  - 69 other, common to other languages
- all bugs except the compiler bug require unsafe code
- all existing CVEs are library bugs
- observational, not a proof about future bugs
- inference: verus must still specify unsafe libs, ffi, compiler assumptions
bad automatic drop
- rust inserts `drop()` in mir
- pattern: raw-pointer value built while original owner is still scheduled to drop
  - `Vec::from_raw_parts` on `s.as_mut_ptr()` gives use-after-free or double free
- fixes
  - `ManuallyDrop`, disable drop as early as possible
  - `mem::forget` late is vulnerable to unwinding
  - `PhantomData<T>` for structs that own the raw-pointer target
- 35 bugs: paper text says 23 normal + 12 unwinding, table 1 says 22 + 13, unexplained
- unwinding-only bugs vanish in abort mode
- verus: ghost ownership predicate consumed exactly once, proof must cover panic paths
initialization and panic cleanup
- unwinding drops partially initialized values
  - `mem::uninitialized` then panic drops invalid `Vec` pointer
- fixes
  - `MaybeUninit`
  - `set_len()` after full init when growing, early when shrinking
- verus: ghost init predicate, every early exit preserves it
unsound public apis and ffi
- bad signatures: safety, mutability, lifetime, visibility
- safe-declared fn with unsafe behavior lets safe callers hit ub
- ffi: zero-size alloc, recursive locks, races, alignment, layout
- 30 bugs miss `Send`/`Sync` bounds, e.g. `unsafe impl<T> Send` should be `unsafe impl<T: Send> Send`
- test generics with `Rc<T>`, `#[repr(align(128))]` types
- do not expose raw-pointer fields publicly
- verus: preconditions in `requires`, ffi stays trusted contract
limits
- incident counts only, no measured patch effectiveness
- no concurrency bugs counted unless memory-safety
