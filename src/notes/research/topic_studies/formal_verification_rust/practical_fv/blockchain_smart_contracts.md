formal verification of blockchain software
(authored by agents unless marked 🧑)

short version

- fact: the most-used proof tools in this area check source or bytecode of one contract, not a validator
  - Certora Prover (Solidity, Rust/Solana), Move Prover (Aptos, Sui), Kontrol (Foundry tests on the K semantics of the EVM)
  - I found no published proof about any part of Agave or Firedancer, the two Solana validator clients
- selected projects use LLMs to write specifications or proofs
  - EquiVM (below) proved 23 deployed Ethereum contracts in Lean, up to 100 million tokens and 100 hours each
  - Move and Solidity papers use LLMs to write specifications and use the prover as the judge
  - Certora and Aptos shipped agent products in 2025-2026
- inference: specifications, assumptions, and proof soundness all need scrutiny
  - the Move bytecode verifier bug was in code nobody had proved
  - Certora's Kamino report found bugs with proofs and a manual audit together
  - the Kamino proofs used a smaller number type and unrolled loops once
- fact: Solana has a formal model of its VM, but not of the real VM code
  - an Isabelle model of sBPF (OOPSLA 2025) and a Lean port of it inside Solanalib
  - the safety theorem is about the model, tested against a reference VM
- inference: the largest open piece is the bridge from these models to Agave and Firedancer code
  - [agave_verification_scope.md](../../../agave_verification_scope.md) sized small first targets (349 and 119 lines)
- best ideas
  - prove one small Agave piece, then compare the proof with Firedancer-Agave differential fuzzing at the same budget
  - measure how strong LLM-written specifications are, using real exploits and injected bugs
  - repeat EquiVM for deployed sBPF programs and price it

what the topic is

- a smart contract is a program stored on a blockchain that moves money by rules
  - EVM (Ethereum): bytecode, usually compiled from Solidity
  - Move (Aptos, Sui): a language built around resources that cannot be copied
  - Solana: Rust programs compiled to sBPF bytecode, state kept in separate accounts
- a validator client is the node software that orders transactions and runs them
  - it also contains the VM that runs the contracts
  - a bug in the VM or its verifier is a bug under every contract
- three kinds of target, with different proof boundaries
  - the contract (often small and money-bearing; may be upgradeable)
    - proofs apply to a particular version
  - the VM and its bytecode checker (shared by all contracts)
  - the client (consensus, networking, storage, runtime), covered elsewhere
    - for consensus proofs see [distributed_protocols.md](distributed_protocols.md) and ../../distributed_systems/ (local note; not yet published)
    - for ZK and crypto code see [crypto.md](crypto.md)

what existing work shows

solana programs and the solana vm

