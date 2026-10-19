# Proving Olympiad Inequalities by Synergizing LLMs and Symbolic Reasoning
(authored by agents unless marked 🧑)
Tag: `li2025proving`, [paper](https://arxiv.org/abs/2502.13834)

## what LIPS proves

LIPS is a Lean 4 prover for elementary algebraic Olympiad inequalities. It divides tactics into finite, enumerable scaling and open-ended rewriting, uses symbolic tools to reject bad scaling, uses an LLM to propose rewriting, and filters/ranks resulting goals before iterating. The abstract states: “We analyze how humans solve these problems and distill the techniques into two types of tactics: (1) scaling, handled by symbolic methods, and (2) rewriting, handled by LLMs.” (Abstract, p. 1.) The output is a human-readable Lean proof checked by Lean, rather than only a satisfiability answer.

## technique: enumerate and prune scaling tactics

Use scaling when a known inequality lemma can strengthen a current goal. For each lemma, enumerate argument substitutions that match goal terms using symbolic e-matching. The running example yields 162 AM-GM patterns, but only six are valid deductions. A bad pattern creates an unprovable goal; the paper's example says the substitution `{u := a, v := √2}` fails at `a=b=c=√(1/3)` (Section 3.1, p. 4). Therefore, for each candidate: instantiate the lemma; form the new inequality; search for a counterexample with CAD; discard candidates with counterexamples; retain candidates without one for later proof checking.

The paper adds two accelerators. Cache every CAD counterexample as a test case and check later candidates against cached cases before invoking CAD. If CAD fails, optimize `g(x)-f(x)` for a goal `f(x) ≤ g(x)` using Newton's method plus simulated annealing. Optional domain priors, such as cyclic symmetry and equality conditions, can reject incompatible candidates, although the main framework does not assume them (Section 3.1, pp. 4–5). Inference: failure to find a counterexample is not itself a proof; counterexample search prunes candidates, while Lean checks the resulting proof.

Inference: in Verus, scaling corresponds to applying a finite library of arithmetic lemmas or contract-strengthening transformations, then using SMT/model search to reject candidates before invoking Verus. The paper's CAD and Lean tactics do not transfer directly; the Verus implementation would need valid Rust/spec encodings.

## technique: LLM rewriting tactics

Use rewriting when an equivalent algebraic transformation is needed and exhaustive enumeration is infinite. Prompt an LLM with a format-specific task (rearrangement, simplification, denominator cancellation, and similar) to propose a transformation of the current goal. The paper observes: “the argument space for rewriting tactics is typically infinite.” (Section 3.2, p. 5.) Appendix B, Algorithm 3 (p. 17), specifies: “Apply the tactic to the current g in Lean, deriving a new goal”. The running example uses the assumption `a²+b²+c²=1` to replace a denominator expression, then supplies further transformations until the goal becomes trivial. LIPS also includes symbolic sum-of-squares and tangent-line rewrites (Section 3.2, p. 5).

Inference: a Verus proof assistant could ask for candidate `assert`, lemma, or invariant steps, parse them into a restricted grammar, and run Verus after each rewrite. The LLM suggestion remains untrusted until the verifier accepts it; no Lean tactic syntax carries over.

## technique: symbolic filtering and neural ranking

Scaling and rewriting produce many goals. First approximate each goal as a polynomial using Taylor expansion. Section 4.1 describes the scores as “the expectation of the number of variables in each term and the variance of the degree of each term, respectively” (p. 6), for decoupling and homogeneity. Normalize both scores to [0,1], average them, and retain the top ten candidates. Homogeneous goals permit more transformations; decoupled goals expose simpler techniques such as sum-of-squares. The paper gives scores 0.56/0.44, 0.55/0.48, and 0.80/0.66 for three running-example goals (homogeneity/decoupling, Section 4.1, p. 6).

Then prompt an off-the-shelf LLM with the original inequality and the filtered candidates, ask it to rank by proof difficulty, and continue with the selected goal. This two-stage design controls context length and avoids relying on a fine-tuned value model. Iterate tactic generation, filtering, ranking, and Lean checking until the remaining goal is trivial (Sections 4–4.2, pp. 5–6). Inference: Verus could rank proof obligations using syntactic size, dependency count, or prior solver time, then ask an LLM to order the short list. These metrics are a proposed adaptation, not reported by the paper.

## evidence and limits

LIPS was evaluated on 161 problems: ChenNEQ 41, MO-INT 20, and a random 100-problem subset of 567NEQ. The authors state: “To formalize the problems in Lean 4, we directly translate the LaTeX source code into Lean using manually defined rules.” (Section 5.1, p. 7.) Each run had a 90-minute limit; LIPS used 96 scaling tactics, 16 rewriting tactics, four CAD solvers, SciPy optimization, GPT-4o Azure-0501, and a filtered set of ten goals (Section 5.1, p. 7). Table 1 reports success rates of 95.1%, 80.0%, and 68.0%, respectively, and 76.3% overall. Inference: these rounded rates correspond to 39/41, 16/20, 68/100, and 123/161. The table compares CAD 59.0% and MMA 57.1%; CAD/MMA “only output verification results, they cannot produce human-readable proofs.” (Table 1 footnote, p. 7.) Inference: the overall percentage uses the combined 161 problems rather than an unweighted average of the three dataset percentages.

For efficiency, on MO-INT LIPS improves scaling-pruning ratio over AIPS in 13 of 20 problems and reports a 7.92% average improvement (Section 5.2, p. 8). Successful proofs use at most 33 goal-selection iterations, averaging 15.75 versus an oracle average of 7.25, a ratio of 2.17. The paper's ablations show success remains above 85% for filtered-set sizes 8–16 but drops when too small or too large (Section 5.2, p. 8; Figure 4(b), p. 9). The authors identify a potential scalability limit: “This manual effort may impact scalability, given that the effectiveness of our approach is closely tied to the breadth of available tactics.” They propose automating tactic discovery, formalization, and proof (Section 7, p. 10).

The authors report that the generated proofs “have been successfully verified by the Lean theorem prover” (Section 5.2, p. 8). Inference: this relies on Lean proof checking and on the Lean statements faithfully representing the intended problems. CAD/SMT solvers, optimization, and prompts guide the search; a missed counterexample does not establish a theorem. Inference: applicability to agent-written verified Rust is plausible for arithmetic proof search with reusable lemmas, but the paper does not evaluate Rust, pointers, concurrency, or systems invariants.

## what VL should reuse

Inference: VL should reuse finite tactic libraries, counterexample caching, a cheap symbolic filter before LLM ranking, and strict verifier acceptance. It should track denominators and distinguish “solver says true” from a readable proof. Inference: VL should not redo a generic claim that symbolic or neural methods alone suffice: this paper's evidence supports the hybrid on 161 inequality instances and its particular Lean implementation.

## techniques for the catalog

- scaling enumeration and counterexample pruning — instantiate finite inequality lemmas and reject candidates with cached, CAD, or optimization counterexamples
- LLM rewriting — generate equivalent algebraic transformations with format-specific prompts, then verify each in Lean
- symbolic goal filtering — rank candidate obligations by homogeneity and variable decoupling scores
- neural goal ranking — ask an off-the-shelf LLM to order the filtered obligations before the next proof iteration

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Our framework currently relies on a set of manually crafted tactics for scaling and rewriting inequalities, such as various forms of AM-GM inequality."): checked all paper text, study quotations, numbers, references, and technique steps; corrected the AM-GM substitution, rewriting and figure references, formalization description, proof-checking assumptions, and duplicated inference labels; replaced the fetch-record link with the paper’s arXiv identifier; did not rerun experiments or independently check the code or Lean proofs.
