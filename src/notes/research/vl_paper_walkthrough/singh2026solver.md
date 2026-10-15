# Beyond Solver Verdicts: Generative Reward Models for Autoformalization
(authored by agents unless marked 🧑)
Tag: `singh2026solver`, [paper](http://arxiv.org/abs/2609.11085v2)

## problem and threat model
The paper isolates Verdict-Preserving-Unfaithfulness (VPU): a candidate encoding parses, returns the same solver verdict as a designated reference, but changes the problem's meaning. The authors state: “A sound solver certifies what follows from the supplied encoding, it does not certify that the encoding accurately represents the source problem” (section 1, page 1). Their running mutation changes `>` to `<`; both encodings are satisfiable, so verdict-only checking is chance-level. VPU is reference-relative: equivalence means mutual implication of the conjunctions of SMT assertions, under a chosen signature.

## technique: bidirectional equivalence oracle and VPU mining
What it is. Given source x, candidate SMT-LIBv2 s, and reference s⋆, check both A(s) ∧ ¬A(s⋆) and A(s⋆) ∧ ¬A(s) for unsatisfiability. The paper defines Eq(s,s⋆) as the indicator that both checks are unsat (section 3, page 3). A candidate is VPU when it is syntactically valid, has v(s)=v(s⋆), and Eq is false (definition 1, page 3).

When to use it. Use this offline when a trusted reference formalization exists and a solver verdict alone can miss changed operators, omitted requirements, reversed implications, or wrong variable bindings. Exclude unparsable candidates, solver timeouts, and unknown results (section 3, page 3). The authors warn that equivalence is relative to the chosen reference and signature, and that two unsatisfiable formulas are vacuously equivalent (section 9, page 9).

How to apply it. (1) Keep a gold s⋆ for each problem. (2) Generate authentic translator outputs and programmatic mutations μ(s⋆), such as flipping relational operators, changing constants, or reversing implications. (3) Run the two Z3 implication checks. (4) Retain a mutation only if it parses, is solver-decidable, has the same verdict, and fails Eq; the solver removes mutations that accidentally preserve semantics (section 4, page 4). (5) Label Eq=1 as equivalent and Eq=0 as VPU for training and evaluation. The authors' formal limit is: “on matched pairs with identical solver verdicts, every score that is a function only of that verdict assigns tied scores and has AUROC 0.5” (proposition 1, page 3).

Verus form. Inference: Verus can play the checker role for a Rust implementation only after a reference contract or executable model is written. Use Verus `requires`/`ensures` and proof functions to state and prove relational properties; a second candidate can be checked against the same postcondition or against a ghost reference model. Inference: Verus does not provide a general SMT-LIB mutual-implication API, so this exact oracle would require translating both contracts into a shared logical model or proving refinement lemmas. The VPU warning transfers directly: a proof can establish the supplied contract while the contract omits a requirement.

## technique: generative verification (GenV)
What it is. GenV distills offline Eq labels into a reference-free generative score using the model's existing vocabulary head. Prompt the model with source x and candidate s and require one token, “Yes” for faithful or “No” for unfaithful. If π is the next-token distribution, score fθ(x,s)=ΣY πu /(ΣY πu+ΣN πu+ε), with ε=10−9 (section 4, page 4). This retains a continuous confidence score in one forward pass and avoids a new classifier head.

How to apply it. Build D={(xi,si,yi)} with yi=Eq(si,s⋆i) computed offline by Z3. Fine-tune a frozen 27B backbone with LoRA on the answer token only; context-token loss is masked. At deployment remove s⋆ and compute f(x,s) from only x and s (figure 2 and section 4, pages 3–4). The paper says: “The model is penalized exclusively for its final verification judgment allowing it to efficiently learn the equivalence mapping without catastrophically forgetting its pretrained reasoning capabilities” (section 4, page 4).

Hard-negative variant. GenV+HN adds 732 oracle-certified mined negatives to 2,591 translator candidates (1,894 equivalent and 697 VPU), giving a 57:43 equivalent:VPU class distribution (section 5, page 5). This specifically targets deceptive, structured false positives in bit-vector and uninterpreted-function theories. Inference: for Verus, an analogous dataset could mutate verified Rust specifications or proof obligations, but mutations must be checked against a reference model rather than assumed to be bugs.

Evidence. On the 950-row authentic benchmark (197 source problems, 260 VPU), GenV+HN reached AUROC 0.961; GenV without mined negatives 0.956; five-sample self-consistency 0.863; Process RM 0.756; Outcome RM 0.762; solver-only 0.500 (table 1, page 5). On the normalized-text-disjoint 652-row subset, GenV+HN reached 0.955 (section 5, page 5). On 488 expanded rows with 184 VPU, the generative readout reached 0.950, versus GTED 0.835, FormalAlign 0.752, and round-trip back-translation 0.578 (table 1, page 5). Zero-shot AUROC across six shifted styles was 0.830 FOLIO, 0.842 ProofWriter, 0.925 MALLS, 0.964 ProverQA, 0.915 ProntoQA, and 0.642 LogicNLI (table 3, page 6).

The method improved downstream agentic answer accuracy by 11.3 points overall in the paper's headline result. The detailed table reports pooled gains over 8,420 trajectories: +2.6 points for Claude Opus 4.7, +5.8 for gpt-oss-120b, +15.6 for GLM-4.7-flash, +42.6 for gpt-oss-20b, and +21.4 for Qwen3-Next-80B (table 6, page 7). These are percentages over the table's pooled trajectories, not verifier AUROC.

## technique: diagnostic localization
The paper uses a decision-projected gradient lens. Let g be the logit margin between Yes and No. For each layer/time activation hℓ,t, compute qℓ,t = ⟨∂g/∂hℓ,t, hℓ,t⟩ (equations 8–9, page 8) to identify where the score changes. A separate TopK sparse autoencoder represents h with z=TopK(WE(h−b),K) and reconstructs b+WDz; a linear probe on sparse features reached 0.960 AUROC for GenV+HN (equations 10–11 and page 8). These analyses are diagnostic, not causal: the paper says they “do not establish a causal verification mechanism” (section 7, page 8).

Inference: a Verus repair agent could use a verifier score drop over successive assertions or proof obligations to prioritize a suspected mismatch, but this would be advisory. It cannot replace a failing Verus proof or a checked counterexample.

## what is proved, trusted, and limited
Proposition 1 proves only the information limit of verdict-only scoring. Z3 supplies deterministic labels under the chosen signature and limits; the 27B model, LoRA training, mutation operators, reference specifications, and threshold calibration remain trusted assumptions. The benchmark excludes natural multi-error distributions because negatives are synthetic single-edit mutations (section 9, page 9). The reference target can disagree with human intent: on the contested slice GenV+HN AUROC was 0.907 for Z3 equivalence but 0.679 for panel-majority intent, while the human judge reached 0.778 for panel intent (section 6, page 6). The method also assumes satisfiable gold references; with inconsistent references, equivalence can be vacuous (section 9, page 9).

Inference: this is a high threat to agent-written verified Rust when a pipeline equates a successful solver/Verus verdict with faithful requirements. It is a lower threat to a workflow that retains reviewed contracts and executable reference models. VL should reuse the distinction between verdict validity and reference faithfulness, but should not redo the claim that a binary verdict is insufficient.

## techniques for the catalog
- VPU definition: classify same-verdict, non-equivalent encodings relative to a designated reference
- bidirectional Z3 oracle: label equivalence by two implication-unsatisfiability checks
- oracle-guided hard negatives: mutate references and retain only solver-certified VPU cases
- generative verification: distill oracle labels into a reference-free Yes/No vocabulary score
- LoRA answer-only training: mask context loss and optimize only the final verification token
- gradient/SAE diagnostics: localize verifier evidence with decision-projected gradients and sparse features
Checked 2026-10-14 against the paper by a Codex agent: audit record singh2026solver; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
