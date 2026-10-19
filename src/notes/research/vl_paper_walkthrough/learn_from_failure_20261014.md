# Learn from Failure: Fine-Tuning LLMs with Trial-and-Error Data for Intuitionistic Propositional Logic Proving
(authored by agents unless marked 🧑)
Tag: `an2024learn`, [paper](http://arxiv.org/abs/2404.07382v3)

## scope and contribution

The paper studies neural tactic generation for intuitionistic propositional logic in Lean. Its central claim is that training on complete search histories, including failed branches and explicit backtracking, improves out-of-distribution proof search. The authors release PropL, a Lean-formalized dataset, and compare a model named TRIALMASTER with a conventional depth-first-search (DFS) prover trained only on successful paths.

The abstract states: “The current model, while trained solely on successful proof paths, faces a discrepancy at the inference stage, as it must sample and try various tactics at each proof state until finding success, unlike its training which does not incorporate learning from failed attempts.” (Abstract, PDF p. 1.) The authors hypothesize that failed paths should discourage similar tactics. Their inference system uses Lean to calculate the next state after each executable tactic (Section 4.2, PDF p. 6).

Inference: For VL, the transferable idea is to record failed Verus proof attempts as training context and to make the verifier check every emitted step; the paper does not evaluate Rust or Verus, so this transfer is a proposed adaptation.

## technique 1: trial-and-error traces as training data

What it is. The training example contains a proof search history rather than only a successful path. A trace records states, tactics, failed branches, and explicit backtracking instructions. It does not include Lean error messages: the authors describe their method as using “the complete past proof history without using the error message from the proof assistant” (Section 2, PDF p. 3). Figure 2 contrasts training on correct paths with training on proofs containing trial-and-error (PDF p. 3). The introduction gives this proof text:

```lean
theorem_1 thm : p1 → p1 ∨ p2 := by
  intro h1
  apply or.inl
  exact h1
```

It then shows a branch that tries `apply or.inr`, reaches “no solution,” and backtracks before trying `apply or.inl` (Introduction, PDF p. 2). The authors explain: “Such provers are usually trained on a dataset containing only the correct proof paths.” (Introduction, PDF p. 1.) They also state: “At the very least, the failure information should help the model easily avoid generating already failed tactics.” (Introduction, PDF p. 2.)

Inference: Use this method when proof search must explore alternatives and the proof assistant can check generated tactics. Failed-path context may help a model avoid repeating an unsuccessful branch; the paper does not establish which other domains benefit.

How to do it, following the paper. (1) Generate ten proofs per theorem using focused proof search, randomly choosing propositions to focus on during chaining. (2) Keep successful and failed branches, and annotate backtracks with their destination states. (3) Section 4.1 selects two proofs at random from the shortest five for fine-tuning. Section 5.5 instead describes selecting two from the shortest four for the same short-proof model; the paper does not resolve this discrepancy. (4) At inference, prompt with the complete history, including failed paths and earlier backtracks. (5) Generate a continuation with greedy decoding, use only its first action, send executable tactics to Lean, and use Lean’s resulting state as the next state. (6) For a backtrack instruction, restore the referenced state and append that instruction and state to the history without calling Lean. These procedures appear in Sections 3.2, 4.1–4.2, and 5.5 (PDF pp. 5–6, 9).

Verus form. Inference: represent each candidate as a revision to a Verus proof block, check the revised program with Verus, and retain attempted revisions and their results outside executable Rust. A controller could restore earlier revisions after a model-generated backtrack. Including verifier diagnostics would extend the paper’s method, which omits proof-assistant error messages. This paper supplies no Verus implementation or evaluation.

Evidence. On the 1,000-theorem out-of-distribution (OOD) test set, TRIALMASTER reaches 88.7% success, while the ablated model trained without trial-and-error reaches 59.3% (Table 3, PDF p. 8). Both use one-action inference and Lean checking, without an external DFS controller. The authors write: “The difference between the success rates of the two models is 29.4%, which is significant.” (Section 5.4, PDF p. 8.) The numerical difference is 29.4 percentage points; the paper reports no statistical significance test here.

Limits. The experiments use Llama-2-7b-hf (Section 5.1, PDF p. 6). The paper states that its method was “not evaluated on general mathematical theorems” (Limitations, PDF p. 9). Section 5.2 specifies a 1,500-word proof-history limit, while Limitations calls it 1,500 tokens; the units are inconsistent. The proof-generation algorithm also assumes that once an implication is picked it cannot be used to show its premise; the authors say this introduces incompleteness and affects “1 theorem out of around 1000 provable theorems randomly sampled” (Section 3.1, PDF p. 5). Inference: these results do not establish gains for general mathematics or Verus.

## technique 2: bounded uniform formula generation

What it is. PropL samples formulas by mapping labeled proposition trees to integers. Internal nodes are conjunction, disjunction, or implication; leaves are true, false, or one of p atoms. Catalan-number ranking counts binary tree shapes. Algorithm 1 encodes a tree and Algorithm 2 decodes an integer by first recovering its shape and then its leaf/connective assignments (Appendix B, PDF pp. 13–14). The paper states: “Consequently, it only requires the identification of a bijection between full binary trees and natural numbers.” (Appendix B.2, PDF p. 14.) Uniform sampling concerns the bounded formula space; Appendix B.2 explains that selection is subsequently refined by proof lengths.

How to apply it. (1) Fix the number of internal nodes n and the atom bound p. (2) Rank each full binary shape using Catalan recursion. (3) Encode internal-node labels in base 3 and leaves in base p+2, following inorder traversal. (4) Combine the shape rank and label assignment using 3^n(p+2)^(n+1) assignments per shape. (5) Sample integers from the finite range for these parameters; use quotient/remainder arithmetic to recover the shape rank and assignment, recursively reconstruct the shape, then assign labels. These steps are Algorithms 1–2, Appendix B (PDF pp. 13–14).

Inference: A Verus benchmark could use the same bijective enumeration for specifications or data-structure shapes, but Verus would verify generated Rust predicates rather than Lean propositions. The uniformity claim only applies to the finite parameterization used by the algorithms; it does not imply uniformity over all Rust programs.

Evidence and assumptions. The authors fix 16 internal nodes and sample 200,000 theorems. They select 109,887 for training, 1,000 for in-distribution testing, and 1,000 for OOD testing (Section 3.2 and Table 1, PDF pp. 5–6). These subsets do not exhaust the sampled pool. They use two proof-length distributions: deterministic proofs with failed branches removed, and the average lengths of ten randomized proofs with backtracking. Training and in-distribution examples fall within the lower 0.66 quantile of both distributions; OOD examples exceed the 0.8 quantile of both. Inference: this tests generalization to longer proofs within the chosen formula size, rather than arbitrary theorem-proving performance.

## technique 3: focused proof generation with backtracking

What it is. Proofs are generated by focusing with polarization. Inversion decomposes negative connectives in goals and positive connectives in premises; chaining selects an implication from a premise or a disjunct in a conclusion and may backtrack (Section 3.1, PDF p. 5). The paper states: “Proof search is divided into two stages: inversion and chaining.” (Section 3.1, PDF p. 5.)

How to apply it. (1) Assign polarities to connectives; Section 3.1 describes conjunctions on an arrow’s right side as negative and those on its left as positive. Assign atoms according to the connective under which they first appear. (2) Perform inversion to decompose negative goal connectives and positive premise connectives. (3) During chaining, choose an implication from the premises or a disjunct in the conclusion. (4) Backtrack to try an alternative when a branch fails. (5) Close a branch when the same atomic proposition occurs in premise and conclusion. The implementation additionally prevents a selected implication from being used to prove its own premise, causing the incompleteness noted above. These are the dataset’s proof-generation steps, not the learned model’s stopping rules (Section 3.1 and Figure 4, PDF p. 5).

Inference: In Verus, this suggests separating deterministic simplification of a proof goal from a branching lemma-search phase. A controller could try `assert` or `assert forall` lemmas, retain successful proof contexts, and revisit them after a failed solver call. The exact polarization rules and atom-termination criterion do not carry over because Verus specifications are Rust expressions and solver obligations, not intuitionistic sequent trees.

Evidence. Figure 4 gives the same theorem with and without a backtracked `Or.inl` branch (PDF p. 5). During model inference, Lean calculates the next state after an executable tactic (Section 4.2, PDF p. 6). Inference: a VL adaptation should likewise require verifier acceptance of the resulting proof artifact; the paper does not establish Verus’s trust assumptions.

## technique 4: greedy checked inference and DFS baseline

TRIALMASTER emits either a Lean tactic or a backtrack instruction. The system uses only the first action from its predicted continuation; executable tactics go to Lean, while backtracks restore a previous state without a Lean call (Section 4.2, PDF p. 6). The conventional baseline samples `Nsampled` tactics once per new state, removes duplicates and grammatically invalid tactics, explores them in depth-first order, and returns to the parent when candidates are exhausted. The authors justify DFS by citing “the finite number (around 20) of tactics available at any step for the search process of intuitionistic propositional logic theorems” (Section 4.2, PDF p. 6).

Inference: A Verus implementation can use the same propose–check–update loop, with a configurable candidate count and depth/step limit. It must keep proof search outside the executable verified function and only commit a proof after Verus accepts it.

Evidence. On the 1,000 OOD theorems, TRIALMASTER achieves 88.7% success with 17,993 Lean calls. DFS at temperature 1.8 and ten sampled tactics achieves 88.4% with 31,101 calls (Section 5.3 and Figure 5, PDF pp. 7–8). The text calls the DFS cost “72% higher”; those displayed counts imply approximately 72.9% higher. Search cost counts Lean tactic checks across the entire test set and excludes backtrack instructions (Section 5.2, PDF p. 7). Inference: this metric does not measure model inference time, token usage, or total runtime.

Stopping rules. TRIALMASTER fails on any Lean error or a history exceeding 1,500 words. DFS fails if the current path exceeds 1,500 words, the initial state’s candidates are exhausted, or search exceeds 65 steps (Section 5.2, PDF p. 7). The 65-step limit is specified for DFS, not TRIALMASTER. In-distribution success is 100% for TRIALMASTER; the DFS configurations shown range from 75.9% to 99.9% (Table 2, PDF p. 7). Most, but not all, shown configurations approach 100%.

## what is proved, trusted, and left open

Lean checks tactic results and final completion; the reported proof success criterion is Lean’s “no goal, the proof is complete” (Section 5.2, PDF p. 7). The authors report that every model-generated backtrack has the correct format and points to an existing state (Section 5.3, PDF p. 8). Inference: syntactically valid backtracks do not alone establish useful search decisions, and a model’s reported success rate cannot replace verifier acceptance of each final artifact.

The paper’s limitations include context truncation, no general-mathematics evaluation, and few comparable LLM baselines (Limitations, PDF p. 9). It also reports 75.6% OOD success with 13,600 Lean calls when failed branches remain in the context but their training loss is omitted (Section 5.3, PDF p. 8), and 72.4% success for training on randomly selected proofs rather than short proofs (Table 4, PDF p. 9). Inference: both the prediction targets and the amount of failed-path context deserve separate testing in a Verus adaptation. This paper supplies no measurements about unsafe Rust, concurrency, specification quality, or Verus soundness.

## techniques for the catalog

- trial-and-error trace fine-tuning: train a tactic model on successful and failed proof branches with explicit backtrack history, then let Lean check executable tactics
- uniform formula enumeration: encode and decode bounded proposition trees through Catalan-ranked shapes and mixed-radix labels to obtain representative benchmark formulas
- focused proof search: separate inversion from branching/chaining, preserve failed branches, and backtrack to try alternatives
- checker-mediated greedy inference: use one candidate action at a time, obtain tactic results from Lean or restore a previous state for backtracks, and count Lean calls as search cost

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We note that the 1500-word limit is stricter for our method since it produces entire proof paths including trial-and-error and thus would be easier to hit the limit."): read the entire paper and study; checked quotations, numbers, PDF page and section references, technique steps, tag, and arXiv identifier; corrected error-message inclusion, page references, Lean-call counts, stopping rules, and unsupported Verus claims; recorded inconsistent length units and short-proof selection descriptions; did not reproduce experiments or inspect external code, datasets, or Verus documentation
