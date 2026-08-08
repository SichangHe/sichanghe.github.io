# Evaluating agent-produced verified code: CryptoProver and LeetProof

## direct answer

The two papers do not simply ask one agent whether another agent's code is good.
Both ultimately use a proof checker for the narrow claim that executable code
meets a formal specification. That part is substantially more reliable than an
LLM judge.

The hard part moves one level upward: who checks that the formal specification
means what the human intended?

- CryptoProver avoids most of that problem by freezing human-authored public API
  contracts and the trusted base before the agent runs. Verus checks the final
  crate against those fixed inputs. This makes the generated proof interior
  trustworthy *relative to the contracts*, but it does not establish that the
  contracts are adequate. [CP-BOUNDARY] [CP-GATES] [CP-LIMIT]
- LeetProof generates the formal specification from natural language. It uses an
  LLM judge, generated examples, randomized property-based testing, comparison
  against separate human-written specifications, and manual inspection. Lean
  then proves the generated program against the surviving generated
  specification. The code-to-spec link is strong; the natural-language-to-spec
  link remains empirical and fallible. [LP-SPEC] [LP-PROOF] [LP-RQ1]

So the short answer to “are agents checking agents?” is:

- sometimes, during filtering and proof construction;
- no, for the final logical code-to-spec acceptance, which is machine-checked;
- partly, for specification quality, where LeetProof uses an LLM judge and an AI
  prover alongside tests and author judgment;
- unresolved, for perfect specification-to-human-intent alignment.

LeetProof's evaluation is coherent enough to support a narrow ASE systems
contribution, but it is not airtight. The accepted paper combines a distinctive
multi-modal verification system with several complementary evaluations. It also
has material weaknesses: no component ablation, pooled rather than held-out
significance, no repeated-seed variance, no independent intent labels for the 50
synthesis specifications, a narrow public benchmark, and incomplete executable
reproduction in this audit. [LP-RQ2] [LP-AUDIT] [LP-VALIDITY]

No public record reveals the reviewers' private reasoning. Any explanation of
“why reviewers accepted it” below is therefore a bounded venue-fit inference,
not a claim about confidential reviews. [ASE-CRITERIA]

## a five-level way to understand evaluator reliability

These papers are easiest to read as an evaluator ladder. A higher level does not
automatically repair a missing lower or upper level.

| Level | Question | CryptoProver | LeetProof |
| --- | --- | --- | --- |
| 1. Agent report | Did the agent say it finished? | Explicitly ignored as evidence. [CP-DRIVER] | Not the final success oracle. |
| 2. Executable checks | Does it compile and pass finite tests? | Compiler and Verus runs; ChaCha also has independently checked vectors. [CP-EVAL] [CP-CHACHA] | Lean type-checking, concrete tests, and randomized PBT. [LP-SPEC] [LP-CODE] |
| 3. Formal alignment | Does code satisfy the formal specification? | Verus checks the unchanged code against frozen contracts through generated internal specifications and proofs. [CP-BOUNDARY] | Loom produces Lean VCs; a fully proven result has a Lean-checked code-to-spec certificate. [LP-PROOF] |
| 4. Claim integrity | Did the agent weaken the task, add trust, or break siblings? | Eight runner-owned gates, frozen inputs, admit accounting, and whole-crate checking. [CP-GATES] | Lean catches invalid proofs, but generated specifications are intentionally editable and semantic adequacy is tested rather than frozen. [LP-SPEC] [LP-INTENT] |
| 5. Human intent and generality | Is the formal claim the right one, and does the method generalize? | Contract adequacy and unseen-crate performance remain open. [CP-LIMIT] | Intent is approximated with references, tests, and manual categories; the 50-task synthesis benchmark is narrow. [LP-RQ1] [LP-VALIDITY] |

The central lesson is that “verified” answers Level 3. It does not, by itself,
answer Levels 4 and 5.

## CryptoProver walkthrough

### what the agent is allowed to produce

Humans supply and freeze:

- executable Rust;
- top-level API contracts;
- the specification vocabulary and trusted library;
- target decomposition and proof order;
- the harness and its gates.

The agent writes cross-file internal specifications and proof bodies. Verus must
use that generated interior to establish the unchanged public contracts. The
agent does not get credit for changing executable behavior or weakening the
external claim. [CP-BOUNDARY] [CP-EVAL]

This setup is deliberately narrower than natural-language vericoding. The
research question is essentially: given the intended top-level theorem and a
trusted mathematical floor, can an agent construct the missing proof tree for a
production crate?

