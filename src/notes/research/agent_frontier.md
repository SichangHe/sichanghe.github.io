# agent frontier: useful workers, unreliable autonomy 🤖

short version

- inference: modern agents are useful as bounded, supervised, restartable workers
- inference: they are not reliable autonomous employees, researchers, or operators
- the strongest evidence is conditional
  - narrow task contract
  - stable tools and environment
  - strong current model plus a tuned scaffold
  - enough inference budget and permission to retry
  - cheap, independent verification
- the central frontier is dependable progress under compounding uncertainty, not another best-case demo

evidence labels

- accepted evidence: 21 peer-reviewed papers in the fixed set
- first-party preprint evidence: BrowseComp only
- inference: conclusions drawn across non-comparable studies
- recommendation: proposed research, not a demonstrated capability
- source cards preserve method, result, limitation, uncertainty, short quotes, and local OCR paths
  - [source cards](agent_frontier_papers/source_cards.md)
  - [selection ledger](agent_frontier_papers/selection_ledger.tsv)
  - [search log](agent_frontier_papers/search_log.md)

what works now

- accepted evidence: frontier agents complete some well-specified software tasks that take skilled humans hours
  - the measured 50% completion horizon reached about 110 human-minutes for o3 on a 170-task software and research suite
  - its 80% horizon was four to six times shorter
  - [time-horizon evidence](agent_frontier_papers/source_cards.md#time-horizons)
- accepted evidence: agents can repair real repositories when the issue, environment, tests, and interface are prepared
  - interface design itself changes outcomes
  - harder professional and freelance sets sharply reduce the success and economic value recovered
  - [SWE-agent](agent_frontier_papers/source_cards.md#swe-agent)
  - [SWE-Bench Pro](agent_frontier_papers/source_cards.md#swe-bench-pro)
  - [SWE-Lancer](agent_frontier_papers/source_cards.md#swe-lancer)
- accepted evidence: agents can execute portions of web, desktop, customer-service, and workplace workflows
  - success depends on a controlled environment, available APIs or actions, explicit policy, and recoverable mistakes
  - [tau-bench](agent_frontier_papers/source_cards.md#tau-bench)
  - [OSWorld](agent_frontier_papers/source_cards.md#osworld)
  - [WorkArena](agent_frontier_papers/source_cards.md#workarena)
  - [TheAgentCompany](agent_frontier_papers/source_cards.md#theagentcompany)
- accepted evidence: agents can produce useful work on bounded ML and research tasks
  - they can win some Kaggle medals, outperform expert humans at short R&D budgets, and partially reproduce ML papers
  - humans retain an advantage as the horizon grows, and end-to-end paper replication remains weak
  - [MLE-bench](agent_frontier_papers/source_cards.md#mle-bench)
  - [RE-Bench](agent_frontier_papers/source_cards.md#re-bench)
  - [PaperBench](agent_frontier_papers/source_cards.md#paperbench)
- accepted evidence: training and memory mechanisms can improve narrow agent behavior
  - WebRL improves one open-model web agent through online curriculum reinforcement learning
  - memory systems trade retrieval, updating, long-range understanding, and forgetting rather than solving all four
  - [WebRL](agent_frontier_papers/source_cards.md#webrl)
  - [MemoryAgentBench](agent_frontier_papers/source_cards.md#memoryagentbench)
- first-party preprint evidence: a specialized deep-research agent solved 51.5% of BrowseComp
  - the model was trained for BrowseComp-like tasks
  - more test-time compute and selection improved results
  - short-answer fact finding is not a normal web-query distribution
  - [BrowseComp](agent_frontier_papers/source_cards.md#browsecomp)

what remains brittle or weakly evidenced

- reliability collapses before headline capability does
  - tau-bench reports strong single-run results but under 25% retail `pass^8` for GPT-4o
  - the time-horizon study finds the 80% horizon four to six times shorter than the 50% horizon
  - repeated success is a different capability from occasional success
- longer work compounds state, judgment, and recovery errors
  - UltraHorizon, SWE-Bench Pro, TheAgentCompany, and OSWorld expose failure over many dependent actions
  - more tokens or retries can hide fragility while raising cost
- benchmark scores often reward proxies
  - unit tests can accept invalid patches
  - rubric or model graders can miss scientific defects
  - public tasks can leak into training, tool traces, or scaffold tuning
  - [UTBoost](agent_frontier_papers/source_cards.md#utboost)
  - [ScienceAgentBench](agent_frontier_papers/source_cards.md#scienceagentbench)
- human comparisons are narrow
  - human expertise, familiarization, time limits, tools, and incentives differ across studies
  - BrowseComp humans and the specialized model did not operate under equivalent conditions
  - PaperBench and RE-Bench are informative within their designs, not labor-market forecasts
- multi-agent results do not establish a general team advantage
  - extra agents also add samples, tokens, coordination paths, and correlated errors
  - [MultiAgentBench](agent_frontier_papers/source_cards.md#multiagentbench)
- safety is not a side constraint
  - prompt injection, harmful-task compliance, policy violations, and intentional subversion can directly defeat useful autonomy
  - existing defenses are benchmark-specific and often trade utility for safety
  - [AgentDojo](agent_frontier_papers/source_cards.md#agentdojo)
  - [AgentHarm](agent_frontier_papers/source_cards.md#agentharm)
  - [ST-WebAgentBench](agent_frontier_papers/source_cards.md#st-webagentbench)
  - [AI Control](agent_frontier_papers/source_cards.md#ai-control)

important gaps

- high-probability success across repeated runs, not mean success
- recovery after an early wrong assumption, tool error, or environment change
- fresh hidden tasks with independent semantic verification
- causal memory that updates and forgets without importing stale or poisoned state
- budget-matched evidence that separates better coordination from more compute
- joint usefulness and policy compliance under conflicting instructions
- human-agent complementarity measured across hours or days
- comparable cost, latency, intervention, and irreversible-error reporting
- external validity beyond software-heavy, synthetic, or sandboxed task distributions

what is reachable now

- inference: no missing scientific breakthrough blocks better evidence
- the near frontier is experimental discipline
  - fresh or mutable tasks
  - repeated trials and lower confidence bounds
  - fixed model, tool, token, time, and dollar budgets
  - counterfactual controls for memory, retries, and team size
  - independent artifact checks
  - human baselines with matched tools and onboarding
- recommendation: optimize the joint frontier of task value, reliability, cost, and harm
  - do not optimize benchmark completion alone

research missions

- 1. measure dependable horizon
  - why now
    - accepted evidence links human task time to success and shows repeated-run collapse
    - [time horizons](agent_frontier_papers/source_cards.md#time-horizons)
    - [tau-bench](agent_frontier_papers/source_cards.md#tau-bench)
  - first experiment
    - run one frozen agent on fresh tasks binned by human completion time with 20 independent seeds
    - fit 50%, 80%, and 95% horizons under one fixed dollar budget
  - success metric
    - preregistered increase in the lower 95% confidence bound of the 95% horizon without higher cost
  - main confounder
    - task-family mix and choice of reference humans
  - explicit non-claim
    - a longer software-task horizon is not general autonomous labor

- 2. make recovery a first-class capability
  - why now
    - long-horizon benchmarks expose compounding failures but usually score only final success
    - [UltraHorizon](agent_frontier_papers/source_cards.md#ultrahorizon)
    - [SWE-Bench Pro](agent_frontier_papers/source_cards.md#swe-bench-pro)
  - first experiment
    - inject matched tool failures, stale observations, and plausible wrong hypotheses
    - compare baseline, checkpoint, explicit replan, and rollback agents under equal budgets
  - success metric
    - conditional recovery probability and verified value per dollar after injection
  - main confounder
    - recovery methods may simply spend more inference
  - explicit non-claim
    - recovery from scripted faults does not establish open-world robustness

- 3. close the proxy-to-truth gap
  - why now
    - coding and science benchmarks show that tests and graders can accept defective artifacts
    - [UTBoost](agent_frontier_papers/source_cards.md#utboost)
    - [PaperBench](agent_frontier_papers/source_cards.md#paperbench)
    - [ScienceAgentBench](agent_frontier_papers/source_cards.md#scienceagentbench)
  - first experiment
    - create fresh tasks with hidden semantic tests and an independent expert audit
    - forbid the producer agent from querying the final verifier
  - success metric
    - lower false-accept rate at unchanged verified task success and audit cost
  - main confounder
    - the verifier may encode the same assumptions as the task author
  - explicit non-claim
    - passing hidden checks does not prove a generally correct solution

- 4. test memory causally across sessions
  - why now
    - current systems differ sharply across retrieval, learning, long-range integration, and forgetting
    - [MemoryAgentBench](agent_frontier_papers/source_cards.md#memoryagentbench)
    - [WebRL](agent_frontier_papers/source_cards.md#webrl)
  - first experiment
    - compare real memory with shuffled, stale, poisoned, no-memory, and equal-token full-context controls
  - success metric
    - future-task gain per stored byte with bounded stale-fact and poisoned-retrieval rates
  - main confounder
    - extra context and extra inference masquerade as memory quality
  - explicit non-claim
    - better benchmark memory is not human-like continual learning

- 5. optimize task success and policy compliance together
  - why now
    - tool agents fail domain rules, and web agents remain vulnerable to malicious or conflicting instructions
    - [tau-bench](agent_frontier_papers/source_cards.md#tau-bench)
    - [AgentDojo](agent_frontier_papers/source_cards.md#agentdojo)
    - [ST-WebAgentBench](agent_frontier_papers/source_cards.md#st-webagentbench)
  - first experiment
    - cross product fresh user tasks, unseen policy clauses, and adaptive prompt injections
    - use diverse simulators plus a blinded human audit subset
  - success metric
    - worst-group joint completion-and-compliance `pass^10` at a fixed intervention budget
  - main confounder
    - simulator behavior may define the apparent safety result
  - explicit non-claim
    - benchmark compliance does not establish safe deployment

- 6. find the human-agent R&D crossover
  - why now
    - agents can win short-budget R&D comparisons while humans overtake them at longer budgets
    - [RE-Bench](agent_frontier_papers/source_cards.md#re-bench)
    - [PaperBench](agent_frontier_papers/source_cards.md#paperbench)
    - [MLE-bench](agent_frontier_papers/source_cards.md#mle-bench)
  - first experiment
    - randomize experts to human-only, agent-only, and human-with-agent conditions at 1, 4, and 16 hours
  - success metric
    - independently scored quality-time-cost frontier and human uplift over human-only work
  - main confounder
    - participant selection, agent familiarity, and task-specific expertise
  - explicit non-claim
    - winning a bounded R&D task is not autonomous scientific discovery

- 7. isolate real coordination gains
  - why now
    - multi-agent systems are measurable, but more agents also mean more compute and more failure channels
    - [MultiAgentBench](agent_frontier_papers/source_cards.md#multiagentbench)
    - [AI Control](agent_frontier_papers/source_cards.md#ai-control)
  - first experiment
    - compare one agent, independent best-of-n, communicating peers, and a trusted-monitor team under equal token and tool budgets
    - randomize role assignment and communication topology
  - success metric
    - verified performance gain beyond best-of-n with lower correlated-error and undetected-subversion rates
  - main confounder
    - architecture-specific prompting can favor one topology
  - explicit non-claim
    - a gain in simulated teams is not evidence of emergent collective intelligence

bottom line

- accepted evidence supports useful bounded agency, not dependable general autonomy
- first-party preprint evidence supports deep browsing under specialization and high test-time compute, not general web competence
- inference: reliability, verification, recovery, and control are capability research
- recommendation: pursue the seven missions above before scaling task horizon or permissions
- residual uncertainty
  - search and omission limits are explicit in the [search log](agent_frontier_papers/search_log.md)
  - every absolute result may move with model, scaffold, budget, and benchmark version
