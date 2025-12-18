# A function symbol.
.macro glabel label, visibility=global
    .\visibility "\label"
    .type "\label", @function
    "\label":
        .ent "\label"
.endm

# The end of a function symbol.
.macro endlabel label
    .size "\label", . - "\label"
    .end "\label"
.endm

# An alternative entry to a function.
.macro alabel label, visibility=global
    .\visibility "\label"
    .type "\label", @function
    "\label":
        .aent "\label"
.endm

# A label referenced by an error handler table.
.macro ehlabel label, visibility=global
    .\visibility "\label"
    "\label":
.endm


# A data symbol.
.macro dlabel label, visibility=global
    .\visibility \label
    .type \label, @object
    \label:
.endm

# End of a data symbol.
.macro enddlabel label
    .size "\label", . - "\label"
.endm


# A label referenced by a jumptable.
.macro jlabel label, visibility=local
    .\visibility "\label"
    "\label":
.endm


# Label to signal the symbol haven't been matched yet.
.macro nonmatching label, size=1
    .global "\label\().NON_MATCHING"
    .type "\label\().NON_MATCHING", @object
    .size "\label\().NON_MATCHING", \size
    "\label\().NON_MATCHING":
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