### what happens after each agent round

The driver, not the model, decides whether work is acceptable:

1. Run Verus on the target.
2. Count non-axiom proof holes.
3. Reject a round that added no verified progress.
4. Compare task-start and post-round specifications.
5. Reject new axioms, proof-bypass constructs, frozen-file edits, checker edits,
   prohibited history retrieval, or broken edited siblings.
6. Restore an allowed state after recoverable failures.
7. Promote only a gate-clean verified state.
8. Before the headline result, run a fresh whole-crate check in a pinned
   container and require zero unresolved non-axiom obligations.

The paper is unusually explicit that the agent's completion report is not
evidence. This directly addresses the common “agent grades itself” failure.
[CP-DRIVER] [CP-GATES]

### what the final proof establishes

For the main curve25519-dalek subject, the reported terminal state is:

- unchanged executable code;
- 2,031 Verus checks and zero errors in a fresh container;
- no unresolved proof obligations;
- exactly the 48 pre-existing trusted axioms.

That is strong evidence that the code meets the fixed public contracts under the
fixed trusted base. It is not evidence of cryptographic security, constant-time
behavior, side-channel resistance, or contract adequacy. [CP-EVAL] [CP-LIMIT]

For ChaCha20, the external specification was human-authored from RFC 8439 and
independently checked with test vectors. The reported accepted cone is much
smaller: five helper lemmas across two files, the portable backend only, with 13
Verus checks and zero errors. [CP-CHACHA]

### where agents participate in evaluation

CryptoProver uses a coding agent to propose specifications and proofs, but does
not use that agent as the acceptance oracle. Verus and deterministic gates make
the terminal decision. A machine-checked counterexample is required before an
agent's `FALSE_CONTRACT` report gets the strong label; an unsupported report only
causes escalation. [CP-DRIVER]

Humans still determine the external contracts, trusted assumptions, task list,
proof order, gate design, and final interpretation. The authors also audited the
raw baseline and the motivating failures. There is no independent blinded human
panel evaluating contract adequacy.

### how the study evaluates system effectiveness

The paper offers four kinds of evidence:

1. **Main existence result.** One tuned curve25519-dalek campaign completes the
   stated proof-and-spec task with Fable 5.
2. **Composite raw-agent comparator.** The same model without the driver, skills,
   and gates claims success, but the saved result still has compiler and
   verification errors.
3. **Same-project, same-family replication.** Opus 4.8 eventually completes the
   same tuned task, much more slowly.
4. **Small transfer case.** Opus 4.8 proves the sealed ChaCha20 cone in one round.

This is persuasive existence evidence and a useful false-green demonstration.
It is weak evidence about average performance because there are only two
favorably selected subjects, the main environment was used for system tuning,
attempts preserve prior work, and the comparator removes the whole framework at
once. The paper itself calls the experiments existence results rather than
independent repeated trials. [CP-EVAL] [CP-BASELINE] [CP-LIMIT]

### context drift and reset

CryptoProver directly discusses context pressure. The motivating campaign found
fabricated axioms in long-running sessions, while fresh sessions could repair the
same statements. The final driver starts each target attempt in a fresh session
and can reset after stalls, token bloat, or proof plateaus while preserving the
worktree and compact round history. [CP-CONTEXT]

That is a failure-driven engineering response, not a clean causal evaluation.
The paper does not randomize fresh versus continued context or isolate reset
effects from the gates, prompt changes, and other harness changes. We should copy
the instrumentation idea, not the causal conclusion.

## LeetProof walkthrough

LeetProof has two different evaluation systems that should not be conflated:

- **online pipeline checks** decide whether a candidate specification, program,
  invariant, or proof may advance;
- **paper experiments** measure specification accuracy and compare the full
  multi-modal pipeline with direct Lean synthesis.

### stage 1: generated specification

The model writes a Lean specification and roughly ten concrete examples. The
pipeline then applies:

1. Lean type-checking.
2. An LLM judge for common issues.
3. Three property-based checks for each example:
   - the input satisfies the precondition;
   - the intended output satisfies the postcondition;
   - no mutated alternative output also satisfies the postcondition.
4. A revision loop when a check finds a problem.

The randomized checks deliberately use a non-failing tactic that may insert a
`sorry` when it finds no counterexample. The authors' justification is correct
but narrow: those tests are filters and are excluded from the final correctness
certificate. Passing them is not a proof that the specification captures intent.
[LP-SPEC]

