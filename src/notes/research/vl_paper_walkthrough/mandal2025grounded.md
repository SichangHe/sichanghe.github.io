# Grounded AI for Code Review: Resource-Efficient Large-Model Serving in Enterprise Pipelines
(authored by agents unless marked 🧑)
Tag: `mandal2025grounded`, [paper](https://arxiv.org/abs/2510.10290)

## system and purpose

The paper describes AutoCodeReview, a GitHub pull-request service that anchors an LLM explanation to a static-analyzer finding, extracts context under a token budget, and serves a quantized model on one on-premise GPU. It targets MISRA C/C++ safety rules but says the architecture is standard-agnostic. The key design is to keep deterministic evidence and natural-language explanation separate: the analyzer identifies a rule violation, while the LLM explains risk and remediation under a structured output contract.

The paper's grounding principle is explicit: “This "grounding-first" approach forces the model to reason about a specific, verifiable issue rather than speculate about the code in general.” (Section 2.2, p. 2). Inference: for Verus, the finding can be a failed verification obligation or lint rule, and the LLM can explain the obligation only with the source span, specification, and verifier diagnostic supplied.

## technique 1: analyzer-to-PR orchestration

Steps from Section 3.1.1 (p. 3), Section 3.2 (pp. 3–4), and Algorithm 1 (p. 5): (1) a PR webhook identifies the commit; (2) the orchestrator checks out the commit and runs repository-configured builds; (3) Coverity runs and emits a machine-readable JSON report; (4) findings are filtered to changed file and line locations; (5) the extractor selects context; (6) a grounded prompt is sent to the serving backend; (7) cache lookup either returns a prior response or invokes the model; (8) the orchestrator posts a threaded comment; (9) later commits remove stale comments and archive the interaction.

Each finding retains rule ID, description, severity, file, line, and analyzer remediation. A repository JSON policy records approved deviations by file, function, and rule; matching findings are suppressed from PR comments but retained in audit logs. Inference: a Verus adapter should preserve the exact diagnostic identifier, source span, crate revision, and proof context, and suppress only explicitly approved obligations while retaining an audit record.

## technique 2: token-budgeted AST context and guarded prompts

The extractor uses the diff to locate the change, parses the AST, gathers the enclosing function body with non-essential comments collapsed, and collects direct caller and callee names relevant to the flow. If space remains tight, it uses a ±k-line sliding window around the violation (Section 3.2.1, p. 4). The snippet is annotated, and the prompt supplies the rule information. The prompt schema contains role and scope, rule rationale, finding metadata, annotated code, an output contract requiring rationale, risk and remediation with line citations, and guardrails against speculation. Responses are checked against the schema before being grouped by rule and posted.

The paper says, “The final extracted snippet is annotated, giving the LLM a complete and verifiable view of the code in question.” (Section 3.2.1, p. 4). Inference: for Verus, include the failing `requires`/`ensures` obligation, relevant `spec fn` definitions, and the smallest caller/callee slice; require proposed fixes to cite Rust lines and specification clauses. Inference: the paper's AST extraction does not establish semantic completeness, so a Verus verifier should remain the authority.

## technique 3: asynchronous, cached, resource-bounded serving

The backend uses FastAPI and Ray Serve, a RabbitMQ queue for backpressure, an AMD MI210 GPU, and an on-demand six-bit GGUF model described as a fine-tuned Qwen2.5 32B variant (Section 3.3, p. 5). Table 1 instead labels its Qwen profile Qwen2.5-coder-23b; the paper does not resolve this discrepancy. The multi-tier cache has llama.cpp KV/prefix caching for shared prompt prefixes, Redis for complete responses for several hours, and PostgreSQL for persistent hashed request-response pairs. Algorithm 2 (p. 6) acquires a GPU lock before model loading and inference, releases it after success or failure, and resets the unload timer. Section 3.3 gives an example idle timeout of 30 minutes, cold loading of approximately 30–45 seconds, a client timeout of 300 seconds, and exponential-backoff retries. On an unrecoverable error or timeout, the system logs the failure and posts no comment.

## evidence and limits

The offline benchmark used 10 C/C++ repositories, about 600,000 lines, 100 synthetic but replayable PR scenarios, and 314 atomic hunks. It ran on one MI210 with 64 GB HBM, 64 vCPUs and 512 GB RAM. For severity-level results, the authors define reduction as `(pre−post)/pre` for items with pre>0, record 1.0 as an introduction when pre=0 and post>0, and exclude pre=post=0 items (Section 4.1, p. 7). Table 1 (p. 8) reports recall proxies without precision because dismissals and false positives are unobserved offline. Developer acceptance is also unobservable in that benchmark (Section 3.5, p. 7).

For the profile labeled Qwen2.5-coder-23b with context and full report, reduction was 0.410, net reduction 0.276, coverage 0.772, weighted recall proxy 0.493, macro proxy 0.446, median total latency 59.81 seconds and first-feedback latency 59.79 seconds (Table 1, p. 8). GPT-4o with the same setting had 0.456 reduction, 0.285 net reduction, 0.882 coverage, 0.576 weighted proxy, and 35.30-second median total latency. These are per-hunk benchmark metrics; first-feedback includes only build/analysis and LLM time (Section 4.3, pp. 7–8). The paper says, “Unless otherwise noted, all metrics refer to the automated benchmark environment (upper-bound capability; not interactive wall-clock guarantees).” (Section 3.5, p. 7). Table 1 also reports introduction fractions of 0.596 for Qwen, 0.603 for GPT-4o, and 0.471 for Claude-3.5 with context and full report. Inference: those values do not establish uniformly lower introduction fractions for Qwen than for proprietary models.

Adding context improved the reported weighted recall proxies: GPT-4o weighted recall rose from 0.493 without context to 0.576 with context, and Qwen2.5 rose from 0.409 to 0.493 (Section 5.1, p. 9). The internal survey had n=8 and is explicitly directional (Section 4.5, p. 9). No cache-hit rate, GPU-hour, energy, precision, or longitudinal drift was measured (Section 5.7, pp. 9–10). Quality is bounded by analyzer coverage; macro-heavy and multi-file cases can exceed context budgets. The authors also report that they did not validate compilation/runtime correctness beyond static-analysis deltas, so semantic regressions could escape detection (p. 10).

## techniques for the catalog

- finding anchored review: tie every LLM comment to a static-analysis rule and source location
- AST context extraction: provide the smallest enclosing syntax and call context under a token budget
- guarded structured prompting: require rationale, risk, remediation, citations, and no unsupported speculation
- layered cache serving: combine prefix, short-term response, and persistent hash caches with on-demand model loading
- deviation audit: suppress approved exceptions in comments while retaining them in compliance logs
