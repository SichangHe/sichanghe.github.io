# Generative AI Augmented Induction-based Formal Verification
(authored by agents unless marked 🧑)
Tag: `kumar2024generative`, [paper](http://arxiv.org/abs/2407.18965v1)

## scope and contribution

The paper presents GenAI assistance for hardware induction proofs. It targets helper assertions (lemmas) that make k-induction close, and helper assertions generated after an inductive-step counterexample (CEX). The authors claim the flow increases verification throughput, but report no numeric benchmark, design count, runtime, or denominator. They write: “In this paper, we demonstrate how GenAI can be used in induction-based formal verification to increase the verification throughput.” (Abstract, p. 1)

The proof model is two-part k-induction. Bounded model checking establishes only a finite bound, while the base case uses initial-state constraints and the inductive step may start in unreachable states. The paper states: “The base case utilizes the initial-state constraint, whereas the inductive step does not.” (Section II-A, p. 1). A helper assertion acts as an induction invariant that excludes a spurious inductive CEX and reduces the searched state space. This is a hardware assertion flow, so translation to Rust/Verus below is an inference.

## technique 1: generate helper assertions from specification and RTL

Use this when a complex property is difficult to prove because the induction engine needs intermediate invariants.

Steps in the paper's Figure 1 and Section III (pp. 2–3):

1. provide the LLM with the design specification document and the RTL implementation
2. use a prompt template to request helper assertions in SystemVerilog Assertions (SVA)
3. submit the generated SVA and RTL to the formal tool
4. retain assertions that the formal tool proves, and use those proven assertions as assumptions for other complex properties

The paper says: “The LLM uses these two pieces of information and analyzes them to come up with a set of helper assertions that can be used for formal verification.” (Section III, p. 2). It then says: “Once proven, these assertions would be used as assumptions that help to prove other complex assertions.” (Section III, p. 2).

Inference: in Verus, express each candidate helper as a `requires`/`ensures` relationship or a lemma about a Rust state model, then prove it with a `proof fn` before using it as a fact in the target proof. A loop invariant belongs in `invariant` clauses on the loop; a candidate that is merely assumed without proof would not provide the same guarantee. SVA temporal syntax and RTL signals do not carry over, so the state transition and property must be modeled in Rust.

Evidence is qualitative only. The Results section says the flow was used on counters and ECC designs and “Usually, the flow was able to figure out necessary helper assertions that helped in faster proof for complex properties.” (Section V, p. 3). No number of designs, proof times, baseline, model prompts, or success denominator is supplied. The authors report better assertion quality for GPT-4-Turbo and GPT-4o than Llama or Gemini, but give no test-set size or scoring method.

## technique 2: generate a lemma from an inductive-step failure

Use this when k-induction fails in its inductive step and the CEX contains an unreachable or otherwise inconsistent state that should be ruled out by an invariant.

Steps in Figure 2, Section IV, and the worked counter example (pp. 2–3):

1. capture the inductive-step CEX, described as a waveform highlighting the failure
2. provide that CEX and the RTL design to the LLM
3. have the LLM relate the waveform to the RTL and generate a helper assertion
4. rerun the formal proof with the generated assertion and check that the original property now proves

The method is stated directly: “The LLM model requires two inputs. The first input is the CEX from the inductive step failure.” (Section IV, p. 2). The second input is the RTL design, and the paper says the generated assertion “prevents inductive step failure during the next iteration of formal proof.” (Section IV, p. 2).

The example has two 32-bit counters reset together and incremented together. The target SVA is `count1 |-> count2`; induction fails because the engine can start from an arbitrary state, illustrated by a CEX where the 31st bit of `count2` is not one. The generated helper is the equality assertion `count1 == count2`, after which the authors report that the original assertion proved faster (Listings 1–3 and Figure 3, pp. 2–3).

Inference: in Verus, encode the counters as fields in a Rust state struct and prove a lemma that equal initial values plus equal increments preserve `count1 == count2`. Put that fact in a loop invariant or call a `proof fn` establishing the relation before proving the postcondition. The CEX waveform has no direct Verus equivalent; inspect a failing verification state and strengthen the invariant with a predicate over the modeled state.

## what is proved, measured, and trusted

The formal tool, rather than the LLM, proves every assertion accepted by the flow. The LLM is trusted only as a proposal generator; the paper explicitly warns: “It is recommended to analyze the output from the LLM before using it productively to avoid false positives and comprehend the so-called human-in-the-loop AI.” (Conclusion, p. 4). The paper does not report a proof kernel, solver version, hardware, prompts, temperature, runtime measurements, number of generated candidates, false-positive rate, or percentage of successful suggestions. Its claim that OpenAI models are better is therefore an unquantified observation, not a controlled comparison.

Inference: for agent-written verified Rust, the main threat is specification and invariant hallucination. A plausible lemma can overconstrain the state model or encode the wrong safety property; Verus can prove the resulting statement while the intended requirement remains unmet. The required control is to prove generated lemmas in Verus and review that their preconditions, state abstraction, and postconditions match the product requirement. The paper's human review recommendation applies directly; its hardware experiments do not establish effectiveness for Rust.

The paper assumes that specification and RTL are available to the LLM, that generated SVA is syntactically usable, and that a formal tool can prove the candidate. It notes that GenAI can hallucinate “vulnerable results” (Conclusion, p. 4). It does not discuss confidentiality of RTL or CEX data, prompt length, model nondeterminism, or how to detect a helper that makes the property vacuous. Inference: VL should add checks that helper assertions do not erase required behaviors and should record the exact generated proof obligation and denominator for every accepted suggestion.

## what VL should not redo

The paper already supplies a two-input LLM-to-assertion pattern, a CEX-guided repair loop, and a synchronized-counter example. A VL project should not present those as new techniques. Inference: a useful extension would measure the same loop on Verus proof failures with fixed models and explicit denominators, while separating candidate generation from kernel-checked acceptance and testing whether strengthened invariants preserve reachable behaviors.

## techniques for the catalog

- specification-plus-RTL helper synthesis — prompt an LLM with a hardware specification and RTL, verify generated SVA, and reuse proven assertions as assumptions
- CEX-guided induction repair — feed an inductive-step waveform and RTL to an LLM, then verify the generated invariant in the next proof iteration
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
