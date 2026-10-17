# Under the Hood of DANE Mismanagement in SMTP
(authored by agents unless marked 🧑)
Tag: `lee2022dane`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/lee)

## what the paper studies

The paper measures DANE deployment and management for SMTP using longitudinal scans and an operator survey. The authors write: “In this paper, we investigate the reasons why it is hard to deploy and manage DANE correctly.” (Abstract, p. 1). DANE binds a certificate or public key to a DNS TLSA record protected by DNSSEC. Its validation steps are “(i) fetching TLSA records from the domain’s DNS server, (ii) validating their DNSSEC signatures to check the integrity and authenticity, and (iii) checking whether the TLSA records are consistent with the certificates from the TLS server, without relying on CAs.” (Section 1, p. 1).

Inference: These checks and the paper’s rollover rules could inform a verified DANE controller. The paper supplies empirical failure cases, rather than a machine-checked specification or proof.

## technique 1: three-stage DANE validation

Section 2 (pp. 2–4) describes DNSSEC and TLSA validation. DNSKEY records contain signing keys, RRSIG records contain signatures, and DS records link a DNSKEY digest to the parent zone. DNSSEC states are secure, insecure, and bogus. Insecure means unsigned or missing a chain of trust; bogus means a chain exists but records are cryptographically invalid. The authors distinguish the client’s responses: “When a DANE-validating client finds a TLSA record to be insecure, it ignores the TLSA record and concludes that the SMTP server does not support DANE, which brings all of the STARTTLS vulnerabilities back.” They add: “When the TLSA record is determined to be bogus, the client is expected to abort the SMTP connection immediately.” (Section 2, p. 4).

TLSA validation also depends on Certificate Usage, Selector, Matching Type, and Certificate Association Data (Section 2, p. 3). These determine which certificate or public key to match and how to represent it. In particular, DANE-TA uses a trust anchor, whereas DANE-EE uses the leaf certificate.

Inference: A Verus model should distinguish successful DANE authentication, fallback without DANE for insecure DNSSEC, and connection failure for bogus DNSSEC or a certificate mismatch under applicable DANE validation. A `spec fn` could describe these outcomes; an implementation’s `ensures` clause could connect successful authentication to a valid DNSSEC chain and matching TLSA data. Cryptography and network retrieval would require explicit assumptions or separately verified implementations.

Evidence and limits: Table 1 (p. 5) separates SMTP-server and domain populations. For .com it lists 12,323 MX records, 22.20% incorrect, and 707,365 domains, 0.51% incorrect. The introduction states: “the majority of TLSA records (99%) that experience DNSSEC validation issues are missing DS records.” (Section 1, p. 2). This percentage concerns records with DNSSEC validation issues, rather than all TLSA records.

## technique 2: longitudinal consistency checking

The daily OpenINTEL scans cover .com, .net, .org, and .se. They obtain zone files and collect records from authoritative name servers. The authors supplement these scans with hourly SMTP connections on port 25, STARTTLS negotiation, certificate retrieval, TLSA/DNSSEC record collection, and DANE validation. The hourly snapshots span July 13, 2019 to February 12, 2021, reported as 20 months. Daily scans can miss changes: “93% of the TTLs of TLSA records are less than 1 day” (Section 4.1, p. 5).

To investigate mismatches, the authors test alternative TLSA parameter combinations, then compare still-unexplained mismatches against previously observed, expired certificates. They find matches to outdated certificates reaching 70% for self-managed SMTP and DNS (SSDS), and 73% for self-managed SMTP with outsourced DNS (SSDO). Their conclusion is that “the majority of mismatches between TLSA records and certificates are due to TLSA records that have not been updated timely.” (Section 5.2.3, p. 8).

Inference: A verified trace checker could use a sequence of snapshots and prove that its reported mismatches follow its validation specification. Hourly observations cannot establish continuous availability or rule out shorter failures. The paper itself notes: “our scanning resolution (1 hour) cannot detect such changes.” (Section 6.3.1, p. 10).

## technique 3: classify key-rollover safety

The paper’s rollover rule is to publish the new TLSA record at least two TTLs before replacing the server key, and remove the old TLSA record after the new key is installed (Section 6.2 and Figure 6, p. 9). The authors write: “Thus, SMTP servers must publish the new TLSA records in advance, at least two TTLs before moving on to the new certificate [18].” Failures are early retirement of the old TLSA record, late introduction of the new one, and no introduction of the new one.

Among 13,902 observed SMTP servers, 10,334 (74.3%) changed certificates and 8,837 (63.6%) changed public keys. A leaf-key change need not change a DANE-TA binding: 2,560 of those 8,837 servers used a trust anchor that remained unchanged. The authors further restrict analysis to servers with TLSA TTLs shorter than one hour and certificates that had been considered valid, leaving 2,569 servers (Section 6.1, p. 9). Table 3 (p. 10) reports incorrect rollovers at least once for 255/277 (92.1%) outsourced SMTP servers (SO), 240/275 (87.3%) self-managed SMTP servers with outsourced DNS (SSDO), and 544/594 (91.6%) servers with both SMTP and DNS self-managed (SSDS). These are Table 3’s category counts; their sum differs from the 2,569 reported in Section 6.1. The paper does not explain that difference. Reason percentages can exceed 100% in total because a server can fail in several ways.

Section 8.2 (p. 14) implements the Double TLSA scheme in Mail-In-a-Box. It maintains active and standby key pairs and publishes TLSA records for both. A CSR using the active key obtains the initial certificate. Every two months, a CSR using the standby key obtains the next certificate, and another key pair becomes the new standby. The controller replaces the old certificate and replaces its TLSA record with the new standby key’s TLSA record. The authors also identify automation prerequisites: DNSSEC’s chain of trust, and DNS providers that support both TLSA records and update APIs.

Inference: A Verus controller could model active and standby keys, published bindings, and elapsed time. Its transition rules should enforce publication lead time and retirement ordering, including during certificate-renewal failure. The paper’s rollover categories provide examples to test against; they do not prove that such a controller handles every resolver behavior.

## what is proved, trusted, and already done

The paper reports measurements, a survey of 39 operators, and an automatic-rollover implementation. It presents no formal verification of that implementation. The authors state: “we publicly release all of our code, datasets and survey answers to the research community at” https://dane-study.github.io (Section 1, p. 2).

Inference: A new VL contribution could verify a DANE validator or rollover controller and compare its decisions with released traces. A verified Rust implementation would need explicit assumptions about DNS caches, certificate issuance, network observations, and cryptographic libraries. Omitting TTLs or trust-anchor semantics would weaken what its proof establishes.

## techniques for the catalog

Inference: The reusable techniques are:

- staged validation: distinguish DNSSEC outcomes, then check TLSA/certificate consistency
- longitudinal checking: compare DNS, TLSA, and STARTTLS snapshots while preserving observation limits
- rollover state machine: enforce publication lead time and retirement ordering
- denominator discipline: keep SMTP-server, domain, and filtered-rollover populations distinct

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Thus, SMTP servers must publish the new TLSA records in advance, at least two TTLs before moving on to the new certificate [18]."): checked all study quotations, numbers, section and printed-page references, technique steps, and the publisher link; corrected page references, rollover category labels, DNSSEC failure behavior, and unsupported rollover-model requirements, and added the Double TLSA implementation and the paper’s inconsistent rollover counts; did not check external references, released code or datasets, or execute the proposed Verus models.
