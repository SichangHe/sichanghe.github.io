# VL evaluation evidence design

(authored by agents unless marked 🧑)

## decision

- recommendation: use a complete change record
  - keep specification meaning, code behavior, and proof acceptance as
    independent required results
  - add the original repository's project checks and evidence maintenance after
    a later approved change
  - derive overall PASS only when every required result is PASS
  - never average the results or let one PASS erase another FAIL
- reason
  - VL is intended to change real repositories while preserving a human
    requirement
  - a function-level proof cannot show that the requirement was formalized
    correctly, that the repository was healthy before the change, or that the
    evidence remains practical to review after a change
- decision this design enables
  - later approve a bounded pilot of the complete record
  - or retain the current process after documenting that it already supplies
    equivalent evidence
- this note is a design, not pilot authority

## source facts

- the completed [VeriContest walkthrough](./vl_paper_walkthrough/vericontest_20260822.md)
  records the paper, evidence, limits, and binary-search case
  - source: Zichen Xie and seven coauthors, *VeriContest: A
    Competitive-Programming Benchmark for Verifiable Code Generation*, arXiv
    `2605.08553`, 2026 preprint
  - the paper reports “946 competitive-programming problems” with separate
    specification, code, proof, and end-to-end evaluation
  - for its strongest model, the paper reports 92.18% natural-language-to-code,
    48.31% specification, 13.95% proof, and 5.29% end-to-end pass at the first
    attempt
  - these use distinct conditional task settings and prompts over the same 946
    retained problems; they are not values to average
  - the paper says end-to-end success occurs “only if its specification,
    executable code, and proofs” all pass for the same problem
  - its function benchmark does not evaluate a live repository, project
    checks, dependencies, a later maintenance change, or operational value
- the broader [verified-agent-code evaluation](./verified_agent_code_evaluation_20260808.md)
  explains the evaluator boundary
  - a machine checker gives strong code-to-specification evidence
  - it does not by itself establish that the specification means what the human
    intended
  - its existing recommendation is to expose independent executable,
    code-to-specification, claim-integrity, and human-intent decisions
- no new benchmark, verifier, model, or project check was run for this note

## inference

- VL needs non-substitutable results
  - specification meaning asks whether the formal claim expresses the human
    requirement
  - code behavior asks whether the executable artifact passes evaluator-held
    finite checks
  - proof acceptance asks whether the verifier accepts the unchanged obligation
    without added trust
  - each question can fail while another passes
- VL also needs repository evidence
  - VeriContest's isolated functions cannot show whether an original repository
    was already failing
  - a one-time successful record cannot show whether evidence can be updated
    within a useful review budget
- therefore the paper supports separating the first three results
  - using the last two for VL is a product-scope recommendation, not a reported
    VeriContest result

## three options

- option 1: no change
  - work: document the fields and checks VL already records
  - supports: an audit of current evidence and a decision that no process change
    is needed
  - cannot support unless already present: independent meaning, behavior, proof,
    repository-baseline, and maintenance judgments
  - expected implementation effort: none beyond documentation
  - risk: a completion label may remain ambiguous or hide a missing gate
- option 2: separate existing evidence
  - work: add three required, independent results to the current record
    - specification meaning
    - code behavior
    - proof acceptance
  - supports: diagnosis of the paper's false-green case without a new run
  - cannot support: whether the repository began healthy or whether reviewers
    can update the record after a change within budget
  - expected implementation effort: low record-format and review-process work
- option 3: complete change record
  - work: retain option 2 and add two required results
    - original-repository project checks
    - evidence maintenance after a representative, later approved change
  - supports: a decision about a repository change and whether its evidence is
    practical to maintain
  - cannot support: unmeasured system properties, production utility, or broad
    autonomy beyond the sampled cases
  - expected implementation effort: moderate record, evaluator, repository-test,
    and review-timing work
  - recommendation: this is the smallest option aligned with VL's intended
    repository workflow

## recommended evidence-record schema

- one record per attempted repository change
- record identity fields
  - `record_id`: stable identifier for citations and later comparison
  - `requirement_ref` and `requirement_digest`: immutable human requirement and
    version; prevent silent reinterpretation
  - `repository_ref`, `base_revision`, and `change_scope`: identify the original
    state and allowed files or behavior
  - `eligibility_result` and `exclusion_reason`: preserve the denominator and
    prevent hard cases from disappearing
  - `agent`, `model`, `tools`, `versions`, `attempt_limit`, `time_limit`, and
    `spend_limit`: make conditions and resource use comparable
  - `started_at`, `ended_at`, and `evidence_refs`: locate the exact artifacts
