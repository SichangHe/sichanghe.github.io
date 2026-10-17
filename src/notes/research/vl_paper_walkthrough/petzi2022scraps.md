# SCRAPS: Scalable Collective Remote Attestation for Pub-Sub IoT Networks with Untrusted Proxy Verifier
(authored by agents unless marked 🧑)
Tag: `petzi2022scraps`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/petzi)

## scope and trust model
SCRAPS designs collective remote attestation for asynchronous publish/subscribe IoT networks. Publishers act as Provers, Subscribers as Verifiers, and a ProxyVerifier smart contract verifies evidence on their behalf. Brokers mediate Prover communication with the ledger; Subscribers query blockchain nodes directly. The authors state: “A Subscriber interacts with several blockchain nodes to ensure the integrity of its query results.” (Section 3.1, p. 3489)

Manufacturers are trusted to supply non-malicious devices and valid reference configurations. A Prover may be compromised except for its trust anchor. Manufacturers provision a unique private signing key accessible only to trusted attestation code; blockchain validators check transaction signatures. Physical attacks are excluded. ProxyVerifier inherits the underlying blockchain's trust assumptions. The model also assumes a minimum compromise time: “We also assume that the ADV requires at least a minimal time Tmin to compromise the device, i.e., we assume the device to be in the benign state for time Tmin after successful attestation.” (Section 3.1, p. 3489)

The contribution is a protocol, prototype, simulations, and an informal security analysis. Section 6 states: “We exclude any security weaknesses of underlying technologies, including distributed ledgers, secure hardware, and cryptographic primitives.” (p. 3495) Inference: a Verus implementation could verify state transitions and time calculations, while leaving these external assumptions explicit.

## technique 1: separate deployment, configuration, and attestation
Pre-deployment establishes the Manufacturer's contract and deploys ProxyVerifier. Configuration and key provisioning are described under the operational phase, with provisioning performed during production. The paper states: “The operational phase begins after the pre-deployment phase and includes four stages/workflows: (1) Prover configuration; (2) Prover registration, (3) attestation, and (4) query.” (Section 3.3.2, p. 3490)

Steps from Sections 3.3.1–3.3.2 (pp. 3490–3491):
1. deploy the Manufacturer's contract with public read access and exclusive Manufacturer write access; modifications require Manufacturer-signed transactions
2. deploy ProxyVerifier and make its code available for inspection
3. publish configuration `{Model, RAtype, Frel(t)}`, including the model's reference measurements, attestation scheme, and reliability function
4. provision the Prover's trust anchor with its unique private signing key and the Manufacturer contract address
5. register the Prover using its public key; permissioned ledgers require access-control registration, while permissionless registration is described as querying ProxyVerifier
6. for initial attestation, query the latest block ID; subsequently, poll ProxyVerifier for pending requests and receive the latest block ID when one exists
7. execute `stdAttest`, build `AttestTX` containing the measurement, block ID, public key, and Manufacturer contract address, sign its body, and submit it
8. after validators check transaction integrity, let ProxyVerifier retrieve the reference measurements and reliability function, compare the measurement, and assess the block ID's age
9. mark the Prover `attested` if both checks pass, otherwise `untrusted`; retain the supplied block ID as the timestamp reference for the last valid attestation

The freshness challenge is a ledger block ID, not a separate random Verifier nonce. Section 3.2 explains: “To overcome this hurdle, we use the block ID (i.e., its hash) of the most recent block as a freshness nonce.” (p. 3489)

Inference: represent configuration, registration, evidence submission, and status queries as separate transitions in Rust. Specify which fields each transition reads and changes. Treat signature verification and accepted ledger history as abstract predicates unless their implementations are also verified.

## technique 2: reliability decay and a separate status query
The reliability function returns a score from zero to one based on age `t` since the last successful attestation. Equation 1 returns one for `t <= Tmin`, `f(t)` for `Tmin < t <= Texp`, and zero otherwise. The text describes `f(t)` as decreasing toward zero at expiration (Section 3.3.2, p. 3490).

Algorithm 1 computes query results from an already stored status and block ID. It does not repeat evidence-measurement verification (Section 3.3.2, p. 3491):
1. receive `proverID`, described as a hash of the public key, and read its trust status
2. if status is `NULL`, set its pending-request flag and return `pending`
3. if status is `untrusted`, set the flag and return `untrusted`
4. otherwise obtain timestamps for the stored evidence block and the latest ledger block, then subtract them to compute `t`
5. return `trusted` when `t <= Tmin`
6. return `f(t)` when `Tmin < t < Texp`
7. otherwise set the pending-request flag and return `pending`

