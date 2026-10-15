# Foundational Verification of Smart Contracts through Verified Compilation
(authored by agents unless marked 🧑)
Tag: `sjoberg2024foundational`, [paper](http://arxiv.org/abs/2405.08348v1)

## system and trust boundary

The paper presents DeepSEA, a small verification-oriented language, a verified compiler, and Coq specifications tied to Ethereum execution. Its central claim is: “The DeepSEA compiler is implemented and verified in Coq, and the correctness theorem is internalized so one can check a theorem inside Coq that a particular smart contract specification is implemented by a given bytecode.” (Section 1, p. 2.) The compiler emits EVM bytecode and a formal model that can be loaded into Coq (Section 1, p. 2).

Inference: The end-to-end method is to make the source language small enough to verify, generate a mathematical state model from source, prove source properties in that model, and prove a simulation from the model through intermediate languages to EVM semantics. This avoids treating an unverified verification-condition generator as trusted. The frontend `dsc` remains unverified, but it generates ASTs and Coq proofs connecting source layers; the verified compiler checks the generated artifacts (Section 4, p. 11).

## technique 1: write modular contracts with generated specifications

Inference: Use this when a contract needs reusable proofs over persistent state. Organize code as objects grouped into layers, optionally refine a layer with a simpler manually written specification, and attach an invariant to each object or layer. The paper says, “Programs are structured to enable modular verification, inspired by previous work on large program verification.” (Section 2, p. 3.)

The token example declares a layer invariant requiring nonnegative balances and a sum equal to total supply, then defines a typed object interface and methods (Section 2.1, pp. 3–4). The compiler generates a Coq state record with mathematical maps and a monadic specification. For `transfer`, the generated specification reads the caller and balances, guards the precondition that sender and recipient differ and the sender has enough tokens, updates both balances, and returns true (Section 2.2, pp. 4–5).

Inference: Apply this in Verus by placing executable Rust state in a struct, expressing the contract as `requires`/`ensures` on methods, and defining a `spec fn` for the layer invariant. Proof functions can establish invariant preservation for each method. The generated specification idea is transferable, but automatic source-to-spec generation is not a built-in Verus feature; it would need a generator or handwritten model.

## technique 2: reason over ideal mathematical data and discharge representation side conditions

DeepSEA represents maps with Coq trees and bounded machine values with unbounded mathematical integers in specifications. The paper explains: “The executable code still cannot make use of the keys, but theorems about the code can talk about them.” (Section 2.2, p. 5.) It separately generates side conditions proving no overflow before relying on mathematical arithmetic (Section 2.2, p. 5).

Inference: This is a practical proof decomposition. First prove functional properties over ideal maps and integers. Then prove that concrete arrays, bounded words, hashes, and layout operations represent those ideals and satisfy range conditions. In Verus, use mathematical sequences/maps in `spec fn`s and prove bounds with arithmetic lemmas, while executable Rust uses fixed-width integers. A proof that omits the representation relation only proves the ideal model.

The token theorem illustrates the shape: if evaluating `Tok_transfer_opt` succeeds from state `d` to `d'`, then `balances_sum d' = balances_sum d` (Section 2.2, p. 6). Inference: a corresponding Verus contract would state success in `ensures` and preserve a ghost/model sum, with the concrete map update linked by a representation invariant.

## technique 3: prove temporal and state-transition properties with an explicit environment model

Inference: Use this when correctness depends on sequences of calls, users, balances, block numbers, or reachability. DeepSEA itself does not model blockchain interactions; the user defines a step relation over contract and environment state, then defines reachability from an initial state (Section 3.2.2, p. 10). The crowdfunding proof decomposes refund safety into three lemmas: contract balance covers recorded donations, expired unsuccessful campaigns permit withdrawal, and recorded balances change only on valid deposit/withdrawal (Section 3.2.2, pp. 9–10).

The first lemma defines `balance_backed` over every reachable state and proves it by induction on `ReachableFromBy`, handling each blockchain action (Section 3.2.2, p. 10). The third uses a temporal predicate: “in all states since a donation is recorded, that donation remains recorded as long as all intermediate states do not involve a claim from the donor.” (Section 3.2.2, p. 11.)

Inference: In Verus, encode the environment as a state-machine ghost model, define transitions and a reachability invariant, and prove each transition preserves it. Use a temporal history or an inductive ghost relation for “since/as-long-as” claims. This is an inference because the paper uses Coq relations rather than Verus state-machine syntax.

## technique 4: verify a realistic mathematical contract property

The DeepSEA case study implements a Uniswap-style constant-product market maker with layered ERC20 dependencies. Its `simpleSwap0` computes input amount, fee-adjusted numerator and denominator, output amount, transfers the output token, and updates reserves (Section 3.1.1, pp. 6–8). The authors prove a lower bound on the cost of manipulating the reported price, connecting the theorem's parameters directly to generated bytecode (Section 3.1.2, p. 8).

The theorem is conditional on a successful swap and states, for `eps >= 0`, that manipulation cost is at least either `reserve_beta * (5/100) * sqrt(eps)` or `reserve_beta * (1/48) * eps^2` (Section 3.1.2, p. 8). The proof relies on Taylor-series results and Coq-interval and Coquelicot libraries (Section 3.1.2, p. 8).

Inference: For VL, this demonstrates that verified Rust can connect an implementation-level contract to nontrivial domain mathematics, but the mathematical library and theorem assumptions become trusted dependencies unless proved in the same foundation. A Verus version would keep the arithmetic model in `spec fn`s and use lemmas for monotonicity and bounds; real-number analysis may require axiomatized or separately verified libraries.

## technique 5: prove compiler correctness by layered forward simulation

Inference: Use a sequence of small intermediate languages, each with a semantics and a simulation theorem, instead of proving source-to-bytecode correctness in one step. DeepSEA translates source through MiniC and a backend of intermediate representations ending at a formal EVM semantics. The backend's per-pass correctness proofs are forward simulations that compose (Section 4.3, p. 15).

The MiniC memory model uses extended identifiers—paths through globals, locals, fields, and array indices—instead of block offsets (Section 4.2.1, p. 12). This makes EVM storage hashes and source structures line up and distinguishes pointers to an aggregate from pointers to its first element (Section 4.2.1, p. 12). A datatype-representation relation connects mathematical Coq values to MiniC memory values recursively (Section 4.2.2, pp. 13–14).

Theorem 4.1 states that if a source command's verification condition holds, its specification reaches `t'`, and the initial source and MiniC states are related, then some gas amount and reachable MiniC state preserve the relation (Section 4.2.3, p. 14). The theorem separates runtime assertion failure, programmer-controlled overflow, and out-of-gas behavior (Section 4.2.3, pp. 14–15).

Inference: In Verus, use ghost relations between source-level abstract state and executable Rust/bytecode-like state, and prove each lowering function preserves the relation. Verus can check data-structure refinements and arithmetic conditions; it does not automatically prove EVM semantics, so an EVM model and its connection to deployed bytecode remain external work.

## technique 6: track gas and prove optimization correctness

The EVM backend's formal state includes code, storage, memory, stack, and gas. Its simulation relation requires the EVM gas plus source-side accumulated gas to equal a fixed gas limit (Section 4.3.9, pp. 21–23). Inference: this lets a functional safety theorem ignore gas while a separate relation still accounts for resource consumption.

DeepSEA's peephole optimizer replaces small bytecode sequences with cheaper observationally equivalent sequences using rewrite rules. Each rule has a rewrite definition and a `rule_correct` proof that the global environments coincide apart from gas; exhaustive application is justified by strict gas decrease and induction over individual rules (Section 4.4, pp. 23–24).

Inference: A Verus analogue would define an observational-equivalence `spec fn`, prove each local rewrite preserves it and decreases a gas-cost measure, then prove repeated rewriting terminates and preserves behavior. The exact EVM observation model is paper-specific and must be supplied.

## evidence, what remains trusted, and product threat

The paper reports two case studies. The crowdfunding Lemma 3.1 uses about 260 Coq tactic invocations, versus about 100 in Scilla and 55 in ConCert (Section 3.2.4, p. 11). The compiler has an 11,000-line unverified OCaml frontend and a 34,000-line verified Coq part (Section 4, p. 11). These denominators are source-line counts, not proof correctness probabilities.

The foundational proofs still trust the Coq kernel, formal EVM semantics, mathematical libraries, trusted primitives, and the user-supplied blockchain interaction model. The system's correctness does not prove that a contract specification captures the desired economic policy, nor that deployment matches the verified bytecode. Inference: agent-written verified Rust has the same threat: a sound proof can preserve a wrong contract, omit environment transitions, or rely on unproved foreign code. The paper's layered simulation, explicit representation relation, and side-condition generation are directly reusable defenses.

Inference: VL should reuse the source/model/compiler separation, explicit environment reachability, and representation-side-condition pattern. It should avoid assuming that a successful Verus proof covers compiler lowering, external calls, gas/resource behavior, or deployment unless those links are modeled and proved.

## techniques for the catalog

- foundational contract language: use a small modular language whose generated Coq/Verus model is the proof surface
- ideal-data refinement: prove functional properties over mathematical maps and integers, then discharge concrete representation and overflow side conditions
- environment reachability: define blockchain or system transitions explicitly and induct over reachable states for temporal properties
- layered compiler simulation: connect source, intermediate representations, and target semantics with composable forward simulations
- gas-aware optimization: prove local observational equivalence and strict cost decrease for exhaustive peephole rewrites
Checked 2026-10-15 against paper sjoberg2024foundational: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