- every evaluation check is one row with the same fields
  - `check_id` and `purpose`: name the independent question
  - `evidence_ref`: point to immutable logs, artifacts, or a signed human
    judgment; an agent completion claim is not evidence
  - `pass_rule`: state the condition fixed before evaluation
  - `failure_rule`: state FAIL conditions, including missing evidence
  - `result`: only PASS, FAIL, or NOT RUN
  - `responsible_human_role` and `reviewed_at`: expose who owns judgment and when
- required rows
  - `baseline_project_checks`
    - purpose: distinguish a change regression from a pre-existing failure
    - evidence: evaluator-run build, test, lint, and dependency-check outputs
      selected by the repository maintainer before work
    - pass rule: every selected check passes on the immutable base revision
    - failure rule: any check fails or its evidence is absent
    - pilot action on FAIL: end that case before the initial change, record all
      later rows as NOT RUN with this reason, and exclude it from adoption
      evidence
    - responsible human role: repository maintainer
  - `specification_meaning`
    - purpose: decide whether the formal specification expresses the immutable
      human requirement without omitting or adding material behavior
    - evidence: requirement/specification comparison, accepted examples,
      rejected counterexamples or mutants, and surviving differences
    - pass rule: the appointed requirement owner accepts every material relation
      and disposition of every surviving difference
    - failure rule: a required relation is missing, an invalid behavior is
      admitted, a valid behavior is excluded, or ownership/evidence is absent
    - responsible human role: requirement owner
  - `code_behavior`
    - purpose: find executable failures that a proof relative to a weak
      specification may permit
    - evidence: evaluator-held project and behavior checks on the changed tree
    - pass rule: every predeclared check passes within its limit
    - failure rule: any check fails, times out, or lacks evidence
    - responsible human role: repository maintainer
  - `proof_acceptance`
    - purpose: establish code-to-specification alignment without weakening the
      obligation or trusted base
    - evidence: verifier output plus before/after digests for the specification,
      trusted base, checked code, and prohibited proof-bypass scan
    - pass rule: the appointed verifier accepts the intended unchanged
      obligation with no unauthorized trust or scope change
    - failure rule: rejection, timeout, changed obligation, added trust, missing
      checked code, or missing evidence
    - responsible human role: verification reviewer
  - `evidence_maintenance`
    - purpose: test whether a representative later change can refresh the full
      record within the review-time budget
    - evidence: second change identity, updated rows, elapsed agent and human
      review time, and unresolved questions
    - pass rule: all required rows are refreshed and accepted within the fixed
      budget
    - failure rule: any stale row, unresolved material question, failed check,
      or budget overrun
    - responsible human role: evaluation owner
- derived fields
  - `overall_result`: PASS only when all five required rows are PASS
  - `failed_check_ids`: preserve every failure rather than selecting one cause
  - `human_decision`: accept, reject, or request separately authorized follow-up

## binary-search application

- source requirement: LeetCode 34 in the VeriContest case study
  - input: a non-decreasing integer array and a target
  - output: the first and last positions of the target, or `[-1, -1]` when it is
    absent
  - algorithm requirement: `O(log n)`
- Claude Opus 4.7 attempt recorded by the paper
  - submitted code: correct two-pass binary search
  - submitted postcondition: only `result.len() == 2`
  - paper outcomes
    - all functional tests PASS
    - Verus verification PASS
    - specification metric FAIL
      - the precondition omits required sortedness and value-range constraints
      - the postcondition does not relate the two results to the array or target
- complete-record rendering of the existing paper evidence
  - `baseline_project_checks`: NOT RUN
    - reason: this is an isolated benchmark function, not a repository change
  - `specification_meaning`: FAIL
    - evidence: the specification admits any two-element result and therefore
      does not require the first and last target positions
  - `code_behavior`: PASS
    - evidence: the paper reports a correct two-pass implementation passing all
      functional tests
    - boundary: this retrospective mapping uses the paper's code criterion; it
      does not establish the independent evaluator custody required by a future
      VL pilot
  - `proof_acceptance`: PASS
    - evidence: the paper reports that Verus accepts the code against the weak
      postcondition
  - `evidence_maintenance`: NOT RUN
    - reason: no later repository change or review-time measurement exists
  - `overall_result`: FAIL
    - the required meaning row fails; PASS behavior and proof cannot replace it
