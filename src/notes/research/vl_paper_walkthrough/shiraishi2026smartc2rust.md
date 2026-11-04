# SmartC2Rust: Iterative, Feedback-Driven C-to-Rust Translation via Large Language Models for Safety and Equivalence
(authored by agents unless marked 🧑)
Tag: `shiraishi2026smartc2rust`, [paper](http://arxiv.org/abs/2409.10506v3)

llm c-to-rust translation by segmenting code, then repairing from compiler and test feedback
- 3 stages: preprocessing, translation with quality check, feedback-driven repair
- default model claude 3.7 sonnet, temperature 0, segment size 400 lines
- benchmark: 21 c programs, 69 to 20,436 loc
preprocessing keeps context small
- merge includes, uniquify statics, topologically reorder definitions
- macros: ask llm where to define, map `#ifdef` to rust `cfg`
- segment at logical-block boundaries, circular functions stay together
- carry json metadata of definitions and call sites between segments
translation self-check
- second llm pass removes unsafe, raw pointers, `static mut`
- loop until flags are true: `refined_completed`, `current_block_complete`, `no_omission`
repair loop
- compile errors, runtime panics, behavior differences, semantic assertion errors
- bounded repair rounds, modifications applied across files
- equivalence = same input/output at entry point only, localized via call-stack traces
  - internal functions and untested configs stay trusted
results
- unsafe lines 1,550 to 8.14 vs c2rust (99.4% reduction)
- test pass 100% vs 80% for c2rust/laertes/c2saferust, crown 35%
- macro semantics preserved 85.2%
- cost per program: $33.12, 187.9 chats, 2,637 s
ablation on 3 programs
- random file order: 28.5% compile
- no contextual summaries: 32.3% compile
- no execution-flow comparison: 23.3% test pass
- gpt-4o 34.3%, gemini pro 1.5 12.4% compile
takeaways for verus
- inference: replace "no errors" with proofs of `requires`/`ensures`
- inference: tests and flow traces localize bugs but prove nothing
