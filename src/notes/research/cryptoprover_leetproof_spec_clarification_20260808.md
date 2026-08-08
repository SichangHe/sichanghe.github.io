# CryptoProver, LeetProof, and specification trust

## shortest correct reading

CryptoProver does **not** assume that the executable implementation is correct.
The implementation is the object being proved. It assumes something different:
that the human-supplied public contracts and trusted mathematical library are
the right correctness boundary. Verus then proves that the fixed executable
code satisfies those formal contracts. It does not prove that the contracts
faithfully translate English requirements. [CP]

LeetProof does generate a formal specification from English. Its final Lean
proof establishes code-to-specification correctness, not
English-to-specification correctness. The latter is supported by tests, an LLM
judge, comparison with human reference specifications, and author judgment. It
remains fallible. [LP]

## the three gaps that must not be conflated

There are three different relations:

1. **English intent to formal specification.** Neither paper proves this.
2. **Formal specification to implementation.** Verus establishes this in
   CryptoProver; Lean establishes it in LeetProof.
3. **Generated specification to a pre-existing human specification.**
   LeetProof evaluates this relation on VERINA using Aristotle-generated Lean
   equivalence proofs.

CryptoProver addresses only relation 2. LeetProof addresses relation 2 in its
synthesis pipeline and uses relation 3 as imperfect evidence about relation 1
in its separate specification study. A proof of relation 3 inherits any mistake
shared by, or present in, the human reference; it is not a proof of English
intent. [CP] [LP]

## CryptoProver: what is and is not covered

The fixed inputs are executable Rust, top-level API contracts, a specification
vocabulary, and a trusted library containing field specifications, arithmetic
facts, intentional axioms, and `vstd`. The agent writes intermediate contracts,
lemmas, and proof bodies. Humans also supply the target decomposition and proof
order. Acceptance requires a fresh whole-crate Verus check, zero non-axiom proof
holes, and the integrity gates. [CP]

“Whole-crate verification” does not mean that every source line has its own
English specification. Modular verification works through contracts:

1. an outer function promises a formal postcondition;
2. internal function contracts and loop invariants connect its statements to
   that promise;
3. Verus checks the generated verification conditions over the selected crate
   and rejects an internal contract that cannot compose to the fixed outer
   contract.

A weak outer contract can still make a fully verified program misleading. For
example, proving that a sort routine preserves length does not prove that it
sorts. CryptoProver blocks the agent from weakening the frozen public contract,
but it does not prove that the human chose a complete public contract.

This is the answer to the “pointless specification” objection. If no meaningful
public contract were fixed before generation, the objection would be decisive:
an agent could merely describe whatever the implementation already does. In
CryptoProver, however, the public contracts are human-written, frozen inputs,
and the agent may not weaken them. Agent-generated internal contracts can mirror
implementation details, but they are useful only if they compose into the fixed
external claim. The demonstrated contribution is therefore automated proof
engineering under a supplied claim boundary, not discovering or validating the
claim itself. Its value is exactly as strong as that boundary. [CP]

The scope is also bounded. The curve result is relative to 48 pre-existing
trusted axioms and a fixed trusted field/arithmetic layer. The ChaCha result
covers the portable backend, not the SIMD backends. The paper itself limits the
claim to functional correctness against supplied contracts, excluding
cryptographic security, constant time, side channels, and contract adequacy.
[CP]

## LeetProof: Aristotle has two different jobs

The paper uses Aristotle in two places that should not be conflated.

First, in the 188-task RQ1 specification audit, VERINA already provides
human-written Lean reference specifications paired with English problems.
LeetProof generates another Lean specification. Aristotle tries to prove the
two formal specifications equivalent. The reported 150 successes establish
generated-to-reference equivalence, subject to independently checking the
released Lean proofs. When this proof search does not establish equivalence,
the authors manually classify the discrepancy. The humans are not completing
the same proof and this procedure does not bridge implementation to
specification. [LP]

