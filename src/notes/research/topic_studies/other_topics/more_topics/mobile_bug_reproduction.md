reproducing reported mobile bugs
(authored by agents unless marked 🧑)

takeaway

- reproduce the reported failure, not merely a plausible sequence of taps
  - search finds an action sequence
  - replay executes it under recorded conditions
  - a failure check determines whether the reported problem occurred
    - papers call this check an oracle
- broad ideas already have substantial prior work
  - global search, LLM planning, screenshots, missing-step inference, and non-crash failure recognition
- promising narrower question: distinguish a reported visible failure from ordinary behavior after different UI actions
  - an empty search result can be correct
  - a crash can come from the wrong interaction
  - novelty remains unverified

human starting point

- 🧑 “Defense: Automated Reproduction of Bug Reports for Mobile Applications, Zhaoxu Zhang”
  - source: [reading notes](../../../../reading_notes/index.md)
- 🧑 “ignore hidden state; only consider UI state”
  - source: same defense notes
  - reading-note description of the defense, not a restriction on proposed research
- 🧑 “intermediate representation to help validate non-crash bug reproduction”
  - source: same defense notes
- Zhang's [USC defense announcement, May 9 2025](https://viterbi.usc.edu/events/event_details.php?events_id=106871)
  - author: “automatically recognizes buggy behaviors based on bug reports”
  - identifies non-crash reproduction as part of the dissertation
  - this announcement motivates reading the papers; it does not independently validate their results

review scope

- selected full-method and evaluation sections read
  - RepRev 2020, AndroR2 2021, Android reproduction study 2022, ReproBot 2023, AdbGPT ICSE 2024, Roam 2024, ReBL 2024, image study 2025, AndroB2O ASE 2025, TreeMind February 2026 version
- implementation and prompt inspection, not full evaluation
  - BugSpot FSE 2025 artifact at commit `52ab3fa96793421fc43387c81830d3e6113620de`
- abstract only
  - ReActDroid TSE 2025, ICST 2026 intent study, ReproPilot ASE 2026
  - access checked October 6 2026
    - BugSpot publisher download returned HTML rather than the paper
    - no matching full paper was obtained for ReproPilot or the ICST intent study
- repository lead only
  - CARBON
- no new tool was implemented or experimentally evaluated
  - proposals are agent hypotheses

datasets explain what success rates mean

