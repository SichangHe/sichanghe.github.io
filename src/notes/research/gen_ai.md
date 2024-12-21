# Generative AI (GenAI)

## AI-generated text detector

- perplexity: likelihood of sequence of text according to
    specific language model
- bilingual evaluation understudy (BLEU): quality of
    machine translation compared to human translation

commercial:

- [Originality.ai](https://originality.ai/): proprietary paid detector,
    prover (that text is not generated), and fact checker
    - \$1 per 1000 word
- [GPTZero](https://gptzero.me/): \$8.4 per month for 150,000 word
    (\$1 per 18,000 word)
    - ❓ claim to offer free API for researcher
    - [list of paper using GPTZero](https://gptzero.me/technology)
    - [Detecting AI-Generated Writing Using
        GPTZero](https://iscap.us/proceedings/2024/pdf/6184.pdf),
        Karen Paullet, Jamie Pinchot, Evan Kinney, Tyler Stewart, ISCAP, 2024
        - claim to be highly accurate, but paper seem not robust

paper:

- [Towards Possibilities & Impossibilities of AI-generated Text Detection:
    A Survey](https://arxiv.org/pdf/2310.15264), Soumya Suvra Ghosal,
    Souradip Chakraborty, Jonas Geiping, Furong Huang, Dinesh Manocha,
    Amrit Singh Bedi, arXiv, 2023
    - statistical method: entropy, perplexity, n-gram frequency
    - detecting all model said to be impossible
    - watermark discussion
- [RAID: A Shared Benchmark for Robust Evaluation of
    Machine-Generated Text Detectors](https://arxiv.org/abs/2405.07940),
    Liam Dugan, Alyssa Hwang, Filip Trhlik, Josh Magnus Ludan, Andrew Zhu,
    Hainiu Xu, Daphne Ippolito, Chris Callison-Burch, ACL, 2024
    - [RAID Benchmark Leaderboard](https://raid-bench.xyz/leaderboard):
        list of tested commercial and free detector
        - 💡 can use binoculars
    - domain matter: what type of text
        - 💡 need to limit domain to validate
    - repetitiveness higher for generated text: Self-BLEU
        - 💡 we could check for repetitiveness instead of generation
    - detector type: ML more robust than metric-based
    - high false positive rate; power function of accuracy
    - not robust to adversarial attack like repetition penalty
- [Texygen: A Benchmarking Platform for
    Text Generation Models](https://arxiv.org/abs/1802.01886), Yaoming Zhu,
    Sidi Lu, Lei Zheng, Jiaxian Guo, Weinan Zhang, Jun Wang, Yong Yu,
    ACM SIGIR, 2018
    - propose Self-BLEU for repetitiveness
- [Spotting LLMs With Binoculars: Zero-Shot Detection of
    Machine-Generated Text](https://arxiv.org/abs/2401.12070), Abhimanyu Hans,
    Avi Schwarzschild, Valeriia Cherepanova, Hamid Kazemi, Aniruddha Saha,
    Micah Goldblum, Jonas Geiping, Tom Goldstein, ICML, 2024
    - model-agnostic
    - perplexity / cross-perplexity after "performer" model generation
    - dedicated prompt can boost perplexity of generation when
        observed w/o the prompt
    - ❗ use Falcon-7B by default—need big GPU (16GB vRAM) and
        slow ~~(7s per input on A100)~~
        - quantization can lower to 6GB, <100ms prefill/autoregression

## Issues from AI-generated text

- bot account on social media
- fake product review
- academic plagiarism
    - peer review validity

paper on AI-generated text:

- [Monitoring AI-Modified Content at Scale: A Case Study on the Impact of
    ChatGPT on AI Conference Peer Reviews](https://arxiv.org/abs/2403.07183),
    Weixin Liang, Zachary Izzo, Yaohui Zhang, Haley Lepp, Hancheng Cao,
    Xuandong Zhao, Lingjiao Chen, Haotian Ye, Sheng Liu, Zhi Huang,
    Daniel A. McFarland, James Y. Zou, ICML, 2024;
    [Mapping the Increasing Use of LLMs in
    Scientific Papers](https://arxiv.org/abs/2404.01268), Weixin Liang,
    Yaohui Zhang, Zhengxuan Wu, Haley Lepp, Wenlong Ji, Xuandong Zhao,
    Hancheng Cao, Sheng Liu, Siyu He, Zhi Huang, Diyi Yang, Christopher Potts,
    Christopher D Manning, James Y. Zou, arXiv, 2024
    - efficient statistical batch detection
    - review w/ generation seem rushed
- [The Rise of AI-Generated Content in
    Wikipedia](https://arxiv.org/abs/2410.08044), Creston Brooks,
    Samuel Eggert, Denis Peskoff, arXiv, 2024
    - use GPTZero & Binoculars w/ Falcon-7B
    - Wikipedia article before & after GPT-3.5
    - get lower bound of generation by subtracting previous positive rate
    - people likely believe repeated statement
- [The AI Review Lottery:
    Widespread AI-Assisted Peer Reviews Boost Paper Scores and
    Acceptance Rates](https://arxiv.org/abs/2405.02150), Giuseppe Russo Latona,
    Manoel Horta Ribeiro, Tim R. Davidson, Veniamin Veselovsky, Robert West,
    arXiv, 2024
    - \> 16% of 28,000 ICLR 2024 review used AI, w/ higher score
        - threat to peer review process
    - use GPTZero
    - 30 word that predict generation by ~70% accuracy
        - can such word use for screening

news:

- [Some of
    Substack’s Biggest Newsletters Rely On AI Writing Tools |
    WIRED](https://www.wired.com/story/substacks-writers-use-ai-chatgpt/)
    - 10% of 25 Substack sample seem generated, even by prominent author
        - GPTZero paid to view article
        - ❗ really small sample size
    - some author claim to use LLM to polish not create
    - predict that badge asserting human-made will be common
- [AI Slop Is Flooding Medium |
    WIRED](https://www.wired.com/story/ai-generated-medium-posts-content-moderation/)
    - 40% of $2.7 × 10^5$ post seem generated
        - done by Pangram & Originality separately
        - ❓ how do we compete w/ company
    - ∃ misinformation tracking company, e.g.
        NewsGuard, that scan for generated text
    - Medium CEO claim most generated post was hardly being read
        - argue generated post are bad writing
    - mention of YouTube get-rich-quick tutorial on generating post/book
