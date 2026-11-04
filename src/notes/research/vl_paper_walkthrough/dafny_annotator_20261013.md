# dafny-annotator: AI-Assisted Verification of Dafny Programs
(authored by agents unless marked 🧑)
Tag: `poesia2024dafnyannotator`, [paper](https://arxiv.org/abs/2411.15143)

small llm + greedy search + synthetic data lifts Llama 3.1 8B from 15.7% to 50.6% on 83 DafnyBench programs
- code and contract fixed, so spec is trusted; dafny verifier is the only soundness boundary
- llm only affects how often a proof is found
- annotations = assertion, loop invariant, `decreases`; no helper lemmas generated
location-free proposal with exhaustive insertion
- llm emits only annotation text, K candidates, no line number
- harness tries each candidate at every syntactically valid site in parallel, keeps first one dafny accepts
  - accepted = the annotation itself verifies, even if postcondition still fails (sec 2.3 rule; inference that search uses it)
- repeat up to 5 iterations, stop when postcondition proves; 30 cores
- no ablation vs llm-chosen location or whole-proof generation
- weaknesses
  - greedy, no backtracking: mutually dependent invariants not found
  - true-but-irrelevant annotations eat iterations
- verus transfer (inference)
  - map to `invariant`, `assert`, `decreases`; accept if no error points at new annotation
  - cannot reach multi-line `proof fn` or `assert ... by`
  - needs overflow bounds and `#[trigger]`
training pairs by peeling annotations
- remove last annotation of a verified program, emit (program without it, annotation), repeat
- loss masked on prompt, only annotation tokens trained
- LoRA r=α=128, 1500 steps, 1 A100
- limits: fixed removal order, no placement signal, redundant human annotations become targets
DafnySynth: edit graph of synthetic programs
- nodes root/idea/program; editors: idea proposer, implementer, annotator, change proposer
- keep rule: keep program if its annotations verify, even if contract does not
  - inference: strict rule would keep only 46 of 699
- gpt-4o, $10: 699 programs (46 fully verified), 1107 annotations (678 inv, 281 assert, 148 decreases)
- verus transfer (inference): reject `assume`/`external_body`, store verifier output per node
- paper concedes limited novelty; many programs derived from each other
results (83 test programs, 1 run, no variance)
- Llama 3.1 8B: base 15.7%, DB-only 15.7/20.5/15.7% (25/50/100%), DafnySynth only 27.7%, DB100%+Synth 50.6%
- CodeLlama 7B: base 6.0%, DB-only 20.5/28.9/39.8%, Synth only 20.5%, DB100%+Synth 39.8% (no gain)
- 1 program = 1.2 points, so few-point gaps are noise
- code pre-training did not clearly help (paper's claim; inference: models differ in generation and size)
inconsistencies in paper
- intro says 50.7% and 20.5% fine-tune gain; table says 50.6%, and 20.5% is only the 50% subsample
- test set: only 83 of 326 held-out methods fail without annotations
  - 243 need no hints, so rates are not comparable with all-item rates
