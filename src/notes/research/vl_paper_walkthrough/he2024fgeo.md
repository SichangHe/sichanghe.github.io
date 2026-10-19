# FGeo-TP: A Language Model-Enhanced Solver for Geometry Problems
(authored by agents unless marked 🧑)
Tag: `he2024fgeo`, [paper](http://arxiv.org/abs/2402.09047v1)

## purpose and system boundary

FGeo-TP combines a formal geometry solver (FGPS) with a language model that predicts theorem sequences before symbolic search. Its motivation is search complexity and timeout (Section 3.1, PDF p. 6). Without annotated theorem sequences, FGPS forward random search has a reported solved rate of 39.71% (Table 1, PDF p. 6). FGeo-TP raises the best reported solved rate to 80.86% (backward random search, Table 3, PDF p. 10).

The underlying FormalGeo7k dataset has 6,981 SAT-level geometry problems, each with natural-language text, geometric shapes, formal-language conditions, and theorem-sequence annotations (Section 1, PDF p. 2). The authors state: “The FGPS employs both forward and backward search methods with various strategies for automated problem-solving.” (Section 1, PDF p. 2.) FGeo-TP predicts likely theorem identifiers, executes them, adds their conclusions to the condition set, and then continues search if needed (Section 3.2, PDF pp. 8–9). The authors summarize the design: “Before FGPS initiates theorem search, the theorem predictor guides FGPS, reducing the search complexity.” (Section 3.2, PDF p. 7.)

## technique 1: formal representation and baseline search

What it is. FormalGeo represents geometric conditions with predicates such as `Equal(LengthOfLine(AD),8)` and theorem applications with named sequences. FGPS has forward search from known conditions and backward search from the goal, combined with breadth-first, depth-first, random, or beam strategies (Sections 1 and 3.1, PDF pp. 2, 5–6).

How to apply it.

1. Use the dataset's annotated formal conditions, shapes, and goal as solver input; theorem-sequence annotations supply prediction targets, not answers available during search (Section 1 and Figure 1, PDF p. 2).
2. For forward search, repeatedly match available theorems against known conditions and add each theorem's conclusions (Section 3.1, PDF p. 5).
3. For backward search, decompose the goal into subgoals and search for conditions that solve each subgoal (Section 3.1, PDF pp. 5–6).
4. Choose BFS, DFS, random, or beam expansion according to the desired exploration policy (Section 3.1, PDF p. 6).
5. Record solved, unsolved, and timeout outcomes; search exceeding 600 seconds counts as timeout (Section 3.1, PDF p. 6).

Evidence. On FormalGeo7k, baseline solved rates are 38.86% (FW-BFS), 36.16% (FW-DFS), 39.71% (FW-RS), 25.28% (FW-BS), 35.44% (BW-BFS), 33.73% (BW-DFS), 34.05% (BW-RS), and 34.39% (BW-BS), with unsolved and timeout percentages shown in Table 1 (PDF p. 6). The appendix states: “The experimental data for FGPS is derived from the FormalGeo [1].” (Table 7 footnote, PDF p. 16.)

Verus form. Inference: FormalGeo conditions correspond to Rust/Verus specifications, and theorem applications correspond to proof lemmas whose `requires` clauses match available facts and whose `ensures` clauses add conclusions. Forward search can synthesize lemmas from the current proof context; backward search can split an `ensures` goal into sublemmas. Verus checking, rather than a language model's predicted sequence, remains the acceptance test.

## technique 2: theorem-sequence prediction with a Transformer

What it is. FGeo-TP adds a Seq2Seq Transformer that receives the formalized condition language and predicts a theorem sequence before FGPS starts. Formal predicates are tokenized at word level, while free variables and numbers use character-level tokens; theorem names are converted to integer IDs to avoid out-of-vocabulary failures (Section 3.2, PDF pp. 7–8). The paper explains: “Due to the specificity of theorem names, a slight change in a single word may render FGPS unable to recognize them.” (Section 3.2, PDF p. 8.)

How to apply it.

1. Prepare input sequences from the formalized conditions and targets from annotated theorem sequences (Section 3.2, PDF p. 7).
2. Select a pretrained Transformer. The paper calls domain-corpus pretraining essential, but does not specify a separate pretraining procedure or objective (Section 3.2, PDF p. 7).
3. Fine-tune using annotated training and validation data with negative log-likelihood over theorem tokens: the paper gives `Loss = −(1/N) Σ log P(yi | y1,…,yi−1,input)` (Section 3.2, PDF p. 8).
4. At each output step, retain the top-k sequences by probability with beam search (Section 3.2, PDF p. 8).
5. Stop at an end token or the maximum sequence length; experiments use maximum length 20 and top 5 sequences (Section 3.2, PDF p. 8).
6. Union the final beam sequences into the predicted theorem sequence and pass it with the original conditions to FGPS (Section 3.2, PDF p. 8).

Evidence. The authors split 6,981 problems randomly 0.7:0.15:0.15 into training, validation, and test sets (Section 4.1, PDF p. 9). Matching degree measures coverage of required theorems: “We define the matching degree as the ratio of the accurately predicted theorems in the predicted sequence to the number of theorems required for the problem.” (Section 4.1, PDF p. 9.) Complete prediction means 100% coverage, not exact agreement in order or repetition. Table 2 reports average/complete matching: mT5 33.73%/17.51%, FLAN-T5-base 59.37%/33.59%, FLAN-T5-large 74.61%/55.22%, BART-base 86.29%/70.77%, and BART-large 84.16%/67.33% (PDF p. 9). They choose BART-base for solver integration because it has the highest average matching score (PDF p. 10).

Section 3.2 says the fine-tuned model is evaluated on the test set (PDF p. 8). Section 4.2 describes solver results on FormalGeo7k without explicitly identifying whether the solver evaluation uses the test split or the entire dataset (PDF p. 10). Inference: the reported solver rates should not be described as unambiguously held-out results.

Verus form. Inference: train or prompt a model to predict candidate lemma names from a normalized goal and context, then translate IDs into actual proof calls. Keep the candidate set bounded and check each candidate's `requires` and `ensures` in Verus. The paper's beam union can introduce irrelevant lemmas; in Verus this should affect search order only, never proof validity.

## technique 3: theorem-guided pruning and fallback search

What it is. FGeo-TP executes the predicted sequence first, merges its conclusions with the initial condition set, and then searches the expanded set if needed (Section 3.2, PDF pp. 8–9). The authors call this pruning; it changes the starting conditions rather than describing a hard restriction to predicted theorems.

How to apply it.

1. Execute the predicted theorem sequence; the paper does not specify the detailed handling of inapplicable predictions (Section 3.2, PDF p. 8).
2. Add the conclusions to the original condition set (Section 3.2, PDF p. 8).
3. If the goal is still unresolved, invoke a selected FGPS search method on the new conditions (Section 3.2, PDF p. 8).
4. Set maximum depth 15, beam size 20, and timeout 600 seconds in the reported experiments (Section 4.2, PDF p. 10).
5. If FGeo-TP times out, switch to the original FGPS search as a hybrid fallback (Section 4.4, PDF p. 12).

Evidence. FGeo-TP's Table 3 solved rates are FW-BFS 68.16%, FW-DFS 67.36%, FW-RS 68.76%, FW-BS 60.06%, BW-BFS 80.12%, BW-DFS 79.55%, BW-RS 80.86%, and BW-BS 79.06% (PDF p. 10). Table 6 reports the hybrid FGeo-TP+FGPS rates: FW-BFS 71.56%, FW-DFS 72.14%, FW-RS 73.48%, FW-BS 65.07%, BW-BFS 81.09%, BW-DFS 80.67%, BW-RS 81.86%, and BW-BS 80.41% (PDF p. 13).

The paper explains a failure mode: non-essential predicted theorems add unnecessary conditions and dilute the correct path, causing timeouts; BFS is less affected because it continues the initially matched queue (Section 4.4, PDF p. 13). It also says theorem matching exceeds final solving because order and repeated theorem use matter (Section 4.2, PDF p. 11).

Verus form. Inference: try predicted proof lemmas, retain verified proof changes, and fall back to baseline proof search when guidance times out. Never inject unproved facts into the Verus context.

## technique 4: difficulty-stratified evaluation and search-cost measurement

What it is. The paper groups problems by annotated theorem-sequence length: l1 ≤2, l2 3–4, l3 5–6, l4 7–8, l5 9–10, and l6 ≥11. The corresponding counts are 2,407, 1,898, 1,247, 824, 313, and 292 (Section 4.3, PDF p. 11).

How to apply it.

1. Define difficulty from the required theorem-sequence length, not from model confidence (Section 4.3, PDF p. 11).
2. Measure average solving time and solution steps for every search strategy and method (Section 4.3, PDF pp. 11–12).
3. Compare the guided solver and baseline at each difficulty level; inspect whether pruning degrades as sequences lengthen (Section 4.3, PDF p. 12).

Evidence. Table 4 reports average times in seconds for FGPS versus FGeo-TP. For example, FW-RS falls from 92.21 to 33.19 seconds and BW-RS from 65.82 to 6.08 seconds (PDF p. 12). Table 5 reports average steps; FW-RS falls from 41.89 to 8.82 and BW-RS from 4.34 to 0.30 (PDF p. 12). The paper says average solving time is reduced by more than a quarter, while prediction becomes less effective as theorem sequences grow (Section 4.3, PDF p. 11–12).

The appendix differs slightly from the main tables in several entries, including FGeo-TP FW-RS steps, reported as 8.83 in Table 7 versus 8.82 in Table 5 (PDF pp. 12, 16). The paper does not specify whether the time and step averages include unsuccessful searches. Inference: these averages alone do not establish equal-workload speedups.

Verus form. Inference: evaluate an agent's proof search by verification time, proof steps, solver queries, and repair effort stratified by contract complexity. A short predicted sequence can still be unsafe if it omits a necessary invariant; therefore count only verified obligations, not predicted-token match.

## what is proved, measured, and trusted

FGPS provides traceable theorem applications and algebraic equation solving (Section 2.2, PDF pp. 4–5); FGeo-TP measures theorem coverage, solved/unsolved/timeout rates, time, and steps (Section 4, PDF pp. 9–13). The paper does not establish a new soundness theorem. It explicitly notes that the predictor does not account for theorem-use frequency and that application order affects success (Section 4.2, PDF p. 11).

Inference: formal correctness depends on the formalization, theorem implementations, and algebraic solver. Prediction quality and evaluation also depend on tokenization, beam search, data splitting, and timeout policy; these are separate from proof soundness. A Verus deployment would additionally depend on its verifier, solver, specifications, compiler, and any external-library contracts.

Inference: theorem coverage is not proof correctness, because order and repeated applications can determine whether a solution succeeds. The hybrid fallback improves reported solving rates, but the evidence remains limited to this benchmark and timeout setting.

Inference: the threat to agent-written verified Rust is limited but operationally relevant. A model can guide proof search toward irrelevant lemmas, inflate context, and cause timeout; it cannot make an invalid Verus proof pass if checking is enforced. The main product risk is resource exhaustion and search bias, plus any unsound external facts inserted outside the checker.

## techniques for the catalog

- formal condition encoding — represent problem facts, goals, and theorem applications in a machine-readable predicate language
- baseline proof search — combine forward/backward reasoning with BFS, DFS, random, or beam expansion under a timeout
- theorem prediction — fine-tune a Seq2Seq Transformer to emit candidate theorem IDs from formal conditions
- beam union — retain top-k theorem sequences and merge their final predictions to improve recall
- guided pruning — execute predicted theorems and add their conclusions before further symbolic search
- fallback hybrid — switch to baseline search after guided search times out
- difficulty stratification — measure solving rate, time, and steps by theorem-sequence length
