# Solvent: liquidity verification of smart contracts
(authored by agents unless marked 🧑)
Tag: `bartoletti2024solvent`, [paper](http://arxiv.org/abs/2404.17864v3)

## problem and model

Solvent verifies liquidity properties of a purified Solidity fragment. Liquidity asks whether, from every reachable state satisfying a specified condition, specified users can perform a sequence of at most a fixed number of transactions that achieves a desired asset transfer. This differs from safety, liveness, and bounded liveness because it requires the existence of a suitable sequence performed by specified users; the bound is a parameter, not a quantified variable. The authors explain: “There are two key points in this notion: the user wants to be able to constrain who can perform these actions, and how many actions are needed [32].” (Section 1, p. 2)

Solvent encodes a contract and user properties into SMT constraints, then uses bounded model checking and predicate abstraction with Z3 or cvc5. Its output is either a proof of the property (unbounded or up to a trace bound), a shortest trace reaching a state that violates liquidity, or a timeout. Section 3 describes the violation case: “If so, it produces a counterexample, in the form of a sequence of transactions leading to a state where a required property cannot be satisfied.” (p. 3)

## technique 1: encode contract transitions into SMT

purpose and steps

The encoding represents contract state and transaction effects symbolically (Section 3, pp. 4–5):

1. Take a contract written in Solvent's purified Solidity fragment; automatic purification of arbitrary Solidity is not described.
2. For each method, introduce current-state, transaction, intermediate, and next-state variables.
3. Encode assignments and method effects as constraints tying next state to current state; use auxiliary variables for intermediate states (Section 3, p. 4).
4. Encode each `require` as an if-then-else: a failed condition reverts, so next-state variables equal current-state variables.
5. Express liquidity with universal quantification over users and existential quantification over transaction sequences of bounded length.
6. Negate the property and query the SMT solver. Unsatisfiability proves the property in the checked scope; satisfiability identifies a user and a state where no permitted bounded sequence achieves the required outcome. The counterexample trace reaches that state.

The crowdfunding example's `donor_wd` property quantifies every user `xa`; if the deadline has passed and the target is not reached, there must exist a one-transaction sequence signed by `xa` that increases that user's balance by at least their recorded donation (Listing 1, p. 4). Solvent finds a three-transition counterexample: constructor, a donation, then an adversarial `selfdestruct` that sends extra ether to the contract (Section 3, p. 5). The extra funds make `balance < target` false without setting `target_reached`, preventing refunds.

The fragment omits contract-to-contract calls, loops, and gas. It assumes transfers arrive at recipients without further calls or rejection. It also adds syntax for hashed timelock protocols, illustrated by a two-player lottery whose liquidity properties are verified up to transaction bounds (Appendices A.1–A.3, pp. 13–21).

Verus form (Inference: the paper is not about Verus)

Inference: represent a contract state as a Rust struct, transaction execution as a pure transition `spec fn`, and method preconditions/postconditions with `requires` and `ensures`. Encode a bounded transaction sequence with a recursive specification over a finite sequence. A loop that executes a concrete trace can use an `invariant` over balances and mappings. Verus does not provide Solidity's `msg.sender`, `block.number`, or adversarial Ethereum semantics automatically; those must be explicit state fields and assumptions.

## technique 2: property negation and replayable counterexamples

The negation of a liquidity property introduces an existential user and universal transaction and next-state variables. The solver seeks a user satisfying the antecedent for whom every assignment either fails to relate current and next states according to the transition constraints or fails the required asset-transfer consequence (Section 3, p. 5). Failed transition constraints are distinct from a valid transition that reverts. A satisfying result exposes a liquidity violation; the returned concrete trace reaches the offending state. The paper says these traces can be replayed in Ethereum, but automatic conversion to executable proofs of concept is future work (Section 6, p. 8). The authors repair `wdDonor` by replacing `balance < target` with `!target_reached`; they fix a remaining surplus-funds vulnerability by tracking `tot_donations` and adding a method that transfers the surplus to the owner after the deadline (Section 3, p. 5).

Inference: use this counterexample approach to diagnose business-logic bugs. In Verus, model the trace as a sequence of concrete states and prove each transition's postcondition; this establishes validity in that model, while a separate quantified lemma is needed for the universal liquidity claim.

## technique 3: bounded model checking plus predicate abstraction

Solvent uses bounded model checking to search transaction traces and predicate abstraction to prove properties (Section 6, p. 8); the paper does not detail the abstraction algorithm. In evaluation it marks a property as `✗(N)` when a shortest trace reaching a violation has length `N`, `X` when it proves all possible states, `X(N)` when it proves every trace of length at most `N`, and `?` on timeout (Section 4, p. 6). It evaluates 107 tasks from a common real-world Solidity benchmark, extended with liquidity properties, manually checked for ground truth. Setup uses a 3 GHz 64-bit Intel Xeon Gold 6136, 64 GB RAM, GNU/Linux x86_64, Z3 4.13.0 or cvc5 1.1.3-dev.152.701cd63ef, and a 400-second CPU limit per task (Section 4, p. 6).

The paper reports no inconsistent solver answers. For non-liquid properties, at least one solver finds a counterexample in all but two cases; liquid properties are proved only for some instances, though most are verified up to significant trace lengths. Payment splitter and Vesting wallet are difficult because their nonlinear behavior requires nonlinear integer arithmetic, which is undecidable and hard for SMT solvers (Section 4, p. 6). Table 1 gives only a subset of the 107 results (p. 7).

Verus form (Inference)

Inference: bounded traces can be modeled with a Verus `Seq<Transaction>` and a recursive `spec fn` for execution. A specification must distinguish the bound on the trace reaching a state from the bound on the user's withdrawal sequence. An `ensures` clause would need to state the quantified liquidity claim explicitly; a bound alone is insufficient. Unbounded verification needs an argument covering all relevant states. The paper supplies no Verus implementation or proof of this translation.

## what is proved, trusted, and measured

Proved by Solvent: encoded liquidity properties within the fragment, either for all symbolic states or for explicit trace bounds. Reported measurements: task outcomes, execution times, and counterexample lengths; the paper gives 107 tasks and a 400-second limit. It reports solver consistency against manually checked ground truth, but does not report an empirical replay-validation rate. The authors caution: "On the other hand, when Solvent states that a property holds, there is no guarantee that the property is preserved “as-is”." (Section 4, p. 6)

Inference: trusting these results requires trusting the language model, SMT encoding, solvers, and ground-truth classification. Applying proofs to actual Solidity additionally requires justifying the transfer assumptions and omitted calls, reentrancy, loops, and gas behavior. Section 6 (p. 8) illustrates a transfer to an owner contract that fails, preventing a subsequent payment to the user even though liquidity holds in the fragment.

Inference: for VL, the relevant idea is specifying whether a user can release resources through bounded actions. Solvent's property shape can guide a Rust/Verus transition model, but the paper does not establish its applicability or effectiveness for agent-written Rust. Counterexample traces and explicit bounded, unbounded, violation, and timeout results would make the scope of verification clearer.

## techniques for the catalog

- liquidity specification: express that designated users have a bounded transaction sequence to achieve a desired asset transfer from every reachable state
- SMT transition encoding: map methods, reverts, mappings, and intermediate states to constraints over current and next state
- negated-property diagnosis: solve the existential counterexample form and replay the returned transaction trace
- bounded checking with abstraction: combine bounded model checking for traces with predicate abstraction for proofs and report explicit bound or timeout statuses
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In our Solidity fragment, this property is true, since both transfers will succeed under the given hypotheses."): checked all paper text, study quotations, numbers, section and page references, technique steps, and model limitations; corrected the bound semantics, quotation attribution, counterexample explanation, references, solver version, and unsupported replay and Verus claims; did not run Solvent, inspect its implementation or external benchmark, or validate the proposed Verus model.
