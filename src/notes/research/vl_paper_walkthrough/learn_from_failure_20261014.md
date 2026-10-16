# Learn from Failure: Fine-Tuning LLMs with Trial-and-Error Data for Intuitionistic Propositional Logic Proving
(authored by agents unless marked 🧑)
Tag: `an2024learn`, [paper](http://arxiv.org/abs/2404.07382v3)

## scope and contribution

The paper studies neural tactic generation for intuitionistic propositional logic in Lean. Its central claim is that training on complete search histories, including failed branches and explicit backtracking, improves out-of-distribution proof search. The authors release PropL, a Lean-formalized dataset, and compare a model named TRIALMASTER with a conventional depth-first-search (DFS) prover trained only on successful paths.

The abstract states: “The current model, while trained solely on successful proof paths, faces a discrepancy at the inference stage, as it must sample and try various tactics at each proof state until finding success, unlike its training which does not incorporate learning from failed attempts.” (Abstract, p. 1.) The paper’s operational premise is that a failed tactic should reduce the probability of retrying similar tactics, while a successful proof assistant check remains the authority on each next state.

Inference: For VL, the transferable idea is to record failed Verus proof attempts as training context and to make the verifier check every emitted step; the paper does not evaluate Rust or Verus, so this transfer is a proposed adaptation.

## technique 1: trial-and-error traces as training data

What it is. The training example is a full proof tree rather than only a successful path. A trace records states, generated tactics, Lean errors, and a backtrack to the last valid parent. Figure 2 contrasts the conventional system, which fine-tunes on correct paths, with the proposed system, which fine-tunes on proofs containing trial-and-error (p. 2). The paper gives a concrete Lean shape:

```lean
theorem_1 thm : p1 → p1 ∨ p2 := by
  intro h1
  apply or.inl
  exact h1
```

It then shows a branch that tries `apply or.inr`, reaches “no solution,” and backtracks before trying `apply or.inl` (Introduction, pp. 1–2). The authors explain: “Such provers are usually trained on a dataset containing only the correct proof paths.” (Introduction, p. 1.) They also state: “At the very least, the failure information should help the model easily avoid generating already failed tactics.” (Introduction, p. 2.)

When to use it. Use this method when inference must explore alternatives and the proof assistant can identify invalid steps or dead ends. It is most useful when successful-only training leaves the model repeatedly exploring the same failed branch.

How to do it, following the paper. (1) Generate a proof tree with a deterministic or guided search procedure. (2) Keep both successful and failed trials, and annotate each backtrack with its destination state. (3) Fine-tune the tactic model on those histories. (4) At inference, prompt with the complete history, including failed paths and earlier backtracks. (5) Emit one next action, send executable tactics to Lean, and use Lean’s resulting state as the next state. (6) If the action is a backtrack instruction, move to the referenced prior state without calling Lean for a new proof step. Steps (1)–(5) are specified in Sections 3.1 and 4.1–4.2; the last behavior is the paper’s inference procedure on p. 5.

Verus form. Inference: represent each candidate as a Verus proof statement or proof block, submit it to Verus, and append either the resulting verification state or the diagnostic to a history object outside executable Rust. A generated “backtrack to state k” command would select an earlier proof context; Verus itself has no such runtime tactic instruction, so a controller must implement the search loop. The verified artifact remains ordinary Verus code using `requires`, `ensures`, `assert`, `assume`, `assert forall`, and `proof fn` constructs documented in the Verus notes; model-generated history is not trusted until Verus checks the final code.

Evidence. On the 1,000-theorem out-of-distribution (OOD) test set, TRIALMASTER reaches 88.7% success, while the ablated model trained without trial-and-error reaches 59.3% (Table 3, p. 7). The denominator is the 1,000 OOD theorems described in Section 3.2; the table reports percentages, not counts. The authors write: “The difference between the success rates of the two models is 29.4%, which is significant.” (Section 5.4, p. 7.)

Limits. Inference: the gain is measured only for intuitionistic propositional logic and a 7-billion-parameter Llama-2 model, so it does not establish gains for larger mathematics or Verus. The paper reports that its proof attempts can stop at a 1,500-token context limit and that it was “not evaluated on general mathematical theorems” (Limitations, p. 8). The search procedure also assumes that once an implication is picked it cannot be used to show its premise; the authors say this makes the procedure theoretically incomplete and affects “1 theorem out of around 1000 provable theorems randomly sampled” (Section 3.1, p. 4).

## technique 2: complete and uniform PropL generation

What it is. PropL samples formulas uniformly by mapping proposition trees to natural numbers. Internal nodes are conjunction, disjunction, or implication; leaves are true, false, or one of p atoms. Catalan-number ranking counts binary tree shapes. Algorithm 1 encodes a tree and Algorithm 2 decodes an integer by first recovering its shape and then its leaf/connective assignments (Appendix B, pp. 9–10). The paper states: “Consequently, it only requires the identification of a bijection between full binary trees and natural numbers.” (Appendix B.2, p. 10.)

How to apply it. (1) Choose the number of internal nodes and the atom bound p. (2) Rank each binary shape using Catalan recursion. (3) Encode internal-node labels in base 3 and leaves in base p+2. (4) Decode an integer with quotient/remainder arithmetic, recursively recover left and right subtree sizes, then assign labels by inorder traversal. (5) Sample integers to obtain formulas with uniform shape/assignment under the chosen bounds. These steps are Algorithms 1–2, Appendix B.

Inference: A Verus benchmark could use the same bijective enumeration for specifications or data-structure shapes, but Verus would verify generated Rust predicates rather than Lean propositions. The uniformity claim only applies to the finite parameterization used by the algorithms; it does not imply uniformity over all Rust programs.

Evidence and assumptions. The authors fix 16 internal nodes, sample 200,000 theorems, and split 109,887 for training, 1,000 in-distribution test, and 1,000 OOD test (Section 3.2 and Table 1, p. 5). The OOD set is selected above the 0.8 proof-length quantile, while training and in-distribution examples fall within the lower 0.66 quantile. These denominators and quantiles define the reported setting; they are not a general estimate of theorem-proving performance.

## technique 3: focused proof generation with backtracking

What it is. Proofs are generated by focusing with polarization. Inversion decomposes negative connectives in goals and positive connectives in premises; chaining selects an implication from a premise or a disjunct in a conclusion and may backtrack (Section 3.1, p. 4). The paper states: “Proof search is divided into two stages: inversion and chaining.” (Section 3.1, p. 4.)

How to apply it. (1) Polarize connectives according to their position; the paper polarizes conjunctions negatively on an arrow’s right side and positively on its left. (2) Run inversion until no decomposable connective remains. (3) During chaining, choose an implication or disjunct. (4) If the branch cannot close, return to the latest valid state and choose another candidate. (5) Stop when an identical atom occurs in premise and conclusion, or when Lean reports completion or error. Steps (1)–(5) are Section 3.1 and Figure 4.

Inference: In Verus, this suggests separating deterministic simplification of a proof goal from a branching lemma-search phase. A controller could try `assert` or `assert forall` lemmas, retain successful proof contexts, and revisit them after a failed solver call. The exact polarization rules and atom-termination criterion do not carry over because Verus specifications are Rust expressions and solver obligations, not intuitionistic sequent trees.

Evidence. Figure 4 gives the same theorem with and without a backtracked `Or.inl` branch. The paper’s Lean checker validates each generated state. Inference: this checker-mediated loop is the security boundary relevant to VL; the language model can suggest actions, but Lean’s (or Verus’s) kernel must determine validity.

## technique 4: greedy checked inference and DFS baseline

TRIALMASTER emits either a Lean tactic or a backtrack instruction, but the system uses only the first action from its predicted full path and asks Lean to calculate the next state (Section 4.2, p. 5). The conventional baseline samples `Nsampled` tactics at each state, filters duplicate or grammatically invalid tactics, and explores them in depth-first order. The paper justifies DFS because intuitionistic propositional logic has “a finite number (around 20) of tactics available at any step” (Section 4.2, p. 5).

Inference: A Verus implementation can use the same propose–check–update loop, with a configurable candidate count and depth/step limit. It must keep proof search outside the executable verified function and only commit a proof after Verus accepts it.

Evidence. On OOD tasks, TRIALMASTER’s 88.7% success is compared with DFS configurations; the paper reports a DFS setting at 88.4% with 31,101 Lean calls versus 16,844 calls for TRIALMASTER, a 72% higher call count for DFS (Section 5.3 and Figure 5, p. 6). These are calls over the 1,000-theorem OOD evaluation under the stated Llama-2-7b, 65-step-limit setting. In-distribution results are near 100% for both methods (Table 2, p. 6), so the claimed advantage is specifically OOD generalization and search cost.

## what is proved, trusted, and left open

Lean checks theorem states and final completion; the reported proof success criterion is Lean’s “no goal, the proof is complete” (Section 5.2, p. 6). The model, fine-tuning code, dataset construction, search limits, and selected theorem distribution remain experimental scaffolding. Inference: for VL, the corresponding trusted boundary is Verus’s verifier and the soundness assumptions of its solver and Rust compilation pipeline; a model’s high success rate cannot replace those checks.

The paper’s own limitations include context truncation, no general-mathematics evaluation, and few comparable LLM baselines (Limitations, p. 8). Inference: agent-written verified Rust faces a moderate threat from repeated failed proof attempts and solver-cost blowups, but this paper provides no evidence about unsafe Rust, concurrency, specifications, or Verus soundness. Existing VL work should not redo a Lean-only trial-and-error benchmark unchanged; it should test whether failure traces improve Verus proof completion on held-out APIs while measuring verification time and rejected proofs.

## techniques for the catalog

- trial-and-error trace fine-tuning: train a tactic model on successful and failed proof branches with explicit backtrack history, then let the checker validate each next action
- uniform formula enumeration: encode and decode bounded proposition trees through Catalan-ranked shapes and mixed-radix labels to obtain representative benchmark formulas
- focused proof search: separate inversion from branching/chaining, preserve failed branches, and backtrack to the latest valid state
- checker-mediated greedy inference: emit one candidate action, obtain the next state from the proof assistant, and count checker calls as search cost

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
