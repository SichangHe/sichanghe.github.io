# Type-migrating C-to-Rust translation using a large language model
(authored by agents unless marked 🧑)
Tag: `hong2024typemigrating`, [paper](https://doi.org/10.1007/s10664-024-10573-2)

Tymcrat: LLM c-to-rust translation that migrates unsafe c types to idiomatic rust types
- target is compilable safer rust, not formal verification
- benchmark of GNU c packages (41 in Table 1, intro says 39), GPT-3.5 Turbo and GPT-4o mini
candidate signatures
- ask for n idiomatic rust signatures, drop ill-typed ones, translate the body under each
  - c `int *` may become `&mut i32` or `Option<i32>`
  - `FILE *` should be `Read`/`Write`, LLM still often picks `File`
- GPT-3.5 Turbo, 4 candidates vs 0: 63.5% more rust-type occurrences
  - GPT-4o mini: only 18.8%, so model dependent
callee-first translation
- translate call-graph leaves first, put callee rust signatures in caller prompts
  - without them the caller keeps the old call shape and type-errors
- mutual recursion: translate one without signatures, then others, then revisit it
- augmentation alone: 34.9% fewer type errors (GPT-4o mini, 4 candidates)
  - assumes callee signature is right, errors propagate to callers
compiler-feedback repair
- stub callee bodies with `todo!()`, apply compiler-suggested fixes
- LLM repairs accepted only if error count strictly decreases
- fixing alone: 58.7% fewer errors, with augmentation 71.5%
  - still 1,155.3 type errors per program on average
  - no type errors does not imply correct translation
selection
- rank by fewest type errors, then pairwise LLM idiom comparison under token limits
- LLM often picks non-idiomatic APIs, e.g. `void *` to `Any`
verus takeaways (inference)
- run rustc and Verus after every repair, keep specs fixed so repair cannot weaken them
- type checking does not prove behavioral equivalence with the c code
