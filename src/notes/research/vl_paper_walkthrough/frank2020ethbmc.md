# EthBMC: A Bounded Model Checker for Smart Contracts
(authored by agents unless marked 🧑)
Tag: `frank2020ethbmc`, [paper](https://www.usenix.org/system/files/sec20-frank.pdf)

## what is proved or measured
Inference: EthBMC symbolically executes EVM bytecode, encodes reachable states and attacker goals as SMT formulas, and asks a solver for concrete exploit transactions. Its claim is bounded model checking, not exhaustive unbounded verification. The authors state: “We present the design and implementation of E TH BMC, a bounded model checker based on symbolic execution which provides a precise model of the Ethereum network.” (§1, p.2757). The trusted base includes the EVM model, SMT solver, cryptographic collision assumptions, concrete validator, and the selected environment; gas, consensus, account creation, and unmodeled accounts are outside the model.

## technique: symbolic execution with an explicit attacker model
Inference: Use when a property can be expressed as a reachable EVM state plus a violation predicate. Initialize a symbolic world state, attacker and victim accounts, and a transaction chain. Execute bytecode breadth-first; fork at branches and retain stack, program counter, path constraints, and memory graph. At a halting state, add an attacker goal such as greater final balance, attacker-controlled call target, or `SELFDESTRUCT`. Ask an SMT solver for satisfiability; use its assignment as transactions, then replay them in a concrete offline execution. The paper says: “A satisfying assignment that both reaches a valid halting state and fulfills the attacker model, proves a vulnerability in the contract.” (§5, p.2765).

Inference: Verus can encode a bounded Rust execution relation as a recursive `spec fn` and prove that a counterexample trace satisfies a postcondition, using `requires`, `ensures`, loop invariants, and `assert`; Verus does not automatically explore paths or produce arbitrary transaction witnesses. The method fails to find bugs beyond configured transaction depth, loop count, or timeouts.

## technique: graph-based symbolic memory and memcopy
Inference: Use when byte-addressable calldata/execution memory, persistent storage, and copies make a flat array model imprecise. Represent each memory region as a modification graph with an initial node. Every write creates a node linked to its parent; reads traverse the graph. For 256-bit EVM words in byte memory, split into 32 bytes for writes and concatenate bytes for reads. Model `set∞` and `copy` nodes with the Theory-of-Memcopy extension to array logic. For a call, copy caller execution memory into callee calldata and copy return data back. The paper states: “We represent the memory as a graph representation, connecting different memory regions when we copy from one to the other.” (§3.3.2, p.2762).

Inference: a Verus encoding uses sequences/maps plus ghost state and a loop invariant relating each update node to the abstract memory; byte splitting needs explicit bounds. Verus ownership can enforce separation, but the paper's SMT array theory and solver completeness are not transferred. The model initializes storage and execution memory to zero; it does not model every EVM environmental behavior.

## technique: collision-aware Keccak encoding
Inference: Use when symbolic Keccak inputs would otherwise be replaced by unconstrained values. If all inputs are concrete, compute the hash. Otherwise record `(start address, length, memory node)` and add pairwise constraints. If lengths differ, assert hashes differ; if equal, build a nested ITE over byte equality: equal hashes require every corresponding byte equal, otherwise assert unequal. For symbolic lengths, use the fallback implication encoding. Constant-hash comparisons can be rejected as infeasible under the collision-resistance assumption. Algorithm 1's purpose is stated as: “We encode all possible pairs of keccak tuples using Algorithm 1.” (§4.6, p.2764).

Inference: in Verus, model Keccak behind a trusted specification boundary whose cryptographic contract is explicit; prove equal-input/equal-output consistency for a symbolic abstraction. Do not claim a proof of collision resistance from Verus arithmetic. The paper warns that a known preimage can invalidate the practical security conclusion.

## technique: inter-contract state exploration
Inference: Use when calls, `DELEGATECALL`, or `CALLCODE` transfer control and memory between contracts. Represent the world as `accounts: address → (balance, code, storage)`. On a call, instantiate the callee ASM, execute it to all halting states, fork the caller continuation for each result, and recursively continue through a transaction chain. Load callee code and storage from the configured blockchain environment. The authors report: “E TH BMC finishes analysis and correctly reports two ways to exploit the contract.” (§6.1, p.2767).

Inference: Verus can specify a transition system over contract states and prove an invariant across calls, but dynamic code loading and arbitrary recursion need explicit bounds and trusted models. EthBMC only treats accounts supplied or discovered during analysis as valid call targets.

## evidence, limits, and VL threat
Inference: The implementation is about 13,000 lines of Rust (§1, §5). In the December 2018 scan, 2,193,697 unique accounts were analyzed on a cluster; the complete run took about 3.5 months, roughly 39 CPU-years (§6.2). With three-transaction depth, one loop iteration, 30-minute analysis timeout, two-minute SMT timeout, 10,000 storage variables, and 256-byte memcopy limit, the final scan reported 4,301 vulnerable active contracts: 2,708 Ether-stealing, 97 control-flow hijack, and 1,924 suicidal (categories overlap). It generated 5,905 unique exploits; 1,989 were suicidal. On 10,000 sampled contracts, 5,577 solved within 5 seconds, 7,583 within 10 seconds, 8,471 within two minutes, and 9,031 within 30 minutes. In ablation over the teEther set, enabling memory, Keccak, and calls raised total findings from 2,709 baseline to 2,725, 2,803, and 2,856 respectively; percentages are relative to the preceding row. On 10,000 sampled solver queries from 1,161,498 unique queries, Yices2 was fastest; the authors report anecdotal evidence that switching from Z3 to Yices2 cut analysis time by a third.

Inference: the threat to VL is methodological: agent-written verified Rust needs an explicit environment and attack model, because proving a local contract does not prove behavior under calls, mutable byte memory, or cryptographic abstractions. VL should reuse bounded counterexample traces, memory graph invariants, and solver diversity; it should not redo EthBMC's Ethereum scan. The paper's boundedness and environment restrictions leave deep multi-transaction bugs and unknown accounts unexamined.

## techniques for the catalog
- Inference: bounded symbolic execution — fork EVM paths, encode attacker goals, and extract concrete satisfying transactions
- Inference: modification-graph memory — represent writes and cross-region copies as linked symbolic nodes
- Inference: memcopy-aware array constraints — model byte copies and sets with Theory-of-Memcopy operations
- Inference: collision-aware Keccak encoding — constrain equal hashes through equal memory bytes and reject unequal inputs
- Inference: inter-contract forking — execute callee states and continue each caller path over a bounded transaction chain
- Inference: solver comparison — sample generated SMT queries and choose a backend empirically
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We utilize the Theory-of-Memcopy introduced by Falke et al. [18] to implement these operations efficiently."): checked the symbolic execution, attacker model, memory graph, memcopy, Keccak, inter-contract handling, validation, evaluation numbers, limits, and solver comparison; corrected the solver comparison wording; did not check the cited external tools or references beyond the paper.
