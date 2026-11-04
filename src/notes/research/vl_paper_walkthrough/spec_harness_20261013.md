# Spec-Harness: Measuring and Improving Behavioral Adequacy of LLM-Synthesized Formal Specifications
(authored by agents unless marked 🧑)

source: Misu, Ma, Lopes (UC Irvine), arXiv:2604.00280v2 (8 Sep 2026), Java + JML + OpenJML, artifacts in VeriAct repo

core claim: verifier acceptance only shows code matches the contract, not that the contract is meaningful
- motivating case: `changeCase(char c)` with 5 branches
  - `requires c >= 'A' && c <= 'z'` plus a weak `ensures`, OpenJML accepts
  - too weak on outputs, too strong on inputs
- scores are test- and mutation-based approximations, no proof
  - frame conditions and exceptional postconditions not covered
benchmarks and setup
- SpecGenBench 120 Java methods, FormalBench 662 (of 700)
- 136 configs: 11 prompt configs × 6 models × 2 benchmarks, plus Houdini and Daikon
- names normalized to `Solution`/`solve()` so models read the body
  - an evaluation control only, a product should use names
four adequacy scores
- method: stub the body with one concrete input/output, ask the verifier to check the contract on that pair
  - SMT checks the Hoare triple without executing the code
- PostCorr = share of true pairs whose postcondition stub verifies
  - a vacuous `ensures true` scores 1.0
- PostComp = share of mutated outputs the postcondition rejects
- PreCorr = share of valid inputs the precondition accepts
- PreComp = share of invalid inputs the precondition rejects
  - a reject-all guard scores high here, Houdini 77% and 46%
- report Harness@0.25/0.5/0.75/1.0 = share of verified contracts scoring at least that
- Verus form (inference)
  - name `spec fn pre/post`, stub `proof fn` with `assert(post(i, o))`
  - stricter mutant check `assert(!post(i, o_mut))` separates certain rejection from solver failure
  - may need `reveal_with_fuel` for recursive spec fns
  - Rust has no null, so invalid inputs are mostly range/length violations
  - `&mut` contracts relating `old(x)` are frame-like, uncovered
results of existing generators
- Houdini has the highest verification rate (VR) but poor adequacy
  - VR 86.7% SpecGenBench, 54.2% FormalBench (Table II), the text says 93%/67%
  - PostComp 24%/19%, PreCorr 0%
  - keep-what-is-not-refuted generators maximize acceptance by construction
  - inference: an LLM loop that weakens failing `ensures` until Verus accepts is the same algorithm
- Daikon on SpecGenBench: 21% VR, 6% PostComp
- prompt approaches
  - SpecGenBench: 64% VR, 50% PostComp, 13% PreComp
  - FormalBench: 28-36% VR, PostComp at most 9%
- authors: "The specifications really do verify; they are just too loose."
prompt optimization (GEPA, gpt-4o) hits a ceiling
- graded verifier score: verified 1.0, one verification error 0.3, two or more 0.1, syntax error 0.0
- all seeds converge to 45.7-46.6% (SpecGenBench) and 18.6-20.0% (FormalBench)
- optimized prompts still only 39% / 14% PostComp
- one model both generates and reflects, no variance reported
adequacy-gated agents
- VeriAct (GPT-5.4), Codex CLI (GPT-5.4), Claude Code (Sonnet-4.6)
  - tools: `verify`, `run_spec_harness`, `task_complete` allowed only when both pass
  - 10 steps per task, postconditions only (350 stubs showed preconditions rarely needed)
- Post-Harness@0.75 without → with harness, SpecGenBench
  - Claude Code 49.2% → 63.3%, Codex 48.3% → 55.0%, VeriAct 46.7% → 50.0%
- FormalBench sample of 120
  - Post-Harness: Claude Code 10.0% → 24.2%, VeriAct 10.8% → 15.8%
  - VR: Codex 84.2% → 45.8%, VeriAct 65.0% → 15.8%
  - VeriAct verified 78 of 120 but only 13 were adequate
  - Codex adequacy is flat (0.12 → 0.13), so the effect is weak there
- VR drop is the agent refusing weak specs
- gaps
  - same test pairs give feedback and score, no held-out pairs
  - on FormalBench most tasks end with no adequate contract
  - agents use different base models
inconsistencies in the paper
- Houdini/Daikon VR differ between Table II and Section V-E
- Post-Harness@0.75 defined over verified tasks but reported over all tasks
- invalid inputs described as both generated and provided explicitly
- equivalent mutants ignored when outputs are non-unique
- no timeout counts, mutant counts, or δ given
relevance to agent-written Verus contracts (inference)
- threat to the claim "verified" more than a competitor
  - cheap published test a skeptic can aim at any Verus `ensures`
  - the 78 → 19 drop is the number they would cite
- adopt: concrete-pair stubs plus mutants, gate completion on both signals
