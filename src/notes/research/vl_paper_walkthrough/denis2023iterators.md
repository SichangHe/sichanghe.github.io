# Specifying and Verifying Higher-order Rust Iterators
(authored by agents unless marked 🧑)
Tag: `denis2023iterators`, [paper](https://doi.org/10.1007/978-3-031-30820-8_9)

result
- first-order spec scheme for nondeterministic, infinite, interruptible rust iterators, implemented in Creusot
- verifies real iterators including higher-order effectful `Map`
- specified: `Range`, `IterMut`, `Take`, `Skip`, `Fuse`, `Map`, `MapExt`, closures `FnOnce`/`FnMut`/`Fn`
- clients: counting, vector extension, zeroing, knight's tour
prophetic mutable values
- mutable ref has current value `*r` and prophecy `^r` for value at borrow end
  - non-aliasing means no separation logic or dynamic frames needed
  - `push`: `@^self == (@*self).concat(Seq::singleton(v))`
- `@` is the math model, ghost code has no runtime effect
- verus (inference): analogous `requires`/`ensures`/`spec fn`, creusot syntax does not carry over
iterator as state machine
- `produces(a, visited, b)`: transition from `a` to `b` yielding sequence `visited`
- `completed` marks final states
- laws: reflexivity, transitivity, proved per iterator
  - sequences not transitive closure, since solvers handle sequences better
- `next`: `None` implies `completed`, `Some(v)` implies one-element production plus prophecy update
- `for` loops: ghost `init_iter` and `produced`, invariant `init_iter.produces(produced, iter)` added automatically
  - user invariants relate state to `produced`, e.g. `@count == produced.len()`
adapters
- generic over underlying iterator specification
- `Take` tracks remaining count
  - `completed` handles count decremented even when inner returns `None`
- `Skip` existentially quantifies skipped prefix
- `take(n).skip(n)` proved empty by composition
closures and Map
- predicates for precondition, postcondition, `postcondition_mut`
- `unnest` relation preserves prophecies across repeated calls
- `Map` invariant: each postcondition establishes next precondition
- `MapExt` carries ghost `produced` history for effectful closures, avoiding separate induction
- static closure type resolution lets solvers unfold predicates
evaluation
- creusot to Why3 to cvc5/Z3/Alt-Ergo, M1 Pro, 4 provers in parallel
- (impl lines / spec lines / seconds)
  - `IterMut` 12/34/0.61 auto, `Range` 13/39/0.40 auto, `Take` 17/43/0.40 auto
  - `Skip` 20/53/0.51 and `Fuse` 29/51/0.52, manual sequence lemmas
  - `Map` 23/46/0.89 and `MapExt` 42/115/1.06, manual tactics for quantifier instantiation
- iterator vs while loop clients similar: Hillel 0.86 vs 0.91, knight's tour 1.15 vs 1.14
- no run counts or variance
trust (inference)
- implementation, specs, creusot translation, Why3, smt solvers, rust borrow guarantees
- specs may miss intended library requirements
- verus analogue adds proof erasure and external contract assumptions
