# SecGoal: A Benchmark for Extracting Formalizable Security Goals from Protocol Documents
(authored by agents unless marked 🧑)
Tag: `huang2026secgoal`, [paper](https://www.semanticscholar.org/paper/70979bedd64af3c6462f69151a8da5cc2a972827)

## what the paper builds
SecGoal treats formal-methods work as a specification pipeline: find security goals in prose, then map them to structured symbolic properties. The benchmark contains 391 annotated goal statements and 131 formal properties from 15 protocols; the statements occupy 2.5% of source text on average. The paper's key warning is, “Formal verification provides rigorous guarantees for cryptographic security, yet extracting formalizable security goals from natural-language protocol documents remains largely manual.” (abstract, page 1)

The output is specification-grounded extraction, not a proof of protocol security. The authors state, “SecGoal and AIFG are specification-grounded: they extract and formalize goals that are stated in or supported by the source documents, but they do not synthesize all expert-derived assumptions needed for complete security analysis.” (section 7, page 8)

## technique 1: build an expert-vetted extraction corpus
Inference: Use this when training an extractor for long, heterogeneous protocol documents where positives are sparse and a security-analysis paper may contain assumptions outside the protocol specification.

Steps (section 3.2, page 3):
1. Query an LLM multiple times to generate broad candidate security-goal statements, prioritizing coverage
2. Have two doctoral researchers in cryptographic protocol analysis and formal verification independently remove unsupported candidates and add omitted goals
3. Treat protocol specifications as annotation ground truth; use formal-analysis literature only as a secondary reference because the two sources can differ in scope
4. Have a senior domain expert adjudicate disagreements and edge cases across all protocols
5. Record both goal statements and their mapping to formal properties, preserving protocol-level train/test separation

The resulting task uses protocol-level splits so all text from one protocol appears in only one split. Annotation quality is reported as statement-selection F1 0.844 and Jaccard 0.737, and property-labeling micro-F1 0.956 with Cohen's κ 0.947 (section 3.2, page 3). These scores are agreement metrics, not proof correctness. Inference: the same separation is necessary for Verus specification extraction so a model cannot memorize one protocol's vocabulary across train and test.

Verus form: Inference: define a review schema whose candidate goal becomes a Rust `spec fn` proposal only after human approval; keep the approved source statement, property type, symbols, and assumptions as ghost metadata. Verus can check the resulting function contracts, but it cannot adjudicate whether a prose sentence is a protocol requirement. Human annotation and protocol-level holdout remain trusted.

## technique 2: preprocess and chunk documents before goal extraction
Inference: Use this when long RFCs or standards contain tables of contents, references, copyright text, and more tokens than the model context. Section 4.2 (page 4) prescribes: remove structural boilerplate (including contents, bibliographies, and copyright notices); segment the remaining text into chunks that retain local context; run extraction on each chunk; aggregate and deduplicate the results into a protocol-level set `G`.

The extractor `Mext` returns an empty list when no goal is detected and otherwise emits a structured list. This makes negative chunks explicit rather than forcing one positive label per chunk. Inference: preserve section identifiers and source offsets in a Verus-oriented pipeline so every generated contract has a reviewable provenance link.

The paper tests two chunking choices on a held-out test split with Gemma2-9B-FT. Sentence-window chunks without downsampling score Pext 63.1%, Rprop 83.4%, EC-F1 70.3%; adding a 1:3 negative sampling ratio gives 65.7%, 90.4%, and 74.6%. Section-level chunks score 61.2%, 86.0%, and 70.5% without downsampling, and 66.6%, 97.6%, and 77.8% with 1:3 downsampling (Table 1, page 5). The denominators are the held-out protocol test examples; the paper reports percentages, not raw counts.

Verus form: Inference: chunking belongs in the front end that proposes `requires`/`ensures` clauses. A proof crate should retain the selected section and reject a generated contract when no source span supports it. This is a workflow control, not a Verus language construct.

## technique 3: randomized negative downsampling for imbalanced fine-tuning
Inference: Use this when formalizable goals are rare and a model learns to label ordinary protocol mechanics as goals. The paper uses Randomized Negative Downsampling with a controlled positive-to-negative ratio, for example 1:3 (section 4.2, page 4). Train the extractor on retained positives plus a sampled subset of negative chunks, then evaluate precision and recall jointly.

The ablation above shows the effect: with section-level chunks, 1:3 downsampling raises EC-F1 from 70.5% to 77.8%; with the ratio fixed at 1:3, section-level chunks beat sentence-window chunks 77.8% versus 74.6% (Table 1, page 5). Inference: for agent-generated Verus contracts, negative examples should include plausible but non-security comments, implementation constraints, and operational steps, because these are the exact over-extraction failures the paper identifies.

## technique 4: AIFG two-stage, flow- and schema-conditioned formalization
Inference: Use this when an approved goal set must become canonical formal security properties, but the protocol flow and variable namespace are available. AIFG deliberately separates extraction from formalization instead of translating a raw document end to end. The paper says, “AIFG decomposes the pipeline into two stages: extraction and formalization.” (section 4.1, page 3)

Stage I applies `Mext` to document chunks and produces `G`. Stage II performs retrieval-augmented formalization for each `g ∈ G`: use `g` as a semantic query to retrieve top-k contextual chunks `Cret`; combine `Cret` with a structured protocol flow `F` (roles, ordered messages, flow variables) and protocol-independent schema `S` (typed slots for canonical security properties); sample a property from `P(· | g,Cret,F,S)`; instantiate schema slots and map prose terms to canonical variables; canonicalize and deduplicate the resulting set `P`.

The paper's example maps “shared secret” to variable `KAB` and places it in the `secretData` slot (section 4.3, page 4). It identifies ambiguity, symbolic mismatch, and many-to-many mappings as failure sources: one statement can imply several properties, and several statements can support one property. The flow is supplied rather than inferred because “symbolic protocol models may vary across experts and configurations.” (section 4.2, page 4)

Verus form: Inference: represent `F` as ghost datatypes for roles, messages, and state; represent `S` as typed specification records; generate candidate `requires`/`ensures` clauses from each approved goal; then prove those clauses over the Rust protocol implementation. Retrieval supplies context but is not evidence of a proof. Canonicalization and deduplication should happen before proof obligations are opened.

Evidence uses four protocols (NSSK, Kao-Chow v1, EDHOC, SPDM), three runs per row, and mean ± standard deviation (Table 3, page 6). With gold-minimal inputs, property-level recall/F1 are NSSK 1.00/0.83, Kao-Chow 0.73/0.73, EDHOC 0.86/0.79, and SPDM 0.92/0.69. Expert-vetted extracted inputs yield recall/F1 1.00/0.74, 1.00/0.55, 0.76/0.51, and 0.71/0.39, respectively. Slot F1 remains high for matched properties (0.96–1.00 for NSSK/KC-v1 and 0.81–0.85 for EDHOC/SPDM), while extra generated properties reduce property precision. The study explicitly says this is “not end-to-end formal verification or executable model synthesis.” (section 5.4, page 6)

## what is proved, trusted, and still missing
The paper measures extraction and structured-property generation; it does not prove any protocol implementation. Its primary extraction metric is EC-F1, the harmonic mean of extraction precision and property-level recall. GPT-5.4 with retrieval is used for AIFG, Gemma2-9B-FT for extraction, and the reported RQ2 gains are on held-out protocols: Gemma2-9B precision rises from 24.0% to 66.6%, recall from 87.9% to 97.6%, and EC-F1 from 35.9% to 77.8% (section 5.3, page 5). The before/after denominators are the same held-out test split.

Trusted elements are expert labels, source specifications, supplied flows and schemas, retrieval embeddings, model outputs, and matching rules. The authors caution that completing a proof still needs “expert-written auxiliary lemmas, suitable proof strategies, and iterative model or query refinements.” (section 7, page 8) Inference: the threat to VeruLaw is over-trust in a high-recall extractor: unsupported goals can create false Rust contracts, while missed goals leave behavior unverified. VL should reuse provenance, negative sampling, protocol-level holdouts, and schema-grounded generation; it should not treat AIFG output as a certificate.

## techniques for the catalog
- expert-vetted goal corpus: generate broad candidates, adjudicate them against protocol specifications, and split by protocol
- context-preserving extraction: remove boilerplate, chunk by section, extract structured goals, then aggregate and deduplicate
- randomized negative downsampling: control positive-to-negative examples to improve precision on sparse goals
- AIFG formalization: retrieve context and condition property templates on a supplied protocol flow and typed schema

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
