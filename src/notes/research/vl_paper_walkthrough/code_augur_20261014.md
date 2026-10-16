# Code-Augur: Agentic Vulnerability Detection via Specification Inference
(authored by agents unless marked 🧑)
Tag: `luo2026codeaugur`, [paper](https://doi.org/10.1145/3744916.3773102)

## what the paper proves or measures
Code-Augur is an agentic security-audit workflow that makes an LLM's security assumptions executable, falsifies them with grey-box fuzzing, and validates resulting bug candidates. The paper's central claim is empirical: the reason–falsify–refine loop improves vulnerability discovery over two agent baselines. Section 3 states, “Rather than using the agent itself to generate test cases, which would be susceptible to the same blind spots that might lead to invalid invariants in the first place, C ODE -AUGUR delegates test generation to a grey-box fuzzer.” (Section 3, PDF p. 3). The threat model, surviving invariants, and validated reports are the final artifacts (Section 4, p. 4).

The controlled AIxCC benchmark contains 39 vulnerabilities across 9 projects; the OSV snapshot contains 24 reliably reproducible vulnerabilities across 9 projects (Section 5, pp. 5–6). On AIxCC, Table 1 reports Code-Augur totals of 59 (Claude) and 51 (DeepSeek), versus 44 and 36 for Claude Code and 36 and 35 for ATLANTIS. Those totals are Existing plus New across 39 challenges; the table caption defines Existing as “known bugs reproduced” and New as “newly discovered bugs.” On OSV, Table 2 reports totals of 58 (Claude) and 49 (DeepSeek), versus Claude Code's 36 and 19 and ATLANTIS's 29 and 10; denominators differ for Existing (24 vulnerabilities, or 22 for ATLANTIS where two projects did not run), while New is the de-duplicated count at each commit. The paper reports 22 previously unknown vulnerabilities on seven projects in its real-world run, with 16 fixed or confirmed and two assigned CVEs (Section 6.4, p. 8). These are author-reported results under four-hour-per-challenge runs, specified models, hardware, and API budgets; they do not prove universal superiority.

## technique 1: threat-model construction

what it is and when to use it

Construct a structured, project-level security context before local code reasoning. Use it when an audit must distinguish attacker-controlled inputs, trust boundaries, in-scope paths, and relevant state. Code-Augur says, “Reading the codebase, its documentation, and the build configuration, C ODE -AUGUR reasons at a high level, aiming to capture the security properties the system is meant to preserve rather than the details of any single function.” (Section 4.1, p. 4).

how to do it

1. Read source, documentation, and build configuration (Section 4.1, p. 4)
2. Record `attacker_control`, `in_scope`, `trust_boundary`, `security_relevant_state`, and `out_of_scope`; the Little CMS example uses attacker-controlled ICC-profile bytes, transform construction and pixel unpacking, and profile-fields-to-transform-state as the boundary (Listing 1, Section 4.1, p. 4)
3. Carry this document into hypothesis generation, invariant analysis, triage, and final validation; the paper says these fields guide relevant locations and define what counts as a valid report (Section 4.1, p. 4)

Verus form

Inference: represent the threat model as Rust types and spec predicates describing permitted inputs and trust-boundary state. Use `requires` on entry points for attacker capabilities and `ensures` for security-relevant postconditions; use `assert` and proof blocks to connect parsed fields to those predicates. The threat model remains a modeling artifact, not a Verus feature. External input, FFI, and hardware behavior remain assumptions unless separately modeled.

evidence and limits

The paper provides the concrete Listing 1 fields and uses them in its benchmarks, but it does not report independent accuracy for threat-model extraction. Its results assume the model identifies the correct attack surface and that out-of-scope behavior is excluded. Inference: a wrong boundary can make a valid code path disappear from the audit or turn a benign violation into a false bug.

## technique 2: infer, instrument, and check security invariants

what it is and when to use it

When static reasoning deems a site secure, record the assumption as an explicit invariant instead of trusting the verdict. Section 4 says, “When a site is deemed secure, C ODE -AUGUR instead records the assumptions behind this verdict as invariants, each committed into the source as an assertion, yielding the instrumented program P ′.” (Section 4, p. 4). The invariant is tied to a trust boundary or attack surface and must be security-relevant, not an arbitrary functional property (Section 4.2, p. 5).

how to do it

1. Generate a hypothesis `h` about a source location `s` against the threat model and existing invariants (Algorithm 1, lines 1–4, Section 4.2, p. 5)
2. Evaluate it with iterative LLM reasoning; flag an insecure candidate directly, or produce a falsifiable invariant when the site appears secure (Section 4.2, p. 5)
3. Insert the invariant as a tagged, uniquely identified assertion in the native language, preserving a distinguishable failure signal (Section 4.2, p. 5)
4. Rebuild the instrumented program; if syntax or compilation fails, repair the assertion and rebuild until it is valid (Algorithm 1, lines 8–12, Section 4.2, p. 5)
5. Preserve the seed corpus across later falsification calls (Section 4.3, p. 5)

The Little CMS example infers `fmt.channels = cs.channels`; a 13-channel profile later violates that relation although a downstream unpacker reads one 4-byte value (Section 2.1, p. 2; Section 4.2, p. 5). The gpsd case records `satellites_visible ≤ MAXCHANNELS` and uses it across more than ten consumers and producers (Listing 2, Section 6.5, p. 9).

Verus form

Inference: encode the invariant as a `spec fn` or an `ensures` clause over a Rust function's mathematical state, and use `assert` or a loop `invariant` statement to expose it to the verifier. A runtime assertion from the paper is not a Verus proof: Verus proof code is erased, while executable checks must remain ordinary Rust. A parser boundary can use `requires` for assumptions and `ensures` for the preserved relation; callers then need proofs that their inputs satisfy the precondition.

evidence and limits

Table 3 attributes 21/59 (Claude) and 17/51 (DeepSeek) AIxCC findings, and 24/58 (Claude) and 13/49 (DeepSeek) OSV findings, to invariant trips; each fraction's denominator is that model's total findings in the corresponding benchmark. The paper notes that DeepSeek's lower result is largely fewer invariant trips. Inference: these are discovery-attribution counts, not proof-completeness measures. Assertions cover only modeled properties, and a surviving invariant means no tested witness was found, not mathematical validity.

## technique 3: specification-guided falsification and triage

what it is and when to use it

Use grey-box fuzzing to target violation of an invariant rather than blind coverage. Section 4.3 says, “The Specification Guided Fuzzer takes the instrumented target P ′ and the invariant ϕ, and searches for a witness i¬ϕ that violates it.” (Section 4.3, p. 6). Fuzzing preparation builds a harness, connects invariant reachability/trip/distance signals to feedback, and lets standard engines such as libFuzzer or Jazzer search (Section 4.3, p. 6; Section 5, p. 6).

how to do it

1. Build `P′` and a harness (reuse an existing one or synthesize one), and connect each invariant to feedback (Section 4.3, p. 6)
2. Abort on the first invariant violation for triage, but allow subsequent triggers so the campaign can reach deeper crashes; retain reachability, trip, and bucketed distance feedback (Section 4.3, p. 6)
3. Search for `i¬ϕ`; if none is found, add ϕ to the surviving set (Algorithm 2, lines 2–4, Section 4.3, p. 5)
4. Reproduce the witness and inspect state at the assertion. Classify it as a genuine security bug or benign over-strong invariant (Section 4.3, p. 6)
5. For benign violations, refine ϕ and repeat the reason–falsify–refine loop; for genuine violations, retain a bug candidate (Algorithm 1, lines 13–19, Section 4.2, p. 5)

The implementation allocates 16 libFuzzer counters per C/C++ invariant (one reachability, one trip, fourteen logarithmic distance buckets); JVM uses Jazzer `exploreState` and `minimize` (Section 5, p. 6). Go and Rust lacked distance-guided feedback in this implementation (Section 5, p. 6).

Verus form

Inference: use the invariant as a Verus postcondition or loop invariant and use generated concrete tests as a complementary falsification harness. Verus can prove the relation for modeled executions, but it does not turn a fuzzer witness into a proof. A failing Rust test supplies a counterexample to a proposed contract; repair the contract or implementation, then rerun Verus. Do not write `invariant(...)` as a call; in Verus it is a loop annotation construct.

evidence and limits

Code-Augur's design makes semantic states easier to reach than deep crashes, but fuzzing remains randomized and bounded by harness quality and budget. The paper's controlled runs use four hours per challenge, 12 CPUs, 32 GB RAM, and up to $100 API credits (Section 6.1, p. 6). “If no input breaks ϕ, the invariant holds” is the algorithm's operational outcome (Algorithm 2, line 4), not a complete proof over all inputs.

## technique 4: proof-of-vulnerability validation

what it is and when to use it

Validate every candidate at a program boundary and under the declared attacker capabilities. Statically flagged candidates need a boundary PoV; fuzzer candidates already carry a witness. The paper states, “If C ODE -AUGUR cannot produce a boundary PoV for a given bug candidate, it does not report the bug.” (Section 4.4, p. 6).

how to do it

1. Construct a boundary input for static candidates rather than invoking an internal function (Section 4.4, p. 6)
2. Reproduce the defect and check that the input is reachable under the threat model (Section 4.4, p. 6)
3. Reject paths outside the in-scope attack surface; report only confirmed candidates (Section 4.4, p. 6)
4. For real-world logic/access-control findings, manually trace the report and PoV against developer intent; memory-safety findings use crashing inputs (Section 6.4, p. 8)

Verus form

Inference: expose a public Rust entry function with a contract for attacker-controlled inputs, prove that the boundary parser establishes the internal preconditions, and prove the safety postcondition. Keep PoV generation as executable tests or model-checking harnesses; Verus does not validate deployment reachability, disclosure status, or maintainer intent. FFI and environment calls need explicit trusted specifications.

evidence and limits

The paper manually validated 22 previously unknown findings and disclosed them; 16 were fixed or confirmed, two had CVEs, and the remainder were under assignment (Section 6.4, p. 8). This evidence measures practical discovery and response, not formal proof. The paper does not quantify false negatives, and its baselines use the same OSS-CRS entry-point convention.

## what remains trusted, contradictions, and product threat

Trusted elements include the LLM's threat model and hypotheses, the fuzzer and harness, the assertion instrumentation, triage reasoning, PoV reachability judgment, compiler/toolchain, and the correctness of the stated security intent. The paper evaluates findings against known PoVs or manual judgment; it does not prove the inferred invariants, the fuzzer's completeness, or the absence of undiscovered vulnerabilities. The reported “61–370% more bugs” OSV comparison and “34–63% more” AIxCC comparison are relative totals under same-model baselines; percentages are not raw recall and use different runnable-subject denominators. Inference: the product threat to agent-written verified Rust is substantial for specification errors: a Verus proof can pass a wrong security contract just as a Code-Augur invariant can survive an insufficient campaign. The useful design to reuse is the explicit assumption, counterexample, repair, and boundary-validation loop around the proof, not runtime assertions as a replacement for proofs.

## what VL should not redo

Code-Augur already combines threat modeling, source-level invariant recording, specification-guided grey-box fuzzing, violation triage, and boundary PoV validation. VL should not claim these as new mechanisms without a distinct Verus integration or evidence. Inference: VL can add value by checking that Verus contracts are linked to concrete attacker inputs and by preserving counterexamples and contract revisions across dependency changes; this paper does not evaluate that integration.

## techniques for the catalog

- threat-model artifact — record attacker control, scope, trust boundaries, security state, and exclusions before local reasoning
- falsifiable invariant loop — commit security assumptions as source assertions, target them with grey-box fuzzing, triage violations, and refine benign assumptions
- boundary PoV validation — report only candidates reproducible from an attacker-controlled program boundary and allowed by the threat model
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
