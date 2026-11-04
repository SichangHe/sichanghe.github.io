# SpecAgent: Empowering Program Verification with Agentic Synthesis of Formal Program Specifications
(authored by agents unless marked 🧑)

agentic acsl synthesis for c via 4 components: plan, rag, repair, critique
- evaluated on 50 programs from 14 repos, 811 verification targets
  - deepseek-v4: 96.82% precision, 88.95% recall, 604/811 targets discharged (74.5%)
  - per repo: X509-parser 140/140, Contiki 137/163, Atomthreads 109/239, SV-COMP 218/269
  - success substantial but incomplete
- transfer to Verus is inference, not tested
dependency-aware planning before writing contracts
- deterministic context: signatures, caller-callee relations, loop positions
- planning agent lists targets, intended semantics, dependencies, order in natural language
- planning alone is not enough
  - recall deepseek 80.93% -> 83.99%, gpt-5 72.14% -> 71.51%
  - authors: ablations not independent, components change later trajectories
structural retrieval of verified examples
- kb of 184 function-level units from the acsl tutorial
- 32-bit structural fingerprint, filter on loop structure and return type
  - rank by jaccard, inject top 3 into the prompt
- edits restricted to annotations, never code
  - specgen modified source code and invalidated some targets, supports annotation-only edits
- no retrieval-only ablation
verification gate with provenance-aware repair
- map each failure to caller, callee, source line as json
- repair agent decides local, semantic, or weak upstream contract
  - upstream weak contract: reopen callee and propagate
- repair raises precision to 94.79% (deepseek), 94.34% (gpt-5) from 89.78%, 88.66% generation only
- wp is incomplete, valid candidate can look failed
strength critique after proof success
- proof shows consistency, not that the contract says enough
- critique returns accept, improve (local), or replan (dependency)
- critique raises recall by 8.02 pts (deepseek), 10.63 pts (gpt-5)
  - plateaus after 6-8 invocations at ~97% precision, ~90% recall
return-determinacy completeness probe
- harness: m := f(x); n := f(x); assert m = n
  - proved => contract uniquely determines return
  - failed => keep obligations as refinement evidence
- only for deterministic functions, not heap effects or relational properties
- Verus: same harness, `ensures` and quantified invariants make equality provable
deterministic state-machine orchestration over react agents
- orchestrator controls roles, budgets, termination
  - planning and critique 10 steps, generation and repair 30, total invocations capped at 10
- agents share a workspace, no mutable conversation state
- cost on deepseek per program: 1684s, 25.58 frama-c calls, 99.4 llm calls, $0.62
