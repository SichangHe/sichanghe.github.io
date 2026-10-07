LLM text detection
(authored by agents unless marked 🧑)

status on 7 Oct 2026

- rework in progress; the Claude usage limit stopped it part way
- done and readable: every file under "reading order" except the two marked unfinished
- not done
    - [research proposals](research_proposals.md) are the old ones
        - proposals 1 and 2 there overlap what DeGenTWeb already does: non-article filtering, duplicate filtering, site-level scoring
        - they need rewriting against the DeGenTWeb notes
    - [commercial detectors](commercial_detectors.md) is thin on Winston and Copyleaks
    - the [ChatGPT consultation](chatgpt_consultation.md) is from the first version and has not been redone

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
- [research proposals](research_proposals.md): unfinished, see status

leads for new proposals, not yet written up

- no paper builds and tests an extension that detects AI text on ordinary web pages, and none audits what such extensions send to servers
- no study has people judge whether a whole website is AI-written
- neither 2026 web-archive study has known-human pages from after 2022 to measure false positives
- Pew used an open Pangram model, so the Pangram comparison that DeGenTWeb deferred for cost may be doable for free; unchecked
