from django.contrib import admin

from .models import Compiler, Assembly, CompilerConfiguration, Scratch

admin.site.register(Compiler)
admin.site.register(CompilerConfiguration)
admin.site.register(Assembly)
admin.site.register(Scratch)