This is the first place where one model judges another model's output. The paper
does not pretend that the judge is reliable by itself. In the VERINA study, PBT
caught two of seven specification errors that had already passed the LLM judge.
Three incorrect specifications survived because their generated examples did
not exercise the bad edge cases. [LP-RQ1]

### stage 2: generated program and invariants

The model writes executable Velvet code and loop invariants for the accepted
specification. The pipeline applies:

- compilation and Lean type-checking;
- concrete example execution;
- randomized execution over inputs satisfying the precondition;
- runtime checks of every invariant at loop entry and after each iteration;
- a postcondition check on the final result;
- VC generation and automated tactic attempts;
- LLM review of program shape and residual goals.

Failures produce concrete counterexamples or diagnostics for a fresh retry. At
this stage, PBT can disprove a candidate cheaply but cannot prove invariant
inductiveness or sufficiency. The paper explicitly calls the survivors
“high-confidence” rather than proved; they move to the proof stage. [LP-CODE]

### stage 3: final code-to-spec proof

Loom turns the annotated Velvet program into ordinary Lean theorems. SMT-backed
and built-in tactics close easy VCs. An AI prover or Aristotle proposes proofs
for residual obligations. A result is “fully proven” only when Lean accepts the
complete proof.

This is a crucial distinction:

- the AI prover is a proof *generator*;
- Lean is the proof *checker*;
- the proof establishes the program against the generated formal specification;
- it does not retrospectively prove that the specification was the right
  translation of the English problem.

[LP-PROOF]

### paper RQ1: are generated specifications accurate

The authors generate specifications for 188 VERINA problems and compare them
with human-written reference specifications. Aristotle attempts Lean proofs that
the generated and reference preconditions and postconditions are equivalent.
When no equivalence proof is obtained, the authors manually inspect and
categorize the difference.

Reported result:

- 150 formally equivalent;
- 33 categorized as reference defects, valid precondition variations, or
  defensible ambiguity;
- two over-restrictive specifications;
- three incorrect specifications;
- headline: 183 of 188, or 97.4 percent, are equivalent or justified divergence
  points.

The strong part is that Aristotle's successful equivalence claims require Lean
proofs; the AI is not merely assigning a score. The weaker part is the manual
classification of unresolved cases. The paper does not report blinded
independent raters or agreement, and its reference specifications themselves
contain defects. [LP-RQ1]

The leakage argument is suggestive rather than definitive. The authors say that
memorizing public VERINA references would reproduce their defects, whereas the
generator sometimes corrects them. That observation weighs against simple
verbatim recall; it does not rule out broader benchmark exposure or
training-assisted familiarity.

Most importantly, RQ1 uses VERINA. It does not independently label the 50
generated specifications used in the synthesis comparison. The public artifact
contains no independent semantic labels for those 50 specifications. [LP-AUDIT]

### paper RQ2: does the multi-modal pipeline beat direct Lean

The experiment compares two paired conditions on the same 50 tasks:

- full Velvet/LeetProof pipeline;
- direct single-mode Lean synthesis.

The conditions use the same GPT-5.2 model, the same generated formal
specifications, and the same five-dollar code-and-proof budget. The main binary
outcome is whether Lean accepts a complete proof. This is a relatively clean
comparison of the assembled pipelines *conditional on those specifications*.
[LP-RQ2]

The benchmark split is weaker than the headline:

- 15 tasks were manually chosen during development;
- 35 additional tasks were sampled with Claude and called the evaluation set;
- all are public, easy-or-medium LeetCode problems;
- no hard problem appears in the released split.

The paper reports 28 versus 17 fully proven over all 50 and an exact paired
McNemar value of 0.0192. The static artifact audit reconstructs the
evaluation-only paired counts as 11 Velvet-only wins and four Lean-only wins;
the corresponding exact two-sided value is approximately 0.118. The held-out
direction is promising, but the conventional significance claim depends partly
on pooling development tasks. [LP-RQ2] [LP-AUDIT]

The comparison is also composite. It does not ablate PBT, staging, SMT,
invariant inference, or the residual prover separately, so it cannot establish
which component caused the gain.

### paper RQ3: are partial programs actually correct

For the 18 Velvet programs left with open VCs after the GPT-5.2 budget,
Aristotle later closes all residual obligations. Those are again AI-generated
proofs checked by Lean, not an AI opinion that the programs look right.

This supports the narrow claim that the retained Velvet artifacts satisfy their
formal specifications after additional proof effort. It does not validate the
specifications against English intent. The paper and released statistics also
disagree by one direct-Lean residual outcome, and the external Aristotle service
was not rerun in the artifact audit. [LP-RQ3] [LP-AUDIT]

