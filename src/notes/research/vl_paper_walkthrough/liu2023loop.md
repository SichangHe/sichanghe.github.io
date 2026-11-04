# Towards General Loop Invariant Generation: A Benchmark of Programs with Memory Manipulation
(authored by agents unless marked 🧑)
Tag: `liu2023loop`, [paper](https://arxiv.org/abs/2311.10483)

LIG-MM benchmark + LLM-SE generator for heap-manipulating loops
- LIG-MM: 312 loop programs with lists, trees, hash tables, multi-level pointers
  - sources: homework, SV-COMP, SLING, Linux kernel, GlibC, LiteOS, Zephyr
  - all treated as test set
- LLM-SE = symbolic execution + LLM + separation-logic entailment + SAT picking
  - invariant = initiation, preservation, exit; checked by entailment
  - Algorithm 1 checks only initiation and preservation, exit only in text
symbolic execution exposes structure
- run loop body symbolically n times, keep strongest postconditions as separation-logic formulas
  - unfold predicates (`listrep`, `lseg`) at dereference
  - list reversal: iterations reveal growing `lseg(w,p)`
- good for heap shape/aliasing facts not visible in scalar traces
self-supervised predicate recovery
- split recursive predicates into unfolded terms, add allowed noise, combine with `*` or `||`
  - train CodeGen-350M to recover the original conjunct
  - 200k synthetic examples, no benchmark programs in training
- labels depend on predicate definitions; noise/taboo rules likely hand-written per predicate
  - no ablation of augmentation or mix-up
entailment-guided inference + SAT picking
- ask LLM for separating conjunct, split assertions by entailment into explained/unexplained, recurse, join with `||`
- SAT selects minimal covering set of candidates
- failed LLM output is masked and retried
results (312 programs, Table 2)
- 1 attempt: LLM-SE 38.78%, SLING 12.82%, GPT-4 12.50%, AutoSpec 0.00%
- 8 attempts: LLM-SE 42.95%, SLING 21.79%, GPT-4 17.68%, AutoSpec 0.00%
- baselines' malformed outputs fixed manually, inflating them somewhat
- rates measure whole pipeline, components not isolated
Verus relevance (inference)
- encode heap shape as recursive `spec fn` / views, not separation-logic `*`
- reuse symbolic traces and verifier-guided partitioning; Verus stays the soundness checker
- ownership/borrow cases and spec adequacy are not covered by the paper
