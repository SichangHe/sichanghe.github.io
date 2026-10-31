# Show Me The Money: An Exercise in Proof-Driven Software Understanding
(authored by agents unless marked 🧑)
Tag: `tafese2026showmoney`, [paper](https://arxiv.org/abs/2607.16499)

## scope and result

This paper studies retrospective verification of Stellar's production C++ order-book algorithm `exchangeV10`. The code has been deployed for more than a decade, and its intended behavior was recorded mainly in comments and control flow. The authors combine an LLM, the Prototype Verification System (PVS), and Seahorn's SeaBMC bounded model checker to turn those informal arguments into checkable artifacts. The abstract states: “We present a case study on proof-driven software understanding of mature, security-critical infrastructure.” (Abstract, p. 1)

The target algorithm has 1,344 lines of C/C++ and 758 lines of comments. The authors build a 260-line PVS model with 84 comment lines, prove properties P1–P3, and find a counterexample to P4. They also publish C++, PVS, and Seahorn artifacts in a public repository (Abstract and §1, pp. 1–2). The four properties are: rounding favors the offer left in the book; single-offer rounding changes the effective price by at most 1%; path payments may exceed that bound while other exchanges reject violations; and no unexpected exception is thrown (§2, p. 4).

## technique 1: LLM-assisted abstraction with checker feedback

What it is. The authors give the full C++ function to ChatGPT 5 Pro and Claude Opus 4 and ask for a PVS theory. They repeatedly send PVS failures back to the model and paste revised models into a local PVS client. The paper reports hallucinated syntax such as `x DIV y`, misplaced `IMPORTING` declarations, made-up libraries, and an incorrect treatment of exceptions as unused booleans (§3.1, pp. 5–6).

When to use it. Use this when an existing implementation is too large or intricate to formalize from a blank page but has readable structure, comments, and stated invariants. Treat the LLM output as a candidate abstraction that must pass typechecking and human review.

How to do it.

1. Copy the complete target function and its comments into the model prompt (§3.1, p. 5).
2. Ask for a functional PVS theory that follows function boundaries and captures the documented invariants (§3.1, p. 5).
3. Run the result through the PVS name resolver and typechecker (§3.1, p. 5).
4. Feed every failure message back to the LLM and replace the model with the revised output (§3.1, p. 5).
5. Correct semantic mistakes manually, especially exception behavior and library declarations (§3.1, pp. 5–6).
6. Split theories by function—`exchangeV10`, `ApplyPriceErrorThresholds`, and `CheckPriceErrorBound`—so each interface has local preconditions (§3.1, p. 6).

The authors give a prompt template that directs the model to “use total functions,” replace exceptions with “explicit preconditions or predicate subtypes,” model arithmetic with explicit bounds, and separate computation, policy decisions, and assumed invariants (Appendix, p. 12). This is a complete prompt requirement, not evidence that the generated model is correct.

Inference: for Verus, ask an agent to propose Rust contracts and ghost state while explicitly requiring verifier-valid syntax. Then compile immediately and treat every diagnostic as a repair signal. `spec fn` definitions should describe mathematical arithmetic; executable functions should carry `requires` and `ensures`; `proof fn` should establish lemmas and be erased before execution. Verus supports only a subset of Rust, so unsafe C++ behavior, exceptions, and external calls need explicit model boundaries.

Evidence and limits. The authors say the LLM preserved function boundaries and aligned generated lemmas with comments after corrections (§3.1, p. 5), but they also say exceptions were initially modeled incorrectly. The initial abstraction is therefore an understanding aid, not a trusted semantic translation. The paper does not report the number of LLM iterations, prompt tokens, or human correction time.

## technique 2: property-directed PVS proof with modular theories

What it is. PVS combines typed specifications with transparent automation. The authors prove rounding and bound lemmas using `assert`, `grind`, and the Yices2 SMT solver for nonlinear arithmetic (§3.2, pp. 6–7). They isolate theories by function and use preconditions to constrain interfaces and exception-free “happy paths.”

When to use it. Use modular, property-directed proofs when the complete implementation is difficult to reason about but individual arithmetic and control-flow properties have small scopes. Separate type-correctness obligations from functional lemmas so failures identify the layer that needs repair.

How to do it.

1. State each documented property as a named lemma over the PVS model (§3.1, p. 6).
2. Separate function theories and define the preconditions needed to call each function (§3.1, p. 6).
3. Let PVS generate type-correctness conditions (TCCs) for bounded arithmetic and subtypes (§3.2, pp. 6–7).
4. Use `assert` and Shostak simplification to expose arithmetic facts (§3.2, p. 7).
5. Use BDD simplification/normalization and `grind` with selected theories (§3.2, p. 7).
6. Send nonlinear arithmetic queries to Yices2 (§3.2, p. 6).
7. Record which lemmas and TCCs close and return unresolved goals to the code or model review (§3.2, p. 7).

Figure 4 shows the proof shape for an asymmetric 1% rounding lemma: skolemize the quantified variables, run `ASSERT`, apply `BDDSIMP`, then use `GRIND :THEORIES ("real_props")` (Fig. 4, p. 7). Figure 5 shows how PVS's prelude and subtype judgments generate and discharge positive-integer obligations for products such as `100 * price.n` (Fig. 5, p. 8).

Evidence. The paper says: “We proved 37/38 lemmas and TCCs that were sufficient to prove correctness of exchangeV10 relative to P1— P3.” (§3.2, p. 7) It also says the abstract reports 16 lemmas and 22 PVS proof obligations (Abstract, p. 1). Those counts do not use the same unit: 16+22=38, while “37/38 lemmas and TCCs” describes closed obligations. The remaining obligation concerns P4 and was not proved (§3.2, p. 7). Inference: report both counts with their meanings; do not call 37/38 “lemmas” without the paper's combined “lemmas and TCCs” wording.

Inference: in Verus, translate arithmetic predicates into `spec fn` and prove them with `proof fn` lemmas. Use `requires` for positivity and bounds, and `ensures` for the 1% relation. Verus's solver automation is not equivalent to PVS's `grind`; proof scripts need Verus-valid triggers and intermediate lemmas. The model should retain fixed-width bounds, because mathematical integers alone would hide overflow behavior.

## technique 3: unit proofs and SeaHorn counterexamples

What it is. A unit proof is a symbolic harness around the real C++ function. It declares symbolic inputs, assumes the PVS-derived preconditions, calls the system under test, and asserts a postcondition. Seahorn compiles the harness and C++ to LLVM bitcode; SeaBMC checks it and emits an executable counterexample when the assertion can fail (§3.3, pp. 7–8). The paper defines the role precisely: “a unit proof consists of a harness that sets up symbolic variables and preconditions, invokes the system under test (SUT), and asserts postconditions.” (§3.3, p. 7)

When to use it. Use this when a model obligation is unprovable or when a model proof should be checked against concrete implementation behavior. A counterexample can distinguish an incorrect implementation from an overstrong or incomplete specification.

How to do it.

1. Read the unprovable PVS sequent and extract a witness shape (§3.3, p. 8).
2. Declare symbolic C++ values with Seahorn's nondeterministic constructors (§3.3, p. 8).
3. Encode the PVS type constraints and preconditions as `assume` statements (§3.3, p. 8).
4. Select the concrete mode and call `exchangeV10` (§3.3, p. 8–9).
5. Assert the desired postcondition with `sassert` (§3.3, p. 9).
6. Run SeaBMC and debug a failing witness with `lldb` (§3.3, pp. 8–11).
7. Feed the witness back into the PVS model or the code review (§3.3, p. 8).

The authors use this process to disprove P4. For Path Payment Strict Send with `p=(2,4)`, `maxWheatSend=1`, `maxWheatReceive=2`, `maxSheepSend=1`, and `maxSheepReceive=0`, the C++ code reaches an exception assertion (§3.3, pp. 8–11). SDEX developers believe upstream code prevents that input, but proving the upstream claim is outside `exchangeV10`'s scope (§3.3, p. 8).

Inference: a Verus port could write a `proof fn` for the abstract contract and a separate executable test harness for boundary inputs. Verus proofs alone will not produce Seahorn-style concrete traces; use Rust test generation or an SMT-backed bounded harness where available. Keep upstream preconditions explicit and do not turn them into an unreviewed `assume`.

Evidence and limits. The counterexample is concrete and tied to a C++ stack trace, but it demonstrates an input allowed by the local harness, not necessarily a reachable production transaction. The paper explicitly says upstream reachability is out of scope (§3.3, p. 8). Inference: this is a model/code boundary finding, not proof that Stellar can be attacked with that exact transaction.

## technique 4: proof artifacts as regression interfaces

What it is. The exercise leaves behind PVS lemmas, TCCs, and Seahorn harnesses that can be rerun when code changes. The authors write: “Most importantly, however, we produce artifacts that make it easy for code changes to be checked against established invariants.” (Abstract, p. 1)

When to use it. Use this for mature codebases where maintainers need a stable semantic reference during review. Keep artifacts aligned with subsystem boundaries so a local change invalidates a small set of obligations.

How to do it.

1. Preserve the formal model and each proof/harness beside the code (§1, p. 2).
2. Keep separate theories and interfaces for distinct functions (§3.1, p. 6).
3. Re-run PVS typechecking and proofs after an implementation or specification change (§4, p. 10).
4. Re-run Seahorn unit proofs to check concrete behavior (§3.3, p. 8; §4, p. 10).
5. If interfaces change, regenerate the abstraction and harnesses; if they do not, retain existing unit proofs (§4, p. 10).

The authors caution that their code did not change during the exercise, so maintenance under real evolution remains untested (§4, p. 10).

## techniques for the catalog

- checker-guided autoformalization — iteratively repair an LLM-generated model against PVS typechecker diagnostics
- modular property proofs — split a legacy function into theories and prove bounded arithmetic lemmas with solver assistance
- symbolic unit proofs — wrap production code in a harness with symbolic inputs, assumptions, calls, and postconditions
- counterexample feedback — turn an unprovable model obligation into a concrete executable trace for debugging
- proof-artifact regression — preserve models, lemmas, and harnesses as rerunnable interfaces for future code changes
- assumption boundary review — distinguish a local function's proved behavior from upstream reachability assumptions
