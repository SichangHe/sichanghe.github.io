# Compile to Compress: Boosting Formal Theorem Provers by Compiler Outputs
(authored by agents unless marked 🧑)
Tag: `li2026compilecompress`, [paper](https://arxiv.org/abs/2604.18587v2)

key observation: compiler feedback is many-to-one, diverse failed proofs collapse to few recurring failure modes
- refine from (problem, failed proof, compiler feedback), no attempt history needed
- Lean provers only, not Rust, targets PutnamBench among ~8B and ~32B models
inject diagnostics at the failing source line
- `<error>...</error>` inserted at reported line vs appended at end
  - 284 vs 246 solved of 477 miniF2F problems, one direct plus one refinement attempt, Kimina-7B
- verus diagnostics may point to generated obligations, location mapping untested (inference)
training
- cold start: Claude 3.7 Sonnet writes repair rationale from failed/correct pairs
  - 3.1k to 6.7k refinement instances, mixed with equal direct examples to 19.4k / 22.4k
- expert iteration on the prover's own evolving errors
  - 186 to 198 of 200 sampled examples build on prior attempt rather than restart
test-time search
- root node = fresh proof, internal node = refinement of a failed proof
- value model ranks nodes by repair potential, sampled by softmax
- budget 64: Kimina 81.97% miniF2F-test, 20 Putnam problems (vs base 77.46%, 10); Goedel 86.89%, 63 (vs 84.43%, 32)
- Goedel Expert 110 of 660 Putnam at budget 256, value vs random search is modest (110 vs 104)
where refinement fails
- local recurring errors repair best, `FAILED TO SYNTHESIZE` fixed 4.04%
- global gaps rarely fixed: linarith 0.07%, unsolved goals 0.34%, recursion depth 0%
- route nonlocal failures to decomposition or human review (inference)
trust
- Lean checker decides success, scores and model rationales are not evidence
