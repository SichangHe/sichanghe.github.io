data that spans regions
(authored by agents unless marked 🧑)

what this file is
- a pass on data kept in several distant data centers: production databases, clocks, the latency price of strong guarantees, residency laws, edge data, losing a whole region, and published outage reports
- it adds to three sibling files and does not repeat them
  - [transactions and data across regions](transactions_regions.md): Spanner, Calvin, SLOG, Caerus, D2PC, PolyBase, K2, Bonspiel
  - [distributed transactions](transactions.md): commit protocols that save a wide-area round trip (Tiga, Mako, Chardonnay, DSQL's commit path)
  - [consistency guarantees](consistency_guarantees.md): definitions, checkers, Jepsen findings, CRDTs and local-first software
- status: cut short on 7 Oct 2026 UTC by the Claude usage limit
  - web search stopped working after 9 queries; dblp, arXiv, and OpenAlex search all returned HTTP 429
  - so the 2025 to 2026 research-paper coverage is thin; the vendor documents and outage reports are solid
  - "what is not covered" at the end lists the holes
- how to read the quotes
  - every quoted phrase was string-matched by me against the page or PDF I downloaded that day, unless marked "leftover, not rechecked"
  - "leftover" means an earlier agent that was cut off recorded it and I did not re-open the source
  - "my reading" and "my inference" mark what is mine
- ChatGPT Extra High: no opinion was obtained; the shared browser was not signed in and I ran out of budget before writing the prompt file

takeaway, my opinion
- production systems have converged on one shape for strong multi-region data
  - two regions hold full copies, a third only votes (a "witness"), a write waits for two of three
  - Spanner dual-region, DynamoDB multi-region strong consistency, and Aurora DSQL all document this shape
  - what differs is what each one gives up: DynamoDB drops transactions, DSQL gives snapshot isolation, Cosmos DB refuses strong consistency with several write regions
- the published outage reports say replicas were rarely what failed
  - what failed was something every region shared: a DNS record, a global policy table, a config file, a deletion tool, a third-party store
  - so "survive the loss of a region" is mostly a question about hidden shared dependencies, and I found little research that measures them
- residency is promised per row but leaks per key
  - CockroachDB and Spanner both document that index keys and split points leave the pinned region
  - I found no paper that measures this from the outside; that is a measurement paper we could write with tools we already know
- what I would do first, in order
  1. a leak audit of pinned multi-region databases (research idea 1)
  2. a Verus model of the two-copies-plus-witness commit and what survives bad clocks (idea 2)
  3. a catalogue of outage reports tagged by which shared dependency crossed regions (idea 3)
- these are hypotheses; I ran no experiment, and "I found none" is limited by the broken search

the problem in plain words
- light takes time; a round trip between US coasts is tens of milliseconds, across an ocean more
- to never lose a confirmed write when a region dies, some other region must have the write before you confirm it
  - so a safe write costs at least one round trip to the nearest other region
- to let every region read the newest data locally, either writers wait longer or readers must know how fresh their copy is
  - synchronized clocks are the usual way to know
- laws and contracts add a second constraint: some bytes may not leave a country
- every system below is a different way to pay these costs

what production systems promise, in their own words
- Azure Cosmos DB, [consistency levels doc](https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels)
  - the price of strong, stated as a formula: "the write latency is equal to two times round-trip time (RTT) between any of the two farthest regions, plus 10 milliseconds at the 99th percentile"
  - a distance cap: "Strong consistency for accounts with regions spanning more than 5,000 miles (8,000 kilometers) is blocked by default because of high write latency."
  - a stated impossibility: accounts with multiple write regions "can't use strong consistency because a distributed system can't provide a recovery point objective (RPO) of zero and a recovery time objective (RTO) of zero"
    - RPO is how much confirmed data you may lose; RTO is how long you may be down
- DynamoDB global tables, [how it works](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html)
  - two modes: eventual (MREC) and strong (MRSC, launched June 2025)
  - eventual mode resolves conflicts by "last writer wins", and with transactions "you might observe partially completed transactions" in another region while changes replicate
  - strong mode: changes are "synchronously replicated to at least one other Region before the write operation returns a successful response"
  - strong mode's limits: "A MRSC global table must be deployed in exactly three Regions." and such tables "do not support transaction operations"
  - a concurrent write to the same item in another region fails with `ReplicatedWriteConflictException`
  - my reading: DynamoDB bought zero data loss by rejecting conflicts and dropping transactions
- Aurora DSQL, Brooker et al., [arXiv July 2026](https://arxiv.org/abs/2607.13276); commit protocol is in [distributed transactions](transactions.md)
  - layout tested: two full regions "with a witness in us-west-2"
  - cost model: for read-write work the commit takes "approximately 2x the round-trip time between the nearest pair of regions"
  - reads stay local: latencies "significantly lower than one network round trip" between the two main regions
  - what bad clocks cost: "In other words, DSQL becomes merely snapshot isolated, rather than strong snapshot isolated."
  - Brooker's [blog, Dec 2024](https://brooker.co.za/blog/2024/12/03/aurora-dsql.html): "DSQL offers active-active multi-writer capabilities in multiple availability zones (AZs) in a single region, or across multiple regions."
- Spanner
  - [replication doc](https://cloud.google.com/spanner/docs/replication) lists read-write, "read-only replicas, and witness replicas"
  - leftover, not rechecked, same doc: witness replicas "don't maintain a full copy of data" and "don't serve reads."
  - leftover, not rechecked, OSDI 2012 paper: "If the uncertainty is large, Spanner slows down to wait out that uncertainty."
- CockroachDB
  - [multi-region demo, VLDB 2022](https://www.vldb.org/pvldb/vol15/p3610-taft.pdf): a table is `REGIONAL BY TABLE`, `REGIONAL BY ROW`, or `GLOBAL`, plus a survival goal (zone or region)
  - [global tables blog](https://www.cockroachlabs.com/blog/global-tables-in-cockroachdb/): writes "operate at future MVCC timestamps"
    - my reading: writers wait so that every region can read locally and still see the newest data; good only for data read far more than written
  - leftover, not rechecked, SIGMOD 2022 paper blog: the protocol "reduces tail latency by over 10x compared to prior approaches"
- Aurora Global Database, [doc](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
  - one writer region: "Only the primary cluster performs write operations."
  - copies lag: replication "with latency typically under a second"
  - my inference: failover can lose the last moments of writes; this is the GitHub 2018 failure shape below
- my inference from putting these side by side
  - the vendors state commit cost in different units (2x farthest pair plus 10 ms; 2x nearest pair; a future-timestamp wait), so nobody can compare them from documents
  - Gaia (below) starts that comparison for open systems; the managed services are still unmeasured as far as I found

clocks: what synchronized time buys
- the idea: if every machine knows the time within a known error, a reader can tell whether its local copy is fresh enough without asking anyone
- how small the error is now
  - Sundial, Li et al., [OSDI 2020](https://www.usenix.org/conference/osdi20/presentation/li-yuliang): "Sundial can achieve ~100ns time-uncertainty bound under different types of failures, which is more than two orders of magnitude lower than the state-of-the-art solutions."
    - inside one data center, on a testbed of more than 500 machines
  - Graham, Najafi and Wei, [NSDI 2022](https://www.usenix.org/conference/nsdi22/presentation/najafi): "Graham reduces the clock drift of a commodity server by up to 2000×, reducing the maximum assumed drift in most situations from 200ppm to 100ppb."
    - my reading: a machine that loses its time server stays trustworthy for longer
  - AWS, [Nov 2023 announcement](https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-time-sync-service-microsecond-accurate-time/): "The Amazon Time Sync Service now gives you a way to synchronize time within microseconds of UTC on Amazon EC2 instances."
  - AWS [ClockBound](https://github.com/aws/clock-bound), open source: "The window of uncertainty (the Clock Error Bound) is defined by two timestamps (earliest, latest) within which true time exists."
    - my reading: this is Spanner's interval clock offered to any tenant; ten years ago only Google had it
- what happens when the bound is wrong
  - CockroachDB [transaction layer doc](https://www.cockroachlabs.com/docs/stable/architecture/transaction-layer): a node that sees itself too far off "crashes immediately"
  - same doc: skew past the bound can cause "violations of single-key linearizability between causally dependent transactions"
  - DSQL: drops to plain snapshot isolation (quote above)
  - my inference: each system states a different loss in prose; none of these statements is machine-checked as far as I found
- leftovers on clocks, not rechecked: Huygens (NSDI 2018), Firefly (SIGCOMM 2025), Nezha (VLDB 2023), YugabyteDB's hybrid clocks
- K2 and Tiga, which use clocks to order transactions, are in the sibling files

measuring the latency price
- Gaia, Mraz et al., [arXiv May 2026](https://arxiv.org/abs/2605.30156), abstract
  - the complaint: "Existing benchmarks assume stable network conditions; they lack explicit settings for data and client locality, and they largely ignore data transfer costs across regions."
  - the findings: "i) most systems are sensitive to network instabilities, ii) network costs dominate cloud deployment expenses iii) multi-region fault-tolerance mechanisms incur measurable critical-path overhead that is often overlooked in prior evaluations."
  - I read only the abstract
- my reading: finding ii is the under-studied one; most papers in the sibling files report latency and throughput, not the bill for bytes crossing regions

where to put data and copies
- row-level movement between replication groups (PolyBase) and geography-aware locking (Bonspiel) are in [transactions and regions](transactions_regions.md)
- LEGOStore, Zare et al., [VLDB 2022, arXiv](https://arxiv.org/abs/2111.12009), abstract
  - picks, per object, between full copies and erasure coding (split the object into pieces so any few rebuild it) and picks the data centers, "to minimize overall costs"
  - "We observe cost savings ranging from moderate (5-20\%) to significant (60\%) over baselines representing the state of the art while meeting tail latency SLOs."
  - moving a key's placement takes "3 to 4 inter-DC RTTs"
- GeoLayer, [arXiv Sept 2025](https://arxiv.org/abs/2509.02106): placement of graph data across data centers; found by search, abstract not read closely
- not reached: Akkio, Shard Manager, SkyStore, Macaron, Skyplane, and other cost-driven placement work

laws that keep data in a country
- what the law says
  - GDPR does not say "keep data in the EU"; [Article 44](https://gdpr-info.eu/art-44-gdpr/) says a transfer to a third country "shall take place only if ... the conditions laid down in this Chapter are complied with by the controller and processor"
    - my reading: keeping data inside is the way to need no transfer basis
  - US CLOUD Act, [18 U.S.C. 2713](https://www.law.cornell.edu/uscode/text/18/2713): a provider must disclose data in its "possession, custody, or control, regardless of whether such communication, record, or other information is located within or outside of the United States."
    - my inference: this is why "EU region of a US company" does not settle the matter for EU buyers
  - leftovers, not rechecked: Schrems II press release, China PIPL thresholds, India DPDP, Russia localization (secondary sources only)
- what vendors sell
  - AWS European Sovereign Cloud, [launch post](https://aws.amazon.com/blogs/aws/opening-the-aws-european-sovereign-cloud/): "The first AWS Region in the AWS European Sovereign Cloud is located in the state of Brandenburg, Germany, and is generally available today." and "This Region operates independently from existing AWS Regions."
  - Microsoft [EU Data Boundary](https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-learn): "These commitments are subject to limited circumstances where Customer Data, personal data, and Professional Services Data will continue to be transferred outside the EU Data Boundary."
- what databases admit leaks
  - CockroachDB [data domiciling doc](https://www.cockroachlabs.com/docs/stable/data-domiciling): indexed column data may land in system ranges, and "This synchronization does not respect any multi-region settings"
    - also on logs: "there is some cross-region leakage"
  - Spanner [data residency doc](https://cloud.google.com/spanner/docs/data-residency): some key values "are used as split boundaries, which might be stored in the default placement"
  - my reading: both pin rows well and both let key values travel; an email address used as a primary key is exactly such a value
- research on compliance
  - K9db, Albab et al., [OSDI 2023](https://www.usenix.org/conference/osdi23/presentation/albab): "K9db is a new, MySQL-compatible database that complies with privacy laws by construction."
    - it handles who owns data and deletion, not where data sits (my inference from the abstract)
  - GDPRuler, [arXiv June 2026](https://arxiv.org/abs/2606.05423): GDPR enforcement for key-value stores; abstract says existing approaches "overlook the integrity of compliance mechanisms themselves"
  - leftovers, not rechecked: GDPRbench (VLDB 2020), compliant geo-distributed query processing (SIGMOD 2021)
- measuring where data really goes
  - Gamero-Garrido et al., [PoPETs 2025, arXiv](https://arxiv.org/abs/2504.09019): "BGP, DNS and other Internet protocols were not designed to enforce jurisdictional constraints"
    - "on average, 2.3% of servers serving users in each EU country are located in non-adequate destination countries"
    - my inference: this measures where serving machines are, not where stored copies, backups, and logs end up
  - GeoFINDR, [arXiv 2025](https://arxiv.org/abs/2504.18685): locate a cloud machine by network delay even with "a Cloud Service Provider (CSP) lying about the VM's location"; accuracy "can be as high as 22.1km"

data at the edge and on devices
- CRDTs and local-first software are in [consistency guarantees](consistency_guarantees.md)
- Cloudflare Durable Objects with SQLite, Varda, [blog Sept 2024](https://blog.cloudflare.com/sqlite-in-durable-objects/)
  - the design: "Your application code runs exactly where the data is stored."
  - one object has one writer, so no cross-region conflict; the cost is that a far user reaches the object over the network (my reading)
  - the write trick is called "Output Gates": the code continues before the write is confirmed, and replies to the outside are held until it is
- the same storage shares a hidden dependency, see the June 2025 outage below
- Antipode (SOSP 2023): keeps "post before notification" order across several stores in several regions; known to me from the search summary only, PDF not opened
- not reached: D1 read replicas, Turso, LiteFS, EdgeKV, and academic edge stores from 2022 on

losing a whole region
- Maelstrom, Veeraraghavan et al., [OSDI 2018](https://www.usenix.org/conference/osdi18/presentation/veeraraghavan): "Maelstrom provides a traffic management framework with modular, reusable primitives that can be composed to safely and efficiently drain the traffic of interdependent services from one or more failing datacenters to the healthy ones."
- Meta, [The Evolution of Disaster Recovery at Meta, 2023](https://atscaleconference.com/the-evolution-of-disaster-recovery-at-meta/)
  - goal: "handle the loss of a single region without impacting site availability"
  - spare capacity kept for this is the "DR buffer"
  - practice: "DR Storms are our Disaster Readiness Exercises, during which we isolate a production region to validate the end-to-end (E2E) readiness of the DR buffer and service placement."
  - a harder drill: "A Power Storm is a mammoth DR exercise where a typical production region is brought to a complete stop"
  - an admission about cutting a region off versus powering it down: "we hadn’t exercised our readiness relating to this particular mode of failure, so our recovery here was unknown."
- Metastable Failures in the Wild, Huang et al., [OSDI 2022](https://www.usenix.org/conference/osdi22/presentation/huang-lexiang): "at least 4 out of 15 major outages in the last decade at Amazon Web Services were caused by metastable failures"
  - a metastable failure keeps a system stuck in overload after the trigger is gone
  - my inference: failing over a region shifts load at once, which is a classic trigger

published outage reports that involved storage or databases
- a shared name record took a region's database away
  - AWS, [DynamoDB disruption in us-east-1, 19 to 20 Oct 2025](https://aws.amazon.com/message/101925/): "a latent race condition in the DynamoDB DNS management system that resulted in an incorrect empty DNS record for the service's regional endpoint"
  - the report also describes EC2's internal manager entering "congestive collapse" because it depends on DynamoDB
- a globally copied row crashed every region
  - Google Cloud, [12 June 2025](https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW): a policy change went into "regional Spanner tables" and was "replicated globally"; then "the null pointer caused the binary to crash"
  - the code "did not have appropriate error handling nor was it feature flag protected"
  - my reading: replication worked perfectly and delivered the bad row everywhere within seconds
- that outage took down someone else's edge store
  - Cloudflare, [12 June 2025](https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/): "The cause of this outage was due to a failure in the underlying storage infrastructure used by our Workers KV service"
  - "Part of this infrastructure is backed by a third-party cloud provider, which experienced an outage today"
  - reach: "D1 databases share the same underlying storage infrastructure as Workers KV and Durable Objects."
- a database permission change broke a global file
  - Cloudflare, [18 Nov 2025](https://blog.cloudflare.com/18-november-2025-outage/): "a change to one of our database systems' permissions which caused the database to output multiple entries into a" feature file used by bot management
- single-site stores behind a multi-site service
  - Cloudflare, [2 Nov 2023](https://blog.cloudflare.com/post-mortem-on-cloudflare-control-plane-and-analytics-outage/): Kafka and ClickHouse "were only available in PDX-04 but had services that depended on them that were running in the high availability cluster"
- failover with lagging copies split the data
  - GitHub, [21 Oct 2018](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/): "Connectivity between these locations was restored in 43 seconds, but this brief outage triggered a chain of events that led to 24 hours and 11 minutes of service degradation."
  - both coasts held writes the other lacked, so "we were unable to fail the primary back over to the US East Coast data center safely"
- a deletion that replicas could not stop
  - Google Cloud and UniSuper, [May 2024](https://cloud.google.com/blog/products/infrastructure/details-of-google-cloud-gcve-incident): "After the end of the system-assigned 1 year period, the customer's GCVE Private Cloud was deleted."
  - separate backups "were instrumental in aiding the rapid restoration"
- an operator command and a cold restart
  - AWS S3, [28 Feb 2017](https://aws.amazon.com/message/41926/): "one of the inputs to the command was entered incorrectly and a larger set of servers was removed than intended."
  - "we have not completely restarted the index subsystem or the placement subsystem in our larger regions for many years."
- physical loss
  - Google Cloud Paris, [25 Apr 2023](https://status.cloud.google.com/incidents/dS9ps52MUnxQfyDGPfkY): "a cooling system water pipe leak occurred in one of the data centers in the europe-west9 region." It "led to a fire."
- 2026, network inside or around one region
  - Google Cloud us-west1, [20 Aug 2026](https://status.cloud.google.com/incidents/utF3FMFdQfwBzJcGG6vf): "The disruption originated during scheduled fiber optic maintenance, which unexpectedly compromised network capacity between data centers within the us-west1 region."
    - Cloud Storage, Cloud SQL, Bigtable, and AlloyDB are on the affected list
  - Azure West US, 23 July 2026, [status history](https://azure.status.microsoft/en-us/status/history/): "routes were withdrawn from multiple devices simultaneously, disrupting connectivity between the datacenter and the WAN"
- leftovers, not rechecked: AWS Kinesis Nov 2020, AWS Dec 2021, South Korea government data center fire Sept 2025 (news snippet only)
- my reading of the set
  - 6 of the 11 reports I checked are about something shared across sites, not about a lost copy
  - 2 are about operations nobody had practiced (S3 restart, Meta's power-down admission)
  - only GitHub 2018 is a pure replication story, and its lesson is that failover with lagging copies makes two diverging databases

research we could do
- idea 1: leak audit of pinned multi-region databases
  - question: with every table pinned to one region, which bytes still cross the border?
  - why open: the vendors' documents admit key and log leaks (quotes above); I found no outside measurement, though my search was cut short
  - method: run CockroachDB and YugabyteDB with strict pinning in emulated regions, plant marker values in keys, indexes, and rows, capture all traffic between regions and scan disks, logs, and backups for the markers
  - fits: web measurement skills; result is a table of leak channels per system and version
  - stop if: a 2022 to 2026 paper already did this; check PoPETs, USENIX Security, and VLDB first
- idea 2: a Verus model of two copies plus a witness
  - question: prove no confirmed write is lost with one region down, and state exactly which guarantee survives when the clock bound is broken
  - why open: three vendors ship this shape and each describes the bad-clock case in prose; DSQL says it used TLA+ and P model checking ([transactions](transactions.md)), which is not a proof of an implementation
  - first step: an executable Rust core with a ClockBound-style interval clock as a trusted interface, then weaken the clock assumption and see which proof breaks
  - stop if: the consensus slice already has a verified witness or flexible-quorum protocol that covers it
- idea 3: outage reports as data
  - question: what share of large storage outages crossed regions through a shared dependency, and which kind?
  - method: collect vendor reports 2017 to 2026, tag trigger, shared component, whether data was lost, whether failover helped
  - 11 reports are already tagged above; the metastable-failures paper is the model for this kind of study
  - an LLM can do first-pass tagging, with a human check on a sample
- idea 4: measure managed multi-region commit cost on the same region triples
  - Gaia does this for open systems; DSQL, DynamoDB strong mode, Spanner, and Cosmos DB publish formulas in different units
  - cost is cloud spend, not people; weakest on novelty since Gaia may extend to it
- idea 5: test failover with lagging copies for split data
  - reproduce the GitHub 2018 shape on Aurora Global, MySQL, and Postgres setups and check histories with the checkers in [consistency guarantees](consistency_guarantees.md)
  - lower priority; Jepsen-style work is close

what is not covered
- research papers from 2025 and 2026 beyond the few named: I could not search SOSP, OSDI, NSDI, EuroSys, ATC, SIGCOMM, SIGMOD, VLDB, or CIDR programs before the limit
- YugabyteDB, TiDB, OceanBase, PolarDB-X, FoundationDB, MongoDB zones, and Meta's stores (TAO, ZippyDB, MySQL Raft)
- cost-driven placement across regions and clouds (SkyStore, Macaron, Skyplane, Akkio)
- edge and device stores beyond Durable Objects
- wide-area clock sync and Google's current TrueTime numbers
- law beyond GDPR Article 44 and the CLOUD Act; the leftover notes on Schrems II, China, India, and Russia rest on secondary sources
- Azure post-incident reviews beyond one line; OVH 2021, Atlassian 2022, Roblox 2021, Facebook 2021
- Jepsen reports on multi-region behavior
- no ChatGPT opinion; no second reviewer read this file
- sources: about 40 pages or PDFs downloaded and string-checked by me; about 15 more appear only as marked leftovers
- leftover notes for a later pass are in the scratch folder mr/ (sub1_production.md, sub2_clocks.md, sub4_residency.md, sub6_outages.md)
