# Laurel: Unblocking Automated Verification with Large Language Models
(authored by agents unless marked 🧑)
Tag: `mugnier2025laurel`, [paper](https://doi.org/10.1145/3720499)

## problem and result

Laurel generates missing inline assertions for Dafny lemmas that fail because an SMT solver cannot bridge an intermediate reasoning step. The paper focuses on large industrial verification code, where proofs make heavy use of user-defined types, functions, and auxiliary lemmas (§1, pp. 2–3). It targets assertion generation for existing proofs rather than whole-proof synthesis or loop-invariant generation; the authors report loop invariants are under 0.5% of LOC in the codebases they analyzed (§1, p. 3). “Program verifiers such as Dafny automate proofs by outsourcing them to an SMT solver.” (Abstract, p. 1)

Laurel combines two prompt specializations: localizing the assertion with a verifier-error-based placeholder, and selecting six (𝑚 = 6) in-context assertions from structurally similar proofs. The abstract reports “over 56.6% of the required assertions given only a few attempts” (Abstract, p. 1). The task count is inconsistent inside the paper: Table 1 (p. 11) lists 145 extracted assertions and the contribution summary says “82/145 (56.6%)” (§1, p. 3), while the §5 text (p. 12) and §6.1 (p. 13) say 143 tasks. Inference: 82/145 = 56.6% and 82/143 = 57.3%, so the reported 56.6% matches the 145 denominator. The paper uses GPT-4o, Dafny 4.3.0, temperature 1.0, and ten attempts per task (§6.1, p. 13).

## technique: verifier-error localization and assertion placeholders

What it is. Laurel runs Dafny on a failing lemma, uses the acyclic control-flow-graph intermediate representation Dafny uses to generate verification conditions, maps each violation in the error message to an `assert` in that graph (plus the faulty branch, when the message names one), then chooses candidate insertion points. It inserts an assertion placeholder at the chosen location and asks the LLM to generate one assertion for it. “At a high level, the localization proceeds in three steps: (1) desugaring the Dafny program into an intermediate representation; (2) analyzing the error message to identify the violations and the faulty branch; and (3) determining the placeholder locations based on the control flow of the lemma and the information extracted from the error message.” (§3, p. 6)

How to apply it.

1. Run the verifier on the target lemma and obtain the error message (§2, p. 5).
2. Desugar the lemma into an acyclic control-flow graph in which specifications, calls, and loops become primitive `assume` and `assert` statements (§3, p. 7).
3. Associate each violation in the error message with the `assert` in the graph that could not be proved; handle violations separately, in the order they appear in the graph (§3, p. 8).
4. Prefer a location as close as possible before the violation, so the assertion has the most influence on the solver (§3, p. 8).
5. Also include locations inside ancestor nodes that add assumptions or local variables (§3, p. 8).
6. If the error message identifies a faulty branch, keep only locations inside that node (§3, p. 8).
7. Put candidate locations at the end of their nodes, closest to the violation and after all the node's assumptions and variables (§3, p. 8); insert the placeholder there and ask the LLM for an assertion (§2, p. 5).
8. Replace the placeholder with the output, rerun Dafny, and re-query with the same prompt up to 𝑘 = 10 attempts; in the experiments the authors sample the 𝑘 outputs at once to save cost (§2, pp. 5–6).

In the motivating `ParseDigitsAndDot` example, the needed assertion relates the string passed to `ParseDecStr` in the current context to the one passed to the recursive call, inserted at the end of the else branch, after the recursive call (§2, p. 4). In the `LemmaUnionSize` example, faulty-branch information leaves only the end of node 4 as the candidate, where `xr`, `yr`, and `y` are in scope; the paper's repair is printed as `assert xr + yr = xs + ys - y;` in the extracted text (§3, p. 8).

Evidence. On the DafnyGym tasks (§6.1), Baseline (lemma code only) solves 6.2% at 𝑘 = 10 (§6.2, p. 13), and adding the raw error message reaches around 15% (§6.2, p. 14). Placeholder reaches 34.4% at 𝑘 = 10, while Placeholder+Error drops to 26.2% (§6.3, pp. 15–16). The authors attribute the Placeholder gain to LLMs being “better at code in-filling than at error localization” (§6.3, p. 16). Without a placeholder, Baseline's assertion location has a median distance of 2.8 lines from the ground-truth location (§6.2, p. 14).

Verus form. Inference: Verus users can build the same loop around `verus` diagnostics: run verification, identify the failing `assert`, `requires`, `ensures`, or loop `invariant`, and insert a candidate `assert` immediately before the failing obligation. Inference: a temporary source transformation can mark candidate insertion points in the failing function, but the generated assertion must be checked by Verus before acceptance. Inference: this technique supplies proof hints for existing contracts; it does not synthesize a missing `ensures` contract or prove that the contract states the product requirement. Inference (not from the paper): Verus's `invariant` is a clause on a loop, not a function call, and proof-only functions must not be called at runtime.

Limits. Laurel assumes the lemma can be fixed by inserting a single assertion (§2, p. 5). The authors sketch extensions to multiple assertions and state “The evaluation of these extensions is left for future work” (§6.6, p. 20). Inference: localization depends on the verifier's message naming the violation and, ideally, the faulty branch; a verifier with only a generic failure message would need a different localization method.

## technique: hierarchical proof-similarity retrieval

What it is. Laurel selects six existing assertions from the same codebase as few-shot examples, choosing those whose context (the surrounding lemma with the assertion removed) is most similar to the target lemma (§2, p. 6). It defines a hierarchical sequence similarity that needs no parsing. At the token level, identifiers are treated as equal to one another while other tokens match only themselves. Token similarity composes into line similarity, and line similarity composes into proof-context similarity. A Wagner–Fischer-style dynamic program finds the best ordered matching and normalizes the score to [0, 1] (§4, pp. 9–10). “A similarity algorithm that leverages this structure can closely approximate the tree edit distance without the need for language-specific parsing” (§4, p. 9).

How to apply it.

1. Represent each proof context as a lemma with a single placeholder for the missing assertion, and each demonstration as a context plus its target assertion (§4, p. 8).
2. Treat each line as a sequence of lexer tokens. Define `TokenSim` to treat all identifiers as equal but other tokens as equal only to themselves (§4, p. 10).
3. Compute similarity with Algorithm 1: initialize an `(n+1)×(m+1)` table of zeros, set each cell to the maximum of skipping an element of either sequence or matching the two elements and adding their similarity σ (§4, p. 9).
4. Divide the final cell by the longer sequence length, giving 1 for identical sequences and 0 for no commonality (§4, pp. 9–10).
5. Use `LineSim` = S over tokens with `TokenSim`, and `ProofSim` = S over lines with `LineSim` (§4, p. 10).
6. Consider all assertions from the codebase except the target as candidates, select the top 𝑚 = 6, and include them as in-context examples in the prompt (§6.4, p. 16; Fig. 8, p. 14).
7. Keep the placeholder and the retrieved examples together; the authors report the two techniques are complementary (§6.4, p. 17).

Evidence. In Fig. 5, 22 of 35 tokens in the longer example assertion match, giving LineSim 22/35 ≈ 0.63 (§4, p. 10). Across DafnyGym, Similarity verifies up to 56.6%, versus 51.7% for Random same-codebase examples, 46.8% for Similarity-no-placeholder, and 34.4% for Placeholder alone (§6.4, p. 17). Against other metrics, Similarity reaches 56.6%, Embedding 55%, TF-IDF 53.6%, and Random 51.7%; the authors call the difference between metrics “small” (§6.4, p. 18). Cedar benefits most, with at least 30% between Placeholder and any variant with examples (§6.4, p. 17).

Verus form. Inference: index existing Verus proof functions, `assert` statements, contracts, and nearby declarations; tokenize their Rust/Verus syntax; and retrieve structurally similar snippets without requiring a learned embedding model. Inference: normalize identifier names but preserve Verus keywords and operators so that `requires`, `ensures`, `assert`, and sequence operations remain meaningful. Inference: present six retrieved examples plus a marked insertion point to the LLM, then run Verus and accept only a candidate that verifies. The paper calls the metric “language-agnostic” (§1, p. 3). Inference: only the token categories (which tokens count as identifiers) must be defined for Verus syntax.

Limits. Retrieval relies on existing assertions in the codebase, which the authors say “is only possible in a mature codebase with many assertions” (§6.6, p. 20). On a sample of 13 tasks, increasing the existing assertions from 25% to 100% improved performance gradually (§6.6, p. 20). Inference: the metric measures structural similarity, not semantic relevance; the paper reports failures when a needed function is missing from the context and when a function is overused in the target lemma (§6.5, pp. 19–20).

## technique: verifier-in-the-loop multi-attempt repair

Laurel's complete loop is: construct a localized prompt, sample ten LLM outputs, insert each candidate, rerun Dafny, and count a task solved in 𝑘 attempts if any of the first 𝑘 candidates makes the lemma verify (§2, pp. 5–6; §6.1, p. 13). Temperature is 1.0 to increase generation variety (§6.1, p. 13). The verifier, not syntactic identity to the original assertion, is the correctness oracle (§5, p. 12). Iterative prompting, which re-prompts with the new error message after a failure, reaches 29.6%, but the authors note it “effectively doubles the number of attempts” so “the comparison is not entirely fair” (§6.2, p. 15).

Inference: for Verus, use a bounded repair budget and record attempts, verifier time, and the exact diagnostic for each candidate. Inference: retain only source transformations that compile and verify; a generated assertion that suppresses a failure by weakening or deleting a contract must be rejected by policy. Inference: report first-attempt and ten-attempt success separately, because the paper's metric (verified in at most 𝑘 attempts) mixes model quality with retry budget.

## dataset, evidence, and failure boundaries

DafnyGym contains lemmas from Dafny Libraries, Cedar, and DafnyVMC. Table 1 lists 33,054 LOC, 2,613 assertions (7.9% of LOC), and 108 loop invariants (0.3% of LOC); the extracted assertion counts are 58, 54, and 33, totaling 145 (§5, p. 11). An assertion enters the dataset only if removing it alone makes the lemma fail to verify, and assertions with exact duplicates in the same lemma are excluded (§5, p. 12). The §5 text and §6.1 say 143 tasks (pp. 12–13); see the inconsistency noted above.

The authors found two failure sources most prevalent in a manually analyzed sample: a function missing from the context and a function overused in the context (§6.5, pp. 19–20). In the missing-function example, the LLM proposed `inferArith`, which does not exist; the codebase has `inferArith1` and `inferArith2` (§6.5, p. 19). In the overused-function example, `Flatten` appears nine times in the lemma and the LLM “refuses to generate any assertions without it” (§6.5, p. 20). Threats listed in §6.6 (pp. 20–21): internal, randomness from a single run and possible data leakage; external, one assertion at a time, dependence on existing assertions, only GPT-4o, and only three codebases. The artifact (Laurel implementation, experiments, results) and the DafnyGym dataset are on Zenodo (§9, p. 23).

Inference: the trusted base includes the Dafny verifier, its SMT solver, the source specifications and existing assertions, the CFG/error analysis, the similarity implementation, and the LLM/API. Inference: a successful candidate only makes the existing Dafny obligations verify; it does not establish that the top-level specifications are correct. Inference: for Verus, the analogous trusted base includes Verus, its solver, Rust compilation and proof erasure, external-library contracts, and the generated specification itself.

## techniques for the catalog

- verifier-error placeholder localization — desugar failing code, map diagnostics to CFG branches, and insert a marked assertion point with all relevant locals in scope
- hierarchical proof similarity — retrieve examples by dynamic-programming similarity over tokens, lines, and proof contexts
- six-example prompt specialization — add the top six same-codebase repairs to a localized LLM prompt
- verifier-in-the-loop retries — insert each generated assertion, rerun the verifier, and count success only when the obligation verifies
- bounded assertion repair — evaluate success as verified in at most k attempts and report the denominator and retry budget
- failure-aware retrieval — detect missing helper functions and sparse codebases as limits on example-based prompting
