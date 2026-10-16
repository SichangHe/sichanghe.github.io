# Faithful and Robust LLM-Driven Theorem Proving for NLI Explanations
(authored by agents unless marked 🧑)
Tag: `quan2025faithful`, [paper](http://arxiv.org/abs/2505.24264v1)

## what is proved

Quan et al. connect an LLM to Isabelle/HOL and automated theorem provers (ATPs) to check and repair natural-language inference explanations. An explanation `E` is valid when premises plus explanation entail the hypothesis, `p ∪ E ⊨ h` (Section 2, p. 3). The system, Faithful-Refiner, improves the translation into formal logic, tests contradictions and syntax, builds a proof sketch, and feeds failed proof steps back into the LLM. The paper's method “begins with a syntactic parsing step that guides LLMs in translating natural language elements into a formal specification compatible with theorem provers” (Section 3, p. 3).

## technique 1: parse before autoformalisation

Use this when natural-language explanations contain events, roles, conjunctions, or quantifiers that a direct few-shot translation may distort.

1. Parse each sentence into its grammatical structure and identify the main predicate-argument roles (Section 3.1, p. 3).
2. Map agent, event, and patient roles to Neo-Davidsonian predicates. The paper's “father and son kicked the ball” example becomes existential variables with `Father`, `Son`, `Ball`, `Kicked`, `Agent`, and `Patient` predicates (Section 3.1, p. 4).
3. Ask the LLM to produce Isabelle/HOL axioms for explanation sentences and a theorem whose assumptions are premises and whose conclusion is the hypothesis (Section 3.1, pp. 3–4).
4. Keep the generated theory `Θ=(A,τ)`, where `A` is the set of explanation axioms and `τ` is the premise-to-hypothesis theorem (Section 2, p. 3).

Verus form (Inference): use an explicit Rust/Verus ghost model for entities, events, and relations. A `spec fn` can map parsed facts to predicates; `requires` supplies premise facts and `ensures` states the inferred relation. Parsing and LLM translation remain untrusted input, so the Verus proof must check every generated fact.

## technique 2: critique quantifiers, syntax, and inconsistency

Run three checks before iterative proof search.

1. Quantifier critique: compare generated quantifier scope with the natural-language sentence and real-world knowledge. The authors warn that “incorrect quantifiers in axioms may still prove a theorem within a formal system” (Section 3.2, p. 4), so theorem-prover success alone is insufficient.
2. Syntax critique: send missing brackets and type-unification errors reported by Isabelle to the LLM, and refine the theory for up to five syntax iterations (Section 3.2, p. 4).
3. Consistency critique: construct `τFalse` by replacing the theorem conclusion with `False`; if ATP proves it, the axioms are contradictory, so ask the LLM to repair them (Section 3.2, p. 5).

Verus form (Inference): check generated quantifier scopes by requiring explicit ghost predicates and prove consistency lemmas before using them. A contradiction test can ask Verus to prove `false` from the proposed axioms; success identifies an inconsistent specification, not a valid program. Keep syntax/type errors at the compiler boundary.

## technique 3: derive logical relations and a proof sketch

Use this when a direct ATP call cannot find a proof and the LLM needs structured intermediate goals.

1. Extract propositions and relations from the explanation. In the paper's example, `A→B` and `B→¬C` are extracted from “it is raining”, “the grass is wet”, and “kids cannot play outside” (Section 3.3, p. 5).
2. Pass those relations to SymPy's propositional engine and derive consequences such as `A→¬C` (Section 3.3, p. 5).
3. Prompt the LLM to order the propositions and implications into a step-by-step proof sketch.
4. Replace each proof tactic in the sketch with an `<ATP>` placeholder, then ask Sledgehammer/ATP to prove the step. Figure 2 shows a failed step where the premises do not entail `People x ∧ Outside x` (Section 3.3, p. 4).
5. On failure, extract the failed step and the proof-strategy comments, add that detailed feedback to the next refinement prompt, and drop explanation sentences not used in the successful proof (Section 3.3, p. 5).

The paper uses Isabelle/HOL Sledgehammer to call CVC4 and Vampire; if any prover succeeds, the explanation is considered logically sound (Section 2, p. 3). Verus form (Inference): represent each proposition as a ghost boolean or relation and write one `proof fn` per sketch edge. Replace `<ATP>` with explicit `assert`/lemma calls and let Verus discharge the generated obligations. A Verus proof function is compile-time proof code, not a run-time call.

## evidence and denominators

The evaluation samples 100 instances each from e-SNLI, QASC, and WorldTree and compares four LLMs with Explanation-Refiner (Section 4.1, p. 5). Table 1's `Init.` is the percentage initially verified; `Final` is the percentage refined within ten iterations; `#Iter` and `#Calls` are averages per explanation, not percentages. For Deepseek-V3, the proposed method reaches 41%→95% on e-SNLI, 17%→90% on QASC, and 7%→73% on WorldTree, versus 25%→69%, 4%→38%, and 3%→31% for the baseline (Table 1, p. 6; each denominator is 100 instances for that dataset/model). Average LLM calls fall by 58.60%, 39.39%, and 31.15% on e-SNLI, QASC, and WorldTree across all models (Section 4.2, p. 6).

The ablation table shows why feedback matters. Removing detailed feedback lowers GPT-4o final refinement from 89% to 83% on e-SNLI and from 56% to 17% on WorldTree; removing syntax refinement lowers it to 74% and 24%, respectively (Table 2, p. 8; denominator 100 per dataset/model). Removing logical relations lowers Deepseek-V3 final refinement by 6, 13, and 15 percentage points on e-SNLI, QASC, and WorldTree (Table 2, p. 8). Human evaluation samples 100 Isabelle/HOL theories across all iterations for each LLM to count variable, implication, and quantifier errors (Table 2, p. 8).

## trust, limits, and Verus relevance

The theorem prover establishes entailment only for the generated formalization. LLM translation, quantifier choices, predicate meanings, SymPy derivations, Isabelle libraries, ATP soundness, and the natural-language-to-logic correspondence remain trusted or manually checked. The authors explicitly report that quantifier errors can survive formal proof and that LLM autoformalisation still has gaps in variables and quantifiers (Section 4.3, p. 8). The method is limited to NLI explanations and Isabelle/HOL; it does not verify Rust or ownership.

Inference: threat to VeruLaw is medium. The architecture transfers well to proof repair: parse Rust intent, generate a ghost specification, run Verus, extract the failed obligation, and regenerate only the missing lemma or invariant. The transfer is a design analogy, not a result measured by this paper. VL should retain Verus compilation as the acceptance criterion and log every repair iteration to prevent an LLM from silently changing the specification.

## techniques for the catalog

- syntax-guided autoformalisation: parse predicate-argument structure before producing theorem-prover formulas
- quantifier and consistency critiques: test scopes, syntax, and a `False` theorem before trusting entailment
- logical-relation proof sketches: derive propositional implications and turn them into ATP-checked intermediate steps
- detailed feedback repair: feed failed proof steps and unused axioms into bounded iterative explanation refinement
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
