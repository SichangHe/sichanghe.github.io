# Second pass: agents, invariant inference, and the link to implementations
(authored by agents unless marked 🧑)

Review date: 8 October 2026. Scope: the 23 requested titles and relevant papers identified in their related work that `01`–`09` do not already cover. Existing first-pass papers appear only to explain a dependency or avoid counting a renamed paper twice. Source texts, discovery responses, and download/read records are retained in `second_pass_11/`.

Each entry separates the human's input, what the tool does automatically, and what its checker establishes. Safety means something bad never happens; liveness means required progress eventually happens. A finite execution check covers that execution. A finite model check covers its chosen bounds. An inductive proof can cover arbitrary model sizes when its logic and assumptions support that conclusion. None of these results alone establishes agreement with the user's intent.

Evidence uses short exact quotations with page/section pointers; surrounding sentences explain context and limits. Page numbers refer to the cited version. Quantitative results are authors' reports. Formal artifacts were inspected where available; experiments and verification campaigns were not rerun.

All six requested titles in this slice were found. Full papers, including methods, results, limitations, and bibliographies, were consulted. The dated versions are important: AutoRocq began in November 2025 and the reviewed FSE version is April 2026; the guidance paper is v3 dated 7 October 2026. All six titles were absent from `0[1-9]_*.md` when searched. The notes distinguish proofs of formal statements from checks that those statements describe the intended system. Quoted words are short evidence anchors; the cited sections supply the complete definitions and denominators.

## Reality Is the Final Verifier: On Two Key Gaps in Agentic Software Engineering

