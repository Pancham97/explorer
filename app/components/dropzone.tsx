// frontend/app/components/Dropzone.tsx
import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Label } from "~/components/ui/label";

type Props = {
    onFileDropped: (file: File) => void;
};

export function Dropzone({
    onFileDropped,
    children,
}: React.PropsWithChildren<Props>) {
    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onFileDropped(acceptedFiles[0]);
            }
        },
        [onFileDropped]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        noClick: true,
        // TODO: restrict MIME types if you want, e.g. accept: { 'image/*': [] }
    });

    return (
        <div
            {...getRootProps()}
            className={
                "rounded-lg h-full w-full " +
                (isDragActive
                    ? "border-2 border-dashed border-blue-500 bg-blue-200"
                    : "")
            }
            style={{ transition: "background-color 0.2s ease" }}
        >
            <input {...getInputProps()} />
            <div className="text-center text-md">
                <Label>
                    {/* {isDragActive && "Drop your file here"} */}
                    {true && "Drop your file here"}
                </Label>
            </div>
            {children}
        </div>
    );
}
