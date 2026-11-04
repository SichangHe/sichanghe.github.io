# RocqStar: Leveraging Similarity-driven Retrieval and Agentic Systems for Rocq generation
(authored by agents unless marked 🧑)
Tag: `kozyrev2026rocqstar`, [paper](https://arxiv.org/abs/2505.22846v3)

proof-aware retrieval plus planning agent for rocq; up to 28% relative gain for generator
- benchmark: 300 imm theorems, reference proofs <= 20 tactics, success = rocq accepts
- full agent 60% vs 51% for claude 3.5 sonnet with 12 attempts
bigrocq: mine intermediate proof states into extra training data
- sequential proof -> tree of valid states, reconstruct proof per state
- 76,524 statements from 344 files, about 4x expansion
- split 70/20/10 by file
- verus analogue: harvest verified helper obligations with proofs; needs own extractor
similarity retrieval trained on proof similarity
- statement similarity vs proof distance correlation weak (pearson -0.154)
  - motivates learning a retrieval score
- proof distance = 0.7 normalized levenshtein + 0.3 jaccard (tactic lists)
- fine-tune codebert (108M) with infonce, 100 negatives
- top-7 same-file proofs as few-shot, 12 attempts
  - claude 3.5: 61/36/21% by length group vs jaccard 58/28/16%
  - gain shrinks on long proofs; similar proofs rarer
verifier-aware tools over coq-lsp via mcp
- check_proof returns error, location, valid prefix, remaining goals
- also get_similar_proofs, about_term, search_pattern, print_term
- no ablation of tool contribution
  - verus: source prefix is not automatically a valid proof state
multi-agent debate (mad) planning
- pro/con debate, judge makes plan; k=4 plans scored, top 2 executed, 20 tool calls each
- failed plan summary passed to next plan
- imm-50: full 66%, no mad 56%, no planning 58%
  - cost $1.30 per theorem vs $0.25 for 12 plain requests
  - single run, no confidence intervals
reflection-triggered retrieval and replanning
- after 5 failed checks, critic + retrieval by remaining goal + replanner
- removing reflection: 66% -> 48%, 9-20 tactic group 33% -> 8%
  - bundles critique, retrieval, replanning; not separated
caveats
- imm is public; contamination possible
- proofs > 20 tactics not evaluated
