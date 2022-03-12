import os
import re


for root, dirs, files in os.walk("src/components/compiler/compilers"):
    for filename in files:
        with open(os.path.join(root, filename)) as f:
            f_text = f.read()
        if "export const name =" in f_text:
            name = re.findall(r"export const name = (.*)", f_text)[0]
            id = re.findall(r"export const id = (.*)", f_text)[0]
            print(f"{id}: {name}")
