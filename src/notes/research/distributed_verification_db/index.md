# 🤖 distributed verification literature database
(authored by agents unless marked 🧑)

This folder is the one place that holds what literature reviews A and B found. Both reviews' long notes stay where they are; every record here points back to them.

## what is in it

- `sources.jsonl`: 717 papers, theses, tools, repositories, benchmarks, and blog posts. Each record says in plain English what the source did, its key numbers, what it assumes or leaves out, up to six word-for-word quotes, the saved PDF if there is one, and where the detailed note is. 172 sources were covered by both reviews and are merged into one record each.
- `cases.jsonl`: 1064 concrete problems that someone specified or proved, 265 of them with a liveness guarantee (something good eventually happens). Each record gives the system, the guarantee (also as one plain sentence), the tool, the assumptions, the reported effort, how strong the evidence is (`evidence_kind`), whether it concerns running code or an abstract model (`subject`), and whether a human, an agent, or an automatic tool wrote it (`who`). Agents assigned the last three from the record text, not from the papers. 754 cases carry the id of their source record. Start with [liveness cases by how strong the evidence is](liveness_cases.md): 59 of them are machine-checked proofs about running code.
- `spec_and_proof_files.jsonl`: 1546 specification and proof files found in public repositories, 269 of them containing a liveness property. Each record gives the problem, the tool, the stated safety and liveness properties, the file size, and a link pinned to the exact version inspected.
- `leads.jsonl`: 287 titles that searches turned up and nobody has read yet. Claude agents read the abstracts and judged 11 relevant, 72 not relevant, and found no abstract for 204; 0 are not judged yet. The relevant ones are listed in [relevant work found but not yet read](leads_to_read.md).

## how far to trust a source record

Every source record has a `reading_depth` field copied from what the review notes say about themselves. Nothing here was re-read while building the database. The quotes are word for word from the review notes, which took them from the sources.

- most of the source read: 294
- parts read: 237
- only the abstract or first pages read: 87
- reading depth not recorded: 46
- not read, title and metadata only: 53

Numbers in the records are the sources' own reports; neither review reran any experiment or proof checker. 423 sources have a matched PDF in the paper collection; the rest either have none saved or are saved under a name the matcher did not recognize.

## browse by question

- [how humans state guarantees and structure proofs](topic_formulation.md): 158 sources
- [distributed and concurrent systems that were proved](topic_verified_systems.md): 241 sources
- [proofs that something good eventually happens](topic_liveness.md): 134 sources
- [connecting an abstract model to running code](topic_model_to_code.md): 131 sources
- [tools that find invariants automatically](topic_invariant_inference.md): 81 sources
- [LLM and agent systems that write specifications or proofs](topic_agents.md): 240 sources
- [from what a human wants to a formal statement](topic_intent_to_spec.md): 137 sources
- [how to judge specifications, proofs, and agents](topic_evaluation.md): 263 sources
- [sources of concrete example problems and benchmarks](topic_cases.md): 193 sources
- [background theory and logic](topic_foundations.md): 165 sources

One source can appear under several questions. Each page lists best-read sources first, then newest first.

## search it

- find a source by name: `grep -i ironfleet sources.jsonl | python3 -m json.tool`
- all agent-written liveness cases: `python3 -c "import json; [print(c['system'], '|', c['plain']) for c in map(json.loads, open('cases.jsonl')) if c['liveness'] and c['who'] == 'agent']"`
- all Verus or Dafny proof files that state a liveness property: `grep -i -E 'verus|dafny' spec_and_proof_files.jsonl | grep '"has_liveness": true'`

## what it does not hold

- it is not exhaustive: Google Scholar has shown a CAPTCHA since 12 October 2026, and the leads file is the list of known unread work
- the procedure for judging agent-written specifications and proofs is a separate note: [agent evaluation procedure](../agent_evaluation_procedure_20261012.md)
- known contradictions inside the review notes, found while building this, are in [known problems](known_problems.md)

## rebuild

`python3 /ssd1/sichangheagent/verus_distributed/lit_db/build.py` regenerates every file here except `known_problems.md` from the two reviews' files. New review notes enter through a source-record file in `lit_db/extract/`.
