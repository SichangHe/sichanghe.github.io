# Towards Language Model Guided TLA+ Proof Automation
(authored by agents unless marked 🧑)
Tag: `zhou2025language`, [paper](https://doi.org/10.48550/arxiv.2512.09758)
## scope and contribution

This paper presents LMGPA, a prompt-only system that asks an LLM to decompose a TLA+ obligation, while TLAPS checks each decomposition and supplies proofs for simple leaves. The paper states: “We present a language-model based approach to automating TLA+ proof construction.” (abstract, p.1) The target is hierarchical TLA+ proofs, whose intermediate claims are explicit. This is relevant to VL because it separates proposal from a verifier, but the source language and proof kernel are TLA+/TLAPS rather than Rust/Verus.

The benchmark has 93 mathematical theorems and 26 distributed-protocol inductiveness proofs (119 total; §4.2, p.11). The authors manually translated the mathematics into TLA+, so the measured task includes translation choices. They warn of possible training leakage from miniF2F, ProofNet and public protocol proofs (§4.2, p.11).

## technique: recursive hierarchical proof generation

What it is: Try a symbolic proof first; if it fails, use the LLM only to propose normalized subclaims, verify that their conjunction implies the parent with TLAPS, then recursively prove every child. The paper’s central description is: “Our Language Model Guided Proof Automation system (LMGPA) leverages the complementary strengths of LLMs and symbolic methods: we use LLMs for their reasoning abilities to decompose complex claims into simpler sub-claims, while relying on symbolic provers for rigorous verification and for proving simple claims.” (§3.2, p.8)

When to use it: Use this for a large TLA+ claim where OBVIOUS or a direct backend proof fails, but a human-readable hierarchy of lemmas can make each leaf easy for backend provers. It is unsuitable when no finite decomposition is found within the retry bound or TLAPS cannot discharge a valid implication.

How to apply it (paper steps):

1. Represent an obligation by its context and goal (§3.3, p.8)
2. Call `GenerateAutoProof`; if `VerifyProof` succeeds, return the proof (Algorithm 2, lines 2–5)
3. Otherwise ask the LLM for `DecomposeIntoSubclaims` and normalize the returned assumptions and one goal per subclaim (§3.4, p.9–10)
4. Build a temporary TLA+ module containing parent and children; run `VerifyDecomp` with TLAPS (Algorithm 2, lines 6–9; §3.6, p.10)
5. Retry decomposition up to four times in the evaluation, or return failure (Algorithm 2, lines 9–11; §4.3, p.12)
6. Recursively prove every child in the same context; any failed child fails the parent (Algorithm 2, lines 13–20)
7. Assemble the child proofs as a hierarchical TLA+ proof (Algorithm 2, line 21; §3.3, p.9)

The normalized output is a list of assumptions (Boolean expressions or definition references) and one goal. Prompt grammar restricts characters and notation; a parser converts the result to `ASSUME-PROVE` statements (§3.4, p.10). The paper’s exact claim is: “Our system parses these normalized claims and converts them into valid TLA+ ASSUME-PROVE statements, eliminating a significant source of syntax errors.” (§3.4, p.10)

Verus form (Inference: the paper does not use Verus): represent each child as a `proof fn` lemma with `requires` assumptions and `ensures` its goal; invoke child lemmas in a parent proof. Executable Rust remains unchanged. Use only supported Verus constructs documented in the local Verus study: `requires`, `ensures`, `proof fn`, `assert`, and `spec fn`. The decomposition implication must itself be discharged by Verus assertions or a lemma; an LLM-produced child is only a candidate until Verus verifies it. TLA+ `ASSUME-PROVE` syntax and TLAPS directives do not carry over.

Evidence: On 26 distributed protocols, LMGPA proved 42.3–50.0% depending on model, compared with SAPG 38.5% and direct LLM proof generation 0.0–15.4% (Table 1, p.13; denominator 26). On 93 mathematical theorems it proved 53.8–59.1%, compared with SAPG 49.5% and direct generation 0.0–29.0% (Table 1; denominator 93). GPT-5 LMGPA was 42.3% (11/26) and 58.1% (54/93); the table reports percentages, whose fractions follow from the benchmark denominators. Table 2’s “Total Combined” reaches 62.2% for GPT-5 across the combined 119-theorem suite, while its LMGPA column is 54.6% (the paper does not print the numerator).

A direct syntax comparison in Table 3 uses query denominators, not theorem denominators: GPT-5 direct proof syntax was 66/411 = 16.1%, versus LMGPA decomposition syntax 290/334 = 86.8%; o3-mini-high was 1/476 = 0.2% versus 252/337 = 74.8% (§4.4, p.14). These are validity of generated text, not proof success. The paper reports a 227-line distributed inductiveness proof, including 88 definition lines (§4.4, p.14).

Failure and assumptions: LLMs still produce redundant or circular decompositions; the paper gives a subclaim that restates the goal and another that is merely a contrapositive (§4.4, p.14). TLAPS can time out on a logically valid decomposition under its default 45-second per-obligation budget (Z3 5 s, Zenon 10 s, Isabelle 30 s; §4.3, p.12). LMGPA uses temperature zero, four decomposition attempts and four direct retries (§4.3). Retrieval augmentation was tried but “did not show sufficient improvements” (Appendix A.2, p.23). Proof quality is not human quality: “Some proofs, while logically valid, do not correspond to the most concise and natural way to prove the theorem.” (§4.4, p.14)

## technique: symbolic auto-proof synthesis

The system analyzes the TLA+ parse tree to identify definitions that must be unfolded. If none are needed it emits `OBVIOUS`; otherwise it emits `BY l1, l2, ... DEF d1, d2, ...`, where assumptions and definitions come from syntax analysis (§3.5, p.10). This is a deterministic fast path before an LLM call. In Verus (Inference), the analogue is selecting `assert`/`assert ... by` facts and calling lemmas that expose definitions; Verus does not accept TLA+ `BY` or `OBVIOUS`, and a `spec fn` is not executable.

The baseline establishes that this heuristic matters: SAPG proves 38.5% of distributed and 49.5% of mathematical theorems, while OBVIOUS alone proves 0.0% and 44.1%, respectively (Table 1, denominators 26 and 93). The paper’s proof is still conditional on TLAPS, backend provers and the TLA+ specification.

## technique: verifier feedback and normalized prompting

On a failed proof or decomposition, the system feeds TLAPS diagnostics back into the next LLM request (§3.4, §3.6). Appendix D instructs the model to return only a complete valid module or normalized subclaims, include needed `DEF` references, and check each proposed subclaim. This reduces syntax errors, but correctness remains verifier-mediated. In Verus (Inference), feed the verifier’s error text back to candidate lemma generation, then rerun `verus`; never treat model text as evidence.

## what is proved, trusted, and relevant to VL

TLAPS proves the generated TLA+ claims under its backend provers; the LLM is not trusted for soundness. The TLA+ translation of source theorems, benchmark selection, model APIs, parser, TLAPS implementation, backend solvers, and Verus/Rust analogue remain trusted or assumed. The paper explicitly notes leakage and provider-dependent timing, so the success rates are not a universal capability measure.

Inference: for agent-written verified Rust, the threat is medium. The architecture directly supports candidate lemma generation and mechanical rejection, but its measured domain is TLA+ and its decomposition can be vacuous or timeout-prone. VL should reuse the separation and verifier feedback, while requiring Verus to prove every generated `proof fn` and checking that contracts express the intended Rust behavior. Existing LMGPA already covers the basic proposal-validation-recursion pattern; VL should not claim that pattern as new.

## techniques for the catalog

- recursive hierarchical decomposition — recursively split a failed obligation into normalized children, verify the implication with TLAPS, and prove every child
- symbolic auto-proof synthesis — inspect definitions and emit `OBVIOUS` or `BY ... DEF ...` before asking an LLM
- normalized claim prompting — constrain LLM output to assumptions plus one goal and translate it into `ASSUME-PROVE`
- verifier-feedback retries — pass TLAPS errors to later candidate generations under bounded retries
Checked 2026-10-13: audit record zhou2025language; paper-study comparison complete; gate executed; experiments not rerun
