# Simple currency converter

# Example exchange rates
usd_to_inr = 82.5
inr_to_usd = 0.012

# Get user input
amount = float(input("Enter the amount: "))
from_currency = input("Convert from (USD or INR): ").upper()
to_currency = input("Convert to (USD or INR): ").upper()

# Conversion logic
if from_currency == "USD" and to_currency == "INR":
    converted_amount = amount * usd_to_inr
    print(f"{amount} USD is equal to {converted_amount} INR.")
elif from_currency == "INR" and to_currency == "USD":
    converted_amount = amount * inr_to_usd
    print(f"{amount} INR is equal to {converted_amount} USD.")
else:
    print("Conversion not supported.")
