# All Your Tokens are Belong to Us: Demystifying Address Verification Vulnerabilities in Solidity Smart Contracts
(authored by agents unless marked 🧑)
Tag: `sun2024tokens`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/sun-tianle)

## problem and threat model

The paper studies address verification vulnerabilities in Ethereum smart contracts. A contract accepts an address parameter, performs an insufficient whitelist or authorization check, uses that address as the target of an external call, and then updates on-chain state based on the call’s return value. An attacker can deploy a malicious contract at the passed address, control the external call and its return value, and obtain tokens or another state change without satisfying the intended authorization. The paper summarizes the three conditions as: “P1 The vulnerable function takes an address as a parameter, and performs insufficient authorization examination on that address.”, “P2 The address in P1 is taken as the target of an external call.”, and “P3 On-chain states that are control-flow dependent on the return value mentioned in P2 are updated.” (Sect. 3.1, p. 3570)

AVVERIFIER is a static taint analyzer that simulates EVM opcodes, tracks stack/memory/storage state and taint, and then applies a three-phase detector. It analyzes bytecode, not Solidity source. The authors claim: “We design and implement AVV ERIFIER, a lightweight taint analyzer based on static EVM opcode simulation.” (Abstract, p. 3567)

The threat model gives an attacker no special privilege: any account can send transactions, deploy contracts, and call deployed contracts with enough gas. The attacker cannot break Ethereum integrity, alter block generation, or access legitimate private keys (Sect. 2.4, p. 3569). Inference: the detector is a bug finder, not a formal proof that an unreported contract is safe.

## technique: characterize the vulnerability as a compositional predicate

Use P1–P3 as a filter over candidate function-parameter states. First identify an address parameter that is not checked by the modeled verification rules. Next determine whether the parameter reaches an external-call target. Finally test whether the call result appears in the taint predecessors of an on-chain state target. A contract is reported only when all three conditions hold (Sect. 4.5, p. 3574).

The motivating Visor Finance example validates `from.owner() == msg.sender`, then calls `from.delegatedTransferERC20`, and mints tokens to an attacker-controlled `to` address. A malicious `from` contract can return a value that passes the check and perform no transfer, while execution continues to mint shares (Listing 3 and Sect. 3.1, pp. 3569–3570). This example is the paper’s concrete shape for tracking both data flow and control flow across an external call.

Inference: a Verus adaptation could encode a candidate state as a ghost struct containing an EVM stack, abstract memory/storage maps, taint sets, and a control-flow location. Define `spec fn` predicates `p1`, `p2`, and `p3` over that state. A verified detector could use `requires` for a decoded opcode and well-formed stack, and `ensures` to show that a transition preserves or adds exactly the specified taint relation. A final `proof fn` could show that `reported(state)` implies the three predicates. This would prove the detector’s logical criterion, not that the criterion captures every Solidity authorization pattern. The paper implements Python analysis of EVM bytecode, not Rust or Verus (Sect. 5.1, p. 3575).

## technique: CFG grapher with suspicious-function filtering

The Grapher disassembles runtime bytecode into opcodes, constructs a control-flow graph (CFG) using statically determined jump relations, and filters functions likely to accept an address. The heuristic looks for address parameters masked by a 160-bit `AND` with `0xFF…FF`, a common EVM pattern. It returns candidate CFG subtrees to the simulator. Dynamic jump relations are not enumerated in the graph; the paper says the Grapher “constructs the CFG only on statically determined jump relations considering the soundness.” (Sect. 4.3, p. 3572)

How to apply it:

1. Extract runtime code and parse basic blocks and statically known jump targets.
2. Identify function selectors and inspect argument-handling opcodes.
3. Keep functions with the address-mask pattern as suspicious candidates.
4. Pass the candidate functions to the simulator. Figure 2 illustrates separately rooted trees whose connecting jumps are determined dynamically; the Grapher omits these connections (Sect. 4.3, p. 3572).

Inference: a Verus adaptation could represent opcodes, basic blocks, and successor edges as immutable Rust data. Define `spec fn` `well_formed_cfg` and `candidate_function`; prove with `proof fn` that every simulator location belongs to a candidate CFG and every statically listed edge points to a valid block. These properties alone would not establish coverage of dynamically determined jumps.

