# AXLE: A Cloud Infrastructure for Lean 4 Theorem Proving Utilities
(authored by agents unless marked 🧑)
Tag: `xin2026axle`, [paper](http://arxiv.org/abs/2606.26442v1)

## system and verification problem
AXLE is a hosted service of 14 Lean 4 metaprograms for proof checking, metadata extraction, source transformation, lemma extraction, repair, and simplification. The paper identifies a central distinction: “Compilation alone is frequently unsuitable for AI-generated proof workloads.” (Section 3, p. 3). A file can compile while containing `sorry`, unapproved axioms, a weakened theorem, or unsafe declarations. AXLE accepts a tool name, JSON payload, and target Lean/Mathlib environment over HTTPS and returns structured JSON. Clients include a Python SDK, CLI, MCP server, web UI, and HTTP API.

Inference: For a verified-Rust agent, AXLE is an infrastructure pattern rather than a Rust proof method: expose strict checking and proof-engineering transformations as isolated, versioned services that sit inside generation and evaluation loops.

## technique: strict candidate verification

What it is. `verify_proof` receives a candidate file and a separate formal statement file. It accepts only when declarations match the formal statements and form valid proofs. It rejects declarations containing `sorry`, axioms outside a whitelist (`propext`, `Quot.sound`, `Classical.choice`), mismatched types, or `unsafe` declarations (Section 4.1, p. 3). The exact paper statement is: “The verify_proof tool rejects any declarations that:” followed by those four checks (Section 4.1, p. 3).

When to use it. Use strict verification as a reward gate for reinforcement learning, as the accept/reject oracle in an LLM proof loop, and as a final filter for generated datasets. It targets cooperating candidates and prioritizes throughput.

How to apply it.
1. Pin a Lean version, Mathlib snapshot, and dependency environment; send that environment with each request (Section 3.2, p. 3).
2. Store the intended theorem in a separate statement file and submit the candidate proof (Section 4.1, p. 3).
3. Compile and reject `sorry`, non-whitelisted axioms, unsafe declarations, and signature mismatches (Section 4.1, p. 3).
4. Return a structured pass/fail response and failed declarations; use it as the training reward or agent feedback.
5. Keep the environment trusted only through Lean's normal kernel-checked elaboration path; AXLE does not re-check it from scratch (Section 4.1, p. 3).

Verus form. Inference: A Rust service should compile the candidate with Verus and require the intended function signatures, then reject `external_body`, unchecked axioms, and any unverified function. Inference: The service must distinguish executable Rust from Verus proof/spec code and preserve the exact target contract, analogous to AXLE's separate formal statement. Inference: A Verus checker that trusts preinstalled compiled environments would have the same residual risk as AXLE's environment assumption; hermetic rebuilds or proof replay are needed for hostile submissions.

Evidence and assumptions. On 1,000 paired production requests, AXLE's median latency was 0.97 s, throughput 0.43 requests/s, total wall time 9,205 s, and success 100.0% under a 600 s budget (Table 3, p. 5). SafeVerify had 10.1 s, 0.107 requests/s, 37,258 s, 99.9%; Comparator had 95.7 s, 0.026 requests/s, 151,267 s, 93.8%. AXLE and Comparator agreed on all 938 conclusive pairs; AXLE and SafeVerify agreed on 992 of 999 conclusive pairs, with seven alternative-stricter cases (Table 4, p. 6). Inference: The denominators are paired production requests, and timeout exclusions matter; these numbers do not establish soundness against adversarial environment manipulation.

## technique: isolated, multi-version execution

What it is. Each request runs in its own sandboxed process. “State a request mutates—loaded definitions, set options, registered attributes, allocated memory—does not persist into any later request, and a crash or runaway elaboration in one request does not affect concurrent or subsequent requests.” (Section 3.3, p. 3). The sandbox blocks network and candidate filesystem writes. An environment field selects a Lean/Mathlib version pair and prebuilt dependencies; many such environments run behind one endpoint.

How to apply it.
1. Make version and dependency selection explicit in every request (Section 3.2, p. 3).
2. Launch the proof process in a fresh sandbox, with network and filesystem access disabled (Section 3.3, p. 3).
3. Enforce a per-request timeout, queue bursts, and retry transient worker failures (Section 3.4, p. 3).
4. Use fair-share scheduling so one API key cannot starve other tenants (Section 3.4, p. 3).

Verus form. Inference: Run each agent-generated Rust/Verus candidate in a process or container with a pinned Rust compiler, Verus revision, crates, and SMT solver. Inference: Clear mutable verifier state between requests and disable network and writes from candidate code. Inference: Preserve logs and solver seeds as request-scoped artifacts so a verdict is reproducible.

Evidence. On 5,000 randomly sampled Goedel-workbook proofs, all three systems returned the same verdict for every proof at concurrency 8 and a 150 s budget (Table 2, p. 5). AXLE's median was 1.05 s and throughput 2.09 requests/s; direct Lean invocation was 5.14 s and 1.03 requests/s. The sample's verdict split was 4,708 pass, 287 fail, and 5 timeout out of 5,000 (Table 2 and Appendix A.1, pp. 5, 9). Throughput scaled from 0.29 requests/s at one in-flight request to 2.09 at eight, then plateaued while median latency rose to 4.68 s at 16 (Table 5, p. 9). Inference: Capacity scaled to the eight physical vCPUs in this single-instance experiment; it is not evidence of unlimited cloud scalability.

## technique: declaration extraction and semantic merging

`extract_decls` emits each declaration with transitive in-file dependencies, type/signature/body, source range, type hash, `sorry` status, proof-length and tactic counts, messages, and type/value/syntactic dependency sets (Section 4.2, p. 4). It lets dataset pipelines split a file and lets agents isolate a needed chunk. `merge` combines fragments by α-equivalence or definitional equality, keeps a compiling duplicate where possible, topologically sorts dependencies, and renames conflicting declarations while updating references (Section 4.3, p. 4). Naive concatenation is insufficient because declarations require dependency order and conflict resolution.

Verus form. Inference: Extract Rust items together with crate/module dependencies and Verus proof/spec items; preserve generics, visibility, and source spans. Inference: Merge only items with equal normalized signatures, topologically order modules, and rename conflicting private symbols while rewriting references. Inference: A type hash and dependency graph are useful for cache keys and retrieval, but do not prove semantic equivalence.

## technique: sublemma extraction and deterministic repair

`have2lemma` and `sorry2lemma` capture a proof state, generalize its local context, and emit a top-level lemma whose statement equals the goal; the original call site can be rewritten to invoke it. `have2sorry` replaces a `have` with a stub for sketching. `simplify_theorems` repeatedly removes unused tactics and hypotheses to a fixed point, rolling back a pass if it introduces an error. `repair_proofs` tries to prove residual goals, replaces rejected constructs such as `native_decide`, truncates proofs when no goals remain, and repairs cross-version option issues (Section 4.5–4.6, pp. 4–5).

Verus form. Inference: Turn an unsolved Verus assertion or loop obligation into a separate `proof fn` with generalized parameters and preconditions, solve it independently, then call it from the original proof. Inference: Apply only semantics-preserving simplifications and roll back any edit that makes `cargo verus` fail. Inference: Automated repair must never add `external_body` or weaken `ensures`; those would defeat strict verification.

## what is proved, trusted, and threat to VL

AXLE proves or measures service-level properties: Lean kernel acceptance, tool outputs, latency, throughput, and paired verdict agreement. Trusted components include the Lean kernel, loaded environment, metaprogram implementations, sandbox boundary, and benchmark sampling. The paper explicitly says AXLE “does not re-verify the environment from scratch” (Section 4.1, p. 3), and its limitations exclude arbitrary multi-file projects and interactive proof-state sessions (Section 7.1, p. 7). The 1,000-request strict comparison uses production traffic; the 5,000-proof throughput study drops candidates with non-Mathlib dependencies and normalizes imports to `Mathlib` (Appendix A.1, p. 9).

Inference: The product threat to VeruLaw is high at the workflow layer: an agent that writes verified Rust needs strict, isolated, version-pinned checking and deterministic decomposition/repair to avoid rewarding merely compiling or weakened code. AXLE already covers this infrastructure pattern for Lean; VL should not redo generic queueing, sandboxing, and proof-fragment management without a Rust-specific need. Inference: The semantic checker and trusted environment remain the core product-specific work.

## techniques for the catalog

- strict proof gate: compare a candidate with a separately pinned statement and reject sorry, unapproved axioms, unsafe code, and signature mismatches
- isolated multi-version execution: run each request in a fresh sandbox with explicit language/library versions, timeouts, retries, and fair scheduling
- declaration extraction and merge: emit dependency-closed declarations and recombine fragments by equivalence, topological order, and conflict renaming
- sublemma extraction: generalize an unresolved proof state into a standalone lemma that an agent can solve and call back
- deterministic proof repair: iterate semantics-preserving simplification and localized repair with rollback on compilation errors
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
