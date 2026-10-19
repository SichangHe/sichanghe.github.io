# Validating Solidity Code Defects using Symbolic and Concrete Execution powered by Large Language Models
(authored by agents unless marked 🧑)
Tag: `susan2025validating`, [paper](https://doi.org/10.4204/EPTCS.427.7)

## what is proved or measured
The paper proposes a pipeline combining Slither-based preprocessing, LLM-generated tests, and execution with Forge or Kontrol. Its abstract states: “This paper introduces a novel detection pipeline that integrates custom Slither-based detectors, LLMs, Kontrol, and Forge.” (p.98). The implementation is incomplete: “While we have not yet implemented a complete practical solution for our proposed workflow, our previous experiments and existing implementations enable us to evaluate its feasibility and implementation complexity.” (§4, p.111).

The seven investigated categories are Reentrancy, Insufficient parameter validation, Block Environment Dependency, Faulty Assert or Reverts, Gas Costly Pattern, Access Control, and Possible Division by Zero (§3, p.103). Complex Fallback is a subtype of Gas Costly Pattern, not an additional category (§3.2, p.106). Three detailed examples concern a reentrancy false positive, complex fallback, and insufficient access policies (§§3.1–3.3, pp.104–109). The authors used “Google Gemini 2.5 Pro via its official chat application” (§3, p.103).

The scope is limited to encoded scenarios: “It is important to note that when we prove the presence or absence of a defect, we are formally or empirically proving that the contract is vulnerable or not vulnerable to the specific attack scenarios encoded in our test templates, not all possible variations of an attack.” (§4, p.110). Inference: for generated Rust, a similar prerequisite check could select suspected defects for execution or proof, with conclusions limited to the checked properties and harnesses.

## technique: paired withdrawal and reentrancy tests
The example uses `transfer`, whose 2300-gas limit prevents the illustrated reentrant withdrawal (§1, p.99; §3.1, p.104). Listing 2 deploys the target and an attacker, constrains `initialDeposit` below `2 ** 45`, and defines two tests. The first deposits and withdraws without an expected revert. It does not assert a final balance. The second expects withdrawal to revert during the attempted attack. Listing 3 supplies an attacker whose `receive()` callback attempts another withdrawal (§3.1, pp.104–105).

The intended interpretation is: “If the first test passes and the second fails, then the contract is vulnerable to Reentrancy.” (§3.1, p.104). The second test expects rejection of the attack, so its passing result is not a successful exploit. Section 4 agrees: “if both tests pass for Reentrancy, the contract is not vulnerable.” (p.111), subject to the scenario limit above.

Inference: the printed harness deserves validation before reuse. Listing 2 places `vm.prank(address(_attacker))` immediately before `_attacker.resetAttackCount()`, with deposit and withdrawal afterward. It does not visibly make the attacker initiate those target calls as the prose describes. This study checks the paper's account, not whether its harness executes correctly.

Inference: in Verus, model the relevant balance and callback transitions, state the withdrawal property with `requires` and `ensures`, and prove it with a `proof fn`. Any connection to EVM behavior requires explicit assumptions about external calls and resource limits.

## technique: concrete gas comparison
For Complex Fallback, the proposed prerequisite check looks for a `receive()` function (§5, p.112). Listing 4 writes `_latestDonor` in that callback. Listing 5 compares two transfers of 1 Ether: a `call` whose returned success flag must be true, and a `transfer` whose revert is expected (§3.2, pp.106–107). Both tests passing identifies the illustrated defect.

This example uses Forge, not symbolic gas analysis: “We chose Forge for this defect because the analysis only requires two concrete executions, not the complex path exploration for which Kontrol is designed.” (§5, p.112). Section 3.2 states: “Each test method needs to be executed once to reveal the code fault; no fuzzing is needed.” (p.106). Listing 8 supplies the generation template, with comments instructing the LLM to adapt imports, contract types, constructor initialization, and funding where needed (§4, pp.110–111).

Inference: comparing behavior under two resource budgets could inform Rust tests. A Verus proof with an explicit resource counter would be a separate extension; this paper does not supply a symbolic gas-bound proof.

## technique: symbolic unauthorized-call test
Listing 6 omits `onlyOwner` from `cancelContract`, which invokes `selfdestruct`. Listing 7 takes a symbolic `caller`, assumes it differs from the deploying test contract, uses `vm.prank(caller)`, expects a revert, and calls `cancelContract` (§3.3, pp.108–109). The explanation is explicit: “If access policies are correctly implemented, this call should revert for any user who is not the contract’s owner, and the test should pass.” The next sentence says the example does not revert and therefore fails the test (p.108).

Section 4 contradicts this interpretation: “The opposite is true for Access Control and Complex Fallback: if their respective tests pass, then the issue is present.” (p.111). For Access Control, the test and §3.3 support failure as the defect signal; for Complex Fallback, both expected outcomes passing signal the defect.

Inference: a Rust harness could call restricted transitions as unauthorized users and check the expected rejection. Any LLM-inferred access policy remains an assumption requiring validation.

## evidence, limits, and trust
The proposed stages are contract preprocessing, LLM test generation, and test execution (§4, pp.110–111). Generation errors need not produce a confirmed finding: “If this generation step fails, the analysis is terminated, and the contract is flagged as potentially vulnerable, albeit with a lower confidence rating.” (§5, p.112). Section 4 allows lower-confidence detections or no detections when execution fails (p.111).

The authors report manual experiments across seven categories (§7, p.113), but give no aggregate accuracy, benchmark denominator, or quantitative comparison for this proposed pipeline. They acknowledge test-generation adjustments: “For some experiments, the tests generated were correct, and some required minimal adjustments.” (§4, p.110). Section 6 discusses LLM consistency, model/API or local-compute costs, and Forge/Kontrol integration; it reports using an LLM to structure CLI output (pp.112–113).

Inference: confidence depends on prerequisite coverage, the chosen policy and test oracle, generated harness correctness, and the execution or proof tools. These examples support investigating the workflow for verified Rust; they do not establish its effectiveness there.

## techniques for the catalog
- detector-to-proof triage — select candidates with static prerequisites, generate tests from templates, then execute them
- paired behavior and attack tests — combine normal behavior with expected rejection of the illustrated attack
- concrete resource comparison — compare unrestricted and limited-gas transfers with Forge
- symbolic access-policy test — constrain an unauthorized symbolic caller and expect the restricted call to revert

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "If access policies are correctly implemented, this call should revert for any user who is not the contract’s owner, and the test should pass."): checked the entire paper, quotations, categories, numbers, printed page and section references, listings, and technique steps; corrected the category list, DOI link, incomplete-implementation status, reentrancy assertions, concrete gas procedure, access-control result interpretation, and catalog; noted the paper's access-control contradiction and a harness concern; did not execute the Solidity tests, reproduce experiments, or validate the proposed Rust/Verus extensions.
