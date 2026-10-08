# GitHub scam
(authored by agents unless marked 🧑)

status

- 7 Oct 2026 UTC: second version, Claude agent, replacing the Codex first version
    - 2 papers read in full (Beyond the Stars, Holtgrave NDSS 2025); the rest from primary pages, abstracts, or vendor posts; "(fetch summary)" marks paraphrases by a fetch tool
    - no attack, crawl, or experiment was run; literature and proposals only
- ChatGPT consultation failed: `account_ui_login_required` on 3 tries, so no ChatGPT opinion here
- web search budget ran out early; later sources came from direct page fetches, so newer papers may be missing, especially on repojacking, notification spam, and slop detection
- read in this order: big picture → what is open → research ideas → details per abuse type

human's question

- [research index](../../../index.md): "GitHub scam" under "how to fight scam"
- general scams: [scam.md](scam.md); phishing sites: [web_user phishing](../../web_llm_detection/web_user/phishing/index.md)
- assumption: the human wants research that is "significant & popular, easy sell" and "easy to implement"

the big picture, in plain words

- GitHub is trusted 3 ways, and each trust is abused
    1. trusted domain: a `github.com` link looks safe, so scammers host malware, phishing lures, and crypto scams there
    2. popularity signals: stars, forks, commits, downloads look like proof of quality, so they are bought or faked
    3. automation: CI workflows, package registries, and AI coding tools pull code from GitHub without a human looking, so a hijacked name or a bad workflow runs with real secrets
- who gets hurt
    - end users downloading "free" software, cheats, crypto bots
    - developers: stolen secrets and tokens, poisoned dependencies, time lost to AI slop reports
    - the platform: moderation load, whack-a-mole takedowns

what is already measured well

