# ModelForge: Using GenAI to Improve the Development of Security Protocols
(authored by agents unless marked 🧑)
Tag: `duclos2025modelforge`, [paper](http://arxiv.org/abs/2506.07010v1)

## purpose and formal target

ModelForge translates natural-language security-protocol descriptions into protocol definitions for the Cryptographic Protocol Shapes Analyzer (CPSA). CPSA is a strand-space model finder: it explores roles, messages, variables, and partial executions (skeletons) under a Dolev–Yao adversary and reports possible executions as shapes (§2.2, pp. 4–5). The paper's contribution is an LLM translator, not a new protocol proof calculus. Its abstract describes “a novel tool that automates the translation of protocol specifications for the Cryptographic Protocol Shapes Analyzer (CPSA)” (Abstract, p. 1).

The target workflow is: a user submits protocol prose; a controller combines it with an instruction prompt; a fine-tuned LLM emits CPSA s-expressions; a domain expert validates the output; CPSA then analyzes the model with a protocol skeleton (§1, pp. 2–3; Figure 3, p. 6). The authors explicitly say the generated candidates “will need to be reviewed and revised by a domain expert” before analysis (§1, p. 3).

Inference: For VL, this is a pattern for generating a formal intermediate representation before Verus code. The CPSA definition corresponds to a candidate Rust state machine/specification, while the expert review corresponds to checking that the generated `requires`, `ensures`, and transition invariants match the protocol prose. CPSA itself is not a Verus proof and does not model Rust ownership.

## technique 1: synthetic corpus and domain fine-tuning

Use this when the formal language has too few paired prose/specification examples. ModelForge first uses GPT-4 to create ten seed CPSA templates, generates associated natural-language protocol specifications, and then introduces variance to enlarge the question-answer pairs (§3.4, p. 7). The resulting corpus has 340 synthetic pairs, split 70% training and 30% testing. The authors fine-tune GPT-3.5-turbo for three epochs over 568,200 tokens, reporting training loss 0.2976 and validation loss 0.3902 (§4.4, pp. 10–11). Generation uses temperature 0 to favor deterministic structured output (§4.4, p. 11).

Step by step: collect valid CPSA definitions; write or generate matching protocol descriptions; vary wording while preserving the target definition; split pairs without mixing evaluation examples; fine-tune a base model; freeze a fixed instruction prompt; and test on held-out descriptions. The paper's synthetic process is itself model-generated, so semantic correctness of every training pair remains an assumption.

Inference: For Verus, generate Rust/specification pairs from trusted verified examples, but independently compile and verify every target. Synthetic pairs should be treated as training data, not evidence of contract soundness. Keep temperature and prompt versions because deterministic generation improves reproducibility but does not establish correctness.

## technique 2: structured protocol translation

Use this to turn a prose protocol into a CPSA role/trace model. The example asks for Alice–Bob mutual authentication over an insecure network using public-key encryption, with nonce exchange (Figure 4, p. 7). The output is an s-expression with a `defprotocol`, a `defrole`, typed variables, and a trace of `send`, `recv`, and encryption terms (Figure 5, p. 8). The paper's generated shape includes `(defprotocol mutual-auth basic)`, a role with `(vars (a name) (b name) (n1 text) (n2 text) (pubk data))`, and sends/receives using `(enc ...)` (§3.9, p. 8).

Step by step: normalize the user's prose into participants, nonces, keys, and message order; include the instruction prompt and query in the controller context; ask the fine-tuned model for CPSA syntax; parse the returned s-expressions; have an expert check roles, variable bindings, key direction, and trace order; construct a CPSA skeleton for the intended partial execution; and run CPSA to enumerate shapes and security consequences. The system's controller only orchestrates these calls; it does not prove the translation (§3.10–3.11, pp. 8–9).

Inference: In Verus, the analogous steps are to define ghost protocol state, executable message functions, and transition predicates; then prove secrecy/authentication lemmas. A CPSA `recv` does not automatically become a Rust ownership-safe receive, and an LLM-generated trace must not be trusted until Verus verifies the corresponding implementation and specification.

## technique 3: expert rating of formal artifacts

The evaluation uses four participants with experience from under one year to ten or more years. They review three queries and nine CPSA definitions, rating correctness, clarity, and completeness on a 1–5 scale (§4.1–4.2, pp. 9–10). Correctness means proper CPSA syntax; clarity means readable structure; completeness means coverage of the query's main aspects (Table 1, p. 9). The paper compares ModelForge with Claude 3.5, Llama 3.1, GPT-4o, and Codestral (Table 2, p. 10).

Results are normalized averages, not pass rates. ModelForge scores 0.67/0.75/0.67 on Query 1, 0.83/0.92/0.92 on Query 2, and 0.75/0.50/0.50 on Query 3 for correctness/clarity/completeness (Table 3, p. 12). The qualitative review calls it the best CPSA syntax instance but reports a public-key error: “Sending out the public key, which was not part of the protocol definition” (Table 4, p. 12). This is a concrete semantic failure despite good syntax scores.

Inference: A Verus product should measure verified-contract pass rate and semantic requirement coverage, not only syntax or human ratings. Use denominator-explicit tests such as verified obligations over all generated functions, with separate counts for compilation, proof success, and expert semantic acceptance.

## trust, limits, and product threat

The paper says initial outputs generally follow CPSA syntax but often require corrections, so “a domain expert should carefully review the AI-generated CPSA protocol definitions to ensure they are correct, complete, and secure” (§5, p. 13). Performance is better when variable names are explicit; RFC prose contains irrelevant material; and larger evaluations and additional models are future work (§5, pp. 13–14). The four-person, three-query survey has no statistical power for deployment claims. CPSA checks the supplied formal model, not whether the model faithfully captures the original protocol.

Inference: Specification-boundary omissions create a serious risk for agent-written verified Rust: a contract can parse and prove while omitting roles, keys, or security goals. ModelForge's human-in-the-loop requirement should be retained in VL for security-critical code. Existing work already demonstrates domain fine-tuning and structured output for CPSA; VL should not repeat that generic translator study. A differentiated contribution would connect prose-to-Verus translation to executable tests, counterexamples, and independently checked security properties.

## techniques for the catalog

- synthetic formal-language corpus — generate paired prose and formal artifacts, diversify wording, and fine-tune on held-out pairs
- structured protocol translation — map participants, terms, keys, and traces into CPSA s-expressions before model analysis
- human semantic review — rate correctness, clarity, and completeness and inspect security-critical bindings before checker execution
- checker-after-translation — run CPSA only after parsing and expert review, treating its shapes as evidence about the formal model

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
