# C2PA-Related Papers

## Introduce C2PA

- [This Election Year, Look for Content Credentials:
    Media organizations combat deepfakes and disinformation with
    digital manifests](https://ieeexplore.ieee.org/abstract/document/10380467),
    Eliza Strickland, IEE Spectrum, 2024
    - talking about what C2PA is and how the adoption may work
- [Understanding the Impact of AI-Generated Deepfakes on Public Opinion,
    Political Discourse, and Personal Security in
    Social Media](https://ieeexplore.ieee.org/abstract/document/10552098),
    Prakash L. Kharvi, IEEE SP, 2024
    - why policies & companies should adopt C2PA
- [Defining best practices for opting out of ML
    training](https://openfuture.eu/wp-content/uploads/2023/09/Best-_practices_for_optout_ML_training.pdf),
    Paul Keller, Zuzanna Warso, Open Future policy brief, 2023
    - C2PA has entry to opt out of ML training
- [AI-Generated Images as
    an Emergent Record
    Format](https://ieeexplore.ieee.org/abstract/document/10386946),
    Jessica Bushey, IEEE BigData, 2023
    - literature review by computational archival science (CAS) people,
        ITrustAI
    - GenAI literature in medicine & law enforcement & journalism
    - copyright attribution; public trust in democracy
- [Confidence-Building Measures for Artificial Intelligence:
    Workshop Proceedings](https://arxiv.org/abs/2308.00862), Sarah Shoker,
    Andrew Reddie, et al., arXiv, 2023
    - foundational models can be used for insecure things
    - watermarking has tempering and adoption problems
- ⭐ [Solutions to Deepfakes: Can Camera Hardware, Cryptography, and
    Deep Learning Verify Real Images?](https://arxiv.org/abs/2407.04169),
    Alexander Vilesov, Yuan Tian, Nader Sehatbakhsh, Achuta Kadambi, arXiv,
    2024
    - ways to verify images, including C2PA
    - need every camera to support C2PA
    - can spoof by taking photo of a photo
        - prevent by various ways to distinguish 2D from 3D:
            camera structure from motion, hand jitter,
            stereo-based depth triangulation, lidar sensing,
            polarization-based sensing, time-of-flight sensing,
            spatially altered Bayer pattern,
            sparse polarization-sensitive pixel sampling
        - useless if object is already flat
    - new file format for "real" images
- [Global content revocation on the internet: a case study in
    technology ecosystem
    transformation](https://dl.acm.org/doi/abs/10.1145/3563766.3564099),
    Narek Galstyan, James McCauley, Hany Farid, Sylvia Ratnasamy,
    Scott Shenker, HotNets, 2022
    - wild new idea to rethink content revocation
- [Deepfake Fraud Detection: Safeguarding Trust in
    Generative
    Ai](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5031627),
    Felipe Romero-Moreno, SSRN Preprint, 2024
    - from law person perspective, C2PA and other tools to combat deepfake

## Enhance or extend C2PA

- [Ensuring privacy in provenance information for
    images](https://2025.ic-dsp.org/wp-content/uploads/2023/05/DSP2023-48.pdf),
    Nikolaos Fotos, Jaime Delgado, IEEE DSP, 2023;
    [Towards Privacy-Enhancing Provenance Annotations for
    Images](https://ieeexplore.ieee.org/abstract/document/10647277),
    Nikolaos Fotos, Jaime Delgado, IEEE ICIP, 2024
    - add privacy-preserving features
- [A Blockchain based Framework for Content Provenance and
    Authenticity](https://ieeexplore.ieee.org/abstract/document/10607477),
    Emil Bureacă, Iulian Aciobăniței, IEEE ECAI, 2024
    - blockchain on top of C2PA
- [Integrating Content Authenticity with
    DASH Video Streaming](https://dl.acm.org/doi/abs/10.1145/3625468.3652198),
    Stefano Petrangeli, Haoliang Wang, Maurice Fisher, Dave Kozma,
    Massy Mahamli, Pia Blumenthal, Andy Parsons, ACM MMSys, 2024
    - C2PA in video stream
- [Trust Nobody: Privacy-Preserving Proofs for Edited Photos with Your
    Laptop](https://www.computer.org/csdl/proceedings-article/sp/2025/223600a014/21B7Q66yaAg),
    Pierpaolo Della Monica, Ivan Visconti, Andrea Vitaletti, Marco Zecchini,
    IEEE SP, 2025; [Trust Nobody: Privacy-Preserving Proofs for
    Edited Photos with Your Laptop](https://eprint.iacr.org/2024/1074),
    Pierpaolo Della Monica, Ivan Visconti, Andrea Vitaletti, Marco Zecchini,
    Cryptology ePrint Archive, 2024
    - privacy-preserving proofs that an image is manipulation of another
- [VerITAS:
    Verifying Image Transformations at
    Scale](https://eprint.iacr.org/2024/1066), Trisha Datta, Binyi Chen,
    Dan Boneh, Cryptology ePrint Archive, 2024; [VIMz:
    Verifiable Image Manipulation using Folding-based
    zkSNARKs](https://eprint.iacr.org/2024/1063), Stefan Dziembowski,
    Shahriar Ebrahimi, Parisa Hassanizadeh, Cryptology ePrint Archive, 2024
    - zero-knowledge proof that an image is transformation of another
- [To Authenticity, and Beyond!
    Building Safe and Fair Generative AI Upon the Three Pillars of
    Provenance](https://personalpages.surrey.ac.uk/j.collomosse/pubs/Collomosse-IEEECGA-2024.pdf),
    John Collomosse, Andy Parsons, IEEE CGA, 2024
    - three pillars: metadata, fingerprint, watermark

## Applying C2PA

- [EKILA: Synthetic Media Provenance and Attribution for Generative
    Art](https://openaccess.thecvf.com/content/CVPR2023W/WMF/papers/Balan_EKILA_Synthetic_Media_Provenance_and_Attribution_for_Generative_Art_CVPRW_2023_paper.pdf),
    Kar Balan, Shruti Agarwal, Simon Jenni, Andy Parsons, Andrew Gilbert,
    John Collomosse, IEEE CVPR, 2023;
    [DECORAIT - DECentralized Opt-in/out Registry for
    AI Training](https://dl.acm.org/doi/abs/10.1145/3626495.3626506),
    Kar Balan, Andrew Gilbert, Alexander Black, Simon Jenni, Andy Parsons,
    John Collomosse, ACM CVMP, 2023
    - blockchain to index & attribute GenAI contribution by fingerprinting
    - C2PA to express consent & payment preference
- [Interoperable Provenance Authentication of
    Broadcast Media using Open Standards-based
    Metadata](https://arxiv.org/abs/2405.12336), Watermarking and Cryptography,
    John C. Simmons, Joseph M. Winograd, IBC 2024
    - C2PA & Advanced Television Systems Committee (ATSC) for
        broadcast provenance
    - ATSC: transfer metadata over broadcast

## Alternatives or complements to C2PA

- [Towards Trustworthy Digital Media In The Aigc Era:
    An Introduction To The Upcoming IsoJpegTrust
    Standard](https://ieeexplore.ieee.org/abstract/document/10353009),
    Jiayun Mo, Xin Kang, Ziyuan Hu, Haibo Zhou, Tieyan Li, Xiaojun Gu,
    IEEE COMSTD, 2023;
    [An International Standard For Assessing Trustworthiness In
    Media](https://ieeexplore.ieee.org/abstract/document/10647585),
    Deepayan Bhowmik, Sabrina Caldwell, Jaime Delgado, Touradj Ebrahimi,
    Nikolaos Fotos, Xiaojun Gu, IEEE ICIP, 2024
    - ISO JPEG Trust: "trust profile" vs "trust credential"
        question-answer validation
    - emphasis on trustworthiness
- [TRAIT:
    A Trusted Media Distribution
    Framework](https://ieeexplore.ieee.org/abstract/document/10167909),
    James Rainey, Mohamed Elawady, Charith Abhayartne, Deepayan Bhowmik,
    IEEE DSP, 2023
    - blockchain to detect media manipulation

## Scaling PKI

- [A Blockchain-Based PKI Management
    Framework](https://orbilu.uni.lu/handle/10993/35468), Alexander Yakubov,
    Wazen M. Shbair, Anders Wallbom, David Sanda, Radu State,
    IEEE/IFIP Man2Block, 2018
    - PKI insecure when CA compromised
    - blockchain-based PKI

## Fake image detection

- [Can people identify original and manipulated photos of
    real-world scenes?](https://pmc.ncbi.nlm.nih.gov/articles/PMC5514174/),
    Sophie J Nightingale, Kimberley A Wade, Derrick G Watson,
    Springer Cognitive Research, 2017
    - people can hardly tell if and how image manipulated
- [Explaining Why Fake Photos are Fake:
    Does It Work?](https://dl.acm.org/doi/abs/10.1145/3567558), Margie Ruffin,
    Gang Wang, Kirill Levchenko, ACM HCI, 2022
    - people cannot tell if image manipulated
    - explaining manipulation does not always help
- [AI-synthesized faces are indistinguishable from real faces and
    more trustworthy](https://www.pnas.org/doi/10.1073/pnas.2120481119),
    Sophie J. Nightingale, Hany Farid, PNAS, 2022
    - people cannot tell if face is AI-generated
- [Organic or Diffused: Can We Distinguish Human Art from AI-generated
    Images?](https://people.cs.uchicago.edu/~ravenben/publications/pdf/organic-ccs24.pdf),
    Anna Yoo Jeong Ha, Josephine Passananti, Ronik Bhaskar, Shawn Shan,
    Reid Southen, Haitao Zheng, Ben Y. Zhao, ACM CCS, 2024
    - ML detector & human cannot tell if image is AI-generated
    - ways to trick ML detector
    - ML detector trained on specific generator not good at new generator
    - human expert better than ordinary human

## Anti-training

- [GLAZE: Protecting Artists from Style Mimicry by Text-to-Image
    Models](https://people.cs.uchicago.edu/~ravenben/publications/pdf/glaze-usenix23.pdf),
    Shawn Shan, Jenna Cryan, Emily Wenger, Haitao Zheng, Rana Hanocka,
    Ben Y. Zhao USENIX Security, 2023
    - add noise to image to brick ML model from generating similar image

## Adoption of C2PA-like standards

- [Is The Web HTTP/2 Yet?](https://davidtnaylor.com/http2-pam16.pdf),
    Matteo Varvello, Kyle Schomp, David Naylor, Jeremy Blackburn,
    Alessandro Finamore, Konstantina Papagiannaki, PAM, 2016
    - crawl & track HTTP 2 usage