- fake stars: He et al., [Six Million (Suspected) Fake Stars on GitHub](https://arxiv.org/html/2412.13459v2), ICSE 2026
    - data: GH Archive on BigQuery, July 2019 to Dec 2024
    - tool StarScout, adapted from CopyCatch (Facebook fake Likes): flags accounts with almost no activity and groups of ≥50 accounts starring ≥10 repos in lockstep within 30 days
    - "6.0 million fake stars across 26,254 repositories before the postprocessing step"; after filtering "18,617 repositories with fake star campaigns and 301k participating accounts"
    - peak: "16.66% of popular repositories (3,499) had fake star campaigns" in July 2024
    - recall on 1 known campaign: "can detect 688 (81.23%) of the 847 repositories and 11,903 (75.95%) of the 15,672 involved GitHub accounts"
    - "90.42% of repositories and 57.07% of accounts in fake star campaigns" were already deleted when checked
    - "The majority of fake stars are used to promote short-lived phishing malware repositories; the remaining ones are mostly used to promote AI/LLM, blockchain, tool/application, and tutorial/demo repositories"
    - fake stars help only briefly: effect "about 5x smaller than that of real stars" short term, and long term "the history of faking stars becomes a liability"
    - limits: threshold ≥50 fake stars per month, so small campaigns are missed; one human coder for the categories, checked with GPT-o3-mini at Cohen's κ 0.71
    - code and data: [Zenodo 10.5281/zenodo.17009693](https://doi.org/10.5281/zenodo.17009693), [StarScout repo](https://github.com/hehao98/StarScout)
    - future work they name: repos "initially disguising as legitimate software" then adding malware in later commits
- scam and malware repos at platform scale: Galloway, Valakuzhy, Antonakakis, Monrose, [Beyond the Stars: Multimodal Detection of Scams on GitHub](https://www.usenix.org/conference/usenixsecurity26/presentation/galloway), USENIX Security 2026
    - full text read from the human's paper collection; quotes verified
    - system OctoWatch: 3 signals per repo, fused by 1 linear layer
        1. text embedding (ModernBERT) of repo name and README
        2. GraphSAGE over the user–repo event graph, 15 event types from GH Archive
        3. 40 statistical features (33 new, 7 from Treude et al.)
    - ground truth, Table 2: Shai-Hulud npm worm (11,199 malicious repos, 100% deleted), Phishing (2,100, 13% deleted), Stargazer Ghosts (1,414, 100% deleted); 100,000 benign each
        - Phishing labels: 11 seed repos expanded by shared signatures, kept only if linked binaries are "flagged as malicious by at least 15 independent antivirus vendors"
    - online run, 45 days, 13.6M newly active repos: "OctoWatch identified 4,261 new malicious repositories not present in our ground truth datasets or public threat reporting from URLHaus"
        - "On average, 46.8 new scam repositories were created every day, each from a unique GitHub account"
        - "an analyst encounters only 48 false positives among the first 2,000 flagged repositories"
    - MCC offline / online: Shai-Hulud 0.97 / 0.77; Phishing 0.99 / 0.94; Stargazer 0.90 / 0.35
        - best prior baselines: Repo2Vec 0.91 (Shai-Hulud), StarScout 0.45 (Stargazer)
    - what the scams are
        - "The vast majority (98%) of repositories led users to .zip files that matched the tactics used by the SmartLoader malware family"
            - lures: Roblox and game cheats, crypto tools, productivity utilities; AI-generated READMEs, keyword stuffing, mimicked names ("AdobeeCreativeeCloud"), automatic commits several times a day
            - "95% of malicious repository names were mimicked: each name had appeared in a benign repository less than ten days before"
        - crypto drainers: "13 of the 15 repositories directed users to send funds to a malicious smart contract written in Solidity"; wallets received "over 5.9 million USD in cryptocurrency transactions on the Ethereum blockchain alone"
        - crypto "flashing" scams: 79 repos; "37 repositories instructed users to contact 'customer support' via Telegram"
    - victims engage: "more than 1,000 users starred repositories later identified as malicious. 64 of these users were affiliated with legitimate GitHub organizations"; "10% of the scam repositories exceeded 10,000 downloads"
    - threat intel is blind here: "2,124 unique malicious repositories, 90% of which were absent from URLHaus"; "75% of binaries had never been uploaded to VirusTotal"
    - takedowns: "in some cases, repositories were removed within four hours, and in nearly all cases within 48 hours"; "takedown of over 4,000 malicious repositories"
    - star botnet evasion: Stargazer repos averaged 15 stars, below StarScout's 50-star threshold
    - cost: 1 A30 GPU, 40-core ClickHouse server; scoring a day of events ~30 min; README crawl ~3 h/day
    - stated limits: only README.md, not code; "a set of high-impact abuse campaigns rather than exhaustively covering all types of abuse"; attackers who compromise real accounts defeat graph and statistics features; campaigns can finish before content is crawled
    - artifacts: text says "Our code and datasets are available online" but the USENIX page lists only the PDF; Shai-Hulud data "available upon request to verified researchers"
    - inconsistency noticed: abstract says 14,667 malicious repos found; §7.2 says 4,261 new in the 45-day run plus 10,573 in the Shai-Hulud backtest
- earlier GitHub abuse papers, as cited by the 2 papers above (not read here)
    - Du et al., Understanding Promotion-as-a-Service on GitHub, ACSAC 2020: paid stars/followers, account-centric
    - Rokon et al., SourceFinder, RAID 2020 and Repo2Vec, ICSME 2021: finding malware source repos
    - Cao and Dolan-Gavitt, What the fork? finding and analyzing malware in GitHub forks, NDSS 2022
    - Tania et al., Who is creating malware repositories on GitHub and why?, WWW Companion 2024
    - Gonzalez et al., Anomalicious, ICSE-SEIP 2021: anomalous commits
    - Tucker et al., Nuances and challenges of moderating a code collaboration platform, J. Online Trust and Safety 2024
    - Siadati et al., DevPhish, arXiv 2024: phishing aimed at developers
    - Check Point, [Stargazers Ghost Network](https://research.checkpoint.com/2024/stargazers-ghost-network/), July 2024: accounts split roles (host, update, release, star)
    - Kaspersky, [GitVenom](https://securelist.com/gitvenom-campaign/115694/), Feb 2025: fake projects with "a timestamp file in these repositories, which was updated every few minutes"
- fake proof-of-concept exploits: El Yadmani, The, Gadyatskaya, [Beyond the Surface](https://arxiv.org/html/2210.08374v2), 2023
    - "899 malicious repositories out of 47,285 repositories" advertising exploits for 2017–2021 CVEs
    - checks: suspicious network destinations, encoded payloads, bundled binaries
    - limit: only what blocklists and antivirus catch
- GitHub's own rules, [acceptable use policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies): forbids "rank abuse, such as automated starring or following", "inauthentic interactions, such as fake accounts and automated inauthentic activity", using "our platform to deliver malicious executables or as attack infrastructure"

CI and workflow compromise

- the problem in 1 line: a workflow that runs on a stranger's pull request with a write token or cache lets the stranger publish a release under the project's name
- measurement papers (sizes are repo or workflow counts; "vulnerable" means a risky pattern, not a confirmed break-in)
    - Koishybayev et al., [Characterizing the Security of GitHub CI Workflows](https://www.usenix.org/conference/usenixsecurity22/presentation/koishybayev), USENIX Security 2022: 447,238 workflows in 213,854 repos
        - "99.8% of workflows are overprivileged and have read-write access (instead of read-only) to the repository"
        - "97% of repositories in our dataset execute at least one Action that does not originate with a verified creator"
        - 2022 snapshot; GitHub later changed the default token to read-only
    - Muralee et al., [ARGUS](https://www.usenix.org/conference/usenixsecurity23/presentation/muralee), USENIX Security 2023: taint analysis over 2,778,483 workflows and 31,725 actions
        - "critical code injection vulnerabilities in 4,307 Workflows and 80 Actions"; "a discovery rate more than seven times (7x) higher than the state-of-the-art approaches"
        - [code](https://github.com/Torbi/Argus); injection only, no cache or token chains
    - Benedetti, Verderame, Merlo, [GHAST](https://ar5iv.arxiv.org/html/2208.03837), 2022: rule checker, 50 projects, "24,905 security issues" (snippet only)
    - Onsori Delicheh, Decan, Mens, Quantifying Security Issues in Reusable JavaScript Actions, MSR 2024: 8,107 JS actions, "more than 54% of the studied Actions contain at least one security weakness" (CodeQL)
        - the Codex draft's "Khatami et al. 2024" could not be found; the 2024 "Mitigating Security Issues in GitHub Actions" is an Onsori Delicheh and Mens position paper
    - Huang and Lin, [Revisiting Security Practices for GitHub Actions Workflows](https://conf.researchr.org/details/icpc-2025/icpc-2025-early-research-achievements-era/7/Revisiting-Security-Practices-for-GitHub-Actions-Workflows), ICPC 2025 ERA: ~19,000 workflows, 2022 vs 2024, "significant reduce of permission misconfigurations" but "some undesired practices still widely exist"
    - Kubo et al., [Action Required](https://www.ndss-symposium.org/wp-content/uploads/2026-f483-paper.pdf), NDSS 2026: 338,812 repos plus a developer survey
        - "alarmingly low implementation rates across five key security practices, ranging from 0.6% to 52.9%"; "up to 71.6% of non-adopters were unaware of practices"
    - Wang et al., [Demystifying and Detecting Agentic Workflow Injection Vulnerabilities in GitHub Actions](https://arxiv.org/pdf/2605.07135), arXiv May 2026: LLM-agent actions (claude-code-action, codex-action, run-gemini-cli) as a new injection surface
        - 13,392 agentic workflows in 10,792 repos; "519 potential AWI vulnerabilities, of which 496 are confirmed exploitable under our threat model"; "343 are previously unknown zero-day vulnerabilities"
        - only 24 of 187 prioritized disclosures accepted or fixed, so "exploitable" is the authors' judgement
- real incidents, 2024–2025, show the chains that the papers above do not model
    - [Ultralytics, Dec 2024](https://blog.pypi.org/posts/2024-12-11-ultralytics-attack-analysis/): "GitHub Actions cache compromise" plus a stale PyPI token; "the first set of injected packages were published through the existing GitHub Actions workflow, not by an API token"
    - [tj-actions/changed-files, Mar 2025](https://unit42.paloaltonetworks.com/github-actions-supply-chain-attack/): action "was used by over 23,000 GitHub repositories"; chain began with a leaked PAT at spotbugs in Nov 2024, then reviewdog, then tags repointed; [Wiz](https://www.wiz.io/blog/github-action-tj-actions-changed-files-supply-chain-attack-cve-2025-30066): leaked "valid AWS access keys, GitHub Personal Access Tokens (PATs), npm tokens, private RSA Keys and more"
    - [nx "s1ngularity", Aug 2025](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c): bash injection via PR titles under `pull_request_target`; loot dumped into victims' public repos named `s1ngularity-repository`; reverting the workflow was not enough because old branches kept it
    - [GhostAction, Sept 2025](https://blog.gitguardian.com/ghostaction-campaign-3-325-secrets-stolen/): injected workflows named "Github Actions Security" in 817 repos of 327 users, 3,325 secrets
    - Shai-Hulud npm worm, [Sept 2025](https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack) and [2.0, Nov 2025](https://www.wiz.io/blog/shai-hulud-2-0-ongoing-supply-chain-attack): self-spreading via npm tokens; 2.0 made "approximately 1,000 new repositories every 30 minutes", ~800 packages, 25,000+ repos; adds backdoor workflow `.github/workflows/discussion.yaml`
    - [Adnan Khan, cache poisoning, May 2024](https://adnanthekhan.com/2024/05/06/the-monsters-in-your-build-cache-github-actions-cache-poisoning/) and [depi.security, Oct 2025](https://depi.security/blog/20251003-36m-installs/): pwn request + cache poisoning reached the npm token of cross-fetch and graphql
- tools that already exist (so a new scanner needs a clear delta)
    - [zizmor](https://github.com/zizmorcore/zizmor), [poutine](https://github.com/boostsecurityio/poutine), Praetorian Gato → [Trajan](https://github.com/praetorian-inc/trajan), [OpenSSF Scorecard](https://github.com/ossf/scorecard) Dangerous-Workflow check, GitHub CodeQL actions queries
    - Scorecard runs "a weekly Scorecard scan of the 1 million most critical open source projects" into BigQuery `openssf:scorecardcron.scorecard-v2`: free longitudinal data nobody has analysed in a paper found here
    - [Datadog, 2026](https://securitylabs.datadoghq.com/articles/case-for-github-actions-security.md) claims 38% of orgs have an injectable workflow and 71% never pin to a hash (fetch summary, no method given)
- GitHub's platform response after Shai-Hulud, [npm plan](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/): 7-day granular tokens, deprecate classic tokens, FIDO over TOTP, [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, GitHub-hosted runners only)

repojacking and name hijacking

- the problem: a user renames or deletes their account, the old `owner/repo` URL stays in Go imports, `uses:` lines, READMEs, install scripts; anyone can register the old name and serve code
- [Aqua Security, 2023](https://www.aquasec.com/blog/github-dataset-research-reveals-millions-potentially-vulnerable-to-repojacking/): sampled 1.25M repo names; "36,983 repositories were vulnerable to RepoJacking"; Google and Lyft affected
    - GitHub's protection: names with "more than 100 clones in the week before the organization name was changed" are retired; gaps: popularity gained after the rename, and bypasses
- [VulnCheck, Dec 2023](https://www.vulncheck.com/blog/go-repojacking): ~15,000 Go module repos hijackable, 800,000+ module-versions; but "The attacker cannot overwrite old modules... repojacking within the Go ecosystem is not an immediate win for the attacker" because the Go proxy caches old versions
- [GitHub docs](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository): "GitHub will not redirect calls to an action hosted by a renamed repository", so `uses:` references break or get hijacked silently
- maintainer email domains: Zahan et al., [What are Weak Links in the npm Supply Chain?](https://arxiv.org/abs/2112.10165), ICSE-SEIP 2022: "2,818 maintainer email addresses tied to expired domains, potentially exposing 8,494 packages to account hijacking"
    - [PyPI, Aug 2025](https://blog.pypi.org/posts/2025-08-18-preventing-domain-resurrections/): now un-verifies emails whose domain enters redemption; "over 1,800" addresses since June 2025
- no peer-reviewed repojacking measurement was found; arXiv API returned 429, so treat as unconfirmed rather than absent

package typosquatting and slopsquatting

- typosquatting: register a name close to a popular package
    - Neupane et al., [Beyond Typosquatting](https://www.usenix.org/conference/usenixsecurity23/presentation/neupane), USENIX Security 2023: 13 confusion mechanisms in 1,200+ documented attacks; "attackers use a variety of mechanisms, many of which work at semantic, rather than syntactic, level"
    - Ohm et al., [Backstabber's Knife Collection](https://arxiv.org/abs/2005.09535), DIMVA 2020: 174 malicious npm/PyPI/RubyGems packages 2015–2019, taxonomy
    - Duan et al., [MalOSS](https://arxiv.org/abs/2002.01139), NDSS 2021: 339 malicious packages, 278 removals confirmed, "three of them had more than 100,000 downloads"
    - Guo et al., [malicious code in PyPI](https://arxiv.org/abs/2309.11021), ASE 2023: 4,669 malicious files; "over 50% of malicious code exhibits multiple malicious behaviours"; most survive on mirrors after removal
    - Sejfia and Schäfer, [Amalfi](https://arxiv.org/abs/2202.13953), ICSE 2022: 95 new malware samples in ~96,000 npm versions of 1 week
    - Ladisa et al., [SoK: Taxonomy of Attacks on Open-Source Software Supply Chains](https://arxiv.org/abs/2204.04008), S&P 2023: 107 attack vectors, 94 incidents
    - public datasets: [DataDog malicious-software-packages-dataset](https://github.com/DataDog/malicious-software-packages-dataset), "28,623 malicious software packages", "manually triaged by a human"; [OpenSSF malicious-packages](https://github.com/ossf/malicious-packages) in OSV format
- slopsquatting: LLMs invent package names; attackers register them
    - Spracklen et al., [We Have a Package for You!](https://arxiv.org/html/2406.10279v3), USENIX Security 2025 distinguished paper: 576,000 code samples, 16 LLMs
        - "the average percentage of hallucinated packages is at least 5.2% for commercial models and 21.7% for open-source models"; 205,474 unique hallucinated names
        - "43% of hallucinated packages were repeated in all 10 queries" (stable names are the attackable ones)
        - [code](https://github.com/Spracks/PackageHallucination); the name lists go only to verified researchers
    - Churilov, [The Range Shrinks, the Threat Remains](https://arxiv.org/abs/2605.17062), arXiv May 2026: 5 frontier models, rates "between 4.62% (Claude Haiku 4.5) and 6.10% (GPT-5.4-mini)"; 127 names invented by all 5; "53 of these (41 on PyPI, 12 on npm) remain registrable by an attacker"
    - [Lasso Security blog](https://www.lasso.security/blog/ai-package-hallucinations): empty `huggingface-cli` package "got more than 30k authentic downloads!" in 3 months; the only in-the-wild number found
    - open: nobody has measured real installs of hallucinated names by coding agents, or how many such names attackers hold

AI slop pull requests and bug reports

- the only hard numbers are from 1 project, curl, by its maintainer Daniel Stenberg
    - [Death by a thousand slops, Jul 2025](https://daniel.haxx.se/blog/2025/07/14/death-by-a-thousand-slops/): "about 20% of all submissions" in 2025 were AI slop; ~5% were real bugs; each report costs 3–4 people from 30 min to ~3 h
    - [The end of the curl bug bounty, Jan 2026](https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/): "the confirmed-rate plummeted to below 5%. Not even one in twenty was real"; earlier years over 15%; 7 years, "87 confirmed vulnerabilities and over 100,000 USD"; closed 31 Jan 2026
    - [curl policy now](https://curl.se/docs/bugbounty.html): "Do not lazily paste massive, AI-generated explanations"
    - the slop label is Stenberg's own judgement; no public dataset
- AI agent pull requests at scale (use, not abuse)
    - Li, Zhang, Hassan, [AIDev](https://arxiv.org/abs/2507.15003), 2025: 456,000+ PRs from Codex, Devin, Copilot, Cursor, Claude Code in 61,000 repos; "agents often outperform humans in speed, their PRs are accepted less frequently, revealing a trust and utility gap"
        - [dataset](https://huggingface.co/datasets/hao-li/AIDev), now 932,791 PRs; basis of the [MSR 2026 mining challenge](https://2026.msrconf.org/track/msr-2026-mining-challenge)
        - detects agents from labels and branch names, so unlabeled AI use is missed
    - Ehsani et al., [Where Do AI Coding Agents Fail?](https://arxiv.org/abs/2601.15195), MSR 2026: 33,000 agent PRs; rejections from large diffs, failing CI, duplicates, unwanted features
- platform response: [GitHub changelog, 13 Feb 2026](https://github.blog/changelog/2026-02-13-new-repository-settings-for-configuring-pull-request-access/): "You can now turn off pull requests entirely from your repository's Settings" and "restrict pull request creation to collaborators only"
- Hacktoberfest 2020 spam PRs: called a "corporate-sponsored distributed denial of service attack against the open source maintainer community"; DigitalOcean made it opt-in; no peer-reviewed measurement found
- not found: any paper detecting LLM-written issues/PRs/security reports or measuring slop across projects; the sibling [LLM detection study](../../web_llm_detection/index.md) covers generic text detection

phishing through comments, mentions, and hosted files

- GitHub as a file host under a trusted name
    - [BleepingComputer, Apr 2024](https://www.bleepingcomputer.com/news/security/github-comments-abused-to-push-malware-via-microsoft-repo-urls/): files attached to comments get URLs like `github.com/microsoft/vcpkg/files/…`; "even if you decide not to post the comment or delete it after it is posted, the files are not deleted from GitHub's CDN, and the download URLs continue to work forever"; no setting to turn attachments off
    - Beyond the Stars (above): 98% of scam repos lead to .zip files, half via releases
- comment and mention campaigns
    - Sept 2024 fake "security vulnerability" comment campaign delivering Lumma Stealer: widely reported, page not reachable here, unverified
    - no academic measurement of mention/notification spam found; GH Archive has IssueCommentEvent bodies, so posting (not delivery) is measurable
- fake maintainers and social engineering: [Russ Cox, xz timeline](https://research.swtch.com/xz-timeline): Jia Tan's first patch Oct 2021, pressure sockpuppets from Apr 2022, commit access Dec 2022, backdoor found Mar 2024; the sockpuppet addresses "never appeared elsewhere on the internet, even in data breaches"
    - single case; no paper measuring maintainer-pressure patterns found

identity and fake histories

- Holtgrave et al., [Attributing Open-Source Contributions is Critical but Difficult](https://www.ndss-symposium.org/wp-content/uploads/2025-613-paper.pdf), NDSS 2025; full text read
    - 50,328 critical projects via the GitHub API, cutoff ~Nov 2024
    - "contribution workflows can be abused in 85.9% of the projects" (pusher differs from author/committer)
    - "We identified 573,043 email addresses that a malicious actor can claim to hijack historic contributions and improve the trustworthiness of their accounts"; 4,107 unregistered domains could be taken over
    - "the majority of users (95.4%) never signed a commit, and for the majority of projects (72.1%), no commit was ever signed"
    - GitHub closed the HackerOne report as "informative", behaviour "working as intended"
    - open: whether anyone exploits this in the wild
- [Checkmarx, fake Dependabot commits, Jul 2023](https://checkmarx.com/blog/surprise-when-dependabot-contributes-malicious-code/): "hundreds of GitHub repositories" got commits forged as Dependabot using stolen tokens
- bot detection (benign automation, not fraud): BoDeGHa (Golzadeh et al., JSS 2021, 5,000 accounts, F1 0.98 on comment text), BIMAN (Dey et al., MSR 2020)
- marketplace prices: StarScout reports "\$0.10 to \$2.00 per star"; Check Point saw "\$10" per 100 stars

data sources for measuring abuse

- [GH Archive](https://www.gharchive.org/): all public events since 12 Feb 2011, BigQuery with "1 TB of data processed per month free of charge"; payload is a JSON string, so issue and comment bodies need `JSON_EXTRACT`
    - deleted repos leave their events behind, which is how both papers above see deleted scams
- [GitHub event types](https://docs.github.com/en/rest/using-the-rest-api/github-event-types): WatchEvent is a star; no event records notification delivery
- [OpenSSF Scorecard weekly scans](https://github.com/ossf/scorecard) of 1M projects in BigQuery `openssf:scorecardcron.scorecard-v2`
- [World of Code](https://arxiv.org/abs/2010.16196): "over 18B Git objects", author–commit–project cross-references, for identity studies
- ground-truth sets: StarScout on Zenodo; OctoWatch's Shai-Hulud set on request; DataDog and OpenSSF malicious package lists; AIDev agent PRs
- paper collection has Beyond the Stars full text

what is measured well vs open (agent judgement)

- well measured, do not redo
    - fake stars (StarScout, platform-wide, public data)
    - scam repo detection from README + graph + stats (OctoWatch, deployed, 4,000+ takedowns)
    - risky workflow patterns in bulk (Koishybayev, ARGUS, Kubo NDSS 2026)
    - LLM package hallucination rates (Spracklen 2025, Churilov 2026)
    - contribution attribution weakness (Holtgrave NDSS 2025)
    - agent PR acceptance (AIDev)
- open, with reasons
    1. GitHub as a malware CDN: comment and release attachments under trusted org URLs; only anecdotes exist; GH Archive has comment bodies, so it is measurable
    2. takedown speed and recidivism: StarScout saw 90% deleted and OctoWatch saw 47 new scam repos per day from fresh accounts; nobody measured time-to-removal for unreported scams or how actors return
    3. repojacking in practice: Aqua and VulnCheck counted candidates; nobody checked `uses:` references in workflows, which GitHub says are not redirected after renames; no peer-reviewed paper at all
    4. exploited vs exploitable CI: papers count patterns; incidents show chains (pwn request → cache → publish token); no tool follows the chain; Scorecard's weekly BigQuery history is unanalysed
    5. slopsquatting in the wild: 1 anecdote (30k downloads of an empty package); no measurement of agents installing hallucinated names or attackers registering them
    6. slop reports beyond curl: no detector, no cross-project numbers, labels subjective
    7. evasion: Stargazer repos average 15 stars, under StarScout's 50; StarScout's future work names repos that turn malicious in later commits
    8. notification and mention spam: posting is measurable, delivery is not

research ideas, ranked by (easy sell × easy to implement)

1. GitHub's CDN as malware host: measure attachment abuse
    - question: how much malware is served from `github.com/<org>/<repo>/files/…` and `github.com/user-attachments/…` URLs, how long do the files live, and does deleting the comment remove them
    - why it sells: trusted-domain URLs defeat URL reputation; the Apr 2024 Microsoft case shows the mechanism but nobody measured it; concrete fix for GitHub (scan or expire orphaned uploads)
    - data: GH Archive IssueCommentEvent and PullRequestReviewCommentEvent bodies via BigQuery, extract attachment URLs; URLHaus and VirusTotal for labels; our own repos for persistence tests
    - method
        - count attachment URLs per month, by hosting org, by file type (.zip, .exe, .rar)
        - fetch a sample, hash, check VirusTotal; cluster by hash and poster account
        - persistence test: upload benign files in our own issues, delete comment or never post, poll URL for weeks
        - survival analysis: how long malicious files stay reachable
    - expected: a few campaigns dominate; orphaned files persist; big-org URLs are chosen on purpose
    - risk: comments deleted before the hourly archive are missed; unposted uploads are invisible except through our own tests; VirusTotal quota
    - effort: low; 1 person, 1 month for a first result
2. repojacking of GitHub Actions and import paths
    - question: how many workflows, Go imports, and package metadata URLs point to renamed or deleted owners, how many of those names are retired by GitHub's 100-clone rule, and how many were re-registered by someone else
    - why it sells: tj-actions showed a hijacked action reaches 23,000 repos; GitHub says it "will not redirect calls to an action hosted by a renamed repository"; no academic measurement exists
    - data: workflow files from a popular-repo sample (Scorecard's 1M list or GH Archive PushEvents touching `.github/workflows`), deps.dev and Go module index for import paths; GitHub API for owner status (301 rename, 404 gone, 200 re-registered)
    - method: parse every `uses:` owner/repo, classify owner status, test retirement by asking GitHub whether the name is creatable (read-only check, never create), compare the owner's rename date with the history of references
    - expected: thousands of dangling `uses:` references; a measurable fraction of names already re-registered by unrelated accounts; retirement coverage lower for actions than for popular repos
    - risk: must never register a name; API limits; rename history is not public, so inference from GH Archive is needed
    - effort: low to medium
3. takedown latency and recidivism of scam repos
    - question: how long does a scam repo live before removal, what predicts survival, and do the same actors come back
    - why it sells: both ICSE 2026 and USENIX 2026 papers end at detection; GitHub's moderation speed is unknown; a systems-flavoured measurement with a clear policy lever
    - data: daily GH Archive stream; cheap scam signals from OctoWatch's paper (mimicked names, keyword-stuffed READMEs, several commits a day, release .zip links) or StarScout's lockstep stars; `git ls-remote` daily to detect deletion; the human's paper collection has OctoWatch's full text for feature definitions
    - method: cohort of suspect repos from day 0, poll until gone, survival curves by signal type and report status; link accounts via shared wallets, Telegram handles, release hashes to count returns
    - expected: heavy tail; unreported scams live weeks; actors recreate within days
    - risk: our detection is weaker than OctoWatch's, so label noise; reporting to GitHub changes what we measure (keep a no-report arm)
    - effort: medium; needs a daily pipeline for 2–3 months
4. Scorecard history: did incidents change behaviour
    - question: did Dangerous-Workflow, Token-Permissions, and Pinned-Dependencies rates move after GitHub's read-only token default, tj-actions (Mar 2025), and Shai-Hulud (Sept, Nov 2025)
    - data: BigQuery `openssf:scorecardcron.scorecard-v2`, weekly, 1M projects
    - method: interrupted time series around each date, split by popularity and ecosystem
    - expected: permissions improve (matches Huang and Lin), pinning stays low (71% unpinned per Datadog)
    - risk: Scorecard's project list drifts; a pure measurement paper with a modest story
    - effort: low; 2 weeks for a first plot
5. do coding agents install hallucinated packages
    - question: when a coding agent is told to use a package whose name is hallucinated, does it `pip install` it, and do registry warnings or lockfiles stop it
    - data: regenerate hallucinated names with Spracklen's prompts; a private mirror registry serving honeypot versions (never public registries); agents: Claude Code, Codex, Cursor, Copilot
    - method: sandboxed trials, count installs and whether the agent noticed a warning; monthly diff of hallucinated names against new PyPI/npm registrations and the OpenSSF malicious list
    - expected: non-trivial install rates without allow-lists; a small but non-zero set of names registered by attackers
    - risk: results go stale with agent versions; Churilov 2026 already covers the registrable-names part
    - effort: low to medium
6. chain-aware CI risk: trigger → cache/token → publish
    - question: how many npm/PyPI-publishing repos have an end-to-end path from an untrusted PR to a publish credential
    - data: Scorecard list joined with registries' repo URLs, workflow files, trusted-publishing flags
    - method: extend zizmor/poutine rules to model `pull_request_target`, cache sharing, and publish job scopes; validate in forks we own
    - expected: fewer end-to-end paths than single flags, concentrated in popular packages
    - risk: ARGUS, Trajan, Wang et al. 2026 are close; novelty only if the chain modelling finds what they miss; disclosure load
    - effort: medium to high
7. low-volume fake stars and late-turning repos (extending StarScout)
    - question: can lockstep detection work under 50 stars, and how often does a repo go malicious after gaining real stars
    - data: StarScout Zenodo data plus new GH Archive months; OctoWatch's Stargazer set averages 15 stars
    - risk: crowded by the 2 published groups; a methods increment
8. slop report measurement beyond curl
    - question: what share of security reports and issues across projects are low-effort AI output, and what does it cost maintainers
    - data: public HackerOne disclosures, GitHub issues in AIDev repos, maintainer survey
    - risk: labels subjective; detectors invite evasion; overlaps the sibling LLM detection study

ideas to avoid, and why

- another workflow pattern scanner: ARGUS, zizmor, poutine, Scorecard, CodeQL, Trajan, and 3 big prevalence papers exist; the Codex draft's proposal 1 is close to ARGUS (2023) and must show missed chains to matter
- another fake-star detector or README classifier: StarScout and OctoWatch are published with data; only evasion or low-volume work adds
- buying stars, registering hijackable names, or uploading real malware to test: ethics boards and GitHub policy forbid; use read-only checks and benign files in own repos
- a generic "AI slop detector": no ground truth, and the sibling LLM detection study already says text detection is unreliable
- counting phishing pages on GitHub Pages: overlaps the sibling [web measurement](../../web_llm_detection/web_user/phishing/index.md) work

first-week experiments for the top 3

- idea 1: 1 BigQuery query over 1 month of IssueCommentEvent bodies for `/files/` and `user-attachments` URLs; count, group by org; download 100, hash, VirusTotal; upload 3 benign files to own repo, delete comment, re-check in 7 days
    - go if ≥1% of binary attachments are flagged or if orphaned uploads persist
- idea 2: take 10,000 popular repos' workflows, parse `uses:`, HEAD-request each owner; count 301/404; go if dangling references are in the hundreds
- idea 3: pull 1 day of GH Archive CreateEvents, apply the mimicked-name rule (name seen in a benign repo <10 days earlier) plus a release .zip link; poll 200 candidates daily for 7 days; go if ≥20% vanish and manual check confirms most were scams
