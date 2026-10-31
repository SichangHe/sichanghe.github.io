# Don’t Trust the Code, Check Its Effects: Runtime Refinement for Regenerated Systems Code Under an Adversarial Generator
(authored by agents unless marked 🧑)
Tag: `hu2026effects`, [paper](http://arxiv.org/abs/2609.00430v1)

## claim and scope

This position paper addresses regenerated systems code whose effects are irreversible and whose generator may be Byzantine. Its central boundary is proposal-commit separation: generated code observes and proposes, while a fixed mediator validates and commits effects. The paper states, “The generated component becomes a planner that proposes effects but performs none; a fixed, handwritten mediator owns every effect primitive” (section 2, page 2). It is a design argument, not an implemented or measured verifier: the authors explicitly say, “This is a position paper: no formal semantics, mechanized proof, implementation, or measurement.” (section 2, page 2)

## technique: deny generated code effect authority

What it is: confine regenerated code so it cannot touch devices, kernel memory, MMIO, or DMA directly. It may send only an attempted effect plus a capability-like observation token to the mediator. The mediator owns the specification, effect primitives, abstract state, and append-only commit log. The paper’s protocol has four stages: Dispatch a pending request; the driver calls Observe to receive permitted abstract state and a fresh sealed token; the driver sends Propose with one attempted command and the token; the mediator runs Validate and then either Rejects or Commits (section 3, pages 2–3).

How to apply it: (1) define an interface-level transition specification, not an implementation description; (2) expose only Observe and Propose to the driver; (3) derive request-fixed fields in the mediator from the pending kernel request; (4) let the driver choose only fields the specification permits it to choose; (5) bind the token to request identity, abstract-state version, and expiry; (6) validate under a commit lock; (7) consume the token on both accept and reject; (8) invoke the trusted primitive only after validation; (9) record the outcome and state transition in the commit log. The paper says, “The mediator runs Validate under a commit lock, and rejects a replayed, expired, superseded, or stale token.” (section 3, page 3)

The WRITE example fixes operation, LBA, length, and DMA buffer from the kernel request; the driver chooses a free queue slot. Outcomes are closed to `ok`, `EIO`, or `short(n)`, each with a specified abstract-state transition (Figure 2, page 3). A proposal with LBA 200 for a pending LBA 100 request is rejected before the doorbell rings, even though an IOMMU cannot see the LBA (section 3, page 3).

Verus form (Inference): represent the mediator as trusted executable Rust with a `spec fn` transition relation, a request record, a token record, and an abstract state. Use `requires` to require a valid token and `ensures` to state that accepted commands match the request and advance state according to the outcome. Keep generated planning code outside the trusted effect function; pass proposals as ordinary data. Use `proof fn`s and `assert`s to prove token freshness, request-field equality, and state transitions. Verus can verify the mediator’s Rust logic, but it cannot by itself make an unverified generated component unable to bypass the mediator; confinement and the effect adapter remain trusted assumptions (Inference).

## technique: validate against mediator-held intent and state

The mediator must retain the pending request and re-derive fixed values rather than trusting the proposal. It checks every fixed field against the request and every free field against the permitted set. It also checks token freshness under the lock, then commits only an effect that refines the specification. The guarantee claimed is trace refinement: “every committed sequence of externally visible effects is a prefix of a trace the specification allows over the declared effect vocabulary.” (section 3, page 4)

Step by step: (1) hold the caller’s request in mediator state; (2) derive operation, address, length, and authorized buffer from that request; (3) compare proposal fields with those values; (4) check chosen slots or similar free fields against the observed permitted set; (5) reject stale, replayed, expired, or superseded tokens; (6) consume the token regardless of the result; (7) run the primitive and classify the actual outcome; (8) update abstract state and log the outcome. A device error such as EIO is a committed outcome with a state transition, whereas a failed validation is externally silent (section 3, page 3).

## technique: draw the mediability envelope before deploying

The paper gives six conditions. The effect vocabulary must supply legibility (each effect identifies its operation), specification-input observability (the mediator sees every transition input), and correlatability (effects group into operations with recoverable order). Deployment must supply completeness (no state change bypasses the boundary), outcome enumerability (all primitive outcomes are classifiable), and explicit durability (persistence is represented by an effect such as flush or barrier). The paper says, “Six conditions delimit it, and they are of two kinds.” (section 4, page 4)

Use the checklist as follows: (1) choose the specification altitude; (2) test whether each individual effect names its operation without replaying history; (3) verify that every input used by the transition is visible at that altitude; (4) establish a recoverable operation identity and commit order under concurrency; (5) close all paths by confinement, shadow memory, or IOMMU authorization; (6) enumerate success, errors, and partial completion; (7) make durability explicit and verify flush/barrier ordering; (8) reject the design or lift the boundary if any item fails. The paper says a block-write vocabulary fails legibility, specification-input observability, and correlatability, while a virtual-filesystem interface can sit inside the envelope at greater state cost (section 4, pages 4–5).

Verus form (Inference): make each envelope condition a documented invariant at the Rust boundary. Use `requires` for authorized buffers and request identity, `ensures` for outcome closure and state updates, and ghost logs for correlatability and durability. This is a design-screening technique, not a Verus library feature.

## concurrency, failure, and limits

Validation, primitive invocation, abstract-state updates, and log insertion run under one commit lock; stale proposals are rejected and replanned. A multi-primitive guest operation is not atomic unless the vocabulary supplies an atomic primitive or substrate locking (section 3, page 3). The mediator guarantee excludes liveness, availability, timing channels, and defects in the specification. A Byzantine driver may propose nothing or stall, and an unenumerated outcome or specification defect is enforced faithfully rather than detected (sections 3–4, pages 4–5).

What is proved or measured: nothing experimentally; there is no implementation, formal semantics, mechanized proof, or measurement. What remains trusted: confinement, mediator code and compiler, effect adapters, specification and interpreter, commit serialization, complete mediation, and crash model.

## techniques for the catalog

- proposal-commit separation — confine generated code to planning and let a trusted mediator validate and commit effects
- mediator-held intent — re-derive request-fixed fields and validate proposals against mediator state
- sealed observation tokens — bind observations to request and state versions, then consume tokens under a commit lock
- outcome-closed transitions — enumerate every primitive outcome and its abstract-state transition
- mediability envelope — screen effect vocabularies for legibility, observability, correlatability, completeness, outcome closure, and durability
