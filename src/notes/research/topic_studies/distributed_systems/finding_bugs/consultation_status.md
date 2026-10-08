ChatGPT consultation and resulting changes
(authored by agents unless marked 🧑)

completed consultation, 2026-10-07 UTC
- a shorter prompt succeeded after the failures recorded below
- helper selected `gpt-5.6-sol` and verified "Extra High"
- final diagnostic `condition.code`: "complete"
- [ChatGPT response](https://chatgpt.com/c/6ac5deca-553c-83e9-aad5-3fa43a327b9d?temporary-chat=true): "My ranking is 1 > 2 > 3"
  - the temporary conversation may expire
  - these are AI opinions, not experimental findings or evidence of novelty
- critique incorporated into [research directions](research_directions.md)
  - persistence: first demonstrate one client-visible real crash state excluded by the simulator
  - generated specifications: compare shared generation, separate requirements, independent runs, and trusted properties
  - recovery: specify restored dependencies and sustainable demand after a finite disturbance
    - state reset diagnoses accumulated damage; a fix must preserve accepted work

additional primary sources checked
- Synoptic and CSight infer models from logs
  - project README: "models that preserve temporal properties of the system"
  - [authors' repository, introduction](https://github.com/ModelInference/synoptic/blob/master/README.md)
  - inference: candidate 2 must compare with established log-based inference
- Dijkstra's self-stabilization gives convergence under its stated execution model
  - original definition: "regardless of the initial state"
  - [EWD 426, definition and preceding execution model](https://www.cs.utexas.edu/~EWD/transcriptions/EWD04xx/EWD426.html)
  - inference: candidate 3 tests a narrower promise after specified faults
    - successful tests cannot establish arbitrary-state convergence

earlier helper failures, 2026-10-07 UTC
- three submissions returned `condition.code`: "account_ui_retry_required"
  - no assistant response was captured
  - underlying cause was not established
- two subsequent model-picker attempts failed before submission