Inference: a specification must distinguish the numeric reliability function from the query result, which also includes named states. The paper uses `t <= Texp` in Equation 1 but `t < Texp` in Algorithm 1. An implementation needs an explicit boundary convention. Range and monotonicity proofs require constraints on the configured `f(t)`; arbitrary supplied functions do not imply either property. Ledger timestamp order must also be assumed or checked before subtraction.

## technique 3: consolidate requests for sleeping Provers
The pending-request flag consolidates requests at ProxyVerifier. A Prover initiates communication, checks for pending work when awake, and submits publicly verifiable signed evidence. Its status remains queryable while it sleeps. Section 6 states: “No matter how many attestation requests are received by ProxyVerifier for a given Prover, only one attestation process will be triggered per block ID.” (p. 3495)

The design does not specify a separate nonce-bearing request for every requester. Inference: model a pending flag per Prover and reusable evidence indexed by Prover and block ID. Prove the intended request and evidence transitions against that model; do not add requester identities or claim request-deletion behavior absent from the protocol description.

This mitigation has limits. Section 6 explains that delaying or dropping messages requires countermeasures beyond remote attestation. A malicious broker can also supply an old or fake block ID, causing invalid evidence and wasted work; Prover-initiated communication limits this attack's impact (pp. 3495–3496). The ledger prototype uses Sawtooth backpressure against excessive submissions. These are scoped mitigations, not an availability guarantee.

## technique 4: prototype measurements and simulation
The prototype uses Hyperledger Sawtooth transaction processors (TPs). The paper reports 632 Python lines for ProxyVerifier, 97 for the Manufacturer TP, and 256 for the Manufacturer client. Prover and Verifier functionality coexist on LPC55S69-EVK with ARM TrustZone and ATmega1284P-Xplained with the SµV software microvisor. Brokers were not implemented; the authors permit standard third-party brokers (Section 4, pp. 3492–3493).

Table 1 reports average execution times for ProxyVerifier of 9.5 ms for `CheckReq`, 19.7 ms for `QueryState`, and 26.2 ms for `Attest`. The `stdAttest` means are 1751.3 ms on LPC55S69-EVK and 34499.8 ms on ATmega1284P. Overall performance also depends on network delays (Section 5.1, pp. 3493–3494).

Scalability simulations compare SCRAPS with LegIoT over 100–25,000 devices. They use `Tmin = 300 s`, `Texp = 600 s`, query rates ranging from `N/2` to `N/10`, and LegIoT parameters `securityParameter = 6` and `minReliability = 0.8`. A hit means a query can reuse valid evidence without another attestation. Warm-up ends at a 70% hit rate. For the overall hit-rate comparison, each simulation runs five times for 1,200 seconds, and averages are reported (Section 5.2, pp. 3493–3494).

The introduction reports “reducing attestation overhead by 70% for 10000 devices” (p. 3486). Section 5.2.2 reports that LegIoT does not reach a 100% hit rate within 9,999 iterations for more than 1,000 devices, while SCRAPS exhibits no reported performance bottleneck through 25,000 devices (pp. 3494–3495). Inference: these results support the tested simulation scenarios; they do not establish unlimited scalability or the behavior of an independently implemented ledger deployment.

## limitations and relevance to verified Rust
The security analysis is informal. Its replay argument binds evidence to a block ID and measures age from that block's timestamp; its future-block argument assumes block IDs are unpredictable (Section 6, p. 3495). Inference: neither argument proves that an attested device stays benign beyond the stated compromise-time model. The reliability score expresses that model rather than certifying continued integrity.

Inference: useful Verus targets are the separation of evidence validation from status queries, correct timestamp arithmetic, configured reliability bounds, and preservation of one pending flag per Prover. Verifying these Rust components would not establish the security of the attestation hardware, signing code, ledger consensus, or message delivery.

## techniques for the catalog
- phased attestation — separate contract deployment, model configuration, registration, evidence verification, and status queries
- reliability function — compute evidence-age scores with explicit assumptions and expiration boundaries
- status algorithm — return `trusted`, a score, `pending`, or `untrusted` from stored evidence state
- request consolidation — combine requests into a per-Prover flag and reuse signed evidence across Verifiers
- parameterized evaluation — distinguish prototype timings from simulation results and their tested network sizes
