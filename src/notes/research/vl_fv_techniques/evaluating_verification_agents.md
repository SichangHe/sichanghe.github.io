# Evaluating a system that writes specifications or proofs
(authored by agents unless marked 🧑)

Short version: a verifier pass is cheap to get and easy to misread.
A good benchmark fixes what the system is allowed to change, fixes the referee, and reports every outcome with its denominator.
This page covers how to build such a benchmark and how to report results.
Cheating checks are on [anti_cheating_prerequisites.md](anti_cheating_prerequisites.md).
Whether a specification says the right thing is on [specification_quality_checks.md](specification_quality_checks.md).
An older survey of what a pass means is [here](../topic_studies/formal_verification_rust/llm_for_verification/evaluation.md).

## the problem

A headline like an agent verifying 81% of tasks hides at least six choices.

- which skill was tested: writing proofs, writing contracts, writing code, or all three
- where tasks came from, and whether the model saw them in training
- which verifier version and settings decided "pass"
- what counts as a task in the denominator
- what happened in the runs that did not pass: no output, syntax error, timeout, partial, budget stop
- what it cost

Change any one and the number moves. The studies below show each one moving.

## how to do it in Verus

The studies mostly use Dafny or Lean. Where I say "Verus form", the studies give none for that step, and the Verus steps are my inference.

Step 1. Pick the one skill to measure.
- proof only: keep code and `requires`/`ensures`, delete the proof material
- contract only: keep code and proof, delete `requires`/`ensures`
- code only: keep the contract, delete the body
- everything: give only a natural-language description
- the staged versions of these are the "information modes" and "artifact deletion" variants below

Step 2. Build tasks from verified sources.
- collect programs that already verify, from several independent sources
- deduplicate
- keep the verified original as ground truth
- Verus form: `cargo verus verify` on each original, with the pinned Verus and Rust versions, and drop anything that fails

Step 3. Strip the hints and freeze the contract.
- remove body `assert`, loop `invariant`, `decreases`, `proof` blocks, helper lemma bodies
- keep `requires` and `ensures` byte for byte
- Verus form: compare the contract text of the answer with the original before running the verifier

Step 4. Pin the referee.
- one Verus build, one Rust toolchain, one solver, one timeout, one machine type
- the agent cannot edit the referee, the task manifest, or the withheld material
- record the exact command in the task manifest

Step 5. Define outcome classes before running anything.
- no output
- does not parse or compile
- verifier timeout
- partial: some obligations verify, some do not
- verified
- budget stop, recorded as its own class
- task could not be expressed
- the anti-cheat screen's rejection is also a class, owned by the other page

Step 6. Run with a fixed budget and log everything.
- fixed number of repair rounds, fixed token and dollar cap, fixed time cap
- log first-attempt result, result after each round, final result, dollars, tokens, wall time
- if you sample K candidates, say K

Step 7. Report.
- for every number: how many passed over how many attempted (for example 688/849)
- one row per outcome class, not only "pass"
- results by difficulty stratum
- the baseline that needs no model (for example the unchanged hint-free file)
- single run or several runs
- what the referee and the screens did and did not check

Step 8. Control contamination.
- prefer sources that were not public at training time, or report the overlap
- keep a development split apart from the evaluation split
- if you train on tasks, exclude them from evaluation

## variants by paper

The first group is about what to remove from a task.

[DafnyBench](../vl_paper_walkthrough/dafnybench_20261012.md): the fill-hints task.
Delete body assertions and invariants, keep the contract, ask for the program back.
Success needs a verified file, an unchanged contract, and no escape hatches.
The study says this isolates "proof-hint synthesis for an existing contract, not requirements discovery or implementation synthesis."

[VerifyThisBench](../vl_paper_walkthrough/verifythisbench_20261012.md): delete exactly one artifact.
The XS version has code-generation, specification-generation, and loop-invariant-generation tasks, built from a human solution.
The full version gives only the natural-language problem.

[Can LLMs Enable Verification in Mainstream Programming?](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md):
six information modes,
from filling proof annotations given implementation and specification,
to producing everything from natural language and signatures.
The paper's question, quoted from the study: "how much information do we have to expose to an LLM in order to successfully produce correct-by-construction code?"

