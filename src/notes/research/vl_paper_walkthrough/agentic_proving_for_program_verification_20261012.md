# Agentic Proving for Program Verification
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and result

This paper evaluates Claude Code as a compiler-in-the-loop agent on CLEVER, a 161-entry Lean 4 benchmark for verified code generation. The benchmark separates specification generation and isomorphism proof from implementation generation and correctness proof. The paper defines the first stage as “Specification certification consists of generating the generated_spec specification (SPEC _ GEN), then proving it is isomorphic to the ground truth problem_spec (SPEC _ ISO).” The headline results are 98.8% of entries with an arguably valid specification interpretation, 81.3% accepted by CLEVER’s isomorphism score on the benchmark’s correct portion, 87.5% implementation certification from correct ground-truth specifications, and 98.1% end-to-end success over self-consistent premises. These figures have different denominators and must not be collapsed into one capability number.

The setup uses Claude Opus 4.6 through the Claude Agent SDK, `lean-lsp-mcp` for Lean LSP/search, and `lean4-skills`; each attempt gets a fresh temporary Lean project and a one-hour timeout. The agent edits the file, compiles, uses `/lean4:autoprove` for proof tasks, and reports OK, FAIL, ISSUE, or (for specification mismatch) MISMATCH. The paper’s core claim is that “tight compiler-in-the-loop agentic paradigms are currently the most effective approach for foundational program verification.” Its stronger methodological result is that CLEVER’s isomorphism scoring is unreliable because many reference specifications are defective or represent one arbitrary reading of ambiguous English.

## technique 1: staged specification certification

What it is: separate natural-language formalization from proving equivalence to a supplied specification. SPEC_GEN fills `generated_spec`; SPEC_ISO proves an isomorphism theorem to `problem_spec`. This exposes whether a model can state a valid contract and whether the benchmark reference is itself sound.

How to do it: create a Lean file containing the NL docstring, signature, examples, generated-spec placeholder, ground-truth spec, and isomorphism theorem; ask the agent to write a specification; compile it; run `/lean4:autoprove` on the isomorphism; classify failure as timeout, MISMATCH (both interpretations valid but non-isomorphic), or ISSUE (a component is wrong); manually inspect supporting counterexamples and rerun with guided prompts. A useful multi-specification variant asks for “all and only” semantically defensible readings, varying precondition boundaries, edge cases, quantifier scope, operation semantics, and property strength; then tests each candidate against the reference.

Verus form (inference): split a Verus task into contract synthesis and relation checking. Have the agent propose `requires`/`ensures`, compile, and then prove a ghost relation between the candidate contract and a trusted contract or executable examples. Preserve multiple admissible contracts when prose is ambiguous instead of forcing one string match. Verus does not have Lean’s definitional equality for arbitrary contracts, so use implication lemmas, refinement predicates, and property-based tests where full equivalence is unavailable.

Evidence and limits: final classification found 65 OK, 81 ISSUE, 13 MISMATCH, and 2 FAIL among 161 entries; thus 98.8% had at least one arguably valid interpretation, but only 65 matched the ground truth. Ground-truth issues include conjunct-as-guard mistakes (15 problems), precedence bugs (12), invalid-domain quantification (7), and wrong semantics (21). The paper reports “all but 14 entries (issues in generated_spec plus failures) corresponded to valid generated specifications” in the simple run. Isomorphism is therefore a weak score for intent.

## technique 2: compiler-in-the-loop implementation proving

What it is: generate executable Lean code and separately prove that it satisfies the specification. IMPL_GEN writes the implementation; PROOF_GEN invokes the proof agent on the correctness theorem. This catches bugs that an isomorphism check over specifications misses.

How to do it: provide either the ground-truth contract or a generated contract, plus examples and helper definitions; ask the agent to implement; compile; invoke `/lean4:autoprove`; retain the full trace and classify OK, FAIL, or ISSUE with a concrete counterexample. Run both simple and guided prompts, and distinguish benchmark defects from implementation defects.

Verus form (inference): ask the agent to implement a function under fixed Verus contracts, then prove the top-level `ensures` with `verus`. Add bounded and randomized tests to find finite-fuel, off-by-one, missing-case, and wrong-algorithm bugs before proof search. Keep contract generation and implementation generation as separate artifacts so a vacuous contract cannot hide a bad implementation.

Evidence and limits: from correct ground-truth specifications, 104/161 proofs were OK, 9 timed out, and 48 were ISSUE; among the 80 entries with no specification bug, 70 passed, yielding 87.5%. Generated specifications gave 144/161 OK in the simple run and 148/161 in the guided run; across simple and guided attempts, 154 entries had an OK attempt (95.7%), rising to 98.1% after removing four benchmark issues. Identified implementation defects include bounded fuel in Newton–Raphson, off-by-one indexing, a missing stationary-point case, and sorting by the wrong key.

