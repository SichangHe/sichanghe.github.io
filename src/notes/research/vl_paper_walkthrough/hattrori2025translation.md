# Natural Language Translation of Formal Proofs through Informalization of Proof Steps and Recursive Summarization along Proof Structure
(authored by agents unless marked 🧑)
Tag: `hattrori2025translation`, [paper](https://arxiv.org/abs/2509.09726)

## what the paper does

This paper translates Lean 4 formal proofs into readable natural-language proofs. Its method combines a premise library, rule-based templates for each tactic, LLM slot filling, dependency analysis, and recursive summarization (Sections 1 and 4, pp. 1–5). The input is an existing formal proof. The authors state: “The generated natural language proofs must accurately reflect the logical structure expressed in the formal proofs, and furthermore, must correctly capture the essential points of the proof to avoid logical leaps or breakdowns.” (Section 1, p. 2.)

Inference: this is useful for VeruLaw when an agent has produced a verified Rust/Verus proof but a reviewer needs a structured explanation. Inference: the generated prose must remain subordinate to the checked proof because the paper evaluates correspondence to formal steps, not whether an explanation itself is a proof artifact.

## technique 1: build a premise library from the formal library

What it is. The method first converts definitions and theorems in Lean and Mathlib into natural-language descriptions. The library is generated module by module: extract declarations, compute module dependency levels, and prompt an LLM to explain declarations in increasing level order while supplying already-generated explanations for dependencies and three same-module or same-field few-shot examples (Section 4.1, pp. 3–4). The paper’s example describes the absolute-value triangle inequality as: “This theorem states that in a linearly ordered additive group, the absolute value of the sum of the two elements is less than or equal to the sum of their absolute values, embodying the triangle inequality.” (Section 4.1, p. 4.)

How to apply it.

1. Extract all theorem and definition declarations from the formal library (Section 4.1, p. 3).
2. Build dependency levels from imported modules; a module may depend on lower levels but not higher levels (Section 4.1, p. 3).
3. Generate an explanatory sentence for each declaration starting at the smallest level (Section 4.1, p. 4).
4. When a declaration depends on an earlier explanation, include that explanation in the prompt; add three random same-module or same-field examples (Section 4.1, p. 4).
5. Store the resulting descriptions for later step informalization and summarization (Section 4.1, p. 4).

Verus form. Inference: construct an explanation index from Verus specifications and proof lemmas, keyed by module and declaration. Use names and signatures as context for prose, while retaining the actual Verus source as authoritative. Inference: this is a documentation layer; it does not change `spec fn`, `requires`, `ensures`, `invariant`, or proof code. The paper is Lean-specific and does not report a Verus implementation.

Evidence and limits. The premise library plus templates produced 89.05% “Correct” step explanations on the paper’s manual evaluation, versus 83.09% with templates but no library; the denominator is all 1,242 evaluated proof steps (Table 1, p. 7; Section 5.2, p. 6). Inference: the LLM-generated descriptions are trusted inputs to later prompts; the paper does not describe checking their prose with Lean. Inference: a wrong description can make a later explanation misleading while leaving the formal proof unchanged.

## technique 2: extract proof-state and tactic data

What it is. The authors extend LeanDojo to extract three data classes: tactic information (type, arguments, and proof-state changes), premise information (names and types of referenced declarations), and an abstract syntax tree representing dependencies between tactics, variables, and other proof elements (Section 4.2, p. 4). Proof states are represented as hypotheses together with a goal, written `hypotheses ⊢ goal` (Section 4.3, p. 4).

How to apply it.

1. For each tactic application, capture its type and arguments and the proof state before and after (Section 4.2, p. 4).
2. Record referenced theorem and definition names and types as premise information (Section 4.2, p. 4).
3. Obtain the AST from the theorem prover’s internal data structure (Section 4.2, p. 4).
4. Pass these values to template selection and dependency analysis (Sections 4.3–4.4, pp. 4–5).

Verus form. Inference: collect the Rust/Verus function body, specification clauses, proof calls, and verifier diagnostics into a structured trace. Treat each proof obligation as a goal and each assertion or lemma application as a transition. Inference: Verus syntax differs from Lean tactics, so a translator must define which constructs count as proof steps; this paper does not provide that mapping.

Evidence and limits. The paper gives a concrete Lean example: `intro` introduces `r1`, `r2`, `h1`, and `h2`; `have` creates an intermediate equality; three `rw` tactics rewrite it; `exact` closes the proposition (Section 3, p. 3, Figure 2). Inference: this example does not establish that extraction handles every Lean tactic or macro.

## technique 3: template-constrained, premise-aware informalization

What it is. For each tactic, manually prepared templates describe the operation and expose slots such as `[theorems]`, `[assumptions]`, `[goalsBefore]`, and `[goalsAfter]`. The LLM fills these slots using extracted data, retrieved premise-library descriptions, and manually created few-shot examples for each tactic operation (Section 4.3, pp. 4–5). For `rw`, templates distinguish rewriting a goal, a hypothesis, or both and using theorems, hypotheses, or both (Section 4.3, p. 4). The example templates are: “By using [theorems], [goalsBefore] becomes [goalsAfter].” and “By using [assumptions], [goalsBefore] becomes [goalsAfter].” (Section 4.3, p. 4.)

How to apply it.

1. Extract the tactic and before/after goals (Section 4.3, p. 4).
2. Select a branch whose operation matches the tactic and its operands, such as theorem-based or hypothesis-based rewriting (Section 4.3, p. 4).
3. Retrieve natural-language descriptions for referenced declarations from the premise library (Section 4.3, p. 5).
4. Add a manually authored few-shot example with the same operation type (Section 4.3, p. 5).
5. Ask the LLM to fill only the template slots and produce the step explanation (Section 4.3, pp. 4–5).

Verus form. Inference: use templates tied to Verus events such as introducing a quantified fact, applying a proof lemma, changing a goal with `assert`, or invoking a specification. Keep source expressions and verifier state in slots, and have the model explain their relation. Inference: template constraints reduce omitted context but cannot establish that the prose is true; the Verus verifier remains the authority.

Evidence. On 1,242 steps from 38 formal proofs, templates with the premise library yielded 89.05% Correct, 5.15% Misinformation, 1.50% Insufficient Information, 3.87% Unnecessary Mention, and 0.40% Untranslated Expression (Table 1, p. 7). The percentages use the same 1,242-step denominator. Removing templates reduced Correct to 53.95% with the library and 53.22% without it (Table 1, p. 7). The 38 proofs comprise 17 textbook proofs plus 21 lemmas (Sections 5.1–5.2, p. 6). The authors report McNemar tests at α=0.05; all pairwise comparisons were significant except the two no-template conditions (Section 5.2, p. 6; Appendix C, pp. 11–12). Their explanation for increased Misinformation with templates is that “necessary content such as references to specific variables and hypotheses, and reference to an already-proven theorem is significantly shorter when the templates are not used, consequently decreasing incorrect information.” (Section 5.2, p. 6.)

The categories are assigned in order: untranslated syntax, misinformation, insufficient information, unnecessary mention, then Correct (Figure 5, p. 6). Inference: the error percentages describe the first applicable category, not independent rates for every defect. The authors also warn: “However, identifying all possible operations a tactic can perform and creating appropriate few-shot examples for them is extremely time-consuming.” (Appendix A.1, p. 11.)

## technique 4: dependency-tree construction and recursive summarization

What it is. The AST is converted to a tree with the proposition as root and proof-step explanations as descendants. Steps proving an intermediate goal, such as those under `have`, become children of that intermediate step (Section 4.4, p. 5). The summarizer first informalizes the root proposition, then recursively generates a sub-proof for each subtree, summarizing child sub-proofs into the parent until one proof remains (Section 4.5, pp. 5–6).

How to apply it.

1. Attach each step explanation to the AST node representing that step (Section 4.4, p. 5).
2. Make the proposition being proved the tree root and make intermediate-goal steps parents of their supporting steps (Section 4.4, p. 5).
3. Generate an informal statement of the root proposition with a separate prompt, three manually created examples, and explanations of definitions used in the proposition (Section 4.5, p. 5).
4. Summarize the smallest subtrees first, then include each resulting sub-proof when summarizing its parent (Section 4.5, p. 5).
5. Continue until the root has one natural-language proof (Section 4.5, p. 5).

Verus form. Inference: build a dependency tree from Verus proof blocks, lemma invocations, assertions, and loop-invariant obligations. Summarize each invariant-preservation subtree before the function-level proof. Inference: this can make long proofs reviewable, but the tree is explanatory metadata; it does not replace Verus checking.

Evidence. The summarization experiment used 17 paired formal/natural-language proofs and an average of 6.4 manually defined criteria per proof (Section 5.3, p. 7). The score is `(count(correct) + 0.5 × count(partial)) / (count(correct)+count(partial)+count(not captured))`, with denominator equal to all criteria across 17 proofs (Section 5.3, p. 7). Recursive summarization scored 0.857 from counts 87 correct, 11 partial, and 10 not captured; non-recursive scored 0.833 from 85, 10, and 13 (Table 2, p. 7). Inference: each condition has 108 criterion ratings, obtained by summing its three counts. The comparison removes both dependency-structure analysis and recursive summarization (Section 5.3, p. 7). The authors report that four of 17 non-recursive outputs contained reasoning absent from the original proof or substantial logical inconsistencies, while recursive outputs showed no such significant deviations in close inspection (Section 5.3, pp. 7–8).

Inference: recursively bounded context may reduce invented reasoning, but the evaluation is manual and small. The authors say the example without recursion “fails to mention that” `inf P ≥ 0` (Section 5.3, p. 8). However, Figure 7 explicitly says “Coupled with the prior conclusion that” followed by that inequality, without earlier deriving it. Inference: the example asserts the inequality without establishing it, rather than omitting it entirely. The authors describe the recursive example as capturing the original flow with some redundancy (Section 5.3, p. 8). They also acknowledge that simple proof structures can leave trivial details in the output and propose explicitly marking information to retain (Appendix A.2, p. 11).

## what is checked, trusted, and measured

Lean provides the source-proof verification system, and Mathlib is its formal mathematics library (Section 3, pp. 2–3). GPT-4.1-mini (`gpt-4.1-mini-2025-04-14`) generates step explanations and summaries at temperature 0.4 and 1.0 respectively (Section 5.1, p. 6). The step evaluation was manual: “The evaluation was performed manually by the first authors, who holds a degree in applied mathematics, following the procedure shown in Figure 5.” (Section 5.2, p. 6; wording as printed.) It assessed accuracy, sufficiency, necessity, and appropriateness of translation. The summary evaluation used key-point criteria manually derived from original natural-language proofs (Section 5.3, p. 7; Appendix D, p. 12). Inference: explanation quality depends on the formal proof, extracted AST and states, templates and examples, premise-library descriptions, and evaluation criteria. Inference: for Verus, checking a program additionally depends on its specification, verifier, solver, Rust compiler, proof erasure, and external-library contracts.

The paper’s Mathlib demonstration translates a proof of infinitely many primes by explaining the smallest prime factor of `n!+1`, divisibility, and contradiction (Section 5.4, pp. 8–9). Appendix E (pp. 12–14) adds examples about the interior of a closed ball, Heron’s formula, and IMO 1972 Q5. The conclusion describes “proofs that capture 86% of the key points.” (Section 6, p. 9.) Inference: 86% rounds the weighted 0.857 score from the 17 textbook proofs; it is not a separately reported Mathlib score or a claim of complete semantic coverage.

The paper assumes formal proofs already exist and are structurally extracted. It does not measure whether prose can be compiled back into a proof, whether explanations preserve every side condition, or whether an adversarial model can make a checked proof sound wrong. Inference: threat to agent-written verified Rust is moderate for review quality: misleading explanations can cause a human to miss a specification gap, while the formal proof itself remains checked. The threat is higher if downstream automation treats generated prose as an authority.

The paper presents premise-aware extraction, tactic templates, AST dependency trees, and recursive proof summarization. Inference: VL should not claim these as new generic ideas. Inference: a useful Verus contribution would measure whether the same pipeline preserves ownership, borrowing, loop invariants, and external API assumptions, with independently checked links from each sentence to a proof-state transition.

## techniques for the catalog

- premise-library construction: precompute natural-language descriptions of formal declarations in dependency order for later prompts
- proof-state extraction: capture tactic or proof-step data, premises, before/after goals, and an AST of dependencies
- template-constrained informalization: select operation-specific templates and fill premise and goal slots with an LLM
- recursive dependency summarization: summarize proof subtrees bottom-up so each parent receives coherent child summaries
- manual explanation audit: assign ordered step-error categories and score summary key points as correct, partial, or absent/incorrect
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To verify the effectiveness of recursive summarization, we generated two sets of summaries, with and without the dependency structure analysis and recursive summarization."): checked the entire paper text, study quotations, numbers, section and page references, method steps, evaluation design, limitations, and arXiv link; corrected page references, the template-error explanation, average criterion count, evaluation attribution, the infimum example discrepancy, and the scope and denominator of the 86% result; did not run the authors’ code, reproduce experiments, or independently check the Lean or proposed Verus proofs.
