agents and the web: who visits, who blocks, who adapts, who gets cited
(authored by agents unless marked 🧑)

short version

- the supply side of the "web for agents" is measured; the demand side is not
  - papers count who publishes robots.txt rules, llms.txt, MCP servers, skills, and on-chain agent payments
  - I found no peer-reviewed paper that checks which agents actually read or use these things on a site the researcher controls
- robots.txt is the only widely used control, and it is weak for the newest visitors
  - assistants that fetch a page because a user asked often skip robots.txt or use an ordinary browser name
  - 10 of 18 chatbots tested got page content through a search engine's crawler (Googlebot, Bingbot, Bravebot), so blocking the chatbot's own crawler does not keep content out
- agents can be told apart from people in the lab, but nobody has published how much real traffic they are
  - 4 preprints fingerprint 6 to 7 agents each on test sites
  - every traffic share number I found comes from a vendor that sells bot blocking
- the counts that look like adoption are mostly hollow
  - more than half of MCP market listings are invalid or low value
  - 21% of agent payment settlements on one chain are fictitious and 64% stay inside one linked cluster
  - security scanners flag up to 47% of skills as malicious; 0.52% stay suspicious after a closer look
- AI search cites different pages than normal search, and the citation lists are noisy
  - overlap between Google results and AI Overview sources is under 0.2 (Jaccard)
  - sites that block Google's AI crawler are cited less by Gemini; blocking is also linked to a 7% traffic drop for large news publishers
- best research ideas, in my judgment
  - 1: put up honey sites that offer every agent-facing door, then see which real agents use which door
  - 2: visit top sites as a person and as an agent and compare what comes back
  - 3: track robots.txt changes and AI search citations together over time to see whether blocking causes the citation loss

what the topic is

- AI companies send three kinds of visitors to websites
  - training crawlers collect pages to train models (GPTBot, ClaudeBot)
  - search crawlers build an index for AI answers (OAI-SearchBot, PerplexityBot)
  - user-triggered visitors fetch a page, or drive a whole browser, because one person asked (ChatGPT-User, Comet, Operator)
- websites react in three ways
  - block: robots.txt rules, bot blocking by a CDN, CAPTCHAs
  - adapt: publish files and endpoints made for agents
    - llms.txt: a markdown file that lists the pages a model should read
    - MCP (Model Context Protocol): a standard way for a site or program to offer tools to an agent
    - A2A agent card: a JSON file that says what an agent on this site can do
    - x402: a site answers HTTP 402 "Payment Required" and the agent pays with a stablecoin
    - Web Bot Auth: the agent signs its HTTP requests so the site can verify who sent them
  - charge: per-crawl pricing or licensing deals
- a web measurement researcher asks: how common is each thing, does it work, who gains, who loses
- reading depth
  - full text skimmed (methods, results, limits): Kim 2025, Liu 2025, Lopez-Fonseca 2026, Seiden 2026, Grossman 2026, Stein 2026, Yang 2025, Zhou 2026, Zhao 2025, Ling 2026, Kang 2026, Holzbauer 2026
  - abstract only: every other paper below
  - numbers are the authors' reports for their setup and date; products change monthly
- already covered elsewhere in this tree, so only summarized here
  - robots.txt blocking and corpus bias: [crawling](../../web_llm_detection/web_infra/crawling.md)
  - bot detection as a problem for research crawlers: same file
  - manipulating AI search answers: [SEO and search quality](../../web_llm_detection/web_user/seo_search_quality/literature.md)
  - browser agent design and prompt injection: [browser agents](browser_agents.md)

what existing work shows

1. do AI visitors obey robots.txt, and can a site even tell who they are?

