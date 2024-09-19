# Photo Crypto Auth

- cameras will sign photo cryptographically
- influencer have posted genuine photo but for irrelevant event
- may build system to authenticate photo

problem:

- ~~what about photo without signature?~~don't care

steps:

1. What in photo from C2PA camera?
1. Post-processing on social media site preserve signature?
1. Extract info from posts' text

## literature

### *P3: Toward Privacy-Preserving Photo Sharing*, Moo-Ryong Ra, Ramesh Govindan, Antonio Ortega, NSDI 13

split photo into public and private part, encrypt private part

### *Mitigating Image-based Misinformation Campaigns*, Calvin Ardi, Harsha V. Madhyastha

proposal:
compare photo crypto metadata time+location w/ social media post text before
manipulative post go viral. good for news. need to balance privacy

## C2PA

points from Perplexity (not to be trusted):

- nesting: manifest (metadata) > claim (statement) > assertion (field)
- claim generator: create & sign claim
- public key encryption (ECDSA/EdDSA/RSA) to sign claim; SHA-2 hash to
    bind manifest to content
    - need public key infrastructure (PKI)
- cryptographic assumption: encryption & hash work; secure RNG;
    secure private key; trust certificate authority (CA for PKI)
    - can attack from getting private key/ CA
