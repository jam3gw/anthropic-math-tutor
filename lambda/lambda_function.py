import json
import boto3
import os
from anthropic import Anthropic
import re

def validate_with_claude(client, expression):
    """
    Use Claude to validate if the input is a math problem and if it's solvable.
    
    Args:
        client: The Anthropic client
        expression (str): The input expression to validate
        
    Returns:
        tuple: (is_valid, is_math_problem, error_message)
            - is_valid (bool): True if the expression is valid and solvable
            - is_math_problem (bool): True if the expression is a math problem
            - error_message (str): Error message if not valid, empty string otherwise
    """
    validation_prompt = f"""You are a math validation assistant. Your only job is to determine if the following input is:
    1. A mathematical problem/expression
    2. Solvable using standard mathematical rules
    
    Input: {expression}
    
    Respond with ONLY a JSON object with the following structure:
    {{
        "is_math_problem": true/false,
        "is_solvable": true/false,
        "error_message": "Specific error message if not solvable or not a math problem"
    }}
    
    Do not include any other text in your response, just the JSON object.
    """
    
    try:
        # Get response from Claude for validation
        validation_message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=150,
            temperature=0,
            system="You are a math validation assistant. Respond only with the requested JSON format.",
            messages=[
                {"role": "user", "content": validation_prompt}
            ]
        )
        
        # Extract the JSON response
        validation_text = validation_message.content[0].text
        validation_result = json.loads(validation_text)
        
        is_math_problem = validation_result.get("is_math_problem", False)
        is_solvable = validation_result.get("is_solvable", False)
        error_message = validation_result.get("error_message", "")
        
        return (is_solvable, is_math_problem, error_message)
    except Exception as e:
        # Fallback to basic validation if Claude validation fails
        print(f"Claude validation failed: {str(e)}")
        return basic_validation(expression)

def basic_validation(expression):
    """
    Fallback basic validation using regex if Claude validation fails.
    
    Args:
        expression (str): The input expression to validate
        
    Returns:
        tuple: (is_valid, is_math_problem, error_message)
    """
    # Check for presence of mathematical operators or functions
    math_operators = r'[\+\-\*\/\^\(\)\[\]\{\}\=\<\>\%\√]'
    math_functions = r'\b(sin|cos|tan|log|ln|sqrt|abs|exp|pow|round|floor|ceil)\b'
    numbers = r'\d+'
    
    # Check if the expression contains math operators, functions, or numbers
    has_operators = bool(re.search(math_operators, expression))
    has_functions = bool(re.search(math_functions, expression, re.IGNORECASE))
    has_numbers = bool(re.search(numbers, expression))
    
    # If the expression has math operators or functions and numbers, it's likely a math problem
    is_math_problem = (has_operators or has_functions) and has_numbers
    
    if not is_math_problem:
        return (False, False, "The input does not appear to be a math problem.")
    
    # Basic solvability checks
    try:
        # Count parentheses, brackets, and braces
        open_parens = expression.count('(')
        close_parens = expression.count(')')
        open_brackets = expression.count('[')
        close_brackets = expression.count(']')
        open_braces = expression.count('{')
        close_braces = expression.count('}')
        
        # Check if parentheses, brackets, and braces are balanced
        if open_parens != close_parens:
            return (False, True, "Unbalanced parentheses in the expression.")
        if open_brackets != close_brackets:
            return (False, True, "Unbalanced brackets in the expression.")
        if open_braces != close_braces:
            return (False, True, "Unbalanced braces in the expression.")
        
        # Check for division by zero (simple cases)
        if re.search(r'\/\s*0(?![.\d])', expression):
            return (False, True, "Expression contains division by zero.")
        
        # Check for invalid syntax like consecutive operators
        if re.search(r'[\+\-\*\/\^]\s*[\+\*\/\^]', expression):
            return (False, True, "Expression contains consecutive operators.")
        
        return (True, True, "")
    except Exception as e:
        return (False, True, f"Error validating expression: {str(e)}")

