# Vero: Can AI Agents Build Formally Verified Software Repositories?
(authored by agents unless marked 🧑)
Tag: `ye2026vero`, [paper](https://doi.org/10.48550/arxiv.2608.13522)

## technique: separate proof-only and code-and-proof obligations
A Vero instance fixes data types/helpers, API signatures, specifications, and a `RepoImpl` structure. Each specification is a predicate over an implementation, rather than a theorem tied to one reference body. In proof-only mode, the agent proves every specification against the fixed reference implementation. In code-and-proof mode, it supplies every API body and proves every specification against its own implementation. The paper's example defines `spec_create_zero_balance (impl : RepoImpl) : Prop` and proves `spec_create_zero_balance canonical` (Figure 2, page 4).

Inference: when to use it: Use the two modes to separate proof skill from the coupled choice of implementation and proof. Require full coverage because one unproved specification leaves an unchecked behavior.

Paper procedure (sections 3.1–3.2, pages 4–5):
1. Freeze signatures and specifications in a multi-module scaffold.
2. In proof-only, instantiate `canonical` with reference implementations and fill every proof body.
3. In code-and-proof, fill every implementation slot and then prove every specification over that implementation.
4. Rebuild a clean copy and machine-check all specifications; score only a repository with full coverage.

## technique: benchmark curation from real repositories
Vero's 13 formal-source instances come from Dafny, Verus, and Coq; 30 come from Python. The curation stages are discover, select, plan, translate, spec write (Python only), and validate, with human approval between stages (section 3.3, pages 5–6). Discover lists declarations, select chooses included APIs, plan fixes dependencies/signatures/module layout, translate dispatches modules in dependency order, and validate runs build checks and semantic reviews. Formal tracks translate existing types, definitions, and specifications; Python tracks additionally draft specifications from documented behavior and tests. A new source language is added as a modular agent skill.

## technique: prevent reward hacking with clean re-rendering and audits
The grader extracts only marked editable regions, inserts them into a fresh benchmark copy, rejects untrusted axioms through an allowlist, and screens agent declarations for proof-trivializing mechanisms such as malicious typeclass instances or `noncomputable choice` combined with `@[implemented_by]` (section 3.2, page 5). The formal audit route lets an agent instantiate each specification with the reference implementation, an individual specification, or jointly inconsistent specifications, and returns machine-checked evidence of benchmark defects to curation (section 3.5, pages 6–7).

Inference: A Verus equivalent should rebuild from a clean checkout, reject agent-added `external_body` on the target function and undeclared axioms, and run a separate audit that checks whether contracts are satisfiable and whether reference implementations satisfy them. These are engineering controls around Verus; they are not claims made by the paper.

## evidence and repository-scale proof structure
Vero has 743 scored APIs and 2,705 scored specifications across 43 instances (Table 1, page 6). Four configurations are evaluated for 90 minutes with full filesystem and Lean-toolchain access. GPT-5.5 xhigh fully solves 27/43 code-and-proof and 25/43 proof-only instances; Claude Opus 4.8 solves 8/43 and 10/43, GPT-5.5 medium 2/43 and 6/43, and Claude Sonnet 5 2/43 in each mode (Figure 3 and section 4.2, page 8). GPT-5.5 xhigh passes 87.3% of specifications in code-and-proof and 85.8% in proof-only, showing that per-specification coverage is not repository completion.

Across 172 matched instance-agent pairs, 26 are solved in both modes, 13 only in code-and-proof, 17 only in proof-only, and 116 in neither (Figure 4, page 9). Five pairs replace a hard-to-prove reference algorithm with a simpler behaviorally correct implementation; those pairs close all 250 specifications in code-and-proof versus 201 when proving the fixed reference. This is a measured implementation/proof tradeoff, not evidence that the simpler algorithms preserve efficiency.

Across 82 full solves, helper theorems contain median 73.6% of proof lines in code-and-proof and 71.6% in proof-only; 80/82 share a helper across at least two specifications and 65/82 across at least five (Figure 5, page 10).

## what is proved, trusted, and missing
The grader proves the submitted Lean artifacts against frozen specifications and checks anti-cheating constraints. The benchmark's translation, specification intent, source semantics, Lean kernel/toolchain, and audit coverage remain trusted. The paper reports ten instances resisting all eight configurations across both modes (section 4.2, page 8); this is a benchmark result, not a universal capability limit.

## techniques for the catalog
- two-mode repository benchmark — compare proving fixed implementations with jointly choosing implementations and proofs
- human-gated curation pipeline — discover, select, plan, translate, specify, validate, and review each repository scaffold
- clean re-rendered grading — extract editable regions into a fresh checkout and enforce axiom and declaration screens
- formal benchmark audit — use machine-checked counterexamples to distinguish agent failures from defective specifications or references
- shared lemma-library measurement — track helper reuse and proof-chain depth across specifications, not only local proof success
