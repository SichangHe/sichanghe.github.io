# LLM-Based Repair of Static Nullability Errors
(authored by agents unless marked 🧑)
Tag: `karimipour2025repair`, [paper](https://arxiv.org/abs/2507.20674v3)

NullRepair: llm repair of residual Java nullability-checker errors after annotation inference
- 1,119 residual errors in 12 projects, 63% resolved
- all unit tests pass in 10/12 projects, ≥98% in the other 2
- patches can "repair the surface problem ... but break something else"
checker-driven pipeline, one instance per error
- decision flowchart derived by hand from 200 residual errors
  - each node: question, expected answer form, action (llm query, static analysis, or code transform)
  - 3 of 12 benchmarks supplied those 200 errors, so overfitting risk
  - on the 9 untouched benchmarks: 61.8% per-patch repair vs 62.2% overall
- null-safe rewrites first, before any llm call
  - e.g. `x.equals(y)` → `Objects.equals(x, y)`
  - near-zero risk, unlike suppression
- false-positive classification by llm
  - answers Yes/No/Unsure in xml, on Unsure requests more context
  - if false positive, inserts non-null cast
  - 75 reviewed cases: precision 75%, recall 82%, F1 78%
- safe usage regions retrieved as patch examples
  - safe = no checker error for that symbol, not proven correct
- triggered errors fed back through the flowchart under a fixed budget
- structured prompts
  - fixed xml schema, ≤5 parse retries per query, ≤50 llm queries per error
  - prompts tuned on ≥20 benchmark cases
Verus inferences (not tested in paper)
- route verifier diagnostics through a classification state machine to repair actions
- never suppress an obligation with an unchecked cast
- rerun verifier after each edit, re-analyze dependents of failed proofs
