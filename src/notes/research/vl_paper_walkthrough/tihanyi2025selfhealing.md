# A New Era in Software Security: Towards Self-Healing Software via Large Language Models and Formal Verification
(authored by agents unless marked 🧑)
Tag: `tihanyi2025selfhealing`, [paper](https://doi.org/10.1109/AST66626.2025.00020)

esbmc-ai: bounded model checker finds c bug, llm patches it, rerun checker
- bmc gives a counterexample (trace, line, variable); llm reads it and writes the fix
- base llm gpt-4o
- guarantee only up to bound k; repair check uses 10s timeout, `--unwind 1`
  - a passing patch is checked against modeled properties only
counterexample in the prompt is the key
- without it llm fixes ~31-37% of issues, with it 80-90%
  - baseline setup not described, not a clean causal estimate
- llm alone can miss overflows, e.g. gpt-3.5 said "no problem" on an overflowing program
class-specific repair prompts
- dereference failure vs scanf overflow need different templates; generic prompt lowers accuracy (no number given)
- fix one issue per iteration, rerun esbmc
  - fixing one overflow can expose another
- two modes: user chat (explain only), fix code (auto patch + verify)
evaluation
- 50,000 of 112,000 formai programs; 31,801 (63.6%) fail verification
- 1,337 manually reviewed across 8 categories, one iteration
  - lower-bound array 95.6%, fscanf overflow 91.3%, div by zero 86.5%, null deref 80.4%
  - forgotten-memory deref 48.7%, upper-bound array 41.0%
- some table accuracies do not match their own counts
limits
- injection classes (sql, xss, os) not detectable
- patches can be valid but not fix the bug or add new ones
- program equivalence undecidable, so behavior preservation checked by hand
verus transfer (inference, untested)
- feed verus failure location, failed postcondition, call path into repair prompt
- do not fake a concrete trace; a verus failure is not a runtime counterexample
- classify failure (invariant, postcondition, arithmetic, ownership, library assumption) to pick template
