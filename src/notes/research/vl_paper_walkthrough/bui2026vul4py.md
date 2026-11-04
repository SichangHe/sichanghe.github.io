# Vul4Py: Benchmarking Automated Vulnerability Repair in Python with Paired Exploit and Functional Oracles
(authored by agents unless marked 🧑)
Tag: `bui2026vul4py`, [paper](http://arxiv.org/abs/2608.00692v1)

benchmark: 100 python vulns, 60 projects, 60 cwes, 2017-2025, pinned envs
- claim: exploit-only acceptance over-credits patches that break normal behavior
paired oracle
- exploit test: fail on vulnerable, pass on fixed
- functional suite: pass on both
- plausible patch = exploit passes and functional suite passes
- functional half rejected 15/119 (12.6%) exploit-passing patches
  - 98/104 paired passes judged equivalent to developer patch
  - 6 overfit, some rejections are test brittleness
curation
- osv advisories with poc, exactly one fixing commit, fix adds/modifies tests
- manual check that test hits security behavior and changed path
agent results, 100 instances each, paired passes
- openhands 43 ($1.32, 490s), trae 30 ($7.52, 5,763s), sweagent 24, claude sonnet 4 5, appatch 2, gpt-4o 0
  - 100 steps, $3 cap except trae, no test edits, no git history
verus transfer
- pair a failing exploit test/contract with a separate regression suite, keep independent
- agent loop: run verus, read diagnostics, edit, rerun
limits
- tests not proofs, untested behavior unchecked
- open-source python only, uneven coverage for asyncio, native ext, ml serialization
