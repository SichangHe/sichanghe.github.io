# Fulminate: Testing CN Separation-Logic Specifications in C
(authored by agents unless marked 🧑)
Tag: `banerjee2025fulminate`, [paper](https://doi.org/10.1145/3704879)

same CN separation-logic specs serve runtime testing and static proof
- Fulminate translates C+CN into instrumented C that checks ownership and pure conditions on concrete runs
- key observation: CN's syntactic restrictions for predictable proof also make specs executable
executable ownership predicates
- `take r = Owned(p); P` binds value, replaces separating conjunction, existentials, disjunction
- 4 restrictions
  - existentials only over resource outputs computable from inputs and owned memory
  - `if-then-else` instead of disjunction
  - no general conjunction
  - universals (`each`) bounded, so they become C for-loops (new for testing)
- Verus inference: ghost recursive spec fns are erased, so runtime checking needs a separate checker
reified ghost ownership map
- finite map from each memory byte to owning C stack depth, as a hashtable of addresses
- map footprint at ownership creation, unmap at exit
- `requires` moves resources to current depth; `ensures` moves them back to caller depth, optionally checks leaks
- optional per-access check that the footprint is owned at current depth
- MiniCN: proved bisimilar to explicit resource passing, same failure conditions (Thm 3.5)
source-to-source instrumentation
- uses Cerberus front end; output keeps source layout, builds with gcc/clang, runs under existing test harnesses
- failures report original C+CN location
testing and proof interleaved
- tests that pre/postconditions hold on reached states, not that pre implies post
- start from partial specs, strengthen, then prove
- all 54 CN-tutorial programs and VeriFast/VST examples run
- anecdote: 2 CN users had abandoned a VST hashtable proof due to abstract errors
  - with Fulminate, a bad hash spec fixed in minutes, a double-owned resource in ~90 min
bug finding on pKVM buddy allocator (320 lines C, 702 lines CN)
- 3 injected bugs all caught by one test (8 pages, allocate 2, free both)
  - 0.37 s runtime after ~29 s generation for 2 of them; 1.40 s for the third
overhead
- tutorial examples: generation 0.18 s, runtime Δ 0.10 s
- largest cases cost 0.3-0.9 μs per dynamic `Owned` call
- stack example 2→1024 elements: runtime Δ up to 2.70 s; buddy allocator space Δ ~24 MB
