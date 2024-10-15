import magic

# Create a Magic object
file_magic = magic.Magic()

# Get the file type of a file
file_type = file_magic.from_file('example.txt')
print(file_type)
