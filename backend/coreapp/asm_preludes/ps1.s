.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro dlabel label
    .global \label
    \label:
.endm

.macro jlabel label
    \label:
.endm

.macro .late_rodata
    .section .rodata
.endm

.macro move a, b
	addu \\a, \\b, $zero
.endm

.set noat
.set noreorder

## GTE instructions macros
## via https://raw.githubusercontent.com/Decompollaborate/rabbitizer/master/docs/r3000gte/gte_macros.s
## This macros are meant to be used with GAS and avoid using DMPSX

/*  RTPS    15      0x4A180001  Perspective transform */
.macro RTPS
    .word 0x4A180001
.endm

/*  RTPT    23      0x4A280030  Perspective transform on 3 points */
.macro RTPT
    .word 0x4A280030
.endm

/*  DPCL    8       0x4A680029  Depth Cue Color light */
.macro DPCL
    .word 0x4A680029
.endm

/*  DPCS    8       0x4A780010  Depth Cueing */
.macro DPCS
    .word 0x4A780010
.endm

/*  DPCT    17      0x4AF8002A  Depth cue color RGB0,RGB1,RGB2 */
.macro DPCT
    .word 0x4AF8002A
.endm

/*  INTPL   8       0x4A980011  Interpolation of vector and far color */
.macro INTPL
    .word 0x4A980011
.endm

/*  NCS     14      0x4AC8041E  Normal color v0 */
.macro NCS
    .word 0x4AC8041E
.endm

/*  NCT     30      0x4AD80420  Normal color v0, v1, v2 */
.macro NCT
    .word 0x4AD80420
.endm

/*  NCDS    19      0x4AE80413  Normal color depth cuev0 */
.macro NCDS
    .word 0x4AE80413
.endm

/*  NCDT    44      0x4AF80416  Normal color depth cue v0, v1, v2 */
.macro NCDT
    .word 0x4AF80416
.endm

/*  NCCS    17      0x4B08041B  Normal color col. v0 */
.macro NCCS
    .word 0x4B08041B
.endm

/*  NCCT    39      0x4B18043F  Normal color col.v0, v1, v2 */
.macro NCCT
    .word 0x4B18043F
.endm

/*  CDP     13      0x4B280414  Color Depth Queue */
.macro CDP
    .word 0x4B280414
.endm

/*  CC      11      0x4B38041C  Color Col. */
.macro CC
    .word 0x4B38041C
.endm

/*  NCLIP   8       0x4B400006  Normal clipping */
.macro NCLIP
    .word 0x4B400006
.endm

/*  AVSZ3   5       0x4B58002D  Average of three Z values */
.macro AVSZ3
    .word 0x4B58002D
.endm

/*  AVSZ4   6       0x4B68002E  Average of four Z values */
.macro AVSZ4
    .word 0x4B68002E
.endm


## Instructions which take an argument
# sf : arg is 1 bit wide
# mx : arg is 2 bit wide
# v  : arg is 2 bit wide
# cv : arg is 2 bit wide
# lm : arg is 1 bit wide

/*  MVMVA   8       0x4A400012  Multiply vector by matrix and vector addition. */
.macro MVMVA sf, mx, v, cv, lm
    .word 0x4A400012 | (\sf & 0x1) << 19 | (\mx & 0x3) << 17 | (\v & 0x3) << 15 | (\cv & 0x3) << 13 | (\lm & 0x1) << 10
.endm

/*  SQR     5       0x4AA00428  Square of vector */
.macro SQR sf
    .word 0x4AA00428 | (\sf & 0x1) << 19
.endm

/*  OP      6       0x4B70000C  Outer Product */
.macro OP sf
    .word 0x4B70000C | (\sf & 0x1) << 19
.endm

/*  GPF     6       0x4B90003D  General purpose interpolation */
.macro GPF sf
    .word 0x4B90003D | (\sf & 0x1) << 19
.endm

/*  GPL     5       0x4BA0003E  general purpose interpolation */
.macro GPL sf
    .word 0x4BA0003E | (\sf & 0x1) << 19
.endm


## Convenience macros

/*  rtv0    -       0x4A486012  v0 * rotmatrix */
.macro rtv0
    # .word 0x4A486012
    MVMVA       1, 0, 0, 3, 0
.endm

/*  rtv1    -       0x4A48E012  v1 * rotmatrix */
.macro rtv1
    # .word 0x4A48E012
    MVMVA       1, 0, 1, 3, 0
