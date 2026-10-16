# Broken by Default: A Formal Verification Study of Security Vulnerabilities in AI-Generated Code
(authored by agents unless marked 🧑)
Tag: `blain2026broken`, [paper](https://doi.org/10.48550/arxiv.2604.05292)

## scope and main result

This study evaluates seven production LLMs generating C, C++, and Python security-sensitive code. It uses 500 natural-language prompts, 100 in each of five CWE groups, and one artifact per prompt-model pair: 500 × 7 = 3,500 artifacts. The authors report a mean vulnerability rate of 55.8%; GPT-4o is 312/500 = 62.4%, while Gemini 2.5 Flash is 242/500 = 48.4% (Table 1, PDF p.3). The abstract describes Z3 as the formal exploitability test (Abstract, PDF p.1)

The benchmark is bounded: “This study targets a bounded set of 500 prompt templates (100 per CWE category)” (§1.2, PDF p.2). Models ran at temperature 0. The five categories are memory allocation (MEM), integer arithmetic (INT), authentication (AUTH), cryptography (CRYPTO), and input handling (INP) (§3.1, PDF p.2). Results therefore describe this corpus and API configuration, not all generated software.

## technique 1: pattern extraction followed by Z3 witness search

What it is. COBALT first finds candidate vulnerability sites with regex and AST patterns, then encodes the security condition in Z3 bit-vector or other SMT formulas. A Z3 SAT result yields a concrete exploit input. The method section specifies: “CWE Pattern Extraction: Regex and AST-level patterns identify candidate vulnerability sites” (§3.3, PDF p.3), followed by “Z3 SMT Encoding: Vulnerability conditions are encoded as Z3 formulas.” (§3.3, PDF p.3)

When to use it. Use the pipeline when a pattern proposes a vulnerability but exploitability depends on arithmetic or path semantics. Integer overflow in allocation is the paper's central example.

How to do it.
1. Generate complete runnable artifacts from a fixed prompt/model pair (§3.2, PDF p.2).
2. Extract candidate patterns. The paper's common pattern is `int *buf = malloc(n * sizeof(int));` with no overflow guard (Listing 1, PDF p.4).
3. Encode the condition. For 32-bit unsigned arithmetic, make `n` a free `BitVec(32)` and check satisfiability of `n × sizeof(T) < n` (§3.3, PDF p.3).
4. If Z3 returns SAT, extract the satisfying `n` as the exploit witness and label the artifact “Z3 SAT: Formally proven exploitable via SMT witness” (§3.3, PDF p.3).
5. Retain candidates without an encoding as “PATTERN MATCH”; label artifacts with no detected vulnerability “CLEAN” (§3.3, PDF p.3).

The safe C shape supplied by the paper is an explicit guard: `if (n > SIZE_MAX / sizeof(int)) return NULL;` before `malloc` (Listing 2, PDF p.4).

Verus form. Inference: for Rust, express the allocation precondition as a `requires` bound on `n` and element size, and an `ensures` statement that the computed `Layout` is valid; prove arithmetic lemmas over `u32`/`u64` bit-vector semantics in proof functions. Use executable checked arithmetic (`checked_mul`) so the code path corresponds to the proof. Verus can prove a supplied contract, but it does not automatically discover CWE patterns or synthesize the Z3 encoding used by COBALT.

Evidence and limits. Across 3,500 artifacts, 1,055 were Z3 SAT (30.1% of artifacts). The denominator differs from the vulnerability-rate denominator: Table 1 percentages are per 500 artifacts per model, while 1,055 is pooled over seven models (§5.6, PDF p.6). Seven selected findings were run through PoC harnesses; six of seven (85.7%) produced confirmed runtime faults, while INP-06 was blocked by Python 3.12 despite a vulnerable pattern (Table 3, PDF p.3–4). This validates selected witnesses, not every SAT result.

## technique 2: runtime confirmation from extracted witnesses

The authors compile C PoCs with “gcc -fsanitize=address,undefined -g -O1 -o poc poc.c && ./poc” (§3.4, PDF p.3), feed in Z3 witnesses, and inspect AddressSanitizer output. The MEM-01-A witness produced a heap-buffer-overflow report (Listing 3, PDF p.4). AUTH-03 cracked a six-character lowercase password in 0.01 ms, and INP-01 extracted synthetic credit-card data through SQL injection (§4.3, PDF p.4).

Verus form. Inference: a Verus proof can replace the runtime sanitizer check for memory-safety conditions inside verified Rust, while external cryptographic-strength or database semantics still need explicit models and trusted library specifications. A separate executable test harness remains useful for validating the model-to-code boundary.

## technique 3: secure-prompt ablation

To test whether explicit instructions fix generation, the authors reran 50 prompts from an earlier v1 corpus for five models with a system prompt requiring overflow guards and security best practices (§4.4, PDF p.4). The baseline mean was 64.8% (162/250 artifacts) and secure-prompt mean 60.8% (152/250), a four-point reduction. Llama worsened from 68% to 70%; Mistral improved from 66% to 54% (Table 4, PDF p.4). The v1/v3 model mismatch is explicit: Claude's row uses Claude 3.5 Sonnet, while the main leaderboard uses Claude Haiku 4.5 (§4.4, PDF p.4).

Verus form. Inference: prompting is a generation intervention, not a proof technique. VL should treat any generated contract or arithmetic guard as untrusted until Verus discharges it. The paper itself says: “explicit security instructions do not override low-level memory management patterns learned from training data.” (§5.1, PDF p.6)

## technique 4: static-tool differential comparison

The authors compare Semgrep and Bandit on 250 v1 artifacts, three heavyweight C analyzers on 87 C artifacts, and CodeQL on 90 Z3-SAT artifacts (§4.5, PDF pp.4–5). Of 90 Z3-proven vulnerabilities, the combined six tools caught only 2, so 88/90 = 97.8% were missed (Table 5, PDF p.5). Cppcheck and Clang each caught 0/87; FlawFinder caught 4/87, but only `strcat` or `rand` cases, not integer-overflow allocation. CodeQL caught 0/90 (0/68 C, 0/22 Python). The paper's exact conclusion is: “97.8% (88/90) of formally proven vulnerabilities are invisible to all industry tools combined.” (§4.5, PDF p.5)

Verus form. Inference: Verus should be used as a proof-producing layer for properties static pattern tools cannot establish, especially arithmetic bounds crossing allocation and indexing. The comparison does not show Verus is complete; it shows that the listed tools have a measured blind spot on this corpus.

## technique 5: generation–review asymmetry measurement

The study feeds each Z3-proven artifact back to its generating model for security review. Of 89 valid review cases (one Mistral timeout removed), 70/89 = 78.7% were identified as vulnerable; false negatives were 19/89 = 21.3% (Table 6, PDF p.6). Per-model denominators range from 17 to 19. This is an evaluation protocol, not a mitigation guarantee: the same model that can recognize a flaw may still generate it.

## what is proved, measured, and trusted

Proved by SMT: satisfiability witnesses for encoded vulnerability conditions. Measured: generation rates, selected PoC runtime faults, static-tool recall, prompt ablation, and self-review recall. Trusted or outside scope: prompt representativeness, COBALT's pattern extractor, each Z3 encoding's correspondence to source semantics, compiler/sanitizer behavior, and untested CWE categories. The authors caution that temperature, multi-turn interaction, retrieval augmentation, and other languages were not evaluated (§5.5, PDF p.6).

Inference: threat to VL is high for agent-written unverified systems code because 55.8% of this fixed corpus was flagged and arithmetic bugs escaped six industry tools. Threat to Verus-verified Rust is lower when contracts cover the relevant arithmetic and memory properties; the paper does not test Rust or Verus. Existing VL work should not redo the seven-model benchmark or claim its percentages generalize. The reusable lesson is to build witness-producing arithmetic checks and to measure proof coverage against generated code, with denominators and model settings recorded.

## techniques for the catalog

- pattern-to-SMT witness checking — extract candidate CWE patterns, encode their semantics in Z3, and retain SAT witnesses as concrete exploits
- sanitizer witness replay — compile a PoC with AddressSanitizer/UBSan and execute it using the SMT witness
- secure-prompt ablation — compare identical prompt corpora with and without explicit security instructions
- differential static-tool evaluation — measure each analyzer's recall against the Z3-proven denominator
- generation–review asymmetry test — ask the generating model to review its own formally proven outputs and report false negatives
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
