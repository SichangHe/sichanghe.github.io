<!-- toc -->
# Abstract Algebra

# integer

$$
\Z:=\{\cdots,-2,-1,0,-1,-2,\cdots\}
$$

## natural number

$$
\N:=\{0,1,2,\cdots\}
$$

## well-ordering axiom

$∀\ R ⊆ \N,R ≠ ∅,∃\ a\in R$ s.t. $\min(R)=a$

## division algorithm

$∀\ a,b\in\Z,b>0,∃!\ q,r\in\Z$, s.t.

$$
a=bq+r
,\qquad
0≤r<b
$$

### divisibility

$b|a$, or $b$ divide $a ⇔ ∃\ c\in\Z$, s.t. $a=bc$

- $b\not|a$, or $b$ do not divide $a$
- $b|a ⇔ b|(-a)$
- $a≠0,b|a ⇒ b≤|a|$

### greatest common divisor

$a,b\in\Z\setminus\{0\},∃!\ d:=\gcd(a,b)$, s.t.

1. $d|a,d|b$
1. $c|a,c|b ⇒ c≤d$

or

1. $d|a,d|b$
1. $c|a,c|b ⇒ c|d$

#### Euclidean algorithm

$a,b\in\Z\setminus\{0\}$

1. let $r_{-2}=a,r_{-1}=b$
1. apply division algorithm on $r_{i-1},r_i$ until $r_{n+1}=0$

    $$
    r_{i-1}=q_{i+1}r_i+r_{i+1}
    $$

1. $r_n=\gcd(a,b)$

- $a,b,q,r\in\Z,b>0,a=bq+r ⇒ \gcd(a,b)=\gcd(b,r)$

#### Bézout's identity

$a,b\in\Z\setminus\{0\},∃\ u,v$ s.t.

$$
\gcd(a,b)=au+bv
$$

- $\gcd(a,b)=\min(\{ax+by|x,y\in\Z\})$
- $x,y\in\Z,c=ax+by ⇒ \gcd(a,b)|c$
- find $u,v$: substitute $\gcd(a,b)$
    from the last equation in Euclidean algorithm up

#### relatively prime

$a,b$ are relatively prime $⇔ \gcd(a,b)=1$

- $\gcd(a,b)=1⇔ ∃\ x,y\in\Z,ax+by=1$
- $a|bc,\gcd(a,b)=1 ⇒ a|c$

### prime number

$p\in\Z$, then $p$ is prime $⇔ p≠0,p≠±1$, the only divisor of $p$ are $±1,±p$

- composite number: not prime

#### Euclid's lemma

$p$ prime, $p|ab ⇒ p|a$ or $p|b$

- $p\in\Z\setminus\{0,±1\}$,
    then $p$ prime $⇔$ if $p|ab$, then $p|a$ or $p|b$
- $p$ prime, $p|a_1a_2\cdots a_n ⇒ ∃\ i,p|a_i$

#### fundamental theorem of arithmetic

$∀\ n\in\Z\setminus\{0,±1\},n$ can be factored uniquely into product of primes

# relation

relation $R$ on $A$ is a subset $R ⊆ A × A$

$aRb$ or $a$ is related to $b ⇔ (a,b)\in R$

- $a\not Rb$ or $a$ is not related to $b$

## partition of set

$A$ is a non-empty set, partition of $A$

$$
\mathcal P:\ \{A_i|i=1,2,\cdots\}
$$

s.t.

1. $∀\ i≠j,A_i\cap A_j= ∅$
1. $A=\displaystyle\bigcup_iA_i$

- $R_\mathcal P:=\{(a,b)|∃\ A_i,a\in A_i,b\in A_i\}$
    is equivalence relation

## equivalence relation

1. reflexive: $aRa$
1. symmetric: $aRb ⇒ bRa$
1. transitive: $aRb,bRc ⇒ aRc$

### equivalence class

equivalence class of representative $a$

$$
[a] :=\{x\in A|xRa\}
$$

- $aRb ⇔ [a]=[b]$
- $[a],[b]$ are either disjoint or identical
- quotient set of $A$ by $R$

    $$
    A/R:=\{[a]|a\in A\}
    $$

    is partition of $R$

