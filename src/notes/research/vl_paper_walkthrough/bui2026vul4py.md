# Vul4Py: Benchmarking Automated Vulnerability Repair in Python with Paired Exploit and Functional Oracles
(authored by agents unless marked 🧑)
Tag: `bui2026vul4py`, [paper](http://arxiv.org/abs/2608.00692v1)

Vul4Py is a benchmark and curation method for executable vulnerability-repair evaluation. The paper's central claim is that exploit-only acceptance over-credits patches that suppress an exploit while breaking ordinary behavior. Its unit is one real vulnerability with a vulnerable revision, developer-fixed revision, exploit pytest, functional pytest, pinned environment, and recorded commands. The benchmark contains 100 vulnerabilities from 60 projects, 60 distinct CWEs, and 2017–2025 (Abstract, p. 1; Section 3.6, pp. 7–8). The paper says, “Vul4Py comprises 100 real vulnerabilities from 60 open-source projects, spanning 60 distinct CWEs and the years 2017 to 2025, each packaged with a pinned, reproducible per-instance environment.” (Abstract, p. 1)

## technique: paired exploit and functional oracles

what it is and when to use it

The exploit oracle must fail on the vulnerable revision and pass on the fixed revision. The functional oracle is the project-native non-security test suite and must pass on both revisions. Use this when a repair can make the security trigger disappear by deleting or damaging unrelated behavior. The paper states, “An instance is admitted only if its oracle is reproducible: the exploit test must fail on the vulnerable revision and pass on the fixed revision, while the functional test passes on both.” (Section 3.5, p. 7)

how to do it

1. Collect Python advisories from OSV that contain a proof-of-concept indicator or public exploit reference (Section 3.1, p. 6)
2. Retain an advisory only when references identify exactly one fixing GitHub commit (Section 3.2, p. 6)
3. Keep fixes that add or modify tests; treat the developer-added test as the candidate exploit oracle (Section 3.3, p. 6)
4. Manually check that test assertions exercise security behavior, the changed code path, and the OSV-described flaw; reject candidates failing any criterion (Section 3.4, p. 7)
5. Package vulnerable and fixed revisions in an isolated environment with pinned dependencies and commands in `meta.json` (Section 3.5, p. 7)
6. Replay both revisions and admit only the before/after behavior above (Section 3.5, p. 7)
7. Apply a generated patch to the vulnerable project and run the paired oracle; call the patch plausible only when the exploit test passes and the project functional suite keeps passing (Sections 4.2 and 4.3, pp. 10–11)

The benchmark's measurements make denominators explicit: 119 generated patches passed exploit tests, 104 passed both, and 98 of those 104 were manually judged semantically equivalent to the developer patch (Section 5.2, pp. 13–14). Thus the functional check removed 15/119 = 12.6%; the paper also reports 98/104 = 94% precision. The paper says, “We further show that the functional half of the oracle is not redundant: it rejects one in eight patches that an exploit-only oracle would have accepted.” (Introduction, Contributions, p. 4)

Verus form

Inference: For a Verus Rust benchmark, define an executable exploit test that violates the intended postcondition on the vulnerable implementation and succeeds on the repaired implementation, and a separate regression suite for ordinary behavior. Encode the security property as a `requires`/`ensures` contract or a proof lemma over a model; run `verus` for proof and Rust tests for behavior. Keep the two checks independent, pin the toolchain and dependencies, and record commands. Python pytest and OSV-specific packaging do not carry over; the paired acceptance principle does.

what is trusted and where it fails

Inference: the verifier trusts the test authorship, manual oracle review, test environment, and manual semantic comparison, and does not prove that untested behavior is preserved. The authors report six of the 104 paired-pass patches as over-fitted to the tests (they omit conditions the developer patch handles and the tests do not exercise), and note that the paired oracle can be too strict when a patch affects an unrelated functional test, so part of the drop reflects test brittleness (Section 5.2, pp. 13–14). The benchmark is limited to open-source Python, reproducible test-bearing fixes, and closed-weight models; the authors explicitly say coverage is uneven for asyncio internals, native extensions, and machine-learning serialization (Section 6.3, p. 15).

## technique: execution-driven repair loop

what it is and when to use it

The evaluated agents receive a complete project workspace, CVE and changed-line hints, build/validation commands, and a bounded action budget. They inspect and edit source, run commands, observe failures, and revise; tests cannot be modified and git history cannot be used (Section 4.2, pp. 10–11). Direct prompting instead emits one unified diff from shown files. The paper says, “Agents are instructed to produce a minimal patch that a) applies cleanly, b) passes the project build and setup step, and c) passes the benchmark’s paired oracle.” (Section 4.2, p. 11)

