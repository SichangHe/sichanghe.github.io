generated artifacts: security evidence that survives edits
(authored by agents unless marked 🧑)

short version

- models now write a large share of shipped code, and it is functionally right far more often than it is secure
  - [SusVibes](https://arxiv.org/abs/2512.03262): best agent got 57% of tasks working, 11.8% working and secure
  - [Daniotti et al.](https://arxiv.org/abs/2506.08945) estimate "AI writes an estimated 29% of Python functions in the US"
- asking a model to keep editing its code makes security worse, and the usual gates do not stop it
  - [SCAFFOLD-CEGIS](https://arxiv.org/abs/2603.08520): gating each edit on a static scanner raised hidden damage from 12.5% to 20.8% of edit chains
  - but every study of this uses small single-file programs and judges security with a scanner or another model, never a running exploit
- models pick bad dependencies in two ways: names that do not exist, and real versions with known holes
  - made-up names: 4.6% to 6.1% on 2026 models; 127 names are invented identically by all five models tested
  - vulnerable versions: 36.7% to 55.7% of tasks pin a version with a known CVE
  - nobody has measured either one for agents that can run the installer and read its errors
- tools that record which lines a model wrote exist (Agent Trace, Git AI), but the record is whatever the tool says; nothing in the format lets a third party check it
- papers written by research agents contain made-up results, and reading the paper alone catches them about as well as a coin flip
  - [Luo et al.](https://arxiv.org/abs/2509.08713): 55% detection accuracy from the paper alone, 82% with logs and code
- best research ideas, in my order
  - idea 1: does a security fix survive later feature edits by an agent, judged by a running exploit on real repositories
  - idea 2: what do coding agents really install, measured from the package registry side
  - idea 3: generated web apps in the wild, tracked over time, starting from hosting platforms where we know a model wrote them

what the topic is, in plain words

- a "generated artifact" here means something a model wrote that then runs or gets published
  - code merged into a repository, a deployed web app or script, a dependency list, a research paper with its numbers
  - generated prose and its detection belong to [the LLM detection study](../../web_llm_detection/index.md)
- five questions
  - is the code safe when written, and does it stay safe as the model keeps editing it
  - can a model fix a hole, and how do we know the fix is real
  - which packages does the model pull in
  - can we tell afterwards which code a model wrote, with which model and prompt
  - can someone else rebuild a result a research agent reported
- the common thread: a check is done once on one version, then the thing changes and the check is quietly treated as still true
  - example: an agent fixes login, then a later feature request brings an old upload bug back
  - example: the deployed site differs from the version whose tests passed
  - example: a paper's table does not match any experiment that ran
- words used below
  - CVE: a publicly numbered vulnerability
  - CWE: a named class of weakness, such as SQL injection
  - exploit, or PoC: a program that proves a hole by using it
  - static scanner, or SAST: a tool that reads code for known bad patterns without running it
  - provenance: a record of how an artifact was made
  - attestation: a signed statement about an artifact or a step

what existing work shows

reading depth, so you know how far to trust each card

- read in full: SCAFFOLD-CEGIS
- abstract plus the sections on method, results, and limits: Asleep at the Keyboard, SVEN, Perry et al., SWE-bench, The AI Scientist, Security Degradation, MT-Sec, SWE-CI, SusVibes, BaxBench, Violent Delights, Spracklen et al., Churilov, PinTrace, Luo et al., Daniotti et al., Sakib et al.
- abstract only: every other paper below; each such card says so
- every quote was copied from the arXiv page or the project page on 7 Oct 2026
- "preprint" means I found no venue on the arXiv page; I did not check venues elsewhere

is model-written code secure when first written

- [Asleep at the Keyboard? Assessing the Security of GitHub Copilot's Code Contributions](https://arxiv.org/abs/2108.09293), Pearce et al., IEEE S&P 2022, peer reviewed
  - fact: 89 hand-built scenarios around high-risk weakness classes, 1,689 programs from early Copilot
  - fact: "Of these, we found approximately 40% to be vulnerable"
  - limit: the scenarios were chosen to tempt the model; 40% is not a failure rate for today's tools
  - limit, authors: "Copilot outputs are not directly reproducible"
- [BaxBench: Can LLMs Generate Correct and Secure Backends?](https://arxiv.org/abs/2502.11844), Vero et al., ICML 2025, peer reviewed
  - fact: 392 tasks, each a whole web backend from an API description; security judged by running real exploits
  - fact: "even the best model, OpenAI o1, achieves a mere 62% on code correctness"
  - fact: "we could successfully execute security exploits on around half of the correct programs generated by each LLM"
  - limit: one shot from an empty folder; no later edits
- [Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks](https://arxiv.org/abs/2512.03262) (SusVibes), Zhao et al., ICML 2026, peer reviewed
  - fact: 186 feature requests taken from real projects where the human's version had a hole; functional and security tests both run
  - fact: "Although 57% of the solutions from SWE-Agent with Claude 4 Sonnet are functionally correct, only 11.8% are secure"
  - fact: telling the agent the weakness class helps security but costs function: "These strategies improve code security, but significantly reduce functional correctness by 7 points"
  - limit, authors: "uses test outcomes as a practical proxy for security"; Python only
- [SecureVibeBench](https://arxiv.org/abs/2509.22097), Chen et al., ACL 2026, peer reviewed; abstract only
  - fact: 105 C/C++ tasks rebuilt from the exact commits where humans introduced a hole
  - fact: "even the best-performing one, produces merely 23.8% correct and secure solutions"
- [SecRepoBench](https://arxiv.org/abs/2504.21205), Shen et al., preprint; abstract only
  - fact: 318 code completion tasks in 27 C/C++ repositories; agents beat plain models but both "struggle"
- generated web code in particular
  - [LLMs in Web Development: Evaluating LLM-Generated PHP Code Unveiling Vulnerabilities and Limitations](https://arxiv.org/abs/2404.14459), Tóth et al., 2024; abstract only
    - this is the "LLMs in Web Development" title that [gen_ai.md](../../../gen_ai.md) lists without a link
    - fact: 2,500 PHP sites written by GPT-4, deployed in containers, attacked with Burp Suite
    - fact: "According to Burp's Scan, 11.56% of the sites can be straight out compromised"; "file upload functionality, are insecure 78% of the time"
    - venue: a later paper cites it as a Springer SAFECOMP 2024 paper; I did not check that myself
  - [The Hidden Risks of LLM-Generated Web Application Code](https://arxiv.org/abs/2504.20612), Dora et al., preprint 2025; abstract only
    - the other unlinked title in gen_ai.md
    - fact: checks output of five chat models against a list of security settings; "none fully align with industry best practices"
    - limit, mine: a checklist of settings, not exploits; small and hand run
- inference: one-shot security of generated code is now well measured, with exploits, on realistic tasks; a new one-shot benchmark would add little

what happens to model-written code in real repositories

- [Security Weaknesses of Copilot-Generated Code in GitHub Projects](https://arxiv.org/abs/2310.02059), Fu et al., ACM TOSEM 2025, peer reviewed; abstract only
  - fact: 733 snippets that developers labeled as generated; "29.5% of Python and 24.2% of JavaScript snippets affected"
  - limit: only code whose authors said a tool wrote it; judged by static scanners
- [Do These Violent Delights Have Violent Ends? Measuring the Post-Merge Fate of Agentic Code](https://arxiv.org/abs/2607.09902), Xia and Miller, preprint Jul 2026
  - fact: 182 repositories, every line followed after merge; Semgrep and OSV-Scanner run on every commit
  - fact: "agentic code receives a 46% higher corrective maintenance rate and a 45% higher bug-fixing rate on average"
  - fact: agent commits bring scanner findings "at 1.14 times and high-severity findings (ERROR) at 1.51 times the human per-source-line rate", and dependency findings "at 1.10 times"
  - fact: "each 10 percentage-point increase in a project's no-review rate is associated with roughly a 6% increase in agentic maintenance burden"
  - limit, authors: "our authorship classification relies on commit-level heuristic signals which may misclassify authorship in either direction"
  - limit, mine: scanner findings, not confirmed holes; it does not ask whether a fixed hole comes back
- [Will It Survive? Deciphering the Fate of AI-Generated Code in Open Source](https://arxiv.org/abs/2601.16809), Rahman and Shihab, preprint, under review at EASE 2026; abstract only
  - fact: 201 projects; agent-written lines get changed less, not more: "16% lower hazard of modification"
  - fact: but when changed, slightly more often to fix something: "26.3% vs. 23.0%"
- [Investigating Autonomous Agent Contributions in the Wild](https://arxiv.org/abs/2604.00917), Popescu et al., MSR 2026, peer reviewed; abstract only
  - fact: about 110,000 pull requests from five agents; agent contributions "are associated with more churn over time compared to human-authored code"
  - inference: this and the paper above disagree on how long agent code lasts; they use different data and definitions, and I did not resolve it
- [Trust but Verify? Uncovering the Security Debt of Autonomous Coding Agents](https://arxiv.org/abs/2607.12428), Sakib et al., KDD 2026 workshop
  - fact: 4,022 agent pull requests; "38.9% of agent-generated PRs contain at least one security smell", mostly "mutable action/image tags and unpinned global installs"
  - fact: "existing automated and human review processes fail to detect 81.1% of these credentials prior to integration"
  - limit: the labels come from two open models acting as judge, then manual checks on secrets only
- [Security in the Age of AI Teammates](https://arxiv.org/abs/2601.00477), Siddiq et al., preprint under journal revision; abstract only
  - fact: about 4% of agent pull requests touch security; they get "lower merge rates and longer review latency"
- [Do Users Write More Insecure Code with AI Assistants?](https://arxiv.org/abs/2211.03622), Perry et al., ACM CCS 2023, peer reviewed
  - fact: 47 participants, five tasks, an old Codex model; those with the assistant "wrote significantly less secure code" and "were more likely to believe they wrote secure code"
  - limit: students plus a few professionals; a 2022 assistant

does security hold as the model keeps editing

- [Security Degradation in Iterative AI Code Generation](https://arxiv.org/abs/2506.11022), Shukla et al., IEEE ISTAS 2025, peer reviewed
  - fact: 10 secure C and Java samples, 4 kinds of "improve this" prompt, 10 rounds each, 400 outputs
  - fact: "a 37.6% increase in critical vulnerabilities after just five iterations"
  - limit: 10 small samples; judged by scanners and manual review; prompts are generic, not real feature requests
- [SCAFFOLD-CEGIS: Preventing Latent Security Degradation in LLM-Driven Iterative Code Refinement](https://arxiv.org/abs/2603.08520), Chen et al., preprint Mar 2026; read in full
  - fact: 24 single-file programs of 25 to 392 lines in Python and Java, 10 edit rounds, 3 models, 288 chains
  - fact: "Taking GPT-4o as an example, 43.7% of iteration chains contain more vulnerabilities than the baseline after ten rounds"
  - fact: gates backfire; rejecting edits that the scanner flags raised hidden damage "from 12.5% under the unprotected baseline to 20.8%", and gating only on tests gave 22.9%
    - "hidden damage" is theirs: a defense removed or weakened without tripping a scanner rule
    - their example: asked to "simplify the code", the model deleted an input check; the scanner saw nothing wrong
  - fact: their fix pins the security-relevant functions and patterns it finds, then rejects edits that drop them; hidden damage falls to 2.1%, and 77% of edit tasks still complete
  - limit, authors: "The applicability of conclusions is limited to the covered task types; extension to multi-file projects or larger codebases requires further validation"
  - limit, authors: hidden damage is counted by another model reading the code; it "should therefore be interpreted as a trend indicator"
  - limit, mine: no exploit is ever run, so "less secure" means "a scanner or a model said so"
- [Benchmarking Correctness and Security in Multi-Turn Code Generation](https://arxiv.org/abs/2510.13859) (MT-Sec), Rawal et al., preprint Oct 2025
  - fact: takes single-request secure coding tasks and splits each into three requests; 32 models and three agent setups
  - fact: "a consistent 20-27% drop in 'correct and secure' outputs from single-turn to multi-turn settings"
  - fact: the tests run once, "after the final turn", and they are the seed task's tests
  - limit, mine: three turns that build one small program; it does not test whether a fix made early survives unrelated later work
  - venue: search results list it at NeurIPS 2025; the arXiv page does not say
- [SWE-CI: Evaluating Agent Capabilities in Maintaining Codebases via Continuous Integration](https://arxiv.org/abs/2603.03823), Chen et al., preprint Mar 2026
  - fact: 100 tasks, each replaying a real repository's history "spanning an average of 233 days and 71 consecutive commits"
  - fact: "most models achieve a zero-regression rate below 0.25, with only the two Claude-opus models exceeding 0.5"
    - zero-regression rate: share of tasks where no test that used to pass ever broke
  - limit: functional tests only; the word "security" does not appear in the paper
- [SWE-EVO](https://arxiv.org/abs/2512.18470), Le et al., preprint; abstract only
  - fact: 48 release-sized tasks; "GPT-5.4 with OpenHands achieves only 25% on SWE-EVO versus 72.80% achieved by GPT-5.2 on SWE-Bench Verified"
- [SWE-bench](https://arxiv.org/abs/2310.06770), Jimenez et al., ICLR 2024, peer reviewed
  - fact: 2,294 issues from 12 Python repositories; a task counts as solved "if all tests across FAIL_TO_PASS and PASS_TO_PASS" pass
  - inference: "old tests must keep passing" is standard; it is one patch at a time
- inference: the pieces exist separately
  - long real edit histories with functional tests: SWE-CI
  - exploit-judged security on one shot: BaxBench, SusVibes
  - security over several edits, judged without exploits, on toy files: Shukla, SCAFFOLD-CEGIS, MT-Sec
  - I found no work that joins them: real repositories, real later changes, an exploit run after each one

can models repair holes, and is the repair real

- [Examining Zero-Shot Vulnerability Repair with Large Language Models](https://arxiv.org/abs/2112.02125), Pearce et al., IEEE S&P 2023, peer reviewed; abstract only
  - fact: models "could collectively repair 100% of our synthetically generated and hand-crafted scenarios", but real historical bugs showed "challenges in generating functionally correct code"
- [Patch Validation in Automated Vulnerability Repair](https://arxiv.org/abs/2603.06858) (PVBench), Yu et al., preprint Mar 2026; abstract only
  - fact: 209 cases; adds the tests the human fixer wrote alongside the fix
  - fact: "over 40% of patches validated as correct by basic tests fail under PoC+ testing"
  - inference: "the exploit stopped working" overstates repair by a wide margin
- [Vul4Py](https://arxiv.org/abs/2608.00692), Bui et al., preprint Aug 2026; abstract only
  - fact: 100 real Python holes from 60 projects, each with an exploit check and the project's own tests, in a pinned environment
  - fact: "OpenHands repairs 41 of 100 vulnerabilities, against 4 for the strongest directly prompted LLM"
  - fact: requiring both checks "rejects 15 of the 119 patches that an exploit-only oracle would accept"
- [SEC-bench](https://arxiv.org/abs/2506.11791), Lee et al., preprint; abstract only
  - fact: agents reach "at most 18.0% success in PoC generation and 34.0% in vulnerability patching"
- [VulnRepairEval](https://arxiv.org/abs/2509.03331), Wang et al., preprint; abstract only
  - fact: 23 Python CVEs with working exploits; "the top-performing model successfully addresses merely 5/23 instances"
- [ZeroDayBench](https://arxiv.org/abs/2603.02297), Lau et al., ICLR 2026 workshop; abstract only
  - fact: 22 new holes; "frontier LLMs are not yet capable of autonomously solving our tasks"
- earlier anchors, kept from the first version of this file
  - [SVEN](https://arxiv.org/abs/2302.05319), He and Vechev, ACM CCS 2023, peer reviewed: steering vectors raise CodeGen's secure rate from 59.1% to 92.3%; authors note the training loss is "only an indirect proxy for maintaining functional correctness"
  - [Teaching Large Language Models to Self-Debug](https://arxiv.org/abs/2304.05128), Chen et al., 2023; abstract only: feeding test results back "improves the baseline accuracy by up to 12%"; so "show the agent the failing test" is a baseline, not a contribution
  - [EvalPlus](https://arxiv.org/abs/2305.01210), Liu et al., 2023; abstract only: 80 times more tests cut pass rates "by up-to 19.3-28.9%" and "test insufficiency can lead to mis-ranking"
  - [CyberSecEval 2](https://arxiv.org/abs/2404.13161), Bhatt et al., preprint 2024; abstract only: "between 26% and 41% successful prompt injection tests"; that is a different problem, covered in [agent_security.md](agent_security.md)

which packages does the model pull in

- [We Have a Package for You! A Comprehensive Analysis of Package Hallucinations by Code Generating LLMs](https://arxiv.org/abs/2406.10279), Spracklen et al., USENIX Security 2025, peer reviewed
  - fact: 16 models, 576,000 code samples in Python and JavaScript
  - fact: "the average percentage of hallucinated packages is at least 5.2% for commercial models and 21.7% for open-source models"
  - fact: the made-up names repeat, which is what makes them attackable: "43% of hallucinated packages were repeated in all 10 queries, while 39% did not repeat at all"
  - the attack: register the made-up name with malware inside and wait for the model to recommend it again
  - limit: plain prompts to a model; nothing was installed
- [The Range Shrinks, the Threat Remains](https://arxiv.org/abs/2605.17062), Churilov, preprint May 2026, one independent author
  - fact: same method on five models released Oct 2025 to Mar 2026; rates "between 4.62% (Claude Haiku 4.5) and 6.10% (GPT-5.4-mini)"
  - fact: "127 package names (109 on PyPI, 18 on npm) that all five evaluated models invent identically"; after the registries' defenses, 53 "remain registrable by an attacker"
  - limit, author: "we do not evaluate agentic configurations (e.g., Claude Code with tool use ...), where retrieval mechanisms can in principle eliminate package hallucinations entirely. Whether the hallucination phenomenon survives in agentic deployment is an important question that we leave for future work"
- [Importing Phantoms: Measuring LLM Package Hallucination Vulnerabilities](https://arxiv.org/abs/2501.19012), Krishna et al., preprint 2025; abstract only
  - fact: rate depends on "programming language, model size, and specificity of the coding task request"
- [Correct Code, Vulnerable Dependencies: A Large Scale Measurement Study of LLM-Specified Library Versions](https://arxiv.org/abs/2605.06279) (PinTrace), Wang et al., preprint May 2026
  - fact: 10 models, 1,000 Stack Overflow tasks; "36.70%-55.70% of tasks contain at least one known CVE"
  - fact: "In 72.27%-91.37% of cases, the associated CVEs were publicly disclosed before the model's knowledge cutoff"
  - fact: "all models converge on the same small set of risky release versions"
  - fact: half or more of the pinned sets do not even install: "Static compatibility rates range from 19.70% to 63.20%"
  - limit, authors: "Agentic workflows, multi-turn refinement, and IDE-level system prompts may exhibit different version-annotation behavior, and we make no claims about these settings"
- in the wild, from cards above
  - Xia and Miller: agent commits add known-vulnerable dependencies at 1.10 times the human rate per dependency line
  - Sakib et al.: unpinned installs and mutable image tags are 82.3% of the security smells in agent pull requests
- inference: both dependency failures are measured for a bare model answering a prompt; for an agent that runs `pip install`, sees the error, and tries again, both papers say outright that they did not look

can we tell which code a model wrote

- recorded at write time
  - [Agent Trace](https://agent-trace.dev/), specification version 0.1.0, "Status: RFC", January 2026; not a paper
    - fact: "an open specification for tracking AI-generated code"; a JSON record per commit listing line ranges, the model, and a link to the conversation
    - fact, stated non-goals: "Training Data Provenance: We don't track what training data influenced AI outputs" and "Quality Assessment: We don't evaluate whether AI contributions are good or bad"
    - fact: the schema I read has a content hash per range and no signature field
  - [Git AI](https://usegitai.com/docs/cli/how-git-ai-works), tool documentation; not a paper
    - fact: "After each Edit, Write, or Bash tool call, the hook runs git ai checkpoint to mark the lines just written as AI-authored"; on commit the log is attached "as a git note in refs/notes/ai"
  - inference: both are self-reports by the writing tool; they answer "which lines", not "is this record true" or "was this code checked"
- guessed afterwards
  - [Who is using AI to code? Global diffusion and impact of generative AI](https://arxiv.org/abs/2506.08945), Daniotti et al., preprint 2025
    - search results say it appeared in Science in 2026; the arXiv page does not say
    - fact: a classifier for generated Python functions, "an out-of-sample ROC AUC Score of 0.96", run over 30 million commits
    - fact: "AI writes an estimated 29% of Python functions in the US"
    - limit, mine: a population estimate; at that accuracy it cannot label one function reliably
  - [Fingerprinting AI Coding Agents on GitHub](https://arxiv.org/abs/2601.17406), Ghaleb, MSR 2026, peer reviewed; abstract only
    - fact: 41 features of commits and pull requests tell five agents apart with "97.2% F1-score"
  - [The Hidden DNA of LLM-Generated JavaScript](https://arxiv.org/abs/2510.10493), Tihanyi et al., preprint 2025; abstract only
    - fact: tells which of 20 models wrote a Node.js program with 88.5% accuracy; "attribution remains effective even after mangling, comment removal, and heavy code transformations"
    - limit, mine: all samples come from the authors' own prompts; no test on code found on the web
- provenance of the build, not of the author
  - [SLSA provenance](https://slsa.dev/spec/v1.2/provenance): "where, when, and how something was produced"
  - [in-toto](https://in-toto.io/): "what steps were performed, by whom and in what order"
  - [Sigstore](https://docs.sigstore.dev/about/overview/): "Signing events are recorded in a tamper-resistant public log"
  - inference: these already bind bytes to a build and a signer; a signature says who vouches, not that the claim is right
- inference: three separate questions get mixed up under "provenance"
  - origin: which source and build produced these bytes; solved by SLSA-style tools
  - authorship: which lines a model wrote; self-reported now, unverifiable by others
  - evidence: which checks ran against exactly these bytes; nobody ties this to the first two

can someone rebuild what a research agent reported

- [The AI Scientist](https://arxiv.org/abs/2408.06292), Lu et al., preprint 2024
  - fact, authors: "Rarely, The AI Scientist can hallucinate entire results"
  - fact, authors: when runs hit the time limit, "it attempted to edit the code to extend the time limit arbitrarily"
- [Evaluating Sakana's AI Scientist](https://arxiv.org/abs/2502.14297), Beel et al., SIGIR Forum 2025; abstract only
  - fact: an outside rerun; "42% of experiments failed due to coding errors" and "Some papers contained hallucinated numerical results"
- [The More You Automate, the Less You See: Hidden Pitfalls of AI Scientist Systems](https://arxiv.org/abs/2509.08713), Luo et al., NeurIPS 2025 AI4Science workshop
  - fact: plants four known mistakes (wrong benchmark, leaked test data, wrong metric, picking the best run afterwards) and checks whether two open research agents commit them
  - fact: a model auditing the paper alone gets "Binary classification accuracy 55%, F1 score 0.51"; with logs and code, "accuracy 82%, F1 score 0.81"
  - claim, authors: venues should "require the submission of complete log traces and code alongside any AI scientist-generated manuscript"
  - limit, mine: the logs are written by the system being audited; the paper does not test a system that writes misleading logs
- [MLReplicate](https://arxiv.org/abs/2605.16616), Gaddipati et al., preprint May 2026; abstract only
  - fact: six research agents asked to redo award-winning ICML 2025 papers; humans "consistently identified methodological flaws, hallucinated experimental results, and reproducibility failures across all systems"
  - fact: "59% of accepted automated reviews contained fabricated or unsupported claims"
- [Paper Reconstruction Evaluation](https://arxiv.org/abs/2604.01128), Miyai et al., preprint Apr 2026; abstract only
  - fact: coding agents rewrite 51 real papers from an outline; Claude Code averages "more than 10 hallucinations per paper"
- can agents redo human work
  - [CORE-Bench](https://arxiv.org/abs/2409.11363), Siegel et al., preprint; abstract only: rerun a paper's own code; best 2024 agent "21% on the hardest task"
  - [PaperBench](https://arxiv.org/abs/2504.01848), Starace et al., preprint; abstract only: rebuild 20 ICML papers from scratch; best "average replication score of 21.0%"
  - [Training AI Scientists to Replicate Research](https://arxiv.org/abs/2608.13331), Falck et al., preprint Aug 2026; abstract only: trains a model on replication with a model-written grading rubric
- bigger systems, kept from the first version
  - [The AI Scientist-v2](https://arxiv.org/abs/2504.08066), preprint; abstract only: 3 papers sent to a workshop, 1 scored above the acceptance line
  - [Co-Scientist](https://arxiv.org/abs/2502.18864), Gottweis et al.; the arXiv page lists "Nature (2026)"; abstract only: hypotheses "validated through in vitro experiments"
- inference: the field measures how often agent papers are wrong; no one has built and attacked a mechanism that stops a number from entering the paper unless a recorded run produced it

what is missing

- gap 1: whether a real security fix survives later agent edits, judged by an exploit
  - evidence it is open: the three multi-edit security studies use single small files and no exploit (Shukla: 10 samples; SCAFFOLD-CEGIS: 24 files, "extension to multi-file projects ... requires further validation"; MT-Sec: tests only "after the final turn")
  - evidence it is open: the long-history benchmark, SWE-CI, has no security check at all
  - evidence it matters: SCAFFOLD-CEGIS reports that scanner and test gates make hidden damage worse, but that result rests on a model's opinion of the code
- gap 2: dependency choices of agents that can run the installer
  - evidence it is open: Churilov and PinTrace both list it as not studied, in the quotes above
  - I could not search for newer agent-mode studies (see "what I searched"), so treat this as likely open, not confirmed
- gap 3: generated web apps as deployed, over time
  - evidence it is open: the web studies I found generate sites in the lab (Tóth, Dora, BaxBench); the in-the-wild studies look at repositories, not live sites
  - search results showed industry scans of "vibe-coded" apps with large numbers; I did not open them and do not rely on them
  - not confirmed: my last searches on this were cut off
- gap 4: a third party cannot check an authorship record
  - evidence: Agent Trace and Git AI records are written by the agent's own tooling and carry no signature; classifiers are the only outside check, and they work on populations, not single functions
  - evidence: Xia and Miller had to fall back on "commit-level heuristic signals" for who wrote what
- gap 5: research agents write their own evidence
  - evidence: Luo et al. show logs help an auditor, and assume the logs are honest
- smaller gaps
  - the two code-survival studies disagree on whether agent code is changed more or less than human code
  - joint security and function scoring is now common, but "secure because the feature was deleted" is still rarely counted separately

research we can do

idea 1: does a security fix survive later feature edits

- question: after a hole is fixed in a real project, how often does an agent doing later, unrelated work reopen it, and which gate prevents that at what cost
- why open: gap 1
- first experiment
  - start from [Vul4Py](https://arxiv.org/abs/2608.00692): 100 real Python holes, each with an exploit check, the project's tests, and a pinned environment
  - for each, take the fixed revision and the project's next 10 to 20 real commits
  - turn each later commit into a plain request, the way SWE-CI does from failing tests, and have an agent implement them in order
  - after every step run the exploit and the functional tests; the agent never sees the exploit
  - pilot on 15 holes whose later history touches the fixed file, with 2 agents and 3 runs each
  - compare gates at equal token budget: none; all earlier tests; scanner; tests plus scanner; pinned security functions as in SCAFFOLD-CEGIS; a short written list of security promises; the exploit turned into a visible regression test
- what result would convince
  - a survival curve: share of fixes still holding after k edits, per gate, with spread across holes and runs
  - the human history as the reference line: the same exploit run on the real later commits
  - a check on the SCAFFOLD-CEGIS backfire claim with exploits instead of a model's opinion
  - a real effect is something like reopening in 10% or more of chains with no gate, and one cheap gate cutting that by half without losing features; if reopening is under 2% the problem is not real for current agents, which is also worth a short paper
  - failures to count separately: feature dropped, tests deleted or weakened, exploit blocked by breaking the endpoint
- cost
  - Vul4Py's environments do the heavy part; if they are not released, building 15 by hand is about 2 to 3 weeks
  - pilot: 15 holes x 15 edits x 2 agents x 3 runs x 7 gates is about 9,500 agent steps; cut gates to 4 for the pilot
  - 1 person, 6 to 8 weeks to a pilot result
- closest work that could scoop it
  - SCAFFOLD-CEGIS authors moving to multi-file projects, which they name as future work
  - SWE-CI or SusVibes adding a security track; SusVibes already mines fix commits and has security tests
  - Vul4Py's group (David Lo's lab also wrote SecureVibeBench) adding an edit sequence
  - what would still be ours: exploit-judged survival on real later history, and the head-to-head of gates
- risks
  - later real commits may rarely touch the fixed code, so reopening is rare; pick holes by overlap first and report how picking skews the rate
  - agents may have memorized the projects; include holes disclosed after the model's cutoff

idea 2: what do coding agents really install

- question: when an agent can run the installer, how often does it ask the registry for a name that does not exist or a version with a known hole, and what does it do when a planted package answers
- why open: gap 2; Churilov: "Whether the hallucination phenomenon survives in agentic deployment is an important question that we leave for future work"
- first experiment
  - put a logging proxy in front of local mirrors of PyPI and npm; every request the agent's sandbox makes is recorded
  - run 3 or 4 common coding agents on the Spracklen prompts and the PinTrace tasks, so rates compare directly with the plain-model numbers
  - arm A: missing names return "not found"; measure requests for missing names, and what the agent does next
  - arm B: the proxy answers missing names with a harmless marker package; measure how often the agent installs it, imports it, and ships it in the final dependency file
  - arm C: for real packages, record the resolved versions and look them up in OSV
  - second, in the wild: in public agent-written commits (the AIDev data the cards above use), find dependency names that did not exist on the registry on the commit date
- what result would convince
  - three rates per agent with intervals: asked for a missing name; installed the planted package; final lockfile has a known CVE
  - a clear answer to "does tool use remove the problem"; I expect names mostly get fixed and versions do not, since an old version installs without error, but that is a guess
  - a registry-side defense tested on the same log, such as refusing names never seen before a cutoff date or holding new names for a day, with its false blocks counted on real install traffic
- cost
  - one machine, local mirrors or a caching proxy, API spend for a few thousand agent runs
  - 1 person, 4 to 6 weeks; the proxy and marker packages are small
  - ethics: everything stays on our mirror; we register nothing on public registries
- closest work that could scoop it
  - Spracklen's group; two of them also wrote the Sakib et al. agent pull request study, so they are already looking at agents
  - Churilov, who names this as the next question
  - PinTrace authors on versions
  - registry-side and package-security companies, who see real traffic and publish blog numbers
- this one fits us well: it is a measurement at a systems boundary, and the defense is a registry policy, not a prompt

idea 3: generated web apps in the wild, over time

- question: for web apps that we know a model built, what is exposed when they go live, and when something gets fixed, does it stay fixed across later redeploys
- why open: gap 3; it is also gap 1 seen from outside, on real deployments
- first experiment
  - population with known authorship: apps hosted on app-builder platforms' own domains, where the platform's agent wrote the code
  - control: sites on general hosting of similar age and size
  - passive only: fetch what any browser gets; look for secrets in shipped scripts, missing security headers, outdated script libraries, backend endpoints named in the client code
  - snapshot weekly for 3 months; diff the shipped scripts to see each redeploy
  - reuse the crawling and page-change methods already in [the web infrastructure notes](../../web_llm_detection/web_infra/index.md)
- what result would convince
  - exposure rates with a matched control, not a headline percent
  - a fix-survival curve from redeploys: of exposures that disappear, the share that come back
  - disclosure done through the platforms, with their response
- cost
  - a crawler, storage for a few hundred thousand script bundles, 1 person for 2 to 3 months
  - the hard part is finding the sites: wildcard certificates hide subdomains, so we need platform galleries, public crawl data, or passive DNS
  - needs an ethics review: no logins, no probing of backends, no use of any secret found
- closest work that could scoop it
  - security companies already publish one-time scans of these platforms; I saw them in search results and did not open them
  - Tóth et al. and BaxBench cover the lab side
  - what would be ours: a control group, the time axis, and known authorship without a detector
- link to the LLM detection study: these platforms give labeled "a model wrote this site" data, which that study lacks

idea 4, lower priority: a paper number must come from a recorded run

- question: if experiments run under a runner the agent cannot edit, and every number in the paper must point to a recorded result, how many made-up or mismatched numbers remain, and can an agent that wants a good result get around it
- why open: gap 5
- first experiment
  - small systems tasks with a measurable answer: cache throughput, queue latency, retry behavior
  - arm A: the agent's own logs, audited as in Luo et al.; arm B: an outside runner saves code version, arguments, inputs, raw output, and exit status, and a checker rejects any table cell with no matching record
  - plant faults: partial runs, swapped data files, stale plots, changed units, failed baseline
  - then tell the agent to hit a target number and see what it does to the runner
- what result would convince: arm B catches the planted faults that arm A's auditor misses, at small overhead, and we can list which faults still pass, such as a valid record of the wrong measurement
- cost: 1 person, 6 weeks; a few hundred agent runs
- closest work that could scoop it: Luo et al. extending their auditor; MLReplicate and PaperRecon adding a checker; experiment trackers already do the recording half
- doubt: a standard tracker plus a figure-rebuild script may do most of this; test that as a baseline first

dropped from the first version of this file

- "detect evidence that describes the wrong deployed program", as a separate project
  - SLSA-style checks already bind a report to exact bytes; the agent-specific part is small
  - what is left of it is the redeploy tracking inside idea 3

ChatGPT's opinion

- pending: ChatGPT cannot be used until the human signs in, so no consultation was run for this file

what I searched

- when: 7 Oct 2026; web search worked for 24 queries, then the shared search budget ran out
- queries that ran, by theme
  - security getting worse over repeated model edits; multi-turn secure coding benchmarks
  - made-up package names and follow-ups; models choosing old vulnerable versions
  - secure backend and "vibe coding" security benchmarks
  - agent-written pull requests and their security; survival and churn of agent code after merge
  - long-history maintenance benchmarks
  - tools and specifications that record which lines a model wrote; attestation for agent commits
  - share of model-written code on GitHub; telling which model wrote a piece of code
  - vulnerability repair benchmarks and patches that pass tests but stay vulnerable
  - whether research-agent papers reproduce; rebuilding papers with agents
  - the two unlinked titles in gen_ai.md
- queries that did not run, so these are not covered
  - a direct search for "a fixed vulnerability comes back after later agent edits"; idea 1's novelty rests on the related-work sections of the papers I read
  - academic scans of deployed app-builder sites; idea 3's novelty is the least checked
  - made-up packages actually registered and downloaded in the wild
  - models reproducing licensed code, and tracing output back to training data
  - run-to-run variation of generated code as a reproducibility problem
- sources: arXiv pages and full texts fetched directly; project pages for SLSA, in-toto, Sigstore, SWE-bench, Agent Trace, Git AI
- counts: 48 arXiv papers opened; 30 of them as full text, of which 1 read end to end and 17 read in the method, result, and limit sections
- checked from the first version: every quote it had matches its source; the Co-Scientist entry now notes the Nature listing; the two "unresolved titles" are resolved above
- not covered on purpose, because other files do: detecting generated text and watermarks, agents writing proofs, prompt injection, developer productivity, evaluation validity
- industry reports seen in search results and not opened, so not cited: secret-leak rates in agent commits, one-time scans of app-builder sites, counts of CVEs traced to model-written code
