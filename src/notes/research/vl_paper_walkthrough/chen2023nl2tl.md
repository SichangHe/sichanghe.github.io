# NL2TL: Transforming Natural Languages to Temporal Logics using Large Language Models
(authored by agents unless marked 🧑)
Tag: `chen2023nl2tl`, [paper](https://arxiv.org/abs/2305.07766)

## what the paper does

The paper builds a cross-domain pipeline from English instructions to signal temporal logic (STL). Its central representation hides domain-specific atomic propositions (APs), leaving the model to learn logical structure. The abstract states: “We publish a dataset with 28K NL-TL pairs.” (Abstract, PDF p. 1). It reports “During the further finetuning, our model achieves higher accuracy (>95%) using only <10% training data” (Abstract, PDF p. 1).

Inference: for VeruLaw, this is a specification-front end: English can be transformed into a lifted logical skeleton before AP names are bound to Rust state predicates. It does not prove the resulting property.

## technique 1: lifted representations

What it is: replace each concrete AP (for example, `create_Slack`) with a placeholder `prop_i`, while preserving operators and nesting. The authors explain, “Instead of taking this approach, we hide all the APs in our data during finetuning, acquiring a lifted model on lifted NL-to-TL transformation.” (Introduction, PDF p. 2). Lifted pairs are defined in Section 2.2 (PDF p. 3): “each AP is replaced with a placeholder prop_i.”

When to use: use lifting when the logical grammar should transfer across domains whose predicates differ.

How to do it:
1. Identify the APs. For the two collected datasets (Navigation, Circuit) the paper detects and hides APs “by combining hard-coded algorithms with entity recognition package SpaCy” (Section 4.1, PDF p. 5); the synthesized formulas are generated with `prop_i` placeholders from the start (Algorithm 1, PDF p. 4).
2. Use placeholders in both natural language and STL, keeping the operator tree (Section 2.2, PDF p. 3).
3. Fine-tune T5 on lifted NL-to-STL pairs (Section 4.2, PDF p. 5).
4. For deployment, either detect concrete APs with GPT-3 and substitute them back (Section 7.1, PDF p. 7), or further fine-tune on domain-specific full pairs (Section 7.2, PDF pp. 7–8).

Verus form: Inference: represent each placeholder as a `spec fn` over the program state, and write the returned logical relation as a `spec fn` or `ensures` clause. The paper's STL operators do not carry directly into Verus; temporal behavior needs an explicit state-transition model and invariants.

Evidence and limits: The paper tests on five domains (Circuit, Navigation, Office email, GLTL, CW; Section 7, PDF p. 6) and says the lifted representation “greatly enhances generalizability” (Introduction, PDF p. 2). The lifted-model plus GPT-3 AP recognition method is tested on three of them (Table 2, PDF p. 7). Inference: full correctness is limited by AP recognition and by the assumption that the chosen STL formula captures the user's intent.

## technique 2: GPT-3-assisted data generation with human correction

What it is: synthesize diverse formula/sentence pairs, then correct them. Framework 1 randomly generates pre-order STL trees, renders operators as words, prompts GPT-3 for natural language, and has annotators repair semantic mismatches (Section 4.1, PDF p. 5). Framework 2 adds an extra loop between STL and NL using GPT-3, so that, in the paper's words, the initial rule-based STL with unreasonable or complex meanings “will be automatically filtered by GPT-3 itself” (Section 4.1, PDF p. 4); Appendix C.2 describes the step “from NL-1 back into STL-2 via GPT-3” (PDF p. 5). The paper reports, “We in total create 15108 lifted NL-STL pairs combining both Framework1 and Framework2, with the whole cost of around 150 person-hours.” (Section 4.1, PDF p. 5).

How to do it:
1. Generate a random pre-order STL binary tree with at most N APs (Algorithm 1, PDF p. 4).
2. Transform the pre-order STL into an in-order expression via rules, and write operators as words of their meanings (Section 4.1, PDF p. 4).
3. Prompt GPT-3 (Davinci-003) with 20 randomly chosen NL-STL pairs from a pool of 100 volunteer-written instructions to produce a raw sentence close in meaning to the STL (Section 4.1, PDF pp. 4–5).
4. Have a human annotator modify the raw sentence to be consistent with the STL (Section 4.1, PDF p. 4; process in Appendix F).
5. In Framework 2, add the extra STL-NL loop through GPT-3 described above, which gives sentences closer to human language and with fewer errors to annotate (Section 4.1, PDF pp. 4–5). The paper does not state an explicit accept/reject rule for this loop in the main text.
6. Add 5K Navigation and 8K Circuit examples after AP detection and hiding (Section 4.1, PDF p. 5).

Verus form: Inference: generate candidate `requires`/`ensures` statements or state-machine postconditions, then compile and prove them with Verus. Human review remains necessary because a syntactically valid contract may be semantically wrong.

Evidence: Framework 2 annotators handled about 120 pairs/person-hour versus 80 for Framework 1 (Section 4.1). Ablations say annotated data improves testing accuracy by around 10% and using both frameworks instead of Framework 1 alone by around 2% (Section 6, PDF p. 6; Appendices H.1, H.2). Table 7 (Appendix H.2) gives, for annotated data, 88.32 ± 0.84% (3K F1 + 1.5K F2) versus 86.51 ± 0.77% (4.5K F1).

## technique 3: in-order STL and T5 fine-tuning

The model trains T5-base (220M) and T5-large (770M) on lifted pairs. The authors report, “We mainly apply the T5 model (Raffel et al., 2020) to serve as the base LLM for finetuning.” (Section 4.2, PDF p. 5). They evaluate pre-order and in-order encodings; Table 1 gives T5-large in-order/word accuracy 97.52 ± 0.65% and in-order/operator accuracy 88.17 ± 1.02% (Section 5, PDF p. 6; the caption says “Accuracy of GPT-3-assisted data testing”).

How to do it: train on lifted data; replace symbolic operators with words; choose in-order output when natural-language alignment helps; then fine-tune on full domain data if needed. The paper says, “We find that using the in-order format plus replacing operators with words will largely improve the performance.” (Section 5, PDF p. 6). Section 5 also says in-order is “more consistent with natural sentence expressions” and contrasts this with earlier Seq2Seq work where pre-order was better.

Verus form: Inference: use the generated formula only as a draft; translate it to Verus predicates, then require a compiling proof. Verus has no STL parser supplied by this paper.

## technique 4: AP recognition plus lifted parsing

At deployment, GPT-3 recognizes AP spans and replaces them with `prop_i`; T5 predicts lifted STL; placeholders are swapped back. Table 2 reports T5-large + GPT-3 AP detection at 95.13 ± 1.42% (Circuit), 95.03 ± 1.20% (Navigation), and 96.73 ± 1.03% (Office email), while Table 3 reports AP detection 98.84 ± 0.41%, 99.03 ± 0.53%, and 100.00 ± 0.00% respectively (Tables 2 and 3, PDF p. 7). The paper says, “Hence, dividing the whole task into AP recognition and semantic parsing are more data-efficient and flexible than pure end-to-end method.” (Section 7.1, PDF p. 7).

Inference: the decomposition could separate predicate naming from proof synthesis in VL, but AP errors can yield a perfectly proved wrong contract.

## what is proved, measured, and trusted

Measured: exact binary translation accuracy, model-size and format ablations, and cross-domain tests. Trusted: GPT-3 outputs, human annotations, AP recognizer, T5 implementation, STL semantics, and all downstream planner or verifier assumptions. No theorem proves semantic equivalence between English and STL. Inference: threat to agent-written verified Rust is medium: it can automate contract drafts, but a Verus proof only establishes the generated contract.

Earlier work to avoid repeating: the paper already supplies lifted cross-domain parsing, GPT-assisted synthesis, AP decomposition, and extensive ablations. Inference: VL should focus on connecting generated predicates to concrete Rust state and checking intent, rather than reimplementing this translation stack.

## techniques for the catalog
- lifted NL-to-logic representation — hide domain APs to train reusable logical-structure translators
- GPT-assisted formula synthesis — generate and human-correct diverse formula/sentence pairs with a back-translation filter
- in-order T5 parsing — fine-tune a pretrained text-to-text model on operator words and lifted formulas
- AP recognition decomposition — detect predicates separately, parse the lifted formula, then restore predicate names

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Finetuning on T5 model improves the accuracy by around 14.5% compared to the Seq2Seq model."): read the whole paper text start to end; checked every quotation word for word, the Table 1, 2, 3 and 7 numbers, the 15108/5K/8K/80/120/150 figures, section and PDF page references, and the technique steps against Sections 2.2, 4.1, 4.2, 5, 6, 7 and Appendices B, C, F, H; changed the link to the arXiv page from the paper text (arXiv:2305.07766), corrected page and section references (Table 1 discussion is Section 5, not Section 6), rewrote the lifting and data-generation steps (synthesized formulas start lifted; pre-order is converted to in-order before prompting; no explicit accept/reject rule for Framework 2 is stated), removed the unsupported "no denominators" remark, and marked one conclusion as Inference; did not check the figures' plotted values, the GitHub artifacts, the transfer-learning results of Section 7.2 beyond what is cited, or the Verus-related inferences (these are the study's own).