- Wendland et al, MSR 2021, [AndroR2 paper, collection and reproduction phases](https://arxiv.org/pdf/2106.08403)
  - authors: “90 manually reproduced bug reports”
  - selected from 459 reports after several filters
    - closed GitHub issues from outside contributors
    - capped reports per repository
    - removed trivial failures and reports developers had not reproduced
  - includes 23 crash and 67 non-crash reports
    - buggy app packages, scripts, configurations, and report-quality information
    - at least two authors verified each retained failure
  - inference: useful starting benchmark, not a random sample of all incoming mobile bugs
    - selection favors failures that people could already reproduce
- Johnson et al, SANER 2022, [180-report empirical study, RQ3 and RQ4](https://arxiv.org/pdf/2301.01235)
  - authors: “92.2% of the bug reports had at least one missing S2R”
    - S2R means step to reproduce
  - compared initial descriptions with actions needed in manually derived scripts
  - distinguished missing setup context from missing actions between reported steps
    - follow-up discussions supplied relevant additional information in 35 reports
  - inference: setup information can be as important as choosing the next button
    - the percentage applies to this reproducible-report sample
    - discussion content may include later diagnosis or fix details

from text matching to global search

- Zhang et al, ISSTA 2023, [ReproBot paper, method and validity discussion](https://zhaoxu-zhang.github.io/files/issta2023.pdf)
  - authors: “our approach is unable to reproduce non-crash bug reports”
  - extracts actions and targets from text, then uses reinforcement learning to search for matching UI actions
    - reinforcement learning updates action preferences from observed rewards
  - repeated randomized runs and manual agreement on extracted-step labels
  - inference: a useful non-LLM baseline for crash reproduction
    - learning a path does not solve the general non-crash failure-check problem
- Zhang, Tawsif, Ryu, Yu, and Halfond, FSE 2024, [Roam paper, sections 4.2–4.8](https://zhaoxu-zhang.github.io/files/fse2024.pdf)
  - authors: “we provided the same step entities collected in Section 4.2 to all three approaches and Roam”
  - searches a graph of screens and actions for globally matched paths
    - dynamic programming ranks sequences while accounting for missing or inaccurate steps
  - retained 72 of 399 candidate reports after reproducibility and availability checks
    - 46 retained reports had missing steps
    - manually prepared action descriptions and crawler-built screen graphs
  - reported 94% reproduction with a one-hour limit per report
    - authors replayed outputs manually
  - inference: strong evidence for its matching algorithm under prepared inputs
    - not a demonstrated 94% fully automatic pipeline from arbitrary raw reports
    - graph completeness and one-step-to-one-action assumptions limit generalization
    - globally best matching path in the screen model need not reproduce the real failure when relevant state is missing

LLMs already help interpret incomplete reports

- Feng and Chen, ICSE 2024, [AdbGPT paper, evaluation and threats](https://arxiv.org/pdf/2306.01987)
  - authors: “we ran the LLM-related approaches ... three times”
    - ellipsis omits the parenthetical list of approach names
  - prompts an LLM to extract steps and guide replay
    - examples and intermediate reasoning guide interpretation
  - includes a small developer study
  - inference: compare against this baseline before proposing generic LLM-guided replay
    - repeated runs reduce sensitivity to randomness but do not remove dataset-selection limits
- Wang et al, ISSTA 2024, [ReBL paper, sections 3.5, 4.1–4.3, and 5.1](https://zhaoxu-zhang.github.io/files/issta2024.pdf)
  - authors: “we conducted a manual inspection to confirm whether the described crash or non-crash bug symptom occurs”
  - feeds the whole report, grouped UI information, feedback, and history to GPT-4
    - model decides whether the reported symptom has appeared
  - retained 96 accessible reproducible reports
    - reported 69/73 crash and 18/23 non-crash reproductions
    - comparisons with other tools used the crash subset
  - reported mean time measures successful reproductions
    - failed runs and setup costs must also enter an operational budget
  - false-symptom example: cutting and pasting within the same folder produced no visible change
    - reported bug concerned pasting into a different folder
  - inference: non-crash recognition already exists; context-sensitive false success remains concrete
    - evaluations used manual confirmation rather than treating the model's success declaration as ground truth
- Huang et al, TSE 2025, [ReActDroid abstract](https://doi.org/10.1109/TSE.2025.3535938)
  - authors: “reproduce mobile application crashes directly from the crash overview”
  - uses reasoning, app knowledge, and exploration history to infer actions from a one-sentence overview
  - limit: full evaluation not read here
- [ReActDroid author artifact, dataset description](https://github.com/wuchiuwong/ReActDroid/)
  - maintainers: “For the 59 bug reports that at least one tool can successfully reproduce”
  - describes reproduction-step and app-size statistics for this selected subset
  - these statistics do not describe all reports or explain failures that every tool missed
  - read-depth limit: README inspected; full-paper methods and artifact replay remain outstanding

recognizing failures is a separate research problem

- Zhang, Ryu, Yu, and Halfond, FSE 2025, [BugSpot abstract](https://conf.researchr.org/details/fse-2025/fse-2025-research-papers/52/Automated-Recognition-of-Buggy-Behaviors-from-Mobile-Bug-Reports)
  - authors: “transforms the documented buggy behavior into this structured language”
  - empirically classifies failure manifestations, then matches extracted descriptions against device and UI information
  - inference: a proposal to create structured report-derived failure checks directly overlaps this work
    - full paper could not be accessed here; no unverified accuracy figure is claimed
- [BugSpot author artifact, input documentation](https://github.com/USC-SQL/BugSpot-Artifact)
  - maintainers: “before the first action” and “after each UI action”
  - expects device information, screenshots, and UI hierarchies
    - before and after actions
  - inference: temporal device evidence is an existing interface, not a new idea
- [BugSpot parser prompt, grammar and examples](https://github.com/USC-SQL/BugSpot-Artifact/blob/52ab3fa96793421fc43387c81830d3e6113620de/report_parser/prompts/system_msg.txt)
  - authors: “s1 = S() representing the UI screen before the last screen, s2 = S() representing the UI screen after the last screen”
  - defines elements, screens, and device states
    - element descriptions and checkbox status
    - crash dialogs and keyboard visibility
    - logs, volume comparisons, and audio status
  - supports presence, absence, conjunction, and comparisons
    - this is the released grammar, not a verified complete taxonomy from the paper
  - inference: comparing before and after screens directly overlaps a proposed intermediate representation
- [BugSpot recognizer implementation](https://github.com/USC-SQL/BugSpot-Artifact/blob/52ab3fa96793421fc43387c81830d3e6113620de/recognizers/dsl.py)
  - author comment: “Confidence too low. Ignore the chose widget.”
  - rejects LLM element matches with confidence at most five
    - this threshold is not evidence that confidence predicts correctness
  - screen equality compares layout hashes
    - this checks layout agreement, not successful completion of the intended task
  - color and location branches contain `pass`
    - inspection shows these filters are not implemented in this artifact version
    - this does not establish what was implemented in the paper's evaluated version
- [BugSpot language-change prompt example](https://github.com/USC-SQL/BugSpot-Artifact/blob/52ab3fa96793421fc43387c81830d3e6113620de/report_parser/prompts/language.txt)
  - example report: “I went to Setting and tried to change the language to Franch. However, the app still shows English.”
  - generated check looks for English text
    - it does not explicitly verify that French was selected
  - inference: ordinary English output without a completed language change is a useful negative case
    - test whether replay or another checker establishes the missing precondition
    - no false-positive rate is claimed from reading this example
- Johnson, Mahmud, Chaparro, Moran, and Fazzini, ASE 2025, [AndroB2O paper, sections III, V–VIII](https://ojcchar.github.io/files/40-ase25-br-oracles.pdf)
  - authors: “FBOs fail on the buggy app”
    - FBO means failure-based oracle
    - assertions should pass on the corrected version
  - generates executable UIAutomator assertions from report text and the failing screen's XML hierarchy
    - requires consistent element and assertion predictions across repeated prompts
  - 152-report main evaluation reported 61.2% successful oracle generation
    - separate 17-report preliminary study and 16 later reports
    - benchmark provides buggy and corrected app versions
  - evaluation manually checked semantic relevance as well as buggy/fixed outcomes
    - unrelated concurrent changes can otherwise yield a misleading pass/fail pair
  - already integrates with ReBL and studies incorrectly declared reproductions
  - limitation: missing-element assertions can pass on the wrong screen
    - authors suggest adding screen identity
    - dataset excludes failures unavailable through UIAutomator or screen hierarchies
  - inference: broad oracle generation and buggy/fixed validation have direct prior work
    - extend evaluation to preconditions observable in UI action histories and matched correct outcomes before proposing a new method
- Wang et al, MSR 2025, [image study, methods and RQ4](https://arxiv.org/pdf/2502.15099)
  - authors: “Reproduction succeeds only after manually providing the information of the image”
    - Table III defines a result category
  - sampled 367 image-containing reports for role analysis
    - separately collected 42 reproducible image-containing reports for tool evaluation
  - compared text-only reproduction and manual translation of image information
  - images can describe steps, observed behavior, or expected behavior
    - those roles require different handling
  - inference: selective interpretation of report images is established prior work
    - manual image translation is not demonstrated autonomous visual reasoning
    - the image-containing sample does not estimate all-report reproduction success

recent planning and evaluation results narrow novelty further

- Chen et al, [TreeMind preprint, February 1 2026 version, sections 4–5](https://arxiv.org/pdf/2509.22431v2)
  - authors: “A bug is considered successfully reproduced if at least one of the five runs succeeds”
  - combines tree search with LLM-generated candidate actions and progress scores
    - UI text and screenshots support action choice
  - reported 60/93 crash reports reproduced
    - five runs per technique, thirty-minute limit per run
    - recorded shortest successful reproduction time
  - inference: this is five-attempt success and selected successful latency
    - it does not measure one-attempt reliability or total campaign cost
    - prompting examples came from the dataset; use held-out apps when comparing new methods
  - documented failures include external services and screens shown only once
    - revisiting a search node need not restore the same app state
- Wang et al, [ReproPilot ASE 2026 abstract](https://conf.researchr.org/details/ase-2026/ase-2026-research-track/199/Mobile-Bug-Reproduction-via-Global-State-Reprioritization-and-LLM-Guided-Trajectory-E)
  - authors: “diverse, reusable long-horizon guidance beyond step-wise action suggestions”
  - combines that guidance with global planning
    - reports reliability and token savings on 74 crash reports
  - abstract does not define consistency, repetitions, failed-run costs, or reset costs
    - do not compare its headline percentages with one-run reproduction rates
  - inference: caching multi-action LLM guidance and globally reprioritizing exploration already have direct prior work
    - full methods needed to interpret its consistency metric and cost accounting
- Carey, Elish, and Abedin, [ICST 2026 short-paper abstract](https://conf.researchr.org/details/icst-2026/icst-2026-short-papers--vision-and-emerging-results/6/Automated-Reproduction-of-Android-Application-Bugs-with-LLMs-Are-We-There-Yet-)
  - authors: “critical-step coverage, an intent-level metric”
  - evaluates classification and reproduction scripts against 90 AndroR2 reports
  - abstract reports 70% classification accuracy and 89.5% mean critical-step coverage
    - these are distinct measures
    - coverage does not establish executable replay or failure reproduction
  - full methods still needed for essential-step labels, annotator agreement, model settings, and execution protocol
  - inference: action intent and final outcome already have separate evaluation proposals
    - high essential-action coverage does not alone demonstrate the correct failure
- [CARBON repository](https://github.com/Dibae101/LLM-Droid-Tester)
  - maintainers: “complex gestures like pinch-to-zoom, double-tap, edge swipes”
  - lead for current gesture-capable screenshot agents
    - repository claims are not independently reproduced here
    - no publication status or benchmark fairness is assumed

candidate study: near-miss checks for non-crash failures

- hypothesis: explicit checks of visible task preconditions reduce false success beyond existing history-aware judgment and generated assertions
  - start with action history and visible screens
    - an agent choice to keep the first comparison bounded
- bounded initial scope: file movement, list editing, and saved settings
  - use local open-source apps with executable buggy and corrected versions
  - construct true failures and nearby correct outcomes with similar final screens
    - same-folder versus different-folder paste
    - empty input versus failed nonempty search
    - setting changed in memory versus persisted after restart
- compare ReBL's history-aware judgment, BugSpot, AndroB2O, and simple task-specific assertions
  - hold replay sequences fixed first
    - isolates checking errors from navigation errors
  - then measure the effect on end-to-end search termination
- outcomes: false acceptance, missed failures, abstentions, and checking cost
  - abstention means the checker says evidence is insufficient
  - independent reviewers label runs without knowing which checker produced the result
  - split by app, not just reports, to limit tuning on repeated interfaces
- possible contribution: failure recognition evaluated against deliberately similar correct outcomes
  - generic semantic checks are already covered by BugSpot and AndroB2O
  - AndroB2O already proposes checking screen identity
  - add the BugSpot language-change example as a precondition check
    - ordinary English screen versus English screen after a verified French selection
  - inspect BugSpot's full taxonomy and evaluated negative cases before claiming novelty
    - artifact inspection alone does not close this gap
- stop rule: abandon a new-method claim if existing assertions, BugSpot, or AndroB2O perform equally well
  - an evaluation dataset may still be useful if it exposes reproducible failure-check errors

candidate study: whether search resets preserve bug-relevant state

- Li et al, ICSE-SEIP 2020, [RepRev full methods, evaluation, and limitations](https://www.microsoft.com/en-us/research/wp-content/uploads/2020/06/Automated_Bug_Reproduction_from_User_Reviews_for_Android_Applications.pdf)
  - authors: “correct event sequences, but the crash does not happen”
  - extracts informative review words and guides UI exploration by semantic similarity
    - when all current actions score zero, explores one step ahead to improve their ranking
    - screen abstraction ignores text-content and checkbox-state changes
    - dynamic-list abstraction explores only one item in a nonempty list
  - evaluation contains 63 bug-related reviews requiring manually reproduced ground truth
    - authors describe three failures attributed to unknown environmental conditions
    - two additional attempts still failed in those cases
    - this attribution is not controlled evidence that network or hardware caused the failures
  - another failure requires repeating record-and-play twice
    - UI abstractions and loop-breaking rules may discard behavior needed by the reported failure
    - this is an earlier concrete counterexample to equating apparent navigation progress with bug-relevant progress
  - inference: compare state restoration with finer search-state representation and action-history preservation
    - restoration alone cannot recover a necessary action sequence that the search policy excludes
- [ReActDroid pinned environment implementation](https://github.com/wuchiuwong/ReActDroid/blob/6bde9cdb3bed89a826c6cccde89ad7c19ef4b340/tool/environment.py), initialization and relaunch functions
  - authors' configuration: `desired_caps['noReset'] = True`
  - selected Appium configuration requests retained app state and automatic permission granting
  - relaunch starts an activity through adb or calls Appium's launch function
    - these functions do not explicitly restore a snapshot or clear app data
    - this is a local code observation, not an artifact-wide absence claim
- [ReActDroid pinned main loop](https://github.com/wuchiuwong/ReActDroid/blob/6bde9cdb3bed89a826c6cccde89ad7c19ef4b340/main/run.py), step and run functions
  - authors' condition includes `dst_observe["page_id"] == "out of app"`
  - leaving the app or observing an empty page triggers relaunch
    - the same main object retains its search memory
  - selected example stops after 100 steps
    - this is not an independently verified published evaluation budget
  - implication: retained app data and retained search history are separate comparison dimensions
    - neither source establishes that relaunch restores all bug-relevant conditions
  - reading limit: selected released code inspected without execution
    - full paper and benchmark-specific runners remain unchecked
- agent proposal extending beyond the UI-only method described in the defense notes
  - hidden state means data or conditions not distinguishable from the current screen
- motivation from reviewed literature
  - the Android reproduction study distinguishes missing setup context from missing actions
  - TreeMind documents screens shown only once and dependence on external services
  - inference: returning to the same-looking screen may not restore conditions needed to reproduce the same failure
- hypothesis: restoring relevant saved data and environment conditions improves repeated reproduction of stateful bugs
- controlled comparison: retained data with relaunch, restart, reinstall, emulator snapshot, and explicit app-data restoration
  - use local reports requiring first-run setup or persisted edits
  - hold app version, Android version, locale, permissions, and local service responses fixed
  - record whether restored screens match and independently verify whether the same reported failure occurs
  - separately vary whether search distinguishes persisted data and repeated action histories
    - isolate reset failure from abstraction failure and missed timing requirements
    - deterministic local service responses remove one alternative explanation without representing all remote-service bugs
- measure repeatable same-failure replay, reset time, storage, failed attempts, and all LLM calls
  - compare total budgets rather than successful-run latency alone
- novelty remains unverified
  - include ReActDroid's retained-state relaunch baseline
    - verify the relevant benchmark runner before comparing costs or results
  - recover ReproPilot's reset and history mechanisms
    - its abstract does not establish whether it preserves the conditions tested here
  - snapshots and state restoration are established techniques
  - proposed question: which conditions must report-driven search preserve beyond screen appearance
- stop rule: reject a special restoration method if standard snapshots solve the cases at acceptable cost

before choosing an experiment

- retrieve BugSpot's complete paper and inspect its evaluated negative cases
  - grammar, recognizer code, and language-change example inspected
  - complete taxonomy and negative-case evaluation remain unchecked
- obtain full ReActDroid, ReproPilot, and ICST intent-study methods
  - method and evaluation reviews remain outstanding
  - recovery attempts on October 7 2026 did not produce these full papers
    - [Song Wang’s author page](https://www.eecs.yorku.ca/~wangsong/) lists ReActDroid and a PDF link
      - the linked [tse25.pdf](https://www.eecs.yorku.ca/~wangsong/papers/tse25.pdf) returned HTTP 404
      - [Zhe Liu’s author page](https://zheliu6.github.io/) lists the paper without a download link
    - [Sidong Feng’s publications page](https://sidongfeng.github.io/publications.html) labels ReproPilot “PDF”
      - the corresponding HTML link has an empty destination
      - the [ACM paper endpoint](https://dl.acm.org/doi/pdf/10.1145/3832783.3837495) returned HTTP 403
    - [Karim Elish’s publication list](https://karim-elish.github.io/publications/) identifies the ICST paper
      - the author-site metadata inspected did not provide a paper download
    - BugSpot’s author page and artifact did not yield its complete paper
  - these are access results in this review, not evidence that copies do not exist elsewhere
  - additional October 7 routes inspected publisher text, author publication metadata, institutional records, and ResearchGate listings
    - IEEE exposes the introduction but gates ReActDroid's methods
    - TUM's ReActDroid record provides DOI metadata rather than a manuscript
    - ResearchGate lists ReActDroid and BugSpot as request-full-text entries
    - conference listings did not yield ReproPilot's full methods
    - new routes did not recover these three papers; RepRev's accessible primary methods narrow the reset proposal instead
  - an arXiv link on the ICST page led to a different web-testing paper
    - it was excluded from this review
- inspect AndroB2O's released benchmark before collecting overlapping cases
- rerun available artifacts under one frozen environment and common total budget
  - report one-run success and success after a fixed number of attempts separately
- audit excluded reports, unavailable app packages, and server dependencies
- complete independent review of novelty and causal comparisons
  - no ChatGPT critique is claimed in this page
