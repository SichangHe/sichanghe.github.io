# CryptoFormalEval: Integrating Large Language Models and Formal Verification for Automated Cryptographic Protocol Vulnerability Detection
(authored by agents unless marked 🧑)
Tag: `curaba2024cryptoformaleval`, [paper](http://arxiv.org/abs/2411.13627v1)

## purpose and scope

The paper introduces CryptoFormalEval, a benchmark and an LLM architecture for finding vulnerabilities in previously unseen cryptographic protocols by interacting with the Tamarin prover. Its target is vulnerability discovery under the Dolev–Yao model, not proof of an arbitrary implementation. The benchmark supplies AnB protocol notation and a security property in first-order temporal logic; an agent formalizes the protocol, searches for an attack, and validates the resulting trace.

The paper's central claim is narrow: “pipeline is composed of four primary steps, also illustrated” (Section 1.1, p. 1). It also says that Tamarin's result is conditional on a correct formalization: “A key strength of Tamarin is that its attack search algorithm is both sound and complete with respect to the Dolev-Yao model.” (Section 2.3, p. 3). Thus a successful attack trace is evidence about the formalized protocol and model, not automatically about deployed code.

## technique 1: a staged benchmark pipeline

What it is. The benchmark decomposes protocol auditing into input, formalization, verification, and attack validation. The paper states: “The dataset includes 15 protocols of varying complexity” (Section 3.1, p. 3).

When to use it. Use this decomposition when an agent must turn an informal or semi-formal protocol description into a machine-checkable counterexample while keeping syntax errors, proof search, and semantic validity separate.

How to do it.

1. Give the agent an Alice-and-Bob (AnB) protocol and an unsatisfied security property in first-order temporal logic. This is the paper's step 1 (Section 3.1, p. 3).
2. Convert the AnB protocol into Tamarin syntax with the supplied converter, then complete the conversion manually because “this converter has limited expressivity and” (Section 3.1, p. 3).
3. Run Tamarin's attack search. It may find an attack trace or fail to terminate; the paper recommends inductive support lemmas as one way to help termination (Section 3.1, p. 3).
4. Translate the trace back into the Dolev–Yao model and run the validation sandbox. The sandbox checks executability, coherence with the protocol, and contradiction of the stated property (Section 3.3, p. 4).

Verus form. Inference: represent the protocol and security property as ghost data, and represent each audit stage as a separate Rust/Verus function. Use `requires` for a well-formed protocol and property, `ensures` for preservation of the translated trace, and `proof fn`/`assert` lemmas for the correspondence between an AnB trace and the symbolic model. Inference: Tamarin's multiset-rewrite and first-order temporal-logic semantics do not carry over as executable Verus constructs; they need an explicit ghost model or an external checker. Inference: a Verus proof can establish that a validator accepts only traces satisfying an encoded predicate, but it cannot by itself establish that the predicate captures the intended cryptographic threat model.

Evidence and limits. The paper's evidence is architectural and qualitative. Its dataset has “The validation sandbox is not fully implemented yet.” (Section 3.2, p. 3), each with a security property. Table 1 reports five protocol examples, each with two parties and three exchanged messages, and orders them by character count from 161 to 244 (Appendix B, p. 11). The validation sandbox is not complete: “The validation sandbox is not fully implemented yet.” (footnote 4, p. 4). The paper therefore does not provide a denominator for validated vulnerabilities or a measured false-positive rate. Inference: until that sandbox is implemented and its results are reported, the benchmark's final correctness claim remains partly prospective.

## technique 2: middleware around an interactive prover

What it is. The middleware makes Tamarin's interactive command-line workflow usable by an LLM and limits runaway tool behavior. Its listed facilities are timeouts, output filtering, and manual proof guidance (Section 3.3, p. 4).

When to use it. Use a middleware layer whenever a verifier exposes verbose interactive state, can loop, or can execute commands that the agent should not control directly.

How to do it.

1. Put a timer around each Tamarin process and terminate non-responsive searches (Section 3.3, p. 4).
2. Filter output so the model sees syntax errors, partial deconstructions, and attack traces instead of the full verbose stream (Section 3.3, p. 4).
3. Expose proof guidance through a custom oracle only if the interaction cost is acceptable. The authors say this feature was unused because of inefficiency (footnote 3, p. 4).
4. Translate the final trace into AnB and pass it to the sandbox checks described above.

Verus form. Inference: a Verus-based agent should invoke the verifier through a process wrapper, preserve the exact source and toolchain, cap wall time, and parse diagnostics into structured proof state. The wrapper can restrict filesystem commands, but `requires`/`ensures` prove Rust contracts only after the wrapper has supplied the source; they do not prove that the wrapper itself is isolated. Inference: keep timeout and command filtering outside proof code, and record them as trusted harness assumptions.

Evidence and limits. The paper says the middleware's purpose is to let agents “AI agents to interface effectively with Tamarin’s interactive” (Section 3.3, p. 4). It gives no timing distribution or failure denominator for the wrapper. Manual proof guidance was not used, so no result supports its effectiveness.

## technique 3: CryptoFormaLLM's two-phase agent workflow

What it is. CryptoFormaLLM is an agent architecture that first builds a syntactically valid Tamarin theory and then searches for and validates an attack trace. The paper describes its purpose as generating “to generate a clear and human-readable attack description” (Section 3.4, p. 5).

How to do it.

1. Translation: provide AnB and the property; generate Tamarin rules, participants, and primitives (Section 3.4, p. 5).
2. Tool-aided conversion: call the AnB converter, leaving property definition for the next task (Section 3.4, p. 5).
3. Refinement: use feedback to correct syntax, add restrictions, and add support lemmas (Section 3.4, p. 5).
4. Attack-trace inference: form a candidate trace that reflects the agent's understanding of the protocol (Section 3.4, p. 5).
5. Interaction: run Tamarin; on timeout, adjust rules, restrictions, priorities, or command-line arguments (Section 3.4, p. 5).
6. Translation and validation: translate the trace to AnB and use a self-consistency prompt, then the sandbox, to check it against the original property (Section 3.4, p. 5).

The architecture also uses profiling prompts, short-term summaries, error resubmission, few-shot examples, prompt variations, systematic testing, and command filtering (Section 3.4, pp. 5–6). The paper explicitly says larger prompts make instruction following worse in its runs (Appendix A, p. 10): “This type of failure can be mitigated by refining prompt construction.”

Verus form. Inference: model each phase as a typed record containing source, verifier diagnostics, and candidate trace. Use executable Rust for orchestration and ghost values for semantic traces. A verified boundary function can require that a parsed trace is well formed and ensure that a validator predicate holds; proof-only lemmas can connect parser output to the predicate. Inference: prompt summaries and self-consistency are search heuristics, not proof evidence. The final acceptance must be a Verus-checked predicate or an independently checked external model.

Evidence and limits. The preliminary experiment used five named models, temperature 0.1 except o1-preview, at most 20 API calls per run, at most three repetitions per subtask, and a 200-second command timeout (Section 4, p. 5). Each execution used approximately 50,000 input and 10,000 output tokens, with variation by model and protocol (Section 4, p. 6). Results are qualitative: “no LLM has achieved perfect score, the bigger models” (Section 4, p. 6), and the paper reports no table of successes over the five models and five protocols. Appendix C records syntax errors, incorrect observable placement, nontermination, and failure to obey file-copy instructions. Protocol 4 is a concrete failure: its exponentiation theory caused loops that saturated memory for Claude 3 Opus and Claude 3.5 Sonnet (Appendix C, p. 12). Inference: the reported evidence supports a workflow prototype and failure taxonomy, not a measured claim that the architecture reliably finds vulnerabilities.

## what is proved, measured, and trusted

Tamarin's stated soundness and completeness are relative to the Dolev–Yao model and a correct formalization (Section 2.3, p. 3). The benchmark measures agent behavior on 15 newly created protocols; the preliminary experiment discusses a subset and gives five protocol examples in Table 1, but it does not state the evaluated subset's denominator. The dataset construction uses GPT-4 few-shot generation, filtering for executability, syntactic correctness, and novelty, followed by manual evaluation (Section 3.2, p. 3). The following remain trusted or incomplete: the protocol formalization, the threat model, the converter, the LLM's trace translation, and the not-fully-implemented sandbox. Inference: a product using this method must keep these trust boundaries explicit and must not present an LLM-generated trace as a verified vulnerability without the final independent checks.

The paper also contains a concrete inconsistency in its own appendix labeling: immediately after Table 2 it says “From Table 2 and Table 2 we can notice that” (Appendix B, p. 11), although only one Table 2 appears in the extracted text. This is a writing error, not a verification result.

## what VL should reuse and threat to agent-written verified Rust

Inference: VL should reuse the staged separation between formalization, prover interaction, and trace validation. It should also reuse process isolation, bounded execution, diagnostic filtering, and a frozen record of every verifier invocation. These map naturally to a Rust orchestration layer plus Verus contracts over parsers and validators.

Inference: VL should not treat CryptoFormaLLM's prompt strategies as a substitute for specifications. The paper's failures show that an agent can understand an attack conceptually while emitting invalid Tamarin syntax, misplacing observables, or silently changing the protocol. For an agent writing verified Rust, the analogous threat is a proof search that repairs a symptom by weakening a contract or changing executable behavior. Keep contracts and trusted specifications outside the agent's editable body, and require the verifier to check the resulting code.

## techniques for the catalog

- staged symbolic-audit pipeline — provide a protocol and property, formalize it, search for a counterexample, then validate the trace independently

- prover middleware — wrap an interactive verifier with timeouts, filtered diagnostics, command restrictions, and explicit trust records

- agent phase separation — separate protocol translation and repair from attack search and trace validation, with verifier feedback between phases

- sandbox trace checking — check executability, protocol coherence, and contradiction of the stated security property before reporting an attack
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