- [Scrapers selectively respect robots.txt directives](https://arxiv.org/abs/2505.21733), Kim, Bock, Luo, Liswood, Poroslay, Wenger, arXiv 2025, preprint on arXiv
  - did: changed robots.txt on a university's sites and watched the logs
  - fact: "approximately 3.9 million external web requests made to a set of 36 websites" at "a large private US university"; "130 self-declared bots ... over 40 days"
  - fact: "bots are less likely to comply with stricter robots.txt directives, and ... certain categories of bots, including AI search crawlers, rarely check robots.txt at all"
  - limit: one institution, 40 days; bots that hide their name are hard to attribute
- [Do Generative AI Assistants Respect robots.txt?](https://arxiv.org/abs/2607.14447), Lopez-Fonseca, Rodriguez, Bechtold, Del Alamo, arXiv 2026, preprint
  - did: asked 10 assistants about pages on the authors' server under 4 robots.txt settings, "200 trials", with secret codes in the pages
  - fact: "Some assistants exposed identifiable user-agents (Claude, Gemini, ChatGPT, Perplexity, and Mistral), whereas others used generic user-agents (Grok, Diffy Chat, Qwen, Copilot, and DeepSeek)"
  - fact: some "accessed restricted resources without requesting robots.txt"
  - fact: "assistants may access pages without surfacing the retrieved content, or fail to access even allowed resources"
  - limit: small trial count; one site; only robots.txt was tested
- [Identifying AI Web Scrapers Using Canary Tokens](https://arxiv.org/abs/2605.13706), Seiden, Ren, Zhang, Kim, Liu, Wenger, arXiv 2026, preprint
  - did: served a different made-up fact to each visiting scraper, then asked chatbots about the sites; the fact in the answer reveals which scraper fed it
  - fact: "we elicited User-Agent information for 18 of the 22 AI systems"
  - fact: generic browser user-agents "for six of the 18 AI systems"
  - fact: "We observed content associated with Googlebot, Bingbot, and Bravebot in responses from 10 of the 18 systems"
  - inference: a site that wants to stay in Google but out of chatbots has no robots.txt rule that does it
  - limit: needs the chatbot to answer about an unknown site; 4 systems never did
- [Somesite I Used To Crawl](https://arxiv.org/abs/2411.15091), Liu, Luo, Shan, Voelker, Zhao, Savage, IMC 2025, peer reviewed
  - did: large crawl plus "a targeted user study of 203 professional artists"; tested blocking by reverse proxies
  - fact: "strong demand for tools like robots.txt, but significantly constrained by critical hurdles in technical awareness, agency in deploying them, and limited efficacy against unresponsive crawlers"
  - limit: tests crawler names, not agents that drive a real browser
- [From robots.txt to ai.txt](https://doi.org/10.1145/3831956.3831960), Hoffmann, Goergens, Khosla, Bajpai, ACM SIGCOMM CCR 2026, peer reviewed; I read only the abstract, on CiteDrive
  - did: "a large-scale measurement of emerging Artificial Intelligence (AI)-oriented web permission and descriptor mechanisms across approximately 4M domains"
  - fact: "adoption of AI-specific permission files is emerging, especially among technology-focused domains"
  - fact: "some llms.txt link targets point to content blocked by access-control files"
  - limit: counts files; does not test whether any AI system reads them
- who blocks: [Bouchaud and Ramaciotti](https://arxiv.org/abs/2510.09031), arXiv 2025, preprint; [Steinacker-Olsztyn, Gosain, Dao](https://arxiv.org/abs/2510.10315), WWW 2026, peer reviewed
  - fact (first): "A quarter of the top thousand websites restrict AI crawlers, decreasing to one-tenth across the broader top million"
  - fact (second): "60.0% of reputable sites disallow at least one AI crawler, compared to just 9.1% of misinformation sites"
- what blocking costs: [Strategic Response of News Publishers to Generative AI](https://arxiv.org/abs/2512.24968), Zhao, Berman, arXiv 2025, preprint
  - did: compared publishers before and after they blocked, against ones that had not yet blocked; traffic from SimilarWeb, Semrush, and the Comscore panel
  - fact: "About 75% of the top publishers blocked LLM crawlers at different times starting mid-2023"
  - fact: "a 7% post-blocking decline in weekly visits measured by SimilarWeb or Semrush within the 6 weeks after blocking"
  - limit: traffic is a vendor estimate; publishers chose when to block, so timing may track something else
- proposals for a better control, none measured in the wild
  - [A Survey of Web Content Control for Generative AI](https://arxiv.org/abs/2404.02309), Dinzinger, Heß, Granitzer, arXiv 2024, preprint: site owners "are overwhelmed by the multitude of recent ad hoc standards"
  - [ai.txt DSL](https://arxiv.org/abs/2505.07834), Li et al., arXiv 2025, preprint: adds "element-level regulations" and "natural language instructions"
  - [terms.txt](https://arxiv.org/abs/2609.11152), Chowdhury, arXiv 2026, preprint: robots.txt "cannot express identity, purpose, terms, or price"; prototype "adds 0.20 to 0.65 ms per request"
  - [The Liabilities of Robots.txt](https://arxiv.org/abs/2503.06035), Chang, He, Computer Law and Security Review (accepted, per arXiv), legal analysis: robots.txt "can give rise to a unilateral contract"

2. can a site tell an agent visit from a human visit?

- [FP-Agent](https://arxiv.org/abs/2605.01247), Wang, Shafiq, Vekaria, arXiv 2026, preprint
  - did: "seven AI browsing agents and human users" did 3 tasks on an instrumented test site
  - fact: "browser fingerprints provide limited discriminative power"; "differences in typing, scrolling, and mouse behavior separate AI browsing agents from humans and one another"
  - fact: "FP-Agent detects all seven AI browsing agents, whereas Cloudflare detects only one"
- [On the Internet, Nobody Knows You're an LLM Bot](https://arxiv.org/abs/2606.30119), Fayolle, Bouhenniche, Pélissier, Laperdrix, Maurice, Rudametkin, arXiv 2026, preprint
  - did: 6 agents visited test sites protected by robots.txt, CAPTCHAs, proof of work, and Cloudflare's free tools
  - fact: "some Web Agents were able to bypass all evaluated anti-bot mechanisms"; "stealth and anti-detection mechanisms often increase detectability rather than decrease it"
- [Whose Agent Are You?](https://arxiv.org/abs/2606.20910), Kang, Jeong, Sheffey, Datta, Houmansadr, arXiv 2026, preprint
  - did: fingerprinted "AutoGen, Browser Use, Claude, Gemini, Operator, and Skyvern" at the TLS, HTTP, and behavior layers; "97% accuracy"
  - fact (limit they state): "Claude and Gemini agents are indistinguishable because they present almost identical TLS and HTTP fingerprints"
- [Broken Gates](https://arxiv.org/abs/2607.18659), Ousat, Turkmen, Rampersaud, Bailey, Kharraz, arXiv 2026, preprint
  - fact: two agents with near identical behavior got different outcomes, "isolating execution-environment authenticity, rather than agent behavior, as the determining factor"
- [Developer Experience with AI Coding Agents: HTTP Behavioral Signatures in Documentation Portals](https://arxiv.org/abs/2604.02544), Borysenko, arXiv 2026, preprint
  - did: logged requests from 9 coding agents and 6 assistants to one documentation endpoint
  - fact: "AI agent access compresses multi-page navigation into a single or two requests", so "session depth, time-on-page, click path, and bounce rate" stop meaning much
  - limit: one endpoint, single author; closest thing to a demand-side study that I found
- inference from these five
  - all train and test on agents the authors launched themselves
  - none reports how many agent visits a real site gets, or how well the classifier works on traffic the authors did not create
- what an agent could be shown: [A Whole New World: Creating a Parallel-Poisoned Web Only AI-Agents Can See](https://arxiv.org/abs/2509.00124), Zychlinski, arXiv 2025, preprint
  - claim: a site can spot an agent and "dynamically serve a different, 'cloaked' version of its content"
  - limit: an attack design; no count of sites that do it
- agents as attackers: [LLM Agent Honeypot](https://arxiv.org/abs/2410.13919), Reworr, Volkov, arXiv 2024, preprint
  - fact: an SSH honeypot with prompt-injection bait logged "8,130,731 hacking attempts and 8 potential AI agents"
  - inference: bait that only a language model follows is a cheap way to label agent visits; nobody has used it on websites at scale
- traffic volume
  - [Logrip](https://arxiv.org/abs/2508.03130), Hoetzlein, arXiv 2025, preprint: on one small site "80 to 95 percent of traffic originates from AI crawlers"; a single case
  - [LLMs as the Next Challenging Internet Traffic Source](https://arxiv.org/abs/2504.10688), Koneva et al., arXiv 2025, preprint: "The average size of each prompt query and response is 7,593 bytes"; about chat traffic, not web visits

3. how do websites change for agents?

- [Build the web for agents, not agents for the web](https://arxiv.org/abs/2506.10953), Lù, Kamath, Mosbach, Reddy, arXiv 2025, position paper, preprint
  - claim: sites should offer "an interface specifically designed for agents"; gives "six guiding principles"
- [VOIX](https://arxiv.org/abs/2511.11287), Schultze, Kietzmann, Schönfeld, Stock-Homburg, arXiv 2025, preprint
  - did: new HTML tags that declare tools and state; "a three-day hackathon study with 16 developers"
- [webMCP](https://arxiv.org/abs/2508.09171), Perera, arXiv 2025, preprint
  - claim: page metadata for agents "reduces processing requirements by 67.6% while maintaining 97.9% task success rates compared to 98.8%"
  - limit: the author's own test scenarios
- big-picture papers, no measurements
  - [Agentic Web](https://arxiv.org/abs/2507.21206), Yang et al., arXiv 2025, preprint: frames it as "intelligence, interaction, and economics"
  - [Towards an Agent-First Web](https://arxiv.org/abs/2606.19116), Bandara et al., arXiv 2026, preprint: "agents acting for humans should inherit equivalent access rights"
  - [Beyond Message Passing](https://arxiv.org/abs/2604.02369), Yuan et al., arXiv 2026, preprint: compares "18 representative protocols"; they give "limited protocol-level mechanisms for clarification, context alignment, and verification"
- agent payments, measured on the blockchain
  - [How Agentic Is Agentic Commerce?](https://arxiv.org/abs/2607.12575), Ling, Zhou, Wu, Wang, arXiv 2026, preprint
    - fact: "Over a 280-day window Base carries 136,708,672 settlements worth $44,121,383.81"
    - fact: "21.20% are fictitious and 63.78% internal settlement within a linked cluster"
    - fact: what is provably independent starts at "the $187,861.35 that demonstrably reaches a nameable service"
    - claim: "Settlement count measures manufacturability, not adoption"
  - [Can Trustless Agents Be Trusted?](https://arxiv.org/abs/2606.26028), Xiong, Li, Wei, Wang, Knottenbelt, Wang, arXiv 2026, preprint
    - fact: only "3%, 4%, and 15% across Ethereum, BSC, and Base" of registered agents have a valid file "with at least one live service endpoint"
    - fact: "73.5%, 59.2%, and 90.6%" of reviewers "exhibit coordinated Sybil behavior"
  - [The Web4 Agent Economy](https://arxiv.org/abs/2606.25876), Jin, Wu, Chen, Bao, Yang, Chen, arXiv 2026, preprint
    - claim: agents run "a highly active machine-to-machine payment economy, processing millions of daily transactions"
    - inference: Ling et al. looked at who pays whom and reached the opposite reading of the same kind of data; I trust the payment graph more than the raw count
- inference: for llms.txt, MCP on websites, agent cards, WebMCP, and Web Bot Auth, I found design papers and one file census, but no study of use

4. how do people really use agents?

- [The Adoption and Usage of AI Agents: Early Evidence from Perplexity](https://arxiv.org/abs/2512.07828), Yang, Yonack, Zyskowski, Yarats, Ho, Ma, arXiv 2025, preprint by the vendor
  - did: classified "hundreds of millions of anonymized user interactions" with the Comet browser agent
  - fact: "Productivity & Workflow and Learning & Research, account for 57% of all agentic queries"; "Courses and Shopping for Goods, make up 22%"
  - fact: "Personal use constitutes 55% of queries, while professional and educational contexts comprise 30% and 16%"
  - limit: one product, early adopters, data the public cannot check; nothing on which sites the agent visits or how often it fails
- [How People Use ChatGPT](https://www.nber.org/papers/w34255), Chatterji, Cunningham, Deming, Hitzig, Ong, Shan, Wadman, NBER working paper 2025, not peer reviewed, vendor data
  - fact: adopted "by around 10% of the world's adult population" by July 2025
  - fact: non-work messages "have grown from 53% to more than 70% of all usage"
  - fact: "'Practical Guidance,' 'Seeking Information,' and 'Writing' ... collectively account for nearly 80% of all conversations"
- [Measuring AI agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy), McCain et al., Anthropic research post, Feb 2026, not peer reviewed; read through a page summary tool
  - fact: "Software engineering accounted for nearly 50% of tool calls on our public API"
  - fact: "The 99.9th percentile turn duration nearly doubled, from under 25 minutes to over 45 minutes"
  - fact: "only 0.8% of actions appear to be irreversible"
  - limit they state: "We can only analyze individual tool calls in isolation, rather than full agent sessions"
- [Agentic Much? Adoption of Coding Agents on GitHub](https://arxiv.org/abs/2601.18341), Robbes, Matricon, Degueule, Hora, Zacchiroli, arXiv 2026, preprint
  - did: looked for agent traces such as co-authored commits in "128,018 projects"
  - fact: "an estimated adoption rate of 22.20%--28.66%"
  - inference: the only usage study here that outsiders can redo, because the traces are public
- [How are AI agents used? Evidence from 177,000 MCP tools](https://arxiv.org/abs/2603.23802), Stein, arXiv 2026, preprint
  - fact: "Software development accounts for 67% of all agent tools, and 90% of MCP server downloads"
  - fact: "the share of 'action' tools rose from 27% to 65% of total usage"
  - limit they state: they "do not observe whether downloaded tools are actually called"
- side effects on the public web
  - [Are Large Language Models a Threat to Digital Public Goods?](https://arxiv.org/abs/2307.07367), del Rio-Chanona, Laurentsyeva, Wachs, arXiv 2023; search results say it later appeared in PNAS Nexus, which I did not check
    - fact: "A difference-in-differences model estimates a 16% decrease in weekly posts on Stack Overflow"
  - [Big Help or Big Brother?](https://www.usenix.org/conference/usenixsecurity25/presentation/vekaria), Vekaria et al., USENIX Security 2025, peer reviewed; read through a page summary tool
    - fact: assistant browser extensions share "full webpage content, including the HTML DOM and user form inputs" with their servers
- catalogs of what exists: [The AI Agent Index](https://arxiv.org/abs/2502.01635), Casper et al., arXiv 2025, preprint; [The 2025 AI Agent Index](https://arxiv.org/abs/2602.17753), Staufer et al., FAccT 2026 per its arXiv comment
  - fact (2025 index): covers "30 state-of-the-art AI agents"; "most developers share little information about safety, evaluations, and societal impacts"
- inference: all three large usage studies come from the vendor's own logs; the web side of an agent session is invisible in them

5. what do AI search engines cite?

- [How Generative AI Disrupts Search](https://arxiv.org/abs/2604.27790), Grossman, Liu, Chen, Smith, Borcea, Chen, SIGIR 2026, peer reviewed
  - did: "11,500 user queries" sent to Google Search, AI Overviews, and Gemini 2.5 Flash
  - fact: "for 51.5% of representative, real-user queries, AIOs are generated"
  - fact: sources differ, "<0.2 average Jaccard similarity"
  - fact: 21 popular publishers and several social and review sites "were never cited by Gemini"; "all of these websites block the Google-Extended bot"
  - limit they state: "solely focuses on Google"; "descriptive in nature and limited to a single point in time"
- [Quantifying Uncertainty in AI Visibility](https://arxiv.org/abs/2603.08924), Sielinski, arXiv 2026, preprint
  - did: repeated the same queries on Perplexity, SearchGPT, and Gemini, daily for 9 days and every 10 minutes
  - fact: "many apparent differences between domains fall within the noise floor of the measurement process"
  - inference: any citation study that runs each query once is suspect; this is the cheapest lesson in the whole topic
- [From Citation Selection to Citation Absorption](https://arxiv.org/abs/2604.25707), Zhang, He, Yao, arXiv 2026, preprint
  - did: "602 controlled prompts across ChatGPT, Google AI Overview/Gemini, and Perplexity; 21,143 valid search-layer citations"
  - fact: "Perplexity and Google cite more sources on average, while ChatGPT cites fewer sources but shows substantially higher average citation influence"
- [Navigating the Shift](https://arxiv.org/abs/2601.16858), Chen, Wang, Chen, Koudas, EDBT/ICDT 2026 Workshops
  - fact: AI answers and web search "diverge significantly in their consulted source domains, the typology of these domains (e.g., earned media vs. owned, social), query intent, and the freshness"
- [When Content is Goliath and Algorithm is David](https://arxiv.org/abs/2509.14436), Ma, Qin, Xu, Tan, arXiv 2025, preprint
  - fact: Google's AI search prefers "content characterized by significantly higher predictability for underlying LLMs"
  - inference: pages rewritten by a language model may get cited more; this links to the sibling study of AI-written pages
- inference: nobody has joined the three data sets of site policy, AI citation, and traffic for the same sites over time

6. what is in the agent tool stores?

- MCP servers listed in markets and code hosts
  - [A Measurement Study of Model Context Protocol Ecosystem](https://arxiv.org/abs/2509.25292), Guo, Hao, Zhang, Xu, Lv, Chen, Cheng, arXiv 2025, preprint
    - fact: "17,630 raw entries, of which 8,401 valid projects (8,060 servers and 341 clients)"; "more than half of listed projects are invalid or low-value"
  - [MCP at First Glance](https://arxiv.org/abs/2506.13538), Hasan, Li, Fallahzadeh, Rajbahadur, Adams, Hassan, arXiv 2025, preprint
    - fact: of "1,899 open-source MCP servers", "7.2% of servers contain general vulnerabilities, and 5.5% exhibit MCP-specific tool poisoning"
  - [Rethinking MCP Security](https://arxiv.org/abs/2607.11086), Chen et al., arXiv 2026, preprint; builds on the [MCPZoo dataset](https://arxiv.org/abs/2512.15144), Wu et al., arXiv 2025
    - fact: "64,611 unique MCP servers ... more than 37,288 supporting dynamic analysis"
    - fact: scanners "report that 96.89% of servers are risky"; "less than 50% of sampled alerts are true positives"
  - [MCPEvol-Bench](https://arxiv.org/abs/2607.14642), Liu et al., arXiv 2026, preprint
    - fact: when server tools change, "GPT-5.4 and Claude-Sonnet-4-6 exhibit performance declines of 13.7% and 14.4%"
- MCP servers reachable on the internet
  - [A First Measurement Study on Authentication Security in Real-World Remote MCP Servers](https://arxiv.org/abs/2605.22333), Zhou, Zhang, Zhang, Zhang, Zhang, Yang, arXiv 2026, preprint
    - did: found candidates with FOFA and Shodan, then confirmed each with an MCP handshake
    - fact: "7,973 live remote MCP servers, finding that 40.55% expose tools without authentication"
    - fact: of "119 testable real-world OAuth-enabled MCP servers ... each server exhibits at least one flaw"; "9 CVE IDs"
  - [Exposed by Design](https://arxiv.org/abs/2608.00150), Padilla, arXiv 2026, preprint
    - fact: "we confirm 640 production MCP servers and dynamically audit 414, uncovering 68 reportable vulnerabilities"
    - fact: "41.6% of confirmed servers disappear within three days between consecutive measurement runs"
  - inference: the two counts differ by 12 times (7,973 against 640) because "live" and "production" are defined differently; nobody has reconciled them
- skills
  - [Agent Skills in the Wild](https://arxiv.org/abs/2601.10338), Liu, Wang, Feng, Zhang, Xu, Deng, Li, Zhang, arXiv 2026, preprint
    - fact: "26.1% of skills contain at least one vulnerability"; "5.2% of skills exhibit high-severity patterns strongly suggesting malicious intent"
  - [Context Matters: Repository-Aware Security Analysis of the Agent Skill Ecosystem](https://arxiv.org/abs/2603.16572), Holzbauer, Schmidt, Gegenhuber, Schrittwieser, Ullrich, AgentSkills 2026 workshop, peer reviewed
    - fact: "238,180 unique skills"; scanner reports "classify up to 46.8% of skills as malicious"; "only 0.52% remain suspicious after repository-aware analysis"
    - fact: "repository hijacking risks for seven abandoned repositories referenced by skill indexes, affecting 121 skills"
  - [Exploring the Emerging Threats of the Agent Skill Ecosystem](https://arxiv.org/abs/2605.28588), Beurer-Kellner et al., arXiv 2026, technical report
    - fact: "3,984 AI agent skills ... 76 confirmed malicious payloads"
  - inference: the first and second papers disagree by a factor of 10 on how much is malicious; the scanner is the unknown, not the store
- older stores, same pattern
  - [A First Look at GPT Apps](https://arxiv.org/abs/2402.15105), Zhang, Zhang, Yuan, Zhang, Xu, Qian, arXiv 2024, preprint: "nearly 90% system prompts can be easily accessed"; "creator interest plateaus within three months"
  - [GPT Store Mining and Analysis](https://arxiv.org/abs/2405.10210), Su, Zhao, Hou, Wang, Wang, arXiv 2024, preprint: topic and popularity census
  - [An Empirical Study on the Security Vulnerabilities of GPTs](https://arxiv.org/abs/2512.00136), Wu, Wu, Zheng, arXiv 2025, preprint: attack suite for "information leakage and tool misuse"
- inference: every store study measures what is published; only Stein uses download counts, and none sees calls

what is missing

- nobody has tested which agents use the agent-facing doors
  - evidence: Hoffmann 2026 counts llms.txt files only; Lopez-Fonseca 2026 tests robots.txt only; Borysenko 2026 covers one documentation endpoint
  - evidence: search snippets of industry posts (Ahrefs, Originality.ai; I did not open them) say most llms.txt files get no AI requests; that is a vendor claim with no public method
  - 2 targeted searches for a controlled study of llms.txt, MCP, or agent card use returned none
- nobody has measured what real sites serve to agents compared with people
  - evidence: Liu 2025 and Steinacker-Olsztyn 2026 test whether a crawler name is blocked, a yes or no answer
  - evidence: Zychlinski 2025 designs agent-only content as an attack; a search for a wild measurement found only a vendor demo (SPLX; not opened)
- no independent number for how much traffic is agents
  - evidence: the fingerprinting papers use only self-launched agents; Kim 2025 has real logs but only bots that name themselves, at one university in early 2025
  - evidence: the shares in search results come from Cloudflare, HUMAN, DataDome, and TollBit, who sell blocking
- no causal link from blocking to citation to traffic
  - evidence: Grossman 2026 is "limited to a single point in time"; Zhao 2025 has traffic but no citations; Sielinski 2026 shows single runs are noise
- no study of the official MCP servers that large websites run
  - evidence: Zhou 2026 and Padilla 2026 scan IP space and code hosts; neither ties a server to the website it belongs to or compares it with the site's robots.txt and terms
- no outside view of agent sessions on the web
  - evidence: Yang 2025, Chatterji 2025, and McCain 2026 all use private vendor logs; McCain says tool calls are seen "in isolation"
- these are "I searched and did not find", not proof; IMC 2026 (12 to 16 Oct 2026) may publish some of this, and I could not read its accepted list

research we can do

1. who walks through which door: a honey site study of agent-facing interfaces

- question: when a site offers llms.txt, a markdown version of each page, an MCP endpoint, an agent card, WebMCP tools, and an x402 paywall, which real assistants and agents use which, and does it change what they answer or do?
- why open: supply is counted (Hoffmann 2026), use is not; see the first gap
- first experiment
  - register about 20 fresh domains with made-up but plausible content, such as a product catalog and docs
  - each domain offers a different subset of doors; each door holds a different secret fact, as in Seiden 2026
  - ask about 20 assistants, browser agents, and coding agents questions that need the site; log requests and see which secret shows up
  - repeat weekly for 2 months to catch product changes
- convincing result: a table of product by door with use rates and confidence intervals, plus whether a door changes answer correctness; "no product reads llms.txt in search mode but 5 coding agents do" would be a clean finding
- cost: about $300 for domains and hosting, $500 to $1,500 for subscriptions and API calls, 6 to 8 weeks for one person
- closest work that could scoop it: the Wenger group (Seiden, Kim, Liu) already runs such sites; Lopez-Fonseca's setup extends easily; Hoffmann's group may add a use study
- risk: fresh domains may never be fetched by search-backed assistants; give the URL in the prompt as a second condition

2. what the web shows an agent: person and agent visits compared at scale

- question: on the top 10K to 100K sites, how often does a visit that declares itself an agent get a block, a challenge, a paywall, different text, or text aimed at the model, compared with a person's browser from the same network?
- why open: prior crawls record block or no block for crawler names; content differences and agent-only instructions are unmeasured; see the second gap
- first experiment
  - 4 visitors per site: plain Chrome, Chrome with an agent user-agent (ChatGPT-User, Claude-User, Perplexity-User), headless automation, and one real agent product on a 1K subsample
  - visit twice as each, so normal page churn is not counted as a difference
  - compare status, main text, links, prices, and hidden text; flag text addressed to a model
- convincing result: rates by site category and CDN with a churn baseline, hand-checked samples, and a set of real agent-only pages
- cost: one crawl machine, 2 to 4 weeks for the top 10K; real agent runs cost about $0.05 to $0.50 per page, so keep that sample small
- closest work that could scoop it: Gundelach 2026 (block rates for automation), Liu 2025 (crawler blocking), the UC Davis group behind FP-Agent
- risk: a spoofed user-agent from the wrong IP range may be treated as fake; report that as its own finding, and it argues for Web Bot Auth

3. does blocking AI crawlers cost citations and visits?

- question: when a site starts or stops blocking an AI crawler, do its citations in AI search change, and how fast?
- why open: Grossman 2026 found the link at one moment; Zhao 2025 found a traffic drop without looking at citations
- first experiment
  - take monthly robots.txt history from HTTP Archive or Common Crawl for about 5K publisher and reference sites
  - each week send a fixed set of 2K queries to 3 or 4 AI search products, 5 runs each, following Sielinski 2026
  - compare citation share around each robots.txt change with sites that did not change
- convincing result: a drop or rise that starts after the change, is absent before it, and holds across products
- cost: $1K to $3K per month in API and search result fees, and at least 4 months to see enough changes
- closest work that could scoop it: Grossman's group has the query set; Zhao and Berman have the traffic panel
- risk: few sites change policy in a short window; a long window costs money

smaller ideas

- the official agent door of big sites: find first-party remote MCP servers of the top 10K sites; compare their tools with the site's robots.txt, terms, and login rules; rescan weekly for churn (Padilla saw 41.6% vanish in 3 days)
- agent traffic share without a vendor: get web logs from a university or an open-source project; label agents by fingerprints from the 4 lab papers plus model-only bait links; report the share that names itself against the share that hides
- reconcile the scanners: run the skill and MCP scanners on one shared sample with hand labels; the 46.8% against 0.52% gap says the tools are the problem

ChatGPT's opinion

- pending; the coordinator said ChatGPT cannot be used until the human signs in, so I did not run it

what I searched

- when: 7 Oct 2026; web search worked this time
- about 30 search queries, on: AI crawler measurement and robots.txt; llms.txt adoption; MCP ecosystem and remote MCP scans; skill and GPT stores; AI search citations; AI Overviews and traffic; agent traffic and fingerprinting; cloaking for agents; Web Bot Auth; x402 and agent payments; A2A agent cards; agentic web surveys; agent usage field studies; Stack Overflow and Wikipedia effects; agentic browser privacy; residential proxies; IMC 2026 papers
- sources: arXiv abstract pages and full-text HTML, NBER, USENIX, Anthropic, CiteDrive for one ACM abstract
- opened 59 papers and reports: 12 with full text skimmed, the rest abstract only
- found but not opened, so not cited as evidence
  - Agarwal and Sen, randomized browser-extension study of AI Overviews and clicks (SSRN returned 403); search snippets say clicks fell about 40%
  - Longpre et al., Consent in Crisis; it is in the sibling crawling file
  - industry reports from Cloudflare Radar, HUMAN, TollBit, Ahrefs, Originality.ai
  - BADPASS (bots using residential proxies), NANDA index, IETF Web Bot Auth and AIPREF drafts
- not covered
  - the IMC 2026, CCS 2026, and NDSS 2026 accepted lists; check them before starting idea 1 or 2
  - ChatGPT plugin era papers before 2024
  - legal cases and licensing deals
  - A2A agent cards and Web Bot Auth: I found no measurement paper, only specifications
