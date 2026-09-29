"use client";

import imageCompression from "browser-image-compression";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/messages";
import type { ExtractResponse } from "@/lib/types";

type Provider = "openai" | "gemini";
type Mode = "photo" | "text";
type SavedKey = { provider: Provider; key: string };

const PROVIDERS = { openai: "OpenAI", gemini: "Gemini" };
const LLM_STORAGE_KEY = "stb:llm";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 10000;

function readSavedKey(): SavedKey {
  const saved = sessionStorage.getItem(LLM_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      sessionStorage.removeItem(LLM_STORAGE_KEY);
    }
  }

  return { provider: "openai", key: "" };
}

type Props = {
  onExtracted: (result: ExtractResponse) => void;
};

export function ReceiptStep({ onExtracted }: Props) {
  const router = useRouter();
  const [llm, setLlm] = useState(readSavedKey);
  const [mode, setMode] = useState<Mode>("photo");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function saveLlm(provider: Provider, key: string) {
    setLlm({ provider, key });
    sessionStorage.setItem(LLM_STORAGE_KEY, JSON.stringify({ provider, key }));
  }

  function forgetKey() {
    setLlm({ provider: llm.provider, key: "" });
    sessionStorage.removeItem(LLM_STORAGE_KEY);
  }

  async function choosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("Please use a JPEG or PNG photo.");
      return;
    }

    setPreparing(true);
    let compressed: File;
    try {
      compressed = await imageCompression(file, {
        maxWidthOrHeight: 2000,
        initialQuality: 0.85,
        maxSizeMB: 3.5,
        useWebWorker: false,
      });
    } catch {
      setError("We couldn't read that photo. Please try another one.");
      return;
    } finally {
      setPreparing(false);
    }

    if (compressed.size > MAX_IMAGE_BYTES) {
      setError("The photo must be 4 MB or smaller.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPhoto(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
  }

  async function extract() {
    setError(null);
    setExtracting(true);

    const form = new FormData();
    if (mode === "photo" && photo) {
      form.append("file", photo, photo.name);
    } else {
      form.append("text", text);
    }

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "X-LLM-Provider": llm.provider, "X-LLM-Key": llm.key.trim() },
        body: form,
      });
      const json = await response.json();

      if (response.status === 401) {
        router.push("/login?next=/bills/new");
        return;
      }

      if (!response.ok) {
        setError(errorMessage(json.error));
        return;
      }

      if (!json.receipt.is_receipt) {
        setError("This doesn't look like a receipt. Try a clearer photo or paste the text instead.");
        return;
      }

      onExtracted(json);
    } catch {
      setError("Something went wrong while reading the receipt. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  let hasReceipt = text.trim() !== "";
  if (mode === "photo") {
    hasReceipt = photo !== null;
  }
  const canExtract = llm.key.trim() !== "" && hasReceipt && !preparing && !extracting;

  let photoLabel = "Take or choose a photo";
  if (preparing) {
    photoLabel = "Preparing photo…";
  } else if (previewUrl) {
    photoLabel = "Choose another photo";
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Your AI key</CardTitle>
          <CardDescription>
            Used once to read the receipt. It stays in this browser tab and is never saved on our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex flex-col gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select items={PROVIDERS} value={llm.provider} onValueChange={(value) => saveLlm(value as Provider, llm.key)}>
                <SelectTrigger id="provider" className="w-full data-[size=default]:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key">API key</Label>
              <Input
                id="api-key"
                type="password"
                className="h-10"
                placeholder="Paste your API key…"
                autoComplete="off"
                spellCheck={false}
                value={llm.key}
                onChange={(event) => saveLlm(llm.provider, event.target.value)}
              />
            </div>
          </div>
          {llm.key !== "" && (
            <Button variant="link" className="h-auto w-fit px-0 text-muted-foreground" onClick={forgetKey}>
              Forget key
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-semibold">Receipt</CardTitle>
          <CardDescription>One receipt per bill. The photo or text is read once and not stored.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <TabsList className="h-9 w-full">
              <TabsTrigger value="photo">Photo</TabsTrigger>
              <TabsTrigger value="text">Paste text</TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="pt-2">
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-muted/50 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
                {previewUrl && (
                  <div className="relative h-64 w-full">
                    <Image src={previewUrl} alt="Receipt preview" fill unoptimized className="object-contain" />
                  </div>
                )}
                <span className="text-sm font-medium">{photoLabel}</span>
                <span className="text-xs text-muted-foreground">JPEG, PNG or WebP</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={preparing || extracting}
                  onChange={choosePhoto}
                />
              </label>
            </TabsContent>

            <TabsContent value="text" className="flex flex-col gap-2 pt-2">
              <Textarea
                aria-label="Receipt text"
                placeholder="Paste the receipt text…"
                className="max-h-96 min-h-48 font-mono text-sm"
                maxLength={MAX_TEXT_CHARS}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <p className="text-right text-xs text-muted-foreground tabular-nums">
                {text.length.toLocaleString("en-IN")} / 10,000
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="h-10" disabled={!canExtract} onClick={extract}>
          {extracting ? "Reading your receipt…" : "Extract items"}
        </Button>
        {extracting && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            This usually takes 5–20 seconds. The first request after a while can take up to a minute longer.
          </p>
        )}
      </div>
    </div>
  );
}