Second, in program synthesis and the residual-obligation study, Aristotle tries
to prove leftover verification conditions. Those conditions connect an
implementation to the generated formal specification. This use addresses
relation 2 above, not English intent. [LP]

For 188 VERINA tasks, LeetProof creates two Lean propositions:

- generated and reference preconditions are equivalent; and
- under the generated precondition, generated and reference postconditions are
  equivalent.

Aristotle tries to generate Lean proofs of those propositions. Aristotle is an
AI prover operated by Harmonic. Its research paper is public and the service is
publicly hosted, but the primary sources checked here do not link a public
implementation of Aristotle itself. It should therefore be treated as an
external, opaque service for reproducibility. [AR]

We do not need to trust Aristotle's verbal judgment. A successful result should
be a self-contained, hole-free Lean proof, independently rechecked by Lean. The
trusted authority is then Lean's checker and the declared imports and axioms,
not Aristotle. If Aristotle fails to find a proof, the result is inconclusive;
failure is not evidence that the specifications differ. A reader should rerun
the released proofs and reject any proof containing `sorry`, `admit`, or an
undeclared axiom before treating equivalence as established.

## How much of LeetProof's intent evaluation is manual

The paper does more than inspect a few examples, but its headline still mixes
machine evidence and author judgment:

- It reports 150 of 188 generated specifications as logically equivalent to
  human references.
- When equivalence is not established, the authors manually inspect and assign
  categories such as reference error, defensible precondition variation,
  ambiguity, over-restriction, or generated-specification error.
- The reported 183 of 188, or 97.4 percent, combines the equivalence category
  with author-judged “defensible” differences.
- The judgment is not reported as blinded or independently double-scored.
- Property-based testing caught two errors that passed the LLM judge, but three
  bad specifications survived because the tests did not exercise the bad edge
  cases.

For the separate 50-task synthesis experiment, the generated specifications
become the pipeline's ground truth after type checking, LLM review, and generated
random tests. The archive does not provide an independent human intent label for
each of those 50 specifications. Lean subsequently proves the program against
that generated ground truth. Thus the code-to-specification evidence is strong;
the English-to-specification evidence is not definitive. [LP] [LP-ART]

Calling these checks “unit tests” is slightly inaccurate. The draft begins with
about ten concrete examples, some taken from the problem and some generated,
then Lean property-based testing samples more inputs. The checks ask whether the
precondition admits the example, whether the intended output satisfies the
postcondition, and whether an alternative output also satisfies it. They are
useful falsifiers, not a proof of intent. Because the specification and examples
come from correlated model reasoning, they can miss the same semantic boundary;
the paper reports that three generated-specification errors survived because
the tests did not exercise the bad edge cases. [LP]

## why this could still fit ASE

No public reviewer reports were resolved, so claims about why particular
reviewers voted to accept would be speculation. A bounded venue-fit inference
is possible from the paper itself. The paper explicitly admits that there is
“no established method” to prove perfect agreement with subjective intent. Its
contribution is broader than that unresolved link: a foundational multimodal
verification architecture, new Lean property-based-testing machinery, complete
Lean certificates for code against specifications, a paired whole-system
comparison, and a released artifact. The authors also report benchmark defects
acknowledged by the benchmark authors. These are plausible publishable
contributions even though intent validation remains weak.

That does not rescue every evaluation claim. The 150 formal-equivalence cases
are materially stronger than the 97.4 percent headline, because the latter
adds author-judged “defensible” differences without reported blinding or
independent double scoring. For the 50-task synthesis benchmark, promoting the
generated specification to “ground truth” after an LLM judge and correlated
tests leaves the central English-intent risk unresolved. [LP]

## The Verus benchmark principle

The human's objection is correct: one human specification cannot be treated as
infallible ground truth. Human and agent specifications should be judged against
the same independent semantic evidence, not against one another's text.

