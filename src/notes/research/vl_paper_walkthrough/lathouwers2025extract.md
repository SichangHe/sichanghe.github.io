# Extract, model, refine: improved modelling of program verification tools through data enrichment
(authored by agents unless marked 🧑)
Tag: `lathouwers2025extract`, [paper](https://doi.org/10.1007/s10270-024-01232-7)

## purpose and contribution
This paper builds a megamodel and maintained data set for program-verification (PV) tools. Its scope includes “generative techniques, testing, model checking, theorem proving” (Section 1, p.1293). The result is ProVerB: tool pages, a PV-level taxonomy, tags, links, and API-enriched metadata. The abstract reports a “data set of 400+ program verification tools” and says practical fields such as last-commit dates are kept current through APIs (Abstract, p.1293).

## technique 1: classify tools by PV0–PV6 proof roles
What it is: classify tools by what the user supplies and how the claim, prover, arguments, and verifier interact. Higher levels represent potential correctness guarantees, typically requiring more user effort (Section 3, p.1296). Inference: use the levels to compare tool capabilities, then inspect the particular tool and its assumptions before relying on its results.

Steps (Section 3, pp.1296–1298):
1. Identify the artefact and any claim about it.
2. Distinguish a formal model unused for obtaining or verifying correctness guarantees (PV0), a solver checking internal consistency and well-formedness (PV1), and tools that generate artefacts or assist their creation, including synthesis and repair (PV2). The model in PV0 may be implicit. Section 3 places a PV2 tool on a higher level if its output is expected to be processed by another automated component (p.1297).
3. For user-stated properties checked by an automated prover/verifier, classify PV3.
4. If a monoverifier generates and verifies properties against built-in specifications, classify PV4. Users may select among built-in specifications or add properties without directly controlling the specifications themselves.
5. If users can build their own specifications, supported through a specification language and compiler, classify PV5.
6. If users construct proofs checked by a proof assistant, classify PV6.

The paper states: “PV0 tools give the least guarantees of correctness, whereas PV6 tools allow the user to work towards maximum correctness guarantees.” (Figure 1 caption, p.1296) Inference: this paper does not establish a PV-level for Verus. Applying the taxonomy requires examining its proof process, not merely observing that users write proof functions. A PV-level alone does not establish a tool’s soundness.

## technique 2: tool-data collection
What it is: gather candidate tools from selected proceedings, create structured Markdown pages, and use light snowballing. Inference: use this to build a searchable local map before comparing techniques or selecting a verifier.

Steps (Section 4.1, pp.1299–1300):
1. Select CAV 2017–2022 and TACAS 2016–2021 as tool-rich sources; this yielded 519 papers (406 CAV, 113 TACAS) (Section 4.1.1, p.1299).
2. Detect tool names from title patterns such as “Tool name: subtitle with explanation” (Section 4.1.2, p.1299).
3. Read each paper and tag the relation as Presents, Extends, Expands, or Uses (Section 4.1.2, p.1299).
4. Initially select tools claiming some correctness guarantees; later classification may identify false positives. Exclude prototypes with neither a name nor an implementation link. Include artefact links when available. Retain separate pages for specification formats that are not tool-specific, are shared by tools, or are otherwise conceptually separate (Sections 4.1.2–4.1.3, pp.1299–1300).
5. Create one Markdown page with name, domain, type, input/output, internals, relations, links, update dates, and inclusion reason (Section 4.1.3, p.1300).
6. Add a tool when at least two existing entries refer to it (light snowballing, Section 4.1.3, p.1300).
7. Develop and refine the megamodel from the collected tool descriptions, then classify tools with written justifications. Double-check classifications among authors and consult source papers for disputes. Use “no PV” for false positives and “frameworks” for collections whose mixture of levels prevents a sensible single-level assignment (Sections 4.1.4–4.1.5, p.1300).

Inference: for VL, harvest Verus/vstd tools and studies into one page per verifier, preserving paper, repository, language, contracts, trusted base, and evidence fields. Its CAV/TACAS sample does not establish coverage of Rust verification; searching systems and Rust sources would extend that scope.

## technique 3: ontology-based data enrichment
What it is: preserve a human-readable template while mapping entries to an ontology whose classes connect tools, repositories, articles, concepts, PV levels, conferences, writers, and code contributors. Inference: use ontology enrichment when links and metadata must remain queryable and updateable without rewriting hand-curated descriptions.

Steps (Section 4.2, pp.1301–1302):
1. Preserve the existing data structure and automate maintenance (Section 4.2, p.1301).
2. Separate enrichment into new entries, new information, and improved information (Section 4.2, p.1301).
3. Instantiate Repository and Article objects from stored links and use open APIs to gather metadata and populate Writer and CodeContributor objects (Section 4.2.1, p.1301). Repository enrichment retrieves contributors, last-commit dates, and the About section; article enrichment retrieves titles, abstracts, and authors. The reported API sources are GitHub, Springer, and Crossref (Section 4.3.1, p.1303).
4. Represent concepts/tags and PV classification as ontology classes (Tables 1–2, p.1302). Preserve manual annotations during refinement, as illustrated for conference abbreviations in Figure 3 (p.1302).
5. Compare author and contributor names for “same-as” relationships. These data were collected but not yet added to the data set or website (Section 4.2.2, pp.1301–1302). The enrichment process can run weekly through GitHub workflows that generate a pull request for review before merging (Section 4.2.1, p.1301).

The paper says: “The structure of the data set should be preserved.” (Section 4.2, p.1301) Inference: model each Verus verifier as a stable record with typed fields for crate, Rust version, backend, specification language, trust assumptions, and benchmark evidence; derive repository and paper metadata automatically but review identity matches before accepting them.

## technique 4: automated extraction from proceedings
What it is: use PDF pattern matching to bootstrap names, links, and keywords, then let humans resolve ambiguous cases. Inference: use it to lower the cost of adding new papers while retaining manual semantic validation.

Steps (Sections 4.1.2 and 4.2, pp.1299, 1301):
1. Parse proceedings PDFs for title-shaped tool names, resource links, and keywords.
2. Insert the extracted values into the Markdown template and use keywords as initial tags.
3. Manually inspect papers that do not match the heuristic and confirm whether a detected item is actually a PV tool.
4. Preserve hand-added descriptions while scripts add or refresh machine-derived fields.

Inference: this is useful for VL's local database, but extraction must never turn a paper's mention of Verus into evidence that the paper verifies Rust. The enrichment success counts reported in Section 4.3.1 measure metadata retrieval, not the accuracy of detecting tools from titles.

## technique 5: trend analysis and dataset quality checks
What it is: summarize category counts, enrichment coverage, and source composition to assess what the dataset can support. Inference: use denominators alongside counts so a catalog does not imply unsupported completeness.

Evidence: ProVerB contained 427 tools, 26 specification formats, and 71 tags (Section 4.3, p.1302). The reported classification counts were PV0 16, PV1 98, PV2 84, PV3 74, PV4 101, PV5 13, PV6 13, plus 46 no-PV and 8 to-categorize (Section 4.3, pp.1302–1303). Inference: the seven PV-level counts sum to 399; adding the other two categories gives 453. The paper does not reconcile these classification totals with its 427-tool total, so they should not be treated as one consistent denominator. Of 519 selected papers, 351 (68%) had identifiable tools, 54 (10%) unnamed prototypes, and 114 (22%) no tool (Table 3, p.1303). Inference: the rounded 78% implementation figure is (351+54)/519. The table’s Tools column counts papers with identifiable tools, rather than establishing 351 distinct tools. Light snowballing added 76 tools (Section 4.3, p.1303).

Enrichment covered 400 of 427 Markdown files; APIs succeeded for 256 of 269 repositories and 518 of 525 articles (Section 4.3.1, p.1303). The authors identified 1,419 code contributors and 1,188 authors; exact-name matching found 273 same-as relationships and 169 tools with at least one overlapping expert, while they expect more because only exact matches were counted (Section 4.3.1, p.1303).

## what is trusted, what fails, and VL impact
The authors state: “All the PV-classifications that we have performed, come from our personal interpretations of the contents of a fairly large body of fairly complex academic papers.” (Section 6.1, p.1307) They acknowledge possible misclassifications despite mutual checking and unknown biases from selecting CAV and TACAS (Section 6.1, pp.1307–1308). Unavailable API data limit enrichment, and exact-name matching can miss author–contributor relationships (Section 4.3.1, p.1303). Inference: title heuristics and excluding unnamed prototypes also constrain coverage. This observational classification does not establish tool effectiveness or causal adoption benefits.

Inference: VL could reuse the catalog structure to inventory tools and identify missing coverage. Rust/Verus-specific fields could distinguish checks on executable behavior, contracts, compiler output, and models. This inventory would not establish correctness of agent-written Rust or eliminate specification errors; those require examination of the specifications and verification evidence.

## techniques for the catalog
- PV0–PV6 megamodel: classify tools by user input and proof/verifier role
- proceedings harvesting: detect and manually validate tools from selected papers
- structured Markdown records: store inputs, outputs, internals, links, and provenance
- ontology enrichment: connect tools to repositories, articles, concepts, and people
- API refresh workflows: update commits and metadata automatically with reviewable changes
- coverage accounting: report counts with source and enrichment denominators
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This can provide valuable information about who to contact when someone has questions about a tool."): checked quotations, numbers, section/page references, and technique descriptions; corrected PV-level definitions, inclusion criteria, quotation wording, and count references, removed the unsupported Verus classification, and flagged inconsistent reported totals; did not inspect external repositories, test API behavior, or reproduce the data collection.
