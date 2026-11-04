# Natural Language based Specification and Verification
(authored by agents unless marked 🧑)
Tag: `li2026natural`, [paper](https://arxiv.org/abs/2605.11315)

NLForge: LLM writes per-function contracts as JSON records, then LLM judges C bodies against them
- nothing proved, no solver checks the verdict
  - trusted: LLM summaries, LLM judgement, direct-call-only call graph, LLM recall of libc
- authors' conclusion: high-recall bug finder, not a sound standalone verifier
- preliminary: NeurIPS 2026 footer, Juliet runs described as still running
typed natural-language contract records
- one JSON record per fact: enumerated kind, target, size or condition expr, prose description
  - kinds: disallow_null, allow_null, not_freed, initialized, buffer_size
- one summary kind per property: allocation, free, init, memsafe preconditions, leak, integer range
- keep caller obligations as contracts, not bugs inside f
- no ablation against formal contracts or free prose
- Verus form (inference)
  - maps to requires (obligations) and ensures (effects)
  - ownership removes most kinds, buffer_size and output_ranges carry over as requires/ensures
callee-first SCC passes over the call graph
- prompt holds one body plus callee summaries, not callee code
- recursion: bounded fixed-point rerun, bound not given
- precondition pass: which callee obligations does f discharge, which go to its callers
- PRE comments inline at each call site localize obligations
- leak pass matches own allocs against own frees and callee postconditions
- indirect calls skipped
- compositional vs whole-program baseline, TP 3390 to 3476, FN 301 to 216
  - FP rose 863 to 948
  - Qwen3.5-27B-Q4 gained most, Gemini-3.1-flash-lite on data structures got worse (TP 223 to 184)
- Verus form (inference): write contracts leaves first
checking pass: assume own preconditions, check callee PRE at each call, adopt POST
- Verus does this mechanically, so replace pass with Verus run
- contract simplification: drop preconditions the body discharges
  - Verus analogue (inference, not in paper): delete a requires, rerun, keep deletion if proof holds
- result vs SV-COMP verifiers on 2786 tasks
  - Sonnet-4.6: 1262 TP, 4 FN, 354 FP
  - CPAchecker: 0 FP, 0 FN, 247 unknown
  - inference: SV-COMP scoring on Sonnet-4.6 gives −2198, CPAchecker 3904
- one run per configuration, provider-default settings, no variance
other techniques
- block summaries: split oversized function at syntactic boundaries, earlier blocks become comments
  - Verus analogue: extract block into fn with its own contract
- name-only library summaries from model's memory of docs
  - Verus analogue: assume_specification or external_body, but trusted contract is visible in source
- prompt cache layouts: instructions or function source in system prompt
paper inconsistencies
- class polarity: "positive = satisfying property" conflicts with bug-detection recall and scoring rule
- Table 2 caption says Juliet blank, rows filled
- Tables 1 and 2 disagree on totals (Juliet 1849 vs 1711, Sonnet control-flow 109 vs 105)
- conclusion's 89.6% accuracy, 99.8% recall not in any table
  - from Table 1: 87.2% accuracy, 99.7% recall
