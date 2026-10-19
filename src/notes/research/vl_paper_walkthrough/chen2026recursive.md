# Recursive Self-Improvement in AI: From Bounded Self-Refinement to Autonomous Research Loops
(authored by agents unless marked 🧑)
Tag: `chen2026recursive`, [paper](https://arxiv.org/abs/2607.07663v2)

## scope and taxonomy

This survey classifies 1,250 arXiv papers from 2024–2026 by what is improved and who validates the change. Its central distinction is: “Bounded self-refinement improves a system against a fixed, external evaluator; it is convergent and evaluable. Open-ended recursive self-improvement modifies the system and the criteria or machinery of improvement itself, with no fixed external anchor; it is divergent in principle.” (Section 2.1, p. 4). The four categories are deployment-time self-evolution, training-time self-iteration, self-evaluation, and Auto Research (Table 1, p. 3).

The corpus counts are 393 deployment-time papers, 340 training-time, 318 self-evaluation, 139 Auto Research, and 60 foundations/limits/safety papers (Table 1, p. 3). The paper says 74% of the corpus was posted in 2026 and that the seed harvest grew to roughly 500 papers in 2026 Q2 (Introduction, p. 2). The 74% uses the 1,250-paper corpus denominator, while quarterly growth uses the 871-paper seed corpus. The authors warn that the sample is not a census and that approximately 54 of 379 supplemental papers are peripheral query bleed; those papers remain in corpus counts but are not cited as evidence (Section 2.3, pp. 5–6).

Inference: for VL, the useful boundary is whether a Verus proof checker remains an external evaluator. Code-repair loops with fixed contracts and a fixed checker fit bounded self-refinement. Changes to contracts, proof assumptions, or the verifier require checking whether a fixed external anchor remains; changing these artifacts alone does not establish open-ended RSI.

## technique 1: classify an improvement loop by substrate and closure

Inference: application procedure. (1) Identify the artifact being changed: output, weights, harness/skills/memory, evaluator, or research process. (2) Identify the validation mode: human-in-the-loop, human-on-the-loop, or closed loop. (3) Record the evaluator that defines “better.” The paper defines an evaluator as “Any mechanism that maps a candidate artifact to a quality signal: a formal proof checker, a test suite, a learned reward or process-reward model, an LLM judge, a rubric, a human rater.” (Section 2.1, p. 3). (4) Mark whether the evaluator is fixed or co-evolves.

Verus form. Inference: place a VL pipeline in the deployment-time cell when it revises Rust code against fixed Verus contracts; place it in self-evaluation when it edits contracts, solver contexts, or proof policies. Record all `requires`, `ensures`, loop `invariant`s, and trusted `external_body` boundaries as the evaluator definition. Inference: a catalog entry should include closure level because a proof checked by a human-reviewed CI prerequisite check differs materially from an agent that edits and accepts its own proof assumptions.

Evidence and limits. The taxonomy is a survey model, not an experiment. It deliberately does not encode whether the objective itself is worthwhile: “both axes take the objective as given” (Section 2.2, p. 5). Inference: formal verification can establish that code meets a contract while leaving the contract’s product intent wrong.

## technique 2: use external feedback for iterative refinement

The survey’s deployment-time section identifies a generate–critique–revise loop, but reports that reliable systems ground critique in execution, retrieval, detectors, or solvers. “The design lesson, repeated across dozens of papers, is that the refinement loop is only as good as the feedback channel, an early appearance of the verification bottleneck of §5.” (Section 3.1, p. 7). Code is a clean test case because “programs run, tests pass or fail” (Section 3.2, p. 9).

Inference: application procedure. (1) Generate a candidate. (2) Run an external checker. (3) Convert the failure into an actionable trace. (4) Revise only the candidate, keeping the evaluator fixed. (5) Repeat to a bounded budget. (6) Compare against resampling and extra compute so gains are attributed to falsification. The survey describes proof-assistant agents such as LEAP and KVerus as exploiting “the strongest verifier available (a proof checker)” (Section 3.2, p. 9).

Verus form. Inference: run Verus after each generated patch, feed diagnostics back to the agent, and require the same specification file on every round. Use proof functions for repair lemmas and preserve executable code separately from proof-only code. A failed proof obligation identifies something the checker could not establish; it need not supply a concrete counterexample.

Evidence and limits. The survey reports that naive self-correction without external feedback can make answers worse and that the 2026 literature moved toward human-on-the-loop verified refinement (Section 3.1, p. 8). It also reports that a Mirror Loop study found informational change declined 55% over ten rounds of ungrounded self-critique across four task families; one verification step at iteration three restored forward movement (Section 5.2, p. 18). The survey also specifies three providers’ models. It does not define the informational-change metric here; Inference: the reported 55% should not be generalized beyond that experiment.

## technique 3: verification hierarchy and evaluator choice

The survey orders evaluators by reliability: formal verifiers and type systems; execution feedback; learned judges; and intrinsic confidence, self-consistency, or likelihood. “At the top sit formal verifiers — proof checkers, type systems — which are sound by construction: self-play theorem proving and verified skill evolution can iterate indefinitely without accepting a false improvement [118, 82].” (Section 5.2, p. 17). It calls execution feedback reliable but incomplete because passing tests underdetermines correctness, learned judges bounded by their own competence, and intrinsic signals the most gameable (Section 5.2, pp. 17–18).

Inference: application procedure. (1) State the target property. (2) Choose the highest available rung. (3) Keep lower-rung signals as search heuristics, never as final acceptance. (4) Audit whether the evaluator co-varies with the generator. (5) Add a human prerequisite check when the target itself is uncertain. The authors explicitly say the observed relation between hierarchy level and self-improvement strength is “a qualitative pattern we observe throughout the corpus, not a measured law” (Section 5.2, p. 18).

Verus form. Inference: use Verus proof success as an acceptance prerequisite check, compiler/tests as secondary diagnostics, and LLM confidence only to prioritize proof attempts. Keep contracts and trusted assumptions under human review. Inference: record each use of `external_body` as a trusted assumption; successful proof checking does not validate that body.

## technique 4: detect evaluator failure modes

The paper identifies four reusable failure modes. A self-confirming loop correlates generator and evaluator bias; collapse loses distribution tails; diversity collapse narrows the task curriculum; frame lock-in optimizes a well-posed but wrong question (Section 5.3, pp. 18–19). “The synthesis the evidence currently supports: pure closed loops degrade, as the theory predicts, but no practical system need run a pure closed loop — the open question is how little external grounding suﬀices, and no one has established the exchange rate.” (Section 5.3, p. 19)

Inference: application procedure. (1) Separate generator and evaluator where possible. (2) Test whether external data or independent checks improve stability. (3) Track output and task-distribution diversity. (4) Preserve failure traces and audit whether accumulated context narrows future search. (5) Ask an external reviewer whether the objective still matters, because frame lock-in is invisible to an evaluator that takes the objective as given.

Verus form. Inference: maintain independent specification review, mutation tests, and proof replay from clean commits. Track which lemmas and assumptions the agent adds. Reject a loop that changes the contract and implementation together without an external equivalence proof. Inference: a Verus proof can detect many local errors but cannot detect frame lock-in when the specification itself encodes the wrong system goal.

## process-level learning and product threat

The survey distinguishes result-level improvement from process-level improvement. Process signals judge intermediate steps; reusable corrected procedures, skills, and schemas amortize their cost across future tasks (Section 5.5, pp. 20–21). It characterizes result-level improvement as operating expenditure and process-level improvement as capital expenditure (Section 5.5, p. 21). These are the authors’ economic analogies, not measured costs.

Already done by the survey: the evaluator hierarchy, external-feedback repair loop, self-confirming/collapse diagnostics, and bounded-versus-open-ended taxonomy are all synthesized here. Inference: VL should apply these ideas to Rust/Verus with measured proof-repair traces, assumption ledgers, and independent contract review rather than build another generic self-improvement taxonomy. Inference: threat to agent-written verified Rust is high when the agent controls both specification and implementation, or when it reuses self-generated tests as its only oracle. The threat is lower when Verus, compiler, and human review remain external and contracts are immutable during repair.

Inference: applying the survey to VL leaves evaluator soundness, objective choice, external data, and research direction as assumptions or review responsibilities outside the generated proof. It says research direction-setting is “a verification problem the hierarchy indexes and a prior one — choosing what deserves evaluation at all — that it does not.” (Abstract, p. 1). Inference: a VL product needs governance for what to verify, not only mechanisms that verify selected code.

## techniques for the catalog

Inference: the following catalog procedures apply the survey’s framework; the survey does not present them as evaluated algorithms.

- loop classification: classify what changes, who validates it, and whether the evaluator co-evolves
- external-feedback refinement: generate, check with an external signal, repair from actionable failures, and bound the rounds
- verification hierarchy: prefer formal proof checkers, then execution checks, learned judges, and intrinsic signals as progressively weaker signals
- evaluator-failure diagnostics: monitor self-confirmation, distribution collapse, diversity collapse, and frame lock-in with independent review

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "A loop can be grounded, honest, diverse, and stable and still optimize an objective that has ceased to be the one worth optimizing — the well-posed wrong question."): checked all paper text including references, study quotations, numbers, section/page references, and technique descriptions; corrected quotations and page references, used the paper’s arXiv identifier, marked application procedures as inferences, and qualified claims about contract changes and failed proofs; did not independently check cited studies, corpus data/scripts, or Rust/Verus behavior.
