# Automated Side-Channel Analysis of Cryptographic Protocol Implementations
(authored by agents unless marked 🧑)
Tag: `nasrabadi2026automated`, [paper](https://doi.org/10.1145/3830454.3832676)

## scope

Nasrabadi, Künnemann, and Nemati analyze selected protocol regions from binaries. The abstract states, “Starting from a selected binary region, we lift machine code to an intermediate representation, instrument it with leakage contracts, symbolically execute it to obtain event/observation traces, and translate these traces into Sapic+ for analysis with Tamarin, ProVerif, and DeepSec.” (Abstract, p. 1)

The threat model combines an active Dolev–Yao network attacker with a co-resident process observing microarchitectural effects. The scope is explicit: “Our goal is not to model all microarchitectural channels, but to lift well-scoped observation models to protocol verification and to expose security violations that arise from control flow divergence and memory-access behavior.” (Section 1, p. 2) Cryptographic library calls are abstracted to focus on protocol logic; this does not establish primitive-level constant time (Section 1, p. 2).

The evaluation separates reachability analysis from side-channel analysis: “For (i), we reuse CryptoBap’s established extraction pipeline and discharge the resulting models to ProVerif and Tamarin. For (ii), we apply our observation-aware extraction (Section 3) and analyze the resulting Sapic+ processes with DeepSec.” (Section 4, p. 8) The first analysis verifies forward secrecy and identifies a clone-attacker post-compromise security violation in the WhatsApp model; the second finds a WhatsApp privacy leak and reproduces BAC unlinkability failures (Sections 4.1.4, 4.2, pp. 9–11).

## technique: verified binary lifting with leakage contracts

What it is: isolate protocol instructions using Ghidra, lift them into HolBA’s architecture-agnostic Binary Intermediate Representation (BIR), and add attacker observations. The lifting has a verified semantics-preservation result: “To ensure soundness, the transpilation process is verified to preserve the semantics of the input machine code.” (Section 2.1, p. 2) This assurance does not extend to every subsequent stage.

How to apply it:

1. Locate protocol entry points and crypto/network boundaries; follow calls and data/control dependencies to include parsing, state updates, and primitive calls (Section 3.1, p. 5)
2. Export exact instructions and transpile them through HolBA. Reverse engineering and region selection remain trusted: “if the selected region omits relevant dependencies, the extracted model may be incomplete.” Unresolved dependencies are overapproximated with fresh symbolic environment inputs; semantic reasoning after instruction export uses BIR rather than Ghidra’s decompiler (Section 3.1, p. 5)
3. Choose an observation model. `Mct` exposes program counters and accessed addresses; `Mspec` adds shadow observations for transient operations after branch misprediction (Section 2.3, pp. 3–4)
4. Instrument BIR blocks with observations such as `Ld(a)`, `St(a)`, `Pc(a)`, and `Cnd(ϕ,a1,a2)`. Symbolically execute with path conditions and observation lists; discover indirect-jump successors iteratively using an SMT solver (Sections 3.2–3.3, pp. 5–6)
5. Translate the symbolic execution tree to Sapic+: leaves become the null process, observations become public outputs, and branches disclose their conditions and selected addresses before continuing (Section 3.4, p. 6; Figure 7, p. 7)
6. Simplify while preserving observations. Prune suffixes violating lifting-inserted invariants, whose observations are guarded, but retain architecturally unreachable branch behavior that could leak speculatively. Remove unused bindings and redundant processes; retain conditional observations when merging identical branches. Keep conditional-branch program counters while removing other program-counter outputs (Section 3.5, p. 7)
7. State the backend query. For side-channel privacy, use DeepSec’s bounded trace-equivalence analysis to obtain a proof of equivalence or distinguishing traces. Interpret any binary-level finding under the selected region, abstractions, and leakage contract (Section 3.6, pp. 7–8)

The instrumentation itself lacks a soundness proof: “Our observation instrumentation is not formally proved sound against a given observational model, but it closely follows (we reused partially) the Scam-V framework, whose validation against real hardware is established.” (Section 3.2, p. 5)

Verus form: Inference: use the extracted binary observations to audit leakage assumptions around verified Rust. A Verus ghost trace could specify permitted public observations, but connecting that trace to the compiled binary would require a separate refinement argument. This paper supplies neither that connection nor a Rust/Verus implementation.

## technique: observation refinement for speculative leakage

What it is: refine ordinary observations with shadow observations for operations on a mispredicted branch path. Conditional non-interference requires that initial states indistinguishable under the observation model remain indistinguishable under target-microarchitecture execution whenever they are indistinguishable under ordinary execution (Definition 2.1, p. 4).

How to apply it:

1. Define observable instruction behavior, including branch outcomes, branch addresses, and load/store addresses (Section 3.2, p. 5)
2. Add shadow observations for operations that may execute transiently after branch misprediction (Section 2.3, p. 4)
3. Extract models retaining normal and shadow observations, then compare the same privacy query under `Mct` and `Mspec` (Sections 3.3–3.6, pp. 6–8)
4. Attribute a distinction specifically to speculation only when equivalence holds under `Mct` and fails under `Mspec`. The authors state, “If 𝑃1 ∼ Mct 𝑃2 but 𝑃1 ≁ Mspec 𝑃2, the additional distinguishing power comes from speculation, witnessing a speculative-only leak.” (Section 3.6, p. 8)

The reported WhatsApp privacy attack is already visible under ordinary constant-time observations: “When analyzing this refined property, DeepSec finds a distinguisher under Mct (and hence also under Mspec).” (Section 4.2.2, p. 10) The refined property distinguishes first contact from a subsequent session in an existing conversation. The paper attributes this to conditional processing of the recipient’s public one-time pre-key and describes an instruction-cache Prime+Probe attack by a co-resident process (Sections 4.2.3–4.2.4, pp. 10–11). Standard partner unlinkability holds in the bounded analysis under both models (Section 4.2.2, p. 10).

The current speculative model covers branch misprediction; other Spectre variants require suitable new observation models (Section 2.3, p. 4). Inference: this method can test whether a functional proof leaves protocol-level leakage unaddressed, but its coverage depends on the chosen observations and analysis boundary.

## what is proved and measured

The WhatsApp reachability result uses a memory abstraction and replaces X3DH with a private channel distributing an initial root key; it is not a verification of the full X3DH implementation (Sections 4.1.2, pp. 8–9). The memory-aware model shrinks from nearly 33,000 to about 2,600 Sapic+ lines, yet Tamarin and ProVerif still fail to terminate. The smaller model supports the reported forward-secrecy and clone-attacker analyses. ProVerif finds the post-compromise violation automatically; Tamarin requires heuristics and 303 manually selected proof steps (Sections 4.1.2, 4.1.4, p. 9).

For side-channel analysis, Table 3 reports BAC Sapic+ models shrinking from 242 to 83 lines under `Mct` and from 630 to 240 under `Mspec`; WhatsApp session-initiation models shrink from 283 to 90 and from 2,872 to 903 lines, respectively. DeepSec verification takes 1 and 7 seconds for BAC and 2 and 5 seconds for WhatsApp, respectively (Table 3, p. 11). BAC uses an in-house implementation rather than extracted production passport code (Section 3, p. 4; Section 4.2.1, p. 10).

Automation starts after manual choices: “The manual inputs are: (a) selecting entry points and defining the analysis boundary in Ghidra, (b) deciding which external calls are treated as cryptographic abstractions or environment stubs, and (c) stating the verification query for the chosen backend.” (Section 4, p. 8) The reported reverse-engineering/modeling effort is a few hours for BAC and a few days to locate and validate WhatsApp entry points (Section 4, p. 8).

The authors distinguish lifting assurance from model assurance: “Regarding our methodology soundness, transpilation from assembly to BIR and symbolic execution remain sound, although we lack formal proofs validating our translation to Sapic+ (see Section 3.4).” They add, “However, a positive security result from DeepSec cannot be fully trusted.” (Section 6, p. 12) Equivalence results are bounded, depend on abstractions, and exclude no channels outside the observation set (Section 3.6, p. 8; Section 6, pp. 12–13). The toolchain also cannot currently verify fence-based mitigations or hardware/OS defenses (Section 6, p. 12).

Inference: for VL, reuse the idea of checking protocol privacy at the compiled-binary boundary. The paper does not establish that a Verus functional proof covers leakage or that this pipeline can certify arbitrary verified Rust binaries.

## techniques for the catalog

- binary-to-protocol lifting — select protocol code, lift exact instructions through verified BIR, and extract symbolic behavior
- leakage-contract instrumentation — expose program counters, branches, and memory addresses as attacker observations
- symbolic execution with leakage observations — track path constraints and SMT-assisted indirect jumps while retaining behavior relevant to speculation
- observation refinement — compare constant-time and shadow speculative observations to isolate speculative-only distinguishers
- multi-backend protocol checking — use Sapic+ with reachability or bounded equivalence queries under the appropriate abstractions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "While for functional correctness analysis, eliminating such paths is possible, we cannot apply this simplification when we look for side-channel leaks, as unreachable branches can leak during speculative execution."): checked every quotation, number, section/page reference, and technique step against all 15 pages, including references and appendices; corrected the tag year and page references, distinguished the two extraction pipelines and speculative-only leakage, added soundness limits and measured results, and marked Verus/VL conclusions as inferences; did not rerun the authors’ tools, reproduce experiments, inspect source artifacts, or independently validate the hardware and privacy claims.
