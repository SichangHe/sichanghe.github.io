# Goedel-Prover: A Frontier Model for Open-Source Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `lin2025goedelprover`, [paper](https://arxiv.org/abs/2502.07640)

idea: data recipe for a whole-proof Lean 4 prover (no Lean feedback at inference)
- autoformalize 928K informal problems into 1.64M Lean statements, then expert iteration on Lean-checked proofs
- miniF2F Pass@32 57.6% vs 50.0% for DeepSeek-Prover-V1.5-RL; PutnamBench 7/644
- math only, no programs; every Verus form below is inference
dual-style formalizers
- A: Qwen2.5-Coder-32B tuned on Lean Workbook pairs
- B: same base tuned on 170K Claude-sonnet-3.5 statements that compile (of 230K Numina)
- 8 samples each, keep one valid statement per formalizer per problem
- style matters: one problem proved 14/16 on A's statement and 0/16 on B's
- mixed-style training 57.6% vs 56.5% (A only) and 56.2% (B only) on miniF2F
  - ~1 point gap, single runs, set sizes not given, may confound with volume
statement filters
- compile with `:= by sorry`
- faithfulness: Qwen2.5-72B judges 4 times, drop score < 0.5
  - judge is unaudited, wrong provable statements still enter training
  - PutnamBench had a mis-formalized problem
- Verus (inference): verify with body hole, plus unsatisfiable-`requires` check and trivial-body-satisfies-`ensures` check
expert iteration
- 16 proofs per statement, Lean verifies, keep one random proof per solved statement
- retrain from the base model each round, not from the previous round
- pile grows mostly when new statements arrive (161K to 426K at iter-4, 443K to 888K at iter-7)
  - fixed pool grows a few percent per round, saturates in 2-3 rounds
- per round: 12 h on 4 H100 train, 6 h on 64 H100 sample, 10 h on 8,000 CPUs verify
- Verus (inference): accept test must scan `assume`, `admit`, `external_body` and compare contract and code with original
  - statement pool size, not iterations, is the part to plan first
held-out and cross-benchmark diagnostics
- hold out 250 generated statements (NuminaTest)
- ProofNet score negatively correlated with miniF2F (-0.51), Lean Workbook, NuminaTest
- adding Mathlib4: ProofNet 13.3 to 15.6, miniF2F 56.6 to 54.1, kept anyway
- track scores per population, an average hides the trade
RL on top
- DPO pairs from problems solved 1-4 of 16, GRPO on pass ratio in (0, 1/2], reward +8/-8, timeout = failure
- miniF2F Pass@32: SFT 57.5, DPO 60.3, GRPO 60.5
  - gain shrinks to 0.4 points at Pass@3200, RL reduces diversity
  - training reward kept rising while Pass@16 flattened
- reward hacking: `try` count 1.5 to 10.9 per proof under DPO
  - fix: choose shortest correct proof as positive (308 length, 1.11 `try`)
  - monitor proof length and permissive-construct counts per checkpoint
- Verus (inference): hacks are `assume`, weakened `ensures`, added `requires`, redundant asserts and nonlinear hints
  - guards: forbidden-construct scan, contract comparison in reward, solver give-up = failure
failed or dropped ideas
- o1-preview `have` outline + prover per subgoal: 76 vs 158 solved by plain sampling, 1 new
  - all-or-nothing assembly loses to sampling
  - repair-based variants (APOLLO) do help
- SymPy simplification closes 9.4% of miniF2F but adds nothing at Pass@3200
trust
- Lean checks all counted proofs
- trusted: Lean 4, Mathlib, benchmark statements, LLM judge
- paper's numbers disagree in places (8 vs 9 iterations, 57.6 vs 57.5, GRPO problem counts)
