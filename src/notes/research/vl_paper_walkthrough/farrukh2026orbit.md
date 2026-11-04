# ORBIT: Guided Agentic Orchestration for Autonomous C-to-Rust Transpilation
(authored by agents unless marked 🧑)
Tag: `farrukh2026orbit`, [paper](http://arxiv.org/abs/2604.12048v1)

ORBIT = project-level C-to-Rust agent pipeline
- evaluated on 24 CRUST-Bench programs, 91.7% over 1,000 lines
  - 100% compilation, 91.7% test success, with expert or auto-generated interfaces
  - beats C2Rust and CRUST-Bench baselines, unsafe blocks near zero
- excludes multithreaded and GUI programs, nondeterminism hinders verification
dependency-ordered translation
- Tree-sitter parse, intra-module and inter-module graphs
- Kahn topological sort twice, callees and base headers first
- cycles collapse into one translation unit
iterative scaffolding
- cargo new, mirror modules, map types, stub signatures with `unimplemented!()`
- compile-repair after each stage, then unsafe refactor, translate tests, Verify&Repair
two-tier function mapping
- tier 1 exact then normalized name match, no substring or prefix
- tier 2 mapping agent only if static fails
- every JSON mapping validated against real module paths and declarations
  - guards against hallucinated or silently missed functions
per-unit orchestration with independent checks
- translation agent does one mapped function
- checker rejects `unimplemented!()` and TODO bodies
- orchestrator reruns `cargo check` itself instead of trusting compiler agent
for Verus
- replace final test gate with Verus plus tests, require a proof artifact per function
- compilable scaffold shows types only, not memory safety or equivalence
