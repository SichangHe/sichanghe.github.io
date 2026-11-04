# Automated verification of practical garbage collectors
(authored by agents unless marked 🧑)
Tag: `podelski2009automated`, [paper](https://doi.org/10.2168/LMCS-6(3:6)2010)

result: Hawblitzel and Petrank verify Cheney copying + mark-sweep collectors and allocators in x86-like Boogie with Z3
- interface Initialize/Alloc/ReadField/WriteField; mutator touches heap only through them
- does not prove termination; halts on oom, no multithreading
- tcb: Boogie, Z3, axioms for 32-bit arith/x86/memory, unverified BoogiePL-to-x86 translator
- 802 + 865 x86 instrs, 2398 + 3038 BoogiePL lines (plus shared), ~2-3 annotation lines per instr
- verify time 115 s copying, 70 s mark-sweep, 12 s shared
- perf on 10 of 12 benchmarks same ballpark as Bartok native; mark-sweep hurt by fragmentation
abstract/concrete simulation with ghost state
- `$AbsMem` abstract object graph, `$toAbs` maps concrete address to abstract node or `NO_ABS`
- `WellFormed` injectivity, `ObjInv` fields match abstract values, `MutatorInv` bundles them
- every operation requires and ensures the invariant
- collection effectiveness proved separately: after GC only nodes reached since GC start keep memory
- Verus: ghost graph + representation predicate in `requires`/`ensures`; Boogie's free array updates do not carry over
tri-color mark-sweep invariant
- no black object points to white; gray before recursing, else cycles loop forever
- sweep: no gray, free white, recolor black to white
region-based invariants for copying GC
- regions `$rs`/`$rt` grow monotonically via `RExtend`; from-space facts dropped at end
- turns non-local quantified facts into local color/region cases
trigger-directed SMT automation
- choose triggers like `memAddr(i)`, `Color[i]`; add trivial trigger functions to avoid loops
- separate triggers per purpose in realistic collector (`TV` values, `TO` field indices)
- Verus: control quantifier exposure with lemmas, not Boogie trigger syntax
verified subset translation + specification testing
- translator rejects runtime ghost use, forces aligned Load/Store, keeps words in 0..2^32-1
- verify Boogie source then translate: no compiler in tcb for the verified form
- spec ballooned to hundreds of lines with Bartok memory model
  - Boogie smoke tests found no bugs
  - c# runtime assertions on original collectors found 5 spec bugs; running verified copier found 2 more
