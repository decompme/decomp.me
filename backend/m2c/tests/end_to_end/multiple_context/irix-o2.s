.set noat      # allow manual use of $at
.set noreorder # don't insert nops after branches


glabel test
/* 000090 00400090 8C820000 */  lw    $v0, ($a0)
/* 000094 00400094 24010001 */  addiu $at, $zero, 1
/* 000098 00400098 50400009 */  beql  $v0, $zero, .L004000C0
/* 00009C 0040009C C4840004 */   lwc1  $f4, 4($a0)
/* 0000A0 004000A0 1041000A */  beq   $v0, $at, .L004000CC
/* 0000A4 004000A4 24010002 */   addiu $at, $zero, 2
/* 0000A8 004000A8 5041000D */  beql  $v0, $at, .L004000E0
/* 0000AC 004000AC C4900004 */   lwc1  $f16, 4($a0)
/* 0000B0 004000B0 44800000 */  mtc1  $zero, $f0
/* 0000B4 004000B4 1000000D */  b     .L004000EC
/* 0000B8 004000B8 00000000 */   nop
/* 0000BC 004000BC C4840004 */  lwc1  $f4, 4($a0)
.L004000C0:
/* 0000C0 004000C0 C486000C */  lwc1  $f6, 0xc($a0)
/* 0000C4 004000C4 03E00008 */  jr    $ra
/* 0000C8 004000C8 46062000 */   add.s $f0, $f4, $f6

.L004000CC:
/* 0000CC 004000CC C4880004 */  lwc1  $f8, 4($a0)
/* 0000D0 004000D0 C48A000C */  lwc1  $f10, 0xc($a0)
/* 0000D4 004000D4 03E00008 */  jr    $ra
/* 0000D8 004000D8 460A4000 */   add.s $f0, $f8, $f10

/* 0000DC 004000DC C4900004 */  lwc1  $f16, 4($a0)
.L004000E0:
/* 0000E0 004000E0 C492000C */  lwc1  $f18, 0xc($a0)
/* 0000E4 004000E4 03E00008 */  jr    $ra
/* 0000E8 004000E8 46128000 */   add.s $f0, $f16, $f18

.L004000EC:
/* 0000EC 004000EC 03E00008 */  jr    $ra
/* 0000F0 004000F0 00000000 */   nop

/* 0000F4 004000F4 00000000 */  nop
/* 0000F8 004000F8 00000000 */  nop
/* 0000FC 004000FC 00000000 */  nop
