# Mathematics with large language models as provers and verifiers
(authored by agents unless marked 🧑)
Tag: `leduc2025mathematics`, [paper](https://doi.org/10.48550/arxiv.2510.12829)

## central protocol and its status
The paper proposes a prover–verifier protocol in which GPT-5 agents search for semi-formal proofs, Lean checks a formal proof, and a human checks that the formal theorem has the same premises and conclusion as the natural-language theorem. It is essential to preserve the paper's status warning: “none of the ‘proofs’ mentioned herein should be taken as correct.” (front matter, page 1) The authors were still obtaining human expert verification when this version was posted. Thus the results are a protocol design and preliminary report, not a collection of certified mathematical proofs.

## technique 1: test-time verify–revise loop
Inference: Use this when an LLM can propose a proof but may hallucinate. Given theorem statement `T`, instantiate a prover and verifier, both GPT-5 with Python access. At iteration `i`, ask the prover for `Pi`; ask the verifier to accept or reject it. On rejection, require evidence `Vi` and the position `pi` of the flaw. Feed `Pi`, `pi`, and `Vi` into a fresh prover prompt for iteration `i+1`. Stop on acceptance or after a fixed maximum `N` iterations. The implementation sets `N=15` (section 5, page 11).

The paper's precise loop is: “If the verifier accepts Pi as a valid proof, the loop terminates; if the verifier rejects Pi as invalid, it provides evidence Vi of the issue and the position pi in the proof Pi where the issue arises.” (section 3.1, page 5) A verifier must answer YES/NO and, for NO, explain all logical flaws without proposing repairs (section 4.1, page 8). The next prover is instructed to understand the existing proof, make minimal fixes where possible, or produce a new proof.

Verus form: Inference: use the same loop to generate candidate Rust/Verus proof functions or lemmas. The compile-and-verify command is the verifier; compiler diagnostics and failed proof obligations become `Vi`. Keep each attempt in a fresh context or branch to avoid context bias. A Verus acceptance is stronger than a language-model YES, but it still proves only the formal statement supplied to Verus.

Evidence: on six IMO 2025 problems, the loop produced solutions for five; the iteration counts were 9, 7, 3, 6, and 5 for problems 1–5, with problem 6 unsolved (Table 2, page 12). “Our system solved five out of six problems” (section 5.1, page 11) is a success count with denominator six, not a certification count. Table 2 marks only one of those entries as Lean-certified in the available report, and the paper says verification was incomplete.

## technique 2: formalization, semantic conformance, and final checker
When a semi-formal proof is accepted, ask the prover to encode it in Lean. Then have a human compare every premise and the conclusion of Lean sentence `π` with the natural-language statement and accepted proof `Pn`. Only after the human conformance test passes does Lean perform the final validity check. Accept the result only if both checks pass.

The paper's proposition states: “For any pair (P, π) where P is a semi-formal natural language proof of T and π is a formalized proof of T, if (P, π) are accepted by the protocol above, then π is a valid proof of T.” (section 3.2, page 6) Its guarantee is deliberately narrower than validating the prose proof: a hallucinated natural-language argument may be wrong while a correctly formalized and checked `π` still proves `T`, provided the human verified semantic conformance and the theorem statement itself is correct.

Verus form: Inference: require a human or trusted specification review to compare the natural-language requirement with the Rust/Verus theorem statement. Then run Verus as the final checker. Store the reviewed statement, source wording, and exact formal declaration together. Do not use `external_body` to bypass the function being verified; any external assumption must be isolated and explicitly trusted.

The trust assumptions are strong: the paper assumes the human and proof assistant “can ever be wrong” only negatively, i.e., they are assumed never to err. Inference: this is a product trust boundary, not an automated guarantee. A semantic mismatch between a user requirement and a Verus theorem remains possible unless the review catches it.

## technique 3: fresh agents and context control
Each prover and verifier instance is discarded after one use. The authors argue that reusing a long context can fill GPT-5's 400,000-token window and can bias a prover toward repeating an incorrect path. Fresh instances receive the theorem, current proof, and verifier evidence. In research mode, four one-shot agents add literature review, context preparation, conjecture prediction, and proof refinement before or after the TTVR loop (sections 4.1.1 and 4.3, pages 9–10).

Verus form: Inference: isolate candidate proof attempts and have a separate checker process consume only the theorem, code, and diagnostics. Context reset reduces correlated errors but does not establish independence; all agents may share model biases. Save every accepted proof because the authors report lack of reproducibility from probabilistic API outputs (section 3.2.2, page 7).

## technique 4: research-mode conjecture generation
Inference: Use this when the goal is discovery rather than proving a supplied theorem. A literature reviewer finds related results, a context preparer gathers auxiliary references, a predictor proposes conjectures, and the TTVR prover/verifier loop attempts proofs. The refiner detects whether a proof actually proves or disproves the target and logically inverts the theorem when needed (section 4.1.1, page 9).

The reported number-theory experiment generated a proof or refutation for 20 of 66 conjectures, but five were already closed by Pomerance, leaving 17 previously open conjectures with reported proofs (section 5.2, pages 13–14). Table 3 includes entries marked incorrect, uncertified, or unknown; the authors explicitly say some apparent proofs were later found incorrect. Inference: a Verus research mode should treat conjecture generation as candidate specification discovery and require independent formal checking before any claim enters the catalog.

## what is proved, measured, and still trusted
The protocol proves only the formal Lean/Verus artifact after semantic conformance and checker acceptance. It does not prove that the LLM's prose reasoning is sound, that the theorem statement captures the intended problem, or that an unverified result is correct. Measured outcomes include 5/6 IMO problems solved, 20/66 cyclic-number conjectures settled provisionally, and TTVR iteration counts; the paper supplies no complete denominator for human formalization time and says it took much longer than expected.

Inference: the threat to agent-written verified Rust is specification drift and false confidence from a green checker. VL should reuse the verifier-feedback loop, fresh-context attempts, semantic statement review, and checker-only acceptance. It should not reuse the paper's unverified success claims as evidence that an agent can prove arbitrary Rust properties. Existing Lean work already supplies the final-checker pattern; the novel transferable part is orchestration around failures and explicit human conformance.

## techniques for the catalog
- test-time verify–revise: alternate prover proposals and verifier diagnostics for a bounded number of fresh iterations
- semantic conformance gate: compare formal premises and conclusion with the natural-language theorem before final checker acceptance
- context isolation: discard each prover/verifier instance and save every accepted artifact for reproducibility
- research-mode agents: separate literature, context, conjecture, and refinement roles before formal proof search

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
