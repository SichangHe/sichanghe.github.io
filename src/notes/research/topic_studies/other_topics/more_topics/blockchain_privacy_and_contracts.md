blockchain privacy, proofs, and contract applications
(authored by agents unless marked 🧑)

takeaway

- recommendation: study the boundary between a claimed guarantee and the deployed system
  - first choices: wallet privacy regression tests, deployed contract/source correspondence, and proof input binding
  - these fit systems measurement and small, checkable specifications
- a cryptographic proof can be correct while the application proves the wrong statement
  - a contract can execute correctly while using stale external data
  - a private transaction can still expose its sender through network behavior
- scope: Monero privacy, proof implementation, and applications
  - [validators and consensus](../../distributed_systems/consensus_replication/blockchain_validators.md) belong to the distributed systems study
  - [content provenance](../web_trust/provenance.md) covers media applications
  - [formal verification](../../formal_verification_rust/) covers general proof tools
- checked 7 October 2026
  - this is a selective literature review, not a complete survey or a claim of project novelty

why these topics are here

- 🧑 the human's [Monero notes](../../../../financial/monero.md) describe “p2pool mining setup using Monero GUI”
  - this makes mining payout privacy a concrete connection, rather than an invented interest
- 🧑 the research request says “If an agent is not sure if a topic would be of interest, study it anyway”
  - contract applications and proof engineering extend the blockchain and cryptography topics already in the notes

terms

- zero knowledge: a proof reveals that a specified statement holds without revealing the private evidence used to prove it
- soundness: false statements cannot obtain accepted proofs under the protocol's assumptions
- completeness: valid statements with valid evidence can obtain accepted proofs
- circuit: equations describing the computation a proof system checks
- witness: private values satisfying those equations
- zkVM: a virtual machine whose execution can be checked through a cryptographic proof
- oracle: a service supplying external data to a contract
- decoy: an unrelated historical output included to hide which output a payment actually spends
- anonymity set: the possible outputs or senders consistent with an observer's evidence

Monero: software behavior matters alongside cryptography

