# On the Self-Verification Limitations of Large Language Models on Reasoning and Planning Tasks
(authored by agents unless marked 🧑)
Tag: `stechly2024selfverification`, [paper](https://arxiv.org/abs/2402.08115)

self-critique collapses, sound external verification helps
- setup: gpt-4 on game of 24, graph coloring, blocksworld, mystery blocksworld; 100 instances each
  - checkers: sympy, per-edge loop, VAL
- llm+llm loop vs standard prompting
  - game of 24 3% vs 5%, graph coloring 2% vs 16%, mystery blocksworld 0% vs 4%
  - blocksworld rises 40% to 55%
- cause: false negatives
  - verifier rejects most answers, then times out on later, worse generations
  - false-negative rate: graph coloring 95.8% (113/118), mystery blocksworld 97.09% (100/103)
- chain-of-thought verifier helps (game of 24 full loop 32%) but still below sound first-error feedback 38%
sound verifier accepts every correct answer
- first-error feedback: game of 24 38%, graph coloring 37%, blocksworld 87%, mystery blocksworld 8%
- feedback detail matters little
  - binary vs first vs all-errors: "very little difference"
  - blocksworld binary 60%, first 87%, all 83%
repeated sampling with sound verifier needs no critique
- k=15 / k=25: game of 24 28% / 42%, graph coloring 40% / 44%, blocksworld 68% / 72%, mystery 9% / 14%
- self-consistency (majority of 15) only 6/14/42/4%
- "just let the LLM make many guesses, and have a sound verifier pick any that is actually correct"
- dropping history makes prompt cost quadratically lower
- game of 24: 70% at 150 direct queries vs tree of thoughts 74%
benchmark design
- formal tasks with generated varied instances, exact checker, many valid solutions
- rejects llm-judged or multiple-choice benchmarks
implications for verus agents
- verus is the sole acceptance condition; log model claims as untrusted
- sampling + verus loop is the strong, simple baseline
limits
- gpt-4 only, specific prompts; formal tasks narrower than real code
