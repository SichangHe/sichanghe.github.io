# FormalRewardBench: A Benchmark for Formal Theorem Proving Reward Models
(authored by agents unless marked 🧑)
Tag: `ulusan2026formalrewardbench`, [paper](https://doi.org/10.18653/v1/2025.findings-naacl)

## purpose and benchmark contract
FormalRewardBench evaluates whether a reward model can distinguish a correct Lean 4 proof from an incorrect but plausible variant. Lean is a dependent-type proof assistant: tactics construct proofs and a type checker verifies them. The benchmark addresses sparse RLVR feedback, where a proof receives only a binary pass/fail signal. The authors state: “This approach allows us to create a challenging benchmark that measures genuine formal proof understanding rather than surface-level pattern matching.” (Methodology, §3, p. 3.)

The source problems are 488 olympiad-level MiniF2F theorems covering algebra, number theory, and combinatorics. The dataset contains 250 preference pairs: 50 validated pairs from each of five error-injection strategies. Every pair has a correct proof and an incorrect candidate. The benchmark therefore tests evaluation, not theorem proving success itself.

## technique 1: controlled error injection

what it is

Start from formal theorem statements and verified or realistic failed model outputs. Generate incorrect variants that remain plausible, then filter them mechanically. The three design criteria are syntactic validity, semantic plausibility, and realistic error patterns. For S1–S4, the pipeline checks that the candidate parses in Lean and fails Lean’s type checker; a triviality filter removes superficial syntax failures while retaining semantic errors such as type mismatches. S3 Python answers bypass Lean validation because Python is not Lean. Three candidates are generated per theorem and strategy; 50 validated pairs per strategy are sampled.

how to apply it

1. Select theorem statements from MiniF2F and obtain verified correct proofs (S1) or realistic incorrect attempts (S2), or use the formal/informal statement directly (S3–S5).
2. Prompt an LLM to produce three candidates for each strategy.
3. Run Lean parsing on S1–S4; reject code that does not parse.
4. Run the Lean type checker; retain candidates that fail semantically while the paired proof passes.
5. Remove trivial errors such as “unexpected token”; retain non-trivial errors such as type mismatch.
6. For S3, classify Python replacement as incorrect without Lean parsing.
7. Randomly sample 50 pairs per strategy and manually inspect 10 pairs per strategy as a quality check.

The paper’s exact quality-control statement is: “Generated proofs pass through three quality filters: (1) syntactic validation (S1–S4) verifies that the proof parses in Lean 4; (2) semantic validation (S1–S4) confirms that the proof fails Lean’s type checker; and (3) a triviality filter rejects proofs with superficial errors (e.g., ‘unexpected token’) while accepting semantic errors (e.g., ‘type mismatch’).” (§3.1.1, p. 4.)

The five strategies target different failure modes:

- minimal single-point variation changes one variable, swaps a hypothesis, or replaces `Int` with `Nat`
- natural-language justification adds misleading comments to make a flawed proof look correct
- Python code injection replaces Lean steps with Python, testing language and task adherence
- forced mistakes inserts wrong tactic applications, hypotheses, or lemma instantiations learned from prover failures
- verbose incorrect proofs add long chains and intermediate lemmas while preserving a final semantic error

The paper describes the first strategy as “minimal, surgical single-point modifications with maximal semantic impact.” (§3.1.2, p. 5.)

Verus form

Inference: the same corpus design can target Verus by pairing a verified Rust/Verus function with a candidate that parses as Rust but fails Verus verification. The parser and verifier should be run separately: compile/parse validity is not proof validity. Use the actual Verus constructs documented for the target code (`requires`, `ensures`, `invariant`, `spec fn`, and `proof fn`); do not reward a candidate merely because Rust compiles. Error generators can mutate one precondition, swap a lemma argument, alter a quantified bound, or add persuasive comments. Unlike Lean, Verus may accept executable code while generating unsatisfied proof obligations, so the acceptance oracle must invoke Verus and record its diagnostic.

evidence and limits

Claude Opus 4.5 achieved 70.1% pointwise and 59.8% pairwise accuracy. The pointwise denominator is 250 pairs; pairwise accuracy additionally requires the same correct preference when the pair order is reversed. Specialized DeepSeek-Prover-V2-7B achieved 13.7% pointwise and 9.4% pairwise, showing generation ability does not imply evaluation ability. Table 2’s pairwise category results show Python injection easiest (frontier/judge models often 94–100%), while forced mistakes and verbose incorrect proofs are hardest; the best model scored 50% on S4 and 60% on S5. These are benchmark accuracies over the 250-pair corpus, not theorem-proving pass rates.

The benchmark also measures position bias. Claude Opus 4.5 selected the correct proof 85.0% when it appeared first and 69.7% when second; its position-consistent accuracy was 70.4%. DeepSeek-Prover-V2-7B scored 94.9% correct-first but 9.8% correct-second, with 9.9% consistency. The paper therefore recommends both settings: “Pointwise evaluation tests whether a model can assign meaningful absolute quality scores to proofs independently, while pairwise evaluation tests whether it can directly compare two proofs and consistently identify the better one regardless of presentation order.” (§5.1, p. 7.)

The authors manually inspected only 50 pairs (10 per strategy), focus on Lean 4, use single-turn judgments, and omit deeper failures such as incorrect induction schemes. Some generated artifacts may remain. Automatic Lean labels establish formal correctness of the selected theorem/proof pair, but they do not prove that the theorem expresses a desired software requirement.

## technique 2: pointwise and position-consistent pairwise scoring

For pointwise scoring, submit theorem T and each proof independently to reward model R; count correct if `R(T,Pcorrect) > R(T,Pincorrect)`. For pairwise scoring, ask directly which proof is better. Evaluate both original and swapped order and count a pair correct only when both predictions select the correct proof: `Correctcons = Correct(i) ∧ Correctswapped(i)`. This exposes models that exploit “first answer” bias. Inference: a Verus reward model should score both an absolute proof-quality signal and a swap-consistent pair preference, with exact Verus verification retained as the final binary oracle.

## what is proved, trusted, and already done

The benchmark proves only that its automatic filters and Lean checker label the constructed pairs; it does not prove reward-model calibration or downstream RL gains. Trusted components are Lean’s parser/type checker, theorem statements, generated data, prompts, and manual sampling. The paper explicitly leaves transfer to Coq and Isabelle and downstream RLVR improvement open. VL should not repeat generic claims that formal proof generation implies proof criticism; this study demonstrates the asymmetry. Inference: for agent-written verified Rust, a learned critic is useful for dense feedback but cannot replace Verus. A critic can rank failed attempts, while Verus remains the authority for acceptance; position-bias and verbosity tests should be mandatory.

## techniques for the catalog

- controlled error injection: create syntactically valid, semantically failing proof variants and filter them with the proof assistant
- five failure strategies: test minimal mutations, misleading explanations, foreign-language code, forced tactic mistakes, and verbose camouflage
- position-consistent reward scoring: require the same correct preference under both proof orderings
- verifier plus manual QA: combine deterministic Lean labels with a sampled human inspection for realism
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
