# Explaining Textual Entailment with Lexical Entailments: Using LLMs to Supply Lexical Relations for Formal Proofs
(authored by agents unless marked 🧑)
Tag: `dejong2026explaining`, [paper](http://arxiv.org/abs/2609.32491v1)

## central method
The paper inserts an LLM between natural-language inference (NLI) and the LangPro natural-logic prover. The model proposes structured lexical relations; LangPro performs the formal proof. The abstract describes the division: “LLMs generate lexical entailments—not logical formulas—to help the natural logic prover LangPro (Abzianidze, 2017a) address scarce KB resources.” The goal is explainability and proof assistance, not letting an LLM decide entailment.

## technique 1: represent explanations as LEX sets
Inference: what it is and when to use it: represent the lexical knowledge needed for an entailment as directed relations `specific ⊑ general`, such as `guitar ⊑ musical instrument`. Use this representation when a symbolic prover has syntactic and logical rules but lacks domain vocabulary.

how to construct it:
1. Start with a premise/hypothesis pair whose label is entailment.
2. Identify word or multi-word lexical items that connect premise and hypothesis; retain multi-word expressions when a single component would be invalid or insufficient. The paper’s example says `female swimmer ⊑ woman` is acceptable while `swimmer ⊑ woman` is false.
3. Normalize expressions to lemmas and exclude determiners, auxiliaries, infinitival “to”, prepositional phrases, and relations obtained merely by dropping modifiers.
4. Record a set, possibly empty, because syntactic/compositional reasoning can suffice. The paper says, “Some entailment problems don’t require lexical entailments.”
5. Keep one to four reference LEX sets when multiple explanations are valid.

Verus form: Inference: model each relation as a ghost/spec predicate over symbols or an enum, and prove that a relation is sound for the intended Rust specification before using it in a lemma. A LEX set is evidence for a proof search branch, not an axiom: adding an unproved `specific ⊑ general` relation to Verus would be an unsound trusted assumption. Multi-word normalization and empty sets can guide lemma selection but do not replace `requires`/`ensures` proofs.

evidence: the curated test set contains 362 NLI problems; 20% of annotations contain more than one relation and 29% are empty. Four annotators achieved mean exact match 80.9% and micro-F1 84.9% after adjudication (Section 4, Table 2). These denominators are annotation comparisons, not model correctness.

## technique 2: curate multi-reference structured explanations
Inference: what it is: build a gold set that accepts legitimate explanatory variation instead of forcing one wording. This is needed when several lexical decompositions explain the same inference.

steps: each of four authors selects 70–100 entailment problems from SICK and SNLI; target 20–30% empty LEX; assign a LEX set; adjudicate disagreements; add a fourth variant if an acceptable explanation was absent from the originals; score each annotator against the other references. The paper observes, “These disagreements do not always indicate annotation errors, since more than one set of lexical entailments may provide an acceptable explanation for the same NLI problem.” (Section 4, p. 4)

Verus form: Inference: maintain alternative proof lemmas or disjunctive proof paths, but require each path to verify. A catalog should preserve provenance for each relation and distinguish human-curated facts from model suggestions.

## technique 3: LLM lexical-KB generation for LangPro
Inference: what it is: prompt an LLM to output only relevant lexical relations, inject them into LangPro’s KB, and let LangPro construct a tableau proof. The authors emphasize, “After receiving lexical KB from an LLM, LangPro remains solely responsible for determining whether the supplied KB is sufficient to find a proof.” (Section 5, p. 5)

steps:
1. Supply the premise/hypothesis and annotation-style instructions to the LLM.
2. Parse raw relations without automatic correction; evaluate exact match and micro-F1 against all reference LEX sets, selecting the best match.
3. Inject the generated relations as KB entries alongside WordNet or alone.
4. Run LangPro, which converts sentences to logical forms and closes a tableau from premise plus negated hypothesis. A proof is established when every branch closes by contradiction (Section 5).
5. In one-shot mode, call once. In agentic mode, if proof fails, provide the attempted KB, tableau closure information, and outcome to a critic, then issue one revised-KB call and rerun LangPro (Section 6.2).

Verus form: Inference: use an LLM to suggest missing lemma names or candidate relations, then instantiate only lemmas whose statements are proved in Verus. Feed failed proof obligations back to the model for a revised candidate, but keep the verifier as the acceptance oracle. A successful proof after an unsound relation would indicate a specification bug, so relation provenance and assumptions must be logged.

evidence: On 1,000 randomly sampled SNLI entailment problems, LangPro+WordNet proves 157. One-shot LLM plus WordNet proves 179 (Gemini 3.1 Flash-Lite), 179 (Claude Haiku 4.5), 178 (GPT-5.4 Mini), 174 (GPT-OSS-20B), and 182 (Gemma 3 4B). Agentic LLM plus WordNet yields 193, 190, 199, 212, and 182 respectively (Table 4). The denominator is the 1,000-problem SNLI sample; values are counts of proofs, not soundness rates. The paper manually analyzed extra agentic proofs for Gemini and found only five of 15/14 additional problems had at least one semantically reasonable added relation; others exploited parser or prover weaknesses.

## technique 4: intrinsic evaluation with error decomposition
Inference: what it is: evaluate generated structured explanations separately from downstream proof coverage. Use exact match and micro-F1, plus normalization and argument-order diagnostics.

steps: run each of eight instruction-following models five times with the same prompt; score against all references; report support (API-success percentage), raw micro-F1, lemmatized F1, argument-unordered F1, precision, recall, and exact match. Classify errors as normalization, structure (swapped arguments), or semantic. Do not post-process outputs; the paper says, “Only relations extracted from raw model responses are evaluated: no automatic post-processing was used.” (Section 6.1)

evidence: Claude Sonnet 4.5 is best with 58.2% exact match and 73.1 micro-F1 (mean ± sample standard deviation over five runs, 362 problems). Annotator mean is 80.9 exact match and 84.9 micro-F1, so the best model trails by 22.7 and 11.8 points. Models overgenerate: top-five predictions average 1.4 relations versus 1.0 in references; predicted empty sets are 15% versus 29% reference sets. Inference: high recall or proof coverage does not establish relation soundness.

## what is proved, trusted, and relevant to VL
LangPro’s individual tableau steps are inspectable formal proofs, but only relative to its parser, inference rules, and lexical KB. LLM-generated relations are not guaranteed true; the paper explicitly reports semantically unsound relations helping proofs by compensating parser errors. The dataset covers entailment only; contradiction and neutral are excluded because their explanations involve negation, incompatibility, or missing information (Limitations).

Inference: VL can adopt the architecture as a proposal-and-check loop for Rust proof search: model suggests candidate lemmas, verifier checks, failure feedback triggers one revision, and metrics distinguish suggestion quality from verified proof count. Existing work already demonstrates that symbolic checking can expose unsound model knowledge; VL should not count increased proof coverage as evidence of soundness without checking specifications and assumptions. Threat to agent-written verified Rust is moderate: model suggestions can accelerate lemma discovery, but unsound “lexical” assumptions map directly to unsound axioms if admitted into a Verus proof.

## techniques for the catalog
- LEX relation encoding: express needed lexical knowledge as directed, normalized specific-to-general relations
- multi-reference curation: annotate multiple valid explanation sets and adjudicate variation
- neuro-symbolic KB injection: generate relations, run a symbolic prover, and optionally revise after proof failure
- intrinsic/extrinsic diagnostics: score explanations with EM/F1 while separately counting machine-constructed proofs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
