# Formal Specifications from Natural Language
(authored by agents unless marked 🧑)
Tag: `hahn2022formal`, [paper](https://doi.org/10.48550/arxiv.2206.01962)

## aim and boundary

Hahn et al. study whether a pretrained language model can translate English into formal specifications and generalize to vocabulary not seen during fine tuning. They use regular expressions, first-order logic (FOL), and linear-time temporal logic (LTL). The paper's motivation is that formal languages have unambiguous semantics but require domain expertise; it states, “Our experiments show that the fine-tuned LM achieves competitive performance on all tasks and even improves state-of-the-art performance in translating natural language to regex by 6 percentage points.” (section 1, p.2). The model is a translator, not a verifier: a generated formula is accepted by syntactic or semantic comparison, and the paper does not prove that every generated formula captures the user's intended requirement.

Inference: for Verus, this technique could propose `requires`, `ensures`, loop invariants, or predicates from English requirements, but every proposal needs parsing, review, and verification in Verus. A model's string match or semantic equivalence score is evidence about translation, not a proof of Rust behavior.

## technique: construct paired formal-specification datasets

Use this when training a model to translate requirements into a target formal language. The paper builds six datasets, two per domain (section 3, p.4): existing Regex-synthetic and Regex-turk; new FOL-mnli and FOL-codesc; and new LTL-pattern and LTL-synthesis.

For regex-synthetic, retain a manually crafted grammar and pair generated English with regex. Regex-turk adds crowdsourced paraphrases. The paper gives examples such as “lines with a number or the string ‘dog’, zero or more times” paired with a regex (section 3.1, p.4). For FOL, run the candc wide-coverage Combinatory Categorial Grammar parser and boxer semantic parser, which emits a first-order representation. Build FOL-mnli from natural-language hypotheses in GLUE/MNLI and FOL-codesc by taking first-sentence descriptions from a 4.2 million point Java-code dataset and translating them with candc-boxer (section 3.2, pp.4–5).

For LTL-pattern, instantiate literature specification patterns, conjoin up to four patterns and their translations, and generate English with the associated grammar. For LTL-synthesis, use a grammar structurally matching LTL syntax and pair its translations with hardware-synthesis specifications; each such specification has environment assumptions and system guarantees combined by implication (section 3.3, pp.5–6). The grammar limits negation to directly precede atomic propositions because English verb conjugation differs between positive and negative forms (p.5).

Step-by-step application is therefore: choose a target grammar and semantics; generate or collect formal formulas; produce natural-language descriptions with a parser, template, or crowd paraphrase; retain the exact pair; split into train, validation, and test; and separately create out-of-distribution splits for new variable names, nouns, operator descriptions, or domains. Inference: a Verus dataset should pair requirement sentences with reviewed Rust/Verus specifications and include executable checks that compile and verify each target. Synthetic pairs should be supplemented with real requirements because the paper itself says many datasets are purely synthetic (section 5, p.9).

## technique: fine-tune an off-the-shelf sequence-to-sequence model

Use this when a pretrained language model may already know linguistic synonyms and symbol conventions. The authors fine-tune the 220-million-parameter base T5 on an NVIDIA DGX A100 for about one hour per run, with learning rate 0.001, PyTorch, and Hugging Face Transformers (section 4, p.6). They split each dataset into 90% training, 5% validation, and 5% test, and prompt the model with `translate natural language to {FOL | LTL | a regular expression}:` (section 4, p.6). Baseline experiments use the small untrained T5 because training was more stable.

The application procedure is: tokenize paired English and formal strings; fine-tune T5 with the domain prompt; select the best validation run; decode a formal string; and score it against the held-out target. For regex, use semantic equivalence rather than exact string identity because multiple regexes can denote the same language. The paper's example has two different but equivalent forms for “lines starting with a character followed by a vowel, 7 or more times” (section 4.1, p.6).

Inference: a Verus implementation should decode into a restricted specification grammar, reject malformed syntax before invoking Verus, and compile the candidate in a temporary crate. The final acceptance test should be Verus verification of the Rust behavior under the candidate specification. T5's text loss and sequence accuracy cannot replace that check.

## technique: semantic scoring and generalization tests

Use semantic scoring when a target language has many equivalent spellings. The paper evaluates regex with an equivalence check called semantic accuracy. On held-out tests, Regex-synthetic reaches 94.01% semantic accuracy and Regex-turk 64.20%; the corresponding baseline and fine-tuned sequence numbers are in Table 1 (section 4.1, p.6). The denominator is each dataset's held-out test set, but the paper does not state its item count in the table; therefore these percentages must not be treated as a count of all generated pairs.

For controlled generalization, remove nouns from training and test on nouns that occurred in pretraining. When fine-tuning on only four nouns, the model “generalizes seamlessly to 16 nouns” (section 4.1, p.6), while the baseline trained from scratch generalizes less well. For LTL, replace all variables with random letters and test new operator descriptions supplied by uninvolved experts. The LTL-pattern model reached 95.00% on held-out random-variable instances (section 4.3, p.9). A model trained with one description per operator achieved 53% on instances generated with an enriched description grammar (p.9).

Cross-domain testing exposes distribution shift. A model trained on Regex-synthetic reached 49.20% semantic accuracy on Regex-turk; the reverse direction reached 83.83% (section 4.1, pp.6–7). For FOL, training on FOL-mnli and testing on FOL-codesc yielded 31.25%, while the reverse direction yielded 10.55%; a baseline scored 19.92% and 0% in the same directions (section 4.2, p.8). For LTL, LTL-pattern to LTL-synthesis achieved 3.12%, while the reverse achieved 37.11%; the baseline scored 0% and 7.81% (section 4.3, p.9). These denominators are the respective held-out cross-domain test sets, not the training sets.

Inference: a Verus system should measure exact parse rate, successful compilation, successful verification, and semantic/property tests separately. Cross-domain and synonym splits are necessary to detect memorization, but they do not establish soundness.

## reported results and limits

Table 1 reports per-sequence held-out accuracy: Regex-synthetic 94.01% for fine-tuned T5, Regex-turk 64.20%, FOL-mnli 53.91%, FOL-codesc 58.98%, LTL-pattern 100.00%, and LTL-synthesis 87.90% (section 4, p.6). The table's FOL-mnli previous state-of-the-art is 56.10% estimated semantic accuracy on another 138K dataset, so the authors compare their 53.91% syntactic score cautiously. They note that the prior dataset and code were unavailable, preventing a direct semantic comparison (section 4.2, p.7).

LTL-synthesis failures are generally long instances that exceed the model's input limit (section 4.3, p.8). The paper's limitations are a GPU memory requirement, a focus on T5 rather than decoder-only models, synthetic data, and incomplete comparisons caused by unavailable datasets (section 5, p.9). It explicitly leaves theorem proving, SAT, and SMT translation out of scope (p.9), so a direct Verus-specification result is an inference rather than a paper result.

What is measured is translation accuracy under fixed datasets, prompts, splits, and model settings. What stays trusted is the dataset's formal labels, the parser or grammar that produced them, the semantic-equivalence checker for regex, the model implementation, and the assumption that a reference formula captures the intended requirement. Inference: the main risk to agent-written verified Rust is at the specification boundary: a syntactically valid but semantically wrong requirement can still be proved perfectly. The paper's evidence supports using language models for candidate generation and synonym handling, followed by executable Verus checks and human review. VL should reuse dataset generation, semantic scoring, and OOD tests rather than treat text-generation accuracy as verification.

## techniques for the catalog

- paired dataset construction — generate English/formal pairs with parsers, grammars, templates, or human paraphrases and hold out controlled OOD splits
- pretrained translation fine tuning — prompt and fine-tune T5 on target formal strings, then decode candidates
- semantic equivalence scoring — evaluate regex predictions by denoted-language equivalence when exact strings are non-unique
- specification generalization tests — replace nouns, variables, operators, and domains to distinguish learned semantics from memorization
- verification-aware acceptance — inference: parse generated Verus specifications, compile them, and require successful behavior proofs before use
Checked 2026-10-15 against paper hahn2022formal: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
