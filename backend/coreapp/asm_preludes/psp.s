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

.set noat
.set noreorder
