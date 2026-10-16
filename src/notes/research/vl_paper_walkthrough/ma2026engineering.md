# Toward an Engineering of Science: Rebalancing Generation and Verification in the Age of AI
(authored by agents unless marked 🧑)
Tag: `ma2026engineering`, [paper](http://arxiv.org/abs/2605.10425v1)

## claim and scope
This working paper argues that AI has reduced the cost of generating plausible scientific artifacts faster than the cost of checking them. The abstract calls the resulting risk “epistemic pollution” and proposes blueprints: typed, decomposed argument graphs containing claims, evidence, assumptions, and definitions. It says, “Blueprints are designed to trade an upfront generation cost for cheaper, more local, more distributed verification downstream.” (Abstract, p. 1.) The prototype is a JSON document with browser and command-line interfaces; the paper presents a design and proof of concept, not an efficacy evaluation.

Inference: the direct VL relevance is architectural. A VeruLaw project can expose its proof obligations as a graph that records contracts, assumptions, evidence, and risks, then let agents review local subgraphs before Verus checks the whole program. This is an inference because the paper addresses scientific arguments, not Rust verification.

## technique 1: represent validity as a typed argument graph
The paper separates novelty, significance, and validity, then focuses on validity: whether claims are supported by evidence, methods, assumptions, and reasoning (Sections 1 and 3.2, pp. 2–4). It identifies the reconstruction work required by prose: extracting claims, locating evidence, recovering implicit assumptions, checking support relations, and tracking limitations (Section 3.1, p. 4). The authors write, “The compression discards information.” (Section 3.3, p. 5.) Their design response is to record argument structure explicitly and decompose it into local arguments (Section 3.4, p. 5).

A blueprint is a heterogeneous directed graph. Each node has an ID, type, status, label, and optional Markdown/KaTeX body; each edge has an ID, type, and optional body. The complete blueprint is one JSON document (Section 4.2.1, p. 6). Built-in node types are claim, evidence, assumption, definition, question, risk, and synthesis. Edge types are SUPPORTS, EXPANDS, CONTRADICTS, ADDRESSES, and RELATES. Status ladders include claim `draft → stated → supported`, evidence `missing → cited → verified`, question `open → answered`, assumption `given → questioned`, risk `noted → addressed → accepted`, and synthesis `draft → stated` (Section 4.2.2, pp. 6–7).

Inference: for VL, node types can represent executable functions, `requires`/`ensures` contracts, loop invariants, proof lemmas, external assumptions, test traces, and known risks. SUPPORTS edges can connect a lemma or invariant to the obligation it discharges; CONTRADICTS can record a failing counterexample. This graph does not replace Verus: a `supported` status is an assertion until Verus compiles the corresponding source.

## technique 2: authoring workflow with local decomposition
The paper's authoring workflow starts with central claim nodes, decomposes them into supporting claims or grounds them in evidence and assumptions, and adds edge bodies explaining support (Section 4.3.2, p. 8). Independent premises use separate SUPPORTS edges; interacting premises use a synthesis node. Definitions pin terms early; questions mark unresolved work. Statuses advance bottom-up: a claim should not become supported before its evidence and supporting claims mature. Structural warnings expose premature status changes (Section 4.3.2, pp. 8–9).

Inference: a VL authoring workflow should begin with the top-level postcondition, split it into local proof obligations, and attach each obligation to concrete Verus lemmas or invariants. A question node can hold an unresolved solver issue; a risk node can hold a suspected missing precondition. The decomposition is useful only if each local node remains checkable; hiding all reasoning in a synthesis body recreates the paper's prose problem.

## technique 3: dual human/agent interfaces over one source of truth
The prototype provides a browser canvas for human editing and a CLI for AI agents. Both read and write the same JSON file. A development server watches the workspace and propagates edits in roughly 200 milliseconds; the paper describes this as allowing parallel editing without coordinating through chat (Section 4.3.1, p. 7). Agents can populate evidence, suggest decompositions, or extend a specified subgraph through CLI commands (Section 4.3.2, p. 9).

Inference: VL can store a proof graph next to Rust source and expose CLI operations for agents to add obligations, attach compiler diagnostics, and propose lemmas. A human can inspect the same graph in a visual view. The shared file should remain version-controlled, and every status change should identify the source or Verus run that supports it.

## technique 4: structural lint as review aid
Blueprint lint has about a dozen warning rules in three groups (Section 4.3.3, p. 9). Support-graph checks flag reversed SUPPORTS edges, matured claims supported by ungrounded nodes, and a claim marked supported with no incoming SUPPORTS edge. Argument-structure checks flag cycles in the SUPPORTS subgraph and synthesis nodes with a single supporter. Vocabulary checks flag unknown type/status identifiers and empty labels. Warnings never block saving or sharing; a reviewer remains the arbiter. The paper states, “All rules are warnings, not blocks.” (Section 4.3.3, p. 9.)

Inference: analogous VL lint can flag an `ensures` claim with no linked proof, an invariant that is never used by a loop, circular lemma dependencies, stale assumptions about an external crate, and graph nodes lacking a Verus artifact. Warnings should guide review while Verus provides the blocking acceptance check. A lint pass cannot establish semantic correctness.

## technique 5: review as a dialogue with contestable statuses
A blueprint records an argument while it is being made, not a proved theorem. A reviewer challenges a supported claim by attaching a risk node; the author addresses the risk, revises the graph, or moves the claim back to stated. Statuses are revisable and record the author's position rather than certifying truth (Section 4.3.3, p. 9). The authors emphasize, “In general research no kernel exists, and the artifact has to make explicit that statuses are author assertions, structurally tracked but contestable.” (Section 4.3.3, p. 9.)

Inference: VL can use the same lifecycle for human and agent review, but mark Verus-checked nodes separately from provisional claims. A failed verification run should create a risk or contradiction node linked to the exact obligation and diagnostic. This preserves review history instead of silently replacing a failed proof attempt.

## evidence, trust, and limitations
The prototype demonstrates a data model, interfaces, synchronization, authoring workflow, and lint rules. The paper explicitly says the hypothesis that upstream structure reduces downstream verification effort “has yet to be fully tested.” (Section 6, p. 10.) It proposes future measurements of authoring overhead, verification time, reviewer agreement, and error detection on paired prose and blueprint artifacts (Section 6, p. 10). No sample size, accuracy denominator, or comparative timing result establishes a benefit yet.

Inference: the product threat is organizational rather than a demonstrated attack: a graph can give unsupported claims a polished status, and a warning-only linter can be ignored. For VL, the trusted base remains Verus, its specification, the Rust compiler, and assumptions about libraries and hardware. Blueprint statuses, agent suggestions, and structural lint are untrusted metadata. The paper's proposal should therefore be treated as a workflow hypothesis and measured against proof completion time, failed-proof discovery, repair effort, and false reassurance.

## what VL should reuse and avoid repeating
Inference: the paper already covers typed claim/evidence/assumption graphs, decomposition into local arguments, dual human/agent interfaces, shared JSON state, lifecycle statuses, risk-based review, and warning-only structural lint. VL should apply these ideas to verified Rust rather than present them as new conceptual contributions. The paper also acknowledges prior semantic-publishing and argumentation systems; any VL novelty claim should compare against those systems and against existing Verus proof organization.

## techniques for the catalog
- typed argument graph: store claims, evidence, assumptions, definitions, risks, and relations as typed nodes and edges
- local decomposition: split a global validity argument into independently inspectable subgraphs with explicit support
- dual interfaces: let humans use a browser canvas and agents use a CLI over one JSON source of truth
- lifecycle statuses: track draft, stated, supported, cited, verified, questioned, and addressed states without treating them as proof
- structural lint: warn about unsupported claims, cycles, malformed vocabulary, and misuse of synthesis nodes
- risk dialogue: attach contestable risk nodes to claims and revise support or status in response
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
