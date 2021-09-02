from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp.models import Scratch

class ScratchCreationTests(APITestCase):
    scratch_url: str

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.scratch_url = reverse('scratch')

    def test_accept_late_rodata(self):
        """
        Ensure that .late_rodata (used in ASM_PROCESSOR) is accepted during scratch creation.
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm':
""".late_rodata
glabel D_8092C224
/* 000014 8092C224 3DCCCCCD */ .float 0.1

.text
glabel func_80929D04
jr $ra
nop"""
        }

        response = self.client.post(self.scratch_url, scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scratch.objects.count(), 1)
