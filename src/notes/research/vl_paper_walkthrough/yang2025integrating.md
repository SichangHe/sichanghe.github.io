# Integrating Symbolic Execution with LLMs for Automated Generation of Program Specifications
(authored by agents unless marked 🧑)
Tag: `yang2026integrating`, [paper](https://arxiv.org/abs/2506.09550v4)

SESpec = symbolic execution + invariant templates + LLM + Frama-C
- generates preconditions, postconditions, loop invariants for C/ACSL
- 395 programs across SyGuS, OOPSLA, SV-COMP, NLA, numer-S, Frama-C, pIp, list-S
- verified 354 of 395 (about 90%) with Frama-C 29.0, WP, Z3, 3 s per query
- 197/204 linear-loop and 56/58 iteration-free solved, but 0/3 external or recursive-call programs
- C/ACSL only, not Verus
symbolic execution gives strongest postconditions for loop-free code
- flatten reachable memory into atomic locations, track values and aliasing
- each path = path condition + symbolic store
- default precondition: all reachable memory initialized and valid
- at a call, pause, generate the callee spec recursively, resume with it, cache it
- the QCP internal representation is never shown to the LLM
  - LLM sees natural-language explanation and ACSL skeletons
  - verified ACSL is translated back to resume execution
- Verus port needs a Rust memory model, no direct translation from the flattened C model
invariant templates for the outermost loop
- LLM first reasons about the loop in natural language
- analyze one-iteration unfolding to find unchanged and non-inductive variables
- five template forms
  - unchanged variables
  - loop-skip properties
  - non-inductive variables
  - inductive variables
  - optional verification goal
- LLM fills the undetermined parts
- nested loops go LLM-only, since they lack well-defined preconditions
error-directed refinement
- syntax errors: repair directly
- passes Base and Preservation but misses goal: strengthen
- fails Base or Preservation: weaken or adjust
- fails everything: discard and regenerate
- at iteration limit, drop invalid invariants, keeping a valid subset
  - valid subset need not prove the goal
- validity = Base + Preservation; accuracy = validity + goal
ablation (100 programs: 70 loop, 30 function; 3 refinement rounds)
- loop validity/accuracy: 37.50%/28.75% LLM only, 62.86%/60.00% +SE, 95.71%/87.21% +refine
- function validity/accuracy: 26.67%/16.67%, 50.00%/46.67%, 86.67%/86.67%
- reporting inconsistent: loop percentages not integer counts of 70, prose claims perfect scores
caveats
- claims no few-shot prompting, yet §5.2 gives two inductive-spec examples
- no end-to-end soundness proof for the translator
- benchmark exposure of pretrained models not excluded
