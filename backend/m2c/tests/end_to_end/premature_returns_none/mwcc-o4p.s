.include "macros.inc"

.section .text  # 0x0 - 0x14

.global test
test:
/* 00000000 00000000  2C 03 00 00 */	cmpwi r3, 0
/* 00000004 00000004  38 60 00 00 */	li r3, 0
/* 00000008 00000008  4D 82 00 20 */	beqlr 
/* 0000000C 0000000C  38 60 00 01 */	li r3, 1
/* 00000010 00000010  4E 80 00 20 */	blr 

