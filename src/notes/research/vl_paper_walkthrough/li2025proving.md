# Proving Olympiad Inequalities by Synergizing LLMs and Symbolic Reasoning
(authored by agents unless marked 🧑)
Tag: `li2025proving`, [paper](https://www.semanticscholar.org/paper/0ad548be651782ebe7ae95dc234694662b54abe8)

## what LIPS proves

LIPS is a Lean 4 prover for elementary algebraic Olympiad inequalities. It divides tactics into finite, enumerable scaling and open-ended rewriting, uses symbolic tools to reject bad scaling, uses an LLM to propose rewriting, and filters/ranks resulting goals before iterating. The abstract states: “We analyze how humans solve these problems and distill the techniques into two types of tactics: (1) scaling, handled by symbolic methods, and (2) rewriting, handled by LLMs.” (Abstract, p. 1.) The output is a human-readable Lean proof checked by Lean, rather than only a satisfiability answer.

## technique: enumerate and prune scaling tactics

Use scaling when a known inequality lemma can strengthen a current goal. For each lemma, enumerate argument substitutions that match goal terms using symbolic e-matching. The running example yields 162 AM-GM patterns, but only six are valid deductions. A bad pattern creates an unprovable goal; the paper's example says the substitution `{u := a, v := 2}` fails at `a=b=c=√(1/3)` (Section 3.1, p. 4). Therefore, for each candidate: instantiate the lemma; form the new inequality; search for a counterexample with CAD; discard candidates with counterexamples; retain candidates without one for later proof checking.

The paper adds two accelerators. Cache every CAD counterexample as a test case and check later candidates against cached cases before invoking CAD. If CAD fails, optimize `g(x)-f(x)` for a goal `f(x) ≤ g(x)` using Newton's method plus simulated annealing. Optional domain priors, such as cyclic symmetry and equality conditions, can reject incompatible candidates, although the main framework does not assume them (Section 3.1, pp. 4–5). The method is sound only relative to the counterexample search and later Lean verification: failure to find a counterexample is not itself a proof.

Inference: in Verus, scaling corresponds to applying a finite library of arithmetic lemmas or contract-strengthening transformations, then using SMT/model search to reject candidates before invoking Verus. The paper's CAD and Lean tactics do not transfer directly; the Verus implementation would need valid Rust/spec encodings.

## technique: LLM rewriting tactics

Use rewriting when an equivalent algebraic transformation is needed and exhaustive enumeration is infinite. Prompt an LLM with a format-specific task (rearrangement, simplification, denominator cancellation, and similar) to propose a transformation of the current goal. The paper observes: “the argument space for rewriting tactics is typically infinite.” (Section 3.2, p. 5.) Each candidate must be translated into Lean and checked. The running example uses the assumption `a²+b²+c²=1` to replace a denominator expression, then supplies further transformations until the goal becomes trivial. LIPS also includes symbolic sum-of-squares and tangent-line rewrites (Section 3.2, pp. 5–6).

Inference: a Verus proof assistant could ask for candidate `assert`, lemma, or invariant steps, parse them into a restricted grammar, and run Verus after each rewrite. The LLM suggestion remains untrusted until the verifier accepts it; no Lean tactic syntax carries over.

## technique: symbolic filtering and neural ranking

Scaling and rewriting produce many goals. First approximate each goal as a polynomial and compute decoupling (expected number of variables per term) and homogeneity (variance of term degrees). Normalize both scores to [0,1], average them, and retain the top ten candidates. Homogeneous goals permit more transformations; decoupled goals expose simpler techniques such as sum-of-squares. The paper gives scores 0.56/0.44, 0.55/0.48, and 0.80/0.66 for three running-example goals (homogeneity/decoupling, Section 4.1, p. 6).

Then prompt an off-the-shelf LLM with the original inequality and the filtered candidates, ask it to rank by proof difficulty, and continue with the selected goal. This two-stage design controls context length and avoids relying on a fine-tuned value model. Iterate tactic generation, filtering, ranking, and Lean checking until the remaining goal is trivial (Sections 4–4.2, pp. 5–6). Inference: Verus could rank proof obligations using syntactic size, dependency count, or prior solver time, then ask an LLM to order the short list. These metrics are a proposed adaptation, not reported by the paper.

## evidence and limits

LIPS was evaluated on 161 problems: ChenNEQ 41, MO-INT 20, and a random 100-problem subset of 567NEQ. Problems were manually translated from LaTeX into Lean; each run had a 90-minute limit; LIPS used 96 scaling tactics, 16 rewriting tactics, four CAD solvers, SciPy optimization, GPT-4o Azure-0501, and a filtered set of ten goals (Section 5.1, p. 7). Table 1 reports success rates: ChenNEQ 39/41 = 95.1%, MO-INT 16/20 = 80.0%, 567NEQ 68/100 = 68.0%, total 123/161 = 76.3%. The table compares CAD 59.0% and MMA 57.1%; CAD/MMA “only output verification results, they cannot produce human-readable proofs.” (Table 1 caption, p. 7.) The percentages have those dataset denominators, not a common per-problem average.

For efficiency, on MO-INT LIPS improves scaling-pruning ratio over AIPS in 13 of 20 problems and reports a 7.92% average improvement (Section 5.2, p. 8). Successful proofs use at most 33 goal-selection iterations, averaging 15.75 versus an oracle average of 7.25, a ratio of 2.17. The paper's ablations show success remains above 85% for filtered-set sizes 8–16 but drops when too small or too large (Figure 5, p. 9). The paper states that the manually crafted tactic library is a direct scalability limit; the authors propose automating tactic discovery and formalization (Section 7, p. 10).

Lean, its kernel, the manually formalized tactics, LaTeX-to-Lean translation, CAD/SMT solvers, optimizer, prompts, and the correctness of problem statements remain trusted or assumed. Inference: threat to agent-written verified Rust is high for arithmetic proof search but bounded to domains with reusable tactic schemas. LIPS demonstrates a concrete generate-prune-rank-check loop; it does not establish that an LLM's rewrite is semantically valid before Lean checks it, nor that the technique handles pointers, concurrency, or systems invariants.

## what Inference: VL should reuse

Inference: Inference: VL should reuse finite tactic libraries, counterexample caching, a cheap symbolic filter before LLM ranking, and strict verifier acceptance. It should track denominators and distinguish “solver says true” from a readable proof. Inference: Inference: VL should not redo a generic claim that symbolic or neural methods alone suffice: this paper's evidence supports the hybrid on 161 inequality instances and its particular Lean implementation.

## techniques for the catalog

- scaling enumeration and counterexample pruning — instantiate finite inequality lemmas and reject candidates with cached, CAD, or optimization counterexamples
- LLM rewriting — generate equivalent algebraic transformations with format-specific prompts, then verify each in Lean
- symbolic goal filtering — rank candidate obligations by homogeneity and variable decoupling scores
- neural goal ranking — ask an off-the-shelf LLM to order the filtered obligations before the next proof iteration

Checked 2026-10-15 against the paper by a Codex agent for proving_olympiad_inequalities_by_synergi_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
