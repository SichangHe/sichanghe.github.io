# Generating Proof-of-Vulnerability Tests to Help Enhance the Security of Complex Software
(authored by agents unless marked 🧑)
Tag: `kanchi2026generating`, [paper](http://arxiv.org/abs/2605.03956v1)

## PoVSmith pipeline
PoVSmith generates executable Java proof-of-vulnerability (PoV) tests for an application that depends on a vulnerable library. Its four phases are call-path analysis, test generation, execution, and LLM evaluation. The paper states: “As shown in Figure 2, PoVSmith has four phases: call path analysis, PoV test generation, test execution, and test evaluation.” (Section 1, p. 2)

## technique 1: agent call-path analysis
Inference: what it is and when to use it: identify the smallest public application entry points that reach vulnerable library APIs through non-public intermediaries. Use it to define the attack surface before generating tests.

steps:
1. Treat each vulnerable library API as a sink.
2. Ask Codex to locate every sink invocation with repository tools.
3. Walk outward from each invocation to the first public method in the application, retaining only non-public intermediaries. Reject paths that pass through another qualifying public source.
4. Verify source ownership, public visibility, and that no other public method lies between source and sink.
5. Emit each chain with fully qualified signatures and file/line ranges. Figure 3’s procedure says, “For each invocation, walk outward to the first public method in this project that reaches the sink exclusively through non-public intermediaries.”

The paper tried WALA, Soot, and CodeQL but reports modern-JDK, source mapping, debugging, and false-positive/negative problems; it therefore used GPT-5.2-Codex with a project-specific prompt (Section 3.1).

Verus form: Inference: for verified Rust, treat unsafe or security-sensitive functions as sinks and public functions as sources. Use Rust module visibility and call-graph tooling to enumerate paths, then encode each security property as a Verus postcondition. Call paths are coverage evidence, not proofs that a sink is exploitable.

evidence: on 33 Java App/Lib pairs covering 20 CVEs, PoVSmith found 216 reported public methods representing 158 unique methods; manual consensus judged 207/216 paths correct (96%). The paper’s dataset contains 207 verified call paths (Section 1). Denominators are reported methods/unique methods, not all repository methods.

## technique 2: exemplar-guided iterative test generation
Inference: what it is: generate a self-contained JUnit test for each source-to-sink path by supplying vulnerability metadata, the call path, and a library exemplar test that demonstrates the exploit.

steps:
1. Give Codex the application context, target source method, vulnerable identifier, vulnerable API list/version, call path, exemplar test name, and exemplar implementation. The template has nine inputs (Section 3.2.1).
2. Reuse the exemplar’s semantic payload, adapt it to the application method signature and data types, and follow Arrange-Act-Assert.
3. Avoid mocking methods/classes in the call path; use the project’s configured test framework; avoid checksum/signature comparisons; and keep the test self-contained. These are among the 11 quality-control rules defined from initial trials (Section 3.2.2).
4. Build or run the test, inspect execution, self-critique whether behavior matches the exemplar, and revise. The procedure has up to five test-generation/execution/self-critique trials (Section 3.2.3).
5. Define success by three conditions: reuse the exemplar payload, assert the same or semantically relevant vulnerable behavior, and have execution logs confirm dynamic behavior. The paper labels these C1–C3 (Section 4.2.2).

Verus form: Inference: translate an exemplar exploit into a Rust test harness that invokes the public API and checks the Verus-specified security property. Replace Java exceptions with Rust `Result`/panic behavior and use ordinary tests plus `verus` proofs for the property. Generated tests remain dynamic evidence; they cannot establish universal safety.

evidence: Phase II generated 152 tests; 141/152 compiled (93%) and 84/152 demonstrated PoV (55%). Of 98 tests for one-hop public methods, 56 (57%) demonstrated PoV; of 54 tests for longer paths, 28 (52%) did. The paper reports 30/60 DoS, 10/13 directory traversal, 3/30 RCE, and 41/49 other attacks demonstrated, denominators being generated tasks in each category (Section 4.4.1). Around 75% of tests needed multiple attempts; about 20% exceeded seven attempts despite a five-trial instruction (Section 4.4.3).

## technique 3: execution-grounded assessment
Inference: what it is: compile and execute every generated test automatically, capture logs, then ask a separate GPT model to classify whether the vulnerability was triggered.

steps: invoke Maven/Gradle (or inspect process exit code for plain Java), save human-readable `.txt` and machine-readable `.jsonl` summaries, extract test-relevant XML excerpts by class/method name, and pass the test plus logs to GPT-5.1. Require strict JSON with `triggered: yes|no|unknown`, confidence, and a short evidence-based reason. The paper explains that raw logs are too long and “can considerably mislead the model to wrongly assess tests,” motivating the reduced summary (Section 3.3).

Verus form: Inference: use build output, `verus` diagnostics, and runtime tests as separate evidence channels. A model may classify logs, but deployment requires successful verification and human review of any `unknown` or failing obligation. Never infer a universal proof from one passing exploit test.

evidence: GPT-5.1 labeled 103 tests triggering, 35 non-triggering, and 14 unknown; interpreting unknown as unsuccessful gives 103/152 correct (68%). For triggering labels, 69/103 were correct (67%); for non-triggering, 34/49 (69%). Confidence did not correlate with accuracy because GPT always returned high confidence (Section 4.5). Codex self-critique was correct for compilation on 134/152 (88%) and PoV demonstration on 94/152 (62%).

## comparison, assumptions, and VL threat
In an ablation on the 33-sample dataset, GPT-5.2-Codex produced 23 manually PoV-demonstrating tests, Gemini Code Assist 11, and Mistral Vibe 12; the prior LLM tool produced 5 (Table 1). These denominators are 33 tasks. Results depend on Java projects, available exemplars, CVE descriptions, build reproducibility, and manual labeling. The authors could not compile 15 of 49 original pairs and excluded one patched dependency, leaving 33 (Section 4.1).

The paper measures executable exploit evidence; it does not prove that all reachable vulnerabilities are found or that passing tests imply soundness. Trust includes Codex/GPT outputs, build tools, manually judged PoV behavior, and the vulnerable-version assumptions. Inference: VL can reuse the staged architecture for regression tests around verified Rust APIs, but must put Verus proof checking ahead of acceptance. Existing work already addresses context-rich prompts, iterative execution feedback, and log-based assessment; VL should not treat these as formal verification. Threat to agent-written verified Rust is moderate for test-generation productivity and high only if dynamic tests replace machine-checked specifications.

## techniques for the catalog
- sink-to-source call paths: enumerate public attack surfaces reaching vulnerable APIs through private intermediaries
- exemplar-guided generation: adapt a known exploit payload to each application entry point
- execution feedback loop: compile, run, self-critique, and revise tests for bounded trials
- log-grounded LLM assessment: summarize build/runtime evidence and classify trigger status with strict JSON
Checked 2026-10-15 against paper kanchi2026generating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
