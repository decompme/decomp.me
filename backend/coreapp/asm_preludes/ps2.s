.macro glabel name, visibility=global
.\visibility "\name"
.type "\name", @function
"\name":
.endm

.macro dlabel name, visibility=global
.\visibility "\name"
.type "\name", @object
"\name":
.endm

.macro jlabel name, visibility=local
.\visibility "\name"
"\name":
.endm

.macro .late_rodata
    .section .rodata
.endm

# Defines a sized symbol with function type.
# Usage:
# .fn my_function, local
# /* asm here */
# .endfn my_function
.macro .fn name, visibility=global
.\visibility "\name"
.type "\name", @function
"\name":
.endm

.macro .endfn name
.size "\name", . - "\name"
.endm

# Defines a sized symbol with object type.
# Usage:
# .obj my_object, local
# /* data here */
# .endobj my_object
.macro .obj name, visibility=global
.\visibility "\name"
.type "\name", @object
"\name":
.endm

.macro .endobj name
.size "\name", . - "\name"
.endm

# Defines a sized symbol without a type.
# Usage:
# .sym my_sym, local
# /* anything here */
# .endsym my_sym
.macro .sym name, visibility=global
.\visibility "\name"
"\name":
.endm

.macro .endsym name
.size "\name", . - "\name"
.endm

.set noat
.set noreorder
