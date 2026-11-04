# Adaptive Proof Refinement with LLM-Guided Strategy Selection
(authored by agents unless marked 🧑)
Tag: `lu2025adaptive`, [paper](https://arxiv.org/abs/2510.25103)

Adapt: repair loop around a failed Rocq proof (not Verus)
- LLM picks 1 of 3 moves per round, Rocq checks, max 3 rounds
- GPT-4o, temp 0
  - CoqDev 651/1,720 (37.85%)
  - CoqStoq 484/1,171 (41.33%)
- trusted: Rocq checker, CoqHammer; LLM choices, lemmas, keywords are untrusted search
- theorem statements taken as given; spec quality out of scope
failure record fed to every repair step
- erroneous tactic, error message, partial proof, stuck proof state
- working context: retrieved lemma statements (top 10) + 1 similar proof (BM25, no threshold)
- Verus analogue (inference): failing obligation + span + error, nearby `proof fn`/`spec fn` signatures, 1 similar verified fn
- no clean ablation; Self-Refine 503 vs Self-Refine+RAG 549 on CoqDev
move 1: lemma discovery, 2 stages
- propose lemma statements, keep those Rocq accepts as statements
- prove each separately, keep only proved ones
- also adapt an existing lemma (statement + proof together)
- removing it: 651 -> 590 on CoqDev
- fails when lemmas are trivial or unproved (15% of sampled failures)
- Verus analogue: signature with `admit()` body first; scan for `admit`/`assume` since callers verify anyway
move 2: context enrichment
- LLM extracts keywords, retrieve lemmas whose statements contain them
- LLM keywords 651 vs full-state query 625 vs none 622
- 17% of sampled failures: ineffective keywords
move 3: regeneration with failure in view
- alone (Adapt_base) 519/1,720
LLM move selector barely beats hand rules
- LLM 651, 1.35 iters, 16.3k input tokens
- 3 hand rules 647, 24.2k input tokens
  - missing lemmas from similar proof -> enrich
  - definition in goal w/o lemma -> discover
  - else regenerate
- fixed order 613, random 605, trained classifier 595
- gain over rules is tokens, not proofs; 4-theorem gap w/ 1 run, no variance
- 39% of sampled failures: wrong move
- Verus needs more moves: strengthen invariant, `#[trigger]`, `decreases`, `reveal`
CoqDev benchmark: mask same-commit lemmas
- hide target proof + every lemma added in same commit + later commits
- 14 projects, 1,720 theorems, avg 60.34 hidden same-commit lemmas per task
- plain mask-in-the-middle leaks helpers the human wrote alongside
- directly applicable to Verus repos
caveats
- Adapt_base 519 vs Self-Refine+RAG 549 for near-identical designs: noise exceeds the 4-theorem lead
- "% more" figures are relative, not points
- threat to Verus agents: low; loop shape easy to copy; paper cites AutoVerus as fixed-rule repair
