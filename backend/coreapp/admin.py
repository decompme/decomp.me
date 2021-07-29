from django.contrib import admin

from .models import Compiler, Asm, CompilerConfiguration, Scratch

admin.site.register(Compiler)
admin.site.register(CompilerConfiguration)
admin.site.register(Asm)
admin.site.register(Scratch)
