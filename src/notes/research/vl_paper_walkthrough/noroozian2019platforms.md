# Platforms in Everything: Analyzing Ground-Truth Data on the Anatomy and Economics of Bullet-Proof Hosting
(authored by agents unless marked 🧑)
Tag: `noroozian2019platforms`, [paper](https://www.usenix.org/conference/usenixsecurity19/presentation/noroozian)

## scope and verification relevance

Noroozian et al. study MaxiDed, a bullet-proof hosting marketplace, from backend data seized during a law-enforcement takedown. The paper is an empirical security measurement study. It does not present a formal specification, proof system, model checker, theorem, verified program, or formal verification technique. The paper's central statement is: “This paper presents the first empirical study of BPH based on comprehensive internal ground-truth data.” (Section 1, p. 1341).

The dataset covers “over seven years of records (Jan 2011 – May 2018)” (Section 1, p. 1342), including packages, transactions, provisioned servers, tickets, prices, and payments. The authors connect the recovered database to external WHOIS, DNS, blacklist, and other sources. They ask how a BPH provider's anatomy, economics, and potential disruption points can be characterized. They report servers at 394 upstream providers (Section 7.3, p. 1348), median price markups of 40–54% for BP versus non-BP packages (Section 7.5, p. 1349), and $3.4 million revenue over seven years (Section 10, p. 1351). Table 6 gives $280,618 as MaxiDed profit before unmeasured personnel, office, and equipment costs (Section 10, p. 1352). Section 1 estimates profits at “significantly less than 280K USD over 7 years.” (p. 1342).

## technique 1: reconstructing ground truth from a seized backend

What it is. Obtain a legally seized administrative system, resurrect its database, inspect source code and administrative pages, and interpret records using the system's own queries and data model. The paper says: “We analyzed the source code to ensure correct interpretation of the stored data.” (Section 4, p. 1343). It also says the revived Postgres database contains longitudinal supply, demand, payment, and communication records (Section 4, p. 1343).

The Dutch investigative team resurrected the administrative backend and granted the researchers access to its data and source code. The researchers inspected the code and observed how administrative pages queried records, then analyzed the operation's supply, demand, and finances (Section 4, p. 1343). Inference: this is a measurement pipeline whose interpretation depends on the recovered system, rather than a formal proof of the data's authenticity.

Verus form.

## technique 2: integrity checks and triangulation

The authors include an explicit integrity-check stage before substantive analysis. The paper's structure says it will describe “the integrity checks we performed to ensure the validity of our analysis” (Section 1, p. 1342). Section 5 (pp. 1343–1344) checks correspondence with over two years of pre-seizure wiretap data, archived package IDs, a sample of over 50 upstream package prices, and subpoenaed WebMoney records (17 matches among 31 internal transactions for a ten-day period). Internal checks found missing package references in 431 of 14,702 server orders and 345 of 33,124 outgoing payments; 474 outgoing payments referenced servers absent from customer orders. They also checked timestamp gaps. Separately, Section 9.3 (pp. 1351–1352) triangulates hosted resources using three years of passive DNS data and abuse feeds. Inference: these comparisons test consistency between views of the operation; they do not establish a mathematical invariant for a program.

Inference: a reusable procedure is to (1) define the data field and external source; (2) document the matching key, such as IP or domain; (3) count matches and discrepancies; (4) report coverage and time range; and (5) avoid treating absence from a feed as proof of benign behavior. Section 9.3 reports that only a small fraction of MaxiDed resources appeared in the feeds and notes that historical feed data was not always available (pp. 1351–1352).

Verus form.

## technique 3: relational reconstruction and classification

The researchers label MaxiDed as merchant zero and identify 14 third-party merchants, “identified by connecting MaxiDed’s user and supplier database tables.” (Section 7.1, p. 1346). They classify packages as BP when the advertisement explicitly permits abuse, then compare offered, sold, and active packages. They calculate conditional probabilities that one abuse category is allowed given that another is allowed, form five risk groups, and count each package in its highest applicable group (Section 7.2, p. 1347). They measure lease duration and premature termination by risk group (Section 9.2, p. 1351).

The reported methods connect user and supplier tables to identify merchants (Section 7.1, p. 1346), and cross-reference user data, customer orders, and package data to identify customers who bought BP packages (Section 8, p. 1350). BP packages explicitly allow abuse; this label does not establish actual use. The authors report that non-BP packages were abused too (Section 7.1, p. 1346), and Appendix A shows that some allowed abuse was omitted from public descriptions (p. 1355). Inference: a reusable implementation should preserve the distinction between advertised permission, purchased packages, and observed abuse, with a denominator for each reported rate.

Verus form. Inference: a Rust implementation could prove that joins do not duplicate keys and that a rate's numerator is a subset of its declared denominator. It cannot prove that “explicitly allowed abuse” equals actual abuse without an independently verified specification of language and operator intent.

## techniques for the catalog

Inference: the following catalog entries summarize the methods above and proposed verification applications.

- backend reconstruction — recover a system's database and source-code meaning before aggregating its historical records
- integrity triangulation — compare independent feeds and report coverage, matches, and limitations instead of treating one source as ground truth
- relational classification — join operational tables, define labels and denominators, and separate offered, sold, active, and expired populations
- provenance-aware aggregation — preserve source and accounting assumptions so verified arithmetic cannot hide unverified evidence claims