### paper RQ4: does the direction survive a second model

The authors rerun a random 25-task subset with Claude Opus 4.6 and report 10
Velvet versus seven direct-Lean successes. This is a useful directional check,
but a small one. The artifact audit reconstructs five versus two discordant wins
over all 25 and three versus two after removing development tasks. Neither is a
strong independent replication, and there are no repeated seeds. [LP-RQ4]

### artifact and reproducibility

The Zenodo archive is valuable: it contains source, prompts, 50 problems,
generated artifacts, VERINA equivalence directories, PBT cases, and result
summaries. The audit reproduced the main counts and split from static files.

It did not reproduce the full paid pipeline. The archive lacks complete
per-attempt model transcripts, a seed manifest, independent semantic labels, a
container or VM, and one reduced command that rebuilds the paper tables. Thus it
is inspectable, not established here as fully reproducible end to end.
[LP-AUDIT]

### context drift and resets

The paper itself does not analyze context drift, reset policy, or partial
compaction. The official artifact nevertheless shows deliberate context
discipline:

- specification, programmer, invariant, and example-proof retries construct
  fresh message lists instead of retaining prior tool-call transcripts;
- retry prompts repackage the current artifact and selected diagnostics;
- the invariant agent is told to abandon its strategy every five failed
  attempts;
- one tool-calling attempt still accumulates its calls and results, bounded to
  five iterations for programmer and invariant agents;
- specification retries re-embed all prior attempts and feedback, so their
  reconstructed prompt can still grow.

This is best described as *fresh self-contained retry prompts*, not selective
compression of a live model context. The paper reports no ablation showing that
this design prevents drift or improves success. [LP-CONTEXT]

## where the two papers rely on agents and humans

| Decision | CryptoProver | LeetProof | Reliability reading |
| --- | --- | --- | --- |
| Candidate code or proof | Coding agent | Pipeline agents and Aristotle | Untrusted proposal in both. |
| Common-issue review | Agent self-signals are advisory | Explicit LLM judges | Heuristic only. |
| Finite behavioral checks | Compiler, verifier diagnostics, ChaCha vectors | Generated examples and randomized PBT | Useful falsification, incomplete intent evidence. |
| Formal code-to-spec result | Verus and Z3 | Loom and Lean, with SMT/tactics/AI-generated proofs | Strongest layer, conditional on spec and trusted base. |
| Task/claim preservation | Frozen contracts plus eight gates | Generated spec may be revised; final proof is relative to it | CryptoProver has the stronger anti-cheat boundary. |
| Specification intent | Human-authored external contracts, not independently scored | Human references, generated tests, PBT, authors' manual categories | Neither proves perfect human intent. |
| Study interpretation | Authors; no blinded population study | Authors; unresolved cases manually categorized | Human judgment remains and should be exposed. |

## why LeetProof plausibly cleared the ASE bar

The public evidence supports only an inference about venue fit. It does not
reveal reviewer votes or private reasoning.

The plausible acceptance case is the combination of six strengths:

1. **A coherent technical unit.** It is not merely another iterative LLM proof
   loop. It combines execution, randomized testing, SMT, and interactive Lean
   proof inside one foundational Velvet/Loom workflow.
2. **New infrastructure.** Type-directed output mutations, bounded existential
   testing, and meta-programmed invariant instrumentation are concrete software
   contributions.
3. **A real evaluator problem.** The paper shows that existing human-written
   benchmark specifications contain detectable defects, so specification
   validation is not cosmetic.
4. **Research questions at several layers.** The paper separately studies
   specification accuracy, whole-system synthesis, last-mile proof closure, and
   model sensitivity.
5. **A machine-checkable primary endpoint.** “Fully proven” is not an LLM score;
   it is a Lean-accepted proof, which substantially reduces evaluator
   subjectivity for code-to-spec correctness.
6. **Triangulation and disclosure.** A paired budgeted baseline, development and
   evaluation split, second model, threats-to-validity section, and public DOI
   archive make the narrow systems claim inspectable.

These strengths line up plausibly with ASE's public Significance, Novelty,
Soundness, Verifiability, and Presentation criteria. [ASE-CRITERIA]

The likely judgment was not that the evaluation solved semantic intent. A more
defensible inference is that the mechanical endpoint and multiple supporting
studies made the integrated system contribution credible despite acknowledged
and unacknowledged limits. The missing ablation, weak held-out significance, and
intent gap reduce the breadth of the claim; they do not make the narrow
code-to-generated-spec result meaningless.