- contrast in the same case study
  - GPT-5.5 produces a stronger specification, including sortedness and
    target-matching conditions
  - Verus rejects two loop assertions because the proof does not connect
    sortedness strongly enough to the invariants
  - this is the reverse warning: better meaning cannot replace a failed proof

## bounded later pilot proposal

- status: recommendation only; not authorized
- unit: one case is an approved initial repository change plus one approved
  representative follow-up change, producing one complete record
- proposed size: six paired cases from at least two repositories
  - twelve bounded changes total: six initial and six follow-up changes
  - enough to expose repeated record omissions and compare review time across
    more than one repository
  - too small for a general VL success-rate claim
- proposed hard caps
  - at most 12 combined agent-hours, two per paired case including both changes
  - at most three human-review hours, 30 minutes per paired case
  - monetary cost cannot yet be estimated responsibly
    - the model route, token limit, verifier environment, and price at launch
      have not been selected
    - any approval request must name them and convert the token and tool limits
      into a hard currency cap before starting
- proposed checkpoints
  - a later request would seek one conditional approval for all six paired cases
    - passing a checkpoint continues automatically
    - failing a checkpoint stops and returns to the human
  - start only after the human approves the exact six paired cases, including
    all twelve changes, plus the model, tools, agent-hour cap, currency cap, and
    appointed requirement, repository, verification, and evaluation owners
  - status update after two records
    - report each row, elapsed agent and human time, spending, exclusions, and
      unresolved meaning questions
  - continue to four only if both records contain every required result and
    evidence or a stated NOT RUN reason, at least one reaches the maintenance
    row, both stay within their caps, and neither produces an unresolved safety
    or authority issue
  - status update after four records
    - report the same fields plus whether review time is falling, stable, or
      rising
  - continue to six only if all four records contain every required result and
    evidence or a stated NOT RUN reason, at least three reach the maintenance
    row, and the per-case human-review caps were not crossed
- stop immediately if
  - any next action would cross the approved agent-hour or currency cap
  - a requirement owner cannot decide specification meaning from the packet
  - the evaluator cannot reproduce an evidence reference
  - an obligation, trusted base, repository scope, or pass rule changes without
    new human approval
  - two completed records have the same missing required evidence
  - a safety, privacy, credential, or external-authority issue appears
- stop after six rather than expanding automatically
  - the pilot ends with a decision packet, not a launch

## what we would do with VL now

- current authorized sequence
  - finish and preserve this decision note
  - continue the separately governed paper exploration
  - report concrete proposals as they arise; do not implement them
- if the human later authorizes the bounded pilot
  - appoint one implementing agent and the four responsible human roles
    - one human may hold multiple roles, but each judgment remains explicit
  - freeze the six case requirements, repository bases, checks, schema, budgets,
    model route, tools, and stop rules
  - complete two records, send the first mid-exploration status update, and
    apply the continue rules
  - if allowed, complete two more, send the second status update, and apply the
    continue rules again
  - if allowed, finish the last two and stop for a human decision
- dependencies before any run
  - selected cases and eligible-repository rules
  - appointed requirement owner and agreed meaning rubric
  - repository maintainer's project checks
  - verifier and immutable obligation policy
  - exact agent, model, tools, time cap, and currency cap
- not authorized now
  - code or product changes
  - any experiment or pilot case
  - model or tool spending
  - staffing or role appointment
  - repository launch, deployment, or product launch
- later human decision
  - approve the bounded pilot with exact cases, owners, and caps
  - reject or revise the pilot
  - after a completed pilot, decide whether to adopt the record, change it, or
    keep the current process

## authorization boundary

- human authorization for this work covers at most two combined agent-hours for
  this planning note and its evaluation
- it asks for details of what VL would do and for status updates during the
  exploration
- it explicitly does not authorize code, an experiment, spending, staffing, or
  launch
- relation search, Rust-to-Verus translation, and C/ACSL obligation-ledger
  migration remain separate proposals outside this note
