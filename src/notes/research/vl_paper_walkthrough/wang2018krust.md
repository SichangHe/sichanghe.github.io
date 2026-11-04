# KRust: A Formal Executable Semantics of Rust
(authored by agents unless marked 🧑)
Tag: `wang2018krust`, [paper](http://arxiv.org/abs/1804.10806v1)

executable operational semantics of a Rust subset in the K framework
- one K definition auto-generates interpreter, debugger, and verifier
- covers ownership, moves, borrows, lifetimes, mutability, arrays, vectors, structs, control flow, functions
- omits ref-field structs, pattern matching, trait objects, explicit lifetimes, closures, concurrency, external crates, unsafe
state as nested cells (13 main cells)
- k = computation, env = var to loc, store = loc to value
- typeEnv, mutType = types and mutability
- ref, refType, borrow, moved = reference, borrow, and move status
- fstack = call frames, nextLoc = fresh locations
- each statement is one rewrite rule touching only relevant cells
borrow rules encoded as cell updates
- `&mut Y` needs X, Y mutable and not moved, Y not already borrowed, lifetime of X within Y's
- `&Y` records immutable borrow, several may coexist
- struct move marks source in `moved`, later use rejected
verification demo
- gcd with time-counter cell
  - requires X > 0, Y > 0
  - ensures T2 - T1 <= max(X, Y), verifier outputs true
  - cost model is semantic instrumentation, must be tied to real code
validation by differential testing
- 3,119 run-pass tests, 195 supported syntactically, 38 dropped (no main or std calls), 157 kept
- plus 25 hand-written tests, 182 total all match rustc output
- authors admit semantic coverage of the suite is unstudied, so 182/182 is evidence for the subset only
relevance to Verus
- reference model only, K interpreter does not check real Rust code
  - needs proven refinement to connect to Verus verdicts
- trusted base: K, generated interpreter, rustc used for comparison, modeled rules, stated contracts
