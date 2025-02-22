import json
import boto3
import os
import anthropic
from typing import List, Dict
from anthropic import Anthropic

class Calculator:
    def add(self, numbers: List[float]) -> float:
        return sum(numbers)
    
    def subtract(self, numbers: List[float]) -> float:
        return numbers[0] - sum(numbers[1:])
    
    def multiply(self, numbers: List[float]) -> float:
        result = 1
        for num in numbers:
            result *= num
        return result
    
    def divide(self, numbers: List[float]) -> float:
        result = numbers[0]
        for num in numbers[1:]:
            if num == 0:
                raise ValueError("Cannot divide by zero!")
            result /= num
        return result

class AICalculator(Calculator):
    def __init__(self):
        # Add debug logging
        print(f"Initializing with API key: {os.getenv('ANTHROPIC_API_KEY')[:10]}...")
        
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY').strip("'")  # Remove any quotes
        )

    def explain_calculation(self, operation: str, numbers: List[float], result: float) -> str:
        try:
            message = self.client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=300,
                system="You are a helpful math tutor. Explain calculations step by step.",
                messages=[{
                    "role": "user",
                    "content": f"Explain this calculation step by step: {' '.join(map(str, numbers))} {operation} = {result}"
                }]
            )
            return message.content[0].text
        except Exception as e:
            print(f"Anthropic API error: {str(e)}")
            raise

def lambda_handler(event: Dict, context) -> Dict:
    # Get the secret from Secrets Manager
    secret_name = "anthropic-api-key"
    region_name = "us-east-1"  # adjust if your region is different
    
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )
    
    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
        print("Secret retrieved successfully")
        print(f"Secret response keys: {get_secret_value_response.keys()}")
        if 'SecretString' in get_secret_value_response:
            secret_value = get_secret_value_response['SecretString']
            print(f"Secret type: {type(secret_value)}")
            print(f"Secret starts with: {secret_value[:10]}...")  # Be careful not to log the full secret
            api_key = secret_value
        else:
            raise ValueError("Could not find SecretString in response")

    except Exception as e:
        print(f"Error getting secret: {e}")
        raise e

    # Initialize Anthropic client with the actual API key
    client = Anthropic(api_key=api_key)

    try:
        # Parse the request body
        body = json.loads(event.get('body', '{}'))
        operation = body.get('operation')
        numbers = body.get('numbers', [])
        explain = body.get('explain', False)
        
        if not operation or not numbers:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Missing required parameters: operation and numbers'
                })
            }
        
        # Initialize calculator
        calc = AICalculator() if explain else Calculator()
        
        # Perform calculation
        operation_map = {
            'add': calc.add,
            'subtract': calc.subtract,
            'multiply': calc.multiply,
            'divide': calc.divide
        }
        
        if operation not in operation_map:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': f'Invalid operation. Must be one of: {", ".join(operation_map.keys())}'
                })
            }
        
        result = operation_map[operation](numbers)
        response = {'result': result}
        
        # Get explanation if requested
        if explain:
            operation_symbols = {
                'add': '+', 'subtract': '-', 'multiply': '*', 'divide': '/'
            }
            explanation = calc.explain_calculation(
                operation_symbols[operation],
                numbers,
                result
            )
            response['explanation'] = explanation
        
        return {
            'statusCode': 200,
            'body': json.dumps(response)
        }
        
    except ValueError as e:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(e)})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        } 