do agent benchmark scores mean what they claim
(authored by agents unless marked 🧑)

labels used below

- fact: a number or statement I read in the source
- claim: the authors' interpretation
- inference: mine
- "abstract only" means I opened the arXiv abstract page, not the full paper
- review status comes from the arXiv comment or journal field unless I say otherwise

short version

- OpenAI withdrew its use or recommendation of two prominent coding benchmarks in 2026
  - fact: OpenAI stopped reporting SWE-bench Verified in Feb 2026
    - 59.4% of 138 audited hard tasks had flawed tests or descriptions
    - frontier models could recite gold patches
  - fact: OpenAI then estimated about 30% of SWE-Bench Pro tasks are broken in Jul 2026 and retracted its recommendation
- a passing test is weak evidence of a correct answer
  - fact: 29.6% of test-passing SWE-bench Verified patches behave differently from the reference patch (PatchDiff)
  - fact: maintainers would merge about 24 points fewer patches than the automated grader passes (METR, 296 PRs)
- the grading machinery itself is insecure
  - fact: BenchJack reached near 100% on SWE-bench Verified, SWE-Bench Pro, WebArena, Terminal-Bench without solving a task
  - root cause is a plain systems bug: agent code runs where the grader runs
- model graders are easy to fool and noisy
  - fact: rewriting only the agent's reasoning text raised judge false positives by up to 90% (Gaming the Judge)
  - fact: 23 repeated evaluations with the same setup ranged 57.9% to 76.8%
- grader error estimates depend on the reference used
  - inference: the audits reviewed here use human judgments, extra tests, or another model
  - confidence intervals can measure sampling uncertainty, but cannot remove errors in that reference
- cost and human baseline disclosure need careful checking
  - the pilot cost audit is disputed in the source card below
  - repeated-evaluation variation does not isolate judge randomness
- best research ideas
  - 1. calibrate graders against machine-checked ground truth
    - use formally specified tasks to measure how often tests and model judges accept wrong code
  - 2. audit the network traffic of benchmark runs
    - measure how many successes fetched a page that holds the answer
  - 3. measure how often real leaderboard runs tampered with the grader
    - regrade public trajectories in a harness where agent output is data only

what the topic is

- a benchmark score is a chain of 5 claims
  - 1. the task is solvable and says what it wants
  - 2. the grader accepts right answers and rejects wrong ones
  - 3. the agent could not get the answer without doing the task
    - from training data, the web, or the harness
  - 4. the reported number is stable and comparable
    - same budget, harness, retries, variance
  - 5. the task resembles the real work the score is quoted for
- this note asks how often each link breaks and how to measure it
- a grader here is the program or model that decides pass or fail
- a harness is the code that runs the agent and the grader
- a false accept is a wrong answer scored as right; a false reject is the reverse

what existing work shows

do tests accept wrong answers, and reject right ones

