ChatGPT consultation and resulting changes
(authored by agents unless marked 🧑)

consultation status

- completed through `pb-chatgpt-prompt-file` with Extra High reasoning
    - verified model: GPT-5.6 Sol
    - answer returned on 6 October 2026
- preserved answer and diagnostic were rechecked during the final review
    - answer file: `rt_llm_text_cx/chatgpt_opinion_second.md` in the session's temporary research directory
    - diagnostic: the adjacent `.private.json` file
    - diagnostic verifies Extra High selection and successful completion
    - private browser diagnostics are kept outside the public notes
- supplied a self-contained description of DeGenTWeb, existing literature, and candidate experiments
    - included relevant human writing and synthesis instructions
    - ChatGPT could not access local notes
- its recommendations are opinions
    - its paper leads require primary verification
    - primary verification found close web-measurement work missing from the initial review

advice that changed the proposal

- ChatGPT: “combine directions 1 and 2 into the main paper”
    - refers to extraction and site-level aggregation
- ChatGPT: “Make 3 a deployment mechanism inside it”
    - refers to assisted-writing uncertainty and abstention
- ChatGPT: “Treat 4 as a separate HCI follow-up”
    - refers to browser warnings
- agent agreement
    - one pipeline study can connect extraction to decisions and uncertainty
    - user warnings require a separate experiment and different expertise
- agent qualification
    - a good framing does not establish research novelty
    - final claims require measured effects and explicit population assumptions

closest new leads

- Dolezal et al., [The Impact of AI-Generated Text on the Internet](https://ai-on-the-internet.github.io/)
    - primary project page and PDF opened
    - already tests archived websites, several detectors, and HTML/plain-text robustness
    - generic HTML-versus-text comparison is weak novelty
- Pew Research Center, [August 2026 methodology](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/)
    - primary methodology opened
    - already samples Common Crawl WARC and WET and compares open/commercial Pangram outputs
    - ordinary crawl-wide detector prevalence is weak novelty
- additional leads were checked or retained explicitly as unverified
    - label-design studies and logged CoAuthor interactions are covered in [browser notes](browser_extensions.md) and [research proposals](research_proposals.md)
    - ICWSM publisher abstract and public corpus-detection patent text establish additional method overlap
        - full ICWSM results remain unchecked
- [web-page studies](on_web_pages.md) records evidence and overlap

revised first experiments

- agent recommendation: a historical extraction pilot
    - 2,000–5,000 pre-2022 archived pages with independently checked dates and sources
        - old dates support a negative control but do not prove human authorship
        - known-origin samples remain necessary for measuring actual false positives
    - compare WET and several article/visible-text extractors
    - record threshold crossings and input text
    - inspect suspicious cases manually
- agent recommendation: follow with a crossed intervention
    - keep source article constant while changing extractor/template
    - keep extraction constant while changing drafting/editing history
    - measure separate extraction, generation, and combined effects
- agent recommendation: site-level negative controls
    - compare earlier periods with earlier periods
    - a detector that flags ordinary historical change as an AI transition fails this use
- agent recommendation: stop if the effects are too small
    - pipeline differences must materially alter errors or decisions
    - correlation-aware aggregation must outperform simpler duplicate removal

limits

- no experiments were run
- quoted ChatGPT advice does not establish a fact about the literature
- paper-specific results in its answer were used only after primary checks
- generic extraction and aggregate prevalence comparisons should not be proposed as new research
