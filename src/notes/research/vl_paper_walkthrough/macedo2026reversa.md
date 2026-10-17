# Reversa: A Reverse Documentation Engineering Framework for Converting Legacy Software into Operational Specifications for AI Agents
(authored by agents unless marked 🧑)
Tag: `macedo2026reversa`, [paper](https://arxiv.org/abs/2605.18684)

## purpose and result
The paper defines reverse documentation engineering as recovering operational specifications from an existing legacy system for use by coding agents. It says, “Reversa organizes this process as a multi-agent pipeline: specialized agents map the project surface, analyze modules, extract implicit rules, synthesize architecture, write unit-level specifications, and review generated claims.” (abstract, p. 1) The target is traceable contracts, explicit uncertainty, and human-checkable gaps rather than fluent prose.

## technique: staged evidence-to-specification pipeline
What it is: a role-separated workflow from repository evidence to operational artifacts. The paper's concrete protocol has five evaluation stages: “First, record the initial state of the project: language, dependencies, existing documentation, presence of tests, and analyzed version. Second, install Reversa with npx reversa install, selecting engines, agent teams, and output configuration. Third, execute the Discovery team until the main artifacts are generated in _reversa_sdd/. Fourth, review confidence and gaps, collecting confidence-report.md, questions.md, gaps.md, and traceability matrices when available. Fifth, evaluate the artifacts through human inspection and, when possible, through downstream tasks executed by coding agents.” (Section 4, p. 9)
When to use it: use before migration, maintenance, or verification when behavior is implicit in code, data, or conventions.
How to do it: record the analyzed revision and project surface; run a scout; deepen module analysis; extract rules and exceptions; synthesize architecture and dependencies; write unit-level requirements/design/tasks; review each claim against source; then derive downstream tasks and parity tests. The role table names Scout, Archaeologist, Detective, Architect, Writer, Reviewer, Migration, and Code Forward (Table 2, p. 7). Inference: retain the artifacts in version control and require every Verus contract to point to a source claim or an explicitly unresolved gap.
Verus form (Inference, not from the paper): executable Rust functions can carry `requires` and `ensures`; mathematical summaries use `spec fn`; proofs use `proof fn`; loops use `invariant`. For example, `fn withdraw(a: &mut Account, n: u64) requires old(a).balance >= n ensures a.balance == old(a).balance - n { ... }` could express a reviewed rule such as an ATM withdrawal. The paper does not produce Verus annotations; a reviewer must translate its operational specification and preserve gaps as unproved assumptions.
Evidence: the exploratory ATM run had five modules in parity scope (Section 5.1, p. 10) and produced 53 Gherkin parity scenarios (Section 5.2, pp. 10–11). It produced 517 claims: 490 confirmed, 24 inferred, and 3 gaps (Section 5.3, p. 11). The paper reports 9 of 11 reconstruction tasks completed at inventory time (abstract, p. 1).
Limits: the protocol was not compared against a single agent or conventional documentation tool, and final parity and cutover were unfinished (Sections 5.4 and 7, pp. 12–13). Inference: these numbers measure artifact production, not proof soundness or factual precision.

## technique: confidence, gap, and traceability classification
What it is: classify claims as confirmed, inferred, or gap. “A confirmed claim must have direct evidence in code or in a verifiable artifact. An inferred claim may be supported by recurring patterns, names, flows, or structure, but should not be written as certainty. A gap records information that could not be determined safely and needs human validation.” (Section 3.5, p. 7)
How to do it: attach file/module evidence to each claim; mark uncertain interpretations as inferred; create a gap when evidence is insufficient; have the Reviewer reread the source and reclassify fragile claims; consolidate questions in `questions.md`, `gaps.md`, and `confidence-report.md`; at more complete documentation levels, generate code-spec and spec-impact matrices (Section 3.5, p. 7).
Verus form: Inference: a confirmed claim becomes a postcondition or invariant only after its meaning is reviewed; an inferred claim remains a candidate lemma or assumption; a gap blocks `proof fn` completion until a contract or model is supplied. Verus can expose assumptions with `requires`, but the assumption itself remains trusted input.
Evidence: the paper's internal index assigns confirmed claims weight 1.0 and inferred claims 0.5, yielding 97.1% for 490 confirmed, 24 inferred, and 3 gaps (Section 5.3, p. 11). The authors explicitly warn that this is not factual precision because no external audit was performed.
Limits and trust: source interpretation, agent prompts, human decisions, external behavior, and the confidence classifier remain trusted. Inference: a 97.1% index must never be presented as a 97.1% probability that Verus code is correct.

## technique: manifest-preserving installation
What it is: install agent skills across engines while preserving user edits. The CLI writes `.reversa/_config/files-manifest.json`; “This manifest records hashes for installed files and enables each file to be classified as intact, modified, or missing.” (Section 3.3, p. 6)
How to do it: run `npx reversa install`; detect available engines; copy skills and engine-specific entry files; hash installed files; on update replace intact or missing files but preserve modified files; during uninstall, "the same principle" reduces the risk of deleting content that does not belong to Reversa or was locally changed (Section 3.3, pp. 5–6).
Verus form:

## what is proved, measured, and trusted
The paper measures claim counts, confidence classification, gap counts, scenarios, and task status for one educational COBOL ATM with no automated tests. It does not prove migration parity, factual accuracy, agent utility, cost reduction, or superiority. The authors state, “Final parity validation and cutover were not completed in this study.” (abstract, p. 1)

## techniques for the catalog
- staged evidence-to-specification pipeline — separate repository mapping, rule extraction, architecture synthesis, specification writing, and review before downstream coding
- confidence and gap classification — mark claims confirmed, inferred, or unresolved and attach traceability evidence
- manifest-preserving installation — hash installed agent artifacts and preserve locally modified files during update and uninstall
