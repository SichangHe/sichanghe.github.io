# IsarStep: a Benchmark for High-level Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `li2021isarstep`, [paper](https://arxiv.org/abs/2006.09265)

## scope and contribution

IsarStep mines human-written Isabelle/HOL proofs and asks a model to generate a missing intermediate proposition. The abstract defines the task: "In our defined task, a model is required to fill in a missing intermediate proposition given surrounding proofs." (Abstract, PDF p. 1). It is intended as a benchmark for reasoning rather than a complete prover. The source corpus combines 143K Archive of Formal Proofs lemmas with the Isabelle/HOL standard library to produce 204K formally proved lemmas (Section 1, PDF p. 2).

## technique 1: formulate intermediate proposition synthesis

Each example contains five parts (Section 2, PDF p. 3): F.1, the target proposition to synthesize; F.2, local propositions used to derive it; F.3, a proposition derived from F.1; F.4, other local propositions and library lemmas used for F.3; and optional F.5, library lemmas used to justify F.1. The model predicts F.1 from F.2–F.4, optionally receiving F.5. The paper says: "We want to synthesise F.1 given F.2 – F.4 with F.5 optional: the named lemmas in F.5 are common knowledge and can be used as additional hints." (Section 2, PDF p. 3).

The irrationality-of-square-root-two example makes the bridge explicit: from `2b² = a²`, propose `a is even`, then derive `∃c. a = 2c` (Sections 1–2, PDF pp. 1–3). Isabelle's Sledgehammer can find library lemmas such as `even_mult_iff` to justify a step (Section 2, PDF p. 3).

Inference: In Verus, construct training examples from a goal, available facts, a desired downstream fact, and optional relevant lemmas. Ask the model for an intermediate assertion, then invoke Verus on both implications: context implies candidate, and candidate plus context implies the downstream goal. A candidate that is merely plausible or copied from context is not useful.

## technique 2: encode formal propositions as token sequences

Isabelle/HOL terms are simply typed lambda calculus terms. The dataset encodes terms as token sequences containing `CONST`, `FREE`, `VAR`, `BOUND`, `ABS`, and `$` for application, with parentheses preserving tree structure (Section 3.1, PDF pp. 3–4). Types are omitted because Isabelle infers them, reducing vocabulary. Free variables are normalized to generated names such as `<X0>`; the paper reports that this reduces vocabulary by one third while preserving semantics (Section 3.2, PDF p. 4).

Of 1.2M mined data points, preprocessing removes examples whose concatenated source propositions (F.2–F.4) are longer than 800 or whose target (F.1) is longer than 200, leaving approximately 860K; 10K are sampled for validation and test. After de-duplication, removal of held-out targets, and theorem-level separation, the final split is 820K training, 5,000 validation, and 5,000 test examples with a 29,759-token vocabulary (Section 3.3, PDF p. 4). The authors explicitly state: "The normalisation preserves the semantics, and we can always parse a normalised term back under a proper context." (Section 3.2, PDF p. 4).

Inference: Verus preprocessing can alpha-normalize local variables and preserve Rust/Verus syntax tokens, but it must retain type and trait information that Verus needs for checking. The split should exclude examples from the same theorem or contract family to avoid leakage.

## technique 3: compare flat and hierarchical sequence models

The baseline concatenates categorized propositions with a separator token and feeds the result to a seq2seq model. The hierarchical transformer (HAT) uses local transformer layers to model tokens within each proposition and global layers to model correlations across propositions; token, position, and category embeddings are summed (Section 4, PDF pp. 4–5). The output is selected by maximizing `p(y | X, C)` (Equation 1, Section 4, PDF p. 4).

The task is evaluated with top-1 and top-10 exact match and BLEU. Seq2seq models achieve roughly 13–25% top-1 and 26–38% top-10 accuracy; HAT is best among the tested models (Section 5.2, PDF p. 6). Top-1 exact match in Table 1 (PDF p. 5) is RNNSearch 13.0, Transformer 20.4, HAT 22.8 without F.5, and 16.7, 22.1, 24.3 with F.5; adding the optional F.5 lemmas "indeed leads to further improvement" (Section 5.2, PDF p. 6). Position is encoded separately within each source proposition, not across the concatenation (Section 4, PDF p. 5). Removing category embeddings drops HAT accuracy from 22.8% to 14.6% (Section 5.2, PDF p. 6).

