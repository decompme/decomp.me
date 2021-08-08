import hashlib

def gen_hash(dict):
    return hashlib.sha256(str(dict).encode('utf-8')).hexdigest()
