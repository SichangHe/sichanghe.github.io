<!-- toc -->
# Multivariate Calculus

# multivariate function

$$
\{f(x_1,x_2,\cdots)|(x_1,x_2,\cdots)\in D\}
$$

## level curve (contour curve)/ level space

curve/ space with equation

$$
f(x_1,x_2,\cdots)=k
$$

- $k$ is constant

## limit of multivariate function

$$
\lim_{(x_1,x_2,\cdots)\rightarrow(a_1,a_2,\cdots)}f(x_1,x_2,\cdots)=L
$$

$\Leftrightarrow f(x_1,x_2,\cdots)$ approach $L$
as $(x_1,x_2,\cdots)$ approach $(a_1,a_2,\cdots)$
from any path within domain

- proof for the opposite using counterexample:\
    point out that the function approach different value from two different direction
- the squeeze theorem hold

## continuity of multivariate function

$$
\lim_{(x_1,x_2,\cdots)\rightarrow(a_1,a_2,\cdots)}f(x_1,x_2,\cdots)
=f(a_1,a_2,\cdots)
$$

$\Leftrightarrow f$ continuous

## partial derivative

$$
\frac{∂f}{∂x_n}\Bigr|_{x_1=a_1,\cdots,x_n=a_n,\cdots}
=f_{x_n}(a_1,a_2,\cdots)
=g'(a_n)
$$

where

$$
g(x_n)=f(a_1,\cdots,x_n,a_{n+1},\cdots)
$$

### higher partial derivative

$$
(f_{x_m})_{x_n}
=f_{x_mx_n}
$$

#### Clairaut's theorem

$f$ defined on $D$ containing $(a,b)$,
$f_{xy},f_{yx}$ continuous

$$
\Rightarrow f_{xy}(a,b)=f_{yx}(a,b)
$$

## tangent plane

$$
z-z_0=f_x(x_0,y_0)(x-x_0)+f_y(x_0,y_0)(y-y_0)
$$

### line approximation

$$
f(x,y)\approx f_x(a,b)(x-a)+f_y(a,b)(y-b)+f(a,b)
$$

## increment

$$
\Delta z=f(a+\Delta x,b+\Delta y)-f(a,b)
$$

### differentiable function

$$
\lim_{\Delta x → 0,\Delta y → 0}\Delta z=
\lim_{\Delta x → 0,\Delta y → 0}\left(
    \frac{∂z}{∂x}+\varepsilon_1
\right)\Delta x+\left(
    \frac{∂z}{∂y}+\varepsilon_2
\right)\Delta y\\[12pt]=
\lim_{\Delta x → 0,\Delta y → 0}\frac{∂z}{∂x}\Delta x+\frac{∂z}{∂y}\Delta y
$$

### differential

for differentiable function

$$
dz=\frac{∂z}{∂x}dx+\frac{∂z}{∂y}dy
$$

## implicit function

$$
F(x,y)=0
$$

### implicit function theorem

given

1. $F$ differentiable by $x$ and $y$
1. $\frac{∂F}{∂y}≠0$

take derivative of both side

$$
\frac{∂F}{∂x}\frac{dx}{dx}+\frac{∂F}{∂y}\frac{dy}{dx}=0 ⇒
\frac{dy}{dx}=-\frac{\frac{∂F}{∂x}}{\frac{∂F}{∂y}}
$$

## gradient

$$
\nabla f(x_1,\cdots,x_n)=\langle f_{x_1},\cdots,f_{x_n} \rangle
$$

- product rule, $\nabla(fg)=(\nabla f)g+f(\nabla g)$

### directional derivative

$\vec u$ is unit vector

$$
D_{\vec u}=\lim_{h → 0}\frac{
    f(x_1+u_1h,\cdots,x_n+u_nh)-f(x_1,\cdots,x_n)
}{h}\\[12pt]=\nabla f(x_1,\cdots,x_n)\cdot\vec u
$$

$\max(D_{\vec u}f)=|\nabla f|$ only when
$\vec u,\nabla f(x_1,\cdots,x_n)$ have the same direction

### level surface

level surface $F(x,y,z)=k$

line curve $\vec r(t)$ on the surface of the level surface

$$
\nabla F\cdot\vec r'=0
$$

$⇒ \nabla F$ is normal vector of tangent plane

