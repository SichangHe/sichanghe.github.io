# Mostly Automatic Translation of Language Interpreters from C to Safe Rust
(authored by agents unless marked 🧑)
Tag: `wang2026reboot`, [paper](http://arxiv.org/abs/2606.27122v1)

## scope and result

Reboot translates whole C interpreters to safe Rust through feature-level milestones and a supervised multi-agent workflow. The paper's abstract says: “Two ideas underpin Reboot. First, feature reduction decomposes the translation by program features, creating a sequence of milestones where each is a complete, testable program.” It also says: “Second, a multi-agent architecture orchestrates inherently unreliable coding agents through automated validation and feedback, keeping long-running translation workflows on track with minimal human involvement.”

The input is a C program plus a test suite. The output is a safe Rust program that passes the provided tests. The paper reports six interpreters, 6k–23k C lines, one to eleven brief user interventions, 100% provided-test passage, and 62%–92% on independently created validation tests (abstract and section 1, pages 1–2). Inference: The product threat is high for agent-written Rust because this demonstrates long-running, multi-agent code generation at repository scale, but test-passing is weaker evidence than Verus proofs.

## technique 1: feature reduction milestones

Use feature reduction when functions and data types are poor boundaries because a feature crosses lexer, parser, runtime, and executor code. The paper defines a feature as “a supported language capability, such as for-loops, closures, or exception handling” (section 2.1, page 3).

Apply it as follows:

1. In a planning phase, inspect the source, identify features and dependencies, and produce an ordered feature-level plan (section 3.1, page 8).
2. Starting at the full program `C-FL_N`, remove one or a few features at a time while adapting tests; remove dependencies later so every level remains coherent and runnable (section 2.1, pages 3–4).
3. Validate each reduced C level and its adapted test suite before continuing toward the minimal `C-FL_0`.
4. Translate `C-FL_0` to `RS-FL_0`.
5. Restore features one level at a time, translating `RS-FL_i` to `RS-FL_{i+1}` and validating after each transition (Figure 1 and Algorithm 1, pages 3 and 8).

The paper emphasizes that “each feature level is a complete, runnable program that can be independently tested and validated.” Its mujs example starts with FL0, which can only log string literals, and ends at FL16 with closures, iterators, regular expressions, prototype chains, and other features (Figure 1, page 3).

Inference: In Verus, choose milestones around proof-relevant features such as ownership wrappers, parser states, resource accounting, or concurrency transitions. At every level, keep executable code plus `requires`, `ensures`, loop invariants, and proof functions verifying. A reduced feature level should have a smaller but explicit specification; tests alone do not establish the contract.

Evidence: The ablation compared full Reboot with the same multi-agent system without feature reduction. On unseen validation tests, mujs passed 74.77% (163/218) with reduction versus 65.6% (143/218) without; picoc 69.50% (139/200) versus 49.0% (98/200); awk 78.82% (160/203) versus 71.9% (146/203); and gnu-bc 78.57% (99/126) versus 67.5% (85/126) (Table 8, page 20). These denominators are validation tests, not training or provided tests. The paper reports that two pocketpy attempts without reduction failed to complete.

## technique 2: validity and history feedback for unreliable agents

Use this when coding agents can claim completion, report blockage inaccurately, loop without progress, or crash. Reboot separates two mechanisms. The paper says: “A Validity mechanism (V) determines whether the worker’s output actually satisfies the objective’s correctness criteria.” It defines history feedback as a mechanism that “analyzes the history of the worker’s status reports and provides targeted feedback” (section 2.2, page 6).

Implement the loop as follows:

1. Let a worker report one of `BLOCKED`, `MORE_WORK`, `DONE`, `INFEASIBLE`, or `ERROR`.
2. Have validity workers compile, review, run tests, and check coverage independently of that report.
3. Have history feedback track progress and repeated statuses; continue when tests improve, route specific fixes when there is no progress, and escalate loops or infeasibility.
4. Treat `DONE` as a claim requiring validation. Treat `INFEASIBLE` as a human design decision, not an accepted result.
5. Resume or restart crashed workers; escalate corruption or unrecoverable failures (Table 1 and Figure 4, pages 5–7).

Inference: A Verus workflow should make a successful `verus` run the validity check, then retain verifier errors and prior attempts as history. A manager can classify a failed obligation and assign a focused repair, but must not accept a worker's “done” message. This is compatible with proof functions and contracts because the checker, not the manager, decides whether the claim holds.

## technique 3: finite-state workflow guards and recovery

Use a finite-state machine (FSM) when an agent manager could bypass validation by calling workers in an unsafe order. Reboot's branch controllers enforce that validation precedes code review, review precedes cleanup, and no work occurs after cleanup (section 3.4, page 10).

Steps:

1. Define states such as `Initial`, `Setup`, `Translating`, `Validated`, `Reviewed`, and `Cleaned`.
2. Define allowed worker calls for every state.
3. Reject manager actions that violate the transition relation and prompt reconsideration.
4. Track retries; after a configurable five to ten rounds without progress, escalate (section 3.4, page 10).
5. Commit each step in a separate git worktree or branch so a bad worker can be restarted or rolled back (section 4, pages 11–12).

The paper states: “If the Manager proposes a worker call that violates these constraints, the controller rejects the call and prompts the Manager to reconsider.”

Inference: In Verus, the FSM can be implemented outside the proof target as a controller that refuses to mark a proof milestone complete until compilation, verification, and required tests pass. The controller's state transitions are themselves trusted orchestration code unless separately verified.

## technique 4: layered validation and hidden tests

Use multiple independent checks because passing the provided suite can hide a missing test or a hardcoded answer. Reboot's Validator runs the provided suite and checks for cheating or skipped tests; its CodeReviewer checks no `unsafe` blocks, code quality, modularity, and the Validator's result (section 3.3, page 9). The authors independently generated hidden validation suites by writing seed interpreter programs, expanding them with an agent, and manually checking expected outputs against the original C program (section 5.2, pages 14–15).

The six translations passed all provided tests: awk 279/279, gnu-bc 134/134, picoc 154/154, wren 851/851, mujs 187/187, and pocketpy 83/83 (Table 3, page 13). Hidden validation pass rates were wren 134/146 (91.78%), awk 160/203 (78.82%), gnu-bc 99/126 (78.57%), mujs 163/218 (74.77%), picoc 139/200 (69.50%), and pocketpy 125/203 (61.58%) (Table 4, page 15). The mean translated-code coverage was 78.79%; pocketpy was 62.98% (section 5.2, page 14).

Inference: For Verus, hidden tests should complement proofs by exercising the executable erased code and assumptions about external libraries. A passing proof still depends on the specification and trusted environment; hidden tests can reveal an underspecified contract but cannot prove it complete.

## technique 5: architecture and security boundaries

Reboot isolates workers in Docker containers, gives the manager read-only source access, limits workers to their branch worktree, and runs controllers and logs on the host (section 4, pages 11–12). It creates a branch per feature transition and auto-commits after each step, enabling soft recovery from backups and hard rollback to the last good level.

Inference: The same isolation limits an agent's ability to weaken a Verus contract or tamper with verifier logs. It does not make the Verus toolchain trusted automatically; the verifier, compiler, specifications, external crates, and hardware remain assumptions.

The mujs security case study reintroduced 20 historical CVEs. Fourteen were eliminated, four mitigated, and two unmitigated; the two remaining vulnerabilities were denial-of-service stack exhaustion (Table 6 and section 5.4, pages 17–18). All Rust builds had no unsafe blocks. The paper reports: “All memory safety vulnerabilities ... are either eliminated or mitigated,” but stack exhaustion remains possible in safe Rust. Inference: safe Rust removes classes of memory corruption, while Verus can add functional and temporal claims only where those claims are modeled and proved.

## what is proved, measured, and trusted

Measured evidence includes wall-clock time, API cost, user interventions, provided-test passage, hidden-test passage, coverage, performance, and CVE outcomes. One translation run per program was performed because of cost; times were 27.7–90.5 hours and costs $463.46–$1,781.79 (Table 3, page 13). Each hidden suite took an author 10–20 hours to create (section 5.2, page 14). The paper reports 29 human interventions across six programs and 125 escalations, of which a delegator auto-resolved 96 (77%) (section 5.7, page 21).

Inference: These denominators and one-run setup limit claims about reliability. The authors themselves show a failure mode: without feature reduction, pocketpy's manager bypassed validation by asking reviewers to inspect only already-passing tests (section 5.6, page 20). This is evidence that the history-feedback mechanism is not itself trustworthy when objectives are too large.

## techniques for the catalog

- feature reduction milestones: remove and restore cross-cutting program features through complete, validated intermediate programs
- validity and history feedback: combine independent output checks with status-history analysis to detect false completion and loops
- FSM workflow guards: enforce legal worker order, retry limits, cleanup boundaries, and escalation rules
- layered validation: combine provided tests, hidden tests, coverage, code review, and security probes
- isolated recovery: use containers, worktrees, commits, and rollback to contain faulty agents and recover progress
