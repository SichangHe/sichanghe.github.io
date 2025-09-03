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

- [Learning to Rewrite: Generalized LLM-Generated Text Detection](https://aclanthology.org/2025.acl-long.322/), Wei Hao, Ran Li, Weiliang Zhao, Junfeng Yang, Chengzhi Mao, ACL, 2025
- [MultiSocial: Multilingual Benchmark of Machine-Generated Text Detection of Social-Media Texts](https://aclanthology.org/2025.acl-long.36/), Dominik Macko, Jakub Kopál, Robert Moro, Ivan Srba, ACL, 2025
- [MIND: A Multi-agent Framework for Zero-shot Harmful Meme Detection](https://aclanthology.org/2025.acl-long.46/), Ziyan Liu, Chunxiao Fan, Haoran Lou, Yuexin Wu, Kaiwei Deng, ACL, 2025
- [UTBoost: Rigorous Evaluation of Coding Agents on SWE-Bench](https://aclanthology.org/2025.acl-long.189/), Boxi Yu, Yuxuan Zhu, Pinjia He, Daniel Kang, ACL, 2025
- [CompileAgent: Automated Real-World Repo-Level Compilation with Tool-Integrated LLM-based Agent System](https://aclanthology.org/2025.acl-long.103/), Li Hu, Guoqiang Chen, Xiuwei Shang, Shaoyin Cheng, Benlong Wu, LiGangyang LiGangyang, Xu Zhu, Weiming Zhang, Nenghai Yu, ACL, 2025

## linear model

- inter-agreement rate: human annotator may disagree

    $$
    \frac{P(a)-P(e)}{1-P(e)}
    $$

    - $P(a)$ raw agreement rate
    - need to subtract expected agreement (by chance) $P(e)=$ sum of
        products of raw rates
    - good rate vary by opinion: 0.8 very good; 0.4 some consider good

### naive Bayes

- assuming (wrongly) $P(w_1,w_2,…|y)=P(w_1|y)P(w_2|y)…$

## [Thumbs up? Sentiment Classification using Machine Learning Techniques](https://aclanthology.org/W02-1011.pdf), Bo Pang, Lillian Lee, Shivakumar Vaithyanathan, EMNLP, 2002
