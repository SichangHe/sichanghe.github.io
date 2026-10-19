# A New Interaction Concept for Interactive and Autoactive Program Verification
(authored by agents unless marked 🧑)
Tag: `pfeifer2026interaction`, [paper](https://arxiv.org/abs/2605.06972v1)

## scope and result

Pfeifer, Ulbrich, and Drodt propose a source-level interaction layer over KeY's JavaDL proof state. The abstract states: “We present a novel interaction concept which allows the user to inspect and interact with the proof state on source code and specification level.” (abstract, p. 1). Their prototype overlays generated assumptions and assertions on the program source, tracks formula origins, exposes KeY macros there, and retains the sequent view as a fallback. Their six-person pilot provides qualitative evidence, not statistically generalizable performance results (Sections 4 and 5.3, pp. 7, 11). The arXiv identifier and version appear on p. 1.

## technique 1: inline proof-goal overlays

What it is. A single open proof-goal leaf is represented by source-level `assert` and `assume` annotations. Assumptions represent knowledge in that goal; assertions represent formulas still to prove. Generated overlays have a gray background and no line numbers to distinguish them from user input (Sections 3.1 and 4, pp. 4–5, 7). The central hypothesis is: “To minimize the mental gap, all interactions with the prover should be as close as possible to the original user input, i.e., the specified source code.” (Section 3, p. 4).

How to do it.

1. Generate the proof obligation from the method contract, assigning origin types to specification formulas and marking tool-added facts as implicit (Sections 4.1–4.2, pp. 7–8).
2. Finish symbolic execution and update simplification before displaying the goal. The prototype requires no modalities or updates to remain in the sequent. It highlights executed lines in green, with the most recent line more saturated (Section 4, p. 7).
3. Classify formulas by origin as implicit, assumption, or assertion. Omit implicit formulas from the source view. Where a formula has a single unique origin and refers to one program state, display the original JML formula verbatim; otherwise attempt back-translation (Sections 3.1.2 and 4.3, pp. 5–6, 8–9).
4. Compute positions using maps from heap states and local-variable versions to source positions. Move assumptions downward from the method's start until a heap change absent from the formula or the most recently executed statement is reached. Move assertions upward from the method's last line under the corresponding stopping conditions. Insert formulas referring to multiple states as late as possible, using `\old<line>(<term>)` for other states (Section 4.4, p. 9). This display notation differs from the standard labeled `\old(<term>, <label>)` proposed in Section 3.1.
5. On hover, highlight the formula's source origins and its counterpart in the sequent; hovering in the sequent also highlights the inline representation. Selecting another suitable proof-tree goal updates the view (Sections 3.1 and 4, pp. 5, 7).

Listing 3 illustrates a missing array bound in `zero`: the caption identifies the missing precondition `to < a.length`. The generated bounds assertion makes the problem visible alongside the loop (Section 3, p. 4). The concept assumes at most one statement per line and returns of the form `return x;`, where `x` is a variable or constant (Section 3.1, p. 5).

Verus form. Inference: a Verus interface could display failed obligations and relevant assumptions beside their Rust source positions, preserve original specifications, and distinguish generated context from user input. Unsupported solver terms would require a lower-level diagnostic fallback. This is a proposed application; the paper implements KeY, not Verus.

Evidence and limits. The prototype comprises about 7,000 lines of Java (Section 4, p. 7). Only one of KeY's two loop rules is supported. Frame-condition goals cannot currently be represented because the corresponding JavaDL formulas quantify over fields, which JML cannot express; an `assignable` function is suggested as a future workaround. Back-translation for formulas that diverge from the input or lack origins is only partially implemented (Section 4.5, pp. 9–10). Some low-level constructs cannot be translated; the prototype then displays an error and requires the logical view (Section 4.3, p. 9).

## technique 2: origin tracking through proof transformations

What it is. Origin references contain a type, file information, and line and column ranges. Origins attach to operators rather than only whole formulas so that splitting formulas can preserve their origins. If a formula has no origin, its subterms are searched recursively and their origins are combined. Implicit formulas have a special type and no source position (Section 3.1.1, p. 5).

How to do it.

1. Assign initial origins while constructing the JavaDL proof obligation from the specification. Mark facts about heap well-formedness, object createdness, and similar language-modeling details as implicit (Section 4.1, pp. 7–8).
2. For pure rewrites `s ⇝ t`, transfer the origin of `s` to `t`. For conditional rewrites, combine origins with those of the side-condition formulas (Section 4.2, p. 8).
3. Give newly added terms no origin. When the result is a subterm of the matched term, retain that subterm's own origin to limit accumulation. Give terms supplied by the user during rule application a corresponding label without file or position information. Untouched terms retain their origins (Section 4.2, p. 8).
4. Handle loop and method-call rules separately in KeY's Java implementation. Assign source positions to formulas from specifications and distinct origin types to generated terms. Distinguish the two occurrences of an invariant in its preservation branch by origin type (Section 4.2, p. 8).
5. Restore original JML where possible. Otherwise translate logical operators back to JML and inline terms extracted into equations with Skolem constants by KeY's pull-out rule (Section 4.3, pp. 8–9).

Failure and assumptions. Earlier experiments accumulated origins until even a small subterm pointed to nearly the whole method contract; the propagation scheme aims to avoid this (Section 4.2, p. 8). The concept also requires a single symbolic execution: relational proof obligations with multiple programs cannot be translated into one Java program (Section 3.1.2, p. 6).

Verus form. Inference: preserve source spans and origin kinds through verification-condition transformations, combine source references when combining facts, and retain original source expressions when justified. Broad or missing origins should remain visible as uncertainty rather than be presented as a precise source explanation. The paper does not establish that these mechanisms transfer unchanged to Verus.

## technique 3: source-level proof actions and proposed script recording

What it is. The concept combines point-and-click proof interaction with source-level presentation and retains fine-grained logical interaction. Proposed actions include automatic proving, conjunction splitting, case distinctions through cuts, quantifier instantiation with JML expressions, and dropping unhelpful assumptions. Symbolic execution uses macros. The implemented prototype exposes KeY's macros through the source context menu; the paper does not claim that every proposed action has been implemented there (Sections 3.2 and 4, pp. 6–7).

How to do it. In the proposed workflow, finish symbolic execution, inspect a displayed goal, invoke an appropriate action, and inspect the resulting goals. Use the logical view when hidden technical details matter, such as object createdness (Section 3.2, p. 6). Listing 5 illustrates a possible script that expands an invariant, obtains a Skolem constant, instantiates an existential quantifier with it, and runs automatic proving (Listing 5 and caption, p. 6).

The proposed persistence mechanism records interactions as JML script commands. The authors write: “It is therefore natural that user interactions (on both levels) should be recorded as commands in JML proof scripts to make them accessible for users, and to make them available in a persistent manner for automatic proof replay.” (Section 3.2, p. 7). KeY already has an experimental JML assertion-script mechanism, but automatic recording of these interactions remains future work (Sections 3.2 and 4, p. 7). The envisioned cycle alternates script execution, inspection of remaining goals, and script refinement.

Verus form. Inference: a Verus tool could persist source edits that add assertions, lemmas, or loop invariants and rerun verification after replay. This would need a separate implementation and evaluation; the paper supplies neither Verus integration nor evidence about replay robustness.

## evidence from the pilot study

Six formal-verification experts familiar with KeY performed two tasks on similar variants of a Caesar-cipher program with about 40 lines of Java and 50 lines of JML. Each task involved correcting a small source or specification flaw. Everyone used the new view first, without access to the sequent view, then the original sequent view without overlays. Participants reported task times and answered open-ended questions (Sections 5–5.1, p. 10).

All participants identified both problems and correctly explained the new constructs in the questionnaire, despite receiving no explanation of the new view's concepts and features. Three solved the first task faster. Reported means were 9.8 minutes for the source view and 11.0 for the sequent view; standard deviations were 5.7 and 4.1 minutes, respectively (Section 5.2 and Table 1, p. 10). The authors say the fixed order favored the sequent view because participants already knew that interface and had learned the program during the first task (Section 5.1, p. 10).

The authors explicitly limit the result: “Given the small number of participants, the measured task durations and the observed differences in completion times must be interpreted cautiously: they illustrate possible benefits rather than constituting statistically generalizable results.” (Section 5.3, p. 11). They also state: “One cannot conclude from this pilot study of KeY experts that a novice to KeY or to deductive verification would benefit from the new view.” (Section 5.3, p. 11).

## techniques for the catalog

- inline proof overlays — display one open proof leaf as generated source-level assumptions and assertions
- origin propagation — preserve source origins through proof transformations while limiting their accumulation
- source-level proof actions — expose implemented macros and distinguish proposed finer actions, retaining a logical fallback
- proposed script recording — persist interactions as JML commands; automatic recording remains future work
