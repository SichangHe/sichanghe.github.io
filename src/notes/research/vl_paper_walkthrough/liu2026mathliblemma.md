# MathlibLemma: Folklore Lemma Generation and Benchmark for Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2026mathliblemma`, [paper](https://doi.org/10.48550/arxiv.2602.02561)

## purpose and output
MathlibLemma builds a modular Lean pipeline that discovers missing intermediate (“folklore”) lemmas in Mathlib, repairs their syntax, proves them, and screens out proof bypasses. The paper’s task is library expansion rather than solving a supplied theorem. It defines a seed context C as a Mathlib source file and imports, then seeks statement/proof pairs that are novel, mathematically plausible, and kernel checked. The authors write, “This formulation shifts the challenge from purely solving a given statement to discovering what statements are worth solving.” (Section 3.1, p. 3)

The released benchmark contains 4,028 non-trivial type-checked Lean 4 statements. The proved subset contains 1,506 proofs that pass Lean checking and the bypass screen. A six-lemma upstreaming pilot had three merged, one rejected as redundant, and two not pursued within the timeline. Those denominators are distinct: 1,506/4,028 is automated proof output, while 3/6 is a curated upstreaming pilot.

## technique 1: factorized discovery pipeline

what it is and when to use it

The pipeline separates semantic hallucination, syntactic elaboration, and proof search. Use this architecture when a monolithic model tends to spend proof effort on false statements or gets stuck on trivial namespace errors. Figure 1 names four modules: Discovery, Judge, Formalizer, and Prover.

how to apply it

1. choose a seed Mathlib file and its imports as context C (Section 3.1, p. 3)
2. run Discovery with the full seed content and a structured prompt asking for diverse missing lemmas; emit normalized Lean declarations with `sorry` placeholders (Section 3.2.1, p. 4)
3. run Judge independently on each candidate, asking only whether the mathematical claim is correct; discard “wrong” candidates before kernel work (Section 3.2.2, p. 4)
4. send accepted statements to Formalizer, which calls the Kimina Lean server; feed diagnostics plus current code back to an LLM until the proposition elaborates or repair attempts are exhausted (Section 3.2.3, p. 4)
5. send type-checked propositions to Prover; request a proof plan and complete Lean proof, compile it, and retain compiler errors for up to two repair rounds (Section 3.2.4, p. 5)
6. run the proof-bypass screen on generated proof code, rejecting `sorry`, `admit`, `sorryAx`, and model-introduced `axiom`, `constant`, or `opaque` declarations (Section 3.2.4, p. 5)

The paper’s design rationale is explicit: “Standard end-to-end synthesis entails a compounding risk of failure, where mathematical hallucinations, syntax errors, and proof search failures are entangled.” (Section 3.2, p. 4) It also says, “The Prover Module operates on a guaranteed well-formed proposition, focusing solely on proof construction without being blocked by invalid definitions or imports.” (Section 3.2, p. 4)

Verus form

Inference: use the same stage separation for Verus lemma generation. Discovery can emit candidate `spec fn` statements or `proof fn` signatures; a Judge can reject false mathematical claims; Formalizer can compile a minimal Verus module and repair names, types, and contracts; Prover can synthesize proof bodies checked by Verus. Verus does not accept Lean’s `sorry` as evidence, so the final gate should reject `external_body` on the function being verified and any unproved specification. Use `requires`, `ensures`, `assert`, and proof functions from the existing Verus construct set.

## technique 2: closed-book benchmark and proof-bypass audit

what it is and when to use it

To measure prover capability rather than retrieval quality, the benchmark gives only C and S and forbids external search. The paper says, “During evaluation, models are not allowed to use external retrieval tools (e.g., code search, RAG, or browsing Mathlib sources).” (Section 4.1, p. 5) A result counts only when the self-contained file elaborates without errors and generated proof code passes the bypass screen.

