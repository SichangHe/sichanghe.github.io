# Autoformalizer with Tool Feedback
(authored by agents unless marked 🧑)
Tag: `guo2025autoformalizer`, [paper](https://arxiv.org/abs/2510.06857v1)

ATF: informal math → Lean 4 statement, with syntax and consistency tools
- goal: compiles and semantically equivalent to the problem
- stops iff both syntax and consistency checks pass
- consistency check only after syntax check passes
syntax tool: Lean 4.15 compiler
- pre-check missing imports, missing `by sorry` ending, unmatched parentheses
- batch statements grouped by imports, separated by namespaces, map errors back by line
  - batch size 20, timeout 300s, rerun individually on exceptions
  - 100K statements: 6.2s each individually vs 0.8s grouped
consistency tool: ensemble of QWQ-32B + Qwen3-32B judges
- reject if either judge reports inconsistent
- judges ignore the proof
- benchmark: 800 queries, 4 syntactically valid but inconsistent perturbations each
  - ensemble precision 0.837, recall 0.597, FPR 0.058
  - single judges: FPR 0.083 and 0.095, recall higher
  - agreement trades recall for fewer false accepts, not a guarantee
  - paper contradicts itself on the perturbation similarity criterion (character-level vs Levenshtein, 0.95)
training: Qwen3-32B on NuminaMath-1.5 subset
- cold start on 24K Claude-4-Sonnet tool trajectories
  - syntax check must come first after each revision
  - mask tool result tokens in loss
- expert iteration: keep successful trajectories with <8 revisions, retrain from base each round
- DPO + NLL: pairs with ≥3 revision gap, fewer revisions preferred, 10K pairs
verus takeaways (inference)
- compiler feedback first, then semantic judge on requirement vs contract
- fewer revisions should be rewarded only if the contract still preserves the requirement
