import json
import boto3
import os
from anthropic import Anthropic

def lambda_handler(event, context):
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
        print("Successfully retrieved API key from Parameter Store")
        
        # Initialize Anthropic client
        client = Anthropic(api_key=api_key)
        print(f"Successfully initialized Anthropic client")

        # Parse the incoming event
        try:
            body = json.loads(event.get('body', '{}'))
            operation = body.get('operation')
            numbers = body.get('numbers', [])
            
            if not operation or not numbers:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Missing required parameters. Please provide operation and numbers.'
                    })
                }

            # Create the message for Claude
            prompt = f"Please explain this calculation: {' '.join(map(str, numbers))} {operation}"
            
            # Get response from Claude
            message = client.messages.create(
                model="claude-3-opus-20240229",
                max_tokens=300,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'explanation': message.content,
                    'success': True
                })
            }
            
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid JSON in request body'
                })
            }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        } 