import unittest
import json
from unittest.mock import patch, MagicMock
from lambda_function import validate_with_claude, basic_validation, lambda_handler

class TestMathValidation(unittest.TestCase):
    
    def test_basic_validation_valid_math(self):
        """Test basic validation with valid math expressions"""
        test_cases = [
            "2 + 2",
            "5 * (3 + 2)",
            "10 / 2",
            "sqrt(16)",
            "sin(30)",
            "2^3",
            "5 % 2",
            "log(100)",
            "abs(-5)",
            "3.14159 * 2"
        ]
        
        for expr in test_cases:
            is_valid, is_math, error_msg = basic_validation(expr)
            self.assertTrue(is_math, f"Expression '{expr}' should be identified as math")
            self.assertTrue(is_valid, f"Expression '{expr}' should be valid")
            self.assertEqual("", error_msg, f"No error message expected for '{expr}'")
    
    def test_basic_validation_invalid_math(self):
        """Test basic validation with invalid math expressions"""
        test_cases = [
            "hello world",
            "what is the weather today?",
            "tell me a joke",
            "who is the president",
            "123 main street"
        ]
        
        for expr in test_cases:
            is_valid, is_math, error_msg = basic_validation(expr)
            self.assertFalse(is_math, f"Expression '{expr}' should not be identified as math")
            self.assertFalse(is_valid, f"Expression '{expr}' should be invalid")
            self.assertNotEqual("", error_msg, f"Error message expected for '{expr}'")
    
    def test_basic_validation_unsolvable_math(self):
        """Test basic validation with unsolvable math expressions"""
        test_cases = [
            ("5 / 0", "division by zero"),
            ("(2 + 3", "Unbalanced parentheses"),
            ("[1, 2, 3", "Unbalanced brackets"),
            ("{5 * 2", "Unbalanced braces"),
            ("5 + * 3", "consecutive operators")
        ]
        
        for expr, expected_error in test_cases:
            is_valid, is_math, error_msg = basic_validation(expr)
            self.assertTrue(is_math, f"Expression '{expr}' should be identified as math")
            self.assertFalse(is_valid, f"Expression '{expr}' should be invalid")
            self.assertIn(expected_error, error_msg.lower(), f"Error message for '{expr}' should contain '{expected_error}'")
    
    @patch('anthropic.Anthropic')
    def test_claude_validation_success(self, mock_anthropic):
        """Test Claude validation with successful API response"""
        # Mock the Anthropic client and its response
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_content = MagicMock()
        
        # Set up the mock response
        mock_content.text = json.dumps({
            "is_math_problem": True,
            "is_solvable": True,
            "error_message": ""
        })
        mock_message.content = [mock_content]
        mock_client.messages.create.return_value = mock_message
        
        # Test with a valid expression
        is_valid, is_math, error_msg = validate_with_claude(mock_client, "2 + 2")
        
        # Verify the results
        self.assertTrue(is_valid)
        self.assertTrue(is_math)
        self.assertEqual("", error_msg)
        
        # Verify Claude was called with correct parameters
        mock_client.messages.create.assert_called_once()
        call_args = mock_client.messages.create.call_args[1]
        self.assertEqual("claude-3-haiku-20240307", call_args["model"])
        self.assertEqual(0, call_args["temperature"])
        self.assertIn("2 + 2", call_args["messages"][0]["content"])
    
    @patch('anthropic.Anthropic')
    def test_claude_validation_not_math(self, mock_anthropic):
        """Test Claude validation with non-math input"""
        # Mock the Anthropic client and its response
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_content = MagicMock()
        
        # Set up the mock response for non-math input
        mock_content.text = json.dumps({
            "is_math_problem": False,
            "is_solvable": False,
            "error_message": "This is not a mathematical expression."
        })
        mock_message.content = [mock_content]
        mock_client.messages.create.return_value = mock_message
        
        # Test with a non-math expression
        is_valid, is_math, error_msg = validate_with_claude(mock_client, "tell me a joke")
        
        # Verify the results
        self.assertFalse(is_valid)
        self.assertFalse(is_math)
        self.assertEqual("This is not a mathematical expression.", error_msg)
    
    @patch('anthropic.Anthropic')
    def test_claude_validation_unsolvable(self, mock_anthropic):
        """Test Claude validation with unsolvable math input"""
        # Mock the Anthropic client and its response
        mock_client = MagicMock()
        mock_message = MagicMock()
        mock_content = MagicMock()
        
        # Set up the mock response for unsolvable math
        mock_content.text = json.dumps({
            "is_math_problem": True,
            "is_solvable": False,
            "error_message": "Division by zero is undefined."
        })
        mock_message.content = [mock_content]
        mock_client.messages.create.return_value = mock_message
        
        # Test with an unsolvable expression
        is_valid, is_math, error_msg = validate_with_claude(mock_client, "5/0")
        
        # Verify the results
        self.assertFalse(is_valid)
        self.assertTrue(is_math)
        self.assertEqual("Division by zero is undefined.", error_msg)
    
    @patch('lambda_function.validate_with_claude')
    def test_lambda_handler_valid_math(self, mock_validate):
        """Test lambda handler with valid math expression"""
        # Mock the validation function to return valid
        mock_validate.return_value = (True, True, "")
        
        # Create a mock event
        event = {
            'body': json.dumps({'expression': '2 + 2'})
        }
        
        # Mock the SSM client and Anthropic client
        with patch('boto3.session.Session') as mock_session, \
             patch('anthropic.Anthropic') as mock_anthropic:
            
            # Set up the mock SSM response
            mock_ssm = MagicMock()
            mock_session.return_value.client.return_value = mock_ssm
            mock_ssm.get_parameter.return_value = {
                'Parameter': {'Value': 'mock-api-key'}
            }
            
            # Set up the mock Anthropic response for the actual calculation
            mock_client = MagicMock()
            mock_anthropic.return_value = mock_client
            mock_message = MagicMock()
            mock_content = MagicMock()
            mock_content.text = "The answer is 4"
            mock_message.content = [mock_content]
            mock_client.messages.create.return_value = mock_message
            
            # Set environment variable
            with patch.dict('os.environ', {'PARAMETER_NAME': 'test-param'}):
                # Call the lambda handler
                response = lambda_handler(event, {})
                
                # Verify the response
                self.assertEqual(200, response['statusCode'])
                body = json.loads(response['body'])
                self.assertTrue(body['success'])
    
    @patch('lambda_function.validate_with_claude')
    def test_lambda_handler_not_math(self, mock_validate):
        """Test lambda handler with non-math expression"""
        # Mock the validation function to return not math
        mock_validate.return_value = (False, False, "This is not a mathematical expression.")
        
        # Create a mock event
        event = {
            'body': json.dumps({'expression': 'tell me a joke'})
        }
        
        # Mock the SSM client
        with patch('boto3.session.Session') as mock_session, \
             patch('anthropic.Anthropic'):
            
            # Set up the mock SSM response
            mock_ssm = MagicMock()
            mock_session.return_value.client.return_value = mock_ssm
            mock_ssm.get_parameter.return_value = {
                'Parameter': {'Value': 'mock-api-key'}
            }
            
            # Set environment variable
            with patch.dict('os.environ', {'PARAMETER_NAME': 'test-param'}):
                # Call the lambda handler
                response = lambda_handler(event, {})
                
                # Verify the response
                self.assertEqual(400, response['statusCode'])
                body = json.loads(response['body'])
                self.assertIn('error', body)
                self.assertIn('math problem', body['error'])
    
    @patch('lambda_function.validate_with_claude')
    def test_lambda_handler_unsolvable(self, mock_validate):
        """Test lambda handler with unsolvable math expression"""
        # Mock the validation function to return unsolvable
        mock_validate.return_value = (False, True, "Division by zero is undefined.")
        
        # Create a mock event
        event = {
            'body': json.dumps({'expression': '5/0'})
        }
        
        # Mock the SSM client
        with patch('boto3.session.Session') as mock_session, \
             patch('anthropic.Anthropic'):
            
            # Set up the mock SSM response
            mock_ssm = MagicMock()
            mock_session.return_value.client.return_value = mock_ssm
            mock_ssm.get_parameter.return_value = {
                'Parameter': {'Value': 'mock-api-key'}
            }
            
            # Set environment variable
            with patch.dict('os.environ', {'PARAMETER_NAME': 'test-param'}):
                # Call the lambda handler
                response = lambda_handler(event, {})
                
                # Verify the response
                self.assertEqual(400, response['statusCode'])
                body = json.loads(response['body'])
                self.assertIn('error', body)
                self.assertIn('invalid', body['error'])
                self.assertIn('Division by zero', body['error'])

if __name__ == '__main__':
    unittest.main() 