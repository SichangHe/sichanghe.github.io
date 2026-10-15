# Beyond Benchmarks: MathArena as an Evaluation Platform for Mathematics with LLMs
(authored by agents unless marked 🧑)
Tag: `dekoninck2026matharena`, [paper](https://doi.org/10.48550/arXiv.2601.14290)

## what is measured

MathArena turns a static benchmark into a continuously maintained evaluation platform. The paper defines the distinction directly: “an evaluation platform is a continuously maintained system for evaluating models within a broad domain.” (section 3.1, PDF p. 4). It combines final-answer competitions, visual mathematics, proof competitions, research-level final answers, false-claim rejection and Lean formal proofs. Its purpose is measurement, not a new proof calculus. The platform's reported average performance rose from 45% a year earlier to 84%, but the denominator is the platform's aggregate benchmark set and the paper does not claim this is a formal capability probability (section 1, PDF p. 2).

## technique 1: maintain an evolving benchmark portfolio

what it is and when to use it

Use a portfolio when fixed tasks saturate, become contaminated or cease to represent the capability of interest. The platform has three defining properties: changing tasks, ongoing reruns and a public interface (section 3.1, PDF pp. 4–5). The paper says, “The platform adapts to rapidly changing model capabilities by introducing new benchmarks and evaluation methods when existing ones become saturated or contaminated, and by deprecating tasks that are no longer informative.” (section 3.1, PDF p. 4)

how to do it

1. Keep active benchmark families rather than a single frozen release; retire tasks that no longer distinguish models.
2. Add new competitions, monthly arXiv-derived versions and other tasks as capabilities shift (section 4.1, PDF p. 5).
3. Rerun models shortly after release and publish current analyses (section 4.1, PDF p. 5).
4. Publish benchmark problems, outputs, metadata, code, costs and per-problem traces through a queryable interface (sections 3.2 and 4.1, PDF pp. 5–6).
5. Track score, uncertainty and cost together rather than treating one aggregate as the whole result.

The paper's newly introduced inventory has 12 benchmark families: for example, ArXivLean has 41 formal-proof problems and uses “Formal verification in Lean,” while BrokenArXiv has 87 reliability problems and uses an LLM judge (Table 1, PDF p. 5). Inference: a VL evaluation service should version its Verus task pool, retire tasks when agents memorize them, and preserve old versions for longitudinal comparison.

Verus form

Inference: represent each task with a versioned Rust/Verus specification, input generator, oracle and checker. Use Verus to verify the checker and oracle contracts where feasible, with `requires`, `ensures`, `spec fn`, `assert` and `proof fn` lemmas. Inference: continuous maintenance is repository and experiment infrastructure; Verus does not prove that a benchmark measures the intended human capability.

evidence and limits

MathArena's platform design is supported by its live benchmark inventory and repeated evaluations. The paper also warns that construct validity can conflict with reliability, scalability and openness because unrestricted web search may be realistic but makes an open benchmark harder to compare (section 3.2, PDF p. 5). Inference: VL results should state whether network access, retrieval and repair tools are enabled, because a pass rate without that setting is not reproducible.

## technique 2: reliability testing by perturbing true research claims

what it is and when to use it

BrokenArXiv tests whether a model accepts a false research claim. The construction starts from an abstract statement, perturbs it into a demonstrably false statement, then asks for a proof. The paper states, “We then ask the model to prove the false statement.” (section 4.4, PDF p. 7)

how to do it

1. Extract a statement from a paper abstract.
2. Perturb it by reversing an implication or restating a disproved conjecture while assuming the original is true (section 4.4, PDF p. 7).
3. Ask the model for a proof.
4. Mark failure when it claims to prove the false statement; mark success when it identifies falsity or declines to prove it.
5. Use an LLM judge whose labels are manually checked; the paper says the target behavior is clear because the judge need only detect whether the model attempts the proof (section 4.4, PDF p. 7).

Verus form

Inference: construct a Rust checker with a `spec fn` for the perturbed proposition and a separate executable classifier for “attempted proof,” then validate the classifier against manually labeled transcripts. A Verus proof of the original proposition cannot certify the perturbation procedure or judge semantics. Inference: use independent counterexamples or a trusted reference model when a false claim has a concrete witness.

evidence and limits

Table 2 reports GPT-5.5 at 71.7% on BrokenArXiv, compared with Gemini 3.1 Pro Preview at 16.2%, on the paper's benchmark setting (PDF p. 8). The denominator is the 87-item BrokenArXiv inventory in Table 1, although Table 2 reports percentages without repeating every per-model count. The judge can misclassify subtle attempts, and abstract perturbations may not represent interactive research.

## technique 3: formal-proof evaluation with independent statement checking

ArXivLean extracts research statements from abstracts, has an LLM formalize them, and requires Lean proofs. Every formalization is manually checked, and Comparator prevents syntax tricks from changing statement meaning (section 4.4, PDF p. 7). The paper says, “Verification is performed using Comparator, a Lean verification tool that ensures that models cannot cheat by exploiting Lean-specific syntax to alter the meaning of the original statement.” (section 4.4, PDF p. 7)

The operational steps are: extract a statement; generate a Lean formalization; manually inspect it; run Comparator; provide Lean execution, semantic search and a persistent scratchpad; accept only a proof checked by Lean. Models may add auxiliary lemmas (section 4.4, PDF p. 7). Inference: the Verus analogue should freeze a reviewed Rust/Verus contract before generation, compile and verify candidate code, and separately compare the generated contract's semantics with the source statement. Use Verus `ensures` and `invariant` constructs only where they are part of the reviewed contract; do not treat a successful proof as evidence that the translation was faithful.

Evidence is deliberately harsh: GPT-5.5 scores 17.1% on ArXivLean in Table 2, with 41 tasks in Table 1. The paper explains that one task can require thousands of Lean lines and that the score therefore measures a very high bar (section 5.2, PDF p. 9). Inference: a VL study should report proof completion rate, contract-review failures and timeout counts separately.

## technique 4: human and semi-automatic proof grading

For proof competitions, MathArena uses three protocols. Organizers officially grade Miklós Schweitzer and Putnam submissions; internal experts manually grade IMC using per-problem schemes; USAMO uses an LLM jury followed by manual review (section 4.3, PDF p. 6). This separates scalable preliminary scoring from a human reference. The paper reports that automated grades are close to reviewed grades for most USAMO solutions, but individual judges over-score some models (Table 3, PDF p. 9). Inference: Verus product evaluation can use verifier pass/fail as the primary signal and a sampled expert audit for specification adequacy, with disagreements retained rather than hidden.

## evidence, trust and product threat

MathArena's headline numbers include GPT-5.5 at 92.3% final-answer, 94.9% visual math, 98.2% USAMO, 17.1% ArXivLean, 71.7% BrokenArXiv and 74.1% ArXivMath, with expected cost $1.26 per problem (Table 2, PDF p. 8). These denominators differ by benchmark, and missing entries mean a model was not evaluated. The paper explicitly lists missing interactive problem-solving, broader mathematical work and broader tool use as limitations (section 6, PDF p. 9). Trusted components include human-checked problem construction, formal-assistant kernels, LLM judges and manual review. Inference: the threat to agent-written verified Rust is high if VL reports only verifier success, because a benchmark can fail to detect vacuous contracts, false claims or mismatched formalizations. VL should reuse independent statement checking, adversarial false-claim tasks, cost tracking and public traces; it should not redo a broad math benchmark without a Verus-specific contract-fidelity layer.

## techniques for the catalog

- evolving benchmark portfolio: add, retire and rerun versioned tasks with public outputs and metadata
- false-claim perturbation: turn true research statements into false ones and test whether models reject them
- formalization plus independent checker: manually validate generated Lean statements and block syntax-level cheating
- multi-protocol proof grading: combine official grading, expert rubrics, jury scoring and manual review
- cost and trace reporting: publish per-model scores, expected cost, outputs and benchmark context together
Checked 2026-10-15 against paper dekoninck2026matharena: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
