# FormalML: A Benchmark for Evaluating Formal Subgoal Completion in Machine Learning Theory
(authored by agents unless marked 🧑)
Tag: `yang2025formalml`, [paper](http://arxiv.org/abs/2510.02335v1)

## task and benchmark

FormalML studies subgoal completion: an expert writes a theorem and high-level proof sketch, and an LLM fills the remaining formal proof holes. The paper defines the task as “discharge short but nontrivial proof obligations left unresolved in a human-provided sketch” (abstract, PDF page 1). This differs from whole-theorem generation because a human has already chosen the statement and broad reasoning structure. The benchmark is Lean 4 and contains 4,937 extracted problems from Optlib and FoML, covering optimization and probability theory (abstract and sections 3.2–3.4, PDF pages 1 and 5–6).

Each stored problem includes source file and line coordinates, the Lean theorem statement, imports and namespaces, the complete original tactic sequence, and retrieved proof-relevant premises (section 3.2, PDF page 5). The benchmark has 2,907 optimization problems and 2,030 probability problems (Table 2, PDF page 6). Difficulty is defined from proof length: levels 1, 3, and 5; 3,924 problems are level 1 and 1,013 are higher levels (section 3.4, PDF page 6). Retrieval is needed explicitly for 2,049 problems, from Mathlib or the local library (section 3.4, PDF page 6).

The motivation is practical assistance. The paper quotes an earlier Equational Theories Project finding: “LLMs did not provide useful suggestions beyond what the human participants could already propose” in most difficult cases (section 1, PDF page 1). FormalML therefore measures whether models can complete local proof steps under realistic context, retrieval, and cost constraints.

Inference: in VeruLaw, this is a direct analogue of asking an agent to fill a missing `proof fn` body while a human or another agent has fixed the Rust API and contract. The benchmark's separation between statement design and subgoal completion suggests evaluating VL on local proof obligations rather than only on complete generated modules.

## technique 1: extract subgoals from procedural proofs with `to_theorem`

What it is. FormalML's central contribution is a Lean tactic called `to_theorem` that turns a procedural proof segment into a separate declarative theorem. Procedural tactics transform the proof state; unlike declarative `have` steps, they do not leave an explicit theorem for a benchmark. The tactic captures the state before and after a line or segment, inserts the earlier state as hypotheses and the later state as the goal, and uses the original tactics as the extracted theorem's proof (section 3.1, PDF pages 3–4).

The paper's exact description is: “We implement a customized Lean 4 tactic to_theorem, which automatically encodes line-level, procedural proofsteps into a new subgoal, with the corresponding proofsteps serving as their proofs.” (section 3.1, PDF page 4). In Figure 2, a line containing `repeat rw [dotProduct]; simp [mul_comm]` is converted into a theorem whose hypotheses are the pre-state and whose goal is the post-state; replaying those tactics proves it (Figure 2 caption and section 3.1, PDF page 4).

How to apply it. (1) Choose a human-written procedural proof. (2) Record the proof state immediately before a line or selected multi-line segment. (3) Execute the segment and record the resulting state. (4) Create a theorem with the old local facts as hypotheses and the new state as its conclusion. (5) use the original tactic segment as that theorem's proof. (6) Vary the segment length to create easier single-step problems and harder multi-step problems. The nine-line `linear_gradient` example can yield up to nine one-line subgoals or four non-overlapping two-line subgoals (section 3.1, PDF page 4).

Verus form. Inference: instrument a Rust proof body at selected proof-state boundaries, then create a separate Verus proof function whose `requires` clauses encode the pre-state facts and whose `ensures` clauses encode the post-state fact. Keep the original proof steps as the proof body when possible. An implementation could use manually marked proof boundaries; the paper does not establish a Verus extraction mechanism. A subgoal's `requires` must preserve Rust ownership and borrowed-state facts; a mathematical proposition alone is insufficient.

Evidence and failure conditions. The authors motivate line-level extraction by observing that human-written proof lines typically correspond to reasoning steps (section 3.1, PDF page 4). Inference: replaying the original tactics provides a check of the extracted theorem in its library context; it does not validate the intended informal statement or the library assumptions. The paper's limitation is scope: FormalML focuses on a subset of machine-learning theory and plans broader domains (section 5, PDF page 11).

## technique 2: curate complete proof contexts

What it is. For each extracted subgoal, FormalML stores enough context for independent evaluation: source location, statement, imports, namespace declarations, original tactics, and premises relevant to the proof (section 3.2, PDF page 5). Lower-level lemmas remain in a local library for retrieval while top-level theorems are used as extraction targets. The resulting record is not just a goal string; it is a reproducible proof environment.

How to apply it. (1) Select top-level theorems from a library. (2) Preserve lower-level lemmas as retrieval candidates. (3) Run subgoal extraction over each proof line or segment. (4) Save the exact statement and the original tactic sequence. (5) Save imports, namespaces, source coordinates, and retrieved premises. (6) Use the saved context to evaluate the theorem independently. The paper says this “ensures a complete proof context for each theorem” (section 3.2, PDF page 5).

Verus form. Inference: store each VL obligation with the exact Rust module revision, dependency versions, `requires`/`ensures`, relevant `proof fn` declarations, imported modules, and the diagnostic that created the obligation. A Verus subgoal must be replayable in the same crate context because solver facts and visibility affect results. This provenance also prevents training on a proof that succeeds only because an unrelated broad lemma or changed dependency is present.

Evidence and assumptions. The benchmark construction draws on Optlib algorithms such as gradient descent, proximal gradient descent, Nesterov acceleration, block coordinate descent, and ADMM, plus FoML inequalities including McDiarmid, Hoeffding, Bennett, and Bernstein (section 3.2, PDF page 5). These are domain choices, not claims that the extraction method generalizes automatically to systems code.

## technique 3: evaluate whole-proof and tree-search provers with Pass@K

What it is. FormalML compares best-first tree-search systems, which expand proof states, with whole-proof systems, which emit a complete proof in one pass. Its metric Pass@K is the fraction of problems for which at least one valid proof appears among K attempts (section 4.1, PDF page 8). For tree search K equals tactics per expansion times expansion iterations; the main comparison uses at most 8 × 50 for tree search and 32 for whole-proof generation.

How to apply it. (1) Fix the benchmark split and exact proof context. (2) For a whole-proof model, sample K complete proofs and verify each with Lean. (3) For best-first search, generate E tactics per expansion for T iterations, so K = E × T. (4) Count a problem as solved if one attempt verifies. (5) Report Pass@1 and larger budgets separately; low budgets model practical interactive assistance. The authors use LeanDojo for interactive search, vLLM for generation, kimina-lean-server for verification, and NVIDIA H800 GPUs (section 4.1, PDF page 8).

Results. The best Pass@32 is STP at 63.21% over all problems; its Pass@1 is 26.96% (Table 3, PDF page 7). Best-first methods remain below 30% at their tested budgets (section 4.1, PDF page 8). A separate higher-difficulty evaluation uses larger budgets: STP reaches Pass@128 of 55.5% at level 3 and 33.36% at level 5 (section 4.3, PDF page 9). The paper concludes that “current whole-proof generation models have preliminarily acquired the capability to solve FormalML problems when increasing sample budgets” but that Pass@1 remains too low for practical assistance (section 4.1, PDF page 8).

Verus form. Inference: measure a VL agent with Pass@K by generating K candidate proof bodies for the same fixed Rust contract and replaying each with Verus. Keep the executable function and specification constant across attempts. Report denominators as obligations, attempts, and verified obligations; a high Pass@K can hide expensive retries. Tree search would require a Verus-aware state transition interface, while whole-proof generation can emit a complete `proof fn` body.

## technique 4: premise retrieval under complex context

What it is. The benchmark tests whether a prover can select useful theorems from a mixed library. For each proposition, the authors sample candidate premises from Mathlib and local premises, mix correct theorems into a retrieval set of size M, and present all candidates in a structured prompt. They test M = 10 and M = 20 (section 4.2, PDF pages 8–9).

How to apply it. (1) Build a candidate library containing local and global lemmas. (2) For each subgoal, inject the correct premises among distractors. (3) Present M candidates in a consistent structured format. (4) Ask the prover to use the candidates and generate a proof. (5) Compare Pass@16 and Pass@32 against M = 0. Inference: this tests premise selection and proof use within a supplied candidate set; it does not measure retrieval from the full library.

Results and limits. DeepSeek-Prover-V2 noCoT improves from 58.37% Pass@32 at M = 0 to 69.29% at M = 10, a +10.92-point change; with M = 20 it reaches 65.80%, +7.43 points (Table 4, PDF page 10). STP decreases from 57.72% to 56.04% at M = 20 (−1.68 points). The authors suggest, rather than demonstrate, that DeepSeek's retrieval ability stems from natural-language reasoning training. They note that performance often declines as M grows. The benchmark does not compare embedding retrieval models, deliberately using the same model for retrieval and proof generation (section 4.2, PDF page 9).

Verus form. Inference: retrieve candidate Verus lemmas by names, types, and contract signatures, then include a bounded set in the proof context. Measure both proof success and retrieval precision. Extra facts can slow solver search or introduce ambiguity, so vary M and report the exact candidate denominator. A retrieved lemma remains untrusted until Verus checks its call under the current contracts.

## technique 5: control reasoning budget and response length

What it is. FormalML tests whether long natural-language chain-of-thought helps local proof completion. It defines Efficiency-Weighted Accuracy as `EWA@K = Pass@K × 100 / Response Length` (section 4.4, PDF page 10). Response length is used to penalize verbose attempts that do not improve verified proofs.

Results. Long-CoT models produce the most tokens but do not improve pass rates on this benchmark; STP has the shortest output, highest pass rate, and highest EWA@32 (section 4.4, PDF page 10). The finding is: “Long-CoT demonstrates no significant improvement in the pass rates of the subgoal completion task while simultaneously incurring substantial computational overhead.” (Finding 4, section 4.4, PDF page 10).

Verus form. Inference: record generated tokens, wall time, Verus verification time, and Pass@K for each proof obligation. Prefer a concise proof only when it verifies the unchanged contract; shortening output must not weaken the specification or hide an `external_body` assumption. EWA is a ranking metric, not a correctness guarantee.

## technique 6: expert iteration from verified candidates

What it is. The authors extract 92,815 problems from mathlib, PrimeNumberTheoremAnd, PFR, PhysLean, and scilean using `to_theorem`, use 88,174 for training, generate eight candidate proofs per problem, and train on the correct candidates. They run one expert-iteration round on DeepSeek-Prover-V2 noCoT and Goedel-Prover-V2-8B, using AdamW, learning rate 1e−5, cosine schedule, 0.1 warmup ratio, effective batch size 16, three epochs, bf16, and DeepSpeed ZeRO (section 4.5, PDF page 10).

How to apply it. (1) Extract many subgoals from verified library proofs. (2) Generate eight candidate proofs per subgoal. (3) Verify candidates in Lean and keep only correct proofs. (4) Fine-tune the prover on those verified examples. (5) Evaluate before and after on the FormalML benchmark, reporting Pass@1 and larger budgets. The paper reports a substantial improvement, especially in Pass@1, but the displayed Figure 5 is the evidence and the text does not provide every numeric value (section 4.5, PDF page 10).

Verus form. Inference: generate multiple `proof fn` candidates for fixed Rust contracts, run Verus, and fine-tune only on bodies that pass. Retain failed bodies as negatives only when their diagnostics and contract are stored. Do not train on an `external_body` proof or a proof function called as runtime code; those would not be verified training targets.

## what is proved, measured, and trusted

Appendix C.1 distinguishes “has_error (Lean code with execution errors)”, “is_valid_with_sorry (code that verifies but contains the sorry tactic)”, and “is_valid_no_sorry (correctly verified proofs)” (PDF page 17). Inference: compilation alone is insufficient evidence of a completed proof when `sorry` remains. The measured quantities are Pass@K, retrieval sensitivity, difficulty-level performance, output length, EWA, and expert-iteration change on FormalML's 4,937-problem dataset. The benchmark shows strong dependence on sample budget and domain: STP's 63.21% Pass@32 is over all 4,937 problems, while its 26.96% Pass@1 uses the same all-problem denominator (Table 3, PDF page 7). The 69.29% DeepSeek-Prover-V2 noCoT value is Pass@32 on the retrieval subset with M = 10, not the full benchmark (Table 4, PDF page 10).

Inference: proof acceptance relies on Lean and the assumptions in the formalized statements and libraries; the reported benchmark scores also rely on correct extraction and evaluation code. The paper does not measure Verus, Rust ownership, unsafe code, external libraries, or product-level requirements.

Inference: subgoal completion can reduce proof burden after a contract is fixed, and the context/provenance record is directly useful. The main risks are contract errors, retrieval of a lemma whose assumptions do not hold, and high retry cost. FormalML's results argue for low-budget local proof evaluation rather than assuming long reasoning or whole-module generation will work.

## what VL should reuse and avoid redoing

Inference: VL should reuse state-boundary extraction, complete-context records, bounded premise retrieval, Pass@K reporting, and expert iteration over Verus-verified proof bodies. These are already concrete techniques. VL should not redo a Lean-only benchmark or claim FormalML percentages as evidence about Rust systems. A useful new experiment is a Verus corpus of real maintenance subgoals with exact contracts, dependencies, diagnostics, and repair cost; compare local completion with full-agent generation under the same verifier budget.

## techniques for the catalog

- state-boundary subgoal extraction: turn pre-state and post-state around a procedural proof segment into an independently checked theorem
- complete proof-context records: preserve source, imports, namespaces, original steps, and premises with every extracted obligation
- Pass@K local proving: measure whether one of K bounded attempts verifies a fixed subgoal
- premise retrieval evaluation: vary mixed local and global candidate sets and report proof success by retrieval size
- efficiency-weighted proving: divide verified success by response length to expose costly overthinking
- verified expert iteration: train on candidates that the proof kernel accepted and evaluate on FormalML subgoals
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This metric balances performance and output efficiency by normalizing the proof success rate against the response length."): read the entire paper, including references and appendices, and checked the study's quotations, numbers, page and section references, extraction steps, evaluation procedures, and conclusions; corrected page references, clarified supplied-candidate retrieval and sorry-containing outputs, removed an unsupported Verus API claim and risk rating, and marked conclusions as inferences; did not reproduce experiments, inspect released code or data, or validate the proposed Verus adaptations.
