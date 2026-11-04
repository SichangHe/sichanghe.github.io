# Static and Dynamic Verification of Relational Properties on Self-Composed C Code
(authored by agents unless marked 🧑)
Tag: `blatter2018static`, [paper](http://arxiv.org/abs/1801.06876v2)

rpp: frama-c plugin turning relational specs over several calls into plain acsl
- relational properties: monotonicity, non-interference, comparator laws, encrypt/decrypt round trip
- motivation: function contracts describe a single call only
- supports pure, side-effecting, pointer-using, recursive c functions
self-composition reduction
- generate a wrapper inlining renamed copies of the calls
  - save each return value in a fresh local
  - assert the relational predicate, prove with ordinary wp
- also emit an axiomatic lemma so the relation is reusable in later proofs
  - the lemma cannot prove the wrapper's own assert, since bodies are inlined
  - pure-function link only works if the function reads no global memory
- soundness is argued via self-composition, no mechanized proof
extensions
- side effects: duplicate only globals in `assigns ... \from` footprints, relate `Pre_id`/`Post_id` states via `\at`
- pointers: require separated footprints before composing calls
- recursion: inline depth 1, use the relation as induction hypothesis
  - assumes termination
dynamic fallback when wp fails
- stady searches for falsifying inputs, e-acsl runs them as runtime checks
- comparator benchmark: 34 rows x 3 properties = 102 cells
  - 65 proved by wp, 37 not
  - of the 37, stady found counterexamples for 34, 1 timeout, 2 unsupported
- a counterexample is real, a passing run is only evidence
limits
- wrapper can explode for big bodies, e.g. PokerHand beyond wp until rewritten modularly
- ten-row capability matrix is hand-picked, not a sample rate
- trusted: wp, acsl semantics, wrapper generator, solvers, assigns contracts
verus relevance (inference)
- no relational clause or auto self-composition in verus
  - write a wrapper calling the function twice and prove a relation on the results, or generate it externally