[VCoT-Bench](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md): remove semantic blocks, meaning one lemma, all invariants of one loop, or all assertions between two lines.
The study describes three sweeps.
Ratio removes 1 to N blocks.
Type removes all blocks of one kind.
Location removes the front, middle, or end third.
Total 1,988 tasks, from 150 Verus programs.

[VERINA](../vl_paper_walkthrough/verina_20261012.md) and [P^3](../vl_paper_walkthrough/p_3_20261012.md): modular task pipelines.
Score CodeGen, SpecGen, and ProofGen alone, and then the chains: spec to code to proof, code to spec to proof, and all from the description.
In the end-to-end chain, the proof is checked against the ground-truth specification, so the model cannot invent code and a contract that match each other emptily.

The second group is about where tasks come from.

[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md): tasks from real Verus systems.
Run Verus with `log-all`, build a stand-alone file with dependency signatures marked `external_body`, delete the proof in the target function, keep pre and postconditions.
849 tasks from eight systems.


[AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md): the same 77 algorithm contracts written by hand in Dafny, Verus, and Lean,
so score differences point at the toolchain and not at an easier contract.

The third group is about the referee and the report.

[SaltBench](../vl_paper_walkthrough/saltbench_20261012.md): freeze the world.
Pin the toolchain, hide references, run a network canary, freeze predictions before scoring, and let an external runner produce the result line.
Its abstract line, as the study quotes it: "Outcomes are decided outside the agent's toolchain." Budget stops are their own class.

[VerifyThisBench](../vl_paper_walkthrough/verifythisbench_20261012.md) again: one environment for seven tools, same prompt template, one-minute timeout,
"A task is marked as pass/succeed if no error is returned."

[VeruSyn](../vl_paper_walkthrough/verusyn_20261012.md): Accuracy@K plus dollars per task. The study defines it as "fraction of tasks with at least one Verus-verified output among K samples".

[P^3](../vl_paper_walkthrough/p_3_20261012.md): beyond solve rate, count full restarts (the agent throws away everything and rewrites), plus API cost and wall time.

[AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md) also compares depth against width at equal budget: one chain of 15 repair rounds against many one-round samples.

[SO-RSI](../vl_paper_walkthrough/so_rsi_20261012.md): when an agent edits its own workflow, pick edits on development tasks only.
The study quotes the paper: "test outcomes never guide optimization."
Compare against ordinary repair under equal time and dollars; the paper matches 24 hours, not spending.

## evidence, with denominators

Task isolation changes the number a lot.
- [Agentic proving study](../vl_paper_walkthrough/agentic_proving_for_program_verification_20261012.md):
  CLEVER (Lean 4, 161 entries), Claude Opus 4.6, one-hour limit per attempt. Four rates, four denominators.
  - 81.3% = 65/80 specification isomorphism, on the benchmark's correct portion
  - 87.5% = 70/80 implementation proofs from correct ground-truth specifications, among entries with no specification bug
  - 95.7% = 154/161 with an OK attempt across simple and guided runs; 98.1% after removing four benchmark issues
  - the study says these must not be collapsed into one number; reference defects (12 error types) mean the benchmark itself needs auditing
  - cost about $2.0 to $2.5 per proving solve, one-hour runs near $10
- [DafnyBench study](../vl_paper_walkthrough/dafnybench_20261012.md): best model Claude 3 Opus 67.8 ± 1.7% on 782 programs, ten attempts each.
  With no LLM the baseline is 26.9%, because some programs verify without hints.
  So the model's own contribution is smaller than 67.8.
- [Mainstream-programming study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md), Verus, programs verified at least once in five runs.
  Mode 1 (fill annotations): 25/55.
  Mode 2: 17/55.
  Mode 3: 20/55.
  Mode 4: 22/55.
  Mode 5: 13/55.
  Mode 6 (all from natural language): 8/55.
  The study notes "A task counts once if at least one of five attempts verifies; the table is not per-attempt accuracy."
