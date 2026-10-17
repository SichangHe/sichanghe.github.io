# CHAINIAC: Proactive Software-Update Transparency via Collectively Signed Skipchains and Verified Builds
(authored by agents unless marked 🧑)
Tag: `nikitin2017chainiac`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/nikitin)

## scope and result

CHAINIAC is a decentralized software-update framework. Its verification techniques are collectively signed release approval, verified reproducible builds, authenticated skipchains, and freshness proofs. The abstract states: “Independent witness servers collectively verify conformance of software updates to release policies, build verifiers validate the source-to-binary correspondence, and a tamper-proof release log stores collectively signed updates, thus ensuring that no release is accepted by clients before being widely disclosed and validated.” (§abstract, p.1271). The paper is a system design with an informal security analysis, not a machine-checked proof of the protocol.

## technique: threshold release approval and verified builds

What it is and when to use it. Developers sign a source release with individual keys; a threshold is required. Build verifiers independently reproduce the binary and compare it with the announced binary. The result is a source-to-binary attestation that clients can verify without rebuilding. The paper says: “CHAINIAC’s verified builds are an improvement over reproducible builds, in that they ensure that binaries are not only reproducible in principle, but have indeed been identically reproduced by multiple independent verifiers from the corresponding source release.” (§1, p.1272).

Steps from §§5.1–5.3 (p.1277).
1. Store developers’ public keys and the minimum valid-signature threshold in a policy file distributed as a securely bootstrapped trust anchor (§5.1).
2. Have developers review human-readable source and sign its hash with individual keys; append the signatures to the release data (§5.1).
3. Combine source and binary hashes in a Merkle tree; developers sign the root, binding all release components (§5.3).
4. Have the build verifiers compile the source reproducibly and compare the resulting binaries against the announced binaries (§5.3).
5. After the witnesses check the developer signatures against the policy and the build verifiers validate the binaries, have the cothority collectively sign the release; clients verify that signature and Merkle inclusion proofs (§5.3).

Evidence and assumptions. The threat model requires fewer than the developer threshold `td` compromised, at most `fw = nw − tw` faulty witnesses, `nw ≥ 3fw + 1`, and at least `tv` honest build verifiers with a trustworthy compiler (§3.2, p.1274). The authors explicitly say developers’ review discipline is security-critical but outside scope (§1, p.1272). Inference: a passing Verus proof does not make review or the compiler assumption disappear.

## technique: skipchains for authenticated history and key evolution

What it is and when to use it. A skipchain is an authenticated timeline whose backward links are hashes and whose forward links are signatures added when future blocks exist. Multi-hop links permit logarithmic traversal in both directions. The paper states: “Skipchains enable clients (1) to securely traverse the timeline in both forward and backward directions and (2) to efficiently traverse short or long distances by employing multi-hop links.” (§4, p.1275).

Steps from §4.1 (p.1276).
1. Represent each block as `(id, height, payload, back-links, forward-links)`; set the identifier to `H(payload, back-links)` (§4.1).
2. Choose randomized or deterministic heights; in the deterministic form, compute height using the fixed basis formula (§4.1).
3. Store a hash to an earlier block at each backward-link level (§4.1).
4. When a future block appears, add a collective signature over its identifier to the earlier block’s corresponding forward-link slot (§4.1).
5. Let clients validate only logarithmically many intermediate blocks from a trusted reference, including old blocks for rollback and new blocks for update verification (§4.2).

Verus form (inference). Model a skipblock as a Rust struct with a `spec fn` stating that each backward hash commits to the prior block and each forward signature verifies under the witness key. A Verus proof can establish local link consistency and monotonic indices; cryptographic primitive correctness and signature verification remain trusted specifications or external libraries. `old(...)` can state that an append operation preserves prior payloads and backward links; forward-link slots may be filled later. Verus has no native distributed consensus or signature network.

## technique: decentralized timeline and freshness proofs

What it is and when to use it. CHAINIAC separates ROOT, CONFIG, RELEASE, and TIME roles. The first three use interconnected skipchains; TIME provides a timestamp service. RELEASE records signed releases and links upward to ROOT and CONFIG; TIME blocks contain a wall-clock timestamp and the latest release hash. Witnesses check timestamps against their clocks and collectively sign them (§5.6, pp.1278–1279).

