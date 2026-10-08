LLMs plus static analysis for finding bugs and security holes
(authored by agents unless marked 🧑)

bottom line

- the field has settled into four ways to combine an LLM with an analyzer
    - 1: the analyzer finds candidates, the LLM throws out false alarms
    - 2: the LLM supplies facts the analyzer lacks, e.g. which library calls are dangerous
    - 3: the LLM writes the analyzer, e.g. a Clang checker or a CodeQL query
    - 4: the LLM is the analyzer, reading code with tools, and something else checks its claims
- way 4 is now finding real bugs at a scale nobody expected two years ago
    - Anthropic reports 23,019 flags across 1,000+ open-source projects and a 90.6% true-positive rate on the 1,752 flags that were checked
    - Google, OpenAI, Microsoft, Berkeley, and Singapore groups report CVEs from similar agents
    - the catch: every one of these systems ends with a human or a run that reproduces the bug
- the real bottleneck moved from finding to confirming and fixing
    - Anthropic: “the bottleneck in fixing bugs like these is the human capacity to triage, report, and design and deploy patches”
    - AIxCC: 37.7% to 45.6% of patches that passed the automatic checks were semantically wrong
- the quiet danger is in way 1
    - the best filter in one study still threw away 22% of real bugs
    - Semgrep's own number: its assistant agrees with human experts only 41% of the time on findings it calls false positives
    - a filter that an attacker can steer with a misleading comment is a security hole in itself
- measurement is weak everywhere
    - most papers report precision on their own curated sets
    - two independent studies found that no earlier benchmark reported false-positive rates, or that false-discovery rates on real projects are 9% to 32% even for the best tool
- what we can do, in order of my confidence that it is both new and doable
    - experiment C: a do-no-harm test for warning filters, including planted misleading comments
    - experiment D: use the bug witness to check the patch, not only the bug
    - experiment A: keep checked bug evidence alive across commits (from the first version)
    - experiment B: suppress a warning only with a solver-checked reason (from the first version)

review boundary

- primary sources checked through 7 October 2026 UTC
- reading depth is recorded per entry
    - “read” means I read the method, evaluation, and limitation sections through fetched text
    - “abstract” means abstract or landing page only
    - “secondary” means a news report because the primary page was blocked or paywalled
- the twelve entries from the first version were inspected by the earlier agent; I rechecked only Li et al. (project scale) in its September 2026 revision
- numbers are what the authors report; no result was reproduced
- the sibling file covers [analysis without LLMs](static_analysis_classical.md); proof-based verification of Rust belongs to the formal verification study

what must be checked

- a witness is evidence for a particular claim
    - example: an input and a run that reaches an invalid memory access
    - example: a mechanically checked derivation that a code path cannot execute
- a solver checks the formula it receives
    - acceptance does not show that the LLM translated the source correctly
- separate four claims
    - the cited code locations exist in this repository version
    - the path matches the original program's operations and calls
    - the input satisfies the actual environment and entry-point requirements
    - the claimed bad behavior occurs or follows from the checked semantics
- reject unsupported conclusions
    - failure to generate a bug trigger does not establish safety
    - a clean warning list does not establish absence of all bugs
    - agreement among several LLM reviewers is not evidence; see Refute-or-Promote below

way 1: the LLM filters analyzer warnings

- what the evidence says
    - filters remove most false alarms on benchmarks, 72% to 98% depending on the paper
    - every paper that measured it also lost real bugs, and the loss is worst on policy-style rules such as weak cryptography
    - results swing by model and by dataset; one model went from F1 0.910 on OWASP to 0.372 on real alerts
