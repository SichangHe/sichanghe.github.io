# Beyond Basic Specifications? A Systematic Study of Logical Constructs in LLM-based Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026beyond`, [paper](https://arxiv.org/abs/2602.00715)

## scope and framework

Chen et al. study whether LLMs can generate higher-level logical constructs in ACSL specifications for C programs. Their framework is a three-phase guess–verify–refine loop: an LLM proposes specifications, a verifier checks them, and failed candidates are deleted or regenerated using feedback. The paper states: “In the refinement phase, the framework refines the specifications based on the feedback information I produced by the verification tool V, and iteratively repeats this process until the program is successfully verified or a predefined maximum number of iterations is reached.” (section 2.2, p. 5)

The benchmark is a cleaned and context-enriched `frama-c-problems` set of 49 C programs (section 3.2, pp. 6–7), evaluated with GPT-3.5-Turbo, GPT-4o, GPT-5, Gemini-2.5-Pro, Qwen2.5-Coder-32B, and Llama-3.1-70B (section 3.3, p. 7). Each program/configuration uses five independent runs (section 3.4, p. 7).

## technique 1: guess–verify–refine with deletion or modification

when to use it

Inference: use this orchestration when generated specifications are uncertain but a verifier can provide actionable feedback. It separates proposal from proof and lets the system remove a bad construct or ask the model to repair it.

steps from the paper

1. Give program `P` and a configuration-specific generation prompt to proposer `O_propose`; collect candidate set `S` (section 2.2, p. 5)
2. Run verifier `V(P,S,p)` (section 2.2, p. 5)
3. If verification succeeds, return `S`; otherwise extract feedback `I` (section 2.2, p. 5)
4. Under deletion, statically identify erroneous specifications `S_error` from `I` and set `S' = S \ S_error` (section 2.2, p. 5)
5. Under modification, send `P`, `S`, `I`, and repair prompt to `O_repair` to generate `S'` (section 2.2, p. 5)
6. Iterate until success or the configured maximum iteration count (section 2.2, p. 5)

Verus form

Inference: `O_propose` can emit Verus `requires`, `ensures`, loop `invariant`, and `proof fn` lemmas; `V` is the Verus verifier. Deletion means removing a failing annotation. Modification means giving the verifier diagnostic to an LLM and regenerating only the specification, while preserving executable Rust. Verus does not provide ACSL `assigns`; frame properties must be represented using supported mutable-reference and specification patterns.

Evidence and limits

The paper reports both successful verification and repeated-run stability, rather than treating one lucky pass as sufficient. The authors attribute weaker final specifications under deletion to removing useful but imprecise information, and higher runtime under modification to repeated generation, feedback, and inference (section 4.3, pp. 14–15). Inference: verifier success alone does not establish that generated specifications encode an external intended requirement.

## technique 2: logical-construct configurations

what they are and when to use them

The study compares four prompt-constrained construct sets: Config-Basic (CB), Config-Verifiable (CV), Config-Axiom (CA), and Config-Full (CF) (section 3.1, p. 6). Inference: use CB as a baseline; CV when helper definitions and lemmas must be discharged by the verifier; CA when an abstraction is declared as an assumption; CF when both are allowed.

steps from the paper

1. Define permitted construct set `P_c`; define mandatory set `R_c` only for CV and CA (section 3.1, p. 6)
2. Prompt the proposer so `Constr(S) ⊆ P_c`; for CV or CA require at least one mandatory construct (section 3.1, p. 6)
3. For CB permit `requires`, `ensures`, `assigns`, loop invariants/variants/assigns, and `behavior` (section 3.1, p. 6)
4. For CV add `predicate`, `logic`, and `lemma`; require at least one of these constructs, with proof obligations automatically discharged by the verification tool (section 3.1, p. 6)
5. For CA permit the basic constructs plus `predicate`, `logic`, and `axiom`, requiring an axiom; for CF permit the union of CV and CA, with no mandatory construct (section 3.1, p. 6)