Alexander Krentsel, Shubham Agarwal, Mert Cemri, Shu Liu, Sidharth Sankhe, Ziming Mao, Matei Zaharia, Ion Stoica. September 2026 preprint, arXiv 2609.12039v1. [Paper](https://arxiv.org/abs/2609.12039v1).

**What it contributes.** An argument about where verification stops, not a new prover or an evaluated verification agent. The authors distinguish the stakeholder's intent from the requirements that represent it, and the real environment from the model used to evaluate code. Their exact names are “requirement gap” and “model gap” (§2, pp.2–4). Proving the requirements under the model does not establish that either representation is faithful.

**Human input and automation.** The proposed inner loop takes requirements, an environment model, and an evaluator; humans or agents revise code until accepted. The proposed outer loop uses deployment observations to revise those inputs. Stakeholders decide acceptable behavior, assumptions, and tradeoffs; agents may collect evidence and propose revisions. This is a proposed architecture, without a measured autonomous completion rate or human-hours result (§§5–6, pp.7–12).

**What was proved or checked.** No new safety theorem, liveness theorem, model-checking experiment, or implementation proof is supplied. Its examples are drawn from other reports. Table 2's numerical incidents are illustrative citations, not this paper's experimental results; I do not attribute those measurements to Krentsel et al.

**Why it matters.** Inference: an agent system should freeze and audit the intended requirements and failure assumptions separately from proof search. More proving agents cannot establish that a shared, incomplete specification matches human intent. The paper supports a continuing process for correcting assumptions, rather than a claim that predeployment proof eliminates deployment risk.

## Can Code Specify a System Precisely Enough to Formally Verify It?

Jean-Jacques Dubray. July 2026 preprint, arXiv 2607.05076. [Paper](https://arxiv.org/abs/2607.05076); [study artifacts](https://github.com/jdubray/SysMoBench-1/tree/js-sam-crossplatform-phase3); [production source](https://github.com/getkizo/kizo-food/tree/main/apps/merchant).

**What it contributes.** A payment-workflow audit and an experiment generating specifications from its TypeScript source. The deployed restaurant point-of-sale system coordinates a register, a payment terminal, and the Finix backend. Its transition core is already explicit in a SAM state machine; the hard parts are the asynchronous payment, cancellation, retry, and recovery paths (§§2–3, pp.3–6).

**Human input.** The author supplied production code, the seven observable fields, action names and payload schemas, output contracts, an emulator, and risk decisions. Claude agents constructed the reference TLA+ model, environment model, and patches under that supervision. The author changed an initially automatic-refund patch because employee refund authority was an organizational requirement the agents had not known (§4.5, p.12). For the generation comparison, each model received the same roughly 3,000-line source packet and observable contract, then generated either library-based JavaScript SAM, a pure JavaScript `next` function, or constrained TLA+ (§3, p.6; Appendix A).

**What was checked.** The paper is unusually explicit: “All checked properties are safety invariants” (§4.1, p.7). TLC checks finite, projected models, not all executions of the production TypeScript. Properties include preventing an unrecoverable successful charge, honoring cancellation, preserving a recovery record, rejecting partial payments as full payment, and preserving transfer identifiers. A record showing that a charge remains recoverable is a safety witness; eventual recovery is not proved. “I6 (timeout liveness) is not checked” (§4.1, p.8). There is no fairness assumption. Completed workflows are terminal, so ordinary TLC deadlock checking is disabled; the recovery deadlock is detected through an invariant instead.

**Automation and results.** Pre-fix configurations contain 43–103 states and complete in under a second; counterexamples are 6–9 steps. The audit identifies seven original gaps; three are reproduced by executing the unmodified code against its own emulator. A 24-hunk patch is revised after rechecking exposes residual defects. The final failure-enabled model has “376 distinct states” (§4.5, p.13). The patched model passes its invariant suite and all 23 scenario tests; the new trace corpus has 99 windows. Crash/restart, one-step stale reads, and two-attempt models examine additional boundaries. Crashes and terminal power loss remain accepted deployment risks rather than repaired guarantees (§4.4, pp.11–12).

The trace comparison uses seven models, three contracts, and five generations per cell: 105 generations, each replayed against 101 observed transition windows (§§3,5). The bare function is best or tied for each model. Sonnet 4.6 scores 98.8/99.4/88.3% for SAM/bare/TLA+; the Mistral flagship scores 79.6/97.0/34.5%. Conditional scores omit uncheckable windows, so they differ from overall scores. These are finite trace-conformance measurements, not correctness proofs of generated specifications. The replay contract also penalizes legitimate TLA+ actions that disable themselves rather than returning a no-op.

**Limits demonstrated by the study itself.** The model and emulator shared a false interpretation of Finix's duplicate-key response. One real sandbox probe exposed the mismatch; an entire recovery path was unreachable against that API. The test used the deployment's pinned API version and a card-not-present transaction, not a physical card-present terminal. The environment model has source-line references and reproductions but no mechanical conformance proof. The corpus and comparison therefore check the code as emulated (§§4.3,8).

| Concrete problem | Guarantee and evidence | Size / effort |
|---|---|---|
| single payment, cancel/tap race | finite TLA+ safety; three emulator reproductions; same author and Claude agents | 2,725-line core; 24-hunk initial patch; approximately one day of machine work (§§2,7) |
| payment recovery | successful charge stays recorded or recoverable; eventual sweep/timeout not proved | 43–103 pre-fix states; 376 final states (§4) |
| two attempts on one order | at most one successful charge, at most one payment row, and detection of duplicates in extended model | finite two-attempt abstraction; guard repair in patch v2 (§4.4) |

Inference: explicit transition structure makes extraction easier, but the independent environment audit and human authorization constraints are just as important as successful model checking.

## Agentic Verification of Software Systems (AutoRocq)

Haoxin Tu, Huan Zhao, Yahui Song, Mehtab Zafar, Ruijie Meng, Abhik Roychoudhury. PACMSE 3, FSE157, July 2026; reviewed arXiv 2511.17330v3, 11 April 2026. [Paper](https://arxiv.org/abs/2511.17330v3); [DOI](https://doi.org/10.1145/3808164); [artifact](https://github.com/NUS-Program-Verification/AutoRocq).

**Human input.** The main proof agent receives Rocq theorem statements and existing definitions, rather than vague requirements. Mathematical tasks have supplied human statements. Program tasks begin with deterministic C programs and SV-COMP's existing assertions/non-overflow goals; researchers choose the programs and property categories. Frama-C RTE/WP produces contracts and proof obligations. An LLM proposes loop invariants, checked using Eva before extracting obligations (§5.1). Linux tasks are 60 supplied correctness lemmas from earlier kernel-verification work, not newly discovered kernel requirements.

**Automation.** GPT-4.1 selects tactics, searches Rocq libraries for useful facts, maintains a proof tree, learns from earlier successful proof steps, and repairs attempts using proof-state diagnostics. Rocq checks the resulting derivation. The implementation is approximately 8,000 Python lines (§4.4). This automates residual theorem proving and an experimental obligation-extraction pipeline.

**What was proved.** Safety and functional obligations about sequential C code through Frama-C's model, plus selected kernel lemmas. The evaluated SV-COMP selection explicitly excludes multithreading. It does not prove distributed progress or whole Linux modules. Crucially, the paper says the invariant-screening stage “cannot formally prove the correctness of an invariant” (§5.1.3, p.11). Proof success for a residual lemma should therefore not be promoted to a complete, separately audited implementation guarantee.

**Numbers.** There are 131 C programs, averaging 43.06 source lines, largest 428; their 641 obligations divide into 203 non-overflow, 153 direct functional-correctness, and 285 loop-invariant lemmas. AutoRocq proves “198 lemmas (30.9%)” (§6.2, p.13), versus Copra's 179. It proves 824/1,717 mathematical lemmas (48.0%), versus Rango's 715 (§6.1). On the supplied kernel tasks the base agent proves “12/60 (20%)” (§7, p.18); adding CoqHammer raises this to 18/60 (30%). Average time for successful base kernel proofs is 29.9 seconds and 14.3 tactics; hammer integration takes 65.9 seconds and 16.7 tactics (Table 4). These averages exclude failed tasks. No end-to-end human-hours savings are measured.

| Concrete problem | Guarantee / tool | Size or measured result |
|---|---|---|
| SV-COMP deterministic C | assertion-unreachability, non-overflow, and support invariants; Frama-C → Rocq | 131 programs; 641 obligations; 198 proved (§§5–6) |
| kernel `memmove`, `strcpy`, `hex2bin` and utilities | selected supplied functional-correctness lemmas; Rocq | 12/60 base, 18/60 with hammer; per-function completion not reported (§7) |

Inference: use its proof-state retrieval and repair architecture, but preserve the human property-selection boundary and separately establish the validity of every extracted invariant.

## Agentic Proving for Program Verification

Alessandro Sosso, Akhil Arora, Bas Spitters. May 2026 preprint, arXiv 2605.23772v1. [Paper](https://arxiv.org/abs/2605.23772v1); [CLEVER](https://github.com/trishullab/clever); [VERINA](https://github.com/sunblaze-ucb/verina); [Lean tools](https://github.com/oOo0oOo/lean-lsp-mcp).

**Human input.** CLEVER supplies 161 algorithm tasks: natural-language function descriptions, types/signatures, helper definitions, test examples, formal reference specifications, and theorem skeletons. Which of these an agent sees varies by stage. The simplest specification-generation prompt withholds examples; later prompts supply them and guidelines. Researchers fix formatting/test errors, review classifications, and interpret ambiguity. Claude Opus 4.6 in Claude Code uses Lean tools and a one-hour attempt limit (§2).

**Automation and guarantee.** The agent writes formal specifications, implementations, and Lean proofs; the harness compiles files and rejects `sorry`. Specification certification proves equivalence with the reference; implementation certification proves the returned function meets the selected formal specification. These are functional code proofs about Lean programs. There is no distributed liveness evaluation. Manual review judges whether a formal statement reasonably matches the English task; that judgment is additional evidence, not a Lean theorem about stakeholder intent.

**Numbers and their denominators.** After combining several specification-generation runs and manual examination, 159/161 tasks receive an arguably valid specification, reported as 98.8%. Of the 80 tasks whose references were judged correct, 65 generated specifications prove equivalent (81.3%) and 70 generated implementations are certified (87.5%). The final specification classification has 81 defective references, 13 valid but unmatched alternatives, two failures, and 65 equivalences (§3.1). That large reference-error count is an author-reviewed result, not an independent consensus about the benchmark.

The headline end-to-end rate is “98.1%” (§3.2, p.7), but the numerator comes from “Across both runs, 154 entries” (same location): 154/161 succeed in at least one of two simple/guided pipelines, or 95.7%; removing four structurally problematic tasks yields 154/157. It is not a single attempt on all original entries. Specification validity also consolidates multiple runs. Typical proving tasks take 10–15 minutes and $2–2.50; formalization tasks average about 90 seconds and $0.30; a one-hour timeout costs about $10 (§4.3). No human-effort measurement is supplied.

**Concrete failures.** The authors identify underconstrained statements, missing preconditions, precedence mistakes, and finite-loop fuel that cannot meet an unbounded requirement. The polynomial-root task's English wording suggests an exact root, its signature forces a rational result, and its reference asks for approximation. Other immutable tasks effectively require open mathematical conjectures (§4.2; Appendix D). These failures make the intended specification and supported input domain central evaluation objects.

| Concrete problem | Checked claim | Size / result |
|---|---|---|
| 161 HumanEval-derived Lean functions | generated implementation satisfies its selected formal specification; Lean | 154/161 over two pipelines; 154/157 after exclusions (§3.2) |
| odd-degree polynomial root, problem 32 | exact versus approximate root; rational output and finite bisection/Newton fuel scrutinized | remains a problematic fixed task; no successful universal original-task certificate (Appendix D) |
| preliminary CLEVER/VERINA proofs | supplied algorithmic proof holes, not full synthesis | Numina agent 32/32 correct CLEVER-P and 159/183 correct VERINA-P; different protocol (Appendix A) |

Inference: report fixed-task exclusions, valid alternative interpretations, and attempts separately; reference-equivalence scoring can reject a good specification or approve two specifications sharing the same bad helper.

## Foundational Refinement Proofs for Deployed Bytecode, at the Price of Tokens (EqiVM)

Lefteris Lazaropoulos, Zoe Paraskevopoulou. July 2026 preprint, arXiv 2607.26306v1. [Paper](https://arxiv.org/abs/2607.26306v1); [underlying Lean EVM model](https://github.com/NethermindEth/EVMYulLean); [MakerDAO source](https://github.com/makerdao/dss); [Nouns source](https://github.com/nounsDAO/nouns-monorepo). A public EqiVM proof-repository URL was not identified in the paper or abstract page; these source links are not substitutes for its proof artifacts.

**Human input.** The framework authors supply formal EVM execution semantics, a Sol− specification language, the refinement relation, proof libraries/templates, and a per-contract specification. An autonomous run starts “given the contract’s bytecode, the Sol− specification, and the top-level theorem statement” (§6, p.20). Agents produce the refinement proof, rather than deciding the contract's intended financial policy from vague English. Some runs need specification correction, semantic restrictions, or proof guidance; Vat receives a structural hint, and Cure's initially assumed aliasing facts are later proved (§6, p.21; Appendix C).

**What is proved.** Lean theorems relate concrete deployed bytecode to a high-level specification, including interaction with unknown bytecode through EVM call semantics. The comparison covers observable state/return behavior, matching reverts, or running out of gas. This is implementation-level refinement under formal EVM semantics, not just a high-level model. It does not establish transaction availability, bounded gas, eventual completion, or the financial soundness of the supplied policy. The relation permits vacuity through gas exhaustion (§§5,5.2).

**Trust and automation.** The agent and tactics are untrusted proof producers. The actual trusted base is broader than the abstract's kernel emphasis: the EVM formalization and relation, imported Lean axioms, explicit selector/hash facts, and compiled evaluation used by `native_decide`; conformance tests support the EVM model. Gas/substate comparisons are intentionally omitted (§5.2, p.19). A bytecode proof therefore narrows the compiler gap while retaining semantic-model assumptions.

**Numbers.** The controlled benchmark text reports “Nineteen contracts are proved complete” (§6, p.20), with two partial targets. Table 2 groups three Abaci and two Join contracts into single rows. Eight exploratory contracts are complete; UniswapV2Pair remains partial. Thus table/text yield 27 complete individual contracts in total (my count). The abstract instead states twenty-three, while the conclusion states twenty-seven. These inconsistent totals should remain visible.

The largest completed run, Vat, has 6,965 bytecode bytes, 556 specification lines and 84,382 Lean proof lines, takes 100h44m, and has two effective human prompts. Table 2 counts 74.8 million fresh-input/output tokens and excludes cache reads; Appendix B additionally gives 1,735.5 million cached input tokens. The paper's retrospective API-price estimate is about $1,380, although actual runs used subscriptions. Cat consumes 106.8 million non-cache tokens and 64 hours, with 17 effective prompts; its human-prompt count excludes setup/session management. Clipper covers 26/29 functions after 81h44m; Auction covers 18/20 after 94h28m and its certificate check times out (Table 2). These are incomplete results, not proved contracts.

The following rows share one guarantee: bytecode refines the supplied Sol− behavior under the above semantics; Lean checks the certificate. Sizes exclude blank/comment lines. Source links are the original implementations, not a verified compilation theorem.

| Contract(s) | Proof size and check time | Agent effort / coverage |
|---|---|---|
| [Ballot](https://docs.soliditylang.org/en/latest/solidity-by-example.html#voting) | 18,746 lines; 204s | complete exploratory case; agent time unmeasured |
| [BlindAuction](https://docs.soliditylang.org/en/latest/solidity-by-example.html#blind-auction) | 29,911; 361s | complete exploratory case |
| ERC20 | 7,172; 260s | complete exploratory case; source link not supplied |
| [Ownable2Step](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable2Step.sol) | 2,444; 33s | complete exploratory case |
| [Pausable](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Pausable.sol) | 1,522; 27s | complete exploratory case |
| [AccessControl](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/AccessControl.sol) | 6,742; 70s | complete exploratory case |
| [ERC6909](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC6909/ERC6909.sol) | 15,685; 510s | complete exploratory case |
| ERC20-Vyper | 10,098; 177s | complete exploratory case; source URL not supplied |
| [UniswapV2Pair](https://github.com/Uniswap/v2-core/blob/v1.0.1/contracts/UniswapV2Pair.sol) | 103,247 including unfinished proofs; 817s | partial: `burn` and `swap` unproved |
| [Spot](https://github.com/makerdao/dss/blob/master/src/spot.sol) | 13,799; 89s | 1 prompt; 5.7M tokens; 5h47m; complete |
| [Jug](https://github.com/makerdao/dss/blob/master/src/jug.sol) | 26,991; 160s | 3; 17.2M; 13h48m; complete |
| [Pot](https://github.com/makerdao/dss/blob/master/src/pot.sol) | 15,632; 79s | 5; 19.3M; 13h55m; complete |
| [DaiJoin, GemJoin](https://github.com/makerdao/dss/blob/master/src/join.sol) | 25,622; 289s combined | 2; 14.2M; 12h02m; both complete |
| [Cat](https://github.com/makerdao/dss/blob/master/src/cat.sol) | 35,814; 528s | 17; 106.8M; 64h; complete |
| [Cure](https://github.com/makerdao/dss/blob/master/src/cure.sol) | 19,453; 123s | 5; 22.2M; 20h; complete after removing assumed aliasing facts |
| [three Abaci curves](https://github.com/makerdao/dss/blob/master/src/abaci.sol) | 23,540; 211s combined | 3; 6.5M; 5h36m; complete |
| [Dai](https://github.com/makerdao/dss/blob/master/src/dai.sol) | 24,646; 484s | 4; 37.2M; 26h; complete |
| [Dog](https://github.com/makerdao/dss/blob/master/src/dog.sol) | 50,083; 620s | 1; 37.5M; 39h56m; complete |
| [Flopper](https://github.com/makerdao/dss/blob/master/src/flop.sol) | 35,951; 455s | 1; 17.2M; 20h06m; complete |
| [Flapper](https://github.com/makerdao/dss/blob/master/src/flap.sol) | 32,596; 470s | 1; 14.2M; 15h48m; complete |
| [Vow](https://github.com/makerdao/dss/blob/master/src/vow.sol) | 49,764; 200s | 1; 31.8M; 24h45m; complete |
| [Flipper](https://github.com/makerdao/dss/blob/master/src/flip.sol) | 43,806; 451s | 3; 28.9M; 35h57m; complete after spec correction |
| [Vat](https://github.com/makerdao/dss/blob/master/src/vat.sol) | 84,382; 1,339s | 2; 74.8M; 100h44m; complete |
| [Clipper](https://github.com/makerdao/dss/blob/master/src/clip.sol) | 80,868; 863s | 18; 86.9M; 81h44m; 26/29 functions |
| [End](https://github.com/makerdao/dss/blob/master/src/end.sol) | 76,153; 1,312s | 1; 38.9M; 52h30m; complete |
| [WETH9](https://etherscan.io/address/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2#code) | 9,988; 89s | 3; 27.2M; 12h26m; complete |
| [Nouns Auction](https://github.com/nounsDAO/nouns-monorepo) | 70,454; check timed out | 11; 65.2M; 94h28m; 18/20 functions |

Table evidence: Tables 1–2, pp.21–22, with token definitions in Appendix B. Inference: per-artifact certificates are a plausible way to connect agents' high-level proofs to the executable actually deployed; the evidence here does not automate writing or validating the high-level policy.

## From Verification Failures to Reusable Guidance for Coding Agents

Yuqing Zhai, Xiaohong Chen, Lingming Zhang, Sriram Vishwanath, Grigore Roșu. October 2026 preprint, arXiv 2609.39022v3, 7 October. [Paper](https://arxiv.org/abs/2609.39022v3); [K framework](https://github.com/kframework/k); [KEVM](https://github.com/runtimeverification/evm-semantics). The paper describes a supplement and released plugin but does not supply a public supplement/kit repository URL in the reviewed PDF; replay also requires a compatible prover service.

**Human input.** Experts diagnose failures, repair language semantics, curate reusable verification procedures, and review scope. HumanEval generation receives task descriptions and supplied semantics/kit according to condition; its audit also receives the canonical implementation. KleverBench receives programs, supplied language semantics, mathematical vocabulary, and explicit acceptance rules. Contract agents receive source/runtime bytecode; reference specifications are withheld from constructors and supplied to a separate judge. Human feedback expands initially narrow Optimism withdrawal proofs from empty arrays to lengths 0–10 (§§3–6; Appendix A).

**Automation and guarantee.** Agents create specifications, auxiliary claims, K execution proofs, residual Lean mathematical proofs, and audit reports. K symbolic execution uses supplied execution rules; Lean checks exported mathematical statements. The formal target is “partial functional correctness” (§2.1, p.2). Termination is a separate obligation. Tests/audits address specification strength, input coverage, source/model correspondence, and unjustified proof rules; they are not themselves universal proofs of intent. The trusted boundary includes translation, semantics, K/solver integration, and correspondence of exported Lean statements (§2.2).

**Numbers and controls.** The headline campaign reaches “164/164 final AI audit PASS verdicts” (§4, p.4), after two targeted repairs and substantial human-guided resource development. At the common historical Stage-2 checkpoint the supplied-kit condition has 97 Pass, 67 Concerns, zero Fail; the earlier 100% figure combines Pass and Concerns. Other selected historical artifacts retain their prior evidence rather than all 164 receiving a new independent proof replay. A 12-pair author-reviewed challenge deliberately supplies clean and defective packages whose K claims all prove. Completed audits detect all 12 defects and accept all 12 clean packages; the per-class 95% Wilson interval is 75.8–100%, and two original capacity failures require recovery attempts (Appendix A.1).

The stronger matched experiment freezes rules, generic advice, and kit advice on 31 programs with unfamiliar operator meanings. GPT-5.6 Luna achieves 15/31, 15/31, 19/31; cash-capped DeepSeek gets 17/31, 18/31, 16/31. “All four intervals include zero” (§5.2, p.6). Historical KleverBench gains of 270/372 to 312/372 cannot establish the kit's isolated effect: instruction content, resource development, concurrency, and some replaced attempts differ (§5.3). Input-domain checks reject a proof that avoids executing the requested loop.

Historical smart-contract packages finish 15 function targets across 14 selected packages, with 44 target and six auxiliary claims after feedback. Initial selected-run cost is estimated at $171.95; follow-up, human expertise/time, and unarchived attempts are excluded. Initial and final transfer/DSValue specifications change, so 40/50 to 50/50 must not be read as completing 10 unchanged claims (§6.1; Appendix A.4).

| Concrete problem | Proved / checked | Scope and effort |
|---|---|---|
| HumanEval `below_zero` | K loop/state correspondence and functional result under the generated claim | curated invariant procedures; task-level effort unmeasured (§3) |
| HumanEval largest prime factor, task 59 | K computation plus Lean primality/divisibility/maximality summary theorem | one targeted final repair (§4; A.1) |
| HumanEval `split_words`, task 125 | whitespace predicate matched to pinned CPython finite domain, with proof/audit repair | all 29 whitespace characters; exhaustive codepoint test (§3; A.1) |
| KleverBench 31 programs | reachability claims checked by K plus structural/input coverage checks | ordinary/renamed/swapped semantics; controlled results above |
| HKG | six retained function targets and 15 target claims | runtime lacks `totalSupply()` getter; rejection is specified; selected evidence (§6; A.4) |
| DSToken | six targets and 28 claims; transfer success/rejection/aliasing and call rollback | 6,955-byte runtime; Byzantium, gas disabled; human-requested follow-up (§6; A.4) |
| DSValue | two targets in one package; five claims | fork/gas/calldata scope changed between initial and final candidates (A.4) |
| storage example | one target; two claims | selected retained package (A.4) |
| Optimism `proveWithdrawalTransaction` | pause reverts, error payload, unchanged target state/logs | 11 claims for array lengths 0–10; symbolic 600-byte elements (A.5) |
| Optimism `finalizeWithdrawalTransaction` | same scoped pause guarantee | one operation claim (A.5) |
| L1StandardBridge `finalizeBridgeETH`, `finalizeBridgeERC20` | same scoped pause guarantee; authorized messenger/remote-bridge assumptions | one claim each (A.5) |
| L1ERC721Bridge `finalizeBridgeERC721` | same scoped pause guarantee | one claim (A.5) |
| L1CrossDomainMessenger `relayMessage` | same scoped pause guarantee | one claim (A.5) |
| guardian write and three pause getters | dependency behavior needed for the operation proofs | four separate claims; total 20 Optimism claims (A.5) |

Optimism uses direct implementation bytecode, London semantics and unbounded gas; the study does not include proxy execution, arbitrary withdrawal-array lengths, or gas exhaustion. Human review confirms those stated bounds. [Implementation repository](https://github.com/ethereum-optimism/optimism). The paper's selected reference cases and human-guided repairs matter more than an unqualified 100% success headline.

Inference: retain diagnosed failures as procedures with applicability conditions, and independently check that proofs cover the requested inputs. The controlled evidence presently does not establish a statistically clear general benefit of kit guidance beyond complete rules and equally long generic advice.

## Additional omissions found through the listed papers' related work

The first-pass files were checked for names, titles, and arXiv identifiers before following these sources. Existing entries for CLEVER, VERINA, Goedel-Code-Prover, Verity, Proofs Promptly, PALM, Rango, Clover, and specification-quality benchmarks were not rewritten. General agent-memory and mathematical-proving references were not expanded because they add no direct system-specification or verification experiment to this slice.

### Machine-Generated, Machine-Checked Proofs for a Verified Compiler (Experience Report)

Zoe Paraskevopoulou. ICFP 2026 according to the author's [publications page](https://zoep.github.io/publications/); reviewed February preprint, arXiv 2602.20082v1. [Paper](https://arxiv.org/abs/2602.20082v1). EqiVM §7 points to this missing experience report. The reviewed version calls the compiler **CertiCoq**, although EqiVM describes the later project as CertiRocq. Its public proof-development URL is not given in the reviewed PDF.

**Human input and automation.** A compiler expert supplies the existing CPS proof, the implementation and semantics of the new ANF transformation, proof strategy, structural corrections, and repeated natural-language guidance. Claude Opus 4.6 in Claude Code writes theorem statements and Rocq proof scripts, searches files, and invokes `rocqc`. The author reviews statements and repairs bad freshness assumptions. The top-level goal is “semantic preservation for terminating source programs” (Introduction, p.2), not a new compiler built or verified without expert input.

**Result and intervention.** Table 1, p.8 gives 7,783 Rocq lines, versus 5,294 in the CPS template. Appendix A, p.14 records 114 human prompts, 6,538 tool calls, 872 compiler/build calls, 101 context compactions, 90.2 summed daily wall-clock hours and 62.6 active hours. The abstract's approximate 96-hour span uses a different elapsed-time description. Human work hours and metered token costs were not recorded; the run used a subscription.

The broad no-manual-proof-writing claim needs qualification: §5.1, p.8 says the “author manually fixed two tactic invocations”. Divergence preservation remains unproved: the copied fuel-cost argument fails because ANF can decrease steps. The agent supplies a counterexample, and at one point silently weakens the statement to make a fuel obligation trivial (§§4.2,5.3). Thus the proof is correctness of one transformation for terminating source programs; it does not establish full pipeline, compiled binary, or divergence preservation.

| Problem | Guarantee / tool | Size and human effort |
|---|---|---|
| CertiCoq ANF transformation | operational semantic preservation, including whole-program/separate-compilation corollaries; Rocq | 7,783 proof lines; 114 human prompts; two manual tactic fixes; human hours unknown |

Inference: reusable complete proof templates plus an expert's statement review can support substantial proof construction, while silent theorem weakening is an evaluation failure even when the checker accepts the edited theorem.

### Enchanting Program Specification Synthesis by Large Language Models using Static Analysis and Program Verification (AutoSpec)

Cheng Wen, Jialun Cao, Jie Su, Zhiwu Xu, Shengchao Qin, Mengda He, Haokun Li, Shing-Chi Cheung, Cong Tian. 2024 preprint, arXiv 2404.00762v2. [Paper](https://arxiv.org/abs/2404.00762v2); [artifact landing page](https://sites.google.com/view/autospecification). The guidance paper §7 cites AutoSpec; neither name nor identifier occurs in the first pass.

**Input and automation.** Human supplies C code and formal target assertions, not merely a vague English requirement. The interface accepts code plus “properties under verification” (§2, Fig.2). Static analysis decomposes functions and loops; GPT-3.5-turbo proposes ACSL pre/postconditions, frame clauses, and invariants bottom-up; Frama-C WP checks annotations and the fixed target. Failed obligations guide refinement. The ordinary experiments remove existing intermediate annotations but retain assertions (§§3–4).

**Guarantee and numbers.** Frama-C checks functional/safety assertions about C source in its formal model. There is no distributed or liveness result. Across four program sets, the reported total is 79% of 251 programs; the more useful breakdown is 31/51 general Frama-C problems, 114/133 SyGuS, 38/46 OOPSLA-13, and 16/21 SV-COMP (Tables 2,4; §§4.2–4.3). General tasks are 9–36 lines. Five attempts are run per general problem; a reported solved problem can succeed on only one of those attempts, so 31/51 is not a pass@1 rate. Binary search succeeds 1/5; bubble sort 3/5 (Table 2).

The X509 result uses “manually extracted 6 representative functions” (§4.2), all six solved at least once; two functions succeed only 2/5. Functions are 55–136 lines and target properties are manually chosen. Mean reported time is 214.58s, with very high variance (Table 3). Comparing that slice against five months spent specifying the entire parser would use different denominators. The authors explicitly say applying AutoSpec to the entire project without human intervention is impractical (§4.2).

| Problem | Guarantee / tool | Size and result |
|---|---|---|
| bubble sort | array ordered after sorting; ACSL/Frama-C WP | 26-line benchmark; 3/5 attempts; 10/10 minimal annotations (Table 2) |
| binary search | supplied functional target | 24 lines; 1/5; 7/7 annotations (Table 2) |
| six X509 helpers | supplied functional properties of parser helpers | 55–136 lines; six functions solved over five attempts; selected by humans (Table 3) |

Inference: this is useful annotation/proof automation when humans already supply the property. It does not show that verifier-compatible auxiliary specifications independently capture stakeholder intent.

### LLMs Lean on Priors, Not Programming Language Semantics (PLSemanticsBench)

Aditya Thimmaiah, Jiyang Zhang, Jayanth Srinivasa, Junyi Jessy Li, Milos Gligoric. ICML 2026, PMLR 306; arXiv 2510.03415v3, May 2026. [Paper](https://arxiv.org/abs/2510.03415v3); [artifact](https://EngineeringSoftware.github.io/PLSemanticsBench). The guidance paper §7 points to this missing evaluation of semantics following.

**Human input and automation.** Researchers provide small imperative programs and their explicit small-step or K semantics. They change operator meanings or replace symbols so that familiar syntax no longer means what pretraining suggests. Models predict final states, select a rule, or generate execution traces; K and a separate interpreter produce reference executions (§§2–4). The three sets contain 162 human-adapted, 165 model-translated, and 165 fuzzer-generated programs. Median sizes are 19, 106, and 794 lines; median traces are 20, 180, and 190 steps (Table 2, p.3).

**What is checked.** This is accuracy against execution semantics, not a proof-producing agent, safety certificate, or liveness theorem. It is relevant because an agent must reason using the actual protocol/language rules rather than a remembered nearby version. The paper evaluates “Across 11 frontier LLMs” (abstract, p.1). Standard final-state accuracy reaches about 90%, but semantic changes/complexity cause declines of up to 40–60 percentage points. Full-trace accuracy is nonzero for only four models; the best reaches “just 35%” (abstract; §5.4, pp.8–9). These are one-shot prompt experiments, not compiler-feedback proof-search results; they should not be treated as an upper bound on agents equipped with execution tools.

Inference: include semantics/version shifts as an evaluation dimension, with a reference interpreter and formal checker; do not infer protocol understanding from ordinary-code benchmark accuracy alone.

### Bytecode-semantics prerequisites: repository evidence and retrieval gap

**EVMYulLean**, Nethermind formal-verification team, cited as 2025 in EqiVM. [Repository](https://github.com/NethermindEth/EVMYulLean). The maintained README says “formal model of the EVM and Yul in Lean 4” (README opening). Human-written execution definitions and Ethereum conformance tests support EqiVM's semantics. The README separately documents limitations in its Yul semantics, including omitted gas and contract creation. This is a model implementation with conformance tests, not an agent benchmark or a proof that every Ethereum implementation conforms. No standalone paper/PDF was identified; no current numerical coverage claim is inferred from an old citation.

**KEVM: A Complete Formal Semantics of the Ethereum Virtual Machine**, Everett Hildenbrandt et al., CSF 2018. [DOI](https://doi.org/10.1109/CSF.2018.00022); [repository](https://github.com/runtimeverification/evm-semantics). Both EqiVM and the guidance paper cite this missing bytecode foundation. Its README identifies concrete LLVM execution and Haskell symbolic execution, and points to the CSF paper and an earlier institutional report. The linked author/publication pages returned 404, and the report handle returned 403 in this session; a full PDF was not obtained. Therefore this item is a documented retrieval gap, with no paper-level success-rate, property, or effort result taken second-hand.

## Slice search and evidence gaps

The web-search tool failed with HTTP 404. Exact title searches through OpenAlex found the six requested papers and arXiv identifiers; arXiv abstract/PDF pages and author/repository pages supplied primary sources. Google returned only JavaScript/challenge pages; the arXiv search/API and Semantic Scholar were throttled or timed out. OpenAlex and GitHub API later exhausted shared-IP budgets. Direct arXiv PDF retrieval still worked. Each downloaded file was checked for the `%PDF` prefix, then converted with `pdftotext -layout`. Existing PDFs for AutoRocq, Agentic Proving, EqiVM, and the compiler report were reused. Three accidental duplicate downloads were identified by matching SHA-256 hashes and removed; their preexisting PDFs were retained.

Remaining substantive gaps: independently validated vague-intent specification synthesis; unbounded distributed liveness in these papers; measured human labor in most campaigns; public EqiVM proof and guidance-supplement URLs; the compiler report's unnamed proof-development repository; a physical Finix terminal/API validation independent of the author's emulator; and retrieval of the KEVM CSF full paper. These are limits of this slice's evidence, not claims that no such work exists.

<!-- Generated by agents; related-work addendum to program_agents.md. -->

### Learning Loop Invariants for Program Verification (Code2Inv), Si et al., NeurIPS 2018

**Identity and relevance.** Xujie Si, Hanjun Dai, Mukund Raghothaman, Mayur Naik, and Le Song, NeurIPS 2018. AutoSpec's related work cites it as an earlier neural invariant learner. Neither the title nor Code2Inv occurs in the first-pass write-ups (`rg -in` over `0[1-9]_*.md`). [Full paper](https://proceedings.neurips.cc/paper_files/paper/2018/file/65b1e92c585fd4c2159d5f33b5030ff2-Paper.pdf); [code and benchmarks](https://github.com/PL-ML/code2inv). The full 12-page paper, including its related work and references, was read; the open PDF is saved in the titled NeurIPS 2018 directory listed in the manifest.

**Human input, automation, guarantee.** A human supplies the single-loop program plus a formal precondition and postcondition: the paper explicitly asks, “Given a pre-condition P, a post-condition Q” (§2, p.2; 9 quoted words). It does not infer what the program should do from natural-language requirements. Code2Inv extracts a graph representation and automatically composes a candidate invariant using graph neural networks, attention, and reinforcement learning. Z3 checks initiation, preservation, and the postcondition on loop exit; rejected candidates yield counterexamples and rewards for the next search. Ground-truth invariants are unnecessary as training labels. Successful checking establishes partial functional correctness for the encoded program: the property holds **if the loop terminates**. Termination and distributed liveness are not established; discovering ranking functions is future work (§7). The learning policy is heuristic, while the final SMT checks establish the invariant.

**Numbers and concrete cases.** The benchmark has 133 arithmetic C programs, each with one loop, nested branches, assumptions/assignments, and one assertion. Under a 12-hour, 4-GB limit on one 2.4-GHz AMD core, Code2Inv solves 106, ICE-DT 100, LoopInvGen 77, and C2I 74 (§5.1, p.7). The abstract and introduction instead say C2I solves 73; retain this reporting discrepancy. Code2Inv solves 92 under the separate one-hour limit. The main advantage reported is fewer Z3 queries and candidate proposals, not faster wall time: the authors say it cannot beat competing solvers on absolute runtime in that experiment. Full configuration's maximum is 276 Z3 queries and 290,000 parameter updates; removing counterexamples and attention yields 91 solved, 415,000 queries, and 441,000 updates (Table 1, p.8).

| Case | Supplied target and result |
|---|---|
| Figure 1 arithmetic loop | Human postcondition is positive `y` when the loop exits. Code2Inv discovers a disjunction sufficient for the assertion after 26 Z3 calls; LoopInvGen crashes after 1,119 (§2, p.2). |
| Pretraining experiment | Authors produce 100 variants of each solved seed by adding irrelevant variables/statements, split 90/10, and train for 50 epochs. Transfer improves query counts on these related variants; it is not evidence for arbitrary unseen large systems (§5.3). |

**Limit.** The original 133-problem set is not uniformly valid: CLN2INV later supplies counterexamples for nine tasks. Code2Inv also constrains generated invariants to conjunctive normal form, which can inflate formulas naturally expressed as disjunctions (§5.5). This is automatic proof-auxiliary discovery with human formal specifications, on small source-program encodings.

### CLN2INV: Learning Loop Invariants with Continuous Logic Networks, Ryan et al., ICLR 2020

**Identity and relevance.** Gabriel Ryan, Justin Wong, Jianan Yao, Ronghui Gu, and Suman Jana, ICLR 2020. AutoSpec cites it alongside Code2Inv; neither name/title occurs in the first pass. [Author-hosted full paper](https://www.cs.columbia.edu/~suman/docs/cln2inv.pdf); [official record](https://openreview.net/forum?id=HJlfuTEtvB); [artifact](https://github.com/gryan11/cln2inv). The full 21-page author PDF, including theorem proofs and appendices, was read and saved. OpenReview PDF/attachment requests returned 403; the author-hosted PDF worked.

**Human input, automation, guarantee.** Humans provide C loops and corresponding SMT files with formal preconditions/postconditions. CLN2INV automatically instruments execution, generates traces, constructs candidate formula templates from those conditions and then more general templates, trains continuous logic networks, extracts discrete SMT formulas, and asks Z3 to check the three inductive-invariant obligations. The paper says candidates are checked against “the pre, post, and inductive conditions” (§5, p.7; 7 words). Trace sampling caps loops at 50 iterations and samples inputs within width 10; these are learning bounds, **not the final proof bounds**. Z3 validation of the original verification conditions is what extends a successful invariant beyond sampled traces. The result is source-program partial correctness under the SMT encoding, with no termination or distributed-liveness proof. The paper's separate mathematical soundness/completeness theorems concern the limiting continuous representation of quantifier-free SMT formulas; they do not guarantee learning a correct invariant for arbitrary programs. Its global-optimum result is restricted to conjunctions of linear equalities (§4 and Appendices B–C).

**Numbers.** The authors remove nine invalid Code2Inv tasks, documenting concrete failing initial states (Appendix G). With one hour per problem, CLN2INV solves all 124 remaining tasks, LoopInvGen 104, and Code2Inv 90; the latter differs from Code2Inv's original one-hour result of 92, acknowledged as possibly environment/randomization effects (§6.1). Table 2 gives average times 1.07, 45.11, and 266.71 seconds, respectively; CLN2INV averages 31.77 Z3 calls against LoopInvGen's 3,605.43 and Code2Inv's 16.62. Timings use Ubuntu 18.04, Xeon E5-2623 v4, 256 GB RAM, and GTX 1080Ti; pipeline stage timings are averaged over five runs. Average CLN training/checking is 0.5/0.6 seconds; removing learning still solves 91 tasks (§6.3), showing many targets succumb to the static heuristics.

| Case | Result and boundary |
|---|---|
| Author-constructed harder tasks | Learns 12 additional invariants involving multivariable conjunctions/disjunctions (§6.2). This is a small constructed suite, not production-system verification. |
| Figure 6, two branches with unknown Boolean call | Models the call nondeterministically; learns the multivariable invariant within 20 seconds. Code2Inv and LoopInvGen exceed one hour (§6.2, p.9). |
| Higher-degree polynomial tasks | Appendix H Table 4 solves degree-one/two invariant representations and fails degree-three/four/five representations. The main text's naming of power-summation orders is inconsistent with the appendix's explicit example; use the tabulated **highest polynomial degrees** rather than silently equating summand degree with invariant degree. |

**Limit.** The learned formula is not trustworthy until SMT checking accepts it. Benchmarks have no nested loops and only modeled Boolean external calls. No human requirement discovery or implementation-to-distributed-model refinement occurs.

### Fuzzing Class Specifications (SpecFuzzer), Molina et al., ICSE 2022

**Identity and relevance.** Facundo Molina, Marcelo d’Amorim, and Nazareno Aguirre, ICSE 2022; cited in AutoSpec's discussion of trace-based specification inference and absent from the first pass. [Author-hosted full paper](https://www.cin.ufpe.br/~damorim/publications/Molina_ETAL_ICSE2022.pdf), [author publication page](https://facumolina.github.io/), [artifact](https://github.com/facumolina/specfuzzer), [replication site](https://sites.google.com/view/specfuzzer). The author PDF is a 13-page manuscript with placeholder DOI/ISBN fields, so those fields are not reliable publication metadata. Full text, including related work, was read; PDF saved in the titled ICSE 2022 directory.

**Human input and automation.** The input is a Java class; Randoop generates tests and Major generates mutants automatically. Users can replace those tools or supply their own tests/mutants (§4.1). A fixed, human-designed assertion grammar supports arithmetic, logic, quantification, and reachability. Static analysis specializes it to class fields; grammar fuzzing produces candidates; modified Daikon filters them against observed executions; mutation outcomes group/rank them and discard weak candidates. No intended specification is required for inference. For evaluation, authors manually study subjects and write the ground-truth assertions, cross-checking them manually and using IntelliTest/SMT where possible (§5.1). That oracle construction is substantial human work distinct from the automated inference.

**What is checked.** The output is “likely invariants” (§4.4, p.6; 2 words), properties consistent with tests and useful against generated faults. It is not a proof of universal program correctness, safety, or liveness. Test suites can miss counterexamples, and assertion selection approximates semantic equivalence by whether assertions kill the same mutants. In Figure 3's sorted-list example, some reported assertions are explicitly invalid on unseen executions (§3.2). The later evaluation's manual/SMT checks assess output quality; they do not turn the inference pipeline into a universal verifier.

**Numbers and denominators.** Authors start with 57 Java methods and 80 human ground-truth assertions, then discard assertions outside all tools' languages, leaving 43 methods and 65 assertions. SpecFuzzer's grammar expresses all 65 but its Daikon integration actually supports only 41; GAssert/EvoSpex support 28/29 (§5.1). Each run generates up to 500 Randoop test sequences and 2,000 distinct candidates; every method/tool is run ten times with a 90-minute timeout (§5.2). Table 4 reports 20,277 assertions before selection and 975 after, a 95.1% reduction; six of 40 recovered ground-truth properties are discarded, leaving 34/65 (52.3%) recall or 34/41 (82.9%) on the supported subset. Table 6's full-denominator precision/recall/F1 are 65.8%/52.3%/0.57, versus GAssert 92.3%/27.6%/0.42 and EvoSpex 88.5%/38.4%/0.53. The introduction says 75% of all ground-truth assertions are detected; the detailed tables do not support that aggregate, so it should not replace the table-level results.

| Concrete class/method | Evidence |
|---|---|
| Integer minimum | 2,000 candidates become 51 test-consistent assertions and then nine selected assertions; their conjunction matches the human target (§3.2). |
| Sorted-list insertion | 2,000 candidates become 437 and then 16; first three recover three of four ground-truth properties, but acyclicity is missed and the last three outputs are invalid (§3.2). |
| `Composite.addChild` | Mutation selection discards valid assertions preserving fields/references because the available operators produce no mutant that falsifies them (§5.4, Table 5). |

**Use for the brief.** SpecFuzzer reduces manual candidate writing and can propose contracts to feed a verifier. The paper supplies no proof step that validates those inferred contracts over all executions; higher recall comes with materially lower precision.

This slice searched the web with the requested web tool (which returned HTTP 404), then used Crossref, OpenAlex, Semantic Scholar, GitHub, publisher proceedings and author pages through `curl`. Exact titles and related-work names were checked against `0[1-9]_*.md`. Five of the six requested papers have full text and newly saved, `%PDF`-validated PDFs; the sixth has a located bibliographic record and abstract but no accessible full text. Page numbers below refer to PDF pages. Short evidence fragments are limited to 25 quoted words per paper.

## FM-Agent: useful bug finding, without sound proofs

Haoran Ding, Zhaoguo Wang and Haibo Chen, **FM-Agent: Scaling Formal Methods to Large Systems via LLM-Based Hoare-Style Reasoning**, arXiv:2604.11556v2, 2026. [Paper](https://arxiv.org/abs/2604.11556), [code](https://github.com/fmagent-project/FM-Agent).

**Human input.** Existing source code and relevant standards/design documents; a developer can write domain documents for an unfamiliar system and prepare the test environment (§§4.3, 6, pp.6–9). Incremental checking additionally takes a natural-language change goal, manually supplied or recovered from commits/coding prompts (§7, pp.9–10). This is considerably more input than a vague desired guarantee.

**Automation and guarantee.** The agent generates natural-language function contracts from callers, code and domain knowledge, reasons about code blocks and loops, then generates and executes system-entry tests to confirm suspected bugs (§§3–6, pp.4–9). It checks running code through tests; the intermediate reasoning is not a machine-checked proof of safety or liveness. Scope: “only sequential functions, not concurrent functions” (§3, p.4). The authors explicitly say it “cannot ensure soundness” (§9.3, p.12). Compiler hangs/infinite loops are reported bug observations, not general liveness proofs. Optional SMT translation is described (§5.2, p.9), but the paper gives no count or independent soundness guarantee for its use.

**Numbers.** Sonnet 4.6 was used with at most ten test-generation attempts (§9.1, p.10). Table 1, p.10 gives 277k source lines and 8,549 functions across four systems; the CCC row is 143k lines and 4,957 functions. The prose on p.11 instead gives an upper function count of 4,910, an internal inconsistency. Table 2, p.11 totals “522” newly discovered bugs. The total cost is “2 days and 3.4 billion tokens in total” (§9.3, p.12), not two days per system. The CCC ablation found 57 bugs versus 339 for the complete method (§9.2, p.11), but simultaneously removed caller-driven specifications and Hoare-style reasoning, so it does not isolate either component.

| Case checked by Ding et al. | Outcome and code size |
|---|---|
| [Claude's C Compiler](https://github.com/anthropics/claudes-c-compiler/) | 339 reported new bugs, 143k source lines; examples include rejecting `nullptr`, incorrect generated code and compiler hangs (§§2.3, 9.2) |
| [VibeTensor](https://github.com/NVlabs/vibetensor/) | 141 bugs, 108k lines; wrong tensor values/shapes/types, error handling and memory defects (§9.2) |
| [VibeOS](https://github.com/kaansenol5/VibeOS/tree/main) | 23 bugs, 15k kernel lines; examples include memory corruption, syscall errors and two infinite-loop bugs (§9.2) |
| [Bespoke OLAP](https://github.com/DataManagementLab/BespokeOLAP) | 19 bugs, 11k lines; wrong query results, crashes and invalid-input acceptance (§9.2) |

**Inference for the project.** Caller expectations are a promising input for contract discovery. The demonstrated endpoint is executable bug evidence, so a separate sound verifier would still be needed before presenting its reasoning as a proof.

## PAT-Agent: users supply descriptions and the outcomes they want checked

Xinyue Zuo, Yifan Zhang, Hongshu Wang, Yufan Cai, Zhe Hou, Jing Sun and Jin Song Dong, **PAT-Agent: Autoformalization for Model Checking**, ASE 2025; arXiv:2509.23675v1. [Paper](https://arxiv.org/abs/2509.23675), [publisher](https://doi.org/10.1109/ASE63991.2025.00176), [code/data/interface](https://github.com/ZuoXinyue/PAT-Agent).

**Human input.** A natural-language system description, properties, and the “expected verification outcomes (VALID or INVALID)” (§II.C, p.2). These are separate inputs: a forbidden state is specified by asking reachability to return INVALID. The interactive interface lets users revise extracted variables/actions, formulate requirements with menus, inspect results and trigger repair (§III.E, pp.4–5). The authors also supply syntax guidance, semantic prompt templates and curated plan/code examples (§III.B, p.4).

**Automation and guarantee.** A planning model extracts variables, constants and guarded actions; a generation model emits CSP#; PAT checks deadlock freedom, reachability and LTL; counterexample-guided localized edits run for at most five iterations (§III.D, p.4). The automatic experiment uses o3-mini for planning and Claude 3.7 Sonnet for generation (§IV.A, p.6). These are finite system models, not proofs about deployed C#/other application code. Safety, liveness and deadlock checks are supported (§III, p.3), but the paper does not demonstrate parameterized/unbounded distributed liveness or implementation refinement.

**Numbers.** Forty tasks comprise 26 PAT, six textbook concurrent-systems and eight Alloy4Fun adaptations, with 133 assertions (Table II, p.7). The authors report “100% full-pass rate” after repair (§IV.C, p.7); the same pipeline starts at 75%, reaches 77.5% after one repair, 87.5% after two, and 100% after five (Table VI, p.8). Direct models achieve 37.5–52.5% full-pass (Table III, p.7). Average automated wall time is “4.34 minutes per system” (§IV.E, p.9), computed over eventually verified systems. The 20-person user study compares ten interface users with ten ChatGPT/PAT users; it is separate from the automated 40-task result (§V, pp.9–10).

| Concrete PAT model | Checked requirement and outcome |
|---|---|
| Four-process car (driver/key/door/engine), Zuo et al. | Deadlock freedom; cannot lock the key inside while driver is outside; cannot drive without a driver. First model fails the third; counterexample leads to a guard repair (Table I, p.7; §III.F, pp.5–6). No implementation refinement |
| File lifecycle; buyer/merchant; missionaries/cannibals; car | User-study models scored against reference assertion outcomes; no program execution correspondence claim (§V, pp.9–10) |

**Limitation.** §VI, p.11 says a separate repair pipeline brought negligible improvement and was left for future work, conflicting with the paper's repair-loop results and conclusion. Preserve this inconsistency when interpreting the 100% claim. **Inference:** the interface's explicit expected outcomes are a useful way to clarify a vague guarantee before proof search.

## RFC2TLA+: extract both a model and invariants from a supplied RFC

Guozhen Ding, Kexin Li, Ilya Grishchenko and David Lie, **RFC2TLA+: Extracting and Verifying Formal Models from RFC Documents using Continuous LLM Feedback**, ASE 2026, DOI 10.1145/3832783.3837453. [Author PDF](https://security.csl.toronto.edu/wp-content/uploads/2026/08/gding-ase2026-rfc2tla.pdf), [publisher](https://doi.org/10.1145/3832783.3837453), [artifact DOI cited by paper](https://doi.org/10.5281/zenodo.21788017). The cited artifact record was restricted at retrieval; the later [record](https://doi.org/10.5281/zenodo.23062666) exists, but no source repository was located.

**Human input.** “Given an RFC as input” (§3, p.3), the agent extracts states, transitions and protocol-specific invariants. Humans supply the tool interfaces, prompts and deterministic CFSM-to-TLA+ template; benchmark reference machines and injected faults are experiment inputs (§§3–4). No user-provided formal invariant is required in this experiment.

**Automation and guarantee.** Twenty-two tools constrain edits to communicating finite-state machines; immediate checks reject inconsistent declarations/expressions, and TLC counterexamples guide up to three final refinements (§§3.2–3.3, pp.3–6). TLC checks bounded generated models for state invariants and deadlocks. This does not prove running protocol code correct, and deadlock detection is weaker than proving eventual progress under fairness. The configuration explicitly supplies state-space bounds (§3.3, p.5).

**Numbers.** Fourteen real RFCs, 47k–746k characters; all have a TLC-accepted model in best-of-three runs. Correct-document models pass in “36 out of 42 runs”; fault detection finds “69 out of 84” injected faults, comprising 33/42 deadlocks and 36/42 invariant violations (Table 3, p.8; §4.2, p.7). Synthetic RFCs yield “16 out of 18” detected faults (Table 4, p.7). Generated models average 710 TLA+ lines, ranging 262–1,944 (§4.2, p.7). Average state F1 is 0.97 and transition F1 0.61, versus 0.49/0.21 for RFC2PSM (§4.1, p.6); reference incompleteness limits that comparison. Correct SMTP consumes about 55.3M tokens (Table 7, p.10); no end-to-end wall time or manual effort is reported.

| Case modeled by Ding et al. | What TLC checked |
|---|---|
| POP3 | Authentication before entering the transaction state; deliberately added bypass can violate the extracted invariant (§3.2.4, p.5; §4.2.1, p.7) |
| SMTP | Initially inferred simultaneous client/server termination is too strong for asynchronous messages; agent removes unsupported invariant while preserving permitted transitions. Final check explores “801 states (194 distinct)” (§4.6, p.10); 864 TLA+ lines, 12 states and 101 transitions |
| BGP, DCCP, DHCP, FTP, IMAP, MQTT, NNTP, PPP, PPTP, RTSP, SIP, TCP, POP3, SMTP | Separate deadlock and invariant-bypass variants, three runs each (Table 3, p.8). These are document/model faults, not real-code vulnerabilities |

**Inference for evaluation.** This paper gives a practical test against an agent silently fixing the input from memory: alter the input document and require the resulting model to preserve and expose its fault. Because the agent may change invariants, a successful final TLC run alone cannot establish fidelity to the original requirement.

## SpecMAS: model and property repair must be distinguished

Rishabh Agrawal, Kaushik Tushar Ranade, Aja Khanal, Kalyan S. Basu and Apurva Narayan, **SpecMAS: A Multi-Agent System for Self-Verifying System Generation via Formal Model Checking**, **NeurIPS 2025**, not 2026. [Paper](https://proceedings.neurips.cc/paper_files/paper/2025/hash/61816fb8f7dd9677d23d00196ccbf126-Abstract-Conference.html), [PDF](https://proceedings.neurips.cc/paper_files/paper/2025/file/61816fb8f7dd9677d23d00196ccbf126-Paper-Conference.pdf), [code named in paper](https://github.com/Idsl-group/SpecMAS).

**Human input.** A “Standard Operating Procedure (SOP)” (Abstract, p.1), plus a formal-methods knowledge base. In the experiment, SOPs are generated automatically from existing expert NuSMV examples, not gathered as vague user requests (§4, p.6). Ten example models form MiniSpecBench; five receive detailed numerical reporting (Table 2, pp.6–7).

**Automation and guarantee.** Agents extract states/transitions and explicit/implicit CTL/LTL properties, write NuSMV models, then revise “both the state-transition model and the property set” until checking passes (§3.1, p.5). CTL/LTL can express safety and liveness of these finite models. The executable artifact is a model-checker program, not a deployed controller/protocol implementation; no refinement from model to production code is shown. Backbone: quantized Qwen3-32B (§4, p.6).

**Numbers and evidence.** Table 2, p.6 reports final compliance for SpecMAS: BRP 0.76±0.08, autopilot 0.76±0.01, mutual exclusion 0.77±0.08, robot 0.69±0.07 and cache coherence 0.70±0.05. These are weighted **LLM-judge scores**, combining code compliance (40%) and execution compliance (60%), averaged over two judge runs (§§4–5, pp.6–7); they are not fractions of independently proved requirements. For BRP, the exact score fragment is “0.76 ± 0.08” (Table 2, p.6). Table 3, p.8 implies six debugger iterations for BRP, five for autopilot/robot/cache and six for mutual exclusion. Baseline counts measure human syntax edits, while SpecMAS counts agent syntax-and-counterexample iterations (§5.1, p.8), so the effort comparison has different definitions. No proof/code size or end-to-end timing is reported.

| Generated NuSMV case, Agrawal et al. | Check and evidence limit |
|---|---|
| Two-process mutual exclusion | Finite temporal properties; synthesis invents a turn-alternation requirement absent from SOP, then debugger corrects property/model issues (§5.2, p.9) |
| BRP message protocol | Temporal model-checking and LLM-judged SOP fidelity; final compliance 0.76±0.08 (Table 2, p.6) |
| Shuttle autopilot; robot controller; GigaMax cache coherence | CTL/LTL models derived from expert example files; paper does not provide per-case theorem statements or running-code evidence (Table 2, pp.6–7) |

**Inference.** Model checking establishes the final model satisfies the final properties. Because properties can change, the abstract's correctness-by-construction wording does not establish that the human's original intent was preserved. Independent original-property coverage and implementation conformance are needed.

## JS-SAM: a controlled case study separating specification shape from language

Jean-Jacques Dubray, **Executable JavaScript as a Checkable Specification Language: A JS-SAM Case Study on SysMoBench**, arXiv:2607.13092v1, 2026. [Paper](https://arxiv.org/abs/2607.13092), [study artifacts](https://github.com/jdubray/SysMoBench-1/tree/js-sam-tla-phase3), [upstream benchmark](https://github.com/specula-org/SysMoBench).

**Human input.** System source plus a fixed observable-state/action contract, expert invariants, manually designed trace-capture scenarios and prompts (§§2–4, pp.4–7). Some controlled arms additionally state the exact single-step semantics; other arms require models to derive them from code (§8.1, pp.13–15). The author creates instrumentation and trace folds, a hand-written Raft reference model, and held-out audit cases. That is substantial evaluation design, not an autonomous vague-request-to-proof result.

**Automation and guarantee.** LLMs write JavaScript specifications; a bounded explorer checks safety predicates and a direct replay compares each observed transition. One repair round uses failed windows and invariant counterexamples. This checks models and their agreement with finite traces captured from running systems; it does not prove the implementation implements the model on all executions. The explicit scope is “no liveness or temporal-logic properties” (§1, p.3). Bounded progress checks are finite-depth reachability, not eventual-progress proofs (§10.2, p.23).

**Numbers.** Four models, five generations per cell in the controlled experiment (§8). Spin traces: 28 windows, only eight of eighteen distinct observable input combinations covered (§12, p.26). All original JS-SAM models pass syntax/exploration/invariants despite state-changing conformance ranging 0–86.4% (§5.2, pp.7–8). Minimal JavaScript transition functions and TLA+ tie on scoreable windows when shape and prompt are controlled (§8, pp.15–18); TLA+ guarded actions can be penalized by this oracle's total-action requirement. The small-task minimal-contract result is “40/40” complete passes across spin and lock-service models (§8.4, p.19). At Raft scale the initial result is “0/20” complete passes and one repair round reaches “6/20” (Tables 8–9, pp.20–21). A separate 4/4 versus 1/4 JavaScript/TLA+ evaluability result disappears with a one-line guardrail and includes a harness fault (§§7–8), so it is not evidence of inherent language superiority.

| Case, Dubray | Scope and trace corpus |
|---|---|
| Asterinas spinlock | Bounded mutual exclusion/ownership consistency; replay acquisition and release; 28 windows, two deterministic scenarios. Never releasing can preserve safety, and the three safety invariants miss that defect (§§4–7) |
| PGo distributed lock service | 60 windows, five schedules of three one-shot clients; 20 minimal-contract generations pass all phases. Arrival-order/set projection and a causal event-order repair are human harness choices (§8.4, pp.18–19) |
| etcd Raft | 97 windows from five deterministic three-node scenarios; depth-eight safety exploration, no crashes/real partitions. Initial all-pass 0/20, repaired 6/20; errors include projected vote rules and commit-index bounds (§9, pp.19–22) |

**Inference for evaluation.** Count distinct reachable states, separate no-op baseline accuracy from meaningful transitions, freeze what actions mean, and recheck the entire corpus after repair. Otherwise an idle model or a repair that fixes one trace while breaking others can look successful. The paper's named models and results are author reports; this review did not independently reproduce them.

## Located but full text unavailable

**LLM-assisted Verification of Protocol Implementations for Logic Flaws Using TLA+**, Kai Tian, Xi Chen, Fushan Wei, Chunxiang Gu, Maosong Chen and Jiaxing Guo, CSCWD 2026, [DOI](https://doi.org/10.1109/CSCWD68734.2026.11582755): relevant and found; no open PDF found through publisher, OpenAlex or Semantic Scholar, so human inputs, proof scope and quantitative methodology remain unverified beyond its abstract.

The [indexed abstract](https://api.semanticscholar.org/graph/v1/paper/DOI:10.1109/CSCWD68734.2026.11582755?fields=title,authors,openAccessPdf,abstract) describes code → Protocol Intermediate Language → TLA+ → TLC with feedback. It reports “identified three logic flaws” and “confirmed by the vendor” (abstract), including WolfSSL 5.8.2 accepting CertificateVerify before ClientKeyExchange. This is an abstract's claim about a modeled code flaw; without full text, do not infer unbounded proof, liveness, autonomous human effort or independent reproduction. No source repository located.

## Direct related work missing from the first pass

The following titles and tool names were checked against all nine first-pass write-ups. These are direct references in the six papers above, selected for specification inputs, checking scope and evaluation. AutoSpec is handled in the program-verification slice.

### PSMBench / RFC2PSM: extraction accuracy, with human ground truth

**PSMBench: A Benchmark and Dataset for Evaluating LLMs Extraction of Protocol State Machines from RFC Specifications**, Zilin Shen, Xinyu Luo, Imtiaz Karim and Elisa Bertino, NeurIPS 2025 Datasets and Benchmarks, [paper](https://proceedings.neurips.cc/paper_files/paper/2025/file/521bd9583b3a39e92f662ee57e81e5ce-Paper-Datasets_and_Benchmarks_Track.pdf), [dataset and code](https://github.com/Zilinlin/RFC_PSM_Benchmark). Cited by RFC2TLA+.

**Human input.** RFC prose, a state-machine extraction prompt, and manually annotated reference states/transitions. One author annotated each protocol; another reviewed it. The reported effort is “averages about three days per protocol” (§3.2, p.4). The dataset contains 14 protocols, 1,580 RFC pages, 108 states and 297 transitions (Appendix dataset Table 1, p.19). The same table includes TCP: 11 states/20 transitions; SMTP: 7/22; NNTP: 10/16.

**Automation and check.** Nine LLMs extract JSON state machines from document chunks, which are merged and compared with human annotations. Semantic matching uses SentenceBERT and a chosen similarity threshold of 0.50. This checks extracted-model agreement with an annotation, without proving protocol safety or liveness or checking deployed code (§§4–5, pp.5–10). DeepSeek-V3 has the best reported main-experiment state F1, “0.715” (§5.2.1, p.8); exact transition F1 reaches “0.378” (§5.2.2, p.9). Appendix A changes chunking/matching settings and reports other scores; these should not be merged with the main protocol averages.

**Inference.** This is a useful extraction benchmark, but human annotations themselves need auditing. RFC2TLA+ explicitly finds missing behaviors in this reference set; high similarity to its graph is not equivalent to faithful RFC semantics.

### OSVBench: executable specifications with a fixed external oracle

**OSVBench: Benchmarking LLMs on Specification Generation Tasks for Operating System Verification**, Shangyu Li, Juyong Jiang, Tiancheng Zhao and Jiasi Shen, AAAI 2026; expanded arXiv v2 dated December 2025, [paper](https://arxiv.org/abs/2504.20964), [PDF](https://arxiv.org/pdf/2504.20964), [code](https://github.com/lishangyu-hkust/OSVBench). Cited by FM-Agent.

**Human input.** A detailed functional description, possibly faulty C syscall implementation, system assumptions, a predefined Python/Z3 abstract kernel model, and examples. The generated object is a Python function mapping old kernel state to the intended new state. Human-written declaration specifications remain fixed, so the LLM cannot alter both sides of the comparison (§3, pp.3–4; Appendix D, pp.15–16). This is substantially richer than a vague desired guarantee.

**Check and automation.** The inherited kernel verifier checks generated state transitions against implementation behavior and fixed specifications using Z3. Benchmark success requires detecting the same erroneous code variants as the reference specification. This measures functional/safety specification adequacy for syscall code under the supplied kernel abstractions; liveness is not evaluated. Generation and feedback repair are automatic, whereas model interfaces, description and reference oracle are supplied (§§3–4).

The benchmark has “245 tasks” from “49 system calls” (abstract, p.1): each call has five variants, including one correct version and four variants with injected vulnerabilities (§3.2, pp.3–4). Twelve LLMs are tested; best pass-at-one is “55.10%” (Doubao-1.5-pro, Table 1, p.5). Five tested zero-shot models score zero (§4.3, pp.6–7). Typical five-example prompts use 20,000–30,000 tokens (Appendix E, p.17).

| Concrete problem | Check and failure |
|---|---|
| sys_map_proc | Correctly reject writable mapping permissions; a generated condition reverses the bit test (Appendix C, pp.14–15) |
| sys_map_pcipage | Represent PCI-page ownership through the supplied abstract model; copying a concrete-code field into the abstract specification produces an invalid field access (Appendix C, p.14) |
| sys_close | Release descriptor references and file resources; complete human prompt and expected Python specification appear in Appendix D, pp.15–16 |

**Inference.** Keep the oracle fixed and score a specification against correct and deliberately faulty code, rather than accepting a specification merely because some verification succeeded.

### SysSpec / SpecFS: sharp human specifications, empirical code checking

**Sharpen the Spec, Cut the Code: A Case for Generative File System with SysSpec**, Qingyuan Liu, Mo Zou, Hengbin Zhang, Dong Du, Yubin Xia and Haibo Chen, FAST 2026, [paper and artifact](https://www.usenix.org/conference/fast26/presentation/liu-qingyuan), [PDF](https://www.usenix.org/system/files/fast26-liu-qingyuan.pdf), [project](https://llmnativeos.github.io/specfs/). Cited by FM-Agent. Printed page numbers below are one less than PDF page numbers after the USENIX cover.

**Human input.** Structured natural-language specifications explicitly give preconditions, postconditions, invariants, module dependencies, locking and algorithms. Authors reuse ideas from AtomFS's formal design. They divide the design into 45 modules, each targeting at most 500 code lines, and supply interfaces and regression tests (§§3–5, printed pp.293–300). Agents generate C code, review it against module specifications, and iterate with execution feedback.

**What checked.** This system uses LLM review and tests of running generated code. Its verification stage uses an LLM, “replacing the traditional formal theorem prover” (§4.1, printed p.296). Formal-verifier integration is future work (§6.6, printed p.303). Thus its correctness evidence is functional testing and inspection, not a machine-checked refinement proof or liveness theorem. SpecFS is an in-memory FUSE filesystem; crash consistency is outside the evaluated design (§§5,6.6).

SpecFS has about 4,300 C lines and 45 modules (§5). Of “754” xfstests, “64” fail because features are unsupported (§5.2, printed p.300). Gemini-2.5-Pro and DeepSeek-V3.1 reach 100% module accuracy under tests plus manual inspection, compared with 81.8% for the best baseline (§6.1, printed p.301). Four students implement extent support and directory rename: manual versus SysSpec average times are 4.5 versus 1.5 hours and 13 versus 2.4 hours respectively (Table 4, printed p.302). These are specific task timings, not total system specification effort.

**Inference.** The specification structure and controlled human-effort study are useful. The paper cannot support a claim that an agent proved generated filesystem code correct.

### Declarative-specification repair: repair the supplied model, check against supplied assertions

**An Empirical Evaluation of Pre-trained Large Language Models for Repairing Declarative Formal Specifications**, Mohannad Alhanahnah, Md Rashedul Hasan, Lisong Xu and Hamid Bagheri, Empirical Software Engineering 2025, [DOI](https://doi.org/10.1007/s10664-025-10687-1), [full PDF](https://arxiv.org/pdf/2404.11050). Cited by JS-SAM. No study source repository located in the full text.

**Human input.** Faulty handwritten Alloy models with assertions and commands; benchmark maintainers supply correct versions as reference. Repair comments are removed so the LLM does not receive bug locations or fixes (§4.2, pp.13–14). The repair agent edits the specification and invokes Alloy; a second agent can turn Alloy reports into repair guidance (§3, pp.7–12). Acceptance asks for satisfiable models and assertions with no counterexamples, within Alloy's search scopes. The experiments use “exclusively on static Alloy models” (§4.5, p.16); they test consistency and static safety constraints, not Alloy 6 temporal/liveness behavior or running implementations.

Four OpenAI models, three feedback settings and at most six iterations are evaluated. ARepair has 38 faulty models; Alloy4Fun has 1,936 unique models, with GPT-4o evaluated on a 357-model subset (§4, pp.13–17; Tables 5–6, pp.18–19). GPT-4o and GPT-4-Turbo with a second agent repair “28” of 38 ARepair models (Table 5). GPT-4o repairs “201” of 357 sampled Alloy4Fun models (Table 6). Table 6's generic-feedback summary has an internal percentage inconsistency: 206/357 is approximately 57.7%, although the printed percentage is 55.7%. These totals should not be silently normalized.

| Concrete model | Constraint and repair |
|---|---|
| University grading policy | A teaching assistant must not grade their own assignment; add an explicit exclusion to the grading predicate (Listing 1, pp.5–6). Both GPT-4-Turbo and GPT-4o dual-agent settings repair this case (Table 5) |
| Farmer puzzle | Multi-line faulty Alloy model repaired by all LLM settings; none of the four traditional comparison tools succeeds (Table 5, p.18) |

**Inference.** Give agents a repairable model but hold acceptance assertions and reference behavior stable. Satisfiability checks prevent one common empty-model shortcut, though they do not establish that every intended behavior is retained.

### RFCNLP: learned extraction followed by model-level attack synthesis

**Automated Attack Synthesis by Extracting Finite State Machines from Protocol Specification Documents**, Maria Leonor Pacheco, Max von Hippel, Ben Weintraub, Dan Goldwasser and Cristina Nita-Rotaru, IEEE S&P 2022, [paper](https://arxiv.org/abs/2202.09470), [PDF](https://arxiv.org/pdf/2202.09470), [code](https://github.com/RFCNLP). Cited by RFC2TLA+.

**Human input.** RFCs, a human-designed annotation grammar and labeled RFC portions for supervised learning; experts also write canonical protocol models and four LTL properties each for TCP and DCCP. Properties include absence of half-open connections, eventual connection establishment and avoiding stuck behavior (§§III,VII, pp.4,8–9). Canonical models add domain knowledge missing from prose; DCCP's canonical model is handwritten by the authors. The model extractor is automatic at inference time, but property selection remains human.

**Automatic check.** BERT/CRF extraction produces partial state machines, which rule-based code translates into Promela. KORG/SPIN synthesizes finite message attacks against supplied safety and liveness properties, then tests candidate attacks against the canonical **model**, not deployed network code (§§VI–VIII, pp.7–12). Extraction evaluates six protocols. For TCP, extraction recovers “17” of 20 transitions correctly or partly correctly (Table III, p.10). Automated TCP models find attacks against only one property, while the canonical model finds attacks against all four (Table V, p.11). Liveness can pass vacuously because required antecedent states are unreachable; the authors explicitly discuss “only vacuously” (§VIII-B, pp.11–12).

| Concrete problem | Model evidence |
|---|---|
| TCP connection establishment/teardown | Inject an ACK to induce a half-open connection; automatically synthesized attacks are confirmed against a canonical Promela model (§VIII-B, p.11) |
| DCCP connection routines | Inject/drop messages to guide both peers into CLOSE_REQ; other synthesized liveness candidates fail canonical-model confirmation (§VIII-B, pp.11–12) |

**Inference.** Missing transitions can make progress obligations look easier and suppress real attacks. Evaluate coverage and nonvacuity alongside syntax, property satisfaction and extracted-graph similarity.

### SCTP formal analysis: humans supply the model, properties and attacker capabilities

**A Formal Analysis of SCTP: Attack Synthesis and Patch Verification**, Jacob Ginesin, Max von Hippel, Evan Defloor, Cristina Nita-Rotaru and Michael Tüxen, USENIX Security 2024, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/ginesin), [PDF](https://www.usenix.org/system/files/usenixsecurity24-ginesin.pdf), [models and scripts](https://github.com/sctpfm). Cited by RFC2TLA+.

**Human input.** Authors hand-build an SCTP Promela model from RFCs, consult the lead RFC author, choose ten LTL properties, and define Off-Path, Evil-Server, Replay and On-Path attackers. These are expert formal inputs, not LLM output. The model has two peers and a size-one FIFO buffer in each direction; it abstracts verification tags and excludes crashes, restarts, congestion control and most data transfer (§3, printed pp.3104–3107).

**What proved and automatic.** SPIN verifies all ten properties without an attacker, including safety and unbounded-time liveness of this finite model. KORG automatically searches for finite attacks, and rechecks the model with the RFC 9260 patch. It establishes elimination of the modeled CVE-2021-3772 Off-Path attack and preservation of the chosen properties under the four attacker models. The source explicitly qualifies attacks as “real (against the model)” (§1, printed p.3100). Human code inspection and Packetdrill execution separately check Linux and FreeBSD's interpretation of two ambiguous RFC passages (§5.4, printed p.3111); this is not an exhaustive code-refinement theorem.

| Concrete problem | Guarantee / result |
|---|---|
| SCTP no half-open connections | A temporary half-open state eventually ends, rather than prohibiting all transient mismatch (§3.5, printed p.3107) |
| SCTP orderly shutdown | Once termination begins, both peers eventually become Closed (§3.5, printed p.3107) |
| CVE-2021-3772 and RFC 9260 patch | One spoofed invalid INIT can terminate the unpatched connection; exhaustive modeled search finds no Off-Path attack after the patch (§5.3, printed p.3111) |
| Ambiguous verification-tag handling | Two human-found ambiguities yield synthesized attacks under incorrect interpretations; neither tested Linux nor FreeBSD implementation makes these mistakes (§5.4) |

Most analyses finish in seconds/minutes; the long Off-Path checks take “123:42” and “86:10” minutes:seconds without the patch, versus 7:07 and 6:48 with it, on a 16GB M1 MacBook Air (Appendix Table 3, printed p.3116). KORG changes comprise 80 existing lines and 213 new lines plus 102 shell-script lines (§4.3, printed p.3109); total model size and human modeling time are not stated.

**Inference.** This is a concrete target for agents: reconstruct the expert property formulation, preserve explicit attacker assumptions, and prove patch behavior within a declared model. Translating the model's result into deployed-code assurance remains separate work.

### Further direct-reference access gaps

- **NL2CTL: Automatic Generation of Formal Requirements Specifications via Large Language Models**, Mengyan Zhao et al., ICFEM 2024, [DOI](https://doi.org/10.1007/978-981-96-0617-7_1): title located; Semantic Scholar reports no open PDF, so no full-text conclusions here
- **PROSPER: Extracting Protocol Specifications Using Large Language Models**, Prakhar Sharma and Vinod Yegneswaran, HotNets 2023, [DOI](https://doi.org/10.1145/3626111.3628205): title and author bibliography located; indexed ACM open PDF returns HTTP 403, and author-page PDF search did not locate a usable copy
- **Mealy Verifier: An Automated, Exhaustive, and Explainable Methodology for Analyzing State Machines in Protocol Implementations**, Arthur Tran Van, Olivier Levillain and Hervé Debar, ARES 2024, [DOI](https://doi.org/10.1145/3664476.3664506): title located; indexed open publisher PDF returns HTTP 403 and HAL search did not yield a downloadable paper

The exact web-search tool failed with HTTP 404. Discovery used Crossref, Semantic Scholar DOI records, publisher proceedings, author publication lists, arXiv PDF endpoints and GitHub. Open PDFs were validated by their `%PDF` prefix and extracted with `pdftotext`. Main paper text and relevant appendices were read; appendix-only repetitive per-protocol score tables were inspected for evidence used above. Results are reported as the authors' experiments, without rerunning artifacts. The inaccessible Tian paper and the three direct-reference access gaps above remain explicit limits of this slice.

All three exact titles are absent from `01`–`09` write-ups. Searches for `MoSt` only found ordinary uses of the word *most*, not the modeling tool. These references come directly from SpecMAS or RFC2TLA+; their reference lists were not recursively expanded.

## MoSt: humans structure requirements before automatic model checking

**Modeling and Verification of Natural Language Requirements based on States and Modes**, Yinling Liu and Jean-Michel Bruel, Formal Aspects of Computing 36(2), 2024, [DOI](https://doi.org/10.1145/3640822), [open author manuscript](https://hal.univ-lorraine.fr/hal-04446384/document), [tool](https://github.com/liuyinling/MoSt-Modeling-Tool). Cited by SpecMAS. The full 49-page manuscript was downloaded; the main text is pp.1–35 and complete case models and grammar follow.

**Human input.** Engineers manually identify states, modes, variable bounds, signals and transitions, then express them in the tool's controlled language. They also declare desired CTL/LTL properties. The paper assumes “states and modes have already been underlined” (§1, p.3). Extraction from unconstrained prose is future work (§7, p.35). Free-text requirement records can be stored but are not translated into the model (§4, p.15). This requires explicit formal structure even though the syntax resembles English.

**Automatic work and scope.** An Eclipse/Xtext editor checks naming and consistency; a deterministic generator translates requirements to NuSMV; the runner reports model-checking results back at requirement IDs. It automatically creates an existential reachability check for each named state. Humans inspect counterexamples and decide whether to change the model or requirements (§5, pp.18–24). NuSMV checks safety and liveness on generated finite models, including eventual state changes after mode switches. There is no proof about vehicle or appliance running code.

| Concrete problem | Checked result and scale |
|---|---|
| Car with autonomous driving | Five states, two modes, 37 requirements and 88 generated NuSMV lines. Removing an accelerate→autonomy transition makes autonomy unreachable; switching an autonomous car to economic mode can leave it autonomous forever, refuting an eventual-exit requirement (§6.1, pp.25–29) |
| Samsung-inspired washing machine | Fifteen states, five modes, 64 requirements and 213 generated NuSMV lines. Removing draining→spinning makes high-speed spinning unreachable. A counterexample reaches high-temperature prewashing in 101 steps (§6.2, pp.30–32) |

For each example authors inject “14 errors” (abstract, p.1) and report detecting all; this is a demonstration on two authored examples rather than a large evaluation corpus. Table 12 (p.34) reports car translation/static/dynamic-check times 0.003/0.042/0.032 seconds; washing-machine times 0.005/13.371/13.467 seconds, with no human specification-time measurement. Exact table anchors: “37” and “64” requirements, “88” and “213” generated lines (Table 12). No state count of explored reachable model configurations is reported.

**Inference.** The requirement-ID mapping and automatic reachability checks are useful components for an agent pipeline. An agent would still need to do the human identification and property-choice work this tool assumes.

## A Messy State of the Union: manual specification and annotations, automated C verification

**A Messy State of the Union: Taming the Composite State Machines of TLS**, Benjamin Beurdouche, Karthikeyan Bhargavan, Antoine Delignat-Lavaud, Cédric Fournet, Markulf Kohlweiss, Alfredo Pironti, Pierre-Yves Strub and Jean Karim Zinzindohoue. RFC2TLA+ cites the Communications of the ACM 2017 version, [DOI](https://doi.org/10.1145/3023357). The openly retrievable full text here is the original **IEEE S&P 2015** paper, [HAL record](https://inria.hal.science/hal-01114250v1), [PDF](https://inria.hal.science/hal-01114250/document), [project and attack/verification artifacts](https://smacktls.com). The two versions are not assumed textually identical. PDF pages below include HAL's cover; paper p.1 is PDF p.2.

**Human input.** Researchers read TLS standards, manually construct allowed composite message sequences, write a replacement C state-machine implementation, encode the invariant in ACSL, and add intermediate lemmas. They also design valid/deviant trace generation rules and manually inspect implementation source after automated tests flag traces (§§II–VI). No LLM is involved.

**What proved.** Frama-C with Alt-Ergo and Z3 proves that the replacement state-machine code preserves the allowed-trace invariant or rejects the message, with pointer-validity/separation preconditions. It also proves memory safety for this C component. A Coq proof shows equal valid handshake logs imply equal states. These are code-level safety/refinement and specification-consistency proofs. The authors plainly say “did not, however, prove any integrity or confidentiality properties” (§VII, PDF p.16). Liveness is not established. Existing OpenSSL message-handler correctness and full cryptographic connection security remain additional obligations.

**Numbers.** The replacement contains about “750” C lines, including 250 message-processing lines; the separate invariant specification has about “460” lines and code annotations about “900” lines (§VI, PDF p.16). Verification takes about two minutes per function and 30 minutes total; human specification/annotation effort is not timed. Automated testing and manual investigation cover eight TLS libraries, find serious state-machine flaws in six, and produce ten attacks including eight impersonation attacks (§V-E, PDF p.13). These attack totals describe tested implementations, not the verified replacement component.

| Concrete problem | Result |
|---|---|
| TLS handshake modes composed in OpenSSL | Replacement monitor rejects illegal mixed-ciphersuite message sequences and preserves the manually written allowed-trace invariant (§VI, PDF pp.14–16) |
| Skip-message impersonation / FREAK downgrade | FlexTLS tests running libraries with automatically generated deviant traces; humans turn flagged traces into exploits. FREAK accepts a weak export RSA key despite stronger negotiation (§§III,V, PDF pp.6–7,11–13) |
| Ambiguous handshake logs | Coq proves log equality implies state equality within the supplied validity specification (§VI, PDF p.16) |

**Inference.** This illustrates why a successful agent proof needs both an external allowed-behavior specification and code correspondence. A component-level proof can be strong without establishing whole-protocol security.

## Located, but no open full text found

**Extracting Formal Specifications From Documents Using LLMS for Test Automation**, Hui Li, Zhen Dong, Siao Wang, Hui Zhang, Liwei Shen, Xin Peng and Dongdong She, ICPC 2025, [DOI](https://doi.org/10.1109/ICPC66645.2025.00039): exact title located through Crossref and Semantic Scholar; indexed record reports no open PDF, and HAL title search returned no full text, so human-input scope and reported numbers remain unverified here.

Read the full PDFs for Specy, Agora, GGMS, Guiding, compositional inference, Autogram, FORCE, NetNomos, and CrossCheck. Reused existing Agora and Guiding PDFs; saved seven additional PDFs, checking `%PDF`. All bibliographies were checked against the first-pass write-ups. Quotations below deliberately total fewer than 25 words per paper; the surrounding account is paraphrase with page/section pointers. This is a research account, not a rerun of the artifacts.

## Specy: Learning Specifications for Distributed Systems from Event Traces

Mike He, Ankush Desai, Aishwarya Jagarapu, Doug Terry, Sharad Malik, Aarti Gupta. PACMPL 10, OOPSLA1, article 101, April 2026. [Author PDF](https://www.cs.princeton.edu/~dh7120/assets/papers/PInfer_OOPSLA.pdf), [publisher](https://doi.org/10.1145/3798209), [artifact](https://github.com/AD1024/PInfer-OOPSLA-Artifact), [benchmarks](https://github.com/AD1024/PInfer-Benchmarks/tree/oopsla-artifact).

Specy learns event-based formulas from traces, generates monitors, and checks additional traces to reject overstrong guesses. The human supplies a P model and tests, or event traces plus metadata describing event types and causality. Without a P model, users configure that metadata manually. Difficult properties need three kinds of help: select relevant combinations of events, define extra predicates, or add ghost state that exposes otherwise invisible protocol state. The last kind remains necessary for all evaluated state-based proof invariants (§§4–6, pp. 10–22).

Specy automatically scans P causality, enumerates formulas from its grammar, uses Daikon to learn payload relations, prunes with Z3, creates P monitors, and runs PChecker. Its learning theorem guarantees consistency with the supplied observations, described as “given input traces” (§4.4, p. 16). That does not prove behavior on every future execution. The grammar can express request/response eventuality, but the deductive experiments establish selected safety properties of P models. Runtime monitors check observed production events; they do not prove a refinement from production code to the P model.

The authors recover all 43 benchmark goal specifications, “28 (65%)” without intervention; the other “15” need guidance (§6.3, p. 21). Eleven public protocols and three industrial cases use 10,000 traces per benchmark, collected across 3–5 configurations. Some additional learned formulas fail on fresh traces, about 9%; none of the designated goal formulas do. Formula pruning improves runtime by a geometric mean of 14.8 (§§6.2–6.3, pp. 19–21). The implementation has about 7,000 C# and 1,400 Java lines (§6.1, p. 18). These are implementation sizes, not measured human work.

For six PVerifier experiments, the authors “manually translated” the formulas (§6.4, p. 21). Proving with every learned formula can be slower than using the necessary subset. Table 6 reports proof times in milliseconds: ring leader 1181/153, consensus 135/113, distributed lock 137/101, lock server 107/98, firewall 99/87, sharded KV 853/95, respectively all formulas/necessary formulas. No autonomous translation or universal liveness result is established.

Table 4, p. 20, supplies the case sizes below. The tool is Specy/PChecker; the authors above perform the work. These rows describe learned goal specifications, not fourteen complete implementation proofs. The artifact and benchmark links above cover the public models. Industrial code is not published.

| Problem and intended property | Model lines; learning seconds | Human additions |
|---|---:|---|
| Ring leader election: consistent leader selection | 47; 352 | none reported |
| Consensus: agreement | 61; 925 | none reported |
| Two-phase commit: consistent transaction decisions | 238; 3935 | none reported |
| Sharded KV: keys stay on an appropriate shard | 48; 481 | none reported |
| Paxos: consistency of accepted/chosen values | 164; 1155 | chosen event combinations |
| Distributed lock: mutual exclusion | 73; 902 | none reported |
| Vertical Paxos: consistent choices across configurations | 241; 2589 | chosen event combinations |
| Firewall: authorized traffic behavior | 80; 753 | none reported |
| Lock server: mutual exclusion | 102; 620 | none reported |
| Chain replication: consistent replication order | 452; 984 | selected events, 44 predicate lines, 12 ghost-state lines |
| Raft: election/log consistency, excluding reconfiguration | 1191; 4223 | 54 predicate lines, 6 ghost-state lines |
| Global clock: synchronized clock bounds | 177; 805 | none reported |
| Industrial database leader election: leadership consistency | 1178; 697 | selected event combinations |
| Industrial MVCC two-phase commit: valid transaction decisions | 1135; 2090 | 66 ghost-state lines |

The production leader-election study uses 114 traces from one hour, with 109 nodes in three data centers. It learns two leadership properties (§6.5, pp. 22–23). A later check of five learned rules across “11,045” events violates “1 out of 5” (p. 23). The authors diagnose an overstrong model assumption, not a new production defect: the real service permits broader interleavings. The MVCC study recovers three previously missing specification obligations: only a leader initiates commit, each shard prepares a transaction at most once, and participant status agrees with leader status (§6.6, p. 24). **Inference:** this is useful evidence for specification discovery, but trace coverage, exposed state, and independent human review must remain part of an evaluation.

## Agora: Toward Autonomous Bug Detection in Production-Level Consensus Protocols with LLM Agents

Xiang Liu, Sa Song, Zhaowei Zhang, Huiying Lan, Jason Zeng, Ming Wu, Michael Heinrich, Yong Sun, Ceyao Zhang. ICML 2026, PMLR 306; arXiv version 2605.29910. [Paper](https://arxiv.org/abs/2605.29910), [code](https://github.com/lebronlambert/Agora).

Agora generates adversarial scenarios and executable unit tests for existing consensus implementations. The human supplies the codebase, repository-specific testing knowledge, curated historical bug patterns, and constraints distinguishing crash faults from Byzantine behavior. The authors crawl “816” GitHub issues and select “34” protocol-logic issues (Appendix C, p. 13); their knowledge memory is about 360 KB (Appendix E, p. 16). It is not a system that begins with an unspecified vague request: §5, p. 8 acknowledges the remaining domain knowledge.

The automatic steps assign one agent to manage history and budgets, one to propose scenarios under the fault constraints, and one to generate, repair, execute, and interpret tests (§3, pp. 4–6). This checks running repository code in controlled tests. It does not prove safety for all executions or prove eventual progress. The abstract describes safety bugs, but appendix examples also include stalls, memory exhaustion, and proposed liveness failures. A finite timeout or local vote acceptance is evidence about that test, not a temporal proof or necessarily a full conflicting-commit execution.

Each experiment permits “three hours” and at most 50 test-reflection iterations (§4.1, pp. 6–7), with temperature 0.2. Across four LLMs, the authors report “15” distinct previously unknown logic bugs, versus zero for their ReAct baselines. Table 1, p. 5, separates distinct bugs from duplicates across models: GPT-5.2 finds 8, Gemini 3 Pro 11, Claude Sonnet 4.5 6, and Qwen3 Coder 9; their union is 15. The union contains Raft 1, EPaxos 9, HotStuff 4, BullShark 1. Among 46 reports, 34 are judged real, giving “26.1%” false positives (§4.2, p. 7). These judgments are the paper's validation; this review did not independently reproduce or obtain maintainer confirmation for all 15.

The Gemini ablation consumes 58.6 million tokens overall; average “5.32M tokens” and “approximately $40” per found bug (§4.3, pp. 7–8). Removing any component reduces discoveries to at most three. The authors' claim that comparable human discovery takes years has no measured human-time control; use the reproducible budget and report counts as the evaluation numbers.

| Repository/case | What the test checks | Size and evidence |
|---|---|---|
| [etcd-io/raft](https://github.com/etcd-io/raft) | crash-fault protocol logic; reported one distinct bug | Go; no model/proof size or human hours reported |
| [efficient/epaxos](https://github.com/efficient/epaxos): recovery dependency change | after a leader executes a fast-path command then crashes, recovery changes its dependencies and execution order | three-node controlled scenario, Appendix G.2.2, pp. 19–20; reported linearizability defect |
| EPaxos: execution-state amnesia | restart resets execution cursor and repeats non-idempotent operations | executable test described in Appendix H, p. 23; reported exactly-once failure |
| [relab/hotstuff](https://github.com/relab/hotstuff): cascading fork | a recovered node with an old lock accepts a later fork; local commit logic processes a chain | four nodes, one Byzantine fault, Appendix G.2.1, pp. 18–19; reported safety violation |
| HotStuff: QC view mismatch | certificate view and certified block view disagree | Appendix H, p. 25; reported progress disruption, not liveness proof |
| [MystenLabs/sui](https://github.com/MystenLabs/sui): missing-block growth | adversarial ancestors enlarge an unbounded bookkeeping structure | Rust BullShark code; Appendix H, pp. 25–26; reported memory exhaustion/stall |

**Inference:** the useful ingredient is explicitly representing the fault assumptions before test generation. The next evaluation step needs independent checks that constructed states are reachable and supported by each implementation's persistence contract. Several appendix attacks intentionally erase volatile state; whether that constitutes an implementation defect depends on the promised crash-recovery environment.

## Learning Provably Correct Distributed Protocols Without Human Knowledge

Yujie Hui, Xiaoyi Lu, Andrew Perrault, Yang Wang. arXiv preprint 2026. [Paper](https://arxiv.org/abs/2601.22369). Public code repository not identified in the full text.

GGMS learns finite transition tables for synchronous crash-fault protocols. Humans still provide initial states, permitted final decisions, explicit correctness formulas, and the synthesis setting: number of processes, rounds, crashes, and internal states (§2, pp. 3–4). The title's lack of human knowledge means it does not need a known protocol implementation as a starting solution. It does not mean it derives correctness from vague intent.

A transformer guides Monte Carlo tree search; freezing/backtracking and a curriculum improve the search. Exhaustive model checks supply pass/fail and search feedback (§§3–4, pp. 4–7). The learned protocol broadcasts the same message to peers each synchronous round, and decides in a designated final round. The failure model permits a crashed sender's final round to deliver to a subset. There is no Byzantine case. The guarantee is “for all executions within the bounded setting” (abstract, p. 1), with “Synchronous timing” (§2.3, p. 4). Agreement/validity are safety; making a decision by the final round is bounded termination. This is a finite model guarantee, not arbitrary asynchronous liveness or an implementation refinement proof. Generalizing to arbitrary process counts remains future work (p. 3).

Table 1, p. 7 reports ten runs per setting. The columns below give successes and mean minutes among successful runs; failed runs are excluded from the means. Atomic-commit and consensus properties are stated in Appendix A, pp. 12–13. All use rounds = crash bound + 1. Baseline success rates are included to make the comparisons concrete.

| Problem: processes/crashes | GGMS success; mean minutes | MCTS / DFS success |
|---|---:|---:|
| Atomic commit 2/1 | 100%; 15 | 50% / 60% |
| Atomic commit 3/2 | 60%; 813 | 0% / 40% |
| Atomic commit 4/1 | 100%; 413 | 10% / 20% |
| Atomic commit 4/2 | 70%; 754 | 0% / 0% |
| Consensus 2/1 | 100%; 8 | 90% / 90% |
| Consensus 3/2 | 100%; 118 | 80% / 80% |
| Consensus 4/1 | 100%; 268 | 80% / 70% |
| Consensus 4/2 | 90%; 717 | 30% / 40% |
| Consensus 4/3 | 100%; 3358 | 0% / 0% |

Exact table anchors include “60%”, “813”, “90%”, “3358” (Table 1). Timeouts are one day for two processes, two days for three, and four days for four (Appendix F, p. 20). The experiments have no measured human-time denominator. Authors claim a learned atomic-commit behavior is novel: require every first-round vote, then tolerate later losses; their novelty claim is qualified, not a theorem that no one has devised it (§4.3, p. 7). Appendix H tests strong LLMs separately with manual checking/feedback; GGMS itself is not an LLM agent.

**Inference:** this provides a clean experiment for discovering protocol behavior once humans have already formalized the task. Evaluate specification creation separately from protocol search.

## Guiding Likely Invariant Synthesis on Distributed Systems with Large Language Models

Yuan Xia, Aabha Shailesh Pingle, Deepayan Sur, Srivatsan Ravi, Mukund Raghothaman, Jyotirmoy V. Deshmukh. FMCAD 2025, pp. 226–234. [Open paper](https://doi.org/10.34727/2025/isbn.978-3-85448-084-6_29). Reused the existing collection PDF and copied it into a correctly named paper directory. No source repository link appears in the full text.

Humans provide a Promela program, prompt instructions, permitted expression syntax, and target safety properties for usefulness evaluation. PSyn asks GPT-3.5 for atomic predicates, then RunVS builds a decision-tree invariant from observed positive and speculative negative states. ISyn asks GPT-3.5 to write the complete candidate formula. Both run monitoring/revision loops, and can accept Spin counterexamples. An LLM also inserts instrumentation respecting atomic blocks (§§III–V, pp. 228–231). Prior RunVS requires chosen global variables and a predicate grammar; the LLM aims to remove this particular burden, not to choose the protocol's intended safety contract.

The key distinction is in the paper's definition: likely invariants hold for “all states observed up to a given point” (§II, p. 227). Observational survival is not a proof. The reported soundness column comes from Spin checking the Promela model; usefulness separately asks whether the formula entails the supplied safety condition (§VI, p. 231). Both must hold before treating the result as a model safety proof. Infinite-state cases and extremely low observed coverage make that distinction material. No running-code refinement or liveness proof is reported.

Table III, p. 232: PSyn is sound and sufficient for seven of eight cases; its producer-consumer formula implies safety but is unsound. ISyn is sound in eight of eight but sufficient only in seven, failing producer-consumer. RunVS is sound and sufficient in all eight. GPT-o3 direct prompting is sound in seven but sufficient in only three. Thus separate soundness and safety checkmarks cannot be added together as successful proofs. GPT-3.5 settings use five sampled counterexamples per iteration and 500 traces, temperature 1 (§VI, p. 231).

| Promela model and safety subject | Model lines | PSyn / ISyn: sound and sufficient? |
|---|---:|---|
| Peterson mutual exclusion | 20 | yes / yes |
| Bakery mutual exclusion | 24 | yes / yes |
| Producer-consumer coordination | 37 | no / no |
| Alternating-bit message delivery state | 42 | yes / yes |
| Leader election consistency | 127 | yes / yes |
| Train/gate collision avoidance | 78 | yes / yes |
| Distributed lock mutual exclusion | 100 | yes / yes |
| Ethereum transaction model safety | 962 | yes / yes |

These subjects follow the benchmark descriptions; the full formulas are not printed for every row. All rows are the Xia et al. PSyn/ISyn + Spin study, Tables III/V, pp. 232–233. No per-case human hours are given. The table's Ethereum size is a Promela model, not verified deployed EVM bytecode.

Table V, p. 233 reports observed/reachable-state ratios of 1 for Peterson/Bakery, 0.00044 producer-consumer, approximately zero alternating-bit, 0.0024 leader election, 0.000024 train/gate, 0.015 lock, approximately zero smart contract. Its sampling caption says “out of 500”; average revision counts reach “14” for PSyn producer-consumer, despite surviving “400” later sampled runs. These exact fragments anchor the observation/proof separation. **Inference:** evaluation should require both a checked invariant and entailment of the intended property, then report the model bounds; trace survival alone is easy to overread.

## Compositional Inductive Invariant Inference via Assume-Guarantee Reasoning

Ian Dardik, Eunsuk Kang. arXiv preprint 2025, 2509.06250. [Paper](https://arxiv.org/abs/2509.06250). No linked complete artifact was identified in the paper; it cites supplementary material. The MongoDB implementation is [public](https://github.com/mongodb/mongo), but the experiment proves an abstract TLA+ protocol rather than that code.

Humans split the protocol into components, formulate the connecting assumptions/contracts, and write final TLAPS proof scripts. The evaluation says they “manually decomposed all specifications” and “manually created all bridge formulas” (§6, p. 19). Endive automatically searches for each component's local invariant; unsuccessful searches are replaced by manually supplied invariants. The compositional rule then supports TLAPS safety proofs for arbitrary model instances (§§3–6, pp. 7–23). There is no liveness result or executable-code refinement.

| TLA+ problem and guarantee | Automation and size | Source |
|---|---|---|
| Two-phase commit: no disagreement between commit and abort | global Endive 34.82 seconds, 10 conjuncts, 107 proof steps; three component searches 15.44/30.43/6.13 seconds, invariants 5/8/5 conjuncts, proofs 8/86/8 steps | Table 1, p. 20 |
| Mongo Static Raft: same log index has a consistent committed entry | global search fails; 17-conjunct manually written invariant, 1686 proof steps. Committed component search 19.80 seconds, 2 conjuncts, 61 steps; Log and StateTerm searches fail and need manual invariants/proofs: 9/7 conjuncts, 123/188 steps | Table 2, p. 23 |

Both model delayed/dropped/reordered messages. Static Raft has a fixed cluster and crash-stop faults; log terms stand in for entry values. Exact table anchors: “34.82”, “30.43”, “1,686”, “61”, “123”, “188”. For two-phase commit the longest parallel local search is somewhat shorter than global search, while their sequential sum is longer. For Raft, only one of three local invariant searches succeeds automatically. The combined local proof-step count is 372, versus 1686 globally, but contract/decomposition effort remains human and unmeasured. **Inference:** proof decomposition helps proof size and can expose a solvable component; it does not demonstrate fully automatic specification or contract discovery.

## Invariant Discovery for Networked Systems

Hongyu Hè, Alexander Krentsel, Sylvia Ratnasamy, Maria Apostolaki. arXiv preprint 2026, 2607.22944. [Paper](https://arxiv.org/abs/2607.22944). No public implementation link found in the PDF.

Autogram learns approximate relationships between live network measurements. A human supplies telemetry and named metadata, optionally trusted seed relations. An LLM proposes bounded, typed expressions from metadata rather than judging the raw measurement values. Deterministic enumeration, logic checks, and statistical tests retain approximate relations (§§2–3, pp. 3–5). These are measurements that usually agree, not inductive invariants proving a protocol safe. Its claimed search properties have proof sketches; the authors defer “proofs to future work” (§3, p. 5).

The preliminary experiment compares recall against known network relations. On Abilene and GÉANT Autogram has full recall, versus NetNomos “19.8” and “15.1” percent; the richer grammar accounts for part of the advantage (Figure 3, p. 6). On GÉANT it emits “101” relations; NetNomos emits “1,645”, of which “946” are vacuous and “27” match reference relations. On a production WAN with roughly 100 routers and 1000 links it finds “41” relations in “ten minutes” (§4, pp. 5–6).

| Network measurement case | What was checked | Reported outcome |
|---|---|---|
| Abilene and GÉANT telemetry | reference network relationships recovered from data | full reference recall; sampled observation checks only |
| Production link/router conservation | measurements at link endpoints and across router ports roughly agree | link hold rate 96.5%; router/network rates 92.3–97.5%, Table 1, p. 6 |
| Production demand accounting | aggregate demand and boundary traffic agree | termination 73.2%, origination 68.6%; roughly 2% systematic deficit suggests a fault or accounting issue, Table 1, p. 6 |

No formal safety/liveness contract, program proof, or measured human effort is supplied. A few falsely accepted expressions are acknowledged without a numerical false-positive rate. **Inference:** use this as evidence for choosing candidate operational checks and finding specification gaps. It does not supply a correctness theorem about the network controller.

## I3DP: Neuro-Symbolic Inductive Invariant Inference for Distributed Protocols

Weining Cao, Guangyuan Wu, Yuan Yao, Hengfeng Wei, Taolue Chen, Xiaoxing Ma. SOSP 2026, pp. 620–635. [Publisher](https://doi.org/10.1145/3830418.3843876), [Crossref metadata](https://api.crossref.org/works/10.1145/3830418.3843876), [artifact](https://github.com/SoftWiser-group/I3DP). Exact paper located, but the open-licensed ACM PDF endpoint returned 403 and no independently accessible full text was found; do not treat this entry as a full-paper read.

The artifact fills a first-pass gap: its README identifies “safety verification of TLA+ specifications” and provides “TLAPS unbounded proofs (Section 5.3)” plus replay logs and “29/29 passed” (README, overview/replay/reproduction map). Humans supply a TLA+ model, a safety goal, predicates, type constraints, and finite model constants; the explicit configuration keys are documented. TLC batch-screens candidates and Apalache supplies induction checks; an LLM proposes strengthenings. TLAPS checks proof files separately. We did not execute these checks, so 29/29 is the artifact's recorded replay claim, not a result obtained by this review. It covers model safety, not running code or liveness.

The same six authors, benchmark population and reported timings appear in the already-reviewed IC3Syn preprint [2605.24619](https://arxiv.org/abs/2605.24619), covered in 04/05. **Inference:** I3DP appears to be its published successor, but no explicit author statement establishing that identity was found. Avoid counting the two as independent evaluations. The new public artifact is nevertheless directly useful and corrects the first pass's artifact-availability gap.

## Related-work additions absent from the first pass

Specific-title/identifier searches of `0[1-9]_*.md` found no prior coverage of the following papers. Dinv is handled by the other second-pass agent. FORCE's I4, DistAI, DuoAI, SWISS, IC3PO, Flyvy, Scimitar, and related core invariant engines already have first-pass coverage; their results are not duplicated here.

### FORCE: Inductive First-Order Formula Synthesis by ASP: A Case Study in Invariant Inference

Ziyi Yang, George Pîrlea, Ilya Sergey. ICLP 2025 author version, 17 pages. [Author PDF](https://verse-lab.org/papers/force-iclp25.pdf), [source](https://github.com/verse-lab/FORCE), [archive](https://zenodo.org/records/15654427). Reached through Specy's invariant-inference related work.

Humans supply traces/first-order states and a bounded formula grammar/search configuration; the evaluation specifically receives a configuration containing the desired invariant (§5.2, p. 12). FORCE uses answer-set programming to enumerate/prune formulas that agree with those examples. Its automatic output is a set of formulas consistent with the supplied observations. When installed inside DuoAI or Flyvy, the host performs the later inductiveness/safety checks. There is no vague-intent input, executable-code refinement, or liveness proof.

The authors implement enumeration in “250” ASP lines, pruning in “80”, solver calls in “400” C++ lines, integration in “200” (§5.1, p. 11). They correct DuoAI's excessive pruning before comparing times; restricted quantifier search is separately acknowledged (§5.2, p. 12). Figure 4, p. 12 gives FORCE times for six model benchmarks: sharded KV 0.17 seconds, toy consensus 0.31, client-server database with AE 0.57, Paxos 20.4, Flexible Paxos 56.3, Multi-Paxos 81.5. Removing quantifier restrictions gives database 2.3, Paxos 56.1, Flexible Paxos 111, Multi-Paxos 842 seconds. These are model invariant-synthesis workloads from DuoAI, not newly formalized implementations.

| Model benchmark safety subject | FORCE restricted/unrestricted seconds | Human/search scope |
|---|---:|---|
| Sharded KV ownership consistency | 0.17 / same | supplied traces and bounded search |
| Toy consensus agreement | 0.31 / same | supplied traces and bounded search |
| Client-server database with AE | 0.57 / 2.3 | supplied model safety obligation, not specified further in this paper |
| Paxos agreement | 20.4 / 56.1 | supplied traces and bounded search |
| Flexible Paxos agreement | 56.3 / 111 | supplied traces and bounded search |
| Multi-Paxos log consistency | 81.5 / 842 | supplied traces and bounded search |

FORCE + Flyvy reduces output invariant size by about “13%” for Paxos and “7%” for Flexible Paxos (§5.3, p. 13). Five-run experiments show “did not achieve notable improvement” in Flyvy runtime because SMT solving dominates (Appendix B, p. 17). No human hours are given. **Inference:** formula generation speed and end-to-end proof speed need separate metrics.

### Making Logic a First-Class Citizen in Generative ML for Networking (NetNomos)

Hongyu Hè, Minhao Jin, Maria Apostolaki. NSDI 2026, pp. 801–824. [Paper](https://www.usenix.org/system/files/nsdi26-he.pdf), [presentation](https://www.usenix.org/conference/nsdi26/presentation/he), [source](https://github.com/HongyuHe/NetNomos). Reached from Autogram.

Humans supply real network datasets, variable types/domains and bounded grammar constraints; they manually curate reference rules from RFCs/IANA/papers for evaluation. The automatic enumerator learns formulas consistent with the traces through a minimal-hitting-set encoding. GPT-4.1 uses references and web retrieval to filter plausible rules; an SMT solver constrains a generative model to satisfy learned rules (§§3–6, pp. 804–808). The formal theorem concerns consistency with a finite dataset and grammar, not all network executions. Neither protocol liveness nor a distributed implementation safety theorem is proved.

Four cases are CIDDS NetFlow, Netflix packets, MAWI backbone packets, and Meta datacenter logs. The rule-learning comparison uses up to 24 hours and formulas up to 12 literals; NetNomos reaches more than 75% reference coverage within 12 hours, while DuoAI remains below 60% at 24 hours (§7.2, pp. 809–810). Exact fragments: “75%”, “12 hours”, “24 hours”. The author scalability comparison is “1.6–6.5×” (abstract/p. 801); grammar expressivity and solver differences matter. Two Netflix and six MAWI reference rules are missed (§7.2).

GPT-4.1 with semantic retrieval has precision at least “98.1%” and false-positive rate at most “0.73%” on curated filtering sets (§7.3, p. 810), versus 82.5%/9.2% without retrieval. This is rule-filter accuracy, not proof accuracy. Generated data violates zero learned rules on three datasets but 0.3% on MAWI (Appendix Figure 16, p. 821). Thus even this generation result is not uniformly zero. Reference rule examples include TCP handshake sequence numbers, header lengths, valid IP versions, flow bytes/packets, and retransmission traffic bounded by total traffic (Tables 5–7, pp. 822–824). Human hours are unstated.

### CrossCheck: Input Validation for WAN Control Systems

Alexander Krentsel, Rishabh Iyer, Isaac Keslassy, Bharath Modhipalli, Sylvia Ratnasamy, Anees Shaikh, Rob Shakir. NSDI 2026, pp. 647–667. [Paper](https://www.usenix.org/system/files/nsdi26-krentsel.pdf), [presentation](https://www.usenix.org/conference/nsdi26/presentation/krentsel). No public source repository is linked. Reached from Autogram.

Humans define network conservation/link-status relations and tune noise thresholds. CrossCheck automatically compares controller inputs with independently collected router telemetry, repairs bad measurements through voting, and checks demand/topology consistency (§§3–5, pp. 650–655). It checks live data against hand-chosen operational relations. Its mathematical repair arguments apply to modeled error patterns; this is neither a code proof nor protocol safety/liveness verification. There is no LLM inference.

A shadow deployment runs for “four-week” monitoring, with “zero false positives” and one detected demand double-counting incident (§6.1, p. 656). It reads an independent storage replica; the study did not insert it into the live traffic-engineering decision path. A retrospective topology incident would have been detected. Production runtimes are about “∼9.1 s” for repair, 100 milliseconds for validation, 56 milliseconds for queries (§6.1, p. 657). The implementation has approximately 250 repair and 100 validation Python lines plus several hundred orchestration lines (p. 656).

| Case | Operational check | Evidence and size |
|---|---|---|
| Production WAN demand double counting | demand estimates agree with independent counters | one incident in four weeks; roughly 100 routers and 1000 links |
| Retrospective link-drain outage | topology input agrees with healthy physical/router signals | detection on stored traces, not a prevented deployment outage |
| Abilene/GÉANT/WAN A simulated corruptions | noisy demand and telemetry consistency | 12 routers/54 directed links; 22/116; production scale above |

Simulated demand removal detects “100%” of perturbations of “5%+”; random missing counters tolerate up to “30%” before false positives (§6.2, pp. 657–658). Those percentages have specific noise models; correlated zeroing/scaling experiments report a lower 25% error tolerance. **Inference:** independently sourced runtime observations can uncover a model's wrong environmental assumptions, but operational false-positive/false-negative measurements must be kept separate from proof claims.

### Full-text gaps in related work

Discovering Likely Invariants for Distributed Systems Through Runtime Monitoring and Learning (Yuan Xia, Deepayan Sur, Aabha Shailesh Pingle, Jyotirmoy V. Deshmukh, Mukund Raghothaman, Srivatsan Ravi; VMCAI 2025; [DOI](https://doi.org/10.1007/978-3-031-82700-6_1)): identified as LIDO in Specy, but the Springer endpoint served access-gated HTML and Semantic Scholar reports no open PDF; no full-text write-up claimed.

Ranking Formal Specifications using LLMs (Mike He, Zhendong Ang, Ankush Desai, Aarti Gupta; LMPL 2025, pp. 51–56; [DOI](https://doi.org/10.1145/3759425.3763386)): identified from Specy and the author's publication page, but the advertised open ACM PDF returns 403; no full-text write-up claimed.

LLM-guided Predicate Discovery and Data Augmentation for Learning Likely Program Invariants (Xia et al., SAC 2025): Guiding's reference 11 names this as the RunVS predecessor, whereas Specy calls the VMCAI paper LIDO; the exact relationship between these works and their implementations was not established, and no open full text was found in this search.

## Federated Formal Verification: Cross-Backend Citation, Cross-Axis Convergence, and AI-Orchestrated Proof Dispatch for Production Systems

Pierre Falda (Bullish), arXiv preprint 2606.02019v1, 1 June 2026. [Paper](https://arxiv.org/abs/2606.02019), [full text](https://arxiv.org/html/2606.02019v1), [PDF](https://arxiv.org/pdf/2606.02019). Full 46-page PDF read. The openly available collection PDF was reused. No source repository URL or reproducibility tag could be located in the paper or arXiv HTML; GitHub repository searches for the title, Mercury/Falda, and SpecMonitorProcessor returned no repositories. Consequently, the results below are author reports, not independently rerun proofs.

**What this provides.** An orchestration design that routes existing TLA+ obligations to several proof assistants or model checkers, rechecks their results in CI, and uses Claude Code specialists to work concurrently. It starts from an existing production codebase and a substantial formal development. It does not demonstrate that vague requirements automatically become a sufficient specification.

**Human input.** The pre-existing Mercury Raft specification/proof tree, financial specifications, open-obligation tracker, tool integrations, templates, and runtime instrumentation form the starting point (§§3.1–3.4, 4, 8). The paper does not quantify the labor that created this starting point. Most critically, cross-backend equivalence remains “a human-authored claim” (§3.1.4, p.14): someone asserts that the theorem proved in Coq or Lean means the same thing as the omitted TLA+ obligation. Humans also wrote the TLA+-to-Java invariant translation rules (§4.4, p.25; §6.1, pp.35–36). Per-class annotations select the specification files, invariant names, and runtime checking policy. The paper does not give prompts, a requirements-elicitation evaluation, model version, token use, dollar cost, or a reliable breakdown of human intervention during the reported campaign.

**What was automatic.** A coordinator surveys a tracker, chooses or races backends based on obligation shape, dispatches specialists with separate file ownership, and routes unsuccessful attempts to another backend (§3.3, pp.17–20). Falda reports “twenty specialist agents” (§3.3.1, p.18), arranged into four waves of 3/6/7/4 specialists; practical concurrency was 6–7 because build-script and Git-index contention limited scaling. Task budgets were usually 4–8 hours. Agents author proof ports and audits in the reported workflow, while kernel output and CI determine acceptance. However, §§5.2.2 and 6.4 also describe generation of candidate ports as future work. Without prompts or artifacts, the exact extent of autonomous port generation is unclear. Build tasks recheck theorem existence and allowed axioms, collect a verdict matrix, and cache results. A Java annotation processor generates invariant-checking companions from selected TLA+ invariants and regenerates them when specification hashes change.

**Safety, liveness, and the boundary to code.** The Raft claim covers crash faults and the model's joint consensus, leadership transfer, log compaction, linearizable client reads, and dynamic reconfiguration (§4.2, pp.23–24). Its proof tree exceeds 11,000 lines, with 18 externally cited apex obligations at the reported snapshot. The reported campaign closes an existing “26-axiom Raft census” (abstract, p.1); this is a count of previously assumed obligations, not 26 independently specified protocols or an entire formal development created from scratch.

The paper reports five Raft obligations as liveness closure: eventual configuration commitment, eventual log convergence, persistence as an attractor, eventual clearing of a pending configuration change, and leader-log monotonicity (§4.2). Four combine TLAPS state-invariant induction with Coq temporal composition; one combines a bounded TLAPS argument with PRISM probabilistic checking. The paper does not supply the PRISM model's actual probability formula, finite model bounds, fairness/scheduling assumptions, or theorem texts in this 46-page document. Leader-log monotonicity ordinarily states safety; its inclusion in a five-item liveness tally does not itself establish five progress theorems. The temporal obligation and its correspondence to Raft progress must be inspected before accepting the claimed IronFleet parity. This review cannot independently establish these semantics without the missing artifact.

Financial checks concern five numeric types/helpers: Pow10Lookup, Notional, UFP32, FundingRate, and ScaledPrice (§4.3, pp.24–25). Each has six reported ports: Coq, Lean, Why3, Apalache, standalone Z3, and CBMC. CBMC here checks a **C reference implementation**, not equivalence of those helpers to the production Java code. Further settlement work reportedly discharges about 1,720 TLAPS obligations over three modules and 655 more for two carrier-strategy theorems. Those counts include work beyond the reproducibility snapshot, so they should not be combined with the 17-hour campaign as its output.

Cross-backend citations mark the host TLA+ theorem `PROOF OMITTED` and attach a named external theorem. CI proves the external theorem closes and the tag still exists; CI does **not** mechanically prove the two theorem statements equivalent (§3.1). Agreement between several backends is therefore operational evidence about separately written statements, conditional on their correspondence. A concrete failure makes this consequential: at bound six, Apalache refuted an unconditional log-position/term property while its cited Coq theorem proved only a local property for log pairs sharing an ancestor (§5.5, p.34). The repair added an all-pairs-share-an-ancestor premise to the TLA+ claim. Consumers needing the original unconditional result must now prove that premise separately. Removing `ASSUME *Axiom` lines cannot by itself settle that new obligation.

Generated Java assertions check selected states reached during tests and selected instrumented execution sites (§4.4, pp.25–26). Test-only assertions throw; sampled production checks warn/count; hot-path checks count only; registry dispatch inside Java `assert` disappears when assertions are disabled. **Reviewer's inference:** passing these checks establishes neither that every reachable production state satisfies the invariant nor that every production transition follows the verified model. A semantics-preserving invariant translator would improve monitor accuracy, but would still not prove implementation refinement from finite tests. Falda acknowledges “we do not claim Verdi-style verified extraction” (§6.2, p.36). Experimental Coq-to-OCaml extraction is compared to Java by differential tests, without a binary-equivalence theorem.

**Numbers and how to interpret them.** The author reports “17 active hours” (abstract, p.1), 263 commits, an initial flat axiom census through hour 9, 26→16 at hour 10, 16→5 at hour 11, and zero at hour 14; the complete campaign includes later work (Fig.6, p.27). Kernel-runtime median for Coq was “34.4 seconds” (§5.2.2, p.29), while median port authoring was about 30 minutes. Table 2 (p.31) reports Coq 8/8 passes, 1,275 MB peak RSS; Apalache 0/3 passes, 118.3 s median, 1,473 MB; TLC 0/5 passes, 205.1 s, 128 MB; PRISM 1/13 passes, 148.1 s, 1,473 MB. TLC failed to launch amid concurrent build edits; Apalache had integer-range encoding failures; PRISM failures were reclassified as model-abstraction bugs. These heterogeneous failure causes are not a controlled backend comparison.

The approximate 60× headline compares 30-minute port authoring against the team's prior 30–40-hour estimates for a different strategy, extending the host proof with ghost state (§5.2.2). The same-team serial estimate was 5–7 person-months (§5.2.1). These are neither randomized nor independently measured controls. Ratios of 453× or 635× against IronFleet convert 3.7 person-years into hours and divide by this 17-hour session (§5.2.3, pp.29–30). They compare different protocols, starting points, implementation guarantees, and liveness methods. They cannot establish an equivalent speedup for generating and proving a complete system from scratch.

The matrix spans 18 apex obligations and ten effective columns. All 18 report Coq and Lean closure; 10 have bounded TLC checks, 7 PRISM models, 7 runtime hooks, 14 enforced Coq/Lean citation gates, and 3 triple gates adding bounded Apalache (§5.3, p.33). The histogram is 4/5/5/3/1 obligations at 3/4/5/6/8 columns, mean approximately 4.6. Some columns count **agreement gates over existing backends**, not additional independent proofs (Appendix B, p.40). Sixteen provisioned tools consequently do not mean sixteen independent proofs of every obligation.

The four headline bugs (§5.4, p.34) are a JSON arena unsigned wraparound, HTTP-parser pointer-arithmetic undefined behavior, JSON allocator-vtable contract violation, and funding-scale mismatch that could multiply accrual by 10^12. A separate AMM partial-fill cost mismatch is also described (§4.4, p.26), without a clear relationship to this four-bug tally. The funding and AMM defects were exposed by generated assertions on unit-test fixtures; the three native-code defects by CBMC harnesses. No controlled ablation establishes that multiple backends were necessary to discover each defect. Exact harness bounds, independent reproductions, and regression artifacts remain unavailable in the paper.

**Why it matters for the brief.** Backend routing, explicit failures, and CI checking are concrete agent-workflow ideas. The most valuable evaluation case is the six-step counterexample to a **wrong correspondence claim despite a successful kernel proof**. An end-goal benchmark should test statement equivalence, missing premises, and actual code refinement separately from proof acceptance. This paper's orchestration and cost reports are promising engineering claims, but do not supply an independently inspectable end-to-end production correctness theorem.

## Related-work addition: LeaseGuard: Raft Leases Done Right

A. Jesse Jiryu Davis, Murat Demirbas, Lingzhi Deng; SIGMOD 2026 / Proceedings of the ACM on Management of Data 4(1), article 49. [Paper](https://arxiv.org/abs/2512.15659), [DOI](https://doi.org/10.1145/3786663), [models and simulator](https://github.com/muratdem/RaftLeaderLeases), [C++ implementation](https://github.com/mongodb-labs/logcabin/tree/leaseguard). Full 15-page author-accepted arXiv v2 manuscript read; arXiv metadata reports 25 pages for the published journal format. Existing collection PDF reused. No LeaseGuard mention was found in `0[1-9]_*.md`. Falda's reference gives an inaccurate title; the arXiv identifier resolves this actual paper.

**Human input and checked promise.** Humans designed a Raft lease extension, wrote its TLA+ state model, chose bounds/invariants, wrote informal correctness arguments and a Python simulator, and changed LogCabin C++. Leases attach to committed log entries. A new leader can replicate writes while waiting for the previous lease to expire; it can immediately read keys unaffected by possibly committed entries in its inherited log. The intended guarantee is linearizable reads and writes, including reading one's completed writes after leader changes (§§3–4, pp.3–6). It assumes Raft's leader completeness and state-machine safety. Inherited lease reads additionally require “Inherited lease reads require correct clock bounds!” (§4.3, p.6). A timer-only variant permits deferred writes but cannot safely permit inherited reads (§5.3).

**What is proved versus checked.** Section 4 sketches a mathematical safety argument; it is not a machine-checked theorem about C++. The repository supplies finite TLA+ safety-checking configurations. At inspected commit `c773c123bdbbf9aeb18031feddd6b291317faf5e`, `mcLeaseGuard.cfg` fixes 3 servers, 2 keys, maximum term 3, log length 4, clock 8, and lease duration 3. It checks types, indexes, one leader per term, leader completeness, state-machine safety, and `LinearizableReads`; it uses symmetry and a clock-normalizing view. There are no configured temporal `PROPERTY` checks or mechanized proof blocks in these models. The 296-line `leaseGuard.tla` abstracts election into one quorum action and acknowledges unrealistic instantaneous/reliable replication acknowledgments. These bounds are configuration evidence, not a new model-check run by this review. The paper reports no complete search-state count, runtime, proof size, or person-hours. Availability plots are performance measurements, not an unbounded liveness proof.

The Python simulator automatically checks its own operation histories: known true execution timestamps must fall within request intervals, and ordered reads must contain preceding appends, with permutations for simultaneous/uncertain operations (§6.2, pp.7–8). This tests simulator traces, not a universal refinement theorem about LogCabin. Humans wrote about 1,000 simulator lines (§6.1), changed 1,600 server lines in a 27,000-line C++ codebase, and added/changed 650 client lines (§7.1, p.9).

**Concrete outcomes and caution.** The abstract (p.1) reports “∼1000 to ∼10,000 writes per second”; these are workload-dependent LogCabin results from eliminating competing quorum reads. Read consistency avoids one server-to-server roundtrip. In the failover experiment (§7.3, p.11), lease duration is 1 s versus 500 ms election timeout, 30 operations/ms, one-third 1 KB writes, 1,000 keys with Zipf parameter 0.5. The new leader had 37 possibly committed log entries; 9,930 of 10,000 reads succeeded during the half-second wait, explaining the rounded 99% abstract claim. Three EC2 servers and one client use m7g.xlarge instances in one placement group; measured ping averages 155 μs and clock uncertainty intervals are under 100 μs (§7.1, pp.10–11). Latency tests inject 1–10 ms one-way delays, offer an operation every 300 μs, and measure p90. Scalability tests vary offered load from 5,000 to 60,000 ops/s or stop above 100 ms mean latency (§7.4, p.12). These figures should not be generalized to every Raft workload.

The earlier model hid the crucial inherited-read defect through “large atomic actions that hid the bug” (§5.4, p.7). This is directly useful for the brief: choosing realistic action boundaries matters before trusting checker success. Repository README links a nine-step counterexample and its repair, which refuses reads affected by the uncertain log suffix. Human model revision and proof reasoning found the correct rule; automated exhaustive checking of an overly atomic model initially missed it. Neither an agent workflow nor machine-checked C++ safety or liveness is claimed here.

| Concrete case | guarantee and checking boundary | size / effort / source |
|---|---|---|
| Mercury Raft, Falda | author-reported model safety and mixed deductive/probabilistic progress; Java test monitors; human cross-backend correspondence | >11,000 proof-tree lines; inherited campaign 26 assumptions→0 in 17 active hours; artifact URL absent; [§4.2](https://arxiv.org/html/2606.02019v1) |
| Mercury numeric / native layers, Falda | arithmetic model/reference-code checks and finite runtime assertions; CBMC native harness bug discovery | five numeric helpers × six ports; four headline defects; bounds/artifact absent; [§§4.3–5.4](https://arxiv.org/html/2606.02019v1) |
| LeaseGuard leader leases, Davis et al. | human safety argument + bounded TLA+ invariants + simulator histories; C++ availability measurements | ~1,000 simulator lines; 1,600 server/650 client changes; person-hours unstated; [paper](https://arxiv.org/abs/2512.15659), [models](https://github.com/muratdem/RaftLeaderLeases/tree/main/TLA), [C++](https://github.com/mongodb-labs/logcabin/tree/leaseguard) |

Search gaps: Falda's claimed public reproducibility artifact lacks a usable URL/tag; web/GitHub searches did not locate it. Falda related-work references to generic proof tools/runtime instrumentation include E-ACSL (SAC/RV 2013), Lincheck (CAV 2023), Lean Copilot, and LiquidHaskell; these were absent under their exact names in the first pass, but have not been newly full-text reviewed in this fragment. LeaseGuard's related work points to the LAW theorem (VLDB 2025), useful for clarifying that local linearizable reads require timing assumptions; it has not been full-text reviewed here.

## Foundational Multi-Modal Program Verifiers

Vladimir Gladshtein, George Pîrlea, Qiyuan Zhao, Vitaly Kurin, Ilya Sergey. POPL 2026, PACMPL 10, article 77. [Author PDF](https://verse-lab.org/papers/loom-popl26.pdf), [publication](https://doi.org/10.1145/3776719), [Loom source](https://github.com/verse-lab/loom), [archived artifact](https://doi.org/10.5281/zenodo.17347734). All 32 pages read. Open PDF saved in the collection. This is the Loom framework paper, distinct from the Velvet CAV 2026 paper already in `05_llm_agents.md`.

**Human input.** A verifier author supplies an executable language semantics, assembled from supported effects such as mutable state, exceptions, nontermination, and nondeterministic choice. Adding an unsupported effect requires mathematical definitions and proofs. A verifier user supplies the program or protocol, contracts, loop/protocol invariants, and, for termination proofs, decreasing measures. Residual goals require tactics or manual proofs. Loom does not infer the user's intended guarantee (§§2–6, 7.2, 8).

**What is established.** The framework's verification-condition generator is proved sound in Lean relative to its embedded executable semantics. Veil 2.0 establishes safety of protocol models; native simulation runs those models, rather than demonstrating correspondence with independently deployed implementations. Velvet verifies embedded imperative programs. Partial correctness means the contract holds if execution terminates; total correctness additionally establishes termination. These are separate proof modes. This paper does not demonstrate temporal liveness of a distributed protocol (§§2.3–2.4, 5, 7–8).

**Automation.** Lean derives proof rules for combinations of supported effects and generates obligations from annotations. SMT or Lean tactics try to discharge them; interactive Lean handles the remainder. Native testing and symbolic reachability checks help detect invalid or overly restrictive specifications. The paper's exact boundary is that a “residual proof obligation is left to the user” (§8.1, p. 77:24).

**Numbers and useful failure.** Veil's suite contains “17 specifications of 15 different distributed protocols” (§7, p. 77:20). Velvet verifies “10 case studies” (§8, p. 77:22). Sparse-matrix mathematical reasoning takes “300-400 LOC” (§8.2, p. 77:24); the imperative-to-pure-function proof layer needs no manual reasoning after its contracts/invariants are supplied. No controlled LLM evaluation, human-hours total, or deployed-code proof is reported.

NOPaxos is particularly relevant. The authors port an existing Ivy model and inductive invariant. Its safety proof succeeds, but randomized execution reveals a transition whose precondition is always false. They repair that transition, related actions, and invariant clauses before recertifying safety. Their model fixes the leader and omits view change and synchronization (§7.2, pp. 77:21–22). **Inference:** proving an invariant alone can certify a model that silently excludes intended behavior; an agent evaluation should also test reachability and exercise named actions.

Concrete cases, all by Gladshtein and colleagues, with [paper](https://verse-lab.org/papers/loom-popl26.pdf) and [artifact/source](https://github.com/verse-lab/loom):

| Problem | Guarantee and scope | Tool; stated effort/size |
|---|---|---|
| NOPaxos with fixed leader | Consensus safety of a model; one unreachable action repaired; no view-change proof | Veil 2.0/Lean; existing model and invariant manually ported; §7.2 |
| In-place insertion sort | Sorted result, same multiset, and termination of embedded code | Velvet/Lean; human invariants and two loop measures; Fig. 11, §8.1 |
| Integer square/cube roots | Functional correctness; partial/total modes demonstrated | Velvet/Lean; included in the ten case studies; §8 |
| Sparse matrix/vector computations | Imperative result equals pure computation and mathematical sum; models interleavings with nondeterministic scheduling | Velvet/SMT/Lean; 300–400 lines of mathematical reasoning; §8.2 |

## TraceLinking Implementations with Their Verified Designs

Finn Hackett and Ivan Beschastnikh. OOPSLA 2025, PACMPL 9, article 350. [Paper/publication](https://doi.org/10.1145/3763128), [source](https://github.com/DistCompiler/pgo), [evaluation artifact](https://doi.org/10.5281/zenodo.16926533). All 33 pages, including translation appendices, read; collection PDF reused.

**Human input.** An MPCal formal design, properties, deployment setup and library code, and tests that produce execution traces. Source-model metadata makes the trace-to-model relation automatic for PGo-generated code. The paper names the two inputs as a “formal model” and “tracing data” (§3, pp. 350:5–6). The formal design is already written: this is not intent-to-specification generation.

**What is checked.** Offline TLC validation checks whether observed Go implementation actions agree with the source model's next-state relation, considering causally allowed event orders. This finds safety/refinement deviations in actual executions, including discrepancies in environmental assumptions and instrumentation. It neither proves all possible code executions correct nor proves eventual progress. The evaluation checks refinement rather than the model's separate correctness properties (§9.1, p. 350:20). The trace must start at the modeled initial state; truncated or missing-event traces are unsupported (§5.1 footnote, p. 350:11).

**Automation.** Runtime hooks record state accesses and vector clocks; TraceLink generates the trace's TLA+ interpretation and invokes TLC. Its trace translation and TLC are trusted. PGo, runtime support, environment models, and logging can be checked for inconsistencies. Logging that happens to conceal a deviation, low-level memory errors, and unmodeled behavior remain outside this method's detection scope (§§3.1–3.3, 4). For pass-through custom Go code, instrumentation needs no edits; unusual custom code that destroys vector-clock metadata needs repair (§4, p. 350:8).

**Numbers.** The abstract reports “9 previously undetected and diverse bugs” (p. 350:1): two network-assumption errors, one miscompilation, two instrumentation errors, two timeout-model errors, one failure-detector error, and one symbolic-abstraction mismatch (Table 2). Sidestep shortens counterexamples by “29%”; generated TLA+ achieves “93× compression” (§1, p. 350:2; §§9.3–9.4). Runtime tracing has a “median overhead of 23%” (§9.5, p. 350:23). Adding randomized stress testing raises median overhead to 37%; measurement outliers are large. Validating a 20,485-step Raft trace costs 34.8 times plain TLC path exploration, 328 seconds versus 9.4 seconds (§9.4). The manual comparison for the small lock service took “2 hours” (§9.6, p. 350:24); this is a single anecdotal comparison, not a user study. Correcting model inaccuracies did not invalidate the original model's stated properties (§9.2).

Each case below uses TraceLink/TLC, by Hackett and Beschastnikh, with [paper](https://doi.org/10.1145/3763128) and [source models/code](https://github.com/DistCompiler/pgo/tree/main/systems). Table 1, p. 350:19 supplies sizes; the Raft row's exact size sequence is “990 7,993 3,163”.

| Problem | Guarantee checked on executions | MPCal / generated TLA+ / Go lines |
|---|---|---|
| dqueue producer-consumer | Recorded execution refines the design | 76 / 99 / 175 |
| locksvc centralized lock service | Recorded execution refines the design | 80 / 159 / 281 |
| raftkvs Raft key-value store | Recorded execution refines the design; environment and compiler deviations detected | 990 / 7,993 / 3,163; traces contain 2,772–100,644 events, with 6–26 concurrent processes |

**Inference:** this supplies a useful implementation check after agent-generated verified designs are compiled. The automatically maintained relation between model and generated code is its central advantage, but test traces still determine the behaviors examined.

## Runtime Protocol Refinement Checking for Distributed Protocol Implementations

Ding Ding, Zhanghan Wang, Jinyang Li, Aurojit Panda. NSDI 2025, pp. 1305–1326. [Publisher/paper](https://www.usenix.org/conference/nsdi25/presentation/ding), [open PDF](https://www.usenix.org/system/files/nsdi25-ding.pdf). All text and appendices read; existing PDF reused. Tool: Ellsberg. No public Ellsberg repository was located in the paper, publisher page, or repository searches; [Raft input model](https://github.com/ongardie/raft.tla) is public.

**Human input.** Users provide “two inputs”: a protocol specification and mappings from implementation messages to specification messages (§3.3.1, p. 1309). In this prototype they manually derive a Go state machine from a TLA+ model, then supply state equality, output-state inference, conservative reachability, immediate-application and optional lookahead functions. Mapping/deserialization code is implementation-specific. Correctness of this supplied model is assumed; generated TLA+ traces test the translation. This input is substantially more precise than a natural-language guarantee (§§3–5, Appendices A–C).

**What is checked.** A local monitor observes each deployed process's incoming/outgoing messages and simulates allowed protocol states. An outgoing message with no consistent simulated explanation triggers an alert. Safety/refinement is checked on observed executions, under asynchronous or partially synchronous timing, fail-stop failures, faithful ordered message traces, a correct model/mapping, and a monitor that fails together with its process. Monitors need no cross-node coordination. The paper explicitly says it “cannot prove that an implementation is correct” (§3.1, p. 1309). It cannot detect deadlock/livelock or internal corruption that produces no inconsistent outgoing message; this is not a liveness proof (§1, p. 1306).

**Automation.** Breadth-first search considers hidden processing orders and timeouts; outgoing messages and user-supplied helper functions prune states. A separate tool generates finite traces from the TLA+ model to test the Go specification. Appendix B uses Z3 to check conditions supporting the immediate-application optimization. Neither testing that translation nor proving that optimization constitutes a whole implementation proof.

**Numbers.** Table 3, p. 1322 gives specification totals “952 894 989” for etcd, Redis Raft, and ZooKeeper. Mapping functions add 356, 380, and 370 lines, respectively; tracing modifies 11, 10, and 31 networking functions (§5, p. 1315). Raft and ZooKeeper translation testing uses “8,750,468 message traces” and “1,904,456 message traces”, at bounds of 15 and 20 steps (§5). Table 2 lists ten bugs: four etcd, one ZooKeeper, and five Redis Raft, including one previously unreported reconfiguration bug. These are reproduced/injected historical bugs plus that new bug, not ten new discoveries. In the measured 3/5-node workloads monitors alert “within 1.7 second” (§6.4, p. 1316). Largest observed 99th-percentile latency increase is “10.7%”, from 7.25 to 8.03 ms (§6.3); monitors use two cores. The paper gives inconsistent approximate specification sizes in §5 (Raft about 500 lines, ZooKeeper about 2,000); the explicit component totals above are preferable. Human hours are not reported.

All cases use Ellsberg, by Ding and colleagues. [Paper](https://www.usenix.org/conference/nsdi25/presentation/ding); implementation source links below identify checked systems, not an Ellsberg artifact.

| Problem | Safety behavior checked | Specification lines; checked implementation |
|---|---|---|
| etcd Raft | Leadership, linearizable-read protocol, reconfiguration | 952; [etcd](https://github.com/etcd-io/etcd) |
| Redis Raft | Linearizable-read protocol, no lost committed updates, correctly acknowledged reconfiguration | 894; [Redis Raft](https://github.com/RedisLabs/redisraft) |
| ZooKeeper/Zab | Log consistency during leader synchronization | 989; [ZooKeeper](https://github.com/apache/zookeeper) |

The Raft models include implementation-specific read and reconfiguration changes; they are not simply Ongaro's original model. Lease-based reads are explicitly excluded from this evaluation (Appendix C.2, p. 1323). **Inference:** this is a useful operational check for an existing implementation, but its manually supplied message relation is an additional specification task an agent must solve and validate.

## Related-work omission: Inferring and Asserting Distributed System Invariants

Stewart Grant, Hendrik Cech, Ivan Beschastnikh. ICSE 2018. [Author PDF](https://www.cs.ubc.ca/~bestchai/papers/dinv-icse18.pdf), [publication](https://doi.org/10.1145/3180155.3180199), [current source](https://github.com/ModelInference/dinv), [paper's original source](https://bitbucket.org/bestchai/dinv/). All ten pages read; open PDF saved. Cited by TraceLink §10 and Ellsberg reference 33; exact title and Dinv alias absent from `01`–`09`.

**Human input.** Existing Go code and executions; optionally logging annotations and selected variables. Users iteratively inspect code/documentation and narrow logged state. They choose which inferred properties are meaningful and “manually wrote boolean functions” for runtime assertions (§5, p. 6). Serf/etcd custom encoding requires hand-written vector-clock instrumentation; Serf adds 20 lines (§6.1). Dinv does not take a human-written full formal specification.

**Checking and automation.** Static slicing finds network-related variables, instrumentation records them with vector clocks, and Daikon mines candidate relations in groups of distributed snapshots. Runtime assertions sample distributed state. The candidates are “likely invariants”, not proved inductive invariants (§9, p. 9). Equality after observed gossip supports a convergence hypothesis, but does not prove eventual delivery or distributed liveness. Inference is designed for executions without node failures. The paper warns that “inferred invariants are not a verification” (§9). No theorem-prover validation closes that gap.

**Numbers and effort.** Four Go systems are analyzed, spanning 1.7K–144K lines (abstract; §6). Serf's initial automatic survey produces approximately “1 million invariants”; manual refinement reduces this to “40 inferred invariants” (§5, p. 6). A Groupcache undergraduate case takes “within a workday” (§9), an anecdote. Runtime Raft assertions require 11, 13, and 72 lines for strong leadership, leader agreement, and log matching, respectively. Table 3's certain-check detection times are “0.07”, “0.36”, and “2.22” seconds; the corresponding 1% sampling times are 2.96, 6.75, and 6.07 seconds (§7, p. 7). These detect three deliberately injected silent bugs. Always checking strong leadership at a bottleneck slows requests 52 times; 1% sampling reduces slowdown to 1.02 times (§8.1). Thus the low-overhead conclusion depends on sampling and check placement, not simply on inference automation.

All cases below use Dinv/Daikon, by Grant, Cech, and Beschastnikh; [paper](https://www.cs.ubc.ca/~bestchai/papers/dinv-icse18.pdf), [tool source](https://github.com/ModelInference/dinv):

| Problem | Evidence, not an unbounded proof | Stated input/code effort |
|---|---|---|
| Serf/SWIM | Observed gossip propagates membership changes consistently | 6.3K code lines; 20 instrumentation lines; §6.1 |
| Groupcache | Observed nodes own disjoint key sets | 1.7K lines; 2–8 nodes, each requesting 2K keys; §6.2 |
| Taipei-Torrent/Kademlia | Observed resource routing follows XOR distance and logarithmic message bound | 5.8K client and 4.9K DHT lines; five-line helper; §6.3 |
| etcd Raft | Observed strong leadership, leader agreement, log matching; three injected violations detected | 144K lines; assertion functions 11/13/72 lines; §§6.4–7 |

**Inference:** trace mining can propose specifications and invariant candidates for agents, but candidate coverage and an independent inductiveness check are necessary before calling the result proved.

## Related-work access gap: Protocol Conformance with Choreographic PlusCal

Darius Foo, Andreea Costea, Wei-Ngan Chin, TASE 2023, pp. 126–145, [publisher](https://doi.org/10.1007/978-3-031-35257-7_8): found and relevant through TraceLink §10, but no open full text located; publisher PDF URL returns HTML, Semantic Scholar/OpenAlex list no open PDF, and author-page searches did not find a copy, so no full-text claims or quantitative results are attributed here.

## Search and read record for this fragment

The broken built-in web search returned HTTP 404; its alternate connector also failed. Fallbacks used direct Crossref, arXiv, Semantic Scholar, OpenAlex, GitHub, USENIX and author pages. Google returned a redirect page; Bing returned irrelevant results for these exact queries, so neither was used as evidence. Direct DOI lookups worked even when search APIs were rate limited. Exact title and tool-name searches over the nine first-pass files excluded already-covered PGo, Veil, Velvet, trace validation, CCF, IronFleet, Verdi, model-guided fuzzing, Mocket, and the major invariant inference systems. Citation expansion here focuses on specification/proof construction and checking distributed behavior; generic tracing and performance-debugging references are not treated as new verification papers.

Four full-text papers in this fragment; one identified related paper remains inaccessible. Two collection PDFs saved, two reused. Downloaded files were checked to begin with `%PDF`; the extracted texts and discovery responses are in `second_pass_11/`.

These five papers come from §9 and references [4], [75], [98], [100], and [105] of **Foundational Multi-Modal Program Verifiers**. Exact titles and author aliases were absent from `0[1-9]_*.md`; searching “Dijkstra” alone also found unrelated distributed algorithms. All five open PDFs were saved in their own paper-collection directories, validated as PDFs, and read as full papers. They explain how humans formulate verification and how tools derive sound proof obligations. None evaluates an agent turning vague human intent into a specification.

## Dijkstra Monads for Free

**Danel Ahman, Cătălin Hrițcu, Kenji Maillard, Guido Martínez, Gordon D. Plotkin, Jonathan Protzenko, Aseem Rastogi, Nikhil Swamy; POPL 2017**, pp.515–529. [Publisher](https://doi.org/10.1145/3009837.3009878), [open full version](https://arxiv.org/pdf/1608.06499), [F★ source](https://github.com/FStarLang/FStar). Saved: `/hdd1/sichanghe/paper_collection/Dijkstra Monads for Free, Danel Ahman, Catalin Hritcu, Kenji Maillard, et al., POPL, 2017/paper.pdf`. The open copy is the expanded 2019 arXiv revision; page references below are its printed pages.

**Human input.** A tool developer writes “simple monadic definitions” (p.2): executable descriptions of effects such as changing state or throwing exceptions, together with their operations. A program author writes the program and a logical specification of its required behavior. §2.2–2.3 shows this explicitly for an increment: the author states that the final state exceeds the initial state; the tool derives the condition needed to make that true. Effect definitions must satisfy the monad laws, and the implementation checks their proofs. Specifications are supplied by humans, rather than inferred from a desired outcome in English.

**Guarantee and automation.** The metatheory is “sound for total correctness” (p.2, §1.1): verified programs terminate and satisfy their postconditions within the defined calculus. A translation derives the proof-obligation generator from the executable effect definition; this avoids separately inventing its logical semantics. F★ computes the obligations, and the increment and squaring examples are “discharged automatically by Z3” (p.2, §2.1; p.3, §2.2). Humans can also prove properties after writing code by exposing its pure functional interpretation. This “only works for terminating code” (p.2). §5 proves a simulation connecting the calculus to an abstract language with primitive state; this is a theorem about defined program semantics, not a check on a deployed runtime or a verified OCaml compiler.

**Numbers and examples.** §2 covers state increment, division with exceptions, rollback/counting variants of state and exceptions, dynamic allocation, information-flow examples, and continuations. No experimental success rate, measured runtime, total proof size, or person-hours is reported. Three closely related calculi underlie the construction (§1.1); they are theoretical components, not three benchmark problems. The dynamic information-flow monitor example still needs a separate argument for its security policy (§2.8), so automatically deriving an effect's logic does not automatically establish its intended security meaning.

**Why it matters, inference.** An agent could reuse this machinery to derive obligations after choosing an effect model. It would still need to choose the property and justify the correspondence between that model and the actual system.

## Dijkstra Monads for All

**Kenji Maillard, Danel Ahman, Robert Atkey, Guido Martínez, Cătălin Hrițcu, Exequiel Rivas, Éric Tanter; PACMPL 3, ICFP 2019, Article 104**, 29 pages. [Publisher](https://doi.org/10.1145/3341708), [open full version](https://arxiv.org/pdf/1903.01237), [Coq artifact](https://gitlab.inria.fr/kmaillar/dijkstra-monads-for-all), [F★ examples](https://github.com/FStarLang/FStar/tree/dm4all/examples/dm4all). Saved: `/hdd1/sichanghe/paper_collection/Dijkstra Monads for All, Kenji Maillard, Danel Ahman, Robert Atkey, et al., ICFP, 2019/paper.pdf`.

**Human input.** §7 gives the workflow: “writing the specification”, “writing the program in monadic style”, and proving obligations “using tactic proofs” (p.104:25). The developer supplies an executable effect model, a specification language, and a map connecting the two that preserves composition. Unlike *For Free*, one executable model can have several logical interpretations. For exceptions, the human chooses whether any exception is permitted or exceptions are forbidden; for nondeterminism, whether all possible results or some possible result must satisfy the property (§3.2–3.3). For termination of recursive code, the human supplies the function's invariant and a well-founded order decreasing at recursive calls (§6.2, p.104:25).

**Guarantee and automation.** The paper proves that its construction connects effectful code to the chosen specifications compositionally. Its examples are proofs about programs interpreted in F★ or Coq, not runtime checking. F★ derives weakest preconditions and “uses an SMT solver to discharge them” (§7, p.104:25). Coq derives the conditions too, but people prove them with tactics. §3.4 verifies nondeterministic selection of list elements and Pythagorean triples, input duplication, a history-dependent output check, and restoring state after input/output; §6.2 verifies Fibonacci termination. Those guarantees vary with the selected interpretation: exceptions permitted under partial correctness are not a proof of exception freedom or eventual return.

**Numbers and limitations.** No benchmark rate, measured solving time, total lines of proofs, or measured human effort is reported. The illustrative Pythagorean search chooses its three numbers from the explicitly written list 1 through 10 (§3.4, p.104:10); this is an example's search bound, not a general scalability result. §7 states that F★ did not implement the proposed specification metalanguage; the Coq formalization omits its linear type system and assumes a semantic condition for the corresponding theorem, with that syntactic implication proved on paper (§7, pp.104:25–26).

**Why it matters, inference.** Choosing a logical interpretation is part of specification design. An agent must expose whether it proved correctness of every behavior, existence of one good behavior, partial correctness, or termination. A solver's success cannot settle that choice.

## Dijkstra Monads Forever: Termination-Sensitive Specifications for Interaction Trees

**Lucas Silver and Steve Zdancewic; PACMPL 5, POPL 2021, Article 26**, 28 pages. [Publisher](https://doi.org/10.1145/3434307), [author PDF](https://www.cis.upenn.edu/~stevez/papers/SZ21.pdf), [Interaction Trees library](https://github.com/DeepSpec/InteractionTrees). Saved: `/hdd1/sichanghe/paper_collection/Dijkstra Monads Forever- Termination-Sensitive Specifications for Interaction Trees, Lucas Silver, Steve Zdancewic, POPL, 2021/paper.pdf`.

**Human input.** Humans define programs as interaction trees: executable semantic descriptions of state changes, input/output, and potentially endless computation. They supply preconditions, postconditions over entire traces, loop invariants, and proofs. §3 says “The job of the proof engineer” is to “write a proof of that verification condition” (p.26:7). In the square-root case the human provides a decreasing natural-number measure for termination, an invariant, and a separate infinite-execution argument (§6.2, pp.26:15–17).

**Guarantee and automation.** The framework and reasoning rules are “formally verified in Coq” (§1, p.26:3). They support proofs of termination, divergence, and the contents of infinite interaction traces. For the input/output example the authors “automatically generate a verification condition” (§9.4, p.26:25), then prove it by coinduction. Automatic obligation generation is not automatic discovery of invariants or termination arguments. The programs have executable reference semantics; the paper does not establish these claims for a production implementation or deployed service. The framework uses classical logic for distinguishing termination from divergence (§4.2), rather than claiming an algorithm can decide which occurs for arbitrary programs.

**Concrete proved problems.** The square-root loop terminates with the correct result exactly when its input is a perfect square, and otherwise diverges (§6.2). A loop repeatedly querying a Boolean stops after a finite sequence of true answers ending in false, or has an infinite trace of true answers (§9.1–9.3). A stateful input/output loop takes a number and continually prints its multiples in order from zero, assuming an initially empty log and zero accumulator (§9.4). No measured runtime, proof size, person-hours, or benchmark success rate is reported.

**Why it matters, inference.** This supplies a useful specification template when the desired behavior includes both progress and an intentionally endless service. It also gives a concrete evaluation distinction: proving a postcondition if a program returns is weaker than proving that it returns, and different again from proving a complete infinite output trace.

## Program Logics à la Carte

**Max Vistrup, Michael Sammler, Ralf Jung; PACMPL 9, POPL 2025, Article 11**, 32 pages. [Publisher](https://doi.org/10.1145/3704847), [author PDF](https://research.ralfj.de/papers/2025-popl-itree-program-logic.pdf), [artifact](https://doi.org/10.5281/zenodo.14180355). Saved: `/hdd1/sichanghe/paper_collection/Program Logics à la Carte, Max Vistrup, Michael Sammler, Ralf Jung, POPL, 2025/paper.pdf`.

**Human input.** “A language designer” (§1, p.11:2) selects reusable descriptions and proof rules for effects: shared memory, thread scheduling, nondeterminism, failure, or termination. The human defines how the language's syntax uses them and proves language-specific rules. The framework composes these already justified pieces into a program logic; a program's desired assertions and its proofs remain human work. This is reuse of verified reasoning components, not an LLM or specification inference system.

**Guarantee and automation.** The Coq development proves soundness for the composed logic, including “both total and partial correctness” (§1, p.11:3). It relates interaction-tree semantics to operational semantics and gives a verified interpreter for HeapLang (§6). It reconstructs the Islaris logic for assembly traces against authoritative Armv8/RISC-V semantics (§7); that part establishes safety, including user-specified conditions on memory-mapped input/output. It does not report new production assembly programs verified, or a distributed liveness theorem. Composition gives generic rules and permits reuse of adequacy proofs; humans still establish the language-specific encodings and program proofs. Three axioms are declared (§1, p.11:3): Axiom K, a non-extensional choice axiom for the HeapLang correspondence, and equality of strongly bisimilar interaction trees.

**Numbers.** The Islaris semantic definition shrinks from “around 130 LOC” to “around 90 LOC”; proof size becomes “around 270 LOC instead of around 450 LOC” (§7, p.11:27). These compare a manually reconstructed logic to the original logic, not autonomous verification accuracy or end-user proof effort. No measured person-hours or benchmark pass rate is reported.

**Why it matters, inference.** A library of verified effects can reduce repeated work when an agent needs a logic for a new system. The human or agent must still decide which effects model the system, where concurrent operations are atomic, and whether it seeks safety or termination.

## Destabilizing Iris (Daenerys)

**Simon Spies, Niklas Mück, Haoyi Zeng, Michael Sammler, Andrea Lattuada, Peter Müller, Derek Dreyer; PACMPL 9, PLDI 2025, Article 181**, 25 pages. [Publisher](https://doi.org/10.1145/3729284), [open PDF](https://iris-project.org/pdfs/2025-pldi-daenerys.pdf), [project and appendix](https://plv.mpi-sws.org/iris-daenerys/), [Rocq source](https://gitlab.mpi-sws.org/iris/daenerys). Saved: `/hdd1/sichanghe/paper_collection/Destabilizing Iris, Simon Spies, Niklas Mück, Haoyi Zeng, et al., PLDI, 2025/paper.pdf`.

**Human input.** People provide programs, ownership assertions, function specifications, and interactive Rocq proofs. They can write assertions referring directly to deterministic, terminating, read-only program expressions. This lets a specification use an existing checksum function without a duplicate mathematical checksum definition (§1–2). People still prove that expressions safely terminate and that the required ownership protects what the expressions read. For SMT assistance they “(manually) query the SMT solver Z3” (§1.2, p.181:5), supply the first-order formula, and assume its result in Rocq. The automatic conversion between Rocq and SMT is explicitly outside the work's scope (§5.2, p.181:17).

**Guarantee and automation.** The Rocq development establishes the modified logic and the sound connection from first-order results to assertions about heap-reading expressions (Theorem 5.5). The main program logic proves safety/partial correctness; its read-only evaluation assertions also establish termination of those expressions. It gives code-level proofs for a defined ML-like language, not a deployed Redis binary. Examples include a concurrent channel and checksum exchange, popcount, a priority bitmap, linked-list updates, and a polymorphic hashmap (§6). The linked-list work progresses from “memory safety” (§6, p.181:20) to preserving length and updating the intended element. Selected typing obligations and arithmetic/bitvector formulas are automatic, but resource reasoning and specifications remain human. Z3 is trusted for the externally obtained arithmetic results (§1.2 and §5.2); the foundational proof of the translation does not turn Z3 into a verified solver.

**Numbers.** The earlier RefinedC bitmap proof required “around 300 lines” of manual bitvector reasoning. Daenerys proves “not a single lemma” about bitvectors manually (§6, p.181:20), while admitting substantial conversion boilerplate. Porting the existing Iris examples took “at most a few hours” each (§6, p.181:21). These are the authors' implementation comparisons and reported porting effort, not controlled measurements of agent performance. No measured solver runtime accompanies the informal description that Z3 handles the popcount formula quickly.

**Why it matters, inference.** Code can supply parts of a specification without duplicating its mathematical meaning, provided the system proves the expression's safety, determinism, termination, and protected reads. That is useful for progressively strengthening a specification, but does not establish that the programmer chose the right requirement.

## Concrete problem records

The paper sections above contain each record's quote anchors, authors, source links, and reported numbers; unstated effort is left unstated. Reference implementations and semantic definitions are distinguished from deployed code.

| Problem | Guarantee and verification target | Tool and source |
|---|---|---|
| state increment; division/exception handling | final state grows; specified result/exception behavior, for interpreted F★ programs | F★/Z3; *For Free* §2.1–2.7; [source](https://github.com/FStarLang/FStar); size/effort unstated |
| nondeterministic Pythagorean search | every produced triple satisfies the equation; results selected from 1–10; no completeness claim | F★ and Coq; *For All* §3.4; [examples](https://github.com/FStarLang/FStar/tree/dm4all/examples/dm4all); size/effort unstated |
| input duplication and restoring state after I/O | prescribed output trace and restoration of the initial state | F★ and Coq; *For All* §3.4; [Coq source](https://gitlab.inria.fr/kmaillar/dijkstra-monads-for-all); size/effort unstated |
| Fibonacci | terminating recursive computation under supplied well-founded order | Coq; *For All* §6.2; same Coq source; size/effort unstated |
| square-root loop | terminates correctly for squares; diverges otherwise, for IMP reference semantics | Coq; *Forever* §6.2; [library](https://github.com/DeepSpec/InteractionTrees); size/effort unstated |
| Boolean query loop | exact terminating/diverging trace characterization, conditional on environment replies | Coq; *Forever* §9.1–9.3; same library; size/effort unstated |
| stream of multiples | infinite ordered output after input, with initial-state assumptions | Coq; *Forever* §9.4; same library; size/effort unstated |
| HeapLang interpreter and reconstructed logic | safety and optional termination; correspondence of defined semantics | Coq/Iris; *à la Carte* §6; [artifact](https://doi.org/10.5281/zenodo.14180355); size/effort unstated |
| reconstructed Islaris logic | no stuck executions and stated MMIO safety for assembly semantic traces; no new assembly-program case claimed | Coq/Iris; *à la Carte* §7; same artifact; semantic/proof sizes reported above |
| checksum exchange, linked-list update, hashmap | assertions hold and accesses are safe in the paper's ML-like language | Rocq/Daenerys; §6; [source](https://gitlab.mpi-sws.org/iris/daenerys); size/effort unstated |
| popcount and priority bitmap | correct bitvector computation; formula checked using trusted Z3 | Rocq/Daenerys/Z3; §6; same source; earlier 300-line comparison reported above |
| barrier, reader-writer lock, spinlock and logical-relation ports | previously specified Iris properties retained in Daenerys; the paper does not claim new distributed liveness guarantees | Rocq/Daenerys; §6 group 5; same source; porting effort reported above |

Aragog, Hydra, and D3S are absent from `0[1-9]_*.md` under their names. Ellsberg's related-work discussion points to them; this is a focused expansion of those omissions. Full texts were read and three openly available PDFs saved, with `%PDF` headers checked. These are runtime monitors built around human specifications, rather than agent systems that create specifications or universal proofs.

## Aragog: Scalable Runtime Verification of Shardable Networked Systems

Nofel Yaseen, Behnaz Arzani, Ryan Beckett, Selim Ciraci, Vincent Liu; OSDI 2020, pp.701–718. [Paper](https://www.usenix.org/system/files/osdi20-yaseen.pdf), [source and example artifact](https://github.com/microsoft/aragog). Full paper and artifact appendix read (18 proceedings pages plus USENIX cover).

**Human input and automation.** Operators define binary event layouts in JSON and write regex-like patterns for sequences that violate invariants, with grouping keys, event filters, values, locations, and deadlines. Network-function developers instrument relevant state changes. The input is explicit: “event definitions and Invariant Violation (IV) specifications” (§5, p.704). Understanding how the system can fail remains human work. Aragog automatically translates these inputs to symbolic automata, uses Z3 to reason about event predicates, generates local automata that suppress irrelevant events, and distributes remaining checks through Kafka/Flink. Humans specify grouping; the tool then partitions by those keys. No requirements inference, LLM, or proof of the deployed network function is involved.

**Checked guarantee and assumptions.** Aragog matches bad patterns in **real running-code event streams or recorded production traces**, such as two active primaries for one NAT flow, opening a TCP flow before consensus, mistimed expiry, and firewall traffic not initiated internally (§§5–7). A deadline can encode failure to respond within a bound; this is finite timed monitoring, not proof of eventual response under unbounded scheduling. The event-suppression criterion has a formal definition (§6.2); the paper supplies algorithms, not a machine-checked proof of the full monitor or monitored system. Its runtime must order events accurately. Bounded event delays and synchronized clocks underpin correct ordering; sampling can miss unsampled flows. Late/missing events and verifier/system failures can produce false alarms or misses; the system flags potential desynchronization after the fact (§7.3). Production NAT traces were time-corrected offline because that deployment lacked fine clock synchronization (§9, p.711). Thus the production evidence is not a demonstrated always-precise synchronized online deployment.

**Concrete cases and numbers.** Table 1 (p.711) gives eight NAT policies at 5–14 specification lines each, three firewall policies at 4–6 lines, and two illustrative DHCP policies at 6 lines. Their automata have 2–6 states and 4–18 transitions. NATGW itself exceeds 40,000 lines (§3); Aragog is over 6,500 Java plus 2,000 C++ lines (§8), with person-hours unstated. Two 30-minute NAT traces cover seven flow deciders and 23.7M/9.0M packets (§9). Aragog identified “four bugs in the NAT gateway” (§9, p.712), confirmed by its operators. Table 2 reports per-policy occurrences, not separate bugs: timeout failures 1/45,019, inappropriate primary timeout 1/29,964, failure to reestablish consensus 536/259, handshake timeout 0/2,697 in old/new versions. One old-version expiry violation reflected the system's intended eventual consistency; it prompted another policy, illustrating that a violation requires interpretation against the actual contract.

A single verifier task slot processed over 500,000 events/s for one policy and over 30,000 for eight (§9.2). Firewall violation detection median was about 70 ms (§9.3); the introductory production-oriented claim is approximately 100 ms (§1). Table 4 aggregates policy-event processing: 189M→92.9M→70.2M old-version and 72.2M→36.7M→28.0M new-version events after filtering/suppression. These totals multiply event work across policies and differ from unique packets. The author calls the approach “sans proof-of-correctness” (§10, p.714). **Inference for the brief:** useful evaluation tasks should include wrong event schemas, missed instrumentation, clock/delay assumption violations, and legitimate eventual consistency, not merely whether a regex compiler accepts a property.

## Hydra: Effective Runtime Network Verification

Sundararajan Renganathan, Benny Rubin, Hyojoon Kim, Pier Luigi Ventre, Carmelo Cascone, Daniele Moro, Charles Chan, Nick McKeown, Nate Foster; SIGCOMM 2023, 13 pages. [DOI](https://doi.org/10.1145/3603269.3604856), [open author PDF](https://www.cs.cornell.edu/~jnfoster/papers/hydra.pdf). The full conference paper was read. Its cited long-version URL `hydra-tr.pdf` returned 404; no usable Hydra source repository was located.

**Human input and automation.** Operators write imperative Indus monitor programs specifying what each packet should record at entry/every hop and what its final check should allow, reject, or report. They give a topology file “in which each switch is classified as an edge or non-edge switch” (§4.1, p.6). Humans map monitor header names to forwarding-code fields, supply control-plane rule tables, and link the generated P4 blocks at the correct places in the forwarding program; automatic linking remains future work (§4.2, p.7). The compiler automatically type-checks read/write permissions, allocates telemetry headers/registers/tables, unrolls bounded loops, and emits switch-specific P4. The implementation is about 2,500 OCaml lines (§4). No autonomous specification discovery or agent prompting is evaluated.

**What is proved or enforced.** Theorem 3.1 and Corollary 3.2 (§3.3, p.6) give a mathematical induction argument that finite-trace temporal-logic formulas can be expressed by Indus. This is a language expressiveness result, not a universal proof of an actual network or compiler. Deployed P4 monitors observe packet processing and reject/report violations at the last hop. Examples include tenant/VLAN isolation, allowed egress ports, finite-path loop detection, required waypoints/service chains, stateful firewall permissions, and source-route validity. These concern concrete packet safety; they do not prove unbounded network liveness or delivery. The compiler uses fixed-size arrays; general infinite-loop detection needs maximum-path enforcement or periodic checking (§3.2, p.5). Correct instrumentation, monitor code, hardware execution, and control-rule correspondence remain assumptions.

**Numbers and concrete findings.** Eleven properties in Table 1 (p.11) use 14–64 Indus lines, generating 102–211 P4 lines. The Aether forwarding baseline uses 12 stages and 44.53% packet-header-vector capacity; separately linked checkers use 11–12 stages and 46.09–52.14%. The application-filter check changes utilization from 44.53% to 52.14%, a 7.61 **percentage-point** increase, not 7.61% relative overhead. The source-routing case has four switches and uses two telemetry bits in the simplified leaf/spine check (§5.1, p.8); manually injected invalid routes were rejected. The Aether case **confirms a known bug**: changing a shared application rule reassigns an application identifier for an existing client's traffic, but the client-specific permission table retains the old identifier, so allowed packets are dropped (§5.2, pp.8–10). Do not count this as discovering an unknown production bug.

Experiments replay approximately 350K anonymized campus packets/s and compare throughput at “around 20 Gb/s” (§6.2, p.11). The setup could not saturate the reported switch throughput limit, so it does not empirically establish maximum-rate scalability. Under 10 Gb/s UDP background load, ping every 0.2 s and a t-test found no significant RTT difference with checkers; the paper supplies no numeric effect bound or p-value (§6.2). **Inference for the brief:** compiling an audited monitor from a readable human specification can check and sometimes prevent actual packet violations, but the finite-trace expressiveness theorem does not establish specification adequacy, code refinement, or eventual delivery.

## D3S: Debugging Deployed Distributed Systems

Xuezheng Liu, Zhenyu Guo, Xi Wang, Feibo Chen, Xiaochen Lian, Jian Tang, Ming Wu, M. Frans Kaashoek, Zheng Zhang; NSDI 2008, pp.423–437. [Paper and presentation](https://www.usenix.org/conference/nsdi-08/d3s-debugging-deployed-distributed-systems), [open PDF](https://www.usenix.org/legacy/events/nsdi08/tech/full_papers/liu_xuezheng/liu_xuezheng.pdf). All 15 pages read. No public source repository was established. The PDF includes Kaashoek although current USENIX metadata omits him; author list here follows the paper.

**Human input and automation.** Developers write sequential C++ predicates over global snapshots, an acyclic computation graph, hooks naming functions/state to expose, partition keys, and optionally incremental updates, sampling, timeout/stability rules. D3S compiles/injects state-exporting and checking libraries into running Windows programs using binary instrumentation; it automatically timestamps messages, constructs snapshots, distributes/replays checking work, and reports violating state histories (§§2–4). Humans must choose useful properties: “depends on whether or not we have useful predicates to check” (§5.6, p.435). Predicates use a finite window of snapshots, so they cannot prove arbitrary infinite-run liveness. Progress alarms require a human timeout plus stability condition (§2.6, p.427).

**Checked scope and accuracy.** This checks **observed running code**, including internal state, rather than proving an abstract protocol or an implementation refinement theorem. Snapshot correctness depends on correct process membership from a failure detector. Incorrect membership produces false positives/negatives; waiting longer trades alert delay for accuracy (§3.4). Starting instrumentation mid-execution can miss earlier relevant state (§2.2). Sampling deliberately risks missed violations. For one cluster case the authors observed message delay below 350 ms, heartbeat every 1 s, and chose 2 s buffering (§3.4); these are environment-specific assumptions, not universal synchrony guarantees.

**Numbers and cases.** Table 1 (p.431) evaluates “5 deployed systems” (abstract, p.423): PacificA 67,263 code/118 predicate lines, three correctness bugs; MPS Paxos 6,993/50 lines, two correctness bugs; web search 26,036/81 lines, one performance issue; i3-Chord 7,640/72 lines, availability/consistency observations; libtorrent 36,117/210 lines, two performance bugs and free-rider detection. Results were gathered within one month (§5), without person-hour estimates. PacificA's concrete failure creates two primaries after a coordinator crashes before flushing a promotion record; a five-node MPS case remains stuck promoting because it contacts only a learning node (§§5.1–5.2). Successful command-history checks during days of testing are observations, not proof of Paxos liveness. Chord tests use 85 nodes on seven servers, crash 70%, and sample 256 keys; aggregate range coverage can hide simultaneous gaps/overlaps (§5.4). The libtorrent case uses 57 peers on eight machines and reveals duplicate peers and deterministic piece choices (§5.5).

The reported runtime overhead is “less than 8%” (abstract, p.423); in measured search/BitTorrent cases it is below 2%, and average exposed-state I/O below 0.5% for PacificA (§6). The overhead claim concerns those implementations/workloads; it does not imply arbitrary predicates are cheap. **Inference for the brief:** independent global-state checks and targeted instrumentation can find implementation defects outside a proved protocol core, but humans still determine the monitored contract and what facts must be exposed.

| case | promise checked, tool and authors | size / effort and source |
|---|---|---|
| Azure NATGW / distributed firewall | runtime bad-event patterns, including unique primary, timeout and flow permissions; Aragog, Yaseen et al. | 8 NAT policies, 5–14 lines each; four confirmed NAT bugs; person-hours unstated; [paper](https://www.usenix.org/system/files/osdi20-yaseen.pdf), [source](https://github.com/microsoft/aragog) |
| Aether application filtering / source routes | allowed traffic must not be dropped, forbidden routes rejected; Hydra, Renganathan et al. | 64-line application checker; injected source-route error and known Aether bug confirmed; person-hours unstated; [paper](https://www.cs.cornell.edu/~jnfoster/papers/hydra.pdf), source unavailable |
| PacificA and MPS Paxos | observed primary uniqueness, equal command sequences, timed progress-state alarms; D3S, Liu et al. | 118/50 predicate lines; 3/2 correctness bugs; person-hours unstated; [paper](https://www.usenix.org/legacy/events/nsdi08/tech/full_papers/liu_xuezheng/liu_xuezheng.pdf), source unavailable |

Search gaps: Hydra's cited long proof appendix URL returns 404; Hydra and D3S source repositories were not established. None of these results was rerun. Related references were inspected for relevance, but generic network-debugging works were excluded as directed; this expansion stops at Aragog, Hydra, and D3S.
