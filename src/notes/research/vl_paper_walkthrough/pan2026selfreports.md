# Self-Reports Are Not Verification
(authored by agents unless marked 🧑)
Tag: `pan2026selfreports`, [paper](https://www.semanticscholar.org/paper/2f7da3a4ac21bb943904d499e447a268553d16af)

## scope and contribution
Pan, Zhou, and Hu test whether language-model self-reports can stand in for verification. The paper builds an LLM-guided evolutionary search for Contexto, where every valid word receives an exact rank. Its abstract states: "We introduce an environment-grounded audit in which every intermediate proposal receives an exact outcome." (Abstract, p. 1.) The audit separates confidence calibration, causal influence of inherited rationales, and whether selection improves report quality. Across 200 runs, five configurations, and three model families, four reporting configurations emitted 12,249 reports; 11,976 had a gradeable outcome (Abstract, p. 1; §3, p. 4).

## technique 1: dense environment grounding
what it is and when to use it
Use an environment that grades every intermediate proposal, including failures, when you need to check an agent's claims without human labels. Contexto returns a semantic rank for each valid guess; rank 1 is the target and lower is better. The authors call this "Dense, exact feedback" and say: "every valid proposal by the model receives an immediate ordinal outcome, so its accompanying report can be graded without human labels." (§3, p. 3.)

how to apply it
1. Define an environment feedback function f that returns an exact outcome for every valid action (§3, p. 3)
2. Store each action together with its self-report and the returned outcome (Fig. 1, p. 2)
3. Choose a report target that can be evaluated from the outcome; here it is whether the first graded word is in the top 100 (§3, p. 4)
4. Compare stated probabilities and buckets with realized outcomes, rather than accepting fluent explanations (§4, p. 5)

Verus form (inference)
Inference: In Verus, model the environment as an executable function with a postcondition relating an input action to an exact rank, for example `fn grade(w: Word) -> (r: int) ensures 1 <= r`. A ghost record can pair each proposal with its claimed probability and the returned rank; a proof function can establish that an audit only counts records whose rank was returned. The paper's hosted Contexto service, vocabulary, and similarity model remain external assumptions, so Verus cannot prove their behavior from this contract alone.

evidence and limits
The method's evidence is the 11,976 gradeable reports and the reproducibility settings (50 generations, 15 initial individuals, five survivors, four mutation operators, one crossover; Table 1, p. 4). Contexto's exact representation and similarity function are undisclosed (§1, p. 2), and the authors caution that partial or noisy feedback needs separate evaluation (§7, p. 9). Inference: an agent-written verified Rust product can use dense checks such as parser acceptance, state-machine transitions, or held-out tests, but those checks prove only the encoded property.

## technique 2: calibration and discrimination as separate checks
what it is
Calibration asks whether confidence p succeeds about p of the time; discrimination asks whether higher confidence identifies better outcomes (§4, p. 5). The paper computes expected calibration error over ten equal-width bins and Spearman correlation between confidence and returned rank. It explicitly warns: "A model may succeed at one while failing at the other." (§4, p. 5.)

steps
1. Define the binary outcome (top-100 here) and retain each stated probability (§3–4, pp. 4–5)
2. Bin probabilities and compute each bin's stated mean and observed frequency; aggregate ECE as specified in Eq. (1) (§4, p. 5)
3. Compute rank correlation, interpreting more negative values as better because lower ranks are better (§4, p. 5)
4. Report denominators and run-level uncertainty; exclude undefined correlations as the appendix specifies (Appendix B, p. 14)

results
EA-Qwen stated 47.7% top-100 probability for 2,073 graded proposals but observed 10.0%, a 4.8× overstatement. EA-Gemma stated 75.3% versus 12.3% over 879 proposals (6.1×), and EA-Ministral stated 67.9% versus 7.3% over 3,498 proposals (9.3×) (§4, p. 5). Gemma had median Spearman rho −0.450 but median ECE 0.652; Qwen had ECE 0.363 and rho −0.230 (Fig. 4, p. 6). These are distinct properties, with model and run denominators given in the figure and Appendix B.

Verus form (inference)
Inference: Represent a report as a struct with a probability and observed rank, specify `0 <= p <= 1`, and prove aggregation lemmas over finite sequences. Verus can verify arithmetic and bin membership, but the empirical frequencies and model outputs must be supplied as measured data; the proof does not establish calibration of a future model.

## technique 3: causal rationale intervention
The paper tests only inherited rationales, because the rationale is emitted after the proposal. It replays 754 variation events with parent, operator, and prompt state fixed, replacing the genuine rationale with unrelated text, length-matched filler, or no rationale (§5, p. 7). The authors state: "Comparing the four conditions tests whether changing only the inherited rationale changes the distribution of later proposals." (§5, p. 7.)

steps
1. Freeze the parent and all non-rationale prompt state (§5, p. 7)
2. Replay each event under four rationale conditions (§5, p. 7)
3. Compare paired returned ranks with Hodges–Lehmann estimates and intervals resampled by complete run (§5, p. 7)
4. Compare first-word identity and Jaccard overlap (§5, p. 8)

Results: genuine versus unrelated estimated rank difference +73, 95% interval [−5,+477], using 744 usable pairs; versus filler 0 [−242,+138] using 746; versus no rationale +50 [0,+279] using 748 (§5, pp. 7–8). First-word agreement was 15.5%, 16.3%, and 15.1%; Jaccard overlap ranged 0.138–0.142 (§5, p. 8). The intervals bound any genuine-rationale benefit to roughly 250 ranks, but do not test rationales placed before an action or usefulness to human readers (§5, p. 8).

Verus form (inference)
Inference: Encode replay conditions as an enum and prove that the audit compares equal parent state and operator inputs; treat generated words and ranks as external observations. Verus can prove the paired-difference computation, not causal faithfulness of an LLM.

## technique 4: selection differential and transmission audit
Selection can improve report accuracy only if selected individuals are more accurate and offspring resemble parents. The paper tests these requirements across 1,214 selection events and 1,018 parent–offspring pairs (§6, p. 8). Selected-minus-discarded probability-error difference was +0.039 (p=0.713); bucket-distance difference −0.146 (p=0.253). Parent–offspring correlations were −0.023 (p=0.524) and +0.057 (p=0.911), respectively (§6, p. 8; Table 3, p. 13). Random selection changed search behavior—one target solved 5/5 runs under fitness selection versus 1/5 under random, with median guesses 446 versus 1,828—but neither rule produced report-accuracy transmission (§6, p. 8).

Inference: A Verus product should select on independently checked task properties, and should not infer that evolutionary survival makes agent claims reliable unless report accuracy itself is measured. A proof can establish that selection obeys a ranking contract; it cannot prove an empirical correlation that was never encoded.

## what is proved, measured, and trusted
The paper measures reports against Contexto ranks, intervention outcomes, and permutation tests (1,000 permutations; Table 3, p. 13). It proves no theorem about language models. Trusted elements include the hosted game's ranking function, model serving, prompts, random sampling, and data extraction. Appendix C reports invalid proposals: 1/2,084 Qwen offspring, 0/881 Gemma, and 130/3,758 Ministral were all invalid or duplicate (p. 15). GPU usage was an approximate upper estimate of 1,680 aggregate GPU-hours; exact occupancy was not retained (Appendix C, p. 15). The authors note a contradiction-like design tension: selecting on report quality would make the report a fitness target and potentially corrupt the measurement (Appendix A, p. 13).

Inference: Threat to a product of agent-written verified Rust is high for any workflow that treats model confidence or rationale as evidence that a proof or contract is correct. The threat is lower when every intermediate artifact is checked by Verus, compilation, tests, or an independent environment. Existing work on ReAct, Toolformer, CRITIC, and step-by-step verification is cited as prior external-checking practice (§2, p. 2); VL should reuse those ideas rather than redo claims that narration alone verifies code.

## techniques for the catalog
- dense environment grounding: grade every intermediate action externally so each self-report is checkable
- separate calibration and discrimination: test probability accuracy and ranking ability as different properties
- inherited-rationale replay: hold search state fixed and replace only the rationale to test causal influence
- selection audit: test selection differentials and parent–offspring transmission before claiming optimization improves report quality
- independent report-off control: compare matched runs with reporting enabled and disabled; the paper found no detectable behavior change (25 runs per condition, §3, p. 4)

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