The relevant evidence is whether a contract admits required behaviors and
excludes known violations, supported by authoritative requirements, formal
implication or equivalence checks in Verus, and concrete counterexamples. This
can reveal weak postconditions, overly strong preconditions, missing frame or
state conditions, and unmodeled panic or overflow behavior. When neither a proof
nor a counterexample resolves the relation, the result is “unknown,” not a human
or agent win.

This principle does not make informal intent perfectly provable. It makes human
and agent omissions equally visible and prevents either source from becoming the
oracle. The manager owns the concrete benchmark design, staging, and launch.

Experiment ownership, staging, and launch belong to the manager. The separate
context result is only a boundary fact: one qualifying PCODX route can inject a
compacted ledger into a fresh upstream thread, but in-place active-thread
replacement, KV-cache reuse, live-provider acceptance, and semantic recall have
not been demonstrated.

## source map

### CP — CryptoProver

- authoritative manuscript: <https://arxiv.org/abs/2608.00965>
- primary full text: <https://arxiv.org/pdf/2608.00965v1>
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/An AI Approach to Verified Production Cryptographic Libraries, Chuyue Sun, Su Fong, Zhiyi Kuang, Yizheng Jiao, Nina Narodytska, Haoze Wu, David L. Dill, Clark Barrett, arXiv, 2026.pdf>)
- SHA-256:
  `5afa405f7721666d45fe7fa32f24547aadcec7b9bef3fc6d6e3c5ea007bced42`
- version/date: arXiv v1, 2026-08-02
- supporting sections: 2.1, 2.2, 4, 5.3, and appendix F
- exact quote fragments: “functional correctness against the supplied
  contracts”; “portable backend, not the SIMD backends”
- detailed source map:
  [CryptoProver note](./cryptoprover_20260807.md#source-map-cryptoprover-paper)

### LP — LeetProof

- authoritative accepted paper:
  <https://verse-lab.org/papers/leetproof-ase26.pdf>
- DOI: <https://doi.org/10.1145/3832783.3837559>
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/LeetProof- Certified Program Synthesis with a Multi-modal Verifier, Yueyang Feng, Dipesh Kafle, Vladimir Gladshtein, Vitaly Kurin, George Pîrlea, Qiyuan Zhao, Peter Müller, Ilya Sergey, ASE, 2026.pdf>)
- SHA-256:
  `f3702b4d98a5f92f28a3f303102433b37e9aaeae16bd245df65481f03df1f664`
- version/date: ASE 2026 proceedings version; retrieved 2026-08-05
- supporting sections: 3.1, 5.1, 6.1–6.3, and 7
- exact quote fragments: “no established method”; “manually inspect”;
  “PBT cannot detect them”

### LP-ART — LeetProof official artifact

- authoritative archive: <https://doi.org/10.5281/zenodo.19624966>
- local archive: `official-artifact-v2-zenodo-19624966.zip` in the matching
  LeetProof collection directory
- SHA-256:
  `e4ffa6b7f4556cbffbadeb3674ede4b7f1048ee961a7daf4c07fb81b33255a04`
- relevant contents: 188 VERINA equivalence directories with generated,
  comparison, and Aristotle proof files; generated synthesis artifacts
- uncertainty: this analysis did not rerun all Lean equivalence proofs or the
  external Aristotle service

### AR — Aristotle

- authoritative paper: <https://arxiv.org/abs/2510.01346v2>
- official service: <https://aristotle.harmonic.fun/>
- local PDF:
  [paper](</hdd1/sichanghe/paper_collection/Aristotle- IMO-level Automated Theorem Proving, Tudor Achim et al., arXiv, 2025.pdf>)
- SHA-256:
  `3cb2f3760b9f73ef24caf36ceafa600e75da5ca51f31dd46f662aac3b6263749`
- version/date: arXiv v2, 2025-10-10
- exact quote fragments: “Lean proof search system”; “self contained Lean
  file”
- access boundary: public paper and hosted interface; no public Aristotle
  implementation link resolved from the primary paper, arXiv record, or official
  product page on 2026-08-08
