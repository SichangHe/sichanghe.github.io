# MathConstraint: Automated Generation of Verified Combinatorial Reasoning Instances for LLMs
(authored by agents unless marked 🧑)
Tag: `pati2026mathconstraint`, [paper](http://arxiv.org/abs/2605.08498v1)

## what is proved or measured

MathConstraint is an adaptive generator and evaluator for combinatorial reasoning. The abstract describes “constraint satisfaction problems with rigorous solver-based verification” and an adaptive generator that creates instances remaining difficult as models improve (Abstract, p.1). It releases MathConstraint-Easy (266 instances) and MathConstraint (329 instances), evaluates 12 models, and compares no-tool answers with a sandboxed Python environment containing SAT/SMT solvers (Abstract, p.1).

Inference: this paper teaches a verified-instance and verifier-contract pattern for VL evaluation, rather than a Rust proof algorithm. The paper’s formal guarantee is about instance labels and submitted witnesses under its solver and verifier, not about model explanations.

## technique 1: profile-driven solver-certified instance generation

what it is: a profile specifies problem types, parameter domains, counts, prompt templates, and a seed. Each sampled parameter tuple is encoded by a pycsp3 or pysms backend, solved by a reference solver, and rendered into a natural-language prompt plus a record containing polarity, optional witness, difficulty metadata, and a verifier contract (Sections 3 and 3.2, pp.3–4). The registry has 39 parameterized types spanning designs, graph thresholds, sequences, placement, scheduling, and extremal graphs (Section 3.1, p.3).

how to do it:
1. choose a profile `{Ti}` with domains `Θi`, counts `ni`, templates, and seed (Section 3.2, p.4)
2. sample a parameter tuple and instantiate its backend encoding (Section 3.2, p.4)
3. solve the encoding to determine SAT or UNSAT polarity; do not balance polarity by construction (Section 3.2, p.4)
4. render a self-contained natural-language prompt and store solver-certified polarity, optional reference witness, and structural metadata (Section 3.2, p.4)
5. optionally add a partial assignment from a reference solution; enforce those fixed values in verification (Section 3.2, p.4)

The paper’s pipeline example is a 4-queens prompt with verdict SAT and solution `[1, 3, 0, 2]` (Figure 1, p.4). The released hard set is 69.3% SAT (228/329), while Easy is 77.4% SAT (206/266) (Table 1, p.4); these fractions are the full released dataset denominators.

verus form: Inference: encode a problem family as a Verus `spec fn` predicate over a candidate witness and prove a generated witness satisfies it with a `proof fn`; use an executable generator only to produce candidate inputs. Store SAT/UNSAT polarity as a ghost fact checked against a trusted solver or imported certificate. Inference: Verus does not verify arbitrary pycsp3/pysms encoders, so the encoder and solver output remain trusted unless separately formalized.

evidence and limits: Table 1 reports reference solver wall-time medians of 0.20 seconds (Easy) and 2.52 seconds (hard), with p99 values 11.8 and 653 seconds respectively; maximums are 56.5 and 1372 seconds (Table 1, p.4). The paper reports SAT/UNSAT splits induced by parameter domains, not balanced. Inference: solver time is a generation-cost signal, not a reliable model-difficulty rank; Section 4.4 finds correlations of only −0.15 (no-tools) and −0.14 (tools) between log solver time and cross-model accuracy (p.8).

## technique 2: verifier contracts for polarity and witnesses

what it is: a model response is parsed as a SAT/UNSAT claim and optional solution. UNSAT is checked against solver-certified polarity; SAT witnesses are injected as hard unit constraints into the original encoding and re-solved. The paper says: “This grades the submitted object, not a textual derivation, and naturally handles multiple correct solutions.” (Section 3.3, p.4)

how to do it:
1. parse a response into polarity and optional witness (Section 3.3, p.4)
2. for UNSAT, accept only if the submitted polarity equals the solver-certified label (Section C, p.15)
3. for SAT, add the witness as unit constraints to the original encoding and re-solve (Section 3.3, p.4)
4. accept only when the witness satisfies the verifier; accept any witness in the same canonical isomorphism class (Section 3.3, p.4)
5. compute end-to-end accuracy as verifier acceptance and separately compute SAT Acc. as polarity correctness (Section C, p.15)

The formal metrics are `Accuracy(D)=1/|D| Σvi`, where `vi` is verifier acceptance, and `SATAcc(D)=1/|D| Σpi`, where `pi` is polarity correctness (Section C, p.15). The paper explains that SAT polarity can be correct while the witness is invalid, so SAT Acc. may exceed end-to-end accuracy (Section C, p.15).

verus form: Inference: make the witness predicate a Verus `spec fn`, require candidate vectors to have the right length/range, and prove each constraint in a `proof fn` with `ensures witness_valid`. A Rust evaluator can reject malformed JSON before invoking proofs. Inference: solver-certified UNSAT is outside Verus unless an UNSAT certificate is represented and checked; treating a solver verdict as an axiom is a trust boundary.

evidence: on the 329-instance hard release, no-tools GPT-5.5 gets 220/329 = 66.9% verifier accuracy and 79.0% SAT polarity accuracy; Claude-4.6-Sonnet gets 61/329 = 18.5% and 72.0%, respectively (Table 2, p.6). The largest witness gaps are +54.4 percentage points for Llama-3.3-70B, +53.5 for Sonnet, and +51.4 for Gemini Flash-Lite (Table 24, Appendix, pp.27–28). These denominators are all 329 hard instances; the gap is SAT Acc. minus verifier accuracy.

limits: a model can correctly state SAT but fail to construct a valid witness. Inference: checking only the label would overstate reliability for agent-written verified code; witness-level contracts are the relevant analogue.

## technique 3: adaptive refresh and frontier admission

what it is: a generator-verifier-filter loop reruns with cranked parameter ranges or new families. A candidate is admitted only if at least one frontier model fails, preserving discrimination. The paper states: “M ATH C ONSTRAINT feeds back into the generator, which cranks parameters across cycles (self-loop) and may optionally introduce new problem types.” (Figure 3, p.5)

how to do it:
1. generate candidates from the current profile and solve/verify them (Section 3.4, p.5)
2. evaluate frontier models and retain candidates on which at least one frontier model fails (Figure 3, p.5)
3. increase parameter ranges, alter the admission filter, or add pycsp3/pysms families (Section 3.4, p.5)
4. release an easy slice and a harder slice from the same machinery, preserving prompt and verification contracts (Section 3.4, p.5)
5. repeat as models improve (Figure 3, p.5)

verus form: Inference: use the same strategy for a VL regression suite: generate parameterized verified-Rust tasks, run Verus, and retain tasks that expose model failures. Store the exact specification and toolchain with each task. Inference: admission by model failure measures challenge, not completeness of the task distribution.

evidence: no-tools frontier/near-frontier mean accuracy falls from 80.5% on Easy to 42.0% on hard; the number of 12 models above 50% falls from 11 to 3 (Section 4.1, p.6). GPT-5.5 solves 220/329 (66.9%), while Sonnet solves 61/329 (18.5%) (Table 2, p.6). Easy no-tools accuracies range from 72.6% to 87.6% over frontier models on 266 instances (Table 3, p.6). Inference: the filter restores separation but may preferentially select failures of the admitted models.

## technique 4: sandboxed solver use and SIM@k replay

what it is: tool-enabled runs allow up to eight rounds of `execute_python` in a fresh, network-free sandbox with generic SAT/SMT libraries, followed by `submit_answer`; exhaustion triggers strict parser force-submit (Section 3.3, p.4). SIM@k replays logged traces truncated to k rounds and reapplies verification. The paper calls it “a conservative lower bound on what a budget-aware policy could achieve” (Section 4.3, p.8).

how to do it:
1. expose only the sandbox and tool schemas; keep backend encodings hidden (Section 3.3, p.4)
2. let the model translate constraints into executable search and iterate up to eight rounds
3. parse and verify the final submission, including force-submit fallback (Section 3.3, p.4)
4. for SIM@k, truncate each logged trace after k rounds and rerun the same parser/verifier (Section C, p.15)
5. compare SIM@1, @2, @4, and @8 to measure how much accepted work needs multiple rounds (Section 4.3, p.8)

verus form: Inference: a VL agent could call a sandboxed Verus compiler or solver, but acceptance must still be based on independently checking the submitted Rust proof artifact. SIM@k can replay logged verification attempts; it cannot prove that an adapted policy would behave identically.

evidence: on hard 329-instance MathConstraint, tool access raises GPT-5.5 from 220/329 (66.9%) to 266/329 (80.9%), and Sonnet from 61/329 (18.5%) to 232/329 (70.5%) (Tables 2 and 4, p.7). The paper reports mean frontier gain +28 percentage points and up to +52 points for Sonnet (Abstract, p.1; Table 4, p.7). Table 11 gives GPT-5.5 SIM@4=63.2% versus SIM@8=80.9%, and Sonnet 33.7% versus 70.5%; denominator is 329 for every percentage (Appendix, p.20). Halving 8 to 4 rounds erases up to 37 points (Figure 5 and conclusion, pp.8–9).

limits: SIM@k truncates observed trajectories and does not allow a model to adapt to a smaller budget (Section C, p.15). The paper’s released benchmarks use a fixed prompt format and fixed maximum budget (Conclusion, p.9). Inference: tool access can hide weaknesses in encoding and debugging; a VL product should log both proof attempts and verifier outcomes.

## trusted boundary, contradictions, and VL implications

The paper proves or measures solver labels, witness acceptance, model accuracy, tool budgets, and replay curves. Trusted components include pycsp3/pysms encoders, reference solvers, parser, verifier implementation, model APIs, and the assumption that the natural-language prompt matches the backend encoding. Inference: a Verus-backed product should retain an independently rerun verifier as the acceptance boundary and should report denominators, model, dataset slice, and budget with every result.

What VL should not redo (Inference): fixed hand-authored combinatorial benchmarks and LLM-as-judge grading are already superseded here by parameterized solver-certified generation and witness checking. Inference: the main product threat is accepting a plausible proof explanation without compiling and verifying the actual Rust/Verus artifact; MathConstraint’s witness gap is a direct warning.

## techniques for the catalog

- profile-driven generation — sample parameterized constraint families, solve them, and emit natural-language instances with certified labels
- witness-level verification — inject submitted SAT witnesses into the original encoding and re-solve, separating polarity from object correctness
- adaptive frontier filtering — crank parameters and admit candidates that at least one frontier model fails
- sandboxed solver orchestration — expose bounded SAT/SMT tool calls and verify the final structured submission
- SIM@k replay — truncate logged tool trajectories and rerun the verifier to quantify budget sensitivity
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
