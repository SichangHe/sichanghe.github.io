# how to fight scam
(authored by agents unless marked 🧑)

start here

- a scam here means: a victim is talked into sending money or data themselves
    - phishing sites that steal passwords are in [the phishing study](../../web_llm_detection/web_user/phishing/index.md)
    - GitHub scams are in [GitHub scams](github_scam.md)
- what the literature says, in 5 lines
    - losses are huge and growing, but every total is shaky
    - today's blocklists were built for phishing and malware
        - they missed most scam sites in the 2 studies that checked
    - a few actors carry a large share of the volume wherever somebody looked
        - 10 payment accounts, 10 advertisers, 5 wallet-stealing groups, 3 exchanges
    - one fix has a measured drop in money lost, and it is a law
        - UK banks must refund victims who were tricked into paying
        - 2 more fixes cut complaints or calls: banning accounts, and action against phone carriers
    - nobody has shown that reporting, baiting, or AI detectors reduce what victims lose
- my 3 strongest research ideas, details at the bottom
    1. test the scam protection that already ships in browsers and phones against fresh scams
    2. does reporting a scam do anything: delay half the reports at random and compare
    3. scam ads across platforms: how many people see one before it is removed, and does the advertiser come back
- these rankings are my opinion
    - nothing was built or run
    - checked 7 Oct 2026
- how to read the sources below
    - a quote with no tag was read in the source's own text
    - "(second-hand)" means the number came from a news article, a page summary, or a search result
        - check the original before relying on it

human's question

- [research index](../../../index.md): "how to fight scam"
    - wanted there: "significant & popular, easy sell" and "easy to implement"

how big, and why the totals are shaky

- FBI, [IC3 2025 Internet Crime Report](https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf)
    - "1,008,597 complaints; $20.877 billion in losses; 26% increase in losses from 2024"
    - earlier years in the same chart: $16.6B in 2024, $12.5B in 2023, $10.3B in 2022
    - counts only what victims chose to report to the FBI
- other totals (second-hand)
    - US FTC: $15.9B reported lost to fraud in 2025
    - UK Finance: £576.4m lost in 2025 to scams where the victim approved the payment
    - Australia's anti-scam centre: A$2.18B reported in 2025, down from A$3.1B in 2022, but up 7.8% on 2024
    - GASA survey of 46,000 adults in 42 markets: about $442B lost worldwide
    - UNODC 2026: $88B to $114B lost in East and Southeast Asia, Australia and New Zealand in 2025
- survey totals can be wrong by a lot
    - Florêncio and Herley, [Sex, Lies and Cyber-crime Surveys](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/SexLiesandCybercrimeSurveys.pdf), WEIS 2011
        - "How can two answers (in a survey of 5000) make a 3x difference in the final result?"
        - reason: most people lose nothing and a few lose a fortune, so a few answers decide the total
        - applies to the GASA number
