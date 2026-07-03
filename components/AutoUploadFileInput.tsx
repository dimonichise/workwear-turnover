"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";

type AutoUploadFileInputProps = {
  action: string;
  title: string;
  accept?: string;
  capture?: "environment" | "user";
};

export function AutoUploadFileInput({
  action,
  title,
  accept = "image/*",
  capture = "environment"
}: AutoUploadFileInputProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  function handleChange() {
    const file = inputRef.current?.files?.[0];
    if (!file || !formRef.current) return;
    setFileName(file.name);
    setUploading(true);
    formRef.current.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} method="post" encType="multipart/form-data" className="panel space-y-3 p-4">
      <h3 className="font-semibold">{title}</h3>
      <input
        ref={inputRef}
        name="file"
        type="file"
        accept={accept}
        capture={capture}
        required
        className="sr-only"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full bg-panel"
      >
        <Camera size={18} />
        {uploading ? "Загружается..." : "Выбрать файл"}
      </button>
      {fileName && <p className="text-sm text-slate-600">{fileName}</p>}
    </form>
  );
}
