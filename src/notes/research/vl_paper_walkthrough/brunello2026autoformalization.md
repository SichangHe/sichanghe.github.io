# Natural Language to First-Order Logic LLM-based Autoformalization
(authored by agents unless marked 🧑)
Tag: `brunello2026autoformalization`, [paper](http://arxiv.org/abs/2610.12030v1)

## task definition and evidence boundary

This paper is a survey and task-definition paper, not a new model evaluation. It argues that FOL autoformalization must separate Ontology Extraction (OE) from Logical Translation (LT). The output is not merely a formula φ: it is φ together with an ontology Ω=⟨σ,L,T⟩ consisting of a signature, symbol labelling, and background theory (Section 2, pp. 2–4). The authors state, “The richer the specification of Ω, the more verifiable the output φ becomes.” (Section 2.4, p. 4)

The task takes natural-language text p and optional knowledge K and produces ⟨φ,Ω⟩, with Ω components possibly implicit (Definition 1, pp. 3–4). Raw translation leaves symbol meanings and theory underspecified; LT assumes an ontology and outputs φ; OE constructs the ontology needed for LT (Section 2.4, pp. 4–5). The paper surveys datasets, metrics, fine-tuning, prompting, and verification-based refinement. It does not provide a single controlled comparison across these methods; its stated limitation is the lack of standardized evaluation and noisy annotations (Section 5, p. 13).

## technique 1: make ontology explicit before translating

What it is. A signature fixes constants, functions, and predicates; labelling maps symbols to intended natural-language meanings; theory supplies axioms and domain assumptions. The same sentence can have multiple valid formulas with different ontological commitments (Sections 2.1–2.3, pp. 2–3).

When to use it. Use OE+LT when formulas will feed theorem provers, SMT solvers, or multi-sentence corpora requiring consistent symbols. Use raw translation only when implicit meanings are acceptable.

How to apply it.
1. Extract the relevant vocabulary and arities into σ (Section 2.2, p. 2).
2. Assign each symbol an intended meaning L(s), rather than relying on suggestive names (Section 2.1, p. 2).
3. Add background axioms T for taxonomic or domain constraints when needed (Section 2.2, p. 2).
4. Select a formula whose quantifier and relation structure expresses the sentence under Ω (Sections 2.3–2.4, pp. 3–4).
5. For LT, provide Ω as input and translate p into a formula over the fixed signature; for OE, construct Ω from context before LT (Section 2.4, pp. 4–5).

Verus form. Inference: represent σ, L, and T as ghost/specification data and require the generated Rust contract to reference only labelled predicates. Inference: use Verus `requires` for ontology axioms and `ensures` for the translated property; prove consistency or satisfiability with external SMT certificates where needed. Inference: symbol names alone are not a specification, so VL should reject generated contracts whose meanings are not supplied.

Evidence and limits. Figure 1 gives “Every student passed some exam” with three formulas that differ in whether exams, passing, or grades are represented (p. 3). The survey reports no existing work explicitly evaluates signature quality; it is usually inferred from downstream success (Section 3, p. 5). Thus ontology correctness remains a trusted input or unmeasured source of error.

## technique 2: use formal and semantic evaluation separately

What it is. The paper distinguishes syntactic metrics (exact match, tree edit distance, BLEU, LogicSim) from semantic metrics (logical equivalence and LE score), and recommends giving the labelled signature as input and using logical equivalence when direct semantic comparison is required (Section 3.2, pp. 6–7).

How the paper applies it.
1. Check that the formula is syntactically well formed (Section 3.2.1, p. 6).
2. Resolve predicate-symbol matching; direct matching is avoided by supplying the labelled signature in LT (Section 3.2.2, p. 6).
3. Evaluate logical equivalence φ≡φ̂ when a binary semantic metric is acceptable (Section 3.2.2, p. 6).
4. For proxy evaluation, formalize premises and conclusions and test whether FOL entailment matches natural-language entailment; inspect limitations because agreement can arise from incorrect formulas (Section 3, pp. 5–6).

Verus form. Inference: treat syntax checking as a parser/type checker before verification, then compare the generated spec to a reference by proving equivalence or implication. Inference: a Verus proof of a formula only establishes the formula's semantics under the supplied predicates; it cannot establish that those predicates match the natural-language requirement.

Evidence and limits. The paper quotes the central problem: “Without fixing the intended meanings, the problem of comparing formalizations—or judging whether any single one is faithful—is not well-defined.” (Section 2.1, p. 2) Proxy NLI can hide errors, and datasets contain annotation noise; the survey therefore does not report a universal best metric or model.

## technique 3: improve translation by fine-tuning and preference objectives

What it is. Fine-tuning specializes a pretrained LLM on NL–FOL pairs. The survey covers full-parameter supervised fine-tuning (SFT), parameter-efficient Low-Rank Adaptation, reinforcement learning, and preference optimization (Section 4.1, pp. 8–9).

How to apply it.
1. Assemble NL–FOL pairs with a declared ontology and validation procedure; datasets include human, LLM, and rule-based generation (Section 3.1, pp. 5–6).
2. Train with SFT or LoRA; symbol-renaming and NL-instruction augmentation are used to reduce surface memorization (Section 4.1, p. 8).
3. If using RL, combine a BLEU score and LE score as the LogicLLAMA reward (Section 4.1, p. 8).
4. If using DPO/KTO, define accepted ground-truth formulas and rejected model alternatives, with preference scores where specified (Section 4.1, pp. 8–9).

Verus form. Inference: fine-tuning changes a proposal generator, not the proof obligation. Keep the Verus contract and checker fixed, and evaluate generated specs with compilation and proof success plus semantic tests. Inference: a reward based on string similarity cannot replace proof of contract equivalence.

Limits. The paper notes that the DPO score derivation in one surveyed work is not fully specified (footnote, p. 8), and cross-paper performance comparisons are unreliable because task definitions and annotations differ (Section 5, p. 13).

## technique 4: prompt decomposition, retrieval, and structured generation

What it is. Prompting methods improve a fixed model without changing weights. Agnostic methods include few-shot prompting, in-context learning, chain-of-thought, tree-of-thoughts, and self-consistency. Task-specific methods decompose OE and LT, recover relational axioms, or translate compositional subparts. Retrieval-augmented generation (RAG) inserts similar NL–FOL examples into the prompt (Section 4.2, pp. 9–10).

How to apply it.
1. For OE/LT decomposition, ask the model to identify a labelled signature, then translate using it (Section 4.2.2, p. 9).
2. Optionally recover candidate relational axioms before translation (p. 9).
3. For compositional translation, extract logical structure, split complex sentences, and translate subcomponents sequentially (p. 9).
4. Build a knowledge base of NL–FOL pairs, retrieve nearest examples by sentence embeddings, and include them as demonstrations (p. 9).
5. Use grammar-constrained decoding to restrict tokens to syntactically valid continuations (Section 4.2.1, p. 9).

Verus form. Inference: prompt decomposition should produce an intermediate ontology artifact that VL can inspect before generating Rust specs. Inference: retrieval examples are evidence only if their formulas and labels have been independently validated; otherwise they propagate annotation errors.

## technique 5: verify and refine outputs with formal tools

What it is. Feedback loops generate a formula, check it, and feed diagnostics back for repair. Syntactic verification uses a parser or theorem prover and returns error messages. Semantic verification uses satisfiability, unsat-core extraction, candidate comparison, counterexamples, roundtrip checking, or an LLM judge (Section 4.3, pp. 10–11).

How to apply it.
1. Generate an initial φ (Section 4.3, p. 10).
2. Run a syntax checker or theorem prover; pass errors and common-mistake guidance back to the model (Section 4.3.1, p. 10).
3. For a theory, run SAT/SMT checks and extract an unsatisfiable core to identify offending formulas (Section 4.3.2, p. 10).
4. Compare candidate formulas; if they are inequivalent, pass an SMT counterexample to the model for discrimination (p. 11).
5. For roundtrip verification, translate φ back to NL and use an SMT solver for equivalence, with an LLM diagnosing mismatches (p. 11).
6. Stop on a valid formula or an iteration limit (Section 4.2.1, p. 9).

Verus form. Inference: map syntax checks to Rust parser/type checks, semantic checks to Verus verification conditions, and counterexamples to concrete failing assertions. Inference: keep an LLM judge advisory; only a checked Verus proof or a sound external solver certificate should discharge a product contract.

Evidence and limits. The paper says, “While syntactic verification represents a robust enhancement across model families, semantic verification addresses a genuinely different and harder problem.” (Discussion, p. 12) SAT/SMT feedback is rigorous but partial; LLM-based semantic verification has broader coverage but lacks formal guarantees and depends on model capability (p. 12). The survey identifies end-to-end formalization of real NL specifications as largely absent.

## implications for VL

Proved or surveyed: a precise ontology-aware task definition, metric distinctions, and method patterns for generation and refinement. Not proved by this paper: that any LLM output is semantically faithful, that datasets are clean, or that a prompting/fine-tuning method dominates others. Trusted inputs include ontology labels, theory axioms, parser/solver correctness, and the natural-language-to-requirement interpretation.

Inference: VL can use the OE/LT split as a front end: require an explicit labelled vocabulary and theory, generate Verus specs only after that artifact is reviewed, then run syntax and semantic verification loops. Inference: the product threat is high when an agent converts prose directly into Rust contracts without ontology and semantic checks; it is lower when every generated contract is proved in Verus against executable behavior and the prose mapping remains an explicit assumption.

The survey says existing work is mostly raw translation and that OE-specific methods and end-to-end verified applications are scarce (Sections 4 and 5, pp. 8–13). VL should therefore avoid treating benchmark translation scores as formal-verification evidence and should retain provenance for every generated predicate and axiom.

## techniques for the catalog

- ontology extraction plus logical translation: separate symbol meanings and theory from formula generation
- semantic evaluation: provide labelled signatures and use logical equivalence or entailment checks instead of string similarity alone
- fine-tuning objectives: specialize models with SFT, LoRA, RL rewards, or preference optimization on validated pairs
- structured prompting: decompose OE/LT, recover axioms, translate subparts, retrieve examples, and constrain grammar
- verification refinement loop: feed syntax errors, solver cores, counterexamples, or roundtrip mismatches back into generation

Checked 2026-10-15 against the paper by a Codex agent for natural_language_to_first_order_logic_ll_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
