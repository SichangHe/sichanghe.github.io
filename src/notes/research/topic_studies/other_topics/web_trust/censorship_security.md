# censorship circumvention and large web security holes
(authored by agents unless marked 🧑)

where I would start

- recommendation: test whether a proxy chain keeps different users' requests and responses separate
  - small local experiments can expose failures with large consequences
  - HTTP parsing research through August 2026 makes a generic request-smuggling scanner a weak novelty claim
  - a stronger question is whether an explicit isolation rule survives translation, caching, retries, and connection reuse
- recommendation: study censorship-tool recovery when several dependencies fail together
  - focus on usable systems mechanisms rather than another inventory of blocked websites
  - Snowflake already supplies a deployed system and concrete unanswered questions
- uncertainty: these are promising starting points, not established new research contributions
  - reproduce existing work before claiming novelty

scope and evidence

- human motivation in [research/index.md](../../../index.md): “how to fight censorship” and “what are the huge security holes”
- sources checked on 7 October 2026 UTC
  - papers below are selected mechanism studies, not a complete census of web vulnerabilities
  - Geneva and five other academic papers were downloaded as full PDFs
  - Snowflake's author-maintained HTML provides additional deployment notes
  - industry research is identified separately from peer-reviewed papers
- web search tool failed with “Cannot POST /alpha/search”
  - primary sources were retrieved directly over HTTPS instead
  - therefore recent-paper coverage is incomplete

first principles

- censorship resistance means maintaining communication despite a censor's interference
  - encryption hides contents but can leave a recognizable protocol or reachable address to block
  - the censor's willingness to block ordinary traffic determines which disguises work
- a large security hole can appear between individually reasonable components
  - one component interprets a request differently from another
  - a routing exception bypasses a protection that users expect to cover everything
  - a device sends a response without checking that the apparent sender initiated a real connection
- inference: agreement between components deserves a research target of its own
  - measure the security consequence of disagreement, not merely the number of unusual inputs accepted

censorship mechanisms and prior work