- [VerifyThisBench study](../vl_paper_walkthrough/verifythisbench_20261012.md): full end-to-end, the best overall refined rate is 9.37% (o3-mini).
  XS tasks, overall refined: 9.73% code, 11.27% specifications, 9.81% loops.
  Verus mean on strict tasks rose from 3.32% to 8.15% with feedback.
- [VERINA study](../vl_paper_walkthrough/verina_20261012.md), 189 tasks, pass@1 computed from 5 sampled responses per task (App.
  C.3, as the study notes): o3 gets 72.6% code, 52.3% specification, 4.9% proof.
  The end-to-end Code&Spec score is 41.2% and the leading end-to-end proof score is 3.2%.
- [VCoT-Bench study](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md):
  Claude Sonnet 4.5 scores 71.58% with 10% of blocks removed and 17.22% with all removed.
  By type: 68.71% invariants, 39.55% assertions, 51.54% lemmas.
  By location: 69.04% front, 46.35% middle, 65.96% end.

Real-project tasks look different from small ones.
- [VeruSAGE study](../vl_paper_walkthrough/verusage_20261012.md):
  Sonnet 4.5 hands-off proves 688/849 (81%), at 7.2 minutes per task.
  By project it ranges from 23/63 (Anvil Controller) to 104/104 (Anvil Library).
  Success correlates negatively with task size, coefficients −0.28 to −0.50.
- The same study reports tasks average 947 lines against 32 for VerusBench.

Cost and time.
- [AutoVerus study](../vl_paper_walkthrough/autoverus_20261012.md): 137/150 on Verus-Bench with at most three tries, about $37 total, 2,637 candidates.
- [VeruSyn study](../vl_paper_walkthrough/verusyn_20261012.md): on VeruSAGE, Accuracy@100 without debugging costs $0.17 per task for the fine-tuned small model against more than $8 for Sonnet.
- [VeruSAGE study](../vl_paper_walkthrough/verusage_20261012.md): a three-task whole-project run took 1.6 times the time and 2.2 times the money of single-file tasks.
- [LeetProof study](../vl_paper_walkthrough/leetproof_20261012.md): $5 per problem, 28/50 for the Velvet route against 17/50 for direct Lean.
- [P^3 study](../vl_paper_walkthrough/p_3_20261012.md): $30 API budget and 180 minutes per run, one run per cell.

Repair rounds and restarts.
- [DafnyBench study](../vl_paper_walkthrough/dafnybench_20261012.md): about 54% on the first attempt, a plateau near 65% around five attempts.
- [AlgoVeri study](../vl_paper_walkthrough/algoveri_20261012.md):
  Gemini's Dafny pass rate "nearly triples from round 0 to 15".
  GPT-OSS-120B saturates near round 3.
  Under equal budget, deep repair often loses to width for GPT-OSS.
- [VERINA study](../vl_paper_walkthrough/verina_20261012.md): proof pass up to 20.1% with 64 refinement rounds, against 4.9% pass@1 for o3.
  The paper gives no count or model for the 20.1%, only the Figure 8 curves.
- [P^3 study](../vl_paper_walkthrough/p_3_20261012.md): full-restart rates on Verina 11.7%, 7.8%, 5.3%, 8.5% for P^3 against 28.6%, 24.7%, 18.5%, 24.9% for sequential, out of 189 runs per backend.
- [VeruSAGE study](../vl_paper_walkthrough/verusage_20261012.md): three independent o4-mini runs on 100 tasks gave 41%, 39%, 39%, and 56% accumulated over the three.
  Unioning all four models gave 82.3%, only 1.4 points above Sonnet 4.5 alone.

Outcome classes.
- [VerifyThisBench study](../vl_paper_walkthrough/verifythisbench_20261012.md) uses no generation, compile error, timeout, partial, success. Its finding: "compilation errors dominate".
- [Mainstream-programming study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md) counts Verus errors in Mode 1: 192 type errors, 46 assertion failures,
  28 invariant-maintenance, 22 invariant-entry, 17 syntax, 14 arithmetic overflow.
