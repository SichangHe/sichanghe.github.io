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
        Sinusoidal (OG)/ rope
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
