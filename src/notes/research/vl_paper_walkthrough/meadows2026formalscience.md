# FormalScience: Scalable Human-in-the-Loop Autoformalisation of Science with Agentic Code Generation in Lean
(authored by agents unless marked 🧑)
Tag: `meadows2026formalscience`, [paper](http://arxiv.org/abs/2604.23002v1)

pipeline translates informal physics statements and proofs into Lean 4, with human alignment review
- FormalPhysics: 200 university-level questions, LaTeX solutions, complete Lean proofs
- central warning: compilation alone can certify a distorted statement
  - 100% formal validity only means Lean accepts the final code
gold-seeded generation
- few-shot expert statement-proof pairs steer an LLM to expand informal proofs
- expert binary-classifies alignment before formal code generation
  - 5 examples per batch, 1 expert, 1 month, about $50
compiler-driven correction loop
- compile, feed exact error to LLM, repeat until compiles; max 25 iterations
- recompile after post-processing, since it can introduce errors
- GPT-OSS-20B formal validity below 10% to 31% with agentic loop
  - self-refinement costs about 2x tokens with no clear gain
  - FormalScience beats best open-source agentic baseline by over 3x
surface guard + error routing
- reject forbidden tokens, incomplete proofs, bad imports before compiling
- structural errors (syntax, unknown id, missing module): regenerate with error-type hint
- semantic errors (type mismatch, unsolved goal): patch agent applies minimal diff
semantic drift taxonomy, found by human review
- notational collapse: domain object replaced by simpler one
  - more than 75% of quantum-mechanics proofs
- abstraction elevation: concrete calculation replaced by abstract algebra, about 25%
- proof strategy substitution: same objects, different route, about 33%
- implicit premise selection: assumptions absent from informal statement, about 25%, 2% pure
- categories overlap; verus analogue: log drift category when reviewing requires/ensures
trusted/limits
- trusted: expert judgments, prompts, LLMs, scripts, Lean/Mathlib, source statements
- only physics, only 200 examples
