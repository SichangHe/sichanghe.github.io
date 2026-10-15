# NL2TL: Transforming Natural Languages to Temporal Logics using Large Language Models
(authored by agents unless marked 🧑)
Tag: `chen2023nl2tl`, [paper](https://www.semanticscholar.org/paper/72a2cff51bb9a87bbe4fc41325f4a5afc82a0366)

## what the paper does

The paper builds a cross-domain pipeline from English instructions to signal temporal logic (STL). Its central representation hides domain-specific atomic propositions (APs), leaving the model to learn logical structure. The abstract states: “We publish a dataset with 28K NL-TL pairs.” (Abstract, PDF p. 1). It reports “During the further finetuning, our model achieves higher accuracy (>95%) using only <10% training data” (Abstract, PDF p. 1).

Inference: for VeruLaw, this is a specification-front end: English can be transformed into a lifted logical skeleton before AP names are bound to Rust state predicates. It does not prove the resulting property.

## technique 1: lifted representations

What it is: replace each concrete AP (for example, `create_Slack`) with a placeholder `prop_i`, while preserving operators and nesting. The authors explain, “Instead of taking this approach, we hide all the APs in our data during finetuning, acquiring a lifted model on lifted NL-to-TL transformation.” (Introduction, PDF p. 2).

When to use: use lifting when the logical grammar should transfer across domains whose predicates differ.

How to do it:
1. Parse each formula and identify AP leaves (Section 2.2, PDF p. 3).
2. Replace APs in both natural language and STL with placeholders, keeping the operator tree.
3. Fine-tune T5 on lifted NL-to-STL pairs (Section 4, PDF p. 5).
4. For deployment, either detect concrete APs and substitute them back, or fine-tune on domain-specific full pairs (Section 7, PDF pp. 8–9).

Verus form: Inference: represent each placeholder as a `spec fn` over the program state, and write the returned logical relation as a `spec fn` or `ensures` clause. The paper's STL operators do not carry directly into Verus; temporal behavior needs an explicit state-transition model and invariants.

Evidence and limits: The paper reports five-domain tests and says the lifted representation “greatly enhances generalizability” (Introduction, PDF p. 2). Full correctness is limited by AP recognition and by the assumption that the chosen STL formula captures the user's intent.

## technique 2: GPT-3-assisted data generation with human correction

What it is: synthesize diverse formula/sentence pairs, then correct them. Framework 1 randomly generates pre-order STL trees, renders operators as words, prompts GPT-3 for natural language, and has annotators repair semantic mismatches (Section 4.1, PDF p. 5). Framework 2 adds an STL→NL→STL loop so GPT-3 filters formulas it cannot explain. The paper reports, “We in total create 15108 lifted NL-STL pairs combining both Framework1 and Framework2, with the whole cost of around 150 person-hours.” (Section 4.1, PDF p. 6).

How to do it:
1. Generate a random binary operator tree with bounded AP count (Algorithm 1, PDF p. 5).
2. Render the tree in pre-order and verbalize operators (Section 4.1).
3. Prompt GPT-3 to produce a sentence with the same meaning (Section 4.1).
4. Have a human annotate or repair the sentence (Section 4.1).
5. In Framework 2, translate the sentence back to STL and retain pairs whose meaning is acceptable (Section 4.1).
6. Add 5K navigation and 8K circuit examples after AP detection and hiding (Section 4.1, PDF p. 6).

Verus form: Inference: generate candidate `requires`/`ensures` statements or state-machine postconditions, then compile and prove them with Verus. Human review remains necessary because a syntactically valid contract may be semantically wrong.

Evidence: Framework 2 annotators handled about 120 pairs/person-hour versus 80 for Framework 1 (Section 4.1). Ablation says annotated data improves testing accuracy by around 10% and Framework 2 by around 2% (Section 6, PDF p. 7). These percentages are reported without denominators in the text.

## technique 3: in-order STL and T5 fine-tuning

The model trains T5-base (220M) and T5-large (770M) on lifted pairs. The authors report, “We mainly apply the T5 model (Raffel et al., 2020) to serve as the base LLM for finetuning.” (Section 4.2, PDF p. 6). They evaluate pre-order and in-order encodings; Table 1 gives T5-large in-order/word accuracy 97.52 ± 0.65% and in-order/operator accuracy 88.17 ± 1.02% (PDF p. 7, GPT-3-assisted test; denominator is the test set used for that table, not stated in the caption).

How to do it: train on lifted data; replace symbolic operators with words; choose in-order output when natural-language alignment helps; then fine-tune on full domain data if needed. The paper says, “We find that using the in-order format plus replacing operators with words will largely improve the performance.” (Section 6, PDF p. 7)

Verus form: Inference: use the generated formula only as a draft; translate it to Verus predicates, then require a compiling proof. Verus has no STL parser supplied by this paper.

## technique 4: AP recognition plus lifted parsing

At deployment, GPT-3 recognizes AP spans and replaces them with `prop_i`; T5 predicts lifted STL; placeholders are swapped back. Table 2 reports T5-large + GPT-3 AP detection at 95.13 ± 1.42% (Circuit), 95.03 ± 1.20% (Navigation), and 96.73 ± 1.03% (Office email), while Table 3 reports AP detection 98.84 ± 0.41%, 99.03 ± 0.53%, and 100.00 ± 0.00% respectively (PDF p. 8). The paper explicitly says, “dividing the whole task into AP recognition and semantic parsing are more data-efficient and flexible than pure end-to-end method.” (Section 7.1, PDF p. 8).

Inference: the decomposition could separate predicate naming from proof synthesis in VL, but AP errors can yield a perfectly proved wrong contract.

## what is proved, measured, and trusted

Measured: exact binary translation accuracy, model-size and format ablations, and cross-domain tests. Trusted: GPT-3 outputs, human annotations, AP recognizer, T5 implementation, STL semantics, and all downstream planner or verifier assumptions. No theorem proves semantic equivalence between English and STL. Inference: threat to agent-written verified Rust is medium: it can automate contract drafts, but a Verus proof only establishes the generated contract.

Earlier work to avoid repeating: the paper already supplies lifted cross-domain parsing, GPT-assisted synthesis, AP decomposition, and extensive ablations. Inference: VL should focus on connecting generated predicates to concrete Rust state and checking intent, rather than reimplementing this translation stack.

## techniques for the catalog
- lifted NL-to-logic representation — hide domain APs to train reusable logical-structure translators
- GPT-assisted formula synthesis — generate and human-correct diverse formula/sentence pairs with a back-translation filter
- in-order T5 parsing — fine-tune a pretrained text-to-text model on operator words and lifted formulas
- AP recognition decomposition — detect predicates separately, parse the lifted formula, then restore predicate names

Checked 2026-10-15 against the paper by a Codex agent for nl2tl_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
