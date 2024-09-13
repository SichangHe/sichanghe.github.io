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
