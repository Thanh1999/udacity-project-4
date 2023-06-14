import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

const XAWS = AWSXRay.captureAWS(AWS)

const bucketName = process.env.ATTACHMENT_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

// TODO: Implement the fileStogare logic
const s3 = new XAWS.S3({
    signatureVersion: 'v4'
})

export class AttachmentUtils {

    getAttachmentUrl(imageId: string): string {
        return `https://${bucketName}.s3.amazonaws.com/${imageId}`;
    }

    getUploadUrl(imageId: string) {
        return s3.getSignedUrl('putObject', {
            Bucket: bucketName,
            Key: imageId,
            Expires: parseInt(urlExpiration)
        })
    }

    deleteObject(objectKey: string) {
        const params = {
            Bucket: bucketName,
            Key: objectKey
        };

        return s3.deleteObject(params);
    };
}
