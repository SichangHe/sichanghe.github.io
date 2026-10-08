blockchain RPC freshness, correctness, and privacy
(authored by agents unless marked 🧑)

takeaway

- agent recommendation: study when an application should refuse a fast but stale blockchain response
    - provider comparison, authenticated responses, and timing privacy already have substantial prior work
    - a new contribution needs a demonstrated application failure or a better decision rule at equal request cost
- 🧑 human reading note: “When Blocks Go Missing: The Timeliness and Trustworthiness of Blockchain RPC Providers, Ye Shu”
    - source: [reading notes](../../../../reading_notes/index.md)
- selected methods checked on 7 October 2026 UTC
    - full two-page IMC poster
    - PARP assumptions, protocol checks, evaluation, and limitations
    - Time Tells All experimental design and limitations
    - DoERS mechanism and measurement design
    - no experiments reproduced; originality remains unconfirmed

the boundary from first principles

- remote procedure call, RPC: a request asking another computer to perform an operation
- a blockchain application often asks a hosted provider for blocks, transactions, or account state
    - fast transport does not establish fresh data
    - agreement among providers does not establish independent evidence
    - a proof against an old block can authenticate stale data
- distinguish missing data from an unavailable request
    - an error, timeout, rate limit, unavailable archive, and absent transaction have different meanings
- distinguish temporary chain disagreement from an incorrect finalized answer
    - finalized means the chosen chain protocol treats reversal as excluded under its stated assumptions
    - name the chain and finality rule before comparing answers

the named paper: measurement establishes disagreement, not its cause

