# EVOKE: Efficient Revocation of Verifiable Credentials in IoT Networks
(authored by agents unless marked 🧑)
Tag: `mazzocca2024evoke`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/mazzocca)

## problem and construction

EVOKE is a revocation protocol for verifiable credentials (VCs) held by resource-constrained IoT devices. The paper identifies reliable connectivity for OCSP and large memory for revocation lists as obstacles in IoT networks (Section 1, p. 1280). EVOKE uses an elliptic-curve cryptographic accumulator: one constant-size accumulator value represents all currently valid credentials, and each device stores one membership witness.

> “This paper presents EVOKE, an efficient revocation mechanism of VCs in IoT networks.” (abstract, p. 1279)

> “EVOKE leverages an ECC-based accumulator to manage VCs with minimal computing and storage overhead while offering additional features like mass and offline revocation.” (abstract, p. 1279)

The system model has an issuer (i_j), accumulator value (a_j), distributed ledger (b), and devices (D_j) in network area (j) (Section 3, p. 1282). The issuer records valid credentials, computes the accumulator and witnesses, and publishes signed updates through a DAG ledger. Each device initially receives a VC, (a_j), its witness (w_i), cryptographic material, and the issuer public key (Section 3, p. 1282).

Inference: For Verus, the accumulator and witness can be opaque cryptographic values with specifications for `Verify`; the protocol state can be a ghost map from device identifiers to `(version, accumulator, witness)`. A proof can establish that accepted credentials satisfy the chosen verification predicate and that updates never move to an older version. Cryptographic assumptions remain trusted unless the primitive is separately formalized.

## accumulator operations

The paper defines these operations (Section 4.1, pp. 1283–1284):

1. `Setup(K)` sets up accumulator parameters from public elliptic-curve generators (K)
2. `ComputeAccumulator(ainfo,V)` hashes valid VCs, maps them to curve elements, and accumulates the set into (a_j)
3. `RevomeFromAccumulator(ainfo,a_{j}^{t-1},V)` removes invalid credentials; the function name is spelled this way in the paper
4. `ComputeWitness(a_j,vc_i)` computes a membership witness
5. `Verify(a_j,vc_i,w_i,pk_i)` checks membership and uses the device public key to check ownership of the signed presentation; the protocol separately verifies that the issuer issued the VC
6. `UpdateAccumulator(ainfo,a_{j}^{t-1},V)` removes invalid VCs using `RevomeFromAccumulator` or includes newly issued valid VCs using `ComputeAccumulator`
7. `UpdateWitness(a_j^t,vc_i)` derives a new witness for a still-valid credential after the accumulator changes

The authors state:

> “Values in a j are derived from the hash conversion of the valid VCs.” (Section 4.1, p. 1283)

> “W j provides cryptographic proof of the inclusion of the VC in a j .” (Section 4.2, p. 1284)

The issuer’s setup procedure is: securely choose (K); hash every valid VC; compute (a_j); compute a witness for every valid VC; distribute each device its VC, accumulator, and witness (Section 4.2, p. 1284). To revoke, remove invalid credentials from (a_j), recompute witnesses for remaining credentials, sign the new accumulator and witnesses in VCs, and publish them to the DAG (Section 4.2, pp. 1284–1285).

Inference: A Verus wrapper should put `requires` on inputs such as a valid issuer signature and a nondecreasing version, and `ensures` on the state transition: removed credentials fail membership verification against the new accumulator, while remaining credentials receive newly generated witnesses. This does not imply rejection by devices still using an older accumulator. Verus does not provide ECC accumulator semantics automatically; those equations would be axiomatized or proved separately.

## authentication and offline update

During authentication, device (d_i) sends the accumulator timestamp to (d_k). If timestamps match, devices exchange signed VCs and witnesses, verify the issuer signature, device key ownership, and accumulator membership, and establish a channel if both verifications succeed. If timestamps differ, the older device updates first (Section 4.2, pp. 1284–1285).

Offline updates use direct or indirect retrieval. An outdated device with connectivity retrieves its witness from the ledger. If it lacks connectivity but its peer can reach the ledger, the peer retrieves and forwards the witness. If neither can retrieve, the outdated device disables trusted communications until it receives updates (Section 4.2, p. 1285).

Algorithm 1 `HandleUpdates` gives the update procedure (Section 4.2, p. 1285): iterate over every device; interact with another device; compare accumulator timestamps; copy the newer accumulator; choose `DirectRetrieval` when the outdated device has connectivity, `IndirectRetrieval` through the peer otherwise, or disable trusted communication if neither can retrieve. Apply the symmetric branch when the peer is older.

Inference: In Verus, model `HandleUpdates` as a state-machine transition over versioned device records. A loop invariant can state that every enabled device has a witness for its current accumulator version and that disabled devices cannot authenticate. The paper’s equal-version case exposes a revocation freshness limitation: two devices can share the same stale version and authenticate a revoked credential. Updating requires encountering fresher information and obtaining the matching witness through direct or indirect retrieval (Section 4.2, p. 1285).

The protocol defines mass revocation as revoking many credentials without changing memory size or verification time, and offline revocation as applying updates while disconnected with minimal transmission (Definitions 1–2, p. 1284). Inference: These definitions alone do not prove complexity bounds or eventual updates.

## security analysis and assumptions

