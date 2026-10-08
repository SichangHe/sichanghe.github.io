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

reader-facing measurement consultation, 8 October 2026

- GPT-6.1 Sol with Extra High returned a finished answer
    - browser support recovered it from ChatGPT's conversation record
    - record marked `finished_successfully` and `end_turn: true`
    - record model: `gpt-6.1-sol-wm`; thinking effort: `xhigh`
    - saved answer: `rt_web_user_consult_answer.md` in the session's temporary directory
    - page-level capture failed because the page did not refresh
- ChatGPT: “run disclosure loss first”
    - ranks dependency-driven evidence loss second, technical search third, scam paths fourth
- agent assessment
    - accept disclosure retention as the first bounded pilot
    - move dependency loss ahead of technical search provisionally
        - its closest rendering poster and artifact still need full-text inspection
    - distinguish extraction changes from blocked-resource changes
        - both can leave a claim readable while removing its disclosure
    - retain the link between each claim and its applicable disclosure
        - merely retaining a label somewhere on a page is insufficient
    - explicit disclosures suffice to evaluate label retention
        - actual-payment claims require independent payment evidence
        - disclosure does not establish factual truth
    - use task correctness and held-out publishers, projects, or campaigns
        - successful citation retention alone is insufficient
- qualifications
    - its proposed sample sizes and failure thresholds are budget suggestions
        - no empirical power calculation or prevalence estimate supports them
    - its relative links were inaccessible and five unnamed recent papers could not be matched
        - existing primary reviews remain the source for those papers
    - [GitChameleon 2.0](../web_user/seo_search_quality/recent_work.md) was checked in the primary conference PDF
        - confirms version-conditioned search and executable checking are existing ingredients
        - corrects the answer's section pointer to appendix A.6.5
    - claims about other prior work are used only where the existing review supports them
- [revised user-facing choices](../web_user/proposals.md)

infrastructure and provenance consultation, 8 October 2026

- the GPT-6.1 Sol and Extra High request returned a finished answer in ChatGPT Work mode
    - browser support recovered its final answer and working remarks from the conversation record
    - record model: `gpt-6.1-sol-wm`; thinking effort: `xhigh`
    - final message marked `finished_successfully` and `end_turn: true`
    - saved files: `rt_web_group_consult_answer.md` and `rt_web_group_consult_commentary.md`
    - the page remained stale after completion
- ChatGPT: “paired client/estimate pilot and signed-photo publication paths”
    - recommends these as the first experiments
- agent assessment
    - accept combining client differences and their effect on one fixed estimate
        - freeze sample, estimator, and browser capture rule
        - repeat unchanged visits to measure ordinary variation
        - report access failures alongside retained content
    - accept signed-photo publication paths as a deployment extension
        - validate originals before upload
        - distinguish signature validity, image binding, trusted signer, and recovery
    - [Scoop and Chimera](../llm_provenance/camera_authentication.md) now narrow the recapture proposal
        - depth consistency is already evaluated prior work
        - pixel-detector bypass does not establish depth-detector bypass
- limits of this answer
    - it interpreted the supplied human requirements as tasks to execute
    - it tried to arrange another consultation and reported that its own browser access was denied
        - that is a limit of its attempted task, not evidence that our Extra High request failed
    - its generated sandbox tree has not been imported or independently checked
        - only advice assessed here and independently checked paper leads are used
    - the recovered ranked advice and controls substantively answer the request for research opinions
        - no further consultation is needed merely because it used Work mode

limits

- no experiments were run
- quoted ChatGPT advice does not establish a fact about the literature
- paper-specific results in its answer were used only after primary checks
- generic extraction and aggregate prevalence comparisons should not be proposed as new research
