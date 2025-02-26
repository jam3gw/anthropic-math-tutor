import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as path from 'path';
import { Construct } from 'constructs';
import * as fs from 'fs';

export interface UIStackProps extends cdk.StackProps {
    apiEndpoint: string;
}

export class UIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UIStackProps) {
        super(scope, id, props);

        // Debug the API endpoint
        console.log('API Endpoint received in UIStack:', props.apiEndpoint);

        // Create config file with API endpoint - make sure it's the actual endpoint
        const configDir = path.join(__dirname, '../../ui/public');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Make sure we have a valid endpoint
        const apiEndpoint = props.apiEndpoint || 'https://al6ruy2uq7.execute-api.us-west-2.amazonaws.com/prod/';

        fs.writeFileSync(
            path.join(configDir, 'config.js'),
            `window.API_ENDPOINT = "${apiEndpoint}${apiEndpoint.endsWith('/') ? '' : '/'}calculate";`
        );

        console.log('Config file written with endpoint:', apiEndpoint);

        // S3 bucket to host website
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            websiteIndexDocument: 'index.html',
            publicReadAccess: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        // CloudFront distribution
        const distribution = new cloudfront.Distribution(this, 'Distribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(websiteBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                },
            ],
        });

        // Deploy website files
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(path.join(__dirname, '../../ui/build'))],
            destinationBucket: websiteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // Output the CloudFront URL
        new cdk.CfnOutput(this, 'WebsiteURL', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'Website URL',
        });
    }
} 