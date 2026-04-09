from SiameseLSTM.processor import SignatureProcessor

proc = SignatureProcessor()
aaron_sigs = proc.load_signature_from_file('Signatures/aaron/1.txt')
alex_sigs = proc.load_signature_from_file('Signatures/alex/1.txt')

print("Aaron sig shape:", aaron_sigs.shape)
print("Alex sig shape:", alex_sigs.shape)
print("Aaron sample:", aaron_sigs[0:3])
print("Alex sample:", alex_sigs[0:3])