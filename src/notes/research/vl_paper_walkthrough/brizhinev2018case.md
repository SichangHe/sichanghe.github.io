# A case study in formal verification of a Java program
(authored by agents unless marked 🧑)
Tag: `brizhinev2018case`, [paper](http://arxiv.org/abs/1809.03162v1)

This case study compares Java verification tools and verifies a genetic algorithm with Krakatoa, JML, Why3, SMT solvers, and Coq. The authors’ central usability finding is: “the vast majority of the statements that the SMT solvers could not prove were in fact false” only because generated obligations lacked annotations (Section 4.6). The verified target is safety and selected assertions; the random-number model itself has no meaningful JML specification.

## technique: choose a tool by obligation needs
The paper first classifies tools as bounded model checking, automated SMT, interactive SMT, or theorem-prover embeddings (Section 1.4). BMC checks only bounded loops and arrays; automated SMT needs loop invariants; interactive tools expose failed goals; embedding gives power but may mismatch Java semantics. Choose based on required features such as floating point, quantifiers, and proof interaction. The survey selected Krakatoa because it supports JML quantifiers, can send goals to SMT or Coq, and can model floating point as real numbers or precise IEEE behavior through Coq (Section 2.2.7).

Inference: In Verus, this becomes a specification triage step: decide whether the Rust target needs mathematical integers, machine overflow, ownership, or executable floating-point semantics before selecting proof tactics. Tool feature tables are evidence for setup choices, not proof of correctness.

## technique: annotation-driven deductive workflow
Annotate every method with preconditions and postconditions, add class invariants, assertions, and loop invariants, then run Krakatoa. It converts Java/JML to Why3 obligations, splits them, identifies the source line and assumptions, and dispatches CVC4, Z3, Simplify, Yices, Coq, or Isabelle (Section 3.3). Iterate: inspect an unproved goal, add the missing assumption or invariant, and rerun. The paper says, “Verifying code using Krakatoa is a trial-and-error process.” (Section 3.3).

Their concrete loop invariant is `forall int j; 0 <= j < h ==> expectedValue(j) <= expectedValue(best)`. The appendix proves preservation by splitting `j < h'` versus `j = h'`, instantiating the old invariant, applying transitivity, and using `omega` for arithmetic (Appendix C). In Verus, write the same relation as a loop `invariant` over indices and use `assert` plus arithmetic lemmas; preserve Rust bounds and integer semantics explicitly.

## technique: abductive missing-assumption diagnosis
When a prover fails, distinguish a false statement from an incomplete context. The paper’s array example fails until the invariant is strengthened with `0 <= i <= array.length` (Appendix A). Its `doNothing` example needs a frame-style assumption that `object.field.length` is unchanged. The authors propose abductive assistance, asking tools to guess “which extra assumptions they need to prove a statement.” (abstract). They report that most edits added preconditions and loop invariants after inspecting goals or trying Coq.

Inference: A Verus assistant could suggest candidate `requires`, `invariant`, or frame facts from a failed obligation, but every suggestion must be reviewed because abduction can strengthen a specification incorrectly.

## evidence, trust, and limits
The experiment completed 506 of 512 obligations automatically with CVC4 and Z3, and six manually in Coq (Section 3.4). Three gaps remained: a static final double constant had to be added as a precondition, constructor freshness was unprovable, and `System.out != null` could not be shown. One complex inequality took about 120 Coq lines; two branch goals took about 15 lines each. Krakatoa models floating point as reals and the authors disabled integer overflow, so those results do not establish IEEE rounding or overflow safety. Trusted components include Krakatoa’s translation, Why3, solver soundness, and Coq for manual proofs.

Inference: The product threat is high for annotation UX and moderate for proof soundness. VL should expose source-linked goals and missing-context suggestions; it should not repeat the paper’s unsound overflow shortcut. Existing tool comparisons mean VL need not redo a generic Java survey.

## techniques for the catalog

- tool feature triage: classify bounded, SMT, interactive, and embedded-prover tools by specification needs
- iterative annotation repair: inspect source-linked obligations and add invariants, preconditions, or frame facts
- abductive diagnosis: propose assumptions that make a failed obligation provable, then review them
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
