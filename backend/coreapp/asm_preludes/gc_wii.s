.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro .fn name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @function
    "\\name":
.endm

.macro .endfn name
    .size "\\name", . - "\\name"
.endm

.macro .obj name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @object
    "\\name":
.endm

.macro .endobj name
    .size "\\name", . - "\\name"
.endm

.macro .sym name, visibility=global
    .\\visibility "\\name"
    "\\name":
.endm

.macro .endsym name
    .size "\\name", . - "\\name"
.endm

.macro .rel name, label
    .4byte "\\name" + ("\label" - "\\name")
.endm

.set r0, 0
.set r1, 1
.set r2, 2
.set r3, 3
.set r4, 4
.set r5, 5
.set r6, 6
.set r7, 7
.set r8, 8
.set r9, 9
.set r10, 10
.set r11, 11
.set r12, 12
.set r13, 13
.set r14, 14
.set r15, 15
.set r16, 16
.set r17, 17
.set r18, 18
.set r19, 19
.set r20, 20
.set r21, 21
.set r22, 22
.set r23, 23
.set r24, 24
.set r25, 25
.set r26, 26
.set r27, 27
.set r28, 28
.set r29, 29
.set r30, 30
.set r31, 31
.set f0, 0
.set f1, 1
.set f2, 2
.set f3, 3
.set f4, 4
.set f5, 5
.set f6, 6
.set f7, 7
.set f8, 8
.set f9, 9
.set f10, 10
.set f11, 11
.set f12, 12
.set f13, 13
.set f14, 14
.set f15, 15
.set f16, 16
.set f17, 17
.set f18, 18
.set f19, 19
.set f20, 20
.set f21, 21
.set f22, 22
.set f23, 23
.set f24, 24
.set f25, 25
.set f26, 26
.set f27, 27
.set f28, 28
.set f29, 29
.set f30, 30
.set f31, 31
.set qr0, 0
.set qr1, 1
.set qr2, 2
.set qr3, 3
.set qr4, 4
.set qr5, 5
.set qr6, 6
.set qr7, 7
.set cr0lt, 0
.set cr0gt, 1
.set cr0eq, 2
.set cr0un, 3
.set cr1lt, 4
.set cr1gt, 5
.set cr1eq, 6
.set cr1un, 7
.set cr2lt, 8
.set cr2gt, 9
.set cr2eq, 10
.set cr2un, 11
.set cr3lt, 12
.set cr3gt, 13
.set cr3eq, 14
.set cr3un, 15
.set cr4lt, 16
.set cr4gt, 17
.set cr4eq, 18
.set cr4un, 19
.set cr5lt, 20
.set cr5gt, 21
.set cr5eq, 22
.set cr5un, 23
.set cr6lt, 24
.set cr6gt, 25
.set cr6eq, 26
.set cr6un, 27
.set cr7lt, 28
.set cr7gt, 29
.set cr7eq, 30
.set cr7un, 31
