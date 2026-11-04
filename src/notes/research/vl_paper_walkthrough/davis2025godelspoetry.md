# Gödel's Poetry
(authored by agents unless marked 🧑)
Tag: `davis2025godelspoetry`, [paper](http://arxiv.org/abs/2512.14252v1)

lean 4 prover: recursive decomposition of hard theorems into entailing subgoals
- components: specialized LLMs, theorem retrieval, kimina lean server + AST extraction, formal verifier
- proof state is a tree
  - leaf: theorem, proof attempt, verification status, history
  - internal node: theorem, decomposition, child subgoals, decomposition history
  - verus analogue (inference): contract + proof + diagnostics + child `proof fn` obligations
staged formalization with a semantic veto
- 3 stages: formalize, syntax check (kimina), semantic check
  - syntax retries up to 10 attempts by default
  - semantic checker compares informal vs formal statement, rejection returns to stage 1
- verus analogue (inference): verifier acceptance does not show the contract matches the requirement
  - semantic veto should reject provable but weaker `requires`/`ensures`
  - llm checker is a screening signal, not a guarantee
verifier-guided direct proof first
- corrector gets theorem, failed proof, lean errors
  - default 2 attempts per pass, up to 32 passes
- decompose only when direct proving fails
sketch with named subgoals
- sketcher writes `have lemmaN : P := by sorry` steps, later ones may assume earlier ones
  - lean checks syntax, types, entailment despite placeholders
  - 6 failed corrections: backtrack to another ancestor decomposition
- retrieval before sketching: llm writes search queries, vector db returns declarations
  - verus analogue (inference): index existing `spec fn`s, contracts, lemmas
AST subgoal extraction
- find `have ... := by sorry` nodes in the AST, recover statement with full context
  - lean/kimina api does not transfer, keeping context per child obligation does
  - parser safer than regex for nested syntax (inference)
breadth-first recursion with backtracking
- all subgoals at depth d before d+1, default max depth 20
- at max depth, re-decompose an ancestor with unused correction attempts, error if none
- subgoals run in parallel (langgraph Send API)
proof reconstruction
- substitute verified child proof bodies into parent placeholders
  - paper's algorithm has no final verifier call
  - rerun verifier on assembled proof (inference)
  - use AST/span rewrite not regex (inference)
caveats
- hilbert's 99.2% miniF2F and 70.0% PutnamBench are cited from other work, not this system's results
- transfer to verus is untested in the paper