- Möser et al., PoPETs 2018, [An Empirical Analysis of Traceability in the Monero Blockchain](https://arxiv.org/abs/1704.04299)
  - abstract: “the real input can be deduced by elimination”
  - studies historical optional decoys and differences between real output ages and sampled decoy ages
  - the reported 62% elimination exposure and 80% newest-input guessing accuracy describe that historical dataset
  - inference: these numbers cannot establish today's privacy after subsequent wallet and protocol changes
- Hinteregger and Haslhofer, 2019, [An Empirical Analysis of Monero Cross-Chain Traceability](https://arxiv.org/abs/1812.02808)
  - abstract: “only a small amount of inputs are traceable”
  - combines evidence across forks rather than attacking the cryptographic primitive
  - useful baseline for any migration or fork study
  - inference: changing the format on one chain need not erase information already exposed elsewhere
- Hammad and Victor, ICBC 2024, [Monero Traceability Heuristics](https://arxiv.org/html/2408.05332v1)
  - §V: “its precision is likely slightly lower than what we were able to determine”
  - analyzes the chain through October 2023, known-spend testnet data, and public P2Pool payouts
  - a wallet bug prevented selecting exactly ten-block-old decoys
    - a fresh spend could then stand out because wallets could spend that age but did not select it as camouflage
  - known testnet data favors rapidly spent outputs and does not contain all evaluated transaction types
  - several mainnet labels come from other heuristics, rather than independent known spends
  - P2Pool payout merging already appears in this paper
    - proposing that heuristic again adds little
  - the average effective ring size remained above fourteen in October 2023 after their combined heuristics
    - removing possible decoys is not equivalent to identifying every real spend
- Kopyciok, Schmid, and Victor, AFT 2026, [Friend or Foe? Anomalous Peers in Monero's P2P Network](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.AFT.2026.31)
  - abstract: “patterns consistent with control by a single entity”
  - analyzes more than 240 hours from five vantage points
  - published version reports 1,877 anomalous peers among 13,050 observed peers, 14.38%
    - supersedes the different 14.74% figure in the 2025 preprint
  - provides detection rules and an examination pipeline
  - inference: an anomaly is evidence of behavior, not proof of malicious ownership or successful sender identification

full-chain membership proofs change the question

- Monero's [FCMP++ research proposal](https://ccs.getmonero.org/proposals/fcmp%2B%2B-research.html)
  - proposal: “replacing the existing CLSAG”
  - aims to prove membership across a much larger output set instead of selecting a small ring
  - a funded development proposal does not establish mainnet deployment
  - no mainnet deployment date is established by the sources checked here
- Veridise, June 2025, [FCMP++ audit](https://veridise.com/wp-content/uploads/2025/06/VAR_Monero_250407_fcmp___V3.pdf)
  - §3.1: “Does the rust implementation match the description in the Monero FCMP++ paper”
  - reviewed membership proof code, equations, and selected gadget properties across specified commits
  - §6 verifies determinism of seven gadget families using Picus translations
  - §7 supplies mathematical soundness arguments for selected interactive components
  - the review found one warning and one informational issue, both fixed
  - §4 assumes the prover executes in a secure environment without attacker access to side channels
  - inference: this audit already covers substantial implementation checking
    - a generic proposal to verify FCMP++ must specify what property or integration boundary remains uncovered
- research consequence
  - old decoy-selection attacks become a poor sole basis for a long project if deployment removes small rings
  - wallet state, proof serialization, network origin exposure, and upgrade compatibility remain separate questions
  - pin a code version and protocol version before describing an experiment

proof systems: the checked equations are the specification

- Chaliasos et al., USENIX Security 2024, [What Don't We Know? Understanding Security Vulnerabilities in SNARKs](https://arxiv.org/html/2402.15293v1)
  - §5.2: “assignments allocate values to variables during the witness generation process”
  - examines 141 vulnerabilities across several implementation layers
  - a program may calculate the right witness while the verifier's equations permit a different, invalid witness
  - missing constraints, wrong translations, and finite-field arithmetic recur
  - inference: running only the honest witness generator cannot establish soundness
- Pailoor et al., PLDI 2023, [Automated Detection of Under-Constrained Circuits](https://sites.cs.ucsb.edu/~yanju/publications/pldi23-picus.pdf)
  - paper abstract: “a bug in the program or a bug in the compiler itself”
  - Picus checks uniqueness properties of arithmetic circuits
  - baseline artifact: [Picus](https://github.com/Veridise/Picus)
  - inference: uniqueness under an assumed input/output partition does not prove that the partition captures application intent
- Wen et al., USENIX Security 2024, [Practical Security Analysis of Zero-Knowledge Proof Circuits](https://www.usenix.org/conference/usenixsecurity24/presentation/wen)
  - abstract: “semantic vulnerability patterns as queries”
  - static analysis over a circuit dependence graph targets Circom vulnerability patterns
  - useful baseline for rule-based checks, rather than claiming all proof code lacks tooling
- Liang et al., USENIX Security 2025, [Understanding zk-SNARKs: The Gap Between Research and Practice](https://www.usenix.org/conference/usenixsecurity25/presentation/liang-sok)
  - abstract: “toolchains, usability and compatibility”
  - organizes the route from cryptographic construction through compiler, circuit, and implementation
  - inference: mathematical proof speed alone does not determine application engineering cost
- Kolozyan et al., July 2026 preprint, [ZKP Security Tools and Verification](https://arxiv.org/abs/2607.23752)
  - abstract: “effectiveness drops to 19.6% on full codebases”
  - six tools detect 45.7% of seventy historical bugs on isolated targets
  - §III-B and §V clarify the denominators
    - thirty-two of seventy isolated cases are detected
    - eleven of fifty-six buildable whole-project cases are detected
    - fourteen whole projects fail to build before analysis
  - the experiment does not systematically measure false positives
  - also surveys forty-eight practitioners and studies verification coverage
  - these are benchmark-specific detection rates, not the fraction of all deployed proofs that are unsafe
  - inference: evaluation should preserve full build context instead of reporting only extracted toy circuits
- Hochrainer et al., USENIX Security 2026, [Arguzz](https://www.usenix.org/conference/usenixsecurity26/presentation/hochrainer)
  - abstract: “semantically equivalent program pairs”
  - creates programs with known outcomes and tests six zkVMs
  - reports eleven bugs in three systems
  - [artifact](https://github.com/Rigorous-Software-Engineering/arguzz) is a required comparison for a new zkVM testing project
- Takahashi, Jana, and Yang, September 2026 preprint, [ZEBRA](https://arxiv.org/abs/2609.15020)
  - abstract: “within a bounded region”
  - checks whether a canonical execution trace space has exactly one valid solution for specified programs and inputs
  - reports eleven new bugs in five zkVMs, six independently confirmed at submission
  - inference: this is a bounded guarantee, not verification of every possible execution of every deployed program
- Trail of Bits, 2022, [Frozen Heart disclosure](https://blog.trailofbits.com/2022/04/13/part-1-coordinated-disclosure-of-vulnerabilities-affecting-girault-bulletproofs-and-plonk/)
  - disclosure: “bad documentation and guidance”
  - failures in converting interactive proof challenges into hashes can let statements change without changing the challenge
  - inference: specifying exactly which statement and previous messages enter each hash is an implementation property worth checking

contract applications: identify the parties and facts being trusted

- Kosba et al., IEEE S&P 2016, [Hawk](https://www.cs.yale.edu/homes/cpap/published/hawk.pdf)
  - abstract: “does not store financial transactions in the clear”
  - combines public enforcement with private contract computation
  - §I-A: “The manager can see the users’ inputs”
    - the manager is trusted to keep those inputs private
  - inference: private smart contracts have longstanding prior work
    - a new application needs a specific improvement in assumptions, deployment, or cost
- Zhang et al., CCS 2020, [DECO](https://arxiv.org/abs/1909.00938)
  - abstract: “without trusted hardware or server-side modifications”
  - proves that selected data came from a TLS website while optionally hiding the data
  - demonstrates private financial instruments, anonymous credentials, and price-discrimination claims
  - inference: provenance authenticates the website's statement
    - it does not establish that the website measured the outside world correctly or that data remains fresh
- Zhou et al., IEEE S&P 2023, [DeFi Attacks](https://arxiv.org/abs/2208.13035)
  - abstract: “price oracle attacks” and “permissionless interactions”
  - organizes historical incidents and defenses across application layers
  - its frequent incident categories support studying external facts and interactions between contracts
  - inference: a locally correct contract can fail an application invariant when another contract or data supplier behaves unexpectedly
- Chaliasos et al., ICSE 2024, [Do Security Tools Meet Practitioners' Needs?](https://arxiv.org/abs/2304.02981)
  - abstract: “a mere 8% of the attacks in our dataset”
  - evaluates five tools against 127 high-impact historical attacks and surveys forty-nine practitioners
  - inference: this historical evaluation motivates application-specific properties
    - it does not establish the effectiveness of every current tool or future model
- [Solana verified build documentation](https://solana.com/docs/programs/verified-builds)
  - documentation: “matches what is deployed onchain”
  - reproducible builds connect public source with executable bytes
  - [deployment documentation](https://solana.com/docs/core/programs/program-deployment) says “makes the program immutable and permanently prevents further updates” when upgrade authority is removed
  - inference: source correspondence, source correctness, and future upgrade power are three different properties
- automated Solana contract testing already exists
  - [FuzzDelSol, CCS 2023](https://syssec.informatik.uni-due.de/en/news/singleview/new-publication-in-acm-ccs-fuzzdelsol-uncovers-security-vulnerabilities-in-solana-programs-23634/) describes “Fuzz on the Beach: Fuzzing Solana Smart Contracts”
  - novelty cannot rest on switching from Ethereum to Solana alone
- [Characterizing Ethereum Upgradable Smart Contracts](https://arxiv.org/abs/2403.01290), 2024
  - abstract: “covering a total of 60,251,064 smart contracts”
  - measures upgradeable contracts and their security implications using USCDetector
  - inference: counting upgrade authority or upgrade prevalence alone repeats established measurement questions
- [ERC-8262: Zero-Knowledge Compliance Oracle](https://eips.ethereum.org/EIPS/eip-8262), draft proposal
  - specification: “Each proof type includes `submitter` as a public input”
  - explicitly requires application context checks beyond proof consistency
  - inference: recipient/context binding is a documented engineering requirement, rather than a newly discovered concept

candidate experiments, not established novel results

- 1: wallet privacy regression testing across versions and payout patterns
  - question: does normal wallet behavior make user classes distinguishable even when every transaction is cryptographically valid?
  - start with controlled wallets and known spends on a private network
    - vary payout frequency, consolidation, wallet version, output age, and transaction construction
  - reproduce Hammad and Victor's ten-block and payout-merging results before extending them
  - compare measured false identifications and coverage across held-out users and schedules
    - do not label ordinary mainnet users from uncertain heuristics as ground truth
  - evaluate the deployed ring protocol separately from any FCMP++ test implementation
  - stop if the result merely repeats known payout merging or depends on a soon-obsolete wallet bug
- 2: measure whether source, build evidence, and upgrade state stay aligned
  - question: after a program upgrade, how long do public verification claims describe the previous executable?
  - collect a defined cohort from public program identifiers and take repeated snapshots
  - independently rebuild published source commits and record toolchain, byte hash, deployment slot, and upgrade authority
  - distinguish unavailable source, failed reproduction, stale evidence, and genuine mismatch
  - baseline: official verification service and independent rebuild of the same commit
  - compare with USCDetector's Ethereum study
    - target changes in evidence freshness, not another census of upgradeable contracts
  - useful result: a reproducible longitudinal dataset and observed failure causes
  - novelty search remains incomplete
    - stop or narrow if existing studies already measure the same temporal mismatch
- 3: check statement binding across proof construction and application verification
  - question: can application identity, recipient, network, or version change while the same proof is accepted?
  - select one open implementation with a documented statement
  - write a small executable specification of required public fields and their hash or verifier bindings
  - mutation tests change one field at a time, including omission, reordering, and ambiguous serialization
  - compare with existing transcript libraries, audit checks, Picus, and the 2026 tooling study
  - ERC-8262 already specifies submitter and context checks
    - target enforcement across code paths and releases, rather than proposing those checks anew
  - demonstrate a complete accepted false application claim before calling a mismatch exploitable
  - stop if the implementation already enforces all intended bindings and no reusable specification gap emerges
- 4: evaluate anomalous-peer filtering against controlled sender privacy
  - question: does blocking detected peers reduce an observer's ability to identify an originating node?
  - first reproduce the AFT 2026 detector with benign alternative implementations
  - use controlled nodes and transactions to measure identification accuracy, latency, connectivity, and false blocks
  - compare no filter, published rules, and version-aware rules under the same topology
  - inference: counting fewer suspicious peers is insufficient evidence of improved anonymity
  - stop if the work only reruns the published detection pipeline without a new privacy outcome or failure analysis

reading depth and remaining work

- read selected full-text sections of Hammad and Victor, the 2024 SNARK vulnerability study, and the FCMP++ audit
  - especially their evaluation labels, threat assumptions, and scope limits
  - also checked methodology and result denominators in the July 2026 tooling study
- other entries were checked through primary abstracts, author/project pages, or official documentation
  - read full methods before choosing a project or repeating detailed experimental claims
- no claim that the inherited ChatGPT blockchain prompt received an answer
  - central consultation is tracked separately by the study owner
- remaining literature search
  - temporal studies of source verification and upgrades
  - production TLS provenance systems and application replay/freshness rules
  - latest Monero deployment status and audits of integration code
  - use these to reject duplicates before committing to implementation
