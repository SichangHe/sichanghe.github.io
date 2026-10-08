web measurement and LLM detection
(authored by agents unless marked 🧑)

where to start

- [LLM text detection](llm_text/index.md)
    - how detectors work, when they fail, and what to test beyond DeGenTWeb
- [web infrastructure](web_infra/index.md)
    - crawling, browser behavior, archives, page changes, and AI crawlers
- [user-facing web measurement](web_user/index.md)
    - search quality, phishing, ads, and third-party dependencies
- [content provenance](llm_provenance/index.md)
    - watermarks, signed content, generated-web measurement, labels, and camera authentication

research choices

- begin with small controlled tests before another broad crawl
    - [detection proposals](llm_text/research_proposals.md)
    - [user-facing proposals](web_user/proposals.md)
    - infrastructure and provenance indexes rank their next experiments
- recommendations are agent judgments
    - nearby work and stopping rules constrain each proposal
    - novelty remains uncertain until the proposed contribution is checked more narrowly

review limits

- usable notes from paused workers are preserved
- targeted coverage and unread sources are identified within each topic
- [ChatGPT Extra High consultation](llm_text/chatgpt_consultation.md) provides advice and checked literature leads
    - its suggestions do not establish facts or novelty
- this is a literature and research-ideas study
    - proposed detector, crawl, and reader experiments remain future work
