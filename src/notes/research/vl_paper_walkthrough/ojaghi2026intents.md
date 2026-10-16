# From Intents to Algorithms: Verified Algorithm Discovery for Transport Networks
(authored by agents unless marked 🧑)
Tag: `ojaghi2026intents`, [paper](https://arxiv.org/abs/2609.27386)

## scope and result

VERA-TN is a verification-guided architecture for discovering transport-network ranking algorithms from declarative intents. An LLM is allowed to vary typed request-ordering and path-ranking expressions; a trusted allocator constructs paths, checks constraints, mutates resource state, and performs actuation. The released proof of concept is deliberately smaller than the architecture: it evolves a bounded ten-parameter numerical vector and makes no live LLM calls. The abstract is explicit that the artifact is “a bounded ten-parameter numerical candidate and deterministic replay, rather than a completed live-LLM/AST study.” (abstract, p. 1).

Across 150 certified held-out cases on a 28-node TEFNET24-derived hierarchy, evolutionary search reaches mean priority-utility ratio 0.958, versus 0.952 for equal-budget random search and 0.940 for priority-greedy routing (Table III, p. 13). Evolution is better than random with Holm-adjusted p = 0.0083, but the gain is small; it does not improve congestion over the MILP-C oracle, failure-aware training is inconclusive at p = 0.051, and eight national-topology searches plus 12 unseen metro topologies show no stable intent-specific specialization (abstract, p. 1; Section VIII, p. 15).

## technique 1: compile intent into a typed intermediate representation

What it is. A natural-language intent is compiled into `IIR = ⟨O, C, F, B, D⟩`: ordered objectives, immutable constraints, read-only features, syntactic/resource bounds, and a trusted execution/deployment contract (Section IV-A, p. 5). Ambiguous, contradictory, or unsupported requirements are rejected or returned for clarification (Section III-B, p. 4). The representation makes the generator's authority explicit.

Steps. (1) Separate objectives such as admission, congestion, and reconfiguration from hard constraints. (2) Reject intents that contradict operator constraints. (3) Normalize the permitted request and path features. (4) Define bounds on AST depth, operators, constants, and execution. (5) declare that candidates return only ranking scores and cannot access arbitrary controller state, files, network, or undeclared tools (Section IV-A/B, pp. 5–6). The paper states, “The bounds component B restricts generated programs to a finite, deterministic, and resource-bounded expression space.” (Section IV-B, p. 6).

Verus form. Inference: compile a product requirement into a Rust/Verus module containing immutable `requires`/`ensures` contracts and a typed set of feature functions. Keep generated logic in a restricted function whose caller owns all state updates. Inference: reject a request that weakens a hard postcondition; expose only read-only ghost/specification values needed by ranking. This is an architectural analogy, not a claim that the paper uses Verus.

Evidence and limits. The paper's IR and DSL are specified, but the released artifact does not implement the typed AST or live LLM generation (Section VI, p. 12). Inference: the trust boundary is therefore a design claim supported by the numerical implementation, not an end-to-end LLM result.

## technique 2: bounded typed algorithm representation

What it is. A candidate is `A = (h_ord, h_path)`, where one deterministic function orders requests and the other ranks prevalidated paths (Equations 22–24, p. 6). The DSL permits weighted sums, lexicographic rules, min/max, bounded products, thresholds, and conditionals (Equation 25, p. 6). Structural variation includes feature selection, operator choice, thresholds, interactions, and branches rather than only coefficient tuning. Recursion, unbounded loops, dynamic imports, mutable globals, system calls, external access, and controller invocations are excluded (Section IV-B, p. 6).

Steps. (1) Define the feature schema and static types. (2) Generate a structured AST with `request_ordering` and `path_ranking` trees. (3) Permit only whitelisted operators and bounded constants. (4) Serialize accepted ASTs so they can be replayed without the originating model (Section V-B, p. 8; Section VI, p. 12). (5) For the proof-of-concept, use a ten-parameter vector over priority/order and path features; the architecture's AST study remains future work (Table II and Section VI, p. 12).

Verus form. Inference: represent generated policy choices as an enum or bounded data structure, and interpret them in a fixed Rust function with a Verus contract. Do not compile arbitrary model-produced Rust into the trusted binary. Inference: canonical serialization and hash-based identity can make each policy replayable and support proof-cache invalidation when the policy changes.

Evidence and limits. The numerical candidate has population 24 and 14 generations (Table II, p. 12). The paper explicitly does not compare model-generated AST search with genetic programming under the same grammar and budget (Section VIII, p. 15). Inference: no claim about LLM algorithm-design advantage is supported yet.

## technique 3: trusted allocator and feasibility preservation

What it is. The generated functions only choose request order and path order. A deterministic allocator receives prevalidated loop-free paths, checks capacity, and atomically updates loads. Paths over the latency bound are removed before ranking. Proposition 1 proves that every returned allocation preserves path validity, latency, single-path assignment, and link capacity under four assumptions: a feasible initial state, valid latency-feasible paths, an allocator capacity check, and atomic state updates (Section IV-E, pp. 7–8).

Steps. (1) Enumerate up to K deterministic candidate paths and remove latency-infeasible paths. (2) Sort requests by `h_ord`. (3) Sort each request's candidates by `h_path`, with deterministic identifier tie-breaks. (4) For each path, require `l_e + b_k ≤ C_e` for every link. (5) Atomically add bandwidth and mark at most one path admitted; reject the request if no path passes (Section IV-D, p. 7). The paper says, “Therefore, hord determines which request receives earlier access to scarce resources and hpath determines which feasible route is preferred, but neither function can directly commit an infeasible allocation.” (Section IV-D, p. 7).

Verus form. Inference: this maps naturally to a Rust allocator with `requires` for a valid initial resource state and `ensures` for capacity, path, latency, and single-assignment invariants. A loop over requests needs a Verus `invariant` expressing capacity preservation and ownership of the mutable resource state. Inference: the generated ranking function should have no permission to mutate allocator state; only the trusted allocator's proof should establish the postcondition.

Evidence and limits. Proposition 1 is conditional and proves feasibility, not optimality. The paper states, “Proposition 1 establishes feasibility preservation, not optimality or complete correctness of the generated algorithm.” (Section IV-E, p. 8). Inference: correctness still depends on the candidate-path generator, capacity data, atomicity implementation, and the truth of the model's assumptions.

## technique 4: static and runtime candidate verification

What it is. Every candidate passes a static verifier and an adversarial runtime verifier before network scenarios. Static checks enforce AST schema, feature declarations, types, numerical bounds, depth/node limits, and absence of prohibited capabilities (Section V-C, p. 9). Runtime checks execute micro-instances and require finite deterministic outputs with no exception or budget violation. Program validity is `V_prog(A) = V_stat(A)V_run(A) = 1` (Equation 50, p. 9).

Steps. (1) Parse the AST and reject undeclared operators/features. (2) Check input/output types and bounded constants. (3) Check complexity and prohibited capabilities. (4) Compile valid ASTs into an executable scoring function. (5) Run adversarial micro-instances to detect NaN/Inf, timeout, exceptions, and nondeterminism. (6) Only then execute through the trusted allocator (Section V-C and Table I, pp. 9–10).

Verus form. Inference: use Verus compilation and a clean proof run as the static gate; use runtime tests for panic, overflow, timeout, nondeterministic inputs, and forbidden I/O. A Verus proof does not itself validate an arbitrary external allocator or hardware behavior, so the product should keep those assumptions explicit. Inference: reject residual `assume`, `admit`, `external_body`, or unverified helper bodies before deployment.

Evidence and limits. The paper distinguishes program admissibility from network feasibility and reports both as separate stages (Table I, p. 9). Runtime micro-instances are finite, so they cannot prove behavior for all network states. Inference: the checks are a sound gate only for the modeled DSL and trusted allocator, not a complete proof of an unconstrained program.

## technique 5: scenario evaluation, exact oracle, and structured failure witnesses

What it is. Valid candidates are evaluated on disjoint training, validation, and test scenario sets. Tractable cases are compared with a certified exact MILP oracle. Instead of returning only a scalar score, VERA-TN emits a structured witness containing scenario, failure type, affected requests/links, observed and reference behavior, and a deterministic explanation (Section V-F, pp. 10–11).

Steps. (1) Partition scenarios so test cases and topology families remain unseen during discovery. (2) Run the candidate through the allocator and compute admission, SLA, utilization, reconfiguration, and runtime metrics. (3) Where an MILP certificate exists, compute optimality gap and request-level admission regret. (4) Extract bounded witnesses for invalid programs, admission regret, congestion, robustness, or reconfiguration. (5) Rank witnesses by intent impact and retain at most `N_w` per parent. (6) Feed parent, metrics, and witnesses to the next mutation or repair call (Sections V-A, V-D, V-E, V-F, pp. 8–11).

Verus form. Inference: use compiler diagnostics and failed proof obligations as structured witnesses, including the exact function, obligation, assumptions, and counterexample values. Keep witness generation separate from final acceptance. Inference: an exact oracle can compare functional outcomes, but it cannot replace a Verus proof of memory safety or the specified Rust behavior.

Evidence and limits. The authors explicitly say witnesses are finite-scenario feedback, not exhaustive symbolic counterexamples (Section V-F, p. 11). Table III aggregates 150 paired test cases (caption, p. 13); utility means are 0.940 ± 0.050 for priority-greedy, 0.952 ± 0.046 for equal-budget random, and 0.958 ± 0.041 for evolutionary search (Table III, p. 13). Evolution reaches exact priority utility in 50/150 cases but has mean peak utilization 0.961 versus MILP-C's 0.939 (Section VII-B, p. 13). The denominators and settings show that utility improvement does not imply congestion improvement.

## technique 6: diversity-preserving evolutionary repair and reproducible replay

What it is. Candidates are selected by intent-defined objective ordering while reserving population slots for structurally diverse ASTs. Mutations include parameter, feature, operator, branch, subtree recombination, and targeted repair (Section V-B/G, pp. 8, 10). The loop stops at a generation limit, evaluation budget, or stalled validation improvement; only after validation selects a candidate is the hidden test set used (Algorithm 1, p. 11).

Steps. (1) Initialize human seeds and generated candidates. (2) Verify each candidate and discard invalid ones from performance ranking. (3) Evaluate valid candidates on training scenarios and archive metrics/witnesses. (4) Select elite and diverse parents. (5) Generate constrained children, canonicalize ASTs, and deduplicate. (6) Repeat until budget or convergence. (7) Select `A*` on validation ordering and evaluate it once on test scenarios. (8) Record model version, prompt version, parent hashes, AST, checks, metrics, witnesses, token/time cost, and seed; replay serialized accepted ASTs without LLM inference (Algorithm 1 and Section V-J, pp. 11–12).

Verus form. Inference: apply the loop to proof-policy candidates or code repairs, preserving the original specification hash and retaining rejected candidates. Re-run Verus from clean sources for every accepted candidate; cache only proofs whose exact source and dependency hashes match. Inference: diversity should cover invariant structures and lemma choices, while a final deterministic compile remains the acceptance gate.

Evidence and limits. The released numerical artifact performs deterministic replay and records solver certificate status (Table II, p. 12). It does not implement live model calls, so LLM token cost and model-generation reliability are not measured. Intent-transfer experiments show no stable diagonal specialization on eight national seeds and 12 unseen metro regions (Section VIII, p. 15). Inference: replayability is demonstrated more strongly than LLM-guided discovery.

## what is proved, trusted, and relevant to VL

The formal result is conditional feasibility preservation for the trusted allocator and a lexicographic tie-break bound in the exact reference model (Lemma 1, Section III-B, p. 4). The experiments measure utility and robustness of a bounded numerical search, not semantic correctness of arbitrary generated code. Trusted assumptions include candidate-path enumeration, capacity and delay data, atomic state updates, solver certificates, and the intent's specification. The paper's own conclusion says the contribution is “the trust boundary and its reproducible numerical evaluation” and “not evidence that an LLM improves heuristic design” (Section VIII, p. 15).

Inference: the strongest transfer to VL is the separation of agent-generated decision logic from a small, verified Rust authority. A VL system can let an agent propose proof or implementation fragments while a trusted Verus module owns state, contracts, and actuation. The threat to agent-written verified Rust is specification and authority leakage: an agent may change the contract, call untrusted code, or exploit an allocator assumption while preserving a superficial proof. Protected specifications, static capability checks, clean Verus runs, and archived replay artifacts address these concrete boundaries. Existing VL should not redo a generic claim that an LLM improves algorithm discovery; the missing experiment is a Verus-specific trusted-wrapper study with exact accounting for accepted/rejected candidates, proof repair effort, and remaining assumptions.

## techniques for the catalog

- intent-to-IR compilation — turn natural-language objectives and hard constraints into a typed, bounded machine-readable contract
- bounded AST/DSL search — restrict generated ranking logic to typed, finite operators and replayable serialized trees
- trusted allocator — keep path construction, resource accounting, constraint enforcement, and actuation outside generated logic
- static/runtime verification — reject malformed, over-complex, nondeterministic, or unsafe candidates before scenario execution
- oracle and failure witnesses — compare tractable cases to exact optimization and feed structured finite-scenario failures into repair
- diversity-preserving evolution — mutate, recombine, validate, archive, and replay candidates under disjoint train/validation/test scenarios
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
