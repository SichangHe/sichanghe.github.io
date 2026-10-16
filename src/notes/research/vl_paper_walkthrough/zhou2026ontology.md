# Ontology-to-tools compilation for executable semantic constraint enforcement in LLM agents
(authored by agents unless marked 🧑)
Tag: `zhou2026ontology`, [paper](https://arxiv.org/abs/2602.03439)

## problem and architecture
The paper compiles an ontology T-Box into executable MCP tools so an LLM can create only ontology-checked graph instances. It describes the shift precisely: “The resulting behaviour is not achieved through prompt engineering or grammar restriction, but through tool-mediated interaction with a persistent symbolic state.” (§1, p.5). The demonstration covers 30 full-text metal–organic polyhedra (MOP) synthesis papers, with synthesis steps, chemical species, products, and derived chemical building units (CBUs).

The framework has preparation, instantiation, and grounding stages. The methods state, “The preparation stage converts an ontology T-Box into (i) a static, executable JSON plan for extraction and KG construction and (ii) an ontology-specific MCP server that exposes the operations referenced by that plan.” (§6.1, p.17) Preparation consumes the T-Box and domain-agnostic meta-prompts, generating a JSON task plan, ontology-specific Python scripts, MCP servers, and instantiation prompts (§3, p.7; §6.1, pp.17–19). Instantiation follows the plan in a ReAct loop, writing a persistent Turtle graph; tools validate every create, update, and link operation (§6.2, pp.19–20). Grounding generates lookup tools from the T-Box and a reference endpoint, then deterministically maps local IRIs to canonical IRIs (§6.3, pp.20–21).

## technique 1: compile ontology constraints into tools
Inference: use this when generated structured data must satisfy a schema during construction.

1. Treat the T-Box as the contract: enumerate classes, properties, domain/range, datatype, identifier, unit, and cardinality constraints (§3, p.7; §6.1, p.18).
2. Generate a static JSON decomposition. Every ordered step states its extraction prompt, graph-update prompt, files read and written, optional follow-up passes, and permitted tool groups (§6.1, p.17).
3. Generate an ontology-aware script on a manually written helper library. The script initializes an RDFLib graph, creates or reuses typed instances, adds property links, mints deterministic IRIs, and separates hard formal axioms from soft natural-language annotations (§6.1, pp.17–18).
4. Turn generated functions into MCP tools with typed argument schemas and T-Box-derived usage instructions. Group tools for entity creation, attributes, relations, and cross-document linking (§6.1, p.18).
5. Run the extraction agent plan step by step. It reads the source, records snippets and normalized names, calls tools to create/update/link entities, and retries when a tool returns a missing-field, type, unit, or cardinality diagnostic (§6.2, pp.19–20).
6. Persist successful updates in Turtle snapshots. Later iterations look up and extend earlier instances using the generated deduplication and IRI-minting rules (§6.2, p.20).

The paper’s runtime invariant is explicit: “These tools are the only way to create or modify structured instances, so constraints are checked and repaired during construction rather than only after the fact.” (§3, p.7). Verus form (inference): model the graph state as a Rust datatype and each tool operation as a function with `requires` and `ensures` contracts preserving type, domain/range, unit, and cardinality invariants. A `spec fn` can express whether a state satisfies the T-Box; proof functions can establish that each update preserves it. MCP transport, RDFLib, Turtle parsing, and the LLM remain external trusted components unless separately modeled.

## technique 2: deterministic grounding and database enrichment
Inference: use this when locally extracted entities must join a canonical knowledge graph.

1. From the target T-Box and SPARQL endpoint, generate a sampler, a label-and-identifier collector with a local cache, and a query/lookup interface (§6.3, p.20).
2. Expose these scripts through an ontology-specific MCP server (§6.3, p.20).
3. For each selected local instance, extract labels and alternative names; query the cached index for a finite ranked candidate list (§6.3, p.21).
4. Apply a deterministic selection policy and materialize the mapping by IRI rewriting or `owl:sameAs` links (§6.3, p.21).
5. For CBUs, obtain crystallographic `.res`/`.cif` data via CCDC tools, parse asymmetric units and symmetry, segment metal nodes and organic linkers, then enrich linkers with PubChem identifiers before ontology-aligned instantiation (§6.6, pp.22–23).

Verus form (inference): specify lookup as a pure function returning a candidate and prove that the chosen IRI is a member of the ranked candidate set and that graph rewriting preserves all non-identity triples. External endpoint responses and fuzzy matching policy are trusted inputs unless their semantics are verified.

## evidence and limits
The fixed SPARQL-to-JSON evaluation requires every fact to be an explicit, correctly linked triple; free text or disconnected nodes are false negatives (§4, p.9). On 30 papers and 6,705 annotated items (Table 7.1, §6.4, p.21), aggregate micro-F1 is 0.826, precision 0.844, and recall 0.808; macro precision/recall/F1 are 0.865/0.735/0.785 (§4.1, p.13). Synthesis-step F1 is 0.843. Reaction chemicals have precision 1.000 but recall 0.582, so the denominator and category matter (§4.1, p.13). Removing runtime feedback reduces step completeness; the ablation disables checks for required fields, units, ordering, and continuity (§4.2, pp.14–15). The benchmark is one MOP ontology and one corpus; the authors did not test ontology updates or another domain (§5.1, p.16).

What is proved is graph recoverability under fixed schema queries and the reported precision/recall matching. What remains trusted includes generated scripts, helper library, MCP server, endpoint data, the ontology’s adequacy, and the LLM’s interpretation of text.

## techniques for the catalog
- ontology-to-MCP compilation: generate typed create/link/validate tools and a fixed task plan from a T-Box
- feedback-driven graph construction: require all state changes through tools, return structured violations, and retry until constraints hold
- deterministic lexical grounding: cache endpoint labels, rank finite candidates, and materialize a chosen IRI mapping or `owl:sameAs`
- database-backed CBU derivation: parse crystallographic files, segment nodes/linkers, enrich identifiers, and instantiate derived entities under the ontology