## technique 3: agent self-diagnosis with explicit issue taxonomy

What it is: require the agent to explain why a proof cannot be completed, rather than treating every non-compiling file as model failure. ISSUE requires a rigorous argument that a specification, implementation, signature, helper, or test is inconsistent; MISMATCH records two valid but different specifications. Manual review checks the classification.

How to do it: after timeout or failed proof, prompt the agent for a minimal counterexample and the exact faulty component; classify the issue source; cross-check the flag with the benchmark harness; manually adjudicate disagreements. Track categories separately for reference contracts and generated contracts. The paper reports no discrepancy except one test-case compilation bug and one timeout misreported as FAIL.

Verus form (inference): make diagnostic output a first-class proof artifact: record failing verification condition, assumptions, counterexample values, and whether the contract or implementation is inconsistent. Distinguish `assume`/axiom misuse, vacuous preconditions, solver timeout, and genuine algorithmic errors. Use a human-review queue for ISSUE claims before changing benchmark data.

Evidence and limits: Claude’s manual-review classifications were described as reliable, but the reviewers are the authors; that this is not an independently blinded audit is an inference. The taxonomy reveals that 48/80 ground-truth issues are Lean-encoding hazards and that generated specifications fail mostly semantically, while references fail syntactically and semantically. Self-diagnosis improves dataset hygiene; it does not prove the agent’s explanation is correct.

## technique 4: prompt guidance and multiple interpretations

What it is: progressively add examples, formal test cases, and explicit specification-policy guidance. A final prompt asks for several semantically distinct candidates to cover ambiguity. Guidance reduced generated-specification issues fivefold (from 10 to 2) in one comparison, but adventurous multi-spec generation increases surface area and can reintroduce errors.

How to do it: start with a minimal task prompt; measure SPEC_GEN and SPEC_ISO; add test cases and example usages; add rules for when to constrain behavior outside the valid domain; finally request up to four defensible specifications and test each. Keep prompt variants and denominators explicit.

Verus form (inference): give agents concrete Rust examples, boundary cases, and contract templates; ask for a small set of candidate contracts when prose leaves preconditions or edge behavior ambiguous. Validate each candidate with Verus and tests, then require an explicit user or benchmark choice before implementation.

Evidence and limits: the multiple run produced 290 candidates (average 2.76 per problem) and only 15 candidates proved isomorphic to references across 11 entries; 66 entries got ISSUE in at least one attempt. Prompting helps, but cannot repair ambiguous intent or defective references.

## what is proved, measured, and trusted

Lean checks accepted implementations and proofs under its kernel, but the benchmark’s specifications, helper definitions, test cases, and isomorphism theorem are trusted inputs. The agent, MCP tools, prompt design, and manual review are not part of the kernel’s soundness argument. The paper identifies 12 ground-truth error types and four fixed benchmark issues, including Collatz and infinitely-many-Fibonacci-primes tasks that effectively require open mathematics. Runtime is usually 10–15 minutes for proving and about 90 seconds for generation; proving costs about $2.0–$2.5 per solve, with one-hour runs near $10. The success rates therefore measure a particular model, tool context, timeout, and edited benchmark fork.

## implications for VeruLaw

Inference: VL should copy the separation between contract synthesis, implementation, and proof, and should score contracts by semantic tests and implication rather than textual or structural isomorphism. Agent-written verified Rust is threatened by vacuous or underspecified contracts: a high proof rate can coexist with wrong intent. Existing CLEVER-style benchmark numbers should not be reused without auditing every contract and helper. VL should retain agent explanations and counterexamples, run property-based checks on contracts, and report self-consistent denominators. The paper’s agentic loop is a useful baseline, but Lean tactics and MCP tooling do not transfer directly to Verus.

## techniques for the catalog

- staged specification certification — generate a contract, then separately prove its relation to a reference while classifying mismatches and defects
- implementation certification — generate executable code under a fixed contract and prove the top-level correctness theorem
- issue-aware agent diagnosis — require counterexamples and component-level classifications for failures instead of binary pass/fail
- guided multi-interpretation synthesis — use examples, boundary policies, and multiple candidate contracts to expose ambiguity
Audited 2026-10-12 against the paper: checked every number (161 entries; 65/81/13/2 classification and 98.8 percent; 81.3 percent = 65/80; 104/9/48; 70/80 = 87.5 percent; 144 and 148 OK; 154 = 95.7 percent; 98.1 percent; 15/12/7/21 issue types; 48 of 80; 10 to 2; 290, 2.76, 15 across 11 entries, 66 ISSUE; 7 implementation defects; runtimes and costs), the setup, flag definitions, the cross-check exceptions, and the quotations; Verus forms are marked inference and sound as sketches. Changed one thing: the claim that manual review was not independently blinded is now marked as the study's inference, since the paper says the authors confirmed the classifications reliable. Not checked: appendix tables and figures beyond the text extraction.
