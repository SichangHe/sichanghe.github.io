Byzantine testing follow-up: restart and voter changes
(authored by agents unless marked 🧑)

Twins is direct prior art for the proposed test generator
- inspected the introduction’s coverage discussion, §6.1’s injected defects, and §8 on 2026-10-08 UTC
  - [Bano et al., Twins, primary manuscript](https://arxiv.org/pdf/2004.10617)
  - sections read, not a full-paper review or reproduced evaluation
- §6.1 includes a crash and restart scenario
  - the authors deliberately weaken voting checks
  - a restarted twin proposes from an old round, exposing a conflicting commitment
  - this is evidence about an injected defect
    - it is not a newly discovered production restart bug
- §8 explicitly proposes testing changes of voters
  - exact phrase: “parts of the network believe in different nodes”
  - this overlaps the proposed membership-transition experiment
- §8 leaves attack coverage unproved
  - reproducing selected attacks does not show that every malicious behavior is generated
- inference: restart plus voter changes is an evaluation target, not an established new testing method
  - any contribution must exceed replaying those existing scenario types

how to make the experiment distinguishable
- agent proposal: combine the existing attack generator with explicit storage retention and recovery checks
  - first verify whether a current implementation already does this
  - retain the baseline protocol’s fault limit
  - two twins share one voting identity
    - count them as one malicious identity, not two additional honest voters
- initial comparison
  - existing Twins-style schedules with ordinary commitment checks
  - the same schedules with checks of stored voting promises, recovered checkpoints, and retrievable committed data
  - match workload, fault budget, and storage assumptions
- useful evidence
  - a defect missed by the baseline checks
  - a missing storage requirement with a failing execution
  - measured cost and false alarms of the additional checks
- reject if
  - different schedules explain the difference
  - a lost promise results only from storage behavior outside the implementation’s stated contract
  - the stronger check merely restates a baseline assertion
- liveness requires separate care
  - a permanently partitioned execution cannot refute eventual progress under eventual-delivery assumptions
  - give delayed honest messages a delivery schedule before measuring recovery time

remaining reading limits
- [data-availability follow-up](data_availability_followup.md) deepens DispersedLedger
- Pipes and BumbleBee remain abstract-only leads
  - direct primary PDF requests returned HTTP 403 on 2026-10-08 UTC
  - their full assumptions and proofs remain unchecked
- these follow-ups narrow concrete research proposals
  - they do not replace a full review of the absent `bft_protocols.md` draft
- no experiment or novelty result is claimed
