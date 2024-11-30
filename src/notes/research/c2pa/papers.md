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
- ⭐ [Solutions to Deepfakes: Can Camera Hardware, Cryptography, and
    Deep Learning Verify Real Images?](https://arxiv.org/abs/2407.04169),
    Alexander Vilesov, Yuan Tian, Nader Sehatbakhsh, Achuta Kadambi, arXiV,
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

## Applying C2PA

- [EKILA: Synthetic Media Provenance and Attribution for Generative
    Art](https://openaccess.thecvf.com/content/CVPR2023W/WMF/papers/Balan_EKILA_Synthetic_Media_Provenance_and_Attribution_for_Generative_Art_CVPRW_2023_paper.pdf),
    Kar Balan, Shruti Agarwal, Simon Jenni, Andy Parsons, Andrew Gilbert,
    John Collomosse, IEEE CVPR, 2023;
    [DECORAIT - DECentralized Opt-in/out Registry for AI Training, Kar Balan,
    Andrew Gilbert, Alexander Black, Simon Jenni, Andy Parsons,
    John Collomosse, ACM CVMP, 2023]
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
    IEEE COMSTD, 2023
    - ISO JPEG Trust: "trust profile" vs "trust credential"
        question-answer validation
    - emphasis on trustworthiness
- [TRAIT:
    A Trusted Media Distribution
    Framework](https://ieeexplore.ieee.org/abstract/document/10167909),
    James Rainey, Mohamed Elawady, Charith Abhayartne, Deepayan Bhowmik,
    IEEE DSP, 2023
    - blockchain to detect media manipulation