## modular arithmetic

$a,b,n\in\Z,n>0$, then

$a\equiv_n b$
or $a\equiv b$ (mod $n$)
or $a$ is congruent to $b$ modulo $n ⇔ n|(a-b)$

### congruence module $n$

$\Z/n$ ($\Z$ mod $n$) or quotient set of $\Z$ by $\equiv_n$

- $\Z/n$ is equivalence relation on $\Z$

### congruence class

equivalence class of $a$ modulo $n$

$$
[a]_n:=\{x\in\Z|x\equiv_na\}\\[12pt]=
\{a+nk|k\in\Z\}
$$

- there are $n$ distinct congruence classes

### addition and multiplication in modular arithmetic

$$
[a]+[b]=[a+b]\\[12pt]
[a] [b]=[ab]
$$

- addition and multiplication are well-defined
- $∀\ [a]\in\Z/n,∃!$ additive inverse
- $[a]≠[0]$ either has unique multiplicative inverse or it has not

#### unit

$∃\ x\in\Z/n,[a]x=[1]$

- $[a]$ is unit $⇔ \gcd(a,n)=1$

#### zero divisor

$∃\ x≠[0],[a]x=[0]$

- $p\in\N\setminus\{0,1\}$, then

    $p$ is prime

    $⇔ ∀\ [a]≠[0]$, $[a]$ is unit

    $⇔ [b] [c]=[0] ⇒ [b]=[0]$ or $[c]=[0]$,
    or no zero divisor

# group

ordered pair $(G,*)$

- set $G$
- binary operation $*$

axiom group satisfy:

1. $*$ is associative
1. identity: $∃\ e\in G,\ ∀\ a\in G,\ a*e=e*a=a$
1. inverse: $∀\ a\in G,\ ∃\ a^{-1}\in G,\ a*a^{-1}=a^{-1}*a=e$

property

1. $e$ is unique
1. $∀\ a\in G$, $a$ has unique inverse
1. $a*x=b$ and $y*a=b$ has unique solution,
    cancellation law work

- $(a^{-1})^{-1}=a$
- $(a*b)^{-1}=b^{-1}*a^{-1}$
- value of $a_1*a_2*\cdots*a_n$ is independent of the bracketing

## abelian group (commutative group)

$*$ is commutative

- $\Z,\mathbb Q,\R,\mathbb C,\Z/n,\R^{m × n}$ under $+$
- $\mathbb Q\setminus\{0\},\R\setminus\{0\},\mathbb C\setminus\{0\},(\Z/n)^×$
    under $\cdot$

## nonabelian group

- dihedral group of order $2n$, $D_{2n}$
- $(GL(n,\R),\cdot)$

### general linear group of degree $n$ over $R$

$$
GL(n,R):=\{A\in R^{n × n}|A\text{ is invertible}\}
$$

#### special linear group of degree $n$ over $R$

$$
SL(n,R):=\{A\in GL(n,R)|\det A=1\}
$$

## binary operation

$$
*:G × G → G
$$

### associative binary operation

$$
(a*b)*c=a*(b*c)
$$

### commutative binary operation

$$
a*b=b*a
$$

## order of group

$|G|$, or order of $G$, is the number of distinct elements in $G$

### order of element in group

$|a|$, or order of $a$, is the smallest $n\in\Z_+$ s.t.

$$
a^n=e
$$

or $∞$ if $n$ DNE

- $e,a,a^2,\cdots,a^{n-1}$ are distinct
- $a^m=1 ⇔ n|m$
- $∀\ m\in\Z_+,|a^m|=\frac{n}{\gcd(m,n)}$

## Torsion group

$G$ is a Torsion group, then
$∀\ a\in G,|a|$ is finite

- Torsion-free group: $∀\ a\in G,a≠e,|a|= ∞$
- Torsion subgroup of $G$: for abelian group $G$,

    $$
    \text{Tor}(G):=\{a\in G||a|\text{ is finite}\}
    $$

