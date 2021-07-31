from django.contrib import admin

from .models import Assembly, Compilation, Compiler, Asm, CompilerConfiguration, Scratch

admin.site.register(Compiler)
admin.site.register(CompilerConfiguration)
admin.site.register(Asm)
admin.site.register(Assembly)
admin.site.register(Compilation)
admin.site.register(Scratch)
