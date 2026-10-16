# From Helpful to Trustworthy: LLM Agents for Pair Programming
(authored by agents unless marked 🧑)
Tag: `ayon2026trustworthy`, [paper](https://doi.org/10.1145/3803437.3804875)

## scope and evidence
This two-page doctoral research paper proposes a driver–navigator pair-programming workflow. It is a plan plus preliminary results, not an end-to-end evaluation. Its central trust move is explicit: “Trust thus shifts away from one model’s assessment of another and toward externally verifiable evidence.” (Introduction, p.1) The paper's existing evidence comes from AutoReSpec on 72 programs and AutoJML on 120 programs; the proposed pair workflow has no reported benchmark yet. Verus, the solver, generated specifications, tests, and human intent remain trusted inputs or assumptions. Inference: a Verus deployment must treat the specification as a human-owned claim and treat successful verification as evidence only that the Rust implementation satisfies that claim.

## technique: role-separated driver and navigator
What it is: one LLM proposes artifacts and a second role critiques them. Both use role-specific prompts and separate histories but share persistent project context. The paper chooses this design because it is a minimal separation between proposal and critique. Steps described in §1: (1) the driver proposes requirements, specifications, code, tests, or maintenance changes; (2) the navigator critiques; (3) the navigator emits machine-checkable contracts and formal specifications rather than free-form judgment; (4) deterministic verifiers return proofs or counterexamples; (5) the developer confirms that the specification captures intent.

Inference: in Verus, the driver can write Rust, `spec fn` definitions, `requires`/`ensures`, loop invariants, and proof blocks. The navigator should review the contract and run `verus`; it can propose corrected proof code after a counterexample. The paper does not claim that two LLMs remove specification errors, and Verus constructs must follow the supported forms documented in the local Verus studies. Separate histories reduce prompt contamination, but they do not make either model independent in a statistical sense.

## technique: verifier-guided specification refinement
AutoReSpec is the paper's preliminary method. It “classifies programs by structural complexity, selects a pair of primary and fallback LLM pair, and iteratively refines specifications using verifier feedback.” When the primary fails, “a collaborative fallback model receives the last failed candidate and verifier errors for focused recovery.” (§3, p.2) Apply it as: classify the target; choose primary and fallback models; generate a specification; invoke the verifier; pass the failed candidate and verifier diagnostics to the fallback; repeat until verification succeeds or the budget is exhausted.

Inference: replace JML with Verus contracts and replace verifier errors with Verus diagnostics and counterexamples. A `proof fn` may establish intermediate facts, but it is erased and cannot be called as runtime code. The paper's workflow does not specify how to validate Rust ownership, external-library models, or unsafe code, so those remain additional proof obligations.

Evidence: on the 72-program benchmark, AutoReSpec verified 67 programs, with “a 58.2% success probability and 69.2% completeness,” and reduced average evaluation time by 26.89% over prior methods (§3, p.2). The denominator is 72 programs. The paper does not give confidence intervals, per-class counts, or the exact baseline denominator, so these percentages should not be treated as universal reliability estimates.

## technique: mutation-driven completeness feedback
AutoJML “automates JML specification synthesis via iterative verification and mutation-driven completeness feedback, and additionally leverages web-based context retrieval.” (§3, p.2) The operational pattern is: synthesize a candidate contract; verify it; generate or apply mutants; measure which mutants the contract distinguishes; feed incompleteness back into the next synthesis round; optionally retrieve context; repeat. Inference: Verus can use mutated Rust implementations or mutated postconditions as a falsification set, then require the contract to reject the mutants while preserving the reference. Mutation scores are evidence about test/specification strength, not proof of completeness.

Evidence: AutoJML verified 109 of 120 programs, average completeness 79.3%, with reported completeness of 81.48% on multi-path loops and 85.71% on nested loops (§3, p.2). The denominator for the headline is 120 programs; the loop percentages use their respective control-flow subsets, whose sizes the paper does not state. The study is preliminary and does not report a Verus implementation.

## planned maintenance technique
The future plan anchors refactoring, dependency upgrades, documentation updates, and migrations to existing specifications and test suites. The stated questions ask whether constraints prevent regressions, whether solver-backed counterexamples improve refinement, and whether generated documentation introduces misleading statements (§3, p.2). Apply it by treating every maintenance patch as a typed change, replaying tests and Verus proofs, and retaining receipts. Inference: a proof lane should record the exact Verus command, toolchain, dependency lockfile, and relevant assumptions; otherwise a passing proof may be unreproducible after an upgrade.

## what remains trusted and threat to VL
The paper's deterministic verifier reduces reliance on model judgment, but the developer still decides whether the formal specification matches intent. Existing AutoReSpec and AutoJML numbers are author-reported preliminary evidence, not evidence that pair programming works at repository scale. Inference: threat to agent-written verified Rust is medium. The workflow could improve auditability and expose counterexamples early, but it cannot detect an omitted security property, an incorrect external-body assumption, or a verifier-model mismatch. VL should reuse the driver–navigator separation, machine-checkable feedback, and mutation loop; it should measure accepted behavior changes, proof repair time, false confidence, and maintenance regressions. Existing verifier-guided specification synthesis means VL should not present that loop itself as novel.

## techniques for the catalog
- role-separated pair programming: use a proposing driver and a contract-producing navigator with shared project context
- verifier-guided refinement: pass failed candidates and deterministic diagnostics into the next specification attempt
- mutation completeness feedback: mutate programs or contracts to expose missing behavioral distinctions
- proof-anchored maintenance: gate refactors and migrations with existing specifications, tests, and reproducible verification receipts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
