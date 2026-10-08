# removal services, data brokers, and the right to be forgotten
(authored by agents unless marked 🧑)

short version

- words
    - data broker: a company that collects and sells personal data about people who are not its customers
    - people search site: a data broker whose website lets anyone look a person up by name
    - removal service: a paid service that sends removal requests to brokers for you, e.g. DeleteMe, Incogni, Optery
- what the literature already shows, 2022–2026
    - asking is hard and many brokers ignore you
    - paid removal services remove about a third to a half of what they find
    - asking for removal makes you hand over more personal data
- what nobody has measured, as far as I found
    - whether a removed profile stays removed
        - every study stops at 2–4 months
    - whether data that was supposed to be deleted shows up in later breaches
        - the human's idea; one famous case exists, no systematic study found
    - whether California's new one-stop deletion portal works for real people
        - brokers had to start processing its requests on 1 Aug 2026
        - the 90-day window concerns status reporting, not a deletion deadline
- my three strongest ideas, details under "research ideas"
    - 1: watch real profiles before and after a California portal request, and keep watching for a year
    - 2: use public breach notices to count how much breached data should already have been deleted
    - 3: plant made-up identities with unique email addresses to see whether opting out leaks your data
- these rankings are my opinion; no prototype or pilot exists

scope and evidence