- $ab=ba,\gcd(|a|,|b|)=1 ⇒ |ab|=|a||b|$
- $G$ is abelian Torsion group,
    then $c$ has largest order $⇒ ∀\ a\in G,|a|\big||c|$

## dihedral group $D_{2n}$

rotation ($r$) and reflection ($s$) of n-gon

$$
\{1,s,r,sr,r^2,sr^2,\cdots,r^{n-1},sr^{n-1}\}
\qquad n≥3
\\[12pt]
(r^i)(k)=i+k\mod n
$$

- order $2n$
- degree $n$
- $|s|=2$
- $|r|=n$
- $∀\ 0≤i≠j≤n-1,sr^i≠sr^j$
- $∀\ 0≤i≤n,r^is=sr^{-i}$

### permutation of set

permutation of $X$: bijection

$$
\sigma:X → X
$$

## symmetric group on set

set $\Omega≠ ∅$

$S_\Omega$, the set of permutation of $\Omega$

$(S_\Omega,\circ)$, symmetric group on $\Omega$

- $n≥1,\Omega=X_n ⇒ (S_n,\circ)$, symmetric group of degree $n$
- $|S_\Omega|=n!$
- $n≥3 ⇒ (S_n,\circ)$ nonabelian

### array notation of permutation

$α$ is permutation on $X_n$

$$
α=\begin{pmatrix}
    1&2&\cdots&n
    \\
    α(1)&α(2)&\cdots&α(n)
\end{pmatrix}
$$

### cycle notation of permutation

cyclically permute and fix the rest

$$
(a_1\ a_2\ \cdots\ a_m)=
\begin{pmatrix}
    a_1&a_2&\cdots&a_m
    \\
    a_2&a_3&\cdots&a_1
\end{pmatrix}
$$

- $m$-cycle (or cycle of length $m$)

#### transposition

$2$-cycle

- $∀\ \sigma\in S_n,\sigma$ can be expressed as product of transposition
    - not unique
    - even permutation: length of such transposition is even
    - odd permutation

#### disjoint cycle

no common number

- $α,\beta\in S_n$ disjoint $⇒ α\beta=\beta α$
- $∀\ \pi\in S_n,\pi≠1,\pi$ can be
    uniquely expressed as product of disjoint cycle of length at least 2

## subgroup

$H≤G$, or $H ⊆ G$ is a subgroup of $G$

1. $H≠ ∅$
1. $∀\ x,y\in H,xy\in H$
1. $∀\ x\in H,x^{-1}\in H$

- $H<G$, or $H$ is a proper subgroup of $G$

### subgroup test

1. $H≤G ⇔$
    1. $H≠ ∅$
    1. $∀\ x,y\in H,xy^{-1}\in H$
1. $|G|< ∞,H≤G ⇔$
    1. $H≠ ∅$
    1. $∀\ x,y\in H,xy\in H$

### centralizer of group

$$
C_G(A):=\{g\in G| ∀\ a\in A,ga=ag\}
$$

- $C_G(a)$ if $A=\{a\}$

#### center of group

$$
Z(G):=\{g\in G| ∀\ a\in G,ga=ag\}
$$

### normalizer of group

$$
N_G(A):=\{g\in G|gAg^{-1}=A\}
$$

where

$$
gAg^{-1}:=\{gag^{-1}|a\in A\}
$$

for group $G$ and subset $A ⊆ G$

- $C_G(A)≤N_G(A)≤G$
- $G$ abelian $⇒ Z(G)=G,C_G(A)=N_G(A)$

## cyclic group

$$
G=\langle x \rangle=\{x^n|n\in\Z\}
$$

- generator $x$
- cyclic group are abelian
- $|G|=|x|$

### fundamental theorem of cyclic group

1. $H≤G ⇒ ∃!\ k\in\N,k=\min_k\{x^k\in H\},\ H=\langle x^k \rangle$
1. $|G|=n ⇒$
    - $∀\ a\in\N,a|n,∃!\ A,|A|=a$
        - $A=\langle x^d\rangle$
        - $d=\frac{n}{a}$
    - $∀\ m\in\Z,\langle x^m \rangle=\langle x^{\gcd(m,n)} \rangle$
    - $∀\ i,j,x^i=x^j ⇔ i\equiv j\mod n$