- Shu, Stefan, Savage, Voelker, and Liu, [When Blocks Go Missing, IMC 2025 poster, §§2–3](https://shuye.dev/papers/bsc-rpc-imc25.pdf)
    - authors: “through differential testing”
    - sixteen BNB Smart Chain providers, mixing public and private services
    - public GitHub references approximate popularity, not market share
    - latest-block polling every second; once any provider observes a new block, queries continue until all report it
    - timeliness evaluation covers 6,223 blocks; figures compare each provider with the median observation time
    - historical evaluation covers 2,140 sampled blocks and 123,773 transactions
        - samples the recent ten million blocks; retries missing responses up to three times
    - checks both block-contained transactions and transaction-by-hash responses
    - reports up to 105 seconds of lag and inconsistent missing records
    - scope limits
        - one chain and selected endpoints, not all RPC deployments
        - polling and observer location affect measured discovery time
        - fastest or median provider is not an independent consensus ground truth
        - disagreement does not establish deliberate censorship
        - no current provider ranking follows from this historical sample
    - implication: preserve endpoint, method, block hash, observation time, response class, and archive contract before attributing failures

availability failures already have a concrete mechanism

- Li and colleagues, [DoERS, NDSS 2021, introduction and measurement design](https://www4.comp.polyu.edu.hk/~csxluo/DoERS.pdf)
    - authors: “Gas-free contract execution”
    - locally executed RPC queries consume node resources without committing their effects to the ledger
    - gas-free means no mandatory on-chain execution fee, not that a commercial provider cannot charge
    - studies gas limits and load-balancing behavior in nine services as of April 2020
    - infers backend assignment through transactions that remain local to a node
    - historical vulnerabilities do not establish that the same deployments remain vulnerable
    - implication: freshness can deteriorate because serving and synchronization share resources
        - an experiment should separate intentional delay, overload, archive policy, and inconsistent backend state

authenticated serving: PARP already combines proofs and payments

- Wang and Van Cutsem, [Depermissioning Web3, 2025 preprint, §§IV–VI and VIII](https://arxiv.org/html/2506.03940v1)
    - authors: “we assume that messages between honest parties are delivered within a bounded delay”
    - PARP combines signed requests and responses, payment channels, Merkle proofs, and penalized fraud evidence
    - a Merkle proof checks data against a committed root hash
    - assumes trusted header access and bounded message delay
    - requested block height constrains response freshness; this does not prove knowledge of the newest global tip
    - prototype uses Geth 1.13.12 and three local full nodes on four-core virtual machines
    - implemented on-chain fraud verification authenticates block hashes only within Ethereum's last 256 blocks
        - older archival responses need another trusted-root mechanism
    - latency averages use 100 requests; load test lasts two minutes with up to twenty clients
    - reported gas-to-dollar costs depend on the paper's assumed prices
    - Table III's read verification total is smaller than its listed proof component
        - do not add these figures into a trusted end-to-end latency estimate without clarification
    - limits include per-provider channel costs, request-content and IP leakage, and unfinished economic analysis
    - implication: authenticated answers and accountable serving are existing baselines
        - test whether their freshness assumptions survive the intended deployment rather than propose proofs alone

privacy: extra observations can cost more than bandwidth

- Wang and colleagues, [Time Tells All, 2025 extended preprint, §§8–9](https://arxiv.org/html/2508.21440v1)
    - authors: “artificially positioned users and emulated software routers”
    - timing links encrypted RPC traffic to public transaction candidates over repeated observations
    - ninety controlled users replay activity patterns from public ledgers; 1,099 Ethereum-testnet transactions over two weeks
        - a separate Ethereum-mainnet experiment uses 100 transactions
    - software routers provide visibility; decrypted experimental traces supply labels
        - the proposed attack works on encrypted traffic features
        - experiments do not demonstrate acquiring a real ISP's monitoring position
    - dynamic IPs, shared public addresses, missing observations, and extreme jitter weaken identification
    - implication: evaluate any multi-provider retry policy's privacy effects separately from its reliability
        - more services observing requests is not automatically a measured increase in deanonymization

candidate A: application decisions under stale but valid responses

- hypothesis: a deadline-aware freshness rule prevents incorrect application decisions with fewer requests than polling every provider
- first reproduce the poster's consistency checks on a controlled local network
    - inject delayed heads, inconsistent backend caches, unavailable history, and explicit request failures
    - keep an independently recorded canonical chain and declared finality rule
    - allow temporary reorganizations and label them separately
- define one application decision and its required block hash or maximum stale interval
    - a balance display and a time-sensitive contract decision need different guarantees
- compare one provider, fixed retries, provider agreement, and proof-checked responses against the same reference headers
    - match request budget, endpoints, deadline, and finality target
    - record shared infrastructure and correlated errors
- measure incorrect decisions, abstentions, stale intervals, completion latency, requests, and verification cost
- closest work already measures lag and missing records; PARP already rejects responses older than a requested block
    - possible contribution requires a new application failure or a policy that improves this explicit trade-off
- useful null: existing reference-header checks and fixed retries achieve the same decisions at equal cost
    - then avoid claiming a new freshness mechanism

candidate B: retry privacy and reliability together

- hypothesis: reducing timing regularity while retaining a declared freshness deadline changes the reliability/privacy trade-off
- use controlled wallets and consented traffic, with known transactions and observation positions
    - distinguish routing visibility from traffic-classification accuracy
    - vary address sharing, missed observations, and provider delay
- compare ordinary polling, fixed retry intervals, and a declared alternative policy
    - equalize request budget and application deadlines
    - evaluate failure cases as well as successfully observed transactions
- measure identification accuracy, unknown cases, decision errors, bytes, and deadline misses
- closest work already proposes random delays and padding
    - a generic random-delay defense is insufficient novelty
    - inspect its complete countermeasure literature before implementing a new policy
- useful null: the alternative only shifts delay or loses important updates without reducing identification

remaining limits

- no measurement run on public providers for this review
- recent deployment policies, node versions, and archive limits require fresh verification
- light-client and accountable-RPC work beyond PARP needs a deeper construction comparison before project selection
- adjacent [blockchain privacy and contracts](blockchain_privacy_and_contracts.md) covers different interfaces
    - [validator studies](../../distributed_systems/consensus_replication/blockchain_validators.md) cover consensus and execution boundaries
