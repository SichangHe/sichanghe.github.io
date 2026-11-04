# Humanize Olympiad Agents: A Multi-Session Workflow for Olympiad Problem Solving with Solve, Review, Wiki, Verify
(authored by agents unless marked 🧑)
Tag: `zhang2026humanize`, [paper](https://arxiv.org/abs/2610.13632)

HOA: controller over Codex running worker, reviewer, wiki, verifier sessions
- accept only when every applicable gate passes
- targets 3 single-session failures
  - false intermediate claim spreads
  - missing fact
  - misread or weakened goal (reward hacking)
- preprint, no prompts, no per-problem results, no cost, no confidence intervals
blind reviewer over a frozen artifact
- reviewer sees task, read-only candidate, acceptance plan, runner summary
  - no worker reasoning, cannot edit
- returns findings, not fixes: verdict accept|revise, per finding location, type, evidence, request
- worker cannot self-certify
- PutnamBench 50-subset solved: Kimi-K3 4 (agent) → 47 (full loop), GPT-5.6 Sol 46 → 50
  - loop helps weaker models most
  - baseline and loop did not get equal compute
two gates
- semantic gate = reviewer, objective gate = tool
- tool exit status and log held by the runner, not any agent
- tool failure blocks acceptance whatever the reviewer says
- reviewer owns reward hacking and misunderstanding
Comparator check for Lean
- sandbox build, match theorem to trusted statement, restrict axioms, re-check with kernel
- compiling is not enough: a proof can use a disallowed axiom
- Verus analogue (inference)
  - clean checkout, trusted spec file from the task
  - compare signature, requires, ensures, and every reachable spec fn
  - reject added assume, admit, assume_specification, external_body
  - no small kernel, so Verus + Z3 stay trusted
accepted-only lemma store
- curation agent extracts lemmas after acceptance
  - record: signature, description, source, imports, location, verification status
- worker queries when it can name the missing fact
- wiki + verifier: Kimi-K3 4 → 21/50, GPT-5.6 Sol 46 → 49/50
- Verus caveat: verification status needs a re-run date, solver changes break proofs
formalize, review, freeze
- write formal statement from blueprint (laws, givens, claim)
- reviewer rejects missing laws, omitted parameters, tautologies, answer-assuming statements
  - Verus analogues: weak ensures, unmentioned input, ensures true, spec copied from the implementation
- freeze, then prover may fill the body but not weaken the statement
- cheap checks (inference): ensures false must fail to verify, ensures must not follow from requires alone
- weak evidence: physics scores are llm-graded rubrics
honest counting
- binary credit, only machine-accepted proofs
- failures, timeouts, budget exhaustion stay in the denominator
headline numbers
- PutnamBench Lean 672/672, Lean-Eval 251/304, IMO 6/6
- time study, 100 Lean-Eval problems: Codex /Goal plateaus at 34, HOA 63 after 150h
- Lean statements by third parties remain trusted
internal inconsistencies
- Lean-Eval 304 vs 302 tasks
- Table 2 GLM-5.3 IChO gain printed +4.8, actual 4.0
- "consistently improves" contradicted by DeepSeek IMO unchanged
- Figure 4(b) baseline labels mismatch Table 3
- "no leakage" vs "contamination cannot be ruled out"
