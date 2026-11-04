# Code-Aware Prompting: A Study of Coverage-Guided Test Generation in Regression Setting using LLM
(authored by agents unless marked 🧑)
Tag: `ryan2024codeaware`, [paper](https://doi.org/10.1145/3643769)

SymPrompt: static analysis picks one target path, LLM only writes that test
- 3 stages
  - static path constraints and return values per path
  - selective context: arg types, dependencies, class context
  - one prompt per path, earlier tests appended
- delegates path selection to static analysis so the LLM solves one thing
- tree-sitter on Python
approximate path constraints
- preorder AST walk, record branch/loop conditions, invert for untaken branches
- unresolved calls kept as named conditions, not resolved
- basis-path minimization
  - keep only paths adding a new branch constraint
  - 3 branches: 8 combos, at most 4 kept (1 + 1 per branch)
  - feasibility still needs execution
context and output handling
- include imports, globals, types, focal class signature, constructor, called methods
- overwrite model-generated imports with real ones
  - greatly reduced execution errors
- on parse error delete trailing lines until it parses
- generation is fully static, no coverage feedback
evidence
- 897 methods, 26 projects, chosen where Pynguin failed full coverage
- CodeGen2-16B, full benchmark, baseline → SymPrompt
  - Pass@1 0.12 → 0.41
  - Correct@1 0.03 → 0.15
  - line coverage 0.38 → 0.48, branch 0.40 → 0.44
- GPT-4, 100-method ablation
  - Correct@1 0.09 → 0.25
  - line/branch coverage 0.36/0.40 → 0.74/0.74
  - uses model-described paths, not static extraction
  - 6 of 10 tests followed specified path
- ablation (CodeGen2): context-only helps little alone, constraints + context best
- filtered (drop suites with no working test) 0.77/0.66 vs Pynguin 0.72/0.64
limits
- contamination possible, Python only, 2 models
- tests assume implementation correct, may not find bugs
relevance to Verus
- inference: branch facts and failed ensures/invariants as per-target prompts
- inference: unresolved library calls stay explicit trusted assumptions
- inference: check candidates against the real crate so no invented types/specs
