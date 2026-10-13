# 🤖 known problems in the review notes behind the database
(authored by agents unless marked 🧑)

Ten Claude agents read all review notes on 12 October 2026 to build the source records. They reported the problems below. The database copies the notes as they are; these are not fixed.

## the notes disagree with each other

- Anvil effort: one note says "around two person-months" for the ZooKeeper controller, another "around 2.5 person-months" per controller. The notes say these measure different things, but do not say which to use.
- Anvil proof size: review B's liveness note gives 7245, 5211, and 7079 proof lines; its tools note gives 8352, 7228, and 8395, which include the controller model.
- ModelFuzz: one review A note says 12 previously unknown bugs, another says 13.
- Implicit Rankings (Lotan and Shoham): the evaluation procedure calls it "TACAS 2026, Implicit Rankings for Proving Liveness"; review B's liveness note calls it "TACAS 2025, Implicit Rankings for Verifying Liveness Properties in First-Order Logic".
- TLA-Verus and Anvil carry different titles in the evaluation procedure than in the other notes.
- Distributed Causal Memory: the notes say POPL 2021; the saved file name says 2022.
- Vest: the saved file name says 2026; the PDF says 2025.
- LiveFMBench: review A's 12 October note says "pending deeper reading" while its 8 October shortlist note had already read the faithfulness section.
- I3DP and IC3Syn look like the same work under two names; no author statement in the notes confirms it. They are separate records here.

## the notes' own counts are off

- review A's 12 October verified-source note opens with "These five records" and holds about 35 entries; its copy in the research notes holds only the first seven.
- review A's Google Scholar note says 110 distinct titles, 72 covered and 38 not; the lists hold 72 and 37.
- review B's invariant note says 35 distinct papers and discusses about 50.
- about 230 titles in review A's citation-list note and the long title lists in its Google Scholar note carry no fact about content; they are not source records.

## sources the notes describe without having read them

- secondhand entries: review B's evaluation note describes CryptoProver, LeetProof, Vero, SaltBench, StarVerus from earlier notes, not from the papers.
- abstract or README only: Tulip, Lion, AutoMan, Verified SCION, the Rust guard-based refinement paper, KEVM, the Tian et al. TLA+ paper. Tulip still appears in a problem table with an effort figure taken from its abstract.
- web summary only: the Succinct blog post, the PAgE talk, Proofs Promptly (in review A), Specy.
- some quotes in review A's model-to-code and intent notes are marked by the notes as search-snippet wording that may not be exact: Spec-Harness, the Mocket README, SysMoBench's "8.3% vs 41.9%", the Cedar bug counts.

## inconsistencies inside the papers that the notes flag

These are the papers' problems, recorded so nobody quotes the wrong figure.

- EqiVM: 23 proved contracts in the abstract, 19 plus 8 exploratory in the text, 27 in the conclusion.
- Code2Inv: the baseline solves 73 programs in the abstract and 74 in section 5.1.
- FM-Agent: 4,910 functions in the prose, 4,957 in Table 1.
- Atmosphere: about two person-years in section 6.3, under 2.5 in total and 1.5 for verification in the abstract.
- TLA-Prover: six domains in the text, ten in Table 3. SWISS: 28 table rows, "27 benchmarks" in the text. VLTL-Bench: three datasets in the abstract, four in the body.
- Proofs Promptly: about a month in a table, two weeks in the abstract.
- the message-broker model paper (Rochev): a table says "All invariants proven" while the paper reports violations.
- VeriBench launch draft: says every reference theorem is fully proved and also reports a nonzero unfinished-proof rate; no paper was found.
- arithmetic slips: Alloy repair paper prints 55.7% for 206/357; CodeMetaAgent prints 30.3% for 90/300 and 78.6% for 233/300.
