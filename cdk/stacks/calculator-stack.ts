import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

export class CalculatorStack extends cdk.Stack {
    public readonly apiEndpoint: string;

    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create SSM Parameter
        const anthropicApiParam = new ssm.StringParameter(this, 'AnthropicApiParameter', {
            parameterName: '/calculator/anthropic-api-key',
            stringValue: process.env.CALCULATOR_ANTHROPIC_API_KEY ?? (() => { throw new Error('ANTHROPIC_API_KEY not set in environment') })(),
            description: 'API Key for Anthropic Claude API',
            tier: ssm.ParameterTier.STANDARD,
        });

        // Create Lambda function
        const calculatorLambda = new PythonFunction(this, 'CalculatorFunction', {
            entry: path.join(__dirname, '../../lambda'),
            index: 'lambda_function.py',
            handler: 'lambda_handler',
            runtime: lambda.Runtime.PYTHON_3_9,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                PARAMETER_NAME: anthropicApiParam.parameterName,
            },
            bundling: {
                assetExcludes: [
                    'venv',
                    '__pycache__',
                    '.pytest_cache'
                ]
            }
        });

        // Grant Lambda permission to read the parameter
        calculatorLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ssm:GetParameter'],
            resources: [anthropicApiParam.parameterArn],
        }));

        // Create API Gateway with proper CORS settings
        const api = new apigateway.RestApi(this, 'CalculatorApi', {
            restApiName: 'Calculator Service',
        });

        // Create an API Gateway resource and method
        const calculate = api.root.addResource('calculate');

        // Enable CORS explicitly for OPTIONS
        calculate.addMethod('OPTIONS', new apigateway.MockIntegration({
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,POST'",
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                },
            }],
            passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
            requestTemplates: { "application/json": "{\"statusCode\": 200}" }
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });

        // Add the POST method with Lambda integration
        calculate.addMethod('POST', new apigateway.LambdaIntegration(calculatorLambda, {
            integrationResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': "'*'",
                    'method.response.header.Access-Control-Allow-Methods': "'POST,OPTIONS'",
                    'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                },
            }],
        }), {
            methodResponses: [{
                statusCode: '200',
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Origin': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Headers': true,
                },
            }],
        });

        // Store the API endpoint URL
        this.apiEndpoint = api.url;

        // Export the API endpoint as a CloudFormation output
        new cdk.CfnOutput(this, 'CalculatorApiEndpoint', {
            value: api.url,
            description: 'API Gateway endpoint URL',
            exportName: 'CalculatorApiEndpoint'
        });
    }
}
