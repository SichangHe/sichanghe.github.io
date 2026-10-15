# ChipMEM: Verification-Grounded Memory for EDA Agents
(authored by agents unless marked 🧑)
Tag: `alrabah2026chipmem`, [paper](https://arxiv.org/abs/2609.27067)

## problem and architecture
ChipMEM adds memory around an unchanged EDA agent. It stores reusable procedures only when a deterministic domain harness accepts the final artifact, while a Bayesian component records every tool outcome for retry advice. The paper's key design is: “ChipMEM is an agent-agnostic layer that converts tool-verified execution traces into two complementary memories” (section 3, p.4). Procedural memory transfers strategies across tasks; statistical memory predicts tool-call success and recovery within a session.

## technique 1: procedural memory gated by an external checker
Use this when agent trajectories produce artifacts that a domain tool can deterministically accept or reject. Represent each skill as a key-value item `(task embedding -> skill, metadata, verifier outcomes)`. Embed a task artifact that excludes agent instructions, retrieved skills, history, generated files, tests, and scoring artifacts. Retrieve at most K items whose cosine similarity exceeds τproc. After execution, distill the trajectory into a skill only if the harness returns PASS; FAIL and INVALID add nothing.

Steps are explicit in Algorithm 1 (pp.5–6): initialize an empty library; embed each task; retrieve top-K skills; give task and skills to the agent; record every action/result; run the domain harness; on PASS distill and store the procedure, otherwise leave the library unchanged. The adapter defines acceptance: “PPA acceptance requires successful synthesis, functional equivalence, and a positive audited improvement.” (section 3, p.6). Frozen mode keeps a read-only initial library; evolving mode carries accepted additions forward.

Inference: VL can use a Verus compile/check run as the acceptance gate. Store a proof-repair recipe only after `verus` accepts the complete Rust artifact and its specified tests; include toolchain, crate, assumptions, and verifier output in metadata. Embeddings can retrieve analogous APIs, but similarity is a proposal mechanism, not proof. Trusted state is the Verus verifier, compiler/toolchain, and any allowed external bodies.

Evidence: with frozen memory on 20 unseen CVDP tasks (10 stimulus and 10 checker), CID012 remained 10/10 and CID013 rose from 8/10 to 10/10; overall 18/20 to 20/20 (Table 2, p.9). This denominator is one evaluation per task and read-only memory. On five matched RTL-OPT designs, memory-off produced 3 strict passes, procedural-only 4, Bayesian-only 4, and combined 5 (Table 1, p.8). The study is small and uses top two retrievals at threshold 0.6 (limitations, p.9).

## technique 2: statistical retry and recovery memory
Use this when repeated tool failures waste latency. For each tool call c_t, error class e_t, and saturated prior retry count b_t=min(r_t,3), maintain a hierarchical Beta-smoothed retry probability: p0→p1(c)→p2(c,e)→p3(c,e,b), with K=8. If the final probability is below τstat=0.20 after a same-type failure, rank recovery actions by a parallel hierarchy q0→q1(action)→q2(action,error)→q3(action,error,stage), and pass the ranked advice to an LLM recovery planner. Every completed call atomically updates both models.

The paper says statistical memory “maintains a prior belief over tool-call success based on statistics collected from prior runs, updates the prior based on the current trajectory, and provides advice on tool-retry success and failure-recovery strategies” (section 3, p.5). Inference: a Verus adapter can classify failures (SMT timeout, unsupported feature, type error, missing invariant), estimate whether retrying unchanged is useful, and suggest inspect-log, simplify-quantifier, or add-lemma actions. The Bayesian probabilities guide actions; only Verus acceptance validates a repair.

Evidence: across 50 OpenTitan sessions (ten designs, five attempts per mode), ChipMEM reduced mean LLM calls 29.4→26.1, tool calls 27.4→23.3, tool time 420.2→369.8 seconds, input tokens by 6.8%, and total tokens by 3.4% (section 5, p.8). These are means over 50 sessions, not per-design correctness claims. The recovery planner remains LLM-generated and therefore untrusted.

## technique 3: deterministic domain adapters and strict outcome logging
Use an adapter to keep memory independent of a specific agent. It supplies the original task, retrieved skills, and recovery advice; exposes tools; records trajectory H_n; and returns the artifact to a deterministic harness V. For CVDP, PASS requires hidden simulation, coverage, and mutation checks; for PPA, synthesis, equivalence, and audited improvement are required (section 3, p.6). Statistical memory updates after every call even when procedural memory does not.

Inference: VL should log the exact Verus command, source revision, dependency versions, diagnostics, and test outcomes. A failed proof attempt can update failure statistics but must never enter reusable-lemma memory. This separates learning from the trusted acceptance decision.

## technique 4: evaluate transfer with frozen memory and matched controls
Use frozen libraries to test whether stored skills transfer rather than merely accumulate. Compare the same model, prompts, tools, budgets, task order, and seeds with memory disabled versus enabled. Report strict PASS, equivalence, audited gains, and interaction cost with explicit denominators. The paper notes that “Because the library is read-only, the two additional passes reflect transfer from previously learned procedural memory.” (section 5, p.9).

Results across public benchmarks: mean area improvement rose 6.18%→8.79% on RTL-OPT and 5.95%→8.88% on 54 scored RTLRewriter cases; full-PPA Custom Design Set area/power rose 0.14%/0.39%→0.31%/0.52%; OpenTitan rose 0.05%/0.00%→0.24%/2.54%, with equivalence passing 6/10 in both modes (section 5, pp.8–9). The RTLRewriter denominator excludes five zero-cell cases; mixing area-only and full-PPA scopes would be misleading.

## what is proved, trusted, and threat to VL
ChipMEM proves no theorem about memory correctness. It measures tool-accepted hardware artifacts and transfer. It trusts deterministic EDA harnesses, embedding/retrieval code, Bayesian implementation, LLM actions, and proprietary agents. Limitations are five RTL-OPT designs, ten unseen tasks per CVDP category, fixed top-two retrieval, and no broad runtime study (section 6, p.9). Existing work already establishes tool feedback and retrieval; VL should not redo the generic claim that checker-gated memory can preserve accepted artifacts. Threat to agent-written verified Rust is medium: the architecture directly supports checker-gated proof memories and failure statistics, but retrieval contamination, stale toolchains, and unsound external assumptions remain product risks. Inference: a Verus-specific implementation should require reproducible checker logs and invalidate memories when the verifier/toolchain changes.

## techniques for the catalog
- checker-gated procedural memory — retrieve task-similar skills and store only trajectories accepted by a deterministic harness
- Bayesian retry predictor — estimate tool-call success from hierarchical Beta posteriors with saturated retry history
- recovery-action ranking — rank error-specific recovery strategies by smoothed historical success
- agent-agnostic verification adapter — standardize task, tool, trajectory, and final-artifact interfaces across domains
- frozen transfer evaluation — test memory reuse on unseen tasks with read-only libraries and matched controls
Checked 2026-10-15 against paper alrabah2026chipmem: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
