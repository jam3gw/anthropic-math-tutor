import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import * as dotenv from 'dotenv';
import { Construct } from 'constructs';

dotenv.config(); // Load environment variables from .env file

export interface CalculatorStackProps extends cdk.StackProps {
    hostedZone?: route53.IHostedZone;
    apiCertificate?: acm.ICertificate;
    apiDomainName?: string;
    useCustomDomain?: boolean;
}

export class CalculatorStack extends cdk.Stack {
    public readonly apiEndpoint: string;

    constructor(scope: Construct, id: string, props?: CalculatorStackProps) {
        super(scope, id, props);

        // Ensure API domain name is lowercase if provided
        const apiDomainName = props?.apiDomainName?.toLowerCase();

        if (apiDomainName) {
            console.log(`Using API domain in CalculatorStack: ${apiDomainName}`);
        }

        // Create SSM Parameter
        const anthropicApiParam = new ssm.StringParameter(this, 'AnthropicApiParameter', {
            parameterName: '/calculator/anthropic-api-key',
            stringValue: process.env.ANTHROPIC_API_KEY ?? (() => { throw new Error('ANTHROPIC_API_KEY not set in environment') })(),
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
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                ],
                allowCredentials: true
            }
        });

        // Create an API Gateway resource and method
        const calculate = api.root.addResource('calculate');
        calculate.addMethod('POST', new apigateway.LambdaIntegration(calculatorLambda));

        // Set up custom domain if provided
        if (props?.useCustomDomain && props?.hostedZone && props?.apiCertificate && apiDomainName) {
            // Create a custom domain name for API Gateway
            const domainName = new apigateway.DomainName(this, 'ApiDomainName', {
                domainName: apiDomainName,
                certificate: props.apiCertificate,
                endpointType: apigateway.EndpointType.EDGE,
                securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
            });

            // Create a base path mapping
            new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
                domainName,
                restApi: api,
                stage: api.deploymentStage,
            });

            // Create a DNS record for the API domain
            new route53.ARecord(this, 'ApiARecord', {
                zone: props.hostedZone,
                recordName: 'api',
                target: route53.RecordTarget.fromAlias(new targets.ApiGatewayDomain(domainName)),
            });

            // Set the API endpoint to the custom domain
            this.apiEndpoint = `https://${apiDomainName}`;

            // Output the custom API endpoint
            new cdk.CfnOutput(this, 'CustomApiEndpoint', {
                value: this.apiEndpoint,
                description: 'Custom API Gateway endpoint URL',
                exportName: 'CustomApiEndpoint'
            });
        } else {
            // Use the default API Gateway URL
            this.apiEndpoint = api.url;
        }

        // Export the API endpoint as a CloudFormation output
        new cdk.CfnOutput(this, 'CalculatorApiEndpoint', {
            value: api.url,
            description: 'API Gateway endpoint URL',
            exportName: 'CalculatorApiEndpoint'
        });
    }
}
