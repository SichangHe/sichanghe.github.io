# LLM Priors for ERM over Programs
(authored by agents unless marked 🧑)
Tag: `singhal2026llmpriors`, [paper](https://arxiv.org/abs/2510.14331)

## problem and result

Singhal, Mishra, Malach, and Galanti study learning a short executable program from few labeled examples. Finite-class ERM has favorable sample complexity for a short program but exhaustive enumeration is exponential in program length. Gradient training is cheaper to run but can fail to learn structured rules such as parity. Their method, LLM-PV, uses a pretrained LLM only to propose candidate programs, executes each candidate, and selects by held-out validation error. The paper states that the LLM “serves as a search bias that concentrates trials on plausible hypotheses, while the learning objective and selection rule remain similar to ERM.” (section 1, contributions, p.2)

The target is a binary function implemented by a short program in a fixed language. A program string `u` has semantics `⟦u⟧`, possibly partial; a candidate is accepted only when it is defined on the observed samples. The paper’s finite-class argument gives a sample bound that scales with program length, while length-first enumeration has runtime Θ(m|Σ|^L) (section 1, p.1) and must examine essentially all programs up to length L, Ω(|Σ|^L) (section 3.2, p.4). The LLM prior replaces uniform search with a proposal distribution conditioned on training examples (section 4, p.5).

## technique: propose, compile, execute, and select

What it is: LLM-PV is a `k`-trial propose-and-verify algorithm. It splits labeled data into a training prompt set `Str` and validation set `Sval`, asks an LLM for candidate code, filters invalid and duplicate programs, executes valid programs on the validation set, and retains the candidate with minimum validation error (Algorithm 1, p.5).

How to apply it, following Algorithm 1:

1. Initialize best error to 1, best program and hypothesis to undefined, and an empty set `U` of seen programs (Algorithm 1, line 1, p.5)
2. For each of `k` trials (line 2), sample a candidate `u` from `LLM(Π(Str); τ)`, where `Π` builds the prompt and `τ` is the sampling temperature (line 3)
3. Skip `u` if it is already in `U`; otherwise add it to `U` (lines 4–7)
4. Compile the candidate and reject it if its semantics is undefined on any point in `Str ∪ Sval` (lines 7–10)
5. Execute it on `Sval`, compute `errSval(h)`, and replace the best candidate when this error is lower than the current best (lines 11–14)
6. Return the best program and its executable hypothesis after `k` trials (line 16)

The reported experimental instantiation uses up to `k=5` Python candidates, a fixed prompt, a sandboxed interpreter, and GPT-5-Thinking in the primary results (section 5.2, p.7; Figure 5, p.16); other backbones (Qwen3-30B-Instruct, DeepSeek-Coder-33B-Instruct, OLMo-3-32B-Instruct, Gemini-3.1-Pro) appear in Table 1. The paper states: “We do not use validation feedback to adapt the sampling distribution.” The appendix specifies high reasoning effort, low text verbosity, a 20k-token maximum, and a 20-minute per-call timeout; platform-managed sampling parameters are not fixed (Appendix A.2, p.17).

Verus form: Inference: write a Rust candidate as an executable function with a `requires` clause for its input domain and an `ensures` clause for the intended label. A verifier wrapper can reject a candidate whose function does not satisfy a test harness, but test execution is not a proof. To make the selection sound, each accepted candidate must also pass Verus verification against a reviewed specification. Store candidate source and proof result in a record; use a loop invariant over the best error and a `decreases` clause over remaining trials. The LLM proposal remains untrusted.

Evidence and limits: on the synthetic tasks, the paper uses `m=200` i.i.d. labeled examples, splits 100/100 between `Str` and `Sval`, and tests on 10,000 independent examples (section 5.1, p.6). Table 1 reports test accuracy at n=100 and does not state a per-cell test count. GPT-5-Thinking with tools under LLM-PV reaches 100% on many tasks, but SHA reaches 50.1%, and IsPrime+47 reaches 80.6% (Table 1, p.7). These values are empirical test accuracies, not formal guarantees. The 10,000-example test set is the paper's stated setup; the Table 1 rows for in-context learning were queried on 100 test inputs (Appendix A.2, p.16), and the Dyck-2 test set at n=20 was reduced to 1,000 examples (Appendix A.1, footnote, p.15).

## technique: use a proposal prior while retaining validation guarantees

What it is: let `q(u|Str)` be the LLM proposal distribution and let `pε(Str)` be the probability that an accepted proposal has population error at most ε. Proposition 4.1 separates proposal quality from validation selection. The statement: with `k ≥ ⌈log(δ/2) / log(1−pε(Str))⌉`, with probability at least `1−δ` the returned `h⋆` has `errD(h⋆) ≤ ε + 2·sqrt(log(4k/δ)/(2·mval))`. Held-out selection adds a finite-class validation term; the LLM need only assign sufficient mass to good hypotheses.

The paper summarizes this separation: “The guarantee separates the two roles in LLM-PV.” (Proposition 4.1, p.5) The proposal does not itself certify correctness. Validation chooses among generated hypotheses, and the theorem assumes independent `Str` and `Sval` samples, accepted total hypotheses, and the trial count `k` above, based on `pε(Str)` and δ (Proposition 4.1, p.5; proof in Appendix B, pp.21–23).

How to use it: estimate or bound the chance that a generated candidate has low population error; choose `k` large enough for the Proposition 4.1 condition (the proof gives a good candidate with probability at least `1−δ/2`, the rest of `δ` goes to validation deviation); compile and filter candidates; use a validation set independent of the prompt examples; and report both proposal count and validation error. Uniform random programs require about `|Σ|^L` trials for a fixed target, whereas the paper says LLM-PV “replaces the exponential search size |Σ|L by an effective search size 1/pϵ (Str)” (section 4, p.5); it states `k ≈ log(2/δ)/pε(Str)` for `pε(Str) ≪ 1`.

Verus form: Inference: the analogue is a generator proposing Rust functions and a deterministic Verus checker accepting only candidates whose contracts prove the specification. The probability term is external experiment data; Verus can establish per-candidate validity but cannot prove that an LLM will propose a valid candidate within `k` calls. Use an independently reviewed specification and keep the held-out tests as a diagnostic, not as the acceptance proof.

## technique: audit the search trace and hypothesis

What it is: the paper logs “the sequence of proposed programs/edits, execution outcomes, and verification diagnostics” (section 1, p.2), yielding a propose-verify trace. Figure 1 (p.1) shows a GPT-5-Thinking trace from the ChatGPT web UI on IsPrime with m=100 examples of 100-digit inputs; it starts with parity and digit-sum rules, tests modular features, and ends with a Miller–Rabin hypothesis (section 4, p.6). Figure 7 (Appendix A.4) adds traces for cellular automata parity, random 10-parity, and full parity. The Impact Statement says: “These results inform how pretrained priors can support auditable, executable hypotheses without gradient-based retraining.” (Impact Statement, p.10)

How to apply it (Inference, the paper does not prescribe this list): preserve the exact prompt, candidate source, compiler output, duplicate decision, validation predictions, and selected program. For a failed task, inspect which hypothesis family was proposed and where execution or validation rejected it. For a successful task, rerun the selected program out of distribution and inspect the trace for accidental cues.

Verus form: Inference: make the trace a ghost or executable audit record with a specification that each accepted candidate has a corresponding proof artifact and hash of the source. Verus can prove consistency between a record and a candidate’s local metadata; it cannot prove that a human interpretation of the trace is correct.

## technique: execute tools inside the search objective

The paper distinguishes tool-augmented direct prompting from LLM-PV. In LLM-PV, the LLM writes code, executes it, inspects failures, and refines candidates; the objective still selects executable programs by validation error. GPT-5-Thinking with tools reaches 100% on 10 of 13 Table 1 tasks, 96.9% on CycleCount, 80.6% on IsPrime+47, and 50.1% on SHA (Table 1, p.7). Tool-augmented in-context learning with the same model is much weaker on several tasks, for example 51.0% on Pattern1 and 59.0% on Dyck-2 (Table 1). The paper concludes: “Tool use alone is not sufficient.” (section 5.3, p.9)

## technique: test length generalization and rule recovery

What it is: train at one sequence length and test at longer lengths. The authors train on 200 examples at `n=10`, then test lengths up to 100 (Figure 3, p.6; section 5.3, p.9). They also vary the labeled training set for an SGD baseline from 10 to 100,000 examples (Figure 4, p.6, and Appendix A.3.1, p.17); the data-scaling model there is BLOOM-75M, and the test is at n=100.

Evidence: Table 2 (p.7) reports LLM-PV at 100% across all tested lengths (n = 20, 25, 30, 50, 100) for full parity, first-half parity, 3-parity, 10-parity, and IsPrime; Dyck-2 is 77.4%, 90.5%, 80.0%, 90.5%, and 100% at lengths n = 20, 40, 60, 80, and 100 (the table footnote; the column headers say 20, 25, 30, 50, 100). Pattern1, Pattern2, and IsPal dip below 100% at some lengths (for example Pattern2 93.2% at n=30, IsPal 96.0% at n=25). The table does not give a per-cell test count, and Table 2 does not name the LLM-PV backbone. SGD and fine-tuning often decline toward 50% as length grows (Figure 3, p.6; section 5.3, p.9). BLOOM-75M reaches perfect training accuracy with 100,000 samples but its test accuracy is near chance on 10-parity (about 49 to 54%) and on CAP for n ≥ 25 (CAP at n=20 is 99.9%), and only modest on IsPrime (about 59 to 60%) (Table 3, p.8). The paper reads this as memorization (“suggesting length-specific memorization rather than rule recovery”, section 5.3, p.8, about SGD/FT in Table 1).

Verus form: Inference: test a verified Rust function on inputs whose size exceeds the examples, but use quantified specifications and loop invariants to prove length-independent behavior. A proof of the algorithmic contract is stronger than a length-generalization experiment; if the specification only covers bounded examples, the proof inherits that bound.

## technique: inspect failures and assumptions

The synthetic tasks include full and first-half parity, random 3- and 10-parity, fixed pattern matching, palindrome, Dyck-2, primality and shifted primality, cellular automata parity, and SHA parity (section 5.1.1, p.6), plus a graph cycle-density task (CycleCount, Appendix A.1, p.15) that Table 1 includes. The paper reports class-balanced datasets by construction. LLM-PV is strong on many short algorithmic rules; SHA stays near chance for all methods (the paper: “SHA remains difficult in our setup: all methods are close to chance”, section 5.3, p.8), and IsPrime+47 reaches 80.6% (Table 1). Inference: the paper does not attribute these two results to missing proposal mass; that reading is mine. The authors state: “Its success depends on a capable agentic proposer and on sufficient proposal mass near the correct program.” (section 6, p.9)

## what is proved, measured, and trusted

The paper proves a validation-selection proposition (Proposition 4.1) under its independence and accepted-hypothesis assumptions, and a sample bound and an SGD lower bound for planted k-parity (Eq. 1, Proposition 3.1). It measures test accuracy, length generalization, wall-clock time (Table 8, p.19), prompt sensitivity (Table 7), and baseline comparisons. It reports no direct estimate of `pε(Str)`. Inference: it does not prove the generated programs’ semantics, prove GPT-5’s reasoning, or establish that the finite test sets cover all inputs. The title’s ERM analogy is about selection over a discrete executable class; LLM-PV is not exhaustive ERM when `k` is finite.

## techniques for the catalog

- LLM propose-and-verify — sample executable candidates, compile and run them, then select by held-out error
- proposal-prior analysis — measure good-candidate probability and separate proposal mass from validation guarantees (the paper states the analysis; Inference: measuring it is not done there)
- duplicate and partial-program filtering — reject repeated or undefined candidates before scoring
- auditable search traces — log prompts, candidates, executions, errors, and selected hypotheses
- tool-guided program discovery — organize compilation and execution as feedback inside candidate search
- length-generalization testing — train at short inputs and evaluate on longer independent inputs
- verified acceptance inference — use Verus contracts and proofs as the final acceptance condition for generated Rust