- [Bock, Hughey, Qiang, and Levin, Geneva, CCS 2019, abstract](https://geneva.cs.umd.edu/papers/geneva_ccs19.pdf)
  - authors: “four basic packet manipulation primitives (drop, tamper headers, duplicate, and fragment)”
  - mechanism: search combinations of packet changes that confuse the censor while the destination still accepts the connection
  - method: laboratory experiments and real censors in China, India, and Kazakhstan
  - contribution: automatically rediscover earlier strategies and generate new ones
  - limit: the paper's results establish success against tested censor behaviors, not future resistance everywhere
  - [project's explicit limit](https://geneva.cs.umd.edu/): “Geneva cannot be used to circumvent blocking of IP addresses”
  - research implication: a local strategy-validation suite can check whether an evasion also breaks application delivery
    - a successful HTTP status alone is weaker than confirming the correct response body and intact session
- [Frolov et al., Conjure, CCS 2019, abstract](https://jhalderm.com/pub/papers/conjure-ccs19.pdf)
  - authors: “leveraging unused address space at deploying ISPs”
  - mechanism: a cooperating Internet provider creates proxy behavior at an otherwise unused address
  - method: protocol design, security analysis, and a prototype on an Internet-provider testbed
  - claimed advantage: fewer practical limitations than TapDance's reliance on real decoy websites
  - limit: deployment needs cooperating network operators
  - inference: a new end-to-end deployment is a poor first project without an operator partner
    - a controlled study of failure recovery or registration remains feasible
- [Wu et al., fully encrypted traffic blocking, USENIX Security 2023, abstract and introduction](https://www.usenix.org/system/files/usenixsecurity23-wu-mingshi.pdf)
  - authors: “the censor applies crude but efficient heuristics”
  - mechanism: exempt traffic resembling allowed protocols, then block remaining apparently random traffic
  - method: infer rules from experiments and test them against university traffic
  - evidence concerns China's blocking introduced in November 2021
  - the estimated 0.6% collateral blocking is conditional on applying inferred rules broadly
    - it is not a measured worldwide false-positive rate
  - authors' limit: “our inferred rules may not be exhaustive”
  - research implication: passing an old classifier is insufficient evidence for a durable disguise
    - evaluate families of plausible changed classifiers and ordinary-traffic costs
- [Bocovich et al., Snowflake, USENIX Security 2024, abstract and sections 2–6](https://www.bamsoftware.com/papers/snowflake/)
  - authors: “its client switches to another on the fly, invisibly to upper network layers”
  - mechanism: many temporary browser proxies, WebRTC connections, and a persistent session across proxy replacements
    - WebRTC supplies browser-to-browser communication and connection establishment
  - method: deployed-system experience and blocking case studies in Russia, Iran, China, and Turkmenistan
  - limit: a large proxy pool does not remove dependencies on finding a proxy and establishing the connection
  - authors' future-work question: “How might proxy enumeration attacks be inhibited?”
    - enumeration means repeatedly asking for proxies to learn addresses that can then be blocked
  - authors' traffic-splitting result: “Our initial experiments did not show enough benefit to justify the change”
    - do not present splitting traffic across several proxies as an unexplored idea
  - the full paper's central lesson: resistance depends on the particular censor's resources and tolerance for collateral blocking

security holes connected to these mechanisms

- [Bock et al., Weaponizing Middleboxes for TCP Reflected Amplification, USENIX Security 2021, abstract](https://www.usenix.org/system/files/sec21-bock.pdf)
  - authors: “hundreds of thousands of IP addresses that offer amplification factors greater than 100×”
  - mechanism: a filtering device emits a large reply to traffic appearing to come from a victim
  - method: search packet sequences and conduct Internet-wide IPv4 scans
  - consequence: the filter itself can multiply traffic directed at the victim
  - limit: observed addresses are not necessarily distinct physical devices
  - inference: useful follow-up is a local defense that bounds replies without breaking legitimate filtering
    - merely repeating the address census would duplicate web measurement work
- [Xue et al., Bypassing Tunnels, USENIX Security 2023, abstract and introduction](https://www.usenix.org/system/files/usenixsecurity23-xue.pdf)
  - authors: “248 experiments against 67 of the most representative VPN providers”
  - mechanism: manipulate exceptions for local-network traffic or the VPN server so other traffic bypasses the VPN
  - method: tests across Windows, macOS, iOS, Linux, and Android
  - authors' finding: attacks are “independent of the cryptographic protocol being used”
  - limit: the reported vulnerable proportions concern separate experimental sets for two attacks
    - do not interpret them as percentages of all VPN products today
  - technical distinction: bypassing VPN encryption does not remove application-layer HTTPS encryption
  - existing defense in section 6: policy-based routing separates VPN-process traffic from other application traffic
  - section 8 identifies earlier tools that already test temporary-disconnection leakage
  - research implication: check the promise that traffic stays inside the tunnel across network changes and reconnects

industry research on HTTP component disagreement

- [James Kettle, HTTP Desync Attacks: Request Smuggling Reborn, Black Hat/DEF CON 2019](https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn)
  - author: “it's crucial that the back-end agrees with the front-end about where each message ends”
  - mechanism: two servers disagree about request boundaries on a shared connection
    - part of one user's request becomes part of another user's request
  - method: disclosed case studies and released detection tooling
  - limit: case studies and bounty totals do not estimate prevalence
- [James Kettle, HTTP/2: The Sequel is Always Worse, Black Hat/DEF CON 2021](https://portswigger.net/research/http2)
  - author: “widespread HTTP/2 downgrading”
  - mechanism: a front server accepts HTTP/2 but rewrites it into HTTP/1 for the next server
  - contribution: new disagreement paths and practical request-tunnelling techniques
  - limit: this does not imply that using HTTP/2 throughout the server chain is inherently worse
- [Martin Doyhenard, Gotta cache 'em all, 2024](https://portswigger.net/research/gotta-cache-em-all)
  - author: “URL parsing discrepancies that exist between different application servers and CDN proxies”
  - mechanism: the cache and application disagree about which resource a URL names
    - a private page may be stored as if it were a public file
  - method: compare parsers and demonstrate cache poisoning and private-content leakage
  - limit: special paths only cause leakage when application behavior and cache rules combine incorrectly
- [James Kettle, HTTP/1.1 Must Die, 2025](https://portswigger.net/research/http1-must-die)
  - author: “poor request separation”
  - mechanism: connection reuse combines with handling of body lengths, early responses, and special headers
  - evidence: disclosed commercial case studies and mitigation discussion
  - author's recommendation to use HTTP/2 upstream is an engineering judgment
    - it is not a proof that HTTP/2 eliminates every isolation failure
- [Tom Stacey and Tobia Righi, CRLF-Powered Desync Attacks, August 2026](https://portswigger.net/research/crlf-powered-desync-attacks)
  - authors: “enable HTTP/2 upstream”
  - mechanism: injected line breaks create additional HTTP headers or requests during forwarding
  - contribution: ways to produce browser-driven impact even when connections are isolated by client or IP address
  - method: disclosed case studies, tools, and example laboratories
  - limit: concrete implementation and configuration failures do not establish universal vulnerability
  - inference: novelty now requires going beyond ordinary malformed-header scanning

proposal 1: verify isolation across a complete proxy chain

- question: can the chain prove which user owns every request and response after transformations?
- hypothesis: some fixes reject known bad inputs but leave isolation failures during retries, early responses, or protocol translation
- minimum experiment
  - construct local chains from two proxy implementations and two small applications
  - label each user's request and response with unique random markers
  - vary protocol translation, connection reuse, body cancellation, retries, and cache behavior
  - compare each component's interpretation and the final owner of every response
- meaningful outcome
  - a minimized counterexample that crosses users despite an enabled defense
  - or a precise rule with checked coverage of the transformations exercised
- comparison
  - known attack corpus from Kettle, Doyhenard, and Stacey/Righi
  - strict input validation, upstream HTTP/2, and disabled connection reuse
- metrics
  - cross-user response errors, false alarms, rejected legitimate requests, throughput, and extra latency
- contribution must exceed a new combination of old attack strings
  - a reusable isolation check or a previously missing explanation of which transformations violate it
- estimated pilot: 2–3 weeks for one researcher
  - assumption: familiar with HTTP and containerized services
  - local test services only; no experiment requires traffic from unrelated users
- stop condition: existing tools expose every failure with no additional explanatory or defensive value

proposal 2: keep circumvention sessions working through combined failures

- question: which recovery decision best preserves a session when proxy loss combines with discovery or connection-establishment failure?
- hypothesis: deciding from dependency state avoids repeated unsuccessful proxy changes
- minimum experiment
  - run a local Snowflake deployment with temporary proxies
  - inject proxy disappearance, failed discovery requests, blocked connection-establishment ports, delay, and packet loss
  - compare existing retry behavior with a policy that records which dependency failed
- metrics
  - completed transfers, time without progress, recovery time, extra traffic, and repeated failed attempts
- comparison
  - unmodified Snowflake
  - simple time-based retry
  - sequential replacement and any existing traffic-splitting implementation
- intended contribution: a concrete recovery mechanism and reproducible failure suite
  - connection completion under laboratory failures is not proof of resistance to a national censor
- estimated pilot: 2–4 weeks
  - assumption: existing local deployment is reproducible without production broker access
- stop condition: improvement disappears under realistic proxy lifetimes or the policy creates a distinctive protocol pattern

proposal 3: make VPN traffic confinement a repeatable check

- question: does the promise of keeping traffic in the tunnel survive network changes, DNS changes, and restart?
- hypothesis: transition handling leaves a gap even when steady-state routing passes leakage tests
- minimum experiment
  - one Linux client, one VPN endpoint, and two simulated local networks
  - generate marked application traffic to owned endpoints
  - change routes, addresses, DNS responses, and VPN connection state
  - record exactly which packets leave outside the tunnel
- comparison: existing client protections and a rule allowing only authenticated tunnel-endpoint traffic outside the VPN
- metrics: unauthorized bytes outside the tunnel, recovery delay, and blocked legitimate connections
- novelty risk: disconnection leakage is already tested by earlier tools discussed in Xue et al.'s section 8
  - contribution must separate new transition failures from existing leakage tests and documented routing exceptions
- estimated pilot: 1–2 weeks
  - assumption: Linux networking expertise
- limitation: Linux evidence alone does not establish behavior on phones or other operating systems

what to read before choosing

- choose HTTP isolation for the smallest self-contained systems experiment
  - read all five HTTP studies above before defining novelty
- choose censorship recovery if deployment experience is the desired contribution
  - read Snowflake sections 2, 5, and 6 first
- choose VPN confinement for the shortest defensible reproduction-and-extension pilot
  - read Xue et al.'s countermeasures before designing the rule
- independent file review found no broken local reference
  - reviewer questioned the UTC date; `date -u` confirmed 7 October 2026
- requested ChatGPT consultation at Extra High failed before submission
  - helper reported `terminal_prepare_failed` and `TimeoutError`
  - no ChatGPT opinion is incorporated
- unresolved work
  - systematic 2025–2026 academic search after search-tool recovery
  - full examination of the released HTTP tools and current proxy versions
  - independent review of novelty against those implementations

8 October update: closest work that changes the recovery proposal

- history: the earlier review used direct source retrieval after its search tool failed
  - a working search connector now supplied targeted citation checks
  - the added papers below were downloaded and inspected at the stated depth
- recommendation: retain combined-failure recovery as a hypothesis
  - compare against existing migration and broker defenses before treating it as a new mechanism

- Kon et al., [SpotProxy: Rediscovering the Cloud for Censorship Circumvention](https://www.usenix.org/conference/usenixsecurity24/presentation/kon), USENIX Security 2024
  - authors, abstract: "allows clients to seamlessly move between proxies"
  - mechanism: replace cloud proxy instances for cost and address turnover while moving active sessions
    - implements migration for WireGuard and Snowflake
  - evidence: prototype migration experiments, historical cloud-price analysis, and simulated censor behavior
  - limit: continued connections during controlled migration do not establish survival of discovery failure or network-wide blocking
    - price results depend on the study's cloud instances, time period, and network-cost assumptions
  - reading depth: introduction, architecture, active-migration setup, and cost-analysis limitations
  - novelty implication: moving an active Snowflake session to another proxy is already implemented work
- Sun and Shmatikov, [Differential Degradation Vulnerabilities in Censorship Circumvention Systems](https://arxiv.org/abs/2409.06247), September 2024 preprint
  - authors, introduction: "detection is not necessary for blocking"
  - mechanism: impair a shared channel so browsing fails while its cover application remains usable
    - a cover application is the ordinary application whose traffic carries circumvention data
    - selectively impaired WebRTC channels or video delivery exploit different application requirements
  - evidence: laboratory Snowflake and Protozoa attacks and a modified Protozoa system called Ciliate
  - limit: application versions, channel assumptions, and laboratory workloads determine the observed impairment
    - Ciliate changes the tradeoff and introduces potential multiple-flow detection risks
    - it does not establish universal circumvention resistance
  - reading depth: main attack mechanism, threat model, selected evaluation, and defense tradeoffs
  - implication: a protocol that looks ordinary can still fail disproportionately under deliberately worsened network conditions
- Chen, Sangha, Bocovich, and Raman, [Evaluating Practical Enumeration and Blocking Attacks on the Snowflake Circumvention System](https://arxiv.org/abs/2609.12242), September 2026 preprint
  - downloaded paper identifies a forthcoming CCS 2026 proceedings version
  - authors, discussion: "the nominal size of a proxy pool is not, by itself, an adequate measure"
  - method: two bounded probers over 48 days in May–June 2025
    - observe more than 21,000 proxy addresses without completing proxy connections
    - use the actual broker logic with simplified clients and proxies for 30-day simulations
  - finding: stable, high-capacity proxies are disproportionately visible and valuable to blockers
    - broad network blocking can affect many observed proxies even when few popular web domains are hosted there
  - limit: no live blocking experiment
    - domain overlap does not count wider harms to residential connectivity, games, or peer-to-peer applications
    - simulator omits packet-level WebRTC/Tor traffic, loss, and latency
    - absolute simulated retry counts depend on connection duration and simplified churn
  - proposed defenses include scheduled proxy polling and client-rate controls
    - paper reports proxy-poll enforcement merged in August 2026
    - this is the paper's report, not a fresh audit of the deployed service
  - reading depth: threat model, live/simulation methods, mitigations, limitations, and selected appendix sensitivity checks
  - reusable baseline: [authors' broker simulator](https://github.com/r-andlab/snowflake-enumeration/blob/main/general-simulation/broker/README.md)

revised experiment for proposal 2

- question: which recovery policy avoids a repeated unsuccessful dependency while retaining completed application transfers?
- compare unmodified Snowflake, SpotProxy migration where reproducible, and the released enumeration simulator's broker defenses
- distinguish failures
  - proxy lost after a session started
  - broker unreachable before a replacement is found
  - available proxy incompatible with the client's network
  - shared channel degraded so application progress fails
- preserve the same proxy supply, failure trace, and legitimate client load across comparisons
- measure recovery time and completed transfers together with broker demand and proxy exposure
  - lower retry traffic can improve availability while revealing a stable proxy more often
- the broker simulator cannot establish packet-level application recovery
  - reproduce its assignment results separately from a smaller local packet-level deployment
- possible contribution: a tested policy for dependency-specific combined failures
  - merely adding session migration duplicates SpotProxy and Snowflake's existing session layer
  - merely measuring enumeration duplicates the September 2026 paper
- stop condition: an existing mechanism handles the same failures at equal discovery cost and exposure
- remaining gap: released implementations and current Snowflake behavior were not executed here
  - the revised proposal is a literature-grounded hypothesis
