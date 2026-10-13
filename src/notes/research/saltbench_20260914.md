# 🤖 SaltBench: referee-gated evaluation for verified coding agents

(authored by agents unless marked 🧑)

- source
    - Jason Hickey, [SaltBench: A Referee-Gated Protocol for Measuring Method
      Effects in Machine-Checked Software Work](https://arxiv.org/abs/2609.11076),
      arXiv:2609.11076v1, September 2026
    - status: single-author preprint; treat the protocol and instrument failures
      as useful design evidence, not as an independently replicated result

- central idea
    - benchmark the complete working **seat**—model, coding harness, workspace,
      tools, prompt, and pinned client—not an abstract model name
    - let an external machine referee decide the outcome
        - Lean: compile, kernel replay, frozen-declaration comparison, axiom audit
        - Verus: screen and AST/count guards, then verifier acceptance
        - software: withheld tests run outside the agent workspace
    - fix the comparison before the run
        - committed population and seed
        - byte-pinned arms and checker
        - registered predictions, adverse outcomes, reading, and stop rules
        - later changes are dated amendments rather than silent edits
    - measure isolation rather than asserting it
        - probe network, ground-truth, harness, credential, symlink, and compile
          paths before scored runs
        - test the same access layer the agent uses; a subprocess sandbox does
          not constrain a file-read tool implemented in the parent harness

- first systems measurement
    - population: five authored Rust components—Crc32, FreeList, LRU, LZW,
      and Paxos—under a pinned Verus toolchain and withheld test suites
    - design: plain versus a dieted specify-and-verify instruction, crossed with
      no supplied statement versus an a priori formal statement
    - bare-arm cost result
        - the dieted treatment cost more on all five components in both declared-set
          readings; registered one-sided sign test: 5/5, $p=0.0312$
            - Reading B uses three runs per condition from this run
            - Reading A also includes three borrowed smoke cells, leaving three
              plain-arm conditions at $n=4$ and moving three observed premiums
        - do not turn this into a population cost multiplier
            - three of five premiums are below the registered resolvable floor
              of $2.0072\times$
            - within-condition spread exceeds the smallest premium
            - the paper licenses the sign, not a ratio, range, or percentage
    - supplied-statement pair
        - 3/4 premiums above parity, $p=0.3125$; every premium is below the
          resolvable floor
        - no verdict; with $k=4$, even a clean sweep could reach only $p=0.0625$
    - correctness
        - the original matrix priced cells without invoking their withheld-suite
          referee, so the registered result is about cost only
        - a declared post-hoc pass did not separate the arms
        - every budget-capped bare-arm cell was a treatment cell; analyzing only
          survivors makes the treatment sample easier by construction

- strongest transferable instrument lessons
    - a verifier receipt is evidence only for the exact statement, toolchain,
      policy, and artifact it binds
    - a benchmark gate can manufacture an apparent treatment loss when the gate
      disproportionately rejects behavior encouraged by the treatment, such as
      helper lemmas
    - a positive control proves an instrument works on the population it can
      see; it does not prove that the population is complete
    - a scoreboard can be arithmetically right while hiding dataset structure
        - borrowed cells from other roots
        - missing correctness verdicts
        - multiple run accounts or cache regimes
        - a condition key that omits a new experimental dimension
    - pin executable paths, not moving shell aliases or symlinks
    - record budget stops as halts, not failures
        - also treat the cap as a sampling instrument because it can remove the
          hardest treatment cases from later analyses
    - enforce controls where the verdict is written
        - a registered rule without a checked result-path implementation is prose
    - absence claims must name the enumerated population and carry controls at
      the same layer as the claimed fence

- caveats that must travel with any citation
    - the five systems tasks and their test/mutant sets were authored under the
      paper author's direction, so independence is limited
    - the tested treatment is explicitly a reduced, dieted rendering of Salt,
      not the full organizational method
    - sample sizes are small and the one-sided test cannot significantly support
      the opposite direction
    - the capability question remains open: prior Lean arms were tied and partly
      limited by loose or inconsistent oracles; the Verus hard band approached a
      ceiling at the stronger tier; the systems post-hoc pass did not separate arms
