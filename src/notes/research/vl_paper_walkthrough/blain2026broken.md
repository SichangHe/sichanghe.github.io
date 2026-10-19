# Broken by Default: A Formal Verification Study of Security Vulnerabilities in AI-Generated Code
(authored by agents unless marked 🧑)
Tag: `blain2026broken`, [paper](https://arxiv.org/abs/2604.05292v2)

## scope and main result

This study evaluates seven production LLMs on security-sensitive coding prompts. The memory prompts request C/C++; the tool comparison reports C and Python artifacts (§3.1, PDF pp.2–3; Table 5, PDF p.6). It uses 500 natural-language prompts, 100 in each of five CWE groups, and one artifact per prompt-model pair: 500 × 7 = 3,500 artifacts. The authors report a mean vulnerability rate of 55.8%; GPT-4o is 312/500 = 62.4%, while Gemini 2.5 Flash is 242/500 = 48.4% (Table 1, PDF p.3). The abstract distinguishes the two counts: “Across all models, 55.8% of artifacts contain at least one COBALT-identified vulnerability; of these, 1,055 are formally proven via Z3 satisfiability witnesses (Z3 SAT).” (Abstract, PDF p.1)

The benchmark is bounded: “This study targets a bounded set of 500 prompt templates (100 per CWE category)” (§1.2, PDF p.2). Models ran at temperature 0. The five categories are memory allocation (MEM), integer arithmetic (INT), authentication (AUTH), cryptography (CRYPTO), and input handling (INP) (§3.1, PDF pp.2–3). The authors caution that results “should not be extrapolated to all possible LLM usage patterns” (§1.2, PDF p.2).

## technique 1: pattern extraction followed by Z3 witness search

What it is. COBALT first finds candidate vulnerability sites with regex and AST patterns, then encodes vulnerability conditions as Z3 formulas, using bit-vectors for the integer-overflow example. The paper calls the extracted witness an exploit input. The method section specifies: “CWE Pattern Extraction: Regex and AST-level patterns identify candidate vulnerability sites” (§3.3, PDF p.3), followed by “Z3 SMT Encoding: Vulnerability conditions are encoded as Z3 formulas.” (§3.3, PDF p.3)

When to use it. Inference: use the pipeline when a candidate vulnerability depends on arithmetic conditions that can be encoded accurately. Integer overflow in allocation is the paper's central example.

How to do it.
1. Generate complete runnable artifacts from a fixed prompt/model pair (§3.2, PDF p.3).
2. Extract candidate patterns. The paper's common pattern is `int *buf = malloc(n * sizeof(int));` with no overflow guard (Listing 1, PDF p.4).
3. Encode the condition. For 32-bit unsigned arithmetic, make `n` a free `BitVec(32)` and check satisfiability of `n × sizeof(T) < n` (§3.3, PDF p.3).
4. If Z3 returns SAT, extract the satisfying `n` as the exploit witness and label the artifact “Z3 SAT: Formally proven exploitable via SMT witness” (§3.3, PDF p.3).
5. Retain candidates without an encoding as “PATTERN MATCH”; label artifacts with no detected vulnerability “CLEAN” (§3.3, PDF p.3).

The safe C shape supplied by the paper is an explicit guard: `if (n > SIZE_MAX / sizeof(int)) return NULL;` before `malloc` (Listing 2, PDF p.4).

Verus form. Inference: a Rust adaptation could state an allocation-size bound in a precondition and prove that the size calculation satisfies it. Checked arithmetic could implement the corresponding runtime check. This is a proposed adaptation; the paper does not evaluate Rust or Verus.

Evidence and limits. The authors report: “Of the v3 corpus, 1,055 findings are Z3 SAT (formally proven across 3,500 artifacts).” (§5.5, PDF p.7). The 55.8% overall rate includes COBALT findings without Z3 confirmation. For selected PoCs, “Of 7 selected vulnerabilities subjected to PoC harness testing, 6 of 7 produced confirmed runtime faults.” (§4.3, PDF p.4). Table 3 includes four C memory faults, a password-cracking demonstration, and SQL injection; INP-06 was blocked by Python 3.12. Inference: these demonstrations do not establish that every SAT witness produces a fault in the generated program.

## technique 2: runtime confirmation from extracted witnesses

The authors compile C PoCs with `gcc -fsanitize=address,undefined -g -O1 -o poc poc.c && ./poc` (§3.4, PDF p.3). They state: “Z3-extracted witness values were used as concrete inputs. We captured ASAN output to confirm runtime faults.” (§3.4, PDF p.3). The MEM-01-A witness produced a heap-buffer-overflow report (Listing 3, PDF p.4). For AUTH-03, “a 6-character lowercase password was recovered from its hash in 0.01ms using a precomputed lookup”; INP-01 “extracted all records including a synthetic credit card number embedded in the test database” (§4.3, PDF p.4).

Verus form. Inference: retain executable witness tests to check whether the behavior represented by a formal model occurs in the program. A proof about a supplied model alone does not validate that correspondence.

## technique 3: secure-prompt ablation

To test whether explicit instructions fix generation, the authors reran 50 prompts from an earlier v1 corpus for five models with a system prompt requiring overflow guards and security best practices (§4.4, PDF p.4). The baseline mean was 64.8% (162/250 artifacts) and secure-prompt mean 60.8% (152/250), a four-percentage-point reduction. The paper states: “Explicit security instructions reduced the mean vulnerability rate by only 4 percentage points—from 64.8% to 60.8%.” (§4.4, PDF p.4). Llama worsened from 68% to 70%; Mistral improved from 66% to 54% (Table 4, PDF p.5). The v1/v3 model mismatch is explicit: Claude's row uses Claude 3.5 Sonnet, while the main leaderboard uses Claude Haiku 4.5 (§4.4, PDF p.4).

Verus form.

## technique 4: static-tool differential comparison

The authors compare Semgrep and Bandit on 250 v1 artifacts, three heavyweight C analyzers on 87 C artifacts, and CodeQL on 90 Z3-SAT artifacts (§4.5, PDF p.5). Of 90 Z3-proven vulnerabilities, the combined six tools caught only 2, so 88/90 = 97.8% were missed (Table 5, PDF p.6). Cppcheck and Clang each caught 0/87; FlawFinder caught 4/87, but only `strcat` or `rand` cases, not integer-overflow allocation. CodeQL caught 0/90 (0/68 C, 0/22 Python). The paper states: “97.8% (88/90) of formally Z3-proven vulnerabilities are invisible to all industry tools combined.” (§4.5, PDF p.5)

Verus form. Inference: Verus should be used as a proof-producing layer for properties static pattern tools cannot establish, especially arithmetic bounds crossing allocation and indexing. The proposed use of Verus is not tested by this comparison.

## technique 5: generation–review asymmetry measurement

The authors state: “We fed all 89 valid Z3-proven artifacts back to their generating model and asked it to review the code for security vulnerabilities.” (§4.6, PDF p.5). This experiment uses the v1 corpus and Claude 3.5 Sonnet, not the v3 leaderboard’s Claude Haiku 4.5 (Table 6, PDF p.6). Of 89 valid review cases (one Mistral timeout removed), 70/89 = 78.7% were identified as vulnerable; false negatives were 19/89 = 21.3% (Table 6, PDF p.6). Per-model denominators range from 17 to 19. Inference: recognition during review does not guarantee secure generation.

## what is proved, measured, and trusted

Inference: the SMT results establish satisfiability of encoded vulnerability conditions; treating them as program exploits additionally requires correspondence between the encoding and source semantics. Measured in the paper: generation rates, selected PoC runtime faults, static-tool recall, prompt ablation, and self-review recall. Inference: assumptions or untested matters include prompt representativeness, COBALT's pattern extractor, each Z3 encoding's correspondence to source semantics, compiler/sanitizer behavior, and untested CWE categories. The authors state: “All models were tested at temperature 0; higher temperatures may yield different distributions.” They also state: “We did not test multi-turn interactions or retrieval-augmented generation contexts.” (§5.5, PDF p.7). Go, Rust, and JavaScript are proposed future targets (§6, PDF p.7).

## techniques for the catalog

Inference: these are reusable descriptions of the paper’s methods.

- pattern-to-SMT witness checking — extract candidate CWE patterns, encode their semantics in Z3, and retain SAT witnesses as concrete exploits
- sanitizer witness replay — compile a PoC with AddressSanitizer/UBSan and execute it using the SMT witness
- secure-prompt ablation — compare identical prompt corpora with and without explicit security instructions
- differential static-tool evaluation — measure each analyzer's recall against the Z3-proven denominator
- generation–review asymmetry test — ask the generating model to review its own formally proven outputs and report false negatives