The paper cautions: “By abstracting complex properties, axioms can make the proof process more efficient; however, since any property expressed as an axiom is assumed to be true, they must be used with great caution, as improper use can invalidate the entire verification process.” (section 2.1, p. 4)

Verus form

Inference: map CV to executable Rust plus `spec fn` abstractions and proved `proof fn` lemmas. A Verus `spec fn` is not a runtime function. For an adaptation of CA, explicit assumptions would enlarge the trusted base and should be documented. The paper does not evaluate this Verus adaptation. Basic contracts map to `requires`, `ensures`, and loop `invariant`; frame and termination obligations need Verus-supported encodings.

## technique 3: stable and efficient evaluation

what to measure

The paper defines Correct Syntactic Construct Compliance Ratio (CSCCR), Number of Verified Programs (NVP), Number of Stable Verified Programs (NSVP), Number of Verification Tool Calls (NVTC), and running time (RT) (section 3.4, p. 7). NVP counts distinct programs verified in at least one of the five runs; NSVP counts those verified in at least two. The authors describe NSVP as eliminating “lucky” passes (section 3.4, p. 7).

results with denominators and settings

After excluding GPT-3.5-Turbo from performance comparisons because of construct non-compliance (section 4.2, p. 9), the averages cover five models and 49 programs per model. Under deletion the average NVP is 31.8 for CB, 34.6 for CV, 33.4 for CA, and 37 for CF; under modification it is 37.4, 39, 38.8, and 39.4 respectively (Table 1, p. 9). The paper reports CF verifying 16.35% more programs than CB under deletion and 5.35% more under modification (section 4.2.1, p. 9); the denominator is the CB average for the same five-model, 49-program benchmark. Under deletion, NSVP falls from NVP by 7.55%, 13.29%, 19.76%, and 9.19% for CB/CV/CA/CF, while under modification reductions are 5.88%, 7.69%, 8.76%, and 7.61% (section 4.2.2, p. 11).

The paper states: “Although logical constructs enhance verification capability, they often introduce increased instability, particularly when axiom constructs are employed under the deletion paradigm.” (Finding 3, section 4.2.2, p. 12)

Verus form

Inference: adapt the repeated-run measurements to Verus, recording success in at least one run and in at least two of five runs separately. Count verifier calls and elapsed time for deletion and repair. These measurements concern variation across LLM runs; they do not measure sensitivity to arbitrary annotation changes.

## what is proved, trusted, and already done

The framework submits C programs, generated ACSL specifications, and target properties to a verification tool (section 2.2, p. 5). Its success metric counts programs for which the tool returns success (section 3.4, p. 7). Inference: this does not establish semantic equivalence to an external requirement. Axioms are assumed true (section 2.1, p. 4), and the dataset contains 49 programs. The authors explicitly identify “Dataset Size Limitations” and say the study uses only 49 programs (section 5, p. 16). They argue that contract design, lemmas, and axiomatization are common deductive-verification paradigms, but cross-language transfer remains their argument rather than a Verus experiment.

Inference: threat to agent-written verified Rust is high where an LLM can choose axioms or overly abstract helper predicates. The useful result for VL is to constrain generation to verifiable lemmas and to measure repeated proof stability and verifier cost. VL should not redo this paper's basic guess–verify–repair loop without adding a Rust/Verus-specific benchmark and checking assumptions against executable behavior.

## techniques for the catalog

- guess–verify–refine: propose specifications, verify them, then delete or repair failed candidates using verifier feedback
- construct-bounded prompting: compare basic, verifiable-lemma, axiom, and full construct sets under explicit prompt constraints
- stability-aware evaluation: count repeated-run verified programs and verifier calls in addition to one-pass success
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "These observations indicate that the progressive modification of specifications effectively suppresses the randomness introduced by logical constructs, thereby making verification outcomes more reproducible across repeated experiments."): checked the whole paper, quotations, numbers, section and page references, construct sets, and refinement steps; corrected the five-model denominator, page references, placeholder paper link, mandatory-construct rules, and unsupported verifier and Verus claims; marked recommendations as Inference; did not inspect code or data, reproduce experiments, or validate the proposed Verus adaptations.
