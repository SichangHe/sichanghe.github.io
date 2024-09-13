# Geometric Vector

# vector

$$
\vec v=\overrightarrow{AB}
$$

- $\vec v$ displacement vector
- $A$ initial point
- $B$ terminal point
- $\vec0$ zero vector
- $\frac{\vec v}{|\vec v|}$ unit vector

## vector addition

- triangle law
- parallelogram law

## scalar multiplication

$$
c\vec v
$$

## component of vector

$$
\vec a=\langle a_1,a_2,a_3 \rangle
$$

## standard basis vector

$$
\vec j=\langle 1,0,0 \rangle
\qquad
\vec k=\langle 0,1,0 \rangle
\qquad
\vec l=\langle 0,0,1 \rangle
$$

## dot product (scalar product, inner product)

$$
\vec a\cdot\vec b
=\sum_ia_ib_i
\\[12pt]
=|\vec a||\vec b|\cos\theta
$$

### angle between $\vec a,\vec b$, $\theta$

$$
\cos\theta=\frac{\vec a\cdot\vec b}{|\vec a||\vec b|}
$$

#### perpendicular vector

$$
\vec a\perp\vec b
⇔ \vec a\cdot\vec b=0
$$

### direction angle

$$
\cos\alpha=\frac{a_1}{|\vec a|}
\qquad
\cos\beta=\frac{a_2}{|\vec a|}
\qquad
\cos\gamma=\frac{a_3}{|\vec a|}
$$

- relation

    $$
    \cos^2\alpha+\cos^2\beta+\cos^2\gamma=1
    $$

- conclusion

    $$
    \frac{\vec a}{|\vec a|}
    =\langle \cos\alpha,\cos\beta,\cos\gamma \rangle
    $$

### projection

$$
\text{comp}_{\vec a}\vec b
=\frac{\vec a\cdot\vec b}{|\vec a|}
\\[12pt]
\text{proj}_{\vec a}\vec b
=\frac{\vec a\cdot\vec b}{|\vec a|^2}\vec a
$$

## cross product

$$
\vec a\times\vec b
=\langle a_2b_3-a_3b_2,a_3b_1-a_1b_3,a_1b_2-a_2b_1 \rangle
\\[12pt]
=\begin{vmatrix}
    \vec i&\vec j&\vec k
    \\
    a_1&a_2&a_3
    \\
    b_1&b_2&b_3
\end{vmatrix}
$$

- $\vec a\times\vec b\perp\vec a$
- $\vec a\times\vec b\perp\vec b$
- right hand rule determine direction of $\vec a\times\vec b$

### magnitude of cross product

$$
|\vec a\times\vec b|=|\vec a||\vec b|\sin\theta
$$

- equal to area of parallelogram by $\vec a,\vec b$

### parallel vector

$$
\vec a\parallel\vec b
⇔ \vec a\times\vec b=\vec0
$$

### property of cross product

- $\vec a\times\vec b=-\vec b\times\vec a$
- linear
- $\vec a\cdot(\vec b\times\vec c)
    =(\vec a\times\vec b)\cdot\vec c$
- $\vec a\times(\vec b\times\vec c)
    =(\vec a\cdot\vec c)b-(\vec a\cdot\vec b)\vec c$

### triple product

#### scalar triple product

$$
\vec a\cdot(\vec b\times\vec c)
$$

- volume of parallelepiped by $\vec a,\vec b,\vec c$

    $$
    V=|\vec a\cdot(\vec b\times\vec c)|
    $$

- $V=0 ⇔ \vec a,\vec b,\vec c$ coplanar

#### vector triple product

$$
\vec a\times(\vec b\times\vec c)
$$

# line $L$

- vector equation

    $$
    \vec r=\vec r_0+t\vec v
    $$

- parametric equation

    $$
    x=x_0+at
    \qquad
    y=y_0+bt
    \qquad
    z=z_0+ct
    $$

    where

    $$
    \vec r=\langle x,y,z \rangle
    \qquad
    \vec r_0=\langle x_0,y_0,z_0 \rangle
    \qquad
    \vec v=\langle a,b,c \rangle
    $$

- symmetric equation

    $$
    \frac{x-x_0}{a}
    =\frac{y-y_0}{b}
    =\frac{z-z_0}{c}
    $$

# plane

- vector equation

    $$
    \vec n\cdot(\vec r-\vec r_0)=0
    $$

    - $\vec n$ normal vector

- scalar equation

    $$
    a(x-x_0)+b(y-y_0)+c(z-z_0)=0
    $$

    where

    $$
    \vec n=\langle a,b,c \rangle
    $$

- linear equation

    $$
    ax+by+cz+d=0
    $$

## plane-plane relation

- parallel plane\
    normal vector parallel
- angle between plane\
    acute angle between normal vector

## point-plane distance