## lessons for VL

### separate the oracles

Every result should expose four independent decisions:

1. Did the executable artifact build and pass evaluator-held behavioral checks?
2. Did the verifier prove it against the submitted formal specification?
3. Did immutable runner checks show that code, task, trusted assumptions, and
   evaluator were not weakened?
4. Did qualified arm-blinded scorers decide that the specification matches the
   intended repository behavior?

Do not collapse these into one “verified” label.

### do not let generated examples define their own oracle

Agent-generated examples can help find failures, but they cannot be the only
intent evidence for agent-generated specifications. The evaluator should own:

- hidden reference behavior derived before subject launch;
- adversarial incorrect implementations;
- mutation and metamorphic checks;
- no-change and weak-but-verifier-green traps;
- independent semantic labels and adjudication.

The agent may propose extra tests, but its tests should supplement rather than
define success.

### use proof assistants as checkers, not graders of intent

An AI-generated Lean or Verus proof is acceptable evidence if the trusted
checker validates it and the claim boundary is frozen. The same proof says
nothing about an incorrectly inferred external requirement. VL therefore needs
both machine proof and an independent semantic score.

### validate the evaluator before evaluating agents

Create deterministic negative fixtures for:

- weakened preconditions or postconditions;
- proof holes and newly trusted assumptions;
- changed executable behavior;
- broken siblings;
- doctored evaluator or guidance tooling;
- verifier-green but intent-wrong specifications;
- agent-declared completion before terminal checks finish.

Every fixture must fail the corresponding acceptance gate. This is cheaper and
more informative than spending model tokens to discover that the evaluator is
unsound.

### keep the existing two-arm CLI study

The main Midas Lex product evaluation remains exactly `E0_NO_CLI` versus
`E1_CLI`. The LeetProof lesson is to execute that frozen protocol with
independent semantic scoring and adequate held-out sampling, not to introduce a
third product arm. [VL-HANDOFF]

## conditional PCC mechanism pilot

### status

This is a protocol outline, not launch authorization. The manager has directed
that no subject be launched and no VL instruction be changed until all of the
following are resolved:

- the installed PCODX path is shown to shorten or replace the *model-visible*
  context, rather than only changing a sidecar ledger or token report;
- the proper VL/PCC owner and execution route are identified;
- the human's ambiguous final sentence is clarified;
- immutable task snapshots and hidden evaluator packets are recovered;
- the protocol receives independent review and fresh launch approval.

### research question and treatment

The mechanism question should be isolated from the CLI efficacy question:

> At fixed task, worktree, model, prompt, guidance CLI, tool access, and total
> budget, does verified partial context compaction improve semantic completion or
> reduce drift relative to continuing the full context?

Use exactly two PCC conditions:

- `P0_CONTINUED_CONTEXT`
- `P1_VERIFIED_PCC`

Both conditions receive the same frozen Midas Lex CLI release or both receive no
CLI. The choice must be fixed before launch. PCC is the only intended treatment
difference. This is a separate two-condition mechanism pilot, not a third arm in
the `E0_NO_CLI` versus `E1_CLI` product study.

### model-visible preflight gate

Before any research subject, run a non-task canary through the exact installed
route and require evidence that:

1. the upstream request after compaction is shorter than the corresponding
   pre-compaction request;
2. the retained summary and current worktree are present;
3. deleted historical turns are absent from future model input, not merely hidden
   from the UI;
4. the subject continues through the same declared PCODX session/thread mapping;
5. tool availability, system instructions, model settings, and budget accounting
   are unchanged;
6. raw payload or equivalent trustworthy instrumentation is sealed for review.

If this gate fails, the task stops as an infrastructure study. A PCC label or a
shorter sidecar transcript is not enough.

### smallest useful task panel

Start with two previously studied, small but non-trivial VL tasks only if their
exact source snapshots, prompts, hidden requirements, and evaluator artifacts
can be recovered:

1. **Interval calendar.** Required semantic traps should include half-open
   overlap, failed-operation immutability, duplicate rejection, zero capacity,
   checked total, and exact overflow behavior.
2. **Checked ledger.** Required traps should include same-account transfer,
   non-self frame conditions, failed-operation immutability, zero-balance close,
   account-derived checked totals, duplicate/full rejection, and overflow.

The old studies proved separate semantic models and tested executable Rust; they
did not mechanically connect those models to the compiled implementations.
Their old “verified” labels must not be reused as a direct executable-verification
oracle. [VL-LEGACY]

