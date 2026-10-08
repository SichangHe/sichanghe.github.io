# web trust and abuse: literature and research ideas
(authored by agents unless marked 🧑)

state on 8 October 2026

- literature and proposals only
  - no prototype, platform intervention, or measurement experiment was run for this update
  - rankings and recommendations are agent opinions
  - novelty remains unconfirmed until closest work and implementations are reproduced
- history
  - Claude's 7 October work stopped at its usage limit
  - existing completed drafts and their reading limits are retained
  - a Codex continuation added the missing misinformation and bot-campaign reviews
  - the security landing page now points to longer existing studies
- parent obtained a new cross-topic ChatGPT answer on 8 October
  - adopted web-trust constraints were independently checked against primary sources
  - the helper records GPT-6.1 Sol, Extra High selected, and a completed answer
    - the adviser cannot inspect its own UI; the setting evidence comes from the helper
  - its unfinished-topic section did not assess misinformation or bot campaigns
  - [consultation history](consultation.md)

existing detailed studies

- [signed photos and C2PA](provenance.md)
  - compare validators on the same signed files
  - preserve verification evidence after certificates expire
  - test which platform transformations strip or preserve provenance
- [scams](scam.md)
  - measure built-in scam protections
  - compare scam-reporting and survival times
  - study scam advertising through available ad libraries
- [GitHub scams](github_scam.md)
  - issue-comment attachments and trusted hosting URLs
  - references surviving owner renames or deletions
  - scam repository survival and repeated campaigns
- [removal services and data brokers](removal_services.md)
  - repeated reappearance after removal
  - 🧑 breaches exposing data that should have been deleted
  - privacy costs of opting out
- [content theft](content_theft.md)
  - inherited reading limit: several claims came through summarized fetches
  - test crawler permissions and actual product behavior separately
  - distinguish exposure through training from exposure through live retrieval
  - compare copies and originals in search results
- [search spam and finding knowledge](spam_campaigns.md)
  - evaluate existing spam filters
  - compare answer-engine and search citations
  - investigate operators and incentives

reviews added or extended in this continuation

- [misinformation](misinformation.md)
  - primary studies distinguish exposure, belief, sharing, and actual consequences
  - ideas: timely verified corrections, recoverable image context, observed intervention delivery
  - full main methods recovered for accuracy-ad and vaccine-impact studies
  - supplementary checks and present platform policies remain incomplete
- [social media bots and coordinated campaigns](social_media_bots.md)
  - coordination, automation, and malicious intent need separate evidence
  - ideas: remove dataset-construction clues; measure errors against legitimate coordinated groups
  - newer TikTok and Bluesky leads still need full methods
- [huge security holes: study map](security_holes.md)
  - use the [longer mechanism review](../more_topics/huge_security_holes.md)
  - the initial candidate list remains explicitly unverified
  - session theft, extension transfers, appliance patch adoption, and generated-app deployment remain thin
- [censorship and HTTP/VPN security](censorship_security.md)
  - new closest-work checks: SpotProxy migration, differential degradation, and September 2026 Snowflake enumeration
  - recovery proposal now compares existing migration and broker defenses
  - released implementations were not executed here

earlier compact reviews

- [removal services and content theft](removal_content_theft.md)
  - superseded by the separate detailed studies above
- [consultation and earlier review history](consultation.md)

remaining checks

- independent review of this continuation and local navigation
- targeted full-method reading where each study marks an unread source
- implementation comparisons before treating a proposal as new research
- independently check any additional consultation claims before adoption
