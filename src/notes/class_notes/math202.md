<!-- toc -->
# Linear Algebra

linear system: $\left\{\begin{array}{r}
a_{1}x_{1} + \ldots a_{n}x_{n} = b \\
\ldots
\end{array} \right.\\$

equivalent ∼—same solution set

consistent—have solution; inconsistent—no solutions

coefficient matrix: $\begin{bmatrix}
a_{1} & \ldots & a_{n} \\
\ldots & \ldots & \ldots
\end{bmatrix}$

augmented matrix: $\begin{bmatrix}
a_{1} & \ldots & a_{n} & b \\
\ldots & \ldots & \ldots & \ldots
\end{bmatrix}$

row operation

replacement

interchange

scaling

row equivalent—same after proper row operation

⇒ equivalent matrix

entry—*a*<sub>*i**j*</sub> *o**r* *a*<sub>*i*, *j*</sub> *o**r* *A*[*i*, *j*]*o**r* *A*<sub>*i*, *j*</sub>—the
(*i*, *j*) entry of *A*

leading entry—leftmost entry of a nonzero row

(row) echelon form—step-like, leading entry going in to the right

echelon matrix

reduced echelon form—all leading entries are 1, entries below them are 0

an echelon form (REF) of…

the reduced echelon form (RREF) of…

only 1 for each matrix

pivot position—position corresponding to the leading entry of its
reduced echelon form

pivot column—the column containing a pivot position

pivot—nonzero number in a pivot position

row reduction

forward phase—make pivots the leading entries

backward phase—eliminate non-pivots in pivot column

partial pivoting—use greatest entry in a column as the pivot *for
programming*

solve linear system

basic variable—corresponding to pivot column

free variable—not so  
solution set

element(s):
0—*i**n**c**o**n**s**i**s**t**e**n**t* *o**r* 1—*c**o**n**s**i**s**t**e**n**t* *o**r* ∞

parametric description—$\left\{\begin{array}{r}
basic\\variable1 = f(free\\variable1,\ldots) \\
\ldots
\end{array} \right.\\$

back-substitution—solve for the basic variables one by one dealing with
echelon form

existence and uniqueness theorem—consistent$\left\{\begin{array}{r}
1\\unique\\solution,if\\no\\free\\variable \\
\infty\\solutions,if\\at\\least\\one\\free\\variable
\end{array} \right.\\$ ⇔ no rightmost column as pivot column

vector equation—
*x*<sub>1</sub>**a**<sub>1</sub> + … + *x*<sub>*n*</sub>**a**<sub>*n*</sub> = **b**

column vector

solution for vector equation
*x*<sub>1</sub>**a**<sub>1</sub> + … + *x*<sub>*n*</sub>**a**<sub>*n*</sub> = **b**
equivalent to solution of $\begin{bmatrix}
\mathbf{a}_{1} & \ldots & \mathbf{a}_{n} & \mathbf{b}
\end{bmatrix}$

*S**p**a**n*{**v**<sub>1,</sub>⋯, **v**<sub>*p*</sub>}—subset of
ℝ<sup>*n*</sup> spanned (/generated) by
**v**<sub>1,</sub>⋯, **v**<sub>*p*</sub>—the set of all linear
combinations of **v**<sub>1,</sub>⋯, **v**<sub>*p*</sub>

**b** ∈ *s**p**a**n*{**a**<sub>1</sub>, ⋯, **a**<sub>*n*</sub>} ⇔ *A*
has a pivot in every row

matrix equation *A***x** = **b**: $A\mathbf{x} = \begin{bmatrix}
\mathbf{a}_{1} & \ldots & \mathbf{a}_{n}
\end{bmatrix}\begin{bmatrix}
x_{1} \\
\cdots \\
x_{n}
\end{bmatrix} = x_{1}\mathbf{a}_{1} + \ldots + x_{n}\mathbf{a}_{n}$

$= \begin{bmatrix}
\mathbf{a}^{1} \\
 \vdots \\
\mathbf{a}^{m}
\end{bmatrix}\mathbf{x =}\begin{bmatrix}
\mathbf{a}^{1}\mathbf{\cdot x} \\
\mathbf{\vdots} \\
\mathbf{a}^{m}\mathbf{\cdot x}
\end{bmatrix}$

$b_{i} = \sum_{k = 1}^{n}\left( a_{i,k} \cdot x_{k} \right)$

*A***x** = **b** solution equivalent to
*x*<sub>1</sub>**a**<sub>1</sub> + … + *x*<sub>*n*</sub>**a**<sub>*n*</sub> = **b**

existence of solutions—has solution iff
**b** ∈ *S**p**a**n*{**a**<sub>1</sub>, ⋯, **a**<sub>*n*</sub>}

{**v**<sub>1</sub>, ⋯, **v**<sub>*p*</sub>} spans (/ generates)
ℝ<sup>*m*</sup> if
*S**p**a**n*{**v**<sub>1</sub>, ⋯, **v**<sub>*p*</sub>} = ℝ<sup>*m*</sup>

identity matrix *I*<sub>*n*</sub>, $\left\{\begin{array}{r}
I_{j,j} = 1,j = 1,\cdots,n \\
I_{j,k} = 0,j \neq k
\end{array} \right.\\$

*I*<sub>*n*</sub>**x** **=** **x** ∀ **x** ∈ ℝ<sup>*n*</sup>

homogeneous linear system—can be writen as *A***x** = **0**

opposite: heterogeneous

at least 1 solution **x** **=** **0**, a.k.a. trivial solution

nontrivial solution iff ∃free variable

parametric vector form— **x****=***s***u** + *t***v** (*s*, *t* ∈ ℝ)
*parametric vector equation of the plane*

solution representation

vector

parameter vector form— **x** **=** **p** + *t***v** (*t* ∈ ℝ) *the
equation of the line through **p** parallele to **v***

span

solution set of *A***x** **=** **b**—
{**w**|**w** **=** **p****+****v**<sub>*h*</sub>} *i**f* ∃*s**o**l**u**t**i**o**n* **p** ∀*s**o**l**u**t**i**o**n* *o**f* *A***x** = **0** **v**<sub>*h*</sub>

linear dependency of matrix columns

**a**<sub>1</sub>⋯**a**<sub>*n*</sub> of *A* are linearly independent
 ⇐ *A***x** = **0** has only the trivial solution

dependent
 ⇐ ∃ *c*<sub>1</sub>⋯*c*<sub>*n*</sub>, *c*<sub>1</sub>**a**<sub>1</sub> + ⋯ + *c*<sub>*n*</sub>**a**<sub>*n*</sub> = **0**

more vectors than entries in each vector ⇒ linearly dependent

linearly dependent ⇔ at least one vector = linear combination of the
others

 ⇒ ∃**v**<sub>*j*</sub> (*j* > *i*), **v**<sub>*j*</sub> is a linear
combination of **v**<sub>1</sub>…**v**<sub>*j* − 1</sub> if
{**v**<sub>1</sub>…**v**<sub>*p*</sub>} is linearly dependent AND
**v**<sub>1</sub> ≠ 0

contains **0** ⇒ linearly dependent

linear transformation

transformation (/ function / mapping)
*T* : ℝ<sup>*n*</sup> → ℝ<sup>*m*</sup>

domain ℝ<sup>*n*</sup>

codomain ℝ<sup>*m*</sup>

image *T*(**x**)

range: set of all images

matrix transformation **x** ↦ *A***x**

 ⇔ ∀ **u****,** **v**, *c*, *d*,  *T*(*c***u** + *d***v**) = *c**T*(**u**) + *d**T*(**v**)

kernal *N**u**l* *A*

range *C**o**l* *A*

matrix operations

diagonal entry—*a*<sub>*i**i*</sub>

main diagonal

diagonal matrix—square matrix with all non-diagonal entries 0

zero metrix 0

vector multiplication $AB = A\begin{bmatrix}
\mathbf{b}_{1} & \cdots & \mathbf{b}_{p}
\end{bmatrix} = \begin{bmatrix}
A\mathbf{b}_{1} & \cdots & A\mathbf{b}_{p}
\end{bmatrix}$

*A*(*B***x**)**=**(*A**B*)**x**

row-column
rule—$(AB)_{ij} = a_{i1}b_{1j} + \cdots a_{in}b_{nj} = \sum_{k = 1}^{n}{a_{ik}b_{kj}}$

*$AB = \begin{bmatrix}
{\overleftarrow{a}}_{1} \\
 \vdots \\
{\overleftarrow{a}}_{m}
\end{bmatrix}\begin{bmatrix}
{\overrightarrow{b}}_{1} & \cdots & {\overrightarrow{b}}_{p}
\end{bmatrix} = \begin{bmatrix}
{\overleftarrow{a}}_{1}{\overrightarrow{b}}_{1} & \cdots & {\overleftarrow{a}}_{1}{\overrightarrow{b}}_{p} \\
 \vdots & \ddots & \vdots \\
{\overleftarrow{a}}_{m}{\overrightarrow{b}}_{1} & \cdots & {\overleftarrow{a}}_{m}{\overrightarrow{b}}_{p}
\end{bmatrix}$

*A* is right-multiplied by *B*, *B* is left-multiplied by *A*

*A*, *B* commute—*A**B* = *B**A*

power of matrix $A^{k} = \prod_{i = 1}^{k}A$

*A*<sup>0</sup> is the identity matrix

transpose matrix *A*<sup>*T*</sup>

(*A**B*)<sup>*T*</sup> = *B*<sup>*T*</sup>*A*<sup>*T*</sup>

matrix inversion

invertible—for *n* × *n* matrix *A*, ∃ *n* × *n* matrix *C*,
*C**A* = *I*<sub>*n*</sub> = *A**C*

*C*: an inverse of *A*

(non)singular matrix—(not) invertible

2 × 2 matrix $A = \begin{bmatrix}
a & b \\
c & d
\end{bmatrix} \Rightarrow A^{- 1} = \frac{1}{\det A}\begin{bmatrix}
d & - b \\

- c & a
\end{bmatrix}$ iff det *A* = *a**d* − *b**c* ≠ 0

∀ invertible *n* × *n* matrix *A*, **b** ∈ ℝ<sup>*n*</sup>,
*A***x** **=** **b** **⇒** **x****=***A*<sup>−1</sup>**b**

(*A**B*)<sup>−1</sup> = *B*<sup>−1</sup>*A*<sup>−1</sup>

(*A*<sup>*T*</sup>)<sup>−1</sup> = (*A*<sup>−1</sup>)<sup>*T*</sup>

only product of invertible matrices is invertible

for *n* × *n* matrix: *A* is invertible

⇔ row equivalent to *I*<sub>*n*</sub>

⇔ linear transformation **x****↦***A***x** is one-to-one

⇔ ∀ **b****∈**ℝ<sup>*n*</sup>, *A***x** **=** **b** has solution

⇔ linear transformation **x****↦***A***x** maps ℝ<sup>*n*</sup>
***<u>o</u>***nto ℝ<sup>*n*</sup>

⇔ ∃ *n* × *n* matrix *C*, *C**A* = *I*

⇔ ∃ *n* × *n* *m**a**t**r**i**x* *D*, *A**D* = *I*

 ⇔ *A*<sup>*T*</sup> is invertible  ⇔ det *A* ≠ 0

⇔ columns of *A* forms a basis of ℝ<sup>*n*</sup>

 ⇔ *C**o**l* *A* = ℝ<sup>*n*</sup>

 ⇔ 0 is not an eigenvalue of *A*

 ⇔ det *A* ≠ 0

invertible linear transformation
*T* : ℝ<sup>*n*</sup>**↦**ℝ<sup>*n*</sup>—∃ *S* : ℝ<sup>*n*</sup>**↦**ℝ<sup>*n*</sup>, ∀ **x** ∈ ℝ<sup>*n*</sup>, *S*(*T*(**x**)) = **x**, *T*(*S*(**x**)) = **x**

*S*—the inverse *T*<sup>−1</sup>

elementary matrix—obtained by performing a single elementary row
operation on identity matrix

*r**o**o**p* *A* = *E**A*, where *E* = *r**o**o**p* *I*<sub>*m*</sub>,
*r**o**o**p* is the single elementary row operation

elementary matrix *E* is invertible, *E*<sup>−1</sup> is another
elementary matrix obtained by reversed row operation

*n* × *n* matrix *A* is invertible iff row equivalent to
*I*<sub>*n*</sub>

*A*<sup>−1</sup> = *r**o**o**p* *I*<sub>*n*</sub> if
*I*<sub>*n*</sub> = *r**o**o**p* *A*

find *A*<sup>−1</sup>—row reduce $\begin{bmatrix}
A & I
\end{bmatrix}$ and get $\left\lbrack \begin{matrix}
I & A
\end{matrix}^{- 1} \right\rbrack$

LU fractorization—*A* = *L**U*

*A* : *m* × *n* matrix

*L* : *m* × *m* unit lower triangular matrix

lower triangular matrix—entries above the main diagonal are 0s

*U* : *m* × *n* echelon matrix

implementation—$A\mathbf{x = b} \Leftrightarrow \begin{matrix}
L\mathbf{y = b} \\
U\mathbf{x = y}
\end{matrix}$

calculation: p. 145

determinant
$\det A = \sum_{j = 1}^{n}{( - 1)^{i + j}a_{ij}\det A_{ij}}$

*A* is quare matrix

usually use *i* = 1 the first row

origin—the last pivot in echelon form of the matrix obtained without
division

*A*<sub>*i**j*</sub>—obtained by deleting the *i*th row and *j*th column
in *A*

(*i*, *j*)-cofactor
*C*<sub>*i**j*</sub> = (−1)<sup>*i* + *j*</sup>det *A*<sub>*i**j*</sub>

cofactor expansion across the *i*th row of
*A*—$\det A = \sum_{j = 1}^{n}{a_{ij}C_{ij}}$

triangular matrix *A*—$\det A = \prod_{i = 1}^{n}a_{ii}$ the entries
on the main diagonal

row/ column operation

replacement—same

interchange—opposite

scaling—scales the same way

echelon form *U* by row replacements and *r* interchanges

$\det A = \left\{\begin{array}{rlr}
 & ( - 1)^{r}\prod_{}^{}u_{ii} & when\\A\\is\\invertible \\
 & 0 & when\\A\\is\\not\\invertible
\end{array} \right.\\$

det *A* = det *A*<sup>*T*</sup>

det *A**B* = (det *A*)(det *B*) *proved using elementary matrices*

$\det A^{- 1} = \frac{1}{\det A}$ if *A* is invertible

det *k**A* = *k*<sup>*n*</sup>det *A* if *A* has *n* rows

linearity property—linear transformation
$T\left( \mathbf{x} \right) = \det\begin{bmatrix}
\mathbf{a}_{1} & \cdots & \mathbf{a}_{j - 1} & \mathbf{x} & \mathbf{a}_{j + 1} & \cdots & \mathbf{a}_{n}
\end{bmatrix}$ where only **x** is a variable

Cramer’s rule—the unique solution of *A***x** = *b* has entries
$x_{i} = \frac{\det{A_{i}\left( \mathbf{b} \right)}}{\det A}$

*A* is invertible *n* × *n* matrix, **b** ∈ ℝ

$A_{i}\left( \mathbf{b} \right) = \begin{bmatrix}
\mathbf{a}_{1} & \cdots & \mathbf{b} & \cdots & \mathbf{a}_{n}
\end{bmatrix}$

Laplace transfrom—converts system of linear differential equations to
system of linear algebraic equations

a way to find
*A*<sup>−1</sup>—*A*(*A*<sup>−1</sup>)<sub>*j*</sub> = **(***I*<sub>*n*</sub>**)**<sub>*j*</sub>

$\left( A^{- 1} \right)_{ij} = \frac{\det{A_{i}{\mathbf{(}\mathbf{I}_{n}\mathbf{)}}_{j})}}{\det A} = \frac{C_{ji}}{\det A}$

adjugate/ classical adjoint of *A*—$adj\\A = \begin{bmatrix}
C_{11} & \cdots & C_{n1} \\
 \vdots & \ddots & \vdots \\
C_{1n} & \cdots & C_{nn}
\end{bmatrix}$

determinant as area or volume

area of parallelogram of 2 × 2 matrix *A* is |det *A*|

volume of parallelepiped of 3 × 3 matrix *A* is |det *A*|

linear transformation
*T* : ℝ<sup>2</sup> → ℝ<sup>2</sup> (ℝ<sup>3</sup> → ℝ<sup>3</sup>)
determined by 2 × 2 (3 × 3) matrix
*A* ⇒ {*a**r**e**a* (*v**o**l**u**m**e*) *o**f* *T*(*S*)} = |det *A*| ⋅ {*a**r**e**a* (*v**o**l**u**m**e*) *o**f* *S*}

vector space—10 axioms

subspace—3 axioms needed

**0** ∈ *H*

*H* is closed under vector addition—**u** **+** **v** ∈ *H*

*H* is closed under multiplication by scalars—*c***u** ∈ *H*

*S**p**a**n*{**v**<sub>*i*</sub>} is a subset of vector space *V* if
**v**<sub>*i*</sub> ∈ *V*

null space of *A*, *N**u**l* *A*—solution set of *A***x** = **0**

—is a subspace of ℝ<sup>*n*</sup>

explicit discription—with the vectors that span *N**u**l* *A*

basis—solve and represent with free variables

*d**i**m* *N**u**l* *A*= number of free variables

column space of
*A*, *C**o**l* *A*—*S**p**a**n*{**a**<sub>1</sub>, ⋯, **a**<sub>*n*</sub>}

—is a subspace of ℝ<sup>*m*</sup>

*C**o**l* *A* = {**b** **:** **b****=***A***x**, **x** ∈ ℝ<sup>*n*</sup>}

*C**o**l* *A* = ℝ<sup>*m*</sup> iff
∀**b** ∈ ℝ<sup>*m*</sup>, ∃**x**, *A***x** **=** **b**

basis—pivot columns

*d**i**m* *C**o**l* *A*= number of pivot columns

row space of *A*, $Row\\A—span\begin{Bmatrix}
\mathbf{a}^{1} & \cdots & \mathbf{a}^{n}
\end{Bmatrix}$

—is a subspace of ℝ<sup>*n*</sup>

 = *C**o**l* *A*<sup>*T*</sup>

basis—pivot rows

<img src="./media/math202image1.png" style="width:4.94211in;height:3.71466in"
alt="Table Description automatically generated with medium confidence" />

kernal/ null space of linear transformation *T*—*T*(**u**) = **0**

basis *Β* of subset *H*—linearly independent, span *H*

standard basis for
ℝ<sup>*n*</sup> {*e*<sub>1</sub>, ⋯, *e*<sub>*n*</sub>}

spanning set A small AP

linearly dependent set A big AP

coordinate system

the unique representation theorem

*Β*-coordinates of **x**—scalars that map them

*Β*-coordinate vector of
**x**—$\left\lbrack \mathbf{x} \right\rbrack_{Β} = \begin{bmatrix}
c_{1} \\
 \vdots \\
c_{n}
\end{bmatrix}$

coordinate mapping **x** ↦ [**x**]<sub>*Β*</sub>

it is a one-to-one linear transformation—isomorphism

**x** = *P*<sub>*Β*</sub>[**x**]<sub>*Β*</sub>, where change of
coordinate matrix
*P*<sub>*Β*</sub> = [**b**<sub>1</sub>, ⋯, **b**<sub>*n*</sub>]

dimension

finite-dimensional vector space—spanned by finite set

0 dimension—{**0**}

infinite-dimensional

dim ℙ<sup>*n*</sup> = *n* + 1

rank—*d**i**m* *C**o**l* *A*

rank thm—*r**a**n**k* *A* + *d**i**m* *N**u**l* *A* = *n*

an <u>eigenvector</u> corresponding to
*λ*—**x** ≠ **0**, *A***x** = *λ***x**, *A* *i**s* *n* × *n*

an <u>eigenvalue</u> of *A*—*λ*

main diagonal entries on triangular matrix

0 is an eigenvalue of *A* iff *A* is not invertible

find eigenvector **x** given eigenvalue *λ*:
*A***x** = *λ***x** ⇒ (*A* − *λ**I*)**x** **=** **0**

（*A* − *λ**I*）<sup>*T*</sup> = *A*<sup>*T*</sup> − *λ**I*

<u>eigenspace</u> of *A*—*N**u**l* (*A* − *λ**I*)

characteristic equation of *A*—det (*A* − *λ**I*) = 0

 ⇔ *λ* is an eigenvalue of *A*

characteristic polynomial of *A* (with degree *n*)

multiplicity of eigenvalue *λ*—the multiplicity as root

similarity—∃*P* invertible, *P*<sup>−1</sup>*A**P* = *B*

*P**B**P*<sup>−1</sup> = *A*

*A*, *B* are similar

similarity transformation—*A* → *P*<sup>−1</sup>*A**P*

same characteristic polynomial and same eigenvalues

diagonalize—*A* = *P**D**P*<sup>−1</sup> where *D* is diagonal

diagonalizable—∃*P*, *D*

 ⇔ *A* has *n* linearly independent eigenvectors

 ⇔ ∑dimensions of eigenspaces  = *n*

⇔ characteristic polynomial factors completely into linear factors

⇔ dimension of eigenspace for each *λ*= multiplicity

⇔ basis of all eigenspaces form a basis of ℝ<sup>*n*</sup>

 ⇐ *A* has *n* distinct eigenvalues

diagonizing—find eigenvalues  ⇒ *D*; find eigenspace basis  ⇒ *P*; check
*A**P* = *P**D*

vector operation

inner product (dot
product)—**u** **⋅** **v****=****u**<sup>*T*</sup>**v**

length—$\Vert\mathbf{v} \Vert = \sqrt{\mathbf{v \cdot v}}$

normalizing—get unit vector in the same direction as nonzero vector

distance *d**i**s**t*(**u****,** **v**) = ∥**u** **−** **v**∥

orthogonal relationship

orthogonal—**u** **⋅** **v****=**0

 ⇔ ∥**u** **+** **v**∥ = ∥**u**∥ + ∥**v**∥

orthogonal complement *W*<sup>⊥</sup>—the set of all vectors orthogonal
to subspace *W*

is a subset of ℝ<sup>*n*</sup>

interactive—*A*<sup>⊥</sup> = *B* ⇔ *B*<sup>⊥</sup> = *A*

(*R**o**w* *A*)<sup>⊥</sup> = *N**u**l* *A*

(*C**o**l* *A*)<sup>⊥</sup> = *N**u**l* *A*<sup>*T*</sup>

orthogonal
set—**u**<sub>*i*</sub>**⋅****u**<sub>*j*</sub> = 0 ∀ *i* ≠ *j*

⇒ linearly independent

is a basis for the subspace

orthogonal basis—basis that is orthogonal set

weight—$c_{j} = \frac{\mathbf{y \cdot}\mathbf{u}_{j}}{\mathbf{u}_{j}\mathbf{\cdot}\mathbf{u}_{j}}$
for **y** ∈ *S**p**a**n*{**u**<sub>*j*</sub>}

$\mathbf{y} = \sum_{}^{}{c_{j}\mathbf{u}_{j}}$

orthogonal
projection— ${proj}_{L}\mathbf{y =}\widehat{\mathbf{y}} = \frac{\mathbf{y \cdot u}}{\mathbf{u \cdot u}}\mathbf{u}$

$\mathbf{y =}\widehat{\mathbf{y}}\mathbf{+ z}$ where **z****⊥****u**

subspace *L* spanned by **u**

orthonormal set—unit vector orthogonal set

orthonormal basis—basis that is orthonormal set

Gram-Schmidt process—calculate orthonormal basis by subtracting
projection

QR factorization—orthonormal basis of linearly independent matrix *Q*,
*R* = *Q*<sup>*T*</sup>*A*

orthogonal matrix—square matrix with orthonormal columns

 ⇔ *U*<sup>−1</sup> = *U*<sup>*T*</sup>

⇔ orthonormal rows

∥*U***x**∥ = ∥**x**∥

(*U***x**) ⋅ (*U***y**) = **x** **⋅** **y**

*U***x**⊥*U***y** ⇔ **x****⊥****y**

product of orthogonal matrix is orthogonal matrix

orthogonal
projection—${proj}_{W}\mathbf{y =}\widehat{\mathbf{y}} = \sum_{}^{}{\frac{\mathbf{y \cdot}\mathbf{u}_{i}}{\mathbf{u}_{i}\mathbf{\cdot}\mathbf{u}_{i}}\mathbf{u}_{i}}$

${proj}_{W}\mathbf{y =}\sum_{}^{}{\left( \mathbf{y \cdot}\mathbf{u}_{i} \right)\mathbf{u}_{i}} = UU^{T}\mathbf{y}$
for *U* of orthonormal basis **u**<sub>*i*</sub>

best approximation theorem—$\widehat{\mathbf{y}}$ is the closest point
in *W* to **y**

general least-square problem—find **x** for smallest least-square error
∥**b** − *A***x**∥

$A\widehat{\mathbf{x}}\mathbf{=}\widehat{\mathbf{b}}\mathbf{=}proj_{Col\\A}\mathbf{b}$

⇔ normal equation—*A*<sup>*T*</sup>*A***x** = *A*<sup>*T*</sup>**b**

*r**a**n**k* *A*<sup>*T*</sup>*A* = *r**a**n**k* *A*

*A***x** **=** **b** has a unique least-square solution
∀ **b** ∈ ℝ<sup>*m*</sup>

 ⇔ *A* is linearly independent

 ⇔ *A*<sup>*T*</sup>*A* is invertible

$\Leftrightarrow \widehat{\mathbf{x}} = \left( A^{T}A \right)^{- 1}A^{T}\mathbf{b}$

$\Leftrightarrow R\widehat{\mathbf{x}} = Q^{T}\mathbf{b} \Leftrightarrow \widehat{\mathbf{x}} = R^{- 1}Q^{T}\mathbf{b}$

*Χ***β****=****y**  
design matrix—*Χ*

parameter vector—**β**

observation vector—**y**

least-square line (line of
regression)—*y* = *β*<sub>0</sub> + *β*<sub>1</sub>*x*

observed value—*y*<sub>*i*</sub>

predicted value—*β*<sub>0</sub> + *β*<sub>1</sub>*x*<sub>*i*</sub>

residual—*β*<sub>0</sub> + *β*<sub>1</sub>*x*<sub>*i*</sub> − *y*<sub>*i*</sub>

*Χ***β** **=** **y** where $Χ = \left\lbrack \begin{array}{r}
\begin{matrix}
1 & x_{1}
\end{matrix} \\
\begin{matrix}
 \vdots & \vdots
\end{matrix} \\
\begin{matrix}
1 & x_{n}
\end{matrix}
\end{array} \right\rbrack,\mathbf{\beta} = \left\lbrack \begin{array}{r}
\beta_{0} \\
\beta_{1}
\end{array} \right\rbrack,\mathbf{y} = \left\lbrack \begin{array}{r}
y_{1} \\
 \vdots \\
y_{n}
\end{array} \right\rbrack$

residual vector **ϵ**

diagonalization of symmetric matrix

symmetric matrix—*A*<sup>*T*</sup> = *A*

eigenvectors from different eigenspaces are orthogonal

orthogonally diagonalizable—could have orthogonal matrix *P*

*A* = *P**D**P*<sup>−1</sup> = *P**D**P*<sup>*T*</sup>

 ⇔ *A* is symmetric

spectral
decomposition—$A = \sum_{}^{}{\lambda_{i}\mathbf{u}_{i}\mathbf{u}_{i}^{T}}$

where **u**<sub>*i*</sub> are the columns of *P*

**u**<sub>*i*</sub>**u**<sub>*i*</sub><sup>*T*</sup> is a projection
matrix—*p**r**o**j*<sub>{**u**<sub>*i*</sub>}</sub>**x****=**(**u**<sub>*i*</sub>**u**<sub>*i*</sub><sup>*T*</sup>)**x**

single value decomposition SVD—*A* = *U**Σ**V*<sup>*T*</sup>

left singular vectors form *U* is *m* × *m* orthogonal

$\Sigma = \begin{bmatrix}
D & \mathbf{0}_{(n - r)}^{T} \\
\mathbf{0}_{(m - r)} & \mathbf{0}_{(m - r) \times (n - r)}
\end{bmatrix}$ is *m* × *n*

$D = \begin{bmatrix}
\sigma_{1} & & 0 \\
 & \ddots & \\
0 & & \sigma_{r}
\end{bmatrix}$, *σ*<sub>1</sub> ≥ ⋯ ≥ *σ*<sub>*r*</sub> > 0

right singular vectors form *V* is *n* × *n* orthogonal

∀ *m* × *n* matrix *A*, *A*<sup>*T*</sup>*A* is symmetic

its eigenvalues *λ*<sub>1</sub> ≥ ⋯ ≥ *λ*<sub>*i*</sub> ≥ ⋯ ≥ 0

single
values—$\sigma_{1},\cdots,\sigma_{n} = \sqrt{\lambda_{1}},\cdots,\sqrt{\lambda_{n}}$

for {**v**<sub>1</sub>**,** **⋯****,****v**<sub>*n*</sub>} with
eigenvectors of *A*<sup>*T*</sup>*A* correponding to
*λ*<sub>1</sub> ≥ ⋯ ≥ *λ*<sub>*i*</sub>, and *A* has *r* nonzero
singular values,
{*A***v**<sub>1</sub>**,** **⋯****,***A***v**<sub>*r*</sub>} is an
orthogonal basis for *C**o**l* *A*, *r**a**n**k* *A* = *r*

find single value decomposition

find orthogonal diagonalization of
*A*<sup>*T*</sup>*A*—*P*, *D*<sup>′</sup>

*V* = *P* to orthonomal  = {**v**<sub>*i*</sub>}

*D* and *Σ*

*U*—$\mathbf{u}_{i} = \frac{A\mathbf{v}_{i}}{\sigma_{i}}$
