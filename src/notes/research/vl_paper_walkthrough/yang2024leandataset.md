# A Lean Dataset for International Math Olympiad: Small Steps towards Writing Math Proofs for Hard Problems
(authored by agents unless marked 🧑)
Tag: `yang2024leandataset`, [paper](https://arxiv.org/abs/2411.18872)

## dataset as a verification technique

This paper contributes complete Lean 4 proofs for 17 IMO problems (14 missing miniF2F test proofs and three 2022–2023 problems), plus a decomposed dataset of 1,329 lemmas from 13 problems. The abstract reports “5,880 lines of Lean proof” for the complete problems and “1,329 lemmas with more than 40k lines of Lean code.” (Abstract, p. 1) Every dataset lemma has a formal Lean 4 proof, version 4.17 (Section 2.1, p. 5).

The technique is to make proof construction measurable at two levels: a hard theorem and approachable intermediate obligations. Use it when an agent cannot reliably produce a long proof and you need failure localization, training examples, or a staged proof plan.

## technique: hierarchical lemma decomposition

Start with a human or existing formal proof. Identify intermediate hypotheses proved sequentially. For IMO 1997 P5, the paper extracts four direct steps: prove `y² < x`; prove `2*y² < x`; prove a prime-factorization inequality; and prove `(y²)^x` divides `x^x` (Section 4.1, p. 10). Then create additional lemmas by granting prefixes of those hypotheses to the original goal. The paper lists Lemmas 5–8, each granting one more of Lemmas 1–4 before proving the final divisibility result (Section 4.1, p. 10).

Operational steps:

1. write the original theorem and its intermediate hypotheses;
2. turn each hypothesis into an independently proved lemma;
3. create prefix-context variants that assume earlier lemmas;
4. recursively decompose any extracted lemma whose proof exceeds the chosen threshold;
5. compile every lemma in Lean and retain dependency links.

The paper derives an upper bound for a proof with `n` lines and `k=(n−1)/3` one-line intermediate hypotheses: `2k = 2/3*(n−1)` extracted lemmas (Section 4.1, p. 10). This is a counting bound, not an observed dataset size.

Inference: in Verus, use `spec fn` predicates for intermediate mathematical facts and `proof fn` lemmas for each edge; keep a top-level proof that calls the lemmas in dependency order. Rust executable code should remain separate from proof-only functions. Verus’s arithmetic and quantifier automation differ from Lean’s tactics, so the decomposition transfers as a planning structure, not as source syntax.

## technique: formal statement and proof alignment checks

The evaluation gives o3-mini both the formal Lean statement and a request to explain the theorem, approach, and proof step by step. The authors then check natural-language/formal alignment and whether the Lean proof compiles. They explicitly track a “Match between NL and Lean” column because “A LLM may describe a proof in NL, but follow a different approach when writing the proof in Lean.” (Section 3.1, p. 5)

Use this as a review gate: render the intended statement in plain language, compare it with the formal statement, compile the formal proof, and compare the proof explanation with the actual Lean script. A proof that compiles but proves a changed statement is a translation failure.

Inference: VL can perform the same triple check for Rust verified code: source requirement, Verus contract, and proof implementation. Store the comparison with the commit and verifier version; compilation proves the contract, not requirement fidelity.

## technique: compiler-feedback repair loop

For each incorrect o3-mini proof, the authors provide up to ten rounds of automatically generated feedback from REPL, a Lean library that summarizes compilation errors (Section 3.1, p. 6). The total correct rate rises from 6.0% zero-shot to 18.4% after five rounds and 23.8% after ten over all 1,329 lemmas (Table 3, p. 6). Gains are uneven: 1962-p2 rises from 7.1% to 42.9%, while 1959-p1 remains 50.0% throughout; percentages use each problem’s lemma count as denominator.

Use the loop by compiling the current proof, feeding structured errors back to the model, and stopping after a fixed number of rounds or when the proof passes. Categorize residual failures as hallucinated library lemmas, wrong approach, wrong implementation, incomplete proof, or minor argument errors (Section 3.1, pp. 6–7).

Inference: Verus can use verifier diagnostics in the same loop, but a passing repair must be checked against the original contract and not only against the latest error. Keep the initial failed proof and all repairs so regressions are visible.

## evidence about model capability

On the full 1,329-lemma set, DeepSeek-Prover-v1.5-RL proves 522 (39.3%), Goedel-Prover 504 (37.9%), ReProver without retrieval 436 (32.8%), ReProver with retrieval 439 (33.0%), and o3-mini 316 (23.8%) (Table 5, p. 7; denominator 1,329). The paper also reports 75.5% correct natural-language proofs versus 23.8% correct Lean proofs for o3-mini (Table 2, p. 6), showing that prose correctness is not formal correctness.

Proof length matters. The 1,329 lemmas divide into 497 proofs of 1–2 lines, 204 of 3–5, 169 of 6–10, 103 of 11–15, 128 of 16–25, 210 of 26–100, and 18 of 101–298 lines (Table 6, p. 9). DeepSeek accuracy is 84.3% on the 497 short lemmas and 0% for every bin longer than 10 lines; o3-mini reaches 5.8% on 11–15 lines and 1.9% on 26–100. These denominators are the row counts in Table 6, not the full dataset.

The final error audit reports that among all 1,329 o3-mini attempts, 23.8% have no error; 2.3% include hallucinated lemmas, 20.4% a wrong approach, 46.9% a wrong implementation, 9.0% an incomplete proof, and 75.1% minor errors (Table 4, p. 7). Categories overlap, so they do not sum to 100%.

Inference: the threat to VL is high for long, planned proofs: compiling partial lemmas does not imply the agent can compose them. The dataset supports curriculum and diagnosis, while Verus should measure contract-level success by lemma depth, dependency count, and proof length rather than a single aggregate pass rate.

## trusted scope and limitations

Lean’s kernel checks the submitted proof terms, but the dataset’s theorem statements and decomposition are human-authored artifacts. The paper records altered or simplified problem statements in prior literature and uses formalization to expose missing steps (Section 2, pp. 4–5). The benchmark does not prove that an informal IMO solution is correct unless the formal statement faithfully captures it. Model results are tied to Lean 4.17, Mathlib state, prompts, and the listed models; they do not establish Verus performance.

What VL should reuse is the hierarchical benchmark, compiler-feedback loop, proof/error taxonomy, and explicit denominators. VL should not redo an undifferentiated “whole theorem succeeds” metric that hides whether a model can solve intermediate obligations or compose them.

## techniques for the catalog

- hierarchical lemma decomposition: split a long proof into intermediate facts and prefix-context variants
- statement/proof alignment: compare natural-language intent, formal contract, and compiled proof behavior
- compiler-feedback repair: iterate structured verifier diagnostics for a bounded number of rounds
- proof-length stratification: report success by proof-size bins and explicit row denominators
- overlapping error taxonomy: distinguish hallucination, wrong approach, implementation, incompleteness, and minor errors
Checked 2026-10-14 against the paper by a Codex agent: audit record yang2024leandataset; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
