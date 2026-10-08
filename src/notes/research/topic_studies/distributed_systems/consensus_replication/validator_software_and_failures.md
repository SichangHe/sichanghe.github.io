# validator software: how real blockchain clients work and fail
(authored by agents unless marked 🧑)

scope and reading rules
- slice: validator clients as real software (consensus + execution code), how they break, how they are tested
- checked 2026-10-07 UTC; today's date matters because many items below are from 2025-2026
- "client" = the program a validator runs; "validator" = the voting identity
  - the host runs that identity’s software; failover can move it between hosts
- Rust flag: `[Rust]` = main language on GitHub per `gh api repos/<repo> --jq .language`; other tags show the language
- quote policy: quotes are copied from pages I fetched and read; "(search summary)" means I only saw a search-engine summary, not the page
  - for those I give no quote marks and treat the claim as unverified
- overlap: [blockchain_validators.md](blockchain_validators.md) covers protocol theory and three candidate experiments (crash recovery, signer migration, client diversity)
  - this note does not repeat Gasper/Casper/Goldfish/RLMD-GHOST theory
- overlap: the sibling verus_distributed project covers general verification of distributed systems
  - here I only cover what is specific to blockchain clients
- overlap: [Agave sizing note](../../../agave_verification_scope.md) (human, 531,500 Rust lines, 450,054 path-classified production)
  - I reuse that number and do not recount

## takeaways

- the selected validator incidents expose ordinary software failures
  - 2022-2026 incidents below are: infinite loops, panics, missing checks, wrong cache keys, non-deterministic maps, config values
  - inference: the proofs that exist (Gasper, Alpenglow, Mysticeti) do not cover the code paths that actually broke
- three failure shapes keep recurring
  - crash everyone running the same client (Solana Feb 2024, Reth Sep 2025, Nethermind Jan 2024)
  - make clients compute different answers for the same block (Sui Jan 2026, Aptos Oct 2023, Geth Nov 2020)
  - make one client so slow it misses duties (Prysm May 2023 and Dec 2025)
- code outside the consensus rules can still change consensus
  - Nethermind Jan 2024: code that only decoded a revert message for the JSON-RPC API threw an exception, and the block hash changed
  - Aptos Oct 2023: a "performance" change swapped a deterministic map for a non-deterministic one
  - inference: "which code can affect the state root" is a checkable property, and I found no tool for it
- Rust does not remove these bugs; it turns many into panics
  - Solana Jan 2026: a bounds-check panic in the gossip reassembly buffer killed validators
  - Solana Aug 2024: invalid alignment assumption, host segfault
  - Sui May 2026: arithmetic underflow crashed validators
  - inference: panic-freedom of network-facing Rust code is a good Verus target
- the Ethereum spec is executable Python, and treats any exception as "invalid block"
  - that rule is a trap: a crash in one client can look like a legitimate rejection
  - SpecTrum (Aug 2026) finds 27 cross-client divergences using a mechanized version of that spec
- Solana is mid-switch from Tower BFT to Alpenglow right now
  - testnet switched 24 Sep 2026; mainnet date not announced
  - the whitepaper has pen-and-paper proofs; I found no official machine-checked proof; community TLA+ and one Lean repo exist
  - the switch-over code (`votor-messages/src/migration.rs`) is Rust and was in a 50,000 SOL bounty scope in Aug 2026
- parallel execution is determinism by construction and by test
  - Block-STM (Rust, Aptos), Monad (C++/Rust), Sealevel (Solana) all promise "same result as running in order"
  - Chord (ICSE 2025) found 54 parallelism bugs, so the promise is not free
- formal methods on real clients are thin
  - the 2026 SoK on verified consensus protocols says "specification-implementation disconnects undermine real-world assurance"
  - Ethereum Foundation lists consensus specs and implementations as a later (2027) deliverable of its verified-zkEVM effort (search summary)
- candidate experiment, in my opinion: check panic freedom, termination, or deterministic results for one small Rust module implicated in a documented incident
  - define one property and pin the buggy and fixed revisions before estimating proof work

## the landscape

### solana: Agave, Firedancer, Tower BFT, Alpenglow