- [AlgoVeri study](../vl_paper_walkthrough/algoveri_20261012.md) classifies the first blocking error per round as syntax, type, or verification. Verus keeps a "syntax barrier".
- [SaltBench study](../vl_paper_walkthrough/saltbench_20261012.md): of 200 conditions, 181 were results of record, 16 inexpressible, 3 unreached at the cost cap.
  It records "A budget stop is recorded as a halt rather than silently counted as failure."

Rust-Prover, Lean, as a worked report.
- [study](../vl_paper_walkthrough/lean_backed_rust_verifier_20261012.md)
- 1325 theorems from 1,007 problems (946 main, 61 extended) at a pinned benchmark state, all proved;
  three agents, about 35 hours, $1,792, median 3.4 minutes and $1.20 per theorem; author reports, not reproduced
- the specifications are supplied, so the result is proof completion, not specification discovery;
  the paper says "we do not yet know how much of this carries over to the crates we verify for customers"
- a Verus rerun on 50 problems chosen by longest reference proofs: Opus 49/50;
  the paper says the rates "are not comparable rates" because tools, examples and lookups differ, so it does not show Lean causes the gain

- Identity windows inflate replay rates. In JS-SAM's spinlock set 6 of 28 windows leave state unchanged, so a do-nothing model scores 6/28.
  Report both the unconditional and the state-changing rate. Its "326,592 states explored" is a step count, not reachable states.
  [study](../vl_paper_walkthrough/executable_javascript_as_a_checkable_spe_20261012.md)

## where it fails

Pass is not correct.
The verifier proves the contract you gave.
[AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md) quotes the paper: "A successfully verified program is only correct with respect to its specification;
it does not guarantee the correctness of the specifications." On AlgoVeri,
Gemini's Verus rate was 25.97% compiler-verified and 24.68% after semantic filtering,
so the filter removed one task of 77.

A no-model baseline inflates scores. DafnyBench's 26.9% is the case. Report the rate on tasks that actually needed the model.

Contamination.
- DafnyBench, in the paper's words as quoted by the study: "Data contamination emerges as a potentially significant limitation for evaluating LLMs on this benchmark."
- VERINA, paper's words: its task topics "posing a risk of data contamination".
- VeruSAGE reports Atmosphere "was not public when models were trained" and the hands-off model still reached 83% (130/157).
  That is the study's note, and one data point, not a test of contamination elsewhere.
- VeruSyn trains on 289 VeruSAGE tasks and excludes them from evaluation.
- LeetProof keeps 15 development and 35 evaluation problems.

Single runs and selection.
[P^3](../vl_paper_walkthrough/p_3_20261012.md) ran each cell once,
so "no within-task variance or significance test is available",
and "The difficult subset is selected by mean cost, so its savings are conditional."
The study adds, marked as its inference, that they may suffer selection effects. [SaltBench](../vl_paper_walkthrough/saltbench_20261012.md)
says its intervals say "nothing about whether the method makes code more or less correct",
and its five authored systems are not an independent population.

Mixed budgets. [AlgoVeri](../vl_paper_walkthrough/algoveri_20261012.md): "GPT-5.3's table row uses an eight-round budget while most rows use 15, so direct model comparisons confound budget."

Bad averages. [VCoT-Bench](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md): "100% removal accuracy is inflated by single-block programs appearing only at that ratio."

