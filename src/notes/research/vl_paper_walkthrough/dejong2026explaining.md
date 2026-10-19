# Explaining Textual Entailment with Lexical Entailments: Using LLMs to Supply Lexical Relations for Formal Proofs
(authored by agents unless marked 🧑)
Tag: `dejong2026explaining`, [paper](http://arxiv.org/abs/2609.32491v1)

## central method
The paper inserts an LLM between natural-language inference (NLI) and the LangPro natural-logic prover. The model proposes structured lexical relations; LangPro performs the formal proof. The introduction describes the division: “LLMs generate lexical entailments—not logical formulas—to help the natural logic prover LangPro (Abzianidze, 2017a) address scarce KB resources.” In the extrinsic evaluation, LangPro decides whether a proof exists; in the intrinsic LEX-NLI task, the LLM predicts an inference label and a LEX set (Sections 5–6).

## technique 1: represent explanations as LEX sets
Inference: what it is and when to use it: represent the lexical knowledge needed for an entailment as directed relations `specific ⊑ general`, such as `guitar ⊑ musical instrument`. Use this representation when a symbolic prover has syntactic and logical rules but lacks domain vocabulary.

how to construct it:
1. Start with a premise/hypothesis pair whose label is entailment.
2. Identify word or multi-word lexical items that connect premise and hypothesis; retain multi-word expressions when a single component would be invalid or insufficient. The paper’s example says `female swimmer ⊑ woman` is acceptable while `swimmer ⊑ woman` is false.
3. Normalize expressions to lemmas and exclude determiners, auxiliaries, infinitival “to”, prepositional phrases, and relations obtained merely by dropping modifiers.
4. Record a set, possibly empty, because syntactic/compositional reasoning can suffice. The paper says, “Some entailment problems don’t require lexical entailments.”
5. Keep one to four reference LEX sets when multiple explanations are valid.

Verus form: Inference: model each relation as a ghost/spec predicate over symbols or an enum, and prove that a relation is sound for the intended Rust specification before using it in a lemma. A LEX set is evidence for a proof search branch, not an axiom: adding an unproved `specific ⊑ general` relation to Verus would be an unsound trusted assumption. Multi-word normalization and empty sets can guide lemma selection but do not replace `requires`/`ensures` proofs.

evidence: the curated test set contains 362 NLI problems; 20% of annotations contain more than one relation and 29% are empty. Four annotators achieved mean exact match 80.9% and micro-F1 84.9% after adjudication (Section 4, Table 2). These means compare each annotator’s LEX sets against the other annotators’ references, not against model predictions (Section 4, p. 5).

## technique 2: curate multi-reference structured explanations
Inference: what it is: build a gold set that accepts legitimate explanatory variation instead of forcing one wording. This is needed when several lexical decompositions explain the same inference.

steps: each of four authors initially selects 70–100 entailment problems from SICK and SNLI, targeting 20–30% empty LEX, and assigns a LEX set. Pool the problems and have two additional annotators independently annotate each one, giving three annotations per problem. Adjudicate disagreements; add a fourth variant if an acceptable explanation was absent from the originals; score each annotator against the other references. The paper observes, “These disagreements do not always indicate annotation errors, since more than one set of lexical entailments may provide an acceptable explanation for the same NLI problem.” (Section 4, p. 4)

Verus form: Inference: maintain alternative proof lemmas or disjunctive proof paths, but require each path to verify. A catalog should preserve provenance for each relation and distinguish human-curated facts from model suggestions.

## technique 3: LLM lexical-KB generation for LangPro
Inference: what it is: prompt an LLM to output only relevant lexical relations, inject them into LangPro’s KB, and let LangPro construct a tableau proof. The authors emphasize, “After receiving lexical KB from an LLM, LangPro remains solely responsible for determining whether the supplied KB is sufficient to find a proof.” (Section 5, p. 5)

steps:
1. Supply the premise/hypothesis and annotation-style instructions to the LLM.
2. Obtain the generated lexical relations as a KB for LangPro. Intrinsic scoring against reference LEX sets is a separate experiment (Section 6.1).
3. Inject the generated relations as KB entries alongside WordNet or alone.
4. Run LangPro, which converts sentences to logical forms and closes a tableau from premise plus negated hypothesis. A proof is established when every branch closes by contradiction (Section 5).
5. In one-shot mode, call once. In agentic mode, if proof fails, provide the attempted KB, tableau closure information, and outcome to a critic, then issue one revised-KB call and rerun LangPro (Section 6.2).

Verus form: Inference: use an LLM to suggest missing lemma names or candidate relations, then instantiate only lemmas whose statements are proved in Verus. Feed failed proof obligations back to the model for a revised candidate, but keep the verifier as the acceptance oracle. Treat any admitted unproved relation as a trusted assumption.

evidence: On 1,000 randomly sampled SNLI entailment problems, LangPro+WordNet proves 157. One-shot LLM plus WordNet proves 179 (Gemini 3.1 Flash-Lite), 179 (Claude Haiku 4.5), 178 (GPT-5.4 Mini), 174 (GPT-OSS-20B), and 182 (Gemma 3 4B). Agentic LLM plus WordNet yields 193, 190, 199, 212, and 182 respectively (Table 4). The denominator is the 1,000-problem SNLI sample; values are counts of proofs, not soundness rates. For Gemini 3.1 Flash-Lite, Section 8.2 (p. 9) analyzes the 15 additional problems without WordNet and 14 with WordNet, stating: “Only five of the analyzed problems contain at least one relation we judged semantically reasonable in isolation.” The remaining cases compensate for parser errors or exploit weaknesses in LangPro’s representation or proof procedure.

## technique 4: intrinsic evaluation with error decomposition
Inference: what it is: evaluate generated structured explanations separately from downstream proof coverage. Use exact match and micro-F1, plus normalization and argument-order diagnostics.

steps: run each of eight instruction-following models five times with the same nine-example prompt; score against all references and use the best match; report support (API-success percentage), raw micro-F1, lemmatized F1, argument-unordered F1, precision, recall, and exact match. Classify errors as normalization, structure (swapped arguments), or semantic. For raw scores, the paper says, “Only relations extracted from raw model responses are evaluated: no automatic post-processing was used to correct word forms or discard relations based on the vocabulary of an NLI problem.” (Section 6.1, p. 5) Lemmatized and argument-unordered scores are separate diagnostics (Section 6.1, p. 6). A non-entailment prediction does not match a gold empty LEX; API errors are excluded from evaluation (Section 7.1, p. 6).

evidence: Claude Sonnet 4.5 is best with 58.2 (±0.2)% exact match and 73.1 (±0.2) micro-F1 (mean ± sample standard deviation over five runs, 362 problems; Table 3, p. 7). Annotator mean is 80.9 exact match and 84.9 micro-F1, so the best model trails by 22.7 and 11.8 points. Models overgenerate: top-five predictions average 1.4 relations versus 1.0 in references; predicted empty sets are 15% versus 29% reference sets. Inference: high recall or proof coverage does not establish relation soundness.

## what is proved, trusted, and relevant to VL
Section 5, footnote 6 (p. 5), states: “The resulting tableau constitutes a formal proof whose individual inference steps can be inspected.” Inference: its conclusion depends on the sentence analysis, inference rules, and supplied lexical assumptions. LLM-generated relations are not guaranteed true; the paper explicitly reports semantically unsound relations helping proofs by compensating parser errors. The dataset covers entailment only; contradiction and neutral are excluded because their explanations involve negation, incompatibility, or missing information (Limitations).

Inference: VL can adopt the architecture as a proposal-and-check loop for Rust proof search: model suggests candidate lemmas, verifier checks, failure feedback triggers one revision, and metrics distinguish suggestion quality from verified proof count. Inference: VL should not count increased proof coverage as evidence of soundness without checking specifications and assumptions. Admitting unproved model relations as axioms would make their truth a trusted assumption.

## techniques for the catalog
- LEX relation encoding: express needed lexical knowledge as directed, normalized specific-to-general relations
- multi-reference curation: annotate multiple valid explanation sets and adjudicate variation
- neuro-symbolic KB injection: generate relations, run a symbolic prover, and optionally revise after proof failure
- intrinsic/extrinsic diagnostics: score explanations with EM/F1 while separately counting machine-constructed proofs
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Agentic generation improves proof coverage for all models except Gemma 3 4B, indicating that Gemma cannot successfully revise the relations produced in its initial attempt."): checked all quotations, numbers, section and page references, technique steps, and the arXiv link against the paper; corrected the introduction attribution and shortened quotation, restored independent annotation and scoring details, separated intrinsic scoring from proof assistance, and marked or removed unsupported conclusions; did not rerun experiments, inspect the code or dataset, or validate the proposed Verus adaptations.
