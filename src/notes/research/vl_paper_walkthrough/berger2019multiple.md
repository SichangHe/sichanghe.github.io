# Multiple Analyses, Requirements Once: simplifying testing & verification in automotive model-based development
(authored by agents unless marked 🧑)
Tag: `berger2019multiple`: [paper](http://arxiv.org/abs/1906.07083v1)

## what the paper proves or measures

The paper presents a single textual, formal requirement language for a model-based automotive workflow. Its compiler emits representations for Simulink Design Verifier (SLDV), BTC EmbeddedValidator, SV-COMP-style C verification, readable text, and SLDV test generation. The central engineering claim is that one formal requirement can feed several analyses. The abstract states: “we propose a unified approach for the computer-assisted formal specification of requirements and their fully automated translation into the specification languages of different verification tools.” (Abstract, p. 1)

The authors report three controller case studies: Low Speed Control (LSC), Driveline State Request (DSR), and E-Clutch Control (ECC). Their Table 1 has 41, 54, and 82 requirements respectively. Invariant requirements account for 35/41 (85.4%) in LSC, 50/54 (92.6%) in DSR, and 80/82 (97.6%) in ECC; exact time-bounded response accounts for 5/41 (12.2%), 4/54 (7.4%), and 2/82 (2.4%); event-bounded response accounts for 1/41 (2.4%), 0/54, and 0/82 (Table 1, p. 5). The displayed percentages agree with those fractions after rounding. The paper says the limited language formalized “more than 90% of the requirements in all three case studies” (Section 3, p. 6), but that coverage is based on the cited case-study counts, not a new independent industrial evaluation.

## technique 1: constrained pattern language with executable semantics

what it is: encode a requirement as `scope pattern`, where scope is `initially` or `globally`, and pattern is `invariant` or a trigger/response relation. Events are built with a restricted grammar over identifiers, Boolean and arithmetic operators, comparisons, time functions, and durations. This restriction makes each event directly translatable and catches malformed or unknown signal references early.

when to use: use it when requirements are written by engineers who need readable text but the downstream verifier needs a precise temporal formula. It is suited to sampled controller behavior and time bounds expressed in simulation steps, milliseconds, seconds, minutes, or hours.

how to do it:
1. import or declare each signal, calibratable, and constant, including name, type, dimensions, and bounds (Section 4, p. 8)
2. choose `initially` for time zero or `globally` for every time step after the first execution (Section 3, p. 6)
3. choose an invariant, or state a trigger event, trigger duration, delay, response event, and response duration (Fig. 2, p. 6)
4. build each event using only grammar operators and available variables; the tool reports missing references and incomplete expressions (Section 4, p. 8)
5. interpret the pattern in metric temporal logic. For example, the paper's running requirement says: “At each time step if [(((signal A is equal to TRUE) and ((not signal B) is equal to constant A)) and ((the absolute value of signal C) is greater than constant B)) and (signal D is less than constant C)] has been valid for [50 milliseconds], then in response, after a delay of [0 steps], [signal E is equal to TRUE] is valid for [1 step].” (Example 1, p. 9)
6. export the checked requirement to the desired backend.

The semantic translation is explicit. An invariant is the event itself; a global scope applies it at every time; a response means the trigger remains true for its duration, then after the delay the response remains true for its duration (Fig. 3, p. 7). The authors provide equivalent past- and future-operator forms because SLDV supports past temporal operators (Section 3, p. 7).

Verus form: Inference: represent the pattern as a Rust contract over a discrete-step model, with a state struct and a `spec fn` describing the event; use `requires` for initial assumptions, `ensures` for one-step transitions, and a loop invariant for the global temporal obligation. A response duration becomes a counter in executable state plus an invariant relating the counter to the trigger history. Verus does not directly consume MTL or Simulink blocks, so the semantic compiler and its correspondence proof remain required.

evidence and limits: the case-study fractions above are the paper's only coverage evidence. The language omits richer scopes and operators; the authors say future work includes state change, hysteresis variants, saturation, rate limiting, and lookup tables, and warn that a custom operator “might not be realizable in all specification languages for which export is provided” (Section 3, p. 7). BTC cannot check initial variable valuations, so exporting an `initially` requirement to BTC raises an error (Section 5.2, p. 12). The semantics assumes durations are multiples of the chosen simulation step (Section 3, p. 7).

## technique 2: one checked requirement, several verification encodings

what it is: compile the same abstract requirement into backend-specific artifacts while preserving the chosen scope, pattern, event logic, and time shifts.

how to do it:
1. for SLDV, generate a Matlab script that inserts a verification subsystem at a selected model or subsystem hierarchy level (Section 5.1, p. 9)
2. instantiate library blocks for scope, pattern, duration, delay, and event expressions. A scope feeds a Boolean proof objective; a violation is a false value at some simulation step (Section 5.1, pp. 10–11)
3. connect referenced model signals. The tool traverses the hierarchy, inserts global data-store writes at the first matching signal, and places reads beside the verification subsystem (Section 5.1, p. 12)
4. for BTC, emit XML SPEC files and adjust the time-zero convention; import them into BTC EmbeddedPlatform (Section 5.2, p. 12)
5. for C model checking, emit boilerplate that initializes parameters and calibratables, updates inputs each step, and calls `VERIFIER error();` when a pattern violation is reached (Section 5.4, p. 13)
6. emit parenthesized textual requirements for review, removing the ambiguity the authors had observed in natural-language documents (Section 5.3, p. 13).

The SLDV decomposition is concrete: a response block checks trigger and response durations, a delay block implements the fixed delay, and the pattern output is sent to an implication proof objective (Figs. 7–9, pp. 10–11). The verification subsystem is ignored during code generation and is not included in generated production code (Section 5.1, p. 10).

Verus form: Inference: use one Rust specification module as the source of truth, then generate Verus contracts or proof lemmas for each implementation level. The executable controller should remain separate from proof-only code; a refinement lemma should connect the model state transition to the generated code transition. A Verus proof can replace backend encodings, but the source-level mapping, signal wiring, and model/code correspondence still need explicit lemmas.

evidence and limits: the paper reports a prototype, not measured proof time, defect detection, or false-positive rates. BTC's one-step offset and inability to inspect initial values are material semantic assumptions. The authors explicitly call the result a “proof of concept” and list change-triggered re-verification, result-difference monitoring, and counterexample analysis as future work (Section 7, p. 15).

## technique 3: requirement-derived test objectives

what it is: reuse the generated SLDV requirement model for test-vector generation by attaching Boolean test objectives to its blocks. This makes test generation target requirement conditions and decisions rather than requiring a second manually designed test specification.

how to do it:
1. select the coverage target. For condition coverage, require each Boolean condition to be true and false; for decision coverage, require each Boolean output to take both outcomes (Section 6, pp. 13–14)
2. attach objectives to every Boolean input for condition coverage and to every Boolean output for decision coverage. Adding both sets to multi-input blocks gives condition/decision coverage (Section 6, p. 14)
3. attach temporal objectives so generated tests satisfy the required event durations (Section 6, p. 14)
4. ask SLDV to generate vectors satisfying the annotated objectives.

The paper's OR example shows the limitation: output `true` can come from input combinations 01, 10, or 11. Their current objectives force both output values but not every true-producing combination; they suggest extra logic for that and say MC/DC generation remains out of scope (Section 6, p. 14). SLDV's built-in MC/DC function operates only at model level, while requirement-level checking needs subsystem-level objectives (Section 6, p. 14).

Verus form: Inference: use proof lemmas to establish that each Boolean branch is reachable under a stated environment model, and use ordinary generated tests only as witnesses for the selected coverage metric. Verus proves universal contracts, not coverage; coverage instrumentation and test generation remain external. Do not treat passing generated vectors as proof of the requirement.

## trusted boundary, contradictions, and VL implications

The formal semantics, grammar, exporters, backend verifiers, Simulink model, generated C, and signal connection procedure all sit in the trusted chain. Inference: a Verus implementation would shift the core proof obligation to the Rust model/code correspondence, but would not remove trust in the parser, exporter, Rust compiler, Verus verifier, or assumptions about plant inputs. The paper proves no theorem that its exporters preserve semantics across all backends; it demonstrates a prototype and reports case-study pattern distributions.

What VL should not redo (Inference): a specification-once architecture with pattern compilation and coverage annotations is established engineering ground. VL should concentrate on verified Rust contracts and a checked correspondence from textual requirements to those contracts, rather than inventing another backend-specific requirement notation. The threat to agent-written verified Rust is moderate: agents could produce a plausible contract whose temporal scope or initial-state convention is wrong, and a successful Verus proof would not expose that requirements mismatch. The paper's response is explicit semantics, generated artifacts, and reviewable signal mappings.

## techniques for the catalog

- constrained pattern requirements — restrict scopes, invariants, responses, events, and durations to a grammar with metric-temporal semantics
- specification-once compilation — export one checked requirement to SLDV, BTC, C, and readable text while preserving timing conventions
- block-level temporal encoding — implement scope, duration, delay, and implication as composable verification blocks
- requirement-derived test objectives — annotate the same formal requirement model to generate condition and decision test vectors

Checked 2026-10-15 against the paper by a Codex agent for multiple_analyses_requirements_once_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
