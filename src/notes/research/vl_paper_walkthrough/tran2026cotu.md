# CoTu at EXACT 2026: Neuro-Symbolic Reasoning for Transparent Educational QA
(authored by agents unless marked 🧑)
Tag: `tran2026cotu`, [paper](https://doi.org/10.1145/3641289)

## system shape

CoTu uses a 4B model that emits executable programs instead of directly asserting answers. Regulation queries become Z3 first-order-logic constraints; physics questions become numerical Python. A shared sandbox, retry loop, and explained JSON schema return the answer, unit, explanation, cited premises, and reasoning. The abstract states: "for regulation queries it emits a Z3 encoding whose entailment verdict grounds the deduction, and for physics it emits numerical Python" (Abstract, PDF p. 1). This is a general formal-verification pattern: neural generation proposes a proof artifact, deterministic execution decides the result, and the artifact is exposed for inspection.

Inference for Verus: replace Z3/Python with generated Rust and Verus specifications, compile and verify in a restricted runner, and keep generated code outside the trusted boundary until Verus accepts it. The paper's solver does not prove arbitrary Rust memory or concurrency properties; the transfer is an inference.

## technique 1: task routing and malformed-input guard

Task 1 first classifies a query as multiple choice, Yes/No/Uncertain, or open-ended. A clarity check detects undefined symbols, missing options, and unresolved references; malformed items short-circuit to Uncertain. The selected type chooses a specialized Program-of-Thought (PoT) solver. Steps are: parse task type; reject malformed inputs; choose output schema; generate the symbolic program; run it; map solver status to the answer format (Section 3.2, PDF pp. 7–8). This prevents a model from forcing an arbitrary deduction on an ill-formed premise.

Verus form (inference): route Rust tasks by proof shape (arithmetic, ownership, concurrency), validate that modules and referenced types resolve, and return an explicit “insufficient context” result rather than generating a proof against guessed APIs. The inference is ours.

## technique 2: hybrid retrieval with Reciprocal Rank Fusion

CoTu retrieves solved regulation examples using a dense encoder and BM25 lexical index in Qdrant. For candidate `d`, dense and sparse ranks are merged as `RRF(q,d)=1/(k+r_dense)+1/(k+r_sparse)` with `k=60`; absent candidates have infinite rank. Near-duplicates are removed, and top examples are inserted as Z3 API/style references, not facts to copy. The paper says: "Top candidates with the highest RRF(q, d) scores are filtered to drop near-copies of the query and injected into the PoT prompt as style and API-usage references, not logic to copy." (Section 3.2, PDF p. 8). Retrieval was enabled only in the first evaluation round and not in the final-round submission.

Apply it by indexing verified Verus functions, spec lemmas, diagnostics, and API examples; combine semantic and lexical retrieval; deduplicate; label retrieved text as syntax guidance; and still require a fresh Verus proof. Retrieval can reduce malformed API calls but cannot establish a lemma's applicability.

## technique 3: SMT entailment as a two-query proof obligation

Given premises `P={p1,...,pN}` and query `C`, CoTu computes status with two unsatisfiability checks: Entailed if `Sat((and_i p_i) and not C)` is false; Contradicted if `Sat((and_i p_i) and C)` is false; otherwise Uncertain (Definition 2, PDF p. 8). A solver result is then converted to Y/N/U, per-option MCQ labels, or entailed facts. Proposition 1 proves the verdict sound under faithful translation from natural language to first-order logic. The paper states: "Grounding the answer in the solver verdict rather than the model’s own claim is what keeps the deduction hallucination-free." (Section 3.2, PDF p. 9).

Verus form (inference): encode the desired Rust property as `requires`/`ensures` and ask Verus to prove the implication; a failed proof is an explicit unknown/counterexample outcome. Unlike Z3's two SAT tests, Verus's SMT queries are generated from Rust semantics and can include ownership and quantified heap state.

## technique 4: executable physics PoT with retry

For physics, the model emits a sequence of assignments `v_j <- phi_j(previous values, constants)` ending in the target `y_hat`. A sandbox executes numerical Python, exposes SciPy constants such as epsilon-zero and elementary charge, and retries on parse or execution failure. Using canonical constants avoids accumulated rounding error that could violate the challenge's relative tolerance (Definition 3 and Section 3.3, PDF pp. 10–11). The same retry budget and JSON output are shared with Task 1.

Verus form (inference): generate a pure Rust calculation plus a `proof fn` that establishes algebraic postconditions, use typed constants, and reject code that fails `cargo-verus`; sandboxing remains an operational defense rather than a Verus theorem.

## technique 5: self-correction and latency fallback

Both branches run generated code in a fresh restricted process with fixed timeout. Parse or execution failure is fed back to regenerate, for at most two iterations. Task 1 also runs a faster non-thinking self-consistency path in parallel; if the main solver exceeds `t_fallback<60s`, majority voting chooses the answer, breaking ties by the candidate citing fewer premises. The paper says: "By employing this fallback mechanism, a slow query degrades gracefully to a faster consensus answer rather than causing a timeout." (Section 3.2, PDF p. 10). This is an availability technique, not a correctness proof: the fallback still requires answer validation by the challenge scorer.

## technique 6: verifier-grounded data synthesis and SFT

Task 1 starts from 808 official items, clarity-filters to 722 (403 YNU, 314 MCQ, 5 OE), then adds 333 Z3-verified open-ended items for 1,055 total. Task 2 starts from 1,352 official physics items and adds 100 synthesized MCQs for 1,452 total (Table 1, PDF p. 11). Offline teachers re-annotate every item with reasoning trace, answer, explanation, and executable program. Separate LoRA SFT trains the 4B backbone on assistant reasoning/code only; adapters are merged into the backbone. Teacher models exceed the 8B live limit but never run on the live path (Section 3.4, PDF pp. 11–12).

Inference for Verus: synthesize training data only when the generated Rust proof passes Verus, record diagnostics and specs, and fine-tune on proof-producing traces. The verifier, not the teacher, must filter acceptance.

## evidence, trust, and threat

Live runs use a 4B backbone, SGLang, RadixAttention prefix caching, DFLASH speculative decoding, BF16, and a single B200. Round 1/2 each contain 25 Task 1 and 25 Task 2 items; the final has 6 and 5 (Section 4.3, PDF p. 13). Physics is perfect in both automated rounds: 25/25 each, 50/50 combined. Task 1 P1+P2 rises from 21.24/25 to 23.10/25; Table 3 gives P1 21.00 and P2 21.48 in Round 1, then P1 22.00 and P2 24.20 in Round 2 (Table 3, PDF p. 14). Final SAPI is 10.24/11, P3 is 3.20/4, technical score 13.44/15, presentation 8.80/15, overall 22.24 and rank 3 (Table 4, PDF p. 14). Round 1 mean times are 32.51s/17.20s (Task 1/2), Round 2 12.05s/4.21s, Round 3 18.00s/10.63s; fallback fires 5/25 Task 1 items in Round 1 and 0/25, 0/6 later (Table 5, PDF p. 15).

Error analysis gives denominators: Round 1 has 36/50 fully correct, with 10 premise and 4 answer errors; Round 2 has 45/50, with 2 premise and 3 answer errors; final Task 1 has 2 correct, 3 premise errors, 1 answer error (Section 5.3, PDF p. 16). Thus premise selection, rather than symbolic deduction, is the dominant failure mode. Trusted components are Z3/Python execution, sandbox policy, and challenge scoring; the LLM, retrieval, offline teachers, and self-correction are untrusted search/data components. The paper's soundness claim assumes faithful translation; a misencoded premise can produce a formally correct but semantically wrong verdict (footnote in Section 4.2, PDF p. 12).

Inference: the product threat to VeruLaw is a capable small model that emits compilable proof scaffolding and uses verifier feedback to repair it, reducing the value of manual boilerplate. The residual risk is specification translation and premise selection: a Verus proof can verify the wrong postcondition if the generated spec omits a caller obligation. VL should therefore preserve explicit statement review, proof coverage, and a fail-closed unknown state. Existing work already demonstrates solver-grounded PoT and retries; VL should adapt the pattern to ownership-aware Rust rather than replicate a generic Z3 wrapper.

## techniques for the catalog

- task routing and clarity guard — classify proof tasks, reject malformed context, and select a specialized output contract
- hybrid RRF retrieval — merge dense and BM25 ranks, deduplicate, and provide API examples as generation context
- SMT entailment grounding — decide entailment and contradiction with paired unsatisfiability checks before formatting an answer
- executable Program-of-Thought — generate sandboxed Python or symbolic programs whose execution determines the result
- verifier self-correction — regenerate after parse or execution failure within a bounded retry budget
- latency fallback — switch to majority-voted fast samples before a hard timeout
- verifier-filtered distillation — train task adapters only on teacher traces whose generated programs pass the symbolic verifier
Checked 2026-10-15 against paper tran2026cotu: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
