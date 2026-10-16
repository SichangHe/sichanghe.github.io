# CrypFormBench: Benchmarking Formal Analysis Capability of Large Language Models for Cryptographic Schemes
(authored by agents unless marked 🧑)
Tag: `li2026crypformbench`, [paper](https://doi.org/10.1145/3808184)

## what is measured and what remains trusted

CrypFormBench is a benchmark for LLM assistance with cryptographic formalization. The authors describe it as “a comprehensive benchmark jointly covering symbolic and computational security to evaluate five core LLM capabilities: interpretation, generation, completion, transformation, and correction.” (abstract, p.1). It contains 700 instances from 677 schemes, seven verifier languages, and 160 security properties (abstract, p.1; sec.3.2.2, p.5). The 700 files are 415 safe and 285 unsafe; they are sampled as 100 representative analyzable files per tool after filtering 4,549 source files to 3,590 unique projects and labeling runs safe, unsafe, error, or timeout (sec.3.2.1, p.5).

The benchmark measures tool usability and semantic correctness, not proofs of the benchmark's own labels. The authors state, “The unsafe instances have established attacks (often with traces), whereas safe instances have no known attacks (sometimes with proof sketches) under the specified threat model.” (sec.3.2.1, p.5). Inference: the labels remain dependent on literature, reference models, verifier semantics, and threat-model choices. Inference: an LLM-generated model that compiles and returns SAFE is evidence only for the encoded property under the selected tool and adversary.

The headline baseline is Claude-3.5-Sonnet-Coder's overall score of 48.7/100 (abstract, p.1; Table 3, p.10). This score is a weighted aggregate, not a probability of correctness: default task weights are 0.15 interpretation, 0.25 generation, 0.20 completion, 0.25 transformation, and 0.15 correction (sec.4.5, p.9).

## technique: build a cross-language, multi-capability corpus

What it is: collect formal files from seven tools, deduplicate and execute them, attach normalized logic descriptions and canonical security labels, then derive five controlled tasks. The paper's corpus covers Scyther/SPDL, Tamarin/SPTHY, AVISPA/HLPSL, ProVerif PV/HORN, Maude-NPA, CryptoVerif CV/OCV, and EasyCrypt/EC (Table 1, p.3).

How to apply it:
1. Source public formal projects and tool datasets; the paper collected 4,549 model files (sec.3.2.1, p.5).
2. Deduplicate and run each file with its verifier, recording 1,280 safe, 557 unsafe, 972 error, and 781 timeout outcomes (sec.3.2.1, p.5).
3. Retain analyzable files, balance safe/unsafe cases, assign canonical labels from cryptographic literature or standards, and discard unresolved verifier-label disagreements (sec.3.2.1, p.5).
4. Pair every selected file with a unified logic description covering roles, message flows, and goals (sec.3.3.1, p.6).
5. Create interpretation, generation, completion, transformation, and correction instances from the paired code and descriptions.

The dataset deduplicates 241 raw tool-specific goals into 160 properties, including secrecy, authentication, integrity, correctness, equivalence, forward secrecy, IND-CPA/CCA, and zero knowledge (sec.3.2.2, p.6). It includes Dolev-Yao, CK, eCK, algebraic, and application-specific adversaries (sec.3.2.2, p.6). Inference: this corpus design can be reused for Verus by pairing Rust/Verus code with functional and safety specifications, but the safe/unsafe label would need independently reviewed Verus obligations and counterexamples.

## technique: evaluate five distinct LLM tasks

The paper defines task contracts that separate useful capabilities:

- interpretation: given original formal code, produce notation comments and a global scheme summary; score semantic similarity to reviewed references (sec.3.3.2, p.6)
- generation: map a natural-language logic description to complete target-language code; require compilation and intended security verdict (sec.3.3.2, p.6)
- completion: fill grammar-aware masks at lemmas, type variables, or statements while preserving the surrounding file (sec.3.3.2, p.6)
- transformation: translate one scheme between formal languages under matched adversary assumptions and compare the target verdict with the source (sec.3.3.2, pp.6–7)
- correction: repair either compiler failures or semantically false verification reports, using diagnostics and logic descriptions (sec.3.3.2, p.7)

The paper illustrates a concrete mapping: “the client sends a hash value of n to the server” becomes `send_1(C, S, h(n));`, `C → S : hash(n);`, `out(c, hash(n));`, or a Tamarin transition (sec.2.2, p.3). Inference: a Verus benchmark should likewise test both natural-language-to-contract generation and repair of compilable but semantically wrong contracts; syntax-only pass rates are insufficient.

## technique: use a standardized tool-in-the-loop harness

What it is: normalize model output, run several verifier versions and commands, parse outcomes, and compute analyzability and correctness. The pipeline extracts code from Markdown fences, filters descriptions, canonicalizes whitespace and aliases, and rejects empty or corrupted outputs (sec.4.2, p.7). The testbed runs multiple tool versions where grammars vary and alternate commands where a single engine can miss attacks; examples include AVISPA's OFMC then CL-AtSe and Maude-NPA's two reduction commands (sec.4.3, p.8).

How to apply it:
1. Construct a task-specific prompt naming target language, placeholders, logic description, and preservation rules (sec.4.1, p.7).
2. Extract only formal code and normalize it before execution.
3. Execute all designated verifier versions and fallback commands.
4. Record parse/compile success, timeout, verifier verdict, and attack traces.
5. Compare the verdict with the canonical label and preserve the complete run metadata.

The authors warn, “LLMs are better for bootstrapping models, while verifiers must validate and refine the results.” (sec.2.2, p.4).

## technique: score analyzability and correctness with denominators

Syntactic correctness is the analyzed ratio `a`, the fraction of generated files parsed and compiled. Functional correctness matches SAFE/UNSAFE labels and computes overall accuracy plus ACCA and F1A on analyzable files (sec.4.4, p.8). Execution time, code similarity, and embedding-based semantic similarity are additional metrics (sec.4.4, p.8).

The executable task score is a harmonic mean of analyzability and correctness: `S_t = HM(a^γ,Q)`, where `Q = HM(ACCA,F1A)` and `γ` penalizes low analyzability (Eq.1, p.9). Correction combines error and false-correction scores with weights 0.4 and 0.6; interpretation combines logic similarity, annotation similarity, and executable annotation score with α=β=0.3 (Eqs.2–3, pp.9–10). Language scores use macro-averaging to prevent frequent languages dominating (Eq.4, p.9), and task scores use the five default weights above (Eq.5, p.9).

Inference: for Verus, report at least generated, parsed, verified, and semantically-correct denominators separately; a high success rate among the small subset that compiles can conceal a severe generation bottleneck. Inference: property-level scoring should count every `requires`/`ensures` obligation, because a function that proves one postcondition while omitting another is not fully correct.

## technique: improve outputs with few-shot, fine-tuning, and Pass@K

Few-shot prompting supplies tool-specific exemplars. On a 10% subset, 3-shot generation analyzability rises from 6.6% at 0-shot to 24.9% at 3-shot while ACC stays above 92%; completion analyzability rises from 42.9% to 50.9%, and correction ACC rises from 55.6% to 72.9% (sec.6.3, p.17). The paper attributes gains to reproducing imports, role/environment blocks, and event/query declarations, while semantic failures and backend timeouts remain.

LoRA fine-tuning Qwen2.5-Coder-3B uses a 90%/10% train/evaluation split for three epochs (sec.6.3, p.17). Completion analyzable outputs increase from 5 to 23, with TP 0→8 and TN 0→15; correction analyzable outputs increase 9→11; generation changes 4→5; transformation remains at zero analyzable outputs (sec.6.3, p.17).

Pass@K queries up to K times, accepts an instance if any candidate is analyzable, and computes correctness on that analyzable set (sec.6.3, pp.17–18). Increasing K from 1 to 3 consistently raises analyzability, especially for generation and transformation, while ACCA/F1A on analyzable outputs stays mostly stable (sec.6.3, p.18).

## technique: property-level audit in addition to scheme-level labels

The benchmark's main label marks a scheme UNSAFE if any checked goal is violated and SAFE otherwise. For SPDL and SPTHY, the authors additionally score each `(scheme, goal)` pair as TP, FP, FN, or TN and require all goals to be covered for full correctness (sec.6.4, p.18). Fine-grained scores fall most for generation because of low analyzability and missing or mis-modeled goals; completion and correction fall by about 10% on average, while interpretation is nearly unchanged (sec.6.4, pp.18–19).

## techniques for the catalog

- corpus curation — source, deduplicate, execute, label, and balance formal models before evaluation
- five-task decomposition — separate interpretation, generation, completion, transformation, and correction
- tool-in-the-loop harness — normalize outputs and run multiple verifier versions and fallback commands
- analyzability/correctness metrics — report parsed and verified denominators separately with ACCA and F1A
- weighted harmonic scoring — penalize low analyzability while aggregating tasks and languages
- few-shot prompting — provide target-language scaffolding examples to improve executability
- Pass@K repair — sample bounded candidates and accept only independently verified outputs
- property-level audit — score each security or specification goal, not only a scheme-level verdict