The threat model is Dolev–Yao: an attacker can eavesdrop, intercept, inject messages, and compromise issuers, devices, or links (Section 3.2, p. 1283). The threat model assumes secure accumulator computation and collision resistance (Section 3.2, p. 1283); the implementation hashes VCs with SHA-256 (Section 4.1, p. 1283).

Issuer compromise is outside the revocation protocol’s direct protection: if the issuer key is stolen, the paper recommends migrating to a fresh server, DID, and key pair (Section 5.1, p. 1286). A compromised device is removed by recomputing the accumulator without its VC; it then receives no valid witness (Section 5.2, p. 1286). For selective forwarding, freshness timestamps ensure a device only accepts newer accumulator versions (Section 5.3, p. 1286). However, when an outdated device cannot perform direct retrieval, a malicious peer can provide a fresher-but-still-stale version until the device later synchronizes.

> “In cases where a device misses updates (i.e., accumulator value and witness), EVOKE allows for the updating of the device by leveraging interactions with other devices in the network.” (Introduction, p. 1280)

Inference: A Verus proof can establish authenticity and monotonic version checks, but not that the ledger is available, that SHA-256 is collision-resistant, or that issuer key compromise is detected. The stale-version window should be represented explicitly in a product threat model rather than hidden behind a validity predicate.

## measurements and evidence

The prototype uses JavaScript and WebAssembly, `crypto-wasm-ts`, IOTA’s identity WASM library, and the IOTA Tangle (Section 6.1, p. 1287). On commodity devices, valid-VC verification took 477.44 ms (LG Smart TV), 499.70 ms (Amazon Echo Show 5), 12.62 ms (iPhone 12), and 48.69 ms (Oculus Quest 2); revoked-VC verification was 476.89, 498.67, 12.58, and 47.89 ms respectively (Table 3, p. 1287). The paper states “All the results have been averaged over 1K runs.” (Section 6.1, p. 1287). Storage for accumulator plus witness is approximately 1.5 KB independent of the number of VCs (Section 6.2, p. 1287).

Hybrid experiments used five Raspberry Pi 4 devices on Wi-Fi with NTP synchronization. In a star topology, EVOKE total latency was 1,152.7 ms and end-to-end latency 948.3 ms; the minimal-data baseline was 967.7 ms and 705.5 ms. In a mesh topology, EVOKE was 545.2 ms total and 307.5 ms end-to-end, versus 97.4 ms and 91.7 ms baseline (Table 4, p. 1288). The baseline sends minimal data without performing operations (Section 6.3, pp. 1288–1289). Inference: It measures a communication baseline rather than an equivalent authentication implementation.

Large-scale evaluation simulated 10,000 to 1,000,000 devices for one week on an 11th-Gen i7-11370H with four cores and 16 GB RAM, with five random interactions per device per hour and an approximately 0.028% daily revocation share (Section 6.4, p. 1289). Within one hour, approximately 98% of devices were updated when 30% missed updates and approximately 96% when 50% missed updates, across the simulated populations (Figure 5, p. 1289; Section 6.4, p. 1290). With one interaction per device per hour, the corresponding figures drop to approximately 91% and 75% (Appendix A.1, p. 1295). The authors report that generating one million witnesses took 80,000 ms in their setup (Section 6.4, p. 1290); witness generation is at least Ω(w) operations for (w) witnesses. Inference: These simulation and prototype results do not prove network-wide convergence for arbitrary contact patterns.

Inference: A useful verified-Rust integration would prove the update algorithm’s version and witness consistency, including disabling trusted communication while waiting for a witness. Such a proof would need explicit assumptions about cryptography, issuer keys, and update delivery; it would not establish that every device has the latest revocation information.

## what is proved and trusted

- Inference: no mechanized proof is presented; Section 5 gives prose arguments for the stated threats
- measured: operation latency, storage, hybrid-network latency, simulated offline-update coverage, communication overhead, and issuer computation (Sections 6.2–6.4, pp. 1287–1290)
- assumptions: secure accumulator computation, issuer keys and initial provisioning, and some devices with reliable ledger connectivity (Sections 3–3.2, pp. 1282–1283); Section 3.1 says ledger compromise may affect update availability, while issuer signatures protect update integrity
- Inference: reproducing the measurements also requires checking the JavaScript/WASM implementation and simulation model
- limitation: the issuer and compromise-detection mechanisms are assumed; same-version stale authentication is possible temporarily; real deployments may use different network latency and programming languages

## techniques for the catalog

- ECC accumulator revocation — hash valid credentials into an elliptic-curve accumulator with constant-size value and per-credential witnesses
- witness verification — verify issuer signature, device key ownership, and accumulator membership before trusting a VC
- signed versioned updates — publish a timestamped accumulator and refreshed witnesses in issuer-signed credentials
- mass revocation — remove many credentials while keeping device storage and verification time independent of credential count
- offline direct retrieval — let a device that missed updates retrieve its current witness when it can reach the ledger
- offline indirect retrieval — let a connected peer retrieve and forward a witness to a constrained device
- disable-on-stale-failure — disable trusted communication when neither side can obtain a newer witness
- freshness defense — accept an accumulator update only when its timestamp is newer than the local version
- empirical protocol evaluation — average cryptographic operations over 1,000 runs and separately measure commodity, hybrid, and simulated large-scale settings