## technique: static EVM simulation with taint and dependency relations

The Simulator executes opcode rules without solving path constraints. Its state includes EVM stack, sparse key-value memory, storage, and taint information. `T` is the set of tainted values, and `CT` records direct taint predecessors. Sources include attacker-controlled `CALLDATA`, `ORIGIN`, and `BALANCE`. The simulator conservatively explores paths, including infeasible ones, and sends each final path state to the Detector.

Apply the rules as follows:

1. Maintain the source set `S`, taint set `T`, dependency mapping `CT`, and simulated stack, memory, and storage (Sect. 4.2–4.4, pp. 3571–3573).
2. For stack operators such as ADD, SWAP, and DUP, update the stack and mark the result tainted if any operand is in the source-or-taint set. Record direct predecessors in `CT` (Sect. 4.4.1, p. 3572).
3. For MLOAD and SLOAD, propagate taint from a tainted offset or tainted loaded cell to the result; record the memory/storage dependency (Sect. 4.4.2, p. 3573).
4. For MSTORE and SSTORE, mark the stored value tainted if either value or destination is tainted, while recording only the destination-to-value dependency (Sect. 4.4.2, p. 3573).
5. Apply the paper’s call-related rule: if the target address has `CALLDATALOAD` as its `CT` ancestor, mark the modeled result `suc` tainted and record the address as its predecessor (Sect. 4.4.3, p. 3573).
6. For JUMPI, choose the concrete branch when the condition is concrete. Otherwise explore both branches, but prioritize the jump destination when the condition’s ancestor is `CALLDATALOAD`; this models an attacker bypassing an authorization check (Sect. 4.4.4, pp. 3573–3574).
7. Halt a path at INVALID and continue with the next path (Sect. 4.4.4, p. 3573). Pass each final path state to the detector; stop exploring that function once it is labeled vulnerable (Sect. 5.1, p. 3575).

The sparse memory abstraction treats memory like key-value pairs indexed by offsets while retaining storage’s key-value semantics. Dynamic memory parameters are treated as symbols; the simulator guarantees stack balance rather than enumerating all possible values (Sect. 3.3, p. 3571).

Inference: a Verus adaptation could use ghost maps for memory/storage and ghost sets or sequences for taint and `CT`. Define one `spec fn` per opcode transition and verify an executable interpreter with `requires` for stack arity and `ensures` for stack balance, map updates, and taint monotonicity. A loop `invariant` could require every `CT` edge to reference a known source or simulated value. Represent each chosen successor explicitly and prove that it belongs to the modeled CFG. These bookkeeping proofs would not establish that the sparse-memory abstraction matches every EVM memory behavior.

## technique: heuristic branch prioritization instead of symbolic solving

The simulator does not collect path conditions and invoke an SMT solver. When a nonconcrete JUMPI condition has `CALLDATALOAD` as its ancestor, it prioritizes the jump destination to model an attacker bypassing a check. The authors explain: “The branch prioritization in step 2(a) is heuristic.” (Sect. 4.4.4, p. 3573) They contrast this with symbolic execution’s inter-contract reasoning and constraint-solving costs, and acknowledge possible false positives when both paths are considered in step 2(b) (pp. 3573–3574).

To use it, execute a concrete branch deterministically. For a nonconcrete condition derived from CALLDATALOAD, prioritize jumpdest; for other nonconcrete conditions, consider both paths (Sect. 4.4.4, p. 3573). Inference: a Verus adaptation could verify that a worklist follows this policy. That would not establish completeness, especially because analysis of a function stops at its first reported vulnerability.

## technique: three-phase vulnerability detector

The Detector consumes a simulated function state and applies three predicates.

Phase I, whitelisted verification examination, defines V(f,p). It keeps only address parameters whose verification is absent or does not match the modeled hard-coded comparison, mapping validation, or address-enumeration patterns. Non-address parameters are treated as valid; a parameter whose taint reaches a JUMPI condition from CALLDATALOAD is treated as normally checked. The paper’s definition states: “only the states with the False return are kept and sent to the phase II check.” (Sect. 4.5.1, p. 3574)

