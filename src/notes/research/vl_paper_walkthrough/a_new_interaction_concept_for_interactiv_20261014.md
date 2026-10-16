# A New Interaction Concept for Interactive and Autoactive Program Verification
(authored by agents unless marked 🧑)
Tag: `pfeifer2026interaction`, [paper](http://arxiv.org/abs/2605.06972v1)

## scope and result

Pfeifer, Ulbrich, and Drodt propose a source-level interaction layer over KeY's lower-level JavaDL proof state. The abstract describes the goal: “We present a novel interaction concept which allows the user to inspect and interact with the proof state on source code and specification level.” (abstract, p. 1). The prototype overlays generated assumptions and assertions on JML source, tracks where formulas came from, lets users invoke proof actions at that level, and preserves a fallback to the detailed sequent view. A six-person pilot suggests usability benefits, but the authors explicitly treat it as qualitative evidence.

## technique 1: inline proof-goal overlays

What it is. A single open proof-goal leaf is translated into source-level `assert` and `assume` annotations at the program position where the formulas apply. Assumptions represent facts already known in the current goal; assertions represent obligations. User-written input is visually distinct from generated overlays. The paper's hypothesis is that “all interactions with the prover should be as close as possible to the original user input, i.e., the specified source code.” (Section 3, p. 3).

When to use it. Use this when the verifier's internal encoding is harder to understand than the source contract, especially for failed goals in loops and method calls. Show one leaf at a time and let the user navigate the proof tree to other leaves.

How to do it.

1. Generate the initial proof obligation from the method contract and mark each formula with its origin type, such as `requires`, `ensures`, loop invariant, or implicit tool fact (Sections 3.1.1 and 4.1, pp. 4, 7).
2. Symbolically execute until no modalities or updates remain; display executed source lines and place assumptions/assertions at the corresponding program state (Section 4, p. 6).
3. Hide implicit formulas that exist only to model the language, and show explicit formulas in their original form where possible (Section 3.1, pp. 3–4).
4. Highlight source origins when the user hovers over an overlay, and highlight the corresponding logical formula when needed as a fallback (Section 4, p. 6).
5. Let the user inspect a different goal by selecting its proof-tree leaf; recompute the overlays for that leaf (Section 3.1, p. 4).

The `zero` example exposes a missing bound: the generated assertion that `0 <= j < a.length` cannot be proved from `0 <= j <= to` when the contract lacks `to < a.length` (Section 3, p. 3). This makes the defect visible at the source level instead of forcing the user to decode a sequent.

Verus form. Inference: render failed Verus obligations as generated `assert` statements or diagnostic markers beside the Rust statement, contract, or loop `invariant` that produced them. Preserve user source text and distinguish generated context from user-authored specifications. A Verus driver can map diagnostics to `requires`, `ensures`, loop invariants, `assert`, and `proof fn` calls; it cannot assume that every SMT term has a faithful Rust expression. Keep low-level solver output as a fallback when translation is impossible.

Evidence and limits. The implementation is a prototype KeY plugin of about 7,000 lines of Java (Section 4, p. 6). The concept currently cannot represent some `assignable` goals, one loop rule, and formulas with no usable origin; the paper says a low-level fallback is then required (Section 4.5, p. 9). Inference: source overlays improve diagnosis only when origin tracking is sound and the displayed formula remains semantically tied to the actual obligation.

## technique 2: origin tracking through proof transformations

What it is. Each term or formula receives an origin reference containing its type and source location. Origins are attached to the lowest operator rather than whole formulas so splitting a conjunction does not lose provenance. Rule applications transfer or combine origins.

How to do it. Assign origins during initial contract translation, including a special `implicit` type for tool-added facts (Section 4.1, p. 7). For pure rewrites `s ⇝ t`, copy the origin from `s` to `t`; for conditional rewrites, union the origins of the rewritten term and its side-condition formulas (Section 4.2, pp. 7–8). Preserve the origin of untouched terms, give newly added terms no origin unless they came from user input, and distinguish repeated loop-invariant occurrences by origin type (Section 4.2, p. 8). When a formula has one source origin, display the original JML string verbatim; otherwise back-translate operators and report an error if the logical construct cannot be represented (Section 4.3, p. 8).

Verus form. Inference: attach source spans and origin kinds to generated verification conditions in the VL proof service. For a Rust expression rewritten by preprocessing, retain a mapping back to the original `requires`, `ensures`, `assert`, `invariant`, or `proof fn`. When combining facts, carry a set of spans; do not fabricate a source expression for an unsupported solver term. This is tooling around Verus, not a Verus language construct.

Failure and assumptions. Provenance can accumulate until it becomes unhelpfully broad; the paper reports this as a design problem and limits propagation rules (Section 4.2, p. 7). Translation is fundamentally limited for relational proofs with multiple symbolic executions and for low-level constructs without JML counterparts (Section 3.1.2, p. 5; Section 4.3, p. 8).

## technique 3: source-level proof actions and persistent scripts

What it is. The interface lifts coarse proof actions, such as symbolic execution, automatic proving, conjunction splitting, cuts, and quantifier instantiation, into a point-and-click source view. Fine-grained inference-rule interaction remains available in the logical view.

How to do it. Finish symbolic execution; select a displayed goal; invoke a macro or action from the source context menu; inspect newly generated goals; add a cut or instantiate a quantifier when required; fall back to the sequent view for details such as object createdness (Section 3.2, pp. 5–6). The paper's example expands an invariant, introduces a Skolem constant, instantiates an existential quantifier, then runs automatic mode (Listing 5, p. 6).

The proposed persistence mechanism records these actions as JML proof-script commands at the same abstraction level. The paper says: “It is therefore natural that user interactions (on both levels) should be recorded as commands in JML proof scripts to make them accessible for users, and to make them available in a persistent manner for automatic proof replay.” (Section 3.2, p. 6). In the current prototype, script recording remains future work (Section 4, p. 6).

Verus form. Inference: record a replayable patch sequence containing candidate `assert`, `proof fn`, lemma, and loop-invariant changes, together with the Verus version and source hash. Re-run Verus on replay; keep the low-level diagnostic fallback. A generated proof function must be proof-only and called from verified proof code, while executable functions retain executable semantics.

## evidence from the pilot study

Six KeY experts repaired two similar Caesar-cipher programs, one with the new source view and one with the traditional sequent view. All participants identified both problems (Section 5.2, p. 10). Reported mean time was 9.8 minutes for the source view and 11.0 minutes for the sequent view, with standard deviations 5.7 and 4.1 respectively (Table 1, p. 9). The denominator is six participants and two tasks; the study was intentionally ordered to favor the sequent view because participants already knew it and encountered the new view first. The authors caution that this is not statistically generalizable: “Given the small number of participants, the measured task durations and the observed differences in completion times must be interpreted cautiously” (Section 5.3, p. 11).

## what is proved, trusted, and relevant to VL

The paper demonstrates an implemented UI, origin-propagation algorithms, and a small usability result. It does not prove that overlays preserve all logical meaning, nor that the pilot generalizes to novices or other verifiers. Trusted elements include KeY's JavaDL semantics, the translation and origin implementation, and the hand-written contracts. Inference: for VL, the direct product threat is explanation drift: an agent may see a generated diagnostic that is mapped to the wrong Rust contract and “repair” the wrong line. Origin metadata and replayable checks reduce this threat but do not establish specification intent.

KeY already combines source-level and low-level interaction, JML scripts, and a tested prototype. VL should not redo generic claims that source-linked diagnostics are useful. A new contribution would need a measured Verus integration, such as whether source-linked obligations shorten repair time without increasing contract weakening.

## techniques for the catalog

- inline proof overlays — map one open proof leaf to generated source-level assumptions and assertions with clear visual distinction
- provenance propagation — preserve source origins through rewriting, branching, loop, and method proof rules
- source-level proof actions — expose macros, cuts, splitting, and quantifier instantiation while retaining a low-level fallback
- replayable proof scripts — record source-level guidance as commands that can be rerun after a proof attempt
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
