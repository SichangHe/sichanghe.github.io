# Intent Formalization: A Grand Challenge for Reliable Coding in the Age of AI Agents
(authored by agents unless marked 🧑)
Tag: `lahiri2026intentformalization`, [paper](https://arxiv.org/abs/2603.17150)

## scope and central claim
The paper is a position-and-survey article. It defines intent formalization as translating informal user intent into checkable specifications, then surveys four levels: tests, executable contracts, logical contracts, and domain-specific languages (DSLs) that synthesize verified code. Its motivating distinction is explicit: “AI-generated code is plausible by construction but not correct by construction.” (Key Insights, p. 1.) The practical problem for VeruLaw (VL) is therefore specification quality before proof search: a valid Verus proof of the wrong postcondition still implements the wrong product behavior.

The paper’s running example is “remove duplicates.” A request can mean retaining one copy of each value or deleting every value whose count exceeds one (Introduction, pp. 2–3). The proposed executable postcondition is:

```python
assert all(numbers.count(x) == 1 for x in result)
assert all(x in result for x in numbers if numbers.count(x) == 1)
```

This example teaches a reusable technique: expose ambiguity with a formal property before accepting generated code. Inference: in Verus, the corresponding contract would be an `ensures` clause over sequence membership/count predicates, with a ghost/spec helper for counting; the Python assertions are executable checks, not Verus syntax.

## technique 1: choose a specification level by risk
The paper gives a staged spectrum. Tests are input/output examples; code contracts are assertions, preconditions, postconditions, and invariants checked dynamically; logical contracts use quantifiers, ghost variables, and recursive predicates checked statically; DSLs are complete specifications compiled or synthesized into correct code (Section 2, pp. 4–5). “These levels are not alternatives—they are complementary, and progress at any level enables progress at the others.” (Section 2, p. 5.)

Steps from the paper:
1. Identify the behavior likely to be misunderstood (Section 2, p. 4).
2. Start with a concrete test when a cheap guardrail is enough (Section 2, p. 4).
3. Raise it to runtime contracts when the property should be checked on every execution (Section 2.1, p. 5).
4. Use a logical contract and verifier when an all-input guarantee is needed (Section 2.1, p. 5).
5. Use a DSL plus verified synthesis when the entire implementation can be generated from a complete domain specification (Section 3.4, p. 8).

Inference: VL should default to Verus logical contracts for safety-critical behavior, while retaining tests as examples that validate the intended contract. The Verus form uses `requires`, `ensures`, loop `invariant` clauses, `spec fn`, and ghost state; a Verus `ensures` clause is checked statically, unlike the paper’s Python assertion.

## technique 2: generate postconditions and invariants, then measure them
LLMs can generate executable postconditions for arbitrary inputs. On Defects4J, the surveyed work reports that generated postconditions caught one in eight real bugs, including bugs missed by Daikon; GPT-4 scored higher on soundness and completeness than GPT-3.5 and CodeLlama (Section 3.1, p. 6). ClassInvGen generates class invariants for C++ data structures; one invariant can replace hundreds of function specifications. VeriStruct generates Verus specifications for whole data-structure modules and verified nearly all functions across 11 modules, including linked lists, hash maps, and B-trees (Section 3.1, p. 6).

Use this workflow:
1. Prompt a model with the natural-language behavior and code/API context (Section 3.1).
2. Generate candidate postconditions or a module invariant (Section 3.1).
3. Evaluate candidates for soundness and completeness rather than accepting verifier success as evidence of intent (Section 3.2, pp. 6–7).
4. Keep candidates that constrain valid behavior and reject realistic incorrect behavior (Section 3.2).

Inference: for Verus, translate a candidate into `ensures` on an `exec fn`, or a `spec fn`/predicate used by `invariant`; prove it with `assert`, `assert forall`, and lemmas only where supported by VL’s Verus reference. Do not put executable proof calls in runtime code. The paper does not provide Verus code for this workflow, so this mapping is an inference.

## technique 3: soundness and completeness by tests and mutation
The paper defines soundness as consistency with correct behavior and completeness as discrimination against incorrect behavior (Section 3.2, p. 6). For a specification S and test suite T, S is sound when it holds on every input/output pair in T. S is complete when S fails after replacing each expected output with a mutated output; with nondeterminism, completeness is the fraction of mutations detected (Section 3.2, p. 6).

Procedure:
1. Assemble input/output tests T (Section 3.2).
2. Run S on every original pair; any rejection is a soundness failure for that test (Section 3.2).
3. Generate output mutations representing natural mistakes (Section 3.2).
4. Re-run S on each mutation and count rejected mutations; report the denominator and fraction (Section 3.2).
5. For quantifiers, recursive predicates, or ghost variables, use symbolic evaluation against concrete tests, as proposed by Lahiri et al. (Section 3.2, pp. 6–7).

The paper’s concrete failure is a Dafny “common elements” contract: implication (`==>`) made the empty list satisfy the specification; replacing it with bi-implication (`<==>`) fixed completeness (Listings 3–4, p. 7). It also reports three mislabeled and two inconsistent specifications found by automated metrics, all missed by human labeling (p. 7). Inference: VL can apply the same test/mutation discipline to generated Verus postconditions, but symbolic execution of Verus quantifiers is an engineering task outside this paper.

## technique 4: interactive ambiguity tests (TiCoder)
TiCoder generates candidate code and tests, then asks a developer to label each test “Yes,” “No,” or “Undef.” Approved tests execute to prune and rank candidates (Figure 3, p. 7). Its explicit steps are:
1. Generate diverse candidate implementations (Figure 3).
2. Generate tests at inputs where candidates disagree (Section 3.3, p. 8).
3. Ask the developer to approve, reject, or mark each test undefined (Section 3.3).
4. Execute approved tests to remove candidates that fail (Figure 3).
5. Persist approved tests as regression tests (Section 3.3, p. 8).

The paper’s example asks for shared list elements. The test `[1,2,2]` and `[2,2,3]` returning `[2,2]` is rejected, disambiguating set rather than multiset semantics (Sidebar, p. 8). In a controlled study of 15 professional developers, correct evaluation was roughly twice as frequent with TiCoder, with `p < 0.001`; cognitive load decreased with `p = 0.007` (Section 3.3, p. 8). Inference: VL can ask users to classify generated boundary-case examples before committing Verus contracts; approved examples become Rust tests, while the final universal property remains an `ensures` proof.

## technique 5: verified synthesis from a DSL
3DGen translates RFC prose into 3D DSL specifications using multiple agents and symbolic test feedback. EverParse then compiles verified 3D specifications into provably correct, memory-safe C or Rust parsers. The paper reports 20 standard network protocol formats, including DNS, TLS extensions, and QUIC (Section 3.4, p. 8). The method is: generate a formal DSL specification, test it symbolically, refine it iteratively, and invoke verified compilation (Section 3.4). Inference: this is beyond ordinary VL code generation; a VL analogue would generate a Verus specification and proof-backed Rust implementation, but Verus verifies supplied Rust rather than serving as the paper’s verified parser synthesizer.

## what is proved, measured, and trusted
The paper reports benchmark evidence, not a production guarantee. Measured results include one in eight Defects4J bugs caught, 11 VeriStruct modules with nearly all functions verified, TiCoder’s 15-person study and p-values, 20 protocol parsers, and Auto-Verus’s 3.6× proof-accuracy improvement over GPT-4o zero-shot (Section 3.2, p. 7). The denominators and settings are those benchmark-specific populations; no aggregate production rate is established. User intent remains trusted: “there is no oracle for specification correctness other than the user.” (Section 3.2, p. 6.) Solvers, proof assistants, generated tests, mutation distributions, and the user’s labels are also trusted inputs to the respective claims.

## limitations and VL implications
The paper says current results target self-contained algorithmic functions, while production software has side effects, mutable state, concurrency, and dependencies (Research Agenda, p. 8). It identifies change intent, compositionality, cost-effective clarification, rich logics, and workflow integration as open problems (pp. 8–9). Inference: this is a substantial threat to an agent-written verified-Rust product because a proof can remain valid while a change silently shifts intent, and because generated specifications can be incomplete. VL should therefore retain user-visible examples, mutation-based contract checks, and specification diffs in addition to proof success. The paper also says what VL should not redo: the basic spectrum, TiCoder’s ambiguity-test interaction, and soundness/completeness definitions are already established; VL’s contribution should be adapting and measuring them for Verus systems with state and concurrency.

## techniques for the catalog
- specification spectrum: select tests, runtime contracts, logical contracts, or verified DSL synthesis according to required coverage
- postcondition and invariant generation: generate candidate contracts, then filter them by soundness and completeness
- mutation-based specification metrics: test original outputs for soundness and mutated outputs for completeness, reporting the mutation denominator
- interactive ambiguity testing: ask users to classify disagreement-focused examples and retain approved tests as regressions
- verified DSL pipeline: refine a formal DSL with symbolic feedback and compile it through a verified synthesizer
- intent-aware VL workflow: treat user labels and specification validation as prerequisites to trusting a Verus proof
Checked 2026-10-15 against paper lahiri2026intentformalization: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
