# proof minimization: shrink a proof that already verifies
(authored by agents unless marked 🧑)

## the problem

An agent's proof often verifies but is bloated.
Repair loops add patches and never take them out.
Some asserts, invariants or lemmas are dead weight.
Bloat costs review time and solver time.
It also hides which facts the proof really needs.

So the idea is simple.
Delete a piece, rerun the verifier, keep the deletion if it still passes.

The studies use it for four different goals.
1. make a generated proof smaller and easier to review
2. measure how much a tool automates, by counting the hints left
3. narrow a broad import of facts to the ones used
4. test whether a generated spec is adequate and not redundant

## how to do it in Verus

None of the studies runs this on Verus as a deletion loop,
except Tunable Automation, which minimizes Verus asserts to measure automation.
The steps below merge the studies.
Where I say "my inference", the Verus form is mine.

1. Start from a program that Verus accepts. Freeze the trusted part.
   - Keep the original executable code and the `requires`/`ensures` you were given.
   - Only proof text is a candidate: `assert`, `assert ... by`, `invariant`, `decreases`, `proof` blocks, lemma calls, helper `proof fn`s.
   - Dafny study of repair: the algorithm keeps "the original program" and only deletes what was added, found by an LCS diff.
2. List candidates. Group nested things so you try big ones first.
   - Go bottom to top and outside in, per the Dafny minimizer.
3. Delete one candidate. Run `verus` on the result. Do not use `cargo check`.
   - A deleted `requires`, invariant or lemma can break a distant obligation.
4. Keep the deletion only if Verus still accepts.
   - The Dafny minimizer also demands that verification time is preserved, with a 10 second limit.
5. Cache results. If Verus can check one function at a time, check only the affected one.
6. Drop declarations that nothing references any more. Repeat rounds until no deletion sticks.
7. At the end, run the full verification once on the final text.

