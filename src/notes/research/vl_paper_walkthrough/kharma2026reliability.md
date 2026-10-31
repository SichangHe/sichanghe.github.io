# Enhancing Reliability in LLM-Based Secure Code Generation
(authored by agents unless marked 🧑)
Tag: `kharma2026reliability`, [paper](https://arxiv.org/abs/2605.24300)

## problem and contribution
The paper studies whether prompt structure can reduce security weaknesses in generated C, Java, and Python. Its proposed Mitigation-Aware Chain-of-Thought (MA-CoT) combines task-specific CWE mitigations, universal secure-coding rules, and language-specific safeguards. The paper states: “We introduce the Mitigation-Aware Chain-of-Thought (MA-CoT) framework, which embeds task-specific CWE mitigation guidance and language-aware safe-guards to reduce recurring vulnerabilities in generated code.” (Abstract, p. 1.) It compares Vanilla, Zero-shot, ordinary Chain-of-Thought (CoT), and MA-CoT on 200 tasks, three models, and an external 150-task LLMSecEval benchmark.

Inference: This is prompt-level risk reduction rather than formal verification. Static-analysis findings and expert review provide evidence about vulnerability patterns, but no theorem proves that generated programs satisfy a specification.

## technique 1: mitigation-aware chain of thought

What it is. MA-CoT turns a task into a security-informed prompt in three stages. The paper describes the aim as: “The proposed Mitigation-Aware Chain-of-Thought (MA-CoT) framework is designed to enhance the reliability of LLM-generated code.” (Section III, p. 3.)

How to apply it.

1. Analyze the task semantically and classify it into one or more security domains: secure coding, data structures, parsing and validation, networking, mathematics and logic, programming systems and utilities, or concurrency and synchronization. This is Stage 1 in Section III-A (p. 3).
2. Retrieve mitigation records for each domain from the mitigation knowledge base. Records contain general rules, language-agnostic guidance, code-review checklists, and sometimes fine-tuning examples. The paper’s example is: “Implement strong password policies, including requirements for length, complexity, and expiration. Use password hashing and salting techniques to protect stored passwords.” (Section III-A, p. 3.)
3. Construct a prompt containing (a) baseline security principles, (b) retrieved mitigations, and (c) a task-and-language checklist. The paper says: “The final prompt combines three components: ❶ the baseline security principles applicable to all code, ❷ the mitigation strategies, and ❸ the specific security checklist for the task and the programming language based on the aforementioned Stage 2.” (Section III-A, p. 3.)
4. Have the model generate code from this prompt. The paper says MA-CoT integrates security signals into the reasoning stage through baseline rules, task-specific mitigation, and a language checklist, and that, rather than correcting code after generation, it encourages models to surface potential weaknesses during reasoning (Section III-C, p. 4). The ordinary CoT baseline is defined as “(1) Understand requirements, (2) Identify security considerations, (3) Implement the solution securely, and (4) Verify correctness.” (Section III-C, p. 4.) Inference: MA-CoT reuses this four-step reasoning sequence with the mitigation text added; the paper does not spell out the MA-CoT step list separately.

Language-specific examples. For C, the paper emphasizes pointer initialization, bounds checking, and explicit memory clearing; for Python, input sanitization, safe deserialization, and exception handling (Section I, p. 2). Its layer-specific C actions are bounded or checked buffers, no unbounded copies, atomic descriptor-based file operations instead of check-then-use, modern AEAD and certificate/hostname verification, and guaranteed-wipe primitives such as `memset_s` or `explicit_bzero` where available (Section V-F, p. 10). Java guidance requires fail-closed exception handling, typed or short-lived secret carriers, modern AEAD/KDF defaults, and safe output encoding (Section V-F, p. 10). Python guidance requires per-operation CSPRNG values for nonce/IV/token creation, untrusted-input validation, safe templating, and forbidding static cryptographic parameters (Section V-F, pp. 10–11).

Verus form. Inference: represent the generated Rust function with an `ensures` contract for the functional and security-relevant result, and use `requires` for preconditions such as validated input lengths. Use executable Rust types that make unsafe states difficult (for example, a length-carrying buffer wrapper and an enum for approved cipher modes); prove wrapper invariants with `proof fn` and `assert`, and use loop `invariant` clauses for iteration over validated input. Verus does not turn a natural-language CWE paragraph into a proof: the mitigation must be translated into a precise contract or a trusted wrapper specification. Inference: a Verus implementation of the C check-then-use mitigation should open a file once and prove that subsequent operations use the returned descriptor; the OS call and its contract remain assumptions unless modeled and verified.

Evidence. The primary dataset has 200 tasks, three languages, three models, and four methods, yielding 7,200 programs (3 × 3 × 4 × 200); the paper states this count in the contributions list of Section I (p. 2) and in Section III-C (p. 4). SonarQube supplied detected security vulnerabilities, severities, and CWE mappings (Section III-D, p. 4); Section V says the analysis combines SonarQube with manual expert review (p. 6). On the primary data, total findings fell from 92 to 39 (57.6%) and high-severity Blocker+Critical findings from 90 to 39 (56.7%) under MA-CoT (Abstract, p. 1). On LLMSecEval’s 150 tasks, totals fell from 73 to 4 (94.5%) and high-severity findings from 45 to 2 (95.6%) (Abstract and Section VIII, pp. 1, 12). These percentages use the stated Vanilla-to-MA-CoT counts; 53/92 is 57.6% and 69/73 is 94.5%.

Limits. Ordinary Zero-shot and CoT are not reliable: in primary C, CoT produced 27 findings for claude-4.5 versus 19 with Vanilla (Section V-A, p. 6). Residual MA-CoT findings include TOCTOU (CWE-367) and non-guaranteed wiping (CWE-14), where OS semantics or compiler optimization exceed prompt-only control (Sections V-D and V-F, pp. 8–11). SonarQube reports patterns, not exploitability; two security researchers independently reviewed SonarQube findings and resolved disagreements by consensus (Section VII, p. 11). Results are comparative for the tested models, languages, and task mixes; provider updates, decoding variation, other languages, or other CWE distributions may change them (Section VII, p. 11).

## technique 2: layered attribution of vulnerability drivers

What it is. The paper separates language-core mechanisms from stack mechanisms so that mitigations target the right layer. It defines language-core only when behavior follows from the language specification or mandatory runtime semantics; other drivers are assigned to standard runtime/library, ecosystem library/framework, platform/OS API, toolchain/optimization, or application security logic/policy (Section III-F, pp. 4–5). The paper explains: “To avoid over-claiming, we use a strict, layered attribution scheme that separates language-core mechanisms from language-adjacent mechanisms.” (Section III-F, p. 4.)

How to apply it.

1. For every SonarQube weakness, record `language_feature`, `feature_category`, `feature_mechanism`, and `comparative_analysis` (Section III-F, p. 5).
2. Decide whether the behavior is required by the language specification or mandatory runtime. Otherwise assign it to the closest stack layer.
3. If multiple layers are plausible, use the conservative tie-break: assign the lowest layer necessary to produce the risk. The paper gives TOCTOU as an OS/POSIX check-use issue, not intrinsically a C feature (Section III-F, p. 5).
4. Aggregate counts by layer and dominant CWE, then choose layer-specific hardening (Table VII and the “Strengthening Actions by Layer” text, Section V-F, pp. 10–11). In C, Table VII reports Platform/OS API 38.0%, ecosystem crypto/TLS libraries 31.2%, language-core memory/bounds 27.1%, and toolchain/optimization 1.8%; these percentages are over attributed weakness instances for C (Table VII, p. 10).

Verus form. Inference: encode each layer as a separate Rust module or trait boundary with explicit contracts. A memory wrapper can prove bounds; a crypto wrapper can expose only approved algorithms; an OS adapter can carry a specification for atomic open-and-check behavior. Keep external-body assumptions at the adapter boundary only when no executable model exists, and document them as trusted. Use `ensures` on executable functions and `spec fn` for mathematical predicates; do not treat proof code as runtime code.

Evidence and limits. The layered analysis explains why MA-CoT is strongest for Java and Python configuration/API risks but leaves C residuals from OS, toolchain, and memory hazards (Section V-F, pp. 10–11).

## what is proved, measured, and trusted

Measured: static-analysis vulnerability counts, severity classes, CWE distributions, cross-model and cross-language differences, and expert adjudication. The experiments used gpt-5, claude-4.5, and gemini-2.5 at temperature 1 with 32k maximum output tokens; context windows were 400k, 200k, and 1000k respectively (Table I, p. 4). The primary dataset has 200 tasks (Section IV-A, p. 5); LLMSecEval has 150 tasks (Section V-B, p. 6).

Not proved: functional equivalence to task intent, exploitability of every finding, absence of vulnerabilities outside SonarQube rules, correctness of the mitigation knowledge base, or correctness of generated code under changed dependencies and environments. Trusted components include model APIs, prompt and dataset curation, SonarQube rules, expert judgments, CWE mappings, and the compiler/OS/library behavior used by generated code. Inference: a Verus proof would reduce the trusted portion for the modeled Rust function, but it would not validate the original English task or unmodeled foreign calls.

## techniques for the catalog

- mitigation-aware chain of thought — classify task domains, retrieve concrete CWE mitigations, combine universal and language-specific rules, and reason through implementation with those constraints
- mitigation knowledge base — store general rules, language guidelines, review checklists, and secure/insecure examples keyed by CWE or domain
- layered vulnerability attribution — classify each finding by language core, runtime/library, ecosystem, OS, toolchain, or application policy and mitigate at the necessary layer
- secure-by-construction hardening — replace prompt-only advice with bounded buffers, atomic file operations, approved cryptography, and guaranteed wiping primitives
