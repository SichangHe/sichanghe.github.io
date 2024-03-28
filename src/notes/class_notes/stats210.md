<!-- toc -->
# Probability, Random Variables, and Stochastic Processes

## joint distribution: discrete

$$P(B)=P((X,Y\in B))$$

### uniform distribution

$$
(X,Y)\in D\\
P((X,Y)\in C)=\frac{\text{area}(C)}{\text{area}(D)}\qquad\text{for }C\subset D
$$

#### independent uniform variables

has uniform joint distribution
use areas to find probability, always geometric method first

## joint distribution: continuous

$$
f(x,y)\geq0\quad\forall(x,y)\in\mathbb{R}\\[10pt]
\iint_{\mathbb{R}^2}f(x,y)\mathrm{d}x\mathrm{d}y=1
$$

---

## conditional probability: discrete

$$
P(X=x|Y=y)=\frac{P(X=x,Y=y)}{P(Y=y)}
$$

### probability model

$$
(S,A,P)\\
S—\text{sample space}\\
A—\text{events}\\
P—\text{probability}
$$

#### rule of average conditional probability

$$
P(Y=y)=\sum_xP(Y=y|X=x)P(X=x)
$$

#### conditional expectation: discrete

$$
E(Y|A)=\sum_yyP(Y=y|A)
$$
for random variable $Y$ and event $A$

##### properties

- linearity property

$$
E(X+Y|A)=E(X|A)+E(Y|A)
$$

- average conditional expectation

$$
E(Y)=\sum_{i=1}^nE(Y|A_i)P(A_i)\qquad\text{if }A_i\text{ is partition of outcome space}\\
\Rightarrow\text{average conditional probability }P(B)=\sum_{i=1}^nP(B|A_i)P(A_i)
$$

- rule of average conditional expectation

$$
E(Y)=\sum_xE(Y|X=x)P(X=x)
$$
aka the formula for $E(Y)$ by conditioning on $X$

- conditional expectation of $Y$ given $X$

$$
E(Y|X)
$$
is a function $g(x)$ of $x$
$$
E(Y)=\sum_xE(Y|X=x)P(X=x)=\sum_xg(x)P(X=x)=E(g(x))\\[10pt]
\Rightarrow E(Y)=E[E(Y|X)]
$$

- to find a function, find its value first and replace the parameter with variable

$$
E.g.\qquad E(X=x)=f(x)\Rightarrow E(X)=f(X)
$$

## conditioning: continuous case

$$
f_{X|Y}(X|Y=y)=\frac{f(x,y)}{\int_{\mathbb{R}}f(x,y)\mathrm{d}x}=\frac{f(x,y)}{f_Y(y)}
$$
if $f_Y(y)>0$
$$
\Rightarrow f(x,y)=f_{X|Y}(x|Y=y)f_Y(y)
$$

#### probability over a region

$$
P(x\in D|Y=y)=\int_Df_{X|Y}(x|Y=y)\mathrm{d}x
$$

### infinitesimal conditioning formula

$$
P(A|X=x)=\frac{P(A,X\in\mathrm{d}x)}{P(X\in\mathrm{d}x)}
$$
$X\in\mathrm{d}x\qquad X$ fall in small interval near $x$

### conditional density of $Y$ given $X=x$

$$
f_Y(y|X=x)=\frac{f(x,y)}{f_X(x)}\\
$$
$$
\Rightarrow\int f_Y(y|X=x)\mathrm{d}y=1
$$

#### joint density surface

$$
z=f(x,y)
$$

#### marginal density of $X$

$$
f_X(x)=\int f(x,y)\mathrm{d}y
$$

#### multiplication rule for density

$$
f(x,y)=f_X(x)f_Y(y|X=x)
$$

### averaging conditional probability

#### integral conditioning formula

$$
P(A)=\int P(A|X=x)f_X(x)\mathrm{d}x
$$

### conditional expectation

$$
E[g(Y)|X=x]=\int g(y)f_Y(y|X=x)\ \mathrm{d}y\\
E[g(Y)]=\int E[g(Y)|X=x]\ f_X(x)\mathrm{d}x
$$

### conditional variance

$$
\begin{align*}
var(X|Y)&\equiv E[(X-E[X|Y])^2\ |Y]\\
&=E[X^2|Y]-(E[X|Y])^2
\end{align*}
$$

### **!** another way to calculate variance

$$
Var(X)=E[Var(X|Y)]+Var(E[X|Y])
$$

#### **!** for $X_i$ i.i.d. with number $N>0$ independent to $X_i$

$$
E\left[\sum_{i=1}^NX_i\right]=E[X]\ E[N]\\[10pt]
Var\left(\sum_{i=1}^NX_i\right)=E[N]\ Var(X)+(E[X])^2\ Var(N)
$$

---

## Bayesian estimation

take the wanted parameter $\theta$ as a random variable
with distribution *prior distribution*
take a sample and use it to update the *posterior distribution*

### general case

