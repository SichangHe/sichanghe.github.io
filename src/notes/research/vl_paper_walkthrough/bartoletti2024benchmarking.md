# Towards benchmarking of Solidity verification tools
(authored by agents unless marked 🧑)
Tag: `bartoletti2024benchmarking`, [paper](https://arxiv.org/abs/2402.10750v1)

## purpose and contribution

The paper introduces a benchmark for comparing formal verification tools for Solidity. It states: “Our long-term goal is a comprehensive, publicly available benchmark to evaluate the effectiveness of verification tools for Solidity contracts.” (Section 1, p. 2.) The initial benchmark contains 323 verification tasks, each pairing a Solidity implementation with a property and a manually constructed ground truth. A toolchain constructs tasks, invokes SolCMC and Certora, and summarizes results (Section 1, p. 2).

Inference: The reusable technique is to benchmark verifiers against independently labelled positive and negative implementations, rather than compare aggregate success claims from unrelated papers. The benchmark keeps informal use-case specifications, multiple Solidity implementations, property encodings for each tool, and ground-truth judgements as separate components (Section 3, p. 4). This separation lets one property be replayed across implementations that satisfy it, violate it obviously, or violate it subtly.

## technique 1: construct a ground-truth verification-task corpus

Inference: Use this procedure when a verifier needs systematic evaluation across properties, implementations, and tool-specific specification languages.

1. Write an informal use-case specification and the desirable properties without restricting the language to what current tools can express (Section 3, p. 4). The paper says, “We deliberately choose not to use a formal language to write the smart contract specifications and the associated properties, since we want to be free to express properties that go beyond those expressible by current verification tools.” (Section 3, p. 4.)
2. Implement each use case in several Solidity versions, including versions that satisfy the properties and versions with obvious or subtle violations (Section 3, p. 4).
3. Record a ground-truth judgement for every implementation/property pair (Section 3, p. 4). The authors caution that manually establishing that a property holds is difficult because of reentrancy and other Solidity semantics (Section 5, p. 12).
4. Keep property definitions separate from contracts for automated construction of SolCMC tasks. Add a function that asserts state invariants or wraps contract methods, or inject ghost-code fragments into methods. Prevent ghost code from writing original state or changing control flow except to signal a violation (Section 3, p. 4).
5. For Certora, encode state-wide facts as CVL invariants and call-sequence behavior as rules with preconditions and `assert` or `satisfy` postconditions (Section 3, p. 5).
6. Automate construction, execution, and result summarization in a toolchain, so extending the benchmark does not require hand-running every task (Section 1, p. 2).

Inference: An analogous Rust/Verus corpus could pair satisfying and intentionally faulty implementations with the same specification. Its instrumentation should preserve executable behavior. Keeping informal requirements separate from formal contracts would help expose requirements that the specification language cannot express.

Evidence: The corpus has 323 tasks (Section 1, p. 2; Table 2, p. 12). The authors state that they cannot certify the ground truth beyond reasonable doubt and plan to add testnet contracts that witness negative properties (Section 5, p. 12). Thus the denominator is all 323 tasks, while confidence in positive labels remains a stated limitation.

## technique 2: score soundness, completeness, and weak versus strong claims

Inference: Use this scoring method when a verifier may return a proof, a counterexample, an uncertain warning, an unsupported result, or no result. Compare the tool's positive or negative answer against the ground truth, recording whether its claim is strong (`!`) or weak. The authors explain: “Therefore, our scoring schema privileges soundness over completeness, as a false positive may create much bigger problems to users, as they will be convinced that their contract satisfies a property that in practice does not hold, while a false negative will only make the user doubt of the correctness of the contract.” (Section 3, p. 5.)

Table 1 assigns TP! = 2, TN! = 2, TP = 1, TN = 1, FN! = −8, FP! = −16, FN = 0, FP = −1, ND = 0, and UNK = 0. ND means the property is not expressible; UNK covers timeout or memory exhaustion. Weak correct claims earn one point; a weak false negative earns zero (Section 3, p. 6).

SolCMC's safe assertion result is a strong positive, an assertion violation with a trace is a strong negative, and a possible violation is a weak negative (Section 3, p. 5). For Certora `assert`, acceptance is a strong positive and rejection a weak negative, because its counterexample may be unreachable. For `satisfy`, acceptance is a weak positive and rejection a strong negative. The benchmark disallows rules mixing `assert` and `satisfy` (Section 3, p. 6).

Inference: For a Verus benchmark, distinguish a checked proof under explicit preconditions, a demonstrated violating execution, an unresolved proof obligation, and an unsupported feature. Define their strong/weak classifications before applying the weights; a failed proof alone should not count as a demonstrated violation.

Evidence: Table 2 reports the following results on 323 tasks. For TP, TN, FP, and FN, parentheses give the number of strong claims within the category total (Section 4, p. 12):

- Certora: ND 60, UNK 0, TP 97(97), TN 94(0), FP 7(7), FN 65(0), score 176.
- SolCMC with Z3: ND 153, UNK 22, TP 86(86), TN 49(48), FP 2(2), FN 11(9), score 165.
- SolCMC with Eldarica: ND 153, UNK 5, TP 88(88), TN 54(52), FP 7(7), FN 16(10), score 90.

Each row totals 323 tasks; the Table 1 weights reproduce all three scores. These results concern solc v0.8.24, Eldarica v2.0.9, Z3 v4.12.2, and certora-cli v6.3.1 (Section 4, footnote 3, p. 6). The authors caution that later versions may fix the reported weaknesses (Section 4, p. 6).

## technique 3: probe verifier boundaries with adversarial encodings

Inference: Use small contracts that isolate one semantic feature, then compare the expected truth value with tool output. The paper's probes cover untrusted external calls, EOAs, maps, reentrancy, `selfdestruct`, coinbase transfers, liveness, call sequences, liquidity, and fund-transfer provenance (Sections 4, pp. 6–11).

Inference: For external calls, construct a callee whose state is known, call it from the property wrapper, and test both the default untrusted model and a trusted-call option. SolCMC and Certora over-approximate untrusted callees, causing false negatives; trusting calls can increase runtime. The paper measured about eight minutes for a tiny trusted-call Z3 check versus a few seconds with untrusted calls (Section 4, p. 7). Listing 4 probes a call to an arbitrary address from a function with a reentrancy guard: SolCMC falsely proves balance preservation despite a possible `selfdestruct` transfer. Listing 5 uses an unguarded call: Certora falsely proves preservation of `s` despite a possible reentrant call to `set`. Listing 6 separately shows Certora falsely proving a balance invariant because its method-by-method check misses external `selfdestruct` and coinbase transfers (Section 4, pp. 8–9).

Inference: For temporal behavior, encode a two-call sequence and vary callers. Listing 8 demonstrates that a SolCMC invariant can accidentally use the same `msg.sender` for both calls, so it misses a violation reachable by distinct callers (Section 4, pp. 9–10). Certora rules can express fixed-length call sequences, but the paper says unbounded sequences and general “along all paths, eventually” liquidity properties are outside its expressiveness (Section 4, pp. 10–11).

Inference: Rust/Verus adaptations could use explicit caller and environment parameters, callback models, and transitions for call sequences. Such adaptations would need to state which environmental behaviors they model or assume; the paper does not evaluate Verus.

## what is proved, trusted, and left unresolved

The authors explicitly limit confidence in their manual labels: “While we are not able to certify the correctness of our ground truth beyond any reasonable doubt, we expect that the open-source nature of our benchmark can foster the collaboration with the community of experts.” They also state: “In this regard, we note that the counterexamples outputted by SolCMC and Certora when they find a violation are rarely informative about its causes.” (Section 5, p. 12.)

Inference: Verification claims depend on the encoded property and execution model. A product using agent-written verified Rust should separately examine its specifications, external-library contracts, environment models, and verifier correctness. The reported false positives suggest testing whether omitted callbacks or external state changes could invalidate its claims.

## techniques for the catalog

- ground-truth verifier benchmark: maintain informal properties, multiple satisfying/violating implementations, tool encodings, and an explicit judgement for every task
- soundness-weighted scoring: score strong and weak claims separately, make false positives more costly, and give non-expressible tasks and timeouts zero
- semantic boundary probes: isolate external calls, reentrancy, asynchronous balance changes, caller identity, temporal sequences, and liveness in minimal contracts
- reproducible toolchain: automate task generation, verifier execution, and result aggregation across every benchmark task
