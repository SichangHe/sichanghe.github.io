# A Contemporary Survey of Large Language Model Assisted Program Analysis
(authored by agents unless marked 🧑)
Tag: `wang2025contemporary`, [paper](https://arxiv.org/abs/2502.18474)

## scope and evidence

The paper is a survey of LLM use in static analysis, dynamic analysis, and hybrid analysis (arXiv:2502.18474v1, 5 Feb 2025). Its formal-verification material is § III-C, a taxonomy and concise descriptions of published systems, rather than a new implementation or a common benchmark. It says: “This survey aims to demonstrate the potential of LLMs in advancing program analysis practices and offer actionable insights for security researchers seeking to enhance detection frameworks or develop domain-specific models.” (abstract, p. 1)

The paper divides verification inputs into four classes: code, specifications, formal methods such as theorems and loop invariants, and error or debugging information. Its exact statement is: “The inputs in these studies can be categorized into four types: (i) Code, which includes program implementations or snippets used for analysis or synthesis. (ii) Specifications, referring to formal descriptions of program behavior, such as preconditions, postconditions, or logical formulas. (iii) Formal methods, encompassing mathematical constructs like theorems, proofs, and loop invariants for ensuring correctness. (iv) Error and debugging information, such as counterexamples, type hints, or failed code generation cases that aid in resolving programming issues.” (p. 8)

## proof generation

CoqPilot is a VSCode plugin that couples several LLMs with CoqHammer and Tactician. The paper reports: “Kozyrev et al. [79] developed CoqPilot, a VSCode plugin that integrates LLMs such as GPT-4, GPT-3.5, LLaMA-2 [26], and Anthropic Claude [93] with Coq-specific tools like CoqHammer [94] and Tactician [95] to automate proof generation in the Coq theorem prover.” (p. 8) The method uses premise selection to improve the prompt and an LLM loop that retries a failing proof using Coq error messages. The paper’s whole method sentence is: “The authors implemented premise selection for better LLM prompting and created an LLM-guided mechanism that attempted fixing failing proofs with the help of the Coq’s error messages.” (p. 8)

Inference: In Verus, the analogous workflow would pass the target Rust function, its `requires` and `ensures`, relevant `proof fn` lemmas, and verifier diagnostics to an LLM, then re-run Verus after every candidate proof edit. Coq tactics do not carry over; Verus proof code and specifications do. The trusted result remains Verus’s checked proof, while the LLM is only a proposal mechanism.

Selene targets seL4 verification. Its distinctive technique is lemma isolation, which the survey says reduces verification time; the survey does not say how lemma isolation works. The survey states: “Additionally, Zhang et al. [80] developed the Selene framework to automate proof generation in software verification using LLMs. The framework is built on the industrial-level operating system microkernel [96], seL4 [97], and introduces the technique of lemma isolation to reduce verification time.” (p. 8) It also lists proof validation and dependency augmentation as contributions. (p. 8)

Inference: The survey gives no mechanism for lemma isolation, so a Verus version is a guess. One possible reading is to partition helper lemmas into smaller proof modules, expose only the facts needed by a target `proof fn`, and measure verification time before and after. The exact Selene implementation cannot be assumed.

## invariant generation and checking

The survey describes four complementary ways to obtain loop invariants. First, Janßen et al. prompt ChatGPT to annotate 106 SV-COMP Loops C programs with ACSL invariants and integrate the result with Frama-C and CPAchecker. The paper says: “Janßen et al. [82] investigated the utility of ChatGPT in generating loop invariants. The authors used ChatGPT to annotate 106 C programs from the SV-COMP Loops category [98] with loop invariants written in ACSL [99], evaluating the validity and usefulness of these invariants.” (pp. 8-9) It adds that they “integrated ChatGPT with the Frama-C [100] interactive verifier and the CPAchecker [101] automatic verifier to assess how well the generated invariants enable these tools to solve verification tasks,” and that the results “showed that ChatGPT can produce valid and useful invariants for many cases.” (p. 9)

Inference: In Verus, translate a candidate ACSL loop invariant into an `invariant` clause on the Rust `while` loop, and check the resulting `ensures`; the invariant is an annotation, not an executable function call. The C memory model, ACSL syntax, and Frama-C/CPAchecker behavior do not carry over.

Second, iRank re-ranks zero-shot invariant candidates before expensive verification. The paper reports (the paper spells the name “Chakrabor” here; its reference list gives Chakraborty): “Chakrabor et al. [81] observed that employing LLMs in a zero-shot setting to generate loop invariants often led to numerous attempts before producing correct invariants, resulting in a high number of calls to the program verifier.” (p. 9) They introduced “a re-ranking mechanism based on contrastive learning, which effectively distinguishes correct from incorrect invariants.” (p. 9)

Inference: A Verus implementation can generate several `invariant` candidates, score them with a learned ranker using verifier outcomes, and send the top candidates to Verus. The ranker cannot establish correctness; Verus must still discharge the proof.

Third, Pei et al. predict invariants usually obtained dynamically. The survey says: “Pei et al. [85] explored using LLMs to predict program invariants that were traditionally generated through dynamic analysis.” (p. 9) They fine-tuned LLMs on Java programs annotated with invariants from the Daikon dynamic analyzer and developed “a static analysis-based method using a scratchpad approach.” The paper reports that this “achieves performance comparable to Daikon without requiring code execution” and is “a static and cost-effective alternative to dynamic analysis.” (p. 9)

Inference: For Verus, a model could propose invariant candidates from Rust source and specifications without running the program, but the candidates still require symbolic checking. A dynamic trace cannot replace a proof of all executions.

Fourth, Pirzada et al. modify bounded model checking (BMC). Their method replaces loop segments in a control-flow graph with nodes asserting generated invariants, then validates those invariants with a first-order theorem prover. The paper states: “Instead of unrolling loops, the framework replaces loop segments in the CFG with nodes that assert the invariants of the loop.” (p. 9) It says the transformation “produces loop-free program variants in a sound manner, enabling efficient verification of programs with unbounded loops.” (p. 9)

LaM4Inv instead uses a query-filter-reassemble pipeline: “LLMs generate candidate invariants, BMC filters out incorrect predicates, and valid predicates are iteratively refined and reassembled into invariants.” (p. 10)

Inference: In Verus, the closest form is to have the LLM propose loop invariants, let Verus reject candidates that do not prove, and iteratively refine the surviving `invariant` clauses. Verus is not a bounded model checker, so CFG replacement and unrolling claims are paper-specific.

## specification synthesis and verified synthesis

AutoSpec decomposes code, asks an LLM for candidate specifications, and repeatedly validates them. The paper says: “AutoSpec uses LLMs to generate candidate specifications. Programs are decomposed into smaller components to help LLMs focus on specific sections. The generated specifications are iteratively validated to minimize error accumulation.” (p. 10) It explicitly reports handling nested loops and pointers. (p. 10)

LEMUR makes LLM properties subgoals for sound reasoners: “LLMs generate program properties like invariants as sub-goals, which are then verified and refined by reasoners such as CBMC [106], ESBMC [103] or UAUTOMIZER [107].” (p. 10) The paper says “The framework is based on a sound proof system, thus ensuring correctness when LLMs propose incorrect properties,” and that “An oracle-based refinement mechanism improves these properties.” (p. 10)

SynVer synthesizes C programs from Separation Logic specifications, function signatures, and input-output examples; SepAuto validates the candidates. The paper states: “SynVer takes specifications in Separation Logic, function signatures, and input-output examples as input. It leverages LLMs to generate candidate programs and uses SepAuto, a verification backend, to validate these programs against the specifications.” (p. 10) It prioritizes recursive generation to reduce dependence on manually supplied loop invariants. (p. 10)

Inference: In Verus, AutoSpec maps to generating `requires`, `ensures`, and loop `invariant` clauses for decomposed Rust functions; LEMUR maps to candidate `spec fn` properties checked by Verus; SynVer maps to candidate executable Rust bodies checked against contracts. Separation Logic predicates and SepAuto are not Verus constructs, so this mapping is conceptual.

## other verification automation

PropertyGPT retrieves human-written smart-contract properties from a vector database, generates customized properties, and checks compilation, appropriateness, and runtime verifiability with feedback and ranking. (p. 10) LLM-Sym extracts control-flow paths, performs type inference, iteratively generates Z3Py constraints, uses error messages for self-refinement, and generates Python tests from solved constraints. (p. 10) CFStra selects a verification strategy from code features, reducing manual CPAchecker strategy choice. (p. 10) Chapman et al. combine static analysis with LLM prompting to infer error specifications when the analysis lacks information, especially for third-party functions and complex error paths. (p. 10)

Inference: In Verus, PropertyGPT’s retrieval can supply contract examples, LLM-Sym’s loop can generate SMT-shaped lemmas but must ultimately use Verus’s supported specifications, and strategy selection can choose proof patterns or solver settings. A generated Python test or Z3Py answer is evidence for debugging, not a Verus proof.

## what is proved, trusted, and missing

The survey reports systems and outcomes from their cited papers; it does not provide one common denominator, code corpus, or independently reproduced verification result. Table III gives targets and outputs, including “Coq proofs,” “Formal proofs,” “Valid loop invariants,” “Specifications,” and “Error specifications” (p. 9). Therefore the paper supports a map of techniques, not a direct accuracy claim about agent-written Verus.

Inference: The threat to VL is high at the proposal layer: LLMs can generate contracts, invariants, proof repairs, and strategy choices at scale. The threat to soundness is limited only when Verus checks every resulting proof against an accurate specification. The survey itself names iterative refinement as the key to its stated common goal (reducing reliance on expert knowledge and improving verification efficiency): “A key aspect of achieving this goal is the iterative refinement of LLM-generated outputs.” (Takeaway 3, p. 11) It adds that this refinement “often incorporates static analysis or hybrid frameworks that integrate formal verification tools.” (p. 11) The survey runs no experiments of its own. Its challenges section (§ VI-A) lists non-determinism, hallucination, prompt-engineering cost, token limits and empty responses “particularly during software verification and patching tasks”; I found no discussion there of specification adequacy, Rust, external libraries, or a verifier’s trusted base.

## techniques for the catalog

- Coq error-guided proof repair — select premises, generate a proof, feed Coq errors back to the LLM, and retry
- lemma isolation — reported to reduce verification time in seL4 proof generation; the survey does not describe the mechanism
- invariant generation — generate loop invariants, then check them with an interactive or automatic verifier
- contrastive invariant ranking — rank candidate invariants before expensive verifier calls
- static invariant prediction — predict dynamic-analyzer-style invariants from code and annotations without execution
- BMC invariant transformation — replace loop segments with invariant assertions and verify the loop-free result
- query-filter-reassemble — generate predicates, filter them with BMC, refine and reassemble accepted predicates
- specification synthesis — decompose programs, generate contracts, and iteratively validate them
- sound subgoal refinement — treat LLM properties as subgoals and accept them only after a sound proof backend checks them
- verified program synthesis — generate candidate programs from formal specifications and examples, then validate each candidate
- property retrieval and ranking — retrieve related formal properties, generate a candidate, and use compilation and verifier feedback
- LLM-to-SMT refinement — extract control-flow paths, infer types, generate Z3 code for path constraints, repair it from error messages, and generate Python tests from the solved constraints
- verification-strategy selection — infer code features and select a suitable verifier strategy
- error-specification inference — query an LLM for missing error contracts when static analysis encounters incomplete information
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Penetration testing is a controlled security assessment that simulates real-world attacks to identify, evaluate, and mitigate vulnerabilities in systems and networks"): I read the whole paper text (pdftotext layout) and the whole study; I checked every quotation word for word, page numbers (using the page headers in the text), Table III targets and outputs, and each system description against § III-C; I changed the link to the arXiv page given in the paper text (arXiv:2502.18474), fixed the “Chakrabor” spelling inside a quote, moved the Takeaway 3 quote from p. 10 to p. 11, extended the Janßen quote to pp. 8-9, replaced unsupported claims (lemma isolation mechanism, the phrase static-analysis scratchpad, LEMUR oracle refinement wording, “experiments”, “executable code”, “useful”), and marked the lemma-isolation Verus mapping as a guess; I did not check the cited original papers (only this survey), the PDF figures, or any Verus mapping beyond marking it Inference.
