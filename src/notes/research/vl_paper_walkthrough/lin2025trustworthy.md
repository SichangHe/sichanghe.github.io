# Towards Trustworthy Legal AI through LLM Agents and Formal Reasoning
(authored by agents unless marked 🧑)
Tag: `lin2025trustworthy`, [paper](http://arxiv.org/abs/2511.21033v2)

## scope and contribution

The paper presents L4L, a solver-centric pipeline that turns statutes and case narratives into typed constraints, checks them with Z3, and then asks a judge LLM to render a verdict. Its central claim is that language-model flexibility can be retained while statutory applicability and consistency are checked symbolically. The abstract says: “We present L4L , a solver-centric framework that enforces formal alignment between LLM-based legal reasoning and statutory laws.” (Abstract, p. 1.) The paper does not claim that the model formalizes all law: its legal-formalization discussion says that formalization is a controlled abstraction of explicitly articulated statutes and rules (Introduction, p. 1).

## technique 1: typed statute formalization and case-tested knowledge base

what it is. L4L starts with a universal first-order Actor–Action–Condition–Norm schema and a penalty value. Its displayed rule is `scope(a, α, κ, n) → applies(a, α, κ, n, p)` for typed actors, actions, conditions, norms and penalties (Section 2.1, p. 2). A concrete article receives an `art_i(a, α, κ)` guard for jurisdiction, offense, and subject status. Each article clause receives a guard `cl_i,j(κ)` and a statutory penalty range `p_i,j`; the paper gives the Horn-clause shape `art_i(a, α, κ) ∧ cl_i,j(κ) → prohibited(a, α, κ) ∧ penalty(a, α, κ) = p_i,j` (Section 2.1, p. 2).

when to use it. Use this when a domain has explicit rules whose actors, actions, thresholds, conditions, and consequences can be made executable. The authors compile every article into this form, explicitly disambiguate cross-references, and parameterize quantities such as drug amounts and monetary thresholds (Section 2.1, p. 2).

how to do it. (1) Define the typed meta-schema. (2) Instantiate each article with an applicability guard. (3) Split its clauses into guarded threshold or aggravation rules and consequences. (4) Translate natural-language statutes and interpretations into SMT constraints. (5) Run syntactic checks and semantic linting. (6) Test the resulting model on real cases with known outcomes, and iteratively repair constraints when solver results diverge from gold labels. Steps 4–6 are stated in Section 2.1 (p. 2); the schema and article/clause steps are the preceding construction in that section.

paper evidence and limits. The paper calls the resulting object “a verified formal knowledge base” in Figure 1's caption (p. 3). Its running example encodes Article 347, Article 65, Article 67, and Interpretation [2016] No. 8; for 6 g of MDMA, the >20 g guard is false and the small-quantity clause is satisfiable (Section 3, pp. 4–5). This formalization is empirically grounded but remains dependent on LLM output: “its formalization quality is constrained by the accuracy of LLM outputs” (Section 5, p. 6). The evaluation is limited to statutory rules, not case law or open-textured norms, and assumes deterministic rule parsing (Section 5, p. 6).

Verus form. Inference: represent an article guard and consequence as `spec fn` predicates over Rust datatypes for actors, actions, conditions, and penalties; make executable code take a typed fact slice and return a result with `requires` and `ensures`. Inference: use `proof fn` lemmas to show that each returned consequence follows from the guard and threshold predicates, and use `assert` or `assert forall` facts to discharge arithmetic cases. Inference: a Verus proof establishes the encoded statute contract, while schema completeness, the natural-language-to-schema translation, and the chosen legal meaning remain assumptions outside the proof.

## technique 2: suspect-centric, role-differentiated extraction

what it is. L4L first decomposes a multi-defendant narrative into suspect-specific views, then runs a prosecutor and defense attorney LLM independently on the same view. The prosecutor is prompted to “maximise conviction” and the attorney to “maximise acquittal” (Section 2.2, p. 2). Each emits fact tuples `F⟨a, α, κ, w⟩`, where `w ∈ [0,1]` is evidential confidence, and ranked candidate statutes with retrieval-derived probabilities (Section 2.2, p. 2).

when and steps. Use it when roles, intent, evidence, or liability can differ among defendants. (1) Split the narrative by suspect. (2) Give each suspect view unchanged to both adversarially prompted extractors. (3) Have each extractor output shared-schema fact tuples and candidate statute ranks. (4) Preserve both outputs for the next formalization stage. The first two steps are “Suspect-Centric Decomposition” and the dual extractors in Section 2.2 (p. 2); the output shape is specified in the same section.

paper evidence and limits. Table 6's LeCaRDv2 ablation reports L4L G-F1 39.08%, S-F1 78.99%, and sentencing error 8.30 months; removing the attorney gives G-F1 37.89%, S-F1 69.56%, and 13.00 months (Table 6, p. 6). These are percentages over the paper's LeCaRDv2 evaluation split and months of sentencing error, as the table labels state. The paper says remaining robustness errors mainly stem from upstream fact extraction (Section 4.3, p. 6), so adversarial extraction does not make the facts trusted.

Verus form. Inference: define a typed `Fact` and two ghost or executable extraction results, then verify only that the downstream encoder consumes values satisfying a shared `Fact` contract. Inference: Verus cannot prove that an LLM's confidence or role prompt is truthful without a trusted oracle contract; it can prove non-conflation properties when each suspect has a separate typed record.

## technique 3: schema-guided autoformalization with provenance

what it is. A role-neutral autoformalizer converts the two structured outputs into one well-typed constraint set `Φ = Φfacts ∪ Φstatutes ∪ Φguards` (Section 2.3, p. 3). It performs value grounding, statute resolution, and provenance tagging. Value grounding maps fuzzy quantities such as “large amount” to symbolic variables and numeric constraints; statute resolution expands references and clause combinations into guarded Horn clauses; provenance tagging attaches agent identifiers and confidence weights (Section 2.3, p. 3).

how to do it. (1) Read both extractors' tuples and ranks. (2) Ground linguistic quantities into explicit symbols and inequalities. (3) Resolve article and clause references against the formal KB. (4) Attach source-agent and confidence metadata. (5) Emit only the union `Φ` as the solver input. The paper explicitly states these three autoformalizer steps and that `Φ` is the sole solver input (Section 2.3, p. 3).

Verus form. Inference: implement grounding and resolution as executable Rust parsers returning a typed constraint AST; specify that every emitted atom has a provenance field and that resolution preserves the referenced article identifier. Inference: use `ensures` on ordinary functions, not on `spec fn`; use `proof fn` only for compile-time proofs of AST-preservation lemmas. Inference: malformed natural-language extraction and the parser's semantic table are trusted inputs unless separately verified.

## technique 4: two-stage solver adjudication and unsat-core repair

what it is. L4L makes Z3 authoritative for applicability and clause qualification. Stage I checks `Φ ∧ ∃a, α, κ. art_i(a, α, κ)`; unsatisfiable articles are discarded. Stage II checks `Φ ∧ art_i(a, α, κ) ∧ cl_i,j(κ)` for each clause; satisfiable clauses determine the legal consequence and penalty range (Section 2.3, p. 3). When several clauses are satisfiable, all admissible clauses are enumerated and discretion is deferred to the judge layer.

The failure path is itself a technique. “If either applicability verification or judgment derivation fails (i.e., the solver reports unsat or unknown), the pipeline does not produce a verdict.” (Section 2.3, p. 3.) The minimal unsatisfiable core is sent back to the autoformalizer, which classifies the problem as extraction error, statute over-approximation, or incompatible clauses; constraints are revised and reasoning reruns until a consistent outcome is found or candidates are exhausted (Section 2.3, p. 3).

running procedure. The canonical Article 347 algorithm initializes a solver, declares entities, encodes facts, sorts rules by descending severity, pushes a state per rule, checks satisfiability, assigns the first satisfiable consequence, pops state, and returns “No applicable clause” if none is satisfiable (Table 2, p. 5). In the example, large and medium thresholds are UNSAT, small quantity is SAT, and the returned consequence is fixed-term imprisonment ≤3 years (Table 2, p. 5).

paper evidence and limits. Removing formal reasoning changes LeCaRDv2 ablation to G-F1 25.29%, S-F1 61.01%, and 20.87 months sentencing error (Table 6, p. 6); these denominators/settings are the same LeCaRDv2 ablation and the metrics defined immediately before Table 4. With the full pipeline, L4L's change accuracy is 62.56% on the synthetic perturbation dataset, versus 59.63% for GPT-5.2 (Table 7, p. 6). The authors report 10.33 LLM calls, 107.36 seconds, 13,049 input tokens, 4,217 output tokens, and $0.0819 per case on average (Table 8, p. 6). The solver does not repair wrong facts automatically; the paper identifies upstream extraction as the main residual error source.

Verus form. Inference: encode each article and clause as predicates and prove a Rust selector returns a consequence only when its predicate is satisfiable under the fact model. Inference: model “unknown” as an explicit result variant and require callers to handle it before producing a verdict. Inference: Verus can verify deterministic push/pop-free selection code and arithmetic guards, but not Z3's completeness, minimal-unsat-core quality, or the legal correctness of a repaired constraint set.

## technique 5: separated judge rendering with retrieval and interpretations

what it is. After a SAT model, the judge LLM receives the proof object, surviving statutes, and sentencing ranges and drafts a declarative verdict, quantified sentence, and narrative justification. Similar-case retrieval and judicial interpretations are supplied as context but cannot override solver results (Section 2.4, p. 3). This separates formal adjudication from substantive rendering.

paper evidence and limits. In the running example, matching Interpretation [2016] No. 8 prevents a wrong MDMA charge and guides retrieval of 1–10 g precedents; the authors report that a prompt-only judge tended to say “2 years,” while L4L moved toward “around 1 year” (Section 3, pp. 4–5). Removing judge rendering raises LeCaRDv2 sentencing error from the full 8.30 months to 11.88 months (Table 6, p. 6). Inference: this is a useful pattern for VL because untrusted natural-language rendering is downstream of a machine-checkable result, but the final prose and discretionary choice remain unproved.

Verus form. Inference: return a verified structured decision first, then pass it to an unverified renderer; specify that the renderer's text cannot alter the structured decision. Inference: enforce this boundary with an immutable decision value and a rendering function whose only postcondition is textual fidelity to that value.

## what is proved, measured, and trusted

The paper measures statute precision/recall/F1, sentencing error, legal validity, suspect extraction F1, and perturbation change accuracy on LeCaRDv2 (55,192 cases), LEEC suspect-level (9,470), and a perturbed dataset (3,622), with average statutes 4.53, 5.25, and 4.88 respectively (Table 3, p. 5). L4L's headline values are LeCaRDv2 general/specific F1 39.08%/78.99%, LEEC 45.51%/78.13%, and change accuracy 62.56% (Tables 4 and 7, pp. 5–6). Inference: these results support the pipeline's empirical behavior on the stated datasets, not universal legal correctness.

The trusted base includes the statute schema, article and interpretation encodings, extraction outputs, retrieval, Z3 and its translation, the judge's compliance, and the evaluation labels. The paper itself states that legal discretion and normative ambiguity remain; it also reports moderate computational overhead and deterministic parsing as assumptions (Section 5, p. 6). Inference: a VL product should treat each of these as explicit trust-boundary contracts and test them independently rather than calling the whole L4L result a proof.

## what VL should reuse and threat assessment

L4L already supplies a complete pattern for typed extraction, provenance, solver gating, unsat feedback, and rendering separation. Inference: VL should not redo a generic “LLM plus SMT” architecture; its differentiator would be Rust/Verus contracts, proof artifacts, and checked integration boundaries. Inference: the threat to agent-written verified Rust is moderate: the solver gate can reject inconsistent generated specifications, but incorrect specifications, parser bugs, unsupported semantics, and trusted external components can still yield a proof of the wrong behavior. Inference: the strongest transferable test is to require generated code to return an explicit unknown/error result whenever a proof obligation or external contract is unavailable.

## techniques for the catalog

- typed statute schema and case-tested SMT knowledge base — compile actor/action/condition/norm rules into guarded, executable constraints and validate them on known cases
- suspect-centric dual extraction — separate each defendant and obtain adversarial prosecutor and defense fact tuples under one shared schema
- provenance-aware autoformalization — ground fuzzy values, resolve statute references, and retain source/confidence metadata in the solver formula
- two-stage solver adjudication — filter article applicability, then qualify clauses, with unsat-core feedback and explicit unknown handling
- solver/result rendering boundary — let a judge LLM explain a solver-validated structured result while similar cases and interpretations cannot override it
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
