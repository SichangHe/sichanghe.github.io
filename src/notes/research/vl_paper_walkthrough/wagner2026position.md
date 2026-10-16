# Position: Natural Language Should Not Fully Replace Formal Languages
(authored by agents unless marked 🧑)
Tag: `wagner2026position`, [paper](https://doi.org/10.48550/arxiv.2607.20432)

## scope and result

The paper develops an information theoretic account of when a natural language request is cheaper than a formal specification. It defines task specificity as the information needed to make an output acceptable, and a translation gap as the cost of describing a domain in a general language. The central theorem gives a crossover: natural language can be efficient below a threshold, while formal specification is at least as efficient at or above it (Section 3.6, page 5). The paper's practical recommendation is a hybrid interface that uses natural language for high level intent and domain formalisms for exact constraints (Sections 4.1, 4.2, and 5, pages 6–8).

## technique 1: classify requirements on a specification ladder

What it is. Definition 2.1 separates four kinds of communication: overspecification, full specification, pragmatic underspecification, and indifferent underspecification (Section 2.2, page 2). Overspecification adds redundant or emphatic information; full specification states every relevant detail; pragmatic underspecification relies on context or an agent's judgment; indifferent underspecification leaves multiple outcomes equally acceptable. The paper states, “The key distinction between pragmatic underspecification and indifferent underspecification lies in whether the speaker has (possibly implicit) preferences about the underspecified properties.” (Section 2.2, page 3.)

When to use it. Use this classification before choosing an input format. A requirement whose omitted details may cause failure is pragmatic underspecification and needs clarification or an explicit contract. A requirement for which all outcomes are acceptable can remain indifferent and use a concise prompt. A requirement that fixes every relevant result belongs in a formal language.

How to do it. (1) List the output properties that matter to the user. (2) Mark each property as explicit, context-inferred, delegated to the implementer, or genuinely unconstrained, following the four cases in Definition 2.1. (3) Turn context-inferred properties into explicit constraints when a wrong choice would fail. (4) Keep genuinely indifferent properties unspecified. (5) Add redundancy only when it lowers error risk; the paper's example is “a cat, not a dog” (Section 2.2, page 2).

Verus form. Inference: represent properties that must hold with a Rust/Verus function contract, such as `requires` for caller assumptions and `ensures` for postconditions. Keep implementation choices unconstrained by omitting unnecessary postconditions. Inference: when an omitted property is actually safety-critical, make it a postcondition or an invariant instead of relying on model context. This maps the ladder to a proof boundary; the paper does not discuss Verus or Rust.

Evidence and limits. The ladder is a conceptual definition, not a benchmark. The paper supports it with linguistic accounts of pragmatic inference and examples, and warns that “Pragmatic underspecification introduces miscommunication risk.” (Section 2.2, page 3.) It assumes a shared context and a realizable task; contradictory intentions fall outside its formal framework (Section 3.2, page 4).

## technique 2: measure task specificity as information

What it is. The paper models a task as constraints over a meaning space M. Definition 3.4 defines specificity σϵ(T) as the minimal mutual information I(Y; Ŷ) such that the generated result Ŷ is acceptable with probability greater than 1−ϵ (Section 3.3, page 5). The paper explains, “When σ = 0, any output is acceptable, and when σ = H(Y ), only the exact intended output is acceptable.” (Section 3.3, page 5.)

When to use it. Use this measure when comparing a natural-language workflow with direct formal input. Low σ means a large equivalence class of acceptable results; high σ means that small deviations matter. Code prototypes, creative exploration, and rough visualizations tend toward low σ. Production behavior, edge cases, security properties, and exact artifacts tend toward high σ (Section 4.2, page 7).

How to do it. (1) Define the output space M. (2) State explicit and implicit constraints as indicator functions c:M→{0,1}. (3) Compute the acceptable set [[T]] as the outputs satisfying all constraints, as in Equation (1), Section 3.1, page 4. (4) Choose an error tolerance ϵ. (5) Estimate the information needed for Ŷ to land in [[T]] with probability above 1−ϵ. The paper's examples are “generate a poem” for low specificity and reproducing a particular image for maximal specificity (Section 3.3, page 5).

Verus form. Inference: use the acceptable set as a specification predicate over inputs and outputs, with `ensures` expressing membership in that predicate. Inference: a sequence of increasingly strict postconditions or invariants can operationalize a specificity sweep; Verus proves each chosen contract, but does not estimate mutual information. This is an engineering translation of the paper's metric, not a paper result.

Evidence and limits. The definition is mathematical and illustrated by examples; no empirical estimator or measured σ values are supplied. It assumes Y is an intended, realizable output and distinguishes that single instance from the set [[T]] (Section 3.2, page 4).

## technique 3: account for the translation gap

What it is. The translation gap is Δtrans = DKL(pM ∥ pNL), the KL divergence between the domain distribution and the natural-language distribution (Definition 3.5, Section 3.4, page 5). Equation (3) decomposes cross-entropy into domain entropy plus this gap. The paper states, “The translation gap quantifies the cost of using a general-purpose language to describe domain-specific content.” (Section 3.4, page 5.)

When to use it. Use the gap to decide whether a domain-specific notation is worth teaching. If the target domain has regularities that ordinary language encodes poorly, direct notation avoids the extra description length. If the task is open-ended and ordinary language matches the needed distribution, natural language can be compact.

How to do it. (1) Specify a domain distribution pM over outputs or requirements. (2) Specify the natural-language model pNL. (3) Calculate or estimate DKL(pM∥pNL). (4) Add the gap to the information σ that the request must convey; Proposition 3.8 gives LNL(σ) ≥ σ + Δtrans (Section 3.5, page 5). (5) Compare this cost with the formal encoding's entropy plus redundancy.

Verus form. Inference: estimate the gap empirically from prompt and specification corpora, then use the result to choose where a Verus API should expose typed constructors, predicates, or domain lemmas instead of prose. Inference: the measured gap can prioritize automation, but it cannot replace a Verus proof. The paper does not prescribe code or proof constructs.

Evidence and limits. The bound assumes no natural-language redundancy and a one-shot successful generation; the authors say iterative correction and overspecification can lower the crossover threshold (Remark 3.13, page 6). They also note a formal language can be less efficient if its redundancy exceeds the translation gap (Remark 3.11, page 6).

## technique 4: select a crossover and build a hybrid interface

What it is. Theorem 3.10 defines σ* = H(Y) + Rformal − Δtrans. Below σ*, natural language may be more efficient; at or above σ*, formal language is necessarily no worse under the theorem's assumptions (Section 3.6, page 6). The paper concludes, “As task specificity increases, more specification naturally shifts toward direct manipulation in the target domain, with natural language reserved for aspects where underspecification provides genuine value.” (Section 4.1, page 7.)

When to use it. Use a hybrid when a task has compositional parts with different specificity. The paper's image example combines a natural-language concept such as “professional business portrait” with sketches or masks for layout (Section 4.1, page 7). Its code example keeps loose code-related requirements in natural language while expressing outcome, edge-case, error-handling, optimization, and security requirements precisely (Section 4.2, page 7).

How to do it. (1) Split the task at compositional boundaries. (2) Assign low-specificity intent to natural language. (3) Encode high-specificity behavior in a formal language or direct artifact. (4) Iterate with feedback, converting repeatedly failed implicit assumptions into explicit constraints. (5) Evaluate both paths across low and high specificity, as recommended for code benchmarks in Section 5, page 8.

Verus form. Inference: put broad intent in comments or an API-level description, and encode the exact safety and functional obligations in Verus contracts, predicates, loop invariants, and proof functions. Inference: use Rust values, types, or test fixtures for constraints that are easiest to state directly, then prove the resulting implementation. Verus supports this split, but the paper provides no Verus experiment.

Evidence and limits. Image prompt studies are cited as empirical support: prompts become more verbose and adopt model-specific “magic words,” while negative prompts add constraints after failures (Section 4.1, page 6). The paper does not report a controlled crossover measurement. Its theorem assumes a one-shot setting, realizable tasks, and a formal encoding with known redundancy; iterative human effort and learning costs are discussed qualitatively (Remarks 3.13–3.14, page 6).

## what is proved, measured, and trusted

The paper proves the data-processing bound (Equation 2), the natural-language cost lower bound (Proposition 3.8), and the specificity-crossover theorem (Theorem 3.10), under its stated probability and encoding assumptions (Sections 3.2–3.6, pages 4–6). It illustrates the theory with white-noise images, where a 250×250 RGB image has 256^(3×250×250) possibilities and a 32-character vocabulary would require at least 300,000 characters under the paper's calculation (Section 4, page 6). The text-generation, code, audio, and image discussion is literature-backed but not a new controlled experiment by this paper.

Inference: the trusted core for a Verus product remains the chosen specification, the Rust/Verus verifier, its solver, and any external code or environment modeled by assumptions. The paper's information-theoretic equations do not prove that a user's intended requirement was captured. Inference: its threat to agent-written verified Rust is high for specification capture and moderate for proof generation: natural language can leave precisely the edge cases that a proof must constrain, while a formally proved but incomplete contract can still accept the wrong behavior.

## contradictions, arithmetic, and what VL should not redo

The paper states σ*=H(Y)+Rformal−Δtrans and then says the threshold is meaningful when Rformal<Δtrans (Remark 3.11, page 6). If Δtrans≤Rformal, the theorem still gives a threshold algebraically, but the interpretation that formal language wins at high specificity no longer follows; the authors explicitly qualify that case. The white-noise illustration's exponent and 300,000-character estimate are presented as an order-of-magnitude calculation, not an experimental denominator.

Inference: VL should not redo a generic argument that formal languages help at high specificity or that hybrid interfaces are useful; this paper already supplies that theorem and the supporting synthesis. VL should instead test the unmeasured engineering question: which Verus contract fragments are routinely omitted or discovered only after failed proofs, and how much repair effort hybrid prompts save.

## techniques for the catalog

- specification ladder: classify each requirement as overspecified, fully specified, pragmatically underspecified, or indifferent before choosing prose or a formal contract
- specificity measure: model acceptable outputs as a constrained set and estimate the information needed to reach it with a chosen error tolerance
- translation-gap accounting: add domain-to-language KL divergence to the information cost of a natural-language specification
- crossover hybridization: route low-specificity intent through natural language and high-specificity behavior through formal notation or direct artifacts
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
