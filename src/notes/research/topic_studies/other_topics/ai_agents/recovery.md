can an agent recover without repeating an action
(authored by agents unless marked 🧑)

research question

- inference: the useful systems question is whether restarting an agent preserves both progress and the meaning of actions already taken
  - example: a refund succeeds, but its response is lost
  - retrying can refund twice
  - restoring the conversation alone does not restore the payment system
- recommendation: measure recovery under uncertain action outcomes before proposing another checkpoint mechanism
- this complements [coordination](coordination_specialization.md), [memory](memory_rag.md), and [browser actions](browser_agents.md)

what existing evidence establishes

- time horizon means the human task duration at which fitted agent success reaches a stated percentage
- [Measuring AI Ability to Complete Long Software Tasks](https://arxiv.org/abs/2503.14499), Kwa and colleagues
  - reading: local paper text, reliability and limitations sections
  - source, section 3.2.1: “models' 80% time horizons are 4-6x shorter”
  - source, same section: “we cannot confidently measure time horizons at very high success rates”
  - claim: occasional success on long tasks does not imply dependable success on shorter tasks
  - limit: software-heavy tasks and particular models plus scaffolds
  - inference: do not call a fitted 50% horizon a dependable working duration
- [tau-bench](https://openreview.net/forum?id=roNSXZpUDN), Yao, Shinn, Razavi, and Narasimhan
  - reading: local paper text, evaluation and cost sections
  - source, section 5.1: “passˆ8 drops to < 25%”
  - context: GPT-4o function calling in the retail domain
  - eight successful independent attempts on the same task are different from one uninterrupted eight-step task
  - limit: simulated users and final database checks
  - inference: outcome checks help, but do not establish safe retry behavior after a lost response
- [UltraHorizon](https://openreview.net/forum?id=qRNtMWrTvo), Luo and colleagues
  - reading: local paper text, interaction scaling and failure analysis
  - source, takeaway 4: “Simply increasing interaction steps does not reliably improve long-horizon task performance”
  - method: hidden-rule discovery in three synthetic environments
  - authors try fresh attempts with summarized knowledge
  - limit: this resets reasoning context, not transactions in an external service
  - inference: distinguish recovery from a wrong hypothesis from recovery after a committed external action
- [LangGraph persistence documentation](https://docs.langchain.com/oss/python/langgraph/persistence), LangChain
  - reading: full documentation page on 7 Oct 2026 UTC
  - source: “Checkpointers persist a thread’s graph state as checkpoints”
  - inference: conversation persistence already exists as a practical feature
  - limit: application developers still define state and external tool behavior
- [Inspect sandboxing documentation](https://inspect.aisi.org.uk/sandboxing.html), UK AI Security Institute
  - reading: full documentation page on 7 Oct 2026 UTC
  - source: “the side effects of a failed first attempt may affect the results of subsequent attempts”
  - context: timeout retries for commands that are not idempotent
    - idempotent means repeating an operation has the same effect as doing it once
  - inference: automatic retries can introduce errors even before model reasoning is involved

proposed experiment: uncertain outcomes

- question: which recovery mechanisms prevent duplicate or missing external actions at equal inference budget
- start with a local service
  - operations: create an order, issue a refund, update a record, publish a file
  - the service records the actual committed state
  - the agent sees only the tool interface and returned observations
- randomly inject one failure at a known action boundary
  - request lost before the service receives it
  - action committed, response lost
  - response delayed until after retry
  - original request arrives after lookup reports absent
  - process dies after the tool returns but before its result is saved
  - restored observation refers to an old record version
- compare four conditions
  - ordinary agent with the same tool interface
  - agent with saved conversation and automatic retries
  - agent with durable atomic service-side deduplication and outcome lookup
    - the service commits each operation identifier at most once
    - retries must use identical request arguments
    - records last longer than the allowed retry window
    - lookup distinguishes pending, committed, and absent outcomes
  - agent with that mechanism plus explicit reconciliation before continuing
    - reconciliation means checking committed state against the intended action
- hold fixed
  - model snapshot, prompts outside the tested mechanism, task instances, token budget, tool-call budget
  - repeat across at least two models and two task families after a small pilot
- score using the service log
  - verified task completion
  - duplicate and omitted actions
  - remaining inconsistency after recovery
  - extra calls, latency, tokens, and money
  - classify whether failure came from reasoning or from the retry mechanism
- first pilot
  - 20 task templates, each with a no-fault twin
  - cross the six fault types above with two eligible action positions
  - randomize condition order and pair runs by task and fault
  - start with one model to test whether the fault generator produces the intended state
  - estimate sample size from pilot variance before claiming an improvement
- convincing result
  - a reproducible map of which guarantees the service must expose for safe recovery
  - fewer duplicate actions without merely abandoning more tasks
  - benefit beyond checkpointing and a handwritten workflow with the same service guarantees
- result that defeats the idea
  - a conventional workflow with operation identifiers eliminates the failures equally well
  - agents never encounter these failures in representative workloads
  - added recovery context costs more than the verified improvement

closest prior work and novelty limits

- checkpointing, write-ahead logs, operation identifiers, transactions, and workflow retries are established systems methods
- LangGraph already saves execution state
- Inspect already documents retry hazards
- [Temporal Activities documentation](https://docs.temporal.io/activities), checked during independent review
  - source: “We recommend that it be idempotent, so retries can be processed without duplicate side effects”
  - inference: the scripted-workflow baseline should use Temporal or equivalent retry semantics
  - this recommendation does not itself guarantee idempotent external services
- UltraHorizon already studies reasoning recovery
- recommendation: claim novelty only in agent-specific measurement or a demonstrated interface requirement
  - do not claim a new transaction protocol merely because an LLM uses it
- missing search
  - current literature discovery was incomplete because both exposed web search tools failed
  - direct fetches and local primary texts worked
  - the proposed workload has not been compared with a running Temporal baseline
  - no exhaustive novelty claim is made

how this fits the human’s interests

- connects agent behavior to faults, state consistency, and independent verification
- produces useful negative results if conventional systems machinery suffices
- can reuse tasks across browser execution, team coordination, and stale memory studies
  - each study must retain its own intervention and controls
