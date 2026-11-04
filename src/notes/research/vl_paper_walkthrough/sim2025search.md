# Search-Based Multi-Trajectory Refinement for Safe C-to-Rust Translation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `sim2025search`, [paper](http://arxiv.org/abs/2505.15858v3)

LAC2R: LLM refinement of C2Rust output into safer Rust, one function at a time
- start from C2Rust's compilable unsafe Rust
- order functions by a static dependency graph, substitute one LLM candidate at a time into the full program
- accept only if it compiles and passes the fixed test suite
  - test equivalence = same behavior on those tests only, not all inputs
MCTS over refinement trajectories
- node = intermediate Rust program, edge = one LLM refinement
- UCT selection, expansion, greedy simulation, reward backpropagation
- 10 rollouts per function, UCT constant 1.5, depth 5, 4 root children (2 GPT-4o + 2 DeepSeek V3), safety weight w=2
- reward = Δcompile score + w·Δsafety score
  - compile score = 1/(errors+1)
  - safety = fewer raw-pointer decls, derefs, unsafe lines, unsafe calls, unsafe casts
  - safety is a syntactic count, not a memory-safety proof
validator-driven repair
- node types Gen, Fix, Success
- compile or test errors go into a Fix prompt
- no tests: compiling alone counts as Success, weaker evidence
heterogeneous LLMs + rich prompt (unsafe Rust, call sites, globals, imports)
- safety ratio 0.50 (both) vs 0.4945 (GPT-4o) vs 0.3927 (DeepSeek)
- GPT-4o alone beat the mix on some programs, e.g. truncate 0.43 vs 0.33
- failures from missing struct/signature context (tail: ximalloc, Hash_table)
results
- coreutils (7 programs, max 14,423 LoC): safety 0.50, 100% tests pass, 16.27 queries
  - C2SaferRust 0.33, EvoC2Rust 0.24
- Laertes (10 programs, max 95,560 LoC): safety 0.54, 100% project compilability
- TRACTOR (124 programs): safety 0.95, 100% compile and tests
  - C2Rust alone already 100%; fallback to original hides failed replacements
- tests give 100% PCR/PPR, RustAssure 74%/2.4%, EvoC2Rust 42%/18%
  - compiler feedback alone misses semantic errors
- cost: tail ~14h, optipng ~48h
verus takeaways (inference)
- Verus acceptance must replace or add to tests as the gate
- contracts (requires/ensures) on each function would make replacement checkable
- the C-to-Rust relation is not proved by Verus automatically
