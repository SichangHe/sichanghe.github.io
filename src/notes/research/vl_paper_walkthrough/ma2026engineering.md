# Toward an Engineering of Science: Rebalancing Generation and Verification in the Age of AI
(authored by agents unless marked 🧑)
Tag: `ma2026engineering`, [paper](http://arxiv.org/abs/2605.10425v1)

## claim and scope
This working paper argues that AI has reduced the cost of generating plausible scientific artifacts faster than the cost of checking them. The abstract calls the resulting risk “epistemic pollution” and proposes blueprints: typed, decomposed argument graphs containing claims, evidence, assumptions, and definitions. It says, “Blueprints are designed to trade an upfront generation cost for cheaper, more local, more distributed verification downstream.” (Abstract, p. 1.) The prototype is a JSON document with browser and command-line interfaces; the paper presents a design and proof of concept, not an efficacy evaluation.

## technique 1: represent validity as a typed argument graph
The paper separates novelty, significance, and validity, then focuses on validity: whether claims are supported by evidence, methods, assumptions, and reasoning (Sections 1 and 3.2, pp. 2–4). It identifies the reconstruction work required by prose: extracting claims, locating evidence, recovering implicit assumptions, checking support relations, and tracking limitations (Section 3.1, p. 4). The authors write, “The compression discards information.” (Section 3.3, p. 5.) Their design response is to record argument structure explicitly and decompose it into local arguments (Section 3.4, p. 5).

A blueprint is a heterogeneous directed graph. Each node has an ID, type, status, label, and optional Markdown/KaTeX body; each edge has an ID, type, and optional body. The complete blueprint is one JSON document (Section 4.2.1, p. 6). Built-in node types are claim, evidence, assumption, definition, question, risk, and synthesis. Edge types are SUPPORTS, EXPANDS, CONTRADICTS, ADDRESSES, and RELATES. Status ladders include claim `draft → stated → supported`, evidence `missing → cited → verified`, question `open → answered`, assumption `given → questioned`, risk `noted → addressed → accepted`, and synthesis `draft → stated` (Section 4.2.2, pp. 6–7).

## technique 2: authoring workflow with local decomposition
The paper's authoring workflow starts with central claim nodes, decomposes them into supporting claims or grounds them in evidence and assumptions, and adds edge bodies explaining support (Section 4.3.2, p. 8). Independent premises use separate SUPPORTS edges; interacting premises use a synthesis node. Definitions pin terms early; questions mark unresolved work. Statuses advance bottom-up: a claim should not become supported before its evidence and supporting claims mature. Structural warnings expose premature status changes (Section 4.3.2, pp. 8–9).

## technique 3: dual human/agent interfaces over one source of truth
The prototype provides a browser canvas for human editing and a CLI for AI agents. Both read and write the same JSON file. A development server watches the workspace and propagates edits in roughly 200 milliseconds; the paper describes this as allowing parallel editing without coordinating through chat (Section 4.3.1, p. 7). Agents can populate evidence, suggest decompositions, or extend a specified subgraph through CLI commands (Section 4.3.2, p. 9).

## technique 4: structural lint as review aid
Blueprint lint has about a dozen warning rules in three groups (Section 4.3.3, p. 9). Support-graph checks flag reversed SUPPORTS edges, matured claims supported by ungrounded nodes, and a claim marked supported with no incoming SUPPORTS edge. Argument-structure checks flag cycles in the SUPPORTS subgraph and synthesis nodes with a single supporter. Vocabulary checks flag unknown type/status identifiers and empty labels. Warnings never block saving or sharing; a reviewer remains the arbiter. The paper states, “All rules are warnings, not blocks.” (Section 4.3.3, p. 9.)

## technique 5: review as a dialogue with contestable statuses
A blueprint records an argument while it is being made, not a proved theorem. A reviewer challenges a supported claim by attaching a risk node; the author addresses the risk, revises the graph, or moves the claim back to stated. Statuses are revisable and record the author's position rather than certifying truth (Section 4.3.3, p. 9). The authors emphasize, “In general research no kernel exists, and the artifact has to make explicit that statuses are author assertions, structurally tracked but contestable.” (Section 4.3.3, p. 9.)

## evidence, trust, and limitations
The prototype demonstrates a data model, interfaces, synchronization, authoring workflow, and lint rules. The paper explicitly says the hypothesis that upstream structure reduces downstream verification effort “has yet to be fully tested.” (Section 6, p. 10.) It proposes future measurements of authoring overhead, verification time, reviewer agreement, and error detection on paired prose and blueprint artifacts (Section 6, p. 10). No sample size, accuracy denominator, or comparative timing result establishes a benefit yet.

## techniques for the catalog
- typed argument graph: store claims, evidence, assumptions, definitions, risks, and relations as typed nodes and edges
- local decomposition: split a global validity argument into independently inspectable subgraphs with explicit support
- dual interfaces: let humans use a browser canvas and agents use a CLI over one JSON source of truth
- lifecycle statuses: track draft, stated, supported, cited, verified, questioned, and addressed states without treating them as proof
- structural lint: warn about unsupported claims, cycles, malformed vocabulary, and misuse of synthesis nodes
- risk dialogue: attach contestable risk nodes to claims and revise support or status in response
