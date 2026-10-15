# FGeo-TP: A Language Model-Enhanced Solver for Geometry Problems
(authored by agents unless marked 🧑)
Tag: `he2024fgeo`, [paper](http://arxiv.org/abs/2402.09047v1)

## purpose and system boundary

FGeo-TP combines a formal geometry solver (FGPS) with a language model that predicts theorem sequences before symbolic search. The paper's motivation is search explosion and timeout, not a new proof calculus. It reports that FGPS can return interpretable algebraic and deductive steps but, without annotated theorem sequences, forward random search solved 39.71% of FormalGeo7k within the timeout setting (Table 1, PDF p. 6). FGeo-TP raises the best reported solved rate to 80.86% (backward random search, Table 3, PDF p. 10).

The underlying FormalGeo7k dataset has 6,981 SAT-level geometry problems, each with natural-language text, geometric shapes, formal-language conditions, and theorem-sequence annotations (Section 1, PDF pp. 1–2). The authors state: “The FGPS employs both forward and backward search methods with various strategies for automated problem-solving.” (Section 1, PDF p. 2.) FGeo-TP predicts likely theorem identifiers, executes them, adds their conclusions to the condition set, and then lets FGPS continue search (Sections 1 and 3.2, PDF pp. 2–8). The authors summarize the design: “Before FGPS initiates theorem search, the theorem predictor guides FGPS, reducing the search complexity.” (Section 3.2, PDF p. 7.)

Inference: for VL, the transferable pattern is a learned search guide around a deterministic verifier. The language model proposes lemmas or proof steps; the formal checker must validate every step and retain a fallback search path. The paper does not discuss Rust or Verus.

## technique 1: formal representation and baseline search

What it is. FormalGeo represents geometric conditions with predicates such as `Equal(LengthOfLine(AD),8)` and theorem applications with named sequences. FGPS has forward search from known conditions and backward search from the goal, combined with breadth-first, depth-first, random, or beam strategies (Sections 1 and 3.1, PDF pp. 2, 5–6).

How to apply it.

1. Convert the problem statement and diagram into formal geometric conditions, shapes, goal, and theorem annotations (Section 1, PDF pp. 1–2).
2. For forward search, repeatedly match available theorems against known conditions and add each theorem's conclusions (Section 3.1, PDF p. 5).
3. For backward search, decompose the goal into subgoals and search for conditions that solve each subgoal (Section 3.1, PDF p. 5).
4. Choose BFS, DFS, random, or beam expansion according to the desired exploration policy (Section 3.1, PDF p. 6).
5. Stop at a solved goal or a 600-second timeout (Section 3.1, PDF p. 6).

Evidence. On FormalGeo7k, baseline solved rates are 38.86% (FW-BFS), 36.16% (FW-DFS), 39.71% (FW-RS), 25.28% (FW-BS), 35.44% (BW-BFS), 33.73% (BW-DFS), 34.05% (BW-RS), and 34.39% (BW-BS), with unsolved and timeout percentages shown in Table 1 (PDF p. 6). These percentages use the 6,981-problem dataset; the paper does not give a separate confidence interval.

Verus form. Inference: FormalGeo conditions correspond to Rust/Verus specifications, and theorem applications correspond to proof lemmas whose `requires` clauses match available facts and whose `ensures` clauses add conclusions. Forward search can synthesize lemmas from the current proof context; backward search can split an `ensures` goal into sublemmas. Verus checking, rather than a language model's predicted sequence, remains the acceptance test.

## technique 2: theorem-sequence prediction with a Transformer

What it is. FGeo-TP adds a Seq2Seq Transformer that receives the formalized condition language and predicts a theorem sequence before FGPS starts. Formal predicates are tokenized at word level, while free variables and numbers use character-level tokens; theorem names are converted to integer IDs to avoid out-of-vocabulary failures (Section 3.2, PDF pp. 7–8). The paper explains: “Due to the specificity of theorem names, a slight change in a single word may render FGPS unable to recognize them.” (Section 3.2, PDF p. 8.)

How to apply it.

1. Prepare input sequences from the formalized conditions and targets from annotated theorem sequences (Section 3.2, PDF p. 7).
2. Pre-train the Transformer on the FormalGeo corpus so it understands the domain-specific formal language (Section 3.2, PDF p. 7).
3. Fine-tune on the training split with negative log-likelihood over theorem tokens: the paper gives `Loss = −(1/N) Σ log P(yi | y1,…,yi−1,input)` (Section 3.2, PDF p. 8).
4. At each output step, retain the top-k sequences by probability with beam search (Section 3.2, PDF p. 8).
5. Stop at an end token or the maximum sequence length; experiments use maximum length 20 and top 5 sequences (Section 3.2, PDF p. 8).
6. Union the final beam sequences into the predicted theorem sequence and pass it with the original conditions to FGPS (Section 3.2, PDF p. 8).

Evidence. The authors split 6,981 problems randomly 0.7:0.15:0.15 into training, validation, and test sets (Section 4.1, PDF p. 9). Table 2 reports average/complete sequence matching: mT5 33.73%/17.51%, FLAN-T5-base 59.37%/33.59%, FLAN-T5-large 74.61%/55.22%, BART-base 86.29%/70.77%, and BART-large 84.16%/67.33% (PDF p. 9). They choose BART-base for solver integration because it has the highest average matching score.

Verus form. Inference: train or prompt a model to predict candidate lemma names from a normalized goal and context, then translate IDs into actual proof calls. Keep the candidate set bounded and check each candidate's `requires` and `ensures` in Verus. The paper's beam union can introduce irrelevant lemmas; in Verus this should affect search order only, never proof validity.

## technique 3: theorem-guided pruning and fallback search

What it is. FGeo-TP executes the predicted sequence first, merges its conclusions with the initial condition set, and then runs FGPS search on the expanded set (Section 3.2, PDF p. 8). This prunes search by making likely intermediate facts available before exhaustive exploration.

How to apply it.

1. Run every predicted theorem whose current conditions satisfy its formal prerequisites (Section 3.2, PDF p. 8).
2. Add the conclusions to the original condition set (Section 3.2, PDF p. 8).
3. If the goal is still unresolved, invoke a selected FGPS search method on the new conditions (Section 3.2, PDF p. 8).
4. Set maximum depth 15, beam size 20, and timeout 600 seconds in the reported experiments (Section 4.2, PDF p. 10).
5. If FGeo-TP times out, switch to the original FGPS search as a hybrid fallback (Section 4.4, PDF p. 12).

Evidence. FGeo-TP's Table 3 solved rates are FW-BFS 68.16%, FW-DFS 67.36%, FW-RS 68.76%, FW-BS 60.06%, BW-BFS 80.12%, BW-DFS 79.55%, BW-RS 80.86%, and BW-BS 79.06%, on the same FormalGeo7k setting (PDF p. 10). Table 6 reports the hybrid FGeo-TP+FGPS rates: FW-BFS 71.56%, FW-DFS 72.14%, FW-RS 73.48%, FW-BS 65.07%, BW-BFS 81.09%, BW-DFS 80.67%, BW-RS 81.86%, and BW-BS 80.41% (PDF p. 13).

The paper explains a failure mode: non-essential predicted theorems add unnecessary conditions and dilute the correct path, causing timeouts; BFS is less affected because it continues the initially matched queue (Section 4.4, PDF p. 13). It also says theorem matching exceeds final solving because order and repeated theorem use matter (Section 4.2, PDF p. 11).

Verus form. Inference: run predicted proof lemmas in a sandbox or ghost branch, retain only branches that type-check and preserve the target contract, and fall back to ordinary proof search when predictions fail. Never inject unproved facts into the Verus context. The hybrid design directly suggests a safe product behavior: learned guidance can time out, but the deterministic verifier and baseline search remain available.

## technique 4: difficulty-stratified evaluation and search-cost measurement

What it is. The paper groups problems by annotated theorem-sequence length: l1 ≤2, l2 3–4, l3 5–6, l4 7–8, l5 9–10, and l6 ≥11. The corresponding counts are 2,407, 1,898, 1,247, 824, 313, and 292 (Section 4.3, PDF p. 11).

How to apply it.

1. Define difficulty from the required theorem-sequence length, not from model confidence (Section 4.3, PDF p. 11).
2. Measure average solving time and solution steps for every search strategy and method (Section 4.3, PDF pp. 11–12).
3. Compare the guided solver and baseline at each difficulty level; inspect whether pruning degrades as sequences lengthen (Section 4.3, PDF p. 12).

Evidence. Table 4 reports average times in seconds for FGPS versus FGeo-TP. For example, FW-RS falls from 92.21 to 33.19 seconds and BW-RS from 65.82 to 6.08 seconds (PDF p. 12). Table 5 reports average steps; FW-RS falls from 41.89 to 8.82 and BW-RS from 4.34 to 0.30 (PDF p. 12). The paper says average solving time is reduced by more than a quarter, while prediction becomes less effective as theorem sequences grow (Section 4.3, PDF p. 11–12).

Verus form. Inference: evaluate an agent's proof search by verification time, proof steps, solver queries, and repair effort stratified by contract complexity. A short predicted sequence can still be unsafe if it omits a necessary invariant; therefore count only verified obligations, not predicted-token match.

## what is proved, measured, and trusted

FGPS provides traceable theorem applications and algebraic equation solving; FGeo-TP measures sequence-match accuracy, solved/unsolved/timeout rates, time, and steps. The paper does not claim that the Transformer proves a theorem. Formal correctness comes from the underlying FGPS rules and annotated formalization; the neural model only proposes order and pruning.

The trusted components include FormalGeo's ontology and annotations, theorem implementations, arithmetic solver, data split, timeout policy, and the correctness of the language-model tokenization and beam search. Inference: a Verus deployment would additionally trust the Verus verifier, solver, Rust compiler, specifications, and any external-library contracts.

The paper reports a specific contradiction-like limitation: theorem prediction's matching degree can be high while solving rate is lower because theorem order and repeated applications are not represented fully (Section 4.2, PDF p. 11). This is evidence against treating sequence similarity as proof correctness. The hybrid fallback improves rates, but the reported results remain benchmark-specific and use a 600-second cutoff.

Inference: the threat to agent-written verified Rust is limited but operationally relevant. A model can guide proof search toward irrelevant lemmas, inflate context, and cause timeout; it cannot make an invalid Verus proof pass if checking is enforced. The main product risk is resource exhaustion and search bias, plus any unsound external facts inserted outside the checker.

## what VL should not redo

Inference: VL should not redo formal predicate normalization, beam-guided search, or fallback search as unmeasured ideas. The open work is to adapt them to Verus proof contexts, define sound candidate filtering, and measure verification-time and maintenance gains on real Rust projects.

## techniques for the catalog

- formal condition encoding — represent problem facts, goals, and theorem applications in a machine-readable predicate language
- baseline proof search — combine forward/backward reasoning with BFS, DFS, random, or beam expansion under a timeout
- theorem prediction — fine-tune a Seq2Seq Transformer to emit candidate theorem IDs from formal conditions
- beam union — retain top-k theorem sequences and merge their final predictions to improve recall
- guided pruning — execute checked predicted theorems before deterministic search to shrink the search space
- fallback hybrid — switch to baseline search after guided search timeout or failure
- difficulty stratification — measure solving rate, time, and steps by theorem-sequence length
Checked 2026-10-15 against paper he2024fgeo: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
