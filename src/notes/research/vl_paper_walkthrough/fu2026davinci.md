# daVinci-Env: Open SWE Environment Synthesis at Scale
(authored by agents unless marked 🧑)
Tag: `fu2026davinci`, [paper](https://arxiv.org/abs/2603.13023)

## purpose and result

Fu et al. present OpenSWE, an open framework for producing executable software-engineering (SWE) tasks. The abstract states: “Training capable software engineering (SWE) agents demands large-scale, executable, and verifiable environments that provide dynamic feedback loops for iterative code editing, test execution, and solution refinement.” (Abstract, p. 1). The released corpus contains 45,320 Docker environments from 12.8k repositories, with Dockerfiles, evaluation scripts, and infrastructure. Construction used a multi-agent pipeline on 64 nodes. The paper reports approximately $891K for construction and $576K for trajectory sampling and difficulty-aware curation, about $1.47M total, and about 13,000 curated trajectories from roughly 9,000 quality-guaranteed environments (Abstract, p. 1; §1, p. 2). The Conclusion instead says “approximately 10,000 high-quality environments” (§5, p. 10), and Appendix B says the total “exceeds $1.47 million” (p. 18); the paper does not reconcile these figures.

The central quality claim is that scale alone is insufficient. The introduction identifies PR-issue misalignment (the patch does not resolve the described issue) and triviality (the issue reveals the solution) as failure modes that make environments “effectively unsolvable or too simple”, and says the filtering pipeline retains environments at “appropriate difficulty levels that provide the most effective learning signal.” (§1, p. 2). OpenSWE-32B reaches 62.4% and OpenSWE-72B 66.0% on SWE-bench Verified under the SWE-Agent scaffold (Table 3, p. 8). These are Pass@1 values averaged across two runs (§4.1, p. 7), not proof of correctness and not a formal-verification result.

Inference: For VeruLaw, the transferable idea is an executable-task factory whose acceptance predicate includes negative tests, positive tests, and an independent legitimacy check. A Verus task factory would need the same separation between task synthesis and proof/test validation, but its oracle would include `verus!` verification success and specified behavioral tests.

## technique 1: filter source changes before synthesis

What it is. The four-stage GitHub PR filter keeps repositories with at least five stars, Python repositories, PRs linked to a nonempty issue description, and PRs with nonempty changes outside test-only paths. The paper says the dataset entry has “repository identifier, PR number, associated issues, and the complete PR patch encompassing all code modifications.” (§3.2, p. 4).

When to use it. Use this filter when converting real repository changes into executable repair tasks and the goal is to exclude immature repositories, unspecified tasks, and patches that only alter tests (§3.2, p. 4).

How to do it.
1. Collect PR metadata, linked issues, commit sequence, and diffs through GitHub REST and GraphQL APIs (§3.1, p. 3).
2. Keep repositories with at least five stars (§3.2, p. 4).
3. Keep only repositories whose primary language is Python (§3.2, p. 4).
4. Require at least one linked issue with a description (§3.2, p. 4).
5. Require a nonempty patch to non-test code; exclude paths containing names such as `tests`, `spec`, or `e2e` (§3.2, p. 4).

Inference: A Verus adaptation would replace the Python-language filter with a Rust/Verus compatibility filter, require an issue that states a contract or invariant, and reject patches that only change proof assertions unless the benchmark explicitly measures proof maintenance. A candidate task can retain the repository commit and patch while adding a target Verus specification.

Evidence and limits. OpenSWE reports 572,114 GitHub PRs processed by the distributed pipeline and 45,320 validated environments (§3.8, p. 6; §3.9, Table 2, p. 7). The five-star threshold is a proxy for maturity, not a validity proof (§3.2, p. 4). Inference: The filter can omit useful low-star projects and does not establish that an issue expresses the developer's complete intent.

## technique 2: bounded repository exploration

What it is. A repository exploration agent receives repository metadata, commit/version, and patch-derived file cues, then uses three constrained APIs: browse for structure, search for candidate configuration files, and digest for setup and test instructions (§3.3, p. 4). The paper says the interface is “intentionally narrow, encouraging low-cost retrieval centered on high-yield artifacts such as README.md, CONTRIBUTING.md, dependency manifests, and CI workflows.” (§3.3, p. 4).

When to use it. Use bounded exploration before generating a container or evaluation harness when unrestricted repository traversal is expensive or produces irrelevant context.

How to do it.
1. Initialize with repository name, commit/version, and files indicated by the patch (§3.3, p. 4).
2. Browse structure, search for configuration candidates, and digest selected setup/test files (§3.3, p. 4).
3. Start with shallow, document-first inspection when no failure feedback exists (§3.3, p. 4).
4. On missing-context feedback from test analysis, retrieve only requested files or configuration dimensions (§3.3, p. 4).

Inference: For Verus, the digest targets `Cargo.toml`, `verus` configuration, module declarations, existing `requires`/`ensures`, loop invariants, and proof test commands. The narrow interface can reduce prompt cost while preserving the assumptions needed to generate a compilable proof harness.

## technique 3: reproducible, cache-aware container construction

What it is. The Dockerfile agent uses pre-built `openswe-python` images for Python 2.7 and 3.5–3.14, each with conda, a pre-activated testbed, and package mirrors (§3.4, p. 5). It provisions the target commit from a local bare-repository cache using `COPY`, rather than cloning during image construction (§3.4, p. 5). Stable layers are placed early and dependency installation later so dependency revisions reuse cached layers (§3.4, p. 5).

How to do it.
1. Give the Dockerfile agent exploration findings, including special dependencies (§3.4, p. 5).
2. Select a version-matched prebuilt base image (§3.4, p. 5).
3. Copy a prechecked-out target commit from a local repository cache (§3.4, p. 5).
4. Put stable base layers before dependency layers and isolate dependency installation (§3.4, p. 5).
5. Enforce environment activation, development-mode installation, and deferred test execution in prompts (§3.4, p. 5).
6. Iterate using test-analysis feedback if construction or tests fail (§3.4, p. 5).

Inference: A Verus factory would cache Rust toolchains and Verus binaries by version, copy a local checkout, and isolate dependency and proof-harness layers. The container's trusted boundary still includes the compiler, Verus executable, solver, and external crates; a passing build does not prove those components.

The paper reports that these choices remove GitHub rate limits and common network failures and allow layer reuse (§3.4, p. 5). It does not report a per-failure denominator for each optimization. The paper's only explicit speed number here is a 5× speedup from retaining images while only the evaluation script changes (§3.6, p. 6).

## technique 4: structured evaluation scripts with negative and positive controls (the study's terms, not the paper's)

What it is. The evaluation-script agent creates a Bash script that runs issue-relevant tests, can synthesize tests for uncovered scenarios, delimits test output, captures exit codes, and emits `OPENSWE EXIT CODE` (written `OPENSWE_EXIT_CODE=$rc` in the Appendix A.1 prompt, p. 16) as the final correctness signal (§3.5, p. 5). The script is template-based so patch injection is separate from test-command logic (§3.5, p. 5).

How to do it.
1. Identify tests tied to the issue (§3.5, p. 5).
2. Add synthesized cases when the original PR lacks coverage (§3.5, p. 5).
3. Generate a structured script with selected/synthesized tests, exit-code capture, output delimiters, and the `OPENSWE EXIT CODE` marker (§3.5, p. 5).
4. Keep patch injection separate from test-command logic so test invocations can be revised without regenerating the whole script (§3.5, p. 5).
5. Explicitly activate conda environments where needed (§3.5, p. 5).

The validation stage builds the image once and runs the script twice: first with a test-only patch to ensure tests fail on the unpatched code, then with the full fix patch to ensure all tests pass (§3.6, p. 6). “A sample is accepted only when both conditions are met.” (§3.6, p. 6). Missing markers fail validation and produce targeted feedback (§3.6, p. 6). The Appendix A.1 analysis prompt states that the return code for the test-only run “MUST BE non-0” and for the run with the fix “MUST BE 0”, and that pass-to-pass tests may still be reported as success if everything else is correct (p. 17).

Inference: The Verus form uses a negative control containing the bug and a positive control containing the candidate fix, then runs Verus verification and runtime tests in both states. The marker can record a structured result, but it must not replace the verifier's actual exit status. Verus constructs must follow the repository's supported forms: executable functions with `requires` and `ensures`, `spec fn` for specifications, and `proof fn` for erased proofs; no paper evidence supports treating a proof function as runtime code.

## technique 5: post-validation legitimacy analysis

What it is. A test-analysis agent inspects every result. For passes, it checks logs for hardcoded exit codes and shortcuts that bypass tests; for failures, it classifies Dockerfile errors, evaluation-script errors, and inherently unsolvable environments, then returns targeted feedback or marks an early-exit case (§3.7, p. 6). The final dataset keeps only samples passing rule-based evaluation and the legitimacy check (§3.7, p. 6).

Inference: In Verus, legitimacy checks should inspect that the claimed proof command actually verified the target module, that no `external_body` exemption hides the function under test, and that tests exercise the changed behavior. This is an adaptation, not a claim made by the paper.

## technique 6: fault-tolerant distributed synthesis

What it is. OpenSWE uses 64 independent nodes to process about 572,114 PRs. The architecture uses data parallelism, a shared-filesystem message queue, systemd-managed processes, automatic Docker-resource pruning, and Prometheus/Grafana monitoring (§3.8, p. 6). The paper says independent nodes prevent a single failure from stopping the job and that cleanup removes “zombie” containers or orphaned images (§3.8, p. 6).

How to do it. Partition tasks across independent workers; enqueue work on the shared filesystem; run each synthesis process under a restartable service; prune abandoned resources; monitor throughput and failures (§3.8, p. 6). The per-container limits of 4 dedicated CPU cores, a 24 GB memory cap, and a 200 GB storage limit are stated in §3.6 (p. 6); each node is a 32-virtualized-core, 128 GB RAM, 4 TB SSD machine (Table 1, p. 7).

Evidence. The authors report 45,320 validated environments in approximately two weeks on this cluster (§3.8, p. 6); the Appendix B cost estimate assumes “an approximate 10-day construction” run (p. 18), which the paper does not reconcile with the two-week figure. The authors call the per-node specification “a near-optimal operating point” based on “empirical experiments in a small scale” and give no data for it (§3.8, p. 6). Inference: For Verus, independent workers can isolate solver crashes and toolchain versions, while immutable task records preserve reproducibility.

## results, trust, and product threat

OpenSWE-trained models beat SWE-rebench in all four model/scaffold settings in Table 4 (p. 9). For 32B SWE-Agent, OpenSWE is 62.4% versus 50.2%; for 72B SWE-Agent, 66.0% versus 63.4%; for 32B CodeAct, 59.8% versus 51.4%; and for 72B CodeAct, 65.0% versus 62.4%. These are SWE-bench Verified Pass@1 percentages under the stated scaffold and model settings, not counts of independently verified programs. Mixing datasets gives 68.0% for 72B SWE-Agent but lowers 32B SWE-Agent to 61.4% (Table 4, p. 9). The log-step Pearson correlations are r=0.972 (72B CodeAct), 0.911 (72B SWE-Agent), 0.893 (32B SWE-Agent), and 0.882 (32B CodeAct) (§4.3, p. 8); the paper says “none of the four curves show signs of saturation within our current budget” (§4.3, p. 9), which is an observation within its budget, not an asymptotic law.

The general-capability table reports HumanEval gains of 29.09 points (32B) and 9.43 (72B), MATH-500 gains of 8.20 and 12.20, and SuperGPQA gains of 5.77 and 8.10 (Table 5, p. 10). The denominator and exact test protocol for each benchmark are not given in the table; therefore these percentages cannot be converted to sample counts from this paper alone. The abstract says “up to 12 points on mathematical reasoning and 5 points on science benchmarks”, while Table 5 shows SuperGPQA +8.10 for 72B; the abstract's science figure is lower than the table's largest science gain.

What is measured: the paper reports executable-environment counts, construction cost, model benchmark scores, scaling correlations, and transfer scores; it gives no formal proof. Inference: what stays trusted, and outside any formal proof, includes GitHub metadata, repository contents, Docker, Python, dependencies, test design, the Deepseek-v3.2 synthesis model, the analysis agent, benchmark tests, and the base model. Inference: For a product that generates Verus Rust, the main threat is a benchmark that accepts a weak specification or a hardcoded test result while reporting successful verification. The two-control validation and legitimacy analysis reduce this risk, but only a separately checked contract and independently reviewed harness can establish that the proof obligation represents product intent.

## techniques for the catalog

- bounded repository exploration — use narrow browse/search/digest APIs and failure-directed retrieval to gather setup and test evidence

- cache-aware reproducible environments — prebuild toolchain images, copy local commits, and isolate stable and changing layers

- structured negative/positive evaluation — require tests to fail on the unpatched state and pass on the full fix with a parsed result marker

- legitimacy analysis — inspect passing logs for hardcoded exits and classify failures before retaining an environment

- fault-tolerant distributed synthesis — combine independent workers, a shared queue, restartable services, resource limits, cleanup, and monitoring
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The most pronounced gain appears at the 32B SWE-Agent setting, where OpenSWE outperforms SWE-Rebench by 12.2% absolute (62.4% vs. 50.2%)."): I read the whole paper text (main text, references, Appendix A and B) and checked every quotation, number, section and page reference, and technique step in the study against it, and the arXiv link against the paper text. Changed: page references (§3.2 is on p. 4, Table 3 on p. 8, Table 1 and Table 2 on p. 7); moved the per-container limits to §3.6; mapped each Pearson r to its configuration; added the paper's own inconsistencies (9,000 vs 10,000 environments, 10-day vs two-week construction, abstract science gain vs Table 5) and the Appendix A.1 test-analysis rule; relabelled the trust list as Inference. Not checked: the PDF figures and the GitHub release, and no claim in the paper was independently reproduced.
