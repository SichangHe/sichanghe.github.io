# Verification-Guided Specification Synthesis with Large Language Models for Intrusion Detection Rules
(authored by agents unless marked 🧑)
Tag: `yamamoto2026verification`, [paper](http://arxiv.org/abs/2608.22889v1)

## method and evidence
The paper turns HTTP attack traces into Suricata intrusion-detection rules through an intermediate semantic specification. Its central design is two-phase: an LLM proposes and refines a Python predicate, then a deterministic compiler emits the rule. The authors state, “Instead of having an LLM generate IDS rules in a single step, an LLM first identifies a vulnerable parameter and synthesizes a semantic detection specification.” (Abstract, p. 1)

### technique 1: vulnerable-parameter specification synthesis
Use this when only an observed HTTP request is available and external vulnerability descriptions, firmware, or responses are unavailable. Analyze the request and select the parameter likely to carry command execution, data access, path construction, or access-control behavior (§3.1, p. 3). If no plausible entry point exists, generate no rule (§3.1).

Steps from §3.1:
1. Give the attack request to the LLM and identify one vulnerable parameter.
2. Collect benign parameter values from IoT traffic and keep the observed attack value as the positive example.
3. Apply k-medoids to benign values to select representative values.
4. Ask the LLM for a Python predicate describing when the parameter is malicious; this representation is independent of IDS syntax.

The paper says, “The LLM then generates a Python predicate that distinguishes the attack value from benign ones.” (§3.1, p. 3). Its evidence uses 281 CVEs: 132 command injection, 45 authentication bypass, 30 information disclosure, and 23 path traversal, with the remaining 51 in other classes (Table 1, p. 3).

Verus form (Inference): represent the predicate as a pure `spec fn` over a parsed request and state, then state `ensures` that a generated rule matches exactly when the predicate is true for the selected endpoint and parameter. Use ordinary Rust for parsing and a proof function for the correspondence lemma. This is an inference because the paper uses Python predicates and Suricata, not Verus.

### technique 2: counterexample-guided synthesis and diagnosis
Use this when candidate specifications can be tested against an executable model of the target service. The verifier runs a lightweight LLM-generated mock server. Four checks are required (§3.1, p. 3): the attack request gets a valid response; changing the selected parameter changes server behavior; multiple benign values do not satisfy the specification; and processing of the parameter appears in server logs. Any failed check becomes a counterexample.

Steps:
1. Generate a candidate predicate.
2. Run the mock server with the attack request and the candidate.
3. Execute the four checks and record the failed check as a counterexample.
4. Ask the LLM to diagnose the failure and produce a revised predicate.
5. Cache candidates, counterexamples, and diagnoses and repeat at most 13 iterations (§3.1, p. 4).
6. If no candidate passes by the limit, discard the attack and emit no rule.

The paper explicitly says, “When a specification fails verification, the framework diagnoses the cause of the failure and then generates a revised specification accordingly.” (§3.1, p. 4). It also says, “Our method favors explicit non-generation over deploying unverified rules, which may either miss attacks or trigger on benign traffic.” (§3.1, p. 4)

Verus form (Inference): encode the mock-server checks as executable tests plus proof lemmas over an abstract request model. Counterexamples become failing concrete inputs passed back to a synthesizer; the final proof should establish the predicate-to-rule correspondence with `ensures`. Verus can prove the modeled relation, but network behavior, the real server, and Suricata remain external assumptions unless separately modeled.

### technique 3: deterministic rule compilation and specificity rejection
After verification, the compiler receives the original request and LLM analysis (parameter and payload characteristics). It extracts method, path, attack value, and parameter location, then maps the parameter to the correct Suricata buffer: body for POST and URI for GET (§3.2, p. 4). A specificity test rejects rules that match only generic method/path properties. Compilation is deterministic, so identical inputs produce identical outputs (§3.2).

Verus form (Inference): make compilation a total Rust function over a parsed request and verified analysis, and prove that the emitted rule contains the endpoint, parameter location, and payload condition promised by the specification. Keep the compiler deterministic and separately test serialized Suricata syntax; Verus does not itself validate Suricata’s runtime engine.

## measured results, assumptions, and limits
The evaluation uses 281 attack instances per random seed, three seeds, and 843 instances per method; all LLM methods use Qwen3-8B-BF16 and Suricata 6.0.4 (§4.1). Detection rate is the percentage of those attack instances detected by generated rules; false-positive rate is the percentage of 281 benign UNSW-IoTraffic communications that trigger (§4.2). The full method obtains DR 81.5% and FPR 0.0%; 18.5% are misses where no rule is generated (Table 2). Without the CEGIS loop DR is 41.3%; without diagnosis 57.8%; without the compiler 70.8%, while all these ablations retain 0.0% FPR (Table 3). The paper cautions that DR uses the same attacks used for generation and therefore measures generation success, not generalization (§4.2).

Failures are concentrated where maliciousness depends on server state or response content, because the method sees only HTTP requests (§4.4). The conclusion states, “Since the proposed framework relies solely on HTTP requests, attacks whose maliciousness depends primarily on server-side state or response content remain difficult to characterize.” (§4.4, p. 6)

Inference: for VeruLaw, this is a useful verifier-in-the-loop pattern for synthesizing contracts or detectors from traces, but the 81.5% denominator is 843 generated attack instances evaluated on generation traces, not unseen attacks or verified Rust programs. The trusted base includes the mock server, traffic representativeness, parser, deterministic compiler, Suricata, and the specification that “malicious” is the desired property. VL should preserve explicit non-generation when a contract cannot be proved and should report these trust boundaries.

## techniques for the catalog
- semantic intermediate specification: have an LLM identify a vulnerable parameter and emit a predicate before target-language code
- CEGIS with diagnosed counterexamples: test candidates, return failed checks and diagnoses, and iterate with a hard limit
- deterministic verified compilation: compile a passed specification into syntax-sensitive rules and reject overly broad matches

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