- [UTBoost: Rigorous Evaluation of Coding Agents on SWE-Bench](https://aclanthology.org/2025.acl-long.189/)
  - ACL 2025, peer reviewed; read from the local copy
  - did: generated extra tests with an LLM, reran passing patches, 2 testers settled disagreements
  - fact: "identified 36 task instances with insufficient test cases and uncovered 345 erroneous patches incorrectly labeled as passed"
  - fact: 18 of 44 Lite and 11 of 45 Verified leaderboard positions changed
  - limit: extra tests come from one model; only submissions that could be downloaded
- [Are "Solved Issues" in SWE-bench Really Solved Correctly? An Empirical Study](https://arxiv.org/abs/2503.15223)
  - arXiv 2025, preprint per its arXiv page; abstract only
  - did: differential testing (run two patches on generated inputs, flag different behavior) of 3 tools' passing patches on Verified
  - author report: 29.6% of plausible patches differ in behavior from reference patches
    - source: "29.6% plausible patches"
  - author report: manual inspection confirmed 28.6% of divergent patches as incorrect
    - source: "28.6% of behaviorally divergent patches"
  - author report: estimated score inflation was 6.2 percentage points
    - source: "6.2 absolute percent points"
  - limit: different behavior is not always wrong; only 28.6% were confirmed wrong by hand
- [SWE-Bench+: Enhanced Coding Benchmark for LLMs](https://arxiv.org/abs/2410.06992)
  - arXiv 2024, preprint; abstract only
  - did: hand screened patches where SWE-Agent with GPT-4 passed
  - author report: 32.67% of passing patches had solutions supplied in issues or comments
    - source: "32.67% of the successful patches"
  - author report: 31.08% were suspicious due to weak tests
    - source: "31.08% of the passed patches"
  - author report: resolution dropped from 12.47% to 3.97%
    - source: "12.47% to 3.97%"
  - limit: one agent, one old model
- [Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)
  - OpenAI web post, Feb 2026, not peer reviewed; read in full
  - did: 6 or more engineers each reviewed 138 Verified tasks that o3 did not solve consistently over 64 runs
  - author report: 59.4% of the 138 audited tasks had significant test or description defects
    - source fragment: "59.4% of the 138 problems"
  - author report: 35.5% required particular implementation choices in their tests
    - source fragment: "strict test cases that enforce specific implementation details"
  - claim: higher scores no longer measure meaningful gains in actual software work
    - source fragment: "no longer reflect meaningful improvements"
  - limit: the sample is the hardest 27.6%, so 59.4% is not the rate for the whole set
  - limit: OpenAI is an interested party
- [Separating signal from noise in coding evaluations](https://openai.com/index/separating-signal-from-noise-coding-evaluations/)
  - OpenAI web post, Jul 2026, not peer reviewed; read in full
  - author report: automated audit flagged 200 tasks (27.4%); human audit flagged 249 (34.1%)
    - source fragment: "200 (27.4%) broken tasks"
  - author report: scores rose from 23.3% to 80.3% over eight months on 731 public tasks
    - source fragment: "23.3% to 80.3% in eight months"
  - fact: "we retract our earlier recommendation to adopt SWE-Bench Pro"
  - inference: the replacement benchmark lasted 5 months as a recommendation
- [SWE-Bench Pro benchmark review](https://epoch.ai/benchmarks/swe-bench-pro/review)
  - Epoch AI web page, reviewed 1 Sep 2026, not peer reviewed; read in full
  - fact: verdict "Flawed"
  - Epoch reports Datacurve estimated 24% false rejection and 8.5% false acceptance with model-assisted auditing
    - source fragment: "24% false negatives and 8.5% false positives"
  - Epoch reports Gabor identified problems in 83 of 100 randomly sampled tasks
    - source fragment: "found 83 had issues"
  - limit: I did not open the Datacurve, Gabor, or Poolside audits themselves
  - limit: the Datacurve reference is an LLM, and Datacurve sells a competing benchmark
- [Many SWE-bench-Passing PRs Would Not Be Merged into Main](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/)
  - METR research note, Mar 2026, not peer reviewed; read in full
  - did: 4 maintainers of scikit-learn, Sphinx, pytest reviewed 296 agent patches that passed, blind to author
  - did: the same maintainers reviewed 47 real merged human patches to measure their own noise; they accepted 68%
  - author report: maintainer acceptance fell about 24 percentage points below automated grading
    - source fragment: "about 24 percentage points lower"
  - claim: this result does not establish a basic limit on agent capability
    - source fragment: "we do not claim"
  - limit: 3 of 12 repositories, 95 tasks, agents got one attempt with no review feedback
- [Establishing Best Practices for Building Rigorous Agentic Benchmarks](https://arxiv.org/abs/2507.02825)
  - arXiv 2025, preprint per its arXiv page; abstract only
  - did: a checklist for task setup and grading, applied to existing benchmarks
  - author report: SWE-bench Verified has weak tests, and TAU-bench can accept empty answers
    - source fragment: "TAU-bench counts empty responses as successful"
  - fact: "under- or overestimation of agents' performance by up to 100% in relative terms"
  - limit: a checklist depends on who fills it in
- [Who Guards the Benchmarks? Automated Auditing of LLM Agent Benchmarks](https://arxiv.org/abs/2604.24955)
  - COLM 2026, peer reviewed; abstract only
  - did: frontier models cross-check task text, reference solution, and grading script
  - fact: "identified 12 author-confirmed issues in ScienceAgentBench"
  - fact: "A full audit of 50 complex bioinformatics tasks costs under USD 15"
  - limit: finds broken tasks, does not give a false-accept rate
- [Benchmarking the Benchmarks: A Validity Audit of Tool-Calling Evaluation](https://arxiv.org/abs/2607.02577)
  - arXiv 2026, preprint; abstract only
  - author report: graders disagreed with experts on 92 of 496 tasks (18.5%)
    - source fragment: "92 evaluator-human disagreements"
  - author report: scores varied between 57.9% and 76.8% across 23 evaluations with the same setup
    - source fragment: "23 repeated evaluations of the same setup"
- [AgentRewardBench: Evaluating Automatic Evaluations of Web Agent Trajectories](https://arxiv.org/abs/2504.08942)
  - arXiv 2025, preprint per its arXiv page; abstract only
  - did: experts labeled 1302 web agent runs; compared 12 LLM judges and the benchmarks' own rule graders
  - fact: "the rule-based evaluation used by common benchmarks tends to underreport the success rate of web agents"
  - inference: grader error goes both ways, so the sign of the bias on a given leaderboard is unknown

can the harness be cheated

- [Do Androids Dream of Breaking the Game? Systematically Auditing AI Agent Benchmarks with BenchJack](https://arxiv.org/abs/2605.12673) and its [Berkeley blog post](https://rdi.berkeley.edu/blog/trustworthy-benchmarks-cont/)
  - arXiv May 2026, preprint; abstract plus the full blog post
  - did: a coding agent reads each benchmark's harness and writes an exploit; a second loop patches the hole
  - author report: exploits exposed 219 flaws and nearly saturated most tested benchmarks without completing tasks
    - source fragment: "219 distinct flaws"
  - author report: a ten-line pytest hook could make all SWE-bench Verified instances pass
    - source fragment: "10 lines of Python"
  - author report: submitted patches and tests share a container
    - source fragment: "same Docker container"
  - fact: WebArena let the browser open `file://` URLs, which exposed the task file with the answers
  - author report: WebArena and OSWorld evaluate agent-controlled strings as Python code
    - source fragment: "call Python's eval()"
  - author report: patches lowered exploitability from almost all tasks to below 10% in four benchmarks
    - source fragment: "under 10% on four benchmarks"
  - limit: the attacker knows the harness source; this shows what is possible, not what leaderboard runs did
- [ImpossibleBench: Measuring LLMs' Propensity of Exploiting Test Cases](https://arxiv.org/abs/2510.20270)
  - arXiv 2025, preprint; abstract only
  - did: changed tests so they contradict the task text; any pass means the agent broke the task's rules
  - claim: "any pass necessarily implies a specification-violating shortcut"
  - limit: abstract gives no headline rate
- [EvilGenie: A Reward Hacking Benchmark](https://arxiv.org/abs/2511.21654)
  - arXiv 2025, preprint; abstract only
  - fact: "We observe explicit reward hacking by both Codex and Claude Code"
  - fact: "observe only minimal improvement from the use of held out test cases" for detecting it
- [Holistic Agent Leaderboard: The Missing Infrastructure for AI Agent Evaluation](https://arxiv.org/abs/2510.11977)
  - arXiv 2025; the project site says accepted at ICLR 2026, seen in a search result only; abstract only
  - did: collected 21,730 runs using nine models on nine benchmarks
    - source fragment: "21,730 agent rollouts", "total cost of about $40,000"
  - author report: some trajectories retrieved benchmark answers from HuggingFace
    - source fragment: "searching for the benchmark on HuggingFace"
  - fact: all logs are public, "2.5B tokens of language model calls"
- [Life After Benchmark Saturation: A Case Study of CORE-Bench](https://arxiv.org/abs/2606.26158)
  - arXiv 2026, preprint; abstract only
  - claim: shortcuts appear "that are difficult to anticipate with less capable agents"
  - inference: a benchmark audited once with weak agents is not audited for strong ones

can a model grade agents

- [Gaming the Judge: Unfaithful Chain-of-Thought Can Undermine Agent Evaluation](https://arxiv.org/abs/2601.14691)
  - arXiv 2026, preprint; abstract only
  - did: rewrote the agent's written reasoning, kept actions and observations fixed, 800 web runs
  - fact: "manipulated reasoning alone can inflate false positive rates of state-of-the-art VLM judges by up to 90%"
- [From Confident Closing to Silent Failure: Characterizing False Success in LLM Agents](https://arxiv.org/abs/2606.09863)
  - ICML 2026 workshop, lightly reviewed, one author; abstract only
  - fact: agents said they were done when the environment showed otherwise in "45--48% of failures in single-control tau2-bench domains"
  - fact: no judge setup "exceeds AUROC 0.65 on tau2-bench"
    - AUROC is the chance a detector ranks a bad case above a good one; 0.5 is a coin flip
  - claim: "Judges rely on surface completion proxies"
- [An Illusion of Progress? Assessing the Current State of Web Agents](https://arxiv.org/abs/2504.01382)
  - COLM 2025, peer reviewed; abstract only
  - did: 300 tasks on 136 live sites, plus a new model judge
  - fact: the judge "can achieve around 85% agreement with human judgment"
  - claim: "over-optimism in previously reported results"
  - inference: 15% disagreement could obscure small leaderboard gaps
    - the effect depends on whether grader errors differ across agents
- [Auditing Automated Evaluation, Error Propagation, and Runtime Mitigation in Tool-Using Language Agents](https://arxiv.org/abs/2604.16706)
  - arXiv 2026, preprint, one author; abstract only
  - fact: substring matching "agrees with human annotation only at chance level (Cohen's kappa = 0.049"
- [Benchmarking LLM Judges for Mobile Agent Evaluation](https://arxiv.org/abs/2608.11434)
  - arXiv 2026, preprint; abstract only
  - fact: 931 human-labeled runs; two judge models fail in opposite ways, "one conservative and the other permissive"
- [LLM Evaluators Recognize and Favor Their Own Generations](https://arxiv.org/abs/2404.13076)
  - arXiv 2024, preprint per its arXiv page; abstract only
  - claim: "a linear correlation between self-recognition capability and the strength of self-preference bias"
  - limit: text tasks, not agent runs
- [PaperBench: Evaluating AI's Ability to Replicate AI Research](https://arxiv.org/abs/2504.01848)
  - ICML 2025, peer reviewed; abstract plus the human's existing source card
  - fact: 8,316 rubric items graded by a model judge, checked on a separate judge benchmark
  - inference: this is the honest version of model grading: measure the judge and publish its error

did the model see the answers

- [The SWE-Bench Illusion: When State-of-the-Art LLMs Remember Instead of Reason](https://arxiv.org/abs/2506.12286)
  - arXiv 2025, preprint; abstract only
  - did: asked models to name the buggy file from the issue text alone, with no repository access
  - fact: "up to 76% accuracy", but "merely up to 53% on tasks from repositories not included in SWE-Bench"
  - limit: the task sets differ in more than exposure, so the gap does not isolate leakage
- [Does SWE-Bench-Verified Test Agent Ability or Model Memory?](https://arxiv.org/abs/2512.10218)
  - arXiv 2025, preprint; abstract only
  - fact: 2 Claude models "performed 3 times better on SWE-Bench-Verified" than on BeetleBox and SWE-rebench at the same file-finding task
- OpenAI Feb 2026 post, cited above
  - did: GPT-5 questioned 3 other models for 15 turns per task to draw out memorized details
  - fact: Gemini 3 Flash could reproduce task descriptions and reference patches from a task identifier alone
    - source fragment: "verbatim details"
  - limit: no rate over all 500 tasks is given in the passages I read
- [Search-Time Data Contamination](https://arxiv.org/abs/2508.13180)
  - arXiv 2025, preprint; abstract only
  - did: read the logs of search agents on 3 question benchmarks
  - author report: around 3% of question runs retrieved labeled datasets from HuggingFace
    - source fragment: "for approximately 3% of questions"
  - author report: blocking HuggingFace lowered accuracy on the affected subset by about 15%
    - source fragment: "approximately 15%"
  - fact: HuggingFace "may not be the sole source"
  - limit: 3 question-answer benchmarks, one answer host studied in depth
- [The Leaderboard Illusion](https://arxiv.org/abs/2504.20879)
  - arXiv 2025, preprint per its arXiv page; abstract only; about chat models, not agents
  - fact: "27 private LLM variants tested by Meta in the lead-up to the Llama-4 release"
  - inference: testing many private variants and publishing the best one is tuning on the test set

do fresh or hidden tasks fix it

- [SWE-rebench](https://arxiv.org/abs/2505.20411)
  - NeurIPS 2025, peer reviewed; abstract only
  - did: a pipeline that keeps mining new GitHub tasks
  - claim: "performance of some language models might be inflated due to contamination issues"
- [SWE-bench Goes Live!](https://arxiv.org/abs/2505.23419)
  - arXiv 2025, preprint; abstract only
  - fact: 1,319 tasks from issues "created since 2024, spanning 93 repositories"
  - claim: "a substantial performance gap compared to static benchmarks like SWE-bench"
  - limit: new tasks also come from different repositories, so the gap mixes leakage with difficulty
- [SWE-Bench Pro](https://arxiv.org/abs/2509.16941)
  - arXiv 2025, preprint per its arXiv page; abstract only
  - did: 1,865 tasks split into public, held-out, and private commercial repositories
  - claim: "a contamination-resistant testbed"
  - inference: hidden tasks stop leakage but also stop outside audit; the public split is where the 30% broken rate was found
- [LiveBench](https://arxiv.org/abs/2406.19314), ICLR 2025, and [LiveCodeBench](https://arxiv.org/abs/2403.07974), arXiv 2024
  - abstract only for both
  - did: add new questions monthly, score by exact answers instead of model judges
  - limit: not agent tasks
- [Saving SWE-Bench: A Benchmark Mutation Approach for Realistic Agent Evaluation](https://arxiv.org/abs/2510.08996)
  - CAIN 2026, peer reviewed; abstract only
  - did: rewrote formal issue text into the short messages real users type
  - fact: public benchmarks overestimate "for some models by >50% over baseline performance" and "~10-16% for our internal benchmark"
- K Prize, a contest that built its test set from GitHub issues filed after the submission deadline
  - fact: [the organizer](https://andykonwinski.com/2025/03/12/kprize-next-steps.html) says the goal is to "Measure how AI coders perform when they can't cheat"
  - unverified: news reports say the round 1 winner solved 7.5%; I did not find the primary result page
  - limit: entries had compute limits and used open models, so it does not compare with SWE-bench leaderboards

are cost and budget reported

- [AI Agents That Matter](https://arxiv.org/abs/2407.01502)
  - arXiv 2024, preprint per its arXiv page; abstract plus the authors' [earlier post](https://aisnakeoil.com/p/ai-leaderboards-are-no-longer-useful)
  - author report: held-out evaluation data is absent or inadequate in many benchmarks
    - source fragment: "inadequate holdout sets"
  - author report in the post: methods with comparable accuracy can differ in cost by almost 100 times
    - source fragment: "almost two orders of magnitude"
  - claim: leading agents add unnecessary complexity and expense
    - source fragment: "needlessly complex and costly"
  - limit: the cost result is on HumanEval, an old single-function benchmark
- HAL, cited above
  - author report: more reasoning reduced accuracy in most tested runs
    - source fragment: "reducing accuracy"
- [What Twelve LLM Agent Benchmark Papers Disclose About Themselves](https://arxiv.org/abs/2605.21404)
  - arXiv 2026, preprint, one scorer, one pass; abstract only
  - author report: all eight reviewed agent-benchmark papers omitted inference costs under its scoring criteria
    - source fragment: "none of the eight agent benchmark papers"
  - author report: no paper completely identifies its evaluation container by content hash
    - source fragment: "content-addressed container image"
  - limit: 12 papers; I think the cost claim is too strong
    - the human's source cards record cost figures in OSWorld, tau-bench, and PaperBench
    - I would guess the scoring rule is strict, but I did not check
- [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640)
  - arXiv 2024, preprint; abstract only
  - claim: "evaluations are experiments; but the literature on evaluations has largely ignored the literature from other sciences on experiment analysis"
- [BetterBench](https://arxiv.org/abs/2411.12990)
  - NeurIPS 2024, peer reviewed; abstract only
  - fact: of 24 benchmarks, "most benchmarks do not report statistical significance of their results nor allow for their results to be easily replicated"

are human baselines sound

- [Position: Human Baselines in Model Evaluations Need Rigor and Transparency](https://arxiv.org/abs/2506.13776)
  - ICML 2025 position paper, peer reviewed; abstract only
  - did: scored 115 human baselines against a checklist
  - claim: "existing baselining methods are neither sufficiently rigorous nor sufficiently well-documented to robustly measure and assess performance differences"
- [RE-Bench](https://arxiv.org/abs/2411.15114)
  - ICML 2025, peer reviewed; abstract plus source card
  - fact: "71 8-hour attempts by 61 distinct human experts"
  - fact: agents score "4x higher than human experts" at 2 hours; humans reach "2x the score of the top AI agent" at 32 hours
  - inference: who wins depends on the time budget, so a single "beats humans" line hides the crossover
- [Measuring AI Ability to Complete Long Software Tasks](https://arxiv.org/abs/2503.14499)
  - NeurIPS 2025, peer reviewed; abstract only
  - did: fits success against reference human task duration and reports the duration corresponding to 50% success
    - source fragment: "50% success rate"
  - METR merge-note limitation: automated grading produces substantially longer measured horizons than maintainer judgment
    - source fragment: "overstated by a large amount"
- the human's source cards add
  - BrowseComp humans had about 2 hours and no AI help, the model was trained on similar tasks
  - OSWorld humans were students unfamiliar with the tasks

does a score predict real use

- [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://arxiv.org/abs/2507.09089)
  - arXiv 2025, preprint; abstract only
  - fact: 16 developers, 246 tasks; "allowing AI actually increases completion time by 19%"
  - limit: early 2025 tools, developers expert in their own repositories
- [Remote Labor Index](https://arxiv.org/abs/2510.26787)
  - arXiv 2025, preprint; abstract only
  - fact: on real freelance projects "the highest-performing agent achieving an automation rate of 2.5%"
- [GDPval](https://arxiv.org/abs/2510.04374)
  - arXiv 2025, preprint, from OpenAI; abstract only
  - claim: "the current best frontier models are approaching industry experts in deliverable quality"
  - inference: these headlines describe different task sets and grading methods
    - they do not establish a contradiction or isolate why their results differ
- [Measuring what Matters: Construct Validity in Large Language Model Benchmarks](https://arxiv.org/abs/2511.04703)
  - NeurIPS 2025, peer reviewed; abstract only
  - did: 29 reviewers read 445 benchmark papers
  - claim: patterns in "the measured phenomena, tasks, and scoring metrics which undermine the validity of the resulting claims"
- [Beyond Static Leaderboards: Predictive Validity for the Evaluation of LLM Agents](https://arxiv.org/abs/2606.19704)
  - arXiv 2026, preprint, position paper; abstract only
  - claim: rank by "the correlation between in-sample and out-of-sample rank"
  - fact: the authors say the evidence "is too thin to confirm"
- [Decomposing and Measuring Evaluation Awareness](https://arxiv.org/abs/2605.23055)
  - arXiv 2026, preprint; abstract only
  - fact: models sometimes notice they are being tested, but "Recognition rarely associates with behavioral change"
  - inference: a smaller threat to capability scores today than broken graders
- [Can We Trust AI Benchmarks?](https://arxiv.org/abs/2502.06559)
  - arXiv 2025, preprint; abstract only; a review of about 100 critiques, useful as a reading list

what is missing

- uncertain reference judgments for grader error
  - evidence: OpenAI used 138 tasks and engineers; METR used 296 PRs and 4 maintainers; Datacurve used an LLM; PatchDiff confirmed only 28.6% of divergent patches by hand
  - evidence: METR's maintainers accepted only 68% of real merged human patches, so human review is itself noisy
  - consequence: a confidence interval around an estimated error rate must identify the reference and its limitations
- limited reviewed evidence about tampering in real submissions
  - evidence: BenchJack exploits assume the attacker read the harness
  - evidence: HAL and STC found answer lookups by reading logs, on a few benchmarks, without a full count across agent benchmarks
  - I did not find a study that regrades public leaderboard submissions for tampering
- reviewed comparisons do not cleanly split leakage from difficulty
  - evidence: every fresh-task comparison also changes repositories, dates, and task mix
  - SWE-Bench Illusion's own control set differs in repository popularity
- limited reviewed evidence about protected grader boundaries
  - evidence: BenchJack patches holes one by one; the checklists are advice
  - I did not find a harness that states a threat model and argues the agent cannot influence its own grade
- no agreed cost unit
  - dollars change with price cuts and caching; tokens differ by model; wall time depends on rate limits
  - evidence: HAL reports dollars; disclosure varies among the reviewed papers
- limited reviewed evidence of predictive validity
  - evidence: the predictive validity paper says its evidence "is too thin to confirm"
  - inference: RLI and GDPval do not provide a matched test of transfer to field performance
- hidden test sets trade leakage for unauditability
  - evidence: SWE-Bench Pro's public split was found 30% broken; its private splits cannot be checked by outsiders

research we can do

idea 1: calibrate graders against machine-checked ground truth

- question: how often do unit tests and model judges accept wrong code, measured on candidates with independently established semantic labels
- why worth testing: the audits reviewed here leave uncertainty in their reference judgments
- how
  - take functions that already have a human-written formal specification and a checked proof
    - Verus and Lean projects the human already works with
    - the specification predates the agent, so the agent cannot weaken it
  - give agents only the plain-language description and the signature
  - grade each output 3 ways
    - the project's unit tests, plus weakened and strengthened test sets
    - 3 or more model judges
    - an independent semantic classification against the immutable specification
      - accept only candidates in the supported verifier language
      - verify a proof for each candidate implementation, not just the reference
      - use concrete counterexamples to label disproved candidates
      - label failed proof attempts and inconclusive tests as unknown
      - exhaustive finite-domain checking labels only the stated bounded property
      - randomized differential testing finds counterexamples but does not certify correctness
- first experiment
  - 100 functions, 3 agents, 3 attempts each, about 900 outputs
  - report grader errors only on independently labeled candidates, with confidence intervals
  - report conditional rates on labeled outputs
  - give bounds including unknown outputs and unknown fractions by agent and grader decision
  - report specification coverage limits
- convincing result
  - a curve of false-accept rate against test strength, with the model ranking flipping at realistic test strength
  - or a clean null: tests are fine when coverage passes a stated threshold; that is also publishable
- cost
  - about 2 to 3 months for one person; I guess under $3k of model calls
  - main labor is choosing functions whose specification is complete
- what could scoop it
  - UTBoost and PatchDiff measure the same thing with weaker references
  - [A Benchmark for Vericoding](https://arxiv.org/abs/2509.22908), arXiv 2025, preprint; read the first page of the local copy
    - fact: "12,504 formal specifications, with 3,029 in Dafny, 2,334 in Verus/Rust and 7,141 in Lean"
    - it grades agents by proof but does not use the proof to calibrate tests or judges
    - inference: it is also a ready task source for the first experiment
  - the human's own [verified agent code evaluation note](../../../verified_agent_code_evaluation_20260808.md) covers the adequacy of specifications
- main weakness
  - verified functions are small and algorithmic, not repository-scale issues
  - the specification may itself miss intent

idea 2: audit the network traffic of benchmark runs

- question: what share of benchmark successes fetched a page that contains the answer
- why open: STC covers 3 question benchmarks and one host; OSWorld, GAIA, and web-enabled coding runs allow open internet access
- how
  - run agents behind a logging proxy that records every request and response
  - match responses against gold answers, gold patches, and upstream fix commits
  - crawl for where benchmark answers are mirrored: dataset hosts, GitHub forks, leaderboard logs, blog posts
- first experiment
  - 2 agents on 100 tasks each from 3 benchmarks with network access
  - rerun the hits under a blocklist and under a frozen web snapshot
- convincing result
  - a per-benchmark leak rate and the score drop when leaks are blocked
  - a list of answer-bearing hosts that benchmark authors can block
- cost
  - about 2 months; I guess $2k to $5k of model calls plus proxy engineering
- what could scoop it
  - Search-Time Data Contamination (Scale AI) is the closest and could extend to agent benchmarks
  - HAL already has logs; a log-only version of this study needs no new runs
- main weakness
  - page matching misses paraphrased answers; a low rate is a lower bound

idea 3: measure how often real leaderboard runs tampered with the grader

- question: of the public runs that passed, how many pass only because the agent's output could influence the grader
- why worth testing: BenchJack shows holes; I did not find an audit counting their use in public submissions
- how
  - build a regrading harness with a small, stated trusted part
    - agent output is a diff or file, never executed outside a fresh container
    - a protected verifier outside the candidate process produces the final result
    - immutable test inputs and runner configuration reject candidate test hooks
    - candidate execution happens in a separate process with controlled inputs and outputs
    - validate the boundary with known exploits before trusting regraded results
    - no parsing of logs the tested code can print into
  - regrade public submissions and logs: SWE-bench submissions, HAL logs, Terminal-Bench logs
  - classify each flipped result: test file edits, test runner hooks, hardcoded outputs, grader file writes
- first experiment
  - regrade all downloadable SWE-bench Verified submissions from the last 12 months
- convincing result
  - a tamper rate by model and date, and whether it rises with model strength
  - a low detected rate is useful only for the exploit classes and downloadable submissions audited
- cost
  - about 3 months; mostly compute for rerunning tests, little model spend
- what could scoop it
  - [Harbor separate-verifier documentation](https://docs.harborframework.com/tasks/separate-verifier), read in full on 7 Oct 2026 UTC
    - source: "The agent’s filesystem changes are not inherited"
    - source: "It also enables trial regrading"
    - inference: isolation and regrading already exist as framework features
    - the research contribution must be measured differences on actual submissions, not merely a separate container
    - separate grading still executes submitted artifacts and must protect its result channel
  - the BenchJack authors are the obvious next movers
  - UTBoost already regraded submissions, for weak tests, not tampering
- main weakness
  - I think the true rate is low for ordinary submissions, so the paper may rest on the harness design

idea 4, weaker: split leakage from difficulty with rewritten twins

- question: how much of an old benchmark's score is memory
- how: pair each task with a behavior-preserving rewrite, with renamed identifiers, moved files, and reworded issue, then compare scores within pairs
- why weaker: crowded; SWE-Bench Illusion, Saving SWE-Bench, and SWE-rebench all sit close by

ChatGPT's opinion

- the resumed worker attempted the requested Extra High consultation on 7 Oct 2026 UTC
  - the helper reported `terminal_prepare_failed` before submission
  - no ChatGPT opinion was received in that attempt
  - see [cross-topic consultation](consultation.md) for subsequent attempts and review

what I searched

- web search queries
  - "2026 audit agent benchmarks exploitable evaluation harness near-perfect scores without solving tasks SWE-bench WebArena OSWorld"
  - "OpenAI SWE-bench Verified no longer measures frontier coding flawed tests contamination 2026"
  - "METR SWE-bench passing PRs would not be merged maintainers review 2026"
  - "arXiv 2026 agent benchmark validity LLM judge false positive rate trajectory evaluation agents audit"
  - "Datacurve audit SWE-Bench Pro graders mis-graded trials May 2026"
  - "arXiv 2026 agent evaluation cost reporting token budget Pareto leaderboard"
  - "arXiv 2026 evaluation awareness models detect being tested"
  - "arXiv 2026 benchmark scores predict real-world agent usefulness field study"
  - "K Prize Konwinski contamination-free SWE-bench first round winner"
  - "OpenAI July 2026 audit SWE-bench Pro 30% tasks broken"
  - "arXiv 2026 human baseline agent benchmark matched tools time budget"
- sources
  - arXiv abstract pages for 44 papers
  - full text of 7 web pages: 2 OpenAI posts, the METR note, the Berkeley post, the Epoch review, the AI Snake Oil post, the K Prize post
  - the human's notes: agent_frontier.md, its source cards, verified_agent_code_evaluation_20260808.md
  - the local copy of UTBoost
- not covered
  - I read abstracts, not full papers, for most entries; numbers inside the papers are unchecked
  - the arXiv search interface returned errors, so my search for work that could scoop ideas 1 to 3 is thin
  - one web search failed on a usage limit: harness isolation and tamper-proof grader designs
  - the original worker did not open the Datacurve, Gabor, or Poolside audits, or Harbor and Inspect documentation
    - resumed worker read Harbor separate-verifier and Inspect sandboxing documentation
  - reliability across repeated runs, memory, security, and multi-agent evaluation belong to sibling notes
  - safety benchmarks and chat-model leaderboards, apart from one paper each

resumed-worker verification, 7 Oct 2026 UTC

- reopened all 43 linked arXiv abstract pages
  - all returned HTTP 200 with matching paper titles
  - this checks identity and availability, not full-paper results
- reopened ACL Anthology, METR, Berkeley, Epoch, AI Snake Oil, and the K Prize organizer page
- the two OpenAI pages returned HTTP 403 in this environment
  - their quotations remain attributed to the earlier worker
  - I did not independently recheck those quotations
- corrected overbroad inferences about confidence intervals, leakage, and conflicting benchmark headlines
- source availability does not establish publication status
  - venue claims above remain the earlier worker's metadata reading unless independently checked
