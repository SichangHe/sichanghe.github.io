# 🤖 distributed verification literature database
(authored by agents unless marked 🧑)

This folder is the one place that holds what the literature work found. Each source record's `reviews` field says who contributed it: `A` and `B` are the two first literature reviews (Codex, 6-12 October 2026), `C` are papers Claude agents read on 13 October, and `S`, `V`, `G` are three Codex workers from 13-16 October (`S` chased citations from known papers, `V` swept venues, arXiv and DBLP, `G` collected repositories, blogs, talks and bug reports). The detailed notes stay where they are; every record points back to them.

## what is in it

- `sources.jsonl`: 2149 papers, theses, tools, repositories, benchmarks, and blog posts. Each record says in plain English what the source did, its key numbers, what it assumes or leaves out, up to six word-for-word quotes, the saved PDF if there is one, and where the detailed note is. 311 sources were covered by both reviews and are merged into one record each.
- `cases.jsonl`: 1150 concrete problems that someone specified or proved, 291 of them with a liveness guarantee (something good eventually happens). Each record gives the system, the guarantee (also as one plain sentence), the tool, the assumptions, the reported effort, how strong the evidence is (`evidence_kind`), whether it concerns running code or an abstract model (`subject`), and whether a human, an agent, or an automatic tool wrote it (`who`). Agents assigned the last three from the record text, not from the papers. 770 cases carry the id of their source record. Start with [liveness cases by how strong the evidence is](liveness_cases.md): 63 of them are machine-checked proofs about running code.
- `spec_and_proof_files.jsonl`: 1546 specification and proof files found in public repositories, 269 of them containing a liveness property. Each record gives the problem, the tool, the stated safety and liveness properties, the file size, and a link pinned to the exact version inspected.
- `leads.jsonl`: 376 titles that searches turned up and nobody has read yet. Claude agents read the abstracts and judged 0 relevant, 69 not relevant, and found no abstract for 190; 117 are not judged yet. The relevant ones are listed in [relevant work found but not yet read](leads_to_read.md).

## how far to trust a source record

Every source record has a `reading_depth` field copied from what the review notes say about themselves. Nothing here was re-read while building the database. The quotes are word for word from the review notes, which took them from the sources.

- most of the source read: 1078
- parts read: 203
- only the abstract or first pages read: 758
- reading depth not recorded: 41
- not read, title and metadata only: 69

Before the Codex workers' records were merged they were checked against the saved papers. Each `V` record entered only if its saved paper text exists, is that paper, and contains every quote in the record; the failures are listed in `lit_db/venues_read_check.md` in the project folder. A check of 12 random `S` records found facts only from the abstract although each claimed more, so all `S` records are marked as abstract-level reading. Records judged off topic from their title and description were left out.

Numbers in the records are the sources' own reports; neither review reran any experiment or proof checker. 763 sources have a matched PDF in the paper collection; the rest either have none saved or are saved under a name the matcher did not recognize.

## browse by question

- [how humans state guarantees and structure proofs](topic_formulation.md): 275 sources
- [distributed and concurrent systems that were proved](topic_verified_systems.md): 399 sources
- [proofs that something good eventually happens](topic_liveness.md): 213 sources
- [connecting an abstract model to running code](topic_model_to_code.md): 200 sources
- [tools that find invariants automatically](topic_invariant_inference.md): 154 sources
- [LLM and agent systems that write specifications or proofs](topic_agents.md): 348 sources
- [from what a human wants to a formal statement](topic_intent_to_spec.md): 183 sources
- [how to judge specifications, proofs, and agents](topic_evaluation.md): 321 sources
- [sources of concrete example problems and benchmarks](topic_cases.md): 252 sources
- [background theory and logic](topic_foundations.md): 1341 sources

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
