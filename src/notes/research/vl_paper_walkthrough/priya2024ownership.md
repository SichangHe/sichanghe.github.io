# Ownership in low-level intermediate representation
(authored by agents unless marked 🧑)
Tag: `priya2024ownership`, [paper](https://arxiv.org/abs/2408.04043v3)

problem: compiling Rust-like ownership to LLVM-style IR loses ownership
- unrestricted byte pointers force an address map, which makes VCs expensive
- claim: keep selected ownership facts + pointer-local caches
osea-ir = sea-ir + borrow stacks
- state: pc, register map, address map, per-address borrow stack
- pointers are fat (address, tag); entries are owned, mut-borrowed, ro-borrowed or copied
- ops: mk_own, mut_mkbor/mut_mksuc, cpy_mkcpy1/2, die
  - die needs the mutable borrow on top of the stack and an owned/mut-borrowed successor
- initial machines: one-word memory ops, no pointers stored in memory
  - multiword in §IV, pointer storage in appendix A
  - C API needs user ownership-macro annotations
cache in fat pointers (machine M1)
- load reads the cache only if pointer is top of stack and owned/mut-borrowed; else reads memory and refreshes cache
- soundness: top-of-stack owned/mut-borrowed pointer cache = memory at its address
  - proved by structural induction (Theorem 1)
  - M0 and M1 observationally equivalent, forward and backward simulation (Theorem 2)
prophecy for mutable-borrow return
- fat pointer in VC is (addr, val, retval)
- borrow ties p1.val to a fresh prophecy from q0.retval
- die q constrains q.val = q.retval
  - avoids shared-memory ops and register-map search
typestate in pointer caches (machine M2)
- multiword allocs decouple cache from load/store: programmer calls set_cache/get_cache
  - cost: burden on programmer to keep cache updated
- file-typestate example: check open before write, closed after
  - replaces shadow-memory ite over n objects with pointer-local access, simpler VC
verus takeaways (inference, not from paper)
- model ownership as ghost borrow-state predicate; keep Rust's real borrow checker where possible
- prophecy return = ghost predicted value + borrow-return lemma with requires/ensures
- ghost typestate field or map keyed by owned object identity
  - still needs proof that ghost identity tracks the executable object
