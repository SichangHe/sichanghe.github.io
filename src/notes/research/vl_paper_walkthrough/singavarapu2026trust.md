# A Trust Ledger and an Execution Check for CPG-Based C-to-Lean 4 Autoformalization: Separating Declined from Silently Incorrect Translations
(authored by agents unless marked 🧑)
Tag: `singavarapu2026trust`, [paper](https://doi.org/10.48550/arxiv.2609.38237)

## purpose and core claim
The paper evaluates a deterministic exporter from C to a small Lean 4 interpreter. It separates explicit translator holes from translated code that is type-correct but semantically wrong. “A construct the translator declined to handle leaves an explicit, labeled gap, and coverage counts it.” (introduction, §1, p. 2) By contrast, “a construct the translator handled incorrectly produces well-typed output that type-checks, is counted as translated, and computes the wrong answer.” (introduction, §1, p. 2)

## technique 1: a three-tier trust ledger

what it is
The pipeline exports Joern CPG nodes to a compact Core AST, then evaluates that AST with a fuel-indexed Lean interpreter. It records each construct-level hole and classifies functions as hole-free, call-closed, or at dynamic-hole risk. “A function is hole-free when its AST contains no hole. It is call-closed when it is hole-free and every call target also resolves inside the translated program.” (pipeline and metric, §2, p. 3)

how to apply it
1. Pin parser and toolchain versions; the artifact pins Joern 4.0.606 and Lean `v4.30.0-rc1` (§2, p. 3).
2. Export each C construct deterministically to a Core term; represent unsupported constructs with a labeled hole (§2, p. 3).
3. Count hole-free functions, then restrict to call-closed functions whose callees are also present (§2, p. 3).
4. Keep hole causes itemized. Do not collapse the three populations into one quality score (§2, pp. 3–4).
5. Run translated programs against the real implementation to find silent wrong answers; a ledger alone cannot reveal them (§1 and §3.1, pp. 2, 4).

The SQLite export contains 8,602 functions and over 1.5 million AST nodes; 5,222 (60.7%) are hole-free and 2,134 (24.8%) call-closed (abstract, p. 1; §4, p. 8). The denominator is all exported SQLite functions. The 2.4× difference is therefore a denominator effect, not a second experiment.

Verus form
Inference: maintain separate artifact fields for (a) Verus functions with no generated placeholders, (b) functions whose called specifications and implementations are available, and (c) calls or branches that may reach an external or unmodeled behavior. Use ordinary Verus `requires`, `ensures`, and `assert` to prove the available contract; keep an explicit ledger outside the Rust source for unresolved constructs. A successful proof does not collapse these categories. Inference: execute the generated Rust against reference tests or differential fixtures, because Verus’s logical proof cannot detect a translator that encoded the wrong operation while preserving a satisfiable contract.

evidence and failure
The paper’s A1 character-literal bug rendered `'x'` as a string. On `"axxbxcdef"`, lengths n = 9, 3, 1, the repaired translation returned 3, 2, 0 like compiled C; the defective translation returned 0, while hole count stayed 5,033 on a 3,560-function iteration corpus (§3.1, pp. 4–5). A2 emitted `while` for `do while`; a fixture returned 1 under `cc -O0` and 0 under the translation, with both forms hole-free (Table 1, p. 3; §3.1, p. 5). A4 found an escaping struct-local pointer that was statically hole-free but failed on evaluation (§3.1, p. 6). These are execution-found defects, not coverage changes.

## technique 2: differential execution as an oracle

method
Construct small fixtures that isolate one semantic feature, compile them with the real C compiler, run the generated Lean interpreter, and compare outputs. Keep the defective translation as a negative control. The paper states: “Because the semantics is a computable interpreter, the translated program can be run and compared against the real language implementation, which is what §3.1 relies on.” (pipeline, §2, p. 2)

For each discovered mismatch, record the source construct, behavior delta, metric delta, corpus denominator, and repair commit. The paper’s Table 1 records six decoupling cases: four behavior changes with no coverage movement, one label movement with no behavior change, and one retracted impossibility claim changing 17 translations with zero net hole-free movement (introduction, §1, p. 2; Table 1, p. 3).

Verus form
Inference: use a reference Rust implementation or compiled baseline as the execution oracle and compare generated code on bounded inputs. Keep the Verus proof and the differential test as separate evidence: `ensures` proves the chosen mathematical relation, while the test detects an incorrectly generated relation or external-call model. This is a product workflow recommendation, not a result measured by the paper.

limits and trust boundary
The Core interpreter, Lean kernel, Joern parser, C compiler, fixture coverage, and pinned toolchains remain trusted. The paper notes that Joern parses C without preprocessing, so absent definitions can evade the ledger (§2, p. 4). Its claims are existential; it does not estimate defect frequency or transfer magnitudes to another codebase (§1, p. 2). “Coverage is therefore an accounting of what was attempted, not of what the codebase contains.” (pipeline, §2, p. 4)

## techniques for the catalog
- three-tier trust ledger: report hole-free, call-closed, and dynamic-hole-risk populations with construct-level causes
- differential execution oracle: compare generated semantics with a real implementation on isolating fixtures and retain negative controls
- denominator audit: attach every percentage to its exact exported population and distinguish metric movement from behavior movement