The archived evaluator also reports that some original arm artifacts are no
longer at their recorded paths. If an exact task snapshot or hidden oracle cannot
be recovered, do not reconstruct it from memory and call it the same task. The
owner must either locate an immutable copy or prepare a newly named development
task with a fresh evaluator packet. [VL-HANDOFF]

### controlled compaction point

A short task may finish before natural context bloat appears, so the pilot needs
a preregistered, harness-controlled boundary. A defensible small pilot is:

1. Let the subject implement and reach its first complete compile/test/verifier
   cycle.
2. Give both conditions the same evaluator-held structured failure packet for
   one non-trivial semantic trap.
3. At that boundary, continue P0 with its full context and apply PCODX to P1.
4. Preserve the same worktree, remaining budget, failure packet, and next user
   instruction.
5. Do not allow a human to repair or enrich the PCC summary after seeing the
   arm's output.

The exact trigger must be deterministic and observable. If the owner instead
uses a token threshold, both the threshold and the handling of tasks that finish
before it must be preregistered.

### initial scale

Use a staged launch only after the gates above pass:

- instrumentation smoke: one non-research canary;
- smallest subject pilot: two tasks by two conditions by one paired seed, four
  runs total;
- optional stability check: one additional paired seed on the same frozen
  design, four more runs, only if the first four are protocol-valid and cost is
  acceptable.

This scale can expose instrumentation failure and large qualitative regressions.
It cannot estimate a general effect. Report every run and do not select the best
seed.

### evaluator stack

The PCC pilot should score:

- **primary semantic endpoint:** arm-blinded evaluator-held intent adequacy,
  including hidden traps and no unsupported narrowing;
- **machine layer:** build, tests, Verus result, proof-hole and assumption scans;
- **claim-integrity layer:** immutable source/spec/trust/tool hashes and sibling or
  whole-project checks;
- **false-green layer:** agent declares completion but one acceptance layer fails;
- **context-drift layer:** repeats a known failed strategy, loses a fixed
  requirement, reverts a previously correct change, invents a task fact, or
  violates an immutable boundary;
- **efficiency layer:** total input/output tokens, cost, wall time, verifier calls,
  failed branches, and time to first adequate result;
- **compaction-fidelity layer:** current invariants retained, stale strategies
  omitted, and no unsupported fact introduced by the summary.

Agents may help generate diagnostic labels, but they cannot be the only scorers.
Two qualified arm-blinded scorers should independently apply a frozen rubric,
with agreement and adjudication recorded. Machine evidence remains separate.

### artifact requirements

For each run preserve:

- source and worktree hashes before and after the compaction boundary;
- exact system, user, and task prompts;
- model, provider, settings, seed, and budgets;
- PCODX binary/commit/config and session/thread mapping;
- pre- and post-compaction model-visible payload evidence;
- the exact generated summary and removed message IDs;
- complete transcripts and tool calls for both conditions;
- verifier/test commands and raw outputs;
- agent claims, independent scores, adjudication, and false-green classification;
- one manifest proving that the two conditions differ only in PCC treatment.

### interpretation rule

The first question is not “did PCC win?” It is:

1. Was model-visible compaction actually applied?
2. Did the treatment preserve the task and current state?
3. Did any semantic or trust-boundary regression appear?
4. Is there enough signal to justify a larger, still two-condition pilot?

Four or eight runs support a mechanism smoke result, not a publication claim.
Do not merge them into the main CLI efficacy estimate.

## source map

### LeetProof paper and accepted status