Phase II, external-call check, defines EC(f,p). It returns true when the external-call target is p or its `CT` predecessors include p. This captures the call-related part of P2 (Sect. 4.5.2, p. 3574).

Phase III, post-call state modification, defines SM(f,p). It builds a set V of on-chain state keywords and SSTORE value/destination operands. It returns true when the tainted call result `suc` reaches any member of V through `CT` (Sect. 4.5.3, p. 3574).

The final retained set is `Remained = {(f,p) in Tuples | not V(f,p) and EC(f,p) and SM(f,p)}` (Sect. 4.5.4, p. 3574). Report the contract vulnerable if any retained tuple exists.

Inference: a Verus adaptation could implement `v`, `ec`, and `sm` as executable Rust functions with `requires`/`ensures`, and define their mathematical counterparts as `spec fn`s. Prove that the final result is equivalent to `!v && ec && sm`, using ghost sets for `Tuples` and `Remained` and a loop invariant for filtering. Such a proof would establish detector consistency, not vulnerability truth in the deployed EVM.

## evaluation evidence and scope

The benchmark contains six confirmed vulnerable contracts, six manually patched variants, four benign DeFi contracts, and four variants with address verification removed, yielding 20 ground-truth cases (Sect. 5.2.1, pp. 3575–3576). AVVERIFIER averages 7.34 seconds and achieves 100% precision and 100% recall; Table 1 reports ten true positives and ten true negatives across the four groups (p. 3576). The same detector logic was integrated into the comparison tools for fairness (footnote 1, p. 3568). Inference: twenty cases provide limited evidence of general accuracy.

The real-world comparison uses 369 contracts with source code obtained from the 812 contracts flagged by AVVERIFIER. It averages 6.34 seconds per case, has zero timeouts within the ten-minute limit, and yields 348 true positives, 21 false positives, and zero false negatives in this selected set: precision 94.3% (=348/(348+21)) and recall 100% (=348/(348+0)) (Sect. 5.2.2 and Table 2, pp. 3576–3577). Inference: this recall does not measure missed vulnerabilities among contracts AVVERIFIER did not flag. Baselines report lower recall: Mythril 5.1% (16 true positives, 301 false negatives), Ethainter 43.0% (147, 195), Jackal 59.7% (172, 116), and ETHBMC 1.1% (2, 182); the table separately reports timeouts, so these denominators differ. The detector’s false positives arise mainly from delegated verification, digital signatures, and Merkle proofs that its three modeled mechanisms do not cover (Sect. 5.2.2, p. 3577).

The in-the-wild scan analyzes 5,158,101 transaction-involved contracts and flags 812 as vulnerable; 443 are close-sourced, and deduplication yields 131 unique close-sourced contracts. The authors report no false positives from manual rechecks of these decompiled unique contracts. Among the 348 open-source true positives, source deduplication yields 299 unique contracts (Sect. 5.2.2 and 5.3.1, pp. 3576–3577). For financial impact, the authors retrieve historical peak TVL per project and state: “In total, around $11.2 billion was considered to be directly locked into these vulnerable contracts.” (Sect. 5.3.3, p. 3579) Inference: this is a total based on project peaks, not a measured loss or necessarily assets available simultaneously. In the BSC early-warning case, detection occurred on May 18, 2023 at 6:10 UTC, and the attack began at 7:41 UTC; absent an automated response, the reported loss was $30,000 (Sect. 5.4.2, p. 3580).

## techniques for the catalog

- P1–P3 vulnerability predicate — require an insufficient address check, tainted external-call target, and return-dependent state update
- CFG candidate grapher — disassemble bytecode, build statically known CFG edges, and filter address-parameter functions
- static EVM taint simulation — track stack, sparse memory/storage, taint, and direct dependency edges for each opcode
- heuristic path prioritization — prioritize CALLDATALOAD-derived jump destinations; consider both branches for other nonconcrete conditions
- three-phase detection — filter whitelisted checks, test external-call flow, then test post-call state modification
- empirical vulnerability triage — validate against fixed benchmark cases and manually recheck large-scale findings with explicit precision and recall denominators