The bypass screen is essential because kernel checking alone permits imported axioms and incomplete placeholders. The authors state, “The screen is applied to the extracted model-generated proof code, not to the imported Mathlib environment.” (Section 3.2.4, p. 5) For reproducibility, retain context, statement, model output, compiler diagnostics, and screen decision for each attempt.

Verus form

Inference: construct a per-candidate Rust module whose imported specifications are fixed and whose generated proof code is separately scanned. Reject `assume`, `admit`, or unverifiable external bodies when they would add an untrusted fact. The exact policy must follow VL’s accepted Verus subset; the paper’s Lean policy transfers as a trust-boundary principle, not as Rust syntax.

## technique 3: compile-feedback repair loops

Formalizer repairs only statement syntax: diagnostics include the current code and errors, and the prompt forbids proving. Prover repairs proof terms: each failed attempt and compiler message is appended to a history buffer, with at most two repair rounds. This isolates namespace/implicit-argument errors from logical failures. Inference: in Verus, preserve this distinction by compiling contracts before proof search, then passing verifier diagnostics to a proof-repair loop; classify failures as type, contract, trigger, or solver failures so the model does not rewrite a valid specification unnecessarily.

## technique 4: diversity and residual audits

The evaluation compares GPT, GPT-Reasoning, Kimina, Goedel, DeepSeek-32B, DeepSeek-70B, and Qwen under Success@2. Table 3 reports total success rates: GPT 15.69%, GPT-Reasoning 19.39%, Kimina 10.70%, Goedel 17.70%, DeepSeek-32B 6.98%, DeepSeek-70B 6.68%, and Qwen 2.46%. The union of all models reaches 37.39%, showing complementary failures. The paper calls this “the massive gap between the best individual model (19.39%) and the Union performance (37.39%).” (Section 5.2, p. 7)

A seed-stratified human audit found 78% of model-unsolved residuals provable; a held-out audit found experts proved 79/94 (84.0%), with a Wilson 95% interval of 75.3–90.1%. These are audit samples, not proof rates for all 4,028 statements. The dominant unproven failure was missing hypotheses, such as integrability or non-emptiness conditions (Appendix D, p. 18). Inference: VL should preserve rejected candidates and diagnose omitted preconditions rather than treating every failed proof as a false lemma.

## verified library and limits

The pipeline produced 1,506 released proofs from 4,028 statements. The pilot submitted six curated lemmas; three merged into Mathlib. Discovery, Judge, and Formalizer cost about $200; proving cost about $500; the paper reports roughly $0.33 per released proof for proving alone and $0.46 per proof for the full $700 pipeline. These costs exclude curation, local serving, and maintainer review. The authors caution that “Lean checking and proof-bypass screening establish formal validity of the generated proof artifacts in a fixed Lean environment, but Mathlib upstreaming additionally requires curation.” (Section 6.2, p. 8)

What remains trusted includes Lean’s kernel, imported Mathlib declarations, the semantic Judge, and the claim that a repaired formal statement preserves the intended informal lemma. The paper notes that syntactic novelty filters can leave semantically equivalent restatements. Inference: a Verus library could adopt this pipeline for reusable lemmas, but trusted specifications, external library contracts, and solver behavior remain product risks. The threat is high for agent-written proof boilerplate and missing preconditions; it is lower when every candidate is compiled, bypass-screened, and human-curated before inclusion.

## techniques for the catalog
- factorized lemma mining: separate candidate discovery, semantic filtering, syntax repair, proof search, and final artifact screening
- compiler-guided repair: feed structured Lean or Verus diagnostics back to a bounded generate-verify-repair loop
- proof-bypass screening: reject placeholders and generated declarations that introduce hidden assumptions beyond the trusted library
- closed-book evaluation: benchmark models with only the self-contained context and statement to measure internal formalization ability
- model-union proving: combine diverse prover outputs because union coverage can substantially exceed the best single model
- residual human audit: sample model-unsolved statements to distinguish false claims from current prover limitations

Checked 2026-10-15 against the paper by a Codex agent for mathliblemma_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
