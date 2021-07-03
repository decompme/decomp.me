from django.contrib import admin

from .models import Compiler, Assembly, Scratch

admin.site.register(Compiler)
admin.site.register(Assembly)
admin.site.register(Scratch)
