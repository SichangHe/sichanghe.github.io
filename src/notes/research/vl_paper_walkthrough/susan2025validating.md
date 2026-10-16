# Validating Solidity Code Defects using Symbolic and Concrete Execution powered by Large Language Models
(authored by agents unless marked 🧑)
Tag: `susan2025validating`, [paper](http://arxiv.org/abs/2509.13023v1)

## what is proved or measured
The paper combines Slither detectors, an LLM, Forge tests, and Kontrol symbolic execution. Its abstract states: “This paper introduces a novel detection pipeline that integrates custom Slither-based detectors, LLMs, Kontrol, and Forge.” (§Abstract, p.1). The target is seven defect classes: reentrancy, insufficient parameter validation, block-environment dependency, faulty assert/revert, gas-costly patterns, access control, and complex fallback. The detailed demonstrations cover reentrancy, complex fallback, and faulty access control.

The central claim is classification by executable evidence rather than a static warning. The authors write: “By chaining these instruments, our method effectively validates true positives, significantly reducing the manual verification burden.” (§Abstract, p.1). Inference: this is a directly reusable gate for generated Rust: a heuristic detector proposes a defect, then a trusted execution or proof tool must confirm it.

## technique: reentrancy proof by paired Forge tests
First use a detector/LLM prompt to identify a function with an external call. Generate a Forge test that deposits Ether, invokes the withdrawal, and checks the expected balance. Generate a second malicious-attacker contract whose fallback re-enters `withdraw()`. Run both tests. The paper's rule is explicit: “if both tests pass for Reentrancy, the contract is not vulnerable.” (§4, p.10). The first test demonstrates ordinary behavior; the second attempts the exploit, so a successful exploit test is evidence of vulnerability. The Listing 2 harness uses `ReentrancySimpleTest`, deploys `_contractUnderTest`, and defines `test_proofReentrancyExploit` (§3.1, pp.5–7).

Inference: in Verus, model balances and calls as a state machine. Use a `spec fn` for the balance invariant, a `requires` precondition for caller and amount, and `ensures` that a withdrawal decreases balance once. A `proof fn` can show that the callback cannot obtain a second permission. Solidity's EVM reentrancy semantics do not carry over automatically; the Verus model and external-call abstraction are trusted assumptions.

## technique: symbolic gas-bound confirmation
For a complex fallback, detect a payable fallback that performs an unbounded or expensive operation. Generate a Forge/Kontrol test that calls the fallback while attaching a fixed gas amount. Run Kontrol symbolically. The paper's staged example says the callback “can only fail due to an \"Out-of-Gas\" exception, thus proving the Complex Fallback issue.” (§3.2, p.8). Its workflow is: identify the prerequisite pattern; instantiate the template with the contract name; compile the generated test; run Kontrol and inspect the symbolic result (§5, pp.12–13).

Inference: a Verus encoding would make gas an explicit ghost counter and prove a postcondition that the fallback's required steps exceed the supplied budget. Use a `requires` bound and an `ensures` failure predicate; do not claim a proof about EVM gas unless the cost model is formalized.

## technique: access-control exploit test
Detect a state-changing operation such as `selfdestruct` and identify its authorization guard. Have the LLM instantiate a test that calls the operation as an unauthorized address. Compile and run it with Forge/Kontrol. A passing exploit test means the defect is present; a failing test is evidence against it. The paper contrasts result interpretation: “The opposite is true for Access Control and Complex Fallback: if their respective tests pass, then the issue is present.” (§4, p.11).

The general three-stage workflow is detector prerequisite, LLM test generation, and symbolic or concrete execution. If generation or compilation fails, the pipeline reports uncertainty rather than a verified finding (§5). Inference: for Rust, replace generated Forge tests with harnesses that exercise unauthorized transitions and verify `ensures`-style state-machine invariants. Keep detector output separate from proof status.

## evidence, limits, and trust
The paper reports experiments for seven defect types but does not provide a complete benchmark denominator; it presents three detailed examples and calls the practical solution incomplete (§6). It warns that LLM inconsistency, execution cost, and string-matching output interpretation limit automation (§6). Slither patterns, LLM-generated tests, Forge execution, Kontrol's symbolic semantics, compiler, and the test oracle remain trusted. Inference: a product using agent-written verified Rust should reuse the staged detector-to-proof workflow, but must report coverage and denominators before claiming defect rates. Existing formal smart-contract tools already cover the demonstrated idea; VL should not redo Solidity-specific detectors.

## techniques for the catalog
- detector-to-proof triage — use static patterns to select candidates and require executable or symbolic confirmation
- paired exploit harness — test normal behavior and an adversarial callback, interpreting both outcomes together
- symbolic resource bound — turn gas or another finite resource into an explicit budget and check failure under that budget
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
