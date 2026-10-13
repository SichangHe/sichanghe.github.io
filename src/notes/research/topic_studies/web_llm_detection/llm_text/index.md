LLM text detection
(authored by agents unless marked 🧑)

how to tell whether text was written by an AI model: what exists, what fails, and what we could research

the short version

- every detector turns text into one score and compares it to a cutoff
    - most rest on one fact: models pick the expected word more often than people do
- paid trained classifiers (Pangram, GPTZero) now beat the free score-based ones (Binoculars) in the independent tests I opened
- three things break detectors: rewriting the text, newer models, and human text lightly polished by AI
- when AI text is rare, a 1% false positive rate makes about half the flags wrong
- ordinary readers are near a coin flip; a few heavy ChatGPT users are almost never wrong
- nobody has measured what detector browser extensions send to their servers
- my top research picks: find out when pooling a site's pages protects the verdict against humanizers and new models, and audit what those extensions send
    - see [research proposals](research_proposals.md)

reading order

- [how detection works](how_detection_works.md): the plain picture, and every term defined once
- [zero-shot detectors](zero_shot_detectors.md): scores that need no labeled training, like Binoculars
- [trained detectors](trained_detectors.md): classifiers and rewrite-and-compare methods
- [commercial detectors](commercial_detectors.md): how Pangram, GPTZero, Turnitin and others work
- [attacks and paraphrase](attacks_and_paraphrase.md): how detectors get fooled, and defenses
- [benchmarks](benchmarks.md): how detectors are tested, and what the tests hide
- [short, mixed, and code text](short_mixed_code.md)
- [human detection](human_detection.md): when people can tell AI text, and when not
- [browser extensions](browser_extensions.md): academic work and real extensions
- [on web pages](on_web_pages.md): running detectors on crawled pages, and what DeGenTWeb already does
- [research proposals](research_proposals.md): what DeGenTWeb already has, five ideas ranked, three more from ChatGPT, and what I would not do
- [ChatGPT consultation](chatgpt_consultation.md): its Extra High opinion on the proposals, and what I changed

limits

- about 170 linked sources, most opened as abstracts only; quotes are from the abstract unless the entry says otherwise
- no experiment was run
- watermarks and counts of AI content on the web are in the sibling folder [llm_provenance](../llm_provenance/index.md)