.endm

/*  rtv2    -       0x4A496012  v2 * rotmatrix */
.macro rtv2
    # .word 0x4A496012
    MVMVA       1, 0, 2, 3, 0
.endm

/*  rtir12  -       0x4A49E012  ir * rotmatrix */
.macro rtir12
    # .word 0x4A49E012
    MVMVA       1, 0, 3, 3, 0
.endm

/*  rtir0   -       0x4A41E012  ir * rotmatrix */
.macro rtir0
    # .word 0x4A41E012
    MVMVA       0, 0, 3, 3, 0
.endm

/*  rtv0tr  -       0x4A480012  v0 * rotmatrix + tr vector */
.macro rtv0tr
    # .word 0x4A480012
    MVMVA       1, 0, 0, 0, 0
.endm

/*  rtv1tr  -       0x4A488012  v1 * rotmatrix + tr vector */
.macro rtv1tr
    # .word 0x4A488012
    MVMVA       1, 0, 1, 0, 0
.endm

/*  rtv2tr  -       0x4A490012  v2 * rotmatrix + tr vector */
.macro rtv2tr
    # .word 0x4A490012
    MVMVA       1, 0, 2, 0, 0
.endm

/*  rtirtr  -       0x4A498012  ir * rotmatrix + tr vector */
.macro rtirtr
    # .word 0x4A498012
    MVMVA       1, 0, 3, 0, 0
.endm

/*  rtv0bk  -       0x4A482012  v0 * rotmatrix + bk vector */
.macro rtv0bk
    # .word 0x4A482012
    MVMVA       1, 0, 0, 1, 0
.endm

/*  rtv1bk  -       0x4A48A012  v1 * rotmatrix + bk vector */
.macro rtv1bk
    # .word 0x4A48A012
    MVMVA       1, 0, 1, 1, 0
.endm

/*  rtv2bk  -       0x4A492012  v2 * rotmatrix + bk vector */
.macro rtv2bk
    # .word 0x4A492012
    MVMVA       1, 0, 2, 1, 0
.endm

/*  rtirbk  -       0x4A49A012  ir * rotmatrix + bk vector */
.macro rtirbk
    # .word 0x4A49A012
    MVMVA       1, 0, 3, 1, 0
.endm

/*  ll      -       0x4A4A6412  v0 * light matrix. Lower limit result to 0 */
.macro ll
    # .word 0x4A4A6412
    MVMVA       1, 1, 0, 3, 1
.endm

/*  llv0    -       0x4A4A6012  v0 * light matrix */
.macro llv0
    # .word 0x4A4A6012
    MVMVA       1, 1, 0, 3, 0
.endm

/*  llv1    -       0x4A4AE012  v1 * light matrix */
.macro llv1
    # .word 0x4A4AE012
    MVMVA       1, 1, 1, 3, 0
.endm

/*  llv2    -       0x4A4B6012  v2 * light matrix */
.macro llv2
    # .word 0x4A4B6012
    MVMVA       1, 1, 2, 3, 0
.endm

/*  llvir   -       0x4A4BE012  ir * light matrix */
.macro llvir
    # .word 0x4A4BE012
    MVMVA       1, 1, 3, 3, 0
.endm

/*  llv0tr  -       0x4A4A0012  v0 * light matrix + tr vector */
.macro llv0tr
    # .word 0x4A4A0012
    MVMVA       1, 1, 0, 0, 0
.endm

/*  llv1tr  -       0x4A4A8012  v1 * light matrix + tr vector */
.macro llv1tr
    # .word 0x4A4A8012
    MVMVA       1, 1, 1, 0, 0
.endm

/*  llv2tr  -       0x4A4B0012  v2 * light matrix + tr vector */
.macro llv2tr
    # .word 0x4A4B0012
    MVMVA       1, 1, 2, 0, 0
.endm

/*  llirtr  -       0x4A4B8012  ir * light matrix + tr vector */
.macro llirtr
    # .word 0x4A4B8012
    MVMVA       1, 1, 3, 0, 0
.endm

/*  llv0bk  -       0x4A4A2012  v0 * light matrix + bk vector */
.macro llv0bk
    # .word 0x4A4A2012
    MVMVA       1, 1, 0, 1, 0
.endm

/*  llv1bk  -       0x4A4AA012  v1 * light matrix + bk vector */
.macro llv1bk
    # .word 0x4A4AA012
    MVMVA       1, 1, 1, 1, 0
