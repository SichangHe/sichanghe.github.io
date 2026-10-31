# BEval: A Plug-in to Extend Atelier B with Current Verification Technologies
(authored by agents unless marked 🧑)
Tag: `medeiros2014beval`, [paper](https://doi.org/10.4204/EPTCS.139.5) (DOI from the paper text; EPTCS 139, 2014, pp. 53–58)

## what the paper builds

BEval is an Atelier B plug-in that sends B proof obligations or selected expressions to ProB, then turns a true result into a reusable Atelier B proof rule. The paper’s abstract states: “This paper presents BEval, an extension of Atelier B to improve automation in the verification activities in the B method or Event-B.” It describes the complementary-prover idea: “It combines a tool for managing and verifying software projects (Atelier B) and a model checker/animator (ProB) so that the verification conditions generated in the former are evaluated with the latter.” The target problem is that the case study’s obligations “cannot be verified automatically with Atelier B built-in provers, and are very difficult to show interactively, probably because these involve complex expressions with bit vectors and math operators” (Introduction, p. 54). The introduction also says, “Indeed their verification with the automatic prover available in Atelier-B was often inconclusive and required time-consuming use of the interactive prover.” (Introduction, p. 53.)

The architecture keeps Atelier B as the project and proof-obligation manager. Its automatic provers run first; a user then evaluates remaining obligations individually or in a batch with BEval. BEval’s four named components are IndividualGUI, ComponentGUI, Control, and POs. IndividualGUI evaluates, from within the interactive prover, a full obligation, just a hypothesis of an obligation, or a rule that embodies an important logic rule. ComponentGUI evaluates selected obligations in a component window. Control passes a module path and expression through a shell script and Java command-line arguments to BEval and ProB. POs imports Atelier B proof-obligation files and exports true rules in Atelier B format. The opening of Section 2 says, “BEval is an open source tool to systematize the verification of B expressions in Atelier B by integrating ProB.” (Section 2, p. 54.)

## technique 1: complementary evaluation of a proof obligation

what it is: use ProB’s evaluator and constraint engines after Atelier B’s own prover has failed or after a user wants to test one expression. The paper’s case-study obligations involve bit vectors and math operators; Inference: the same pattern would suit other obligations over finite sets, cardinality or arithmetic that Atelier B’s provers handle poorly, but the paper tests only the bit-vector library.

how to do it:

1. Let Atelier B generate the proof obligations for the B development and run its built-in automatic forces first (Section 2.1, p. 54; Section 3, p. 57).
2. Select one remaining obligation in IndividualGUI, or select a set of unproved obligations in ComponentGUI (Section 2.1, p. 54; Section 2.2, p. 56).
3. Supply ProB parameters. The default integer bounds are `-p MAXINT 65536 -p MININT -65536`; `-p init` loads component definitions; `-p KODKOD TRUE` enables the Kodkod relational constraint solver; `-p SMT TRUE` requests more aggressive constraint solving; and `-p CLPFD TRUE` enables finite-domain constraint logic programming (Section 2.3, p. 56).
4. Evaluate the expression with ProB. In the individual interface, the expression may be a complete obligation, a hypothesis, or a rule; the user can copy a displayed hypothesis into the goal before evaluation (Section 2.1, p. 54; Section 2.2, p. 55).
5. When ProB evaluates the goal to true, a rule can be generated. If “Add rule” is checked, BEval writes a rule to the component’s `.pmm` file; if “W.D.P.O.” is checked, it writes to the well-definedness rule file (Section 2.2, p. 55).
6. Re-run Atelier B’s prover or a User Pass so that the generated rule discharges the associated obligation (Section 2.4, pp. 56–57).

The paper gives a concrete rule shape:

```
THEORY RulesProBAssertionLemmas_1 IS
  /* Expression from (AssertionLemmas_1), it was added in Thu Jun 27 18:02:32 BRT 2013
  evaluated with ProB in 5913 milliseconds. Module Path:/B_Resources/BYTE_DEFINITION.mch */
  "‘Check assertion (card(BYTE) = 256) deduction - ref 3.2, 4.2, 5.3’"
  BYTE = (1..8 --> {0,1}) =>   (card(BYTE) = 256)
END
```

(The paper’s example, copied with only the whitespace changed.)

It also gives a User Pass that selects an `Initialisation` obligation and invokes `RulesProBAssertionLemmas_1` (Section 2.4, pp. 56–57). On reuse, the paper says, “The created rules can be reused to solve several proof obligations.” (Section 2.4, p. 56.) It also says, “Each created true rule has a relation with one proof obligation.” (Section 2.4, p. 56.)

evidence: in the micro-controller library experiment, the Common POs table reports these total-denominator results. Power2 has 18 total obligations, 2 proved by Atelier B force 1, and 18 after BEval, a gain of 16/18 = 88% (table, p. 57). BIT has 49 total, 23 after force 1, and 49 after BEval, a gain of 26/49 = 53%. BYTE has 18 total, 12 after force 1, and 18 after BEval, a gain of 6/18 = 33%. BV16 has 6 total, 2 after force 1, and 6 after BEval, a gain of 4/6 = 66%. The paper’s Gain column is the share of all obligations proved only after BEval; the percentages are truncated, not rounded (16/18 is 88.9%, 4/6 is 66.7%). My reading: Gain is the BEval count minus the earlier count, divided by the total. For well-definedness obligations, BYTE rises from 129/136 to 132/136, so BEval exclusively adds 3/136 = 2% (rounded), and BV16 rises from 67/69 to 69/69, adding 2/69 = 2% (truncated from 2.9%). The other rows show no BEval gain: Power’s well-definedness obligations are all proved by force 1 (4/4), Power2 has no well-definedness obligations, Power has 2 of 3 common obligations proved with 0% gain, and BIT’s well-definedness row stays at 30 of 69 with 0% gain. Forces 2 and 3 add nothing in any row (every F1;F2;F3 cell is “-”). The paper concludes: “Almost all components have significant gains using BEval.” (Section 3, p. 57.)

verus form (inference): the analogous pattern is a verified lemma that states the B rule as a postcondition, with executable code kept separate. For a cardinality fact, a Verus shape is:

```rust
proof fn byte_cardinality()
    ensures
        spec_cardinality(byte_set()) == 256,
{
    assert(spec_cardinality(byte_set()) == 256);
}
```

Inference: `spec_cardinality` and `byte_set` would need definitions and supporting lemmas; the paper’s B expression cannot be pasted into Rust. A generated lemma may be called from other proof functions. Verus has no ProB evaluator or Atelier B `.pmm` rule file, so the reusable artifact is a Rust proof lemma whose `ensures` fact is available to later proofs. Inference: the trust boundary changes, since ProB’s evaluator and its parameter bounds are replaced by Verus’s checker and its backend solver for the encoded Rust specification.

where it fails or assumes: Inference: the approach assumes that the B expression handled by ProB has the same meaning as the Atelier B obligation. The paper warns that “Differences in the B syntax supported by Atelier B and ProB need to be fixed to support the evaluation of all components of micro-controller [10].” (Section 3, p. 57.) It also says ProB has limitations for constructs supported by Atelier B, although those limitations were being addressed (Section 4, p. 58). The integer and finite-domain bounds are parameters, so Inference: an evaluation under a bounded domain is not automatically a proof for an unbounded mathematical domain. The paper does not discuss this soundness question.

## technique 2: batch rule generation and proof-pass replay

what it is: evaluate many selected obligations, export all true results as named rules, and create a User Pass that applies those rules automatically. The paper says the gains relieve “the developer from the burden of manually verifying a significant percentage of proof obligations” (Section 3, p. 57).

how to do it:

1. Open ComponentGUI and select the obligations; by default it selects obligations currently marked unproved (Section 2.2, p. 56).
2. Choose parameters such as `KODKOD`, `SMT`, `init`, timeout, and integer bounds, then run the batch evaluation (Sections 2.2–2.3, p. 56).
3. For each true result, export a rule; the paper’s sample generated rule carries a name, date, time spent and the rule composed of hypothesis and goal, and BEval stores rules in the component’s `.pmm` file or the well-definedness file (Section 2.1, p. 55; Section 2.2, p. 55; Section 2.4, p. 56).
4. Generate a User Pass; each one “selects the proof obligations by name and defines the rule to invoke”, as in `Operation(Initialisation) & mp(Tac(RulesProBAssertionLemmas_1))` (Section 2.4, p. 57).
5. The paper says a User Pass “can be used in automatic prover” (Section 2.4, p. 57); Inference: running it there makes the batch rules part of the normal proof workflow.

verus form (inference): a Rust analogue is a library of `proof fn` lemmas, each with explicit `requires` and `ensures`, and proof functions that invoke them in sequence. Inference: unlike a `.pmm` rule, a Verus lemma is checked from its body or admitted only through an explicitly trusted boundary; the lemma’s name and postcondition are the reusable interface. A batch harness can generate calls, but it cannot turn a bounded runtime test into a proof without a checked lemma body.

evidence and limits: the table’s gains show that BEval verified more obligations than Atelier B forces 1 to 3 for these five components using BEval’s default parameters (Section 3, p. 57); the paper does not say whether the numbers came from ComponentGUI batches or how the rules were replayed. The study has no independent benchmark, timing distribution, or comparison with another modern prover. The conclusion says the results show “a better ability of the constraint logic solver of ProB than the theorem prover of Atelier B for manipulating a class of expressions” (Section 4, p. 58), which is a claim about one class, not universal superiority. Inference: reusing generated rules also creates maintenance risk when the B specification, ProB version, or parameter bounds change; the paper does not evaluate invalidated-rule detection.

## what is proved, what remains trusted, and product implications

The reported fact is that ProB discharged particular Atelier B obligations after Atelier B’s forces did not, and that BEval generated rules consumed by Atelier B.

## techniques for the catalog

- complementary-prover evaluation — run a second evaluator or constraint engine on proof obligations left by the primary prover, then import only true results as reusable rules
- parameterized bounded evaluation — expose integer bounds, model initialization, relational solving, SMT, finite-domain solving, and timeout as explicit verification controls
- batch rule generation — turn a selected set of successful evaluations into named, reusable proof rules and an automatic proof pass
- reusable proof-rule integration — associate each generated rule with its source obligation so later automatic or interactive proofs can apply it