def lambda_handler(event, context):
    # CORS headers to include in all responses
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return build_response(200, {})
    
    # Get the parameter name from environment variables
    parameter_name = os.environ['PARAMETER_NAME']
    
    session = boto3.session.Session()
    ssm_client = session.client('ssm')
    
    try:
        print(f"Attempting to get parameter: {parameter_name}")
        response = ssm_client.get_parameter(
            Name=parameter_name,
            WithDecryption=True
        )
        
        api_key = response['Parameter']['Value']
        
        # Log key details safely for debugging
        key_length = len(api_key) if api_key else 0
        key_prefix = api_key[:4] if key_length >= 4 else api_key
        key_suffix = api_key[-4:] if key_length >= 8 else ""
        print(f"API Key retrieved - Length: {key_length}, Prefix: {key_prefix}, Suffix: {key_suffix}")
        print(f"API Key format check - Starts with 'sk-ant-': {api_key.startswith('sk-ant-') if api_key else False}")
        
        # Initialize Anthropic client
        client = Anthropic(api_key=api_key)
        print("Successfully initialized Anthropic client")

        # Parse the incoming event
        try:
            body = json.loads(event.get('body', '{}'))
            expression = body.get('expression')
            
            if not expression:
                return build_response(400, {
                    'error': 'Missing required parameter. Please provide a math expression.'
                })
            
            # Validate the expression using Claude
            print("Validating expression with Claude...")
            is_valid, is_math_problem, error_message = validate_with_claude(client, expression)
            
            # Return error if not a math problem
            if not is_math_problem:
                return build_response(400, {
                    'error': 'The input does not appear to be a math problem. Please enter a valid mathematical expression.'
                })
            
            # Return error if not solvable
            if not is_valid:
                return build_response(400, {
                    'error': f'The math problem appears to be invalid: {error_message}'
                })

            # Create the message for Claude
            prompt = f"""You are Jake's Calculator Buddy, a friendly and patient math tutor for students.
            
            A student has asked you to solve this math expression: {expression}
            
            Please:
            1. Solve the expression step-by-step using basic arithmetic rules
            2. Explain each step in simple, easy-to-understand language as if talking to a student
            3. Use a friendly, encouraging tone
            4. Avoid complex mathematical terminology unless absolutely necessary
            5. If there's a mistake or the expression is invalid, kindly explain what's wrong and how to fix it
            6. Include a simple real-world example that relates to this math concept if possible
            
            Your goal is to help the student not just get the answer, but understand the math concepts behind it.
            """
            
            # Get response from Claude
            print(f"Sending request to Anthropic API with key prefix: {key_prefix}...")
            message = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                temperature=0.5,
                system="You are Jake's Calculator Buddy, a helpful and friendly math tutor that explains math concepts in simple terms. Format your response with HTML tags for better readability: use <h3> for section titles, <p> for paragraphs, <ol> and <li> for numbered steps, <strong> for emphasis, and <hr> for section dividers.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Properly extract the content from the response
            # Handle the TextBlock structure in the Anthropic API response
            print(f"Response received from Anthropic API. Type: {type(message.content)}")
            
            # Extract text based on the response structure
            explanation = ""
            if hasattr(message, 'content'):
                content = message.content
                if isinstance(content, list):
                    # If content is a list of blocks
                    print(f"Content is a list with {len(content)} items")
                    text_parts = []
                    for item in content:
                        print(f"Item type: {type(item)}")
                        if hasattr(item, 'text'):
                            text_parts.append(item.text)
                        elif hasattr(item, 'value'):
                            text_parts.append(item.value)
                        elif isinstance(item, str):
                            text_parts.append(item)
                        else:
                            print(f"Unknown item format: {item}")
                    explanation = " ".join(text_parts)
                elif isinstance(content, str):
                    # If content is already a string
                    explanation = content
                elif hasattr(content, 'text'):
                    # If content is a single TextBlock
                    explanation = content.text
                elif hasattr(content, 'value'):
                    explanation = content.value
                else:
                    # Fallback: convert to string representation
                    explanation = str(content)
            else:
                explanation = str(message)
            
            print(f"Extracted explanation: {explanation[:100]}...")  # Log first 100 chars

            return build_response(200, {
                'explanation': explanation,
                'success': True,
                'formatted': True  # Flag to indicate the response contains HTML formatting
            })
            
        except json.JSONDecodeError:
            return build_response(400, {'error': 'Invalid JSON in request body'})
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return build_response(500, {'error': f'Internal server error: {str(e)}'})

def build_response(status_code, body):
    """Helper function to build CORS-compliant responses."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body)
    }