1. $|G|=∞ ⇒ ∀\ m\in\Z,\langle x^m \rangle=\langle x^{|m|} \rangle$

## homomorphism

$(G,\cdot),(H,\cdot)$ are group

well-defined map $\varphi:G → H$ is homomorphism $⇔$

$$
∀\ a,b\in G,\quad
\varphi(ab)=\varphi(a)\varphi(b)
$$

property

1. $\varphi(1_G)=1_H$
1. $∀\ n\in\Z,\quad\varphi(a^n)=\varphi(a)^n$

- monomorphism: $\varphi$ injective
- epimorphism: $\varphi$ surjective
- $\cong$, or isomorphism: $\varphi$ bijective

### well-defined map

$f:A → B$ is well-defined $⇔$

$$
∀\ x=y\in A ⇒ f(x)=f(y)
$$

### automorphism

isomorphism from $G$ to $G$

- inner automorphism of $G$, $\varphi_a(g)=aga^{-1}\quad(a\in G)$

### isomorphism

property

1. $|G|=|H|$
1. $G$ abelian $⇔ H$ abelian
1. $∀\ g\in G,\quad|g|=|\varphi(g)|$
1. $∀\ n\in\Z^+,\quad G,H$ have same number of elements of order $n$

- $|G|=p$ prime $⇒ G\cong\Z/p$

#### equivalence relation from isomorphism

$\mathcal G$ is set of groups

$\cong$ is equivalence relation on $\mathcal G$

#### cyclic isomorphism

$G=\langle x \rangle$

- $|x|= ∞ ⇒ G\cong\Z$
- $|x|= n ⇒ G\cong\Z/n$

#### Cayley's theorem

$∀$ group $G$, $∃$ permutation $H≤S_G$, s.t. $G\cong H$

### kernel and image of homomorphism

$\varphi:G → H$ is homomorphism

$h\in H$

1. kernel of $\varphi$

    $$
    \text{Ker }\varphi:=\{a\in G|\varphi(a)=1\}
    $$

    - $\text{Ker }\varphi≤G$
    - measure how much $\varphi$ is not injective
    - $\varphi$ is injective $⇔ \text{Ker }\varphi=\{1\}$
1. image of $\varphi$

    $$
    \text{Im }\varphi=\varphi(G):=\{\varphi(a)|a\in G\}
    $$

    - $\text{Im }\varphi≤H$
    - $\varphi$ is injective $⇔ \text{Im }\varphi\cong G$
1. fiber of $h$ under $\varphi$

    $$
    \varphi^{-1}(h):=\{a\in G|\varphi(a)=h\}
    $$

    - $\varphi$ is surjective $⇔ \text{Im }\varphi=H$

## coset

$H≤(G,\cdot)$, $g,a,b\in G$

1. left coset of $H$ in $G$

    $$
    gH:=\{gh|h\in H\}
    $$

    - $∃$ bijection between $H$ and $gH$
    - $aH=bH ⇔b^{-1}a\in H$
    - $aH=bH$ or $aH\cap bH= ∅$
1. right coset of $H$ in $G$

    $$
    Hg:=\{hg|h\in H\}
    $$

    - $∃$ bijection between $H$ and $Hg$
    - $Ha=Hb ⇔ab^{-1}\in H$
    - $Ha=Hb$ or $Ha\cap Hb= ∅$
1. $g$ is representative

- left and right coset are not necessarily equal
- $gH≤H ⇔ g=1$
- $|H|=|gH|=|Hg|$

### set of coset

1. set of left coset

    $$
    G/H:=\{aH|a\in G\}
    $$

1. set of right coset

    $$
    H\setminus G:=\{Ha|a\in G\}
    $$

- $∃$ bijection between $G/H$ and $H\setminus G$

#### index of subgroup in group

index of $H$ in $G$

$$
[G:H]
$$

is number of distinct left (right) coset

#### Lagrange's theorem

1. $|H|\big||G|$
1. $[G:H]=\frac{|G|}{|H|}$

for finite $G$

