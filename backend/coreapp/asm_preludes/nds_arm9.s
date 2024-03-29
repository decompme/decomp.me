.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
    .arm
    \\name:
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
    .thumb
    \\name:
.endm
.macro non_word_aligned_thumb_func_start name
    .thumb
    \\name:
.endm
.macro thumb_func_end name
.endm
