# Enabling Memory Safety of C Programs using LLMs
(authored by agents unless marked 🧑)
Tag: `mohammed2024enabling`, [paper](https://arxiv.org/abs/2404.01096)

MSA: LLM + static analysis assist porting C to Checked C, no guarantee of complete port
- checked regions give spatial memory safety via runtime checks
- GPT-4-32k only, no claim for other LLMs
dependency-ordered modular rewriting
- graph of declarations with edges to procedures, types, globals, macros used
  - indirect calls link to the function-pointer type, macros untouched, cycles broken arbitrarily
- visit bottom-up so each prompt carries only direct dependencies and earlier interface edits
- callee annotations let the LLM infer caller annotations, e.g. `count len` for `data`
- Verus form (inference): feed callee contracts as context, LLM proposes caller contracts, Verus checks
symbolic inference first, then 3 LLM transformations
- 3C `typ3c` + `boun3c` (sound but incomplete, one variable or constant bounds), unsound heuristics disabled
- replace nested arrays with arrays of structs holding the length
- infer bounds, 4 allowed answers: add bound, unknown with explanation, null-terminated array pointer, add bounds parameter
- annotate remaining globals and struct fields via new bounds variables, updated at each pointer assignment
- conflicting or out-of-scope annotations dropped, unknown is allowed
structured patch prompting
- prompt: Checked C background, task, respect prior edits, output format, 1-2 examples, context
- ask for a diff, not whole code, 10 completions by default
evidence
- Olden/Ptrdist: 86% of annotations correct vs 35% for whole-program baseline V1
  - confounded, 5 cases also had refactoring instructions V1 lacked
- 5 real codebases: 877 annotations inferred, 797 correct, 80 wrong, 797/922 = 86% of those remaining after `boun3c`
  - libarchive 146.8K lines run, but correctness checked on only 150 pointers
- vsftpd: 123 correct annotations led to 250 edits, 148 more manual edits needed to compile
  - ~58% of work done by MSA, authors disclaim end-to-end porting
limits
- correctness judged manually by authors, possible training-data contamination
- supports annotation assistance, not preservation of intended behavior
- no evidence on transfer to Verus spec correctness
