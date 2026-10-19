# Natural Language to First-Order Logic LLM-based Autoformalization
(authored by agents unless marked 🧑)
Tag: `brunello2026autoformalization`, [paper](https://arxiv.org/abs/2610.12030v1)

## task definition and evidence boundary

This paper is a survey and task-definition paper, not a new model evaluation. It distinguishes Ontology Extraction (OE) from Logical Translation (LT), while noting that this is not the only possible decomposition (Section 2.4, pp. 3–4). The output is not merely a formula φ: it is φ together with an ontology Ω=⟨σ,L,T⟩ consisting of a signature, symbol labelling, and background theory (Section 2, pp. 2–4). The authors state, “The richer the specification of Ω, the more verifiable the output φ becomes.” (Section 2.4, p. 3)

The task takes natural-language text p and optional knowledge K and produces ⟨φ,Ω⟩, with Ω components possibly implicit (Definition 1, p. 3). Raw translation leaves symbol meanings and theory underspecified; LT assumes an ontology and outputs φ; OE constructs the ontology needed for LT (Section 2.4, pp. 3–4). The paper surveys datasets, metrics, fine-tuning, prompting, and verification-based refinement. The authors state, “This survey does not provide a comparative empirical analysis across enhancement strategies or across LLMs.” (Limitations, p. 9) They attribute unreliable cross-paper comparisons to nonstandard evaluation protocols and annotation noise (Section 4.3, discussion, p. 9).

## technique 1: make ontology explicit before translating

What it is. A signature fixes constants, functions, and predicates; labelling maps symbols to intended natural-language meanings; theory supplies axioms and domain assumptions. The same sentence can have multiple valid formulas with different ontological commitments (Sections 2.1–2.3, pp. 2–3).

When to use it. The paper motivates LT for an existing domain ontology and multi-sentence corpora requiring consistent predicate use; OE builds a reusable ontology when one is needed (Section 2.4, pp. 3–4). Inference: use explicit meanings and background axioms when reviewing generated specifications.

How to apply it.
1. Extract the relevant vocabulary and arities into σ (Section 2.2, p. 2).
2. Assign each symbol an intended meaning L(s), rather than relying on suggestive names (Section 2.1, p. 2).
3. Add background axioms T for taxonomic or domain constraints when needed (Section 2.2, p. 2).
4. Select a formula whose quantifier and relation structure expresses the sentence under Ω (Sections 2.3–2.4, pp. 2–3).
5. For LT, provide Ω as input and translate p into a formula over the fixed signature; for OE, construct Ω from context before LT (Section 2.4, pp. 3–4).

Verus form. Inference: document the meanings of predicates and the background assumptions before generating Rust contracts. Require each generated predicate to have an explicit meaning; symbol names alone do not supply one. The paper does not evaluate Verus.

Evidence and limits. Figure 1 gives “Every student passed some exam.” with three formulas that differ in whether exams, passing, or grades are represented (p. 4). The survey states, “In practice, no existing work explicitly evaluates signature quality, even when the OE/LT decomposition is acknowledged” (Section 3, p. 4). Inference: ontology quality is therefore an unmeasured source of error in the surveyed evaluations.

## technique 2: use formal and semantic evaluation separately

What it is. The paper distinguishes syntactic metrics (exact match, tree edit distance, BLEU, LogicSim) from semantic metrics (logical equivalence and LE score), and recommends giving the labelled signature as input and using logical equivalence when direct semantic comparison is required (Section 3.2, pp. 6–7).

How the paper applies it.
1. Check that the formula is syntactically well formed (Section 3.2.1, p. 6).
2. Resolve predicate-symbol matching; direct matching is avoided by supplying the labelled signature in LT (Section 3.2.2, p. 6).
3. Use logical equivalence φ≡φ̂ for direct semantic comparison under the supplied labelled signature (Section 3.2, recommendation, p. 7); the metric is binary (Section 3.2.2, p. 6).
4. For proxy evaluation, formalize premises and conclusions and test whether FOL entailment matches natural-language entailment; inspect limitations because agreement can arise from incorrect formulas (Section 3, pp. 4–5).

Verus form. Inference: treat syntax checking as a parser/type checker before verification, then compare the generated spec to a reference by proving equivalence. Inference: a Verus proof of a formula only establishes the formula's semantics under the supplied predicates; it cannot establish that those predicates match the natural-language requirement.

Evidence and limits. The paper quotes the central problem: “Without fixing the intended meanings, the problem of comparing formalizations—or judging whether any single one is faithful—is not well-defined.” (Section 2.1, p. 2) The paper cautions that NLI entailment agreement can occur with incorrect formulas (Section 3, p. 4). It recommends logical equivalence for direct semantic evaluation, but does not establish a universally best translation method (Section 3.2, p. 7; Section 4.3, discussion, p. 9).

## technique 3: improve translation by fine-tuning and preference objectives

What it is. Fine-tuning specializes a pretrained LLM on NL–FOL pairs. The survey covers full-parameter supervised fine-tuning (SFT), parameter-efficient Low-Rank Adaptation, reinforcement learning, and preference optimization (Section 4.1, p. 7).

How to apply it.
1. Assemble NL–FOL training pairs; the survey describes human, LLM, and rule-based generation and their validation limitations (Section 3.1, pp. 5–6). Inference: declare the ontology and validation procedure for a new training set.
2. Train with SFT or LoRA; symbol-renaming and NL-instruction augmentation are used to reduce surface memorization (Section 4.1, p. 7).
3. If using RL, combine a BLEU score and LE score as the LogicLLAMA reward (Section 4.1, p. 7).
4. For the surveyed DPO procedure of Lopez-Ponce and Bel-Enguix, use ground-truth formalizations as accepted options and LLM-generated alternatives as rejected options, augmented with quality scores. Separately, Viswanadha et al. study DPO and KTO after SFT (Section 4.1, p. 7).

Verus form. Inference: fine-tuning changes a proposal generator, not the proof obligation. Keep the Verus contract and checker fixed, and evaluate generated specs with compilation and proof success plus semantic tests. Inference: a reward based on string similarity cannot replace proof of contract equivalence.

Limits. On the DPO quality scores, the paper states, “The scores derivation procedure is not fully specified.” (footnote 4, p. 7) Cross-paper performance comparisons are unreliable because task definitions and annotations differ (Section 4.3, discussion, p. 9).

## technique 4: prompt decomposition, retrieval, and structured generation

What it is. Prompting methods improve a fixed model without changing weights. Agnostic methods include few-shot prompting, in-context learning, chain-of-thought, tree-of-thoughts, and self-consistency. Task-specific methods decompose OE and LT, recover relational axioms, or translate compositional subparts. Retrieval-augmented generation (RAG) inserts similar NL–FOL examples into the prompt (Section 4.2, pp. 7–8).

How to apply it.
1. For OE/LT decomposition, ask the model to identify a labelled signature, then translate using it (Section 4.2.2, p. 8).
2. Optionally ask the model to select among candidate relational axioms before translation (Section 4.2.2, p. 8).
3. For compositional translation, extract logical structure, split complex sentences, and translate sequentially from subcomponents to the full formula (Section 4.2.2, p. 8).
4. Build a knowledge base of NL–FOL pairs, enrich it with instances where the model failed, retrieve nearest examples by sentence embeddings, and include them as demonstrations (Section 4.2.2, p. 8).
5. Use grammar-constrained decoding to restrict tokens to syntactically valid continuations (Section 4.3.1, p. 8).

Verus form.

## technique 5: verify and refine outputs with formal tools

What it is. Feedback loops generate a formula, check it, and feed diagnostics back for repair. Syntactic verification uses a parser or theorem prover and returns error messages. Semantic verification uses satisfiability, unsat-core extraction, candidate comparison, counterexamples, roundtrip checking, or an LLM judge (Section 4.3, pp. 8–9).

How to apply it.
1. Generate an initial φ (Section 4.3, p. 8).
2. Run a syntax checker or theorem prover; pass errors and common-mistake guidance back to the model (Section 4.3.1, p. 8).
3. For a corpus formalized as axioms, check satisfiability and use an unsatisfiable core to identify formulas causing inconsistency (Section 4.3.2, p. 8).
4. In the surveyed Ryu et al. method, compare candidate formulas; select one arbitrarily if they are equivalent, otherwise pass an SMT counterexample to the model for discrimination (Section 4.3.2, p. 8).
5. In the surveyed Amrollahi et al. roundtrip method, use an SMT solver to check equivalence between a formalization and its back-translation, with an LLM judge diagnosing mismatches to guide repair (Section 4.3.2, pp. 8–9).
6. For the syntax-repair loop, stop on a syntactically valid formula or an iteration limit (Section 4.3.1, p. 8).

Verus form. Inference: map syntax checks to Rust parser/type checks, semantic checks to Verus verification conditions, and counterexamples to concrete failing assertions. Inference: keep an LLM judge advisory; only a checked Verus proof or a sound external solver certificate should discharge a product contract.

Evidence and limits. The paper says, “While syntactic verification represents a robust enhancement across model families, semantic verification addresses a genuinely different and harder problem, making it essential for reliable autoformalization in practice.” (Section 4.3, discussion, p. 9) SAT/SMT feedback is rigorous but partial; LLM-based semantic verification has broader coverage but lacks formal guarantees and depends on model capability (Section 4.3, discussion, p. 9). The survey states, “End-to-end pipelines that reliably formalize corpora of NL specifications are almost entirely absent.” (Section 5, p. 9)

## techniques for the catalog

- ontology extraction plus logical translation: separate symbol meanings and theory from formula generation
- semantic evaluation: provide labelled signatures and use logical equivalence; treat entailment checks as proxy evidence
- fine-tuning objectives: specialize models with SFT, LoRA, RL rewards, or preference optimization on validated pairs
- structured prompting: decompose OE/LT, recover axioms, translate subparts, retrieve examples, and constrain grammar
- verification refinement loop: feed syntax errors, solver cores, counterexamples, or roundtrip mismatches back into generation
