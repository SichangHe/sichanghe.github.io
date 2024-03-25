<!-- toc -->
# Differential Equation

an equation that contains an unknown function and one or more of its derivatives.

- order\
    highest derivative
- solution\
    function that satisfy the equation
- initial condition
- initial value problem

## direction field

sketch lines as a grid with direction from derivative from the equation

### Euler's method

$$
y_{n+1}=y_n+hy'_n
$$

- $h$ step size

# first order equation

## separable equation

# below old class note
<!-- todo: organize -->

# ordinary differential equation ODE

- general form
$$F(x,y,y',y'',\cdots,y^{(n)})=0$$

## order of differential equation

the order of the highest order derivative

## solution

any function that satisfy the equation

### general solution

collection of all solution

### initial value problem

- initial condition
$$y(x_0)=a_0,y'(x_0)=a_1,\cdots\qquad\text{at }x_0\in I$$

use the general solution and the initial condition

## direction field

$$
y'=f(x,y)
$$

## solving first-order differential equation

### numerical approximation

- Euler's method
$$
y(x_0+h)\approx y_0+hf(x_0,y_0)
$$
example code

```
f[x0_, y0_] := x0 y0
step[{x0_, y0_}] := {x0 + 0.01, y0 + 0.01 f[x0, y0]}
{x100, y100} = Nest[step, {1, 1}, 100]
```

### separable equation

use separation of variable
$$
y'=g(x)p(y)
$$

1. consider $p(y)=0$
1. integrate both side
$$
\int \frac{\mathrm{d}y}{p(y)}=\int g(x)\mathrm{d}x
$$

- explicit solution
- implicit solution
relationship between variable

#### $p(y)=y$

$$
y'=yg(x)\\
\Rightarrow y=Ae^{G(x)}
$$

### linear equation

$$
a_1(x)y'+a_0(x)y=b(x)
$$
where $a_1(x),a_0(x),b(x)$ are continuous, $a_1(x)\neq0$

#### standard form

$$
y'+P(x)y=Q(x)
$$
multiply both side to construct chain rule form
$$
\text{let }\mu'(x)=\mu(x)P(x)\quad\Leftarrow \mu(x)=Ae^{\int P(x)\mathrm{d}x}
\\[12pt]
\Rightarrow y'\mu(x)+y\mu'(x)=(y\mu(x))'=\mu(x)Q(x)
$$
where $\mu(x)$ is the integration factor

## substitution

### Bernoulli equation

$$
\frac{\mathrm{d}y}{\mathrm{d}x}+P(x)y=Q(x)y^n
$$

#### solution

substitution
$$
v=y^{1-n}
$$
reduce the Bernoulli equation to linear equation
$$
\frac{\mathrm{d}u}{\mathrm{d}x}+(1-n)Pu=(1-n)Q
$$

### Ricatti equation

$$
\frac{\mathrm{d}y}{\mathrm{d}x}=P(x)y^2+Q(x)y+R(x)
$$

#### solution

- one solution $u(x)$
- substitution $y=u+\frac{1}{v}$ reduce the Ricatti equation to linear equation
$$
\frac{\mathrm{d}v}{\mathrm{d}x}+(2Pu+Q)v=-P
$$

## existence and uniqueness theorem

$f(x,y)$ is continuous on $R=[x_0-a,x_0+a]\times[y_0-b,y_0+b]$ and satisfy Lipschitz condition
$$
\Rightarrow\exists\ \delta>0,\quad\begin{cases}
    y'=f(x,y)\\
    y(x_0)=y_0
\end{cases}\text{ has unique solution }y(x)\text{ for }x\in[x_0-\delta,x_0+\delta]
$$

### Lipschitz condition

$$
\exists\ K>0,\quad|f(x,y_1)-f(x,y_2)|\leq K|y_1-y_2|\quad\forall\ (x,y_1),(x,y_2)\in R
\\[12pt]
\Leftarrow\quad\frac{\partial f}{\partial y}\text{ is continuous (therefore bounded) on closed interval }R
$$

### metric space $(X,d)$

$\forall\ g,h,k\in X$

1. $d(g,h)\geq0$
2. $d(g,h)=d(h,g)$
3. $d(g,h)\leq d(g,u)+d(u,h)$

- $d$ denote distance
- can be defined using
$$
\lVert g-h\rVert=\max_{x\in [x_0-\delta,x_0+\delta]}|g(x)-h(x)|
$$

#### limit

sequence $\{g_n\}$ converge to limit $y$ in $X$
$$
\Leftrightarrow\lim_{n\rightarrow\infty}d(g_n,y)=0
$$

- the limit is unique

#### Cauchy sequence

$\forall\ \varepsilon>0,\exists\ N,\quad\forall\ n,m≥N,d(g_n,g_m)<\varepsilon$

#### complete metric space

every Cauchy sequence converge to some point in $X$

### fixed point

`point` stand for function for operator

#### initial value problem integral form

for $y'=f(x,y)$
let operator $T$:
$$
T[g](x)=y_0+\int_{x_0}^xf(s,g(s))\mathrm{d}s
$$
then
$$
y(x)=T[y](x)\quad\Rightarrow T[y]=y
$$
$\Rightarrow y$ is a fixed point for operator $T$

#### Banach fixed point theorem

$X$ is **complete** metric space
$T:X\rightarrow X$ is a **contraction**
$\Rightarrow T$ has a unique fixed point in $X$

- contraction
$T:X\rightarrow X$ is a **contraction** if
$$
\exists\ k<1,\forall\ g,h\in X,\quad d(T[g],T[h])\leq Kd(g,h)
$$

#### Picard iteration

sequence $\{g_n\}$ where
$$
g_{n+1}=T[g_n]
$$
with $g_0(x)=y_0$
$$
\lim_{n\rightarrow\infty}g_n(x)=y(x)
$$

# one-dimensional (smooth) dynamical system

continuously differentiable function $\phi(t,x):\R\times\R\rightarrow\R$
$$
\begin{align*}
    &1.\ \phi(0,x_0)=x_0\quad\forall\ x_0\in\R
    \\[12pt]
    &2.\ \phi(t+s,x_0)=\phi(t,\phi(s,x_0))=\phi(s,\phi(t,x_0))\quad\forall\ t,s,x_0\in\R
\end{align*}
$$

- flow of dynamic system $\phi$

## autonomous equation

$$
x'(t)=f(x)
$$
assume $f$ satisfy condition of existence and uniqueness theorem

### time-shift immunity

if the solution of
$$
x'=f(x),x(0)=x_0
$$
is $x_1(t)$
then the solution of
$$
x'=f(x),x(t_0)=x_0
$$
is $x_2(t)=x_1(t-t_0)$

### equilibrium

$x_e\in\R$, $f(x_e)=0$

- asymptotically stable
$x$ move towards $x_e$ from both side
$\Leftarrow f'(x_e)<0$
- unstable
$x$ move away from $x_e$ from both side
$\Leftarrow f'(x_e)>0$

#### phase line

draw the sign graph of $f(x)$

#### linearization (approximate linear dynamic)

let $\lambda=f'(x_e),y=x-x_e$
$$
y'=\lambda y
\\[12pt]\Rightarrow
y=y_0e^{\lambda t}
$$

- $\lambda>0\Rightarrow$ blow up and unstable
- $\lambda<0\Rightarrow$ shrink down and asymptotically stable
- $\lambda=0\Rightarrow$ cannot linearize, need higher order

## differential equation to dynamical system

$$
\phi(t,x_0)=x(t)
$$
where $x'=f(x)$

## dynamical system to differential equation

$$
f(x)=\frac{\partial\phi}{\partial t}(0,x)
$$
and convert to initial value problem with autonomous equation

# discrete dynamical system

## map $p:\R\rightarrow\R$

$x_{k+1}=p(x_k)\quad\Rightarrow x_{k+t}=p^k(x_t)$

## invertible $p$

$x_{k-1}=p^{-1}(x_k)$

## fixed point

not change when apply $p$
$$
p(x_0)=x_0
$$

### stability

#### linearization

$$
q(y) = p(x_0 + y) − x_0
\approx\lambda y
\\[12pt]
\lambda=p'(x_0)
$$

- dynamics
$$
y_n=\lambda^n y_0
$$
- unstable
$\Leftarrow|\lambda|>1$
- asymptotically stable
$\Leftarrow|\lambda|<1$

## Poincaré map

### time-periodic non-autonomous system

$$
x'=f(t,x)
$$
where $f(t+T,x)=f(t,x)$

### periodic time-shift immunity

if the solution of
$$
x'=f(t,x),x(0)=x_0
$$
is $x_1(t)$
then the solution of
$$
x'=f(t,x),x(kT)=x_0\quad(k\in\Z)
$$
is $x_2(t)=x_1(t-kT)$

### Poincaré map for the system

define function $P:\R\rightarrow\R$:
$$
P(x_0)=x(T)
\\[12pt]
\Rightarrow
x(kT)=P^k(x_0)
$$
$\forall\ x_0\in\R$, let $x(t)$ be the solution to
$$
x'=f(t,x),x(0)=x_0
$$

### periodic solution

fixed point of Poincaré map
$$
P(x_0)=x_0
$$

#### stability

- asymptotically stable
$|\lambda|=|P'(x_0)|<1$
- unstable
$|\lambda|=|P'(x_0)|>1$

### example code

```
P[h_,x0_] := NDSolveValue[
x'[t] == x[t](1-x[t]) - h x[t] Sin[t] && x[0] == x0,
x[2 Pi], {t, 0, 2 Pi}]
```

# second-order linear equation

$$
a(x)y''+b(x)y'+c(x)y=f(x)
$$

## second-order homogeneous linear equation with constant coefficient

$$
ay''+by'+cy=0
$$

### solution

a linear combination of two solution $y_1(x),y_2(x)$ where $\frac{y_1(x)}{y_2(x)}$ is not constant (linearly independent)
$$
y(x)=c_1y_1(x)+c_2y_2(x)
$$

#### auxiliary equation

under the hood: try $y=e^{rx}$
$$
ar^2+br+c=0
$$

- $\Delta>0$ two distinct real root $r_1,r_2$
$$
y=c_1e^{r_1x}+c_2e^{r_2x}
$$
- $\Delta=0$ double real root $r_0$
two solution $y_1=e^{r_0x},y_2=xe^{r_0x}$
$$
y=(c_1+c_2x)e^{r_0x}
$$
- $\Delta<0$ two complex root $\alpha±i\beta$
$$
y=e^{\alpha x}(c_1\cos(\beta x)+c_2\sin(\beta x))
$$
    - alternatively
      $$
      y=Ae^{\alpha x}\cos(\beta x-\phi)
      $$
where
$$
A=\sqrt{c_1^2+c_2^2},\phi=\arg(c_1+ic_2)
$$
    - alternatively: real-valued solution
$$
y=ae^{(\alpha+i\beta)x}+\bar ae^{(\alpha-i\beta)x}\quad(a\in \mathbb C)
$$
        - complex-valued solution
$$
y=a_1e^{(\alpha+i\beta)x}+a_2e^{(\alpha-i\beta)x}\quad(a_1,a_2\in \mathbb C)
$$

## second-order non-homogeneous linear equation

$$
ay''+by'+cy=f(x)
$$

### solution

- let
$$
y_h(x)=y(x)-y_p(x)
$$
then $y_h(x)$ satisfy
$$
ay''+by'+cy=0
$$
- find one **particular solution** $y_p(x)$
therefore
$$
y(x)=c_1y_1(x)+c_2y_2(x)+y_p(x)
$$

### linear differential operator

given $g(x)$, $L[g](x)$
$$
L[g]=ag''+bg'+cg
$$

#### linear operator

apply operator $L$ on function $g(x)$
$$
L[g](x)=ag(x)''+bg(x)'+cg(x)
$$
$L$ linear $\Leftarrow$

- $L[g_1+g_2]=L[g_1]+L[g_2]$
- $L[\lambda g]=\lambda L[g]$

### find a particular solution

#### polynomial $f(x)$

use the degree of $f(x)$ as the degree of the particular solution

#### exponential $f(x)$

$$
f(x)=P(x)e^{\lambda x}
$$
where $P(x)$ is polynomial
same as the polynomial method but multiply the same exponential

- when $\lambda$ is one root of auxiliary equation, multiply the polynomial solution by $x$
- when $\lambda$ is double root of auxiliary equation, multiply the polynomial solution by $x^2$

#### trigonometric $f(x)$

$$
f(x)=P_1(x)e^{\lambda x}\cos(\mu x)+P_2(x)e^{\lambda x}\sin(\mu x)
$$
same as polynomial but degree needs to be the maximum between $P_1(x),P_2(x)$ and need two polynomial

- when $\lambda+i\mu$ is one root of auxiliary equation, multiply the polynomial solution by $x$

#### combination of above case

split $f(x)$ to $f_1(x),\cdots$ that match above case

# higher order differential equation

$n$-th order
$$
a_n(x)y^{(n)}+\cdots+a_0(x)y^{(0)}=f(x)
$$
where $a_i(x),f(x)$ are continuous on $I\subseteq\R$

## existence and uniqueness

above equation with $y(x_0)=y_0,\cdots,y^{(n-1)}(x_0)=y_{n-1}$
has unique solution $\Leftarrow\forall\ x\in I,a_i(x),f(x)$ are continuous, $a_n(x)≠0$

## system in matrix form

$$
M[y_1,\cdots,y_n](x_0)\ \vec c=\vec y_0\\[12pt]
\begin{bmatrix}
    y_1(x_0)&\cdots&y_n(x_0)\\
    \vdots&\ddots&\vdots\\
    y_1^{(n-1)}(x_0)&\cdots&y_n^{(n-1)}(x_0)
\end{bmatrix}
\begin{bmatrix}
    c_1\\\vdots\\c_n
\end{bmatrix}
=\begin{bmatrix}
    y_0\\\vdots\\y_{n-1}
\end{bmatrix}
$$

### Wronskian

determinant
$$
W[y_1,\cdots,y_n]=\det M[y_1,\cdots,y_n]
$$

#### linear dependency and Wronskian

$y_1,\cdots,y_n$ linearly independent in $I$
$\Leftrightarrow\exist\ x_0\in I,W[y_1,\cdots,y_n](x_0)≠0$
$\Leftrightarrow\forall\ x\in I,W[y_1,\cdots,y_n](x)≠0$

- linearly dependent function
$y_1,\cdots,y_n$ linearly dependent in $I$
$\Leftarrow\exists\ \lambda_1,\cdots\lambda_m\in\R,\forall\ x\in I,\quad\lambda_1y_1(x)+\cdots\lambda_m y_m(x)=0$

## homogeneous linear equation with constant coefficient

$$
a_ny^{(n)}+\cdots+a_0y=0
$$

### auxiliary equation

$$
a_nr^n+\cdots+a_0=0
$$
$n$ complex root counting multiplicity

### general solution

linear combination of $n$ solution
time $x$ repeatedly if a solution has multiplicity $2$ or more

# autonomous planar system of differential equation

$$
x'=f(x,y)\\
y'=g(x,y)
$$
with respect to $t$

## initial value problem

$$
x(t_0)=x_0\\
y(t_0)=y_0
$$

- autonomous
$t$ can start wherever wanted, let $t_0=0$

## integral curve

parameterized curve of $(x(t),y(t))$

## velocity vector

$$
\frac{\mathrm{d}}{\mathrm{d}t}(x(t),y(t))=(f(x,y),g(x,y))
$$

## phase plane

$xy$-plane

- phase space
higher dimension

### phase portrait

phase plane with several solution

### equilibrium $(x_e,y_e)$

$$
f(x_e,y_e)=g(x_e,y_e)=0
$$

- equilibrium solution
$$
(x(t),y(t))=(x_e,y_e)
$$

## solution

- convert to differential equation with one variable
- conserved quantity / integral of motion
    - reduce to non-autonomous first order equation
$$
\frac{\mathrm dy}{\mathrm dx}=\frac{y'}{x'}=\frac{g(x,y)}{f(x,y)}
$$

# non-autonomous planar system

$$
x'=f(x,y,t)\\
y'=g(x,y,t)
$$
where $f,g$ are periodic in $t$ with period $T$

## periodic time-shift immunity

similar to periodic time-shift immunity in one dimension
if $\big(x_1(t),y_1(t)\big)$ is solution to
$$
x'=f(x,y,t),
y'=g(x,y,t)\\[6pt]
\big(x(0),y(0)\big)=(x_0,y_0)
$$
then $\big(x_2(t),y_2(t)\big)=\big(x_1(t-kT),y_1(t-kT)\big)$ is solution to
$$
x'=f(x,y,t),
y'=g(x,y,t)\\[6pt]
\big(x(kT),y(kT)\big)=(x_0,y_0)
$$

## Poincaré map for non-autonomous periodic dynamical system

$P:\R^2\rightarrow\R^2$
$$
P(x_0,y_0)=(x(T),y(T))\\[12pt]
\Rightarrow P^k(x_0,y_0)=(x(kT),y(kT))
$$

- also known as **stroboscopic map**

### example: mass on spring with external forcing

## forced duffing equation

$$
x'=y,\quad y'=-by+x-x^3+F\sin(\gamma t)
$$
period $\frac{2\pi}{\gamma}$

### Poincaré map for forced duffing equation

```
P[b_,F_,γ_][{x0_, y0_}]:=
 NDSolveValue[
     x'[t]==y[t]&&y'[t]==-by[t]+x[t]-x[t]^3+F Sin[γ t]&&x[0]==x0&&y[0]==y0,
     {x[2Pi/γ],y[2Pi/γ]},
     {t,0,2Pi/γ}
     ]
```

# chaos

sensitive dependence on initial condition

- two initial condition close to each other deviate exponentially fast
- the exact state of the system is fundamentally unpredictable though the system is deterministic
- chaotic attractor of the two initial condition look identical

## Poincaré map for autonomous system

### Henon-Heiles system

$$
\begin{aligned}
    x_1' &= y_1\\
    y_1' &= − x_1 − 2x_1x_2\\
    x_2' &= y_2\\
    y_2'&=−x_1^2 +x_2^2 −x_2
\end{aligned}
$$

- conserved quantity
$$
H=\frac{1}{2}(y_1^2+y_2^2)+\frac{1}{2}\left(
    x_1^2+x_2^2+2x_1^2x_2-\frac{2}{3}x_2^3
    \right)
$$
- hyperplane $\Sigma\in\R^4$
$$
\Sigma:x_1=0
$$
on $\Sigma$
$$
H=\frac{1}{2}(y_1^2+y_2^2)+\frac{1}{2}\left(
    x_2^2-\frac{2}{3}x_2^3
    \right)
$$
consider an initial condition on $\Sigma$ corresponding to value $h$ for $H$, when the solution reach $\Sigma$ again $h$ still conserve
$\Rightarrow$ it is enough to know $(x_2,y_2)$ to know the rest
$\Rightarrow$ define Poincaré map for $(x_2,y_2)$

```
poincareMap[h_][{x0_,y0_}]:=Module[{stopTime},
    NDSolveValue[
        x1'[t]==y1[t]
        &&y1'[t]==-x1[t]-2x1[t] x2[t]
        &&x2'[t]==y2[t]
        &&y2'[t]==-x1[t]^2-x2[t]+2[t]^2
        &&x1[0]==0
        &&y1[0]=Sqrt[2h-y0^2-x0^2+2/3 x0^3]
        &&x2[0]=x0
        &&y2[0]=y0
        &&WhenEvent[x1[t]==0&&y1[t]>0,stopTime=t;"StopIntegration"],
        {x2[stopTime],y2[stopTime]},
        {t,0,Infinity}
        ]
    ]
```

# linear system

$$
\vec x'=A(t)\vec x+\vec f(t)
$$

## planar linear system

$$
x_1'=a_{11}(t)x_1+a_{12}(t)x_2+f_1(t)\\
x_2'=a_{21}(t)x_1+a_{22}(t)x_2+f_2(t)
$$
where $a_{ij}(t),f_i(t),i,j\in\{1,2\}$ continuous
$$
\vec x=\begin{bmatrix}
    x_1\\x_2
\end{bmatrix},
\vec f(t)=\begin{bmatrix}
    f_1(t)\\f_2(t)
\end{bmatrix},
A(t)=\begin{bmatrix}
    a_{11}(t)&a_{12}(t)\\
    a_{21}(t)&a_{22}(t)
\end{bmatrix}
$$

## homogeneity

- $\vec f(t)\equiv\vec0\Rightarrow$ homogeneous
- otherwise $\Rightarrow$ non-homogeneous

## convert linear differential equation to linear system

linear differential equation
$$
y^{(n)}+p_{n-1}(t)y^{(n-1)}+\cdots+p_0(t)y=g(t)
$$
define
$$
x_1=y\\
x_2=y'\\
\vdots\\
x_n=y^{(n-1)}
$$
get a linear system

## existence and uniqueness

If $A(t)$, $\vec f(t)$ are continuous functions in an interval $I ⊆ R$ and $t_0 ∈ I$ then for any initial vector $\vec x_0 ∈ R_n$ there exists a unique solution of
$\vec x' = A(t)\vec x + \vec f(t)$ in $I$ that satisfies the initial condition $\vec x(t_0) = \vec x_0$.

## linearity

linear combination of solution are also solution

## linear dependency

linearly dependent vector
$$
\exists\ c_1,c_2,\cdots,c_m,\sum_{i=1}^m(c_i^2)≠0,\quad\forall\ t\in I,\quad c_1\vec x_1(t)+\cdots+c_m\vec x_m(t)\equiv\vec0
$$

## Wronskian

for $n$ solution $\vec x_1,\cdots,\vec x_n$
$$
X(t)=\begin{bmatrix}
    \vec x_1&\cdots&\vec x_n
\end{bmatrix}
=\begin{bmatrix}
    x_{1,1}&\cdots&x_{n,1}\\
    \vdots&\ddots&\vdots\\
    x_{1,n}&\cdots&\vec x_{n,n}
\end{bmatrix}\\[12pt]
W[\vec x_1,\cdots,\vec x_n](t)=\det X(t)
$$

### linear dependency and Wronskian

- solution $\vec x_1(t),\cdots,\vec x_n$ are linearly dependent in $I$
- $\Leftrightarrow\forall\ t\in I,\quad W[\vec x_1,\cdots,\vec x_n](t)=0$
- $\Leftrightarrow\exists\ t_0\in I,\quad W[\vec x_1,\cdots,\vec x_n](t_0)=0$

### fundamental solution

collection of $n$ *linearly independent* solution $\vec x_1,\cdots,\vec x_n$

### fundamental matrix

corresponding matrix $X(t)=\begin{bmatrix}
    \vec x_1(t)&\cdots&\vec x_n(t)
\end{bmatrix}$

- invertible
- general solution for the linear system
$$
\vec y(t)=c_1\vec x_1(t)+\cdots+c_n\vec x_n(t)
=X(t)\vec c
$$
- $X'(t)=A(t)X(t)$
- solution for the initial value problem with $\vec x(t_0)=\vec x_0$
$$
\vec y(t)=X(t)X(t_0)^{-1}\vec x_0
$$
- $\forall\ Y(t)$ that is another fundamental matrix
$$
\exists\ C,\quad Y(t)=X(t)C
$$
    - $\det C≠0$
- $\forall\ C,\det C≠0,\quad X(t)C$ is a fundamental matrix
- let $Y(t)=X(t)X(t_0)^{-1}$, then $Y(t_0)=\mathbb I$
$$
\vec y(t)=Y(t)\vec x_0
$$

## linear system with constant coefficient

$$
\vec x'=A\vec x
$$
where $A\in\R^{n\times n}$ is constant

### find a solution

$$
\vec x(t)=e^{rt}\vec u
$$
where $\vec u$ satisfy
$$
(A-r\mathbb{I})\vec u=\vec0
$$

### eigenvalue problem

$\vec u$ is the solution to **eigenvalue equation**
$\vec u$ is non-zero eigenvector corresponding to $r\Leftarrow r$ is a root of **characteristic polynomial**
$$
p(r)=\det(A-r\mathbb{I})
$$

- $r$ is a complex eigenvalue $\Rightarrow \bar r$ is eigenvalue
    - $\vec u$ is eigenvector corresponding to $r\Rightarrow\bar{\vec u}$ is eigenvector corresponding to $\bar r$

### linearly independent eigenvector and general solution

$A\in\R^{n\times n}$ has *linearly independent* eigenvector $\vec u_1,\cdots,\vec u_n$ corresponding to *real* eigenvalue $r_1,\cdots,r_n$
$\Rightarrow$ general solution for $\vec x'=A\vec x$ is
$$
\vec x(t)=c_1e^{r_1t}\vec u_1+\cdots+c_ne^{r_nt}\vec u_n
$$

#### real distinct eigenvalue

$r_1,\cdots,r_m(1≤m≤n)$ are real distinct eigenvalue of $A\\\Rightarrow$ corresponding eigenvector $\vec u_1,\cdots,\vec u_n$ are linearly independent
$\Rightarrow$ a fundamental matrix is
$$
\begin{bmatrix}
    e^{r_1t}\vec u_1&\cdots&e^{r_nt}\vec u_n
\end{bmatrix}
$$

#### complex eigenvalue

eigenvalue $r=\alpha+i\beta$ with eigenvector $\vec u=\vec a+i\vec b$
eigenvalue $\bar r$ with eigenvector $\bar{\vec u}$
$\Rightarrow$ solution
$$
\vec x_1(t)=e^{\alpha t}(\cos(\beta t)\vec a-\sin(\beta t)\vec b)\\[6pt]
\vec x_2(t)=e^{\alpha t}(\sin(\beta t)\vec a+\cos(\beta t)\vec b)
$$

# matrix exponential

$$
e^A=\mathbb{I}+A+\frac{1}{2!}A^2+\cdots=\sum_{k=0}^\infty\frac{1}{k!}A^k
$$

## property

- $\forall\ A$, series $e^A$ converge
- $e^{\mathbb O}=\mathbb{I}$
- $\det e^A=e^{\text{tr}A}>0$
    - trace of $A$
  $$
  \text{tr}A=\sum_{i=1}^na_{ii}=\sum_{i=1}^n\lambda_i
  $$
- $AB=BA\Rightarrow e^{A+B}=e^Ae^B=e^Be^A$
- $e^Ae^{-A}=\mathbb{I}$
- $A\vec u=r\vec u\Rightarrow e^A\vec u=e^r\vec u$
- $e^{U^{-1}AU}=U^{-1}e^AU$
- $e^{\mathbb{I}t}=e^t\mathbb I$
- $e^{A(t+s)}=e^{At}e^{As}$

## diagonal matrix

diagonal matrix
$$
R=\begin{bmatrix}
    a&0&\cdots\\
    0&b&\cdots\\
    \vdots&\vdots&\ddots
\end{bmatrix}\\[12pt]
\Rightarrow
e^R=\begin{bmatrix}
    e^a&0&\cdots\\
    0&e^b&\cdots\\
    \vdots&\vdots&\ddots
\end{bmatrix}
$$

## matrix exponential and linear system

unique solution to the initial value problem $\vec x' = A\vec x$ with $\vec x(t_0) = \vec x_0$ is
$$
\vec x(t)=e^{A(t-t_0)}\vec x_0
$$

- derivative
$$
\frac{\mathrm d}{\mathrm dt}(e^{At})=Ae^{At}=e^{At}A
$$

### exponential matrix as fundamental matrix

linear system $\vec x'=A\vec x,\vec x(0)=\vec x_0$ has fundamental matrix $X(t)$
$$
\Rightarrow
\vec x(t)=X(t)X(0)^{-1}\vec x_0=e^{At}\vec x_0\\[12pt]
\Rightarrow e^{At}=X(t)X(0)^{-1}
$$

## generalized eigenvector

a non-zero vector $\vec u\in \mathbb C^n$
$\exists\ r\in \mathbb C,$ **generalized eigenvector** of $A$ associated with $r$, $m\in N^+$
$$
(A-r\mathbb I)^m\vec u=\vec0
$$

- $m=1\Rightarrow$ generalized eigenvector are also standard eigenvector
- $r$ is eigenvalue of $A$ with eigenvector $\max_m(A-r\mathbb I)^m\vec u≠\vec0$

### generalized eigenvector given characteristic polynomial

$A\in\R^{n\times n}$ has characteristic polynomial
$$
p(r)=(r-r_1)^{m_1}\cdots(r-r_k)^{m_k}\quad(m_1+\cdots+m_k=n)
$$
$\Rightarrow\forall\ j=1,\cdots,k,\ \exists$ ***linearly independent*** generalized eigenvector $\vec u_{j,1},\cdots,\vec u_{j,m_j}$
$$
\forall\ l=1,\cdots,m_j,\quad(A-r_j\mathbb I)^{m_j}\vec u_{j,l}=\vec0
$$

## compute $e^{At}$

- find generalized eigenvector $\vec u_1,\cdots,\vec u_n$
- compute solution for $\vec x(t)=e^{At}\vec u_j\ (j=1,\cdots,n)$
- fundamental matrix $X(t)=\begin{bmatrix}
    \vec x_1(t)&\cdots&\vec x_n(t)
\end{bmatrix}$
- $e^{At}=X(t)X(0)^{-1}$

# planar linear system

$$
\vec x'=A\vec x
$$
where $A\in\R^{2\times2},\vec x=\begin{bmatrix}
    x_1\\x_2
\end{bmatrix}$

## characteristic polynomial

$$
\begin{aligned}
p(r)&=\det(A-r\mathbb I)=r^2-r\text{tr}A+\det A\\
&=r^2-Tr+D\\
\Delta&=T^2-4D
\end{aligned}
$$
![equilibrium type with different T-D](linear-system-T-D-relation.png)

### real distinct eigenvalue $\Delta>0$

$$
U=\begin{bmatrix}
    \vec u_1&\vec u_2
\end{bmatrix},
R=\begin{bmatrix}
    r_1&0\\
    0&r_2
\end{bmatrix}
\\[12pt]
\Rightarrow
AU=\begin{bmatrix}
    \vec u_1&\vec u_2
\end{bmatrix}\begin{bmatrix}
    r_1&0\\
    0&r_2
\end{bmatrix}
=UR
\\[12pt]
\Rightarrow A=URU^{-1}
\\[6pt]
\Rightarrow e^{At}=Ue^{Rt}U^{-1}
$$

- real eigenvalue
$$
T±\sqrt{T^2-4D}\over2
$$

#### transformation

define $\vec z$ by
$$
\vec x=U\vec z
\\[12pt]\Rightarrow
\vec z'=R\vec z
\\\Rightarrow
z_1'=r_1z_1,z_2'=r_2z_2
\\[6pt]\Rightarrow
\begin{cases}
z_1(t)=z_1(0)e^{r_1t}\\
z_2(t)=z_2(0)e^{r_2t}
\end{cases}
$$

- case 1a. $0<r_1<r_2\quad$ (or $D>0,T>0$)
all arrow point away from origin
    - unstable node
- case 1b. $r_2<r_1<0\quad$ (or $D>0,T<0$)
all arrow point towards origin
    - stable node
- case 1c. $r_1<0<r_2\quad$ (or $D<0$)
all arrow point towards origin on $z_1$-axis, point away from origin on $z_2$-axis
    - saddle
- case 1d. $r_1=0<r_2\quad$ (or $D=0,T>0$)
all arrow point away from $z_1$-axis parallel to $z_2$-axis
- case 1e. $r_2<0=r_1\quad$ (or $D=0,T<0$)
all arrow point towards $z_1$-axis parallel to $z_2$-axis

### complex conjugate eigenvalue $\Delta<0$

conjugate eigenvalue $\alpha±i\beta$ with corresponding eigenvector $\vec a±i\vec b$
$$
U=\begin{bmatrix}
    \vec a&\vec b
\end{bmatrix},
R=\begin{bmatrix}
    \alpha&\beta\\
    -\beta&\alpha
\end{bmatrix}
\\[12pt]\Rightarrow
AU=UR
\\[12pt]\Rightarrow
A=URU^{-1}
\\[6pt]
\Rightarrow e^{At}=Ue^{Rt}U^{-1}
$$
where
$$
e^{Rt}=e^{\alpha t}\begin{bmatrix}
    \cos(\beta t)&\sin(\beta t)\\
    -\sin(\beta t)&\cos(\beta t)
\end{bmatrix}
$$

- complex eigenvalue
$$
T±i\sqrt{4D-T^2}\over2
$$

#### polar coordinate transformation

$$
\vec x=U\vec z\\
\begin{cases}
    r=\sqrt{z_1^2+z_2^2}\\
    \theta=\arctan(\frac{z_2}{z_1})
\end{cases}
\\[12pt]\Rightarrow
\begin{cases}
    \theta'=-\beta\\
    r'=\alpha r
\end{cases}
$$

- case 2a. $\alpha>0\quad$ (or $T>0$)
arrow rotate around origin moving away
    - unstable spiral
- case 2b. $\alpha<0\quad$ (or $T<0$)
arrow rotate around origin moving towards
    - stable spiral
- case 2c. $\alpha=0\quad$ (or $T=0$)
solution are closed curve with period $T={2π\over\beta}$
    - center

##### rotation direction

- rotation direction on $z_1,z_2$-plane
    - $\beta>0$
  $\Rightarrow\theta'<0$, clockwise
- rotation direction on $x_1,x_2$-plane
    - $\det U>0$
  same direction as on $z_1,z_2$-plane

### real repeated eigenvalue $\Delta=0$

generated eigenvalue of $A$
$$
U=\begin{bmatrix}
    \vec u_1&\vec u_2
\end{bmatrix}
$$

- real eigenvalue
$$
r_0=T\over2
$$
- case c1. $A=r_0\mathbb I\quad$ (or both $\vec u_1$ and $\vec u_2$ are eigenvalue of $A$)
$$
\vec x=\begin{bmatrix}
  c_1e^{r_0t}\\c_2e^{r_0t}
\end{bmatrix}
$$
all arrow point away from origin
    - unstable node
- case c2. $A≠r_0\mathbb I\quad$ (or only $\vec u_1$ is eigenvalue of $A$)
$$
\vec x=\begin{bmatrix}
  (c_1+c_2t)e^{r_0t}\\c_2e^{r_0t}
\end{bmatrix}
$$
all arrow point away from origin
    - turn to the right with $c_2>0$
    - turn to the left with $c_2<0$
    - unstable

# almost linear system

- almost linear system $\vec x'=\vec f(\vec x)$ at $\vec x_e$
    - $\vec x_e$ is an equilibrium of $\vec x'=\vec f(\vec x)$
    - $$
      \vec y'=\vec g(\vec y)
      $$
      is an almost linear system at the origin
      where $\vec y=\vec x-\vec x_e,\vec g(\vec y):=\vec f(\vec x_e+\vec y)\\[6pt]$
- almost linear system $\vec x'=\vec f(\vec x)$ at the origin
    - $\vec0$ is an equilibrium of $\vec x'=\vec f(\vec x)$
    - $\vec f$ is continuous around $\vec0$
    - $$
      \frac{\lVert\vec f(\vec x)-A\vec x\rVert}{\lVert\vec x\rVert}\rightarrow0\text{ as }\lVert\vec x\rVert\rightarrow0
      $$
      $\Leftarrow\displaystyle\frac{∂f_i}{∂x_j}$ are continuous near $(0,0)\\[12pt]$
    - $A=D\vec f(\vec0)$
    - $\det A≠0$
- jacobian of $\vec f(\vec x)=\begin{bmatrix}
    f_1(x_1,x_2)\\
    f_2(x_1,x_2)
\end{bmatrix}$
$$
D\vec f(\vec x)=\begin{bmatrix}
    \displaystyle\frac{∂f_1}{∂x_1}(x_1,x_2)
    &\displaystyle\frac{∂f_1}{∂x_2}(x_1,x_2)
    \\[12pt]\displaystyle\frac{∂f_2}{∂x_1}(x_1,x_2)
    &\displaystyle\frac{∂f_2}{∂x_2}(x_1,x_2)
\end{bmatrix}
$$

## planar system

$$
\vec x'=\vec f(\vec x)
$$

### equilibrium

point $\vec x_e,\vec f(\vec x_e)=\vec 0$

#### stability

- stable
$\forall\ \varepsilon>0,\ \exists\ \delta>0,\ \quad\forall\ \vec x(0)\in B_\delta(\vec x_e),\forall\ t≥0,\ \vec x(t)\in B_\varepsilon(\vec x_e)$
in English, given a bigger disk, one can always find a smaller disk, so that if you start from the smaller disk, you don't go out of the bigger disk
- asymptotically stable
stable and
$\exists\ \eta>0,\quad\forall\ \vec x(t),\vec x(0)\in B_\eta(\vec x_e),\quad\lVert\vec x(t)-\vec x_e\rVert\rightarrow0\text{ as }t\rightarrow0$
- unstable
not stable

##### open disk

$$
B_\delta(\vec x)=\{\vec y\in\R^2:\lVert\vec y-\vec x\rVert_2<\delta\}
$$

## linearization theorem (Hartman-Grobman theorem)

transform the dynamics of system $\vec x'=\vec f(\vec x)$
to the dynamics of system $\vec y'=A\vec y$
where $A=D\vec f(\vec x_e)$

- system $\vec x'=\vec f(\vec x)$ is almost linear at $\vec x_e$
- $\vec x_e$ is hyperbolic
- $\Rightarrow\exists$ coordinate transformation $\vec y=\phi(\vec x)$ near $\vec x_e$, $\phi(\vec x_e)=\vec0$

### hyperbolic linear system

#### hyperbolic matrix

all eigenvalue have non-zero real part

#### hyperbolic equilibrium

equilibrium $\vec x_e$ of $\vec x'=\vec f(\vec x)$
$D\vec f(\vec x_e)$ is hyperbolic matrix

# energy method

## mechanical system

$$
x'=y\\
y'=f(x)
$$

### potential $U(x)$

antiderivative of $-f(x)$

- $U'(x)=-f(x)$

### energy function

conserved quantity
$$
E(x,y)=\frac{1}{2}y^2+U(x)
$$

### level set $E(x,y)=h$

fix $E(x,y)$ to $h$
$$
\Rightarrow y=±\sqrt{2(h-U(x))}
$$

- graph of $y$ is only defined where $U(x)≤h$
- the two parts above and below $x$-axis mirror each other
- intersection with $x$-axis are where $U(x)=h$
    - $U'(x_i)≠0\Rightarrow$ curve is vertical at intersection
- $\displaystyle\frac{\mathrm d|y|}{\mathbb{d}(h-U(x))}>0$

### potential plane

$x,U(x)$-plane
![example using phase plane](example-using-phase-plane.png)

### equilibrium $(x_e,0)$

$$
f(x_e)=0,\quad y=0
$$

- $U'(x_e)=0$

### linearization

$f(x),f'(x)$ are continuous near $x_e$
$U''(x_e)≠0$
$\Rightarrow$ system is almost linear at equilibrium $(x_e,0)$

- Jacobian corresponding to $\vec F=\begin{bmatrix}
    y\\f(x)
\end{bmatrix}$
$$
D\vec F(x,y)=\begin{bmatrix}
    0&1\\-U''(x)&0
\end{bmatrix}
$$
- $U''(x_e)>0$, minimum at $x_e$
linear system is a center
linearization does not hold
use Taylor series quadratic term
$$
U(x)\approx U(x_e)+\frac{1}{2}U''(x_e)(x-x_e)^2
$$
level curve are approximate ellipse
- $U''(x_e)<0$, maximum at $x_e$
linear system is a saddle
by linearization theorem, level curve also saddle

# Lyapunov's Method

## isolated equilibrium $(x_e,y_e)$

$\exists$ open disk $D=B_\delta(x_e,y_e)$ of radius $\delta>0$ centered at $(x_e,y_e)$
$D$ does not contain other equilibrium

## positive/ negative definite/ semidefinite function $W(x,y)$ in $D$

$D$ is open disk centered at $(0,0)$
$W(x,y)$ is continuous in $D$
$W(0,0)=0$
$D_*=D\backslash\{(0,0)\}$

- positive definite function $W(x,y)$ in $D$
$\forall\ (x,y)\in D_*,\ W(x,y)>0$
- positive semidefinite function $W(x,y)$ in $D$
$\forall\ (x,y)\in D,\ W(x,y)≥0$
- negative definite function $W(x,y)$ in $D$
$\forall\ (x,y)\in D_*,\ W(x,y)<0$
- negative semidefinite function $W(x,y)$ in $D$
$\forall\ (x,y)\in D,\ W(x,y)≤0$
- positive definite (/ semidefinite) function $W(x,y)$ in $D$
$\Leftrightarrow$ negative definite (/ semidefinite) function $-W(x,y)$ in $D$

## directional derivative of $V(\vec x)$ along vector field $\vec f(\vec x)$ (derivative of $V$ along the flow of $\vec f$)

planar system $\vec x'=\vec f(\vec x)$
real-valued function $V(\vec x)$
$$
\dot V(\vec x)=\frac{∂V}{∂x_1}(\vec x)f_1(\vec x)+\frac{∂V}{∂x_2}(\vec x)f_2(\vec x)\\[12pt]
=\frac{\mathrm d}{\mathrm dt}[V(\vec x(t))]=\vec f(\vec x)\cdot\nabla V(\vec x)
$$

## Lyapunov's stability theorem

planar system $\vec x'=\vec f(\vec x)$
$(0,0)$ is an isolated equilibrium

- $\exists$ positive definite function $V(\vec x)$ in an open disk centered at $(0,0)$
$\dot V(\vec x)$ is negative definite in $D$
$\Rightarrow (0,0)$ is **asymptotically** stable
    - explanation
  $V$ increase going away from origin
  $V$ decrease along vector field $\vec f$ going away from origin
  $\Rightarrow V$ will always go towards origin along vector field $\vec f$
- $\exists$ positive definite function $V(\vec x)$ in an open disk centered at $(0,0)$
$\dot V(\vec x)$ is negative **semi**definite in $D$
$\Rightarrow (0,0)$ is stable

### Lyapunov function

a function $V(\vec x)$ that satisfy the condition of either part of Lyapunov's stability theorem

## Lyapunov's instability theorem

planar system $\vec x'=\vec f(\vec x)$
$(0,0)$ is an isolated equilibrium

- $\exists$ continuous function $V(\vec x)$ in an open disk centered at $(0,0)$
$V(0,0)=0$
$\dot V(\vec x)$ is positive definite in $D$
$\forall$ open disk $B$ centered at $(0,0)$, $\exists\ \vec a\in B,\quad V(\vec a)>0$
$\Rightarrow (0,0)$ is unstable
    - explanation
  $V$ increase along vector field $\vec f$ going away from origin
  $V$ is higher somewhere than the origin
  $\Rightarrow V$ will go away from origin at some point
- alternatively, instability for restrict system mean instability for whole system

# non-constant periodic solution

## limit cycle $L$

closed curve
$$
L=\{\vec x(t):0≤t≤T\}
$$

- planar system $\vec x'=\vec f(\vec x)$
- $\vec x(t)$ is a non-constant $T$-periodic solution
    - non-constant mean the periodic solution is not a single point
- $\exists$ at least one other solution $\vec x_1(t)$,
$\displaystyle\lim_{t\rightarrow-\infty}d(\vec x_1(t),L)=0$ or $\displaystyle\lim_{t\rightarrow\infty}d(\vec x_1(t),L)=0$
    - distance $d(\vec x,L)=\min\{\lVert\vec x-\vec y\rVert:\vec y\in L\}$
    - explanation
  this solution go to the closed curve as time roll back or go forward

### example of limit cycle

$$
x'=x-y-xf(r)\\
y'=x+y-yf(r)
$$

- coordinate transformation
$$
x=r\cos\theta\\
y=r\sin\theta\\
rr'=xx'+yy'\\
r^2\theta'=xy'-x'y
$$
- $r≥0$
- $\theta'$ is constant for the specific $f(r)$
- dynamic in radial direction have equilibrium when $r'=0$
    - stability can be determined using phase line $r'(t)$
    - each equilibrium correspond to a circular limit cycle

### limit cycle enclose equilibrium

$L$ enclose at least one equilibrium

- $L$ enclose $1$ equilibrium
$\Rightarrow$ the equilibrium cannot be saddle

### Bendixson's negative criterion

- planar system $\vec x'=\vec f(\vec x)$
- simply connected domain $D\subseteq\R^2$
- $f_1,f_2$ have continuous partial derivative in $D$
- $\text{div}f=\nabla\cdot f=\displaystyle\frac{∂f_1}{∂x_1}+\displaystyle\frac{∂f_2}{∂x_2}$ does not change sign in $D$
- $\Rightarrow$ system have no non-constant periodic orbit in $D$

### Poincaré-Bendixson Theorem

- planar system $\vec x'=\vec f(\vec x)$
- solution $\vec x(t)$
- isolated region $R$
    - closed bounded
    - $\forall\ t≥0,\vec x(t)\in R$
  solution stay in $R$ forever
- $f_1,f_2$ have continuous partial derivative in $R$
- no equilibrium in $R$
- $\Rightarrow\vec x(t)$ is either periodic or approach a limit cycle in $R$

# bifurcation in one-dimensional system

$$
x'=f(a,x)
$$
$a$ is changing parameter

## implicit function theorem

- smooth function $g(x,y)$
- $g(x_0,y_0)=0$
- $g_y(x_0,y_0)≠0$
- $\Rightarrow\exists\ \theta>0$, *unique* $h(x)$ defined on $(x_0-\delta,x_0+\delta)$,
$$
h(x_0)=0,\quad\forall\ x\in(x_0-\delta,x_0+\delta),\ g(x,h(x))=0
$$

## persistence of equilibrium

- $f(a,x)$ is a smooth function
- $f(a_0,x_0)=0$, $x_0$ is an equilibrium when $a=a_0$
- $f_x(a_0,x_0)≠0$
- $\Rightarrow\exists\ \delta>0$, unique smooth function $g(a)$ defined on $(a_0-\delta,a_0+\delta)$
$$
g(a_0)=x_0,\quad\forall\ a\in(a_0-\delta,a_0+\delta),\ f(a_0,g(a_0))=0
$$
    - $g(a)$ is equilibrium

## fold bifurcation (saddle-node bifurcation)

$\exists$ smooth curve $a=h(x)$ near $x=x_0$
$$
f(h(x),x)=0\\
h(x_0)=a_0\\
h'(x_0)=0\\[6pt]
h''(x_0)=-\frac{f_{xx}(a_0,x_0)}{f_a(a_0,x_0)}≠0
$$
in English: curve of equilibria (**bifurcation diagram**) near $(a_0,x_0)$ look like parabola
![example curve of equilibria](curve-of-equilibria-fold-bifurcation.png)

### condition

- $f(a,x)$ is a smooth function
- $f(a_0,x_0)=0$, $x_0$ is an equilibrium when $a=a_0$
- $f_x(a_0,x_0)=0$ equilibrium do not persist
- $f_{xx}(a_0,x_0)≠0$
- $f_a(a_0,x_0)≠0$ transversality condition
- $\Rightarrow$ system undergo fold bifurcation at $a_0$

### stability

$$
s(x)=f_x(h(x),x)\\
s'(x)=f_{xa}(h(x),x)h'(x)+f_{xx}(h(x),x)
$$
check $s'(x_0)$
$$
s'(x_0)=f_{xx}(a_0,x_0)
$$

- stability depend on sign of $f_x$, regardless of $h(x)$
- $s'(x_0)>0$
equilibrium $x<x_0$ is stable
equilibrium $x>x_0$ is unstable
- $s'(x_0)<0$
equilibrium $x<x_0$ is unstable
equilibrium $x>x_0$ is stable

#### proof

1. $f(a_0,x_0)=0$, $f_a(a_0,x_0)≠0$, implicit function theorem
$\Rightarrow\exists$ smooth function $h(x)$ near $x_0$, $f(h(x),x)=0$
1. define $g(x)=f(h(x),x)$
$\Rightarrow
g^{\prime}(x)=f_{a}(h(x), x) h^{\prime}(x)+f_{x}(h(x), x)=0
$
1. Evaluate $f_{a}(h(x), x) h^{\prime}(x)+f_{x}(h(x), x)=0$ at $x_{0}$
$$
\begin{aligned}
0 &=g^{\prime}\left(x_{0}\right)=f_{a}\left(h\left(x_{0}\right), x_{0}\right) h^{\prime}\left(x_{0}\right)+f_{x}\left(h\left(x_{0}\right), x_{0}\right) \\
&=f_{a}\left(a_{0}, x_{0}\right) h^{\prime}\left(x_{0}\right)+f_{x}\left(a_{0}, x_{0}\right)=f_{a}\left(a_{0}, x_{0}\right) h^{\prime}\left(x_{0}\right)
\end{aligned}
$$
$f_{a}\left(a_{0}, x_{0}\right) \neq 0\Rightarrow h^{\prime}\left(x_{0}\right)=0$.
1. Then we take the derivative of the relation
$$
g^{\prime}(x)=f_{a}(h(x), x) h^{\prime}(x)+f_{x}(h(x), x)=0
$$
with respect to $x$. We find
$$
\begin{aligned}
g^{\prime \prime}(x)=& f_{a a}(h(x), x)\left[h^{\prime}(x)\right]^{2}+f_{a x}(h(x), x) h^{\prime}(x)+f_{a}(h(x), x) h^{\prime \prime}(x) \\
&+f_{x a}(h(x), x) h^{\prime}(x)+f_{x x}(h(x), x)=0
\end{aligned}
$$
Evaluating at $x_{0}$ and using that $h^{\prime}\left(x_{0}\right)=0$ we find
$$
0=g^{\prime \prime}\left(x_{0}\right)=f_{a}\left(a_{0}, x_{0}\right) h^{\prime \prime}\left(x_{0}\right)+f_{x x}\left(a_{0}, x_{0}\right) .
$$
Since $f_{a}\left(a_{0}, x_{0}\right) \neq 0$ and $f_{x x}\left(a_{0}, x_{0}\right) \neq 0$ we can solve for $h^{\prime \prime}\left(x_{0}\right)$ to find
$$
h^{\prime \prime}\left(x_{0}\right)=-\frac{f_{x x}\left(a_{0}, x_{0}\right)}{f_{a}\left(a_{0}, x_{0}\right)} \neq 0
$$

# bifurcation in planar system

$$
x'=f(a,x,y)\\
y'=g(a,x,y)
$$
$a\in\R^2$ is the parameter

## persistence of equilibrium

equilibrium persist
$$
\Leftarrow\det\begin{bmatrix}
    f_x(a_0,x_0,y_0)&f_y(a_0,x_0,y_0)\\
    g_x(a_0,x_0,y_0)&g_y(a_0,x_0,y_0)
\end{bmatrix}≠0
$$
where $(x_0,y_0)$ is equilibrium when $a=a_0$

## fold bifurcation (saddle-node bifurcation)

- supercritical bifurcation
stable limit cycle + unstable spiral
- subcritical bifurcation
unstable limit cycle + stable spiral