# Foundational Verification of Smart Contracts through Verified Compilation
(authored by agents unless marked 🧑)
Tag: `sjoberg2024foundational`, [paper](http://arxiv.org/abs/2405.08348v1)

## system and trust boundary

The paper presents DeepSEA, a small verification-oriented language, a verified compiler, and Coq specifications tied to Ethereum execution. Its central claim is: “The DeepSEA compiler is implemented and verified in Coq, and the correctness theorem is internalized so one can check a theorem inside Coq that a particular smart contract specification is implemented by a given bytecode.” (Section 1, p. 2.) The compiler emits EVM bytecode and a formal model that can be loaded into Coq (Section 1, p. 2).

Inference: The end-to-end method is to make the source language small enough to verify, generate a mathematical state model from source, prove source properties in that model, and prove a simulation from the model through intermediate languages to EVM semantics. The frontend `dsc` remains unverified; the generated proofs are checked in Coq. The paper states: “The user proofs are done with respect to that specification, and dsc generates a proof that the specification is refined by the bytecode, so although the dsc tool is not itself verified it is not in the trusted computing base.” (Section 4.1, p. 12.) This establishes the connection to the generated specification; it does not independently verify that `dsc` translates the intended surface program correctly.

## technique 1: write modular contracts with generated specifications

Inference: Use this when a contract needs reusable proofs over persistent state. Organize code as objects grouped into layers, optionally refine a layer with a simpler manually written specification, and attach an invariant to each object or layer. The paper says, “Programs are structured to enable modular verification, inspired by previous work on large program verification.” (Section 1, p. 2.) The authors qualify their experience with layers and refinement: “We have not used these features extensively in our current blockchain case studies, but we expect them to become relevant when verifying even larger smart contract applications.” (Section 2, p. 3.)

The token example declares a layer invariant requiring nonnegative balances and a sum equal to total supply, then defines a typed object interface and methods (Section 2.1, pp. 3–4). The compiler generates a Coq state record with mathematical maps and a monadic specification. For `transfer`, the generated specification reads the caller and balances, guards the precondition that sender and recipient differ and the sender has enough tokens, updates both balances, and returns true (Section 2.2, pp. 4–5).

Inference: Apply this in Verus by placing executable Rust state in a struct, expressing the contract as `requires`/`ensures` on methods, and defining a `spec fn` for the layer invariant. Proof functions can establish invariant preservation for each method. The generated specification idea is transferable, but automatic source-to-spec generation is not a built-in Verus feature; it would need a generator or handwritten model.

## technique 2: reason over ideal mathematical data and discharge representation side conditions

DeepSEA represents maps with Coq trees and bounded machine values with unbounded mathematical integers in specifications. The paper explains: “The executable code still cannot make use of the keys, but theorems about the code can talk about them.” (Section 2.2, pp. 5–6.) It adds: “Instead, the DeepSEA system generates a set of separate side conditions for the user to prove there is no overflow.” (Section 2.2, p. 6.)

Inference: This is a practical proof decomposition. First prove functional properties over ideal maps and integers. Then prove that concrete arrays, bounded words, hashes, and layout operations represent those ideals and satisfy range conditions. In Verus, use mathematical sequences/maps in `spec fn`s and prove bounds with arithmetic lemmas, while executable Rust uses fixed-width integers. A proof that omits the representation relation only proves the ideal model.

The token theorem illustrates the shape: if evaluating `Tok_transfer_opt` succeeds from state `d` to `d'`, then `balances_sum d' = balances_sum d` (Section 2.2, p. 6). Inference: a corresponding Verus contract would state success in `ensures` and preserve a ghost/model sum, with the concrete map update linked by a representation invariant.

## technique 3: prove temporal and state-transition properties with an explicit environment model

Inference: Use this when correctness depends on sequences of calls, users, balances, block numbers, or reachability. DeepSEA itself does not model blockchain interactions; the user defines a step relation over contract and environment state, then defines reachability from an initial state (Section 3.2.2, p. 10). The crowdfunding proof decomposes refund safety into three lemmas: contract balance covers recorded donations, expired unsuccessful campaigns permit withdrawal, and recorded balances change only on valid deposit/withdrawal (Section 3.2.2, pp. 9–10).

The first lemma defines a state predicate `balance_backed` and proves `Safe balance_backed` by induction on `ReachableFromBy`, handling each blockchain action. The balance bound in this predicate is conditional on the campaign not yet being funded: `Crowdfunding_funded (contract_state state) = false` (Section 3.2.2, p. 10). The third uses a temporal predicate: “in all states since a donation is recorded, that donation remains recorded as long as all intermediate states do not involve a claim from the donor.” (Section 3.2.2, p. 10.)

Inference: In Verus, encode the environment as a state-machine ghost model, define transitions and a reachability invariant, and prove each transition preserves it. Use a temporal history or an inductive ghost relation for “since/as-long-as” claims. This is an inference because the paper uses Coq relations rather than Verus state-machine syntax.

## technique 4: verify a realistic mathematical contract property

The DeepSEA case study implements a Uniswap-style constant-product market maker with layered ERC20 dependencies. Its `simpleSwap0` computes input amount, fee-adjusted numerator and denominator, output amount, transfers the output token, and updates reserves (Section 3.1.1, pp. 6–7). It is a simplified prototype: “The price oracle mechanism is based on Uniswap v1, and the DeepSEA contract does not support flash swaps.” (Section 3.1.1, p. 7.) The contract also omits protocol fees and uses a product rather than a square root for minted liquidity shares. The authors prove a lower bound on the cost of manipulating the reported price, connecting the theorem's parameters directly to generated bytecode (Section 3.1.2, p. 8).

The theorem is conditional on a successful swap and states, for `eps >= 0`, that manipulation cost is at least either `reserve_beta * (5/100) * sqrt(eps)` or `reserve_beta * (1/48) * eps^2` (Section 3.1.2, p. 8). The proof relies on Taylor-series results and Coq-interval and Coquelicot libraries (Section 3.1.2, p. 8).

Inference: For VL, this suggests a way to connect executable code to domain mathematics; the paper demonstrates it in Coq, not verified Rust. A Verus version could keep the arithmetic model in `spec fn`s and use lemmas for monotonicity and bounds. Real-number analysis would need suitable libraries and explicit treatment of any unproved assumptions.

## technique 5: prove compiler correctness by layered forward simulation

Inference: Use a sequence of small intermediate languages, each with a semantics and a simulation theorem, instead of proving source-to-bytecode correctness in one step. DeepSEA translates source through MiniC and a backend of intermediate representations ending at a formal EVM semantics. The backend's per-pass correctness proofs are forward simulations that compose (Section 4.3, p. 15).

The MiniC memory model uses extended identifiers—paths through globals, locals, fields, and array indices—instead of block offsets (Section 4.2.1, p. 12). This makes EVM storage hashes and source structures line up and distinguishes pointers to an aggregate from pointers to its first element (Section 4.2.1, p. 12). A datatype-representation relation connects mathematical Coq values to MiniC memory values recursively (Section 4.2.2, pp. 13–14).

Theorem 4.1 states that if a source command's verification condition holds, its specification succeeds and reaches `t'`, and the initial source and MiniC states are related, then some gas amount and reachable MiniC state preserve the relation (Section 4.2.3, p. 14). The surrounding discussion distinguishes assertion failures represented by `None`, overflow excluded by user-proved side conditions, and out-of-gas errors treated separately. It states: “When proving safety properties gas cost can be ignored, and indeed it is not part of the current generated specifications 𝑠 (𝑐).” (Section 4.2.3, p. 15.) The displayed theorem covers successful specification executions, so it alone does not state the assertion-failure case.

Inference: In Verus, use ghost relations between source-level abstract state and executable Rust/bytecode-like state, and prove each lowering function preserves the relation. Verus can check data-structure refinements and arithmetic conditions; it does not automatically prove EVM semantics, so an EVM model and its connection to deployed bytecode remain external work.

## technique 6: track gas and prove optimization correctness

The EVM backend's formal state includes code, storage, memory, stack, and gas. Earlier passes count consumed gas, with this bound: “The simulation relation for each phase specifies that the target code consumes at most as much gas as the sources.” (Section 4.3.1, p. 16.) At the final Methodical-to-EVM pass, the relation requires remaining EVM gas plus accumulated Methodical gas to equal a fixed gas limit (Section 4.3.9, p. 23). Inference: this lets a functional safety theorem ignore gas while a separate relation accounts for resource consumption; it does not supply an exact gas bound in the generated high-level specification.

DeepSEA's peephole optimizer replaces small bytecode sequences with cheaper observationally equivalent sequences using rewrite rules. The tool `ppltr` obtains rules from the SMT-based superoptimizer `ebso`; the rules are then proved again in Coq, including effects on state omitted from the SMT model. The authors report: “The practical solution is to extend the tool ppltr to generate Coq proofs with tactics.” (Section 4.4, p. 24.) Each rule has a rewrite definition and a `rule_correct` proof that the global environments coincide apart from gas; exhaustive application is justified by strict gas decrease and induction over individual rules (Section 4.4, pp. 23–24).

Inference: A Verus analogue would define an observational-equivalence `spec fn`, prove each local rewrite preserves it and decreases a gas-cost measure, then prove repeated rewriting terminates and preserves behavior. The exact EVM observation model is paper-specific and must be supplied.

## evidence, what remains trusted, and product threat

The paper reports two case studies. Its crowdfunding comparison says: “The proof of Lemma 3.1 uses about 260 Coq tactic invocations. The equivalent proof in Scilla uses about 100 (though is written in the terser mathcomp proof style). In ConCert, it is about 55.” (Section 3.2.4, p. 11.) These counts compare one lemma, not complete proof developments. The compiler has an 11,000-line unverified OCaml frontend and a 34,000-line verified Coq part excluding comments (Section 4, p. 11).

The backend uses symbolic hashes and assumes concrete hashing is injective: “In the final compiler phase we need an axiom (which is actually false, but "true enough") stating that the concrete Keccack hash function is injective.” (Section 4.3.1, p. 16.) The compiler also has an eWasm path, “but the eWasm path does not yet have a correctness proof.” (Section 4.3, p. 15.) The authors also limit the current scope: “Second, the verified compiler currently only deals with individual method calls, but we would like to extend the language semantics with a model of the full blockchain rather than leaving that model to the user as in Section 3.2.” (Section 6, p. 25.)

Inference: Confidence depends on Coq's proof checking, the adequacy of the formal EVM semantics and user-supplied environment model, and any axioms or trusted primitives used. A mathematical library proved within Coq need not be trusted separately from proof checking; its unproved assumptions still matter. The system's correctness does not itself establish that the chosen specification captures the desired economic policy or that a deployed artifact is the verified bytecode. Agent-written verified Rust faces analogous specification and environment risks.

Inference: VL should reuse the source/model/compiler separation, explicit environment reachability, and representation-side-condition pattern. It should avoid assuming that a successful Verus proof covers compiler lowering, external calls, gas/resource behavior, or deployment unless those links are modeled and proved.

## techniques for the catalog

- foundational contract language: use a small modular language whose generated Coq/Verus model is the proof surface
- ideal-data refinement: prove functional properties over mathematical maps and integers, then discharge concrete representation and overflow side conditions
- environment reachability: define blockchain or system transitions explicitly and induct over reachable states for temporal properties
- layered compiler simulation: connect source, intermediate representations, and target semantics with composable forward simulations
- gas-aware optimization: prove local observational equivalence and strict cost decrease for exhaustive peephole rewrites
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Finally, there is a correctness theorem proved in Coq which states that the command translation is correct with respect to desugaring if the verification conditions regarding data representation generated by dsc hold."): checked the entire paper text, study quotations, numbers, section and page references, technique steps, and trust limits; corrected references, frontend proof checking, crowdfunding conditions, prototype scope, successful-execution theorem scope, gas accounting, and library assumptions; added hash-injectivity, eWasm, and individual-call limitations; did not inspect implementation repositories, rerun Coq proofs, or validate proposed Verus adaptations. The paper identifies itself as arXiv:2405.08348v1, 14 May 2024 (p. 1), supporting the retained author/year tag and arXiv link.
