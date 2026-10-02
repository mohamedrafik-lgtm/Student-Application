"use client";

import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import React from "react";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();

export function UploadThingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 