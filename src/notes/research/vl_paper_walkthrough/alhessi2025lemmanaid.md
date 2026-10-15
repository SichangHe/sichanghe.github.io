# Lemmanaid: Neuro-Symbolic Lemma Conjecturing
(authored by agents unless marked 🧑)
Tag: `alhessi2025lemmanaid`, [paper](https://www.semanticscholar.org/paper/498079c9288e4b47a3c1056a82bb546113459b70)

## what the system does

Lemmanaid proposes mathematical lemmas in Isabelle/HOL by combining a neural template generator with symbolic hole filling. The input is a partial theory containing datatypes, functions, and existing lemmas. The neural stage proposes an abstract family of lemma shapes; the symbolic stage instantiates holes with functions from the current theory, type-checks candidates, and emits concrete conjectures. The paper's abstract states: “L EMMANAID uses a fine-tuned LLM to generate lemma templates that describe the shape of a lemma, and symbolic methods to fill in the details.” (Abstract, p. 1)

The authors describe the tool as “a novel neuro-symbolic approach and tool for general lemma conjecturing across a broad range of mathematical theories.” (Introduction, p. 2) This is bottom-up conjecturing: it searches for useful statements without a specified top-level proof goal. It does not prove every generated statement. Isabelle's prover and counterexample tools classify candidates after generation. The method section states, “This happens in two stages: First (neural part), the partial theory is given as input to an LLM which outputs templates likely to be relevant. Second (symbolic part), Lemmanaid searches over possible instantiations of those templates in the current theory, to produce concrete conjectures.” (Section 3, p. 3)

## technique 1: normalize lemmas into templates

What it is. Replace concrete function symbols in a lemma with indexed holes while preserving logical operators, quantifiers, equality, variable structure, arity, and type relationships. Repeated occurrences of one function share the same hole, so the template describes an analogy family.

When to use it. Use this preprocessing to learn reusable shapes across theories and to make neural prediction easier than direct full-lemma generation.

How to do it.

1. Take a human-written lemma and identify function applications (Section 3.1, p. 3).
2. Replace each function symbol by a hole `?Hk`; preserve logical symbols such as negation, universal quantification, and equality (Section 3.1, p. 3).
3. Give repeated occurrences the same hole label, retain each hole's arity/type abstraction, and standardize free variables to `xk` and bound variables to `yk` (Section 3.1, pp. 3–4).
4. Implement the result as an Isabelle/HOL term datatype (Section 3.1, p. 4).

The paper's octonion distributivity example becomes `?H1 x1 (?H2 x2 x3) = ?H2 (?H1 x1 x2) (?H1 x1 x3)` (Section 3.1, p. 4). The type of each hole is generalized, while argument count remains a constraint.

Verus form. Inference: represent a normalized lemma as a ghost algebraic datatype for logical structure plus hole identifiers, and define a `spec fn` that records well-typed applications. A `proof fn` can establish that replacing a hole consistently preserves the template's arity constraints. Verus does not provide Isabelle's term datatype or higher-order unification; an implementation must define the syntax and substitution relation in Rust/Verus. The normalized object is a conjecture specification, not executable authorization code.

Evidence and limits. Templates preserve shape but can instantiate to false statements; in the paper's associativity example, subtraction and exponentiation produce false candidates while addition and list concatenation produce valid ones (Section 3.1, pp. 4–5). Therefore symbolic well-typedness is not truth.

## technique 2: symbolic constraint-based hole filling

What it is. Fill each indexed hole with a function whose type and arity match, treating holes as CSP variables and available functions as domains. Standard forward checking prunes assignments that violate type constraints.

When to use it. Use this after a template is proposed and a finite current theory supplies candidate function symbols. It controls combinatorial growth while retaining cross-domain analogies.

How to do it.

1. Give the symbolic engine the template and list of function names (Section 3.1, p. 4).
2. Create a CSP variable for each hole; its domain is functions in the supplied list (Section 3.1, p. 4).
3. Enforce hole arity and type-signature constraints at each assignment (Section 3.1, p. 4).
4. Apply forward checking to remove domain values that cannot lead to a well-typed completion (Section 3.1, p. 4).
5. Emit each well-typed instantiated lemma; send it to counterexample or proof tools (Section 3.1, p. 5; Section 4.3, p. 7).

Verus form. Inference: encode the finite candidate list as a ghost `Seq` or set and state substitution validity with `spec fn`. Use proof functions with `requires` that each chosen function matches a hole's signature and `ensures` that the generated expression is well formed. Enumeration itself can be ordinary Rust; Verus can prove properties of a bounded enumerator, but it does not make an SMT solver accept a mathematically false conjecture.

Evidence. On the Octonions example, QuickSpec reaches 22.8% gold-lemma discovery, while Lemmanaid's best combined model reaches 84.9% (Table 1, p. 6; denominator is the 350-lemma Octonions project). QuickSpec emits several thousand lemmas with precision below 1% because it has limited interestingness heuristics (Section 4.2, p. 7); this demonstrates why filtering matters.

## technique 3: neural template generation with structured context

What it is. Fine-tune an LLM to map a list of symbols plus their types and definitions to a template, rather than asking it to write a complete lemma. The structured output is easier to parse and leaves concrete search to the symbolic engine.

When to use it. Use this when a theory has many functions and analogous lemma families but direct generation hallucinates symbols or repeats trivial statements.

How to do it.

1. Extract constants recursively from each lemma's internal Isabelle term and collect their types and known definitions (Section 3.2, p. 5).
2. Convert each human-written lemma to a training pair whose input is `[Symbols][Types][Defs]` and whose output is its normalized template (Section 3.2, p. 5; Eq. 4).
3. Fine-tune a language model on these pairs (Section 3.2, p. 5).
4. At inference, provide the current theory's symbols/context and generate templates with greedy decoding or beam search (Section 4.1, p. 5).
5. Pass templates to symbolic filling; retain candidates for proof/counterexample classification (Figure 2, p. 4; Section 4.3, p. 7).

Verus form. Inference: index Rust/Verus symbols with their types, `spec fn` signatures, `requires`, and `ensures`; prompt an LLM for a datatype-level conjecture template. Parse only a restricted template grammar, instantiate candidates with known functions or proof functions, and run Verus on each candidate harness. Generated `requires` or `ensures` are suggestions until a Verus proof establishes them.

Evidence. With DeepSeek-coder-6.7B trained on HOL+AFP, Lemmanaid discovers 50.2% of HOL-test and 27.9% of AFP-test gold lemmas using types+definitions and five predictions (Table 1, p. 6; denominators are 4,740 HOL-test and 18,975 AFP-test tasks, Section 3.4). The combined Lemmanaid ensemble reaches 58.6% and 42.7% respectively (same table). The paper reports 50% and 29% rounded in its conclusion (p. 8). Adding type information is greatly beneficial, while definitions alone can hurt (Section 4.2, p. 6).

## technique 4: candidate truth and novelty filtering

What it is. Classify generated conjectures as gold-standard, other true, false, or unresolved using Isabelle's Sledgehammer, Nitpick, and Quickcheck. A candidate is successful for the main metric only if it matches the human gold lemma's internal term representation.

When to use it. Use filtering when the goal is useful, non-redundant lemmas rather than a large list of merely well-typed equations.

How to do it.

1. Parse each predicted lemma/template in the source theory context and compare its internal term representation to the gold lemma (Section 4.1, p. 6).
2. Run Sledgehammer; candidates it proves are true, including gold and other true statements (Section 4.3, p. 7).
3. Run Nitpick and Quickcheck for counterexamples; candidates with counterexamples are false (Section 4.3, p. 7).
4. Mark candidates that neither tool settles as unresolved (Section 4.3, p. 7).

Verus form. Inference: parse generated candidate specs, then create a proof harness with a `proof fn` and `ensures` matching the candidate; run Verus. Counterexamples can be generated by bounded Rust tests, but unresolved candidates remain unproved. Use `assert` and explicit lemmas for the proof obligations; never treat a successful parser or test as a proof.

Evidence. For HOL-test, Lemmanaid generates 7,628 conjectures: 1,721 gold-standard (22.6%), 1,356 other true (17.8%), 1,802 false (23.6%), and 2,749 unresolved (36.0%) (Table 3, p. 7; denominator 7,628 generated conjectures). Thus more than half are either false or unresolved under the reported tools. The matching criterion is stricter than logical equivalence after rewriting (Section 4.1, p. 6), so discovery percentages measure exact internal-term matches, not all useful consequences.

## scope, trust, and threat

The formalization is Isabelle/HOL, not Verus. Trusted components include Isabelle's parser and kernel, Sledgehammer/Nitpick/Quickcheck, the LLM, symbolic enumerator, training data, and gold-standard human lemmas. The paper evaluates HOL and AFP: the AFP source contains about 285,200 lemmas in nearly 900 theories, while extracted datasets contain 62,816 HOL and 210,898 AFP datapoints (Section 3.4, p. 5). The test sets have 4,740 HOL-test and 18,975 AFP-test datapoints (Section 3.4, p. 5). Results are percentages over those task denominators and five predictions (one greedy plus four beam size 4), with an additional symbolic CPU budget of at most 60 seconds per task (Section 4.1, p. 5).

Inference: threat to agent-written verified Rust is moderate. Lemmanaid can supply missing lemma candidates and analogies, but it does not synthesize Verus proofs, validate ownership or executable behavior, or ensure a conjecture is useful for a product. VL should reuse the decomposition into neural proposal, typed symbolic instantiation, and independent verifier filtering; it should not repeat an Isabelle-only benchmark as evidence about Verus. Existing work already measures template versus direct generation, context ablations, beam ensembles, false/unresolved rates, and commercial-model comparisons; a VL study should focus on Verus proof completion and contract correctness.

## techniques for the catalog

- template normalization — replace function symbols by shared typed holes while preserving logical structure and arity
- CSP hole filling — instantiate holes from current theory functions with forward checking over types and arities
- structured neural proposal — train an LLM to output templates from symbols, types, and definitions
- proof and counterexample filtering — classify candidates with prover, counterexample, and testing tools before retaining them

Checked 2026-10-15 against the paper by a Codex agent for lemmanaid_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
