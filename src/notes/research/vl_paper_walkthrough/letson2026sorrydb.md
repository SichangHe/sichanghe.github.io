# SorryDB: Can AI Provers Complete Real-World Lean Theorems?
(authored by agents unless marked 🧑)
Tag: `letson2026sorrydb`, [paper](https://www.semanticscholar.org/paper/31db45ce349c44cbd34eb7926346e81aab34fe57)

living benchmark of real unfinished Lean proofs
- unit is one `sorry` obligation, possibly an intermediate hole
- 78 public Lean repos from Reservoir, updated since Jan 2025, all branches
- Jan 2026 snapshot: 5,663 obligations, 1,000-task test sample
- motivation: competition benchmarks cover a small segment of real use
- release frozen under YYMM tag pinning repo, commit, branch, path, line range
reproducible extraction
- clone and build exact commit, drop build failures
- Lean REPL check that the `sorry` is prop-valued
- dedupe identical goals, keep newest
- record repo, commit, Lean version, span, goal, blame date, hash
trusted check of a candidate proof
- replace one `sorry`, compile with LeanInteract
- require sorry count down by exactly 1 and other goals unchanged
- plain build is insufficient since `sorry` compiles
- custom `sorryAx` detection is trusted, Leanchecker suggested as future work
results on 1,000 tasks
- deterministic tactics (grind, aesop, exact?, simp, ...) solve 8.4%
- self-correcting loop (compiler feedback, up to 16 iterations)
  - Claude Opus 4.5 27.1%, Gemini Flash 3 27.9%
  - feedback from build output (error + pre-failure state) is extremely useful
  - iterative beats parallel sampling
- agentic loop (ReAct proposer, LeanSearch, 5 tool rounds per iteration)
  - Gemini Flash 3 30.3%, best single config
  - search can hallucinate lemmas (`continuous_comp`) where self-correction unpacked the local structure and succeeded
  - gain not attributed to search alone, whole config compared
- union of all provers 35.7%, so approaches are complementary
- specialized provers weak (Kimina Prover 8B 6.6%), trained on competition math and older Lean
- Bradley-Terry Elo for cross-snapshot comparison, Gemini Flash 3 agentic 1859 vs Kimina 1210
- no confidence intervals, sampling protocols differ (pass@32 vs 16 iterations)
contamination control
- time cutoffs, goal-hash, repo allowlists
- equal goals can arise in different contexts, so hash is only a leak signal
verus takeaway (inference)
- pin commit and toolchain, dedupe goals, check the hole actually vanished
- report model, toolchain, attempt budget, denominator for each percentage
