# Faithful and Robust LLM-Driven Theorem Proving for NLI Explanations
(authored by agents unless marked 🧑)
Tag: `quan2025faithful`, [paper](https://arxiv.org/abs/2505.24264v1)

## what is proved

Quan et al. connect an LLM to Isabelle/HOL and automated theorem provers (ATPs) to check and repair natural-language inference explanations. An explanation `E` is valid when premises plus explanation entail the hypothesis, `p ∪ E ⊨ h` (Section 2, p. 3). The system, Faithful-Refiner, improves the translation into formal logic, tests contradictions and syntax, builds a proof sketch, and feeds failed proof steps back into the LLM. The authors write, “we begin with a syntactic parsing step that guides LLMs in translating natural language elements into a formal specification compatible with theorem provers” (Section 3, p. 3).

## technique 1: parse before autoformalisation

Inference: use this when natural-language explanations contain events, roles, conjunctions, or quantifiers that a direct few-shot translation may distort.

1. Parse each sentence into its grammatical structure and identify the main predicate-argument roles (Section 3.1, p. 3).
2. Map agent, event, and patient roles to Neo-Davidsonian predicates. The paper's “father and son kicked the ball” example becomes existential variables with `Father`, `Son`, `Ball`, `Kicked`, `Agent`, and `Patient` predicates (Section 3.1, p. 4).
3. Ask the LLM to produce Isabelle/HOL axioms for explanation sentences and a theorem whose assumptions are premises and whose conclusion is the hypothesis (Section 3.1, pp. 3–4).
4. Keep the generated theory `Θ=(A,τ)`, where `A` is the set of explanation axioms and `τ` is the premise-to-hypothesis theorem (Section 2, p. 3).

Inference: a possible Verus adaptation would model entities, events, and relations in specifications, with premises in `requires` and the conclusion in `ensures`. A proof would establish the conclusion from those premises; it would not establish that the specifications faithfully describe the original text. This adaptation is not evaluated in the paper.

## technique 2: critique quantifiers, syntax, and inconsistency

Section 3.2 describes three checks before proof verification and refinement.

1. Quantifier critique: compare generated quantifier scope with the natural-language sentence and real-world knowledge. The authors warn that “incorrect quantifiers in axioms may still prove a theorem within a formal system” (Section 3.2, p. 4), so theorem-prover success alone is insufficient.
2. Syntax critique: send missing brackets and type-unification errors reported by Isabelle to the LLM, and refine the theory for up to five syntax iterations (Section 3.2, p. 4).
3. Consistency critique: construct `τFalse` by replacing the theorem conclusion with `False`; if ATP proves it, the formal context is inconsistent and the method asks the LLM to repair the axioms (Section 3.2, p. 5).

Inference: a possible Verus adaptation would review generated quantifier scopes and use compiler feedback to repair syntax and types. Attempting to prove `false` under proposed assumptions could expose inconsistency if it succeeds; failure would not establish consistency. The paper does not evaluate this adaptation.

## technique 3: derive logical relations and a proof sketch

The method constructs a proof sketch when the initial Sledgehammer call cannot find a proof (Section 3.3, p. 5).

1. Extract propositions and relations from the explanation. The example assigns `A` to “it is raining”, `B` to “the grass is wet”, and `C` to “kids can play outside”, with relations `A→B` and `B→¬C` (Section 3.3, p. 5).
2. Pass those relations to SymPy's propositional engine and derive consequences such as `A→¬C`. Algorithm 1 tests implications between distinct pairs of literals (atoms and their negations), retaining those entailed by the input and not equivalent to an initial implication (Section 3.3, p. 5; Algorithm 1, p. 14).
3. Prompt the LLM to order the propositions and implications into a step-by-step proof sketch.
4. Replace each proof tactic in the sketch with an `<ATP>` placeholder, then ask Sledgehammer/ATP to prove the step. Figure 2 shows failure to derive `People x ∧ Outside x` because premises are missing (Figure 2, p. 4; Section 3.3, p. 5).
5. On failure, extract the failed step and the proof-strategy comments and use them to prompt an updated explanation for the next iteration. Once a proof is found, retain only the explanation axioms used in it (Section 3.3, p. 5).

The paper uses Isabelle/HOL Sledgehammer to call ATPs, including CVC4 and Vampire; if any succeeds, the authors consider the explanation logically sound (Section 3, p. 3). Inference: a possible Verus adaptation would express intermediate goals as assertions and lemmas checked by Verus. The paper does not test this adaptation.

## evidence and denominators

The evaluation samples 100 instances each from e-SNLI, QASC, and WorldTree and compares four LLMs with Explanation-Refiner (Section 4.1, pp. 5–6). Table 1's `Init.` is the percentage initially verified; `Final` is the final percentage reported within a maximum of ten refinement iterations; `#Iter` and `#Calls` are the reported average iterations and LLM calls needed to refine an explanation. The caption does not specify how unsuccessful cases enter these averages. For Deepseek-V3, the proposed method reaches 41%→95% on e-SNLI, 17%→90% on QASC, and 7%→73% on WorldTree, versus 25%→69%, 4%→38%, and 3%→31% for the baseline (Table 1, p. 6; each denominator is 100 instances for that dataset/model). Average LLM calls fall by 58.60%, 39.39%, and 31.15% on e-SNLI, QASC, and WorldTree across all models (Section 4.2, p. 6).

The ablation table shows why feedback matters. Removing detailed feedback lowers GPT-4o final refinement from 89% to 83% on e-SNLI and from 56% to 17% on WorldTree; removing syntax refinement lowers it to 74% and 24%, respectively (Table 2, p. 8; denominator 100 per dataset/model). Removing logical relations lowers Deepseek-V3 final refinement by 6, 13, and 15 percentage points on e-SNLI, QASC, and WorldTree (Table 2, p. 8). Human evaluation samples 100 Isabelle/HOL theories across all iterations for each LLM to count variable, implication, and quantifier errors (Table 2, p. 8; Table 3, p. 15). Removing quantifier refinement does not consistently lower formal verification rates, but the authors report increased quantifier errors in human evaluation (Section 4.3, p. 9).

## trust, limits, and Verus relevance

The authors warn that incorrect quantifiers can still permit a formal proof (Section 3.2, p. 4) and report remaining gaps in variables and quantifiers (Section 4.3, p. 9). Their limitations state: “First, LLMs can still introduce variable inconsistencies, erroneous implications, and incorrect quantifiers that are not fully resolved by automated checking.” (Limitations, p. 10).

Inference: a successful proof establishes entailment for the generated formalization; it does not establish the natural-language-to-logic correspondence. Failure to prove `False` likewise does not certify consistency. The experiments support NLI explanation refinement with Isabelle/HOL, not a measured result about Rust or ownership verification.

## techniques for the catalog

- syntax-guided autoformalisation: parse predicate-argument structure before producing theorem-prover formulas
- quantifier and consistency critiques: test scopes, syntax, and a `False` theorem before trusting entailment
- logical-relation proof sketches: derive propositional implications and turn them into ATP-checked intermediate steps
- detailed feedback repair: use failed proof steps and proof-strategy comments to refine explanations; prune axioms unused in a successful proof
