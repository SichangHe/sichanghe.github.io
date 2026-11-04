# Predictable Verification using Intrinsic Definitions
(authored by agents unless marked 🧑)
Tag: `murali2024predictable`, [paper](https://doi.org/10.1145/3656450)

intrinsic definitions replace recursive predicates for heap structures
- ghost monadic maps + quantifier-free local conditions + correlation formula for entry points
  - valid structure iff some map interpretation satisfies the conditions
  - maps summarize rank, inverse pointers, length, keys, heaplets
- goal: quantifier-free, decidable VCs, so solver behavior is predictable
fix-what-you-break (FWYB)
- ghost broken set Br of locations whose local condition may be false
  - mutation adds its impact set to Br
  - repair ghost maps, assert local condition, remove from Br
  - main method starts and ends with Br = ∅
- soundness proved (Thm 3.8), ghost code projected away
- repairs can ripple, each immediate impact set still finite
finite impact sets
- local conditions read bounded neighborhood, so mutations affect a bounded set
  - x.next := z impacts {x, old(next(x))}
- impact-set rules checked in Boogie
- limitation: unbounded indegree structures not handled
decidable VC engineering
- maps, sets, Alloc set, parameterized map updates with user modifies set
- inline pure local-condition functions, cross-check SMT files have no forall/exists/lambda
  - integer multiplication in local conditions would break decidability
evidence
- Boogie implementation, 42 methods over 10 structures
  - lists, BST, treap, AVL, red-black, overlaid scheduler queue
  - all under 2 min, all but 4 under 10 s (e.g. red-black insert 74.1 s)
  - ~60% of ghost updates are definitional
- Boogie beats Dafny encoding qualitatively (scatter plot, no full Dafny table)
Verus relevance
- inference: ghost broken set + local-condition predicates over a heap model
  - no evidence the encoding keeps VCs decidable in Verus, inspect actual SMT queries
  - needs a link between the model and executable Rust
