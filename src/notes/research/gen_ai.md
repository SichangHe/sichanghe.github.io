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
    - ❗ use Falcon-7B by default—need big GPU (16GB vRAM) and slow
        (7s per input on A100)

## Issues from AI-generated text

- bot account on social media
- fake product review
- academic plagiarism

paper on AI-generated text:

- [The Rise of AI-Generated Content in
    Wikipedia](https://arxiv.org/abs/2410.08044), Creston Brooks,
    Samuel Eggert, Denis Peskoff, arXiv, 2024
    - use GPTZero & Binoculars w/ Falcon-7B
    - Wikipedia article before & after GPT-3.5
    - get lower bound of generation by subtracting previous positive rate
    - people likely believe repeated statement