- $a\in G ⇒ |a|\big||G|$
- $∀\ a\in G,\quad a^{|G|}=1$

## normal subgroup

$N\unlhd G$, or $N$ is normal in $G ⇔$

$$
∀\ a\in G,\quad
aN=Na
$$

### normal subgroup test

1. $N\unlhd G$
1. $⇔ ∀\ a\in G,\quad aNa^{-1} ⊆ N$
1. $⇔ ∀\ a\in G,\quad aNa^{-1} = N$
1. $⇔ N_G(N)=G$
1. $⇔$ if $aN=bN,cN=dN$, then $(ac)N=(bd)N$

## quotient subgroup

$N\unlhd G$

$G/N=N\setminus G$ is the quotient group of $G$ by $N$

under operation $\cdot$:

$$
(aN)(bN):=(ab)N
$$

- $|G/N|=[G:N]$

### natural projection

$N\unlhd G$

natural projection of $G$ onto $N$

homomorphism $\pi:G → G/N$

$$
\pi(a)=aN
$$

- $\pi$ is epimorphism
- $\text{Ker }\pi=N$

## isomorphism theorem

### first isomorphism theorem

$\varphi:G → H$ homomorphism $⇒$

$$
G/\text{Ker }\varphi\cong\text{Im }\varphi
$$

- under $\Phi:G/\text{Ker }\varphi → \text{Im }\varphi$

    $$
    \Phi(g\text{Ker }\varphi):=\varphi(g)
    $$

### second isomorphism theorem (diamond theorem)

$K≤G,N≤G,N\unlhd G ⇒$

1. $KN≤ G$
1. $K\cap N\ \unlhd K$
1. $N\unlhd KN$
1. $K/K\cap N\ \cong\ KN/N$
1. $[KN:K]=[N:K\cap N]$