- for level curve, $\nabla F$ is perpendicular to the curve

#### tangent plane of level surface

$$
F_x(x-x_0)+F_y(y-y_0)+F_z(z-z_0)=0
$$

## extrema

point $(a,b)$

$$
\begin{cases}
f_x(a,b)=0\\
f_y(a,b)=0
\end{cases}
$$

$⇒$ maximum or minimum or saddle point

$$
D(a,b)=f_{xx}(a,b)f_{yy}(a,b)-f_{xy}^2(a,b)
$$

- $D>0 ⇒$
    - $f_{xx}>0 ⇒$ local minimum
    - $f_{xx}<0 ⇒$ local maximum
- $D<0 ⇒$ saddle point

### extrema subject to constraint

constraint $g(x,y,z)=k$

$$
\nabla f\parallel\nabla g ⇒ \nabla f(x,y,z)=\lambda\nabla g(x,y,z)
$$

- Lagrange multiplier $\lambda$

for additional constraint $h(x,y,z)=c$

two constraint's intersection curve $C$

$$
\nabla f,\nabla g,\nabla h\perp C ⇒
\nabla f(x,y,z)=\lambda\nabla g(x,y,z)+\mu\nabla h(x,y,z)
$$

## surface area

$$
A(S)=\iint_D\sqrt{1+f_x^2+f_y^2}\ dA
$$

## Jacobian

$x=x(u,v),y=y(u,v)$

$$
\frac{∂(x,y)}{∂(u,v)}=\begin{vmatrix}
    \frac{∂x}{∂u}&\frac{∂x}{∂v}\\[6pt]
    \frac{∂y}{∂u}&\frac{∂y}{∂v}
\end{vmatrix}=\frac{∂x}{∂u}\frac{∂y}{∂v}-\frac{∂x}{∂v}\frac{∂y}{∂u}\\[12pt]
\iint_Rf(x,y)dx\ dy=\iint_Sf \left(
    x(u,v),y(u,v)
\right)\left|
    \frac{∂(x,y)}{∂(u,v)}
\right|du\ dv
$$

## line integral

piecewise-smooth curve $C$

$$
\int_Cf\ ds=\int_Cf(x(t),y(t))\sqrt{\left(
    \frac{dx}{dt}
\right)^2+\left(
    \frac{dy}{dt}
\right)^2}dt
$$

- line integral of $f$ along $C$ with respect to $x$

    $$
    \int_Cf\ ds=\int_Cf(x(t),y(t))\frac{dx}{dt}dt
    $$

- change orientation of $C$
    - $\int_{-C}f\ dx=-\int_Cf\ dx$
    - $\int_{-C}f\ ds=\int_Cf\ ds$

### work

$$
W(C)=\int_C\vec F\cdot d\vec r=\int_C\vec F\cdot\vec T\ ds
$$

### fundamental theorem of line integral

$$
\int_C\nabla f\cdot d\vec r=f(\vec r(b))-f(\vec r(a))
$$

### conservative vector field

vector field $\vec F$ and $∃\ f$ s.t. $\vec F=\nabla f$

- on open connected region,
    $\vec F=\nabla f=\langle P(x,y),Q(x,y) \rangle$

    $⇔$ on simply-closed region,
    $\frac{∂P}{∂y}=\frac{∂Q}{∂x}$

#### independence of path of line integral

$∀\ C_1,C_2$ with the same ends

$$
\int_{C_1}\vec F\cdot d\vec r=\int_{C_2}\vec F\cdot d\vec r
$$

- $⇔$ closed path integral

    $$
    \oint_C\vec F\cdot d\vec r=0
    $$

- $⇔ \vec F$ is conservative

## Green's theorem

$C$ positively oriented, piecewise-smooth, simple closed,\
$C=∂D$ is boundary of $D$,\
$P,Q$ have continuous partial derivative

$$
∫_CPdx+Qdy=∬_D\left(
    \frac{∂Q}{∂x}-\frac{∂P}{∂y}
\right)dA
$$

- $$
    A=\iint_D1dA=\int_Cxdy=-\int_Cydx=\frac{1}{2}\int-ydx+xdy
    $$
- extension: multiple-connected region

# nabla

$$
\nabla=\left\langle \frac{∂}{∂x},\frac{∂}{∂y},\frac{∂}{∂z} \right\rangle
$$

## Laplace operator

