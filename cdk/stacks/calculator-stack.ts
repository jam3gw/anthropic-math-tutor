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
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create SSM Parameter with a new identifier
        const anthropicApiParam = new ssm.StringParameter(this, 'AnthropicApiParameter', {
            parameterName: '/calculator/anthropic-api-key',
            stringValue: process.env.ANTHROPIC_API_KEY ?? (() => { throw new Error('ANTHROPIC_API_KEY not set in environment') })(),
            description: 'API Key for Anthropic Claude API',
            tier: ssm.ParameterTier.STANDARD,
        });

        // Create Lambda function with environment variable
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
        });

        // Grant Lambda permission to read the parameter
        calculatorLambda.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ssm:GetParameter'],
            resources: [anthropicApiParam.parameterArn],
        }));

        // Create API Gateway
        const api = new apigateway.RestApi(this, 'CalculatorApi', {
            restApiName: 'Calculator Service',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS
            }
        });

        // Create an API Gateway resource and method
        const calculate = api.root.addResource('calculate');
        calculate.addMethod('POST', new apigateway.LambdaIntegration(calculatorLambda));
    }
} 