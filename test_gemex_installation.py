import inspect
import gemex

from gemex import Explainer, GemexConfig


print("=" * 72)
print("GEMEX INSTALLATION AND API CHECK")
print("=" * 72)

print(
    "GEMEX version:",
    getattr(gemex, "__version__", "not available"),
)

print("\nGemexConfig signature:")
print(inspect.signature(GemexConfig))

print("\nExplainer signature:")
print(inspect.signature(Explainer))

print("\nExplainer.explain signature:")
print(inspect.signature(Explainer.explain))

print("\nPublic Explainer methods:")

for method_name in dir(Explainer):
    if not method_name.startswith("_"):
        print(f"  - {method_name}")