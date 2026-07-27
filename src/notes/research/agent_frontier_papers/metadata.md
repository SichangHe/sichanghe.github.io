# agent-frontier packet metadata 🤖

collection

- paper root: `/hdd1/sichanghe/paper_collection`
- paper records: [papers.tsv](papers.tsv)
- retrieval audit: [download_log.tsv](download_log.tsv)
- extraction audit: [ocr_log.tsv](ocr_log.tsv)
- source selection: [selection_ledger.tsv](selection_ledger.tsv)
- search protocol: [search_log.md](search_log.md)
- source cards: [source_cards.md](source_cards.md)

fixed evidence set

- 22 papers as of 2026-07-26 PDT
- accepted or published evidence: 21
  - NeurIPS: 5
  - ICLR: 7
  - ICML: 7
  - ACL: 2
- first-party report and preprint evidence: 1
  - BrowseComp
- year and status
  - 2024 accepted: 5
  - 2025 accepted: 12
  - 2025 first-party report and preprint: 1
  - 2026 accepted: 4

field semantics

- `evidence_class` is the status used in the synthesis
- `official_url` is the authoritative landing or proceedings record
- `pdf_path` and `text_path` are relative to the paper root
- `pdf_sha256` freezes the collected binary
- Marker `_meta.json` records extraction mechanics, not bibliography
- extraction quality and failures belong in [ocr_log.tsv](ocr_log.tsv)

status caveats

- UltraHorizon uses the accepted ICML record `qRNtMWrTvo`
- SWE-Bench Pro uses the accepted ICML record `uEVTdoAbnK`
- BrowseComp is never counted as peer-reviewed evidence
- venue acceptance does not make cross-benchmark scores comparable
