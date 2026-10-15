# Artificial Intelligence for Mathematical Reasoning: An Integrated Survey of Language Models, Neuro-symbolic Systems, and Verified Discovery
(authored by agents unless marked 🧑)
Tag: `raiyan2026artificial`, [paper](https://doi.org/10.48550/arxiv.2606.08728)

## scope and result

This survey organizes mathematical reasoning around four task families: informal text and diagrams, formal theorem proving and autoformalization, mathematical discovery, and inference/training methods that connect generation to verification. Its key framework is the comprehension–generation–verification (CGV) triad. The survey says: “The CGV triad refines the two-stage comprehension–generation framing of recent LLM-centric surveys by promoting verification from an optional post-hoc filter to a co-equal component that participates both at inference time and during training.” (section IV, p. 13 in the extracted text). For VeruLaw, the formal track and the verifier-centered training lessons matter most.

The survey distinguishes a numerical answer, an executable program, a formal proof, and an open-ended construction as progressively stronger artifacts. It states: “A final numerical answer gives only weak supervision; an executable program permits deterministic evaluation; a formal proof supplies a kernel-checked certificate; and an open-ended construction requires a task-specific verifier.” (section II-A, p. 6). This is a useful engineering rule: choose the artifact and verifier together.

Inference: the survey is a map of prior work rather than a new verified system. Its reported results inherit the source papers' settings and trust assumptions. A VL design should use the taxonomy to select interfaces and measurements, not treat the survey's aggregate scores as direct evidence that Verus Rust can be generated reliably.

## technique 1: make the output a machine-checkable artifact

What it is. The survey's supervision ladder moves from answer-level rewards to executable programs, process reward models, symbolic solvers, and proof-assistant kernels. The CGV decomposition separates parsing the task, generating a candidate path, and certifying it.

How to apply it.

1. Define the required artifact before prompting: numeric expression, executable program, proof term, or construction plus certificate (section II-A, p. 6).
2. Generate an intermediate representation that exposes dependencies: equation trees, operation programs, tactic states, Lean terms, or a construction program (section II-A, p. 6).
3. Run an independent verifier suited to that representation: exact execution, a symbolic solver, a process/outcome verifier, or a proof-assistant kernel (section IV-H, pp. 16–17).
4. Feed verdicts back into search or training. Reject invalid artifacts and preserve accepted artifacts as data.

Verus form. Inference: for VL, make the artifact Rust source plus Verus specifications and proof code. Compile only after Verus verification succeeds, and keep generated contracts, proof obligations, and external assumptions as explicit records. A final test result is weaker than a verified postcondition.

Evidence and boundary. The survey warns that execution cannot catch semantic misinterpretation: “a program that faithfully encodes a misunderstood problem will execute correctly but produce the wrong answer.” (section IV-B, p. 14). Thus a Verus proof can certify the encoded contract while leaving the natural-language-to-contract translation wrong.

## technique 2: process verification and outcome verification

What it is. Outcome reward models (ORMs) score only the final answer. Process reward models (PRMs) score intermediate steps and can localize mistakes. The survey reports that a PRM selecting among 1,860 sampled solutions outperformed best-of-N ORM on MATH, while noting that PRMs cost more to label (section IV-H, p. 16).

How to apply it.

1. Sample several candidate traces.
2. For each step, compute a local validity signal with a solver, executor, or proof assistant.
3. Train or use a process scorer to rank partial traces and trigger targeted regeneration.
4. Combine process scores with final correctness, reporting the two separately.
5. If labels are expensive, use rollout-based or compiler-generated feedback; retain a human audit for semantic quality.

Verus form. Inference: treat each Verus verification result as a process signal attached to the function, lemma, or obligation that failed. A failed proof obligation should drive repair of that obligation rather than regeneration of the entire Rust file. An ORM-like reward can select a fully verified candidate, but it cannot identify which contract or lemma is wrong.

Failure. PRMs can be wrong when their domain coverage is narrow; the survey says logically invalid steps can survive PRM scoring when the PRM lacks domain coverage (section VI, p. 18). Verus's checker is stronger for supported syntax, but a bad specification or trusted external body remains outside the proof.

## technique 3: compiler-guided proof repair and autoformalization

What it is. Autoformalization maps a natural-language theorem to a formal statement and proof assistant language. The survey describes APOLLO, which treats Lean compiler errors as diagnostic feedback: it isolates failing sublemmas, recursively repairs subgoals, recombines repaired proofs, and re-verifies them (section VI-B, pp. 20–21).

How to apply it.

1. Generate an informal proof sketch and a formal theorem skeleton.
2. Ask the compiler or proof checker to type-check it.
3. Parse diagnostics into error locations, type mismatches, and unresolved goals.
4. Regenerate only the failing subgoal or statement fragment with a minimal sampling budget.
5. Recombine repaired subproofs and run the checker again; stop only on a complete accepted proof.
6. Train a process verifier on the diagnostic stream so later candidates receive step-level feedback (section VI-C, p. 21).

The survey reports APOLLO+Goedel-Prover-SFT at 65.6% MiniF2F with a few hundred samples, compared with roughly 25,600 samples for the baseline repair setting; APOLLO's best model at 8B parameters or fewer reaches 84.9% (Table XIII, p. 23). These are pass rates under the table's stated search budgets, not probabilities that arbitrary theorems will be formalized correctly.

Verus form. Inference: use Verus diagnostics to classify failed `requires`, `ensures`, loop `invariant`, arithmetic, and lemma obligations. Ask the model to patch the smallest failing proof region, then rerun Verus on the whole crate. Keep the original specification fixed unless a human changes the requirement; otherwise repair can silently weaken the property. Verus diagnostics are not a natural-language semantic oracle, so first formalization still needs review.

## technique 4: retrieval, tactic prediction, and decomposition

The survey groups theorem provers into search-first tactic prediction, retrieval-augmented proving, whole-proof generation, recursive subgoal decomposition, and neuro-symbolic RL. LeanDojo/ReProver retrieves premises before predicting tactics; APOLLO repairs local goals; DeepSeek-Prover-V2 recursively solves Lean templates with `sorry` placeholders and uses verified subproofs as training data (section VI-B/D, pp. 20–23).

A reusable procedure is:

1. Maintain an explicit proof state.
2. Retrieve definitions and lemmas relevant to that state.
3. Predict one tactic or proof step.
4. Let the proof assistant accept, reject, or transform the state.
5. Branch or backtrack when a tactic fails; decompose large goals into independently checked subgoals.
6. Add successful proof states and verified subproofs to the training corpus.

The survey's Table XIII reports DeepSeek-Prover-V2-671B at 88.9% MiniF2F-test Pass@8192 and 49/658 PutnamBench problems; the entry uses 8,192 samples and verified subproof training. AlphaProof is marked as using expert Lean formalizations and large test-time RL budgets, so its 99.6% table entry is not directly comparable with fully automatic systems (Table XIII, p. 23).

Verus form. Inference: represent a Verus proof state as the current Rust function, visible invariants, and unresolved assertions. Retrieve existing lemmas from the crate, propose one lemma or `assert`, and rerun the verifier. Decompose by extracting helper `proof fn`s with precise contracts. Verus does not expose Lean tactics, so the agent must generate Rust proof code and let Verus/Z3 check it.

## technique 5: reinforcement learning with verifiable rewards

What it is. RLVR trains a policy from rewards that can be checked automatically. The survey describes PPO, critic-free ReMax, RLOO, group-normalized GRPO, REINFORCE++, and DAPO. GRPO samples a group of completions and normalizes each reward by the group's mean and standard deviation; DAPO adds token-level loss and overlong-response shaping (section IV-G, pp. 17–18).

How to apply it.

1. Sample multiple completions for each problem.
2. Run the independent verifier and record a binary or graded reward.
3. Normalize rewards using the chosen baseline (group, leave-one-out, or global).
4. Update the policy with clipped policy gradients and a KL or reference-policy constraint where needed.
5. Track verifier pass rates separately from answer accuracy and token cost.
6. Test whether the policy exploits the verifier by using adversarial or perturbed tasks.

Verus form. Inference: reward only a Rust candidate whose Verus proof succeeds under the intended crate and dependency versions. Add intermediate rewards for solved proof obligations, but retain a terminal reward for a complete verified crate. A reward based only on compilation or test execution can encourage code that runs while violating the formal contract.

Evidence limits. The survey notes that RLVR systems vary in reward granularity and that online methods explore new rollouts while offline preference methods do not. Its frontier scores mix pass@1, majority@k, pass@k, expert formalization, and test-time RL. These metrics cannot be compared without their denominator, sample budget, verifier, and human assistance.

## technique 6: proof search as test-time scaling with an independent judge

The survey recommends separating greedy/pass@1, majority@k, and pass@k. It gives an example where one system's AIME accuracy rises from 74% greedy to 83% majority@64 and 93% after reranking 1,000 samples (section IV-G, p. 18). DeepSeek-Prover-V2's MiniF2F result rises from about 60% pass@1 to 88.9% pass@8192 in the survey's comparison. The paper states: “For formal mathematics, it is the Lean kernel.” (section IV-H, p. 19), referring to the independent judge that turns generation into search and verification.

How to apply it.

1. Allocate a search budget per problem.
2. Generate partially independent candidates or proof branches.
3. Let a strong verifier prune invalid branches.
4. Select a candidate only after checker acceptance; report the exact budget and selection rule.
5. Adapt the budget to difficulty instead of assigning every task thousands of tokens.

Verus form. Inference: sample multiple Rust/Verus implementations, run Verus on each, and select among fully verified candidates using performance or simplicity metrics. The verifier must be independent of the generator's learned reward model. Report pass@1, pass@k, crate-verification time, and token budget separately.

## technique 7: verified mathematical discovery and library growth

FUNSEARCH evolves a Python function against an automated fitness evaluator; AlphaEvolve evolves whole multi-file programs, allowing new data structures and optimization loops (section VII-A, pp. 24–25). The survey describes a stronger pipeline in which program search proposes a construction, a reasoning model supplies an argument, and Lean or AlphaProof verifies it. For library maintenance, Mathlib LEMMA uses Discovery, Judge, and Formalizer agents to propose folklore lemmas, filter them for soundness, and emit type-checked Lean; its benchmark has 4,028 type-checked statements and a human audit judged 78% mathematically sound (section VI-F, p. 24).

Apply discovery as:

1. Define an executable fitness function or formal target.
2. Generate mutations or constructions.
3. Evaluate them in a sandbox against the fitness function.
4. Filter promising candidates with a formal checker.
5. Have a human or independent audit assess novelty and assumptions.
6. Add accepted lemmas or constructions to a versioned library.

Verus form. Inference: let the agent propose verified helper lemmas, data-structure invariants, or optimized Rust implementations. Require Verus proofs and benchmark the executable result. Novelty and product relevance still need a human or repository-level audit; a proof only establishes the stated property.

## what this establishes for VL

The survey's formal corpus shows that proof assistants are both verifiers and data generators. Lean kernel checking, compiler diagnostics, proof-state retrieval, recursive subgoals, and verified subproof datasets already cover most of the generic architecture a proof-producing agent needs. VL should not redo those ideas as if they were new. Its open engineering questions are Rust/Verus-specific: specification fidelity, unsafe and external-code boundaries, dependency upgrades, proof stability, and useful repair from Verus diagnostics.

The survey reports 238 included records after a screening pipeline of 1,847 candidates, 1,535 deduplicated records, 1,089 title/abstract exclusions, and 446 full-text reviews, of which 208 were excluded (Figure 3, p. 5). This denominator describes the survey's corpus, not all mathematical-reasoning literature. Its benchmark table groups 15 neural provers, 15 autoformalization/library papers, 8 discovery papers, 25 benchmark/evaluation records, and 20 multilingual resources (Figure 3, p. 5).

What is measured: benchmark answer accuracy, pass@k, proof-assistant acceptance, process scores, search budgets, and selected human audits. What remains trusted: formalization of the natural-language statement, proof-assistant kernel and libraries, compiler or transpiler layers, retrieval corpus, verifier implementation, and any expert formalization or answer-guessing assistance. The survey explicitly warns that theorem-proving benchmarks measure library coverage, notation alignment, premise retrieval, and proof-state feedback as well as model ability (section VI-F, p. 24).

Inference: the threat to a product that generates Verus Rust is high if it reports answer accuracy without complete verification and specification audits, and moderate if it requires full Verus checking with explicit trust records. The closest transferable techniques are compiler-guided local repair, proof-state retrieval, process-level rewards, and test-time search with Verus as the independent judge. The survey's own synthesis already covers these general patterns; VL's contribution must be measured on real Rust systems and maintenance changes.

No single benchmark number should be combined with another without its denominator and setting. Table XIII mixes Pass@32, Pass@64, Pass@8192, full-benchmark counts, expert-assisted TTRL, and automatically generated proofs. The survey marks those distinctions, and the comparison would be misleading if the markers were removed.

## techniques for the catalog

- comprehension–generation–verification triad: treat parsing, candidate generation, and independent certification as separate components
- artifact-level supervision: move from answers to executable programs, proof terms, or constructions with certificates
- process reward models: score intermediate proof steps to localize errors and assign targeted learning credit
- compiler-guided repair: use proof-checker diagnostics to repair only failing subgoals and re-verify
- retrieval and decomposition: retrieve lemmas, predict one proof step, and recursively solve independently checked subgoals
- RL with verifiable rewards: train from execution or proof-assistant rewards with explicit baselines and budgets
- verifier-guided test-time scaling: sample candidates and let an independent checker select accepted proofs
- verified discovery: evolve executable constructions, then certify their properties and audit novelty
Checked 2026-10-14 against the paper by a Codex agent: audit record raiyan2026artificial; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
