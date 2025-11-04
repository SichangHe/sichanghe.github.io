# Advanced Natural Language Processing

- natural language hard because ambiguity
- breakdown of language: phonetics (sound) → phonology
    (meaningfully distinct sound)/ orthography (character)
    - → morphology → lexeme (word)
    - → syntax (grammar) → semantics (meaning) → pragmatics (context)
        → discourse (relation between sentences)

- current model suck when samples are long and few
- overwhelmingly obey Zipf's law

## [Introduction to Natural Language Processing](https://github.com/jacobeisenstein/gt-nlp-class/blob/master/notes/eisenstein-nlp-notes.pdf), Jacob Eisenstein, The MIT Press, 2018

## Speech and Language Processing: An Introduction to Natural Language Processing, Computational Linguistics, and Speech Recognition, with Language Models, Daniel Jurafsky, James H. Martin, 2025

## [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202), Noam Shazeer, arXiv, 2020

- SwiGLU

## [GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints](https://arxiv.org/abs/2305.13245), Joshua Ainslie, James Lee-Thorp, Michiel de Jong, Yury Zemlyanskiy, Federico Lebrón, Sumit Sanghai, EMNLP, 2023

## paper to present

- [Learning to Rewrite:
    Generalized LLM-Generated Text
    Detection](https://aclanthology.org/2025.acl-long.322/), Wei Hao, Ran Li,
    Weiliang Zhao, Junfeng Yang, Chengzhi Mao, ACL, 2025
- [MultiSocial: Multilingual Benchmark of Machine-Generated Text Detection of
    Social-Media Texts](https://aclanthology.org/2025.acl-long.36/),
    Dominik Macko, Jakub Kopál, Robert Moro, Ivan Srba, ACL, 2025
- [MIND: A Multi-agent Framework for
    Zero-shot Harmful Meme
    Detection](https://aclanthology.org/2025.acl-long.46/), Ziyan Liu,
    Chunxiao Fan, Haoran Lou, Yuexin Wu, Kaiwei Deng, ACL, 2025
- [UTBoost: Rigorous Evaluation of Coding Agents on
    SWE-Bench](https://aclanthology.org/2025.acl-long.189/), Boxi Yu,
    Yuxuan Zhu, Pinjia He, Daniel Kang, ACL, 2025
- [CompileAgent: Automated Real-World Repo-Level Compilation with
    Tool-Integrated LLM-based Agent
    System](https://aclanthology.org/2025.acl-long.103/), Li Hu, Guoqiang Chen,
    Xiuwei Shang, Shaoyin Cheng, Benlong Wu, LiGangyang LiGangyang, Xu Zhu,
    Weiming Zhang, Nenghai Yu, ACL, 2025

## replication project

- [Zero-Shot Detection of
    LLM-Generated Text using Token
    Cohesiveness](https://aclanthology.org/2024.emnlp-main.971/), Shixuan Ma,
    Quan Wang, EMNLP, 2024

## paper to question

- [Self-Instructed Derived Prompt Generation Meets In-Context Learning:
    Unlocking New Potential of
    Black-Box LLMs](https://aclanthology.org/2025.acl-long.92/), Zhuo Li,
    Yuhao Du, Jinpeng Hu, Xiang Wan, Anningzhe Gao, ACL, 2025
    - impact on context window?
    - what would long prompt do? like a revise request?
    - what about multi-turn?

## paper presentations

- What Happened in LLMs Layers when Trained for Fast vs.
    Slow Thinking: A Gradient Perspective
    - presented by Jinyi
    - fast&slow thinking: system 1&2, subconscious&conscious
    - for LLM: no chain-of-thought (CoT) vs CoT; different level of detail
    - probing & layer importance
        1. back propagation on different level of detail
        1. nuclear SVD of Q K V O of each layer's gradient
            - more detailed CoT ⇒ smoother gradient
        1. compare mean absolute difference (MAD) of each layer
        1. compare relative difference (RD)
    - instruction tuning does not enable better nonsense detection
- byte latent transformer (BLT): patches scale better than tokens
    - presented by Saba
    - LLM training is end-to-end except for tokenization
    - patching: dynamic group w/o fixed vocab
    - entropy patching: start new patch when next byte hard to predict
        - small byte-level autoregressive model to produce entropy
        - small byte-level encoder&decoder surrounding 1 large latent
            transformer in middle
        - use byte encoding plus hashed n-gram
            - not learned!
        - higher patch size ⇒ lower FLOP per accuracy gain
        - minor accuracy degradation
- HumT DumT: Measuring and controlling human-like language in LLMs
    - presented by Sadra
    - human-like tone (HumT): \~anthropomorphization;
        users usually prefer against (bc wordy, not to-the-point)
        - like flirty; overly descriptive?
    - DPO + HumT (DUMT): RL to lower HumT
        - little performance degradation
- Self-Instructed Derived Prompt Generation Meets In-Context Learning:
    Unlocking New Potential of Black-Box LLMs
    - presented by Feiyu
    - train rewriter (small model) to rewrite query, then feed new query to
        queried model (large), finally feed everything to query model again
        - use judge model for reward in training
    - higher token count & slower, in exchange for claimed performance
- LLMs know their vulnerabilities: Uncover Safety Gaps through
    Natural Distribution Shifts
    - presented by Narges
    - train attacker LLM to make victim LLM answer harmful question
- TreeRL: LLM Reinforcement Learning with On-Policy Tree Search
    - presented by Saeed
    - entropy tree (EPTree): RL w/ tree of action
        - branch out from high-entropy (uncertain) token
        - only fork once in the paper
    - slightly higher \#answers generated & pass rate per \#tokens generated
        - but unclear if better when allowing more \#tokens
    - forking appear relative location near uniform distro
- [Mega:
    Moving Average Equipped Gated
    Attention](https://openreview.net/forum?id=qNLe3iq2El), Xuezhe Ma,
    Chunting Zhou, Xiang Kong, Junxian He, Liangke Gui, Graham Neubig,
    Jonathan May, Luke Zettlemoyer, ICLR, 2023
    - guest lecture by Xuezhe
    - why: longer context practically mean smarter model
    - challenge: transformer is quadratic compute&space in context length
        - communication challenge; huge KV cache
        - attention fail in large context
    - chunk-wise attention: only attend to chunk instead of global
    - damped exponential moving average (EMA):
        EMA w/ relaxed coupled weight $y_t=\alphax_t+(1-\alpha\delta)y_{t-1}$
        - learned parameter
        - parallelize by precomputing flattened weight & FFT
        - theoretically unbounded context
            - practically, w/ chunking, perform worse than full attention
        - apply on layer input for Q K but not V
    - single-head gated attention: add reset gate to attention output
        - gated attention: multiple attention output w/ output of
            another transform from input
        - can reduce \#heads e.g. from 32 to 4 ⇒ computational efficiency
    - single Mega model perform well on various long-context task
- [Megalodon: Efficient LLM Pretraining and Inference with
    Unlimited Context Length](https://arxiv.org/abs/2404.08801), Xuezhe Ma,
    Xiaomeng Yang, Wenhan Xiong, Beidi Chen, Lili Yu, Hao Zhang, Jonathan May,
    Luke Zettlemoyer, Omer Levy, Chunting Zhou, NeurIPS 2024
    - better Mega
    - complex EMA:
        $y_t=\alphax_t+(1-\alpha\delta)(\cos\theta+i\sin\theta)y_{t-1}$
        - reason: diagonal matrix much more expressive in complex space
    - time-step normalization: auto-regressive group normalization
        - cumulative mean&variance; no reset per document in training
    - reduce communication bc only need last output instead of whole KV cache
    - Gecko: ongoing improvements to Megalodon
        - running mean&variance via constant decay
        - sliding chunk attention: less wasted compute than flash attention
        - adaptive working memory (online softmax)
- TokAlign: Efficient Vocabulary Adaptation via Token Alignment
    - presented by Daniel
    - problem: BPE & friends bias towards English, etc.
    - replace vocabulary of LLM w/o full retraining
    - injective map source tokenizer to target tokenizer via
        GloVe & alignment matrix
        - evaluate by BLEU-1 score of embedding, then
            recover corpus & eval w/ BERTScore
    - replace vocabulary, freeze LLM body, retrain embedding & LM head, then
        full fine-tune
- Turning Trash into Treasure: Accelerating Inference of
    Large Language Models with Token Recycling
    - presented by Ardy
    - token recycling for efficient decoding
    - speculative decoding: small model speculate multiple token, then
        large model verify in parallel
        - trash: non-verified speculative token, discarded
    - prebuild static possible token tree (unclear how to generalize)
    - concatenate all node in tree as LLM input, discard tokens in group
    - double speed than autoregressive decoding in benchmark
- TokenFormer: Rethinking Transformer Scaling with Tokenized Model Parameters
    - presented by Kiarash
    - wasteful to not reuse smaller model when training larger
    - pattention: cross attention w/ learnable parameter & modified softmax
        - can concatenate parameter matrix to increase
        - equivalent to 2-layer MLP w/ modified softmax as activation
    - replace Q K V O (FFN) layer all w/ pattention
    - much less computation power to train larger model w/ same performance
    - better benchmark score w/ same parameter count
- Guest presentation: Path finding: how the search space for
    creative tasks is navigated
    - presented by Tenghao
    - for writing /info gathering/ brainstorming task,
        search&reward space large
    - heuristic: constrained beam search:
        prefer more emotional intensive token
    - reward design: emotional intensive + perplexity
- Large Language Models Are Biased Because They Are Large Language Models
    - presented by Faith
    - model learn from biased data
    - RLHF does not fundamentally make LLM understand ethics
    - need linguists/philosophers & collab btw researcher/corporation
- Toward Automatic Discovery of a Canine Phonetic Alphabet
    - presented by Ruth-Ann
    - clean&split&transcribe YouTube dog bark into cognitive vocal unit
        - mutual filtering based on minimal pairs
        - merge w/ JS divergence
    - vision model to describe scene&movement & map to 10 category
    - better scenario classifier thru phonetic unit than MFCC & audio model
- Improving Factuality with Explicit Working Memory
    - presented by Tianwen
    - working memory for RAG: KV cache for retrieved doc
    - append memory after context in parallel w/ queue; weighted average of
        hidden vector ⇒ better retrieval
    - recall vs precision tradeoff
- Reinforced IR:
    A Self-Boosting Framework For Domain-Adapted Information Retrieval
    - presented by Nikunj
    - retriever + generator reinforce in a loop
- SHuBERT: Self-Supervised Sign Language Representation Learning via
    Multi-Stream Cluster Prediction
    - presented by Anzhe
    - K-means → language model
    - accuracy is SoTA but trash
- SpaRE: Enhancing Spatial Reasoning in Vision-Language Models with
    Synthetic Data
    - presented by Gonglin
    - little existing spatial reasoning data
    - data collection by cleaning
    - existing model cannot emulate others' perspective
    - match SoTA LLM w/ 2B model
- vision language model (VLM)
    - guest lecture by Xuezhe
    - non-generative
        - CLIP: pair image w/ description
        - VLM from pretrained LLM: LLaVA
    - generative distribution-based: model data distribution
        - closed-form analytic solution, but weak
        - deep learning estimation, but no order & propagate error ⇒ bad
        - exact density estimation: directly model joint distro
            - generative normalizing flow
            - but many layers bc invertible function weak
            - determinant calculation expensive
        - DL w/ approximate density estimation:
            variational auto-encoder (VAE)
            - encode pixel to denser latent space
            - try to recover pixel from
                latent space w/ evidence lower bound (ELBO)
            - but face posterior collapse w/ high-dimensional latent space
        - diffusion: add Gaussian noise step by
            step till get Gaussian (forward process), then (reserve process)
            - training loss unstable; can only know by testing
        - transfusion: try to unify diffusion transformer training
        - 2-stage model bad at understanding task
    - generative adversarial network (GAN)

## linear model

- inter-agreement rate: human annotator may disagree

    $$
    \frac{P(a)-P(e)}{1-P(e)}
    $$

    - $P(a)$ raw agreement rate
    - need to subtract expected agreement (by chance) $P(e)=$ sum of
        products of raw rates
    - good rate vary by opinion: 0.8 very good; 0.4 some consider good
- perceptron: linear gradient lost
    - loss only on argmax y
- logistic regression: softmax on all y instead of just argmax y
    - more stable than perceptron

### naive Bayes

- assuming (wrongly) $P(w_1,w_2,…|y)=P(w_1|y)P(w_2|y)…$

## non-linear model

- need: non-linearly-separable feature
- activation function
    - old & bad: sigmoid, tanh
    - contemporary: ReLU, GELU, Swish, SwiGLU (used in SoTA LLM)

## [Thumbs up? Sentiment Classification using Machine Learning Techniques](https://aclanthology.org/W02-1011.pdf), Bo Pang, Lillian Lee, Shivakumar Vaithyanathan, EMNLP, 2002

## distributional feature representations

- embedding: arbitrary vector representation of word sequence
- distributional hypothesis: word meaning determined by where they are used
- pointwise mutual information (PMI) for words: p(word, context)
- positive PMI (PPMI): max(PMI, 0)
    - very sparse matrix
    - ⇒ singular value decomposition (SVD)
- word2vec

## language model (LM)

- can generate: assume what came before determine what comes next
- n-gram: "windowed" Bayes
    - backoff
    - smoothing
    - surprisingly good smallish model
- perplexity: how well LM predict real text by entropy
- feed forward neural network n-gram

### tokenization

reuse frequent letter sequence

- byte pair encoding (BPE)
    1. start w/ character-level tokens
    1. count most frequent token pair & greedily replace w/ single token
    - space sometimes part of token
    - not semantically meaningful
        - Reddit cause weird token e.g. user name
- small vocabulary cause long context

### recurrent neural network (RNN)

- each layer: feed new embedding + old hidden state to get new hidden state
- strong emphasis on last token
- problem: vanishing gradient bc long chain of hidden state
- long short-term memory (LSTM)
    - forget/input/output gate
    - multiply cell state by forget gate, add input gate,
        finally multiply output gate
    - Bidirectional LSTM (BiLSTM)
        - go both backward & forward, then concatenate
    - residual: directly add input to output
- attention: how much to attend to each hidden state
- minibatching: concatenate & broadcast multiple sequences for GPU efficiency
- major problem: cannot parallelize; inherently sequential

### self-attention

- of each token to every token: parallelizable
- idea: soft weighted lookup (of "query") in key-value store

step-by-step:

1. for each token, compute query $q_i$ of this token, key $k_j$ for
    every token
1. compute attention score $\alpha_{i,j}$ using e.g.
    dot product $q_i\cdot k_j$
1. softmax over all $\alpha_{i,j}$ to get $\alpha'_{i,j}$
1. compute value $v_j$ for every token, multiply by $\alpha'_{i,j}$ and sum

problem & solution:

- no sequence order
    - ⇒ position embedding: add a vector $p_i$ representing position e.g.
        Sinusoidal (OG)/ RoPE
- no element-wise nonlinearity
    - ⇒ feed forward network (FFN) after attention layer
- not looking into future
    - ⇒ attention mask: set attention score to $-\infty$ for future token

### transformer

- residual (add): smoothen loss landscape
- layer normalization (norm): speed up training by
    normalizing mean & variance
- multi-head attention: multiple attention & concatenation
- optimizer: basic SGD
    - Adam: momentum, per-parameter normalize adjustment by std of output
    - AdamW: de facto in 2025
- checkpoint/restart

### pretrained language model

- ELMo (2016): word vector w/ context from BiLSTM
- fine-tuning: reuse model for other task for new task
- GPT (2018): decoder-only classifier-only transformer
- BERT (2018): convert piece of text to
    512-dim vector w/ bidirectional transformer
    - mask certain tokens w/ \[MASK], random token, or actual token, then
        try to predict
    - popular partially bc good marketing as a Muppet just like Elmo
    - still fail Winograd challenge: figure out what ambiguous "it" refer to
- GPT-2 (2019): did well on task not trained on
    - huge model: 1.5B parameters
    - PR stunt bc uhallucinated nicorn story
- GPT-3 (2020): SoTA on many task
    - 175B parameters
    - few-shot; hardly affected by irrelevant/misleading context
    - fixated on what it learned instead of adapting to flipped task
- T0: like T5 but only w/ task phrased in natural language
- LLaMA (2023): public architecture, weights, training data
    - no training&preprocessing code
    - hard to reproduce
- Gemini (2023): started trend of
    white paper w/o technical details w/ tons of safety check

### modified pretrained language model

- T5: encoder-decoder transformer able to do multiple task
    - cross-attention: query from decoder, key&value from encoder
- prefix tuning: prepend token to mark what the task is
    - additional parameter alongside each layer
    - do not fine-tune original parameter
- adapter: linear layer before&after transformer to adapt to new task
- LoRA: add parameter alongside each layer and add them
    - work very well
    - can add anywhere: Q, K, V, FFN
        - Jon: a student claimed adding to FFN was best
- mixture of experts (MoE, from 1990s): send embedding to
    different channel for FFN
    - learn the router

### introspective model ourobouros

- scratchpad (2021): let model generate hidden token
    - RNN and transformer are Turing complete if given infinite think time
- chain-of-thought (CoT, 2022): encourage model to include reasoning
    - hand-written example for training
- ReAct: agentic + reasoning

## human feedback

- problem
    - some words matter more
    - bad training data
    - exposure bias
- evaluation is usually not differentiable ⇒ RL
- InstructGPT/ChatGPT
    1. supervised fine-tuning: got questions & answers & preference from human
    1. train reward mode: use human to rank answers from LLM
    1. PPO: initialize from supervised policy

### reinforcement learning (RL)

- less desirable than supervised learning
- trick: start w/ MLE training before RL
- avoid moving away too much from existing model ⇒ KL divergence
- proximal policy optimization (PPO):
    avoid hard-to-compute KL divergence w/ CLIP
    - cap model improvement by $1+\varepsilon$
- (DPO): no explicit reward model; only compare action
- minimum Bayes rick (MBR)
    - generate many outputs & score against each other
- (GRPO): choose group w/ low variance

## inference optimization

- KV cache
- LM-infinite: $\Lambda$-shaped + capped attention for "infinite"
    context window
    - attention instability beyond training context length
- speculative decoding: guess many upcoming tokens w/ smaller mode, check in
    parallel in large model

## information retrieval (IR)

- multi-shot
    - eval over k shots: mean average precision
        (MAP)/ normalized discounted cumulative gain
        (nDCG)/ mean reciprocal rank (MRR, +1/rank for each hit)
- limited ground truth ⇒ false negatives
    - human review of ground truth
    - user behavior telemetry
- token matching: surprisingly good
    - need tokenization to account for word morphology
- TF-IDF/ BM25 (best match)
- cross-encoder: concatenate query & doc, classify
- bi-encoder: encode query & doc separately, find similarity, e.g. Faiss
- late-state interaction (e.g. ColBERT): bi-encoder except per query token
- hard negative training (difficult, e.g. from weaker model)
