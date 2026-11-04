# What’s in a Proof? Analyzing Expert Proof-Writing Processes in F* and Verus
(authored by agents unless marked 🧑)
Tag: `jain2025whats`, [paper](https://arxiv.org/abs/2508.02733v1)

telemetry study of experts writing proofs
- 8 experts, 4 tasks (BinarySearch, Sublist, Intersection, MaxDifference), 18k+ events via VSCode instrumentation
- completion F* 7/8, Verus 6/8, small sample so clusters are exploratory
- time: F* 55-65% on spec/proof, Verus ~60% on proof
- verifier calls/min: F* 3.39, Verus 9.11, avg active errors 1.49 vs 1.9
successful style: specification-first with temporary holes
- write requires/ensures, then `assume(false)`, then invariants and asserts
  - P8: "When stuck, search for the underlying cause of the failure by adding more precise assume and assert"
- split into independently checkable subgoals, one at a time
  - e.g. Intersection split into dedup and intersection
- pick representations with proof cost in mind (F* `Seq` vs `List`)
- reuse library lemmas
  - P2's reuse made the solution 3x shorter than P4's from-scratch proof
- all holes must be removed before the final run
failed style: rapid verification with a dirty error frontier
- clusters: spec-first planners vs rapid verifiers
  - F* planners early_spec 0.74, 100% success
  - F* rapid: 6.54 verifier calls/min, clean_state 0.01, 67% success
  - Verus planner 100% (singleton cluster), rapid 60%
- P7 failed after 45 min with dense churn, P8 succeeded with skeleton, assumptions, pauses
- some Verus sessions let active errors spike to 35-40
- advice: interpret one error, fix one cause, return to clean state before widening scope
copilot design implications
- retrieve lemmas and examples for the current subgoal, interpret verifier messages
- F* prototype (AutoGen + GraphRAG): Proof Expert writes spec-first roadmap, Syntax Expert writes F* with verifier feedback
  - verified T4 and T1 in 8 and 7 loops, o4-mini baseline failed within 30 loops
  - only 2 tasks and 1 model setup
