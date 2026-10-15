# Humanize: Judgement Engineering for Agentic Coding
(authored by agents unless marked 🧑)
Tag: `liu2026humanize`, [paper](https://doi.org/10.18653/v1/2024.acl)

## scope and result

Humanize is a workflow for agentic coding in which a builder writes code and an independent reviewer decides whether the work is complete. The paper's central claim is an orchestration technique, not a new verifier: “Agentic coding makes code generation cheap, but reliable completion remains difficult: the agent that writes the code is a weak judge of whether it is done.” (abstract, p. 1). The authors report 68 main-branch versions over 108 days, 118 public postmortems, and 72 mechanical gates (abstract, pp. 1, 14). The evidence is observational: “The evidence is observational: it shows what the design enables and where it fails, not how it compares with other workflows under controlled conditions.” (introduction, p. 2)

## technique 1: plan as a contract

what it is and when to use it

Freeze the goal and acceptance tests before implementation so a later reviewer has a stable reference. Use this for a multi-round change whose scope or completion condition could drift.

how to do it

1. Expand an idea with parallel, read-only explorers (`gen-idea`) (section 3.1, p. 4)
2. Generate a structured plan with coding forbidden (`gen-plan`) (section 3.1, p. 4)
3. Have Claude and Codex critique it for up to three rounds; unresolved points go to the human (section 3.1, p. 4)
4. Record positive and negative acceptance tests, path boundaries, and which agent owns each task (section 3.1, p. 4)
5. Run plan-compliance checks and an advisory two-question human quiz before execution (section 3.1, p. 4)

The paper states: “The plan is a contract, not a disposable prompt: it defines the goal, acceptance criteria with positive and negative tests, path boundaries, and tasks assigned to Claude for coding or Codex for analysis.” (section 3.1, p. 4)

Verus form

Inference: encode the contract as Rust specifications: `requires` for permitted inputs and `ensures` for postconditions; put loop obligations in `invariant` clauses. A plan boundary maps to the set of functions and files allowed to change, which remains a process check outside Verus. The human still has to decide that the predicates express the real goal.

Evidence and limits

The plan-compliance and quiz are workflow checks, not proof of semantic correctness. The corpus recorded scope and plan pressure in 79 of 118 postmortems (Table 2, p. 15). Plans can still be too large or vague; the authors say “Enforcement presupposes a plan that the human can judge.” (findings, p. 9)

## technique 2: alternating builder and independent reviewer

what it is and when to use it

Separate proposing a repository state from accepting it. A fresh reviewer from another vendor sees the plan, code, recent history, and claims, but not the builder's private reasoning. This is useful when self-review is known to share blind spots.

how to do it

1. The builder submits code, a one-objective round contract, a summary of claims and evidence, and open work (section 3.2, p. 5)
2. Deterministic stop-hook gates validate artifact presence and form (section 3.3, p. 5)
3. A fresh reviewer classifies findings as mainline gaps, blocking side issues, or queued side issues and returns `ADVANCED`, `STALLED`, or `REGRESSED`, ending with `COMPLETE` or `STOP` (Figure 4, p. 5)
4. Feed parsed findings into the next builder prompt; two consecutive stalled rounds trigger drift recovery, and every fifth round is a full-alignment review (section 3.2, p. 5)
5. Only reviewer acceptance enters code review; any severity-tagged finding starts a fix round, while a clean diff permits finalization (section 3.2, p. 5)

The paper gives the model: “A defect survives a single-model loop with probability b and the alternation with probability b mR.” (section 2.1, p. 3). It also warns: “The price of alternation is that the reviewer’s false positives also enter the chain, as extra rounds.” (section 2.1, p. 3)

Verus form

Inference: use Verus as the independent oracle for properties it can express. A verified function can carry `ensures`; a `proof fn` can establish lemmas with `requires` and `ensures`; `assert` and loop `invariant` expose intermediate obligations. Verus does not replace the reviewer for scope, usability, or unmodeled environment behavior. Do not treat a `proof fn` as runtime code.

Evidence and limits

Forty-five of 118 postmortems described builders over-claiming (findings, p. 8). Of 27 reports separating phases, 364 of 541 rounds (67.3%) happened in uncapped code review after implementation acceptance (deployment, p. 6). The authors report no controlled builder-with versus builder-without reviewer comparison; therefore the probability expression is a design model, not an observed defect rate.

## technique 3: mechanical gates and explicit termination

what it is and when to use it

Put routing and artifact invariants in deterministic hooks, rather than trusting prompts. Use gates whenever an agent can edit its own state or claim completion.

how to do it

1. Validate state schema, branch, immutable goal, plan copy, round-local files, and clean Git state (Appendix A, pp. 14–15)
2. Require a contract, summary, task list, lesson delta, and commit before review (section 3.3, p. 5)
3. Enforce a 42-round implementation cap, stop on reviewer `STOP` or three consecutive stalled/regressed rounds, and require a user request for cancellation (section 3.2, p. 5)
4. After completion, max-iteration, or reviewer stop, generate a sanitized methodology report (section 3.2, p. 5)

The catalog counts state integrity 12 gates, plan/scope 11, round isolation 10, Git hygiene 9, review protocol 7, and other categories totaling 72 (Appendix A, p. 14). A concrete trust boundary remains: “One gate fails open: on a malformed state file, the tool-call validators exit with code 1, which Claude Code treats as a non-blocking error.” (Appendix A, p. 14)

Verus form

Inference: represent immutable state facts as spec predicates and prove transitions preserve them; use `invariant` on a state-processing loop. Hook execution, Git cleanliness, CLI behavior, and file provenance are outside Verus and must be checked by the harness.

what is proved or measured, and what stays trusted

The paper measures repository deployment, postmortem counts, benchmark scores, and external-oracle outcomes. PutnamBench is reported as 672/672 verified proofs, but the Lean kernel and statement-preservation checks are the oracles (section 5, p. 7); gem5's 567-file migration passed local builds/tests yet its upstream CI had not passed and awaited maintainer review (section 5, p. 7). KDA's reported DSA ablation is 3.71x for the loop, 6.14x with KernelWiki, and 8.58x with profiling, against 1.37x for K-Search, one kernel and a 48-hour budget (Figure 5, p. 7). These are team-reported application results, not controlled causal estimates.

Inference: threat to agent-written verified Rust is substantial for completion and scope errors: a valid Verus proof can certify an over-weak contract, while this workflow supplies independent review and evidence routing. It does not prove that the specification matches the product requirement, nor cover external libraries, hardware, or malformed hook state. The paper itself says its gates check “presence and form of artifacts rather than their content,” and no controlled comparison was run (limitations, p. 10).

## techniques for the catalog

- plan contract: freeze goal, acceptance tests, boundaries, and task ownership before coding, then human-check the plan
- alternating review: route each builder round through a fresh independent reviewer whose parsed verdict controls completion
- mechanical gate protocol: validate state, round artifacts, review format, and explicit stop conditions in deterministic hooks
Checked 2026-10-15 against paper liu2026humanize: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
