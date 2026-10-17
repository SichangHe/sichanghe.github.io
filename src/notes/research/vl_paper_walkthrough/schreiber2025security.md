# Security Vulnerabilities in AI-Generated Code: A Large-Scale Analysis of Public GitHub Repositories
(authored by agents unless marked 🧑)
Tag: `schreiber2025security`, [paper](https://arxiv.org/abs/2510.26103)

## purpose and scope

Schreiber and Tippe mine public GitHub repositories for code explicitly attributed to ChatGPT, GitHub Copilot, Amazon CodeWhisperer, or Tabnine. They filter the files, run CodeQL, map findings to CWE and CVSS, and report language- and tool-specific vulnerability patterns. This is an empirical static-analysis study, not a proof method. The authors state: “Using CodeQL static analysis, we identified 4,241 Common Weakness Enumeration (CWE) instances across 77 distinct vulnerability types” (Abstract, p. 1).

## technique 1: reproducible attribution search

What it is. Query GitHub's REST API for code comments containing a tool-specific attribution pattern. The paper requires that “The code must be uniquely attributable to a specific AI code generation tool” and that “The file or code section containing AI-generated code must be clearly identifiable” (Section 3.3, p. 5).

How to do it.
1. Select commercially available tools with substantial adoption (Section 3.1, pp. 3–4).
2. Combine six prefixes—`by`, `with`, `use`, `used`, `using`, `from`—with unambiguous tool names; use `github+copilot`, not `copilot` alone (Section 3.3, p. 5).
3. Query GitHub's REST API with pagination (100 results per page) and size-range partitioning to bypass the 1,000-result query limit; retain default branches (Section 3.2, pp. 4–5). The searches were run in February 2024 and the results archived as a snapshot (Section 4.1, p. 7).
4. Manually inspect a sample to validate that search terms identify genuine attributions (Section 3.3, p. 5).

Verus form. Inference: this can supply a reproducible corpus manifest, but attribution comments are metadata rather than a proof of provenance. A Verus tool could verify manifest integrity with hashes and prove that filtering preserves recorded file identities; it cannot prove that a comment is truthful.

Evidence and limits. The search returned 82,413 potential files: 75,611 ChatGPT, 5,700 Copilot, 577 Tabnine, and 525 CodeWhisperer (Table 1, p. 7). The authors caution that explicit attributions undercount actual use (Section 4.1, p. 7); English-only terms also exclude non-English comments (Section 5.3, p. 16).

## technique 2: multi-stage dataset filtering

What it is. Convert noisy search results into executable, CodeQL-compatible files. The pipeline removes duplicates using filename, SHA1, and keyword; excludes multi-tool attributions, non-executable formats, unsupported languages, and files below 150 bytes (Section 3.4, pp. 5–6).

How to do it.
1. Deduplicate and remove files mentioning multiple tools (Section 3.4, p. 5).
2. Remove Markdown, HTML, JSON, plain text, CSV, XML, YAML/YML, and TeX files (Section 4.2, p. 8).
3. Restrict to CodeQL-supported languages (Section 3.4, p. 6).
4. Remove files under 150 bytes (Section 3.4, p. 6).
5. For vulnerability analysis, retain Python, JavaScript, and TypeScript, and exclude attribution keywords occurring outside comments (Section 4.3, p. 10).

Verus form. Inference: represent each filter as a pure predicate over a manifest record and prove that every retained record satisfies all predicates. Inference: if VL consumes generated Rust, replace language filtering with parser/type-check success and retain source-to-attribution provenance separately.

Evidence. Filtering reduced 82,413 raw files to 10,387: 22,736 duplicates, 42,615 text files, 6,634 unsupported-language files, and 41 undersized files were removed (Table 2, p. 8). The later analysis retained 7,117 attribution-valid files after excluding 586 non-comment keyword matches (Section 4.3, p. 10).

## technique 3: CodeQL-to-CWE/CVSS vulnerability assessment

What it is. Run CodeQL 2.16.3's `security-and-quality` suite, map findings to MITRE CWE identifiers using MITRE's CSV files (Section 4.4, p. 11), then use NVD CVEs and CVSS v3.x Base Scores for severity (Section 3.5, p. 6).

How to do it.
1. Build CodeQL databases for the retained source files and run the same query suite across languages (Section 3.5, p. 6).
2. Use attribution comments to delimit the AI-generated portion: the portion begins at the line containing the keyword, and the keyword must be in a code comment (Section 3.5, p. 6).
3. Exclude non-security recommendations and retain findings with direct CWE mappings (Section 4.4, p. 11).
4. Retrieve the CVEs for the detected CWEs through the NVD API and use only CVSS v3.x scores (Section 3.5, p. 6); the paper analyzed 62,220 NVD entries for 64 CWEs and excluded the 13 detected CWEs without CVEs (Section 4.5, p. 13).
5. For average CVSS per CWE, include only CWEs with more than ten CVEs (Section 4.5, p. 13).

Verus form. Inference: CodeQL findings can be converted into review obligations or pre-verification filters, but a static warning is not a Verus proof failure. Inference: a Verus integration should require `verus!` verification and separately run security scanners; proving memory safety does not prove absence of injection or hard-coded credentials.

Evidence and arithmetic. Of 7,117 attribution-valid files, 861 (12.1%) contained at least one CWE vulnerability, with 4,241 occurrences across 77 types (Section 4.4, pp. 11–12). Table 6's overall average is 861 vulnerable files / 4,241 CWEs / 11.36% prevalence / 650 LOC per CWE (Table 6, p. 12). The paper reports Python prevalence 16.18%–18.50%, JavaScript 8.66%–8.99%, and TypeScript 2.50%–7.14% (Section 4.4, p. 12). Table 6's "Files" column counts vulnerable files, not the denominator. Inference from my arithmetic: the denominators are the Table 5 file counts minus erroneous files, e.g. ChatGPT Python 606 / (3,794 − 49) = 16.18%, Copilot TypeScript 2 / (69 − 41) = 7.14%, and overall 861 / (7,696 − 116) = 11.36%. The 12.1% figure instead divides by 7,117 (861 / 7,117).

Most counted CWEs are code-quality findings. Table 8 (Appendix B, p. 19) lists CWE-563 "Assignment to Variable without Use" as the top CWE for ChatGPT Python (1,044 of 2,468, 42.30%) and Copilot Python (136, 57.14%). Inference: "vulnerability" counts and LOC-per-CWE are therefore dominated by quality warnings, not exploitable flaws.

## technique 4: language/tool comparative risk analysis

The study computes vulnerability prevalence and LOC-per-CWE per tool-language pair (the average lines of code "that can be generated before encountering a security vulnerability", Section 4.4, p. 12), then compares CWE distributions and average CVSS. ChatGPT had 9,506 of 10,387 filtered files (91.52%), Copilot 779 (7.50%), CodeWhisperer 54 (0.52%), and Tabnine 48 (0.46%) (Table 3, p. 9). Among analyzed CodeQL files, ChatGPT contributed 3,794 Python, 2,029 JavaScript, and 1,485 TypeScript files (Table 5, p. 10).

The strongest reported densities were Copilot Python at 1,739 LOC/CWE and TypeScript at 905 LOC/CWE, and ChatGPT JavaScript at 932 LOC/CWE (Table 6, p. 12). The highest average CVSS values were CWE-89 SQL Injection 8.76, CWE-78 OS Command Injection 8.68, CWE-94 Code Injection 8.68, CWE-259 hard-coded password 8.64, and CWE-798 hard-coded credentials 8.57 (Table 7, p. 14). Table 7 covers only CWEs with more than ten CVEs (Section 4.5, p. 13). Table 6 rests on very small cells: Copilot TypeScript has 2 vulnerable files, Copilot JavaScript 8, and Tabnine 1 or 2. Inference: these are prioritization signals, not causal evidence that one tool is intrinsically safer; sample sizes and developer context differ sharply.

## what is proved, trusted, and limited

No formal safety property is proved. CodeQL, CWE mappings, NVD data, attribution comments, and the GitHub snapshot are trusted measurement infrastructure. CodeQL cannot identify runtime issues, logical flaws, or weaknesses that manifest only during execution (Section 5.3, p. 16). The observational relationships do not establish causation; developer experience, project complexity, review, and tool selection are confounders (Section 5.3, p. 16).

The paper's file counts differ across places (Section 4.3, p. 10). The abstract and introduction say 7,703 files. Section 4.3 uses 7,703 for the Python/JavaScript/TypeScript files, excludes 586 non-comment keyword matches to reach 7,117 "analyzable files", and later says CodeQL analyzed 7,696 files with 1,236,725 LOC (Table 5). Table 4's Python, JavaScript, and TypeScript rows sum to 7,709. The 46.4% / 53.6% file-findings split uses 7,696, the 12.1% vulnerable-file share uses 7,117, and the 11.36% prevalence in Table 6 matches 7,696 minus 116 erroneous files. The paper does not reconcile these; report each number with its stated context. Inference: these inconsistencies weaken direct percentage comparisons, including the headline 87.9% (= 100% − 12.1%) versus the 11.36% overall prevalence in Table 6.

What VL should reuse. Inference: reuse the staged provenance and filtering manifest, language-specific CWE checks, and explicit denominator reporting. VL should not treat CodeQL absence as a proof substitute; use it as a complementary security scan before or after Verus verification.

Threat to a product of agent-written verified Rust. Inference: high for security assurance if product users mistake memory-safety proofs for broad security; medium for engineering workflow because the scanner can expose generated-code patterns but does not cover all Rust-specific semantic and supply-chain risks.

## techniques for the catalog

- attribution-aware corpus mining: search explicit tool comments with validated API queries and snapshot the corpus
- staged dataset filtering: deduplicate, remove non-code and unsupported files, and enforce minimum size and attribution predicates
- CodeQL CWE analysis: run a consistent static query suite and retain directly mapped security findings
- CVSS severity mapping: cross-reference CWEs with NVD CVEs and average CVSS v3.x scores under a stated frequency threshold
- language/tool risk profiling: compare prevalence, LOC per CWE, CWE distributions, and denominators by language and generator
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This metric represents the average number of code lines that can be generated before encountering a security vulnerability, with higher values indicating better security performance."): I read the whole paper text and the whole study and checked the quotations, the table numbers (Tables 1-3, 5-7), the section and page references, and the technique steps; I changed the snapshot reference (Section 4.1, not 3.2), the section and page references for CWE mapping, NVD retrieval and the 77 types, the wrong claim that Table 6 file counts are the prevalence denominators (they are vulnerable files; the denominators are Table 5 counts minus erroneous files, my arithmetic), and the dataset-count discrepancy paragraph; I added the Table 8 point that most counted CWEs are quality findings and a note on small cells; I did not check Tables 4 and 8 beyond the figures cited, Appendix A, the reference list, or the PDF layout beyond the text extraction.
