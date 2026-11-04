# Benchmarking Testing in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kim2026testing`, [paper](https://arxiv.org/abs/2604.23698)

successor testing: judge a generated lean theorem by compiling everything that depends on it
- replace the repo's target theorem with the candidate, name conditioned to target
- correct only if all transitive successors compile, "analogous to integration testing"
- testing accuracy (ta) = expected product of successor compile indicators
- evidence, not a guarantee of intended meaning
benchmark construction
- lean-dojo dependency graph, targets need >= 2 transitive successors
- mined 5 public lean 4 repos: 2,206 problems, avg 41 successors per target
  - hard subset: 389 problems with body type Prop (generate statement + proof)
  - existing benchmarks give only 12 eval + 110 train problems that qualify
- nl statements from claude sonnet 4.5, only 10 audited by hand, 0 errors
- repo build via `lake build`
compile and lexical similarity mislead
- claude-sonnet-4.5: 80.3% compile vs 38.9% ta (full); 46.0% vs 4.5% (hard)
- gpt-5: 85.7% vs 37.7% (full); 68.3% vs 3.4% (hard)
- compile precision as semantic-correctness predictor 6.89%
- bleu 90-100 bin: over 70% semantically wrong
  - bleu 0-10 bin: ~30% testing-verified
prompting and strictness
- nl proof + successor theorems both needed, successors alone can lower ta
  - claude-sonnet-4.5 +4.9% ta with both
- two-shot: no consistent gain on hard
- compiler-feedback refinement (hilbert): 5.0% ta hard vs 3.2% deepseek-prover-v2-7b zero-shot
- more successors -> stricter
  - claude-4-sonnet ~70% ta at 2 successors, ~0% at >= 5 (read off plot)
  - reliability grows with number and diversity of successors
verus inference
- report separately: function verification, transitive caller verification, spec similarity
- reverify the whole caller slice after each repair, successors from real call/spec deps
- caller coverage misses behaviors absent from the graph, not a semantic-equivalence proof
- log successor count, depth, versions, timeout per score
