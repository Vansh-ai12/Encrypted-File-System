def createHash(data,salt):
    hash =  data + salt*3 + "@#2025ENC"
    return hash
    