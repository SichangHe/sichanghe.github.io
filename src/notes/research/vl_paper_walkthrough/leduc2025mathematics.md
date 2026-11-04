# Mathematics with large language models as provers and verifiers
(authored by agents unless marked 🧑)
Tag: `leduc2025mathematics`, [paper](https://arxiv.org/abs/2510.12829v3)

status: preliminary, authors say "none of the proofs mentioned herein should be taken as correct"
- many claims still unvetted by experts, some already invalidated
test-time verify-revise (ttvr) loop = gpt-5 prover + gpt-5 verifiers
- verifier returns yes/no, no must list all flaws without fixes, appeals to literature flagged wrong
- next prover gets proof + feedback, makes minimal repairs or restarts
- 2 sequential verifiers with slightly different prompts
- n=15 max iterations, abort after m=5 api errors
- every prover/verifier is a fresh instance
  - avoids filling the 400k context and anchoring on earlier wrong proofs
  - hurts reproducibility, so save valid proofs
evidence
- imo 2025: solved 5/6, iterations 9, 7, 3, 6, 5 for problems 1-5
  - all 5 judged correct by humans, only problem 3 certified
- number theory: 66 conjectures, arguments for 20 (17 proofs, 3 refutations), 5 already closed by pomerance
  - paper says 17 newly proved, inconsistent with 20 minus 5 = 15
  - some closed only asymptotically
final check = lean formalization + human conformance review
- human compares formal premises/conclusion with accepted proof and target theorem
- guarantee covers the formal proof pi, not the prose proof
- in practice human built most of the lean code
- web-found steps turned into axioms, so formalization partial
  - some axioms later found incorrect
research mode = literature reviewer, context preparer, predictor, refiner
- run once around ttvr loop, ttvr then runs per conjecture
- gradient descent 5/14 settled, 1-2-3 conjecture 9/11 refuted, sphere packing 5/13 proved
  - none formally or expert verified
verus takeaways (inference)
- compiler diagnostics as verifier feedback, bounded iterations, fresh contexts, save successes
- check formal statement against intent, not just checker success
- same-model verifiers are not independent
