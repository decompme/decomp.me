.include "macros.inc"

.section .text  # 0x0 - 0x1c

.global test
test:
/* 00000000 00000000  80 83 00 00 */	lwz r4, 0(r3)
/* 00000004 00000004  7C 80 0E 70 */	srawi r0, r4, 1
/* 00000008 00000008  7C 00 01 94 */	addze r0, r0
/* 0000000C 0000000C  54 00 08 3C */	slwi r0, r0, 1
/* 00000010 00000010  7C 00 20 10 */	subfc r0, r0, r4
/* 00000014 00000014  90 03 00 00 */	stw r0, 0(r3)
/* 00000018 00000018  4E 80 00 20 */	blr 