- [OtterSec, "Solana formal verification: a case study"](https://osec.io/blog/formally-verifying-solana-programs/)
  - fact: industry blog, not peer reviewed
  - fact: Kani (bounded model checker) over Anchor programs, harnesses generated from `succeeds_if` and `errors_if` annotations
  - fact: applied to the Squads multisig, proving threshold validity (≥1 and ≤ member count) and member requirements
  - fact: they swapped in cheaper types (4-byte pubkeys, fixed arrays) to avoid path explosion
  - limit (fact, their list): cross-program calls and custom serialization stay hard, runtime and consensus out of scope
  - inference: the proof is about a modified SDK, so the gap to the real SDK is a trusted step
- [Certora Solana Prover docs](https://docs.certora.com/en/latest/docs/solana/index.html)
  - fact: vendor documentation, not peer reviewed
  - fact: rules are written in CVLR, "an embedded DSL that lives in two crates"
  - claim (Certora blog, seen as search snippet): the tool analyzes SBF bytecode, so the compiler is not trusted
  - not opened: the 2023 Certora posts on the Solana tool
- [Certora, Kamino Vault report, 2025](https://certora.cdn.prismic.io/certora/aPpFirpReVYa3na1_kamino_vault_certora.pdf)
  - fact: vendor audit report, work Jan to Jun 2025 in three rounds
  - fact: quote, "the Certora Prover demonstrated that the implementation of the Solana contracts above is correct (modulo identified issues) with respect to the formal properties formulated and written by the Certora team"
  - fact: findings: 0 high, 3 medium, 2 low confirmed and fixed in the summary table, plus informational ones
  - fact: assumptions section: fixed-point numbers shrunk from `FixedU128<60>` to `FixedU64<14>` "for tractability", loops unrolled once ("a loop_iter of 1")
  - fact: the 5 written properties include vault solvency and `give_up_pending_fees` does not revert
  - inference: this is the best public picture of what a Solana proof engagement looks like, and the proved claim is smaller than "the program is correct"
- [Yuan et al., "A Complete Formal Semantics of eBPF Instruction Set Architecture for Solana", OOPSLA 2025](https://2025.splashcon.org/details/OOPSLA/2/A-complete-formal-semantics-of-eBPF-instruction-set-architecture-for-Solana)
  - fact: peer reviewed, abstract page read, paper itself not opened
  - fact: claims "the first and most comprehensive formal semantics" of Solana's eBPF, small-step, in Isabelle/HOL
  - fact: they extract an executable semantics and test it against the original interpreter
- [Solanalib (Solana Foundation, Lean 4)](https://github.com/solana-foundation/leanprover-solanalib)
  - fact: experimental repository; README checked directly October 8, 2026
  - fact: six layers (primitives, numbers, accounts, instructions, finance, sBPF)
  - claim: sBPF layer is "a Lean port of the OOPSLA 2025 Isabelle/HOL formalisation", validated against a reference VM
  - limit: the current README does not substantiate the earlier draft's test counts or theorem counts
  - fact: models specification layers and the sBPF instruction set
    - README describes the bytecode-to-protocol proof chain as an eventual goal
  - inference: this is a proof about a model of sBPF, so it does not yet say anything about Agave's Rust sBPF code or Firedancer's C code
- [Cloosters et al., SseRex, DIMVA 2026](https://arxiv.org/abs/2603.16349)
  - fact: peer reviewed venue per the arXiv page, symbolic execution (not a proof)
  - fact: finds missing owner, signer, and key checks and arbitrary cross-program calls in sBPF lifted to an IR
  - fact: 8,714 bytecode-only contracts, 467 flagged; of a sample of 30 reports, 26 were true bugs (87%)
  - fact: motivating quote: "Unlike the Linux kernel's eBPF, it lacks the control-flow verification mechanism"
  - inference: the Solana-specific bug classes are all account-checking rules, which is a good fit for proofs over small rule sets
- [firedancer-io/solana-conformance](https://github.com/firedancer-io/solana-conformance)
  - fact: README, archived 16 April 2026
  - fact: compares Firedancer to Agave on harnesses including ELF loader, VM interpreter, VM validate, syscalls, transactions, blocks
  - inference: the current assurance that Firedancer and Agave agree is differential testing, not proof
  - not opened: the solfuzz-agave repository and any bug counts

move: prover, specifications, and the verifier bug

- [Dill et al., "Fast and Reliable Formal Verification of Smart Contracts with the Move Prover"](https://arxiv.org/abs/2110.08362)
  - fact: arXiv v3 Feb 2022; I did not confirm the venue, so treat peer review as unconfirmed
  - fact: claim, quote: "The entirety of the Move code for the Diem blockchain has been extensively specified and can be completely verified by MVP in a few minutes"
  - fact: key choices: alias-free memory model, fine-grained invariant checking, monomorphization
  - limit: Diem is gone, and the Prover trusts its Boogie/SMT stack and the Move semantics it encodes
- [Grieskamp et al., "Formal Verification of Imperative First-Class Functions in Move", FMCAD 2026](https://repositum.tuwien.at/handle/20.500.12708/230522)
  - fact: peer reviewed
  - fact: adds "behavioral predicates" and "state labels" so specs can talk about function values that are only known at run time
  - fact: also describes spec inference by weakest-precondition analysis
  - inference: dynamic dispatch is what makes smart contracts harder to verify, and Aptos paid for it in prover work
- [Fu, Xu, Kim, "Agentic Specification Generator for Move Programs" (MSG), ASE 2025](https://arxiv.org/abs/2509.24515)
  - fact: peer reviewed (ASE 2025 per arXiv page), supported by the Sui Foundation
  - fact: quote: "successfully generates verifiable specifications for 84% of tested Move functions"
  - fact: the agentic split gave "57% more verifiable clauses", prover feedback gave "a 30% increase"
  - fact: evaluated on move-stdlib (10 functions), aptos-stdlib, and aptos-framework (242 of 284 covered), compared with expert-written specs
  - limit: "verifiable" means the Prover accepts the clauses, not that they are strong; the paper compares to expert specs by match
  - inference: the weak-spec risk is the main open question, see the gaps
- [Grieskamp, Zhang, Kashyap, "Combining Mechanical and Agentic Specification Inference for Move", arXiv 2026](https://arxiv.org/abs/2605.10005)
  - fact: preprint, self-described "early work", tools paper with preliminary results
  - fact: weakest-precondition analysis on Move bytecode gives a sound base; Claude Code through an MCP server fills in loop invariants; the Prover judges
  - fact: quote: "the AI is used precisely where WP is weakest"
  - limit: tried on canonical library examples, no benchmark numbers
- [Sui Prover blog (Asymptotic)](https://www.sui.io/blog/asymptotic-move-prover-formal-verification.md)
  - fact: vendor blog, no evaluation, no comparison to the Aptos prover
- [Zellic, "The Billion Dollar Move Bug"](https://www.zellic.io/blog/the-billion-dollar-move-bug)
  - fact: security blog, not peer reviewed; page checked directly October 8, 2026
  - fact: a control-flow-graph bug in the shared `move-binary-format` crate: "The very last opcode in a function with 65,534 instructions will always have no successors"
  - fact: introduced 6 October 2022, fixed 30 March 2023; affected Sui and Aptos; no public exploitation reported
  - inference: the verifier is the thing that makes Move's type and reference safety true, and no formal proof of it appears in what I read

evm and solidity: tools and semantics

- [Mota et al., "Formally Verifying a Real World Smart Contract" (Sandclock), arXiv 2023](https://arxiv.org/abs/2307.02325)
  - fact: preprint, one case study
  - fact: they tried SMTChecker, VeriSmart and Certora on a real Solidity 0.8 contract; their conclusion says Certora was "the only tool capable of proving" it
  - claim: after "limitations and disappointment with various tools"
- [Mota et al., "Comparative Analysis of Hoare Logic-Based Formal Verification Tools for Solidity", JSERD 2025](https://journals-sol.sbc.org.br/index.php/jserd/article/view/5061)
  - fact: abstract page only; compares solc-verify, SMTChecker, VeriSmart, Certora on ERC-20
  - claim: "variability in tool performance undermines trustworthiness in practice"
- [Runtime Verification, Kontrol and Optimism pausability](https://runtimeverification.com/blog/kontrol-integrated-verification-of-the-optimism-pausability-mechanism)
  - fact: vendor blog
  - fact: proves that all L2-to-L1 bridge functions "must always revert" when paused, and runs in Optimism's CI
  - fact: hard part was ABI encoding of dynamic `bytes` and testing in the real deployed setup
  - not opened: KEVM paper, Lido Dual Governance report
- [Nethermind, EVMYulLean (Lean)](https://www.nethermind.io/blog/a-trustworthy-formal-model-of-evm-yul-in-lean)
  - fact: company blog
  - fact: Lean semantics of EVM and Yul for Cancun, passes 22,330 of 22,332 conformance tests
  - limits (fact): Yul side models no gas, no CREATE/CREATE2, no SELFDESTRUCT halting
  - fact: it is a semantics, not a proof about a contract
- [Card and Marmsoler, "Isabelle/EVM", FMBC 2026](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.FMBC.2026.3)
  - fact: peer reviewed workshop paper, abstract page only
  - fact: all current opcodes, cross-contract execution, about 25,000 tests from the official suite
- [Dessalvi, Bartoletti, Lluch-Lafuente, "A Formal Approach to AMM Fee Mechanisms with Lean 4", FMBC 2026](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.FMBC.2026.4)
  - fact: peer reviewed workshop paper, abstract page only
  - fact: proves in Lean that with a fee, one large swap earns strictly more than the same trade split up
  - inference: this proves facts about a math model of an AMM, not about contract code
- [Cassez et al., Dafny verification of the Ethereum Beacon Chain, TACAS 2022](https://arxiv.org/abs/2110.12909)
  - fact: abstract page only; already in the paper collection
  - fact: Dafny proof over the Python reference spec, "identified multiple issues"
  - inference: the proof is for the spec, and real clients (Rust, Go, Java) are separate code
- [Georgiev (Certora), "Scaling Formal Verification Across DeFi Ecosystems", FMBC 2026 invited talk](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.FMBC.2026.1)
  - fact: abstract page only
  - claim: covers EVM, Solana, Stellar, and Sui, and lessons from production protocols

lean and llm proofs of bytecode

- [Lazaropoulos and Paraskevopoulou, "Foundational Refinement Proofs for Deployed Bytecode, at the Price of Tokens" (EquiVM), arXiv 2026](https://arxiv.org/abs/2607.26306)
  - fact: preprint, full text read
  - fact: Lean semantics for EVM plus a spec language ("Sol−"); the theorem says deployed bytecode refines the spec for any state, calldata, and gas, or runs out of gas
  - fact: 23 contracts proved, "most of the MakerDAO stablecoin system"; two (Clipper, Auction) unfinished at 26/29 and 18/20 functions
  - fact: table 2: for example Vat took 100h 44m and 74.8M tokens, and Spot 5h 47m and 5.7M tokens; the abstract says up to 100 million tokens and 100 hours
  - fact: cost: pricing the largest run at gpt-5.5 list prices gives "roughly $1,380"; runs used subscriptions, not API credit
  - fact: gpt-5.5 did most runs; opus-4.8 "consistently required more time and tokens"
  - fact: humans still intervened: agent reported a spec mismatch and was allowed to fix the spec; one run assumed aliasing facts as axioms and later removed them
  - fact: found a semantic mismatch: a dynamic array copy can wrap around in a 256-bit size, so they added a well-formed storage assumption
  - fact: the trust base includes the semantics, theorem statement, Lean kernel, standard axioms, and the compiled evaluator used by `native_decide`
  - limit: EVM gas accounting is modelled, but the refinement claim permits out-of-gas executions without establishing their correspondence to the specification
  - claim: quote, "foundational mechanized proofs, so far limited by expert labor, can now be bought at the price of tokens"
  - inference: the spec is still human-written and unchecked against intent; the cost is small only if the spec is cheap
- [Paradigm, "Formally Verifying a Compiler Using Automated Research" (Solidus)](https://www.paradigm.xyz/writing/solidus)
  - fact: company blog by Dan Robinson, 24 July 2026, not peer reviewed; page checked directly October 8, 2026
  - fact: Lean compiler Solidity to EVM; the Yul to EVM backend is verified; "over 1,700 hours (~10 weeks) of total Codex/goal time", about "$150,000 at API rates"
  - claim: humans did not read or write its code, but it was "nowhere close to a fully automated effort"
  - fact: authors call it pre-alpha and expect "subtle gaps in the formal verification"
- [evmSmith (Lean, on top of EVMYulLean)](https://reservoir.lean-lang.org/@leonardoalt/evmSmith)
  - fact: repository page, updated 30 September 2026, "fails to build on Lean v4.22.0"
  - fact: three examples including WETH solvency; partial correctness only, failure paths vacuous
- [Ethereum Magicians, "Optimized Verified EVM Interpreters for ZK"](https://ethereum-magicians.org/t/proposal-optimized-verified-evm-interpreters-for-zk/28086)
  - fact: forum proposal, "we do not have concrete plans yet"; builds on rocq-of-rust for Revm and a RISC-V assembly route
- not opened: Verity (EVM language with a verified compiler, only seen cited inside the EquiVM paper)

llm help for finding properties and bugs in solidity

- [Liu et al., PropertyGPT, NDSS 2025](https://arxiv.org/abs/2405.02580)
  - fact: peer reviewed; GPT-4 with retrieval over human-written Certora properties, then compile and prove loop
  - fact: "80% recall compared to the ground truth", 26 of 37 CVEs/incidents, 12 zero-days, $8,256 bounties
  - limit: the ground truth is human properties in the same style, and recall on those says little about strength on a new protocol
- [Bartoletti, Lipparini, Pompianu, "LLMs as verification oracles for Solidity", arXiv 2026](https://arxiv.org/abs/2509.19153)
  - fact: preprint, full text read
  - fact: 2,034 tasks built; GPT-5 gets over 85% on all prediction metrics and beats GPT-4 by 25-30 points on the 667-task subset
  - claim: quote, "although lacking soundness guarantees — can be surprisingly effective at predicting the (in)validity of complex properties"
  - inference: an LLM says yes or no without a proof, so it fits as a triage step and not as assurance
- [Bartoletti and Lipparini, "Neuroforger", arXiv 2026](https://arxiv.org/abs/2605.31389)
  - fact: preprint, abstract read, body not
  - fact: specs are Solidity tests with unknown values; the LLM must produce a concrete violating run that is checked by execution
  - inference: certifying a violation is a sound way to use an unsound LLM
- [Bobadilla et al., "Smart Contract Invariants Protect Against Cybercriminals", arXiv 2026](https://arxiv.org/abs/2608.13191)
  - fact: preprint, from the abstract and intro
  - fact: 28 real exploits each with a human-written invariant; all 28 attacks blocked; 108,637 historical transactions replayed, 98.3% unchanged
  - fact: quote, public invariant tools "together recover only 2 of the 28 attack-stopping invariants"
  - inference: a ready benchmark for how strong generated specs are
- Xia et al., SymGPT, OOPSLA 2026
  - in the paper collection, not opened by me; see [static_analysis.md](../../../static_analysis.md) for the human's notes on related Solidity tools
- [Anthropic, SCONE-bench post](https://www.anthropic.com/research/smart-contracts)
  - fact: company research post
  - fact: agents produced exploits for 207 of 405 past-exploited contracts, $550.1M simulated; on contracts exploited after the knowledge cutoffs, $4.6M
  - claim: quote, "the same agents capable of exploiting vulnerabilities can also be deployed to patch them"
  - inference: attackers get the same cost drop that makes proofs cheaper, so unproved code faces cheap search

llm products and consensus proofs

- [Certora AutoProver blog, July 2026](https://www.certora.com/blog/autoprover-agentic-formal-verification)
  - fact: vendor blog, beta for Solidity, Rust "coming soon"; six-step agent pipeline that writes specs, Foundry tests, and CVL rules
  - no numbers, no benchmark
- [Aptos AI-assisted Move Prover news](https://pluang.com/en/news-feed/aptos-l1-verifikasi-formal-dinamis-dengan-bantuan-ai)
  - seen only as a search snippet and not opened; the primary source is the Grieskamp preprint above
- [Jones and Knottenbelt, IsabeLLM, arXiv 2026](https://arxiv.org/abs/2606.18098)
  - fact: preprint, full text read in part
  - fact: LLM plus Sledgehammer in Isabelle, tried on 16 non-trivial lemmas of a Bitcoin proof-of-work model; best open model got a 94.4% success rate
  - limit: the model is an abstract protocol, not Bitcoin Core
  - consensus proofs in general: see [distributed_protocols.md](distributed_protocols.md)

zk and zkvm code under ethereum

- [verified-zkevm.org](https://verified-zkevm.org)
  - fact: Ethereum Foundation project page: 35 grants across 3 tracks, 90 resources
- [Hicks, "Verifying zkEVMs: Making Large Scale Formal Verification Work", FMBC 2026 invited talk](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.FMBC.2026.2)
  - fact: one-page abstract
  - claim: the work has run "for over a year" with many teams
- [Nethermind and Succinct, SP1 Hypercube RISC-V check](https://zkevm.ethereum.foundation/blog/sp1-fv)
  - fact: Ethereum Foundation blog, Lean against the Sail RISC-V spec
  - claim: review concluded that "51 of the 62 claimed opcodes have complete, correct proofs"
  - fact: page checked directly October 8, 2026
  - reported implementation bug: JALR missing the `& ~1` step, fixed in 6.1.0
  - reported proof defects: contradictory SLTI hypotheses and wrong load-width parameters
  - limit (fact): assumes machine mode only and memory consistency outside the proof
- [Axiom and Nethermind, OpenVM RV32IM](https://axiom.xyz/blog/formal-verification)
  - fact: company blog, 45 opcodes, no circuit bugs found
  - inference: the same method found real bugs in one zkVM and none in another, so a clean result is not a quality signal alone
  - overlap: [crypto.md](crypto.md)

what is missing

- no proof about Agave or Firedancer code
  - evidence: searches for Kani, Verus, Lean, or Isabelle together with Agave, Firedancer, or sBPF found only Solanalib and the OOPSLA Isabelle model (both models of sBPF) and the Certora and OtterSec contract tools
  - the human's [Agave sizing](../../../agave_verification_scope.md) is the only sizing I found
- no proof linking Solanalib's sBPF model to the real VM code
  - differential testing is the only link in the README
- no formal proof of the Move bytecode verifier in what I read
  - evidence: the Zellic bug sat in the CFG builder it depends on
- no measurement of how strong LLM-written specs are on Solana or Move
  - MSG measures "verifiable" and match to experts, PropertyGPT measures recall against human properties
  - Monperrus' 28 exploits are the closest ready benchmark, but only for Ethereum and only for tools that make invariants
- no public cost data for Solana proofs
  - EquiVM has token and hour tables for Ethereum, the Solana side has Certora engagement dates only
- no study of drift
  - how often a proved Solana program or Move module is upgraded without re-proof is not measured in anything I opened
- no comparison of proofs and differential fuzzing for client code
  - the Firedancer conformance suite exists but its bug yield was not opened

research we can do

idea 1: proof versus differential fuzzing on one agave piece

- question
  - if we prove the compute-budget instruction sanitizer, does the proof find divergences from Firedancer that Agave-Firedancer fuzzing missed?
- builds on
  - [agave_verification_scope.md](../../../agave_verification_scope.md): 349-line sanitizer, 5-8 week estimate
  - [solana-conformance](https://github.com/firedancer-io/solana-conformance) as the fuzz baseline
  - verus_frontier_20261006.md (local note; not yet published) for the verifier choice
- what is new
  - an equal-budget comparison of a proof and fuzzing on a real validator pair
- why it matters
  - tells validator teams which of the two to buy first
- first experiment
  - write the spec independently of the code, prove Agave's Rust against it, run the same spec as an oracle on Firedancer's C by test
  - give fuzzing the same engineer-weeks
- convincing result
  - either an input only the proof or the oracle finds, or a clear statement that neither found anything and what each cost
- cost
  - 5-8 engineer-weeks from the sizing note, plus the C-side harness
- closest work that could scoop it
  - Anza or Firedancer teams doing the same internally; no public version found

idea 2: how strong are llm-written specs, measured by real exploits

- question
  - do specifications from MSG-style or AutoProver-style generators fail on the real exploit, or just verify cleanly?
- builds on
  - [InvariantEval](https://arxiv.org/abs/2608.13191), [PropertyGPT](https://arxiv.org/abs/2405.02580), [MSG](https://arxiv.org/abs/2509.24515)
  - Certora Kamino bugs as a second source of ground truth
- what is new
  - a strength measure, not a "verifies" rate; spec mutation plus exploit replay
- first experiment
  - generate rules from intended behavior or patched code
  - on vulnerable code, record proof failures, checked counterexamples, and exploit violations separately
    - soundly proved rules cannot be violated by an execution covered by the proof
  - also inject bugs of the Kamino kind (rounding, first depositor) into a verified vault and count what survives
- convincing result
  - a table of generated-spec kill rate against human-spec kill rate on the same bugs, with the 2 of 28 baseline for invariant tools
- cost
  - a few weeks and model tokens; Certora access for the Solidity side
- scoop risk
  - Certora (AutoProver evaluation), the Monperrus group follow-up

idea 3: equivm for deployed sbpf programs

- question
  - can an LLM agent produce a Lean refinement proof for a deployed Solana program, and at what token cost?
- builds on
  - [EquiVM](https://arxiv.org/abs/2607.26306) (method), [Solanalib](https://github.com/solana-foundation/leanprover-solanalib) (sBPF semantics), [Yuan et al.](https://2025.splashcon.org/details/OOPSLA/2/A-complete-formal-semantics-of-eBPF-instruction-set-architecture-for-Solana)
  - the Agave note's Address Lookup Table and SPL Token candidates
- what is new
  - first token and hour numbers on Solana, and a first test of whether Solanalib's model is good enough to prove against
- first experiment
  - pick the Address Lookup Table state views (119 production lines), compile, state the property from the Agave note, let an agent prove it on the bytecode
- convincing result
  - a complete proof plus a list of every semantic hole the agent hit, like EquiVM's array wrap-around
- cost
  - unknown; account models exist, but the proposed program's syscalls and transaction behavior need a separate coverage audit
- scoop risk
  - the EquiVM authors, Certora, or the Solana Foundation extending Solanalib

what i searched

- web search, standard and extended
  - Move Prover, Sui Prover, Aptos AI verification
  - Certora, AutoProver, Solana Prover, Kamino, Kontrol, Halmos
  - Solana, sBPF, rbpf, Agave, Firedancer with Kani, Verus, Lean, Isabelle
  - Ethereum clients, EVM semantics in Lean, Isabelle, Dafny, Rocq
  - verified zkEVM, OpenVM, SP1, Alpenglow proofs
  - LLM plus Solidity verification, 2025 and 2026
- opened about 35 sources, about 12 as full text
  - full text: EquiVM, MSG, Move spec inference, FMCAD Move, Move Prover, LLM oracles, SseRex, Neuroforger, invariants paper, IsabeLLM, PropertyGPT, Mota 2023, Kamino report
  - paper-collection additions: those papers except the Mota paper and the Kamino report
- not covered
  - KEVM and K papers, Halmos, SMTChecker papers, Tezos, Cardano, Algorand, Cosmos SDK, Bitcoin Script
  - Alpenglow proofs: the search returned none, so I cannot say none exist
  - Solana client bugs and their classes (CVE data), Firedancer's own fuzzing results
  - ChatGPT was unavailable and was not consulted
- limits
  - publication review checked Zellic, Solidus, Solanalib, and the SP1 blog directly
    - removed Solanalib counts absent from its current README
  - the Move Prover TACAS venue and the Verity compiler were not confirmed from a primary source
