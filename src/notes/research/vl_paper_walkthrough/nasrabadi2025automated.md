# Automated Side-Channel Analysis of Cryptographic Protocol Implementations
(authored by agents unless marked 🧑)
Tag: `nasrabadi2025automated`, [paper](https://doi.org/10.1145/3830454.3832676)

## scope

Nasrabadi, Künnemann, and Nemati close part of the gap between protocol proofs and deployed binaries. Their pipeline extracts a selected protocol region from a binary, lifts machine code to verified BIR, annotates observations representing leakage, symbolically executes all feasible paths, translates the result into Sapic+, and sends it to DeepSec, Tamarin, or ProVerif. The abstract states, “Starting from a selected binary region, we lift machine code to an intermediate representation, instrument it with leakage contracts, symbolically execute it to obtain event/observation traces, and translate these traces into Sapic+ for analysis with Tamarin, ProVerif, and DeepSec.” (Abstract, p. 1)

This is a binary-analysis technique rather than a Rust proof method. It targets an active Dolev–Yao network attacker and a co-resident process observing instruction- or data-cache effects; the paper models constant-time and Spectre-PHT leakage, not every microarchitectural channel (Introduction, pp. 1–2). It reports a WhatsApp Desktop model, a forward-secrecy proof, a clone-attacker post-compromise break, and an instruction-cache social-graph leak, plus known BAC unlinkability problems (Abstract and Section 1, pp. 1–2).

The scope is deliberate: “Our goal is not to model all microarchitectural channels, but to lift well-scoped observation models to protocol verification and to expose security violations that arise from control flow divergence and memory-access behavior.” (Threat model and scope, Section 1, p. 2)

## technique: verified binary lifting with leakage contracts

What it is: use Ghidra to isolate protocol functions, HolBA to transpile exact instructions into architecture-agnostic BIR whose semantics-preserving translation is verified, and an observation model to expose only attacker-visible events. The paper's BIR observations include `Ld(a)`, `St(a)`, conditional branch outcomes, and program-counter labels (Sections 2.1, 2.3, 3.1–3.2, pp. 2–6).

How to apply it:

1. Locate protocol entry points and crypto/network boundaries in the executable; follow calls and data/control dependencies to include parsing, state updates, and primitive calls (Section 3.1, p. 5)
2. Export exact machine instructions and transpile them to BIR through HolBA; do not use a decompiler as the semantic proof (Section 3.1, p. 5)
3. Choose an observation model. `Mct` exposes program counters and accessed addresses for constant-time analysis; `Mspec` adds shadow observations for transient wrong-path operations (Section 2.3, pp. 3–4)
4. Annotate each BIR block with conditional observations and symbolically execute every branch; unresolved indirect jumps are explored using an SMT solver (Sections 3.2–3.3, pp. 5–7)
5. Translate leaves and events of the symbolic execution tree into Sapic+ processes, simplify the model, and invoke the appropriate backend (Sections 3.3–3.4, pp. 7–9)
6. State the security query, such as secrecy, reachability, forward secrecy, or trace equivalence, and interpret a counterexample as a binary-level violation under the chosen observation contract (Sections 2.2–2.3, 3.4, pp. 3–9)

The authors explicitly overapproximate unresolved external calls with fresh symbolic environment inputs and treat reverse engineering and region selection as trusted: “if the selected region omits relevant dependencies, the extracted model may be incomplete.” (Correctness considerations, Section 3.1, p. 5) They avoid trusting Ghidra for semantics after instruction export and account for speculation by post-lifting BIR instrumentation.

Verus form: Inference: use this as a testing and threat-model layer around Verus, not as a replacement for Rust functional proofs. A Verus crate can expose a ghost event trace and prove that a specified Rust operation emits only permitted public observations, with `requires`/`ensures` contracts and `proof fn` lemmas for trace refinement. Verus does not prove Ghidra's slicing, HolBA's BIR translation, hardware cache behavior, or the soundness of Sapic+ backends; these stay outside the Rust proof's trusted base. A practical VL integration would compile verified Rust, select the protocol boundary, and compare the extracted observation model with its Verus ghost specification.

## technique: observation refinement for speculative leakage

What it is: begin with a software-visible observation partition and refine it with observations from transient execution. The formal property is conditional non-interference: indistinguishable initial states must have matching observations for corresponding ordinary and target-microarchitecture traces (Definition 2.1, p. 4). `Mspec` marks shadow observations for operations on a mispredicted branch path; this catches leaks that constant-time reasoning misses.

How to apply it:

1. Define what an attacker can observe for each instruction class, including branch target and load/store address (Section 3.2, p. 6)
2. Add shadow observations to operations that may execute transiently after a conditional branch (Section 2.3, p. 4)
3. Run symbolic execution with path constraints and observation lists, retaining both normal and shadow events (Section 3.3, pp. 6–7)
4. Ask DeepSec for indistinguishability/trace-equivalence violations; use the witness path to identify a secret-dependent control or address (Sections 2.2–2.3, 3.4)

Evidence and limits: the WhatsApp analysis found a side channel that distinguishes first contact from an existing contact and therefore permits social-graph inference; Meta confirmed the application was vulnerable (Section 1, p. 2). The paper abstracts cryptographic library calls and focuses on protocol logic, so it does not establish primitive-level constant time. Its current speculative model covers branch misprediction; other Spectre variants require new observation models (Section 2.3, p. 4). Inference: the threat to agent-written verified Rust is high at the binary boundary when Verus proves functional contracts but says nothing about leakage, compilation, or hardware. The method is a concrete way to audit those assumptions, but the selected region and leakage contract remain trusted.

## what is proved and measured

The formal tools prove or refute properties of the extracted symbolic model. They do not prove that the selected binary region is complete, that the observation contract exactly matches hardware, or that omitted library calls are harmless. The case studies are qualitative findings; this paper reports no denominator-based benchmark of all protocol binaries or proof effort. Existing binary analysis and protocol-verification work already supplies the extraction core, so VL should reuse the boundary-audit idea rather than redo a general binary lifter.

## techniques for the catalog

- binary-to-protocol lifting — select protocol code, lift exact instructions through verified BIR, and extract symbolic behavior
- leakage-contract instrumentation — annotate program counters, branches, and memory addresses as attacker observations
- path-complete symbolic execution — enumerate feasible branches with path constraints and SMT-assisted indirect jumps
- observation refinement — add shadow speculative events to a constant-time observation model
- multi-backend protocol checking — translate traces to Sapic+ and query DeepSec, Tamarin, or ProVerif
Checked 2026-10-14 against the paper by a Codex agent: audit record nasrabadi2025automated; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
