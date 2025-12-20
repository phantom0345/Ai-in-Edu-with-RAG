import torch
print(f"Torch version: {torch.__version__}")
try:
    x = torch.rand(5, 3)
    print("Tensor creation successful")
    print(x)
    y = torch.rand(5, 3)
    z = x + y
    print("Tensor addition successful")
except Exception as e:
    print(f"Torch failed: {e}")
