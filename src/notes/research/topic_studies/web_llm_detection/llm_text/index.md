LLM text detection
(authored by agents unless marked 🧑)

start here

- [how detection works](how_detection_works.md) explains the basic signals and mistakes
- [research proposals](research_proposals.md) starts from what DeGenTWeb already does
    - first test extraction changes and stability under copied content or new writing workflows
    - keep authoring histories and reader warnings as separate possible studies
- literature covers public methods, commercial tools, human judgment, browser delivery, and crawled pages
    - targeted review, not proof that every relevant paper was found
    - paper-specific access and evaluation limits remain in the detailed notes
- [Extra High consultation](chatgpt_consultation.md) informed the original framing
    - later revisions account for substantive DeGenTWeb notes and close prior work
- research ideas remain hypotheses
    - no detector or reader experiments were run for this review

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
- [research proposals](research_proposals.md): overlap, decisive pilots, and stopping rules