- Wen et al., [LLM4SA](https://doi.org/10.1145/3653718), 2024 (abstract; the DOI came from a search result I could not open before my web quota ran out)
    - slices code along program dependences from the warning, then asks the LLM with domain hints and examples
    - abstract: “high precision (81.13%) and recall (94.64%) for a total of 9,547 bug warnings”
- Mohajer et al., [SkipAnalyzer](https://arxiv.org/abs/2310.18532v2), 2023 preprint (abstract)
    - ChatGPT as detector, false-positive filter, and patcher for null dereference and resource leaks on Infer warnings
    - 268 bugs from 10 projects; false-positive filter precision 93.88% and 63.33% for the two bug types
- Li, Hao, Zhai, and Qian, [LLift](https://arxiv.org/html/2308.00245v3), OOPSLA 2024 (first version; arXiv v3)
    - their abstract: “precision (50%)”
    - static analysis proposes use-before-initialization candidates in Linux; the LLM decides whether a callee initializes the value under the path conditions
    - 13 previously unknown bugs
    - §6.3 bounds recall to the evaluated samples; §6.7 reports confused variable identities and missing analyzer facts
    - my take: better facts from the frontend matter as much as a stronger model
- Du et al., [LLM4PFA](https://arxiv.org/html/2506.10322v1), June 2025 preprint (first version)
    - extracts branch conditions, retrieves value ranges, generates SMT queries for feasibility
    - filters 72% to 96% of false positives; abstract: “only misses 3 real bugs of 45 true positives”
    - my take: even solver-backed filtering discards real bugs when the extracted constraints are wrong
- Du et al., [false positives in industry](https://arxiv.org/html/2601.18844v1), January 2026 preprint (first version)
    - Tencent software, enterprise analyzer, “433 alarms (328 false positives, 105 true positives)”
    - hybrid techniques remove 94% to 98% of false positives; manual review costs 10 to 20 minutes per alarm
    - “the dataset cannot be released due to confidentiality”
- Iranmanesh et al., [ZeroFalse](https://arxiv.org/html/2510.02534), October 2025 preprint (read)
    - CodeQL alerts become a “structured contract” with dataflow trace, code context, and a per-CWE checklist, then a JSON verdict
    - OWASP Java: 1,974 cases; best “F1=0.912” (grok-4)
    - OpenVuln, 58 real alerts from seven Java projects: gpt-5 “F1 = 0.955”, gemini-2.5-pro “F1 = 0.372” despite 0.910 on OWASP
    - authors warn models can “overfit to benchmark patterns that do not exist in the wild”
    - my take: a filter must be re-validated per analyzer, language, and model; a benchmark score does not transfer
- Xiong and Zhang, [Sifting the Noise](https://arxiv.org/html/2601.22952v1), January 2026 preprint (read, first 100k characters)
    - coding agents Aider, OpenHands, SWE-agent as filters over CodeQL, Semgrep, SonarQube, Joern
    - OWASP Benchmark v1.2, 2,740 Java cases, baseline false-positive rate 98.3%; best setup “reduces the remaining FPR to 6.3%”
    - the same best setup “incorrectly labeled 314 true vulnerabilities as FPs, resulting in a TP retention of 77.7% and a miss rate of 22.25%”
    - 50 real Vul4J alerts: up to 93.3% of false positives identified
    - cost from \$0.0028 per run (Aider, DeepSeek) to \$0.1867 per task (OpenHands, Claude)
    - my take: this is the clearest published number for the cost of letting an LLM have final say; 22% of real bugs gone
- Klieber, Svoboda, Flynn, and Martins, [LASAA](https://arxiv.org/html/2607.09979v1), July 2026 preprint (first version)
    - repeated judgments, compared reasoning, optional LLM-written test driver that must trigger the defect and respect preconditions
    - their conclusion: “the absence of a trigger is not exoneration”
    - Table 12: on “FormAI, 76 alerts”, the dynamic tool confirmed 18 of 30 true positives; no false positive got a valid trigger
    - alerts were not from a live analyzer; real repositories are future work; contamination acknowledged
- Semgrep, [how we built an AppSec AI that security researchers agree with 96% of the time](https://semgrep.dev/blog/2025/building-an-appsec-ai-that-security-researchers-agree-with-96-of-the-time/), 2025 (read)
    - population: “a dataset of over 2,000 findings” that Semgrep's researchers “meticulously triaged”
    - context given: rule metadata, prior triage decisions, examples, “Assistant Memories”, and “several dozen lines of code surrounding the finding … alongside additional lines of code at each step of the finding's data flow”
    - the 96% is agreement on true positives; agreement on false positives started at “25% of the time” and ended at “41%”
    - the post admits it is “highly likely for Assistant to tell a developer to ignore something our security research team would classify as a real issue”
    - companion post: the assistant [handles about 60% of incoming triage](https://semgrep.dev/blog/2025/semgrep-is-confidently-handling-60-of-all-triage-for-users-without-reducing-coverage) (secondary snippet)
    - my take: the one vendor that published the split shows the filter is good at confirming bugs and poor at dismissing them; that is the opposite of what a filter is for

way 2: the LLM supplies facts the analyzer lacks

- what the evidence says
    - the missing facts are mostly library behavior: which calls are sources, sinks, sanitizers, error returns, or taint carriers
    - supplying them roughly doubles recall of CodeQL-style analyzers in three independent papers
    - the inferred facts are assumptions; nobody checks them against the library's actual code
- Chapman et al., [interleaving static analysis and LLM prompting](https://thakur.cs.ucdavis.edu/assets/pubs/SOAP2024.pdf), SOAP 2024 (abstract)
    - prompts built from intermediate analysis results; answers fed back into the analysis
    - error-specification inference for C: recall from 52.55% to 77.83% average, F1 from 0.612 to 0.804 versus EESI
- Li, Dutta, and Naik, [IRIS](https://arxiv.org/html/2405.17238v3), ICLR 2025 (first version)
    - LLM labels APIs as sources and sinks, emitted as CodeQL predicates; LLM also re-judges reported flows
    - CWE-Bench-Java: 55 of 120 known vulnerabilities versus 27 for stock CodeQL; four new vulnerabilities
    - §7: cost, misses, unknown transfer to other languages
- Lin, [AdaTaint](https://arxiv.org/html/2511.04023), November 2025 preprint (read)
    - candidates from “lexical cues”, “docstrings & comments”, “commit history”; LLM votes source, sink, or neither; a classifier over path length, sanitization, and feasibility prunes flows
    - reported precision 84.3% versus IRIS 81.2%; “reduces false positives by 43.7% on average and improves recall by 11.2%”
    - the author notes “adversarial inputs or misleading comments could bias LLM classification”
    - single independent author; venue listed oddly; treat numbers as unreviewed
- Ghebremichael et al., [SemTaint](https://arxiv.org/html/2601.10865v1), January 2026 preprint (read, first 100k characters)
    - three agents for npm packages: source/sink, call-graph repair for unresolved calls, and library flow summaries; all emitted as CodeQL external predicates
    - 162 vulnerabilities CodeQL could not find: “SemTaint identified the vulnerability in 106 instances, which represents a recall of 65.43%”
    - 73% of detections needed only custom sources and sinks; 27% also needed call-graph repair
    - call-repair cut agent calls by 94.5%; four new npm vulnerabilities
    - limits: callbacks not modeled, 21 packages over 1M tokens excluded, dataset ends June 2021, sanitizer over-approximation unsolved
- Li, Jiang, Chen, and Xiong, [project-scale study](https://arxiv.org/html/2601.19239v2), September 2026 revision (read; see evaluation section for details)
    - “A considerable portion of FNs and FPs is due to the incomplete and incorrect modeling of project-specific APIs”
    - my take: API modeling is the single biggest shared failure across ways 1, 2, and 4, and it is checkable against the library's code, which nobody does yet

way 3: the LLM writes the analyzer

- what the evidence says
    - LLMs can write Clang checkers and CodeQL queries that compile and that catch the seed bug plus its siblings
    - the trick that makes it work is a cheap, mechanical validity test: the checker must fire on the buggy version and stay quiet on the patched one
    - these systems keep the analyzer sound-ish and the LLM out of the loop at scan time, so scanning a kernel costs nothing per run
- Yang et al., [KNighter](https://arxiv.org/html/2503.09002v3), SOSP 2025 (read)
    - from a Linux patch: bug-pattern analysis, plan synthesis, checker code with syntax repair, then validation; an LLM triage agent later refines away false positives
    - validity rule: “A checker is considered valid if Nbuggy > Npatched and Npatched < Tvalid, where Tvalid is a threshold value (50 by default)”
    - 61 patches in 10 categories; 39 valid checkers; false-positive rate “32.2%” after triage
    - 92 new bugs, 77 confirmed, 57 fixed, 30 CVEs, average latency 4.3 years; kernels v6.9 to v6.15 with allyesconfig
    - cost: “approximate cost of \$0.24 per commit using O3-mini”; 15.9 hours total synthesis
    - limits: “highly complex bug patterns, particularly those involving state-machine reasoning, such as use-after-free, and concurrency issues”
- Wu et al., [BugStone](https://proceedings.mlr.press/v306/wu26bk.html), ICML 2026 (first version)
    - LLVM analysis plus LLM-written error patterns from “a single patched instance”
    - 92.2% precision on its constructed set; separate Linux audit confirmed 246 of 400 sampled issues
    - the two precision populations differ
- Wang, Li, Dutta, and Naik, [QLCoder](https://arxiv.org/html/2511.08462v4), ICLR 2026 (read)
    - agent loop over CodeQL with AST guidance, documentation retrieval, and execution feedback; up to 10 iterations and 50 tool calls each
    - a query succeeds only if it compiles, flags the vulnerable version through the patched code, and is silent on the fixed version
    - CWE-Bench-Java, 176 CVEs in 111 projects, CodeQL 2.22.2: 100% compile, 53.4% success; best agentic baseline Gemini CLI 19% and 0%
    - F1 0.7 versus 0.048 for IRIS and 0.073 for CodeQL's own suite; on 130 shared CVEs recall 80% versus 35.4% and 20%
    - \$2.90 and 3,712 seconds per CVE
    - post-cutoff drop: 46.2% success on 2025 CVEs versus 57.7% on older ones
    - needs the patch commit hash from CVE metadata
    - my take: the IRIS comparison is partly unfair, since IRIS gets no patch; the fair reading is that a known fix is worth a lot of recall
- Irsan et al., [a study on automatic query generation](https://arxiv.org/html/2609.10412), September 2026 preprint (read)
    - CodeQL queries from NVD entries for 112 Java CVEs in 10 top-25 CWEs
    - “263% increase in the detection rate over the CodeQL baseline, rising from 19 to 50 detected vulnerabilities”; “82% improvement of average F1-Score”
    - best model generated 96 queries for “\$12.99” total
    - limits: high false positives need manual filtering; weak on interprocedural bugs; dead code triggers alerts
- Xia et al., [SymGPT](https://dl.acm.org/doi/10.1145/3798217), OOPSLA 2026 (first version)
    - GPT translates Ethereum token standards into a rule language; symbolic execution checks contracts
    - 132 rules, 4,000 contracts, 5,783 reported violations; threats: “absence of dynamic validation for the detected violations”
- Shakevsky, Villa, Stoica, and Popa, [Antiproof](https://arxiv.org/html/2607.12316), July 2026 preprint (read, first 100k characters)
    - LLM synthesizes high-recall detectors as traversals over an extended code property graph, then LLM writes an executable proof of exploitability that an oracle checks against the environment state
    - “Antiproof detects 64 of 66 vulnerabilities with gpt-5.5, outperforming the strongest primary baseline, Semgrep, by 71 percentage points”
    - 50 projects, 136M lines: “17,574 vulnerability candidates, 1,212 PoVs, and accepted 510 PoEs”; 12 CVEs in Ray, SGLang, vLLM, LiteLLM
    - limits: “Antiproof can only find vulnerabilities that the synthesized detectors detect”; reports may fall “outside the threat model of the target system”
    - my take: this is ways 3 and 4 welded together, with the proof-of-exploit as the checker; the 17,574 to 510 funnel shows how much the detectors over-approximate

way 4: the LLM is the analyzer, with tools and a checker

- what the evidence says
    - agents with code browsers, debuggers, and sandboxes now find real memory bugs and web bugs at scale
    - every credible system validates: run the exploit, reproduce the crash, or have an expert confirm
    - costs are hundreds of dollars per large repository, falling fast
    - the published failure cases are consensus hallucinations and misread sanitizers, not syntax
- Wang et al., [LLMDFA](https://chengpeng-wang.github.io/publications/LLMDFA_NeurIPS2024.pdf), NeurIPS 2024 (first version)
    - LLM writes parsers for values, summarizes intra-function flows, writes solver queries for path conditions
    - 87.10% precision and 80.77% recall averaged over its tasks; §4.7: path conditions can be wrong, big functions and pointers remain hard
- Wang et al., [NESA, formerly LLMSA](https://arxiv.org/abs/2412.14399), FSE 2026 (abstract)
    - a Datalog-like policy language splits an analysis into small syntactic parts done by parsing and small semantic parts done by prompting
    - custom taint detection “precision of 66.27%, a recall of 78.57%”; 13 real memory leaks fixed by developers
- Guo, Wang, Xu, Su, and Zhang, [RepoAudit](https://arxiv.org/html/2501.18160v3), ICML 2025 (first version)
    - demand-driven exploration without a build; 78.43% precision on benchmark; 185 new bugs, 174 confirmed or fixed
    - validators include LLM judgments; Li et al. measured it at \$172.77 average per project
- Ceka et al., [can LLM prompting serve as a proxy for static analysis](https://arxiv.org/abs/2412.12039), December 2024 preprint (abstract)
    - security-aware prompts on partial code beat CodeQL and CodeGuru on their setup; F1 up to 71.7% higher
    - my take: partial code is exactly where analyzers cannot run, so this is not a like-for-like comparison
- Google Project Zero, [from Naptime to Big Sleep](https://projectzero.google/2024/10/from-naptime-to-big-sleep.html), October 2024 (read)
    - tools: code browser, debugger, Python, reporter
    - task was variant analysis: given “both the commit message and a diff for the change”, review HEAD “for related issues that might not have been fixed”
    - found a stack buffer underflow in SQLite's `seriesBestIndex`; fuzzing missed it because “the harness used by OSS-Fuzz isn't built with the generate_series extension enabled”
    - “these are highly experimental results … it's likely that a target-specific fuzzer would be at least as effective”
    - August 2025 reports of 20 more open-source bugs from Big Sleep are [secondary](https://securityaffairs.com/181338/security/google-fixed-chrome-flaw-found-by-big-sleep-ai.html); I found no primary write-up with details
- Microsoft, [Security Copilot finds bootloader bugs](https://www.microsoft.com/en-us/security/blog/?p=138219), March 2025 (secondary via [BleepingComputer](https://bleepingcomputer.com/news/security/microsoft-uses-ai-to-find-flaws-in-grub2-u-boot-barebox-bootloaders))
    - 20 bugs in GRUB2, U-Boot, Barebox, mostly filesystem parser overflows; CVE-2025-0678 CVSS 7.8
    - Microsoft says the tool saved about a week of manual review; the human picked the target area and confirmed
- OpenAI, [introducing Aardvark](https://openai.com/index/introducing-aardvark), October 2025 (secondary; primary page returned 403)
    - pipeline: repository threat model, commit scanning, sandbox reproduction, Codex patch
    - reported: 92% of known or synthetic bugs on “golden” repos; in a 30-day beta, 1.2M commits scanned, 792 critical and 10,561 high findings, ten CVEs
    - renamed Codex Security in March 2026 per secondary reports
    - my take: the 92% is on OpenAI's own test repos with no false-positive figure; the 11,353 findings have no published validation rate
- Anthropic, [Project Glasswing: an initial update](https://www.anthropic.com/research/glasswing-initial-update), 22 May 2026 (read)
    - Claude Mythos Preview flagged 23,019 potential vulnerabilities in 1,000+ open-source projects; 6,202 estimated high or critical
    - 1,752 high or critical flags were assessed by “one of six independent security research firms, or in a small number of cases by ourselves”; “90.6% (1,587) have proved to be valid true positives”; “62.4% (1,094) were confirmed as either high- or critical-severity”
    - partners reported “more than ten thousand high- or critical-severity vulnerabilities” in one month
    - fixing lags: “On average, a high- or critical-severity bug found by Mythos Preview takes two weeks to patch”; 75 of 530 reported high or critical bugs patched at the time of the post
    - “even at our relatively slow pace of disclosures, Mythos Preview is adding to an already-overloaded security ecosystem”
    - my take: the 90.6% is on a human-chosen subset of the highest-rated flags, so the whole-population precision is unknown; still, this is the largest validated LLM bug-finding result published
- Zhang, Li, Lo, et al., [TitanCA](https://arxiv.org/html/2604.17860), April 2026 preprint (read)
    - four modules: similarity matcher over 40,000 samples, a fine-tuned filter, a four-agent “courtroom” inspector, and a deployment feedback adapter
    - 127,000+ repositories, 203 confirmed zero-days, 118 CVEs
    - the filter “reduces the false positive rate from 28% to 20% under balanced conditions while preserving over 77% recall”
    - lesson: “false positives are more operationally damaging than false negatives”, so they optimize F0.3
    - end-to-end fine-tuning produced “an unmanageable volume of false positives”
    - function level only; no repair
- Agarwal, [Refute-or-Promote](https://arxiv.org/html/2604.19049), April 2026 preprint (read)
    - adversarial reviewers with fresh context try to kill each candidate; a mandatory runtime test gate; a cross-model critic
    - “killed ∼79% of ∼171 candidates before advancing to disclosure”; 4 CVEs; about \$62 per CVE
    - the key failure: “ten dedicated agents … unanimously confirmed a CMS Bleichenbacher padding oracle … that did not exist”; only the runtime test caught it
    - “No vulnerability was discovered autonomously; the contribution is external structure that filters LLM agents' persistent false positives”
    - single author, no peer review; the Bleichenbacher anecdote is the useful part
- Korda and Evron, [OpenAnt](https://arxiv.org/html/2606.19149), June 2026 preprint (read)
    - AST parsing, reachability filter that drops about 97% of functions, exposure classification, detection, adversarial self-check, then exploit execution in containers
    - 8 repositories in 6 languages: 376 flagged, 190 confirmed by the adversarial step, 144 dynamically verified; \$1,461.25 total, about \$23,700 without the reachability filter
    - “Race conditions and distributed system exploits may require coordinated interactions” beyond the container
    - my take: the cheap static reachability step is what makes the LLM affordable; that is a way-2 trick inside a way-4 system
- Park and Yun, [agentic fuzzing](https://arxiv.org/html/2605.10074), May 2026 preprint (read, first 100k characters)
    - “Given a reference bug, the agent analyzes its root cause, hypothesizes new scenarios elsewhere in the codebase that may share that cause, and verifies each hypothesis by generating and running proof-of-concept code”
    - AFuzz: 40 V8 bugs in about a month from about 750 of 3,146 seeds; \$35,000 bounty; two CVEs; 19 bugs in SpiderMonkey and JavaScriptCore from V8 seeds
    - open problems named: cost effectiveness, no reference bug, design uncertainty; design choices “heuristic and fragile across model generations”
    - my take: the seed-bug pattern is the same one Big Sleep, KNighter, and BugStone use; variant hunting is the most reliable job for an LLM here
- Zhang et al., [SoK: DARPA's AI Cyber Challenge](https://arxiv.org/html/2602.07666v1), February 2026 preprint (read)
    - final: about 143 hours, 53 projects, 63 injected vulnerabilities, 7 teams, \$85K compute and \$50K LLM credit each; 25 real zero-days found as a side effect
    - [DARPA's own page](https://darpa.mil/news/2025/aixcc-results): 54M lines, 86% of synthetic bugs found, 68% patched, average \$152 per task (secondary snippet)
    - “CRSs find 22 PoVs that PF cannot, thanks to LLM-driven code understanding”
    - “Stability and accuracy were deciding factors in CRS performance”; “a CRS that reliably applies foundational techniques in real-world conditions would rank among the top three”
    - patches: semantically wrong patches passed validation at 37.7% to 45.6%
    - static analyzers (CodeQL, Semgrep, Infer) appeared mainly inside patching pipelines for context
    - injected bugs were “manually crafted synthetics inspired by historical N-day issues”
    - my take: fuzzing plus LLM beat LLM-driven static analysis in this setting; the competition rewarded reliability, not cleverness

how such tools are evaluated, and why the numbers mislead

- the datasets are the first problem
    - Ding et al., [PrimeVul](https://arxiv.org/abs/2403.18624), 2024 (abstract): a 7B model scores 68.26% F1 on BigVul and 3.09% on PrimeVul after fixing labels and duplicates; GPT-4 is near random in the strict pair setting
    - Ullah et al., [LLMs cannot reliably identify and reason about security vulnerabilities (yet?)](https://arxiv.org/abs/2312.12575), IEEE S&P 2024 (abstract): 228 scenarios, eight models; renaming variables or adding library functions flips answers in 26% and 17% of cases for PaLM2 and GPT-4
- micro-benchmarks flatter LLMs
    - [CASTLE](https://arxiv.org/html/2503.09433), 2025 preprint (read; author list not captured): 250 hand-written C programs, 25 CWEs, 13 analyzers, 10 LLMs, ESBMC and CBMC
    - reasoning models top the score (GPT-o3 Mini 977 of 1,250) and the best analyzer, ESBMC, scores 661; CBMC had zero false positives but misses injection bugs
    - the authors: “LLMs tend to report false positives when dealing with larger codebases” and “microbenchmark-based study is its limited scope”
- real repositories reverse the picture
    - Li, Jiang, Chen, and Xiong, [project-scale study](https://arxiv.org/html/2601.19239v2), September 2026 revision (read)
        - RepoAudit, KNighter, IRIS, LLMDFA, INFERROI, Codex, Claude Code, CodeQL, Semgrep, SpotBugs, Clang Static Analyzer
        - 265 known vulnerabilities, 8 CWEs, C/C++ and Java; 24 live projects; 6,442 sampled warnings labeled with Codex help and stratified manual checks
        - best recall per CWE goes to Claude Code, e.g. 80.00% on CWE-401 and 89.80% on CWE-078
        - “lowest overall SFDR being 9.09% for C/C++ and 31.82% for Java”
        - false positives: 3,734 of 5,896 (63.33%) are “incorrect program-point classification”, 861 (14.60%) are “truncated interprocedural context”
        - cost: Claude Code \$1.77 and 2.4 minutes per warning; Codex \$2.93 and 8.1 minutes; LLMDFA over \$24 per warning; RepoAudit \$172.77 per project; analyzers near zero
        - one run per configuration; Codex-assisted labels; Java and C/C++ only
        - my take: general coding agents beat the specialized research tools on recall and cost; the research tools' extra machinery mostly buys structure, not accuracy
- false-positive rate is rarely reported for agents
    - Dahiya et al., [dual-mode benchmark](https://arxiv.org/html/2605.23243), June 2026 preprint (read): five production-style Python web apps, 118 bugs; “every frontier model produces 10–50% false positive rates in white-box detection”; black-box agents reach 4% to 8% coverage; authors claim “no prior benchmark reports false positive rates”
    - the claim is too strong, Li et al. above report false-discovery rates, but the point stands for agent-style benchmarks
- unseen-bug benchmarks stay hard
    - Lau et al., [ZeroDayBench](https://arxiv.org/abs/2603.02297), ICLR 2026 workshop (abstract): 22 novel vulnerabilities; “frontier LLMs are not yet capable of autonomously solving our tasks”
    - this sits oddly next to Glasswing's thousands; the difference is probably the model generation and the validation budget, and nobody has run the same model on both
- surveys
    - Wang, Ni, Lee, and Zhao, [a contemporary survey of LLM-assisted program analysis](https://arxiv.org/abs/2502.18474), 2025 (abstract): splits work into static, dynamic, hybrid
- what a fair evaluation needs, inferred from the above
    - real repositories with known and fixed versions, not synthetic programs
    - false-positive rate or false-discovery rate on the full warning stream, not on a chosen subset
    - cost per confirmed bug, in dollars and human minutes
    - several runs per configuration
    - a post-training-cutoff split, since QLCoder dropped 11 points on 2025 CVEs
    - a check that benchmark bugs were not in training data, which nobody can do for closed models

what this says about the human's question “what are the huge security holes”

- the holes the tools keep finding are old and boring
    - KNighter's kernel bugs averaged 4.3 years old; Microsoft's were filesystem parsers; Big Sleep's was a sentinel value in an index function
    - these were not found earlier because nobody wrote the specific check and fuzzers did not reach the code
    - so the “huge hole” is coverage, not cleverness: large codebases have more unchecked paths than humans will ever read
- the second hole is the pipeline after detection
    - Glasswing: two weeks to patch, 75 of 530 patched; AIxCC: up to 45.6% of accepted patches wrong
    - a flood of correct reports that nobody can fix is a different failure from a flood of false ones, and it is the one we are entering
- the third hole is the LLM in the security loop itself
    - a filter that dismisses 22% of real bugs, or agrees with experts 41% of the time on dismissals, creates a blind spot a reviewer trusts
    - AdaTaint's author says “misleading comments could bias LLM classification”; Ullah et al. showed variable renames flip 26% of answers
    - I found no paper that measured how easily a committer can make an LLM triage step wave through a planted bug; this is experiment C

experiment C: a do-no-harm test for LLM warning filters

- hypothesis
    - current LLM filters dismiss real bugs at rates that vary by bug class, and a committer can raise that rate with cheap edits that do not change behavior
- prototype
    - take real analyzer warnings from bug-bearing commits of C/C++ and Java projects where the fix is known
    - filter with three published setups: a ZeroFalse-style single prompt, a Sifting-the-Noise-style coding agent, a LASAA-style repeated judgment with trigger attempt
    - then apply behavior-preserving edits near the bug: a reassuring comment, a renamed variable, a wrapper function named like a sanitizer, a dead check
    - measure how many real bugs each filter dismisses before and after the edits
- compare
    - unfiltered analyzer output
    - a filter that may only dismiss with a solver-checked infeasibility reason, i.e. experiment B
    - independently checked all-path infeasibility under explicit entry and environment assumptions
        - an ordinary passing driver cannot establish unreachability
- measures
    - real bugs dismissed per bug class, with and without edits
    - false alarms kept
    - cost per kept warning
    - which edit works best against which filter
- falsification
    - if edits do not move dismissal rates, the attack story dies and the paper is only a measurement
    - if solver-checked dismissal loses more real bugs than the LLM filter, the checked route is not worth its cost
- novelty uncertainty
    - adversarial robustness of LLM vulnerability detectors exists as a topic; Ullah et al. measured renames
    - I did not find the combination of a live analyzer, real warnings, and committer-side edits; search “adversarial code comments LLM triage” before starting
    - Semgrep's 41% and Sifting the Noise's 22% suggest the baseline loss alone is publishable if measured on real warnings

experiment D: the witness checks the patch

- hypothesis
    - a kept, replayable bug witness lets us reject wrong patches that pass tests, and the rejection rate is high enough to matter
- why now
    - AIxCC: 37.7% to 45.6% of automatically accepted patches were semantically wrong
    - Glasswing: the queue is patches, not findings
    - GitHub's [Copilot Autofix](https://github.blog/changelog/2024-08-14-copilot-autofix-for-codeql-code-scanning-alerts-is-now-generally-available/) ships LLM patches for CodeQL alerts with no public wrong-patch rate (secondary snippet)
- prototype
    - for each confirmed warning, keep the witness from experiment A: input, entry point, build flags, sanitizer report
    - let an LLM propose a patch
    - accept only if the witness no longer fails, the test suite passes, and a second LLM-written witness variant also no longer fails
    - record the dependency set the witness touched so a later commit that changes it re-runs the check
- compare
    - tests only
    - tests plus original witness
    - tests plus original and variant witnesses
    - human review of a sample for semantic correctness, as AIxCC did
- measures
    - wrong patches accepted under each gate
    - correct patches rejected
    - time and tokens per accepted patch
- falsification
    - if the witness gate rejects few wrong patches beyond tests, the extra machinery is not worth it
    - if variant witnesses reject many correct patches, the gate is too strict
- novelty uncertainty
    - AIxCC teams used proof-of-vulnerability replay to validate patches; the SoK says “a patch must remediate every PoV targeting its claimed vulnerability to be considered valid”
    - the new part is keeping the witness as a maintained artifact with dependency tracking, and measuring the semantic-wrong rate outside a competition

experiment A: checked evidence under change

- hypothesis
    - recording code and environment dependencies lets an analyzer safely reuse checked evidence across commits
    - fewer expensive LLM calls without more stale bug confirmations
- prototype
    - one memory bug category in three buildable C/C++ repositories
    - take actual analyzer warnings
    - let the LLM propose a driver or a smaller relevant slice
    - compile and run against original code with an appropriate runtime checker
    - require a real entry point or explicit validated entry requirements
    - record source, compiler options, dependencies, inputs, and observed failure
- compare
    - static analyzer alone
    - LASAA-style repeated judgment and trigger generation
    - RepoAudit or a general coding agent, which Li et al. found cheaper and more accurate
    - full evidence regeneration after every edit
    - dependency-aware evidence reuse
- crucial controls
    - no weakening entry requirements to make a driver succeed
    - no modifying the suspected code to create a failure
    - revalidate dependencies after library, configuration, or callback changes
    - report unsupported warnings and timeouts as unresolved
    - distinguish a test result from proof that all executions are safe
    - rerun full analysis before and after edits as an independent comparator
    - track reused no-warning conclusions separately from positive bug witnesses
        - inject newly reachable bugs through callees, callbacks, headers, build flags, and environment models
        - include introductions outside changed lines
        - invalidate clean conclusions when their assumptions change
- measures
    - independently confirmed bugs per fixed budget
    - accepted invalid triggers
    - confirmed bugs lost after edits
    - newly found bugs missed by reuse, stale confirmations, and unresolved analyses separately
    - evidence reuse rate, runtime, tokens, and human review time
- falsification
    - any accepted trigger requiring an invalid environment defeats the checker claim
    - regeneration outperforming reuse after accounting for dependency tracking rejects the optimization
    - no advantage over targeted symbolic execution weakens the need for an LLM
- novelty uncertainty
    - witness generation, validation, caching, and incremental analysis all exist
    - Beyer and Spiessl, [MetaVal](https://www.sosy-lab.org/research/pub/2020-CAV.MetaVal_Witness_Validation_via_Verification.pdf), CAV 2020
        - their abstract: “validated independently from the verification in a second step”
        - transforms a program and witness into another verification task for an existing verifier
    - [incremental predicate analysis](https://feihe.github.io/materials/oopsla20b.pdf) reuses checked assertions across versions; see the classical review
    - the possible contribution concerns maintained LLM-generated evidence and its relationship to the original code
        - maintaining abstract claims across edits is already established below

incremental analysis already has strong correctness baselines

- Stein, Chang, and Sridharan, [Demanded Summarization, TOPLAS 2024](https://manu.sridharan.net/files/TOPLAS24DemandedSummarization.pdf), selected §§4–6 and theorem A.3
  - authors: “Query results are equal to the corresponding invariant computed by tabulation”
  - dependency graph invalidates affected abstract results after procedure/control-flow edits
  - theorem relies on the stated abstract-interpreter model
    - recursion treatment includes a no-mutual-recursion simplification
  - prototype tests synthetic edits and real Java changes
    - upfront application-only WALA call graph excludes incremental virtual-call resolution from the experiment
  - maintained abstract results have a consistency guarantee
    - this does not establish that an arbitrary LLM slice represents the original repository
- Razafintsialonina et al., [Reusing Caches and Invariants, ECOOP 2025](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ECOOP.2025.28), formal reuse conditions and §7
  - authors: “reuse of loop invariants might introduce imprecision”
  - Frama-C/Eva reuses summaries and checks prior loop invariants under its sound algorithm
  - evaluation retains 41 PolarSSL, 107 Monocypher, and 119 Chrony commits
    - preconfigured annotations; commits must parse and complete analysis
    - changed analysis parameters were not experimentally explored
  - sound overapproximation and exact fresh-analysis agreement differ
    - reused analysis can report different alarms while remaining sound
- consequence for experiment A
  - dependency-aware reuse and preservation of clean conclusions are established requirements
  - define whether the target is soundness, preserved precision, or exact fresh-run agreement
  - candidate increment: faithfully maintain LLM-generated contexts and witness assumptions
    - independently check entry points, environment models, and slice-to-original coverage
  - compare these classical baselines rather than only regenerating LLM prompts

experiment B: suppress warnings only with checked reasons

- hypothesis
    - independently extracted code semantics prevent wrong LLM constraints from clearing real bugs
- prototype
    - LLM chooses relevant context and proposes candidate infeasibility conditions
    - a compiler-based extractor constructs supported path semantics from original code
    - a solver checks contradiction under declared environment assumptions
    - unsupported language constructs leave the warning unresolved
- baselines
    - LLM4PFA, ordinary solver-based filtering, and unfiltered analyzer output
    - an LLM-only filter measures the cost of giving the model final authority; Sifting the Noise gives the first number, 22% of real bugs
- evaluate
    - actual warnings from bug-bearing and fixed repository versions
    - include long call chains, error paths, callbacks, macros, and unavailable libraries
    - held-out repositories and versions to reduce memorization
- falsification
    - clearing a reproducible real bug defeats the claimed suppression rule
    - suppressing too few warnings to offset checker cost rejects practical usefulness
- scope limit
    - checking one path cannot dismiss a warning representing multiple paths
    - LLM4PFA already does solver-backed filtering; the difference must be that the semantics come from the compiler, not the LLM

ideas I considered and dropped

- another LLM-writes-CodeQL system: QLCoder, Irsan et al., and SemTaint already cover it; the remaining gap is fairness of comparison to IRIS, not a new system
- another agent that finds zero-days: Glasswing, Aardvark, TitanCA, Antiproof, OpenAnt are far ahead on resources
- LLM-synthesized checkers for Rust: belongs to the Rust study; KNighter's recipe would transfer to Clippy or MIR-based lints, which I did not search

gaps in this review

- I read QLCoder, SemTaint, Sifting the Noise, Antiproof, and the agentic fuzzing paper only up to their first 100,000 characters of fetched text; threats sections may be partly missed
- Aardvark's primary page was blocked; all Aardvark numbers are from reposts
- Chapman et al. and the ICLR PDF of QLCoder did not extract as text; I used the arXiv version for QLCoder and the abstract for Chapman
- I did not search Rust-specific or smart-contract-specific LLM analysis beyond what was already here
- ARQ (agentic CodeQL refinement, arXiv 2608.20637) and CodeCureAgent (FSE 2026) appeared in search and were not read
- no ChatGPT consultation; the tool was unusable during this session
- my web quota ran out at the end, so the CASTLE author list and the LLM4SA DOI record were not confirmed
