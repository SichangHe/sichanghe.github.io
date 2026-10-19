# RLMEval: Evaluating Research-Level Neural Theorem Proving
(authored by agents unless marked 🧑)
Tag: `poiroux2025rlmeval`, [paper](http://arxiv.org/abs/2510.25427v1)


## purpose and result

RLMEval is a benchmark for neural theorem proving and proof autoformalization on research-level Lean projects. Its unit is a blueprint theorem: a high-level theorem linked to an informal project blueprint, rather than one of the many auxiliary lemmas. The paper reports 613 theorems from six projects. Its headline result is: “the best model achieving only a 10.3 % pass rate” (Abstract, PDF p.1), specifically DeepSeek-Prover-V2-7B on proof autoformalization in normal mode at pass@128 (Figure 1, PDF p.4; Table 5, PDF p.8).

Inference: For VL, this is evidence that benchmark scores on short, curated problems should not be used as product capability estimates. RLMEval tests long project context, research-level statements, and missing intermediate lemmas. The task is Lean-specific, so its numbers do not directly measure Verus.

## technique 1: curate blueprint theorems instead of all lemmas

What it is. RLMEval selects theorems that appear in the informal blueprint of six real projects: Carleson (110), FLT (52), PFR (144), PNT (99), FLT3 (84), and TLB (124) (Table 1, PDF p.3). Auxiliary lemmas exceed 75% of theorems in several projects, while selected main theorems average 16.6 proof lines versus 6.6 for auxiliary lemmas (Table 2, p.3). The paper says: “By focusing on blueprint theorems, RLMEval targets more complex, research-level reasoning tasks, providing a more challenging and realistic benchmark.” (Section 3, PDF p.2).

How to apply it. Inference: (1) Start from a real formalization project. (2) Identify theorem declarations linked to its informal blueprint. (3) Exclude technical lemmas that are not blueprint milestones. (4) Preserve each theorem’s project, domain, Lean version, and original source. (5) Report counts and proof-length distributions separately for selected theorems and auxiliary lemmas. (6) Version the benchmark as projects evolve.

Verus form. Inference: build a VL benchmark from milestone `proof fn` declarations in real Verus crates, retaining module context and dependency versions. Selectors could use repository metadata or explicit tags. Inference: validate proof length as a difficulty proxy before applying it to Verus.

Evidence and limits. The six-project corpus contains 613 theorems (Abstract, p.1). Table 2 labels 68.3% as the average auxiliary-lemma proportion, with project proportions from 15.9% (FLT3) to 85.9% (Carleson) (PDF p.3). Inference: 68.3% is an unweighted mean of the six project percentages, not the fraction of auxiliary lemmas across the combined corpus. Table 1 states: “Difficulty is a subjective assessment based on our experience with the projects and the models’ performance.” Inference: project selection and blueprint quality are sampling assumptions; the benchmark does not represent all mathematics or all Rust systems.

## technique 2: paired tasks for proving and autoformalization

What it is. RLMEval separates Neural Theorem Proving (NTP), where the model receives a formal Lean statement and must generate a proof, from Proof Autoformalization, where it receives an informal proof plus the formal statement and must generate a proof. The paper defines NTP as “Given a formal Lean statement, generate a complete and verifiable Lean proof.” (Methodology, PDF p.3).

How to apply it. Inference: (1) Freeze a theorem statement and imports. (2) For NTP, provide only the formal statement and allowed context. (3) For autoformalization, additionally provide the project’s informal proof. (4) Generate multiple candidate proofs. (5) Submit every candidate to Lean and count a theorem solved if at least one candidate is accepted as a complete proof. (6) Compare tasks on identical theorem sets to isolate the value of informal proof text.

Verus form. Inference: define two tracks: generate a Verus proof body from a fixed Rust/Verus specification, and translate an informal argument into a proof body. Compilation and verification are the acceptance oracle. Inference: preserve Rust type checking and Verus’s specification checking separately in the harness so a type error is not confused with a failed mathematical proof.

Evidence. At pass@128 in normal mode, DeepSeek-Prover-V2-7B scores 8.8% on NTP and 10.3% on autoformalization (Figure 1, PDF p.4; Table 5, PDF p.8; Table 6, PDF p.9). The improvement is about 1.5 percentage points, so informal proofs help modestly. The paper notes that some informal proofs are cryptic without broader context (Limitations, PDF p.6). Inference: autoformalization input is not automatically a reliable specification of the intended argument.

## technique 3: controlled context modes

What it is. Easy mode exposes all project definitions and lemmas, including non-blueprint auxiliaries. Normal mode excludes non-blueprint auxiliary lemmas, so models may need to prove equivalent intermediate results themselves. Both modes provide the preceding in-file context, including definitions and imports (Section 4, PDF p.3). The paper explains normal mode: “This simulates a more realistic task, closer to what mathematicians formalizing research results are faced with.” (Methodology, PDF p.3).

How to apply it. Inference: (1) Define an allowlist of declarations available before each target. (2) In normal mode, exclude non-blueprint auxiliary lemmas. (3) In easy mode, expose all project lemmas. (4) Keep theorem statements, sampling, model, and decoding fixed. (5) Compare pass rates and report the context difference with each score.

Verus form. Inference: construct a normal VL mode exposing only public API contracts and previously catalogued milestone lemmas, and an easy mode exposing all crate proofs. Inference: freeze dependency manifests and module visibility to keep the available context reproducible.

Evidence. DeepSeek-Prover-V2-7B improves from 8.8% normal to 14.7% easy on NTP, and from 10.3% normal to 16.7% easy on autoformalization (Section 4, PDF p.4). Inference: the totals in Tables 5–6 are unweighted means of project pass rates, as their arithmetic shows, rather than pooled fractions of the 613 theorems. The comparison supports the value of auxiliary lemma access but does not separate retrieval, discovery, and proof search.

## technique 4: pass@k sampling as a reproducible metric

What it is. pass@k is the percentage of problems for which at least one of k generated attempts verifies. RLMEval uses k=128 for its main comparison and samples with fixed model hyperparameters through a local vLLM server on H100 80GB GPUs (Appendix A.1, PDF p.7).

How to apply it. Inference: (1) Generate k candidates per theorem using a recorded sampling configuration. (2) Verify each candidate in the target assistant. (3) Mark the theorem successful if any candidate succeeds. (4) Compute the solved fraction within each project; state explicitly how project scores are combined. (5) Plot pass@1, pass@4, pass@32, and pass@128 to expose scaling. (6) Record temperature, top-p, token limits, hardware, and model version.

Verus form. Inference: run generated Verus proof candidates in isolated crate builds with pinned Verus and Rust versions. Count only candidates that pass the complete verifier invocation.

Evidence. The paper reports that pass rates increase with more samples but gains diminish, contrasting this with aggressive MiniF2F scaling (Section 4, PDF p.4). Inference: Table 5’s normal-mode DeepSeek-Prover-V2-7B project scores average to 10.33%, so the headline 10.3% cannot be converted into 63 successes out of 613. Studies reusing this metric should report each project’s numerator and denominator and the aggregation rule.

## technique 5: multi-version, contamination-aware benchmark maintenance

What it is. LeanInteract provides a Python interface to Lean’s REPL, and RLMEval backports REPL features and bug fixes across 41 Lean versions from v4.7.0-rc1 to v4.19.0 (Section 3, PDF p.2). The introduction proposes annual versions (PDF p.1); Section 3 proposes adding newer projects to reduce training-data contamination (PDF p.2). The paper explicitly states: “This approach prioritizes broad compatibility and ease of use for benchmarking across the evolving Lean ecosystem, setting it apart from existing interaction tools like LeanDojo (Yang et al., 2023) or Pantograph (Aniva et al., 2024), which are tied to specific Lean versions or require compute-intensive project tracing.” (Section 3, PDF p.2).

How to apply it. Inference: (1) Pin the verifier version for every benchmark entry. (2) Provide a machine interface that runs the same task across supported versions. (3) Backport interface fixes or maintain version adapters. (4) Add newer projects in versioned releases. (5) Track model release dates relative to project commits and report contamination uncertainty.

Verus form. Inference: pin Verus commit, Rust toolchain, vstd revision, solver versions, and crate dependencies. Inference: a runner could expose a uniform interface around the pinned Verus invocation.

Evidence and limits. The authors say Llemma predates the first project commits, making leakage impossible for that model, but contamination for newer models is unclear (Limitations, PDF p.5). The benchmark still gives models the full preceding in-file context, which may disadvantage models trained on self-contained statements (Limitations, PDF pp.5–6). The authors also note that they tested the 7B rather than 671B DeepSeek-Prover-V2 and a smaller sampling budget than prior MiniF2F experiments, so their results likely underestimate achievable RLMEval performance (Limitations, PDF p.5). Inference: adding newer projects may reduce contamination risk, but version support alone does not establish uncontaminated evaluation.

## what is measured and what stays trusted

Inference: RLMEval measures verifier-accepted proof existence under fixed context modes, sampling budgets, model configurations, projects, and Lean versions. It does not prove that model-generated proofs are concise, maintainable, or semantically aligned with an informal proof beyond Lean acceptance. The Lean kernel, project code and declarations, blueprint links, model servers, sampling randomness, and benchmark curation remain trusted. Human proof length is used as a complexity proxy, not as a correctness criterion.

The paper finds large project variation: in normal-mode proof autoformalization, DeepSeek-Prover-V2-7B reaches 32.14% on FLT3 and 2.73% on Carleson (Table 5, PDF p.8). Easy-mode Carleson reaches 3.64%, so 2.73% is not its maximum across modes. Section 4 orders projects by mean human proof length as FLT3 < TLB < FLT < PNT < PFR < Carleson (PDF p.4). Inference: this correlation does not establish that length causes difficulty. The main 10.3% result uses 128 samples, normal mode, and 7B DeepSeek-Prover-V2 on a benchmark containing 613 targets; comparisons with MiniF2F must account for different theorem sets and sampling budgets.

Inference: VL should test agent-written verified Rust on a versioned corpus of real project milestones, with normal/easy context modes, explicit score aggregation, and verifier-pinned replay. RLMEval motivates this evaluation design; it does not establish how well the same models would perform on Verus or whether a Verus corpus would be novel.

## techniques for the catalog

- blueprint theorem curation — select high-level project theorems and report them separately from auxiliary lemmas
- paired proving tasks — compare proof generation from formal statements with proof generation assisted by informal proofs
- controlled context modes — measure performance with only milestone lemmas versus all project lemmas
- pass@k sampling — count a theorem solved when one of k generated candidates verifies
- versioned benchmark maintenance — pin verifier versions, expose a stable runner, and add newer projects to limit contamination
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Manual inspection reveals this model tends to generate verbose proofs with repetitive or redundant steps, suggesting room for improvement in proof conciseness and efficiency."): checked all 12 PDF pages through the full paper text, quotations, numerical claims, section and page references, and technique descriptions; corrected quotations, page references, project-average interpretations, the unsupported success-count estimate, and the Carleson maximum, and marked proposed application steps and conclusions as inferences; did not reproduce experiments or inspect benchmark code, external links, or Verus implementations.