- ID: `LP-SPEC`
  - authoritative accepted paper:
    <https://verse-lab.org/papers/leetproof-ase26.pdf>
  - proceedings DOI: <https://doi.org/10.1145/3832783.3837559>
  - primary version/date:
    - ASE 2026 proceedings version, 13 pages
    - conference event dated 2026-10-12 through 2026-10-16
    - accepted full text and proceedings record retrieved 2026-08-05 PDT
    - no numbered manuscript version is stated in the accepted PDF
  - local PDF:
    [paper](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.pdf>)
  - PDF sha256:
    `f3702b4d98a5f92f28a3f303102433b37e9aaeae16bd245df65481f03df1f664`
  - sections: 3.1 and 4.2
  - claim: LLM judge and randomized soundness/completeness filters precede code
  - exact quotes: “an LLM judge”; “validation guards”
  - prior closed paper source map:
    [LeetProof ASE evaluation note](./leetproof_ase_evaluation_20260805.md#source-map)
- ID: `LP-CODE`
  - same paper, sections 3.2 and 4.3
  - claim: randomized execution checks programs and invariants before proof
  - exact quotes: “checked both at loop entry”; “postcondition is checked”
- ID: `LP-PROOF`
  - same paper, sections 2.2 and 3.3
  - claim: fully proven code has a Lean-checked code-to-spec certificate
  - exact quotes: “machine-checkable correctness proof”; “ordinary Lean theorem”
- ID: `LP-INTENT`
  - same paper, sections 5 and 7
  - claim: perfect natural-language intent alignment has no rigorous oracle
  - exact quotes: “no established method”; “semantic misalignment remains”
- ID: `LP-RQ1`
  - same paper, section 5.1
  - claim: 188-spec comparison combines Lean equivalence proofs and manual
    categorization; PBT catches judge misses but also misses edge cases
  - exact quotes: “manually inspect”; “PBT cannot detect them”
- ID: `LP-RQ2`
  - same paper, sections 6.1 and 6.2
  - claim: paired same-model, same-specification, same-budget comparison and
    pooled exact test
  - exact quotes: “same specifications”; “exact two-sided McNemar test”
- ID: `LP-RQ3`
  - same paper, section 6.3
  - claim: Aristotle-produced Lean proofs close all 18 partial Velvet results
  - exact quote: “all 18 partially proven programs”
- ID: `LP-RQ4`
  - same paper, section 6.4
  - claim: a 25-task second-model subset preserves the direction
  - exact quote: “10/25 vs. 7/25”
- ID: `LP-VALIDITY`
  - same paper, section 7
  - claim: narrow problem class, fixed-budget, dependency, and intent limitations
  - exact quotes: “do not cover all software classes”; “small risk”

### LeetProof official artifact

- ID: `LP-AUDIT`
  - authoritative landing: <https://zenodo.org/records/19624966>
  - DOI: <https://doi.org/10.5281/zenodo.19624966>
  - local archive: `official-artifact-v2-zenodo-19624966.zip` in the LeetProof
    collection
  - archive sha256:
    `e4ffa6b7f4556cbffbadeb3674ede4b7f1048ee961a7daf4c07fb81b33255a04`
  - [static audit](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/official-artifact-audit.md>)
  - claim: count reconstruction, split composition, paper/archive discrepancy,
    and reproduction boundary
  - exact quotes: “no complete per-attempt model transcript”; “no container or VM”
  - uncertainty: static inspection only; no paid model or Aristotle rerun
- ID: `LP-CONTEXT`
  - [focused source audit](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/evaluation-context-audit-20260808.md>)
  - primary archive and checksum: same as `LP-AUDIT`
  - members: `agents/spec_gen.py`, `agents/velvet_programmer.py`,
    `agents/velvet_invariant_inferrer.py`, `agents/example_prover.py`,
    `agents/base.py`, `config/limits.py`, and `pipeline.py`
  - claim: fresh outer retries, bounded within-attempt accumulation, and
    five-failure invariant-strategy resets
  - exact quotes: “Always start fresh”; “strategy reset after 5 failed attempts”
  - uncertainty: implementation evidence, not an evaluated paper result

### ASE criteria

- ID: `ASE-CRITERIA`
  - authoritative research-track landing:
    <https://conf.researchr.org/track/ase-2026/ase-2026-research-track>
  - [saved source map](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/ase-2026-official-criteria-source-map.md>)
  - claim: public research-paper criteria and official LeetProof listing
  - exact quotes: “Significance”; “Novelty”; “Soundness”; “Verifiability”
  - uncertainty: no public review text or reviewer vote is available

### CryptoProver primary evidence

- ID: `CP-BOUNDARY`
  - authoritative landing: <https://arxiv.org/abs/2608.00965>
  - primary full text: <https://arxiv.org/pdf/2608.00965v1>
  - archival DOI: <https://doi.org/10.48550/arXiv.2608.00965>
  - primary version/date:
    - arXiv version one, published and entry-updated 2026-08-02 03:32:08 UTC
    - DataCite version-one submitted time matches arXiv; DataCite metadata was
      updated 2026-08-04 00:53:55 UTC
    - saved local PDF bytes matched the remote arXiv version-one PDF
  - local PDF:
    [paper](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026.pdf>)
  - PDF sha256:
    `5afa405f7721666d45fe7fa32f24547aadcec7b9bef3fc6d6e3c5ea007bced42`
  - sections: 2.2, 3.3, and 4
  - claim: fixed public contracts and trusted base constrain generated interiors
  - exact quotes: “fixed top-level API contracts”; “whole crate to re-verify”
- ID: `CP-DRIVER`
  - same paper, section 3.4
  - claim: the runner independently checks every claimed result
  - exact quote: “completion report is not evidence”
- ID: `CP-GATES`
  - same paper, section 3.6 and appendix A
  - claim: eight deterministic gates reject known false-green routes
  - exact quotes: “suite of eight gates”; “byte-identical”
- ID: `CP-EVAL`
  - same paper, section 4.1
  - claim: main machine-checked existence result and same-project replication
  - exact quotes: “2,031 checks verified”; “no unresolved proof obligations”
- ID: `CP-BASELINE`
  - same paper, section 4.1
  - claim: composite raw-agent comparator falsely reports completion
  - exact quotes: “claiming it had completed”; “5 compiler and 2 verification errors”
- ID: `CP-CHACHA`
  - same paper, section 4.1
  - claim: narrow human-specified RFC transfer case
  - exact quotes: “human-authored”; “13 verified items”
  - supporting preserved project archive:
    `chacha20-verus-83175e3ad9ced9528f860edd01a7ea6f55ab1330.tar.gz`
    in the CryptoProver collection
  - archive sha256:
    `2c2f54c68147960d79ff35d1c6459124d4670400a61cd96f51a4832a7982df97`
  - project-report exact quote: “RFC test vectors”
  - boundary: vector tests support the external floor but do not prove contract
    adequacy beyond the exercised RFC cases
- ID: `CP-CONTEXT`
  - same paper, sections 3.1, 3.2, and 3.4
  - claim: observed context pressure motivates fresh attempts and evidence-triggered
    resets
  - exact quotes: “context pressure”; “context bloat”
  - uncertainty: observational motivation, not a randomized reset ablation
- ID: `CP-LIMIT`
  - same paper, sections 5.1 through 5.3
  - claim: guarantee and generalization boundaries
  - exact quotes: “not cryptographic security”; “selected favorably”
- supporting detailed note:
  [CryptoProver study and closed source map](./cryptoprover_20260807.md#source-map-cryptoprover-paper)
- supporting public-artifact audit:
  [audit](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026/official-artifact-audit.md>)
- publication boundary:
  - arXiv v1 is a preprint, not a peer-reviewed venue record
  - main run trajectories are not fully reconstructible from the public snapshot

### prior VL evidence and protocol

- ID: `VL-LEGACY`
  - [archived evaluator report](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026/vl-four-arm-evaluator-report-20260701.md>)
  - original accepted evaluator-message sha256 recorded by the archive:
    `fa3b6c4a6ea0523b272cc9654b7a80a28a7c3dee85a199803cd6295e26eba154`
  - archived wrapper-file sha256:
    `761399e6b8f678c6f52c6717e5d5872fc96fa01c5af08c45325873aa8e0fd544`
  - claim: interval-calendar and checked-ledger task behavior, proof boundary, and
    missing transcript/artifact limitations
  - exact quotes: “not direct Verus verification”; “both arms succeeded”
  - classification: bounded legacy evidence, not a new PCC result
- ID: `VL-HANDOFF`
  - [current two-arm handoff](./leetproof_vl_evaluation_handoff_20260805.md)
  - claim: preserve E0/E1, use independent semantic scoring, and require packet
    PASS plus fresh launch approval
  - exact quotes: “Do not add a third arm”; “not launch authority”
  - classification: current evaluation design, not completed experimental evidence

### lifecycle records excluded from research evidence

The manager mail, task record, and private routing reports establish ownership,
authorization, and blockers only. No paper or capability claim in this note uses
them as research evidence.

## confidence

- high confidence:
  - both papers use machine checkers rather than agent opinion for their final
    code-to-spec proof result;
  - LeetProof uses LLM judges only as fallible filters;
  - LeetProof leaves natural-language intent partly unresolved;
  - CryptoProver leaves contract adequacy outside its claim;
  - the released LeetProof code uses fresh retry prompts and periodic strategy
    resets without evaluating their causal effect.
- medium confidence:
  - the venue-fit explanation, because public ASE criteria and paper structure
    support it but private reviews are unavailable;
  - the exact practical value of a PCC pilot, because the installed model-visible
    treatment path remains under manager verification.
- low confidence until new evidence:
  - any general success-rate claim for either paper beyond its evaluated scope;
  - any claim that PCODX partial compaction improves VL subjects;
  - any launch-ready PCC task equivalence until exact snapshots and hidden
    evaluator packets are recovered.
