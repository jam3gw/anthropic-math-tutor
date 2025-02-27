import json
import boto3
import os
import requests
from anthropic import Anthropic

def lambda_handler(event, context):
    # CORS headers to include in all responses
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
    
    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return build_response(200, {})
    
    # Get authorization token from headers
    auth_header = event.get('headers', {}).get('Authorization', '')
    
    # Check if token exists and has the correct format
    if not auth_header.startswith('Bearer '):
        return build_response(401, {'error': 'Authorization token is missing or invalid'})
    
    # Extract the token
    token = auth_header.split(' ')[1]
    
    # Verify the Google token
    token_verification = verify_google_token(token)
    if not token_verification['valid']:
        return build_response(401, {'error': token_verification['error']})
    
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

def verify_google_token(token):
    """Verify a Google ID token."""
    try:
        # Google's token info endpoint
        response = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={token}')
        
        if response.status_code != 200:
            return {
                'valid': False,
                'error': 'Invalid token'
            }
        
        token_info = response.json()
        
        # You can add additional verification here if needed
        # For example, check specific audience (aud) or issuer (iss)
        
        return {
            'valid': True,
            'user_id': token_info.get('sub'),
            'email': token_info.get('email')
        }
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return {
            'valid': False,
            'error': f'Token verification failed: {str(e)}'
        }

def build_response(status_code, body):
    """Helper function to build CORS-compliant responses."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(body)
    }
