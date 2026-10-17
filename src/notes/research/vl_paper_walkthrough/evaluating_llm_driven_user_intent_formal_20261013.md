# Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages
(authored by agents unless marked 🧑)
Tag: `lahiri2024evaluating`, [paper](https://arxiv.org/abs/2406.09757)

Audit: audited 2026-10-13 against the paper (text and PDF page layout); checked the 64 of 153 and 41.8% arithmetic, 0.6 score, 5 mutants, mutation operators, task ids 61, 145, 161, 234, 240, 445, the 0.66 threshold, every quotation and page reference, the harness code, and the Verus forms (reveal_with_fuel, broadcast use, old, triggers are supported by the Verus papers); changed: the conjecture sentence is wholly on p.4, not spanning pages 3-4; the fuel claim now says unrolled in proportion to length, as the paper does, not exactly as many times as the length; the Appendix B objection now says too strong, as the paper does. Not checked: the cited earlier notes, the dataset and repository outside the PDF.

source: Shuvendu K. Lahiri (Microsoft Research), Formal Methods in Computer-Aided Design 2024; arXiv:2406.09757v2, 15 Oct 2024; 6 PDF pages, of which 5 are text with Appendices A and B on p.5. Artifact named in the paper: https://github.com/microsoft/nl-2-postcond.

earlier notes: `distributed_verification_review_b/deep_6_intent_to_spec.md` (entry P12) and `deep_7_evaluation.md` (the part on user-intent formalization) give the idea in a paragraph each: concrete input/output pairs checked symbolically, mutated outputs for strength, 64 of 153 specifications, the shared-elements case, and the caution about reading a failed proof as a refutation. Added below: the two metrics as definitions, the harness construction line by line, the mutation operators, the proof obstacles and their workarounds, the rejected alternatives, the Verus form, and where the reported evidence is thin.

## the claim, and how much of it is measured

The paper answers one question: given a candidate postcondition written by an LLM (or anyone) and a few input/output tests, can a verifier score the postcondition without a human and without the implementation? Its answer is a pair of metrics computed by Dafny. It opens with the reason the question matters: “Formal verification is only as good as the specification it verifies.” (Section I, p.1)

What is checked by a prover: for each test, that the postcondition holds of the concrete input and output; for each mutated output, whether it still holds. What is measured: agreement between those scores and human labels on 64 specifications. The paper calls this “ongoing work” (Section II, p.4) and gives no agreement rate, only cases.

What stays trusted:
- the tests: “Of course, just as in the case of code generation, the technique for determining specification quality assumes a high-quality set of validation tests.” (Section I-C, p.3)
- that a failed proof means the mutant is rejected (technique 3)
- Inference: the mutation operators; a specification scores high if it rejects the particular wrong outputs that were tried.

## technique 1: correctness of a postcondition against tests, as a Hoare triple with no implementation

what it is: a postcondition ϕ(x, y) for method m(x):y is correct with respect to a test set T if, for every pair (i, o) in T, assigning x := i and y := o makes ϕ true. Formally the triple {true} x := i; y := o; {ϕ(x, y)} is valid for each test (Section I-C, p.3). The method body plays no part.

when to use: to reject a wrong specification before any code or proof is written against it; and where the specification has quantifiers or ghost state and so cannot be run as an assertion. The paper's reason the earlier test-based approach does not transfer: one “cannot apply the approach of Endres et al. for rich specifications that contain ghost state or constructs that cannot be evaluated at runtime (such as a universal/existential quantifier)” (Section I-C, pp.2-3; this is the second of four numbered alternatives, quoted without its lead-in word).

how it is done (Section I-C, p.3, on the paper's running example):
1. keep the method's signature, its `ensures` clauses and every auxiliary predicate exactly as generated
2. delete the body
3. in the new body, create local values holding the test's inputs
4. constrain each formal parameter to equal the corresponding local with an assumed axiom; for arrays, equality of the slices up to their lengths, which also fixes the lengths
5. add assertions that state the parameter's elements one by one; the paper explains why: “The redundant asserts are needed for the verifier to trigger the quantifiers used in InArray to enable the proof.” (Section I-C, p.3)
6. assign the test's expected output to the result
7. run the verifier; success means the postcondition holds for this test
8. a specification is correct if step 7 succeeds for every test

the paper's code shape (Section I-C, p.3; the two `ensures` clauses are the GPT-4 specification under test):

```
predicate InArray(a: array<int>, x: int) reads a
{ exists i :: 0 <= i < a.Length && a[i] == x }

method SharedElements(a: array<int>, b: array<int>) returns (result: seq<int>)
  ensures forall x :: x in result ==> (InArray(a, x) && InArray(b, x))
  ensures forall i, j :: 0 <= i < j < |result| ==> result[i] != result[j]
{
  var a1 := new int[] [3, 4, 5, 6];
  var a2 := new int[] [5, 7, 4, 10];
  assume {:axiom} a[..a.Length] == a1[..a1.Length];
  assert a[0] == a2[0] && .... && a[3] == a2[3];
  assume {:axiom} b[.. b.Length] == a2[..a2.Length];
  assert b[0] == a2[0] && .... && b[3] == a2[3];
  result := [4, 5];
}
```

The first `assert` as printed compares `a` with `a2`; since `a` is constrained to equal `a1`, this reads as a typographical slip for `a1` (Inference: with the printed text the assertion `a[0] == a2[0]`, that is 3 == 5, would fail).

Verus form. Inference: the same harness is a function with the original signature and `ensures`, a `requires` clause in place of the assumed axioms, and a body that only returns the expected value. For a Verus function over `Vec<i32>` whose contract speaks of `a@` and `b@`, add `requires a.len() == 4, a[0] == 3, a[1] == 4, a[2] == 5, a[3] == 6` and likewise for `b`, and let the body build and return the vector for `[4, 5]`. The `requires` does the job of steps 3-5 at once, because it states each element separately and so gives the solver the terms it needs to instantiate `exists|i: int|` in a predicate like `InArray`. A lighter variant, when the contract can be lifted into a `spec fn post(a: Seq<int>, b: Seq<int>, result: Seq<int>) -> bool`, is one `proof fn` per test whose `requires` fixes the three sequences element by element and whose `ensures` is `post(a, b, result)`. What changes: nothing in the logic. What does not carry over: `assume {:axiom}` is not needed; and for a function taking `&mut` arguments the postcondition mentions `old(...)` values, so the test must fix both the old and the new state, which the paper (methods with value results only) does not treat.

evidence: “Of the 153 problems with specifications (a subset written by humans), we have managed to apply our tool to check 64 of the specifications (at the time of writing).” (Section II, p.4) 64/153 is 41.8% (my division). The check also caught errors in the benchmark's own tests, for specifications labelled strong: “These include examples with ”task id”s 234, 240, and 445.” (Section II-B, p.4); for task 234, the cube of a number, the expected value had been copied as 25 for an input of 5.

where it fails or what it assumes: proofs about concrete values are not automatic (technique 4); together with parsing errors this leaves 89 of 153 not covered. A vacuous postcondition passes: “However, the above verification only proves that the specification is correct for the test; a vacuous specification ensures true would also be verified.” (Section I-C, p.3) Hence technique 2.

## technique 2: completeness as the fraction of mutated outputs the postcondition rejects

what it is: a score between 0 and 1 for how tightly the postcondition pins the output. For each test input, replace the expected output by wrong ones and count how many the postcondition excludes. The paper names its origin: “Then the completeness measure of ϕ with respect to T is |T2 |/|T1 | (this is inspired by kill-set in mutation-testing literature [16]).” (Section I-C, p.3), where T1 is the set of mutated pairs and T2 the subset for which the triple does not hold.

when to use: after correctness holds, to tell a strong specification from a weak or vacuous one, and to rank candidate specifications for the same task.

how it is done:
1. for each test (i, o), produce up to 5 distinct outputs o' different from o (Section I-C, p.3; Section II-A, p.4)
2. the mutation operators (Section II-A, p.4): a Boolean is flipped; an integer has a random value from 1 to 10 added or subtracted; a string has one character replaced by a random one, or a random character appended; an integer array or sequence has one element dropped, or a random value inserted at a random index
3. build the technique-1 harness with o' as the assigned result and run the verifier
4. count a mutant as rejected when verification fails
5. score = rejected mutants / all mutants, per test, then averaged over the test cases of the specification (Section II, p.4)
6. only run this for a specification that already passed correctness on all tests (Note in Section I-C, pp.3-4)

the paper's worked case (Section I-C, p.3): the specification above was labelled strong by the dataset's authors. Mutating the result to `[6]` fails the first `ensures`. Mutating it to `[4]` or to `[5]` still verifies, because the implication only says every result element is in both arrays and never that every common element is in the result. The score is 0.6. Inference: 0.6 is 3 of 5 mutants rejected for that test, consistent with the two survivors named. The paper's repair is to replace `==>` by `<==>`.

Verus form. Inference: build the same harness with the mutated value returned. Verus allows a stronger reading than the paper's step 4: with the contract as a `spec fn post`, write a `proof fn` whose `requires` fixes input and mutated output and whose `ensures` is `!post(a, b, result)`. If that verifies, the mutant is rejected by proof, not by the solver giving up; if neither `post` nor `!post` can be proved, the outcome is unknown and should be counted apart. For `[4]` against the shared-elements contract, the positive proof succeeds, which is a definite witness that the contract admits a wrong output. This three-way count (proved rejected, proved admitted, unknown) is not in the paper.

evidence: the threshold the paper reads off its data: “In other words, barring a few exceptions below, all the specifications that are marked STRONG SPEC have a completeness score above 0.66, and all the WEAK SPEC have a score below 0.66.” (Section II-B, p.4) Exceptions it lists: specifications labelled strong that are weaker than the precise one, for task 2 (shared elements) and “at least 2 more cases”, namely tasks 145 (`maxAbsDiff`, which only bounds the difference from above) and 161 (`removeElements`, again an implication where an equivalence is needed) (Section II-B, p.4). A correctly labelled weak one, task 61, only ensures a count is non-negative and scores low.

where it fails or what it assumes:
- the paper gives no table: no number of strong, weak and wrong labels among the 64, no count of agreements, no distribution of scores. The abstract's “agrees closely” rests on the sentence quoted above and the named cases.
- Inference: when several outputs are valid, a random mutant can itself be valid (for shared elements, `[5, 4]` is accepted by the paper as an alternative answer); a correct specification then admits it and loses score. The operators listed (drop, insert, add a number) do not produce a reordering, so this case does not arise for the running example, but nothing excludes it in general.
- Inference: the score depends on which wrong outputs are tried. Five random mutants per test over three tests is at most 15 trials per specification, and mutants are syntactically near the right answer by construction; a specification that misses a property unrelated to those edits is not penalised.
- only the output is mutated. Preconditions, and specifications of methods with effects on their arguments, are outside the definitions.

## technique 3: treat a failed proof as rejection only when the same proof succeeds on the true output

what it is: a rule for when an unsound-looking inference is acceptable. A deductive verifier that fails to prove a triple has not shown the triple false. The paper states the objection itself: “One may caution against using a verification failure (as used for the completeness checks) as a means to show that the corresponding Hoare-triple does not hold.” (Section I-C, p.3)

how it is done (Note, Section I-C, pp.3-4):
1. first prove correctness for every test, including the unmutated (i, o)
2. only then check mutants (i, o') for the same i
3. read a failure in step 2 as rejection, on the argument that the two verification conditions differ only in one concrete value, so the solver's reasoning, including quantifier instantiations, should be nearly the same

The paper labels the argument a conjecture: it says “we conjecture that the underlying reasoning (including quantifiers instantiated) would be quite identical in most cases, and the verification failure strongly indicates that the Hoare-triple does not hold” (p.4).

Verus form. Inference: the rule transfers as stated, and the Verus form of technique 2 removes the need for it wherever the negation can be proved. Where it cannot, keep the paper's ordering (positive test first) and report the mutant as unknown, not as rejected.

evidence: none measured. The paper does not report any mutant whose failure was checked by other means.

where it fails or what it assumes: Inference: the redundant assertions of technique 1 are written for the true output. A mutant that inserts an element needs an instantiation for the new element that the harness never states, so a failure there may be the solver's and not the specification's; the conjecture is weakest exactly for insert mutations on quantified predicates.

## technique 4: getting concrete-value proofs through the solver

what it is: two obstacles the paper met when proving a symbolic specification for concrete data, with the workaround it has for one.

how it is done (Section II-C, pp.4-5):
1. recursive predicates. A specification that counts with a recursive function over the tail of an array needs that function unrolled in proportion to the array's length (the paper: “unrolled proportional to the length of the array”). “Dafny uses a notion of ”fuel” to control the level of unfolding of such predicates, which suffices for inductive proofs.” (p.5) For a concrete array the default is too little. No fix is implemented; inferring the amount of fuel is listed as future work.
2. quantifier instantiation. Showing a concrete number is not prime needs a witness divisor; showing it prime needs the quantifier instantiated on every smaller value: “For example, to show that the value 97 is a prime, the quantifier needs to be instantiated on all values up to 96.” (p.5)
3. the workaround in place: add assertions equating the parameter array with the concrete one at every index, so that each `a[k]` appears as a term (the `assert` lines in the harness above)
4. a third, non-fundamental obstacle: the tool reads Dafny files with regular expressions and mis-parses some, for example 2D arrays; an AST-based reader is planned

Verus form. Inference: for item 1, `reveal_with_fuel` on the recursive `spec fn`, with the fuel set from the length of the test array plus one, is the direct counterpart and the length is known to the harness generator. For item 2, an `exists|k: int|` goal is met by stating the witness in an `assert`; a bounded `forall` over a concrete range is met by one `assert` per value, which a generator can print (96 lines for the paper's prime case), since Verus instantiates a quantifier only on terms that match its `#[trigger]`. Item 3 is the element-by-element `requires` of the Verus form under technique 1.

evidence: the coverage figure, 64 of 153, is the measure of how far these obstacles reach; the paper attributes “a large class” of the remaining failures to parsing and “a few fundamental challenges” to proofs (Section II-C, p.4) without counts.

## alternatives the paper rejects, with reasons

From Section I-C (pp.2-3) and Appendix B (p.5):
- run the tests on the implementation, ignoring the specification: does not rule out a vacuous specification
- verify the candidate specification against the hidden reference code: still admits `true`, and the proof is unlikely to be automatic because of invariants and lemmas
- check equivalence with a hidden reference specification: “However, such a metric would be too strict as it would not be able to distinguish weak and vacuous specifications (such as true) from strong (yet incomplete) specifications.” (p.3)
- prove {x == i ∧ ϕ(x, y)} skip {y == o}, that is, that the specification forces the expected output: this is Boolean, gives 0 to a strong but imprecise specification, and is too strong when the intended behaviour allows several outputs, as with `[4, 5]` and `[5, 4]` (Appendix B, p.5)

Inference: the last one is still the right check for a deterministic function when one wants a yes/no answer to whether the contract alone determines the result; the paper's objection is to using it as the only metric.

A further point made about the source dataset (Misu et al., MBPP-DFY), which keeps a generated pair when the generated specification is provable for the generated implementation: “In particular, the framework allows for the Dafny code to only satisfy a vacuous specification (such as ensures true) or worse, an incorrect one.” (Section I-B, p.2)

## points that do not fit together

- Section II says of the 64 that “for these 64 examples, our tool is able to verify the soundness of the specifications over the set of validation tests” (p.4), while Section II-B reports correctness failures for incorrect specifications and for tasks 234, 240 and 445. Whether those failing cases are among the 64 or outside them is not stated; if the 64 are only those that passed correctness, the agreement on wrong-labelled specifications is reported for a set whose size is not given.
- “a subset written by humans” (p.4) and the running example's specification, described as GPT-4-generated, leave the mix of human and model specifications among the 153 unstated.
- The harness figure's first assertion compares `a` with `a2` (see technique 1).
- The summary names F*, Dafny and Verus as targets (Section I-A, p.2); only Dafny is implemented.

## already established here; VL need not rediscover it

- Inference: that a test can be turned into a proof obligation on the specification alone, that mutated outputs give a strength score, and that human strong/weak labels miss implication-for-equivalence errors. A Verus port is engineering, and the paper's obstacles (fuel, instantiation, parsing by regex) say where the effort goes.
- Inference: not established and worth doing: a measured agreement rate, mutants proved rejected instead of assumed, preconditions and mutable state, and tests not written by the specification's author.

## bearing on a product of agent-written Rust verified by Verus

Inference: none as a product; it is an evaluation method from a group that works on Dafny, F* and Verus tooling, and a small one (the tool is “a 400 line Python script”, Section II, p.4). Its bearing is the reverse: any offering of agent-written verified code will be asked how its specifications were validated, and this is the cheapest published answer. A competitor adopting it gains a number to show for specification quality; VL can adopt it as easily.

## techniques for the catalog

- test-as-triple correctness — replace a method's body by assignments of a test's input and expected output and verify the unchanged postcondition, so a wrong specification is rejected without any implementation
- output-mutation completeness score — verify the same harness with up to five perturbed outputs per test and score the postcondition by the fraction it rejects
- positive-first failure reading — count a mutant's failed proof as rejection only after the true output passed with the same harness, and treat it as a conjecture
- element-wise witness assertions — state each concrete array element separately so the solver has the terms to instantiate quantified predicates
- fuel sized to the test — for a recursive specification function on a concrete input, raise unfolding to the input's length
- forced-output check — prove from input and postcondition alone that the output equals the expected one, usable when the intended result is unique