![diagram of diamond isomorphism theorem
](https://upload.wikimedia.org/wikipedia/commons/d/dc/Diagram_for_the_First_Isomorphism_Theorem.png)

### third isomorphism theorem

$H\unlhd G,K\unlhd G,K≤H$

1. $H/K\ \unlhd\ G/K$
1. $(G/K)/(H/K)\ \cong\ G/H$
    - $G/K\cong G/H$ under $\Gamma:G/K → G/H$

        $$
        \Gamma(gK):=gH
        $$

### forth isomorphism theorem

$N\unlhd G$, natural projection $\pi:G → G/N$

$∃$ bijection $\Pi$

$$
\Pi:\{A≤G|N ⊆ A\} → \{\mathscr A≤G/N\}\\[12pt]
\Pi(A)=\pi(A)=
\{\pi(a)|a\in A\}=A/N
$$

$A,B≤G,N≤A,B$

property of $\Pi$

1. $A≤B ⇔ \Pi(A)≤\Pi(B)$
1. $A≤B ⇒ [B:A]=[\Pi(B):\Pi(A)]$
1. $\Pi(A\cap B)=\Pi(A)\cap\Pi(B)$
1. $A\unlhd G ⇔ \Pi(A)\unlhd G/N$

# ring

a triple $(R,+,\cdot)$ s.t.

1. $(R,+)$ is abelian group
1. $\cdot$ is associative

    $$
    ∀\ a,b,c\in R,\quad(ab)c=a(bc)
    $$

1. distributive

    $$
    ∀\ a,b,c\in R,\quad a(b+c)=ab+ac
    $$

- $∀\ a,b\in R,\quad 0a=a0=0$
- $∀\ a,b\in R,\quad (-a)b=a(-b)=-(ab)$
- $∀\ a,b\in R,\quad (-a)(-b)=ab$

## commutative ring

$⇔ ∀\ a,b\in R,\ ab=ba$

## ring with identity

$⇔ ∃\ 1\in R,\ ∀\ a\in R,\ a1=1a=a$

- $1$ is unique
- $∀\ a\in R,\quad -a=(-1)a$

## division ring

$⇔ (R,+,\cdot)$ is ring with identity and
$∀\ a\in R\setminus\{0\},\ ∃\ b,\ ab=ba=1$

## field

commutative division ring

## zero divisor of ring

$a\in R,a≠0$

$a$ is zero divisor $⇔$

$$
∃\ b\in R,b≠0\text{ s.t. }ab=0\text{ or }ba=0
$$

- $∀\ a,b,c\in R,a$ is not zero divisor, $ab=ac ⇒ a=0$ or $b=c$

### integral domain

commutative ring $(R,+,\cdot),1≠0$

$(R,+,\cdot)$ is integral domain
$⇔$ no zero divisor:

$$
∀\ a,b,c\in R,\quad
ab=0 ⇒ a=0\text{ or }b=0\\[12pt]
a≠0,b≠0 ⇒ ab≠0
$$

- $∀ a,b,c\in R,ab=ac ⇒ a=0$ or $b=c$
- $R$ is finite $⇒ R$ is field

## unit of ring

$R$ is ring with identity, $1≠0,a\in R$

$a$ is unit $⇔$

$$
∃\ b\in R\text{ s.t. }ab=1=ba
$$

- group of units of $R$, $R^\times:=\{\text{units in }R\}$
- zero divisor cannot be unit

## subring

$S ⊆ R$

$S$ is subring of $R ⇔$

1. $(S,+)$ is a subgroup of $S$
1. $S$ is closed under multiplication

relationship between identity

- $1_S\not\equiv 1_R$
- $1_R\in S ⇒ 1_S=1_R$, unit in $S$ are unit in $R$

### subring test

$S$ is subring of $R ⇔$

1. $S≠ ∅$
1. $∀\ a,b\in S,\quad a-b\in S$
1. $∀\ a,b\in S,\quad ab\in S$

$S$ is finite subring of $R ⇔$

1. $S≠ ∅$
1. $∀\ a,b\in S,\quad a+b\in S$
1. $∀\ a,b\in S,\quad ab\in S$

### center of ring

$R$ is ring with $1$

$$
Z(R):=\{z\in R|∀\ r\in R,\quad zr=rz\}
$$

- is subring with $1$
- $R$ is division ring $⇒ Z(R)$ is field

### characteristic of ring

if $∃\ n$ s.t.

$$
n:=\argmin_m\{m\in\Z^+|∀\ a\in R,\quad ma=0\}
$$

then $char(R)=n$, else $char(R)=0$

- $char(R)>0 ⇔ char(R)=\displaystyle\argmin_n\{n\in\Z^+|n1=0\}$
- $R$ is integral domain $⇒ char(R)$ is $0$ or prime
- $R$ finite $⇒ char(R)\big||R|$

### nilpotent of commutative ring with identity

commutative ring $R$ with $1$

$x$ is nilpotent $⇔$

$$
∃\ m\in\Z^+\text{ s.t. }x^m=0
$$

- $x$ is $0$ or zero divisor
- $∀\ r\in R,\quad rx$ is nilpotent
- $1+x$ is unit
- $∀$ unit $u,u+x$ is unit

## polynomial ring

$R$ is commutative ring with identity,
$x$ is indeterminate

ring of polynomial in $x$ with coefficient in $R$

$$
R[x]:=\{\text{polynomial in $x$ with coefficient in $R$}\}
$$

- commutative
- identity $1$
- $R$ is subring of $R[x]$
- $S$ is subring of $R ⇒ S[x]$ is subring of $R[x]$
- $R$ is integral domain, $p(x),q(x)\in R[x]\setminus\{0\} ⇒$
    1. $R[x]$ is integral domain
    1. $\deg(p(x)q(x))=\deg(p(x))\deg(q(x))$
    1. $(R[x])^\times=R^\times$

### polynomial in $x$ with coefficient in $R$

$n\in\N,a_i\in R,a_n≠0$

$$
p(x)=a_nx^n+a_{n-1}x^{n-1}+\cdots+a_1x+a_0
$$

- degree $\deg(p(x))=n$

## matrix ring

$R$ is ring, $n\in\Z^+$

matrix ring of degree $n$ over $R$

$$
M_n(R):=R^{n\times n}
$$

- $R$ has identity $⇒ 1_{M_n(R)}=\mathbb I_n$

$n≥2 ⇒$

- $M_n(R)$ is not commutative
- $M_n(R)$ has zero divisor
- set of scalar matrix in $M_n(R)$ is a subring
- $S$ is subring of $R ⇒ M_n(S)$ is subring of $M_n(R)$

### scalar matrix

$∀\ i≠j,\quad a_{ii}=a,a_{ij}=0$

## ring homomorphism

$R,S$ are ring

well-defined map $\varphi:R → S$ is ring homomorphism $⇔ ∀\ r,s\in R,$

1. $\varphi(r+s)=\varphi(r)+\varphi(s)$
1. $\varphi(rs)=\varphi(r)\varphi(s)$

- monomorphism, epimorphism, isomorphism, kernel, image
- $\text{Ker}\varphi$ is subring
- $\text{Im}\varphi$ is subring
- $R\cong S ⇒$ they have the same property (commutative, identity, inverse)

## ideal of ring

subring $I$ is ideal of $R ⇔$

$$
∀\ r\in R,a\in I,\quad ra\in I, ar\in I
$$

- proper ideal: proper subset that is ideal

### ideal test

subset $I$ of ring $R$

$I$ is ideal $⇔$

1. $I≠ ∅$
1. $∀\ a,b\in I, a-b\in I$
1. $∀\ r\in R,a\in I,\quad ra\in I,ar\in I$

$⇔$

$$
a+I=b+I,c+I=d+I ⇒ (ac)+I=(bd)+I
$$

### maximal ideal

ideal $M$ of $R$ is maximal ideal $⇔$

1. $M\subsetneq R$
1. $I$ is ideal of $R$, $M ⊆ I ⊆ R ⇒ I=M$ or $I=R$

- easily seen in lattice
- not necessarily exist
- $1\in R ⇒$ every proper ideal is contained in a maximal ideal
- $R$ is commutative, $1\in R ⇔ R/M$ is field

### prime ideal

ideal $P$ of $R$ is prime ideal $⇔$

1. $P\subsetneq R$
1. $∀\ a,b\in R,\quad ab\in P ⇒ a\in P$ or $b\in P$

- $R$ is commutative, $1\in R ⇒$
    - $P$ is prime ideal $⇔ R/P$ is integral domain
    - $R$ is integral domain $⇔ \{0\}$ is prime ideal
    - every maximal ideal is prime ideal

## quotient ring

$I$ is ideal of $R$

$R/I=R\setminus I$ is quotient ring of $R$ by $I$

- $1\in R ⇒ 1_{R/I}=1+I$
- $R$ commutative $⇒ R/I$ commutative
- natural projection

    $$
    \pi(r):=r+I:R → R/I
    $$

## isomorphism theorem for ring

### first isomorphism theorem for ring

$\varphi:R → S$ is ring homomorphism $⇒$

1. $\text{Ker}\varphi$ is ideal of $R$
1. $R/\text{Ker}\varphi\cong\text{Im }\varphi$

### second isomorphism theorem for ring

$A,B$ are subring of $R$, $B$ is ideal $⇒$

1. $A+B$ is subring of $R$
1. $B$ is ideal of $A+B$
1. $A\cap B$ is ideal of $A$
1. $A/A\cap B\cong(A+B)/B$

### third isomorphism theorem for ring

$I,J$ are ideal of $R$, $I ⊆ J ⇒$

1. $J/I$ is ideal of $R/I$
1. $(R/I)/(J/I)\cong R/J$

### forth isomorphism theorem for ring

$I$ is ideal of $R$, natural projection $\pi:R → R/I$

$∃$ bijection

$$
\Pi:\{S\text{ is subring of }R|S \supseteq I\} →
\{\mathscr S\text{ is subring of }R/I\}\\[12pt]
\Pi(S)=\pi(S)=S/I
$$

$A,B$ are subring of $R$, $I ⊆ A,B ⇒$

1. $A ⊆ B ⇔ A/I ⊆ B/I$
1. $A ⊆ B ⇔ [B:A] = [B/I:A/I]$
1. $(A\cap B)/I=(A/I)\cap(B/I)$
1. $A$ is ideal of $R ⇔ A/I$ is ideal of $R/I$
