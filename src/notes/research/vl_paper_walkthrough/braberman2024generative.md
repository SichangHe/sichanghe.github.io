# Generative transformations and patterns in LLM-native approaches for software verification and falsification
(authored by agents unless marked 🧑)
Tag: `braberman2024generative`, [paper](https://doi.org/10.1016/j.jss.2024.112160)

## scope and result

This paper is a secondary study of more than 100 prompt-based software-engineering proposals, including program verification, testing, fuzzing, static analysis, and vulnerability detection. It does not introduce one verifier; it extracts reusable generative transformations and inter-transformation patterns. Its central abstraction is explicit: “We claim that (1) all those LLM based interactions can be understood as a set of ‘transformations’ from some (intermediate) inputs to some (intermediate) output, (2) those transformation types, while very rich, can be categorized, and (3) the same can be said about patterns of how transformations are related to solve problems in contemporary literature.” (Section 4, PDF p. 7)

The study includes peer-reviewed work available through the first week of June 2024 and conferences announced by July 2024; it excludes proposals primarily based on fine-tuning, generic transformer architecture, or code review, while retaining systems that use code generation or repair for verification goals (Section 3.1, PDF p. 6). Inference: this date and prompt-based scope means it is a map of design choices, not a complete census of formal verification.

## technique 1: transformation extraction

Use this as a design-analysis method before implementing an LLM verification pipeline. For every proposal:

1. identify intermediate and final results produced by algorithmic manipulation or LLM utterances
2. identify prompt instructions, examples, prefixes, and other elicitation elements
3. infer each transformation’s conceptual input signature
4. name the transformation by expected functionality

These are the paper’s four extraction steps (Section 4.1, PDF p. 7). The authors manually read paper descriptions, prompts, algorithms, and repositories. Each transformation is represented as an input-to-output function, with algorithmic components such as compilers and static analyzers included.

## technique 2: taxonomy for verification workflows

The taxonomy is a directed tree whose high-level classes include generative, evaluative, extractive, abstractive, executive, and consultative transformations (Section 5, PDF pp. 9–10). Program-verification proposals in the mapping include SpecGen, Dafny-Synth, AutoSpec, Lam4Inv, Lemur, Loopy, and RustProof (Figure 2, PDF p. 6). The taxonomy is extensible: the authors state, “Our taxonomy was deliberately designed to be extensible.” (Section 5, PDF p. 10)

## technique 3: recurrent composition patterns

The catalog identifies patterns that connect transformations. The most directly useful to formal verification are:

- Enhance: add control/data-flow or verbalized software structure before an evaluative transformation
- Enrich with Precisions: clarify natural-language intent before generation
- Use Verbalized SWE: verbalize code or intent before a later generation step
- Generate and Fix: use correctness feedback to repair an initial annotation or program
- Build Model: extract properties or constraints before generating inputs or proofs
- Extract to Focus: retrieve only relevant repository or code elements
- Divide, Generate and Merge: generate modular proof components and fuse them
- Compute Sequence of Transformations: precompute symbolic/data-flow steps that guide later inference

Table 4 (PDF pp. 17–18) gives these descriptions and examples. The paper defines Generate and Fix as “Use correctness feedback when available to fix initial generation.” (Table 4, PDF p. 17) It describes Build Model as extracting useful properties or analyzable models before generation.

## evidence and limits

The paper reports distributions of how many transformation types appear in proposals. For testing/fuzzing, 39% of approaches use one type, 31% use two, 11% use three, 13% use four, 3% use five, and 2% use six (Table 1, PDF p. 8); these percentages sum to 99% because of rounding or omitted values. Debugging/root-cause approaches are 15% one type, 62% two, 15% three, and 8% four (100%). Static-analysis approaches are 33%, 11%, 11%, 22%, and 22% for one through five types (99%). These are proportions of approaches in each problem category, not verification success rates.

The paper does not prove that a pattern improves correctness. It explicitly limits its claim: “whether or not they can be considered best practices that may be used to solve stated problems, their pros and cons, or completeness of catalog, is out of scope of this work.” (Section 7, PDF p. 16)

## trusted boundary and product implications

The survey treats LLM outputs, prompts, static analyses, compilers, vector databases, and external verifiers as transformation nodes; it does not establish their soundness.

## techniques for the catalog

- transformation extraction — decompose each proposal into named input-to-output units using prompts, algorithms, and intermediate artifacts
- verification taxonomy — classify generation, extraction, formalization, evaluation, execution, and consultation by output function
- Generate and Fix — use verifier feedback to repair initial contracts, code, tests, or proofs
- Build Model and Extract to Focus — derive constraints or relevant code before asking an LLM to generate verification artifacts
- Divide, Generate and Merge — generate modular components and combine them into a checked result
