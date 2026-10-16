# Beyond Basic Specifications? A Systematic Study of Logical Constructs in LLM-based Specification Generation
(authored by agents unless marked 🧑)
Tag: `chen2026beyond`, [paper](https://doi.org/XXXXXXX.XXXXXXX)

## scope and framework

Chen et al. study whether LLMs can generate higher-level logical constructs in ACSL specifications for C programs. Their framework is a three-phase guess–verify–refine loop: an LLM proposes specifications, a verifier checks them, and failed candidates are deleted or regenerated using feedback. The paper states: “In the verification phase, the program P, the candidate specification set S, and the property p to be verified are jointly fed into a verification tool V.” (section 2.2, p. 5)

The benchmark is a cleaned and context-enriched `frama-c-problems` set of 49 C programs (section 3.2, p. 6), evaluated with GPT-3.5-Turbo, GPT-4o, GPT-5, Gemini-2.5-Pro, Qwen2.5-Coder-32B, and Llama-3.1-70B (section 3.3, p. 7). Each program/configuration uses five independent runs (section 3.4, p. 7).

## technique 1: guess–verify–refine with deletion or modification

when to use it

Use this orchestration when generated specifications are uncertain but a verifier can provide actionable feedback. It separates proposal from proof and lets the system remove a bad construct or ask the model to repair it.

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

The paper reports both successful verification and repeated-run stability, rather than treating one lucky pass as sufficient. Deletion and modification have different costs because deletion may reduce expressiveness while modification can repeatedly call the verifier (section 3.4, p. 7). The verifier only proves the candidate predicates; it cannot establish that the predicates encode the intended requirement.

## technique 2: logical-construct configurations

what they are and when to use them

The study compares four prompt-constrained construct sets: Config-Basic (CB), Config-Verifiable (CV), Config-Axiom (CA), and Config-Full (CF). Use CB as a baseline; CV when helper definitions and lemmas must be discharged by the verifier; CA when an abstraction is declared as an assumption; CF when both are allowed.

steps from the paper

1. Define permitted construct set `P_c` and mandatory set `R_c` for the chosen configuration (section 3.1, p. 6)
2. Prompt the proposer so `Constr(S) ⊆ P_c`; for CV or CA require at least one mandatory construct (section 3.1, p. 6)
3. For CB permit `requires`, `ensures`, `assigns`, loop invariants/variants/assigns, and `behavior` (section 3.1, p. 6)
4. For CV add `predicate`, `logic`, and `lemma`, all automatically discharged (section 3.1, p. 6)
5. For CA add `axiom`; for CF allow the union of CV and CA (section 3.1, p. 6)

The paper cautions: “By abstracting complex properties, axioms can make the proof process more efficient; however, since any property expressed as an axiom is assumed to be true, they must be used with great caution, as improper use can invalidate the entire verification process.” (section 2.1, p. 4)

Verus form

Inference: map CV to executable Rust plus `spec fn` abstractions and proved `proof fn` lemmas. A Verus `spec fn` is not a runtime function. There is no sound direct analogue of an unchecked ACSL `axiom` for product behavior: an assumption would enlarge the trusted base and should be isolated and documented. Basic contracts map to `requires`, `ensures`, and loop `invariant`; frame and termination obligations need Verus-supported encodings.

## technique 3: stable and efficient evaluation

what to measure

The paper defines Correct Syntactic Construct Compliance Ratio (CSCCR), Number of Verified Programs (NVP), Number of Stable Verified Programs (NSVP), Number of Verification Tool Calls (NVTC), and running time (RT) (section 3.4, p. 7). NSVP counts programs verified in at least two of five runs, filtering lucky passes.

results with denominators and settings

Across the six models and 49 programs, under deletion the average NVP is 31.8 for CB, 34.6 for CV, 33.4 for CA, and 37 for CF; under modification it is 37.4, 39, 38.8, and 39.4 respectively (Table 1, p. 8). The paper reports CF verifying 16.35% more programs than CB under deletion and 5.35% more under modification (section 4.2.1, p. 9); the denominator is the CB average for the same six-model, 49-program aggregate. Under deletion, NSVP falls from NVP by 7.55%, 13.29%, 19.76%, and 9.19% for CB/CV/CA/CF, while under modification reductions are 5.88%, 7.69%, 8.76%, and 7.61% (section 4.2.2, p. 11).

The paper states: “Although logical constructs enhance verification capability, they often introduce increased instability, particularly when axiom constructs are employed under the deletion paradigm.” (Finding 3, section 4.2.2, p. 12)

Verus form

Inference: report both first-pass Verus success and repeated-run stability when an LLM chooses annotations. Count verifier calls and elapsed time separately for deletion and repair. A successful proof should not be counted as stable if small sampling changes break it.

## what is proved, trusted, and already done

Frama-C and ACSL prove the generated contracts for the benchmark's C programs; the study does not prove semantic equivalence to an external requirement. Axioms remain trusted assumptions, and the 49-program dataset is small. The authors explicitly identify “Dataset Size Limitations” and say the study uses only 49 programs (section 5, p. 16). They argue that contract design, lemmas, and axiomatization are common deductive-verification paradigms, but cross-language transfer remains their argument rather than a Verus experiment.

Inference: threat to agent-written verified Rust is high where an LLM can choose axioms or overly abstract helper predicates. The useful result for VL is to constrain generation to verifiable lemmas and to measure repeated proof stability and verifier cost. VL should not redo this paper's basic guess–verify–repair loop without adding a Rust/Verus-specific benchmark and checking assumptions against executable behavior.

## techniques for the catalog

- guess–verify–refine: propose specifications, verify them, then delete or repair failed candidates using verifier feedback
- construct-bounded prompting: compare basic, verifiable-lemma, axiom, and full construct sets under explicit prompt constraints
- stability-aware evaluation: count repeated-run verified programs and verifier calls in addition to one-pass success
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