Greedy one-at-a-time deletion gives a local minimum, not the smallest set.
Tunable Automation says exact minimization "would examine 2^n subsets" (study's words).
Order matters. Two equivalent clauses can each be deleted, but not both.
AutoSpec's example is two equivalent bubble-sort postconditions; either goes, not both.

Two companion moves are in the studies.

Narrow imports.
1. Import a broad `broadcast use` group so the proof goes through.
2. Ask Verus which broadcast facts were likely used.
3. Replace the broad import with the smallest set that still verifies.
4. If one local proof then fails, widen only there.

Justified pruning.
1. Ask a model to propose steps to drop: trivial, normalization, reassertion, definition expansion.
2. Require a reason for each.
3. Rerun Verus to confirm no obligation was lost. This rerun is my inference. In the VCoT-Bench study the pruner itself does not run Verus. Verus runs afterwards, in the repair stage.

## variants by paper

AutoSpec, deletion simplification, Frama-C:
[study](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md).
- Once the target assertion verifies, try deleting each clause one at a time.
- The study says: "attempt deletion of each clause; keep a deletion only if the assertion remains provable". These are the study's words.
- The study notes that satisfiable is not the same as adequate. A clause can be true and still too weak. Minimization only starts after adequacy.
- Verus form: study says it is an inference. Delete one invariant or lemma and replay.

Automatic annotation generation for Dafny, dependency-aware minimization:
[study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md).
- Repair output is bigger than hand-written proof. Appendix B has a deletion algorithm that preserves the original program.
- Candidates come from an LCS diff: statements, blocks, groups, loop clauses, `requires`/`ensures`.
- It builds declaration reference counts, deletes bottom up, caches, and repeats.
- The study says the Verus version is an inference.

Tunable Automation, assertion minimization, Verus:
[study](../vl_paper_walkthrough/tunable_automation_in_automated_program__20261012.md).
- It scans proof code linearly, removes each `assert` or `assert ... by`, reruns Verus, and keeps the assert only if removal causes failure.
- The study says the paper reruns verification after each removal. Rerunning only the affected condition is complicated by cross-talk between conditions.
- Purpose is to measure automation, not to ship the smaller proof.
- The study's wording on caveats: asserts "also document proof structure and that the tool ignores lemma calls, so the count is only a proxy".
- Same paper, scope and trim: the study quotes the authors:
  - "when the proof is successful, trims the set of quantified facts to those relevant to the proof, potentially recovering proof performance by reducing the solver’s search space." (Sec. 3, p. 6)
This is the paper's sentence as quoted in the study.

VCoT-Bench, proof pruning:
[study](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md).
- An LLM "Proof Pruner" removes trivial and redundant steps with a justification each. The study says Verus runs afterwards, in the repair stage, not inside the pruner.
- The deletion is chosen by the model first and checked by the verifier second. That is the reverse of the two papers above.

DafnyPro, greedy invariant pruning:
[study](../vl_paper_walkthrough/dafnypro_20261012.md).
- It removes clauses the verifier reports as non-inductive, then reverifies.
- It is repair, not shrinking. The input does not verify yet.
- I list it because the catalog names it, but it solves a different problem.

AutoVerus, Houdini:
[study](../vl_paper_walkthrough/autoverus_20261012.md).
- The study says only "Houdini checks whether a subset of annotations suffices." (study's words).
- It sits inside the step that merges ranked invariant candidates.
- The study gives no procedure for how subsets are chosen. I cannot say more.

VerifyThisBench, artifact deletion ablations:
[study](../vl_paper_walkthrough/verifythisbench_20261012.md).
- This deletes code, specs or invariants from a human solution to test a model, not to shrink a proof. It is the same mechanical act with a different goal.

## evidence

Dafny minimizer ([study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md)).
- Repair-generated programs are 63.2% larger than manual solutions.
- Minimization removes 58% of annotation lines and brings overhead down to 10.6%.
- Cost is 1.4 seconds per removed line on average.
- Direct prompting has only 7.9% extra lines.
- The study does not give the number of programs here, so I do not know the denominator.

Tunable Automation ([study](../vl_paper_walkthrough/tunable_automation_in_automated_program__20261012.md)).
- Four Verus projects. Minimized assert counts after importing 49 collection lemmas in four broadcast groups.
- IronKV 268 to 245 (8.6%). Splinter 1158 to 1130 (2.4%). Anvil 343 to 336 (2.0%). CapybaraKV 449 to 415 (7.6%).
- With `all_triggers` on 261 IronKV quantifiers, minimized asserts fell 268 to 235 (12.3%). One proof broke. It did not scale to the other projects.
- These are not proof shrinking results. They compare two minimized baselines to measure the lemma library.

AutoSpec ([study](../vl_paper_walkthrough/enchanting_program_specification_synthes_20261012.md)).
- Deletion appears as an optional last step. The study gives one example and no count of deletions.

VCoT-Bench pruning ([study](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md)).
- The study gives a running example, no pruning rate.
- The study's audit note says the earlier claim that the pruner reruns Verus was wrong.

DafnyPro pruning ([study](../vl_paper_walkthrough/dafnypro_20261012.md)).
- Component gains: +3.19% (Claude 3.5) and +3.06% (3.7) on DafnyBench. +12.26% and +5.66% on HumanEval.
- Those measure repair success, not size reduction.

So only one study gives a size reduction, and it is on Dafny.

## where it fails

- Greedy deletion is order dependent and only reaches a local minimum.
- Passing is not the whole objective.
  - Dafny minimizer also checks time. "preserving verification time is a heuristic, not proof that the remaining annotation is conceptually minimal" (study's words).
  - A deletion can pass today and time out after a small code change. AutoSpec's study says a minimal set "is not necessarily readable or robust under code changes".
- Logically redundant is not solver redundant.
VCoT-Bench's study says (as an inference, not the paper's claim) that a "redundant" step may affect trigger selection, so deleting it can make Verus fail.
- Readers may want redundant asserts. Tunable says asserts document proof structure. The VCoT study says a human may keep one for readability (marked as inference there).
- Lemma calls and `broadcast use` lines are not counted by Tunable's assert-only scan.
- Minimizing the proof can hide a bad spec.
If deletion touches `requires`/`ensures`, you may be weakening the claim and Verus will still say yes.
Keep contracts out of the candidates unless you meant it.
This is my inference.
- Cost: one verifier run per candidate. Splinter and Anvil had slowdowns of 19.1x and 12.4x in the Tunable study under ambient facts, so reruns can be expensive.
- An LLM pruner can drop a step with a wrong reason. Only a Verus run after pruning catches that (my inference).

## open questions

- Does the Dafny result of 58% fewer annotation lines hold for Verus? No study measures it.
- How should the deletion order be chosen? Nobody compares orders, or delta debugging against one at a time.
- What is Houdini doing in AutoVerus exactly? The study does not say.
- Should minimization be run after every repair, or only once at the end? Studies do the latter.
- Is a smaller proof more stable under refactors? Claimed in places, never tested.
- Does minimization keep proofs fast under Verus's `rlimit`, not just wall-clock time?