.endm

/*  llv2bk  -       0x4A4B2012  v2 * light matrix + bk vector */
.macro llv2bk
    # .word 0x4A4B2012
    MVMVA       1, 1, 2, 1, 0
.endm

/*  llirbk  -       0x4A4BA012  ir * light matrix + bk vector */
.macro llirbk
    # .word 0x4A4BA012
    MVMVA       1, 1, 3, 1, 0
.endm

/*  lc      -       0x4A4DA412  v0 * color matrix, Lower limit clamped to 0 */
.macro lc
    # .word 0x4A4DA412
    MVMVA       1, 2, 3, 1, 1
.endm

/*  lcv0    -       0x4A4C6012  v0 * color matrix */
.macro lcv0
    # .word 0x4A4C6012
    MVMVA       1, 2, 0, 3, 0
.endm

/*  lcv1    -       0x4A4CE012  v1 * color matrix */
.macro lcv1
    # .word 0x4A4CE012
    MVMVA       1, 2, 1, 3, 0
.endm

/*  lcv2    -       0x4A4D6012  v2 * color matrix */
.macro lcv2
    # .word 0x4A4D6012
    MVMVA       1, 2, 2, 3, 0
.endm

/*  lcvir   -       0x4A4DE012  ir * color matrix */
.macro lcvir
    # .word 0x4A4DE012
    MVMVA       1, 2, 3, 3, 0
.endm

/*  lcv0tr  -       0x4A4C0012  v0 * color matrix + tr vector */
.macro lcv0tr
    # .word 0x4A4C0012
    MVMVA       1, 2, 0, 0, 0
.endm

/*  lcv1tr  -       0x4A4C8012  v1 * color matrix + tr vector */
.macro lcv1tr
    # .word 0x4A4C8012
    MVMVA       1, 2, 1, 0, 0
.endm

/*  lcv2tr  -       0x4A4D0012  v2 * color matrix + tr vector */
.macro lcv2tr
    # .word 0x4A4D0012
    MVMVA       1, 2, 2, 0, 0
.endm

/*  lcirtr  -       0x4A4D8012  ir * color matrix + tr vector */
.macro lcirtr
    # .word 0x4A4D8012
    MVMVA       1, 2, 3, 0, 0
.endm

/*  lev0bk  -       0x4A4C2012  v0 * color matrix + bk vector */
.macro lev0bk
    # .word 0x4A4C2012
    MVMVA       1, 2, 0, 1, 0
.endm

/*  lev1bk  -       0x4A4CA012  v1 * color matrix + bk vector */
.macro lev1bk
    # .word 0x4A4CA012
    MVMVA       1, 2, 1, 1, 0
.endm

/*  lev2bk  -       0x4A4D2012  v2 * color matrix + bk vector */
.macro lev2bk
    # .word 0x4A4D2012
    MVMVA       1, 2, 2, 1, 0
.endm

/*  leirbk  -       0x4A4DA012  ir * color matrix + bk vector */
.macro leirbk
    # .word 0x4A4DA012
    MVMVA       1, 2, 3, 1, 0
.endm

/*  sqr12   -       0x4AA80428  square of ir    1,19,12 */
# .macro sqr12
#     # .word 0x4AA80428
#     SQR         1
# .endm

/*  sqr0    -       0x4AA80428  square of ir    1,31, 0 */
# .macro sqr0
#     # .word 0x4AA80428
#     SQR         1
# .endm

/*  op12    -       0x4B78000C  outer product   1,19,12 */
.macro op12
    # .word 0x4B78000C
    OP          1
.endm

/*  op0     -       0x4B70000C  outer product   1,31, 0 */
.macro op0
    # .word 0x4B70000C
    OP          0
.endm

/*  gpf12   -       0x4B98003D  general purpose interpolation   1,19,12 */
.macro gpf12
    # .word 0x4B98003D
    GPF         1
.endm

/*  gpf0    -       0x4B90003D  general purpose interpolation   1,31, 0 */
.macro gpf0
    # .word 0x4B90003D
    GPF         0
.endm

/*  gpl12   -       0x4BA8003E  general purpose interpolation   1,19,12 */
.macro gpl12
    # .word 0x4BA8003E
    GPL         1
.endm

/*  gpl0    -       0x4BA0003E  general purpose interpolation   1,31, 0 */
.macro gpl0
    # .word 0x4BA0003E
    GPL         0
.endm
