# TLA-Prover source and evaluation audit
(authored by agents unless marked 🧑)

finding

- inference: useful experiment in verifier-guided model training
    - reported success means checking a small generated model against its own invariant
    - success does not establish agreement with a human requirement or actual system
- checked public artifact differs materially from the paper's description
    - preserve paper claims and repository observations separately
    - the reported 9/30 result was not reproduced in this audit

paper

- TLA-Prover: Verifiable TLA+ Specification Synthesis via Preference-Optimized Low-Rank Adaptation
    - Eric Spencer, Arslan Bisharat, Brian Ortiz, Khushboo Bhadauria, Mujtaba Nazari, TaiNing Wang, George K. Thiruvathukal, Konstantin Läufer, Mohammed Abuhamad
    - arXiv 2026, version 5 dated 1 August
    - [full paper](https://arxiv.org/abs/2606.06133v5)
    - supervised training followed by learning from repairs of rejected specifications
    - uses gpt-oss-20b with a small trainable adapter
    - original: “9/30 (i.e. pass@1= 30%)”
        - authors, abstract, PDF p. 1
- what was checked
    - finite configurations usually use three processes
        - authors, TLC configuration, PDF p. 5
    - TLC has a 60-second budget
        - same paragraph
    - single greedy output per problem for the headline score
    - train and test module names are disjoint
        - authors, evaluation-set selection, PDF p. 4
    - inference: different module names do not establish separation by algorithm or template
- what the highest score means
    - Diamond means Gold plus sensitivity to an invariant mutation
        - authors, Diamond definition, PDF p. 3
    - paper describes randomly choosing an invariant mutation
        - negate a conjunct, flip a relation, or substitute a constant
        - TLC must find a failure after the mutation
    - original: “Diamond-tier mutation testing blocks tautology-style reward hacks but does not catch subtler failure modes”
        - authors, limitations, PDF p. 9
    - inference: a sensitive invariant can still omit the intended guarantee
    - original: “not verified designs”
        - authors, guidance on generated first drafts, PDF p. 9
    - no implementation refinement proof or general liveness proof reported
- result denominators
    - Table 3 lists ten domains with three problems each
        - communication, concurrency, consensus, data structures, memory/caches
        - mutual exclusion, puzzles, scheduling, transactions, workflows
    - paper text says six domains
        - Table 3 contradicts that statement
    - Table 5 reports 9/30 greedy, 11/30 best-of-eight, and 13/30 union
        - retries and union are separate outcomes
    - baseline uses 25 models on 26 specifications
        - 650 runs per reported cell
        - not the same 30-problem evaluation
    - inference: the reported ratio against the 8.6% baseline is not a matched comparison

artifact observations

- [public repository](https://github.com/LUC-AI4FM/TLA-Prove/tree/6427de950cea25a3a2bb681314e6eb02be3ce33d)
    - inspected commit 6427de950cea25a3a2bb681314e6eb02be3ce33d on 7 October 2026
    - cloned to /ssd1/sichangheagent/verus_distributed/lit_b/repos/TLA-Prove
- two different case lists
    - data/processed/diamond_eval_holdout.jsonl has 30 rows
        - three rows from each of ten domains
        - matches the paper's domain counts
    - data/benchmarks/benchmark_suite.json has 20 rows
        - README calls this file a 30-case suite
        - includes mutual exclusion, two-phase commit, Raft election, Paxos, snapshot isolation, CRDT counter
        - do not count these 20 as the same holdout
- README and paper use different inference descriptions
    - original: “up to 3 self-correction attempts via TLC feedback”
        - repository README benchmark paragraph
    - paper headline uses single greedy output without correction
        - paper §3, PDF p. 5
- saved result is not the paper's result
    - outputs/eval/holdout_v15.json reports n=30 and diamond=1
        - diamond_rate=0.033
        - three Gold outputs
        - retrieval enabled with rag_k=2
        - self_correct=false and max_retries=0
    - inference: this could be a different checkpoint or configuration
        - cannot infer that it refutes the paper
        - cannot use it to reproduce 9/30 either
- mutation implementation differs from the paper
    - [validator source](https://github.com/LUC-AI4FM/TLA-Prove/blob/6427de950cea25a3a2bb681314e6eb02be3ce33d/src/validators/tlc_validator.py#L460)
    - first removes invariants and changes SPECIFICATION to INIT/NEXT
        - any resulting reported failure can pass the mutation check
    - then negates an invariant using line-based text replacement
        - not the described random choice of three AST mutations
    - original code: `return bool(violations) or not success`
        - _run_mutation, source line 553
        - accepts a reported failure other than an actual invariant counterexample
    - original code: `distinct_states > 1`
        - is_diamond, source line 91
        - requires more than one state
    - original: “partial coverage”
        - is_diamond documentation, source lines 87–88
        - does not require all declared actions to occur
- direct probe
    - tested the checked validator with a two-state toggle
        - x starts at zero and alternates between zero and one
        - TypeOK says x belongs to {0,1}
        - no distributed behavior or user requirement
    - validator returned Gold and is_diamond=true
        - two distinct states and mutation_caught=true
    - inference: this demonstrates that Diamond alone does not check task fidelity
        - does not demonstrate tautology acceptance
        - no trained model was run
    - exact input and result saved in lit_b/research_verified/agent_eval/tla_prover_irrelevant_probe.json

meaning for evaluation

- inference: mutate requirements and implementations separately
    - require an actual property violation rather than any checker failure
    - evaluate whether generated actions represent the intended protocol
    - do not let state-type invariants stand in for agreement, exclusion, or eventual progress
- inference: pin the grader, checkpoint, decoding, configuration, and task list
    - saved public results and current README need reconciliation before using headline scores
- inference: review contract strength independently of checker acceptance
    - the paper acknowledges meaningful-looking invariants can miss interesting behavior

coverage and saved material

- one new PDF saved in the paper collection
    - title begins TLA-Prover, authors Eric Spencer, Arslan Bisharat, Brian Ortiz, et al., arXiv, 2026
    - paper.pdf and source-provenance.md
- full ten-page paper read
    - source text: lit_b/research_verified/agent_eval/2606.06133.txt
- public README, holdout cases, result files, and validator inspected
    - training and inference not rerun
    - model weights not audited
- Bisharat's Can LLMs Write Correct TLA+ Specifications already covered
    - arXiv 2606.05792
    - entry 16 in review_b_agents_20261007.md
    - no duplicate paper or PDF added
