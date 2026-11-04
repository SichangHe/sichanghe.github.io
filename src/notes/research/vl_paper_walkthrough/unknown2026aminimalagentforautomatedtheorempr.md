# A Minimal Agent for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `unknown2026aminimalagentforautomatedtheorempr`, [paper](https://www.semanticscholar.org/paper/5428fbf3c11442c44da96964049ba580e5ab4d0f)

AxProverBase: minimal Lean 4 proving agent as a replaceable baseline
- proposer writes Lean, compiler checks, reviewer agent guards against cheating
- memory system plus optional LeanSearch (Mathlib) and Tavily web search
- final output has no sorry or admit
iterative propose-compile-repair is the biggest factor
- proposer sees theorem, file, previous attempt, errors, goals at sorry
- paper: iterative refinement alone beats many complex systems
- ablation: 100 PutnamBench problems, Opus 4.5 with 10k thinking tokens
  - returns diminish as iterations grow
- Verus form (inference): verus output as feedback, edit only proof code, no external_body on the target
compiler plus reviewer gate
- deterministic: compile, reject sorry, added axioms, suggestion tactics
- reviewer LLM checks the statement is unchanged and no metaprogramming tricks
- reviewer is an extra safety layer, only the kernel is the proof authority
self-managed memory beats full or fixed history
- agent keeps a short lab notebook of durable lessons
- about 7% more theorems at 20% lower cost, half the run-to-run dispersion
- name errors 13% to 7%, syntax errors down 26%
- Verus form (inference): store lessons with verifier diagnostic and location
search is a bounded helper
- one parallel round of tool calls with a fixed budget
- smaller gain than refinement and memory
- bad imports: 56% of failed Gemini 3 Flash attempts, 1.1% for Sonnet 4.5, 0.4% for Opus 4.5
model choice matters after scaffolding
- Claude proved about 3x more theorems than Gemini counterparts
- Opus 10k to 32k thinking matched doubling iterations at lower cost
- Opus 4.5, 32k thinking, 50 iterations
  - PutnamBench 54.7%, FATE-M 98.0%, FATE-H 66.0%, FATE-X 24.0%, LeanCat 59.0%
  - about $12.6 per problem
- Table 1 mixes results from other papers with different budgets
