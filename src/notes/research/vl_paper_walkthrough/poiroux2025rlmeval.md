# RLMEval: Evaluating Research-Level Neural Theorem Proving
(authored by agents unless marked 🧑)
Tag: `poiroux2025rlmeval`, [paper](http://arxiv.org/abs/2510.25427v1)


## purpose and result

RLMEval is a benchmark for neural theorem proving and proof autoformalization on research-level Lean projects. Its unit is a blueprint theorem: a high-level theorem linked to an informal project blueprint, rather than one of the many auxiliary lemmas. The paper reports 613 theorems from six projects. Its headline result is: “the best model achieving only a 10.3 % pass rate” (Abstract, PDF p.1), specifically DeepSeek-Prover-V2-7B on proof autoformalization in normal mode at pass@128 (Figure 1, p.4; Table 5, p.8).

Inference: For VL, this is evidence that benchmark scores on short, curated problems should not be used as product capability estimates. RLMEval tests long project context, research-level statements, and missing intermediate lemmas. The task is Lean-specific, so its numbers do not directly measure Verus.

## technique 1: curate blueprint theorems instead of all lemmas

What it is. RLMEval selects theorems that appear in the informal blueprint of six real projects: Carleson (110), FLT (52), PFR (144), PNT (99), FLT3 (84), and TLB (124) (Table 1, PDF p.3). Auxiliary lemmas exceed 75% of theorems in several projects, while selected main theorems average 16.6 proof lines versus 6.6 for auxiliary lemmas (Table 2, p.3). The paper says: “By focusing on blueprint theorems, RLMEval targets more complex, research-level reasoning tasks” (Methodology, p.3).

How to apply it. (1) Start from a real formalization project. (2) Identify theorem declarations linked to its informal blueprint. (3) Exclude technical lemmas that are not blueprint milestones. (4) Preserve each theorem’s project, domain, Lean version, and original source. (5) Report counts and proof-length distributions separately for selected theorems and auxiliary lemmas. (6) Version the benchmark as projects evolve.

Verus form. Inference: build a VL benchmark from milestone `proof fn` declarations in real Verus crates, retaining module context and dependency versions. Selectors should use repository metadata or explicit tags; Verus has no Lean blueprint format. Inference: do not infer difficulty from line count alone, because Verus proof code and specification code have different densities.

Evidence and limits. The six-project corpus contains 613 theorems (Abstract, p.1). Table 2 reports 68.3% auxiliary lemmas overall, with project-specific proportions from 15.9% (FLT3) to 85.9% (Carleson) (p.3). Difficulty is marked subjective in Table 1. Inference: project selection and blueprint quality are sampling assumptions; the benchmark does not represent all mathematics or all Rust systems.

## technique 2: paired tasks for proving and autoformalization

What it is. RLMEval separates Neural Theorem Proving (NTP), where the model receives a formal Lean statement and must generate a proof, from Proof Autoformalization, where it receives an informal proof plus the formal statement and must generate a proof. The paper defines NTP as “Given a formal Lean statement, generate a complete and verifiable Lean proof” (Methodology, PDF p.3).

How to apply it. (1) Freeze a theorem statement and imports. (2) For NTP, provide only the formal statement and allowed context. (3) For autoformalization, additionally provide the project’s informal proof. (4) Generate multiple candidate proofs. (5) Submit every candidate to Lean and count a theorem solved if at least one candidate compiles. (6) Compare tasks on identical theorem sets to isolate the value of informal proof text.

Verus form. Inference: define two tracks: generate a Verus proof body from a fixed Rust/Verus specification, and translate an informal argument into a proof body. Compilation and verification are the acceptance oracle. Inference: preserve Rust type checking and Verus’s specification checking separately in the harness so a type error is not confused with a failed mathematical proof.

Evidence. At pass@128 in normal mode, DeepSeek-Prover-V2-7B scores 8.8% on NTP and 10.3% on autoformalization (Figure 1, p.4; Tables 5–6, p.8). The improvement is about 1.5 percentage points, so informal proofs help modestly. The paper notes that some informal proofs are cryptic without broader context (Limitations, PDF p.6). Inference: autoformalization input is not automatically a reliable specification of the intended argument.

## technique 3: controlled context modes

What it is. Easy mode exposes all project definitions and lemmas, including non-blueprint auxiliaries. Normal mode exposes only blueprint theorems, forcing models to discover or prove intermediate results. The paper says normal mode “simulates a more realistic task, closer to what mathematicians for formalizing research results are faced with” (Methodology, PDF p.3).

How to apply it. (1) Define an allowlist of declarations available before each target. (2) In normal mode, exclude non-blueprint auxiliary lemmas. (3) In easy mode, expose all project lemmas. (4) Keep theorem statements, sampling, model, and decoding fixed. (5) Compare pass rates and report the context difference with each score.

Verus form. Inference: construct a normal VL mode exposing only public API contracts and previously catalogued milestone lemmas, and an easy mode exposing all crate proofs. Inference: dependency manifests and module visibility must be frozen because Verus proofs can use imported specifications differently from Lean.

Evidence. DeepSeek-Prover-V2-7B improves from 8.8% normal to 14.7% easy on NTP, and from 10.3% normal to 16.7% easy on autoformalization (Results, PDF p.5). These are pass@128 percentages over the 613-theorem corpus, with per-project denominators varying by Table 1 counts. The gap shows the value of auxiliary lemma access; it does not identify whether retrieval, discovery, or proof search caused the gain.

## technique 4: pass@k sampling as a reproducible metric

What it is. pass@k is the percentage of problems for which at least one of k generated attempts verifies. RLMEval uses k=128 for its main comparison and samples with fixed model hyperparameters through a local vLLM server on H100 80GB GPUs (Appendix A.1, PDF p.7).

How to apply it. (1) Generate exactly k independent candidates per theorem. (2) Verify each candidate in the target assistant. (3) Mark the theorem successful if any candidate succeeds. (4) Aggregate successful theorem count divided by the fixed theorem-set size. (5) Plot pass@1, pass@4, pass@32, and pass@128 to expose scaling. (6) Record temperature, top-p, token limits, hardware, and model version.

Verus form. Inference: run generated Verus proof candidates in isolated crate builds with pinned Verus and Rust versions. Count only candidates that pass the complete verifier invocation. Inference: cache-independent retries are important because solver nondeterminism can otherwise inflate pass@k.

Evidence. The paper reports that pass rates increase with more samples but gains diminish, unlike aggressive MiniF2F scaling (Results, PDF p.5). The main best score, 10.3%, is 63 successful theorems out of 613 only if rounded 10.3% is interpreted against the full corpus; the paper reports the percentage, while exact successes are not listed. Inference: studies reusing this metric must publish numerator and denominator to prevent rounding ambiguity.

## technique 5: multi-version, contamination-aware benchmark maintenance

What it is. LeanInteract provides a Python interface to Lean’s REPL, and RLMEval backports REPL features and bug fixes across 41 Lean versions from v4.7.0-rc1 to v4.19.0 (Related Work/Methodology, PDF pp.2–3). The benchmark plans yearly extensions with newer projects to reduce training-data contamination. The paper explicitly states: “This approach prioritizes broad compatibility and ease of use for benchmarking across the evolving Lean ecosystem” (Related Work, p.2).

How to apply it. (1) Pin the verifier version for every benchmark entry. (2) Provide a machine interface that runs the same task across supported versions. (3) Backport interface fixes or maintain version adapters. (4) Add newer projects in versioned releases. (5) Track model release dates relative to project commits and report contamination uncertainty.

Verus form. Inference: pin Verus commit, Rust toolchain, vstd revision, solver versions, and crate dependencies. Inference: a small runner can expose a uniform JSON interface around `cargo verus`; unlike LeanInteract, this adapter would be project infrastructure rather than a Verus theorem.

Evidence and limits. The authors say Llemma predates the first project commits, making leakage impossible for that model, but contamination for newer models is unclear (Limitations, PDF p.6). The benchmark still gives models the full preceding in-file context, which may disadvantage models trained on self-contained statements. This means versioning reduces but does not eliminate evaluation confounds.

## what is measured and what stays trusted

RLMEval measures verifier-accepted proof existence under fixed context modes, sampling budgets, model configurations, projects, and Lean versions. It does not prove that model-generated proofs are concise, maintainable, or semantically aligned with an informal proof beyond Lean acceptance. The Lean kernel, project code and declarations, blueprint links, model servers, sampling randomness, and benchmark curation remain trusted. Human proof length is used as a complexity proxy, not as a correctness criterion.

The paper finds large project variation: FLT3 reaches up to 32.1% for DeepSeek-Prover-V2-7B, while Carleson reaches at most 2.73% (Results, PDF p.5). It attributes the ordering FLT3 < TLB < FLT < PNT < PFR < Carleson to proof length (p.5), but the ordering is an inference from correlation, not a causal proof. The main 10.3% result uses 128 samples, normal mode, 7B DeepSeek-Prover-V2, and 613 targets; it cannot be compared to MiniF2F scores with different theorem sets and sampling budgets as if denominators matched.

Inference: threat to a product of agent-written verified Rust is medium to high for optimistic capability claims. RLMEval shows that realistic research context and missing lemmas sharply reduce automated success. VL should not redo a generic pass@k benchmark on toy examples; it should create a versioned milestone benchmark with normal/easy context modes, full numerator-denominator reporting, and verifier-pinned replay. Existing work already establishes the need for realistic-project evaluation, so VL’s novel contribution would be the Verus-specific corpus and maintenance evidence.

## techniques for the catalog

- blueprint theorem curation — select high-level project theorems and report them separately from auxiliary lemmas
- paired proving tasks — compare proof generation from formal statements with proof generation assisted by informal proofs
- controlled context modes — measure performance with only milestone lemmas versus all project lemmas
- pass@k sampling — count a theorem solved when one of k independently verified candidates succeeds
- versioned benchmark maintenance — pin verifier versions, expose a stable runner, and add newer projects to limit contamination
Checked 2026-10-15 against paper poiroux2025rlmeval: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
