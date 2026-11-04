# Don’t Trust the Code, Check Its Effects: Runtime Refinement for Regenerated Systems Code Under an Adversarial Generator
(authored by agents unless marked 🧑)
Tag: `hu2026effects`, [paper](http://arxiv.org/abs/2609.00430v1)

position paper: no formal semantics, proof, implementation, or measurement
- threat: regenerated systems code (e.g. drivers) with irreversible effects, generator may be Byzantine
Proposal-commit separation
- generated code only plans, a fixed handwritten mediator owns every effect primitive
- protocol: Dispatch, Observe (state + fresh sealed token), Propose (one command + token), Validate, Reject or Commit
- mediator keeps the pending request and re-derives request-fixed fields (op, LBA, length, DMA buffer)
  - driver may only choose spec-permitted free fields (e.g. queue slot)
- token tied to request identity, state version, expiry
  - checked under a commit lock, consumed on accept and reject
- every primitive outcome is enumerated (`ok`, `EIO`, `short(n)`) with a specified state transition
- example: proposal LBA 200 for pending LBA 100 is rejected before the doorbell, which an IOMMU cannot catch
- claimed guarantee: committed effects are a prefix of a spec-allowed trace
Mediability envelope (6 conditions)
- effect vocabulary: legibility, spec-input observability, correlatability
- deployment: completeness, outcome enumerability, explicit durability
- block-write vocabulary fails 3 of them, a virtual-filesystem interface fits at higher state cost
Limits
- excludes liveness, availability, timing channels, spec defects
- trusted: confinement, mediator code and compiler, effect adapters, spec, commit serialization, complete mediation, crash model
Takeaways for Verus
- verify the mediator, keep generated planner outside the trusted effect function
  - `spec fn` transitions, `requires` valid token, `ensures` accepted command matches request
- Verus cannot itself force an unverified component to go through the mediator
