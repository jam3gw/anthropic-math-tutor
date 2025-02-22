print("Hello, World!")

def add(a, b):
    return a + b

print(add(1, 2))

class Calculator:
    def __init__(self):
        self.history = []
    
    def add(self, numbers):
        result = sum(numbers)
        self.history.append(f"{' + '.join(map(str, numbers))} = {result}")
        return result
    
    def subtract(self, numbers):
        result = numbers[0] - sum(numbers[1:])
        self.history.append(f"{' - '.join(map(str, numbers))} = {result}")
        return result
    
    def multiply(self, numbers):
        result = 1
        for num in numbers:
            result *= num
        self.history.append(f"{' * '.join(map(str, numbers))} = {result}")
        return result
    
    def divide(self, numbers):
        result = numbers[0]
        for num in numbers[1:]:
            if num == 0:
                raise ValueError("Cannot divide by zero!")
            result /= num
        self.history.append(f"{' / '.join(map(str, numbers))} = {result}")
        return result

    def show_history(self):
        print("\nCalculation History:")
        for calculation in self.history:
            print(calculation)

def get_numbers():
    numbers = []
    while True:
        num = input("Enter a number (or 'done' to finish): ")
        if num.lower() == 'done':
            break
        try:
            numbers.append(float(num))
        except ValueError:
            print("Please enter a valid number!")
    return numbers

import anthropic
import os
from typing import List

class AICalculator(Calculator):
    def __init__(self):
        super().__init__()
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )

    def explain_calculation(self, operation: str, numbers: List[float], result: float):
        prompt = f"Explain this calculation step by step: {' '.join(map(str, numbers))} {operation} = {result}"
        
        message = self.client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=300,
            system="You are a helpful math tutor. Explain calculations step by step.",
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )
        
        # Access the content correctly from the message object
        explanation = message.content[0].text
        
        print("\n=== AI Explanation ===")
        print("--------------------")
        print(explanation)
        print("--------------------\n")
        
        return explanation

def main():
    # Choose which calculator to use
    calculator_type = input("Choose calculator type (1: Regular, 2: AI): ")
    
    if calculator_type == '2':
        calc = AICalculator()
    else:
        calc = Calculator()
    
    while True:
        print("\nAvailable operations:")
        print("1. Add")
        print("2. Subtract")
        print("3. Multiply")
        print("4. Divide")
        print("5. Show History")
        print("6. Exit")
        
        choice = input("\nChoose an operation (1-6): ")
        
        if choice == '6':
            print("Goodbye!")
            break
        elif choice == '5':
            calc.show_history()
            continue
            
        if choice not in ['1', '2', '3', '4']:
            print("Invalid choice! Please try again.")
            continue
            
        numbers = get_numbers()
        if len(numbers) < 2:
            print("Please enter at least two numbers!")
            continue
            
        try:
            if choice == '1':
                result = calc.add(numbers)
                print(f"Result: {result}")
            elif choice == '2':
                result = calc.subtract(numbers)
                print(f"Result: {result}")
            elif choice == '3':
                result = calc.multiply(numbers)
                print(f"Result: {result}")
            elif choice == '4':
                result = calc.divide(numbers)
                print(f"Result: {result}")

            if calculator_type == '2':
                # Get AI explanation for the calculation
                operation_symbols = {
                    '1': '+', '2': '-', '3': '*', '4': '/'
                }
                explanation = calc.explain_calculation(
                    operation_symbols[choice], 
                    numbers, 
                    result
                )
                print("\nAI Explanation:")
                print(explanation)

        except ValueError as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()


