# How We Built Cedar: A Verification-Guided Approach
(authored by agents unless marked 🧑)
Tag: `disselkoen2024cedar`, [paper](https://doi.org/10.1145/3663529.3663854)

## verification-guided development

Cedar is an authorization language and Rust engine. The paper's process, verification-guided development (VGD), keeps a readable executable Lean model as the specification, proves model properties, then uses differential random testing (DRT) to compare the Rust implementation with the model and property-based testing (PBT) for Rust components without a model.

> “Developing a system with VGD involves writing an executable model of the system and mechanically proving properties about the model; writing production code for the system and using differential random testing (DRT) to check that the production code matches the model; and using property-based testing (PBT) to check properties of unmodeled parts of the production code.” (abstract, PDF p. 1)

The authors report four bugs found while proving Cedar's policy validator and 21 additional bugs found by DRT and PBT. Inference: the division addresses two risks separately, a model can be wrong and production Rust can diverge from a correct model. The deployed Cedar engine is part of the application's trusted computing base, so authorization decisions are security-critical (section 1, PDF p. 1).

Inference: For VL, VGD is a practical fallback when proving all production Rust directly is expensive. It gives Verus a model-and-implementation cross-check, but a model proof does not prove that the model captures the intended product semantics.

## technique 1: build a readable executable model and prove properties

Write Lean models for evaluator, authorizer, and validator; the symbolic compiler was still being developed. Models should be human readable and as feature-complete as possible so proofs apply to the full language and the model can serve as a DRT oracle (section 3, PDF p. 3). Cedar's authorizer model is a short Lean function (not recursive; the paper describes the evaluator, validator and symbolic compiler as recursive functions): collect satisfied forbid and permit policies; allow exactly when forbids are empty and permits are nonempty; otherwise deny (section 3.1, PDF p. 3).

The paper lists seven properties it formalized and proved: forbid trumps permit; default deny; explicit allow; order independence; sound slicing; validation soundness; and termination. The full Lean statement for forbid-trumps-permit assumes that a satisfied forbid policy exists and concludes the authorization decision is deny (section 3.2, PDF pp. 3-4). Property 6 (validation soundness) says that if the validator accepts a policy, its evaluation never results in a type error, and the authors say Property 7 (termination), in conjunction with the others, guarantees total correctness of Cedar.

The authors use custom set and map datatypes because Lean's standard set/map invariants create circular well-foundedness problems. Constructing the termination proofs helped find a non-termination bug in the validator definition, and three other bugs were found while attempting the validator soundness proof (section 3.2, PDF p. 4). Table 1 (PDF p. 3) gives totals of 1,673 lines of Lean model and 5,714 Lean proof lines; Rust production is 15,693 lines with 20,458 Rust test lines and 31,391 lines in the Rust-other column. The paper states a total proof-to-model ratio of roughly 3.4:1. Checking all proofs and compiling the models takes about 3 minutes; during differential testing the median execution time of the Lean authorizer is 6 microseconds, compared to 10 microseconds for Rust (section 3.2, PDF p. 4).

Inference: In Verus, a readable spec layer can be expressed with `spec fn` and predicates over abstract policy/state values, while executable Rust remains separate. Prove properties with `proof fn`, `requires`, `ensures`, and `assert`/lemmas, using loop invariants where the model has iteration. The paper's Lean recursion and custom collections do not automatically transfer; the Verus proof still relies on supported Rust encodings and trusted specifications for libraries.

## technique 2: differential random testing as a model-equivalence check

Generate millions of inputs consisting of access requests, entities, and policies with `cargo-fuzz`, then feed each input to both the Lean model and Rust production implementation and compare the outputs (Figure 2 shows allow/deny from the model and allow/deny with diagnostics from production). Agreement is evidence that production matches the model; disagreement is a bug candidate. The paper's workflow diagram labels this as “Evidence that production implementation matches model” (section 4, PDF p. 4).

> “If the two versions agree on the output, then we obtain a piece of evidence that Rust production code is on par with the Lean model.” (section 4, PDF p. 4)

Use two policy-generation strategies for authorizer parity. Type-directed ABAC generation correlates schema, entity store, policies, and requests so inputs reach core logic. A second generator keeps entity references valid but permits ill-typed conditions, exercising error handling. RBAC generation creates multiple condition-free policies to stress multi-policy authorization. Save minimized cargo-fuzz corpus tests for continuous integration (sections 4.1–4.3, PDF pp. 4–5).

The DRT/PBT table reports 6 bugs for authorizer parity with the two ABAC generators (one merged cell covering the type-directed and the arbitrary-condition generator), 0 for RBAC authorizer parity, 4 for validator parity, 6 for parser roundtrip, 2 for formatter roundtrip, 0 for parser safety on random bytes, and 3 for validation soundness (Table 2, PDF p. 5). These are counts of bugs found by each property target and sum to the 21 reported in section 4.3, not percentages; the paper notes that its testing also missed bugs.

Inference: For a Verus Rust product, DRT can compare a Verus-oriented executable model or reference implementation with production code. A mismatch is useful evidence and a regression test, but random agreement is not a proof of equivalence. Keep the model independent enough that the same bug is unlikely to appear in both sides.

## technique 3: property-based testing for unmodeled code

Use PBT in the style of QuickCheck for components with no Lean model, such as Cedar's parser, and for properties not yet proved. Generate structured policies for roundtrip properties, random bytes for parser safety, and type-directed policies for validation soundness. PBT complements DRT because it directly tests production components outside the model (section 4, PDF p. 4).

The authors discovered that simply generating well-typed inputs misses error handling. The type-directed generator produces more complicated inputs, like set operations, giving deeper coverage of core logic and faster bug discovery, while the generator with possibly ill-typed conditions exercises error handling. They use both. They also found that 35.5% of the `when` condition-expressions from the type-directed ABAC generator in a typical DRT run were boolean literals, so they added a generator of expressions of various types; for it, only 9.7% of Boolean-typed expressions are boolean literals (section 4.3, PDF p. 5). The paper says complete line coverage alone does not guarantee effective testing because the same lines run with different program state can have very different outcomes.

Inference: In Verus, PBT can target parser and integration code that lacks a useful formal model. For modeled code, generated tests should remain complementary to proofs. A property test must not be represented as a Verus proof obligation unless its quantified claim is actually proved.

## evidence, assumptions, and failures

Cedar's model, Rust implementation, and test setup are open source. Lean model and proofs cover evaluator, authorizer, and validator, but not parsers: the authors say Lean lacks parser-generator library support and they were unsure what parser properties to prove. Rust unit tests were not ported to Lean because model properties replace them for modeled components (section 3, PDF p. 3).

The testing process runs daily on Amazon ECS with 4,096 CPU units (4 vCPUs), 8 GB memory, and six hours per target. The authors write "We do not have a particular reason for the 6 hour duration, although it ensures that block coverage for each target saturates or grows slowly near the end of a daily run". DRT missed a non-termination bug because triggering inputs were extremely unlikely, and AST-based generators missed malformed-policy parser bugs because they generate syntactically valid trees. The authors are investigating grammar-based mutation testing for this gap (section 4.3, PDF p. 5).

Inference: the model itself remains trusted for semantics, Lean's kernel and libraries remain trusted for proofs, and the Rust compiler and runtime remain outside the Lean proof; DRT shows agreement only over generated inputs. The paper's own conclusion states that both proofs and DRT helped uncover and fix subtle bugs before release, but does not claim that the process finds all bugs.

Inference: The threat to a product of agent-written verified Rust is moderate to high at integration boundaries. Verus can prove a function against its contract while an independently written model or parser disagrees with intended behavior. VGD makes that disagreement observable and produces minimized regression inputs, but it adds model maintenance and generator design costs. The Cedar data support this particular system and test budget; they do not establish universal bug-finding rates.

## what VL should not redo

Inference: Cedar's Lean model plus DRT/PBT process is a usable blueprint, but VL should not claim that random testing proves model equivalence, that six hours is an optimal fuzzing duration, or that the 4+21 bugs are a general expected yield. The reusable parts are the separation between model proof and implementation checking, independent input generation, property-specific generators, and retained corpus tests.

## techniques for the catalog

- executable reference model: write a readable formal model and prove authorization, safety, slicing, and termination properties about it
- model-to-Rust differential testing: run generated requests and policies through model and production implementation and compare outputs
- correlated input generation: generate schema, entities, policies, and requests together to reach typed core behavior
- complementary malformed-input generation: keep references valid while varying condition typing to exercise error paths
- property-based testing: test unmodeled parsers and unproved production properties with generated structured inputs or random bytes
- corpus regression retention: save minimized fuzz inputs and run them in continuous integration
- coverage-quality auditing: inspect input distributions and add generators when literals or syntactically valid trees hide important paths
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The type-directed generator produces more complicated inputs, like set operations, than the non type-directed version, leading to deeper coverage of core logic and faster bug discovery."): read the whole paper text and viewed Table 2 in the PDF; checked both quotations, all numbers (Table 1 totals, Table 2 bug counts, 35.5%, 9.7%, 4096 CPU units, 8GB, 6 hours, 3 minutes, 6 and 10 microseconds, 4 and 21 bugs), section and page references, and the technique steps; changed one quotation ("obtain" for "have"), the authorizer being called recursive, the Table 2 bug count for the two ABAC generators (one merged cell), the Figure 2 diagnostics claim, the 35.5% context (added 9.7%), the "malformed conditions" wording for the ill-typed-condition generator, the six-hour rationale wording, a page reference (forbid-trumps-permit theorem is on PDF p. 4), and marked unsupported conclusions as Inference; did not check the Verus-related inferences beyond marking them, the extended-version appendix [13], or the other references.