how to do it

1. Provide workspace, CVE, non-test changed-file ranges, and commands (Section 4.2, p. 11)
2. Permit repository navigation, source edits, build/test execution, and up to 100 agent steps; cap cost at $3 except Trae Agent, which has no per-run cap (Section 4.2, p. 10)
3. Forbid test edits, alternative build systems, and `git log`/`git show` (Section 4.2, p. 11)
4. Stop at termination or budget exhaustion and evaluate only the final diff through the common patch/build/paired-oracle pipeline (Section 4.2, p. 11)

Table 2's denominator is 100 vulnerabilities per approach: OpenHands 51 security passes, 43 paired passes, 41 correct; Trae Agent 33/30/29; SWE-agent 27/24/22; Claude Sonnet 4 5/5/4; APPATCH 3/2/2; GPT-4o 0/0/0 (Table 2, p. 12). OpenHands averaged $1.32 and 490 seconds per instance; Trae averaged $7.52 and 5,763 seconds, exceeding the $3 cap (Table 2, p. 12).

Verus form

Inference: A Verus agent can iterate on Rust code and proof obligations: run `cargo verus`, inspect verifier diagnostics, edit contracts and proofs, then rerun. A final candidate should pass both Verus verification and regression tests. `proof fn` calls are compile-time proof steps, not runtime actions; runtime harnesses must call executable Rust functions. The paper's agent-step and dollar limits become iteration and compute budgets.

what was proved or measured, and product threat

The paper measures benchmark acceptance and manual semantic equivalence, not formal vulnerability absence. Inference: For VeruLaw, this is a strong evaluation harness for detecting regressions in agent-written verified Rust, but it does not replace Verus proofs: a paired test can miss an unmodeled input, while a valid proof can fail to encode the intended security property. The paper reports that the three agents repaired 22–41 of 100 vulnerabilities correctly, versus 4 for directly prompted Claude Sonnet 4, 2 for APPATCH and 0 for GPT-4o (Answer to RQ1, p. 13); the agents and the strongest non-agent share the Claude Sonnet 4 backbone. Inference: VL should reuse the separation of security and regression evidence, the pinned per-instance setup, and explicit denominators; it should not redo the benchmark's Python-specific OSV curation.

## techniques for the catalog

- paired oracle admission — require a security exploit check and a project regression suite, with before/after behavior verified before admitting an instance
- manual oracle validation — confirm test intent, changed-path coverage, and advisory alignment before treating a test as a security oracle
- execution-driven repair — let an agent inspect, edit, execute, and revise under fixed actions and cost, then score only its final patch
- denominator-aware patch scoring — report exploit passes, paired passes, and manually confirmed correctness separately for every 100-instance run
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We select these frameworks because they are widely used, end-to-end executable on real repositories, and they cover different agent designs."): read the whole paper text and the whole study; checked every quotation, number (Table 2 rows, 119/104/98/15/6, 12.6%, 94%, step and cost limits), section and page reference, and the seven curation steps and four repair-loop steps; the arXiv id 2608.00692v1 in the paper header matches the link. Changed: the exploit-then-functional run order in step 7 (not stated in the paper), the Introduction quote (was missing its lead-in words), the Abstract page reference, the page range for the over-fitting and brittleness remarks (pp. 13–14), the same-backbone claim (GPT-4o is a different model), and the label on the trust and VL conclusions as Inference. Not checked: the PDF figures, the references list, and the released benchmark itself.
