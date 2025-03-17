import { PutObjectCommand } from "@aws-sdk/client-s3";
import { CLOUDFRONT_URL, s3Client } from "~/common/aws";

// Download the image
export const uploadImageToS3 = async (urlPath: string, imagePath: string) => {
    const imageResponse = await fetch(urlPath);
    if (!imageResponse.ok)
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);

    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to S3
    const putObjectCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: imagePath,
        Body: Buffer.from(imageBuffer),
        ContentType: "image/webp", // You might want to preserve original content type
    });
    await s3Client.send(putObjectCommand);
    return `${CLOUDFRONT_URL}/${imagePath}`;
};
