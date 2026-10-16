# LASA: Enhancing SoC Security Verification with LLM-Aided Property Generation
(authored by agents unless marked 🧑)
Tag: `ankireddy2025lasa`, [paper](http://arxiv.org/abs/2506.17865v1)

## scope and result

LASA is an LLM-assisted flow for generating security properties and SystemVerilog Assertions (SVAs) for bus-based SoCs, checking them for vacuity and syntax/semantic validity, running formal property verification (FPV), and refining prompts when coverage is low. The paper's abstract says: “LASA integrates commercial EDA tool for FPV to generate coverage metrics and iteratively refines prompts through a feedback loop to enhance coverage.” (Abstract, p. 1.) Its evidence is eight IP designs from the CEP and OpenTitan benchmarks, checked with Cadence JasperGold 2020.12 on a Red Hat Enterprise Linux server (experimental setup, §IV-A, p. 5).

Table II reports generated properties and assertions for eight designs. For AES-192, for example, 73 properties were generated, 43 were correct, 41 were non-vacuous, and 41 SVAs were generated, 40 correct. For DES3 the corresponding counts were 37, 31, 29, 29, and 27; for GPS they were 108, 98, 93, 93, and 90 (Table II, p. 6). “#correct” is the number judged relevant/proven by the authors, “#non-vacuous” is the number passing their vacuity rules, and assertion “#correct” is the number of correct translations (Table II caption and §IV-C/D, p. 6). The reported average coverage is approximately 88% (abstract and conclusion, pp. 1, 9); Table III gives checker, stimuli, and formal coverage for each IP, with denominators being the coverage items reported by JasperGold, not a number of properties.

## technique 1: build a bounded prompt from hierarchical design facts and retrieval

What it is. LASA avoids putting an entire large RTL design into one LLM context. It extracts behavioral descriptions from RTL and specification documents, breaks code into modules, functions, or components, and retrieves related manuals or documentation with retrieval-augmented generation (RAG) (§III-A, p. 4). It then processes each IP and submodule independently, preserving local context before aggregating properties at the top level (§IV-B/C, p. 6). The paper states: “LASA breaks down the code into higher-level abstractions (e.g., modules, functions, or components) and uses the summarized descriptions in the creation of prompts.” (§III-A, p. 4.)

How to apply it.

1. Extract module or submodule behavior from RTL and specification documents (§III-A, p. 4)
2. Retrieve relevant manuals and documentation with RAG and summarize that material (§III-A, p. 4)
3. Create a structured design record. Listing 1 uses JSON fields such as SoC name, bus, number of IPs, bus interface, IP operation, and secure assets (Listing 1, §IV-B, p. 6)
4. Process each IP with its own specification and context, then aggregate submodule properties at the top module (§IV-B/C, p. 6)
5. Feed the enriched prompt to the chosen LLM for property generation (§III-A/B, pp. 4–5)

Verus form. Inference: make the structured record contain Rust module names, function signatures, state variables, specifications, trusted inputs, and security assets. Retrieve API and Verus guidance relevant to each module, then ask the model for candidate `requires`, `ensures`, `invariant`, `assert`, `assume`, and `proof fn` annotations. Inference: summarize one Rust module or function at a time and aggregate proof obligations afterward; this follows LASA's hierarchy but is not evaluated in the paper. RAG evidence remains context, not proof.

Evidence and limits. The paper reports no isolated RAG ablation. The reason for the design is the LLM input-token limit for designs with thousands of RTL lines (§III-A, p. 4). Inference: retrieval can omit a dependency or threat assumption, so a Verus adaptation must record which specification fragments were supplied and inspect cross-module obligations.

## technique 2: generate security properties, then reject vacuous ones

What it is. LASA prompts pretrained LLMs to generate temporal security properties and applies nine vacuity rules/theorems from prior literature. A property is vacuous when the model satisfies it but a subformula does not affect the result; the paper's simple example is `G(p -> F q)` when p never occurs (§II-B, p. 2). The paper explains: “Vacuous properties usually indicate weak, trivial, or incorrect specifications for a given system or design.” (§II-B, p. 2.) Properties that fail vacuity screening are discarded before SVA translation (§III-B/C, pp. 5–6).

How to apply it.

1. Give the LLM design, security assets, and threat context (§III-B, p. 5)
2. Ask for properties in temporal logic and include the nine vacuity rules in the prompt (Appendix A, Prompt 2, p. 10)
3. For each generated formula, test whether the system satisfies it while a subformula can be replaced without changing satisfaction (§II-B, Theorem 1, p. 2)
4. Discard formulas classified as vacuous and retain non-vacuous formulas (§III-C, p. 6)
5. Perform hierarchical checking per submodule and aggregate retained properties (§III-C, p. 6)

The paper's Listing 2 illustrates a vacuous assertion: `validCounter > 1` is never true when the counter is stuck at 1 or 0, so the implication does not exercise the intended decrement behavior (Listing 2, §IV-C, p. 6). The reported AES-192 counts show the filter's effect: 43 correct generated properties become 41 non-vacuous; DES3 goes from 31 to 29, and GPS from 98 to 93 (Table II, p. 6).

Verus form. Inference: for a Rust function, treat a postcondition whose antecedent is unreachable under the function's `requires` and assumptions as a vacuity candidate. Generate a concrete counterexample obligation or mutate the antecedent to test relevance, then reject specifications that pass only because a precondition is impossible. Verus's `requires` and `ensures` express the contract; `assert` and `invariant` can expose the state needed for a meaningful check. Inference: temporal nine-theorem screening does not transfer directly to first-order Verus contracts, so the adaptation needs a contract-specific reachability and mutation check.

Evidence and limits. The paper reports the counts above and gives formal definitions/theorems, but does not report false-negative rates for its nine-rule screen. It also acknowledges in §IV-H that stronger vacuity rules may be needed. The text around Prompt 3 contains a wording error: it says “A property must fail at least one vacuity condition among the 9 theorems to be non-vacuous.” (Appendix A, p. 11.) Inference: that sentence should be checked against the formal definition before implementing an automated filter; the surrounding method says to discard vacuous properties.

## technique 3: translate retained properties into SVAs with few-shot examples and repair

What it is. LASA asks an LLM to translate each retained security property into an equivalent SVA. It uses k-shot example assertions, writes each result to an `.sva` file, and re-prompts when syntax or semantics fail (§III-C, p. 5). The paper reports that generated assertions can be syntactically valid but semantically wrong, including non-boolean implication operands, wrong signal scopes, and reset violations (§IV-D, p. 6). JasperGold is then used to discard invalid assertions.

How to apply it.

1. Select a non-vacuous property and its module-level signals (§III-C, p. 5)
2. Include a small set of valid SVA examples and the property in the prompt (§III-C, p. 5; Appendix A, Prompt 1, p. 10)
3. Generate an SVA, append it to the module's `.sva` file, and generate the corresponding TCL evaluation script (§III-C, p. 5)
4. Run syntax and FPV checks; inspect model-checker counterexamples (§III-C/D, p. 5)
5. Re-prompt to correct syntax, timing, implication, scope, or reset errors, and retain only assertions that pass (§III-C/D, p. 5–6)

The paper's DES3 example has `(!$stable(roundSel)) |=> (K !== $past(K));`; the generated assertion is semantically wrong, and JasperGold produces a counterexample (Listing 3 and Fig. 4, §IV-D, pp. 6–7). Appendix Prompt 5 explicitly asks the model to correct a syntax error and Prompt 6 asks it to generate additional assertions from uncovered coverage cases (Appendix A, pp. 11–12).

Verus form. Inference: replace the SVA artifact with Rust contracts and proof functions. Ask for a candidate `ensures` clause or `assert` proof, run Verus, feed diagnostics and counterexamples back to the model, and regenerate. Use `invariant` only as a loop invariant and keep `proof fn` in proof code. Inference: a Verus error message is analogous to the SVA syntax/semantic feedback, but Verus does not provide a direct temporal waveform equivalent; counterexamples may need instrumented assertions or bounded test harnesses.

Evidence and limits. Table II gives correct SVA counts: AES-192 40/41 generated after screening, DES3 27/29, GPS 90/93, and so on (Table II, p. 6; denominator is the number of retained properties translated for each design). The paper says manual effort was still needed for properties requiring re-prompting (§IV-D, p. 6). Inference: passing syntax and a bounded formal run does not guarantee that a property captures the intended security requirement.

## technique 4: measure checker, stimuli, and formal coverage and refine until a threshold

What it is. LASA runs JasperGold FPV on retained SVAs and collects checker coverage, stimuli coverage, and formal coverage. Its experiments set an 80% minimum coverage threshold; if coverage is below it, the framework adds context-specific prompts, generates more properties, and repeats (§IV-E/F, p. 7). The paper states: “If coverage falls below this threshold, LASA incoprates a feedback loop to generate additional relevant SVAs to improve the coverage.” (§IV-E, p. 7.)

How to apply it.

1. Run FPV with the retained assertions and collect branch, statement, expression, toggle, COI, and proof-core metrics (§III-D, p. 5; §IV-E, p. 7)
2. Compare each relevant metric with the chosen threshold, 80% in the experiment (§IV-E, p. 7)
3. Identify uncovered signals, states, or paths from the coverage report (§IV-E/F, p. 7)
4. Add targeted prompts such as reset conditions, boundary cases, sequential behavior, unreachable states, and multi-cycle paths (Listing 4, §IV-F, p. 7)
5. Generate and check new properties, merge them with the prior set, and repeat until the threshold is met (§IV-F, p. 7)

Table III reports eight IPs. For example, AES-192 has checker COI 99.02%, proof-core 83.59%, stimuli 99.93%, formal COI 99.37%, and formal proof-core 85.05%; DES3 has 93.97%, 91.70%, 100%, 93.98%, and 91.71% (Table III, p. 7). These are coverage percentages over the JasperGold coverage categories, not pass rates over test cases. The paper's conclusion reports an average near 88% across the evaluated designs (p. 9).

Verus form. Inference: collect verifier diagnostics, proof-obligation counts, assertion reachability, loop-invariant coverage, and branch/path coverage from Rust harnesses. If an obligation remains uncovered, add a focused lemma or `assert` and rerun Verus. Inference: these metrics are an engineering analogue, not a theorem that all Rust states are covered; Verus's proof success still depends on solver assumptions and trusted configuration.

Evidence and limits. Coverage indicates exercised or checked design structure, not that every security property is correct. The paper notes that state explosion limits ABV scalability (§II-D, p. 3) and proposes submodule analysis for scalability (§IV-B, p. 6). Inference: repeatedly adding assertions can inflate coverage without improving requirement quality, so the threshold should be paired with a review of property intent and vacuity.

## technique 5: use counterexamples and tailored context for bug detection

What it is. LASA includes micro-architectural events, threat models, and secure assets in prompts, then uses failed FPV assertions and counterexamples to expose design flaws (§III-G, p. 8). It found five bugs in the buggy OpenTitan SoC from Hack@DAC'24. Examples include incorrect UART parity dependence, wrong write-data assignment, OTP word overflow, HMAC key exposure, and unused error detection logic (Table IV, p. 8).

How to apply it.

1. Add threat model, protected assets, and security-relevant micro-architectural events to the prompt (§III-G, p. 8)
2. Generate targeted properties and translate them to SVAs (§III-G, p. 8)
3. Run FPV and inspect each counterexample trace for a violated property (§III-C/G, pp. 5, 8)
4. Map the failing signal and source location back to RTL; revise the assertion or flag a bug (Table IV, p. 8)
5. Re-run FPV after the design fix or assertion correction (§III-G, p. 8)

Verus form. Inference: include security invariants and attacker-controlled inputs in a Rust harness, then use failed `assert` or `ensures` checks as bug witnesses. Preserve the counterexample inputs and source location, and rerun Verus after a code or contract change. Inference: a Verus counterexample is useful evidence only under the harness assumptions; it does not by itself establish exploitability in every deployment.

Evidence and limits. Table IV lists exactly five bugs and gives code references and SVAs for each (p. 8). This is a demonstration on one buggy OpenTitan benchmark, not an estimate of recall or precision. Inference: LASA's bug count cannot be generalized to all SoCs or to Verus programs.

## what is proved, measured, and trusted

The paper states formal vacuity theorems and uses JasperGold model checking for generated SVAs. It measures property counts, correct translations, coverage percentages, and five detected benchmark bugs. It trusts the RTL/specification extraction, RAG summaries, LLM outputs as candidates, the nine vacuity rules, Cadence JasperGold 2020.12, benchmark labels, and its coverage definitions. It does not prove that the LLM generated a complete threat model or that high coverage implies security completeness. The authors acknowledge that LLMs struggle with complex specialized tasks and that stronger vacuity checking, syntax checking, domain fine-tuning, and custom coverage metrics remain future work (§IV-H, p. 9).

Inference: the closest lesson for VeruLaw is a closed loop in which model-written Rust contracts are proposals, Verus diagnostics and proof results are gates, and coverage or obligation gaps drive targeted regeneration. A product should retain the exact prompt context, generated contract, Verus version/configuration, assumptions, and checker result. Inference: the threat to agent-written verified Rust is high for specification omission and vacuity, while mechanical proof checking reduces implementation errors; LASA shows why a passing checker result must be coupled to requirement relevance and coverage review.

The paper's work that VL should not redo is the general architecture: hierarchical context extraction, vacuity screening, few-shot translation, model-checker feedback, coverage-driven prompt refinement, and counterexample-based bug finding. The domain-specific gap is translating temporal SVA concepts and hardware coverage into Rust/Verus contracts and proof obligations.

## techniques for the catalog

- hierarchical RAG prompting: summarize each RTL module and retrieve relevant documentation before property generation
- vacuity screening: reject formulas whose subformulas do not affect model satisfaction
- few-shot assertion translation: convert retained properties to SVA and repair with syntax, semantic, and counterexample feedback
- coverage-driven refinement: rerun FPV and add targeted properties until configured coverage thresholds are met
- counterexample bug finding: use model-checker traces plus threat context to identify concrete design flaws
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