$$
D=|\text{comp}_{\vec n}\vec b|
\\[12pt]
=\frac{|ax_1+by_1+cz_1+d|}{\sqrt{a^2+b^2+c^2}}
$$

# cylinder

consist of parallel **ruling** through a plane curve

## quadratic surface

second degree equation in three variable

### standard form of quadratic surface

obtained after translation and rotation

$$
Ax^2+By^2+Cz^2+J=0
$$

or

$$
Ax^2+By^2+Iz=0
$$

<!-- below copied from book -->

- ellipsoid\
    all traces are ellipses
- cone\
    horizontal traces are ellipses
    vertical traces in the planes  $x = k$ and $y = k$ are hyperbolas if $k ≠ 0$
    but are pairs of lines if $k = 0$.
- elliptic paraboloid\
    horizontal traces are ellipses\
    vertical traces are parabolas\
    variable to the first  power indicate axis of paraboloid
- hyperboloid of one sheet\
    horizontal traces are ellipses\
    vertical traces are hyperbolas\
    axis of symmetry corresponds to variable with negative coefficient
- hyperbolic paraboloid\
    horizontal traces are hyperbolas\
    vertical traces are parabolas
- hyperboloid of two sheets\
    horizontal traces in $z = k$ are ellipses if $k > c$ or $k < -c$
    vertical traces are hyperbolas
    two minus signs indicate two sheets.

# vector function (vector-valued function)

$$
\vec r(t)=\langle f(t),g(t),h(t) \rangle
$$

where $f(t),g(t),h(t)$ are component function of $\vec r$

## limit of vector function

take limit of its component function

### continuity of vector function

$\vec r$ continuous at $a ⇔ $

$$
\lim_{t → a}\vec r(t)=\vec r(a)
$$

## space curve

set $C$ of all point

$$
x=f(t)
\qquad
y=g(t)
\qquad
z=h(t)
$$

- parametric equation
- $t$ parameter
- visualization\
    draw projection onto three plane

## derivative of vector function

tangent vector

$$
\frac{d\vec r}{dt}
=\vec r'(t)
=\lim_{h → 0}\frac{\vec r(t+h)-\vec r(t)}{h}
\\[12pt]
=\langle f'(t),g'(t),h'(t) \rangle
$$

- all derivative rule apply except quotient rule
    - dot product and cross product have separate rule
    - inner part of chain rule must be scalar function
- $|\vec r(t)|=C$\
    $ ⇒ \frac{d}{dt}(\vec r(t)\cdot\vec r(t))=0 ⇒ \vec r(t)\cdot\vec r'(t)=0$

### unit tangent vector

$$
\vec T(t)=\frac{\vec r'(t)}{|\vec r'(t)|}
$$

## integral of vector function

integrate each component function

## arc length

$$
s(t)=∫_a^t \frac{ds}{du}\ du
\\[12pt]
=∫_a^t|\vec r'(u)|\ du
$$

## curvature

$$
\kappa=\left|
    \frac{d\vec T}{ds}
\right|
\\[12pt]
=\frac{|\vec T'|}{|\vec r'|}
\\[12pt]
=\frac{|\vec r' × \vec r''|}{|\vec r'|^3}
$$

### smooth parametrized curve

$\vec r'$ continuous and $\vec r'≠\vec0$

## (principal) unit normal vector

$$
\vec N(t)=\frac{\vec T'(t)}{|\vec T'(t)|}
$$

- $\vec N(t)\perp\vec T(t)$
- $\vec N(t)\perp\vec r'(t)$

### osculating plane

determined by $\vec T,\vec N$

#### osculating circle (circle of curvature)

- in osculating plane
- tangent the curve
- center towards $\vec N$
- radius

    $$
    \rho=\frac{1}{\kappa}
    $$

## binormal vector

$$
\vec B(t)=\vec T(t) × \vec N(t)
$$

- $\vec B(t)\perp\vec T(t)$
- $\vec B(t)\perp\vec N(t)$

### normal plane

determined by $\vec N,\vec B$

## velocity vector

$$
\vec v=\vec r'
$$

### speed (magnitude of velocity vector)

$$
v
=|\vec v(t)|
=|\vec r'(t)|
=\frac{ds}{dt}
$$

- $\vec v=v\vec T$
- $|\vec T'|=\kappa v$

## acceleration vector

$$
\vec a=\vec v'=\vec r''
\\[12pt]
=v'\vec T+v\vec T'
\\[12pt]
=v'\vec T+\kappa v^2\vec N
\\[12pt]
=a_T\vec T+a_N\vec N
\\[12pt]
=\frac{\vec r'(t)\cdot\vec r''(t)}{|\vec r'(t)|}\vec T
+\frac{|\vec r'(t) × \vec r''(t)|}{|\vec r'(t)|}\vec N
$$
