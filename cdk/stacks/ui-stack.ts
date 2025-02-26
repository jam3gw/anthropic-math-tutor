import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as path from 'path';
import { Construct } from 'constructs';
import * as fs from 'fs';

export interface UIStackProps extends cdk.StackProps {
    apiEndpoint: string;
    hostedZone: route53.IHostedZone;
    certificate: acm.ICertificate;
    domainName: string;
}

export class UIStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: UIStackProps) {
        super(scope, id, props);

        // Ensure domain name is lowercase
        const domainName = props.domainName.toLowerCase();
        const wwwDomainName = `www.${domainName}`;

        // Debug the API endpoint
        console.log('API Endpoint received in UIStack:', props.apiEndpoint);
        console.log('Using domain in UIStack:', domainName);

        // Create an S3 bucket to store the website content
        const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

        // Create a CloudFront distribution
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
            domainNames: [domainName, wwwDomainName],
            certificate: props.certificate,
        });

        // Create DNS records
        new route53.ARecord(this, 'ARecord', {
            zone: props.hostedZone,
            recordName: domainName,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        });

        new route53.CnameRecord(this, 'WWWRecord', {
            zone: props.hostedZone,
            recordName: 'www',
            domainName: domainName,
        });

        // Create config file with API endpoint - make sure it's the actual endpoint
        const configDir = path.join(__dirname, '../../ui/public');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Make sure we have a valid endpoint
        const apiEndpoint = props.apiEndpoint || `https://api.${domainName}/`;

        fs.writeFileSync(
            path.join(configDir, 'config.js'),
            `window.API_ENDPOINT = "${apiEndpoint}${apiEndpoint.endsWith('/') ? '' : '/'}calculate";`
        );

        console.log('Config file written with endpoint:', apiEndpoint);

        // Deploy the website content to the S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [
                s3deploy.Source.asset(path.join(__dirname, '../../ui/build')),
                s3deploy.Source.data('config.js', `window.API_ENDPOINT = "${apiEndpoint}${apiEndpoint.endsWith('/') ? '' : '/'}calculate";`),
            ],
            destinationBucket: websiteBucket,
            distribution,
            distributionPaths: ['/*'],
        });

        // Output the CloudFront URL and custom domain
        new cdk.CfnOutput(this, 'DistributionDomainName', {
            value: distribution.distributionDomainName,
            description: 'The CloudFront distribution domain name',
        });

        new cdk.CfnOutput(this, 'CustomDomainName', {
            value: `https://${domainName}`,
            description: 'The custom domain URL',
        });
    }
} 