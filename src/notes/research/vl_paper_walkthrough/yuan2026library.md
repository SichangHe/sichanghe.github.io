# Let the Library Speak: Self-Advertised Method Selection for Formal Proving
(authored by agents unless marked 🧑)
Tag: `yuan2026library`, [paper](https://www.semanticscholar.org/paper/08041a4b9e74e0c97e53e315d343304688150a76)

## what is proved or measured
The paper treats theorem-prover retrieval as applicability selection. A method is represented by prerequisites, a target, an action, and residual obligations, rather than by a similarity score alone. The abstract states, “A method has prerequisites, a target, an intended action, and obligations that its use leaves to prove.” (Abstract, p.1). The system, self-advertisement, asks every library contract to propose a concrete use for the current goal, gates unsupported proposals, and ranks the survivors.

The paper proves a conditional scaffold statement: if a parameterized Lean term has no holes and all its premises are proved, applying it yields a checked proof of its target (Proposition 1, Section 3.2, p.4). This is a proof about Lean’s checked scaffold under assumptions; it does not prove that the LLM proposal is applicable or that the target matches the user’s intent.

## technique 1: Method Contracts
what it is: a reusable two-sided record. The selection side describes a method, target class, prerequisites, prohibited uses, and a manifest of checked material. The execution side contains a Lean scaffold, worked instance, Mathlib anchors, hypotheses, and residual obligations (Section 4.3, p.6).

how to apply it:
1. extract methods from prior reference solutions and merge methods that play the same role (Section 4.3)
2. have a model draft both contract sides; authors review every extraction and merge (Section 4.3)
3. compile every execution-side scaffold with a pinned Lean and Mathlib environment
4. expose only the selection side to the selector; pass execution guidance to the prover after selection (Section 4.3)

The authors built 82 contracts from Putnam 2000–2014 solutions, and report that “All 82 contracts pass this check: each provides a scaffold stated for arbitrary parameters and a compiled worked instance.” (Section 4.3, p.6). A worked instance alone would not establish arbitrary-parameter soundness; the parameterized scaffold is what Proposition 1 covers.

Verus form: Inference: make a contract record for a Rust/Verus method with a selection description, `requires` conditions, an `ensures` target, a verified `proof fn` or `spec fn` scaffold, and residual proof obligations. Compile the scaffold against the pinned Verus toolchain and retain its exact assumptions. Verus checks the scaffold’s contract; it cannot check that a natural-language method description is complete.

## technique 2: self-advertisement and commitment gate
what it is: one batched model call makes each contract commit to a target, action, required facts, evidence, role, and score. The gate demotes vague or unsupported main nominations.

how to apply it:
1. provide the goal, local context, and all selection-facing descriptions in one call (Section 4.1, p.6)
2. require each contract to output a binding, concrete target, action, required facts, supporting checked material, an offer flag, role, and applicability score
3. accept a main nomination only when `oc ∧ Spec(tc) ∧ Spec(ac) ∧ (σc ≠ ∅)` holds; `Spec` requires concrete goal objects (Section 4.1)
4. demote failed main nominations to support and rank lexicographically by passing-main, other-offer, and no-offer tiers, then score

The paper says, “A commitment that is vague or unsupported cannot be checked.” (Section 4.1, p.6). This makes the selector output inspectable: a reader can see what the method would act on and which facts it assumes.

Verus form: Inference: ask a model to nominate a Rust expression, a target postcondition, and the facts needed to prove it. Implement a gate outside Verus that rejects nominations without concrete program objects or verified evidence. Feed accepted suggestions to the proof generator, but require Verus to discharge every `requires` and `ensures` obligation.

## technique 3: runoff for rank-one choice
what it is: self-advertisement optimizes shortlist coverage, but an optional pairwise runoff compares the leading proposals when only one contract can be supplied.

how to apply it:
1. rank all contracts with the commitment gate
2. choose a top-q window
3. make q−1 sequential calls, comparing each contract with the one above it and swapping when the lower proposal fits better (Section 4.2, p.6)
4. leave contracts outside the window unchanged

The runoff is a ranking heuristic, not a proof. It compares proposal quality with the same model backbone and therefore changes ordering rather than adding a stronger verifier.

Verus form: Inference: use pairwise comparison only to prioritize which lemma or proof scaffold an agent tries first. Re-run Verus after each attempt; a runoff score cannot establish a postcondition.

## technique 4: applicability-aware evaluation and contracts in a proof loop
The paper distinguishes annotated reference methods from semantic applicability. It measures hit@k (at least one annotated method in the first k) and recall@k (fraction of annotated methods in the first k), because a proof may need several methods (Sections 3.1 and 3.5, pp.3–5). Labels were proposed from official solutions and human checked before selectors ran (Section 5.1, p.7).

With GPT-5.6 Luna on 120 Putnam 2015–2025 problems, self-advertisement reaches hit@5 .950 (114/120) and the strongest reranker .842 (101/120); the table caption gives `n=120` (Table 1, p.7). On 60 IMO ProofBench problems it reaches .917 (55/60) without runoff and .933 (56/60) with runoff in the Luna block (Table 1, p.7). These percentages are fractions of problems, not proof-completion rates. The downstream experiment gives ten Lean compilations per problem: adding the top contract raises Putnam proving from 5.8% to 12.5% and IMO from 10.0% to 15.0% (Table 2, p.8; denominators are the 120 and 60 problems). The comparison supplies the whole contract, so the paper explicitly does not isolate selection from execution guidance.

## techniques for the catalog
- method contracts — store a method’s prerequisites, target, action, checked scaffold, and residual obligations as reusable selection and execution records
- self-advertisement with commitment gate — ask every method how it applies, then demote proposals lacking concrete targets, actions, or evidence
- pairwise runoff — compare the leading proposals directly when rank one matters more than shortlist coverage
- applicability metrics — evaluate retrieval with hit@k and recall@k against fixed, human-checked method labels and separate this from proof completion