- reviewed 7 Oct 2026 UTC, starting from the [human's note](../../../removal_services.md)
    - 🧑 the idea I build on: "find out if exercised when data breach occur"
- evidence labels used below
    - read: I read the relevant sections of the full text
    - abstract: I read only the abstract
    - snippet: I only saw a search result summary; check before relying on it
- carried over from the Codex agent's first version: its close reading of the Consumer Reports study
- ChatGPT consultation was not possible: the tool failed with "account_ui_login_required"
- I did not chase every citation chain; law review articles on the right to be forgotten are mostly left out

how removal works today

- people search sites build profiles from public records, other brokers, and web crawls
    - He et al. 2025, read: "web crawls, public records, online activity, self-reported information and other data brokers"
- to get out you ask each broker separately, or pay a service to ask for you
- the laws
    - EU GDPR article 17: right to erasure, also called the right to be forgotten
    - California CCPA: right to delete, and right to opt out of sale
        - a delete request needs identity verification; an opt-out must not require it
    - California Delete Act: brokers must register; the state runs one portal named DROP that sends your delete request to every registered broker
        - correction checked 8 October against [CalPrivacy's instructions](https://privacy.ca.gov/drop/how-drop-works/): “Data brokers have up to 90 days to report how they processed your request”
        - the 90-day status-reporting window must not be described as the deletion deadline
        - official instructions separately describe continuing checks and deletion of newly matching data at least every 45 days
        - same article: "Currently over 600 data brokers are in the registry"
        - snippet: the portal opened to residents on 1 Jan 2026; "more than 290,000 deletion requests have been submitted"
- search engines are a separate path: Google can hide a result without the source page changing

what prior work found

do removal services work?

- Grauer, Kauffman, Honeywell, [Data Defense: Evaluating People-Search Site Removal Services](https://www.documentcloud.org/documents/25034333-evaluating-people-search-site-removal-services_8824-1/), Consumer Reports, 2024; read by the Codex agent
    - 32 volunteers from California and New York, 7 paid services plus a do-it-yourself group, 13 people search sites, checks after 1 week, 1 month, 4 months
    - paid services: 117 of 332 profiles gone after 4 months, about 35%
    - do-it-yourself: about 70% gone
        - the report's text and its table 2 disagree slightly, 36/47 vs 70%; use the raw counts
    - limits, in the report's words: "We also did not test for the reappearance of profiles" and "not statistically significant or nationally representative"
    - once a profile disappeared they stopped checking it, and they only checked the original URL
- He, Snyder, Haddadi, Bustamante, Tyson, [Measuring the Accuracy and Effectiveness of PII Removal Services](https://petsymposium.org/popets/2025/popets-2025-0125.php), PoPETs 2025; read
    - 10 services surveyed, covering 2,024 brokers; 71 participants used 4 of the services
    - services disagree on which brokers matter: "average Jaccard similarity of 0.21", "only 10 data brokers common to all services"
    - most "found" records are someone else: "only 41.1% of records identified by these services were PII about themselves"
        - so a service may remove strangers' records, and may hand your data to brokers that never had it
    - "only 48.2% of records successfully removed"
    - outcomes come from what the service's dashboard says and what participants report; the authors did not watch broker sites themselves over time
    - they ask for "free alternatives that streamline data removals"
- snippet only, unverified vendor-style claim: "61% of records reappear within six months after opt-out"
    - I could not find a paper behind this number

do brokers obey requests?

- Take et al., [What to Expect When You're Accessing](https://petsymposium.org/popets/2024/popets-2024-0118.pdf), PoPETs 2024; read
    - researchers sent access and removal requests for themselves to 20 people search sites
    - "four main groups are behind 14 of the sites studied"
        - removing from one site in a group can remove from its sister sites
    - "No reappearance was observed after two months"
        - a handful of researchers, one follow-up check
    - sites refuse access by calling the data public: the CCPA definition of personal information "does not include publicly available information"
- Take et al., ["It Feels Like Whack-a-mole"](https://petsymposium.org/popets/2022/popets-2022-0067.php), PoPETs 2022; abstract
    - interviews with 18 people who tried removal; they report that data comes back
    - reports, not measurements
- van Kempen et al., [Consumer Beware! Exploring Data Brokers' CCPA Compliance](https://arxiv.org/abs/2506.21914), IEEE S&P 2026; abstract
    - access requests to "all 543 officially registered data brokers"; "Above 40% failed to respond at all"
    - brokers "requested personal information as part of their identity verification process, including details they had not previously collected"
- van Kempen, Tsudik, Jhunjhunwala, Raja, [Let My Data Go](https://arxiv.org/abs/2607.04552), arXiv Jul 2026; read
    - delete and opt-out requests to 322 registered brokers using two made-up people
    - only 97 of 322 answered the delete request with a result
    - 22% verified identity for opt-outs, which the rules do not allow
    - some answered that data "was deleted" for a person who never existed
    - their own stated limit: "it did not evaluate the actual efficacy of submitting delete and opt-out requests. Doing that would require using real identities"
    - their stated future work: evaluate DROP "once it is fully operational", and repeat with real people
        - so this group will likely do a DROP study; anyone else has to be fast or different
- Sun, Vekaria, Nithyanand, [On the Suitability of LLM-Driven Agents for Dark Pattern Audits](https://arxiv.org/abs/2603.03881), PoPETs 2026; abstract
    - an LLM browser agent walked through access request forms on "456 data broker websites"
    - it audits the forms for manipulative design; it does not test whether deletion happens
- Consumer Reports, [authorized agent study](https://innovation.consumerreports.org/CR_AuthorizedAgentCCPA_022021_VF_.pdf), 2021; snippet
    - opt-outs for 124 Californians to 21 companies; 12 of 21 confirmed they stopped selling

does deletion happen at ordinary online services?

- Rupp, Syrmoudis, Grossklags, [Leave No Data Behind](https://petsymposium.org/popets/2022/popets-2022-0080.pdf), PoPETs 2022; read
    - made accounts at 90 services, asked for erasure, then "More than six months later" sent access requests "to find out if and what data remains"
    - "At 27%, the share of non-compliant services is not negligible"
    - limit: a service that kept the data can simply answer that it has none
- European Data Protection Board, [2025 coordinated enforcement report on the right to erasure](https://www.edpb.europa.eu/system/files/2026-02/edpb_cef-report_2025_right-to-erasure_en.pdf), Feb 2026; snippet
    - 32 regulators questioned 764 organizations; recurring problems include unclear retention periods and data left in backups
    - based on what organizations say about themselves
- Potter et al., [SoK: The Gap Between Data Rights Ideals and Reality](https://arxiv.org/abs/2312.01511); abstract
    - reviews "201 interdisciplinary empirical studies, news articles, and blog posts"; a good map of the wider field
- Bertram et al., Five Years of the Right to be Forgotten, CCS 2019; snippet
    - Google's own data on 3.2 million URLs people asked it to hide; "1,000 requesters generated 16% of requests"

the removal process is itself a risk

- Di Martino et al., [Personal Information Leakage by Abusing the GDPR 'Right of Access'](https://www.usenix.org/conference/soups2019/presentation/dimartino), SOUPS 2019; snippet
    - pretended to be someone else at 55 organizations; 15 handed over that person's data
- Pavur and Knerr, [GDPArrrrr](https://arxiv.org/abs/1912.00731), 2019; snippet
    - same attack against more than 150 businesses
- Krebs, [Mozilla Says It's Finally Done With Two-Faced Onerep](https://krebsonsecurity.com/2025/11/mozilla-says-its-finally-done-with-two-faced-onerep), 2025; snippet
    - the founder of removal service Onerep also founded people search sites, including Nuwber
- National Public Data, a background check broker, was breached in 2024; about 2.9 billion records leaked, per news reports; snippet
    - a broker breach makes later removal from that broker pointless

what people do after a breach

- Mayer, Zou, Schaub, Aviv, ["Now I'm a bit angry"](https://www.usenix.org/conference/usenixsecurity21/presentation/mayer), USENIX Security 2021; read
    - showed 413 people real breaches that exposed their email address, using Have I Been Pwned
    - "Participants were unaware of 74% of displayed breaches"
    - of the breach cases where the person described what they did: "18 (13%) deleted or deactivated the account"
        - the same passage gives "87, 61%" for password changes, so the base is about 143 cases
        - self-reported; says nothing on whether the company then erased anything
- Zou et al., ["I've Got Nothing to Lose"](https://www.usenix.org/conference/soups2018/presentation/zou), SOUPS 2018; read in part
    - 24 interviews after Equifax: "few knew whether they were affected, and even fewer took protective measures"
- Bhagavatula and Bauer, [(How) Do people change their passwords after a breach?](https://arxiv.org/abs/2010.09853) and [What breach?](https://arxiv.org/abs/2010.09843); read in part
    - real browsing and password data instead of surveys
    - "only 33% of the 63 changed their passwords"
    - "only 16% of our 303 participants visited an incident-related web page"
- Ashley Madison, the one known case of a breach exposing fake deletion
    - FTC, [2016 settlement](https://ftc.gov/news-events/press-releases/2016/12/operators-ashleymadisoncom-settle-ftc-state-charges-resulting); snippet
    - users paid $19 for "Full Delete"; the 2015 breach contained their data anyway
- I found no study of deletion requests after a breach, in either direction
    - neither "do people ask for deletion after a breach"
    - nor "do breaches show that deletion was not done"

tools from neighboring work

- DeBlasio et al., Tripwire, IMC 2017; read
    - registered unique fake accounts at "more than 2,300 sites"; a later login to the matching email account proved the site was breached; "detected 19 site compromises"
- Farooqi et al., [CanaryTrap](https://arxiv.org/abs/2006.15794), PoPETs 2020; read
    - gave each of 1,024 Facebook apps a unique email address, then watched which addresses got unexpected mail
- [Understanding Data Collection, Brokerage, and Spam in the Lead Marketing Ecosystem](https://arxiv.org/abs/2604.06759), arXiv 2026; snippet
    - 105 made-up profiles entered into marketing forms; opt-outs reduced calls and mail but none stopped them
    - closest prior work to idea 3, but about marketing forms, not people search sites or removal services
- Thomas et al., Ethical issues in research using datasets of illicit origin, IMC 2017; read
    - what a paper must justify before touching leaked data

research ideas

1: does removal last, and does the California portal work? my top pick

- question: after a real person asks for deletion, when does their profile leave people search sites, and does it come back?
- why now
    - brokers had to start processing portal requests on 1 Aug 2026
    - observe profiles before each new request to establish their starting state
    - my recommendation: compare independently observed accessibility with portal-reported status
- what to build: a crawler that looks a consenting person up on 20–50 people search sites every week and records what is shown
    - search by name, city, and old addresses, since a removed profile can return under a new URL
    - a person confirms each match, since He et al. show most automatic matches are wrong
- compare three groups of volunteers: state portal, one paid service, no request
    - people outside California are a natural no-portal group
- outcomes: share of profiles gone at 90 days, share back at 6 and 12 months, and how often the portal or dashboard says "deleted" while the profile is still up
    - 90 days is a chosen observation point, not an asserted deletion deadline
- risks
    - Tsudik's group names this as future work
    - people search sites block crawlers
    - many people search sites claim their data is public and outside the law, so the portal may not touch what people care about most; that would itself be a finding
    - needs ethics board approval and volunteers
- cheap first step: 5 volunteers, 10 sites, 4 weeks, to learn whether crawling and matching are reliable

2: do breaches expose data that should have been deleted? the human's idea

- I read "find out if exercised when data breach occur" two ways; I am not sure which was meant
    - a: a breach shows whether erasure really happened
    - b: people ask for erasure after a breach
- a, without touching stolen data
    - US states publish the breach notice letters companies must file, e.g. California, Maine, Massachusetts
    - read each letter and the company's own statements: how many victims were former customers, rejected applicants, or closed accounts, and how old was the data?
    - from my memory, unchecked: AT&T 2024, T-Mobile 2021, and Optus 2022 all said former customers were affected
    - compare with the retention period the company's privacy policy promised
    - output: "x% of breached records belonged to people who had already left", a number I did not find anywhere
    - an LLM can label thousands of letters; a person checks a sample
    - weakness: letters are vague, so many will say nothing about how old the data was
- a, stronger but slower: planted accounts
    - combine Tripwire and Rupp et al.: make unique accounts at many services, ask for deletion, keep the email addresses alive for years
    - any later mail, login attempt, or appearance in Have I Been Pwned for a deleted account proves the data survived
    - catches services that would lie in answer to an access request
    - weakness: breaches are rare, so results take years; mail after deletion is the faster signal
- a, with surveys: repeat Mayer et al. and ask people whether they had closed the account before the breach date
    - cheap, but memory is unreliable
- b: do deletion requests rise after a breach?
    - big companies must publish yearly counts of delete requests under CCPA; registered brokers report theirs to the state registry
    - compare a breached company's counts the year before and after, against similar companies with no breach
    - weakness: yearly numbers and few breached companies with published counts; I expect a weak result
    - finer signal: search interest in "delete [company] account" by week

3: does opting out leak your data?

- question: when you opt out, or a removal service does it for you, does the contact data you hand over get used or passed on?
- why it matters: opting out requires giving brokers your email, phone, and sometimes ID, and some removal services are tied to brokers
- method: made-up people, each with a unique email address and phone number per broker or service, never used anywhere else
    - any mail or call to that address shows that this broker used or shared it
    - van Kempen et al. already sent made-up identities to 322 brokers but with only two identities, so they could not tell who leaked
- easy to build: email addresses on our own domain, a few hundred forms, then wait
    - the LLM form-filling agent of Sun et al. shows the forms can be driven automatically
- risks
    - testing paid removal services needs real-looking customers and money
    - a null result is likely for big brokers; the interesting cases are the long tail of small sites
    - sending made-up requests costs brokers time; ethics review needed

smaller ideas

- map who owns which people search site, using shared hosting, page templates, and opt-out form backends
    - Take et al. found 4 groups behind 14 sites by hand; He et al. list 2,024 brokers
    - output: the shortest list of opt-outs that covers the most sites
- a free open opt-out agent, measured against paid services
    - He et al. ask for it; unpaid open-source attempts already exist, so the research part would be the measurement, which is idea 1
- where does a profile come back from?
    - plant a new fact about a consenting person in one source, e.g. a change of address form, and time its arrival at each broker
    - shows which upstream source to cut; slow and ethically touchy

what I would skip

- another one-shot count of how many brokers answer requests: done three times since 2024
- another short test of paid removal services: done twice
- anything that needs downloading breach dumps: legal and ethical cost is high and idea 2 does not need it

open checks before starting

- read the full Consumer Beware paper and the EDPB report; I only saw summaries
- search again for a DROP evaluation; one may appear any week
- confirm which states publish breach letters in bulk and how far back
- ask whether the human meant reading a or b of their breach idea

8 October measurement constraint

- [CalPrivacy's status page](https://consumer.drop.privacy.ca.gov/dropstatus): “status updates can take up to 90 days to appear in DROP depending on data broker workflows”
    - quote checked through the primary page's search-visible text
    - direct agency landing-page retrieval returned HTTP 403
- compare request time, independently observed accessibility, and provider-reported status separately
    - a pending status alone does not establish that a broker still exposes a record
    - broker-reported deletion alone does not establish downstream deletion or lasting removal
    - reappearance may be a new collection rather than retained old data
- the agency's published reporting window is a measurement constraint
    - this update does not audit legal compliance
