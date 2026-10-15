# The VMT-LIB Language and Tools
(authored by agents unless marked 🧑)
Tag: `cimatti2021vmtlib`, [paper](http://arxiv.org/abs/2109.12821v1)

## purpose and model

VMT-LIB is an interchange language for verification problems over infinite-state symbolic transition systems. The authors state, “VMT-LIB was designed with the main goal of being simple to use (i.e. to parse and generate) for verification tools” (Section 1, p. 1). A file remains valid SMT-LIB, but adds annotations identifying state transitions and properties. The background theory may include linear or nonlinear arithmetic, uninterpreted functions, and quantifiers (Section 1, p. 1).

A transition system is a tuple of state variables `X`, an initial formula `I(X)`, and transition formula `T(Y,X,X')`, where `Y` are inputs (Section 2, p. 2). A path starts in a state satisfying `I` and follows transitions existentially over inputs. An invariant property is a superset of reachable states; a live property is eventually invariant along every infinite path (Section 4, pp. 4–5).

## technique: annotate an SMT-LIB transition system

When to use it: use VMT-LIB when multiple model checkers or benchmark producers need to exchange the same transition system and properties without a tool-specific syntax.

Steps from Sections 2–3 (pp. 2–4):

1. Declare current and next variables. For each state variable `x`, declare `x` and `x.next`, then attach `:next x.next` to `x`; the `:next` mapping must be injective. Variables without a `:next` relation are inputs.
2. Attach `:init` to one or more formulas containing only current state variables. Multiple annotations are conjoined.
3. Attach `:trans` to one or more transition formulas. Multiple annotations are conjoined.
4. Attach `:invar-property idx` to a state predicate `p` to mean `Gp`, and `:live-property idx` to a predicate to mean `FGp`. Property identifiers are unique nonnegative integers.
5. Keep only the allowed SMT-LIB commands (`set-logic`, options, sort/function declarations and definitions, and a final `(assert true)`). Unannotated terms are ignored.

The paper's complete example encodes `x=1` initially, `x.next = ite(b, x+1, x)`, invariant `x>0`, and live property `x>10` (Section 3, p. 4). It says, “Since the SMT-LIB format (and thus also the VMT-LIB one that inherits from SMT-LIB) does not allow to annotate the declaration of variables, it is a good practice to insert immediately after the declaration of the variables a set of defines to specify the relations among variables” (Section 3, p. 4).

Inference: in Verus, the transition formula corresponds to a state machine's transition relation or a Rust function contract. `requires` expresses admissible initial states, `ensures` expresses postconditions, and `invariant` expresses an inductive property over a loop or state-machine transition. VMT-LIB annotations themselves do not carry over to Rust; they can serve as an external benchmark schema for generating Verus proof obligations.

## technique: compile richer temporal specifications

When to use it: use the small core of invariant and live properties even when the input specification is full LTL, has invariant constraints, or has fairness assumptions. The paper deliberately keeps these constructs out of the language syntax.

Steps from Section 3 (p. 4): compile arbitrary LTL formulas into invariant and/or live properties using standard algorithms; embed invariant constraints directly into `:init` and `:trans`; encode fairness as live properties using symbolic degeneralisation for Büchi automata. The paper states, “LTL properties can be compiled into invariant and/or live properties using standard algorithms from the literature” (Section 3, p. 4).

Inference: for Verus, a safety LTL property becomes an inductive invariant and a liveness property needs a progress argument plus a fairness model; ordinary Verus `ensures` alone does not prove temporal fairness over unbounded executions. A product-level VL pipeline could retain the LTL source and generate a VMT-LIB artifact for model checking while checking local Rust contracts in Verus.

## technique: exchange and convert benchmarks

The paper supplies open-source tools: `vmt.py` parses and prints systems; `vmt2btor.py` and `btor2vmt.py` convert BTOR; `vmt2horn.py` converts to CHCs; `vmt2nuxmv.py` converts to nuXmv SMV; and `ltl2vmt.py` builds symbolic tableaux for arbitrary LTL (Section 5, pp. 5–6). The authors write, “All the tools are open source and available from the VMT-LIB webpage” (Section 1, p. 1). VMT-LIB is fully supported by nuXmv, adopted by AVR, and native to ic3ia and extensions (Section 5, p. 5).

Inference: a Verus integration can export a finite-state abstraction or CHC-shaped verification condition into VMT-LIB, then compare model-checker results across nuXmv, AVR, or ic3ia. This is an interoperability proposal, not a result reported by the paper.

## evidence, trust, and limits

The evidence is a language definition, a worked `x` example, and tool support claims; there is no benchmark table with a denominator or verification-time aggregate. The paper concludes that it presented “a language and a set of tools for the specification of verification problems over infinite-state transition systems aimed at simplicity and interoperability” (Section 6, p. 6). Trust remains in each converter, parser, model checker, background theory, and the semantics of the source model. The format does not directly encode counterexample traces or proof certificates; the authors list both as future extensions (Section 6, p. 6).

Inference: the threat to agent-written verified Rust is mainly interface mismatch. A VMT-LIB invariant can be correct for an abstract transition system while the Rust implementation or abstraction relation is wrong. VL should reuse VMT-LIB as a benchmark and interchange format rather than redo its syntax; existing tools already cover CHC and LTL conversion. The missing artifact for a product is a checked refinement relation from the Rust implementation to the exported transition system.

## what is proved or measured

The paper formally defines syntax and semantics for annotated SMT-LIB formulas and describes converters. It does not claim that every converter has a mechanized correctness proof, nor does it report a denominator for successful industrial verification. The model-checking result is conditional on the transition relation and background theory supplied by the file.

## techniques for the catalog

- annotated transition interchange — encode states, initial conditions, transitions, and properties as SMT-LIB annotations
- invariant and liveness compilation — reduce full LTL, fairness, and invariant constraints to core VMT-LIB properties
- converter pipeline — translate VMT-LIB among BTOR, CHCs, nuXmv, and LTL tableau representations

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