$$
\nabla^2=\nabla\cdot\nabla
$$

## curl

$$
curl\ \vec F=\nabla × \vec F=\begin{vmatrix}
    \vec i&\vec j&\vec k\\[6pt]
    \frac{∂}{∂x}&\frac{∂}{∂y}&\frac{∂}{∂z}\\[6pt]
    P&Q&R
\end{vmatrix}\\[12pt]=
\left\langle
    \frac{∂R}{∂y}-\frac{∂Q}{∂z},
    \frac{∂P}{∂z}-\frac{∂R}{∂x},
    \frac{∂Q}{∂x}-\frac{∂P}{∂y}
\right\rangle
$$

- $curl\ (\nabla f)=\nabla × (\nabla f)=\vec 0$
- $\vec F$ conservative $⇔$
    on simply-connected region, $curl\ \vec F=\vec 0$
- irrotational $⇔ curl\ \vec F=\vec 0$

## divergence

$$
div\ \vec F=\nabla\cdot\vec F=\frac{∂P}{∂x}+\frac{∂Q}{∂y}+\frac{∂R}{∂z}
$$

- incompressible $⇔ div\ \vec F=0$
- source $⇔ div\ \vec F>0$
- sink $⇔ div\ \vec F<0$
- $div\ curl\ \vec F=\nabla\cdot(\nabla × \vec F)=0$
- $div(\nabla f)=\nabla\cdot(\nabla f)=\nabla^2 f=
    \frac{∂^2f}{∂x^2}+\frac{∂^2f}{∂y^2}+\frac{∂^2f}{∂z^2}$
    - Laplace's equation, $\nabla^2 f=0$
- for vector field, $\nabla^2\vec F=
    \nabla^2P\vec i+\nabla^2Q\vec j+\nabla^2R\vec k$
- product rule, $\nabla\cdot((\nabla f)g)=
    (\nabla\cdot\nabla f)g+\nabla f\cdot\nabla g$

## Green's theorem in vector form

for 2-dimension

$$
\oint_C\vec F\cdot d\vec r=\iint_D(curl\ \vec F)\cdot d\vec A\\[12pt]
\oint_C\vec F\cdot\vec n d\vec r=\iint_Ddiv\ \vec F\ d\vec A
$$

- outward unit normal vector

    $$
    \vec n=\left\langle
        \frac{y'(t)}{|\vec r'(t)|},-\frac{x'(t)}{|\vec r'(t)|}
    \right\rangle
    $$

# parametric surface

$$
\vec r(u,v)=\langle x(u,v),y(u,v),z(u,v) \rangle
$$

- grid curve
- normal vector for tangent plane at $(u_0,v_0)$,
    $\vec r_u(u_0,v_0) × \vec r_v(u_0,v_0)$
- smooth, $\vec r_u × \vec r_v≠\vec 0$
- surface integral

    $$
    \iint_Sf\ dS=\iint_Df\left|
        \vec r_u × \vec r_v
    \right|dA
    $$

    - area

        $$
        A(S)=\iint_S1\ dS=
        \iint_D \left|
            \vec r_u × \vec r_v
        \right|dA
        $$

    - for sphere, $dS=a^2\sin\phi\ d\phi\ d\theta$

## oriented surface

- normal vector field

    $$
    \vec n=\frac{\vec r_u × \vec r_v}{\left|
        \vec r_u × \vec r_v
    \right|}
    $$

- $d\vec S=\vec n\ dS$

### flux

$$
\iint_S\vec F\cdot\ d\vec S=
\iint_S\vec F\cdot\ \vec n\ dS\\[12pt]=
\iint_S\vec F\cdot\frac{\vec r_u × \vec r_v}{\left|
    \vec r_u × \vec r_v
\right|}\ dS\\[12pt]=
\iint_S\vec F\cdot \left(
    \vec r_u × \vec r_v
\right)\ dA
$$

## Stoke's theorem

$$
\int_C\vec F\cdot d\vec r=\iint_Scurl\ \vec F\cdot d\vec S\\[12pt]=
\iint_Scurl\ \vec F\cdot\left(
    \vec r_u × \vec r_v
\right)\ dA
$$

## divergence theorem (Gauss's theorem)

$$
\iint_S\vec F\cdot\vec n\ dS=\iiint_Ediv\vec F\ dV
$$
