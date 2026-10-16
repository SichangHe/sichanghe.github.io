# Learning-Infused Formal Reasoning: From Contract Synthesis to Artifact Reuse and Formal Semantics
(authored by agents unless marked 🧑)
Tag: `beg2026learning`, [paper](https://doi.org/10.48550/arxiv.2602.02881)

## scope and status of the paper

The paper is a research vision, not a report of one complete verifier. Its three threads are (1) contract synthesis from natural-language requirements, (2) reuse of specifications, proofs, and contracts through graph matching, and (3) semantic foundations based on Unifying Theories of Programming (UTP) and the Theory of Institutions. The authors explicitly describe the VERIFYAI architecture as conceptual. For example, they write, “The proposed VERIFYAI framework is motivated by long-standing difficulties in converting informal requirements into precise, machine-verifiable annotations” (section 2.1, PDF p. 4), and “The architectural sketch underpinning VERIFYAI comprises three complementary technical pillars, each grounded in insights from the literature but intentionally presented as a conceptual proposal rather than a realised system” (section 2.2, PDF p. 4). The concrete experiments summarized in section 2.4 are attributed to a separate study (Beg et al. 2026a), so their setup is only partially specified here.

## technique 1: verifier-guided contract synthesis

What it is. VERIFYAI treats generation of preconditions, postconditions, and invariants as an iterative transformation from an informal requirement. The paper rejects a one-shot assumption that an LLM already knows program semantics. Its central method is to have an LLM extract candidate obligations, send those obligations to a verifier, and use proof failures, counterexamples, and satisfiability results to constrain the next generation. The paper states, “Within VERIFYAI, contract synthesis is conceived as an iterative transformation process rather than a direct translation” (section 2.1, PDF p. 4).

How to apply it. The paper's stated workflow is:

1. Use controlled prompts to extract candidate behavioural obligations from the requirement (section 2.1, PDF p. 4).
2. Represent candidates as the target verifier's contracts: preconditions, postconditions, invariants, or equivalent constraints (sections 2.1–2.3, PDF pp. 4–5).
3. Submit them to a formal engine such as Frama-C, Z3, or Alt-Ergo (section 2.2, PDF p. 5).
4. Feed proof failures, counterexamples, and satisfiability results back into generation to repair or constrain the candidate (section 2.2, PDF p. 5).
5. Record links between the original requirement, each generated annotation, and its revision history for expert review (section 2.2, PDF p. 5).

The paper says these steps are an intended architecture; it does not give a complete prompt, repair algorithm, termination criterion, or deployed VERIFYAI implementation.

Evidence and limits. Section 2.4 summarizes a controlled experiment on a filtered CASP subset for C/ACSL annotation generation. It compares five approaches: a rule-based Python script, Frama-C's RTE plugin, and DeepSeek, GPT-5, and OLMo3. All generated annotations are checked with Frama-C WP and multiple SMT solvers. The paper reports “verification success rates remaining in the range of 83–95% across models” (section 2.4, PDF p. 6). This is a percentage over the experiment's generated annotations, but this paper does not state the number of CASP programs, annotations per model, solver-by-solver denominators, or timeout counts; those denominators must be taken from Beg et al. (2026a), not inferred here. It also says rule-based and RTE approaches are consistent for safety properties, while LLMs produce additional functional constraints (section 2.4, PDF p. 6). Inference: the result supports using LLMs as candidate generators, not treating their output as proof. The paper's own threat is instability: small prompt changes can materially change ACSL/JML output, and solver configuration and path coverage affect reliability (section 5, PDF pp. 13–14).

## technique 2: typed graph construction for verification artifacts

What it is. Programs, specifications, and proofs are represented as typed, attributed graphs. Nodes denote semantic entities such as state variables, predicates, transitions, and proof obligations. Edges denote dataflow, control-flow, refinement, logical implication, or dependency (section 3.2, PDF p. 8). This gives heterogeneous artifacts a common structural representation instead of comparing source text.

How to apply it. The paper's concrete graph-construction work (Beg et al. 2026b) parses imperative programs and extracts specification elements for C with ACSL, Java with JML, and Dafny for C#. It combines abstract-syntax-tree parsing with lightweight extraction, then emits nodes and edges for control flow, data dependencies, and contract information (section 3.3, PDF p. 10). The reusable procedure is therefore: parse the implementation; identify semantic entities and contract clauses; create typed nodes; create relational edges; retain enough contract information to compare behavior across languages. The paper does not provide a graph schema, parser code, dataset cardinalities, or accuracy numbers.

Inference: for Verus, nodes could represent Rust functions, datatypes, `requires`/`ensures` clauses, loop invariants, `decreases` measures, predicates, and proof obligations; edges could represent calls, ownership/dataflow, refinement, and logical dependency. This is an inference from the paper's graph abstraction, not a claim about its implementation. Verus annotations would remain in Rust source; a graph is an auxiliary index and cannot itself establish a Verus proof.

## technique 3: embedding-enriched approximate graph matching

What it is. Each graph node receives an LLM-derived embedding from names, comments, formulas, and documentation. Approximate matching then combines embedding proximity with structural consistency. The authors emphasize role separation: “LLMs would provide probabilistic semantic priors, while the graph layer would enforce global relational and type constraints” (section 3.2, PDF p. 8). The LLM suggests correspondences; it does not decide correctness.

How to apply it. The paper's three explicit reuse steps are:

1. Graph construction translates programs, specifications, and proofs into typed, attributed graphs with relational semantics (section 3.2, PDF p. 8).
2. Semantic enrichment assigns each node an embedding encoding textual and symbolic meaning (section 3.2, PDF p. 8).
3. Approximate graph matching finds alignment candidates by combining structural similarity with embedding-level proximity (section 3.2, PDF p. 8).

After alignment, the paper proposes graph-based adaptation: apply rewriting, insertion, deletion, or refinement rules, then check that relational invariants survive (section 3.2, PDF pp. 8–9). It gives no implemented matcher, thresholds, benchmark denominator, or measured precision/recall.

## technique 4: refinement-preserving artifact adaptation

The paper separates finding a correspondence from making the artifact fit its target. It proposes graph-transformation rules for insertions, deletions, refinements, and structural edits, with path-expression views to check preservation of pre-established invariants (section 3.2, PDF p. 9). This is a method for adapting an aligned proof or specification rather than copying text. The paper cites earlier proof-assistant work on graph rewriting but reports no new adaptation experiment.

Inference: in Verus, adaptation would mean changing a candidate lemma, predicate, or invariant to the target Rust types and ownership structure, then proving the target function's obligations. Verus `proof fn`, `lemma`, `requires`, `ensures`, and `invariant` constructs are plausible carriers, but the paper neither names Verus nor claims these constructs. The trusted evidence remains the Verus verifier and its trusted kernel; the LLM and graph matcher are heuristic proposal mechanisms.

## technique 5: semantic interoperability with UTP and Institutions

The paper proposes UTP's relational calculus and the Theory of Institutions as a common semantic layer. UTP supplies healthiness conditions and refinement theories; Institutions describe a logic using signatures, sentences, models, and a satisfaction condition. The paper quotes the institutional maxim “Truth is invariant under change of notation” (section 4.1, PDF p. 11). The intended method is to check AI-generated predicates against healthiness conditions, interpret behavior through design theories, and transport specifications through institution morphisms (section 4.2, PDF pp. 12–13). Mechanised UTP work in Isabelle/UTP is cited as prior evidence, but this paper supplies no new proof or benchmark.

## what is proved, measured, and trusted

The paper itself proves no new theorem and reports no independently reproducible implementation of LIFR, VERIFYAI, graph matching, or adaptation. Its only quantitative statement is the 83–95% annotation-verification range from the separately cited Beg et al. (2026a) experiment; the paper omits the denominator and per-model table. It reports no graph-matching precision, recall, runtime, or reuse count. The proposed workflow trusts formal verifiers for final proof checking, while LLMs, prompts, embeddings, graph matching, and repair policies remain untrusted sources of candidates. The authors identify missing high-fidelity datasets, prompt instability, fragile tool translators, post-hoc rather than closed-loop solver use, traceability gaps, contradictory requirements, nondeterminism, and scalability limits (section 5, PDF pp. 13–14).

Inference: the threat to a product that lets agents write verified Rust is substantial at the proposal boundary: an LLM can generate plausible but semantically wrong contracts, and graph similarity can suggest an invalid transfer. The threat is reduced when every generated or reused artifact is compiled and proved in Verus, with explicit requirement-to-contract traceability and human review for assumptions. The paper's main reusable lesson is therefore workflow design, not a ready-made verifier.

## techniques for the catalog

- verifier-guided contract synthesis — iteratively generate contracts from requirements and refine them using proof failures, counterexamples, and satisfiability feedback
- typed artifact graphs — encode programs, specifications, and proofs as nodes and relational edges for cross-language comparison
- embedding-enriched graph matching — combine LLM semantic embeddings with structural and type constraints to retrieve candidate correspondences
- graph-based artifact adaptation — rewrite aligned artifacts and check preservation of relational invariants before reuse
- semantic interoperability — use UTP healthiness/refinement and Institution satisfaction-preserving mappings as language-independent constraints
