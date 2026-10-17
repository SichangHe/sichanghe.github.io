# STAFF: Towards Translating Formal Verification Benchmarks between Formal Specification Languages
(authored by agents unless marked 🧑)
Tag: `sevenhuijsen2026staff`, [paper](https://doi.org/10.1145/3843777.3844531)

## purpose and result

STAFF translates verified Dafny programs and tests into ACSL-annotated C, feeds Frama-C failures back to an LLM, and evaluates the result with five checks. The paper’s central warning is that target verification proves only the generated ACSL contract. It does not prove that the contract preserves the Dafny intent. The authors state: “STAFF does not guarantee that a formally verified translation is semantically identical to the source file, but it provides additional information about the quality of the translation through five distinct checks” (Section 1, p. 41).

The evaluated set is 162 small MBPP-DFY-153 files. GPT-5.5 produced 113/162 (69.8%) initially verified translations and 130/162 (80.2%) after at most three repair iterations. These denominators are the whole curated set. The setup used Dafny 4.11.0, Frama-C 32.0 with WP and WP-RTE, Alt-Ergo 2.6.2, Z3 4.8.6, and cvc5 1.2.0 on a six-core Intel i7-1365U with 16 GB RAM (Section 4.2, pp. 44–45). “Processing all 162 files, which includes the initial generation and up to three repair iterations, took approximately 10.5 hours” (Section 5.1, p. 45).

## technique 1: validate the source before translation

Use this when a cross-language pipeline must avoid translating an already-broken source. Supply an annotated Dafny implementation and its tests. Run Dafny verification and the tests. Continue only if both pass; otherwise reject the file. The paper’s exact rule is: “If the Dafny source specifications pass the formal verification in Dafny, and the test execution succeeds, then the baseline input is considered verified. Otherwise, the file is rejected, and STAFF will not attempt to translate the file” (Section 3.2, p. 43).

Inference: in Verus, the analogous prerequisite is a successful `verus` proof of the Rust contracts plus executable tests. The constructs are `requires`, `ensures`, `invariant`, and `proof fn`; the source must be a real Rust/Verus module rather than a test-only sketch. A Verus proof still establishes only the supplied contract, so source tests are an independent behavioral signal. This is an inference because STAFF itself uses Dafny and ACSL, not Verus.

## technique 2: translate implementation and tests separately

Use this to obtain redundancy against a single model’s systematic error. Prompt an LLM to translate the verified Dafny implementation to C plus ACSL, and translate the Dafny tests to C harnesses separately. The paper recommends different LLM families for the two translations. The initial prompt asks the model to extract contracts and produce “a fully annotated C implementation with Frama-C-compatible preconditions, postconditions, loop invariants, and frame conditions” (Section 3.3, p. 43). ACSL may need explicit memory obligations absent in Dafny: “a translated ACSL specification must complement the specification with memory-validity predicates (\valid ), and aliasing constraints (\separated)” (Section 2.1, p. 42).

The HasOppositeSign example maps Dafny `ensures result <==> ...` to ACSL `ensures \result <==> ...` and adds `assigns \nothing` (Figure 1, p. 43). For array or pointer code, translation must also express validity, separation, loop invariants, and frame effects. Keep test translation independent so its signature and calls can expose interface drift.

Inference: a Verus version would ask the model for executable Rust plus `requires`, `ensures`, loop `invariant`s, and `assert`/`proof fn` support. Verus has no ACSL `assigns`; frame behavior follows Rust ownership and the contracts used for memory access. `\valid` and `\separated` do not carry over as syntax; their intended memory facts must be expressed with Verus references, tracked permissions, and predicates supported by the project. This is an inference.

## technique 3: verifier-guided repair loop

Use this when the first translation fails compilation or proof. Give the repair model only the failing annotated C program and exact Frama-C error logs, then ask it to correct parsing, compilation, or unproved goals. STAFF deliberately omits the original Dafny input from this repair prompt: “This prompt omits the initial Dafny program to avoid assigning two simultaneous tasks, which would be translating and repairing the code” (Section 3.3, p. 43). Run Frama-C WP and WP-RTE after each repair, and stop after a maximum of three iterations; the paper says the limit “was chosen based on initial experiments showing that the files are often not repaired after three iterations and it is best to instead start over translation” (Section 3.4, p. 44).

The feedback loop recovered 17 of the 48 initially non-verifying files; 12 were fixed in iteration one (Section 5.1, p. 45). The paper reports that “the repair mechanism frequently resolves memory safety and postcondition errors, but the LLM suffers from proving assertions” (Section 5.1, Answer to RQ1, p. 46). Inference: this gives a practical ordering: preserve the candidate, localize the verifier failure, make a narrow repair, then re-run the verifier.

Inference: a Verus loop would send the exact Verus error and current Rust/Verus source back to the model, request a patch, and rerun Verus. It should preserve existing contracts and add only justified `invariant`, `assert`, `lemma`-free proof functions, or trigger/quantifier facts supported by the local Verus version. The source paper does not define this Verus procedure.

## technique 4: combine five post-translation checks

Run all five checks because each detects a different failure:

1. compare counts of `requires`, `ensures`, invariants, assertions, and frame clauses. This is a soft structural check, not equivalence. Only 25/161 translated files had identical selected clause counts (Section 5.2, p. 46).
2. back-translate ACSL C to Dafny. Run the original Dafny tests on the reconstructed file, verify it with Dafny, and compare the original and reconstructed source text. The paper lists these as three automated round-trip steps (Section 3.4, p. 43). It passed tests and verification for 105/161 files, but exact textual equality occurred for only 1/161 (Section 5.2, p. 46).
3. run Frama-C WP and WP-RTE on the translated implementation. This is the primary formal check and the only check used for iterative repair (Section 3.4, p. 43). Figure 5 reports it as 130 pass and 31 fail over 161 files (Table 3 calls these the “161 non-empty benchmark files”); the headline RQ1 denominator remains 130/162 (Figure 5, p. 47).
4. mutate the C implementation with Dextool and ask Frama-C to verify each mutant. Of 161 files, 157 generated at least one mutant; 83/157 killed all generated mutants, while 74/157 left at least one surviving mutant (Section 5.2, p. 47). Surviving mutants can be equivalent, so this is evidence of contract strength, not a proof of weakness.
5. execute translated C harnesses against translated implementations. It passed 67/161, failed 63/161, and skipped 31/161, mostly because signatures did not line up (Figure 5 and Section 5.2, p. 47). Only five files passed all five checks (Section 5.2, p. 47).

Inference: for Verus, clause comparison can inspect presence of `requires`, `ensures`, and `invariant`; back-translation can compare a generated Rust/Verus artifact with a source specification; Verus proof is the primary check; mutation can alter operators or contracts and rerun Verus; and Rust tests can exercise behavior. These are adaptations, not procedures reported by the paper.

## what is proved, trusted, and limited

Proved: each successful Frama-C result proves the C implementation against its translated ACSL specification under the stated tool configuration. Measured: 113/162 initial verification, 130/162 after repair, round-trip 105/161, mutation 83/157 all killed, test execution 67/161, and five files passing all checks. Trusted: the Dafny and ACSL semantics, Frama-C/WP/WP-RTE, SMT solvers, LLM prompts, parser, test harnesses, and the assumption that the source contract captures intent. The authors explicitly state: “None of the five checks proves full semantic equivalence between the Dafny source and the generated ACSL-annotated C program” (Section 6, p. 47).

The numbers have different denominators. 130/162 is the complete curated input; the five-check results use 161 files. Inference: the paper does not explain the one-file difference, which may be the one empty first-iteration response in Section 5.1. Mutation percentages use 157 files that generated mutants. Test skips are interface failures rather than passing behavior. Inference: the five-check total is therefore a strict composite signal, not a claim of equivalence.

Inference: for VL, this workflow is a substantial product threat if an agent can produce Rust that verifies against an accidentally weakened contract. The direct reusable defense is independent test execution, mutation of implementation behavior, and checking contract structure and interfaces in addition to Verus success. The paper does not measure Verus or agent-written Rust, so the threat estimate is an inference.

## techniques for the catalog

- source validation — reject a translation unless source verification and tests both pass
- separate translation — translate implementation and tests independently and use different model families where possible
- verifier-guided repair — feed localized verifier errors to a narrow repair prompt for bounded iterations
- complementary validation — combine clause counts, round-trip reconstruction, target verification, mutation testing, and translated tests
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Most of these translations are fixed in the first iteration (12), and subsequent iterations are not as effective."): read all 8 pages and checked every quotation, number, page and section reference, and the steps of techniques 1–4 against the text, tables and figures; changed the page of the setup details (pp. 44–45), the page of Figure 1 (p. 43) and of Figure 5 (p. 47), the backslashes inside two quotations, the paraphrase of the three-iteration limit (now quoted), the claim that the 161-file denominator excludes the unusable response (the paper does not say so; now marked Inference), an unsupported run order in technique 1, and marked two of my own conclusions as Inference; did not check the cited external works, the GitHub artifact, the exact colour-to-category assignment in Figures 4 and 5 beyond the numbers stated in the text, or the Verus adaptations (which are labelled inferences).