want $\Theta$ in $X_i\sim distribution(\Theta)$
let $\Theta\sim priorDistribution\qquad\Rightarrow f_\Theta(\theta)$
with observations (measurements) $X=(X_1,\dots,X_n)$
know conditional distribution $f_{X|\Theta}(x|\theta)$
$\Rightarrow$ posterior distribution
$$
f_{\Theta|X}(\theta|x)
=\frac{f_{X|\Theta}(x|\theta)f_\Theta(\theta)}{f_X(x)}
=\frac{f_{X|\Theta}(x|\theta)f_\Theta(\theta)}{\int f_{X|\Theta}(x|\theta')f_\Theta(\theta')\,\mathrm{d}\theta'}
$$
i.e. posterior = likelihood $\cdot$ prior $/$ evidence

- it does not matter if the observation points are used one by one or all at once

### conjugate prior

the posterior distribution is of the same type as the prior distribution

- normal + normal = normal
- binomial + Beta = Beta

### indicator

$$
1_A(x)=\begin{cases}
    1\quad&x\in A\\
    0&x\notin A
\end{cases}\\[12pt]
\Rightarrow E[X|A]=\frac{E[X\cdot1_A(X)]}{P(A)}
$$

### maximum a posteriori probability (MAP) rule

select $\hat{\theta}$ so that posterior probability $f_{\Theta|X}(\theta|x)$ is maximized
$\Leftrightarrow$ maximize $f_{X|\Theta}(x|\theta)f_\Theta(\theta)$

#### point estimation

select point estimate $\hat{\theta}$ to represent best guess of $\Theta$

##### estimator $\hat{\Theta}=g(X)$

- maximum a posteriori probability (MAP) estimator
- conditional expectation estimator
a.k.a. least mean squares (LMS) estimator $\downarrow$

### least mean squares (LMS) estimation

select an estimator/function with least squared error

#### base case

for $\theta$, want $\hat{\theta}$ such that $E[(\theta-\hat{\theta})^2]$ is minimized
$\Rightarrow$ choose $\hat{\theta}=E[\theta]$

#### general case

with observations $X=x$, want $\hat{\theta}$ to minimized $E[(\theta-\hat{\theta})^2|X=x]$
$\Rightarrow$ choose $\hat{\theta}=E[\theta|X=x]$

### linear least mean squares estimation

the linear form of LMS

## hypothesis testing

denote $H_i$ as event $\{\Theta=\theta_i\}$

### MAP rule for hypothesis testing

choose $H_i$ iff it has a larger posterior $P(\Theta=\theta_i|X=x)$
or equivalently $p_\Theta(\theta_i)f_{X|\Theta}(x|\theta_i)$

### general case—two coins

coin 1 gets head by $p_1$, coin 2 by $p_2>p_1$
toss an unknown coin, coin $\theta$, $n$ times and get $k$ heads
choose $\theta=1$ iff $P(\theta=1|X=k)\geq P(\theta=2|X=k)$

- critical $k^*\in\N$
choose $\theta=1$ iff $k\leq k^*$
- probability of getting error
$P_e=P(\theta=1,X>k^*)+P(\theta=2,X\leq k^*)$

### property

- $E[\hat{\theta}]=E[E[\theta|X]]=E[X]$

$$
\tilde{\theta}=\theta-\hat{\theta}
$$

- $Cov(\hat{\theta},\tilde{\theta})=0$
- $Var(\theta)=Var(\hat{\theta})+Var(\tilde{\theta})$

---

## discrete Markov chain

- the Markov property
the past does not matter for the future, only the present does

$$
P(X_{n+1}=j|X_0=a,\cdots,X_n=i)=P(X_{n+1}=j|X_n=i)
$$

- discrete time
- state space $S$ finite or countably infinite

#### one-step probability $P(X_{n+1}=j|X_n=i)=P(i,j)=p_{ij}$

does not change

### transition probability matrix

$$
\begin{bmatrix}
p_{11} &\cdots&p_{1m}\\
\vdots&\ddots&\vdots\\
p_{m1}&\cdots&p_{mm}
\end{bmatrix}
$$

#### initial distribution $\pi_0$

#### $n$-step transition matrix

$$
p_{ab}^n=P(X_{m+n}=b|X_m=a)
$$

$$
p_{ij}^{n+m}=p_{ij}^n\cdot p_{ij}^m
\qquad\Rightarrow P(X_{m+n}=j|X_0=i)=\sum_{k\in S} P(X_m=k|X_0=i)P(X_{m+n}=j|X_m=k)
$$
$$
P(X_n=k)=\sum_x\pi_0(x)p_{xk}^n
$$

### class structure

site $i$ leads to $j$, i.e. $i\longrightarrow j$
$$
\exists\  n\geq 0,\quad P(X_n=j|X_0=i)>0
$$
$i\longrightarrow j, j\longrightarrow i\quad\Rightarrow i$ and $j$ are in the same class

#### closed class

can not go to another class

class $C(C\subseteq S)$ is closed, $i\in C,i\longrightarrow j\quad\Rightarrow j\in C$

#### absorbing state

### transient & recurrent

#### hitting time

let $A\subseteq S$, hitting time of $A$, $T_A$:
$$
T_A=\begin{cases}
    \min\{n>0:X_n\in A\}\quad&\exists\ n,\ X_n\in A\\
    \infty&\forall\ n,\ X_n\notin A
\end{cases}\\
\Rightarrow p_{xy}^n=\sum_{m=1}^nP_x(T_y=m)P_{yy}^{n-m}
$$

#### transient and recurrent state

$$
\rho_{xy}=P_x(T_y<\infty)=P(T_y<\infty|X_0=x)
$$
site $y$ is recurrent if $\rho_{yy}=1$

- always can get from $y$ to $y$ in finite steps

transient if $\rho_{yy}<1$

#### number of times pass $y$

$$
N(y)=\sum_{n=1}^\infty1_y(X_n)
$$

- $N(y)\geq1$ iff $T_y<\infty$
- $P_x(N(y)\geq1)=P_x(T_y<\infty)=\rho_{xy}$
$P_x(N(y)\geq m)=P_x(T_y<\infty)\,P_y^{m-1}(T_y<\infty)=\rho_{xy}\rho_{yy}^{m-1}$
- $\Rightarrow P_x(N(y)=m)=\rho_{xy}\rho_{yy}^{m-1}(1-\rho_{yy})$

$$
\begin{align*}
g(x,y)=E_x[N(y)]&=\sum_{n=1}^\infty nP_x(N(y)=n)\\
&=\sum_{n=1}^\infty p_{xy}^n
\end{align*}
$$

#### theorem

- let $y$ be a transient state, then
$P_x(N(y)<\infty)=1$ and $g(x,y)=\frac{\rho_{xy}}{1-\rho_{yy}}\ \forall\ x\in S$
which means $\lim_{n\rightarrow\infty}p_{xy}^n=0$
- let $y$ be a recurrent state, then
$P_y(N(y)=\infty)=1$ and $g(y,y)=\infty$ and $P_x(N(y)<\infty)=\rho_{xy}$

##### result

- $S$ is finite $\Rightarrow\exists$ at least $1$ recurrent state $y$

- $y$ is recurrent, $y\longrightarrow z\Rightarrow z$ recurrent, $y,z\in$ the same closed class
$\rho_{yy}=\rho_{yz}=\rho_{zz}=\rho_{zy}=1$

you always get absorbed in a closed class of recurrent states after moving around

##### starting from $x$, the probability to go in class $\{x_1,\cdots,x_k\}$

$$
\rho_{\{x_1,\cdots,x_k\}}(x)
$$

- if $x\in\{x_1,\cdots,x_k\}$, then $\rho_{\{x_1,\cdots,x_k\}}(x)=1$
- if $x\in$ another closed class, then $\rho_{\{x_1,\cdots,x_k\}}(x)=0$
- if $x$ is transient, then $\rho_{\{x_1,\cdots,x_k\}}(x)=\sum_i\rho_{\{x_1,\cdots,x_k\}}(x_i)\ p_{xx_i}$

##### starting from $x$, the expected steps to be absorbed

$$
\mu_x=\sum_y(1+\mu_y)\ p_{xy}=1+\sum_y\mu_yp_{xy}
$$

### stationary distribution

let $\{X_n\}$ be a Markov chain with state space $S$
a distribution $\pi$ on $S$ is said to be stationary if
$$
\sum_{x\in S} p_{xy}\pi(x)=\pi(y)\qquad\forall\ y\in S
$$
$\Rightarrow$ the distribution stay the same
$$
\sum_{x\in S} p_{xy}^n\pi(x)=\pi(y)\qquad\forall\ y\in S,n\in N^*
$$
$\forall$ initial distribution $\pi_0$, the distribution after infinite steps:
$$
\lim_{n\rightarrow\infty}P(X_n=y)=\pi(y)\qquad\forall\ y\in S
$$
$\Rightarrow$ the distribution will be independent on $\pi_0$

#### find stationary distribution

build linear system with
$$
\begin{cases}
    \pi(1)=\sum_{x\in S} p_{x1}\pi(x)\\
    \pi(2)=\sum_{x\in S} p_{x2}\pi(x)\\
    \qquad\vdots\\
    \pi(n-1)=\sum_{x\in S} p_{x(n-1)}\pi(x)\\
    \sum_{x\in S}\pi(x)=1
\end{cases}\\[12pt]
\Rightarrow\begin{bmatrix}
    p_{11}-1&p_{21}&\cdots&p_{n1}\\
    p_{12}&p_{22}-1&\cdots&p_{n2}\\
    \vdots\\
    p_{1(n-1)}&p_{2(n-1)}&\cdots&p_{n(n-1)}\\
    1&\cdots&&1
\end{bmatrix}
\begin{bmatrix}
    \pi_1\\
    \pi_2\\
    \vdots\\
    \pi_n\\
\end{bmatrix}
=\begin{bmatrix}
    0\\
    \vdots\\
    0\\
    1\\
\end{bmatrix}
$$

##### null recurrent and positive recurrent

$$
\lim_{n\rightarrow\infty} p_{xx}^n=0\qquad\text{or}\quad\neq0
$$

#### period of a state $d_x$

GCD of all $n$ such that $p_{xx}^n>0$

##### states in the same class have the same period

$x\longleftrightarrow y\quad\Rightarrow d_x=d_y$

##### a chain is irreducible if $S$ is a closed class

##### if every state of a Markov chain has period $1$ we say the chain is aperiodic

##### suppose a Markov chain is irreducible and aperiodic and has a stationary distribution $\pi$

$$
\lim_{n\rightarrow\infty}p_{xy}^n=\pi(y)
$$

##### suppose a Markov chain is irreducible and all states are recurrent

- average number of visits to $y$

$$
N_n(y)=\sum_{m=1}^n1_y(X_n)\\
\frac{N_n(y)}{n}\rightarrow\frac{1}{E_y[T_y]}
$$

- mean return time to $y$

$$
m_y=E_y[T_y]
$$

##### suppose a Markov chain is irreducible and has a stationary distribution $\pi$

$$
\pi(y)=\frac{1}{E_y[T_y]}
$$
the stationary distribution is unique

and
$$
\lim_{n\rightarrow\infty}\frac{\sum_{m=1}^np_{xy}^n}{n}=\pi(y)
$$

---

## Stochastic process

### branching process

consider a population of individual:

- in every generation, $n=0,1,2,\cdots$, each individual produce a random number of offspring in the next generation $Z,Z\in\{0,1,\cdots\}$, i.i.d. with the other individual. $X_n,n=0,1,\cdots$ denote the number of individual in the $n$-th generation

$$
P(Z=i)=p_i
$$

##### question of interest

$$
\lim_{n\rightarrow\infty}P(X_n=0)=?
$$

#### generating function

$$
\Phi_X(t)=E[t^X]=\sum_xP(X=x)\ t^x\\
\Rightarrow\Phi'_X(t)=\sum_xxP(X=x)\ t^{x-1}\\
\Rightarrow\begin{cases}
\mu=E[X]=\Phi'_X(1)\\
\Phi_X(0)=p_0\\
\Phi_X(1)=1\\
\end{cases}
$$

##### fixed point of $\rho$

$$
\rho=\rho_{1,0}=\sum_kP(Z=k)\rho_{k,0}=\sum_kP(Z=k)\rho^k=\Phi(\rho)
$$

- analysis: study $H(t)=\Phi_X(t)-t$
- $H''(t)>0,H(0)=p_0>0,H(1)=0$

if $\mu=0$, then $p_0=1\Rightarrow\rho=1$
if $0<\mu\leq 1,P(t=0)>0$, then $\rho=1$
if $\mu>1$, then $\exists\ 0<\rho<1$

### birth and death process

$$
S=\{0,1,\cdots,d\}\\
p_{xy}=\begin{cases}
    q_x&y=x-1\\
    r_x&y=x\\
    p_x&y=x+1
\end{cases}\\
q_0=0,q_x>0\\
p_d=0,p_x>0\ (0<x<d)
$$

#### gambler's ruin

with $0\leq a<x<b$, find $u(x)=P_x(T_a<T_b)$
$$
\gamma_x=\frac{q_1q_2\cdots q_x}{p_1p_2\cdots p_x}\qquad\gamma(0)=1\\[6pt]
u(x)=q_xu(x-1)+r_xu(x)+p_xu(x+1)\\[12pt]
\Rightarrow\frac{u(x+1)-u(x)}{\gamma_x}=\frac{u(x)-u(x-1)}{\gamma_{x-1}}\\[12pt]
\Rightarrow u(x)=\frac{\sum_{y=a}^{b-1}\gamma_y}{\sum_{y=a}^{b-1}\gamma_x}\\[6pt]
1-u(x)=\frac{\sum_{y=a}^{x-1}\gamma_y}{\sum_{y=a}^{b-1}\gamma_y}
$$

- when $p_i=p,q_i=q$

$$
u(x)=1-\frac{(\frac{q}{p})^a-(\frac{q}{p})^x}{(\frac{q}{p})^a-(\frac{q}{p})^b}
$$

#### irreducible and stationary distribution

$$
P_1(T_0<\infty)=\lim_{n\rightarrow\infty}P_1(T_0<n)
$$
because $\{T_0<n\}$ is non-decreasing
$$
\Rightarrow P_1(T_0<\infty)=\lim_{n\rightarrow\infty}(1-\frac{1}{\sum_{y=0}^{n-1}\gamma_y})
$$

$\Rightarrow$ a birth and death chain is recurrent iff $\sum_{y=0}^\infty\gamma_y=\infty$

if transient
$$
\rho_{x0}=\frac{\sum_{y=x}^\infty\gamma_y}{\sum_{y=0}^\infty\gamma_y}\neq0
$$
if recurrent
$$
\pi(k+1)=\frac{p_0p_1\cdots p_k}{q_1q_2\cdots q_{k+1}}\pi(0)
$$
**stationary distribution** exists iff $\sum_{k=1}^\infty\frac{p_0p_1\cdots p_k}{q_1q_2\cdots q_{k+1}}<\infty$
$\Rightarrow$ positive recurrent

else, null recurrent

### random walk

#### random walk on finite graph $G$

- number of vertex

$$
|V|
$$

- adjacent—$u$ is adjacent to $v$ iff there is one edge connecting them
- degree of a vertex $u$—the number of edges incident to $u$

$$
d(u)
$$

- uniform—the distribution of where to go is uniform, meaning that the probability of going to any adjacent vertex is the same

$$
P_{xy}=\begin{cases}
    \frac{1}{d(x)}&y\text{ is adjacent to }x\\
    0&\text{otherwise}
    \end{cases}
$$

- stationary distribution $\pi$

$$
\pi(x)=\frac{d(x)}{\alpha}
$$
where
$$
\alpha=\sum_xd(x)
$$

#### random walk on positive integer

birth and death process

- reflective barrier
- recurrent iff $p>\frac{1}{2}$
- stationary distribution $\pi(x)=(1-\frac{p}{1-p})^x(\frac{p}{1-p})^x$ iff recurrent

#### random walk on integer $\Z^d$

$S$ consist of all points in $\R^d$ with integer coordinate

##### Stirling's formula

$$
n!\approx\sqrt{2\pi n}\ n^ne^{-n}
$$
when $n$ is large

##### random walk on $\Z^1$

$$
p_{xx}^{2n}=\begin{pmatrix}
    2n\\n
    \end{pmatrix}
p^{2n}(1-p)^{2n}\ \begin{cases}
    =\infty&p=\frac{1}{2}\\
    <\infty&\text{otherwise}
    \end{cases}
$$

- limit comparison test to check convergence

---

## continuous Markov chain

- continuous time
- finite or countably infinite

$$
P(X(s+t)=j|X(s)=i,X(u)=x_u)=P(X(s+t)=j|X(s)=i)\\\forall\ u,\ 0\leq u\leq s
$$

### time-homogenous—$s$ does nothing

$$
P(X(s+t)=j|X(s)=i)=P(X(t)=j|X(0)=i)=p_{ij}(t)
$$

### Chapman–Kolmogorov Equations

$$
p_{ij}(s+t)=\sum_{k\in S}p_{ik}(s)p_{kj}(t)
$$

### holding time at state $i$

the time $\tau_i$ staying at state $i$ before changing
$\tau_i\sim Exp(q_i)$

- absorbing state
$q_i=0$, never move
- explosive
$q_i=\infty$, never stay
- general

#### proof

prove
$$
P(\tau_i>s+t\,|\ \tau_i>s,X(0)=i)=P(\tau_i>t\,|X(0)=i)
$$
$\Rightarrow$ the holding time is memory-less

### embedded discrete Markov chain

$\{Y_i\}$ consisting of the state the continuous Markov chain visit
$$
p_{ij}=P(Y_{n+1}=j|Y_n=i)=P(Y_1=j|Y_0=i)
$$

### another representation of $p_{ij}(t)$

before jumping from $i$ to $j$, holding time $\sim Exp(q_{ij})$
$$
\sum_jq_{ij}=q_i\\[6pt]
p_{ij}=\frac{q_{ij}}{q_i}
$$
go to the earliest state

- transition matrix for the embedded Markov chain

$$
\tilde{p}=\begin{bmatrix}
    0&\frac{q_{12}}{q_1}&\cdots\\[6pt]
    \frac{q_{21}}{q_2}&0&\cdots\\[6pt]
    \vdots&\vdots&\ddots
    \end{bmatrix}
$$
derivative at $0$
$$
p'_{ij}(0)=\begin{cases}
    q_{ij}&i\neq j\\
    -q_i&i=j
    \end{cases}
$$

- Kolmogorov backward equation

$$
p'_{ij}(t)=\sum_{k\neq i}q_{ik}p_{kj}(t)-q_ip_{ij}(t)=\sum_kQ_{ik}p_{kj}(t)
$$

- Kolmogorov forward equation

$$
p'_{ij}(t)=\sum_{k\neq j}p_{ik}(t)q_{kj}-q_jp_{ij}(t)=\sum_kp_{ik}(t)Q_{kj}
$$

- infinitesimal generator $Q$—transition matrix for the Markov chain itself

$$
Q=\begin{bmatrix}
    -q_1&q_{12}&q_{13}&\cdots\\[6pt]
    q_{21}&-q_2&q_{23}&\cdots\\[6pt]
    \vdots&\vdots&\vdots&\ddots
    \end{bmatrix}\\[12pt]
Q_{ij}=p'_{ij}(0)=\begin{cases}
    q_{ij}&i\neq j\\
    -q_i&i=j
    \end{cases}
$$

#### recover $p_{ij}(t)$ using $Q$

- system of differential equation using the Kolmogorov equation (either forward or backward)

##### matrix exponential

square matrix $A$
$$
e^{tA}=\sum_{n=0}^\infty\frac{(tA)^n}{n!}\\[12pt]
\frac{\partial e^{tA}}{\partial t}=Ae^{tA}
$$

- or differential equation of matrix

$$
p(t)=\begin{bmatrix}
    p_{11}(t)&\cdots&p_{1n}(t)\\[6pt]
    \vdots&\ddots&\vdots\\[6pt]
    p_{n1}(t)&\cdots&p_{nn}(t)
    \end{bmatrix}\\[12pt]
p'(t)=Qp(t)=p(t)\,Q\\[12pt]
\Rightarrow p(t)=e^{tQ}
$$
for $Q=SDS^{-1},\lambda_i$ the eigenvalues
$$
p(t)=Se^{tD}S^{-1}\\[12pt]
(e^{tD})_{ij}=\begin{cases}
    e^{t\lambda_i}&i=j\\[6pt]
    0&i\neq j
    \end{cases}
$$

### long time behavior of continuous Markov chain

#### stationary distribution

- definition
with $\pi=[\pi(1),\pi(2),\cdots]$

$$
\pi=\pi p(t)\\[12pt]
\Leftrightarrow\sum_{x\in S} p_{xy}(t)\,\pi(x)=\pi(y)\quad\forall\ y\in S,t
$$

- finding the stationary distribution

$$
\pi Q=\vec{0}\\[12pt]
\Leftrightarrow\sum_i\pi(i)\,Q_{ij}=0\quad\forall\ j
$$

- is a limiting distribution if recurrent and finite closed class

$$
\pi(y)=\lim_{t\rightarrow\infty}p_{xy}(t)\quad\forall\ x
$$

#### relationship with stationary distribution of embedded chain $\Phi$

let $h(j)=\pi(j)\,q_j$
$$
\Phi(j)=\frac{h(j)}{\sum_kh(k)}
$$

#### irreducible

$\exists\ t>0,\ \forall\ i,j,\ p_{ij}(t)>0\Leftrightarrow$ irreducible
if $\exists\ t_0>0,\ p_{ij}(t_0)>0$, then $\forall\ t>t_0,\ p_{ij}(t)>0$

### fundamental theorem

if the chain is finite or positive recurrent,
if the chain is irreducible and $S$ is positive recurrent, then $\exists$ unique stationary distribution and limiting distribution $\pi$

### continuous birth and death process

$$
\begin{cases}
    \lambda_x=q_{x,x+1}\\
    \mu_x=q_{x,x-1}
\end{cases}
$$

#### pure birth

$$
\mu_x=0\\[12pt]
p_{xy}(t)=\lambda_{y-1}\int_0^1e^{-\lambda_y(t-s)}p_{x,y-1}\mathrm{d}s\\[12pt]
p_{x,x+1}(t)=\begin{cases}
    \frac{\lambda_x}{\lambda_{x+1}-\lambda_x}(e^{-\lambda_xt}-e^{-\lambda_{x+1}t})&\lambda_{x+1}\neq\lambda_x\\[12pt]
    \lambda_xte^{-\lambda_xt}&\lambda_{x+1}=\lambda_x
    \end{cases}
$$

#### recurrence

$$
\sum_{x=1}^\infty\frac{\mu_1\mu_2\cdots\mu_x}{\lambda_1\lambda_2\cdots\lambda_x}=\begin{cases}
    \infty&\text{recurrent}\\
    <\infty&\text{transient}
    \end{cases}
$$

### Poisson process

continuous time Stochastic process $\{N(t),\ t\geq0\}$ with parameter (rate) $\lambda>0$, and

- $N(0)=0$
- $N(t+s)-N(s)\sim Poisson(t\lambda)$
- $N(t)$ has independent increment

$$
N(t_1)-N(t_0),\cdots,N(t_n)-N(t_{n-1})
$$
where $t_0<t_1<\cdots<t_n$

$\Rightarrow$
$$
N(t_1+s_1)-N(s_1)+N(t_2+s_2)-N(s_2)\sim Exp((t_1+t_2)\lambda)
$$

#### inter arrival time $T_i$

the time between the occurrence of the $(i-1)$th event and the $i$th
$$
T_i\sim Exp(\lambda)
$$

#### arrival time $S_i$

the time of the occurrence of the $i$th event
$$
S_i=\sum_{j=1}^iT_j\\[12pt]
S_i\sim Gamma(i,\lambda)
$$

#### alternative definition using exponential distribution

sum of i.i.d. $Exp(\lambda)$

#### combine independent Poisson process

$$
N_1(t)+N_2(t)
$$
is Poisson process with $\lambda_1+\lambda_2$

#### splitting Poisson process

$$
N(t)=N_1(t)+N_2(t)
$$
with every occurrence go to $N_1(t)$ with probability $p$ and go to $N_2(t)$ with probability $(1-p)$, then $N_1(t)$ is Poisson process with $p\lambda$, $N_2(t)$ is Poisson process with $(1-p)\lambda$, the distribution between them is binomial

#### $1$ occurrence time spot

$$
P(S_1<s|N(t)=1)=\frac{s}{t}\qquad s<t
$$

#### many occurrence time spot

let $U_i$ be i.i.d. $\sim U(0,t)$
let $U_{(i)}$ denote them in ascending order
$$
f(S_1,S_2,\cdots,S_n)=\frac{n!}{t^n}
$$

##### proof

let $S_i$ be occurrence time for $N(t)$
given $N(t)=n$
$$
P(s_1<S_1<s_1+\delta,\cdots|N(t)=n)=\frac{P(s_1<S_1<s_1+\delta,\cdots,N(t)=n)}{P(N(t)=n)}\\[12pt]
=\frac{P(N(t-n\delta)=0)[P(N(\delta)=1)]^n}{P(N(t)=n)}=\frac{\delta^nn!}{t^n}\\[12pt]
f(S_1,\cdots)=\lim_{\delta\rightarrow0}\frac{\delta^nn!}{\delta^nt^n}=\frac{n!}{t^n}
$$

#### definition of $o(h)$

$f(x)$ is $o(h)$ if
$$
\lim_{x\rightarrow0}\frac{f(x)}{x}=0
$$

#### alternative definition

- $N(0)=0$
- $N(t)$ has independent increment
- $P(N(t+h)-N(t)=1)=\lambda h+o(h)$
- $P(N(t+h)-N(t)\geq2)=o(h)$

##### proof

- take the derivative of $P(N(t)=0)$
- prove $T_2,\cdots$ are exponential by induction
- prove $S_i$ are gamma using $T_i$

### property of Stochastic process

for Stochastic process $X(t),(t\geq0)$

- mean function

$$
\mu_X(t)=E[X(t)]
$$

- covariance function (auto-covariance function)

$$
r_X(t,s)=Cov(X(t),X(s))
$$
all the property of covariance apply to covariance function

#### second order stationary process

$$
\forall\ \tau,\ Y(t)=X(t+\tau),\\[12pt]
\begin{cases}
    \mu_Y=\mu_X\\[12pt]
    r_Y(s,t)=r_X(s,t)
    \end{cases}\\[12pt]
\Leftrightarrow\begin{cases}
    E[X(t)]=E[X(t+\tau)]\quad\forall\ \tau\\[12pt]
    E[X(t)X(s)]=f(t-s)
    \end{cases}\\[12pt]
$$

### Gaussian process

Stochastic process $X(t),(t\geq0)$
$$
a_1X(t_1)+a_2X(t_2)+\cdots+a_nX(t_n)\sim N\\[12pt]\qquad\forall\ 0\leq t_1<t_2<\cdots<t_n,\ a_1,a_2,\cdots,a_n\in\R,\ n=1,2,\cdots\\[12pt]
\Rightarrow ((X(t_1),\cdots))\text{ is multivariate normal}\\[12pt]
\text{Gaussian processes with the same }\mu,\sigma,r(s,t)\Leftrightarrow X(t)\stackrel{d}=Y(t)
$$

#### multivariate normal distribution

random variable $X_1,X_2,\cdots,X_k$
$$
a_1X_1+a_2X_2+\cdots\sim Normal\quad\forall\ a_1,a_2,\cdots\in\R
$$

- joint density function
is determined by
    - $$

\bar{\mu}=(\mu_1,\mu_2,\cdots)
$$
    - covariance matrix $V$
    $$
    V_{ij}=Cov(X_i,X_j)
    $$

$$
f(X_1,X_2,\cdots)=\frac{1}{(\sqrt{2\pi})^k\sqrt{|\det V|}}\exp\left\{-\frac{(\bar{X}-\bar{\mu})^TV^{-1}(\bar{X}-\bar{\mu})}{2}\right\}
$$
- covariance and independence
normal random variable $X,Y$ and $Cov(X,Y)=0\Rightarrow$ independence

### Brownian motion
#### standard Brownian motion
continuous time Stochastic process $W(t),(t\geq0)$
- $P(W(0)=0)=1$
- Stationary increment
$$
W(t+s)-W(s)\sim N(0,\sigma^2=t)
$$
- independent increment
- $P($function $t\mapsto W(t)$ is continuous$)=1$
#### covariance function

$$
r_W(s,t)=\min\{s,t\}
$$
#### connection between Brownian motion and discrete random walk
sum $S(n)$ of $n$ random walk $X_1,\cdots,X_n$
$$
S(n)=\begin{cases}
    0&n=0\\[12pt]
    \sum_{i=1}^nX_i&n>0
    \end{cases}\\[12pt]
$$
is discrete, but
$$
\tilde S(t)=\begin{cases}
    S(t)&t\in\N^*\\[12pt]
    S(\lfloor t\rfloor)+X_{\lfloor t\rfloor+1}(t-\lfloor t\rfloor)&t\notin\N^*
    \end{cases}
$$
is continuous, can approximate Brownian motion after scaling and limiting using
$$
S_t^{(n)}=\frac{\tilde S(nt)}{\sqrt{n}}\stackrel{\cdots}\rightarrow W(t)
$$

#### relation between Gaussian process and Brownian motion
standard Brownian motion $\Leftrightarrow$ Gaussian process $X(t)$ that
- $P(X(0)=0)=1$
- $\mu_X(t)=0\quad\forall\ t\geq0$
- $r_X(t,s)=\min\{s,t\}\quad\forall\ s,t\geq0$
- continuous path
$P($function $t\mapsto X(t)$ is continuous$)=1$

#### transformation of Brownian motion
standard Brownian motion $W(t)\Rightarrow$ the following are standard Brownian motion $(t\geq0)$
- reflection $\quad-W(t)$
- new start $\quad W(t+s)-W(s)$
- scaling $\quad\frac{W(at)}{\sqrt{a}}$
- Gaussian $\quad X(t)=t\cdot W(\frac{1}{t})\quad(X(0)=0)$

#### hitting time
first time reaching $a$
$$
T_a=\min\{t:W(t)=a\}
$$
- usage
$$
P(W(t)>a|T_a<t)=P(W(t)<a|T_a<t)=\frac{1}{2}\\[12pt]
\Rightarrow P(T_a<t)=2P(W(t)>a)\\[12pt]
f_{T_a}(t)=\frac{1}{\sqrt{2\pi t^3}}exp\left\{
    -\frac{a^2}{2t}
    \right\}\\[12pt]
\Rightarrow \lim_{t\rightarrow\infty}P(T_a<t)=1,E[T_a]=\infty
$$

---

## some distributions

### Beta random variables
$X\sim Beta(a,b)$
$$
\begin{align*}
f(x)=\begin{cases}
\frac{x^{\alpha-1}(1-x)^{\beta-1}}{\Beta(\alpha,\beta)}\qquad &0<x<1\\
0 &otherwise
\end{cases}
\end{align*}
$$

#### Beta function
$$
\Beta(\alpha,\beta)
=\int_0^1\theta^{\alpha-1}(1-\theta)^{\beta-1}\,\mathrm{d}\theta
=\frac{(\alpha-1)!(\beta-1)!}{(\alpha+\beta-1)!}
$$

### exponential random variable
$X\sim Exp(\lambda)$
$$
f_X(x)=f(x)=\begin{cases}
    \lambda e^{-\lambda x}&x>0\\
    0
    \end{cases}\\[12pt]
\int_0^\infty\lambda e^{-\lambda x}\,\mathrm{d}x=1\\[12pt]
P(X\geq t)=e^{-\lambda t}\\[12pt]
M_X(t)=\frac{\lambda}{\lambda-t}\\[12pt]
E[X]=M'_X(0)=\frac{1}{\lambda}\\[12pt]
Var(X)=M''(0)-(M'(0))^2=\frac{1}{\lambda^2}
$$

#### memory-less property
$$
P(X>t+s\ |\ X>t)=P(X>s)
$$

#### sum of $n$ i.i.d. exponential distribution is gamma distribution
$$
f_{S_n}(x)=\lambda e^{-\lambda x}\frac{(\lambda x)^{n-1}}{(n-1)!}
$$
proved by induction

#### comparison between $X_1\sim Exp(\lambda_1)$ and $X_2\sim Exp(\lambda_2)$
$$
P(X_1<X_2)=\frac{\lambda_1}{\lambda_1+\lambda_2}
$$

#### comparison between $X_1,X_2\cdots\sim Exp$ with parameter $\lambda_1,\lambda_2,\cdots$
$$
P(X_i=min)=\frac{\lambda_i}{\sum_i\lambda_i}
$$

#### minimum of $n$ exponential distribution with $\lambda_i$'s
$$
V\sim Exp(\sum_i\lambda_i)
$$

### Gamma distribution
$X\sim Gamma(\alpha,\lambda)$
$$
f(x)=\begin{cases}
    \frac{\lambda^\alpha x^{\alpha-1}}{\Gamma(\alpha)}e^{-\lambda x}&x\geq0\\
    0&x<0
    \end{cases}\\[12pt]
E[X]=\frac{\alpha}{\lambda}\\[12pt]
Var(X)=\frac{\alpha}{\lambda^2}
$$

### Poisson distribution
$X\sim Poisson(\lambda)$
$$
p_X(k)=e^{-\lambda}\frac{\lambda^k}{k!}\\[12pt]
E[X]=Var(X)=\lambda
$$

### bivariate normal distribution
#### joint density
$$
\mu_x,\mu_y,\sigma_x>0,\sigma_y>0,-1<\rho<1\\[10pt]
f(x,y)=\frac{1}{2\pi\sigma_x\sigma_y\sqrt{1-\rho^2}}e^{-\frac{1}{2(1-\rho^2)}\left[(\frac{x-\mu_x}{\sigma_x})^2+(\frac{y-\mu_y}{\sigma_y})^2-2\rho\frac{(x-\mu_x)(y-\mu_y)}{\sigma_x\sigma_y}\right]}
$$
#### marginals
$$
X\sim N(\mu_x,\sigma_x^2)\\[10pt]
Y\sim N(\mu_y,\sigma_y^2)
$$

#### conditionals
$$
(X|Y=y)\sim N\left(\mu_x+\rho\frac{\sigma_x}{\sigma_y}(y-\mu_y),\sigma^2=\sigma_x^2(1-\rho^2)\right)\\[10pt]
(Y|X=x)\sim N\left(\mu_y+\rho\frac{\sigma_y}{\sigma_x}(x-\mu_x),\sigma^2=\sigma_y^2(1-\rho^2)\right)\\[10pt]
\rho=Corr(X,Y)=\frac{Cov(X,Y)}{\sigma_x\sigma_y}\\[10pt]
X,Y\text{ independent}\Leftrightarrow Cov(X,Y)=0
$$
