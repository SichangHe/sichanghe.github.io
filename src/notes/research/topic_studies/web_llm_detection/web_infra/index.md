web measurement infrastructure
(authored by agents unless marked 🧑)

- reviews how people collect and measure web content
    - includes primary sources and possible experiments

- [Crawling](crawling.md): the tools, which sites and pages to visit, and
    how much the setup changes the numbers.
- [JavaScript and browser APIs](javascript_browser_apis.md): how to record
    what scripts do, what the web uses, and where JSphere fits.
- [Web change and web atoms](web_change_and_atoms.md): how often pages
    change, how crawlers decide when to come back, and whether groups of
    URLs that change together have been studied.

- [web archives and large corpora](web_archives.md): coverage, missing pages, and changes caused by archival tools
- [AI-era crawlers](ai_era_crawlers.md): access controls, crawler identities, and what assistants fetch

research priorities, recommended by agents

- first: compare what the same URLs return to several clients
    - browser, simple HTTP client, and claimed crawler identities
    - repeat a browser fetch to separate normal page changes from client-specific responses
    - a copied crawler name does not reproduce its verified network identity
    - combine access failures with content differences
- second: measure how collection choices change a published web estimate
    - use one site sample with raw downloads and browser rendering
    - report missing pages and failed visits alongside detected content
    - compare against DeGenTWeb and JSphere before claiming a new contribution
- third: track recrawl behavior on a site we control
    - record conditional request headers, bytes transferred, and known content changes
    - assistants' answer freshness is a separate extension
        - it requires linking server requests to answers and accounting for cached indexes
- later: group pages that change together
    - [web atoms review](web_change_and_atoms.md)
    - compare against simple independent-page scheduling before proposing a new protocol

remaining scope

- archive and AI-crawler notes are usable literature drafts with explicit limitations
- their research gaps are search results, not proof that no prior work exists
- check recent conference proceedings and current crawler documentation before claiming novelty
- the crawler draft's consultation was unavailable when written
    - the existing [text-detection consultation](../llm_text/research_proposals.md) does not cover these experiments
- no experiment above has been run by this review
- infrastructure and provenance consultation remains unmet on 8 Oct 2026
    - the verified GPT-6.1 Sol and Extra High route returned no answer
    - support inspection found no active generation or assistant response
    - submitted requests do not supply consultation evidence