- reported totals can also be wrong, in both directions
    - Gomez et al., [Clean Up the Mess](https://arxiv.org/abs/2410.21041), Future Generation Computer Systems 2025
        - 289K reports from 2 crypto scam reporting sites over 6 years
        - "victim-reported losses heavily underestimate cybercriminal revenue by estimating a 29 times higher revenue from deposit transactions"
        - "We identified 91 (0.1%) benign addresses reported, responsible for 60% of all the received funds"
            - so adding up money sent to reported addresses overcounts badly unless you remove exchanges first
        - one unguarded reporting site ended with 75% spam reports
    - Gomez, van Liebergen, Caballero, [Cybercrime Bitcoin Revenue Estimations](https://arxiv.org/abs/2309.03592), CCS 2023
        - common tracing shortcuts "may introduce huge overestimation"
- what real users run into
    - Kotzias et al., [Ctrl+Alt+Deceive](https://www.ndss-symposium.org/wp-content/uploads/2025-1816-paper.pdf), NDSS 2025
        - data: visits to 607K scam domains by customers of one antivirus vendor
        - "On a daily basis, 149K devices are exposed to online scams, with an average of 101K (0.8%) of desktop devices being exposed compared to 48K (0.3%) of mobile devices."
        - shopping scams reach far more people than any other kind: 10.2M IP addresses vs 653K for crypto scams
        - "After being observed in the telemetry, the scam domains remain alive for a median of 11 days."
        - "In at least 9.2M (13.3%) of all scam observations users followed an advertisement. These ads are largely (59%) hosted on social media, with Facebook being the preferred source."
        - "4% of the unresolved domains were taken down by their domain registrars by the time they appeared in the feed"
            - a registrar is the company that sold the domain name
        - limit: one vendor's customers, and scam labels from a commercial feed whose method is secret

the scam business has few exits

- old result that shaped the field
    - Levchenko et al., [Click Trajectories](https://www.ieee-security.org/TC/SP2011/PAPERS/2011/paper027.pdf), IEEE S&P 2011
        - bought 100+ spam-advertised products and followed the money
        - "just three banks provide the payment servicing for over 95% of the spam-advertised goods in our study"
        - a new bank is slow and costly to get, a new domain is not
        - limit: 2010 pill and fake-watch spam
- the same pattern today
    - fake shops: Bitaab et al., [ScamMagnifier](https://www.ndss-symposium.org/wp-content/uploads/2025-763-paper.pdf), NDSS 2025
        - 1,155,237 shopping domains, 46,746 fraudulent, 41,863 automated checkouts
        - "54.55% of all collected fraudulent websites are managed by only 10 merchant IDs"
            - a merchant ID is the account a shop has with its card payment company
            - counted over the 14,394 sites they could tie to a merchant ID
        - a partner's data: 28.78% of visitors came from Facebook or Instagram ads, 21.10% from Google, 9.38% from Bing
        - limit: 3 payment companies, 2 partner firms; code and data only promised
    - pig butchering, where a fake friend or lover walks the victim into a fake investment
        - Griffin and Mei, [How Do Crypto Flows Finance Slavery?](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4742235), 2024
            - Tether, or USDT, is a crypto coin pegged to the dollar, and its issuer can freeze it
        - "Funds exit the crypto network in large quantities, mostly in Tether, through less transparent but large exchanges—Binance, Huobi, and OKX."
            - "at least $75.3 billion into suspicious exchange deposit accounts"
            - limit: money moved, which is more than money lost; one author owns a tracing firm
    - crypto giveaway scams: Liu et al., [Give and Take](https://arxiv.org/abs/2405.09757), IMC 2024
        - the scam: "send me 1 coin and get 2 back", under a celebrity's name
        - "1 in 1000 scam tweets, and 4 in 100,000 livestream views, net a victim"
        - "at least 58% of victims relied on centralized exchanges"
            - so the exchange could warn or stop the payment
    - wallet-stealing sites: Chen et al., [Dissecting Payload-based Transaction Phishing on Ethereum](https://arxiv.org/abs/2409.02386), NDSS 2025
        - 130,637 scam transactions in 300 days, "losses exceeding $341.9 million"
        - "the top five phishing organizations are responsible for 40.7% of all losses"
        - these sites trick you into signing a transaction that hands over your coins
            - the ready-made kits are called drainers
        - He et al., [Drainer-as-a-Service](https://dl.acm.org/doi/10.1145/3730567.3764476), IMC 2025: toolkit makers keep about 20%, the people who bring victims keep 80% (second-hand)
    - scam ads on Meta: 10 advertisers placed over 56% of them, per a Norton report (second-hand, vendor)
- why scammers need many cheap tries
    - Herley, [Why do Nigerian Scammers Say They are from Nigeria?](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/WhyFromNigeria.pdf), WEIS 2012
        - "a 10x reduction in density can produce a 1000x reduction in the number of victims found"
        - a scammer's real cost is time spent on people who never pay
        - theory only; LLMs now make that time nearly free, which I think weakens the argument

what was measured, by kind of scam

- fake shops
    - Bitaab et al., Beyond Phish, IEEE S&P 2023: Google Safe Browsing flagged 0.46% of fraud shop sites (second-hand)
- job scams by text message
    - Pitumpe and Rahmati, [Anansi](https://arxiv.org/abs/2602.24223), arXiv 2026
        - LLM agents posing as victims talked to 1,900+ scammers
        - found "extensive reuse of message templates, domains, and cryptocurrency wallets"
        - "Of the 135 unique scam websites detected by Anansi, only 29.6% were identified by VirusTotal"
            - VirusTotal pools about 70 security vendors' verdicts
            - Google Safe Browsing, the list behind Chrome's red warning page: 15.6%
        - limit: needs a human at some steps; no data release found
- text messages in general
    - Lu et al., [Read This Paper to Get $50 Million](https://arxiv.org/abs/2605.16656), arXiv 2026
        - 175,430 scam texts that people posted on Reddit, June 2020 to December 2025
        - posts about scams that ask you to reply grow 99.98% a year, posts about scams with a link 57.29%
            - more posts can also mean more people posting
        - reply scams "show the lowest detector performance"
        - LLM detectors catch many but flag too many normal messages
        - [data and scripts are public](https://github.com/mobile-scam-analysis/mmscharacterization)
    - Nahapetyan et al., On SMS Phishing Tactics and Infrastructure, IEEE S&P 2024 (second-hand)
        - scammers send test messages through public receive-a-text websites before a campaign
- phone calls
    - Prasad et al., [Who's Calling?](https://www.usenix.org/conference/usenixsecurity20/presentation/prasad), USENIX Security 2020: 66,606 trap phone lines, 1.48M calls, 2,687 campaigns (second-hand)
    - Miramirkhani et al., Dial One for Scam, NDSS 2017: fake tech support pages found mostly through ads (second-hand)
- comments, search, apps, chat groups
    - Li et al., [Like, Comment, Get Scammed](https://www.ndss-symposium.org/ndss-paper/like-comment-get-scammed-characterizing-comment-scams-on-media-platforms/), NDSS 2024: about 206K scam comments from about 10,000 accounts on 20 YouTube channels (second-hand)
    - Na et al., Evolving Bots, IMC 2023: "1,134 SSBs promoting 72 scam campaigns responsible for infecting 31.73% of crawled videos"
        - SSB is their name for a scam comment bot
    - Liu et al., NOKEScam, USENIX Security 2025, with Baidu
        - scammers plant made-up words in victims' minds, then own the search results for those words
        - "a 194-fold reduction in real-world user complaints" after the fix
        - part of the fix was banning 2,335 accounts that submitted the pages
        - limit: one search engine, data cannot be shared
    - predatory loan apps: [The Cost of Convenience](https://arxiv.org/abs/2601.12634), 2026: Google removed 93 apps after the report (second-hand)
    - Telegram bots: [A Large-Scale Study of Telegram Bots](https://arxiv.org/abs/2603.24302), 2026: public data, no private groups
- crypto
    - Tsuchiya et al., [Blockchain Address Poisoning](https://arxiv.org/abs/2501.16681), USENIX Security 2025
        - scammers send dust from look-alike addresses and wait for a copy-paste mistake
        - "270M on-chain attacks targeting 17M victims. 6,633 incidents have caused at least 83.8M USD in losses"
    - Chen et al., [From Hype to Collapse](https://arxiv.org/abs/2603.24625), 2026: flags 76,469 of 100,063 new Solana tokens as rug pulls, where the makers sell out and vanish; data released
- people
    - Oak and Shafiq, ["Hello, is this Anna?"](https://arxiv.org/abs/2503.20821), SOUPS 2025: 26 pig-butchering victims
        - victims get hit again by fake "recover your money" services
    - Chen et al. above: of 5,000 wallet-theft victims, "2,019 addresses (40.38%) did not take any remedial measures"
- I found no academic measurement of
    - fake trading apps
    - fake customer support numbers placed through search ads
    - delivery and refund scams
    - Discord scams
    - no paper that organizes the whole scam field either
    - these are searches that came back empty, so treat them as leads

what works, with evidence

- make banks pay: the best evidence
    - UK rule since October 2024: the victim's bank and the receiving bank refund the victim
    - evaluation for the UK payments regulator, read through [a law firm's summary](https://bratby.law/app-fraud-reimbursement-evaluation/) (second-hand)
        - covered losses "fell by around 21%, equivalent to about £73m a year"
        - biggest drops at banks that had refunded least before
        - scams paid to accounts abroad rose from £21m in 2023 to £60m in 2025
            - looks like scammers moved to where the rule does not reach
        - one year of data; slow-to-surface investment scams are left out
- change what the pay button says
    - Akesson, Gathergood, Quispe-Torreblanca, Preventing Payments Fraud in the FinTech Era, CeDEx discussion paper 2023-08, University of Nottingham
        - 8,958 people in a mock banking app
        - fraud payments fell from 22% to 4% with redesigned buttons plus a risk warning
        - "the effectiveness of behavioural warnings decayed with increasing exposure to fraud"
        - limit: play money, and people were told to watch for fraud
- kick out accounts
    - the Baidu result above
- go after the phone companies that let the calls in
    - Prasad, Nahapetyan, Reaves, IEEE S&P 2025, linked below
        - "about 99% of campaigns subject to enforcement actions through the Project Point of No Entry (PPoNE) investigation ceased to operate after the enforcement actions"
            - that was a US FTC action against companies that carry foreign calls into the US
        - those campaigns were 5.5% of the robocalls in the study
- mixed or missing evidence
    - signed caller ID in the US, called STIR/SHAKEN
        - Prasad, Nahapetyan, Reaves, [Characterizing Robocalls with Multiple Vantage Points](https://arxiv.org/abs/2410.17361), IEEE S&P 2025
            - "remaining robocallers have succeeded in in assimilating to the new regime"
            - the paper discusses "why STIR/SHAKEN has failed to dramatically reduce robocall volumes"
    - UK check that the account name matches before you pay
        - regulator's own words: "some evidence of reduced levels of fraudulent funds", [policy statement PS22/3](https://www.psr.org.uk/media/migeob4s/ps22-3-extending-cop-coverage-oct-2022.pdf), no numbers in the lines read
    - Singapore's registry of text message sender names, Australia's drop since 2022
        - only government statements found, no outside evaluation
    - freezing stablecoins
        - Wu et al., [Ordering Power is Sanctioning Power](https://arxiv.org/abs/2603.27739), arXiv 2026
            - "At least 7.3% of sanctioned USDT addresses and 18.7% of sanctioned USDC addresses had already been drained to zero before the freeze took effect."
        - Tether's joint unit froze about $300M by October 2025, against $14B+ of scam inflows in 2025 per Chainalysis (both second-hand)
    - reporting ads to platforms
        - BEUC, [Sponsored by Scammers](https://www.beuc.eu/sites/default/files/publications/BEUC-X-2026-045_Two-pager_Sponsored_by_Scammers.pdf), May 2026
            - consumer groups in 13 countries reported 893 scam ads to Meta, TikTok and Google
            - 243 taken down, 297 rejected, 168 ignored, 185 "removed before review"
            - advocacy study; how each ad was judged a scam is in its annex, which I did not read
    - talking to scammers with chatbots to waste their time or get their bank details
        - Siadati et al., [Send to which account?](https://arxiv.org/abs/2509.08493), arXiv 2025
            - 2,638 email exchanges over 5 months
            - where the scammer wrote back at least once, 31.74% gave up payment details
        - Acharya et al., [ScamChatBot](https://arxiv.org/abs/2412.15072), arXiv 2024: PayPal confirmed 163 of 743 reported accounts (second-hand)
        - nobody measured whether victims lost less afterwards

AI on both sides

- scammers
    - Gressel et al., [Love, Lies, and Language Models](https://arxiv.org/abs/2512.16280), USENIX Security 2026
        - interviews with 145 people from inside scam operations
        - a week-long test with 22 volunteers, each chatting with one human and one LLM
            - asked to try a harmless app, 46% did it for the LLM and 18% for the human
            - "Our sample (n = 22) was small and drawn primarily from a university population"
        - "popular safety filters detected 0.0% of romance baiting dialogues"
            - makes sense: the early chat is just friendly talk
    - Czybik et al., [A Large-Scale Study of Personalized Phishing using Large Language Models](https://www.usenix.org/conference/usenixsecurity26/presentation/czybik), USENIX Security 2026
        - 7,700 people; clicks: LLM personal email 10.0%, generic 3.7 to 4.1%, hand-written personal 24.2%
        - "the cost of personalization is minimal, with approximately $0.03 per email"
    - Heiding et al., [Evaluating Large Language Models' Ability to Automate Spear Phishing](https://arxiv.org/abs/2412.11109), 2026: 54% clicks for AI emails with 101 people (second-hand)
        - 54% vs 10% is far apart
            - the 2 studies differ in people, emails and size, so it may not be a real conflict
    - real use: mostly vendor reports
        - OpenAI: scammers mainly use ChatGPT for "relatively simple tasks like translation" (second-hand)
        - Luu and Samuel, [Unintentional Consequences](https://arxiv.org/abs/2505.23733): crypto scam reports rose by "about 722 weekly" after ChatGPT came out
            - reports are not scams, and one date proves little
    - voice cloning: only news stories and marketing numbers found
- defenders
    - Topcuoglu et al., [Measuring and Evaluating the Performance of Generative AI Models for Scam Detection](https://arxiv.org/abs/2607.17353), arXiv 2026
        - "a rigorous assessment of LLMs for the purpose of scam detection is missing."
        - best models scored about 64 to 65% on their 3-way labels, per a helper's reading; [code and data public](https://github.com/cemtopcuoglu/genai_scam_detection)
    - Google, [Using AI to stop tech support scams in Chrome](https://blog.google/security/using-ai-to-stop-tech-support-scams-in/), May 2025
        - a small model in the browser reads suspicious pages and sends "signals" to Google's Safe Browsing "for a final verdict"
        - no accuracy numbers; same for the text message and call detectors on Android
        - I found no outside test of any shipped detector
- AI agents as the new victims
    - Roy et al., ["I Strongly Suspect This Website Is a Scam"](https://arxiv.org/abs/2606.00497), arXiv 2026
        - agents that said the site looked like a scam "still submit critical PII in 35.9% of sessions"
            - PII is personal data such as card numbers
    - several more benchmarks came out in 2025 and 2026: SusBench, WebDecept, TRAP, LoginTrap
        - I think this corner is already crowded

scam ads: loud topic, thin science

- Reuters, November 2025, on Meta's internal papers: about 10% of 2024 revenue from scam and banned-goods ads (second-hand)
- Austrian media regulator, [fraud ecosystem study](https://www.rtr.at/medien/aktuelles/publikationen/Publikationen/Publikationen_2026/Betrugsoekosystem_Werbung_KommAustria_final_EN.pdf), 2026
    - "Within just three months, the study identified 634,000 fraudulent or problematic advertisements across eight fraud schemes. Together, these ads generated more than 1 billion impressions across the EU"
        - 448,699 of them were online gambling ads
        - found by keyword search in Meta's ad library
    - "62.4% of all identified ads had already been removed by Meta at the time of data collection"
        - subscription trap ads: 4.5% removed
    - disabled accounts kept advertising: "new ads were later placed under the same Page ID, despite the supposed deactivation of the account"
    - ads vanish from the library: "previously documented ads could no longer be found in later searches"
        - the law says ads stay listed for a year
    - "approximate values based on the data made available by the Meta Ad Library, the accuracy of which cannot be independently verified"
- Gen Digital (Norton): 30.99% of 14.5M Meta ads in the EU and UK led to a scam, phishing or malware link (second-hand, vendor)
- EU law gives researchers 2 public data sources
    - each very large platform must keep a searchable library of its ads
    - platforms must log every moderation decision in one EU database
        - Trujillo, Fagni, Cresci, [The DSA Transparency Database](https://arxiv.org/abs/2312.10269): "a remarkable fraction of the database data is inconsistent"
        - Kaushal et al., [Automated Transparency](https://arxiv.org/abs/2404.02894): platforms have "a lot of discretion" in what they log
        - "scams and fraud" is one of its categories; I found no paper that uses it to study scams
- I found no peer-reviewed scam ad audit that others can rerun, and none across platforms

research ideas

1. test the scam protection that already ships
    - question: how many fresh scams do Chrome, Edge, Safari, Android's message and call detectors, and crypto wallets catch, and how many hours late
    - why it sells: vendors announce AI scam detection with no numbers; an outside scoreboard is easy to explain
    - how
        - take fresh scam sites from a public feed every day, split by kind of scam
        - visit each site in each real browser every few hours and record the first warning
        - for messages: replay the public Reddit scam texts and normal texts into phones
    - first experiment: 500 fresh scam sites of 3 kinds, 3 browsers, 2 weeks
    - measure: share caught at first sight, hours to first warning, warnings on normal sites and messages
    - closest work
        - PhishTime, USENIX Security 2020, did this for phishing
            - it put up fresh test sites and timed each browser's warning
            - so the method is old; scam sites and phone features are the new part
            - details in the phishing study
        - one-time counts: 0.46% for fake shops, 15.6% for job scam sites
        - Topcuoglu et al. tested LLMs, not shipped products
        - Lu et al. tested off-the-shelf text filters, not the phone's own
    - stop if: browser detectors only run for logged-in or opted-in users in ways a test rig cannot mimic
    - effort, my guess: medium; phone automation is the hard part
2. does reporting a scam do anything
    - question: when you report a fresh scam site, wallet, or ad, does it die sooner than one nobody reported
    - why it sells: every victim is told "report it", and nobody knows which report matters
    - how
        - same daily feed as idea 1
        - report a random half now, the other half after 7 days
        - report to one place per group: registrar, hosting company, Google Safe Browsing, the ad platform, the payment company
        - watch when each site dies or gets a warning page
    - first experiment: 300 fake shops, registrar vs Safe Browsing vs no report
    - measure: days alive after report; for crypto wallets, money received after report, which is public
    - closest work
        - Ctrl+Alt+Deceive: median life 11 days; registrars had taken down 4% of the dead ones
        - random-delay notification tests exist for hacked sites and phishing, as far as I remember
            - Çetin et al., WEIS 2015; Moore and Clayton on phishing takedown
            - not read for this review
        - BEUC: 27% of reported ads removed, no comparison group
        - [Evaluating the Effectiveness of Handling Abusive Domain Names by Internet Entities](https://doi.org/10.3390/electronics11081172), 2022: could not open it; read before starting
        - PhishTime reported its own test phishing pages and timed the response; see the phishing study
    - snag: a site in the wait group may be reported by someone else
        - check other feeds before assigning, and count it in the analysis
    - stop if: nearly all sites die within a day or two on their own, leaving nothing to speed up
    - needs ethics review: the delayed half stays up longer than it had to
    - effort, my guess: low
3. scam ads: how many people see one before it comes down
    - question: per platform, how long does a scam ad run, how many people does it reach, and do banned advertisers come back
    - why it sells: the Reuters story, the BEUC complaint, and regulators who need numbers they can check
    - what is new: less than I first thought
        - the Austrian study already has reach, running time and removal share for Meta
        - still open: other platforms, labels from the landing page instead of keywords, daily snapshots so vanished ads are kept, and code others can rerun
    - how
        - pull finance, shopping and crypto ads daily from the EU ad libraries of Meta, Google and TikTok
        - open each ad's landing page in a real browser from a home internet address
            - scam pages show a clean page to crawlers; the phishing study covers ways around that
        - label a page a scam only with outside proof
            - a regulator warning list, a known scam feed, or a payment account already tied to fraud
            - this misses scams nobody has listed yet, so counts are a floor
        - keep each ad's first seen date, last seen date, and reach
    - first experiment: 2 weeks, Meta only, investment ads in 2 countries; check 200 labels by hand
    - measure: reach before removal, days to removal, share of scam ads by top 10 advertisers, how fast a removed advertiser's page reappears under a new name
    - closest work: Austrian regulator study, BEUC, Norton, Ctrl+Alt+Deceive, ScamMagnifier
    - stop if: Google's and TikTok's libraries do not mark removed ads or give reach
        - Meta's does both; I did not check the other two
    - effort, my guess: low for the pilot, medium for 3 platforms

more ideas, weaker or harder

- time-to-freeze vs time-to-cash-out for scam money in stablecoins
    - freezes are public on the blockchain; Wu et al. and firms like BlockSec already count how much escapes
    - open part: how long after the first public victim report the money is still sitting there
    - snag: the biggest report site refused research access to Gomez et al.
- how fast does a blocked scammer come back
    - Click Trajectories argued a new bank takes long to get; nobody measured that for merchant IDs, ad accounts, or exchange accounts
    - needs a partner who does the blocking
- one payment map across scam kinds
    - run victim-acting agents for shop, job, romance and investment scams and record where each asks you to pay
    - pieces exist: Anansi, ScamMagnifier, Siadati et al., ScamChatBot
    - large effort
- does scam baiting hurt scammers
    - Herley's theory says wasted scammer time should cut victims; flood one operation and watch whether it answers real people slower
    - hard to observe from outside
- a payment guard for AI agents
    - stop the agent's outgoing payment or data when the site is unknown, whatever the agent thinks
    - Roy et al. proposed it and did not build it; crowded area
- fake support numbers in search ads: no academic measurement found; small, clean audit
- rerun the two LLM phishing studies, 54% and 10% clicks, with one method
- use the EU moderation database to compare how platforms act on scams
    - risk: the 2 papers above say the data is inconsistent

limits of this review

- about 70 sources; roughly 25 read in full text, the rest from abstracts or second-hand
- "I found no" means a few searches came back empty
- not covered well: voice cloning, money mule detection inside banks, scam compounds, recovery scams, Apple and Samsung scam features
- ChatGPT was not consulted: its command line tool needed a login on 7 Oct 2026

8 October closest-work constraint

- Oest et al., [PhishTime](https://www.usenix.org/conference/usenixsecurity20/presentation/oest-phishtime), USENIX Security 2020
    - primary abstract: “we systematically launch and report 2,862 new (innocuous) phishing websites”
    - six deployments over nine months measure blacklist speed, coverage, and consistency
    - reading depth in this continuation: official abstract
        - consult the full methods before copying the experimental design
- distinguish a browser warning from a hosting shutdown
    - reporting that improves warning speed need not remove the site
    - compare warning time, source accessibility, and payment activity as separate outcomes
- broad browser protection measurement already overlaps this work
    - phone and wallet features need specific closest-work checks
