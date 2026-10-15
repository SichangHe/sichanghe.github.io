# Looping Is Not Reliability: State-Bound Evidence and Typed Revision Contracts for Agentic Code Repair
(authored by agents unless marked 🧑)
Tag: `gao2026looping`, [paper](https://doi.org/10)

## What the paper establishes

The paper separates finding a correct patch from retaining and safely submitting it. Its abstract reports: “Generate–test–revise loops are common in coding agents, but repetition alone provides no reliability guarantee.” The controlled study uses 30 HumanEval repairs, 900 three-revision trajectories, a common-state study with 2,430 branches, and a repository study over 24 bugs. Its key result is non-absorption: with current traces, current correctness is 0.820 after revision 1, 0.673 after revision 2, and 0.693 after revision 3, while ever-correct rises from 0.820 to 0.847 and 0.853. The denominator is 900 trajectories in the trajectory study; the paper scopes this result to its forced-revision protocol and does not claim every adaptive agent regresses.

The paper defines transition probabilities for executable correctness `Y_t`: repair from a wrong state, α_e = P(Y_{t+1}=1 | Y_t=0,e), and regression from a correct state, β_e = P(Y_{t+1}=0 | Y_t=1,e). It derives “q_{t+1} − q_t = (1 − q_t)α_e − q_tβ_e” and states that continuation has negative expected correctness change when q_t > α_e/(α_e+β_e). This is a decision criterion, not an assertion that an orchestrator knows the true probabilities. It also defines effective response contrasts against a matched nonactionable control, selective verifier coverage and risk, excess joint false acceptance D_ij among incorrect candidates, and sound completion P(A=1,Y=1). The paper explicitly warns that one evidence intervention identifies information and coder responsiveness jointly, not separately.

## technique: measure transitions instead of treating correctness as absorbing

What it is: report current correctness after each revision, ever-correct discovery, wrong-to-correct repair, correct-to-wrong harm, and the transition rates α and β. The paper's motivation is explicit: “The following decomposition measures both rather than treating correctness as an absorbing endpoint.”

When to use it: use this whenever an agent can revise an already-correct candidate or when pass@k/best-of-k could hide later damage. The paper's scope is executable code judged by visible, challenge, and hidden tests.

How to do it:

1. Define `Y_t` as executable correctness after revision t and record evidence `e_t` supplied for the next revision (Section 3).
2. For each evidence condition, count transitions from frozen wrong and correct starts; estimate α_e and β_e, then compute q_t and the expected-change expression (Section 3).
3. Report current correctness and cumulative ever-correct at every revision. In the trajectory experiment, three forced revisions crossed 30 tasks, six evidence conditions, and five seeds, producing 900 trajectories and 2,700 revisions (Section 4.2).
4. Keep the task as the inferential unit. The paper averages seeds within each task, uses 10,000 task-cluster bootstrap draws, 100,000 paired sign flips, and Holm correction over six preregistered contrasts (Section 4.4).

Inference: In Verus, represent a revision ledger as an executable Rust struct and specify a transition relation in `spec fn`; use proof functions to establish that a committed state preserves the ledger invariant and to calculate a mathematical transition bound. A Verus `invariant` clause on a loop, rather than an `invariant(...)` call, can maintain the relation between the current hash, candidate, and recorded evidence. This does not make the empirical α and β estimates true; those remain measurements of the external model and test suites.

Evidence: the paper reports 16.0% of trajectories had produced a correct patch and subsequently lost it by revision 3, under the 900-trajectory forced protocol. It also reports evidence-specific correctness: current-binary 0.700, 0.700, 0.720; stale-trace 0.687, 0.713, 0.660; unavailable 0.687, 0.687, 0.707 across revisions 1–3. These are descriptive rates from the stated trajectory matrix, not universal constants.

Failure and assumptions: forced revision is not natural adaptive behavior; HumanEval tasks may be in model training data; challenge and hidden suites share HumanEval+ construction. The paper says, “It does not show that an adaptive loop must regress.”

## technique: bind evidence to the exact state it describes

What it is: represent evidence as `e=(h_s,h_q,x)`, where `h_s` is source-state hash, `h_q` is test-suite hash, and `x` is payload. Evidence is aligned only if `h_s = h(S_t)`. A payload can contain true facts yet be invalid when its envelope names an older state.

When to use it: use state binding whenever diagnostics, test traces, verifier results, or model feedback can outlive the code revision that produced them. The paper's Figure 1 gives a Caesar-shift example: a trace from state A with shift 12 is reused after state B with shift 4 and restores shift 12.

How to do it:

1. Hash the candidate code and the named test suite before running the verifier (Sections 3 and 6.1).
2. Store the hashes with execution id and payload in an append-only evidence ledger (Section 6).
3. Before a revision, require the evidence code hash to equal the current state hash and the suite hash to equal the requested suite hash (Sections 3 and 6.1).
4. On mismatch, refresh evidence, Keep the current state, or Escalate; never let stale evidence directly trigger a patch (Section 6).
5. In the common-state intervention, hold starting code fixed and vary evidence freshness, avoiding post-treatment risk-set bias (Sections 4.3–4.4).

Inference: In Verus, make hashes and suite identifiers ghost/spec values or executable digest fields, and give the revision function a precondition equating the evidence hash to the current state hash. A proof function can show that a mismatch implies no state-changing commit. The hash implementation, test runner, and cryptographic assumptions remain trusted unless separately modeled.

Evidence: in the 14B common-state replication, stale traces harmed 34/135 correct starts versus 4/135 with current traces, a 22.2-point difference with task-cluster 95% CI [8.9, 37.0] and exact Holm p=0.0337. The denominator is 135 branches for each condition (27 tasks × five seeds); this is a coder-specific replication, not a general model-family effect. The paper's deterministic replay intercepted all 12 7B and 34 14B stale-condition harms.

Failure and assumptions: state hashes prove identity, not semantic correctness. The paper states, “Neither property claims that a hash-matched patch is semantically correct; that residual risk belongs to the executable and learned verifiers.” One-step staleness is an intervention; its natural prevalence is not measured.

## technique: make revisions typed and fail closed

What it is: replace ambiguous free-form output with `RevisionAction = Keep | Patch(code) | Escalate(reason)`. Only a parsed executable `Patch` can replace the current state. The paper observed five 7B current-trace harms on HumanEval/137 where the response contained only `STATUS: DONE` without code; a fail-closed parser maps that to Keep.

When to use it: use typed actions at the boundary between an LLM and an orchestrator, especially when “done,” malformed output, and no-op have different safety consequences.

How to do it:

1. Define the three action variants and a parser (Section 6).
2. Parse model output before mutating the worktree; map missing or malformed patch content to Keep or Escalate (Section 6).
3. Execute only a parsed Patch; preserve the current state for Keep and stop or seek help for Escalate (Section 6.1).
4. Include rejected and invalid proposals in the intention-to-treat denominator for evaluation (Sections 4.3 and 4.6).

Inference: In Verus, encode the action as a Rust enum and prove a match over all variants. A `Patch` branch can require a candidate contract; `Keep` returns the old state; `Escalate` returns no commit. Verus proof code is erased before execution, so runtime parsing still needs ordinary implementation tests.

Evidence: the paper's repository harness uses typed search, view, edit, shell, test, submit, and escalate actions, with all proposals preserved for replay (Section 4.6). The StateSeal implementation passes deterministic malformed-action fixtures, but the paper labels this conformance evidence, not effectiveness.

Failure and assumptions: a parser can accept syntactically valid but semantically harmful code; typed syntax does not establish verifier independence or competence.

## technique: preserve a last-known-good checkpoint and admit through a gate

What it is: maintain a checkpoint containing the last state that passed the configured gate; invalid actions, failed challenge checks, and rejected proposals cannot overwrite it. Admission is separate from proposal generation. The transaction in Section 6.1 is: run a named suite and append bound evidence; reject or refresh mismatched evidence; request one typed action; evaluate a candidate with the commit gate and retain current or roll back on failure; stop only when completion policy accepts the committed state.

When to use it: use this for any loop where a correct state must survive later failures, parser errors, or speculative edits.

How to do it:

1. After a candidate passes the configured gate, record its code and evidence hashes as the last-known-good checkpoint (Section 6).
2. Run challenge or full-suite checks on a proposed state before admission; retain or roll back on failure (Sections 4.5 and 6.1).
3. Preserve rejected proposals for audit and replay, but never replace the checkpoint with them (Section 4.6).
4. Re-execute checks on the selected completion state and issue a digest-bearing receipt only after recertification (Section 6.2).

Inference: In Verus, specify a ledger invariant that the checkpoint either is empty or satisfies the gate predicate, and prove each transition preserves it. Use a proof function for rollback equality and an `ensures` clause on the admission function; do not put `ensures` on a `spec fn`. The external test oracle and filesystem are trusted interfaces unless modeled.

Evidence: stopping replay over 900 fixed trajectories found self-only stopping coverage 0.998, risk 0.295, and sound completion 0.703; adding a visible gate gave coverage 0.797, risk 0.024, and sound completion 0.778; a challenge gate gave coverage and sound completion 0.778 with zero observed risk. The paper cautions that zero observed errors is not zero true risk. In the prospective 540-rollout paired comparison, guarded execution had 0/135 harms from correct starts versus 13/135 baseline harms, but wrong-start repair fell from 100/135 to 93/135; unsafe completion was 0/270 guarded versus 1/270 baseline, and sound completion fell from 219/270 to 211/270. Its preregistered joint superiority/non-inferiority criterion failed.

Failure and assumptions: strict freshness reduced coverage to 38.4%, lost 311 baseline sound completions, and required 2.27 mean revisions. The repository contract also hit a completion floor: Contract OFF had five accepted completions, Contract ON had none in the original Qwen2.5-14B matrix, with 276/288 rollouts exhausting the action budget. Thus safety and liveness cannot be inferred from sparse accepted completions.

## technique: select verifiers by measured risk and dependence

What it is: evaluate each verifier at a stated coverage, report selective risk `P(Y=0|A_v=1)`, and measure conditional dependence among incorrect candidates as excess joint false acceptance `D_ij`. Do not use model-family diversity as a proxy for independence.

When to use it: use this when combining LLM judges, executable tests, or learned verifiers, and when acceptance thresholds trade coverage for risk.

How to do it:

1. Choose a coverage operating point and threshold scores on frozen revision distributions (Section 4.2).
2. Report coverage and risk for each verifier; report D_ij and φ only among incorrect candidates (Section 3).
3. For an AND ensemble, use `P(A_iA_j=1|Y=0)=f_if_j+D_ij`; the product-of-errors argument requires D_ij=0 (Section 3).
4. Calibrate on held-out data before deployment; the paper calls retrospective matching an estimate, not deployment calibration (Sections 4.2 and 5.4).

Inference: In Verus, model the admission policy as a pure/spec function over verifier outcomes and prove that acceptance implies all required executable checks passed. Statistical risk and dependence are empirical inputs; Verus cannot prove that a learned judge has a given risk without a formal model of its behavior.

Evidence: at 70% matched coverage, Qwen-7B risk was 0.050, Qwen-14B 0.041, and DeepSeek-6.7B 0.240. Qwen-7B/Qwen-14B had conditional φ=0.641 and excess joint false acceptance 0.060 [0.001, 0.133]; Qwen-14B/DeepSeek had φ=0.021 [−0.231,0.272]. These are revision-distribution estimates. Collapsing 2,700 revisions to 617 unique task-code hashes raised 70%-coverage risks to 0.400, 0.387, and 0.472, showing dependence on the sampling unit.

Failure and assumptions: the verifiers' family and capacity are confounded; hidden and challenge tests are not independent oracles; changing coverage changes accepted errors.

## technique: use executable conformance cases to test the guard implementation

What it is: implement a reference admission layer (StateSeal) that recomputes identity outside the agent, verifies isolated proposals, preserves checkpoints, recertifies completion, and emits hash-linked receipts with coverage and liveness fields. Table 8 maps obligations to mechanisms and named conformance cases SB001–SB035.

How to do it:

1. Bind candidate, tree, policy, verifier, and context identities; reject replay, mutation, and wrong-tree evidence (Table 8).
2. Keep the admission broker independent from self-report; self-report cannot authorize admission (Table 8).
3. Restore the exact last verified candidate after regressions and malformed actions (Table 8).
4. Re-execute checks on the selected completion state; failed recertification cannot complete (Table 8).
5. Record typed outcomes, hash-linked events, digest receipt, coverage, and liveness so abstention and coverage collapse are visible (Table 8).

Inference: A Verus implementation can prove local state-machine invariants for these transitions and use executable tests for cryptographic hashing, process isolation, and runner behavior. The paper's implementation is an executable specification and conformance artifact, not evidence of improved repair competence.

Evidence: “At the frozen snapshot, all 35 deterministic failure-injection cases and three managed-language fixtures pass.” The paper immediately limits that result: “This is conformance evidence, not effectiveness, competence, verifier independence, or study validation.” Replay reduced total harm from 19 to 2 for 7B and from 69 to 33 for 14B when state binding and typed actions were added; a challenge checkpoint blocked all 19 7B harms but missed two 14B hidden-test regressions.

## what is proved, measured, and trusted

The mechanical claims are state-hash mismatch cannot trigger a commit and parser/action-schema failure cannot erase a checkpoint. The paper explicitly leaves semantic correctness of hash-matched patches to executable and learned verifiers. Empirical claims concern fixed HumanEval branches, 24 historical bugs from nine Python projects, four coder stacks, and one scaffold; they are mechanism tests rather than random samples of agents, languages, projects, or bugs. Trusted components include the host, verifier, test suites, Git, operating system, cryptographic hash behavior, and the correctness of the contract specification itself. Verus can formalize the orchestration state machine, but these external assumptions remain unless separately modeled.

## implications for VeruLaw

Inference: VL should carry evidence hashes and suite identity with every verifier result, refuse stale diagnostics, use an explicit typed action protocol, and retain a last verified Rust/Verus state. A proof that the state machine preserves a checkpoint would complement, rather than replace, Verus proofs of the Rust program's functional contract. The paper's repository and prospective results warn that strict guards can reduce repair and completion; VL should measure current versus ever-correct, harm from correct starts, coverage, risk, sound completion, and action-budget exhaustion. The paper's completion-floor failures are a direct warning against claiming product reliability from zero unsafe completions when accepted completions are nearly absent.

Inference: Threat to a product that generates agent-written verified Rust is substantial at the orchestration boundary: a stale verifier result can cause a correct proof-bearing patch to be replaced, while a hash-matched but inadequate oracle can still accept a wrong patch. The paper does not measure Verus or Rust, so this is a transfer inference, not a reported result. Existing VL work should not redo generic “more iterations help” experiments; it should test state-bound evidence, checkpoint preservation, and risk-aware stopping with Verus-specific artifacts.

## techniques for the catalog

- transition reliability decomposition — measure current and ever-correct states plus wrong-to-correct and correct-to-wrong transitions using α, β, and q
- state-bound evidence — bind each diagnostic to code and suite hashes and reject or refresh mismatches
- typed revision actions — parse only Keep, Patch(code), or Escalate(reason), mapping malformed output to a safe no-op
- last-known-good checkpoint — retain and restore the latest gated state across rejected or invalid proposals
- gated admission and recertification — run challenge/full checks before commit and re-execute them on the selected completion
- risk/dependence stopping — choose verifier thresholds using selective risk and conditional false-accept dependence at stated coverage
- conformance failure injection — exercise replay, mutation, malformed action, rollback, and recertification cases with auditable receipts
Checked 2026-10-15 against paper gao2026looping: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
