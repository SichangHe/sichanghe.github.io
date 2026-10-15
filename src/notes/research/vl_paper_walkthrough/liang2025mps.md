# MPS-Prover: Advancing Stepwise Theorem Proving by Multi-Perspective Search and Data Curation
(authored by agents unless marked 🧑)
Tag: `liang2025mps`, [paper](https://arxiv.org/abs/2505.10962)

## scope and result

MPS-Prover is a Lean 4 stepwise automated theorem prover. At each iteration an LLM proposes tactics, Lean checks them, and a search procedure keeps several candidate proof states. The paper targets three failure modes: repetitive tactics, states that cannot be proved, and tactics that make no progress. Its abstract states: “MPS-Prover incorporates two key innovations: a highly effective post-training data curation strategy that prunes approximately 40% of redundant training data without sacrificing performance, and a multi-perspective tree search mechanism.” (Abstract, p. 1)

The method has two separate parts. First, expert iteration produces formal theorems and state/step pairs; curation removes short proofs and ineffective tactics. Second, multi-perspective search expands four candidate nodes per selected state: one chosen by a learned distance critic and three chosen by different heuristics. Every final proof is concatenated and checked by the Lean compiler. The reported model is a 7B Qwen2.5-Math-7B-base fine-tuned for three epochs on about 3.5 million question-answer pairs; training used eight H20 80G GPUs for about three days (§3, p. 5).

Inference: for VL, this is a search and data-engineering pattern for agents that emit Verus proof steps. The paper is about Lean tactics and mathematics, not Rust or Verus. A Verus adaptation would replace Lean's proof state with a Verus verification state, use the compiler/verifier as the acceptance oracle, and preserve the multi-branch search and heuristic selection ideas. It would need new state serialization, tactic validity checks, and benchmarks for Rust specifications.

## technique 1: expert iteration for stepwise proofs

What it is. Expert iteration repeatedly uses the current prover to discover accepted proofs, then trains the next model on those proofs. The paper lists three steps: “(1) autoformalization of natural language problems into formal proofs; (2) attempting proofs or disproofs using the model trained in the previous iteration; and (3) integrating newly proved theorems and the proofing steps into subsequent training iterations.” (§2.1, p. 3)

When to use it. Use this when a prover needs domain-specific tactic trajectories and a seed corpus is available. It is suitable for a verifier such as Lean or Verus that can reject invalid intermediate steps and therefore produce machine-checked training examples.

How to do it.

1. Collect natural-language problems and formal theorem/proof pairs from the Lean Workbook, Numina, and AoPS-Instruct (§2.1, p. 3).
2. Autoformalize natural-language problems (§2.1, p. 3).
3. Run the previous model to attempt proofs or disproofs (§2.1, p. 3).
4. Add newly proved theorems and individual proof steps to the next training round (§2.1, p. 3).
5. Repeat for 26 rounds; this run produced more than 30,000 proved theorems and about 6 million state/step pairs (§2.1, p. 3).

Inference: a Verus agent could collect Rust snippets, contracts, current verification states, and accepted proof edits after each round. The acceptance condition should be a clean Verus verification run, with generated scripts rechecked from scratch. This is an adaptation; MPS-Prover does not measure Verus proof repair or Rust code correctness.

Evidence and limits. The 26 rounds and 30,000/6-million counts describe this paper's data-generation run, not a general scaling law. The paper does not report how many attempted proofs failed at each round or how much of the final corpus was independently deduplicated beyond its curation rules. Inference: without those denominators, VL should treat training-data growth as an engineering input, not evidence that more rounds necessarily improve soundness.

## technique 2: curation by proof length and tactic effect

What it is. The curation strategy removes examples that add little information. Proofs of three steps or fewer are excluded, with the threshold selected by grid search over {2, 3, 4, 5}. The paper says: “By removing these overly simplistic examples, we reduced our initial training dataset by approximately 40%.” (§2.2, p. 3) It also removes steps that leave the proof state unchanged; the paper reports: “After evaluating our dataset, we identified and removed about 5% of such ineffective tactics.” (§2.2, p. 3)

When to use it. Use this when expert-iteration data is dominated by trivial or repeated steps that make a model overuse `rfl`, `simp_all`, `nlinarith`, or similar tactics. Preserve late-stage steps from longer proofs so the model still sees simple local states.

How to do it.

1. Measure each accepted theorem's number of tactic steps (§2.2, p. 3).
2. Choose the short-proof cutoff by grid search over 2, 3, 4, and 5 steps (§2.2, p. 3).
3. Remove theorems at or below the selected cutoff; MPS selected three (§2.2, p. 3).
4. Execute each candidate tactic and compare the resulting proof state with the input state (§2.2, p. 3).
5. Remove tactics that make no meaningful state change; the reported removal rate is about 5% (§2.2, p. 3).
6. Train on the remaining state/step pairs together with whole-proof and critic data (§3, p. 5).

Inference: for Verus, “proof length” must be defined in terms of accepted proof edits or verified proof-function steps, because a single macro or lemma can hide substantial work. “No progress” should compare normalized verification goals and context, not just source-text equality. These are design choices for VL, not results of this paper.

Evidence. The ablation on miniF2F uses a fixed MPS pass@64 budget and 244 problems. Full MPS proves 177/244; removing curation proves 176/244 (§3.3, p. 7, Table 3). Thus curation saves 40% of training data in the authors' setup while changing the ablation result by one problem (176/244 versus 177/244). Inference: the result supports a data-cost reduction in this benchmark and model, but it does not prove that filtering is harmless for other theorem distributions.

## technique 3: multi-perspective tree search

What it is. Standard best-first search (BFS) expands the node with the best learned critic score. MPS retains four perspectives: the critic plus three heuristic selectors. The critic predicts distance to proof completion; lower distance is preferred. The paper says: “MPS expands four nodes (one from the critic model and three from heuristic rules) for each selected state in a pass, whereas BFS typically expands only the single best node according to its criterion.” (§3.2, p. 7)

When to use it. Use this when one learned score repeatedly selects similar tactics, reaches an unprovable state, or gets stuck in a local minimum. Multiple selectors provide search diversity while still retaining learned guidance.

How to do it.

1. Select up to four nodes from the previous iteration (§2.3, p. 4).
2. Sample `Nsamples` candidate tactics from the LLM for each selected node (§2.3, p. 4).
3. Execute candidates in Lean and form the resulting proof states (§2.3, p. 4).
4. Select one candidate with the smallest critic-predicted distance to completion (§2.3, p. 4).
5. Select one candidate each using tactic-effectiveness, minimum-case-split, and shortest-state heuristics (§2.3, p. 4).
6. Deduplicate selections; fewer than four unique nodes may continue (§2.3, p. 4).
7. Repeat until a proof is found or the search budget expires (§3, p. 5).

The three heuristic rules are concrete. Tactic-effectiveness scores manually rate tactics such as `rcases`, `intro`, `contrapose`, `induction`, and appropriately used contradiction above localized simplifiers such as `norm_num` and `simp_all` (§2.3, p. 4). Minimum-case-splits favors states with fewer occurrences of “case” (§2.3, p. 4). Shortest-state preference favors shorter Lean state strings (§2.3, p. 4).

Inference: a Verus version could use one model score plus selectors for fewer unresolved obligations, fewer quantified triggers, and shorter normalized state. Those metrics are not in the paper and would need validation on Verus projects. Verus's compiler must remain the final acceptance oracle; heuristic ranking cannot establish proof soundness.

Evidence. On miniF2F-test, MPS proves 185/244 (75.82%) at its accumulative setting, while the listed BFS-Prover accumulative result is 72.54% (Table 1, p. 6). At the lowest matched budget, MPS pass@1 proves 165/244 (67.62%) and BFS pass@4 proves 162/244 (66.39%) (§3.2, p. 7). At the maximum MPS pass@64 setting, the ablation table reports 177/244; removing the critic gives 164/244, removing tactic-effectiveness gives 174/244, removing minimum-cases gives 173/244, and removing shortest-state gives 172/244 (Table 3, p. 7). The denominators are all 244 miniF2F problems under the stated fixed budget.

## technique 4: verifier-in-the-loop evaluation and budget accounting

What it is. The search interacts with Lean 4.16.0 through a REPL, but every generated proof is concatenated and checked again by the Lean compiler. The paper explains: “To ensure the rigorous correctness of generated proofs, especially since repl might occasionally misinterpret certain erroneous steps as valid during step-wise execution, we perform a final verification.” (§3, p. 5)

How to do it.

1. Execute each tactic with a 60-second per-step timeout (§3, p. 5).
2. Keep a 3,600-second timeout for a complete search (§3, p. 5).
3. Count search budget as `Npass × Nperspectives × Nmax iter × Nsamples`, with four perspectives, at most 800 iterations, and eight samples per selected node (§3, p. 5).
4. Concatenate accepted steps into one proof script (§3, p. 5).
5. Recheck the complete script with the Lean compiler (§3, p. 5).

Inference: VL should apply the same two-stage rule to Verus: incremental verification for search feedback, then a clean end-to-end Verus invocation on the generated Rust and proof code. Record pass@k denominators and timeouts so an agent cannot inflate success by counting an intermediate state as a finished proof.

## evidence and boundaries

The main benchmarks are miniF2F-test and ProofNet-test. ProofNet-test contains 371 undergraduate-level problems (§3, p. 5). MPS's ProofNet result is 32.97%, compared with 29.6% for DeepSeek-Prover-V2 CoT and lower listed 7B baselines (Table 2, p. 6). On 170 miniF2F problems solved by both MPS and BFS, mean Lean proof length is 3.44 steps for MPS, 7.2 for BFS, 15.91 for Kimina, and 52.16 for DeepSeek-Prover-V2 (Table 4 and Figure 4, pp. 8–9). The 170-common-problem denominator matters: this is a conditional length comparison, not all 244 miniF2F problems.

The model is a 7B Qwen2.5-Math-7B-base model trained with three data sources: curated stepwise proofs, concatenated whole proofs, and critic-training data (§3, p. 5). The paper compares against models of different sizes and sampling budgets in Table 1, including 72B and 671B whole-proof models. Inference: those cross-size rows are useful context but do not isolate the search algorithm's effect; the fixed-budget MPS/BFS comparison is the stronger evidence for search diversity.

What stays trusted includes the Lean proof checker/compiler, the formalization of the theorem statements, the model and search implementation, and the benchmark's problem set. The paper's final compiler check addresses REPL misinterpretation, but it does not prove that the theorem statements express the intended informal mathematics. Inference: for agent-written verified Rust, the direct product threat is proof-search reliability rather than verifier unsoundness: repetitive or overconfident agents can waste budget or generate vacuous specifications. VL should preserve compiler rechecking, explicit theorem-contract review, and denominators for every reported success rate.

## what VL should not redo

MPS-Prover already demonstrates expert iteration, short-proof and no-progress curation, multi-criterion tree search, verifier-in-the-loop rechecking, fixed-budget comparisons, and proof-length/diversity analysis. A VL study should reuse these as baselines and test the missing Rust/Verus questions: how to serialize verification states, which heuristics predict useful proof obligations, and how proof search behaves under changing APIs and specifications.

## techniques for the catalog

- expert iteration — repeatedly train on verifier-accepted theorem attempts and their step trajectories
- proof-data curation — remove short proofs and no-progress tactics using measured thresholds
- multi-perspective search — combine a learned distance critic with tactic, case-split, and state-length selectors
- verifier rechecking — concatenate generated steps and run the complete script through the compiler
- fixed-budget evaluation — report pass@k with explicit passes, perspectives, iterations, samples, and benchmark denominators
- proof diversity analysis — compare tactic diversity and step counts on the same commonly solved problems

Checked 2026-10-15 against the paper by a Codex agent for mps_prover_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
