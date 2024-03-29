.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
	.align 2, 0
	.arm
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
	.align 2, 0
	.thumb
    .syntax unified
.endm
.macro non_word_aligned_thumb_func_start name
	.thumb
    .syntax unified
.endm
.macro thumb_func_end name
.endm
