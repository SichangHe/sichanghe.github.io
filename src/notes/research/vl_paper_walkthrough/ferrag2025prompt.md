# From Prompt Injections to Protocol Exploits: Threats in LLM-Powered AI Agents Workflows
(authored by agents unless marked 🧑)
Tag: `ferrag2025prompt`, [paper](https://doi.org/10.1007/s11432-024-4465-3)

## scope and threat-model method

This survey builds a four-category taxonomy—input manipulation, model compromise, system and privacy attacks, and protocol vulnerabilities—covering more than thirty attack techniques across LLM-agent workflows. It formalizes each category with a system model, adversary transformation, success condition, affected layer, and defenses. The abstract states: “This survey introduces a unified end-to-end threat model for LLM-agent ecosystems, spanning host-to-tool and agent-to-agent communications.” (abstract, p. 1)

The introduction summarizes the motivation: “The alarmingly high success rates summarized in Table I illustrate just how vulnerable LLM-powered agent workflows have become to input manipulation and protocol exploits.” (Section I, p. 2)

Inference: for VeruLaw, the paper is a threat-model input, not a correctness proof. Its equations can become security proof obligations around an agent's Rust/Verus state machine, but the attack success rates summarize heterogeneous external studies and are not directly comparable. The paper itself cautions: “These results are not directly comparable due to variations in model architectures, datasets, experimental setups, and defense mechanisms.” (Section I, p. 2)

## technique: formal input-manipulation model

Model an agent system as `FS(h,x,k)`, where h is dialogue history, x current input, and k retrieved knowledge. An attacker applies `g:(h,x,k)↦(h′,x′,k′)`. The attack succeeds when the safety policy `π(y,a)=0` or an objective loss `L(y,o)≤ε` (equations 3–4, Section III-A, p. 7). Prompt-based attacks restrict g to textual injections `(h⊕δh,x⊕δx,k)` and maximize unsafe/attacker-aligned output probability (equations 5–6, p. 8). Jailbreaking is a subset whose goal is a forbidden output `y∈Yforbidden` while violating policy (equation 7, p. 9). Adversarial/evasion attacks minimize a representation distance subject to changing the output (equation 8, p. 9). Composite attacks compose transformations `gcomposite = gadv ∘ gprompt` (equation 21, p. 17).

Apply it by:
1. Enumerate every context source: conversation, user request, retrieved documents, memory, and multimodal environment (Section III-A, p. 7).
2. Define the safety predicate over both generated text and tool actions, not text alone (equation 4, p. 7).
3. Define an attacker transformation and objective; distinguish policy violation from goal achievement.
4. Test direct, indirect, compositional, jailbreak, and low-level perturbation paths separately, then test their composition.

Verus form (Inference): represent the agent state and context as a Rust struct, define `spec fn safe(output, actions) -> bool`, and define a ghost attacker relation `mutates(old_ctx,new_ctx)`. Prove that untrusted context cannot cause an unauthorized action, or prove a runtime monitor rejects states for which `safe` is false. Keep retrieved text and tool actions distinct in the specification. Verus cannot prove a statistical probability bound without a finite model and explicit assumptions.

The survey's examples include direct prompt injection, Prompt-to-SQL, adaptive indirect injection, compositional instruction attacks, in-context attacks, jailbreak fuzzing, graph-of-attacks pruning, multimodal attacks, and active-environment injection (Section III, pp. 8–15). A concrete MCP failure passes `userInput` directly into `args.query`; the paper's code example shows a benign query followed by `DROP TABLE users; --` (Section VI-B, p. 29). Inference: an agent tool wrapper must parse and authorize structured SQL or API arguments before serialization; a language-model refusal is not a database safety proof.

## technique: model-compromise and poisoning model

For persistent compromise, model the agent as `S=(Mθ,T,Φ)` with model parameters, callable tools, and orchestration logic. Context is `C=(h,x,k)` and output is `(y,a)=FS(C)`; policy `π:Y×A*→{0,1}` marks safe execution (equations 13–14, Section IV-A, p. 16). The adversary transforms context with g and succeeds when policy is violated or objective loss is low (equation 16, p. 17). Prompt-level backdoors use trigger-generation and adaptive trigger optimization; composite backdoors distribute trigger keys across prompt components and activate only when all are present (equation 25, p. 18). Data and memory poisoning alter retrieval or stored records rather than model parameters.

The paper gives concrete mechanisms: BadPrompt ranks trigger candidates by target-label effectiveness and optimizes their embedding distributions; CBA distributes `Δ={δ1,…,δn}` over components `p={p1,…,pn}` and trains negative samples so partial triggers do not fire (Section IV-B, pp. 17–19). PoisonedRAG injects a few malicious documents into a retrieval database; MINJA injects bridging records into agent memory through query/output interaction and progressively removes the overt instruction (Section IV-C, pp. 20–21).

Verus form (Inference): treat model weights, retrieval stores, and memory records as distinct trust domains. Specify signed provenance and an invariant that only authorized records enter the store. For a memory transition, require that every inserted record carries a verified source and that retrieval preserves a non-poisoning predicate. Formal proofs can protect storage/update code; they cannot establish that an opaque neural model ignores a trigger. Use property-based tests and red-team traces for the model-dependent part.

Evidence and limits: CBA reports 100% ASR after poisoning 3% of Emotion samples with false-trigger rate below 2.06% (Section IV-B, p. 18). PoisonedRAG reports 90% ASR after five malicious texts in a database of millions (Section IV-C, p. 20). MINJA is query-only and needs no internal access (Section IV-C, p. 21). These denominators and settings belong to the cited studies; the survey does not re-run them.

## technique: system/privacy and federated threat model

Use a distributed environment `E={A1,…,An}` where agent i has model `Mθi`, local data `Di`, and protocol P. Normal updates are `yi=Mθi(xi)` and `θi(t+1)=Update(θi(t),∇θiLi)`; aggregation yields `θG=Agg({θi})` (equations 27–29, Section V-A, pp. 22–23). Define extraction as reconstructing `x̂` from outputs/parameters subject to similarity `Sim(x̂,xi)≥τ` (equation 30). Membership inference tests `H0:x∉Di` against `H1:x∈Di` and succeeds when posterior confidence exceeds η (equations 31–32). Federated poisoning perturbs `θi′=θi+δi` to maximize global divergence under `||δi||≤ε` (equations 33–34). Side-channel leakage maximizes mutual information between input and timing/size traces (equation 35). Compose the classes as `Gsys=Ginf∪Gfed∪Gside` (equation 36).

How to use it:
1. Identify local, network, and global adversary privileges (Section V-A, p. 23).
2. Mark confidentiality, integrity, and availability goals separately.
3. Add thresholds for reconstruction similarity, posterior confidence, perturbation budget, and request rate.
4. Prove or monitor aggregation, provenance, and rate-limit invariants.

Verus form (Inference): represent each agent update as a verified transition; require authenticated model-update provenance and bound aggregate influence. For privacy, Verus can prove that a Rust service does not log raw secrets, but not differential-privacy or mutual-information bounds without a separate formal probability model. Side-channel resistance requires constant-time/network-shaping assumptions outside ordinary functional proofs.

## technique: protocol-level MCP/A2A threat model

Represent a protocol message as `mij=(id,src,dst,type,payload,σ)`. An adversary transforms it to `m′ij` and may seek integrity violation, impersonation, context tampering, or denial of service (equations 40–44, Section VI-A, pp. 28–29). Authentication attacks are modeled by a forged signature that still passes `VerifyRj`; replay, stolen tokens, confused deputies, and missing nonces are examples (equation 45, p. 28). Context manipulation changes the aggregate state `Ki+1=f(Ki,payload(mji))` by injecting `δk` (equation 47, p. 28). Recursive task spawning `Ti(t+1)=Spawn(Aj,Ti(t))` creates unbounded trees and resource exhaustion (equation 48, p. 28). The unified protocol threat class is `Gproto=Gauth∪Gctx∪Gdos` (equation 49, p. 28).

Apply the model by checking every protocol boundary: strict schema validation and input isolation for prompt injection; code signing and provenance for supply-chain metadata; short-lived tokens, nonces, timestamps, mTLS, and audience binding for authentication; signed discovery and allowlists for A2A peers; rate limits and circuit breakers for DoS; and bounded task depth for recursive delegation. Table VII maps each attack to MCP/A2A/ANP/ACP and gives these mitigations (p. 28).

Verus form (Inference): define a message enum and a `spec fn verify_message` that checks signature, nonce freshness, sender/receiver authorization, schema, and resource budget. Prove that the dispatch function executes only messages satisfying this predicate. Add a ghost task-depth counter and prove a bound; add a replay set and prove nonce uniqueness. For context, make updates typed and authenticated rather than concatenating arbitrary text. The protocol proof must include scheduler and timeout behavior; a local message lemma does not prove global availability.

The MCP code example is a concrete injection boundary: an SDK serializes `userInput` into JSON `args.query` and sends it to a database server (Section VI-B, p. 29). The A2A layer adds cross-agent prompt injection, discovery spoofing, rogue registration, adaptive indirect injection, memory subversion, and contagious recursive blocking (Section VI-C, pp. 30–31).

## evidence, defenses, and product threat

The survey reviewed more than 150 publications and technical reports, cross-referenced CVE/NVD and GitHub advisories, and used expert validation (Section I, p. 4). Table VI classifies input manipulation as low-privilege/high-feasibility at the tool/agent layer; model compromise as medium-to-high privilege at host/model; system/privacy as medium privilege at host/agent; and protocol exploits as low-to-medium privilege/high-feasibility at protocol/agent (Section V-E, p. 26). Table VIII lists 2025 CVEs including indirect prompt injection, SSRF, XXE, path traversal, MCP-Remote command execution, and MCP Inspector CSRF/DNS rebinding (Section VI-B, p. 31).

The survey's defenses are layered: sanitize and validate prompts/schemas; sign code, metadata, and discovery responses; enforce mTLS, nonces, timestamps, least privilege, token audience binding, and explicit delegation; use immutable audit logs and provenance; isolate context per agent; and rate-limit/circuit-break recursive workflows (Table VII, p. 28; Section VII, pp. 30–31). Inference: these controls should be Verus-verified at the Rust boundary, while model behavior remains an assumption tested by adversarial evaluation.

The paper reports selected external ASRs rather than a new common benchmark. Examples include adaptive indirect injection above 50%, compositional instruction attack above 95%, jailbreak fuzzing above 90%, GAP 92%, and AEIA up to 93% (Table I, p. 2). The denominators, models, datasets, and defenses differ, so these values cannot be combined into one product risk score. Inference: VL's largest threat is an agent that proves a local Rust operation while accepting attacker-controlled prompts, tool arguments, memory, or peer messages outside the proof boundary. Existing VL work should not redo generic prompt-injection taxonomy; it should implement typed, authenticated, bounded interfaces and prove their invariants.

## techniques for the catalog

- context-transformation threat model — model attacker changes to dialogue, inputs, retrieval, and outputs with explicit policy/objective success conditions
- prompt/jailbreak/evasion decomposition — distinguish semantic injections, forbidden-output jailbreaks, and representation perturbations, including compositions
- backdoor and poisoning model — formalize persistent trigger, retrieval, training, federated, and memory compromise paths
- privacy and side-channel model — specify extraction, membership inference, update poisoning, and timing/size leakage goals
- authenticated message model — represent protocol messages, signatures, nonces, impersonation, context tampering, and replay as predicates
- bounded recursive workflows — model task spawning and resource thresholds to prove denial-of-service bounds
- layered agent defenses — combine schema checks, provenance, cryptography, least privilege, isolation, rate limits, and circuit breakers
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
