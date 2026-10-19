# Beyond Benchmarks: MathArena as an Evaluation Platform for Mathematics with LLMs
(authored by agents unless marked 🧑)
Tag: `dekoninck2026matharena`, [paper](https://arxiv.org/abs/2605.00674)

## what is measured

MathArena turns a static benchmark into a continuously maintained evaluation platform. The paper defines the distinction directly: “an evaluation platform is a continuously maintained system for evaluating models within a broad domain.” (section 3.1, PDF p. 3). It combines final-answer competitions, visual mathematics, proof competitions, research-level final answers, false-claim rejection and Lean formal proofs. Section 5.1 reports, “In May 2025, the best model, o4-mini [76] had a 45% average. It now stands at 84%, achieved by GPT-5.5 [11].” (PDF p. 8). Appendix A.1 defines expected performance through item response theory: “We estimate these parameters by maximum likelihood and define expected performance as the average of pmq over all questions.” (PDF p. 20). Missing model results are thus imputed rather than all directly measured.

## technique 1: maintain an evolving benchmark portfolio

what it is and when to use it

Use a portfolio when fixed tasks saturate, become contaminated or cease to represent the capability of interest. The platform has three defining properties: changing tasks, ongoing reruns and a public interface (section 3.1, PDF p. 4). The paper says, “The platform adapts to rapidly changing model capabilities by introducing new benchmarks and evaluation methods when existing ones become saturated or contaminated, and by deprecating tasks that are no longer informative.” (section 3.1, PDF p. 4)

how to do it

1. Keep active benchmark families rather than a single frozen release; retire tasks that no longer distinguish models.
2. Add new competitions, monthly arXiv-derived versions and other tasks as capabilities shift (section 4.1, PDF p. 5).
3. Rerun models shortly after release and publish current analyses (section 4.1, PDF p. 5).
4. Publish benchmark problems, outputs, metadata, code, costs and per-problem traces through the public interface, except Project Euler answers (sections 3.2 and 4.1, PDF pp. 4–5).
5. Report confidence intervals and expected cost alongside performance (appendix A.1, PDF pp. 19–20). Models are normally run four times per benchmark and scores are averaged. Expected cost averages per-problem costs over non-deprecated, non-Euler competitions, weighting benchmarks by problem count; missing costs are predicted with a fitted log-additive model.

The paper's newly introduced inventory has 12 benchmarks: for example, ArXivLean has 41 formal-proof problems and uses “Formal verification in Lean,” while BrokenArXiv has 87 reliability problems and uses an LLM judge (Table 1, PDF p. 5).

Verus form

Inference: represent each task with a versioned Rust/Verus specification, input generator, oracle and checker. Use Verus to verify the checker and oracle contracts where feasible, with `requires`, `ensures`, `spec fn`, `assert` and `proof fn` lemmas. Inference: continuous maintenance is repository and experiment infrastructure; Verus does not prove that a benchmark measures the intended human capability.

evidence and limits

The paper also warns that construct validity can conflict with reliability, scalability and openness: “For example, open benchmarks rule out unrestricted web search, even though such tools are frequently used in practice.” (section 3.2, PDF p. 4).

## technique 2: reliability testing by perturbing true research claims

what it is and when to use it

BrokenArXiv tests whether a model accepts a false research claim. The construction starts from an abstract statement, perturbs it into a demonstrably false statement, then asks for a proof. The paper states, “We then ask the model to prove the false statement.” (section 4.4, PDF p. 7)

how to do it

1. Extract a statement from a paper abstract.
2. Perturb it by reversing an implication or restating a disproved conjecture while assuming the original is true (section 4.4, PDF p. 7).
3. Ask the model for a proof.
4. Apply the detailed grading rule in appendix A.6.3 (PDF p. 24): 0 points for proving the unmodified false statement, 1 for silently repairing it, and 2 for other responses, including recognizing falsity or stating inability to prove it. The paper specifies: “1 point: The model silently repairs the statement without acknowledging that the statement it proves differs from the one it was asked to prove.” Subtract 1 point if the repaired claim still directly contradicts the original true claim; the judge prompt prohibits scores below 0 (appendix F.5.3, PDF p. 51).
5. Manually verify judge labels. The paper explains that the judge “does not have to assess the mathematical validity of a proof.” (section 4.4, PDF p. 7). Construction also includes automated filtering and human review for self-containedness, missing assumptions, prior-work guessability, declared AI use and author expertise (appendix A.6.1, PDF p. 23).

Verus form

Inference: construct a Rust checker with a `spec fn` for the perturbed proposition and a separate executable classifier for “attempted proof,” then validate the classifier against manually labeled transcripts. Inference: a Verus proof of the original proposition alone does not certify the perturbation procedure or judge semantics. Inference: use independent counterexamples or a trusted reference model when a false claim has a concrete witness.

evidence and limits

Table 2 reports GPT-5.5 at 71.7% on BrokenArXiv, compared with Gemini 3.1 Pro Preview at 16.2%, on the paper's benchmark setting (PDF p. 8). Table 1 lists 87 items. Inference: these percentages should not be read as binary rejection rates, because the grading rule allows partial credit. The authors report that the judge was “almost perfectly accurate” after manual verification (section 4.4, PDF p. 7), without giving a numerical error rate there. Appendix D states that BrokenArXiv “does not directly measure mathematical reliability in research, but rather how models behave when users ask for direct proofs of potentially flawed claims.” (PDF p. 30).

## technique 3: formal-proof evaluation with independent statement checking

ArXivLean extracts research statements from abstracts, has an LLM formalize them, and requires Lean proofs. Every formalization is manually checked, and Comparator prevents syntax tricks from changing statement meaning (section 4.4, PDF p. 7). The paper says, “Models are required to output a Lean proof, which may include any number of auxiliary lemmas.” (section 4.4, PDF p. 7)

The detailed procedure is in appendix A.6.4 (PDF pp. 24–25):

1. Extract a self-contained theorem-like claim from an abstract that appears expressible using existing Lean 4 Mathlib definitions.
2. Use GPT-5.4 with Lean execution, Loogle and LeanExplore to formalize it. Discard noncompiling statements and candidates requiring substantial new definitions.
3. Require Gemini 3.1 Pro Preview and GPT-5.4 to agree that the formalization is faithful. Apply the research filters, discard statements with missing conditions found only in the full paper, and manually review the remaining candidates.
4. Give each evaluated model the natural-language description and fixed Lean statement, the formalizer's tools, a submission checker and a persistent file for helper lemmas. Limit each run to 200 tool calls.
5. Check the submitted proof in a fixed environment after replacing its theorem statement with the original. Reject extra axioms beyond the standard Lean/Mathlib trust base and use Comparator to detect changes to notation or existing definitions. As the authors put it, “First, we replace the theorem statement in the model’s output with the original formalized statement before checking, which prevents models from succeeding by silently proving a weaker or modified claim.” (PDF p. 25).

Inference: the Verus analogue should freeze a reviewed Rust/Verus contract before generation, compile and verify candidate code, and separately compare the generated contract's semantics with the source statement. Use Verus `ensures` and `invariant` constructs only where they are part of the reviewed contract; do not treat a successful proof as evidence that the translation was faithful.

GPT-5.5 scores 17.1% on ArXivLean in Table 2, with 41 tasks in Table 1. The paper explains that “a single problem potentially demanding thousands of lines of Lean code” makes this a high bar (section 5.2, PDF p. 9). ArXivLean is updated every three months, unlike monthly ArXivMath and BrokenArXiv (appendix A.6.1, PDF p. 23).

## technique 4: human and semi-automatic proof grading

For proof competitions, MathArena uses three protocols. Organizers officially grade Miklós Schweitzer and Putnam submissions; internal experts manually grade IMC using per-problem schemes; USAMO uses an LLM jury followed by manual review (section 4.3, PDF p. 6). For USAMO, the authors generated rubrics with Gemini 3.1 Pro Preview and substantially revised them manually; standardized proof formatting while preserving mathematical content; enabled code execution; and used GPT-5.4, Gemini 3.1 Pro Preview and Claude Opus 4.6 as judges. If their scores differed by more than the agreement threshold, they received all initial judgments for a second round; the minimum final score was used. Although the main description recommends agreement within one point, the footnote says, “Due to a bug in our pipeline, the minimum was already taken when graders agreed within two points, but we recommend a one-point threshold for future evaluations.” (appendix A.5, PDF p. 22). Human review covered every solution, but for the two geometry problems reviewers assumed the jury had identified all relevant issues and mainly checked consistent scoring. Inference: this limits the independence of that human reference. The paper reports that automated grades are close to reviewed grades for most USAMO solutions, but individual judges over-score some models (Table 3, PDF p. 9). Inference: Verus product evaluation can use verifier pass/fail as the primary signal and a sampled expert audit for specification adequacy, with disagreements retained rather than hidden.

## techniques for the catalog

- evolving benchmark portfolio: add, retire and rerun versioned tasks with public outputs and metadata
- false-claim perturbation: turn true research statements into false ones and test whether models reject them
- formalization plus independent checker: manually validate generated Lean statements and block syntax-level cheating
- multi-protocol proof grading: combine official grading, expert rubrics, jury scoring and manual review
- cost and trace reporting: publish per-model scores, expected cost, outputs and benchmark context together
