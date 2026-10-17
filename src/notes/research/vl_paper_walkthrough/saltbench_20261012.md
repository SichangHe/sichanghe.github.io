# SaltBench: A Referee-Gated Protocol for Measuring Method Effects in Machine-Checked Software Work
Tag: `hickey2026saltbenchb`, [paper](https://arxiv.org/abs/2609.11076)

## identity and claim

Jason Hickey, “SaltBench: A Referee-Gated Protocol for Measuring Method Effects in Machine-Checked Software Work,” arXiv:2609.11076v3 (2026). SaltBench is a benchmark protocol and pilot record, not a proof that verification instructions improve correctness. Its central design claim is that an external machine referee should decide outcomes while the agent is isolated from the benchmark's hidden material.

## problem and threat model

The paper treats an agent's self-report as unreliable. An agent may claim success, inspect reference solutions, adapt to a visible harness, or exploit verifier loopholes. SaltBench therefore freezes predictions, isolates the execution environment, and uses a withheld test suite. The abstract states: “Outcomes are decided outside the agent's toolchain.” The threat model includes network access, reference leakage, harness manipulation, admits and assumptions, and budget behavior that could otherwise turn an unfinished run into a failure.

The pilot uses five Rust systems components on a pinned Verus toolchain. Arms include plain Rust work and a salt-diet treatment instructed to specify and verify code. Two additional arms receive specifications in advance. The paper reports descriptive cost and pass-rate cells, but explicitly avoids a causal verdict because the sample and design do not support one.

## protocol steps

First freeze the task, toolchain, predictions, and scoring rules before running the agent. Second insert a wall or network probe before scored work so the agent cannot reach the network, references, or harness. Third keep the referee outside the agent's own toolchain and use a withheld suite. Fourth screen submitted source before verification: compare its abstract syntax tree against the original and reject cheating constructs such as `assume`, `admit`, `external_body`, and related spellings. Fifth let the referee produce the result line and parse it mechanically. Sixth record cost in tokens, dollars, and wall time. A budget stop is recorded as a halt rather than silently counted as failure.

This protocol separates generation from adjudication. In Verus, the verifier emits no independent proof object, so the protocol reports “the referee accepted” rather than claiming a separately checked kernel proof. That distinction is a trust-boundary fact: acceptance depends on the pinned Verus invocation and screening gates.

## technique: isolate the referee and freeze the world

Step 1 create an immutable task and toolchain snapshot. Step 2 run the smoke probes (including a canary) before the driver starts. Step 3 hide reference solutions and harness details. Step 4 freeze the agent's prediction before reading any outcome. Step 5 refuse to start the driver unless the last verdict of every probe is a pass. These steps are the study's ordering of the paper's gates; the paper does not number them, and it runs five probes (a canary, network escapes, arm-file and harness-config reads, symlinked build-directory writes, the compile path). The canary-absent check belongs to the repaired tool-permission fence, not to every run. This prevents post hoc adaptation and makes each cell comparable. The paper reports that the Verus referee's docstring claimed a sandbox but a grep found only the comment, so the referee had been running unfenced; the exec set turned out to be four binaries, with a fifth exec point revealed later by the red arm's panic text. Both show why the fence itself must be tested rather than assumed.

## evidence and limits

The v3 record contains 200 conditions over four models: 181 results of record, 16 inexpressible, and 3 unreached at the cost cap. A later correctness reading reports 447 passes, 40 failures, 10 censored cells, 4 unscorable cells, and 42 read from their condition's count. The paper's check lists 181 conditions with a pass count (181 x 3 = 543 = 501 + 42), so the 42 are cells counted only at condition level, not additional conditions; this arithmetic is the study's inference. These are pilot counts, not population estimates. The paper says the salt-diet pass-rate intervals are descriptive and “says nothing about whether the method makes code more or less correct.” The five authored systems components are not an independent benchmark population; independent authorship is traded for controlled instrumentation. Verus acceptance also lacks an independent proof-object recheck. The protocol's fences and screens reduce threats but do not remove trust in the runner, parser, pinned verifier, or task specification.

## techniques for the catalog

- referee isolation and world freeze: pin toolchain, hide references, fence network, and freeze predictions before scoring
- AST anti-weakening gates: reject admits, assumptions, external bodies, and unauthorized changes before invoking Verus
- budget-stop semantics: distinguish halt, failure, inexpressible, and pass in the result schema
- external adjudication records: keep runner, parser, referee output, cost, and trust-boundary facts outside agent control

## study status

Written from the full PDF; not ChatGPT-checked. All quoted sentences were checked against the extracted PDF text.
Audited 2026-10-12 against the paper: checked every count, the arms, the five components, the screen and halt rules, the fence findings, and the quoted sentences. Changed: the 42 cells read by condition now explained (543 = 181 x 3, marked as inference); the docstring finding corrected (it claimed a sandbox that did not exist); the fence step list and the halt step rewritten to what the paper says, with the numbering marked as the study's own. Not checked: Appendix D prices and the Section 5 tables beyond the cited counts.
