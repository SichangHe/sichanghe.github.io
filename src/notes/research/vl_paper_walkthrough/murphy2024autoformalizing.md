# Autoformalizing Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `murphy2024autoformalizing`, [paper](https://arxiv.org/abs/2405.17216)

## problem and system

This paper builds a neuro-symbolic pipeline for translating informal Euclidean theorems and proofs into Lean. The central difficulty is that diagrams license unstated steps. The authors state: “The key insight is that equivalence checking can be made feasible in specific domains (such as Euclidean geometry) by combining domain knowledge with automated reasoning tools, such as satisfiability modulo theories (SMT) solvers (Barrett & Tinelli, 2018).” Their LeanEuclid benchmark contains informal theorem, proof, and diagram in LaTeX plus formal theorem and proof in Lean. It includes 48 theorems from Euclid's Elements Book I and 125 random UniGeo examples (sections 1 and 3.4, pp. 1–6).

The formal system E represents points, lines, segments, circles, angles, and geometric relations. The authors implement E in Lean and add an SMT-based symbolic engine. Lean checks explicit proof tactics; the symbolic engine supplies implicit diagrammatic deductions. The paper emphasizes the trust boundary: “Our symbolic reasoning engine (Sec. 3.3) relies on SMT solvers, whose results currently cannot be fully certified by Lean.”

## technique 1: semantic equivalence evaluation

What it is. Given ground-truth theorem Tgt and model prediction Tpred, E3 asks an SMT solver to prove both implications and separately checks satisfiability. The paper describes the procedure: “E3 performs a separate satisfiability check for each direction, each of which can succeed or fail.” If logical equivalence cannot be proved, approximate equivalence checks whether the prediction differs by one extra precondition or a small logical gap.

When to use it. Use this when many formal statements have semantically equivalent syntax and exact string comparison would reject valid outputs. It is suitable for autoformalization where a model's theorem may reorder hypotheses or choose a different but equivalent expression.

How to apply. (1) Translate Tgt and Tpred into E's first-order representation. (2) Run SMT checks for `Tpred ⇒ Tgt` and `Tgt ⇒ Tpred`. (3) Run satisfiability checks for each theorem. (4) If either implication fails, classify the counterexample or missing condition; use approximate equivalence for fine-grained analysis. (5) Validate the metric against a human-labeled sample. The paper reports that manual evaluation correlates well with E3 (section 3.3, pp. 5–6).

Verus form (Inference: the paper uses Lean and SMT, not Verus). The same architecture can compare a generated Verus specification against a reference by proving implication in a shared `spec` theory, but Verus does not provide this exact theorem-equivalence evaluator. Use `spec fn` predicates and lemmas with `ensures`; keep the SMT solver's result inside Verus's checked proof obligations. A failed implication should be reported as a counterexample or unproved obligation, not accepted as equivalent.

Evidence. GPT-4 with 5-shot prompting correctly autoformalized 18.9% of LeanEuclid theorems (section 1, p. 2). For proofs, GPT-4 achieved 18.8% and GPT-4V 23.1% correct on the reported LeanEuclid evaluation (section 4.2, pp. 9–10). The denominator is the benchmark's proof set; the paper's table reports percentages by dataset split and prompt setting. Approximate evaluation was manually checked on a sample of 86 predictions; the paper reports three cases judged equivalent despite E3 failure (section 4.1, pp. 8–9), so E3 is an aid rather than a complete oracle.

## technique 2: symbolic completion of diagrammatic gaps

What it is. Lean checks a model's explicit tactic sequence. If a tactic requires an unstated fact such as an intersection, the engine invokes non-construction rules (diagrammatic, metric, and transfer rules) and searches for a proof by refutation. The paper says: “Then, it attempts to fill in all gaps automatically using the symbolic reasoning engine based on SMT solvers.”

When to use it. Use this when source proofs rely on visual or conventional facts omitted from text. It permits the language model to formalize only explicit steps while a soundness-relevant engine derives implicit consequences.

How to apply. (1) Encode the diagram and theorem in E. (2) Let the model emit Lean tactics for textual steps. (3) Run Lean; when a premise is absent, create a gap goal. (4) Restrict symbolic search to non-construction rules. (5) Ask the SMT engine to prove the gap by contradiction. (6) Insert the generated fact and rerun Lean. The benchmark's Proposition 1 example uses an intersection relation inferred from two circles (sections 3.2–3.3, pp. 5–7).

Verus form (Inference). Represent geometry or program-state facts as `spec fn` predicates and expose only trusted, proved lemmas as gap-filling rules. A generated lemma must have a Verus proof; do not model an SMT answer as an `external_body` theorem unless it is explicitly part of the trusted base. For Rust systems, this pattern corresponds to an agent proposing missing invariants and Verus checking each lemma before integration.

Evidence and limits. The approach formalized all 48 Elements theorems and proofs in LeanEuclid while preserving Euclid's implicit reasoning (section 1, pp. 2–3). SMT results are not fully certified by Lean, and symbolic rules can be incomplete. Thus successful completion is evidence conditioned on E's axioms, SMT soundness, and the implementation of the bridge.

## technique 3: few-shot LLM autoformalization and repair

The authors prompt GPT-4 and GPT-4V with 0-, 1-, and 5-shot examples, a syntax overview, available axioms/helper theorems, an informal theorem and proof, and a target proposition. The model emits a sequence of Lean tactics; Lean checks it as-is. Incorrect proofs are manually repaired with as few edits as possible to estimate repair effort (section 4.2, pp. 9–10). Repairs include strengthening a theorem or rearranging tactics. Median similarity between GPT-4 outputs and repaired proofs was 61.7%; GPT-4V's was 64.0% for the reported UniGeo repair analysis.

Verus form (Inference). A VL agent can be prompted with verified Rust idioms, existing lemmas, and a target specification, then compile and verify generated code. Treat repair as a separate patch whose new proof obligations must pass Verus. Similarity to a repaired proof is a productivity measure, not evidence of correctness.

## what is proved and trusted

Lean proves accepted explicit tactics and the benchmark's manually formalized theorems. E3 measures semantic equivalence but may miss valid equivalences. SMT, E's axioms, Lean's trusted kernel, manually curated formalizations, and the model prompt remain trusted or partially trusted. The paper does not establish general autoformalization reliability; results are geometry-specific and low (18.8–23.1% proof success).

Inference: For VL, the paper's strongest reusable idea is a staged generate–check–repair loop: have an agent propose specifications and proof steps, run Verus, classify unproved obligations, and iterate. The threat is that an agent may fill an invariant gap with an untrusted assumption or exploit an overly broad external body. Product safeguards must keep every accepted gap represented by a proved lemma or an explicitly audited trusted axiom.

## techniques for the catalog

- semantic equivalence checking: compare generated and reference specifications by bidirectional implication and satisfiability
- SMT gap completion: discharge implicit diagram or state facts with restricted non-construction rules
- Lean/Verus checker loop: generate proof steps, run the kernel verifier, and repair only rejected obligations
- few-shot repair measurement: report as-is success and repaired-proof similarity with dataset denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