The fence itself can leak.
[SaltBench](../vl_paper_walkthrough/saltbench_20261012.md) reports (study's words) that the Verus referee's docstring claimed a sandbox but a grep found only the comment,
so the referee had been running unfenced.
The exec set turned out to be four binaries, and a fifth exec point showed up later.
Test the fence.

No independent proof object in Verus. [SaltBench](../vl_paper_walkthrough/saltbench_20261012.md): Verus emits none, so the claim is "the referee accepted", under the pinned invocation and screens.

Small tasks overstate project ability.
[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md), paper's words: "no evidence that they are good at breaking down the project-level verification goal".
[VeruSyn](../vl_paper_walkthrough/verusyn_20261012.md) says "small-task gains may overstate product impact."

Scores do not transfer across languages. VERINA, P^3 and LeetProof are Lean. Only VeruSAGE, VCoT-Bench, AutoVerus, VeruSyn and SaltBench are Verus.

## where the studies disagree or do not line up

- AlgoVeri on Lean: the AlgoVeri study has Lean at 9.09% compiler-verified (Gemini, 15 rounds).
  The [P^3 study](../vl_paper_walkthrough/p_3_20261012.md) has AlgoVeri solve rates of 31.2 to 48.1% across all methods, in Lean 4.28 with four other backends under $30 and 180 minutes.
  The gap is across different agents, tools and metrics, and neither paper explains it.
- VERINA proof rates: 4.9% for o3 in the VERINA study, against P^3 rates of 59.3 to 77.2% on Verina.
  The VERINA number is ProofGen alone, pass@1 over 5 samples per task, with general models.
  The P^3 rates come from end-to-end Lean agents with Lean tools and other backends.
  P^3 does not compare the two, so how much of the gap is the agent is unknown.
- VerusBench:
  AutoVerus 91.3% (137/150, three tries) against VeruSyn's 83% for its fine-tuned model and 76% for Claude Sonnet 4.5 at Accuracy@K with five debug rounds.
  The metrics and budgets differ, so these numbers cannot be ordered.
  The name VerusBench also covers different sizes: 139 tasks in the SAFE paper, 150 in the AutoVerus paper.
  That the 11 CloverBench tasks explain the gap is the study's inference.
- Sonnet 4.5 on VeruSAGE: 81% (688/849) hands-off in the VeruSAGE study, 54% in the VeruSyn study at Accuracy@600 with debugging, on a set that excludes 289 tasks.
  The 81% is all 849 tasks hands-off.
  The 54% is a 560-task subset under another protocol.
- Counts inside one paper: the [VerifyThisBench study](../vl_paper_walkthrough/verifythisbench_20261012.md) records "734 tasks" in Section 2.3 and 41 challenges and 154 tasks in Section 3.1.
  Always say which one is your denominator.
  These are the paper's inconsistency, not the study's.

## what looked wrong in a study

The audit log has fixed the slips I flagged earlier.
What is left is the papers' own inconsistencies, as the studies now state them.

- VerifyThisBench paper: Table 6 gives Verus XS tasks as 99, but its parts (31 implementation, 27 specification, 31 loop) sum to 89.
  Also 734 tasks in Section 2.3 against 154 tasks in Section 3.1.
- DafnyBench paper: its own counts give 113 + 23 + 72 = 208 hint-free programs, 26.6% of 782, against its reported 26.9% baseline.
  The paper does not explain the difference (the audit calls it the paper's own).

## open questions

- A Verus-native benchmark that uses the same hand-written contract in several tasks, with a stated no-model baseline and mutation-checked contracts. Nobody in these studies has one.
- How to measure project-level ability: choosing specifications and lemmas, not only filling a given function. VeruSAGE's authors say they have no evidence for it.
- Whether results from Lean (VERINA, P^3, AlgoVeri's Lean column) say anything about Verus. P^3 says transfer is plausible but untested.
- What K and what repair depth to fix so cost-adjusted comparison is fair. AlgoVeri shows the best split depends on the model.
- How to measure contamination for Verus code, where much of the public corpus is on GitHub. The studies report quarantine and date arguments, not a test.
- How to report censored runs: SaltBench has 10 censored and 4 unscorable cells in one reading, and the studies do not say how to put a confidence interval on them.

## studies used

[saltbench](../vl_paper_walkthrough/saltbench_20261012.md)
[dafnybench](../vl_paper_walkthrough/dafnybench_20261012.md)
[verifythisbench](../vl_paper_walkthrough/verifythisbench_20261012.md)
[algoveri](../vl_paper_walkthrough/algoveri_20261012.md)
[verina](../vl_paper_walkthrough/verina_20261012.md)
[verusage](../vl_paper_walkthrough/verusage_20261012.md)
[p_3](../vl_paper_walkthrough/p_3_20261012.md)
[can_llms_reason_like_automated_theorem_p](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md)
[can_llms_enable_verification_in_mainstre](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md)
[verusyn](../vl_paper_walkthrough/verusyn_20261012.md)
[autoverus](../vl_paper_walkthrough/autoverus_20261012.md)
[leetproof](../vl_paper_walkthrough/leetproof_20261012.md).
