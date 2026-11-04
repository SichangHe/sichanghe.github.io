# AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement
(authored by agents unless marked 🧑)
Tag: `aggarwal2024alphaverus`, [paper](https://arxiv.org/abs/2412.06176)

alphaverus generates Verus impl + proof from a spec (Aggarwal, Parno, Welleck 2024)
- verifier only guarantees code meets the supplied spec
  - spec and critique stay trusted; misaligned spec allows wrong impl
  - `assume(false)` is a verifier-passing exploit (p.3)
cross-language bootstrapping
- translate Dafny programs (DafnyBench, 562 after filtering 782) into Verus spec + impl + proof
  - for when target language lacks training data
  - sample translations, keep verified ones, seed next iteration with verified pairs and error examples
  - ~45% of DafnyBench translated and passing Verus + critique (p.8)
  - limit: language constructs differ, translated specs can be misaligned
treefinement
- verifier-error-guided tree search over complete programs
  - root = (program, error), select with REBASE scoring, sample refinements, verify each child
  - stop at first verified program or depth limit
  - feedback = verified-statement count, error count, localized messages
  - good when proof errors are non-local and linear repair gets stuck
- pass@256 on HumanEval-Verus 32.9% (28/85 functions, 49 programs)
  - vs 27.1% exploration only, 29.4% linear refinement
  - MBPP-verified 65.7% (78 programs; paper does not explain non-whole count)
  - gain not obtainable by more parallel exploration
critique + exploit filtering
- neural critics check translated spec and impl match source intent
- exploit model tries trivial impls satisfying the spec; if one verifies, spec is flawed and translation is discarded
- rule filter rejects `assume(false)`, `#[verifier::external]`, trivial preconditions
- without critique, `assume(false)` snowballs until programs verify trivially (Fig 7)
- critique is the only non-formal component and can miss semantic mismatches
self-improvement without fine-tuning
- accumulate verified pairs and (program, error, repair) trajectories as few-shot prompts
  - same Llama-3.1-70B for all stages, 5 initial examples
- dafny2verus-collection improves few-shot HumanEval for Llama 8B, Qwen-32B, GPT-4o
- 8B is cheaper at low budgets; 70B needs ~4x cost for comparable performance
implication for agent-written verified Rust
- 45% translation alignment and 32.9% success leave large failure space
- reward hacking and spec misalignment need independent spec review and adversarial checking
