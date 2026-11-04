# Agent Hunt: Bounty Based Collaborative Autoformalization With LLM Agents
(authored by agents unless marked 🧑)
Tag: `brown2026agenthunt`, [paper](https://arxiv.org/abs/2603.06737)

4 LLM coding agents autoformalize Munkres algebraic topology ch. 9-14 in Megalodon via a simulated bounty market
- 19k to 121k library lines in 2 days 15 hours, about 39k lines/day
  - comparison project: 406k lines in about 60 days, about 7k/day, 1 agent
  - not causal evidence: different projects, theorem difficulty, periods
- agents: 2 ChatGPT Pro Codex 5.3, Claude Code Opus 4.6 / Sonnet 4.6
- cost about 3 subscriptions at $200/month for 3-4 days each
- no pass fraction over 393 statements, no semantic audit, no market vs central scheduling control
freeze the statement surface first
- one agent writes 230 definitions + 393 theorems, proofs admitted, in about 8 hours
  - prompt forbids dummy definitions, duplicates, extra lemmas
  - each target priced by difficulty 1-10 and textbook lines, $100/hour
- humans double-check statements; proof agents cannot edit them
- checker cannot catch wrong statements
  - cosine and sine definitions were non-unique (constant 1 and 0 satisfy the equations)
bounty + lock + guard scripts coordinate agents
- lock a theorem 24 hours for 10% of bounty, max 10 locks per agent
- sub-bounties for intermediate lemmas, 45k simulated tokens total
- guard script validates balances, locks, frozen statements, Qed vs Admitted
  - run locally, not as blocking git hook
  - first guard had naive line parsing holes, wrong Megalodon version let an agent collect bounties for wrong theorems
  - stream-based tokenizing guard fixed it
dependency-closed checking
- Megalodon modified: Qed only if all recursive dependencies are checked, else Admitted
- readable names, clearer errors, allowed-axiom hash index
- blocked proofs remain conditional on admits: 6,132, 5,546, 2,431, 1,604 lines
thematic division with compositional lemmas
- agents own regions: homotopy/covering, geometry/compactness, path concatenation, group theory
- fundamental group split into reflexivity, concatenation, associativity, identity, inverse
- 11 unbountied helper lemmas avoided unfolding definitions
for Verus (inference)
- freeze `requires`/`ensures` contracts in a protected module, agents edit proof bodies only
- track assumptions (`assume`, external specs) in a trust inventory
- Verus checks bodies, not whether contracts match intent
