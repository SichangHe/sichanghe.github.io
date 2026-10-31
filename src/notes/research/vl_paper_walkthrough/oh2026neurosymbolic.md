# Neurosymbolic Language Reasoning as Satisfiability Modulo Theory
(authored by agents unless marked 🧑)
Tag: `oh2026neurosymbolic`, [paper](https://arxiv.org/abs/2602.18095)

## problem and contribution
The paper targets natural-language tasks whose documents contain both prose judgments and explicit logical relations. Its Logitext language annotates natural-language text constraints (NLTCs), then interleaves LLM text evaluation with an SMT solver. The abstract states: “We introduce Logitext, a neurosymbolic language that represents documents as natural language text constraints (NLTCs), making partial logical structure explicit.” (Abstract, p. 1.) The abstract further claims that experiments on a new content moderation benchmark, LegalBench and Super-NaturalInstructions “show that Logitext improves both accuracy and coverage.” (Abstract, p. 1.) The main-text task-execution results are mixed, as listed under technique 3.

Inference: this is a solver-orchestration technique, not a proof that an LLM’s textual judgment is true. The SMT part can guarantee consistency with encoded Boolean constraints; NLTC truth values remain model outputs and therefore trusted or checked only by repeated model calls.

## technique 1: partial formalization with Logitext and NLTCs

What it is. Logitext enriches an ordinary document with typed variables, `let` bindings that bind prose clauses to variables, logical code blocks, and `forall`/`forsome` convenience constructs. In the paper’s moderation example, disruptive behavior is `d = C1 ∧ C2 ∧ (C3 ∨ C4 ∨ C5)`, while textual clauses define what each `Ci` means (Figure 1 and Section 2.1, pp. 2–3; Section 3.1, pp. 4–5). The paper says: “Logitext extends conventional text prompts into hybrid text/logic documents, enabling natural language clauses to interact directly with formal constraints.” (Section 3.1, p. 4.)

How to apply it.

1. Declare Boolean variables and explicitly type string variables, for example `(M:str, d, t, C1, …)`.
2. Wrap each prose condition in a `let` binding that names the output variable and links referenced substrings to context variables. The paper’s syntax is `{{let v = [[clause]] where u1 is p1 ... un is pn}}` (Section 3.1, p. 5; Appendix A.2, p. 12).
3. Put Boolean relations in a code block using Z3/PyZ3 notation, such as `C8 = C4 or C5`, `d = C1 and C2 and (C3 or C4 or C5)`, and `t = C6 and C7` (Figure 3, p. 4).
4. Parse the document into variables, logical formulas, and NLTC records. Each NLTC stores its bound variable, clause text, dependencies, and full document context (Section 3.2, pp. 5–6).
5. Invoke `check(d,p,cover)`, where `p` is a partial assignment. It returns a full assignment, `unsat`, or `timeout`; `cover=True` asks for multiple satisfying assignments (Section 3.1, p. 5).

Verus form. Inference: encode the Boolean skeleton as Rust enums or booleans and prove formula relationships with `spec fn`, `ensures`, and `assert`. A textual clause should be an untrusted input to a verifier function whose contract states only the returned Boolean value and its provenance; a Verus proof cannot establish that prose “is hateful” without a formal semantic model. Inference: keep parsing and variable-dependency invariants in executable Rust, use `proof fn` for formula lemmas, and treat the LLM classifier as an external assumption.

Evidence and limits. The paper defines two gaps. The compositional gap is the difference between LLM-only whole-prompt accuracy and accuracy obtained when a solver evaluates the logical formula from LLM clause values; the combinatorial gap is the relative discrepancy between the number of satisfying assignments the LLM generates and the number a solver enumerates (Appendix A.1, p. 12). On the paper’s content-moderation policies (Section 2.2 says 6–21 clauses; Figure 2 labels 6 to 22), “even state-of-the-art models such as GPT-5 fail to recover over 99% of satisfying assignments that an SMT solver (Z3) can enumerate, and GPT-4o-mini fails completely across all tasks.” (Section 2.2, p. 4.) The compositional gap is reported to shrink with model scale and the combinatorial gap to stay severe (same section). Inference: these percentages concern the paper’s benchmark and definitions, not all language reasoning.

## technique 2: interleaved SMT/NLSolver algorithm

What it is. Logitext uses an outer loop in which Z3 proposes Boolean assignments and an inner NLSolver proposes and verifies strings. If no text satisfies a Boolean candidate, the solver blocks that candidate and asks Z3 for another. The paper states: “The overall strategy is simple. A logical solver (we use Z3 de Moura & Bjørner (2008)) produces candidate Boolean assignments that satisfy Boolean constraints (Fig 4a), and our LLM-based solver (called NLSolver) then attempts to produce assignments to string variables that satisfy text constraints while maintaining the Boolean assignments (Fig 4a).” (Section 3.3, p. 6.)

How to apply it.

1. Parse `D=(vs,us,ϕ,ν)` and partial assignment `πD`.
2. Ask Z3 for a satisfying Boolean assignment `πZ` consistent with `ϕ` and `πD`; return `UNSAT` if none exists (Figure 4a, p. 6; Algorithm 2, p. 15).
3. For each unbound string variable `u`, call NLSolver with its relevant NLTCs and all assignments accumulated so far.
4. NLSolver first calls `LLMPropose` to produce a candidate string `u*`. For up to `T` rounds, `LLMVerify` evaluates every relevant NLTC; if any value disagrees with the required assignment, add that constraint to the needs-to-change set and call `LLMPropose` again (the full Algorithm 2 also passes the history of earlier proposals) (Figure 4b, p. 6; Algorithm 2, p. 15).
5. If NLSolver fails, block `πZ` in Z3 and continue with another Boolean candidate. If all strings succeed, return the combined assignment; after `T` failed rounds, report failure (Section 3.3, p. 6).
6. Cache exact and partial matches for expensive `LLMPropose` calls and retain refinement history; the paper calls these “two further techniques that have modest impact” (Section 3.3, p. 7; Algorithm 2, p. 15).

Verus form. Inference: represent solver state with a typed record containing the current partial assignment, blocked candidates, and refinement history. Prove loop `invariant` clauses that every blocked Boolean assignment violates a recorded textual constraint and that every returned assignment satisfies the encoded Boolean formula. Use `ensures` for `check`’s result cases (`Sat`, `Unsat`, `Timeout`). Verus cannot prove the LLM’s `LLMVerify` result; a trusted adapter contract must state what that call returns, and cache correctness must be proved separately from model quality.

Evidence and limits. On text instance generation, Logitext reaches near-saturation with GPT-5-nano while direct prompting of GPT-5 shows noticeable degradation, most evident on complex moderation policies (Section 4.2, p. 8; Figure 5a). On text coverage generation under a fixed 3000 s budget, candidate generation is significantly faster with Logitext because it uses a solver rather than repeated LLM calls, but NLSolver calls dominate the solving phase; the baseline GPT is allowed up to 5 iterations for candidates and 5 more for satisfying assignments (Section 4.2, p. 8). Figure 6 reports that more NLSolver iterations improve success; caching helps some settings but has limited aggregate effect. Section 4.2 names two error sources in task execution: wrong clause-level LLM outputs, and list annotations (“x, y, and z”) meant as examples but annotated as conjuncts (Section 4.2, pp. 8–9). Appendix A.4 analyses clause-level accuracy for one policy with gpt-4.1-nano and notes that a clause error does not necessarily cause a global error (pp. 13–14).

## technique 3: task modes and solver-backed generation

What it is. The same `check` interface supports classification, partially constrained text generation, and coverage generation. The paper gives the forms `lt.check(d, {'M': M})['d']`, `lt.check(d, {'C4': False, 'C5': False})['M']`, and `[g['M'] for g in lt.check(d, {'C4': False, 'C5': False}, cover=True)]` (Section 3.1, p. 5).

How to apply it.

1. For classification, bind the input string and read the requested Boolean output.
2. For constrained generation, bind required clause values and read a generated string satisfying the formula.
3. For coverage generation, set `cover=True` and enumerate returned assignments until the desired coverage or resource limit.
4. Use the same parsing, solver, and verification pipeline for content moderation, LegalBench, and Super-NaturalInstructions; the paper evaluates five tasks from each benchmark, 15 tasks total (Section 4.1, pp. 7–8).

Verus form. Inference: define a sum type for `Classify`, `Generate`, and `Cover`; prove that each mode’s result carries an assignment satisfying the same formula predicate. A coverage iterator can carry an `invariant` that every emitted assignment is distinct and satisfying, with a bounded resource counter. Semantic text satisfaction remains an external assumption.

Evidence. The benchmark contains five moderation policies with 6–22 clauses, five LegalBench tasks with 2–4 annotated clauses, and five Super-NaturalInstructions tasks with 2–5 clauses; the paper says “15 tasks with 10+ instances each” (Section 4.1, pp. 7–8). Table 1 shows the original submission used 12 instances per task. The appendix’s expanded evaluation reports 100 samples per LegalBench task and 50 per SNI task; the CMOD re-evaluation had not started (0 evaluated), and the paper says “We are in the process of running evaluations on the data.” (Appendix A.3 and Table 1, pp. 12–13.) Inference: the expanded tables therefore do not cover every benchmark.

Task-execution results. With GPT-4o, “Logitext performs better on CMOD and NI benchmarks but underperforms on LegalBench” (Section 4.2, p. 8; Figure 8). In the expanded tables Logitext beats the few-shot baseline in 4 of 5 LegalBench tasks (it is worse on supply_chain_disclosure_disclosed_certification, 0.33 vs 0.72) and 3 of 5 SNI tasks, 7 of 10 in total (Tables 2–3, p. 13; the table captions say “TG task” and “SNLI”, while the text calls this Task Execution).

## what is proved, measured, and trusted

The paper’s contribution is the representation and solver algorithm (Section 3); Z3 handles the encoded logical constraints, while NLSolver supplies candidate text and LLM-based truth evaluations. Inference: the paper states no soundness, completeness or termination theorem, so nothing in it is proved in the formal sense. Measured outcomes include compositional and combinatorial gaps, text-instance and text-coverage generation, task execution accuracy, latency, iteration effects, and cache effects. Inference: trusted elements include LLM proposals and verifications, clause annotations, prompt formatting, Z3’s implementation, timeout/resource settings, and the assumption that text constraints are correctly interpreted by the model.

## techniques for the catalog

- partial formalization with NLTCs — annotate only logical structure that can be made explicit while retaining prose clauses as first-class constraints
- interleaved SMT/NLSolver solving — let Z3 propose Boolean assignments and an LLM propose, verify, and refine strings, blocking failed candidates
- propose-verify-refine loop — use needs-to-change constraints and refinement history for bounded iterative text repair
- cache and history reuse — reuse exact or partial proposal matches and prior refinement outcomes to reduce repeated model calls
- unified task modes — use one solver interface for classification, constrained generation, and satisfying-assignment coverage
- solver-backed coverage — enumerate symbolic assignments and synthesize text for each under an explicit time or iteration budget