- Agave `[Rust]` is the main Solana validator client, maintained by Anza
  - human's sizing: 531,500 Rust code lines in 1,215 files at commit 88345aa (see Agave note)
  - Anza's Alpenglow code lives in the same repo (crates `votor`, `votor-messages`, `bls-sigverify`, `bls-cert-verify`)
    - [alpenglow repo README](https://github.com/anza-xyz/alpenglow): "The Alpenglow consensus code subject to the competition is hosted in Anza's Agave GitHub repository"
- Firedancer is Jump's independent client, written in C `[C]`
  - [Immunefi scope page](https://immunefi.com/audit-competition/firedancer-v1-audit-comp/scope): "Lines of Code 636,000", "Start Date 09 April 2026", "End Date 09 May 2026", "Primary Pool $700,000 All Stars Pool $200,000 Podium Pool $100,000"
  - "Frankendancer" = Firedancer's networking front-end bolted onto Agave's runtime; the Immunefi page lists "Frankendancer codebase" as out of scope
  - full Firedancer reached mainnet in Dec 2025 (search summary of The Block; unverified)
  - results of the April-May 2026 contest: not found
- two clients means a bug in one no longer stops the cluster, but only if stake is split
  - [Solana Compass](https://solanacompass.com/news/solana-marks-30-consecutive-months-without-a-network-wide-outage) reports 30 months without a network-wide outage as of Aug 2026
    - I read only the headline claim; treat the number as the outlet's claim
- Tower BFT is Solana's current voting rule
  - [SIMD-0326](https://raw.githubusercontent.com/solana-foundation/solana-improvement-documents/main/proposals/0326-alpenglow.md) (Anza): "The current TowerBFT consensus protocol: - has a consensus finality time of 12.8 seconds, - additionally provides earlier pre-confirmations, - and does not have a security proof, which is concerning."
- Alpenglow replaces Proof of History + Tower BFT with Votor (voting) and later Rotor (block spreading)
  - [Whitepaper v1.1](https://www.anza.xyz/alpenglow-1-1) abstract: "The voting component Votor finalizes blocks in a single round of voting if 80% of the stake is participating, and in two rounds if only 60% of the stake is responsive."
  - same abstract: "Alpenglow features a distinctive “20+20” resilience, wherein the protocol can tolerate harsh network conditions and an adversary controlling 20% of the stake. An additional 20% of the stake can be offline if the network assumptions are stronger."
  - plain words: up to 20% attackers plus 20% crashed nodes, instead of the classic "less than one third attackers"
  - [Helius on Agave 4.3](https://www.helius.dev/blog/agave-v4-3): "Agave 4.3 introduces Votor while retaining the existing block propagation protocol, Turbine. Rotor was explicitly excluded from SIMD-0326"
  - votes leave the blocks: SIMD-0326 says "In Alpenglow, votes are not transactions on chain anymore, but just sent directly between validators."
- rollout status
  - proposal approval date and vote result were not verified against a primary record
  - [Solana Compass, 24 Sep 2026](https://solanacompass.com/news/alpenglow-is-live-on-solana-testnet-as-anza-retires-towerbft-and-votor-takes): "Anza confirmed at 18:12 UTC on 24 September 2026 that the handoff completed at slot 444625255: the Alpenglow genesis block formed, TowerBFT was retired, and testnet now finalizes blocks with Votor"
    - same page: "At the boundary, validators confirmed a final TowerBFT block with 82% of stake behind it"
    - same page: "No mainnet date has been announced."
- proofs for Alpenglow
  - whitepaper §2.9 gives a paper proof; the claim: "Suppose a correct node finalizes a block b in slot s. Then, if any correct node finalizes any block b′ in any slot s′ ≥ s, b′ is a descendant of b."
  - [Anza blog](https://www.anza.xyz/blog/alpenglow-a-new-consensus-for-solana): "the white paper contains correctness proofs"
  - I read the safety section headings only; I did not check the proofs
  - community formal models exist and I did not vet them
    - TLA+: [KetanParmar02/alpenglow-verif](https://github.com/KetanParmar02/alpenglow-verif), [dotslashapaar/alpenglow_tla](https://github.com/dotslashapaar/alpenglow_tla) and others from Sep-Oct 2025
    - Lean: [Nagaprasadvr/alpenglow-prover](https://github.com/Nagaprasadvr/alpenglow-prover) ("A lean project to prove alpenglow theorems", updated 3 Oct 2026)
    - inference: these model the paper protocol, not the Rust code
  - Stateright model for Alpenglow: not found
  - Runtime Verification involvement in Alpenglow: not found
- Alpenglow bug bounty, Aug 2026
  - [RULES.md](https://github.com/anza-xyz/alpenglow/blob/main/RULES.md): "Anza is running a time-boxed bug bounty competition on the Alpenglow consensus stack in Agave, with a prize pool of up to 50,000 SOL."
  - window 2026-08-05 to 2026-08-19; PoC required; categories include "a certificate accepted below the required stake threshold, contradictory finality, or acceptance of equivocating votes that should be rejected"
  - "The TowerBFT-to-Alpenglow migration logic (`votor-messages/src/migration.rs`) is in scope."
  - results: not found
- Solana's other security machinery
  - Agave runs a GitHub-advisory bounty portal ([SECURITY.md](https://github.com/anza-xyz/agave/blob/master/SECURITY.md)); each submission needs a PoC and burns SOL
  - Firedancer CI: [docs](https://www.mintlify.com/firedancer-io/firedancer/developer/testing): "Firedancer runs a large set of test vectors in CI that test conformance between Firedancer and Agave’s execution down to the same error code."
    - vectors come from "past fuzzing campaigns", hand-written tests, and "Fixed mismatches, added as regression tests"
  - [Asymmetric Research](https://blog.asymmetric.re/finding-fractures-an-intro-to-differential-fuzzing-in-rust/): "At Asymmetric Research, we’ve had a lot of success using differential fuzzing to uncover consensus bugs in various areas, including between the Agave and Firedancer implementations of the Solana validator client."
    - no list of the bugs found is public that I could find

### solana outages and near-misses, 2022-2026

- Jun 2022: durable-nonce transactions broke block validation (search summary; I did not read a primary report)
- Sep 2022: [Solana Foundation report](https://solana.com/news/09-30-22-solana-mainnet-beta-outage-report)
  - cause: "Due to a validator operator’s malfunctioning hot-spare node, which the operator had deployed as part of a high-availability configuration, duplicate blocks were produced at the same slot height."
  - bug: "Even though the correct version of the block 221 was confirmed, a bug in the fork selection logic prevented block producers from building on top of 221 and prevented the cluster from achieving consensus."
  - lesson (inference): an operator's failover setup produced the equivocation; compare candidate 2 in blockchain_validators.md
- 6 Feb 2024: [Anza report](https://solana.com/news/02-06-24-solana-mainnet-beta-outage-report), about five hours
  - "the new JIT output is inserted at the sentinel effective slot height of zero. This makes it effectively invisible to LoadedPrograms as the new entry is placed behind the unloaded entry. So every iteration through the mainloop triggers another recompilation of the same program as it always appears to be unloaded. This created a classic infinite loop."
  - "Since at the time of the outage, more than 95% of cluster stake was running 1.17, nearly all validators were stalled on this block. Since everyone was stalled in a recompilation loop, no one was voting and as a result, consensus halted irrecoverably."
  - same page: the bug was already known from a Devnet outage the week before
  - inference: a cache keyed by a sentinel value is a liveness bug that a bounded-loop proof would flag
- 5 Aug 2024: [Anza RCA](https://www.anza.xyz/blog/agave-network-patch-root-cause-analysis)
  - "This vulnerability would have allowed an exploiter to crash leaders one by one, eventually halting the network."
  - "The vulnerability was the result of an invalid assumption about address alignment." The VM's `CALL_REG` assumed an aligned `.text` section, but "the ELF sanitization omits an alignment check"
  - spec-vs-implementation shape: a check lives in one layer (loader sanitizer) and is assumed in another (VM)
- Dec 2025 report, Jan 2026 patch: [Anza summary](https://www.anza.xyz/blog/january-2026-gossip-and-vote-processing-security-patch-summary)
  - gossip: "A bug in this cleanup logic triggered the bounds check error during read of an intermediate data structure, resulting in a panic, terminating the validator process."
  - votes: "VoteStorage failed to verify that the signer is the configured vote authority for that validator."
    - effect: a forged far-future vote from any keypair blocked the genuine vote from being stored, which "could have stalled consensus"
  - both fixed with Firedancer and Jito; "There was no known attack on the cluster."
- 13 Aug 2026: 102 of 699 validators went offline, no halt
  - [Spend Node](https://www.spendnode.io/blog/solana-validator-outage-102-of-699-nodes-august-2026/) quotes WuBlockchain citing a Solana Foundation executive; I found no primary postmortem
  - the cause: not found

### ethereum: eight-plus clients, one executable spec

- split: consensus layer (CL) decides which block is head and finalized; execution layer (EL) runs transactions and checks the state root
  - they talk over the Engine API; an EL saying INVALID is what makes the CL reject a block
- CL clients (language from GitHub / [SpecTrum §1](https://arxiv.org/abs/2608.17738))
  - Lighthouse `[Rust]`, Grandine `[Rust]`, Prysm `[Go]`, Teku `[Java]`, Nimbus `[Nim]`, Lodestar `[TypeScript]`
- EL clients
  - Reth `[Rust]`, Geth `[Go]`, Erigon `[Go]`, Nethermind `[C#]`, Besu `[Java]`
- the spec is runnable Python: [consensus-specs](https://github.com/ethereum/consensus-specs)
  - lists forks Phase0 through Fulu (stable, epoch 411392) and Gloas, Heze (unstable)
  - Gloas is the fork that brings enshrined proposer-builder separation (my background knowledge; not checked in the spec text)
  - exception rule, quoted in [Cassez et al. §2.3](https://arxiv.org/abs/2110.12909) and [SpecTrum §1](https://arxiv.org/abs/2608.17738): "State transitions that trigger an unhandled exception (e.g. a failed assert or an out-of-range list access) are considered invalid. State transitions that cause a uint64 overflow or underflow are also considered invalid."
- who tests what
  - consensus-spec-tests: hand-written vectors released with the spec
  - [Hive](https://github.com/ethereum/hive): "Hive is a system for running integration tests against Ethereum clients." with public instances for "consensus, p2p and blockchain compatibility"
  - [Antithesis case study](https://antithesis.com/blog/ethereum_merge/): "their internal test system “Hive” runs 44,000 unit tests a day" and "the standard approach of manually written tests was deemed to be insufficient"
    - what they ran: "Antithesis ran Ethereum’s entire network (including the proposed Proof of Stake code) inside of the Antithesis environment" with injected faults
    - result: "dozens of serious bugs within the Ethereum network’s codebase prior to the Merge"; thirteen in the "Panics, Crashes, or Denials of Service" class
    - this is a vendor write-up (Antithesis's own claim); it names no 2025-2026 use
  - a fuzzer found the Kintsugi merge-testnet split: [incident report](https://notes.ethereum.org/@parithosh/BkkdHWXTY)
    - "A fuzzer created an invalid block that was deemed valid by Nethermind and Besu due to a missing check."
    - "The block was incorrectly validated in Nethermind due to a cache issue, while Besu did not have such a check at all."
  - Fusaka audit contest: [Octane write-up](https://www.octane.security/post/ethereum) calls it "a four-week, $2M security competition co-sponsored by Gnosis and Lido"
  - Sigma Prime's Beacon Fuzz does differential fuzzing of CL state transition (search summary: supports Lighthouse, Prysm, Nimbus)
- research on Ethereum client testing
  - Fluffy, OSDI 2021: multi-transaction differential fuzzing of ELs
    - [paper](https://www.usenix.org/conference/osdi21/presentation/yang) intro: "Fluffy found two new consensus bugs in the most popular Geth Ethereum client which were exploitable on the live Ethereum mainnet."; it says one "was triggered on the Ethereum mainnet on November 11th, 2020" four months after reporting, and calls the resulting hard fork "the greatest challenge since the infamous DAO hack of 2016"
    - table 2 of the paper lists only 13 consensus bugs in Geth and Parity from 2014 to 2019, "Only 6 of the 13 bugs are high-impact"
  - Forky, ICSE 2025: fork-aware differential fuzzing of Bitcoin and Ethereum ([abstract](https://conf.researchr.org/details/icse-2025/icse-2025-research-track/145/Fork-State-Aware-Differential-Fuzzing-for-Blockchain-Consensus-Implementations))
  - LOKI, NDSS 2023: [paper](https://www.ndss-symposium.org/wp-content/uploads/2023-78-paper.pdf), state-aware consensus fuzzing; claims 20 new vulnerabilities in Geth, Diem, Fabric, FISCO-BCOS (search summary)
  - SpecTrum, ASE 2026 ([arXiv 2608.17738](https://arxiv.org/abs/2608.17738)): "Applying SpecTrum to five major Ethereum consensus clients, we identify 27 cross-client divergence cases, 22 of which cannot be found without the premises inserted in our mechanization."
    - they rewrite the Python spec in the SpecTec language "as if-premises", measure which premises official tests never make false, and generate inputs to flip them
    - "Some divergences are silent: clients accept the same input yet compute different post-states, undetectable by accept/reject testing."
    - "We have reported all the identified divergences to the Ethereum Protocol Bug Bounty Program (bounty@ethereum.org) and they are awaiting triage." (author's claim; no maintainer verdict yet)
    - my caution: Table 1 shows many cases start from impossible states (e.g. "state.validators set to an empty list"); whether any is reachable on mainnet is unknown
  - EthCRAFT, Jan 2026: [arXiv 2601.21593](https://arxiv.org/abs/2601.21593), RPC bugs in EL clients (outside consensus, but see Nethermind Jan 2024)
  - Dafny Beacon Chain, TACAS 2022: [Cassez, Fuller, Asgaonkar](https://arxiv.org/abs/2110.12909), "formally specified and verified the absence of runtime errors in (a large and critical part of) the Beacon Chain reference implementation", and "we have uncovered several issues"
    - this verifies the Python spec's logic, not any shipping client
- formal specs of Ethereum
  - Runtime Verification built a K model of the Beacon Chain with the EF ([blog](https://runtimeverification.com/blog/a-formal-model-in-k-of-the-beacon-chain-ethereum-2-0s-primary-proof-of-stake-blockchain), search summary)
  - [EF verified-zkEVM page](https://pq.ethereum.org/blog/formal-verification-zkevm/) could not be fetched; a search summary says consensus specs and implementations are a 2027 deliverable (unverified)
  - Gasper proofs: "an experimental branch" of eth2.0-dafny (search summary); see [blockchain_validators.md](blockchain_validators.md) for the Gasper theory

### ethereum incidents, 2020-2026

- Nov 2020, Geth: consensus bug found by Fluffy, triggered on mainnet; see Fluffy quotes above
  - nodes on the old version forked off; Infura was hit (search summaries, not read)
- Kintsugi merge testnet (2021, date not in the report text I read): see above; a fuzzer-made block split the testnet three ways
- May 2023, Prysm (and Teku): finality lost twice in two days (search summary; I did not read the primary writeup)
  - [Potuz, Dec 2025](https://www.potuz.net/posts/fulu-bug/): "This is a full explainer of the DOS experienced by Prysm nodes at the Capella and Fusaka forks."
  - the same bug class came back: the Capella fix "included a clause that was fundamentally flawed: If the attestation checkpoint is canonical and from the current epoch, use the head state"
- 6 Jan 2024, Besu: about 70% of Besu nodes halted at block 18947893 (search summary of the Hyperledger postmortem; page not fetchable)
  - reported cause: a bad "trie log" in the Bonsai storage format for a self-destructed contract; unverified here
- 21 Jan 2024, Nethermind: [post-mortem](https://hackmd.io/LpQHrQelSA-bW4GgfE8S4Q.md)
  - "Nethermind client versions 1.23.0, 1.24.0, 1.25.0, and 1.25.1 processed a valid block as invalid."
  - "A revert opcode in a smart contract transaction caused an unhandled OverflowException in the code that tried to decode the revert message."
  - "The PR was part of JSON-RPC standardization." and "Parsing the revert message should not have affected the overall block, regardless of the message."
  - inference: this is the exception-means-invalid rule biting an API nicety
- 24 Feb 2025, Holesky (testnet): [Sigma Prime](https://blog.sigmaprime.io/pectra-holesky-incident.html)
  - "Geth, Nethermind and Besu incorrectly accepted an invalid block due to a misconfigured depositContractAddress value."
  - "Since a super-majority of the network was running either Geth, Nethermind or Besu, a super-majority of the network had attested to an invalid block."
  - client diversity did not help because three of five ELs shared the same wrong config value
  - Lighthouse then ran out of memory in long non-finality: "inactivity leak penalties added roughly 70MB of new data to the Beacon State at each epoch boundary"
- 2 Sep 2025, Reth: [Stakely](https://stakely.io/blog/reth-incident-why-client-diversity-matters-in-ethereum-infrastructure): "a critical issue caused most Reth execution clients on the Ethereum mainnet to stop working"
  - cause: a trie-update bug giving a wrong state root (search summary of The Block / Reth postmortem; primary not fetchable)
- 4 Dec 2025, Prysm after Fusaka: [Prysm postmortem](https://prysm.offchainlabs.com/docs/misc/mainnet-postmortems/)
  - "Nearly all Prysm nodes experienced a resource exhaustion event when attempting to process certain attestations."
  - "During these 42 epochs, a total of 248 blocks were missing out of 1344 slots. This was an 18.5% missed slot rate. Network participation was as low as 75% during the incident."
  - "The bug was introduced in Prysm PR 15965 and deployed to testnets a month before the incident without the trigger happening."
  - "A client with more than 1/3rd of the network would have caused a temporary loss in finality and more missed blocks. A bug client with more than 2/3rd could finalize an invalid chain."
  - "The issue only manifests in a large state with many validators out of sync."
  - the fix flag was inverted by mistake in the first message: "There was a miscommunication about the feature flag."
- early 2026, Nethermind blob-transaction bug: [Octane](https://www.octane.security/post/ethereum)
  - "missing length-equality enforcement in Nethermind's blob transaction validation" let malformed blob transactions into the mempool, so the node "skips the proposal"
  - "inhibited the network's ability to process transactions across nearly 40 percent of mainnet Ethereum validators" (Octane's claim); "awarded $50,000, the maximum high-severity payout"
  - found by an AI tool during the Fusaka audit contest; the vendor says every submission "began as an AI-generated finding that Guhu then validated"
- the Fusaka retro lists open bug reports across clients: [retro](https://notes.ethereum.org/@parithosh/fusaka-retro)
  - e.g. "Prysm forks when missing slots", "KZG verification disagrees with others", "Wrong Fork in verify_header_signature" (Lighthouse), "Panic on invalid data columns" (Grandine)
  - inference: a hard fork multiplies bug count across all clients at once
- client share, to size "diversity"
  - [clientdiversity.org](https://clientdiversity.org/) page I fetched shows conflicting CL sources: Miga Labs "Lighthouse - 52.3%", Rated.Network "Teku - 53.86%", Blockprint "Teku - 99.83%"
  - the same page shows EL "Geth - 50.13%" from Ethernodes and says "Data is stale" for the survey source
  - inference: nobody can say the true stake-weighted split; the Prysm postmortem itself cites "Lighthouse may represent more than 56% of the network (source: Miga Labs via clientdiversity.org, on December 12, 2025)"

### aptos and sui (Move chains) `[Rust]`

- Aptos
  - Block-STM: [paper abstract](https://arxiv.org/abs/2203.06871): "every execution of the block must yield the same deterministic outcome. Block-STM further enforces that the outcome is consistent with executing transactions according to a preset order"
    - "Our Block-STM implementation is in Rust, and is merged on the main branch of the open source Diem and Aptos projects" (§4)
    - speed claim: "up to 170k tps in the Aptos Benchmarks" with 32 threads (authors' benchmark)
  - consensus: Jolteon (HotStuff-family, lower latency) with Quorum Store data spreading; Baby Raptr is the first production piece of the newer Raptr design (search summary of Aptos pages; not fetched)
  - Oct 2023 outage: [Crypto Daily quoting the post-mortem](https://cryptodaily.co.uk/2023/10/aptoss-5-hour-network-outage-caused-by-code-issues)
    - "Specifically, validators agreed that a transaction had an insufficient gas budget to execute a transaction, and they were unable to agree upon the amount of gas used up to that point as a result of the non-determinism introduced in the August code change."
    - the change swapped a deterministic map for a non-deterministic one (search summary); the primary page was blocked for me
  - formal: Move Prover is used on the Aptos framework (search summary); that checks contracts, not the validator
- Sui
  - Mysticeti consensus: [paper](https://arxiv.org/abs/2310.14821) (NDSS 2025); "We implement a networked multi-core Mysticeti validator in Rust. It uses tokio"
  - mechanized proofs: Qiu, Xiao, Shao, "Mechanized Safety and Liveness Proofs for the Mysticeti Consensus Protocol under the LiDO-DAG Framework", IEEE S&P 2026 (already in the paper collection; not read by me)
  - design: consensus orders, then "Deterministic execution turns those commits into checkpoints", then a quarantine layer
  - 14 Jan 2026 stall: [Sui blog](https://blog.sui.io/sui-mainnet-network-stall-resolution)
    - "an edge-case bug in consensus commit logic related to handling conflicting transactions under certain garbage collection conditions, in which an optimization path caused different validators to reach different conclusions when computing consensus commits."
    - "Validators exchanged checkpoint signatures and observed that more than 1/3 of stake was signing a different digest, making certification impossible. As a result, validators stalled to avoid finalizing inconsistent state."
    - "No certified state forks occurred and no certified transactions were rolled back." (Sui's claim)
    - this is the good case: the second layer (checkpoint signing) caught a bug in the first (consensus commit), and the chain halted instead of forking
  - 28-29 May 2026 triple halt: [CoinDesk](https://www.coindesk.com/tech/2026/06/01/three-sui-mainnet-halts-in-48-hours-traced-to-an-upgrade-bug-by-developers)
    - "The bug caused validators to crash with an underflow error when a transaction was canceled for insufficient funds, but the gas-smashing routine still tried to spend those same funds."
    - the interim fix "carried “a known issue with a low probability of causing a halt.”" and "The known risk materialized the next morning."
    - third halt: "A latent bug then failed to persist that disabled state to disk, leaving validators unaware on the next restart that randomness had been turned off."
    - these are the Sui Foundation's findings as reported by CoinDesk; I did not read the original
  - sui is a single-client chain (the Sui forum thread "Single Client = Single Point of Failure" exists; I did not read it)

### cosmos, avalanche, polkadot, celestia, monad, hyperliquid

- CometBFT `[Go]`
  - Tendermint-descended; apps talk through ABCI; many chains share one codebase (inference: a bug is correlated across chains)
  - advisories found via HackerOne reports
    - ASA-2025-002 ([primary advisory](https://github.com/cometbft/cometbft/security/advisories/GHSA-r3r4-g7hq-pq4f), inspected through GitHub’s API on 2026-10-08 UTC)
      - exact title: “Malicious peer can stall network by disseminating seemingly valid block parts”
      - technical section: “`Part.Index` must be equal to `Part.Proof.Index`”
      - mismatched indices could spread invalid parts while preventing retrieval of the correct part
      - the advisory’s patch dates conflict with its report dates; chronology is not inferred here
    - ASA-2025-003 (Oct 2025): invalid BitArray handling may halt the network (unverified search summary)
    - 2024 `VoteExtensionsEnableHeight`: a governance parameter change could halt an ABCI2 chain (search summary)
  - pattern: missing input validation on peer-supplied data, same as Solana gossip bug
- Avalanche `[Go]` (avalanchego)
  - [post-mortem on delegatecall](https://docs.avax.network/blog/delegatecall-incident): "A P1-critical vulnerability was discovered by our audit partners, Trail of Bits, during a routine audit."
  - "they allowed DELEGATECALL but assumed its EVM semantics would not be honored. The new libevm implementation correctly implemented DELEGATECALL semantics, and this mismatch between expected"
  - "The vulnerability was never exploited on Mainnet or any public L1."
  - spec-vs-implementation shape: a new EVM library made an old undocumented assumption false
  - earlier 2024 gossip-saturation stall (search summary only)
- Polkadot `[Rust]` (polkadot-sdk)
  - alternative clients: Kagome `[C++]`; Gossamer `[Go]`
  - [ChainSafe referendum 1699](https://polkadot.polkassembly.io/referenda/1699): "we’ve made a strategic decision to shift our focus from developing an alternative client to contributing directly to the existing Rust-based SDK implementation."
  - inference: a second client was dropped for lack of funding priority, so client diversity is an economic choice
  - no 2025-2026 validator incident found
- Celestia `[Go]` (celestia-app, celestia-core is a CometBFT fork)
  - light nodes check data availability by random sampling; the docs say a light node must do "a minimum of 16 samples" (search summary)
  - no validator incident found
- Monad (mainnet 24 Nov 2025 per search summary)
  - [docs](https://docs.monad.xyz/monad-arch/index.md): "The first Monad client is built by Category Labs and is written from scratch in C++ and Rust"; execution `monad` `[C++]`, consensus `monad-bft` `[Rust]`
  - [parallel execution](https://docs.monad.xyz/monad-arch/execution/parallel-execution.md): "Monad blocks are the same as Ethereum blocks - a linearly ordered set of transactions. The result of executing the transactions in a block is identical between Monad and Ethereum." and "Monad uses optimistic execution"
    - it names the same ideas as Block-STM: "optimistic concurrency control (OCC) and software transactional memory (STM)"
  - [asynchronous execution](https://docs.monad.xyz/monad-arch/consensus/asynchronous-execution.md): "In Ethereum and most other blockchains, execution is a prerequisite to consensus."; Monad decouples them so execution gets the full block time
    - consequence (inference): validators vote before they know the state root; the recovery and state-root-lag questions of candidate 1 in blockchain_validators.md apply directly
  - I found no public Monad incident or audit results
- Hyperliquid
  - [docs](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview.md): "Hyperliquid is secured by HyperBFT, a variant of HotStuff consensus."
  - the node repo [hyperliquid-dex/node](https://github.com/hyperliquid-dex/node) holds a Dockerfile, a `pruner` and `pub_key.asc`, not consensus source (listing I read)
  - The Block reports the foundation saying the node code "is currently closed source" (search summary; unverified)
  - inference: no outside party can fuzz or verify the validator code; only its binary

### parallel execution and deterministic state roots

- idea: every validator must compute the same state hash, so any concurrency must be invisible
- Block-STM (Aptos, Rust), Monad (C++/Rust): run transactions optimistically, re-run on conflict, merge in block order
- Solana's Sealevel: transactions declare the accounts they touch so non-conflicting ones can run together (my background knowledge; not re-checked)
- bug evidence
  - Chord, ICSE 2025 ([abstract](https://conf.researchr.org/details/icse-2025/icse-2025-research-track/191/Chord-Towards-a-Unified-Detection-of-Blockchain-Transaction-Parallelism-Bugs)): "Results show that most of them arise from mishandling conflicting transactions and manifest without obvious phenomena." and "Chord successfully detects 54 transaction parallelism bugs."
  - the Block-STM paper handles one subtle point in its scheduler: "By reading decrease_cnt twice in check_done, it is possible to detect if validation or execution index decreases" (§3); a classic lock-free termination detail
- where the state root lives
  - Ethereum: block header carries the post-state root, so execution is in the consensus path
  - Monad: execution lags consensus (above)
  - Sui: "Deterministic execution turns those commits into checkpoints" and 2f+1 stake must sign the same checkpoint digest
- inference: the cheapest independent check of determinism is cross-client or cross-run state-root comparison, which is how Sui's Jan 2026 bug was caught

### light clients and bridges as consensus verification

- a light client checks block headers without running the chain; a bridge contract on chain B acts as a light client of chain A
- Ethereum sync committee: 512 validators sign headers for light clients
  - search summary says members "are not slashed for signing fraudulent attestations" and EIP-7657 proposes sync-committee slashing (unverified wording)
- Helios `[Rust]` is the Rust Ethereum light client; SP1 Helios and R0VM Helios wrap it in zk proofs
  - audits: Zellic (Jul 2025) for SP1 Helios; zkSecurity (Apr 2025) for RiscZero Helios (search summary)
- Tendermint light client: TLA+/Apalache models exist; see [validator_sources.md](validator_sources.md)
- bridge losses are mostly message-authentication bugs, not consensus bugs
  - Wormhole 2022: a deprecated Solana syscall and a spoofed verification account (search summary)
  - Hyperbridge Apr 2026: a "forged cross-chain message" (search summary of a monthly report; unverified)
- economic version: [Moshrefi et al., Unconditionally Safe Light Client](https://arxiv.org/abs/2405.01459): light client security is "economic (implied by the 'stake')"; I did not read it

### economics that shape the software, one paragraph each

- slashing: a validator that signs two conflicting votes loses stake
  - so clients keep a "slashing protection" database of past signatures and refuse to sign again (EIP-3076 format; see the signer-migration candidate in blockchain_validators.md)
  - Sep 2022 Solana duplicate blocks came from a failover pair using one identity, the same fear in another chain
- MEV and proposer-builder separation: [ethereum.org](https://ethereum.org/en/roadmap/pbs/): "Present-day Ethereum validators create and broadcast blocks. They bundle together transactions that they have heard about through the gossip network and package them into a block that is sent out to peers on the Ethereum network. Proposer-builder separation (PBS) splits these tasks across multiple validators."
  - software effect: validators run extra sidecars (builder/relay clients), and one more interface (builder API) can fail
  - Solana's equivalent is the Jito client, patched alongside Agave in Jan 2026
- operator pressure: Solana Foundation delegation rules now list required client versions ([CryptoSlate](https://cryptoslate.com/terrifying-solana-flaw-just-exposed-how-easily-the-always-on-network-could-have-been-stalled-by-hackers/) reports "Agave 3.0.14 and Frankendancer 0.808.30014")
  - stake follows version compliance, so a secret security patch must reach most stake fast (inference)

### how these projects test and verify, in one view

- fuzzing and differential testing
  - Solana: Firedancer-vs-Agave conformance vectors, differential fuzz harnesses; Asymmetric Research differential fuzzing
  - Ethereum: Hive, spec tests, Beacon Fuzz, Fluffy, Forky, SpecTrum
  - Antithesis: Ethereum Merge (2022), vendor claim; Antithesis on Solana/Sui/others: not found
  - Byzantine test generators: Twins (Diem) and ByzzFuzz (Tendermint, XRP Ledger), per search summaries
- formal specs
  - Ethereum: executable Python spec, Dafny proof of absence of runtime errors, K model, SpecTec mechanization
  - Solana: Alpenglow whitepaper proofs on paper, community TLA+/Lean
  - Sui: Mysticeti LiDO-DAG mechanized proofs (S&P 2026)
  - Aptos/Sui contracts: Move Prover; not the validator
- audits and bounties
  - Firedancer $1M Immunefi contest, Alpenglow 50,000 SOL contest, Ethereum Fusaka $2M contest, Agave and Ethereum standing bounties, Cosmos HackerOne
  - kinds of bugs found, from this note: missing input checks (CometBFT, Solana vote), panics (Solana gossip, Sui), config/spec mismatch (Holesky, Avalanche), non-determinism (Aptos), cache logic (Solana, Nethermind Kintsugi), performance cliffs (Prysm)
- the 2026 SoK ([arXiv 2608.21935](https://arxiv.org/abs/2608.21935)) says: "Most verified models target abstract TLA+ or Rocq specifications that diverge significantly from production Go/Rust code. This disconnect creates assurance blind spots: verified theorems do not guarantee implementation correctness"
  - its protocol list (Raft, HotStuff, FairDAG, Beacon Chain, Tendermint, Algorand) does not include Solana or Alpenglow (I searched the text for them)

## what is unsolved or messy

- this review did not establish that the selected shipping clients refine their protocol proofs
  - Alpenglow, Gasper, Mysticeti proofs are about the protocol; the incidents are in code
  - SoK quote above
- "client diversity" is weaker than it sounds
  - shared inputs defeat it: three ELs accepted the same wrong `depositContractAddress` on Holesky
  - shared spec text defeats it: SpecTrum's 27 cases mean the spec leaves cases open
  - one client dominates: the Prysm postmortem says "A bug client with more than 2/3rd could finalize an invalid chain."
  - the share numbers themselves disagree across sources (clientdiversity.org page)
  - Sui, Hyperliquid, and most Cosmos chains are effectively single-client
- fixes ship in a hurry and cause the next bug
  - Prysm: Capella fix flawed, Fusaka reintroduced a cousin; flag semantics reversed in the first message
  - Sui May 2026: an interim fix with a "known issue" caused halt two
  - inference: patch review under pressure is a research object on its own
- rare-state bugs pass tests
  - Prysm: "deployed to testnets a month before the incident without the trigger happening"
  - Aptos: "The non-deterministic scenario was not reached in any of the testing scenarios" (search summary of the Aptos report; primary blocked)
  - Solana Feb 2024: known from Devnet a week earlier
- hard forks stress every client at the same moment
  - Fusaka retro lists dozens of issues across all CL clients
- unknowns I could not resolve
  - results of the Firedancer v1 and Alpenglow bounty contests
  - cause of the 13 Aug 2026 Solana 102-validator outage
  - root cause details of the May 2023 Prysm/Teku finality loss from a primary source
  - whether SpecTrum's 27 cases are reachable on mainnet
  - any machine-checked proof of Alpenglow, official or not
- practitioners' complaints I found
  - Prysm: "There was a miscommunication about the feature flag."
  - Octane: AI-found bugs got the max high-severity payout; Ethereum may now face bug floods from tools (my inference)
  - Hyperliquid: closed-source nodes (search summary)

## research ideas

order is my ranking for the human; see "my opinion" in each

### idea 1: panic-freedom and bounded-loop proofs for network-facing Agave modules
- what exists
  - Agave sizing note picks two synchronous targets (compute-budget sanitizer 349 lines, ALT views 119 lines) and avoids network code
  - Dafny proof of absence of runtime errors for the Ethereum spec (Cassez et al.)
  - Solana's real fixes: gossip defrag-buffer panic (Jan 2026), VoteStorage missing authority check (Jan 2026), CALL_REG alignment (Aug 2024), JIT recompile loop (Feb 2024)
- what is missing
  - this review did not establish a verification replay of these exact pre-fix revisions
    - search the defect reports and verification artifacts before claiming novelty
- why it matters
  - the clearest honest answer to "would verification have prevented a real Solana outage?"
- first experiment
  - check out the commits before each fix; carve the smallest function (the defrag-buffer cleanup; the VoteStorage insert)
  - write the Verus spec "never panics; keeps the buffer within capacity" and see whether the proof fails at the real bug
  - then prove the fixed version
  - also try the VoteStorage rule as a functional spec: "a stored vote has a valid vote-authority signature"
- risk someone did it
  - low for Verus on Agave; closest work is Dafny Beacon Chain (spec level) and Firedancer fuzzing
- my opinion
  - best first project: each target is small, the bug is known, the result is a clean yes/no

### idea 2: cross-protocol handoff and certificate-threshold proofs for Alpenglow's Rust code
- what exists
  - whitepaper paper-proofs; community TLA+ and a Lean repo; the Aug 2026 bounty lists "a certificate accepted below the required stake threshold" and the migration file as in scope
  - testnet handoff already ran: "validators confirmed a final TowerBFT block with 82% of stake behind it"
- what is missing
  - a proof (or even a model) that the Rust certificate checks (`bls-cert-verify`) enforce the 80%/60%/40% thresholds exactly, and that the TowerBFT-to-Alpenglow handoff cannot finalize two conflicting blocks
- why it matters
  - mainnet switch is pending; this is the largest single protocol change in Solana history per Anza's own words ("the biggest change to Solana’s core protocol since, well, ever")
- first experiment
  - read `votor-messages/src/migration.rs` and `bls-cert-verify`; extract the stake-threshold arithmetic into a pure function; prove overflow-free and threshold-correct in Verus
  - model the handoff as a two-state machine in Lean or TLA+ and check "no conflicting finalizations across the switch" for a small validator set
- risk someone did it
  - medium; the community TLA+ repos cover Votor but I did not see handoff coverage (did not read them in depth); contest participants may hold private findings
- my opinion
  - high value but time-sensitive: if mainnet ships first, the result is a retrospective

### idea 3: "which code can change the state root" analysis for execution clients
- what exists
  - Nethermind Jan 2024 (RPC code threw), Aptos Oct 2023 (non-deterministic map), Fluffy's Geth bugs (client program state vs chain state), SpecTrum's "silent" post-state differences
  - Reth `[Rust]` and Aptos `[Rust]` are open source
- what is missing
  - a tool that lists every function reachable from block execution and flags: panics, unchecked arithmetic, iteration over hash-ordered collections, floating point, time, randomness, threads
- why it matters
  - turns "determinism" from a code-review hope into a report; fits Rust's type system
- first experiment
  - on Reth and aptos-core, call-graph from the state-transition entry point; list `HashMap`/`HashSet` iterations and `unwrap`/index panics in that cone; manually triage 20 hits
  - then try proving order-independence for one hit with Verus
- risk someone did it
  - unknown; I found no tool for this, but `clippy` lints on HashMap iteration exist (my background knowledge, not checked)
- my opinion
  - effort and publication value remain untested
    - first measure whether the analysis identifies useful cases beyond existing checks

### idea 4: verify a Block-STM-style scheduler in Rust against the sequential spec
- what exists
  - Block-STM (Rust, paper-proof, open source), Monad's version (C++), Chord's 54 bugs, Aptos's later versions
- what is missing
  - machine-checked "parallel result equals sequential result" for the shipped Rust scheduler; Chord found bugs by testing, not proof
- why it matters
  - all high-throughput chains now depend on this equivalence
- first experiment
  - extract the scheduler (`check_done`, `decrease_cnt` logic) into a small crate; model-check with Loom or Shuttle (Rust concurrency checkers) for 2-3 threads and 3-4 transactions; compare to sequential result
  - only then attempt a Verus/ghost-state proof
- risk someone did it
  - medium; Block-STM's own proofs are on paper; I did not search for mechanized proofs of Block-STM specifically
- my opinion
  - a good second project because it connects to the human's concurrency interests; but harder than idea 1

### idea 5: dataset of client incidents labeled by root cause, then test the "diversity" claim
- what exists
  - the incident list in this note (about 20 events 2020-2026) and the existing client-diversity candidate in blockchain_validators.md
  - Monash study of 1,108 bug reports in eight blockchain systems (search summary)
- what is missing
  - a labeled table: per incident, which clients were hit, was the cause shared (spec, config, library, test gap), would a second implementation have helped
- why it matters
  - answers whether diversity buys independence or only a lucky split
- first experiment
  - label 30 incidents on four columns; count how many affected more than one client and why
  - cross-check with SpecTrum's 27 cases: how many are spec ambiguities
- risk someone did it
  - medium-low for incident-level labeling; there are bug-characteristics studies but I found none that covers 2023-2026 client incidents
- my opinion
  - low effort, good as background for ideas 1-3

### idea 6: mutation-test the Ethereum spec tests with real incident bugs
- what exists
  - SpecTrum measures "premise coverage" of official tests; real incident bugs are known and fixed
- what is missing
  - whether the official tests would have caught the Nethermind Jan 2024 or Holesky bugs; they are EL bugs, so use EL test suites (Hive, execution spec tests)
- first experiment
  - reintroduce the bug in a pinned client version; run the standard Hive consensus suite; record pass/fail
  - repeat for 5 incidents
- risk someone did it
  - low to medium; auditors do this informally and do not publish
- my opinion
  - small and concrete; pair with idea 5

### lower priority
- Verus pilot on the Helios sync-committee verification logic (small Rust, already audited; closest work is the Tendermint light client TLA+ model)
- LLM-agent bug hunting on consensus code: Agora (May 2026) reports "15 previously unknown protocol-level logic bugs" on Raft, EPaxos, HotStuff, BullShark implementations; Octane found a Nethermind bug; open: do agents find the panic/missing-check class in Agave or Reth

## sources

papers and specs
- Gelashvili et al., Block-STM, PPoPP 2023, <https://arxiv.org/abs/2203.06871> (saved; skimmed §3-4)
- Yang, Kim, Chun, Fluffy, OSDI 2021, <https://www.usenix.org/conference/osdi21/presentation/yang> (saved; read intro and table 2)
- Cassez, Fuller, Asgaonkar, Formal Verification of the Ethereum 2.0 Beacon Chain, TACAS 2022, <https://arxiv.org/abs/2110.12909> (saved; read §2)
- Babel et al., Mysticeti, NDSS 2025, <https://arxiv.org/abs/2310.14821> (saved; skimmed implementation section)
- Ma et al., LOKI, NDSS 2023, <https://www.ndss-symposium.org/wp-content/uploads/2023-78-paper.pdf> (saved; not read)
- Kniep, Sliwinski, Wattenhofer, Solana Alpenglow Consensus, Anza white paper v1.1, 22 Jul 2025, <https://www.anza.xyz/alpenglow-1-1> (saved; read abstract and safety statement)
- Jeong, Dan, Ryu, Hwang, SpecTrum, ASE 2026, <https://arxiv.org/abs/2608.17738> (saved; read abstract, intro, table 1)
- Bondarev, Ziborov, Yanovich, SoK: Formal Verification of Consensus Protocols, arXiv Aug 2026, <https://arxiv.org/abs/2608.21935> (saved; skimmed)
- Zhou et al., Chord, ICSE 2025, abstract only, <https://conf.researchr.org/details/icse-2025/icse-2025-research-track/191/>
- Kim et al., Forky, ICSE 2025, abstract only, <https://conf.researchr.org/details/icse-2025/icse-2025-research-track/145/>
- Liu et al., Agora, arXiv May 2026, abstract only, <https://arxiv.org/abs/2605.29910>
- Zhong et al., EthCRAFT, arXiv Jan 2026, abstract only, <https://arxiv.org/abs/2601.21593>
- Moshrefi et al., Unconditionally Safe Light Client, arXiv 2024, abstract only, <https://arxiv.org/abs/2405.01459>
- Qiu, Xiao, Shao, Mysticeti LiDO-DAG mechanized proofs, IEEE S&P 2026 (already in collection; not read)
- SIMD-0326 Alpenglow, <https://raw.githubusercontent.com/solana-foundation/solana-improvement-documents/main/proposals/0326-alpenglow.md>
- Ethereum consensus-specs README, <https://github.com/ethereum/consensus-specs>; Hive README, <https://github.com/ethereum/hive>

incident reports and primary posts read
- Anza, Feb 2024 outage, <https://solana.com/news/02-06-24-solana-mainnet-beta-outage-report>
- Solana Foundation, Sep 2022 outage, <https://solana.com/news/09-30-22-solana-mainnet-beta-outage-report>
- Anza, Aug 2024 patch RCA, <https://www.anza.xyz/blog/agave-network-patch-root-cause-analysis>
- Anza, Jan 2026 gossip and vote patch, <https://www.anza.xyz/blog/january-2026-gossip-and-vote-processing-security-patch-summary>
- Anza alpenglow bounty README and RULES, <https://github.com/anza-xyz/alpenglow>
- Prysm mainnet postmortems, <https://prysm.offchainlabs.com/docs/misc/mainnet-postmortems/>
- Potuz, History of a buggy bug, <https://www.potuz.net/posts/fulu-bug/>
- Nethermind Jan 2024 post-mortem, <https://hackmd.io/LpQHrQelSA-bW4GgfE8S4Q.md>
- Kintsugi incident report, <https://notes.ethereum.org/@parithosh/BkkdHWXTY>
- Sigma Prime, Pectra Holesky incident, <https://blog.sigmaprime.io/pectra-holesky-incident.html>
- Fusaka retro, <https://notes.ethereum.org/@parithosh/fusaka-retro>
- Sui, mainnet stall resolution (Jan 2026), <https://blog.sui.io/sui-mainnet-network-stall-resolution>
- Avalanche delegatecall post-mortem, <https://docs.avax.network/blog/delegatecall-incident>
- Antithesis, Testing the Ethereum merge, <https://antithesis.com/blog/ethereum_merge/>
- Octane, AI-found Nethermind bug, <https://www.octane.security/post/ethereum>
- Firedancer testing docs, <https://www.mintlify.com/firedancer-io/firedancer/developer/testing>; Immunefi scope, <https://immunefi.com/audit-competition/firedancer-v1-audit-comp/scope>
- Asymmetric Research, differential fuzzing in Rust, <https://blog.asymmetric.re/finding-fractures-an-intro-to-differential-fuzzing-in-rust/>
- Monad docs, <https://docs.monad.xyz/monad-arch/index.md>; Hyperliquid docs, <https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview.md>
- clientdiversity.org, <https://clientdiversity.org/>; ethereum.org PBS, <https://ethereum.org/en/roadmap/pbs/>

- CometBFT primary advisory ASA-2025-002, <https://github.com/cometbft/cometbft/security/advisories/GHSA-r3r4-g7hq-pq4f> (description and technical section inspected via GitHub API on 2026-10-08 UTC)

secondary (news, vendor blogs) read in full or part
- Solana Compass, Alpenglow testnet, <https://solanacompass.com/news/alpenglow-is-live-on-solana-testnet-as-anza-retires-towerbft-and-votor-takes>
- Helius, Agave 4.3, <https://www.helius.dev/blog/agave-v4-3>
- CoinDesk, three Sui halts, <https://www.coindesk.com/tech/2026/06/01/three-sui-mainnet-halts-in-48-hours-traced-to-an-upgrade-bug-by-developers>
- Crypto Daily, Aptos outage, <https://cryptodaily.co.uk/2023/10/aptoss-5-hour-network-outage-caused-by-code-issues>
- Stakely, Reth incident, <https://stakely.io/blog/reth-incident-why-client-diversity-matters-in-ethereum-infrastructure>
- Spend Node, 13 Aug 2026 Solana outage, <https://www.spendnode.io/blog/solana-validator-outage-102-of-699-nodes-august-2026/>
- CryptoSlate, Agave 3.0.14, <https://cryptoslate.com/terrifying-solana-flaw-just-exposed-how-easily-the-always-on-network-could-have-been-stalled-by-hackers/>

search summaries only (not fetched or blocked; claims unverified)
- Besu Jan 2024 (Hyperledger wiki), Reth Sep 2025 root cause (The Block, Notion), May 2023 finality loss (ethstaker Notion), Geth Nov 2020 Infura effects, Jun 2022 Solana, CometBFT ASA-2025-003, Avalanche 2024 gossip, SIMD-0326 vote result, Firedancer mainnet Dec 2025, Hyperliquid closed source, Aptos Baby Raptr, EF zkEVM formal verification page, Runtime Verification K Beacon Chain, Twins/ByzzFuzz, Sync committee/EIP-7657, bridge hacks 2026, Celestia sampling

saved to /hdd1/sichanghe/paper_collection (8)
- Systematization of Knowledge- Formal Verification of Consensus Protocols, Nikita Bondarev, Kirill Ziborov, Yury Yanovich, arXiv, 2026
- Block-STM- Scaling Blockchain Execution by Turning Ordering Curse to a Performance Blessing, Rati Gelashvili, ..., PPoPP, 2023
- Finding Consensus Bugs in Ethereum via Multi-transaction Differential Fuzzing, Youngseok Yang, Taesoo Kim, Byung-Gon Chun, OSDI, 2021
- Mysticeti- Reaching the Limits of Latency with Uncertified DAGs, Kushal Babel, ..., NDSS, 2025
- Formal Verification of the Ethereum 2.0 Beacon Chain, Franck Cassez, Joanne Fuller, Aditya Asgaonkar, TACAS, 2022
- LOKI- State-Aware Fuzzing Framework for the Implementation of Blockchain Consensus Protocols, Fuchen Ma, ..., NDSS, 2023
- Solana Alpenglow Consensus- Increased Bandwidth Reduced Latency, Quentin Kniep, Jakub Sliwinski, Roger Wattenhofer, Anza white paper v1.1, 2025
- SpecTrum- Specification-Guided Differential Fuzzing for Ethereum Consensus Clients, Seokhun Jeong, Gyeongmin Dan, Sukyoung Ryu, Sungjae Hwang, ASE, 2026

## searched and not found

- official machine-checked Alpenglow proof, Stateright model, or Runtime Verification work on Alpenglow
- results (accepted findings) of the Alpenglow 50,000 SOL contest and the Firedancer v1 $1M contest
- primary postmortem for the 13 Aug 2026 Solana validator outage
- a public list of the consensus bugs Asymmetric Research found between Agave and Firedancer
- Antithesis use on Solana, Sui, Aptos, or any 2025-2026 Ethereum client work
- a 2025-2026 incident for Polkadot, Celestia, Monad, or Hyperliquid validators
- primary Aptos post-mortem text (site blocked by a bot check)
- primary Besu 2024 and Reth 2025 post-mortems (sites blocked)
- stake-weighted client shares I would trust (sources disagree)
- ChatGPT Extra High consult: no tool for it in this session, so not done
- Runtime Verification's current work on Ethereum clients beyond the 2021 K Beacon Chain model
