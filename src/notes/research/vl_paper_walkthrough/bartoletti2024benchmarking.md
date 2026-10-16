# Towards benchmarking of Solidity verification tools
(authored by agents unless marked 🧑)
Tag: `bartoletti2024benchmarking`, [paper](http://arxiv.org/abs/2402.10750v1)

## purpose and contribution

The paper introduces a benchmark for comparing formal verification tools for Solidity. It states: “Our long-term goal is a comprehensive, publicly available benchmark to evaluate the effectiveness of verification tools for Solidity contracts.” (Section 1, p. 2.) The first release contains 323 verification tasks, each pairing a Solidity implementation with a property and a manually constructed ground truth. A toolchain constructs tasks, invokes SolCMC and Certora, and summarizes results (Section 1, p. 2).

Inference: The reusable technique is to benchmark verifiers against independently labelled positive and negative implementations, rather than compare aggregate success claims from unrelated papers. The benchmark keeps informal use-case specifications, multiple Solidity implementations, property encodings for each tool, and ground-truth judgements as separate components (Section 3, p. 4). This separation lets one property be replayed across implementations that satisfy it, violate it obviously, or violate it subtly.

## technique 1: construct a ground-truth verification-task corpus

Inference: Use this procedure when a verifier needs systematic evaluation across properties, implementations, and tool-specific specification languages.

1. Write an informal use-case specification and the desirable properties without restricting the language to what current tools can express (Section 3, p. 4). The paper says, “We deliberately choose not to use a formal language to write the smart contract specifications and the associated properties, since we want to be free to express properties that go beyond those expressible by current verification tools.” (Section 3, p. 4.)
2. Implement each use case in several Solidity versions, including versions that satisfy the properties and versions with obvious or subtle violations (Section 3, p. 4).
3. Record a ground-truth judgement for every implementation/property pair (Section 3, p. 4). The authors caution that manually establishing that a property holds is difficult because of reentrancy and other Solidity semantics (Section 5, p. 12).
4. Keep each tool's property encoding separate from the original implementation. For SolCMC, use a wrapper function containing assertions or inject ghost-code fragments into methods; prevent ghost code from writing original state or changing control flow except to signal a violation (Section 3, pp. 4–5).
5. For Certora, encode state-wide facts as CVL invariants and call-sequence behavior as rules with preconditions and `assert` or `satisfy` postconditions (Section 3, p. 5).
6. Automate construction, execution, and result summarization in a toolchain, so extending the benchmark does not require hand-running every task (Section 1, p. 2).

Inference: In Verus, the analogous corpus would contain Rust functions and explicit `requires`/`ensures` contracts, with verified and intentionally faulty implementations sharing the same specification. Ghost state can be represented with proof-only variables and lemmas, but the Solidity rule that instrumentation must not alter executable behavior maps to a requirement that Verus proof code is erased and cannot change the executable function. The benchmark's informal specification should remain independent of the Verus contract so that expressiveness limits are measurable rather than silently excluded.

Evidence: The corpus has 323 tasks (Section 1, p. 2; Table 2, p. 12). The authors state that they cannot certify the ground truth beyond reasonable doubt and plan to add testnet contracts that witness negative properties (Section 5, p. 12). Thus the denominator is all 323 tasks, while confidence in positive labels remains a stated limitation.

## technique 2: score soundness, completeness, and weak versus strong claims

Inference: Use this scoring method when a verifier may return a proof, a counterexample, an uncertain warning, an unsupported result, or no result. First classify each task as P (property holds) or N (property is violated), then classify the tool output as a strong claim (`!`) or weak claim. The paper defines: “The overall design goal is that a tool that does nothing will have a null score, a tool that provides correct answers when verifying or detecting violation of the properties will have a positive score, and a tool that tricks the user into believing false results ... will have a negative score.” (Section 3, p. 5.)

Inference: Assign null points to non-expressible properties, timeout/memory exhaustion, and indefinite answers. The paper's Table 1 assigns TP! = 2, TN! = 2, TP = 1, TN = 1, FN! = −8, FP! = −16, FN = 0, FP = −1, ND = 0, and UNK = 0 (Section 3, p. 6). The asymmetry makes a false positive—claiming a bad contract is correct—more costly than a false negative.

Inference: In Verus, classify a proved `ensures` as a strong positive only when the verifier checks the complete function under the stated preconditions; classify an unresolved proof obligation or unsupported feature as UNK rather than as a failure. A failed proof is not automatically a counterexample, so it should be a weak or null outcome unless an executable violating input is produced. This is an inference from the paper's strong/weak distinction, not a Verus rule.

Evidence: On the 323-task benchmark, Table 2 reports Certora ND 60, UNK 0, TP(!) 97, TN(!) 94, FP(!) 7, FN(!) 65, score 176; SolCMC with Z3 reports ND 153, UNK 22, TP(!) 86, TN(!) 49, FP(!) 2, FN(!) 11, score 165; SolCMC with Eldarica reports ND 153, UNK 5, TP(!) 88, TN(!) 54, FP(!) 7, FN(!) 16, score 90 (Section 4, Table 2, p. 12). Inference: the listed category counts do not sum to 323 for every row because strong/weak parenthetical counts are displayed inside the categories; the score is the paper's reported score and should be recomputed from the stated point weights before using it for a new benchmark.

## technique 3: probe verifier boundaries with adversarial encodings

Inference: Use small contracts that isolate one semantic feature, then compare the expected truth value with tool output. The paper's probes cover untrusted external calls, EOAs, maps, reentrancy, `selfdestruct`, coinbase transfers, liveness, call sequences, liquidity, and fund-transfer provenance (Sections 4, pp. 6–11).

Inference: For external calls, construct a callee whose state is known, call it from the property wrapper, and test both the default untrusted model and a trusted-call option. SolCMC and Certora over-approximate untrusted callees, causing false negatives; trusting calls can increase runtime. The paper measured about eight minutes for a tiny trusted-call Z3 check versus a few seconds with untrusted calls (Section 4, p. 7). For reentrancy, call an arbitrary address from a guarded function and check a balance or state invariant; Listing 4 shows SolCMC falsely proving balance preservation despite `selfdestruct`, while Listing 5 shows Certora falsely proving state preservation because it does not model a reentrant call to `set` (Section 4, pp. 8–9).

Inference: For temporal behavior, encode a two-call sequence and vary callers. Listing 8 demonstrates that a SolCMC invariant can accidentally use the same `msg.sender` for both calls, so it misses a violation reachable by distinct callers (Section 4, pp. 9–10). Certora rules can express fixed-length call sequences, but the paper says unbounded sequences and general “along all paths, eventually” liquidity properties are outside its expressiveness (Section 4, pp. 10–11).

Inference: In Verus, these probes become unit-level functions with explicit caller and environment parameters, ghost models for reentrant callbacks, and state-machine transitions for sequences. Verus does not model EVM account identity, `selfdestruct`, or coinbase behavior automatically; those must be assumptions or modeled transitions, and the resulting trust boundary must be recorded. This mapping is an inference.

## what is proved, trusted, and left unresolved

The tools prove or refute the encoded Solidity property under their execution models; they do not prove that the informal specification is the right requirement, that manually assigned ground truth is correct, or that ignored external events cannot occur. The paper explicitly notes that counterexamples are “rarely informative about its causes” (Section 5, p. 12). Inference: a product using agent-written verified Rust should treat specification design, external-library contracts, environment models, and solver/verifier correctness as trusted inputs. The paper's false positives around reentrancy and asynchronous balance changes are a direct threat pattern for any system whose model omits callbacks or out-of-band state changes.

Inference: VL should reuse the benchmark design, explicit soundness weighting, and adversarial semantic probes instead of building another unlabelled collection of examples. It should add Rust/Verus implementations and independently checked violating executions, because Solidity's EVM-specific account and balance semantics do not transfer directly.

## techniques for the catalog

- ground-truth verifier benchmark: maintain informal properties, multiple satisfying/violating implementations, tool encodings, and an explicit judgement for every task
- soundness-weighted scoring: score strong and weak claims separately, make false positives more costly, and give unsupported or non-expressible tasks zero
- semantic boundary probes: isolate external calls, reentrancy, asynchronous balance changes, caller identity, temporal sequences, and liveness in minimal contracts
- reproducible toolchain: automate task generation, verifier execution, and result aggregation across every benchmark task
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
