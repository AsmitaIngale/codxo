﻿import random
import string

def generate_password(length):
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choice(characters) for i in range(length))
    return password

# Example usage
length = int(input("Enter the desired length for the password: "))
password = generate_password(length)
print(f"Generated Password: {password}")
