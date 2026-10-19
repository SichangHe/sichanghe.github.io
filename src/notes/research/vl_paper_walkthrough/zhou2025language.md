# Towards Language Model Guided TLA+ Proof Automation
(authored by agents unless marked 🧑)
Tag: `zhou2025language`, [paper](https://arxiv.org/abs/2512.09758v2)
## scope and contribution

This paper presents LMGPA, a prompt-only system that asks an LLM to decompose a TLA+ obligation, while TLAPS checks each decomposition and supplies proofs for simple leaves. The paper states: “We present a prompt-based approach that leverages LLMs to guide hierarchical decomposition of complex proof obligations into simpler sub-claims, while relying on symbolic provers for verification.” (abstract, p.1) The target is hierarchical TLA+ proofs, whose intermediate claims are explicit.

The benchmark has 93 mathematical theorems and 26 distributed-protocol inductiveness proofs (119 total; §4.2, p.11). The authors manually translated selected mathematical theorems into TLA+: “As these collections lack TLA+ formalizations, we manually translated a curated subset of these theorems into TLA+” (§4.2, p.11; excerpt). Inference: the measured task depends on those translation choices. They warn: “We acknowledge the potential for data leakage in our benchmark.” (§4.2, p.11) This warning covers miniF2F, ProofNet and public protocol proofs.

## technique: recursive hierarchical proof generation

What it is: Try a symbolic proof first; if it fails, use the LLM only to propose normalized subclaims, verify that their conjunction implies the parent with TLAPS, then recursively prove every child. The paper’s central description is: “Our Language Model Guided Proof Automation system (LMGPA) leverages the complementary strengths of LLMs and symbolic methods: we use LLMs for their reasoning abilities to decompose complex claims into simpler sub-claims, while relying on symbolic provers for rigorous verification and for proving simple claims.” (§3.2, p.8)

Inference: use this for a TLA+ claim where symbolic auto proof generation fails and intermediate lemmas could make the obligations easier for backend provers. A valid decomposition alone does not ensure success: TLAPS must verify the implication and every child must be proved.

How to apply it (paper steps):

1. Represent an obligation by its context and goal (§3.3, p.8)
2. Call `GenerateAutoProof`; if `VerifyProof` succeeds, return the proof (Algorithm 2, lines 2–5)
3. Otherwise call `DecomposeIntoSubclaims`: prompt the LLM for normalized assumptions and one goal per subclaim, then parse them into TLA+ (§3.4, pp.9–10)
4. Build a temporary TLA+ module containing parent and children; run `VerifyDecomp` with TLAPS (Algorithm 2, lines 6–9; §3.6, p.10)
5. Allow at most four decomposition attempts per claim in the evaluation; return failure if none passes verification (Algorithm 2, lines 9–11; §4.3, p.12)
6. Recursively prove every child in the same context; any failed child fails the parent (Algorithm 2, lines 13–20)
7. Assemble the child proofs as a hierarchical TLA+ proof (Algorithm 2, line 21; §3.3, p.9)

The normalized output is a list of assumptions (Boolean expressions or definition references) and one goal. Prompt grammar restricts characters and notation; a parser converts the result to `ASSUME-PROVE` statements (§3.4, p.10). The paper’s exact claim is: “Our system parses these normalized claims and converts them into valid TLA+ ASSUME-PROVE statements, eliminating a significant source of syntax errors.” (§3.4, p.10)

Inference: a Verus adaptation could represent each child as a `proof fn` lemma with `requires` assumptions and an `ensures` goal, then invoke the child lemmas in the parent proof. Verus would need to verify both the child proofs and their sufficiency for the parent. The paper does not implement or evaluate this adaptation.

Evidence: On 26 distributed-protocol inductiveness proofs, LMGPA proved 38.5–50.0% depending on model, compared with SAPG 38.5% and direct LLM proof generation 0.0–15.4% (Table 1, p.13; denominator 26). On 93 mathematical theorems it proved 53.8–59.1%, compared with SAPG 49.5% and direct generation 0.0–29.0% (Table 1; denominator 93). GPT-5 LMGPA was 42.3% and 58.1%. Inference: these percentages correspond to 11/26 and 54/93 using the benchmark denominators. Table 2’s “Total Combined” (the union of SAPG, DLPG and LMGPA successes; §4.4, p.12) reaches 62.2% for GPT-5 across the combined 119-theorem suite, while its LMGPA column is 54.6% (the paper does not print the numerator).

A direct syntax comparison in Table 3 uses query denominators, not theorem denominators: GPT-5 direct proof syntax was 66/411 = 16.1%, versus LMGPA decomposition syntax 290/334 = 86.8%; o3-mini-high was 1/476 = 0.2% versus 252/337 = 74.8% (§4.4, p.14). The authors specify: “For DLPG, we evaluated the full proofs, whereas for LMGPA, we evaluated the decompositions (sub-claims).” (§4.4, p.13) These syntax rates do not measure proof success. The paper reports a 227-line distributed inductiveness proof, including 88 definition lines (§4.4, p.14).

Failure and assumptions: the paper reports redundant subclaims and decompositions that do not simplify the goal. Its Figure 6 uses L2, the contrapositive of the goal; the discussion calls this same subclaim a restatement of the goal (§4.4, pp.13–15). The caption states: “Theorem L2 is the contrapositive of the target theorem, making the implication (L1 ∧ L2 ⇒ exercise_18_4) trivially valid.” (Figure 6, p.15) TLAPS can time out on a logically valid decomposition under its default 45-second per-obligation budget (Z3 5 s, Zenon 10 s, Isabelle 30 s; §4.3, p.12). The evaluation uses temperature zero for all LLM calls, at most four decomposition attempts per claim for LMGPA, and at most four retries per obligation for the direct-generation baseline (§4.3, p.12). Retrieval augmentation was tried: “While this approach did not improve success rates in our preliminary experiments, we document it here for completeness.” (Appendix A.2, p.22) Proof quality is not human quality: “Some proofs, while logically valid, do not correspond to the most concise and natural way to prove the theorem.” (§4.4, p.14)

## technique: symbolic auto-proof synthesis

The system analyzes the TLA+ parse tree to identify definitions that must be unfolded. If none are needed it emits `OBVIOUS`; otherwise it emits `BY l1, l2, ... DEF d1, d2, ...`, where assumptions and definitions come from syntax analysis (§3.5, p.10). The paper says: “The GenerateAutoProof function employs a heuristic approach to efficiently handle simple claims without querying LLMs.” (§3.5, p.10) Inference: a Verus analogue could try selected assertions and existing lemmas before requesting new lemmas from an LLM.

The baseline establishes that this heuristic matters: SAPG proves 38.5% of distributed and 49.5% of mathematical theorems, while OBVIOUS alone proves 0.0% and 44.1%, respectively (Table 1, denominators 26 and 93). Inference: these results establish success for the supplied TLA+ specifications under the TLAPS verification procedure.

## technique: verifier feedback and normalized prompting

On failed verification, the system feeds TLAPS output back into the next LLM request: “When TLAPS verification fails, our system feeds back the verifier’s output to the LLM, allowing it to generate improved sub-claims in subsequent attempts.” (§3.4, p.10) Appendix D.1 requests a complete module and necessary `DEF` references for direct proof generation (pp.27–28). Appendix D.2 requests normalized subclaims and asks the model to check their validity for LMGPA (pp.28–30). Inference: a Verus adaptation could pass verifier errors into later lemma requests and verify each revision.

## techniques for the catalog

- recursive hierarchical decomposition — recursively split a failed obligation into normalized children, verify the implication with TLAPS, and prove every child
- symbolic auto-proof synthesis — inspect definitions and emit `OBVIOUS` or `BY ... DEF ...` before asking an LLM
- normalized claim prompting — constrain LLM output to assumptions plus one goal and translate it into `ASSUME-PROVE`
- verifier-feedback retries — pass TLAPS errors to later candidate generations under bounded retries
