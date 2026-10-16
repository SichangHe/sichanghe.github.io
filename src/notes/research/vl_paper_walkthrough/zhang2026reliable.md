# Reliable Self-Improvement Training by Verifying Reasoning, Not Just Answers
(authored by agents unless marked 🧑)
Tag: `zhang2026reliable`, [paper](https://arxiv.org/abs/2603.21558)

## problem and contribution
The paper studies self-improvement training in which a model generates its own training solutions. Its claim is that accepting a solution because only its final answer is right lets “lucky guesses” teach incorrect intermediate reasoning. It introduces Verified Self-Improvement (VSI), which accepts a generated solution only after checking answer correctness, arithmetic, step-to-step variable consistency, and domain constraints (pp. 1–3). The paper states: “Before a solution can enter the training set, VSI recomputes every arithmetic step with a computer-algebra library (sympy), checks that intermediate values stay consistent from one step to the next, and enforces simple domain constraints (for example, counts should be non-negative whole numbers)” (abstract, p. 1).

The method is a filter on generated training data, not an inference-time proof system. The paper’s stated goal is reliable repeated training: “By asking that every reasoning step, not just the final answer, hold up, VSI keeps lucky guesses out of the finetuning data, so the model learns from solutions that are right for the right reasons” (Introduction, p. 2).

### what it is and when to use it
For each round, sample several candidate solutions from the current model, retain candidates accepted by a verifier, fine-tune on retained pairs, and evaluate. Use this when generated solutions have an automatically checkable correctness signal. The paper’s concrete experiment uses GSM8K word problems, where arithmetic and simple quantity constraints can be checked.

### steps in the paper
1. Generate N candidates per training problem from model M(i−1) at temperature T (Method §3.1, p. 3). In the experiment N=8 and T=0.7 (Experimental Setup §4, p. 5).
2. Apply an acceptance filter V to each candidate and retain pairs (xj, yj) whose final answer and reasoning pass the selected checks (Eq. 1, §3.1, p. 3).
3. Fine-tune M(i−1) on the retained set Di to obtain Mi (§3.1, p. 3). The experiment uses one epoch of LoRA training, rank 16 and effective batch size 16 (§4, p. 5).
4. Evaluate task accuracy, reasoning quality, and diversity before the next round (§3.1, p. 3).
5. Repeat for five rounds (§4, p. 5).

The paper compares no verification, answer-only outcome verification, majority voting, VSI, and VSI plus DPO (§3.2–§3.3, pp. 3–5). The illustrative failure is exact: “9 × 5 = 50” is recomputed by SymPy as 45 while the candidate’s final answer is 45, so outcome filtering keeps it and VSI rejects it (Figure 1, p. 3).

### Verus form (inference)
Inference: In Verus, the generated reasoning text would be outside the verified Rust kernel. A Rust verifier could parse a candidate into a sequence of arithmetic claims and a final result, then use executable code plus `requires`/`ensures` contracts to check each parsed operation. Arithmetic facts can be proved in `proof fn`s and represented by specifications; mutable state tracking can use a ghost history whose updates are constrained by loop invariants. This is an adaptation, not a claim made by the paper: Verus does not provide SymPy parsing or natural-language extraction automatically.

### evidence, assumptions, and limits
On GSM8K with Qwen3-4B-Thinking, the paper reports baseline 80.5% accuracy and VSI 91.0% after round 5, while no verification falls to 73.2% and outcome-only filtering plateaus at 85.8% (Conclusion, p. 10). At round 1, 7,473 training problems generated about 59,784 candidates; outcome verification kept 46,836 (about 78%), while VSI kept 30,983 (about 52%) (§5.1, p. 7). The paper describes this as rejecting about 34% of correct-answer solutions; 30,983/46,836 is 66.15% retained, hence 33.85% rejected. MATH-500 transfer rose from 45.5% to 51.2% for VSI and to 51.8% for VSI+DPO after five rounds (Table 2, p. 8), but this is a 500-problem test set trained only on GSM8K.

The check is incomplete. Arithmetic expressions are parsed with patterns such as “A ⊙ B = C”; the arithmetic pass rate is at least 0.8, but if no expression is parsed, the rate defaults to 1.0 (vacuous pass) (§3.2.2, p. 4). Logical-flow checking lowercases assignments and flags a change over 50% when separated by more than two steps; adjacent-step updates are allowed (Algorithm 1 and §3.2.3, p. 4). The paper explicitly notes missed renamed variables and pronouns (§3.2.3, p. 5). Constraints cover non-negative counts, integrality, and detectable conservation (§3.2.4, p. 5), so the approach is domain-specific. It adds about ten CPU minutes per round, but early rounds may over-filter; the fallback lowers the arithmetic threshold from 0.8 to 0.5 when fewer than 500 solutions pass (Limitations, p. 9).

### what it is and steps
Build preference pairs whenever a problem has both (a) a candidate passing all four VSI checks and (b) a candidate with the correct final answer but failed step verification. Mark the fully verified solution chosen and the lucky guess rejected, then train with Direct Preference Optimization (§3.3, p. 5). In the experiment, DPO used β=0.1, learning rate 5×10−6, and 4,426 pairs; reward accuracy increased from 46% to 63%, and round-5 GSM8K accuracy was 91.2% versus 91.0% for VSI SFT (§4 and §5.1, pp. 5, 7).

### Verus form (inference)
Inference: A Verus-backed pipeline could generate a boolean proof result for each candidate and construct preference records only after the proof result is established. Verus could verify the record-construction function’s invariant that a chosen record has all required checks true and a rejected record has a failed check; model optimization remains unverified external code.

## what is proved, measured, and trusted
The paper measures accuracy, verification rates, parser coverage, and Self-BLEU, rather than proving a theorem about model convergence. Self-BLEU for VSI rises from 0.30 to 0.35 over five rounds, versus 0.32 to 0.64 with no verification (Table 5, p. 9). Table 3 reports, among correct-answer solutions, arithmetic pass 84.1%, logical-flow pass 87.2%, constraints pass 91.8%, parser coverage 78.3%, and all-checks pass 66.3% (p. 8). The table’s all-checks rate is on the correct-answer pool, whereas the 30,983/46,836 calculation uses the explicit round-1 counts; the denominators differ from the all-generated pool.

Trusted components include SymPy evaluation, regex extraction, manually chosen thresholds, GSM8K ground-truth answers, LoRA and DPO implementations, GPU execution, and the correctness of the problem constraints. The authors state that “How long it stays stable is ultimately bounded by how good that check is” (Beyond math, p. 10).

## techniques for the catalog
- verified self-improvement loop — sample multiple solutions, mechanically check each solution’s answer and reasoning, and fine-tune only on accepted traces
- logical-flow verification — track named intermediate values and flag large unexplained changes across separated steps
- constraint satisfaction filter — enforce domain properties such as non-negativity, integrality, and conservation
- verifier-derived DPO — prefer fully checked traces over correct-answer traces that fail intermediate checks
