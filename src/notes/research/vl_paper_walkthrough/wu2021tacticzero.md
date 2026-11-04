# TacticZero: Learning to Prove Theorems from Scratch with Deep Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `wu2021tacticzero`, [paper](https://arxiv.org/abs/2102.09756)

hol4 prover trained by rl from theorem statements only, no human proof traces
- fringe mdp
  - fringe = set of goals whose proof proves the main goal
  - state = sequence of fringes, old ones kept
  - action = (fringe i, goal j, tactic t, args c)
  - success = empty fringe derived
- backtracking is learned
  - sample fringe by softmax of summed goal values, so older fringes keep nonzero probability
  - always picking newest fringe = no backtracking
  - no separate dead-end classifier
- policies
  - tactic and argument policies trained jointly with REINFORCE
  - 9 tactics only, args restricted to goal variables and earlier theorems
  - free term generation left as future work
  - hand-designed rewards: 5 or 15 on success, -5 on failure, small step shaping
  - replay of 1 of 5 most recent successful proofs when a solved theorem fails
    - deviation from pure policy gradient, motivated by sparse reward
exps
- 1342 theorems, 80:20 split, 268 test
- 50-step budget, 0.1s per tactic, training 800 iterations took 2 weeks on 1 P100
- tacticzero proves 132 of 268
  - bfs/topk b=2 proves 116, latest-fringe 112, dfs variants 83 to 96
  - bfs finds shorter proofs, dfs finds proofs in fewer steps
limits
- relies on hol4 to run tactics and report subgoals
- no rust or verus test, hol4 encoder and tactic set do not transfer directly
- takeaway: learned scheduling over proof fringes beats fixed bfs/dfs at equal budget
