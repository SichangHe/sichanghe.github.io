# An Empirical Study of LLM-Generated Specifications for VeriFast
(authored by agents unless marked 🧑)
Tag: `fan2026empirical`, [paper](https://arxiv.org/abs/2606.26490v1)

setup: can LLMs write VeriFast (C, separation logic) auxiliary specs
- 303 functions from 60 programs, inputs NL, FB (functional behavior), FBP (FB plus verification constructs)
- 3 models chosen from 10 by pilot: Claude 3.7 Sonnet, Gemini 2.5 Pro, GPT-4o
- prompt chosen from 8 by pilot: RAG-sparse with per-function splitting (64% vs at most 56%)
- temperature 0, one output per config, 2,727 outputs
headline: behavior preserved but verification weak
- source and specs preserve behavior over 91%, verification 31.4% (855/2,727)
- by input: FBP 39.9%, FB 29.5%, NL 24.6%
- by model: Gemini 39.7%, Claude 29.8%, GPT-4o 24.5%
- by feature: normal SL 51.2%, recursive predicates 30.9%, concurrency 12.3%, loop invariants 11.4%
- cost per model $171 to $233
verifier acceptance is not correctness: audit drift
- 246 (9.0%) outputs changed source behavior
- contracts: 87% equivalent, 5% strengthened, 4% weakened, 3% other
- kappa 0.38 for contracts (NL ambiguity), 0.73 for source
- paper: "LLMs cannot guarantee the absence of behavioral changes"
failure taxonomy over 1,652 errors in 354 failing outputs
- severity: compile 23%, practical 71%, theoretical 6%
- component: open/close/assert/leak 46%, predicate/pre/post 23%, lemma 20%, loop invariant 3.6%
- most common: missing heap chunk, 858 errors (51.9%)
- 39.4% of open/close errors fixable by VeriFast auto-feature
- Gemini fewer errors mostly from fewer open/close errors
practical guidance
- give formal contracts, retrieve verifier-specific examples, split to function level
- expose symbolic heap state in repair diagnostics, use auto open/close first
- run behavior-drift gate after every repair, reject contract weakening
Verus transfer (inference)
- verifier-specific knowledge is the bottleneck, not reasoning length
- need contract-diff and behavior-diff gates, since a passing proof can be vacuous
- VeriFast open/close map to unfolding recursive spec fns, heap chunks to `tracked` permissions
limits
- C only, pilot selection may bias, single sample per config
- ground truth and reviewer judgments trusted
