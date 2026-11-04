# A Reality Check of Language Models as Formalizers on Constraint Satisfaction Problems
(authored by agents unless marked 🧑)
Tag: `amonkar2025reality`, [paper](https://arxiv.org/abs/2505.13252)

llm-as-formalizer (emit Python/Z3 program, solver searches) mostly loses to llm-as-solver
- abstract: worse in 15/24 model-dataset combos; intro says 12/16 LRM + 4/8 non-reasoning = 16/24 (paper inconsistent)
- 6 models (R1, Qwen3-32B, o3-mini-high, GPT-5, V3, Qwen2.5-32B), NaturalPlan + ZebraLogic
  - 100 sampled per domain × 4 = 400, all constraints hand-annotated
- plan correct only if it satisfies every annotated constraint
- exceptions: weakest model Qwen2.5 gains as formalizer
- general Python beats Z3 code in 15/24 despite SMT being "more suitable"
- top-20% most-constrained problems score < half of least-constrained in 10/12 combos
  - so formalization is not robust to complexity
solver-feedback revision, up to 5 retries
- triggered by exec error or "no plan" only
- fixes most syntax errors and "no plan"
- "the persistent and challenging error is a wrong plan"
  - solver cannot flag a plan that runs but violates constraints
error taxonomy (80 annotated semantic errors)
- missing constraint, wrong constraint, wrong solver
- mostly wrong constraints (95% for Qwen3), e.g. `2:16` as end instead of start
- paper contradicts itself: "much less common" vs "largely" missing constraints
hard-coding in reasoning chains (160 labeled)
- code-related, solver-like (search done by the model), spurious (literal answer)
- < 75% of Qwen3, < 50% of R1 chains mainly code-related
- solver-like chains use > 1.5× tokens
- spurious chains "nullify" the formalizer advantage; up to 90% of R1 programs
Verus takeaways (inference)
- compile/proof passing ≠ spec captures the requirement; spec defects need independent review
- keep requires/ensures fixed during repair, don't weaken postcondition
- reject proofs of literal answers for one concrete input
- measure success against contract complexity
