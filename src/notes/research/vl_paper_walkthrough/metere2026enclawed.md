# enclawed: A Configurable, Sector-Neutral Hardening Framework for Single-User AI Assistant Gateways
(authored by agents unless marked 🧑)
Tag: `metere2026enclawed`, [paper](https://doi.org/10.5281/zenodo.20100247)

## scope and result

Metere presents enclawed, a hard fork of OpenClaw for single-user gateways in regulated enclaves. The paper combines confidentiality labels, host admission, signed modules, egress controls, tamper-evident logging, human approval, rollback, and a four-level verification lattice. The formal-verification material is concentrated in Section 4.3 (pp. 12–13), while the classification model and its invariants are in Sections 2.1–2.2 and 4.4 (pp. 6–7, 13–15). The paper reports an implementation and tests; it does not give a machine-checked semantic proof of the whole framework.

The central trust boundary is below plugins. The host runs `bootstrapEnclawed()` before imports, pre-verifies manifests, installs guards, opens the audit log, and freezes the trust root in the enclaved flavor (Sections 3.2–3.3, pp. 9–10). The paper states the deployment goal precisely: “The verification lattice is now closed at the top” (Abstract, p. 1). Its four levels are `unverified < declared < tested < formal` (Section 4.3, p. 12).

## technique 1: static effect containment

purpose and trigger

`skill-formal-static.mjs` walks every script next to `SKILL.md` and computes a sound over-approximation of effects in a fixed capability vocabulary: `net.egress`, `fs.read`, reversible and irreversible writes, tool invocation, process spawning, publishing, payment, and schema mutation (Section 4.3, p. 12). Use it before admitting a skill when the manifest declares the capabilities that the script is allowed to exercise. The paper says, “Reflective constructs (eval, exec, dynamic import) taint the analysis to the lattice top so the verdict is conservative by construction” (Section 4.3, p. 12).

how to do it

1. enumerate each colocated Python, shell, Node, or TypeScript script (Section 4.3, p. 12)
2. infer an effect set, conservatively adding the top effect when reflection prevents precise analysis
3. read the manifest capability set `M.caps`
4. admit only when the inferred set is contained in `M.caps` (Section 4.3, p. 12)
5. record the static verdict as evidence for the later bundle (Section 4.3, pp. 12–13)

Verus form

Inference: model the capability set and effect set as finite mathematical sets in a `spec fn`, and prove an `ensures` clause that every observed effect is in the manifest set. A Verus `proof fn` can establish set inclusion for a fixed, already-parsed effect table. The source walk, shell semantics, and conservative treatment of `eval` remain outside Verus and must be trusted as inputs. Verus has no direct proof of arbitrary Python or shell behavior; a Rust wrapper can enforce the admitted capability set at the dispatch boundary.

reported evidence and boundary

The paper gives the soundness design but no precision rate, false-positive count, or corpus denominator. Reflection is deliberately escalated to the lattice top, so dynamic code is rejected or requires the broadest declaration. Native code, child processes, and shared-memory channels are outside the JavaScript guards (Section 4.2, p. 12); the paper therefore requires kernel controls for a true enclave. Inference: static containment lowers accidental effect reachability but cannot prove that a script's declared meaning matches an organization's policy.

## technique 2: refinement-typed dispatch

purpose and trigger

`skill-formal-types.mjs` builds a frozen dispatcher from a manifest. `buildRefinedDispatch(M)` throws `RefinementError` when an envelope names a capability outside `M.caps` (Section 4.3, p. 12). The dispatcher is the only ingress to host APIs, so an LLM-produced envelope must pass the capability predicate before an API call. The paper states, “The dispatcher is the runtime’s only ingress to the host application programming interfaces (APIs)” (Section 4.3, p. 12).

how to do it

1. parse and authenticate manifest `M`
2. construct `buildRefinedDispatch(M)`
3. freeze the returned dispatcher
4. route every envelope through it
5. reject an envelope whose capability is not in `M.caps`, otherwise invoke the corresponding host API (Section 4.3, p. 12)
6. retain the capability set as the runtime evidence for the bundle

The paper additionally gives a leakage bound: “The data-processing inequality [58] bounds the per-envelope leakage at log2 (|D| + 1) bits, where D = M.caps” (Section 4.3, p. 12). The denominator is the number of declared capabilities plus one, not the number of all host APIs.

Verus form

Inference: represent an envelope and its capability as a Rust enum, and make a verified dispatcher with `requires envelope.capability() in manifest_caps` and `ensures` that only the corresponding operation is selected. Use a `spec fn` for the membership predicate and a `proof fn` for finite-map lookup lemmas. The runtime exception and host API implementations remain executable code whose contracts must be supplied separately. A Verus proof does not turn arbitrary LLM output into a valid capability; it proves the checked dispatcher behavior.

reported evidence and boundary

The evidence is the stated frozen-dispatch construction and its information-theoretic bound, not a measured attack rate. It assumes every host API ingress really passes through the dispatcher. Inference: an unwrapped API, native extension, or process-spawn path would invalidate the security argument even if the dispatcher itself is correct.

## technique 3: bounded model checking of the runtime biconditional

purpose and trigger

`skill-formal-bmc.mjs` exhaustively searches an abstract envelope state space to bound-check the runtime biconditional: every world-state change must have a corresponding admitted envelope (Section 4.3, p. 12). Use it when the dispatcher and capability declarations have been assembled and a finite bound is acceptable. The default bound is `K = 8`; the state-space size is `( |D| + 1 )^K`, where `D` is the declared capability set (Section 4.3, p. 12).

how to do it

1. choose the capability set `D` and trace bound `K`
2. enumerate envelope traces with depth-first search
3. execute the abstract transition relation for each trace
4. check the biconditional on every symbolic trace
5. report a counterexample when a state change lacks an admitted envelope
6. accept the bounded result only for the explored bound (Section 4.3, p. 12)

The paper gives one scale example: “for deployments with |D| ≤ 10 and K ≤ 8 the search explores at most 118 ≈ 2.1 × 108 traces” (Section 4.3, p. 12). Inference: the printed expression is internally inconsistent: `11^8` is about `2.14 × 10^8`, whereas the text writes `118`; the exponent notation appears to have lost a superscript. Inference: the denominator here is a trace count, not test cases or deployments.

Verus form

Inference: encode the abstract state and envelope sequence as finite `Seq` values, define a `spec fn` transition relation, and prove each verified transition preserves the biconditional. A bounded Rust harness can call a proof lemma over a sequence length, but exhaustive generation of all traces is an external search procedure unless the bound is encoded into ghost state. Verus can prove the transition invariant for all lengths when the invariant is inductive, which is stronger than the paper's finite exploration; it cannot by itself validate the JavaScript implementation's correspondence without a model-to-code refinement proof.

reported evidence and boundary

The paper supplies the search algorithm, bound, and state-space estimate, but no count of counterexamples found, benchmark hardware, or runtime distribution. BMC proves only the chosen abstraction and bound. Inference: a bug requiring a longer trace or an omitted transition model can survive. The paper's own Section 4.2 limits also exclude native syscalls, child processes invoking `curl` or `wget`, and shared memory, so the abstract proof is not an end-to-end enclave proof.

## technique 4: signed proof-carrying bundle and load-time re-check

purpose and trigger

`skills-formal-verify.mjs` composes static effects, refinement dispatch, and BMC. It hashes four evidence files with sorted-key canonical encoding and signs the bundle with Ed25519. The runtime re-checker `verifyFormalBundle` reruns all three methods on live source, compares hashes, and verifies the signature (Section 4.3, pp. 12–13). Use this when a verified artifact may drift after development but before loading.

how to do it

1. run the static, type, and BMC methods
2. canonicalize and hash `static.json`, `types.proof.json`, `smt.unsat.json`, and `manifest.attest.json`
3. sign the four-file bundle with the module-signing key
4. ship the bundle with the skill and manifest
5. at load time, rerun all three methods on live source
6. compare fresh hashes with cached evidence and verify the attestation signature
7. abort admission on a cache miss, signature failure, or changed verdict (Section 4.3, p. 13)

The paper emphasizes, “the runtime never trusts the bundle’s producer” (Section 4.3, p. 13). A worked example is in `skills/_formal-demo/`; the manifest format and seven-step bootstrap protocol are referenced in the cited OpenClaw specification.

Verus form

Inference: treat the bundle digest and signer key as ghost inputs, and verify a Rust loader contract that admits code only when the fresh digest equals the signed digest and the manifest predicate holds. Use `requires` for a valid signature and digest, and `ensures` for the admission decision. Verus can prove canonicalization and equality properties of a Rust implementation; Ed25519 cryptographic assumptions, key custody, live JavaScript source, and the signature library remain trusted unless separately modeled.

reported evidence and boundary

The paper reports the re-check protocol and signature mechanism, not a measured drift-detection rate. It explicitly says the companion paper contains the soundness theorems, while this framework paper only summarizes the methods (Section 9, p. 19). Inference: the bundle prevents stale evidence from silently authorizing changed code, but it does not prove the trusted runtime, cryptographic implementation, or operating system.

## technique 5: mechanizable classification invariants

The paper chooses Bell-LaPadula because dominance, least upper bound, and read/write predicates are total, decidable functions on integer ranks and compartment sets (Sections 2.1–2.2, pp. 6–7). A label is `⟨ℓ,C,R⟩`; dominance requires `ℓa ≥ ℓb` and `Cb ⊆ Ca`, reading requires subject dominance (no-read-up), and writing requires object dominance (no-write-down) (Section 2.2, p. 7). `parseClassificationScheme()` enforces contiguous ranks starting at zero, unique names after case normalization, and a nonempty levels list (Section 4.4, p. 13).

how to apply it

1. parse the JSON scheme and reject any invariant violation
2. map canonical names and aliases to contiguous integer ranks
3. construct labels with validated compartments and releasability
4. check dominance before every read and write
5. compute least upper bounds when combining labels
6. use the active scheme for formatting, parsing, manifest clearance, and MCP attestation (Sections 2.2 and 4.4, pp. 7, 13–15)

Verus form

Inference: define labels as a Rust struct and use `spec fn dominates`, `can_read`, and `can_write`; prove reflexivity, transitivity, and the no-read-up/no-write-down implications with `proof fn`s. Validate contiguous ranks with a quantified sequence invariant. Verus can check these mathematical properties, but the policy vocabulary and the identity-to-clearance binding remain deployment inputs.

reported checks and trust boundary

The paper reports 261 unit tests and 95 adversarial penetration tests, all passing on Node 22, for 356 total tests (Section 8.5, p. 18). It also reports strict TypeScript checking and CI execution, but no formal proof of the framework. The tests include tamper detection, signature forgery, fetch and raw-socket bypass, log truncation and reordering, trust-root mutation, DLP evasion, prompt and code injection, and net-capable extension admission (Abstract, p. 1; Sections 8.2–8.5, pp. 17–18). The paper states, “enclawed is a hardening framework, not an accredited compliance certification” (Abstract, p. 1). Trusted components and assumptions include the specification, JavaScript runtime, cryptography, native modules, operating system, hardware, identity binding, and deployment controls. Inference: for VeruLaw, the strongest transferable idea is the re-checkable artifact pipeline, while the largest threat is a false sense that passing bounded checks and tests proves the complete agent-written Rust product.

## implications for VL and prior art

Inference: VL can reuse the separation between (1) source-side effect analysis, (2) typed capability dispatch, (3) bounded transition checking, and (4) signed evidence revalidation. VL should not claim novelty for generic hash chains, Bell-LaPadula labels, Ed25519 manifests, or bounded model checking alone; those are already explicit here. The paper's JavaScript guards do not establish Verus Rust correctness, so a useful VL contribution would be a measured refinement from a capability manifest to Verus contracts and executable Rust, including dependency and OS assumptions.

## techniques for the catalog

- static effect containment: over-approximate script effects and admit only when the set is contained in manifest capabilities
- refinement-typed dispatch: freeze a sole API dispatcher that rejects envelopes outside the manifest capability set
- bounded model checking: enumerate bounded envelope traces and check the runtime state-change biconditional
- proof-carrying bundle: sign canonical evidence, rerun all methods at load, and abort on drift or signature failure
- mechanizable classification lattice: enforce Bell-LaPadula dominance, least upper bounds, and scheme invariants over integer ranks and sets
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
