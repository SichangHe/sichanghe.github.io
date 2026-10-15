# BEval: A Plug-in to Extend Atelier B with Current Verification Technologies
(authored by agents unless marked 🧑)
Tag: `medeiros2014beval`, [paper](http://arxiv.org/abs/1401.0972v1)

## what the paper builds

BEval is an Atelier B plug-in that sends B proof obligations or selected expressions to ProB, then turns a true result into a reusable Atelier B proof rule. The paper’s abstract states: “This paper presents BEval, an extension of Atelier B to improve automation in the verification activities in the B method or Event-B.” It describes the complementary-prover idea: “It combines a tool for managing and verifying software projects (Atelier B) and a model checker/animator (ProB) so that the verification conditions generated in the former are evaluated with the latter.” The target problem is that Atelier B’s built-in automatic prover and its interactive prover can leave obligations involving bit vectors and arithmetic unresolved. The introduction says, “Indeed their verification with the automatic prover available in Atelier-B was often inconclusive and required time-consuming use of the interactive prover.” (Introduction, p. 53.)

The architecture keeps Atelier B as the project and proof-obligation manager. Its automatic provers run first; a user then evaluates remaining obligations individually or in a batch with BEval. BEval’s four named components are IndividualGUI, ComponentGUI, Control, and POs. IndividualGUI evaluates a full obligation, one hypothesis, or a reusable rule from the interactive prover. ComponentGUI evaluates selected obligations in a component window. Control passes a module path and expression through a shell script and Java command-line arguments to BEval and ProB. POs imports Atelier B proof-obligation files and exports true rules in Atelier B format. The paper’s architecture description says, “BEval is an open source tool to systematize the verification of B expressions in Atelier B by integrating ProB.” (Section 2, p. 54.)

## technique 1: complementary evaluation of a proof obligation

what it is: use ProB’s evaluator and constraint engines after Atelier B’s own prover has failed or after a user wants to test one expression. This is useful for obligations whose bit-vector, finite-set, cardinality, or arithmetic structure is difficult for Atelier B’s theorem prover.

how to do it:

1. Let Atelier B generate the proof obligations for the B development and run its built-in automatic forces first (Section 2.1, p. 54; Section 3, p. 56).
2. Select one remaining obligation in IndividualGUI, or select a set of unproved obligations in ComponentGUI (Section 2.1, p. 54; Section 2.2, p. 55).
3. Supply ProB parameters. The default integer bounds are `-p MAXINT 65536 -p MININT -65536`; `-p init` loads component definitions; `-p KODKOD TRUE` enables the Kodkod relational constraint solver; `-p SMT TRUE` requests more aggressive constraint solving; and `-p CLPFD TRUE` enables finite-domain constraint logic programming (Section 2.3, p. 55).
4. Evaluate the expression with ProB. In the individual interface, the expression may be a complete obligation, a hypothesis, or a rule; the user can copy a displayed hypothesis into the goal before evaluation (Section 2.2, p. 55).
5. Treat a true result as a candidate rule. If “Add rule” is checked, BEval writes a rule to the component’s `.pmm` file; if “W.D.P.O.” is checked, it writes to the well-definedness rule file (Section 2.2, p. 55).
6. Re-run Atelier B’s prover or a User Pass so that the generated rule discharges the associated obligation (Section 2.4, pp. 55–56).

The paper gives a concrete rule shape:

```
THEORY RulesProBAssertionLemmas_1 IS
  "Check assertion (card(BYTE) = 256) deduction - ref 3.2, 4.2, 5.3"
  BYTE = (1..8 --> {0,1}) => (card(BYTE) = 256)
END
```

It also gives a User Pass that selects an `Initialisation` obligation and invokes `RulesProBAssertionLemmas_1` (Section 2.4, pp. 56–57). The rule is reusable: “Each created true rule has a relation with one proof obligation.” (Section 2.4, p. 56.)

evidence: in the micro-controller library experiment, the Common POs table reports these total-denominator results. Power2 has 18 total obligations, 2 proved by Atelier B force 1, and 18 after BEval, a gain of 16/18 = 88% (table, p. 57). BIT has 49 total, 23 after force 1, and 49 after BEval, a gain of 26/49 = 53%. BYTE has 18 total, 12 after force 1, and 18 after BEval, a gain of 6/18 = 33%. BV16 has 6 total, 2 after force 1, and 6 after BEval, a gain of 4/6 = 66%. The displayed percentages are rounded whole percentages. For well-definedness obligations, BYTE rises from 129/136 to 132/136, so BEval exclusively adds 3/136 = 2% (rounded), and BV16 rises from 67/69 to 69/69, adding 2/69 = 2% (rounded). Power and Power2’s well-definedness rows show no BEval gain where the previous strategy already proves every obligation. The paper concludes: “Almost all components have significant gains using BEval.” (Section 3, p. 57.)

verus form (inference): the analogous pattern is a verified lemma that states the B rule as a postcondition, with executable code kept separate. For a cardinality fact, a Verus shape is:

```rust
proof fn byte_cardinality()
    ensures
        spec_cardinality(byte_set()) == 256,
{
    assert(spec_cardinality(byte_set()) == 256);
}
```

Inference: `spec_cardinality` and `byte_set` would need definitions and supporting lemmas; the paper’s B expression cannot be pasted into Rust. A generated lemma may be called from another proof function, while a runtime function cannot call a proof function. Verus has no ProB evaluator or Atelier B `.pmm` rule file, so the reusable artifact is a Rust proof lemma whose `ensures` fact is available to later proofs. The trust boundary changes: ProB’s finite evaluator and its parameter bounds are replaced by Verus’s proof checker and solver for the encoded Rust specification.

where it fails or assumes: the experiment assumes that the B expression translated by BEval and ProB has the same meaning as the Atelier B obligation. The paper warns that “Differences in the B syntax supported by Atelier B and ProB need to be fixed to support the evaluation of all components of micro-controller.” (Section 3, p. 57.) It also says ProB has limitations for constructs supported by Atelier B, although those limitations were being addressed (Section 4, p. 58). The integer and finite-domain bounds are parameters, so an evaluation under a bounded domain is not automatically a proof for an unbounded mathematical domain; the paper does not claim that every ProB result is a sound theorem independently of those semantics.

## technique 2: batch rule generation and proof-pass replay

what it is: evaluate many selected obligations, export all true results as named rules, and create a User Pass that applies those rules automatically. This reduces repeated interactive work when a component contains a family of similar obligations.

how to do it:

1. Open ComponentGUI and select the obligations; by default it selects obligations currently marked unproved (Section 2.2, p. 56).
2. Choose parameters such as `KODKOD`, `SMT`, `init`, timeout, and integer bounds, then run the batch evaluation (Sections 2.2–2.3, pp. 55–56).
3. For each true result, export a rule with its originating obligation, timestamp, elapsed time, and expression; BEval stores these in a `.pmm` or `wd.pmm` file (Section 2.4, p. 56).
4. Generate a User Pass that names the selected obligation and applies the corresponding rule through `mp(Tac(...))` (Section 2.4, p. 57).
5. Run the User Pass in Atelier B’s automatic prover so the batch rules become part of the normal proof workflow (Section 2.4, p. 57).

verus form (inference): a Rust analogue is a library of `proof fn` lemmas, each with explicit `requires` and `ensures`, and proof functions that invoke them in sequence. Inference: unlike a `.pmm` rule, a Verus lemma is checked from its body or admitted only through an explicitly trusted boundary; the lemma’s name and postcondition are the reusable interface. A batch harness can generate calls, but it cannot turn a bounded runtime test into a proof without a checked lemma body.

evidence and limits: the table’s gains provide evidence that batch rules reduced the remaining obligations for this micro-controller library, but the study has no independent benchmark, timing distribution, or comparison with another modern prover. The conclusion reports a complementary-prover benefit for these components, not universal superiority. Inference: reusing generated rules also creates maintenance risk when the B specification, ProB version, or parameter bounds change; the paper does not evaluate invalidated-rule detection.

## what is proved, what remains trusted, and product implications

The reported fact is that ProB discharged particular Atelier B obligations after Atelier B’s forces did not, and that BEval generated rules consumed by Atelier B. The proof of a rule remains dependent on the semantics and implementation of ProB, its Kodkod/SMT/CLPFD back ends, the translator and parser between Atelier B and ProB, and the selected finite bounds. The paper does not provide a machine-checked proof that the plug-in translation preserves Atelier B semantics. Inference: for an agent-written verified Rust product, the useful lesson is the portfolio architecture—send a failed obligation to a complementary engine, then retain an independently checked proof artifact—but a ProB-style bounded answer should not replace Verus verification of the final Rust contract. Inference: VL should avoid redoing a generic “try another solver” feature without measuring translation coverage, semantic mismatches, and rule invalidation across real Rust specifications; BEval already demonstrates that complementary engines can materially help on a narrow expression class.

## techniques for the catalog

- complementary-prover evaluation — run a second evaluator or constraint engine on proof obligations left by the primary prover, then import only true results as reusable rules
- parameterized bounded evaluation — expose integer bounds, model initialization, relational solving, SMT, finite-domain solving, and timeout as explicit verification controls
- batch rule generation — turn a selected set of successful evaluations into named, reusable proof rules and an automatic proof pass
- reusable proof-rule integration — associate each generated rule with its source obligation so later automatic or interactive proofs can apply it
Checked 2026-10-14 against the paper by a Codex agent: audit record medeiros2014beval; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