Steps from §§5.4–5.7 (pp.1278–1280), with client checks from §6 (p.1281).
1. Keep ROOT keys offline and use the CONFIG skipchain for online witness keys. Rotate developer keys by including a new policy file in a release’s Merkle tree and signing it with a threshold of current developer keys (§§5.5–5.6).
2. Include the previous release summary in the developer-signed proposal. Witnesses check the signatures, parent signature, and that the parent is the latest logged release with no competing successor, then run BFT-CoSi (§5.4, p.1278). RELEASE blocks also link upward to ROOT and CONFIG (§5.6).
3. Have the CONFIG leader create a TIME block when a release is co-signed, or every hour if nothing happens; witnesses check its release hash and that its time is sufficiently close to their clocks, for example within five minutes (§5.6).
4. For multi-package repositories, keep per-package release skipchains and aggregate their heads in a Merkle tree and aggregate skipchain (§5.7).
5. Have clients verify the project snapshot and Merkle proofs, then access outdated packages’ individual logs (§5.7, pp.1279–1280). Clients authenticate binaries, require updates linked forward from their installed release, and check timestamps to detect freeze and replay attacks, assuming a correct client clock and uncompromised witness thresholds (§6, p.1281).

Verus form (inference). A Verus state-machine proof can model valid transitions for release, configuration, and time records, with invariants that old payloads and backward links remain immutable and accepted releases point to a current configuration. Network delivery, wall clocks, and quorum signatures are environment assumptions; they cannot be established by a local Rust proof alone.

## evidence and limits

The experimental prototype is Go code: about 1.8k lines for new CHAINIAC code, plus 1.2k skipchain, 1.5k networking, and 1.8k BFT-CoSi lines (§7, p.1281). Debian reproducible-build experiments used 27 required, 50 popular, and 50 random packages; 10 random, 8 required, and 2 popular packages produced hashes differing from advertised hashes (§8.2, p.1282). Ninety percent of both random and required packages built in under three minutes (Fig.5, p.1282). Inference: these counts measure build reproducibility, not proof failures.

For witness cost, experiments used 7, 31, and 127 nodes and six packages; each witness spent 5–30 CPU-minutes per package (§8.3, p.1282). Build times were measured once and copied across runs; §8.1 reports extrapolating builds from four nodes to larger grids. For a 52,000-package Debian repository, aggregate skipblock creation cost about 20 CPU-seconds per release, and client overhead was 16% of APT communication (§8.5, p.1283). In PyPI replay data with 11,000 snapshots and 1.5 million requests from 400,000 clients over 30 days, a skipchain of height greater than one reduced proof communication by a factor of 15; base five reduced it by another factor of two (§§8.1, 8.4, pp.1281–1283).

The security analysis is explicitly informal (§1, p.1272; §6, p.1280). It trusts cryptographic primitives, a secure initial key bootstrap, honest thresholds, trustworthy compilers for build verifiers, careful developer review, and sufficiently correct client clocks (§3.2, p.1274; §6, pp.1280–1281). It does not prove the implementation correct, nor does it measure Verus or Rust. Inference: possible release-boundary risks for agent-written verified Rust include the following: an incorrect specification can be reproducibly built and signed, individual compromised verifiers can lie even while the required honest threshold remains intact, and a proof artifact can be bound to the wrong source unless the Merkle inputs are exact.

Key retention limits forward links: witnesses retain old signing keys until their forward links are generated, but delete expired keys unconditionally; expiration must leave enough time to create direct forward links (§6, p.1281). Recovery also has a timeliness limitation: “Old clients, whose network connectivity is attacker controlled, could be denied the knowledge of the new configuration, hence remain reliant on the old, compromised cothority configuration.” (§6, p.1280).

## techniques for the catalog

- threshold release approval — require independent developer signatures before a release enters the update system
- verified builds — have independent verifiers reproduce source and compare binary hashes
- skipchain history — use hash back-links and signature forward-links for logarithmic authenticated traversal
- freshness and key-rotation chains — separate root, configuration, release, and time records to support safe evolution
- aggregate package verification — bind many package heads in a Merkle tree and aggregate skipblock
