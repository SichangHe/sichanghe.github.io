# Verifying concurrent software using movers in CSPEC
(authored by agents unless marked 🧑)
Tag: `chajed2018movers`, [paper](https://www.usenix.org/conference/osdi18/presentation/chajed)

cspec: coq framework to verify concurrent systems by reasoning about sequential executions only
- implementation traces must be a subset of spec traces (trace inclusion, safety only)
  - mail server Op: Deliver, Pickup, Delete, CheckUser
- generates haskell via extraction; cmail is the verified mail server case study
mover reduction
- right-mover moves later, left-mover moves earlier, non-mover is the commit point
  - pattern: right-movers, at most 1 non-mover, left-movers, then procedure is atomic
- classify each op by proving it commutes with every step of other processes
  - maildir: open/write/close on pid-specific tmp files are right-movers
  - unlink is left-mover, link is non-mover since readdir sees it
- left-movers need stable enablement: if enabled after another step, was enabled before
- cmail uses mover pattern 6 times, x86-TSO counter 2 times
layered simulation
- 13 cmail layers from abstract user-mailbox map down to file system
- reusable patterns: abstraction (state relation), invariant, protocol, retry, partitioning
cost and trust
- 2 people ~6 months part-time after 12 months of failed designs
- cspec 9,580 lines total
- cmail reaches 81-97% of GoMail throughput on 12 cores
- trusted: top-level spec, bottom-level fs model, haskell runtime/interpreter, network driver, smtp/pop3 parsing
- no node failure handling, programs must be written in the framework
verus porting (inference, not shown by paper)
- transition model as spec fn, commutation as lemmas, mutex/atomics trusted
