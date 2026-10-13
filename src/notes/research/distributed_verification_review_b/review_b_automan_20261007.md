AutoMan and tla-rs: generated code, refinement, and trusted runtime
(authored by agents unless marked 🧑)

result
- AutoMan generates Dafny implementation code and proof obligations
    - generated code is checked separately
    - generator correctness need not be trusted for successful output proofs
- tla-rs ports this workflow into Rust and Verus
    - inspected RSL and Raft theorems cover finite behavior refinement
    - they establish safety correspondence, without an eventual-progress theorem
- verification counts and runtime benchmark results remain repository-author reports
    - no proof, build, or benchmark was reproduced

AutoMan: Facilitating Verified Distributed Systems Development Through Automatic Code Generation and Manual Optimizations
- Zihao Zhang, Ti Zhou, Christa Jenkins, Omar Chowdhury, Shuai Mu
    - SOSP 2025
    - [DOI](https://doi.org/10.1145/3731569.3764822)
    - [author PDF](https://mpaxos.com/pub/automan-sosp25.pdf)
    - [source](https://github.com/stonysystems/automan)
- full paper read from the author PDF
    - title and author list checked
- §1: “the generated implementation is formally verified in step ❸”
    - that step checks implementation refinement separately from generation
- §3 generates type abstractions, validity conditions, and action contracts
    - annotations identify input and output parameters
    - mode analysis rejects unsupported specifications
    - generated postconditions connect concrete results to model actions
- §4 allows manually optimized code to replace generated code
    - replacement must satisfy the corresponding refinement obligations
- §5 cases
    - Multi-Paxos from IronFleet
    - PBFT, with a new Dafny protocol specification and centralized-state refinement
    - sharded key-value store
    - CausalMesh, with a TLA+ specification translated into Dafny
- unsupported existential actions require manual implementation
    - collection operations sometimes require manual proof annotations
    - §5.1.1 and §5.2.1 describe these gaps
- discussion: “does not provide guarantees for proof automation”
    - generating obligations does not guarantee the verifier can discharge them
    - left-to-right analysis limits the accepted Dafny fragment
- §4.1 excludes protocol redesign absent explicit specification changes
    - changing quorums or message flow requires updating the modeled protocol
- guarantee scope
    - paper claims implementation refinement and a safety guarantee
    - mentions liveness as a capability of underlying formalisms in §2
    - no new eventual-response theorem was identified for these case studies
    - inference: preserve inherited progress results only with their separate proof and deployment assumptions

human work still required
- choose and prove the low-level protocol specification
- supply dataflow annotations and unsupported actions
- discharge generated proof obligations
- profile performance and prove replacement code
- inference: this automates the model-to-implementation step
    - vague intent to adequate specification remains a separate task

paper saved
- one new PDF saved to the paper collection
    - directory title: AutoMan- Facilitating Verified Distributed Systems Development Through Automatic Code Generation and Manual Optimizations, Zihao Zhang, Ti Zhou, Christa Jenkins, Omar Chowdhury, Shuai Mu, SOSP, 2025
    - file: paper.pdf
    - PDF signature and title page checked

tla-rs primary source audit
- [repository](https://github.com/stonysystems/tla-rs)
    - snapshot: 94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0
    - read README, theorem bodies, state-machine definitions, generated helpers, and trust documentation
- [RSL theorem](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/src/protocol/RSL/refinement_proof/refinement.rs#L768)
    - `lemma_GetBehaviorRefinement`
    - input: `low_level_behavior: Seq<RslState>`
    - preconditions require nonempty behavior, initialization, and valid adjacent transitions
    - result satisfies `RslSystemBehaviorRefinementCorrect`
- [Raft theorem](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/src/protocol/Raft/refinement_proof/refinement.rs#L49)
    - `lemma_refinement_correct`
    - valid distributed behavior maps to an abstract committed-log behavior
    - abstract behavior constructed point by point
    - inductive invariants justify each abstract step
- [Raft behavior definition](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/src/protocol/Raft/refinement_proof/state_machine.rs#L475)
    - `pub type RaftBehavior = Seq<RaftDistributedState>`
    - validates finite interleavings of actions and reboots
- [abstract next relation](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/src/protocol/Raft/refinement_proof/state_machine.rs#L519)
    - permits stutter or committed-log extension
    - inference: finite safety refinement does not force a request to complete
- lexical check found no `assume(` or external-body marker in the inspected RSL/Raft refinement directories
    - narrower than a full dependency and trusted-contract audit
    - no verifier invocation reproduced

runtime and generated-code boundary
- [generated RSL helper](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/src/generated/RSL/proposer_gen.rs#L150)
    - collection helpers carry `#[verifier::external_body]`
    - contracts specify updates without checking those helper bodies
- [book, shared trust/runtime boundaries](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/docs/tla-rs-book.md#L6425)
    - scheduler, owned-packet integration, unsafe syscall glue, identity, and TLS are outside ordinary body proofs
    - external specifications also cover collections, marshalling, I/O, and integration
- [RSL skipped-function classification](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/docs/rsl-skip-functions.md)
    - distinguishes proved handwritten actions, trusted event-loop/I/O dispatch, and unsupported generated actions
    - dated counts describe that document's snapshot
    - inference: a skipped function is not automatically an unproved function
- README states the native integration is “runtime-tested, not covered by an end-to-end service theorem”
    - separates model refinement from service execution
- inference: generated action contracts for ten protocols do not establish ten global distributed refinement theorems
    - the book itself distinguishes local contracts from an inductive global theorem

TLA+ translation boundary
- [clean-TLA input contract](https://github.com/stonysystems/tla-rs/blob/94fd2a7a20a1f0baefd9706ad1f051fa1a5513d0/docs/clean_tla_subset.md)
    - constrained global specification projected into a per-node Verus model
    - required restrictions cover local state and explicit communication structure
    - arbitrary shared mutable state cannot simply become local state
- inference: this is a relevant restricted TLA+/Verus route
    - it contradicts a broad claim that no such route exists
    - it does not establish arbitrary TLA+ translation or unrestricted semantic preservation

coverage and remaining gaps
- primary paper and repository audit completed
- no proofs or performance experiments reproduced
- transitive trusted contracts and translation equivalence not exhaustively audited
- no liveness theorem established by the inspected finite-behavior refinement statements
