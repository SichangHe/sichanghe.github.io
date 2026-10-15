# Magenta: Closing the Loop Between Mathematical Reasoning and Lean Verification
(authored by agents unless marked 🧑)
Tag: `leang2026magenta`, [paper](http://arxiv.org/abs/2609.11319v2)

## scope and result
M AGENTA is a training-free pipeline that starts with a natural-language mathematics problem, generates an informal answer, autoformalizes that answer into Lean 4, proves the generated statement, and checks whether the statement still represents the original problem. Its central design separates mathematical mistakes from proof-script mistakes. The paper states: “M AGENTA closes this gap by attributing verification failures to the responsible component and routing the resulting feedback accordingly” (§2, p. 2). The five components are a reasoner, formaliser, prover, deterministic Lean/SafeVerify verifier, and a learned statement/error judge (§2.1, pp. 2–3).

Table 1 covers 93 problems across AIME 2025, AIME 2026, and HMMT February 2026. With Magenta, K2-Horizon-7B, K2-Horizon-375B, Qwen3.8-27B, and GPT-5.6-Sol each reach 100.00% overall; the underlying standalone overall rates are 74.19%, 84.95%, 91.40%, and 84.95% respectively (Table 1, p. 5). A separate six-problem IMO 2026 run gives K2-Horizon-7B plus Magenta all six solved (§3.2, p. 5). These are Lean outcomes, not evidence about Verus.

## technique: statement adjudication (closing the autoformalization gap)

what it is and when to use it

A Lean proof proves only the generated statement. Magenta therefore checks both elaboration and semantic fidelity before spending proof effort. The paper warns: “Vp (s, π) = ⊤ entails that π is a valid proof of s, but this does not imply that s faithfully represents the original problem q and answer a” (§2.3, p. 4). Use this whenever a model must translate natural language into a formal contract or theorem.

how to apply it

1. The reasoner samples an informal chain `c` and candidate answer `a` from problem `q` (§2.1, p. 2; Algorithm in Appendix A, p. 16).
2. The formaliser samples a Lean statement `s` whose hypotheses encode `q` and whose conclusion asserts `a` (§2.1, p. 3; §2.2 Step 2.a, p. 3).
3. Run Lean elaboration with `Vs`; discard statements that do not elaborate (§2.2 Step 2.b, p. 3).
4. Give an elaborated statement, the original problem, and answer to statement judge `Js`; accept only a faithful statement (§2.2 Step 2.c, p. 3).
5. Pass the accepted statement to the prover. If the statement budget is exhausted, fail that reasoning pair rather than silently proving an unfaithful claim (§2.2, p. 3).

The ablation quantifies why this matters. On AIME 2026 with the Goedel formaliser, with `Js`, verified coverage (`Ver`) is 63.3%, correct certified coverage (`VerCor`) 63.3%, and false-certification rate (`FCR`) 0.0%. Without `Js`, the corresponding fractions are 36.7%, 20.0%, and 45.5% (Table 3, p. 8). The paper defines FCR as `1 − VerCor/Ver` (§4.3, p. 8); 1−20.0/36.7 ≈45.5%, consistent after rounding.

Verus form (Inference:)

Treat the generated Rust `requires`/`ensures` contract as a candidate statement, then have a separate judge compare it with the natural-language requirement and intended answer before invoking Verus. Compile and verify the accepted contract, but retain the contract text and judge decision as artifacts. Verus can establish the contract it receives; it cannot decide whether that contract captures the product requirement. The judge is therefore a semantic alignment layer, not a replacement for Verus.

limits

`Js` is learned, so its fidelity is not kernel-guaranteed. The paper calls the output a “soft certificate: formally sound with respect to s, but only as relevant to q as the generated statement is faithful” (§2.3, p. 4). Inference: VL must independently review security-sensitive contracts and should test adversarial under-specification; accepting a judge label alone leaves the same gap.

## technique: error attribution and routed correction

what it is and when to use it

After a proof fails, error judge `Je` labels the failure `MATH` (the reasoning or answer is false/insufficient) or `SYNTAX` (the Lean implementation is wrong). The paper gives the routing rule: “A S YNTAX label preserves (c, a, s) and uses the diagnostic to repair the Lean proof, whereas a MATH label constructs φ ∈ Fmath and returns control to the reasoner” (§2.3, p. 4).

how to apply it

1. Generate a proof `π` from `(q,c,s)` and verify it with `Vp` (§2.2 Steps 3–4.a, p. 4).
2. If it fails, submit the complete context and Lean diagnostic to `Je` (§2.2 Step 4.b, p. 4).
3. On `SYNTAX`, keep the reasoning chain, answer, and statement fixed; call the prover again with the diagnostic (§2.2 Step 4.b, p. 4).
4. On `MATH`, package the failed attempt and diagnostic into `φ`, call the reasoner for a new chain/answer, and restart statement generation (§2.2 Step 1, p. 3; Step 4.b, p. 4).
5. Stop on a verified proof or when reasoner (`T`), statement (`M`), or proof (`K`) budgets are exhausted (Appendix A, pp. 16–17).

The comparison isolates diagnostic conditioning. On AIME 2026, independent resampling with K2-Horizon-7B verifies 29/30 (96.7%), while self-correction verifies 30/30. On IMO 2026, resampling verifies 1/6 (16.7%) despite 8–16 independent generations per problem, whereas self-correction verifies all six (§4.3, p. 9). The single AIME failure had a wrong initial answer, so more proof samples could not repair that statement (§4.3, p. 9).

Verus form (Inference:)

Map `SYNTAX` to a Verus compiler/solver diagnostic and preserve the natural-language plan and Rust contract while regenerating proof code. Map `MATH` to a suspected contract or algorithm error and require a new requirement interpretation before changing the contract. Keep both branches auditable. Verus has no built-in `MATH`/`SYNTAX` classifier; the classifier is an external model whose decision must never bypass final verification.

limits

The judge can misclassify a failure, and the paper does not report a classifier confusion matrix. Its resampling comparison also uses a particular model, budgets, and six IMO problems; it is not a universal theorem that feedback always beats independent samples. Inference: use conservative budgets and retain a fallback branch when the diagnosis is uncertain.

## technique: budget-aware formalization and proof-cost accounting

M AGENTA measures coverage as a function of explicit budgets rather than reporting only a final pass rate. For proof generation it defines `Pass_u(β) = (1/|D|) Σ_q 1[Ver(q)=1 ∧ u(q)≤β]`, where `u(q)` is proof tokens and `β` the token budget (§4.1.2, p. 6). This distinguishes external calls from internal compiler loops. Leanstral reaches full AIME 2026 coverage at approximately 6×10^4 reasoner tokens versus 9×10^5 for Codex and produces proofs about half as long (1.1×10^4 versus 2×10^4 tokens), but consumes roughly 3×10^2 internal calls at median coverage and up to 3×10^3 at full coverage (§4.1.2, pp. 6–7). The authors explicitly say Codex’s external count is a lower bound because internal work is hidden (§4.1.2, p. 7).

Verus form (Inference:)

Record wall time, Verus invocations, solver time, generated proof size, and retries separately. Report denominators and whether calls include hidden sub-processes. A lower external-call count is not lower total cost when the verifier or agent performs concealed local work.

## trusted boundary, contradictions, and product threat

Lean/SafeVerify checks elaboration, forbidden constructs, and proof validity, but the learned formaliser and judges determine what is being proved. The paper’s conclusion is explicit: “verification guarantees correctness only relative to the generated formalisation, not unconditionally with respect to the original problem” (§6, p. 9). Inference: for agent-written verified Rust, the same boundary includes Rust compilation, Verus, solver assumptions, external crates, and the semantic match between VL requirements and generated contracts. The product threat is under-specification or a wrong routed diagnosis, not merely a failed proof. Existing work already demonstrates statement checking, verifier-guided repair, and budget curves; VL should measure these on its Rust APIs and security requirements instead of claiming Lean benchmark rates transfer.

## techniques for the catalog

- statement adjudication — reject elaborated formal statements that do not faithfully encode the natural-language requirement and candidate answer
- error-attribution routing — classify a failed proof as mathematical or implementation error and revise only the responsible component
- diagnostic-conditioned repair — preserve context on syntax errors and regenerate proof code from verifier diagnostics
- budget-aware certification — report verified coverage as a function of explicit statement, proof, token, and internal-call budgets

Checked 2026-10-15 against the paper by a Codex agent for magenta_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
