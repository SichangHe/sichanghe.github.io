ChatGPT consultation
(authored by agents unless marked 🧑)

consultation on the research proposals, 13 Oct 2026

- asked GPT-5.6 Sol at Extra High, in a temporary chat, with web search
    - it got the proposals as they stood before this consultation, a description of DeGenTWeb, and the human's writing rules
    - it could not read the notes
    - a first try timed out with no answer; the second, with a one-hour wait, finished
- everything below is its opinion; I opened its two arXiv leads and say where I did not check

what it said, and what I did with it

- its ranking: site robustness first, extension audit second, known-human pages third, people judging sites fourth, crowd list last
    - "make #3 + the feasible part of #4 one serious robustness paper; pursue #1 separately only after a cheap pilot demonstrates nontrivial behavior"
    - I had the extension audit first; I took its order
- on the site robustness test
    - "When page-level evidence shifts systematically or partially, when does multi-page aggregation actually save you?"
    - pooling pages only helps "when page errors have enough independence"
    - report "fraction of pages that must be transformed to flip a site"
    - now the core of proposal 1
- on DeGenTWeb's 99%
    - "With 67 positives and 65 negatives, one extra error in one class moves balanced accuracy by roughly 0.75 percentage points"
    - a reviewer will ask for tests on builders and models held out of training
    - the DeGenTWeb notes already report held-out-builder predictions, which ChatGPT could not see
- on the extension audit
    - "'nobody measured extension traffic' is no longer defensible": Arcanum and Vekaria et al. did it for other extensions
    - both were already in [browser extensions](browser_extensions.md); my proposal now says so
    - plant "unique canary strings" in page regions and see which leave; now the first experiment
    - "automatic versus user-triggered collection is the real distinction"
- on known-human pages
    - "Git history proves edit history, not authorship"
    - "Label quality and target-population coverage dominate nominal N"
    - accepted; noted in proposal 3
- on people judging whole sites
    - "I do not know a study where humans receive multiple pages belonging to one site and produce a site-level authorship verdict"
    - control the amount of text, and show extracted text; both added to proposal 4
- on the crowd blocklist
    - "Drop this as a paper. Keep the list as a source of candidate sites"
    - the list says it is for "cleaning image search engines", so being listed says nothing sure about the text
    - accepted; now proposal 5 and no longer a paper idea
- three new ideas: sites switching to AI, a crawler that stops when sure, detectors drifting over time
    - written up, with overlap against DeGenTWeb, in [research proposals](research_proposals.md)

papers it named

- opened by me on arXiv, real, and now cited in the proposals
    - [Hitting a Moving Target: Test-Time Adaptation for AI Text Detection under Continual Distribution Shift](https://arxiv.org/abs/2606.25152), Ren et al., arXiv, 2026
        - ChatGPT gives the venue as NeurIPS 2026; I did not check that
    - [ARB: A Matched Authorship-Rewriting Benchmark Dataset for AI-Text Detector Evaluation](https://arxiv.org/abs/2607.29539), Perrone and Romano, arXiv, 2026
- already in this tree: Arcanum, Vekaria et al., Hanley and Durumeric, Russell et al., Jakesch et al., Milička et al., APT-Eval, Jabarian and Imas, Dolezal et al., Pew
- not checked by me
    - CodeX: Contextual Flow Tracking for Browser Extensions, Ahmadpanah et al., CODASPY 2025
    - ScholaWrite: A Dataset of End-to-End Scholarly Writing, Le et al., ACL 2026
    - a NewsGuard and Pangram product that lists AI content farm sites, said to cover over 3,000 sites

older consultations kept from other agents

- the two sections below were written on 8 Oct 2026 by the agent that then held this folder
    - they concern the sibling folders, not text detection

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
