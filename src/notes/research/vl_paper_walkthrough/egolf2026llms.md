# Can LLMs Perform Synthesis?
(authored by agents unless marked 🧑)
Tag: `egolf2026llms`, [paper](https://doi.org/10.1007/978-3-642-39799-8_67)

## question and common toolchain
The paper compares Qwen, GPT-5, and symbolic synthesis tools on LTL reactive synthesis, SyGuS, TLA+ protocol completion, and ACL2s recursive programs. Every result counted as solved must pass a domain verifier. The common LLM loop is called ILST (iterate-LLM-until-solution-or-timeout). The paper’s methodology is: “For each benchmark, the whole process is iterated until a correct solution is found, or a 10-minute time limit is reached.” (Section 2, p. 3)

Steps:
1. Build a prompt from the formal specification, grammar or sketch, and required output format.
2. Ask the LLM for one candidate.
3. Parse and post-process the raw response.
4. Run the domain verifier; accept only a candidate that passes syntax/grammar and semantic checks.
5. For Qwen, repeat until success or timeout; for GPT-5, query once and spend the remaining time verifying.
6. Cache repeated Qwen responses in domains where the paper does so, skipping a verifier call for a candidate already known to fail.

The paper states: “We do not provide any verification feedback to the LLM: no counterexamples and no other indication that the previously generated solutions were incorrect.” (Section 2, p. 4) It also states: “A solution which is both generated and verified correct within 10 mins is counted as a correct solution.” (Section 2, p. 4)

Verus form (Inference): prompt an agent with Rust signatures, `requires`/`ensures`, and allowed helper APIs; parse its response; run Verus; retry on failure. The paper’s no-feedback condition is an experiment design, not a product requirement. A VL product can provide Verus diagnostics, but should measure that variant separately.

## technique 1: checker-specific output gates
The paper uses a different checker stack for each domain. For LTL, SyFCo converts TLSF to SMV, a monitor is compiled to AIGER, and nuXmv checks the monitor plus candidate circuit. For SyGuS, a grammar checker validates syntax and a custom translator plus Z3 checks semantics. For TLA+, a grammar verifier runs before TLC. For ACL2s recursion, the ACL2s counterexample generator checks first-order properties.

Inference: this decomposition is a reusable formal-verification pattern: a parser gate catches malformed agent output, then a semantic prover checks the specification. Verus should similarly reject non-compiling Rust before launching proof checking, and report syntax, type, and proof failures separately.

The SyGuS section requires “only self-contained (define-fun ...) expressions” and explicitly enforces `ite` instead of `if` and correctly typed bit-vector literals (Section 4.1, pp. 9–10). The TLA+ toolchain checks grammar before TLC, because a semantically valid but out-of-grammar completion is not a valid synthesis result.

## technique 2: domain adapters and fair baselines
Use domain adapters when comparing an LLM with an existing synthesizer. Keep the benchmark, timeout, correctness definition, and post-synthesis verification explicit. The paper runs symbolic tools on CPUs with a 10-minute timeout (15 minutes for recursive synthesis), Qwen on an NVIDIA H200 with a verifier, and GPT-5 through the API with one query per benchmark. It cautions: “This is still a somewhat unfair comparison between symbolic tools and Qwen, as the latter is run on much more powerful hardware.” (Section 2, p. 3)

Inference: VL evaluations should publish model, hardware, Verus version, timeout, number of attempts, and whether diagnostics are fed back. A single aggregate success rate hides the difference between one-shot GPT-5 and repeated Qwen attempts.

## technique 3: counterexample-guided symbolic synthesis as the reference
The symbolic baselines enumerate candidates and verify each one. PolySemist enumerates TLA+ protocols from the grammar and invokes TLC; Cataclyst enumerates recursive programs and invokes ACL2s; cvc5 performs SyGuS synthesis and its outputs are post-checked. The paper says of PolySemist: “Therefore, PolySemist cannot return a protocol that violates the properties specified by the user.” (Section 5.1, p. 11)

Inference: this gives VL a baseline architecture: enumerate or generate a Rust candidate, run Verus, and never return a failed candidate. A symbolic search can guarantee grammar conformance and avoid repeated candidates, while LLM sampling can provide useful candidates outside the enumerator’s usual order.

## evidence by domain
LTL uses 433 benchmarks in Table 1. ltlsynt yields 354 post-verified solutions within the synthesis timeout plus 42 outputs whose post-synthesis verification timed out; the table reports these as `354+42`, while GPT-5SMV solves 229 and GPT-5AIG 150. The paper notes 401/434 solved by at least one method, but Table 1’s denominator is 433; this is an internal denominator inconsistency that should be preserved rather than silently corrected.

SyGuS uses 148 benchmarks. cvc5 solves 137/148, Qwen 96/148, and GPT-5 143/148 (Table 2). The paper reports 147/148 solved by at least one method. TLA+ uses 171 benchmarks: PolySemist solves 140/171, Qwen 102/171, and GPT-5 136/171 (Table 3). ACL2s recursion uses 42 benchmarks: Cataclyst and GPT-5 solve 41/42, Qwen 39/42 (Table 4).

The paper’s conclusion is: “There are generally benchmarks that are solved by the LLM but not by the symbolic tool, and vice versa.” (Section 8, p. 18) It also reports repeated failures: Qwen generated 16,824 TLA+ responses, of which 16,722 failed; 5,063 failed grammar conformance and 11,628 had TLC counterexamples (Section 5.2, pp. 13–14). In ACL2s, Qwen produced 1,159 responses but only 165 distinct responses (Section 6.2, p. 16).

## trust, limitations, and VL threat
The checker is trusted as the semantic oracle, and the paper itself notes that ACL2s counterexample generation can in principle accept an incorrect program; manual verification of the benchmark suite was used as a proxy. Hardware comparisons are imperfect, GPT-5 is proprietary, and timing statistics for successful runs omit timeout cost unless reconstructed. Grammar relaxation increases apparent success (for TLA+, Qwen 133 and GPT-5 149 versus 102 and 136 with grammar checks), so grammar and semantic correctness must remain separate metrics.

Inference: for agent-written verified Rust, the paper predicts a moderate threat from malformed output, repeated guesses, and weak task understanding; Verus proof checking keeps those guesses outside the product if the gate is mandatory. What VL should not redo is the basic LLM-plus-verifier loop and its domain-specific output gates. VL still needs Rust/Verus benchmarks, trusted-tool accounting, and tests for specification drift.

## techniques for the catalog
- ILST synthesis loop: generate, verify, retry until success or a fixed timeout, with optional duplicate caching
- checker-specific gates: enforce grammar and semantics with separate parsers, model checkers, SMT solvers, or proof engines
- portfolio baseline: compare LLM sampling with symbolic enumeration under explicit timeout, hardware, and denominator accounting
Checked 2026-10-15 against paper egolf2026llms: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
