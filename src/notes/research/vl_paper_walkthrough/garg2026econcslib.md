# EconCSLib: AI-Assisted Lean Formalization for Economics & Computation research
(authored by agents unless marked 🧑)
Tag: `garg2026econcslib`, [paper](http://arxiv.org/abs/2606.13306v2)

## what the paper builds

EconCSLib is a Lean 4 library plus a paper-oriented workflow for formalizing applied economics and computation papers. The abstract states: “The central design principle is a human-AI-Lean formalization workflow: an LLM writes Lean code, Lean checks formal statements and proofs, and both humans and LLM-as-judge processes can verify that the paper’s statements were translated into Lean correctly.” (Abstract, p. 1) The repository had 20 fully formalized and 4 partially formalized papers, 986,391 Lean lines, as of July 2, 2026 (Section 4, p. 8).

The reusable layer covers finite mathematics and graphs, probability and stochastic processes, optimization and certificates, social choice, auctions, online algorithms, matching, and recommender systems. The paper-specific layer preserves source notation, theorem numbering, formal statements, proof approaches, and review artifacts (Section 3.1, pp. 4–5). This is a technique for making each formalization reusable rather than a single translation script.

## technique: paper formalization with a reusable library

When to use it: use this when a paper contains many definitions and results that later papers may reuse. The method is:

1. Acquire the paper PDF or LaTeX and ask an agent to inventory definitions, lemmas, propositions, and theorems. The start workflow explicitly acquires both PDF and LaTeX when available (Section 3.3, p. 7).
2. Create a paper folder and a paper-facing Lean interface in source order, keeping the source notation and theorem numbers (Section 3.1, p. 4).
3. Put common definitions and lemmas in the shared library; elevate a paper result only when it is likely to be useful to another paper (Section 1, p. 2; Section 3.3, p. 7).
4. Generate a dependency DAG of the paper’s named statements and maintain each node’s status as formalized, partial, conditional, scaffold, or not formalized (Figure 1, p. 5; Section 3.2.2, p. 7).
5. Have the LLM follow the paper proof where possible, and record proof-route deviations and extra assumptions immediately in the final validation report (Section 3.3, p. 7).

Inference: in Verus, the paper folder can become a Rust module containing paper-facing `spec fn` definitions, `proof fn` lemmas, and executable wrappers. Reusable mathematics belongs in separate modules imported by several papers. Verus does not carry over Lean’s theorem names or typeclass library; the mathematical contracts and proof dependencies must be expressed with Verus specifications and proof functions.

## technique: translation audit with independent LLM judge

When to use it: use this whenever compiling Lean code is insufficient evidence that the informal statement was translated faithfully. The paper’s audit has three layers. First, an LLM translates Lean back to LaTeX without source-paper context. Second, another LLM compares that LaTeX with the source statement. The paper describes the comparison as follows: “First, an LLM (without any context on the source paper) is asked to translate from the Lean code back to LATEX. Then, a second LLM (also without any context) is asked to compare the LATEXtranslation to the source statement in the paper, and judge whether they are equivalent.” (footnote 4, p. 6)

The operational steps are:

1. Present each source statement beside its Lean statement in the dashboard (Section 3.2.1, p. 6).
2. Generate the context-free Lean-to-LaTeX draft and verdict.
3. Let a human mark whether the Lean statement matches the paper; persist identity, timestamp, comments, and hashes (Section 3.2.1, pp. 6–7).
4. Run the pipeline at the beginning to iterate on intended targets and at the end; CI requires a passing run before declaring a paper formalized (Section 3.2.1, p. 6).
5. Treat an “uncertain” judge result as a human-review flag, not as acceptance (Section 3.2.1, p. 6).

Inference: a Verus implementation can expose a small review file containing the paper statement, Rust/Verus contract, and a generated natural-language rendering. A second model or human should compare the rendering to the source. Verus compilation proves the encoded contract, but it cannot prove that the contract is the intended paper claim.

## technique: DAG and final validation report as review surface

The DAG is generated at the beginning and kept current; it lets a human see missing results and steer an agent. The report records status, whether the source proof approach was followed, deviations, errors, and additional assumptions (Section 3.2.2, p. 7). The paper says, “The workflow produces a FINAL_VALIDATION_REPORT.md that complements the DAG in describing the formalization process, in a human digestible form.” (Section 3.2.2, p. 7)

Inference: for Verus, make the DAG nodes correspond to Rust `spec fn`, `proof fn`, and executable theorem wrappers, and make each node link to a contract and its evidence. Keep “proved,” “conditional,” and “assumed” distinct; a compiling proof function does not establish that the source statement was encoded correctly.

## evidence, trusted base, and failure modes

The reported denominator is 24 paper formalizations: 20 complete and 4 partial, totaling 986,391 Lean lines (Section 4, p. 8). “The Lean code compiles, and so Lean has checked the correctness of the translated statements, given the stated assumptions and definitions.” (Section 4, p. 8) However, the human dashboard had only been sparsely used. The paper therefore separates compiler evidence from translation evidence. Lean’s kernel/typechecker and toolchain remain trusted, and the shared library can contain AI-generated code that has not been human-validated (Introduction, p. 2; Section 2, p. 3).

The authors report correlated-error risk because all validation was being done by a Codex sub-agent: the judge may repeat the translator’s mistake (Section 3.2.1, p. 6). A statement can also be assumed in a Lean function signature instead of proved in its proof, and an extra assumption may be implicit in the paper (Section 3.2.1, pp. 6–7). The project reports 22,788,161,329 total logged tokens for the first 13 public formalizations and about five in progress, with an approximate direct cost of $16,416 (Table 2, p. 8); the denominator and subscription caveat are part of that table.

Inference: the direct product threat for agent-written verified Rust is semantic drift at the contract boundary and unreviewed reusable lemmas. Verus’s verifier can discharge a wrong specification just as Lean can discharge a wrong theorem statement. The review surface and explicit assumption accounting are therefore more valuable than a larger proof transcript. The workflow should not be treated as fully autonomous for high-stakes claims while the paper itself reports sparse human validation.

## techniques for the catalog

- paper-facing formalization: preserve source statements and theorem order while sharing reusable library mathematics
- translation audit: compare a context-free Lean-to-text rendering with the source and log human verdicts
- dependency DAG: track every named result and its formalization status
- validation report: record proof-route deviations, extra assumptions, provenance, and unresolved boundaries
