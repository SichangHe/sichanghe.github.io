# Cross-Context Review: Improving LLM Output Quality by Separating Production and Review Sessions
(authored by agents unless marked 🧑)
Tag: `song2026crosscontext`, [paper](https://arxiv.org/abs/2603.12123)

## result and scope

This paper proposes Cross-Context Review (CCR): produce an artifact in one LLM session, export only the artifact, then ask for review in a new session. The reviewer cannot see production instructions, intermediate reasoning, or the original conversation. The experiment uses 30 artifacts with 150 injected errors, four conditions, and 360 reviews (abstract; §§3–4, pp. 1–5). All reviews used Claude Opus 4.6 through the Claude Code Agent tool, with three independent runs per condition (§4.3, p. 4).

The strongest supported claim is narrow. CCR beats repeated same-session review (SR2): F1 is 28.6% for CCR versus 21.7% for SR2 over three runs, with Holm-adjusted p=.004; the run-1 paired t-test is p<.001 (abstract; §§5.1–5.2, pp. 1, 5). CCR does not robustly beat one same-session review after excluding an unverifiable SR run: CCR 28.6% versus SR 27.1%, adjusted p=.26 (§6, p. 6). The paper therefore says the data “show that context separation rescues a second look, not that it beats looking once” (§7.2, p. 7).

## technique 1: cross-context review protocol

What it is. CCR is defined as “a verification method where an LLM reviews an artifact in a fresh session containing only the artifact and a standardized review prompt.” (§3.1, p. 3) The method removes production context, rather than relying on elapsed time (§3.4, pp. 3–4); the experiment used the same model for production and review.

When to use it. Use CCR when an LLM has just generated code, documentation, or a script and a second pass is needed. It is aimed at anchoring, self-preference, and context-length degradation. Inference: the review should be a separate session even if the same model is used, since the experiment did exactly that.

How to do it.

1. In Session A, interact with the model until it produces the artifact. The paper’s production phase may accumulate instructions, iterations, and design decisions (§3.2, p. 3).
2. Export the final artifact and discard the conversation history, intermediate reasoning, and generation instructions (§§3.1–3.2, p. 3).
3. Start Session B with the artifact and a standardized prompt. The prompt asks about factual accuracy, internal consistency, contextual fitness, audience misinterpretation, and completeness (§3.2, p. 3).
4. Record structured findings and feed them into an integration phase, either in the original or a new session (§3.2, p. 3).
5. If testing the method, compare against same-session SR, same-session repeated SR2, and fresh-session subagent review SA. SR2 receives the first review; SA receives the production prompt plus artifact; CCR receives artifact only (Table 1, p. 4).

Verus form. Inference: export a Rust module together with its `requires` and `ensures`, then open a fresh review session that sees only those files. Ask for source locations of missing preconditions, contradictory postconditions, unproved assumptions, and likely counterexamples. Keep the final source under Verus verification; CCR is a review step and supplies no proof. If the original session used a proof search trace, do not pass that trace into the review session.

Evidence and limits. The paper’s table reports per-artifact averages over 90 reviews per condition, except SR at 60 after one run is excluded: CCR finds 4.5 findings, 1.4 true positives, 3.1 false positives, 3.6 false negatives, precision 31.5%, recall 27.1%, and F1 28.6%; SR2 has precision 21.0%, recall 22.7%, and F1 21.7% (Table 2, p. 5). The paper says “The central SR2 result holds” after its version-2 audit, but the broader SR and SA comparisons became non-significant (§6, p. 6).

## technique 2: controls that separate context from repetition

What it is. The four-condition design isolates whether a second look helps because of another pass or because prior context was removed. SR is a same-session review, SR2 repeats review in that same context with the first review visible, SA is a new subagent with the original prompt and artifact, and CCR is a new session with the artifact only (Table 1, p. 4).

How to do it. Keep artifact set, injected defects, model, prompts, and run count fixed. Apply all four conditions to each of 30 artifacts, repeat each independently three times, then compute per-artifact precision, recall, and F1. Use paired tests because each condition reviews the same artifacts. The paper uses paired t-tests on Run 1 (N=30) and a robustness test on three-run averages with Wilcoxon signed-rank tests, Holm-adjusted over three comparisons (§4.4, pp. 4–5; §6, p. 6).

The run-1 results are not the final claim. CCR is significantly above SR2 (t=-3.917, p<.001, Cohen’s d=.72), while SR versus CCR (p=.008) and SA versus CCR (p=.004) do not survive the three-run update (§5.2, p. 5; §6, p. 6). The paper also reports that SR2 does not improve on SR in run 1 (p=.11).

Verus form. Inference: use the same Verus commit for all conditions and compare reviews at the artifact level. A paired design prevents different code difficulty from masquerading as context benefit. The statistical tests evaluate review metrics; Verus’s own verification result remains the executable proof check.

## technique 3: injected-error corpus and score-matched finding evaluation

What it is. The authors generate 30 artifacts in code, document, and script categories and inject five plausible defects into each: FACT, CONS, CTXT, RCVR, and MISS. Defects span Critical, Major, and Minor severity (§4.1, p. 4). A review finding is matched with a scoring function based on location proximity within ±5 lines, keyword overlap using Jaccard similarity, and an error-type bonus (§4.4, p. 4).

How to do it. Preserve an annotation for each injected error. For every model finding, calculate the matching score; count it as a true positive when the score exceeds 2.0. Derive TP, FP, FN, precision, recall, and F1 per artifact and condition (§4.4, pp. 4–5). Stratify results by category, severity, and error type. The paper reports, for example, CCR F1 of 40.7% for code, 24.5% for documents, and 20.7% for scripts; these are three-run averages (Table 5, p. 5). Severity detection for CCR is 40% Critical, 29% Major, and 18% Minor, without significance testing (Table 4, p. 5).

Verus form. Inference: annotate seeded defects as contract, functional, safety, or concurrency failures; use stable function names and source spans instead of only line proximity; then compare model findings with actual Verus diagnostics and counterexamples. A score-based match is an evaluation harness, not a `proof fn`, and it cannot certify a model’s claim.

Evidence and limits. The paper says contextual errors are hardest, topping out at 18% for SR, and that CCR has the highest rate for two types (CONS and RCVR) while SR leads on three; differences were not tested (§5.5, pp. 5–6). The errors were “deliberately injected, not naturally occurring” (§8, p. 8). Inference: the matching process is a heuristic, not a semantic proof, and can miss a correct finding stated differently; the paper says only that different matchers would give different absolute numbers and that its keyword component may under-credit English-language reviews (§8, p. 8).

## technique 4: fresh context as information removal

What it is. The paper distinguishes CCR from human incubation. “The mechanism is not rest or unconscious processing — LLMs have neither — but the elimination of anchoring information.” (§3.4, p. 3) A new session also shortens context: the production session can exceed 50K tokens while the review is typically about 5K (§2.3, pp. 2–3).

How to use it. Treat session separation as an information boundary. In the paper's design, Session B is not told that it produced the artifact, and the original prompt is included only in the SA condition (§§3.3, 4.2, pp. 3–4). The paper's hypothesis is that this removes decisions and production history that anchor the reviewer and trigger confirmation loops (§3.3, p. 3).

Verus form. Inference: maintain two inputs: the code/specification artifact and a separate requirements-aware review packet. The artifact-only review can reveal inconsistency or missing invariants; a later requirements-aware review checks whether the contract matches product intent. Neither replaces checking that all executable paths satisfy the Verus specification.

Evidence and limits. The proposed mechanism is not directly measured: the authors expect weaker sycophancy but say they do not measure it (§3.3, p. 3). SR2 and CCR also differ in review language (Korean versus English), so “even this comparison is not a clean isolation of context” (§7.2, p. 7). The artifacts and ground truth are in Korean, and the matcher’s keyword component may under-credit the English-language reviews (CCR and SA) relative to the Korean ones (SR and SR2) (§8, p. 8).

## what is established, trusted, and threatening

Established measurements concern this corpus, this model, this matcher, and this run structure. The paper reports that its version-1 statement that CCR ranked first in every run was inaccurate: CCR ranked first only in run 1 (Table 7, p. 6). SR run 3 is excluded because 92% of finding descriptions appeared verbatim in the script that wrote the files; its output cannot be confirmed as unedited model output (§6, p. 6). The remaining records are described as unverified rather than clean.

Inference: what a reader must trust, since it cannot be re-checked from the paper, is the injected-error annotations, the scoring function, the Claude Code Agent tool, and the host session’s transcription of model outputs. The result files “do not include raw model output” for any condition (§4.3, p. 4; §6, p. 6). The paper used a single model (Claude Opus 4.6) and three artifact types within one domain (Korean software-engineering material), and says other models and domains are untested (§8, p. 8). Inference: the threat to agent-written verified Rust is highest before proof checking: a fresh review can improve detection of some errors but still leaves 3.6 false negatives per artifact on average and does not show that specifications express the intended behavior. A successful Verus proof still depends on the contract and trusted external assumptions.

The paper says the cost overhead is small (§7.3, p. 7), and states: “Start a new session, paste the artifact, ask for a review. That is the entire method.” (§7.3, p. 7)

## techniques for the catalog

- cross-context review — export only an LLM artifact and inspect it in a fresh session with a standardized prompt
- context-versus-repetition control — compare same-session, repeated, subagent, and artifact-only conditions on identical artifacts
- injected-error evaluation — seed labeled defects and compute precision, recall, and F1 from score-matched findings
- information-boundary review — remove generation history and requirements to test intrinsic-quality checking
- stratified review metrics — report performance by artifact category, severity, and error type
