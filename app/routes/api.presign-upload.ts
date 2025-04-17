// app/routes/api.presign-upload.ts
import { LoaderFunctionArgs } from "@vercel/remix";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";
import { requireUserSession } from "~/session";
import { CLOUDFRONT_URL, s3Client } from "~/common/aws";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await requireUserSession(request);
    const user = session.get("user");
    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const fileName = url.searchParams.get("fileName");
    const fileType = url.searchParams.get("fileType");

    if (!fileName || !fileType) {
        return new Response("Missing file parameters", { status: 400 });
    }

    const id = ulid();
    const extension = fileName.split(".").pop();
    const key = `public/uploads/${user.id}/${id}.${extension}`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 300, // 5 minutes
    });

    const publicUrl = `${CLOUDFRONT_URL}/${key}`;

    return new Response(
        JSON.stringify({
            signedUrl,
            publicUrl,
            id,
        }),
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );
}
