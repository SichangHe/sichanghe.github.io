# LeetProof: certified synthesis with a multi-modal verifier
(authored by agents unless marked 🧑)

Source: [2604.16584v1](https://arxiv.org/abs/2604.16584v1); [saved full PDF](/ssd1/sichangheagent/vlpw/certified_synthesis.pdf). This study uses the full primary text, including appendices. Page numbers are printed PDF pages. Results are author reports unless labeled otherwise.

LeetProof separates specification validation, implementation/invariant generation and proof construction inside Lean. Its strongest reusable idea is to find cheap counterexamples before expensive proofs. The final proof establishes alignment with the accepted formal contract; testing and an LLM judge do not prove that contract matches intent.

## Verification design

Feng, Kafle, Gladshtein, Kurin, Pîrlea, Zhao, Müller and Sergey build on Velvet and Loom. §2.2, p. 3: “this implication is a machine-checked theorem”, referring to validity of generated verification conditions implying program correctness. Velvet is a Hoare-style imperative language embedded in Lean; state and control flow use monadic effects. Inference: the verifier’s condition-generation soundness is proved within the foundational framework, while the final Lean kernel and specification remain the assurance boundary.

§3.1, p. 4 generates specifications plus roughly ten input/output examples, type-checks them, uses an LLM judge, and tests three claims: input satisfies precondition, expected output satisfies postcondition, alternative outputs do not. A Boolean postcondition using implication instead of equivalence admits `false` vacuously; output mutation exposes this. §4.2, p. 6 limits uniqueness to deterministic intended outputs. Type-directed mutations flip Booleans, perturb/negate numbers, mutate or swap pair components, and edit/delete/insert collection elements. Inference: use intended-output membership instead of uniqueness when several answers are valid.

§3.1 explicitly says the testing tactic “admits the goal (i.e., inserts a sorry)” when no counterexample is found, but “not part of the final correctness certificate”. Recommendation: keep testing admissions outside the final theorem’s dependencies and audit that boundary. Passing tests is a filter, not a proof.

§4.1, p. 6 handles bounded existential variables by extracting inequality bounds and enumerating the finite range, with `grind`/`omega` supporting bounds. This extends testing to common array obligations; the authors do not claim to solve arbitrary existential testing.

§§3.2 and 4.3, pp. 5–7 generate executable imperative code, run concrete and random tests, then infer invariants. A generated test harness checks each invariant at loop entry and after every iteration, and checks the final postcondition. Lean metaprogramming lifts computations into a monad carrying random generation and error reporting, so failures report the invariant and concrete input. Surviving invariants remain unproved until the final stage. Termination measures are optional: §3.2 says Velvet supports both partial and total correctness. Recommendation: record which guarantee is selected for each result.

§3.3, pp. 5–6 generates ordinary Lean verification conditions, closes easy ones through SMT-assisted tactics and `grind`/`aesop`, and decomposes remaining goals using library search and helper lemmas. Hard residuals can go to Aristotle. Inference: verifier integration can expose small mathematical obligations to specialized provers rather than asking one model for the whole proof.

## Specification evidence and a counting problem

§5.1, p. 7 analyzes 188 of VERINA’s 189 tasks, excluding a custom-data-structure task. It attempts formal equivalence of generated/reference preconditions and postconditions, then manually inspects unresolved discrepancies. The six printed categories are “Equivalent (150)”, “Reference issues (16)”, “Precondition variations (14)”, “Ambiguous language (3)”, “Over-restrictive postconditions (2)”, and “Incorrect specifications (3)”. These sum to 188. The next paragraph nevertheless says “(169/188, 89.9%)” and “5/188 instances”. Arithmetic inference: categories 1–4 sum to 183, and category 6 says three, not five. The claimed 97.4% accuracy and the narrative of seven errors reduced to five cannot be reconciled from these counts alone. Preserve the reported claim, but do not use it as a resolved audited accuracy measure.

§5.2, p. 8 reports 13 VERINA and 18 CLEVER issues found by testing; additional equivalence analysis raises VERINA to 16/189. CLEVER has 18/161. Nine minutes of testing versus roughly eight hours of Aristotle equivalence checking are reported for the 13 VERINA issues. Authors report benchmark-maintainer responses; these were not checked independently here. Inference: reference benchmarks need semantic audits too, and detected issue counts are lower bounds, not complete defect rates.

## Synthesis results and limits

§6.1, p. 8 selects 50 easy/medium imperative LeetCode problems: 15 used in development and 35 additional evaluation problems, with complexity annotations manually checked. This excludes concurrent and I/O-heavy systems. §6.2 uses GPT-5.2 and a $5 budget per problem for code/proof, excluding shared specification generation. Velvet fully proves 28/50 versus direct Lean 17/50; held-out subset 23/35 versus 16/35. Partial proofs are 18 versus 30, and synthesis failures four versus three. Table 2 shows four tasks solved completely by direct Lean but only partially by Velvet. The imperative style is not uniformly easier.

§6.3, p. 9 gives extra Aristotle effort to residual proofs. It closes all 18 Velvet partials, and 23/30 direct-Lean partials. Arithmetic inference: totals after extra proving are 46/50 and 40/50, but these are not the original $5-budget results. The paper describes Aristotle as freely available with waiting delays; its extra resource cost is not equivalent to zero compute.

§6.4 replicates on 25 randomly sampled tasks with Opus 4.6: Velvet fully proves 10/25 versus seven for direct Lean. §7, pp. 9–10 notes fixed-budget/model effects and domain limits. Independent repetitions and comparable dollar accounting for specialist rescue would strengthen inference. Complexity annotations constrain synthesis, but this paper does not establish that every claimed runtime bound is formally proved.

## What VL can use and competitive overlap

Recommendations: test precondition coverage, known-good outputs and wrong-output rejection separately; mutate expected outputs near the correct answer; audit benchmarks and human references; make invariant failures executable and concrete; dispatch residual mathematical obligations; keep test-only admissions out of certificates. Preserve intended multiple outputs, termination requirements and resource constraints when selecting the contract.

Prior work supplies Lean, Loom, Velvet, Plausible, Hoare verification, invariant inference and specialist theorem provers. LeetProof contributes their staged combination and specification-testing infrastructure. §8, p. 10 notes “VERINA [67] also uses PBT”, but retrospectively and as a fallback rather than as an online synthesis filter. Testing contract adequacy itself therefore predates this paper. Existing [LeetProof study](../leetproof_20260804.md) and [specification notes](../topic_studies/formal_verification_rust/llm_for_verification/specifications.md) should be reused; this note adds the full-paper pipeline, evidence limits and count inconsistency.

Product inference: LeetProof demonstrates ordinary-language-to-certified-program synthesis in an embedded imperative Lean language, so that broad capability is occupied. It does not evaluate ordinary Rust/Verus repository generation. VL’s potential distinction is native Rust integration and auditable repository intent recovery, neither established merely by choosing Verus. Cheap semantic rejection and proved condition generation are comparison targets.

First reading: §§3.1–3.3 and §5.1. Ask which validation goals are admitted and which propositions the final certificate actually depends on.

## Study status

The full primary-text synthesis was checked against PDF text and independently reviewed. Local source links resolve. The full PDF was submitted to ChatGPT, but its eventual sequential resume returned `account_ui_retry_required` with `job_status: terminal`; no answer was obtained. [Recorded failure](/ssd1/sichangheagent/vlpw/certified_synthesis_poll3.json). This study therefore relies on primary-text reading, not an unchecked ChatGPT answer. No implementation experiment was run and no notes-navigation edit was made.
