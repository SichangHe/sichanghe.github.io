# SAGE: Symbolic Action-Gating and Editing for LLM Task Planners
(authored by agents unless marked 🧑)
Tag: `bui2026sage`, [paper](https://arxiv.org/abs/2609.34268)

## what the paper measures

SAGE is a single-LLM embodied planner that inserts a deterministic symbolic precondition verifier before simulator execution and repairs only the failed sub-goal’s suffix. A hierarchical decomposition supplies explicit sub-goal blocks, and a hybrid memory retrieves curated seed plans plus successful episodes (§III, pp. 3–5). The verifier is approximately 250 lines of Python, makes no model call, and runs in O(|π|) time. The paper describes its core discipline as “verify-before-execute” (§III-B, pp. 3–4). It also reports: “the symbolic monitor blocks unsafe actions before actuation and raises simulator-reported step-success for every planner tested (up to +0.11), a signal the verifier never sees, so the gain is non-circular” (abstract, p. 1).

The benchmark uses 75 AI2-THOR household tasks: 38 curated simulator-verified tasks and 37 held-out generated tasks, where the 37 generated tasks split into 14 easy, 16 medium, and 7 hard (§IV-A, p. 5). Five open-weight models are tested, but the leak-free leave-one-out and compound studies use four models: qwen2.5:7b, qwen2.5:14b, llama3.2, and mistral-nemo. The harder method-agnostic compound set has 74 two- and three-goal tasks, built by composing same-scene single-goal tasks (§IV-C, p. 6); the protocol gives n=37 held-out base tasks and n=74 compound tasks (§IV-A, p. 5). Metrics are completeness, simulator step success, symbolic precondition strictness, and LLM calls/tokens (§IV-A, p. 5).

The standard benchmark is saturated: 52% of instances are solved by every strong hierarchical baseline, and SAGE ties rather than claiming a completeness win (§IV-B, p. 5). On the compound set, SAGE leads Hierarchical Few-Shot by +0.078 (qwen2.5:7b), +0.119 (qwen2.5:14b), +0.229 (llama3.2), and +0.057 (mistral-nemo); pooled over 296 model-task instances, the gain is +0.121 with 95% bootstrap CI [+0.092,+0.150] and p<10^-4 (§IV-C, p. 6). Inference: the pooled denominator of 296 equals 74 tasks times four models. The paper attributes the gain to brevity and validity, not per-step grounding: SAGE’s plans are shorter (12.0 steps versus 17.8 for Hierarchical Few-Shot on qwen2.5:7b) and its per-step hallucination rate matches the baseline (0.53 versus 0.55) (§IV-C, p. 6).

In grounded AI2-THOR execution, pooled step success is 0.71 for SAGE versus 0.60 for Direct and 0.63 for Hierarchical; precondition-violation failures fall from 4.5% for Direct to 0.27% for SAGE, a 17× reduction (§IV-D, p. 6). These grounded runs use the 38 simulator-verified tasks, which the paper says “overlap the seed memory, so this comparison favours memory-using SAGE” (§IV-D, p. 6). Under one injected mid-execution failure per task, every method recovers 100%, but SAGE uses 1.18 LLM calls versus 2.87–3.71 for whole-plan replanners, a 2.4–3.1× reduction; compound tasks widen the ratio to 2.6–3.3× (§IV-D, p. 6). The paper explicitly narrows this efficiency claim to recovery cost: overall SAGE uses roughly seven times the tokens of one-shot Direct (§IV-H and conclusion, pp. 7–8).

## technique 1: define a typed symbolic state and action schema

What it is. A household task is τ=(ℓ,S_0), where ℓ is a natural-language description and S_0=(o_0,V_0) is an initial observation and visible-object set. A plan is a sequence of actions a_t=(verb_t,obj_t). Each action has a precondition pre(a) and effect eff(a) over a symbolic state σ with fields arrived, found, holding, opened, and on (§III-A, p. 3). A plan is valid when every precondition holds in the state produced by preceding effects.

How to apply it. (1) Choose a fixed action vocabulary such as MoveTo, Find, Pick, Place, Open, Close, TurnOn, and TurnOff. (2) Define the minimal state predicates needed by those actions. (3) For each verb, list required predicates and state toggles. (4) Define typed violation reasons such as NO_FIND_BEFORE_PICK or PLACE_WRONG_LOCATION. (5) Apply effects only after a precondition check succeeds (§III-A–B, pp. 3–4).

The paper’s concrete examples are: Pick requires found≠∅ and holding=∅; Place r requires holding≠∅ and arrived=r; Open/Close/TurnOn/TurnOff require found equal to the object; PutIn c requires c∈opened (§III-B, p. 4).

Verus form. Inference: represent σ and actions as Rust enums/structs, define `spec fn precondition` and `spec fn effect`, and state `requires precondition(a, s)` and `ensures` describing the resulting fields. Inference: a loop over actions can carry a Verus `invariant` that the symbolic state equals the fold of prior effects and that every processed action satisfied its precondition. Inference: simulator physics and perception are external assumptions unless their transition functions receive verified specifications.

Evidence and limits. The rules are hand-written from the AI2-THOR action ontology, although the paper also auto-induces them from interaction data. Inference: the vocabulary-specific monitor is therefore a model of selected predicates, not a complete household-world model. The paper lists residual absent-object hallucination as a shared small-model weakness (§IV-J, L5, p. 7).

## technique 2: verify every action before execution

What it is. Algorithm 1 initializes σ to σ_0 and scans the plan. For each action it calls verifyStep(a_t,σ); on failure it records (t,a_t,r) and stops, otherwise it applies the effect and continues (Algorithm 1, p. 3). The paper says the identical rule set drives the heuristic precondition column in its tables (§III-B, p. 4).

How to apply it. (1) Initialize the symbolic state. (2) For each planned action, evaluate its typed precondition. (3) If false, return the first violation with its reason and do not dispatch the action. (4) If true, update the symbolic state with eff(a). (5) Pass the resulting action stream to the simulator only after this scan or incrementally before each dispatch (Algorithm 1, p. 3; §IV-G, p. 7: “before a step is dispatched we check it against the symbolic state”).

The paper stresses that the verifier never invokes an LLM and runs in O(|π|) time with zero tokens (§III-B, p. 4). The monitor checks each step before it is dispatched and repairs the sub-goal before the action is taken, which differs from execute-then-recover after the actuator has already moved (§IV-G, p. 7). The paper’s execution is simulated only.

Verus form. Inference: expose `verify_step` as an executable function with a specification predicate for each action and `ensures` that a successful result implies the precondition held. Inference: prove that the dispatch wrapper calls the actuator only on the success branch; keep actuator calls behind an explicit trusted external specification. Do not treat the model’s plan text as a proof.

Evidence and limits. On 38 grounded tasks across four models, the monitor blocks 206 precondition-violating actions before actuation. It raises Direct’s simulator step success by +0.107 (p<10^-4), while improvements are smaller and nonsignificant for planners already checking structure (SAGE +0.016) (§IV-G, p. 7). The authors state: “The benefit on simulator-reported step-success is independent of the verifier” (§IV-G, p. 7). The abstract gives the reason as “a signal the verifier never sees” (p. 1).

The monitor does not establish goal achievement. The paper reports unreliable in-simulator goal-condition checkers and instead uses a blinded two-rater human evaluation on 72 items, where SAGE scores 0.53 end-task success versus 0.40 Direct and 0.28 Hierarchical, with Cohen’s κ=0.65 (§IV-D, p. 6).

## technique 3: decompose plans into sub-goal blocks

What it is. SAGE makes one high-level call to decompose a task into 2–5 sub-goals, then one expansion call per sub-goal. Each expansion is stored as a typed `_SubgoalBlock`; the flat plan is produced only at execution time (§III-C, p. 4).

How to apply it. (1) Retrieve examples for the task. (2) Ask the high-level planner for ordered sub-goals. (3) Expand each sub-goal into a contiguous action block conditioned on the current symbolic state. (4) Verify and locally refine that block before rolling its effects into the next state. (5) Append the block and retain its boundary for future repair (Algorithm 2, p. 4).

The call cost is 1+K+R, where K is the number of sub-goals and R≤K is the number of refinement passes from verifier rejection (§III-E, p. 4). Explicit boundaries preserve completed work and untouched future blocks when a later action fails.

Verus form. Inference: represent a block with its sub-goal identifier, actions, and pre/post states; specify that concatenating verified blocks preserves each block’s post-state as the next block’s pre-state. Inference: prove a block-level loop invariant over the sequence of completed blocks, while treating LLM expansion as an untrusted producer checked by the symbolic verifier.

Evidence and limits. The compound benchmark is designed to remove the base metric’s ceiling by composing 74 tasks with mean expected-object count 3.7 versus 2.0 in the base set (§IV-C, p. 6). Inference: this set tests multi-goal plan coverage in simulation, not decomposition in isolation, because the listed ablations remove the verifier, the repair, and the memory, not the decomposition (§IV-A, p. 5); it does not test real-robot execution (§IV-J, L1, p. 7).

## technique 4: repair only the failed suffix

What it is. On a failed action, Algorithm 3 recovers the symbolic state at failure, locates the failed sub-goal and future blocks, retrieves examples for that sub-goal, and asks the LLM to regenerate only its suffix. The suffix is verified; if needed, one refinement pass uses the typed violation; then the repaired suffix is concatenated with untouched future blocks (§III-E, p. 4; Algorithm 3, p. 5).

How to apply it. (1) Simulate the completed prefix C without any LLM call to obtain σ*. (2) Locate the failed block g* and its future blocks B>. (3) Retrieve k examples for g*. (4) Generate π_suf conditioned on g*, σ*, failed action, reason, and examples. (5) Verify π_suf against σ*. (6) If invalid, refine once using the typed reason. (7) Return π_suf followed by the flattened untouched future blocks (Algorithm 3, p. 5).

The paper compares this with whole-plan replanning and reports equal 100% recovery on the injected-failure study, but much lower calls: 1.18 for SAGE versus 2.87–3.71 for Hierarchical Few-Shot, Self-Refine, and ReAct (§IV-D, p. 6). The paper’s quote is: “R EPLAN costs at most two LLM calls and never replans already-executed steps” (§III-E, p. 4).

Verus form. Inference: model the completed prefix and future blocks as immutable sequences and define a repair function with `requires` that the prefix state is the recorded failure state. Use `ensures` to state that the returned plan begins with a suffix valid from σ* and preserves the future blocks byte-for-byte. Inference: prove prefix preservation and suffix validity; the regenerated text and its semantic adequacy still require the symbolic checker and, for goal achievement, an external task model.

Evidence and limits. Recovery results use one injected mid-execution failure per task, so they measure a controlled failure mode. SAGE’s full planning cost remains high, and the authors state the 2.4–3.3× claim is not a general token-cost advantage (§IV-H, p. 7).

## technique 5: combine curated and live retrieval without test leakage

What it is. The hybrid memory M=M_seed∪M_live contains 38 curated simulator-verified plans loaded once and successful runtime episodes appended after completion. Retrieval uses embeddings when available and Jaccard similarity as a minimal-install fallback (§III-D, p. 4). A leave-one-out protocol holds a test task’s own seed exemplar out of memory (§IV-A, p. 5).

How to apply it. (1) Normalize action names to the canonical vocabulary. (2) Load the curated seed pool for cold-start coverage. (3) Append successful plans to a persistent JSONL live pool. (4) Retrieve top-k examples by task similarity. (5) Render each as a typed task/reasoning/plan block in the decomposition and expansion prompts. (6) For evaluation, remove the current test task’s seed exemplar before retrieval (§III-D and §IV-A, pp. 4–5).

Verus form. Inference: treat memory entries as records carrying a task identifier and verified plan certificate. Inference: specify that retrieval excludes the current test identifier and that a live entry is inserted only after a successful completion predicate. A proof can establish no direct seed/test leakage in the store; it cannot prove semantic similarity of an embedding.

Evidence and limits. The paper reports that the seed pool provides cold-start coverage that a live-only pool lacks, while SAGE-NoMemory loses this coverage (§I, p. 2; §IV-H, p. 7). The base-set performance tie and compound gains are reported under leave-one-out, and the paper concludes the advantage “is no leakage artifact” (§IV-C, p. 6). Inference: the paper does not say how seed exemplars are held out for compound tasks built from several seed tasks, so that leak-freedom is the authors’ claim, not something checked here.

## what is trusted and what VL should reuse

Inference: trusted components include the hand-written or induced action schema, the AI2-THOR simulator and transition model, object visibility, LLM output, retrieval similarity, the human task interpretation, and the metric implementations. The monitor proves only the predicates it encodes. The paper is simulation-only; it explicitly makes no real-robot claim (§IV-J, p. 7). Its goal checker is unreliable, and its ALFWorld transfer is limited by vocabulary mismatch and the fact that on ALFWorld step executability saturates at 1.0 while end-task success floors at ≤0.04 (§IV-E, p. 7; §IV-J, L4 and L7, pp. 7–8).

Inference: VL should reuse a typed precondition/effect layer between agent-generated Rust and effectful execution, with a proof-carrying check before each external operation. Inference: failed operations should preserve a verified prefix and repair only the smallest affected suffix, while contracts identify which future work is untouched. Inference: a Verus implementation can prove state-transition and no-dispatch-on-failure properties, but it must mark simulator, filesystem, network, and model calls as trusted interfaces with explicit specifications.

The paper’s negative result matters: standard goal-completeness saturates at 52% and cannot distinguish methods (§IV-B, p. 5). VL should therefore report grounded step success, proof-check success, recovery calls, and trusted-boundary failures instead of relying on one saturated task score. Inference: SAGE should not be reimplemented as a generic LLM self-critique loop: its measurable contribution is the deterministic precondition monitor plus local repair.

## techniques for the catalog

- typed action schema: model actions as preconditions and effects over a small symbolic state with typed violation reasons
- verify-before-dispatch monitor: check every action deterministically and block precondition violations before execution
- hierarchical sub-goal blocks: preserve explicit block boundaries between high-level decomposition and action expansion
- suffix-only repair: regenerate and reverify only the failed sub-goal’s suffix while retaining completed and future work
- leak-free hybrid memory: combine curated seed plans with successful live episodes under leave-one-out retrieval
- grounded safety evaluation: measure simulator step acceptance, blocked unsafe actions, recovery calls, and checker limitations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Unlike the saturated base benchmark the metric here discriminates, and the advantage is no leakage artifact: the harder tasks are a method-agnostic composition under the same leave-one-out protocol."): read all 8 pages of the paper text; checked every quotation, number, section and page reference and every technique step against it; changed page and section references (III-E is on p. 4, the conclusion on p. 8, Algorithm 2 on p. 4), clarified the 14/16/7 split applies to the 37 generated tasks, corrected ALFWorld (step executability saturates, end-task success floors), removed the claim that robots receive actions (paper is simulation only), added the paper's caveat that the grounded execution tasks overlap the seed memory, and marked my own conclusions Inference; did not check the online appendix, the GitHub artifact, the reference list or the claims in sections IV-E to IV-F beyond those cited here; link kept (arXiv id 2609.34268 appears in the paper text).
