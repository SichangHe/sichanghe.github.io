# Formalising Decentralised Exchanges in Coq
(authored by agents unless marked 🧑)
Tag: `nielsen2023formalising`, [paper](https://doi.org/10.1145/3573105.3575685)

This paper gives a foundational Coq formalization of Dexter2, a three-contract decentralized exchange for Tezos. It models and extracts the main exchange and liquidity-token contracts, proves their functional correctness and inter-contract safety properties, and treats the traded-token implementation as external. The paper explicitly says: “In this work, we do not verify the token contract, since Dexter2 is designed to work with many different token contracts” (§3.1, p.6). The abstract states that the work “provide the first formalisation of a DeFi contract in a foundational proof assistant capturing contract interactions” (p.1), and that it includes “proofs of safety properties of the interacting smart contracts of a decentralized exchange” (p.1). The central reusable method is to prove small invariants for each contract and connect them through a theorem about messages crossing the contract boundary.

## techniques

### model actor-style contracts as executable functions

What it is: represent each contract by ConCert functions `init` and `receive`, with explicit chain context, call context, state, messages, and emitted actions. The paper gives the signatures `init : Chain → ContractCallContext → Setup → option State` and `receive : Chain → ContractCallContext → State → option Msg → option (State ∗ list ActionBody)` (§2.2, p.4). Actions include transfers, calls, and deployments; traces are the reflexive-transitive closure `ChainedList` of blockchain steps.

How to do it: define an inductive message type with one constructor per entrypoint; define a record state; implement each entrypoint as a pure Coq function returning `option` for failure; instantiate the execution-layer contract interface; reason over `ChainStep`/`ChainedList` traces. For Dexter2, the liquidity token state contains token balances, allowances, admin, and total supply; the main contract state contains token and tez pools, liquidity-token total, self-update flag, and addresses (§4.1.1–§4.1.2, pp.7–9).

Use option-monad operations to model runtime errors. Their `sub` checks `n < m` and returns `None` instead of an invalid subtraction; `div` checks a zero denominator (§4.1.2, p.9). This preserves the source contract’s failure behavior in a pure function.

Verus form (Inference): model each Rust contract or component as a state-transition function with an enum of messages and an explicit result/error type. Use Verus `requires`/`ensures` for entrypoint behavior and ghost state for traces. Inference: unlike Coq extraction, Verus verifies Rust directly and does not automatically model a blockchain runtime, so the trace semantics and message scheduler must be written and proved.

Evidence and limits: the authors model Dexter2 approximately but “believe faithfully” (§4.1, p.7). They omit the baker model and cannot fully prove `setBaker` functional correctness (§4.1.2, p.8). View callbacks require wrapper message types, restricting interoperability compared with CameLIGO (§4.1.1, p.8).

### prove entrypoint functional correctness

What it is: for every entrypoint, prove (1) state updates are correct, (2) emitted operations are correct, and (3) the necessary and sufficient conditions for successful execution hold (§4.3.1, p.10). Because entrypoints are ordinary Coq functions, custom tactics automate much of this proof.

How to do it: formalize the informal specification; state a theorem for each entrypoint’s state, action list, and success/failure conditions; unfold the implementation and discharge arithmetic, map, and option cases with tactics; record exceptions explicitly. The paper says it does not prove correct actions for `setBaker` or correct error messages because of ConCert limitations (§4.3.1, p.10).

Verus form (Inference): write one `ensures` clause per state field and emitted action, plus preconditions for successful execution and explicit error branches. Use `assert`, arithmetic lemmas, and map/set lemmas to prove the clauses. Preserve the paper’s separation between functional behavior of a single call and temporal invariants across calls.

The authors found mismatches between informal specification and implementation, including specification flaws that could have led to Dexter1-like vulnerabilities; developers confirmed the informal specification was incorrect (§4.3.1, p.10). This is evidence that formalization can expose specification errors, but it also makes the specification an independently reviewed artifact.

### modular inter-contract invariant proofs

What it is: prove single-contract invariants separately, then compose them using a general theorem connecting outgoing calls from one contract to incoming calls at another. The methodology is stated explicitly: “First, we implement contracts comprising Dexter2 as Coq functions using the ConCert infrastructure. For these functions, we verify functional correctness properties (properties of a single function call). Next, we state and prove single-contract invariants independently. After that, we connect the individual invariants through a theorem relating incoming and outgoing messages of the interacting contracts to prove inter-contract invariants.” (§4, p.7).

How to do it: (1) choose a relational proposition `P` over two contract states, balances, outgoing actions/transactions, and incoming calls; (2) express each contract’s state as a function of deployment information and calls; (3) prove local propositions `R` and `Q` with `contract_induction`; (4) show `R ∧ Q → P`; (5) use Theorem 1, `incomming_eq_outgoing`, relating executed incoming calls at B from A to executed outgoing calls from A to B in a reachable trace; queued actions are accounted for separately (§4.2, pp.9–10); (6) conclude the two-contract invariant without a direct low-level induction over all execution details.

Verus form (Inference): define ghost histories of calls and a global transition relation; prove each component’s local invariant by induction over its own transitions; prove a message-accounting lemma equating sends and receives; combine local invariants into a global `ensures` property. Verus has no Coq `contract_induction` tactic, so induction and history bookkeeping must be encoded with ghost state, recursive lemmas, or loop invariants.

### prove concrete safety properties

The paper proves `contract_balance_correct`: with zero tez supplied on deployment and no pending outgoing transactions, the main contract’s `xtzPool` equals its actual balance (Theorem 2, p.11). The proof first establishes a stronger invariant equating the pool with balance minus pending transfers by induction on traces; the stated theorem follows when the queue is empty. It then proves the contract never transfers more tez than it owns.

For liquidity supply, the paper specifies an interface condition for any compatible token: actual supply equals initial supply plus minted tokens minus burned tokens (Definition 1, pp.11–12). Theorem 4 proves the main contract’s counter equals its initial value plus the corresponding executed and queued messages; Theorem 3 combines Theorem 4, the interface condition, and Theorem 1 to conclude `lM = lL` when the contracts are correctly paired, initial supplies match, and no calls from the main contract to the liquidity token remain pending (pp.12–13). This abstraction lets the main-contract proof apply to any token implementation satisfying the interface.

Verus form (Inference): encode balances, counters, and pending actions as ghost/spec sequences or maps; prove a stronger pending-transfer invariant first; derive the empty-queue theorem as a corollary. Represent the token interface as a trait with specification functions and prove the main contract against trait contracts, while separately proving the concrete token satisfies the interface.

### verified extraction with audited remapping

What it is: use MetaCoq’s verified erasure and ConCert’s certified transformations to extract executable CameLIGO. The pipeline runs inside Coq, remaps blockchain primitives and arithmetic, and prints target-language source. The authors stress that “The important feature of the extraction functionality provided by ConCert is the ability to run the whole extraction pipeline inside Coq” (§4.4, p.14).

How to do it: (1) erase computationally irrelevant CIC parts to `λ□`; (2) retain typing information as `λT□`; (3) apply proof-producing inlining and certified optimizations; (4) provide an explicit remapping table for arithmetic, finite maps, and blockchain context; (5) supply a hand-written target prelude implementing each remapped primitive; (6) pretty-print CameLIGO; (7) compile to Michelson. The prelude must preserve Coq’s truncated natural subtraction and partial division semantics; the paper defines `subNTruncated` and `divN_opt` to avoid mismatches (§4.4, pp.13–14).

Verus form (Inference): Verus compiles verified Rust directly, so the Coq extraction pipeline does not carry over. The analogous technique is to audit any FFI, `external_body`, integer conversion, serialization, and runtime-wrapper boundary against the specification, and to test that generated deployment code preserves the verified model.

## evidence and trusted boundary

The artifact is approximately 5K lines of Coq implementation, proofs, and communication machinery (Contributions, pp.2–3). The paper reports functional-correctness proofs and two machine-checked inter-contract safety properties, but gives no aggregate proof-count, runtime, or coverage denominator. The paper describes a small trusted base involving Coq, MetaCoq, and target-language pretty-printers (§2.2, p.4), with remapping tables and the hand-written prelude enlarging it (§4.4, p.14). MetaCoq’s erasure and ConCert’s certified transformations provide proofs for specific extraction steps (§2.3, p.5); they do not prove every target-runtime boundary. Inference: the ConCert execution model must match the deployed blockchain, and runtime primitives, CameLIGO-to-Michelson compilation, and intended requirements remain outside the demonstrated contract proofs. The paper says: “Note that remapping enhances the trusted computing base. Therefore, it has to be done clearly and should be easy to audit.” (§4.4, p.14).

Inference: the work supplies a message-passing DEX methodology, modular cross-contract invariants, and verified extraction. VL should not redo these ideas as isolated single-function checks. Inference: for agent-written verified Rust, the main product threat is an incomplete protocol model or an unsound boundary conversion, not merely a failed local proof. Require explicit trace/state models, interface invariants, pending-action accounting, and review of all remapping/FFI code. The paper’s approximated model, FA2-only main-contract communication (§4.1.2, p.8), omitted baker behavior, and unproved error-message correctness limit the result. The execution model is independent of call order unless further assumptions are added, even though Tezos uses depth-first calls (§2.2, p.4).

## techniques for the catalog

- actor-contract modeling — encode initialization, message-driven receive functions, state, actions, and execution traces
- option-based failure modeling — represent runtime errors with checked partial operations returning `option`
- entrypoint functional correctness — prove state, emitted operations, and success conditions for each call
- modular interaction invariants — prove local invariants and compose them through incoming/outgoing message equality
- interface-parametric safety — state token conditions once and instantiate them for any implementation satisfying the interface
- pending-action strengthening — prove balance/counter relations including queued actions, then derive empty-queue theorems
- audited verified extraction — erase and optimize inside the proof assistant with explicit arithmetic and runtime remappings

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "However, inducting over chain traces usually gives long and complex proofs even for simple properties, because we have to deal with weak types, (de)serialization, and low-level details of contracts execution."): read the entire supplied 17-page paper text, including references, and the entire study; compared quotations, theorem conditions, page references, and technique steps; corrected quoted wording, the initial-balance condition, pairing and pending-message conditions, extracted-contract scope, and trusted-boundary wording, and distinguished inference from paper results; did not run Coq, inspect artifact source, reproduce extraction, validate cited papers, or visually inspect PDF figures.
