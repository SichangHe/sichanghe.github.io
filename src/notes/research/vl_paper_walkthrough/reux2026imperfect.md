# Imperfect Visual Verification for Code Edition : A Case Study on TikZ
(authored by agents unless marked 🧑)
Tag: `reux2026imperfect`, [paper](https://arxiv.org/abs/2606.15693)

## scope and problem
The paper studies iterative customization of TikZ programs when correctness is visual and no deterministic test decides whether an instruction was applied. It asks whether an LLM verifier can score a generated edit and give feedback that improves later edits. The authors deliberately use TikZ because its weak code structure makes feature localization difficult and small code changes can have subtle visual effects. They state: “TikZ programs define visual elements such as shapes, edges, and layouts through code, making them representative examples of programs that generate visual artifacts.” (section 2, p. 3)

The operational loop has a generator and verifier. The generator first edits code from an instruction; each iteration renders the current code, gives the original and current code/images to the verifier, and receives a score and text. The generator adjusts unless the score reaches one or five iterations have run. The paper’s formal statement is: “The verifier returns a score between 0 and 1 along with textual feedback.” (section 4.2, p. 5) Their Algorithm 1 sets `s ← 0`, `τ ← 1`, `T ← 5`, renders the initial code, calls `G.generate(c,i)`, then repeatedly renders, calls `V(i,context)`, records `(c′,r′,s)`, stops when `s ≥ τ`, and otherwise calls `G.adjust(f,s)` (section 4.2, Algorithm 1, p. 6).

## technique 1: multimodal score-and-feedback verification

What it is and when to use it. A simple LLM verifier receives either source text, images, or both. The paper evaluates Text, Visual, and Text+Visual variants; each emits a normalized score and feedback. Use this when the artifact’s semantics are visible in a rendered image and an LLM can compare the instruction, original artifact, and edited artifact.

How to do it. (1) Render the original and customized TikZ code. (2) Build a context containing the original/current images and, for text modes, original/current source. (3) Prompt the verifier with the instruction and ask for an integer 0–100 score plus feedback; divide by 100. The authors note: “For most verifiers, during prompting, we ask models to produce an integer score from 0 to 100, then divide by 100, as manual testing showed that models are more likely to assign a perfect score when the range is [0, 1] rather than [0, 100].” (section 3, p. 4) (4) Stop only at the configured threshold or feed `(feedback, score)` to the generator’s adjust operation. (5) Record every code/image/score tuple for later assessment.

Verus form. Inference: for Rust verified with Verus, use a runtime critic only to propose edits or prioritize proof work; the actual acceptance condition must be a Verus postcondition or proof. A generated function can carry `requires` and `ensures`, while a separate executable checker can return diagnostic text. A multimodal score cannot establish a Verus fact because it is outside the trusted proof kernel. The paper’s “score between 0 and 1” therefore corresponds to a heuristic ranking signal, not a proof obligation.

Evidence and limits. The dataset had 100 TikZ customizations, 20 generator–verifier pairs, three repeated runs per customization, and up to five refinement iterations. Eight annotators rated individual steps from 1 (“Not applied at all”) to 5 (“Perfectly applied”). Deduplication covered 3,907 distinct items and 15,345 generated instances; the table reports 4,289 distinct annotated items and 17,100 annotations, with Krippendorff’s alpha 0.898 (section 4.3, Table 1, p. 6). Human score 5 was treated as positive and all others negative. On the best thresholds, Gemini as verifier and generator obtained F1 0.801 (Text, precision .683, recall .967), .815 (Text+Visual, .712/.952), and .791 (Visual, .762/.822); Gemini verifier with Qwen generator obtained F1 .680, .765, and .778 respectively (section 5.1, Table 2, p. 7). Agentic Vision reached F1 .814 with Gemini and .669 with Qwen over the same 100-customization evaluation (Table 3). The authors conclude: “Among the evaluated approaches, only Gemini-3-Flash is reliable at detecting whether a customization has been applied, achieving F1-scores up to 0.815.” (section 5.1, p. 8)

The failure is false acceptance: high recall but limited precision can terminate a loop before a correct edit. Correlation with human judgments varied from .172 to .765 depending on verifier and generator (Table 4); stronger generators made outputs harder to discriminate. The study evaluates only TikZ, two models, and five steps, so generalization is untested.

## technique 2: property decomposition and executable visual oracles

What it is and when to use it. PropertyVerifier first converts an instruction into independently checkable properties, then asks a model to score each property and averages the scores. Segmentation-and-tool verification instead asks an LLM to generate Python that calls a catalog of visual oracles. The catalog includes spatial relations (placement, position, alignment, mirrored), attributes (color, size, shape), containment and quantity (within, present, count), rotation, and `visual_property` (section 3.4, p. 5).

How to do it. For decomposition: (1) give the instruction and original image to generate a property list; (2) evaluate each property in a fresh context against the customized image; (3) average per-property scores. For executable oracles: (1) prompt the model with a precise specification and available oracle functions; (2) execute the generated verifier function on the customized image; (3) combine oracle probabilities with Boolean operators. The paper’s example is:

```
def test_valid_customization() -> bool:
    return color("circle", "blue")
        and size("circle", (2, 1))
```

Each oracle emits a probability. Combined feedback is reported only when the combined probability exceeds 0.9 (section 3.4.1–3.4.2, p. 5). The authors explicitly warn that “completeness for an oracle catalog is difficult to achieve, and there is a risk of not covering every possible use case.” (section 3.4.3, p. 5)

Verus form. Inference: property decomposition maps naturally to separate `ensures` clauses or helper lemmas, but visual oracle probabilities do not. A Rust implementation could expose deterministic predicates over a typed model (for example, `color(circle) == Blue`) and prove conjunctions with `assert` or lemmas. Generated Python remains an untrusted external measurement; only a Verus proof over the program state can justify acceptance.

Evidence and limits. VisualPropertyVerifier’s best F1 was .775 (precision .645, recall .970) for Gemini/Gemini and .578 (.484/.715) for Gemini/Qwen; it reduced uniformly maximal scores but decreased precision and recall relative to simpler variants (Table 2). Segmentation-tool reached F1 .751 (precision .601, recall 1.000) with Gemini and .587 (.609/.568) with Qwen (Table 3). Added decomposition and code generation therefore did not systematically improve detection. The catalog’s coverage assumption and model-generated code are trusted operationally but not formally verified.

## technique 3: evaluate feedback inside the refinement trajectory

What it is and when to use it. The paper separates decision quality (accept/reject) from guidance quality (whether feedback causes a better next edit) and evaluates both inside the loop. This is essential when a verifier can score well yet give unusable directions.

How to do it. (1) Sample trajectory tuples of initial customization, feedback, and refined customization. (2) Label initial quality, feedback correctness, and next-step quality (Worse, Unchanged, Better). (3) Characterize feedback by precision, guidance, completeness, and forgetfulness. (4) Record generator actions such as rightly guided, partially applied, neglected, or wrongly guided. The manual analysis used 138 randomly sampled tuples and stopped sampling when no new trajectory patterns appeared (section 5.3, p. 9). Correct but imprecise, non-guiding, incomplete, or forgetful feedback caused stagnation or degradation; incorrect feedback came mainly from visual hallucinations and instruction misunderstandings. Perfect customization occurred only when feedback was “guiding, not forgetful, Precise, and Complete.” (section 5.3, p. 10)

Verus form. Inference: treat feedback as a proof-debugging hint, then require a subsequent compile-and-prove step. A useful verifier report should identify the failing invariant or postcondition and a concrete state change; it must not be accepted as evidence by itself. Preserve checks should cover both the requested change and absence of unintended side effects, matching the paper’s recommendation to assess “the requested change and preservation.” (section 6.1, p. 11)

Evidence and limits. For Qwen generators, Gemini feedback added 16–17 perfect customizations in some settings and 33–36 perfect customizations relative to the Qwen/Qwen baseline across the 100 customizations (section 5.2, p. 8). For Gemini generators, initial performance was about 75 correct customizations versus 20–24 for Qwen, so coarse feedback could degrade results and PreciseVerifier’s early stopping was best, reaching 85 perfect customizations at step 4 (section 5.2, p. 8). These counts are per 100 TikZ tasks, not percentages of arbitrary programs. The five-step cap and constrained feedback format limit conclusions.

## what is proved, measured, and trusted

The paper measures agreement with human ratings, F1, precision, recall, Kendall correlation, and changes in perfect-customization counts. It proves no semantic property of TikZ code. Trusted components include rendered-image execution, model judgments, prompt formats, the manually corrected VTikZ instructions, and annotator ratings.

## techniques for the catalog

- multimodal score-and-feedback loop — render original/current artifacts, score instruction compliance, return feedback, and iterate with a conservative stopping threshold

- property decomposition — turn a high-level requirement into independently scored properties and aggregate their scores

- executable oracle catalog — generate code that composes typed visual checks, execute it, and emit feedback only above a probability threshold

- trajectory feedback evaluation — label correctness, precision, guidance, completeness, and forgetfulness of feedback inside multi-step refinement
