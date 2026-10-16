# Case study: solving P-99 with LPTP and an LLM
(authored by agents unless marked 🧑)
Tag: `mesnard2026solving`, [paper](http://arxiv.org/abs/2607.21196v1)
## scope and result

This paper reports an experiment in which Claude generated pure ISO Prolog solutions, tests, and LPTP proofs for 33 of the Ninety-Nine Prolog Problems. The authors define “solved” operationally: generate code and tests, run the tests, then prove reliability properties with the Logic Program Theorem Prover (LPTP). They report 58 logic procedures, 112 Prolog clauses, 150 lines of code, 508 runtime tests, 257 lemmas, and about 11,800 proof lines (Section 5, pp. 212–213). The 33 exercises are P01–P28 and P31–P35, 33/88 = 37.5% of the full collection (Introduction, p. 210).

The experiment is a concrete verifier-in-the-loop workflow. It is relevant to VL because it separates executable tests from proof obligations and makes the agent maintain project instructions and reusable proof lessons. No earlier study with this exact title was found in the walkthrough notes; the following account therefore covers the paper's complete workflow and examples.

## technique 1: per-problem artifact layout and explicit project contract

What it is. Each problem gets a self-contained directory containing implementation, a ground representation, tests, proof file, report, and local instructions. The paper states: “For each Pxx from P99, we want Claude to create a directory P99/Pxx, with its own CLAUDE.md file describing the problem, its solution pxx.pl, its tests pxx_test.pl, the properties and their proofs pxx.pr, and a report pxx-experiment-report.md describing the work done.” (Section 3, p. 211).

When to use it. Use this layout when many generated verification tasks must remain independently reproducible and when the agent needs a durable local contract after context loss.

How to do it. (1) Create `P99/Pxx/`. (2) Put the problem specification and agent rules in `CLAUDE.md`. (3) Write the Prolog implementation `pxx.pl`. (4) Create `pxx.gr`, a variable-free ground representation consumed by LPTP. (5) Create `pxx_test.pl` and `pxx.pr` for tests and proofs. (6) Record line counts, lemmas, proof techniques, and difficulties in the experiment report. (7) Maintain a shared `lptp-reference.md` with newly discovered proof tips; reread it before writing or debugging every proof file (Sections 3 and 4.2–4.7, pp. 211–213).

The project contract includes concrete restrictions: ISO-compatible Prolog, no cut, exact correspondence between `.pl` and `.gr`, hierarchical lemma names, and explicit declarations when a proof imports another problem's lemmas. These are paper-prescribed constraints, not general Prolog requirements.

Verus form (inference). A Verus project can use one module per task, a specification section, executable Rust, proof functions, and a checked test harness. A generated artifact manifest should pin the Verus command, imported modules, and trusted axioms. The `.gr` intermediate has no direct Verus analogue; it corresponds to a normalized representation only if the Rust program requires one. This is an inference from the paper's artifact discipline.

Evidence and limits. The authors manually checked every generated file, including code, tests, logical statements, and LPTP proofs (Section 5, p. 213). This makes the reported result auditable but means the workflow is not fully autonomous.

## technique 2: systematic property portfolio plus executable tests

What it is. The authors require each predicate to be tested at runtime and checked against a standard portfolio of logical properties. The portfolio is: “Types (pred:types) — type preservation”; “Groundness (pred:ground) — ground inputs ⇒ ground outputs”; “Termination (pred:termination) — termination under preconditions”; “Uniqueness (pred:uniqueness) — determinism of the result”; “Existence (pred:existence) — existence of the result”; and functional correctness (Section 4.6, p. 212).

How to do it. (1) Start tests with `set_prolog_flag(occurs_check,true)`, load the program, and add Peano conversion helpers when needed. (2) Test representative inputs, edge cases such as an empty list, zero, and a singleton, plus expected failures. (3) Run every proved semantic property as a runtime check and print `OK` or `FAIL`. (4) For each property, write an LPTP lemma in `pxx.pr`; include preconditions explicitly. (5) End the test file with `halt` and run SWI-Prolog using the command given in `CLAUDE.md` (Section 4.5, p. 212).

The worked examples show the portfolio's granularity. For prime factorization P35, the reported properties include termination, list and natural-number types, natural members, product preservation, ordering, primality of every member, existence, and uniqueness (Table 4, pp. 217–218). For quotient and smallest-factor helpers, the table separately proves termination, bounds, divisibility, completeness, and uniqueness rather than collapsing them into one correctness claim.

Verus form (inference). Translate type and ownership invariants into Rust/Verus preconditions and postconditions; use loop invariants for termination-related ranking measures where supported; state existence/uniqueness as quantified lemmas over the output relation. Keep ordinary runtime tests for concrete edge cases. The exact property names and Peano encodings do not carry over.

Evidence and limits. Tests can catch executable regressions but cannot establish universal properties. Conversely, the proof portfolio can be vacuous if preconditions are too strong; the study's examples make those preconditions visible in each formula, which is necessary for audit.

## technique 3: proof engineering by structural, strengthened, and algebraic induction

What it is. The agent uses LPTP tactics and records reusable proof patterns. The paper reports: “sometimes we have to strengthen the property to be proved so that we can do the inductive proof, and then weaken the property to get the original one.” (Section 5, p. 213). It also lists completion, structural induction, strengthened induction, and algebraic proofs as report categories (Section 4.7, p. 212).

How to apply it. (1) State the target property with all type and domain assumptions. (2) Try the direct induction tactic over the program's recursive argument. (3) If the induction hypothesis is too weak to rewrite the recursive call, strengthen the property with the auxiliary relation needed by the body. (4) Prove the strengthened statement by induction using completion, case analysis, definition unfolding, and library lemmas. (5) Derive the original statement by weakening or specializing the strengthened result. (6) Record the tactic sequence and any imported lemmas in the report and shared reference (Sections 4.7 and 5, pp. 212–213).

Verus form (inference). Use a `proof fn` with a `decreases` clause and explicit `requires`/`ensures`. When direct induction over a recursive Rust function is insufficient, prove a stronger lemma over the data structure or arithmetic relation, then call it from the target lemma. Verus's proof language and SMT automation differ from LPTP's tactics; the strengthening pattern is the transferable idea.

Evidence. The authors say Claude “had no problem in using what is already available in the LPTP library, code and lemmas” and that it added discovered techniques to `lptp-reference.md` (Section 5, p. 213). P35's 30 listed properties include auxiliary divisibility lemmas and strict bounds, showing the technique is used to build a dependency chain rather than a single monolithic proof (Table 4, pp. 217–218).

## technique 4: verifier-native MCP tools and proof repair loop

What it is. The authors expose LPTP through a Model Context Protocol server instead of pasting a large reference manual into every prompt. “The generative AI agent acts as an MCP client; it generates proof terms that are submitted to the MCP server and thus checked by LPTP.” (Section 7.1, p. 216). The server provides grammar, tactic, individual-step, and whole-file checking tools.

How to do it. (1) Implement an MCP server around LPTP and expose `get_lptp_grammar`, tactic application, `verify_lemma`, and `check_proof`. (2) Ask the agent for a proof term or proof file using the tools. (3) Submit individual lemmas while debugging, then submit the complete file. (4) Parse SWI-Prolog answers into JSON for the agent. (5) Have the agent revise and resubmit until LPTP certifies every derivation; the final state is either a proof with gaps or a formally certified proof (Sections 7.1–7.2, pp. 216–218).

The paper maps induction, case analysis, completion, definition unfolding, existential elimination, totality-axiom expansion, and automated search to separate tools. It reports that proof batches for P14–P24 were certified in 40 minutes to one hour, depending on complexity, and that only Claude produced valid proofs for that subset (Section 7.2, p. 218). Those are interaction-time and model-comparison results, not a success rate over all 11 problems.

Verus form (inference). A VL MCP server could expose a fixed Verus compile/check command, error extraction, source inspection, and a clean-build proof check. Tool calls must reject `assume`, `admit`, and untrusted bodies according to VL's trust policy. Verus diagnostics can drive repair, but LPTP tactic names and JSON schemas do not transfer.

## evidence, trust, and product implications

The proof checker establishes only the properties encoded in LPTP and the soundness assumptions of its libraries and axioms. SWI-Prolog execution and 508 tests measure concrete behavior. Human review remains trusted: the authors “checked manually each generated file” and examined code, tests, logical statements, and proofs (Section 5, p. 213). The paper does not report independent replication, a blinded audit, or a denominator for the proportion of generated candidates that failed before the 33 completed exercises. It reports effort from 15 minutes for P01 to several hours for P35 (Section 5, p. 213), so cost is highly uneven.

Inference: For VL, the strongest reusable practice is a per-task artifact contract plus a fixed property checklist, followed by verifier-native tool calls and clean-build certification. Inference: this workflow threatens an agent product that emits Rust and runs one final Verus command without systematic tests, explicit trust audits, or reusable repair memory. Inference: it does not establish that LLM-generated verified Rust is safe without human review; the paper's own workflow relies on that review.

## techniques for the catalog

- artifact contract — one directory per task with implementation, normalized representation, tests, proofs, instructions, and an experiment report
- property portfolio — test edge cases and prove type, groundness, termination, uniqueness, existence, and functional correctness separately
- strengthened induction — prove an auxiliary stronger invariant when the direct induction hypothesis cannot close the recursive case
- verifier-native MCP loop — expose grammar, tactic, lemma, and whole-file checking tools and iterate until the proof checker certifies the file
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