Inference: A Verus model should encode proposition roles such as precondition, invariant, current goal, and downstream goal. HAT's role-aware hierarchy is more suitable than flattening all facts into one sequence when proofs have long contexts.

## technique 4: validate alternative propositions with automated theorem provers

Exact match undervalues propositions that differ syntactically but are logically valid. The paper defines an alternative valid proposition P as one that is a well-formed proposition that does not match the ground truth at the surface form, does not match any substring of the source, and satisfies both F.2 ⇒ P and P ⇒ F.3 proved automatically by ATPs (Section 5.2, PDF p. 6). It says: "Note that this will only give us a lower bound to the number of alternative propositions, due to the limitation of ATPs’ automation." (Section 5.2, PDF p. 6).

Table 2 (PDF p. 6) gives the percentage of correct propositions, meaning ground-truth matches plus ATP-validated alternatives: Transformer 25.2% (base) and 26.8% (+F.5), HAT 27.6% and 29.4%. The paper says "alternative propositions contribute 5 percentage point more correct propositions, compared to top-1 accuracy in Table 1". In approximately 3,000 test cases where ATPs could not directly prove F.2 ⇒ F.3, 61 became provable after inserting an HAT-generated proposition P and proving F.2 ⇒ P and P ⇒ F.3 (Section 5.2, PDF p. 6). The authors call this "not a big improvement"; Appendix C (PDF pp. 12–13) reports 466 exact-match examples with a small gap, 61 with a "just right" gap and 598 with a large gap.

Inference: Verus can use the same two-obligation criterion with `assert` or lemma candidates. The verifier becomes the soundness oracle, while exact text is only a convenience metric. Failure to prove a candidate may indicate missing lemmas or solver limits rather than falsity, so report both proof success and search failure.

## technique 5: analyze learned reasoning rather than only scores

The authors inspect token embeddings with principal component analysis and nearest neighbors in cosine space. Related concepts such as Borel measurability and measure-theory terms cluster together (Section 6, PDF p. 7). Attention visualization shows relevant tokens attending to each other in the last layer of the transformer encoder for an example with F.3 `x70 ∈ x39` and F.4 `x57 ⊆ x39`, where the model proposes `x70 ∈ x57` (Section 6, PDF pp. 7–8, Fig. 5). Swapping x57 and x39 in F.4 changes the output to `x70 ∈ x39`. The paper also reports that incorrect propositions "are usually a copy of parts of the source propositions" (Section 6, PDF pp. 7–8). They also identify multi-step reasoning, such as combining span-dimension and antisymmetry lemmas (Section 6, PDF p. 7).

## what is proved, measured, and trusted

The paper states that the AFP "is checked by the Isabelle proof assistant" (Section 1, PDF p. 2). The neural models are measured by exact proposition match (top-1, top-10), BLEU, and ATP-validated alternatives (Sledgehammer, 30s timeout; Appendix C, PDF p. 12). ATP failure gives only a lower bound on alternatives (Section 5.2). Inference: the benchmark does not show that every generated proposition is useful, and its trusted components include Isabelle's kernel, the parser/normalizer, the ATPs, dataset filtering, and the model implementation.

Inference: A Verus adaptation should list the Verus verifier, Rust compiler, libraries, and any external-body specifications as trusted components. Dataset-level correctness does not transfer automatically across proof assistants.

## threat to a product of agent-written verified Rust

Inference: The threat is moderate for proof-search quality: a model can suggest useful intermediate facts, especially when proposition roles and relevant lemmas are supplied. Soundness risk remains low if Verus checks every generated assertion and lemma. The main failure mode is a plausible but irrelevant or overstrong intermediate proposition that wastes search or encodes an unintended contract; exact-match scores do not expose that risk.

## techniques for the catalog

- intermediate proposition synthesis: generate a bridge fact from upstream facts and a downstream proposition
- role-aware formal encoding: encode proof terms with syntax tokens, normalized variables, and proposition categories
- hierarchical transformer: model token relations locally and proposition relations globally
- theorem-prover validation: accept alternatives only when both upstream-to-candidate and candidate-to-goal implications are proved
- leakage-resistant split: remove duplicate targets and examples from the same theorem as held-out data
- reasoning diagnostics: inspect embeddings, attention, and multi-step examples alongside proof success
